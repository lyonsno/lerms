#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const REPORT_SCHEMA = 'lerms.live-fluid-envelope-witness.v0';
const ASSAY_ROUTE = 'lerms.live-fluid-envelope.synthetic-assay.v0';
const args = new Map();
for (let index = 2; index < process.argv.length; index += 2) {
  args.set(process.argv[index], process.argv[index + 1]);
}

const emitterCount = Number(args.get('--emitter-count') || 1);
if (emitterCount !== 1 && emitterCount !== 5) {
  throw new RangeError(`--emitter-count must be 1 or 5, received ${emitterCount}`);
}
const requestedParticleCount = Number(args.get('--particle-count') || 2400);
if (!Number.isSafeInteger(requestedParticleCount) || requestedParticleCount <= 0) {
  throw new RangeError(`--particle-count must be a positive safe integer, received ${requestedParticleCount}`);
}
const radius = Number(args.get('--radius') || 0.044);
const strength = Number(args.get('--strength') || 1.15);
const requestedActiveParticleBudget = Number(args.get('--active-budget') || 720);
const sourceFluxParticlesPerSecond = Number(args.get('--source-flux') || 360);
const opticalDensityScale = Number(args.get('--optical-density') || 2.2);
const reconstructionRadiusScale = Number(args.get('--reconstruction-radius') || 1.6);
const lifetimeSeconds = Number(args.get('--lifetime') || 6);
const durationMs = Number(args.get('--duration-ms') || 6000);
const settleMs = Number(args.get('--settle-ms') || 1500);
const viewportWidth = Number(args.get('--viewport-width') || 1280);
const viewportHeight = Number(args.get('--viewport-height') || 720);
const chrome = process.env.LERMS_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const out = resolve(args.get('--out') || `/tmp/lerms-fluid-envelope-${emitterCount}e-${requestedParticleCount}p.png`);
const baselineOut = resolve(args.get('--baseline-out') || out.replace(/\.png$/i, '.baseline.png'));
const reportPath = resolve(args.get('--report') || out.replace(/\.png$/i, '.json'));
const userDataDir = resolve(args.get('--user-data-dir') || `/tmp/lerms-fluid-envelope-profile-${process.pid}`);
const baseUrl = args.get('--url') || 'http://127.0.0.1:4187/live-hand.html';
const requestedUrl = new URL(baseUrl);
requestedUrl.searchParams.set('fixture', '1');
requestedUrl.searchParams.set('fluid_assay', '1');
requestedUrl.searchParams.set('fluid_particles', String(requestedParticleCount));
const gitCommit = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout.trim() || null;
const gitWorktreeDirty = spawnSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).stdout.trim().length > 0;

let failurePhase = 'initializing';
let lastTrustworthyEvidence = null;
let primaryOutputWritten = false;
let baselineOutputWritten = false;
let stderr = '';
let browserVersion = null;
let debugState = null;
let startReceipt = null;
let visualDelta = null;
let population = null;
let timing = null;
let sourceFlux = null;
let debugPort = null;
let browserWebSocketPath = null;
let chromeExit = null;
let falseClosureChecks = {
  wrongOrFallbackRoute: true,
  missingGpuDiagnostics: true,
  blankOrPartialOutput: true,
  inconsistentPopulationAccounting: true,
  sourceFluxMismatch: true,
  economicsMismatch: true,
};

function delay(ms) {
  return new Promise(resolveDelay => setTimeout(resolveDelay, ms));
}

function writeReport(extra = {}) {
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, JSON.stringify({
    schema: REPORT_SCHEMA,
    requestedUrl: requestedUrl.href,
    effectiveUrl: debugState?.effectiveUrl || null,
    requestedParticleCount,
    effectiveParticleCount: debugState?.fluid?.effectiveParticleCount ?? null,
    emitterCount,
    radius,
    strength,
    requestedEconomics: {
      requestedActiveParticleBudget,
      sourceFluxParticlesPerSecond,
      opticalDensityScale,
      reconstructionRadiusScale,
      lifetimeSeconds,
    },
    durationMs,
    settleMs,
    viewport: { width: viewportWidth, height: viewportHeight },
    browserVersion,
    browserEndpoint: {
      effectiveDebugPort: debugPort,
      browserWebSocketPath,
      userDataDir,
      chromeExit,
      authority: browserWebSocketPath ? 'profile_specific_DevToolsActivePort' : 'missing',
    },
    gitCommit,
    gitWorktreeDirty,
    failurePhase,
    lastTrustworthyEvidence,
    primaryOutputWritten,
    baselineOutputWritten,
    falseClosureChecks,
    visualDelta,
    population,
    timing,
    sourceFlux,
    startReceipt,
    debugState,
    output: primaryOutputWritten ? out : null,
    baselineOutput: baselineOutputWritten ? baselineOut : null,
    stderrTail: stderr.slice(-3000),
    ...extra,
  }, null, 2));
}

