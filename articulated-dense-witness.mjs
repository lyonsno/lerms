#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const REPORT_SCHEMA = 'lerms.articulated-dense-witness.v1';
const FIXTURE_ROUTE = 'hand-state-runtime/deterministic-articulated-replay-not-camera-v1';
const FIXTURE_AUTHORITY = 'deterministic_fixture_not_live_camera';
const FLUID_AUTHORITY = 'fixture_density_bench_not_live_hand';
const args = new Map();
for (let index = 2; index < process.argv.length; index += 2) {
  args.set(process.argv[index], process.argv[index + 1]);
}

const frameCount = Number(args.get('--capture-count') || 8);
const captureIntervalMs = Number(args.get('--capture-interval-ms') || 170);
const settleMs = Number(args.get('--settle-ms') || 1800);
const captureMode = args.get('--capture-mode') || 'source-step';
const sourceStartFrame = Number(args.get('--source-start-frame') || 6);
const sourceFrameSettleMs = Number(args.get('--source-frame-settle-ms') || 70);
const viewportWidth = Number(args.get('--viewport-width') || 1280);
const viewportHeight = Number(args.get('--viewport-height') || 720);
const headless = args.get('--headless') !== '0';
if (!Number.isSafeInteger(frameCount) || frameCount < 4) {
  throw new RangeError(`--capture-count must be an integer of at least 4, received ${frameCount}`);
}
if (!Number.isFinite(captureIntervalMs) || captureIntervalMs <= 0 || !Number.isFinite(settleMs) || settleMs < 0) {
  throw new RangeError('capture interval and settle duration must be finite and non-negative');
}
if (!['source-step', 'realtime'].includes(captureMode)) {
  throw new RangeError(`--capture-mode must be source-step or realtime, received ${captureMode}`);
}
if (!Number.isSafeInteger(sourceStartFrame) || !Number.isFinite(sourceFrameSettleMs) || sourceFrameSettleMs < 0) {
  throw new RangeError('source frame start and settle duration are invalid');
}

const chrome = process.env.LERMS_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const outputDir = resolve(args.get('--out-dir') || `/tmp/lerms-articulated-dense-witness-${process.pid}`);
const contactSheetPath = resolve(args.get('--contact-sheet') || `${outputDir}/contact-sheet.png`);
const reportPath = resolve(args.get('--report') || `${outputDir}/report.json`);
const userDataDir = resolve(args.get('--user-data-dir') || `/tmp/lerms-articulated-dense-profile-${process.pid}`);
const baseUrl = args.get('--url') || 'http://127.0.0.1:4187/live-hand.html';
const requestedUrl = new URL(baseUrl);
requestedUrl.searchParams.set('fixture', 'articulated');
const gitCommit = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout.trim() || null;
const gitWorktreeDirty = spawnSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).stdout.trim().length > 0;

let failurePhase = 'initializing';
let lastTrustworthyEvidence = null;
let primaryOutputWritten = false;
let stderr = '';
let browserVersion = null;
let debugPort = null;
let browserWebSocketPath = null;
let chromeExit = null;
let debugState = null;
let capturedFrames = [];
let visualDeltas = [];
let captureTiming = null;
let falseClosureChecks = {
  wrongOrFallbackRoute: true,
  fixtureAuthorityMismatch: true,
  partialTopology: true,
  missingFrameProgression: true,
  fluidWorkloadMismatch: true,
  blankOrPartialOutput: true,
  captureCadenceShadowed: true,
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
    requestedCaptureCount: frameCount,
    captureIntervalMs,
    captureMode,
    sourceStartFrame: captureMode === 'source-step' ? sourceStartFrame : null,
    sourceFrameSettleMs: captureMode === 'source-step' ? sourceFrameSettleMs : null,
    settleMs,
    viewport: { width: viewportWidth, height: viewportHeight },
    browserVisibility: headless ? 'headless_background' : 'operator_visible',
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
    falseClosureChecks,
    capturedFrames,
    visualDeltas,
    captureTiming,
    debugState,
    output: primaryOutputWritten ? contactSheetPath : null,
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
      return;
    } catch {
      if (chromeExit) throw new Error(`Chrome exited before publishing DevToolsActivePort: ${JSON.stringify(chromeExit)}`);
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

function measureImage(path) {
  const rgb = decodeRgb(path);
  let minimum = 255;
  let maximum = 0;
  let total = 0;
  for (const value of rgb) {
    minimum = Math.min(minimum, value);
    maximum = Math.max(maximum, value);
    total += value;
  }
  return {
    byteCount: rgb.length,
    minimum,
    maximum,
    dynamicRange: maximum - minimum,
    meanChannelValue: Number((total / rgb.length).toFixed(4)),
  };
}

function measureVisualDelta(beforePath, afterPath) {
  const before = decodeRgb(beforePath);
  const after = decodeRgb(afterPath);
  if (before.length !== after.length) throw new Error('captured screenshots have different dimensions');
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
  };
}