async function cdpFetch(path) {
  if (!Number.isSafeInteger(debugPort) || debugPort <= 0) {
    throw new Error('profile-specific Chrome DevTools port is unavailable');
  }
  const response = await fetch(`http://127.0.0.1:${debugPort}${path}`);
  if (!response.ok) throw new Error(`CDP ${path} returned ${response.status}`);
  return response.json();
}

async function waitForProfileEndpoint() {
  const activePortPath = resolve(userDataDir, 'DevToolsActivePort');
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const [portLine, socketPath] = readFileSync(activePortPath, 'utf8').trim().split(/\r?\n/);
      const effectivePort = Number(portLine);
      if (!Number.isSafeInteger(effectivePort) || effectivePort <= 0 || !socketPath?.startsWith('/devtools/browser/')) {
        throw new Error(`invalid DevToolsActivePort payload: ${JSON.stringify({ portLine, socketPath })}`);
      }
      debugPort = effectivePort;
      browserWebSocketPath = socketPath;
      return { debugPort, browserWebSocketPath };
    } catch {
      if (chromeExit) {
        throw new Error(`Chrome exited before publishing DevToolsActivePort: ${JSON.stringify(chromeExit)}`);
      }
      await delay(100);
    }
  }
  throw new Error('Chrome did not publish a profile-specific DevToolsActivePort endpoint');
}

function waitForChromeSpawn(chromeProcess) {
  return new Promise((resolveSpawn, rejectSpawn) => {
    chromeProcess.once('spawn', resolveSpawn);
    chromeProcess.once('error', rejectSpawn);
  });
}

async function waitForPage() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const pages = await cdpFetch('/json/list');
    const page = pages.find(candidate => candidate.type === 'page');
    if (page) return page;
    await delay(100);
  }
  throw new Error('Chrome page target did not appear');
}

function waitForWebSocketOpen(socket) {
  return new Promise((resolveOpen, rejectOpen) => {
    socket.addEventListener('open', resolveOpen, { once: true });
    socket.addEventListener('error', () => rejectOpen(new Error('CDP WebSocket open failed')), { once: true });
  });
}

function wsRequest(socket, method, params = {}) {
  const id = socket._nextId = (socket._nextId || 0) + 1;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolveRequest, rejectRequest) => {
    const timeout = setTimeout(() => {
      socket.removeEventListener('message', onMessage);
      rejectRequest(new Error(`${method} timed out`));
    }, 20_000);
    const onMessage = event => {
      const message = JSON.parse(String(event.data));
      if (message.id !== id) return;
      clearTimeout(timeout);
      socket.removeEventListener('message', onMessage);
      if (message.error) rejectRequest(new Error(`${method}: ${message.error.message}`));
      else resolveRequest(message.result);
    };
    socket.addEventListener('message', onMessage);
  });
}

async function evaluate(socket, expression) {
  const result = await wsRequest(socket, 'Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text || 'Runtime.evaluate failed');
  }
  return result.result.value;
}

async function captureScreenshot(socket, path) {
  const capture = await wsRequest(socket, 'Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: false,
    fromSurface: true,
  });
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, Buffer.from(capture.data, 'base64'));
}

function decodeRgb(path) {
  const decoded = spawnSync('ffmpeg', ['-v', 'error', '-i', path, '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1'], {
    encoding: null,
    maxBuffer: 128 * 1024 * 1024,
  });
  if (decoded.status !== 0 || !decoded.stdout?.length) {
    throw new Error(`ffmpeg could not decode ${path}: ${decoded.stderr?.toString() || decoded.status}`);
  }
  return decoded.stdout;
}

function measureVisualDelta(beforePath, afterPath) {
  const before = decodeRgb(beforePath);
  const after = decodeRgb(afterPath);
  if (before.length !== after.length) throw new Error('baseline and final screenshots have different dimensions');
  let changedPixels = 0;
  let absoluteChannelDelta = 0;
  for (let offset = 0; offset < before.length; offset += 3) {
    const delta = Math.abs(before[offset] - after[offset])
      + Math.abs(before[offset + 1] - after[offset + 1])
      + Math.abs(before[offset + 2] - after[offset + 2]);
    absoluteChannelDelta += delta;
    if (delta >= 24) changedPixels += 1;
  }
  const pixelCount = before.length / 3;
  return {
    changedPixels,
    changedRatio: Number((changedPixels / pixelCount).toFixed(6)),
    meanAbsoluteChannelDelta: Number((absoluteChannelDelta / before.length).toFixed(4)),
    measurement: 'same-route-pre-emission-versus-post-emission-rgb24-v0',
  };
}