function writeContactSheet(paths) {
  const process = spawnSync('ffmpeg', [
    '-v', 'error',
    '-framerate', '1',
    '-i', `${outputDir}/frame-%02d.png`,
    '-frames:v', '1',
    '-vf', `tile=${Math.min(4, paths.length)}x${Math.ceil(paths.length / 4)}:padding=4:margin=4`,
    '-y',
    contactSheetPath,
  ], { encoding: 'utf8' });
  if (process.status !== 0) {
    throw new Error(`ffmpeg could not assemble the contact sheet: ${process.stderr || process.status}`);
  }
}

async function main() {
  let chromeProcess = null;
  let socket = null;
  try {
    failurePhase = 'launch_chrome';
    chromeProcess = spawn(chrome, [
      '--remote-debugging-port=0',
      `--user-data-dir=${userDataDir}`,
      ...(headless ? ['--headless=new'] : []),
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
      throw new Error('CDP browser endpoint does not match the launched profile');
    }
    const page = await waitForPage();
    socket = new WebSocket(page.webSocketDebuggerUrl);
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

    failurePhase = 'wait_fixture_and_fluid';
    const loadDeadline = Date.now() + 30_000;
    while (Date.now() < loadDeadline) {
      debugState = await evaluate(socket, `(() => {
        const read = window.__lermsLiveHandDebugState;
        return typeof read === 'function'
          ? { ...read(), effectiveUrl: window.location.href }
          : { schema: 'missing', effectiveUrl: window.location.href, readyState: document.readyState };
      })()`);
      lastTrustworthyEvidence = { phase: failurePhase, debugState };
      if (
        debugState?.schema === 'lerms.live-hand-viewer.v0'
        && debugState?.articulatedFixture?.presentedFrameCount >= 4
        && debugState?.meshVisible
        && debugState?.fluid?.effectiveParticleCount > 0
      ) break;
      await delay(200);
    }
    if (debugState?.schema !== 'lerms.live-hand-viewer.v0') {
      throw new Error(`live-hand debug state did not load: ${JSON.stringify(debugState)}`);
    }

    failurePhase = 'settle_fixture';
    await delay(settleMs);

    failurePhase = 'capture_dense_frames';
    mkdirSync(outputDir, { recursive: true });
    const captureSequenceStartedAt = performance.now();
    for (let index = 0; index < frameCount; index += 1) {
      const captureWallTimestampMs = performance.now();
      const requestedFixtureFrameIndex = captureMode === 'source-step'
        ? (sourceStartFrame + index) % debugState.articulatedFixture.frameCount
        : null;
      let frameSelectionReceipt = null;
      if (captureMode === 'source-step') {
        frameSelectionReceipt = await evaluate(
          socket,
          `window.__lermsArticulatedFixtureReplay.setFrame(${requestedFixtureFrameIndex})`,
        );
        await delay(sourceFrameSettleMs);
      }
      debugState = await evaluate(socket, `({
          ...window.__lermsLiveHandDebugState(),
          effectiveUrl: window.location.href,
        })`);
      const outputPath = resolve(outputDir, `frame-${String(index).padStart(2, '0')}.png`);
      await captureScreenshot(socket, outputPath);
      capturedFrames.push({
        captureIndex: index,
        path: outputPath,
        captureWallTimestampMs,
        captureDurationMs: Number((performance.now() - captureWallTimestampMs).toFixed(3)),
        requestedFixtureFrameIndex,
        frameSelectionAuthority: frameSelectionReceipt?.authority ?? null,
        fixtureFrameIndex: debugState?.articulatedFixture?.currentFrameIndex ?? null,
        presentedFrameCount: debugState?.articulatedFixture?.presentedFrameCount ?? null,
        image: null,
      });
      lastTrustworthyEvidence = { phase: failurePhase, capturedFrame: capturedFrames.at(-1), debugState };
      if (captureMode === 'realtime' && index + 1 < frameCount) {
        const nextCaptureDueAt = captureSequenceStartedAt + (index + 1) * captureIntervalMs;
        await delay(Math.max(0, nextCaptureDueAt - performance.now()));
      }
    }

    failurePhase = 'analyze_dense_frames';
    for (let index = 0; index < capturedFrames.length; index += 1) {
      capturedFrames[index].image = measureImage(capturedFrames[index].path);
      if (index > 0) {
        visualDeltas.push(measureVisualDelta(capturedFrames[index - 1].path, capturedFrames[index].path));
      }
    }
    const captureIntervals = capturedFrames.slice(1).map(
      (frame, index) => frame.captureWallTimestampMs - capturedFrames[index].captureWallTimestampMs,
    );
    const sortedCaptureIntervals = [...captureIntervals].sort((left, right) => left - right);
    const quantile = probability => sortedCaptureIntervals[
      Math.max(0, Math.ceil(sortedCaptureIntervals.length * probability) - 1)
    ] ?? 0;
    captureTiming = {
      requestedIntervalMs: captureMode === 'realtime' ? captureIntervalMs : null,
      p50IntervalMs: Number(quantile(0.5).toFixed(3)),
      p95IntervalMs: Number(quantile(0.95).toFixed(3)),
      maxIntervalMs: Number((sortedCaptureIntervals.at(-1) || 0).toFixed(3)),
      maximumAcceptedP50IntervalMs: captureMode === 'realtime'
        ? Math.max(captureIntervalMs * 2, captureIntervalMs + 25)
        : null,
      authority: captureMode === 'source-step'
        ? 'deterministic_source_frame_selection_not_realtime_cadence'
        : 'node_monotonic_clock_at_cdp_capture_start',
    };

    failurePhase = 'assemble_contact_sheet';
    writeContactSheet(capturedFrames.map(frame => frame.path));
    primaryOutputWritten = true;

    failurePhase = 'validate_evidence';
    const distinctFixtureFrames = new Set(capturedFrames.map(frame => frame.fixtureFrameIndex)).size;
    falseClosureChecks = {
      wrongOrFallbackRoute: debugState?.effectiveRoute !== FIXTURE_ROUTE
        || debugState?.articulatedFixture?.effectiveRoute !== FIXTURE_ROUTE,
      fixtureAuthorityMismatch:
        debugState?.articulatedFixture?.sourceAuthority !== FIXTURE_AUTHORITY
        || debugState?.articulatedFixture?.geometryMode !== 'native_mano_regeneration',
      partialTopology: debugState?.vertexCount !== 778
        || debugState?.faceCount !== 1538
        || debugState?.articulatedFixture?.frameCount < 90,
      missingFrameProgression: distinctFixtureFrames < Math.min(4, frameCount)
        || visualDeltas.filter(delta => delta.changedRatio >= 0.0002).length < Math.min(3, frameCount - 1),
      fluidWorkloadMismatch: debugState?.densityBenchAuthority !== FLUID_AUTHORITY
        || debugState?.fluid?.activeEmitterCount !== 5
        || debugState?.fluid?.effectiveParticleCount !== debugState?.fluid?.requestedParticleCount
        || debugState?.fluid?.juiceBudget?.lastMacroMapping?.effectiveBudget !== 80,
      blankOrPartialOutput: !primaryOutputWritten
        || capturedFrames.length !== frameCount
        || capturedFrames.some(frame => frame.image.byteCount <= 0 || frame.image.dynamicRange < 16),
      captureCadenceShadowed:
        captureMode === 'source-step'
          ? capturedFrames.some(frame => (
            frame.fixtureFrameIndex !== frame.requestedFixtureFrameIndex
            || frame.frameSelectionAuthority !== 'deterministic_source_frame_selection_not_realtime_cadence'
          ))
          : captureTiming.p50IntervalMs > captureTiming.maximumAcceptedP50IntervalMs,
    };
    const failedChecks = Object.entries(falseClosureChecks).filter(([, failed]) => failed);
    if (failedChecks.length) {
      throw new Error(`articulated dense witness false-closure checks failed: ${JSON.stringify(failedChecks)}`);
    }

    failurePhase = 'complete';
    writeReport({
      ok: true,
      distinctFixtureFrameCount: distinctFixtureFrames,
      contactSheetImage: measureImage(contactSheetPath),
    });
  } catch (error) {
    writeReport({
      ok: false,
      error: error instanceof Error ? error.stack || error.message : String(error),
    });
    throw error;
  } finally {
    socket?.close();
    chromeProcess?.kill('SIGTERM');
  }
}

await main();