async function main() {
  let chromeProcess = null;

  try {
    failurePhase = 'launch_chrome';
    chromeProcess = spawn(chrome, [
      '--remote-debugging-port=0',
      `--user-data-dir=${userDataDir}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      '--disable-backgrounding-occluded-windows',
      `--window-size=${viewportWidth},${viewportHeight}`,
      'about:blank',
    ], { stdio: ['ignore', 'ignore', 'pipe'] });
    chromeProcess.stderr.on('data', chunk => {
      stderr += chunk.toString();
    });
    chromeProcess.once('exit', (code, signal) => {
      chromeExit = { code, signal };
    });
    await waitForChromeSpawn(chromeProcess);

    failurePhase = 'bind_profile_cdp';
    await waitForProfileEndpoint();
    browserVersion = await cdpFetch('/json/version');
    const effectiveBrowserPath = new URL(browserVersion.webSocketDebuggerUrl).pathname;
    if (effectiveBrowserPath !== browserWebSocketPath) {
      throw new Error(`CDP browser endpoint does not match launched profile: ${JSON.stringify({
        expected: browserWebSocketPath,
        effective: effectiveBrowserPath,
      })}`);
    }
    const page = await waitForPage();
    const socket = new WebSocket(page.webSocketDebuggerUrl);
    await waitForWebSocketOpen(socket);
    await wsRequest(socket, 'Runtime.enable');
    await wsRequest(socket, 'Page.enable');
    await wsRequest(socket, 'Emulation.setDeviceMetricsOverride', {
      width: viewportWidth,
      height: viewportHeight,
      deviceScaleFactor: 1,
      mobile: false,
    });

    failurePhase = 'navigate';
    await wsRequest(socket, 'Page.navigate', { url: requestedUrl.href });

    failurePhase = 'wait_assay_hook';
    const hookDeadline = Date.now() + 20_000;
    while (Date.now() < hookDeadline) {
      debugState = await evaluate(socket, `(() => {
        const read = window.__lermsLiveHandDebugState;
        return typeof read === 'function'
          ? { ...read(), effectiveUrl: window.location.href, assayHook: typeof window.__lermsLiveFluidEnvelopeAssay === 'object' }
          : { schema: 'missing', effectiveUrl: window.location.href, readyState: document.readyState };
      })()`);
      lastTrustworthyEvidence = { phase: failurePhase, debugState };
      if (debugState?.schema === 'lerms.live-hand-viewer.v0'
        && debugState.assayHook
        && debugState.fluid?.available !== false
        && debugState.meshVisible) break;
      await delay(200);
    }
    if (debugState?.schema !== 'lerms.live-hand-viewer.v0' || !debugState.assayHook) {
      throw new Error(`fluid envelope assay hook did not become authoritative: ${JSON.stringify(debugState)}`);
    }
    if (debugState.fluid?.available === false) {
      throw new Error(`fluid solver did not become available: ${JSON.stringify(debugState.fluid)}`);
    }

    failurePhase = 'capture_baseline';
    await delay(settleMs);
    await captureScreenshot(socket, baselineOut);
    baselineOutputWritten = true;

    failurePhase = 'start_assay';
    startReceipt = await evaluate(socket, `window.__lermsLiveFluidEnvelopeAssay.start(${JSON.stringify({
      emitterCount,
      radius,
      strength,
      requestedParticleCount,
      requestedActiveParticleBudget,
      sourceFluxParticlesPerSecond,
      opticalDensityScale,
      reconstructionRadiusScale,
      lifetimeSeconds,
    })})`);
    lastTrustworthyEvidence = { phase: failurePhase, startReceipt };

    failurePhase = 'run_assay';
    await delay(durationMs);

    failurePhase = 'checkpoint_gpu_diagnostics';
    debugState = await evaluate(socket, 'window.__lermsLiveFluidEnvelopeAssay.snapshot()');
    debugState.effectiveUrl = await evaluate(socket, 'window.location.href');
    lastTrustworthyEvidence = { phase: failurePhase, debugState };

    failurePhase = 'capture_primary_output';
    await captureScreenshot(socket, out);
    primaryOutputWritten = true;
    visualDelta = measureVisualDelta(baselineOut, out);

    const effectiveParticleCount = debugState?.fluid?.effectiveParticleCount;
    const activeParticleCount = debugState?.fluid?.activeParticleCount;
    const dormantParticleCount = debugState?.fluid?.dormantParticleCount;
    const wallElapsedMs = Number(debugState?.fluid?.wallElapsedMs || 0);
    const expectedParticleReleaseRate = Number(debugState?.fluid?.assayReceipt?.expectedParticleReleaseRate || 0);
    const releasedParticleCount = Number(debugState?.fluid?.solver?.diagnostics?.sourceRecirculationCount || 0);
    const observedParticleReleaseRate = wallElapsedMs > 0
      ? releasedParticleCount / (wallElapsedMs / 1000)
      : 0;
    const observedToExpectedRatio = expectedParticleReleaseRate > 0
      ? observedParticleReleaseRate / expectedParticleReleaseRate
      : 0;
    population = {
      requestedParticleCount,
      effectiveParticleCount,
      activeParticleCount,
      dormantParticleCount,
      retainedActiveRatio: releasedParticleCount > 0 ? activeParticleCount / releasedParticleCount : 0,
      authority: debugState?.fluid?.occupancyAuthority || 'missing',
    };
    timing = {
      animationFrameIntervalMs: debugState?.fluid?.animationFrameIntervalMs || null,
      fluidSubmitIntervalMs: debugState?.fluid?.fluidSubmitIntervalMs || null,
      gpuQueueDrainMs: debugState?.fluid?.gpuQueueDrainMs || null,
      fluidStepCpuMs: debugState?.fluid?.fluidStepCpuMs || null,
      fluidRenderCpuMs: debugState?.fluid?.fluidRenderCpuMs || null,
      submittedSimulationToWallTimeRatio: debugState?.fluid?.submittedSimulationToWallTimeRatio ?? null,
      completedSimulationToWallTimeRatio: debugState?.fluid?.completedSimulationToWallTimeRatio ?? null,
    };
    sourceFlux = {
      expectedParticleReleaseRate,
      observedParticleReleaseRate,
      observedToExpectedRatio,
      releasedParticleCount,
      wallElapsedMs,
      authority: 'gpu_source_recirculation_counter_at_explicit_checkpoint',
    };
    falseClosureChecks = {
      wrongOrFallbackRoute: debugState?.effectiveRoute !== ASSAY_ROUTE
        || debugState?.fluidEvidenceMode !== ASSAY_ROUTE
        || debugState?.fluid?.solver?.truthScene !== 'live_hand_inlets'
        || debugState?.fluid?.solver?.effectiveRendererMode !== 'screen_space_refraction',
      missingGpuDiagnostics: debugState?.fluid?.occupancyAuthority !== 'explicit_gpu_diagnostics_checkpoint'
        || !Number.isSafeInteger(activeParticleCount)
        || !Number.isSafeInteger(dormantParticleCount),
      blankOrPartialOutput: !primaryOutputWritten
        || !baselineOutputWritten
        || visualDelta.changedPixels < 200
        || visualDelta.changedRatio < 0.0002,
      inconsistentPopulationAccounting: activeParticleCount + dormantParticleCount !== effectiveParticleCount
        || effectiveParticleCount !== requestedParticleCount,
      sourceFluxMismatch: expectedParticleReleaseRate <= 0
        || releasedParticleCount <= 0
        || observedToExpectedRatio < 0.8
        || observedToExpectedRatio > 1.2,
      economicsMismatch: debugState?.fluid?.economics?.requestedActiveParticleBudget !== requestedActiveParticleBudget
        || debugState?.fluid?.economics?.sourceFluxParticlesPerSecond !== sourceFluxParticlesPerSecond
        || debugState?.fluid?.economics?.opticalDensityScale !== opticalDensityScale
        || debugState?.fluid?.economics?.reconstructionRadiusScale !== reconstructionRadiusScale
        || debugState?.fluid?.economics?.lifetimeSeconds !== lifetimeSeconds,
    };
    const failedChecks = Object.entries(falseClosureChecks).filter(([, failed]) => failed);
    if (failedChecks.length) {
      throw new Error(`fluid envelope false-closure checks failed: ${JSON.stringify(failedChecks)}`);
    }

    failurePhase = 'complete';
    writeReport({ ok: true });
    socket.close();
  } catch (error) {
    writeReport({
      ok: false,
      error: error instanceof Error ? error.stack || error.message : String(error),
    });
    throw error;
  } finally {
    chromeProcess?.kill('SIGTERM');
  }
}

await main();
