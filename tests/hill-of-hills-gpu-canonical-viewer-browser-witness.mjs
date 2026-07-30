#!/usr/bin/env node

import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createServer } from 'node:net';
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';

const CHROME =
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const EXPECTED_VIEWER =
  'lerms/hill-of-hills/primary-viewer-gpu-resident-v0';
const EXPECTED_TERRAIN =
  'lerms/hill-of-hills/gpu-resident-causal-state-v0';
const options = parseArgs(process.argv.slice(2));
const report = {
  schema:
    'lerms.hill-gpu-canonical-viewer-browser-witness.v0',
  requestedUrl: options.url,
  effectiveUrl: null,
  phase: 'launch',
  failurePhase: null,
  ok: false,
  routeVerified: false,
  oneVisibleCanvasVerified: false,
  noFallbackOrStaleState: false,
  noUncapturedGpuError: false,
  compactTransportVerified: false,
  actorSupportPresentationIdentityVerified: false,
  actorPixelsPresent: false,
  terrainPixelsPresent: false,
  causalTerrainDeltaPresent: false,
  frozenGenerationStable: false,
  primaryOutputWritten: false,
  viewport: {
    width: options.width,
    height: options.height,
  },
  controls: {
    actorSourceElapsedMs: options.actorTimeMs,
    secondEpisodeSourceElapsedMs:
      options.secondEpisodeTimeMs,
    lateSourceElapsedMs: null,
    frozenRepeatCount: 5,
  },
  present: null,
  actorHiddenControl: null,
  secondEpisode: null,
  departed: null,
  pixelMetrics: null,
  screenshots: {
    present: options.presentScreenshot,
    actorHiddenControl: options.controlScreenshot,
    secondEpisode: options.secondEpisodeScreenshot,
    departed: options.departedScreenshot,
    phaseStrip: options.phaseStrip,
  },
};

async function runWitness() {
  let browser;
  let chrome;
  let profileDir;
  mkdirSync(dirname(options.report), { recursive: true });
  for (const screenshot of Object.values(report.screenshots)) {
    mkdirSync(dirname(screenshot), { recursive: true });
  }
  try {
    report.phase = 'launching-chrome';
    const port = await freePort();
    profileDir = mkdtempSync(
      `${tmpdir()}/lerms-hill-gpu-canonical-chrome-`,
    );
    chrome = spawn(
      CHROME,
      [
        '--headless=new',
        '--disable-background-networking',
        '--disable-breakpad',
        '--disable-component-update',
        '--disable-default-apps',
        '--disable-extensions',
        '--disable-features=Translate',
        '--disable-sync',
        '--hide-scrollbars',
        '--metrics-recording-only',
        '--no-first-run',
        '--no-default-browser-check',
        `--remote-debugging-port=${port}`,
        `--user-data-dir=${profileDir}`,
        'about:blank',
      ],
      { stdio: ['ignore', 'ignore', 'pipe'] },
    );
    const target = await waitForPageTarget(port, chrome);
    browser = await CdpConnection.open(
      target.webSocketDebuggerUrl,
    );
    await browser.command('Page.enable');
    await browser.command('Runtime.enable');
    await browser.command(
      'Emulation.setDeviceMetricsOverride',
      {
        width: options.width,
        height: options.height,
        deviceScaleFactor: 1,
        mobile: false,
      },
    );

    report.phase = 'capturing-actor-generation';
    const actorUrl = withQuery(options.url, {
      actor: 'lerm-horde-live',
      terrain: 'gpu-resident',
      gpuTime: String(options.actorTimeMs),
      actorVisual: null,
    });
    const presentState = await navigateToSettled(
      browser,
      actorUrl,
      true,
    );
    const presentShot = await captureScreenshot(
      browser,
      options.presentScreenshot,
    );
    report.present = {
      state: presentState,
      screenshot: presentShot,
    };

    const frozenFrames = [presentShot];
    for (
      let index = 1;
      index < report.controls.frozenRepeatCount;
      index += 1
    ) {
      await delay(200);
      frozenFrames.push(
        await captureScreenshot(
          browser,
          `${options.presentScreenshot}.repeat-${index}.png`,
          false,
        ),
      );
    }

    report.phase = 'capturing-same-generation-control';
    const controlUrl = withQuery(actorUrl, {
      actorVisual: 'hidden',
    });
    const controlState = await navigateToSettled(
      browser,
      controlUrl,
      false,
    );
    const controlShot = await captureScreenshot(
      browser,
      options.controlScreenshot,
    );
    report.actorHiddenControl = {
      state: controlState,
      screenshot: controlShot,
    };

    report.phase = 'capturing-second-episode-generation';
    const secondEpisodeUrl = withQuery(options.url, {
      actor: 'lerm-horde-live',
      terrain: 'gpu-resident',
      gpuTime: String(options.secondEpisodeTimeMs),
      actorVisual: null,
    });
    const secondEpisodeState = await navigateToSettled(
      browser,
      secondEpisodeUrl,
      true,
    );
    const secondEpisodeShot = await captureScreenshot(
      browser,
      options.secondEpisodeScreenshot,
    );
    report.secondEpisode = {
      state: secondEpisodeState,
      screenshot: secondEpisodeShot,
    };

    report.phase = 'capturing-post-departure-generation';
    const lateSourceElapsedMs =
      presentState.lifecycle.completionElapsedMs;
    report.controls.lateSourceElapsedMs =
      lateSourceElapsedMs;
    const departedUrl = withQuery(options.url, {
      actor: 'lerm-horde-live',
      terrain: 'gpu-resident',
      gpuTime: String(lateSourceElapsedMs),
      actorVisual: null,
    });
    const departedState = await navigateToSettled(
      browser,
      departedUrl,
      false,
      true,
    );
    const departedShot = await captureScreenshot(
      browser,
      options.departedScreenshot,
    );
    report.departed = {
      state: departedState,
      screenshot: departedShot,
    };
    createPhaseStrip(
      [
        options.presentScreenshot,
        options.secondEpisodeScreenshot,
        options.departedScreenshot,
      ],
      options.phaseStrip,
      options.width,
      options.height,
    );

    report.phase = 'measuring-browser-captures';
    const presentPixels = decodePng(
      options.presentScreenshot,
      options.width,
      options.height,
    );
    const controlPixels = decodePng(
      options.controlScreenshot,
      options.width,
      options.height,
    );
    const departedPixels = decodePng(
      options.departedScreenshot,
      options.width,
      options.height,
    );
    const rootScreen = projectActorRoot(
      presentState.actor.rootWorld,
      presentState.view,
      presentState.presentation.terrainLength,
      options.width,
      options.height,
    );
    const actorPixelCount = changedPixelCountInRect(
      presentPixels,
      controlPixels,
      options.width,
      options.height,
      16,
      {
        minX: rootScreen.x - 180,
        maxX: rootScreen.x + 180,
        minY: rootScreen.y - 160,
        maxY: rootScreen.y + 160,
      },
    );
    const terrainPixelCount = nonBackgroundPixelCount(
      controlPixels,
      options.width,
      options.height,
    );
    const causalTerrainPixelDelta = changedPixelCount(
      controlPixels,
      departedPixels,
      options.width,
      options.height,
      12,
    );
    const frozenChangedPixels = [];
    for (const frame of frozenFrames.slice(1)) {
      const pixels = decodePng(
        frame.path,
        options.width,
        options.height,
      );
      frozenChangedPixels.push(
        changedPixelCount(
          presentPixels,
          pixels,
          options.width,
          options.height,
          2,
        ),
      );
      rmSync(frame.path, { force: true });
    }
    report.pixelMetrics = {
      actorPixelCount,
      actorEvidenceRegion: {
        rootScreen,
        halfWidth: 180,
        halfHeight: 160,
      },
      terrainPixelCount,
      causalTerrainPixelDelta,
      frozenChangedPixels,
      measurement:
        'external ffmpeg PNG decode; no browser GPU terrain readback',
    };

    report.effectiveUrl = presentState.location;
    report.routeVerified =
      presentState.requested === EXPECTED_VIEWER &&
      presentState.effective === EXPECTED_VIEWER &&
      presentState.route.terrain === EXPECTED_TERRAIN &&
      new URL(presentState.location).searchParams.get(
        'terrain',
      ) === 'gpu-resident';
    report.oneVisibleCanvasVerified =
      presentState.visibleCanvasCount === 1 &&
      presentState.host?.drawnLayerCount === 1;
    report.noFallbackOrStaleState =
      presentState.route.backend === 'webgpu' &&
      presentState.route.fallbackStatus === 'none' &&
      presentState.route.staleStatus === 'fresh';
    report.noUncapturedGpuError =
      !presentState.canvasDataset
        ?.hillGpuUncapturedError &&
      !controlState.canvasDataset
        ?.hillGpuUncapturedError &&
      !secondEpisodeState.canvasDataset
        ?.hillGpuUncapturedError &&
      !departedState.canvasDataset
        ?.hillGpuUncapturedError;
    report.compactTransportVerified =
      presentState.transfer.fullTerrainCpuUploads === 1 &&
      presentState.transfer
        .fullFieldWorkerTransfersAfterInitialization === 0 &&
      presentState.transfer
        .fullFieldReadbacksAfterInitialization === 0;
    report.actorSupportPresentationIdentityVerified =
      presentState.actor.frameId ===
        presentState.presentation.frameId &&
      presentState.actor.supportBindingFrameId ===
        presentState.presentation.frameId;
    report.actorPixelsPresent = actorPixelCount > 300;
    report.terrainPixelsPresent =
      terrainPixelCount > 20_000;
    report.causalTerrainDeltaPresent =
      causalTerrainPixelDelta > 500;
    report.frozenGenerationStable =
      frozenChangedPixels.every(
        (changed) => changed <= 64,
      );
    report.primaryOutputWritten = true;

    assert.equal(report.routeVerified, true);
    assert.equal(report.oneVisibleCanvasVerified, true);
    assert.equal(report.noFallbackOrStaleState, true);
    assert.equal(report.noUncapturedGpuError, true);
    assert.equal(report.compactTransportVerified, true);
    assert.equal(
      report.actorSupportPresentationIdentityVerified,
      true,
    );
    assert.equal(report.actorPixelsPresent, true);
    assert.equal(report.terrainPixelsPresent, true);
    assert.equal(report.causalTerrainDeltaPresent, true);
    assert.equal(report.frozenGenerationStable, true);
    assert.equal(
      departedState.lifecycle.phase,
      'departed',
    );
    assert.equal(departedState.lifecycle.visible, false);
    assert.equal(
      secondEpisodeState.lifecycle.visible,
      true,
    );
    assert.equal(
      secondEpisodeState.episodeController,
      'lerm-episode-b',
    );
    report.ok = true;
    report.phase = 'complete';
  } catch (error) {
    report.failurePhase = report.phase;
    report.error =
      error instanceof Error
        ? `${error.message}\n${error.stack ?? ''}`
        : String(error);
  } finally {
    if (!report.primaryOutputWritten) {
      report.primaryOutputWritten = Object.values(
        report.screenshots,
      ).some((path) => {
        try {
          return decodePng(
            path,
            options.width,
            options.height,
          ).length > 0;
        } catch {
          return false;
        }
      });
    }
    writeFileSync(
      options.report,
      `${JSON.stringify(report, null, 2)}\n`,
    );
    browser?.close();
    if (chrome) await stopChrome(chrome);
    if (profileDir) {
      rmSync(profileDir, {
        recursive: true,
        force: true,
      });
    }
  }
}

async function navigateToSettled(
  browser,
  url,
  requireActor,
  requireDeparture = false,
) {
  await browser.command('Page.navigate', { url });
  let state;
  try {
    await waitFor(
      async () => {
        state = await currentState(browser);
        return (
          state?.status === 'live' &&
          state?.route?.backend === 'webgpu' &&
          state?.route?.fallbackStatus === 'none' &&
          state?.route?.staleStatus === 'fresh' &&
          state?.presentation?.generation?.current >= 1 &&
          (requireActor
            ? state.lifecycle?.visible === true &&
              state.host?.drawnLayerCount === 1
            : true) &&
          (requireDeparture
            ? state.lifecycle?.phase === 'departed'
            : true)
        );
      },
      15_000,
      `settled canonical Hill GPU viewer at ${url}`,
    );
  } catch (error) {
    report.lastTrustworthyEvidence =
      state ?? (await currentState(browser));
    throw new Error(
      `${error instanceof Error ? error.message : String(error)}; last state: ${JSON.stringify(report.lastTrustworthyEvidence)}`,
    );
  }
  await delay(250);
  return await currentState(browser);
}

async function currentState(browser) {
  return browser.evaluate(`(() => {
    const state = window.__hillGpuCanonicalViewer;
    const canvas = document.querySelector('#lerms-canvas');
    if (!state) return {
      status: canvas?.dataset?.lermHordeCompositionStatus ?? 'unpublished',
      location: window.location.href,
      globalMissing: true,
      canvasDataset: canvas ? {...canvas.dataset} : null,
      witness: document.querySelector('.terrain-witness')?.textContent ?? null
    };
    return {
      ...structuredClone(state),
      location: window.location.href,
      canvasDataset: canvas ? {...canvas.dataset} : null,
      visibleCanvasCount: Array.from(
        document.querySelectorAll('canvas')
      ).filter((canvas) => {
        const style = getComputedStyle(canvas);
        const rect = canvas.getBoundingClientRect();
        return style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          rect.width > 0 &&
          rect.height > 0;
      }).length
    };
  })()`);
}

async function captureScreenshot(
  browser,
  outputPath,
  durable = true,
) {
  const capture = await browser.command(
    'Page.captureScreenshot',
    {
      format: 'png',
      fromSurface: true,
      captureBeyondViewport: false,
    },
  );
  const bytes = Buffer.from(capture.data, 'base64');
  assert.ok(
    bytes.length > 10_000,
    'canonical GPU screenshot is blank or partial',
  );
  const path = durable
    ? outputPath
    : resolve(outputPath);
  writeFileSync(path, bytes);
  return {
    path,
    byteLength: bytes.length,
    sha256: createHash('sha256')
      .update(bytes)
      .digest('hex'),
  };
}

function decodePng(path, width, height) {
  const result = spawnSync(
    '/opt/homebrew/bin/ffmpeg',
    [
      '-v',
      'error',
      '-i',
      path,
      '-f',
      'rawvideo',
      '-pix_fmt',
      'rgba',
      'pipe:1',
    ],
    {
      encoding: null,
      maxBuffer: width * height * 8,
    },
  );
  if (result.status !== 0) {
    throw new Error(
      `PNG decode failed for ${path}: ${String(result.stderr)}`,
    );
  }
  assert.equal(
    result.stdout.length,
    width * height * 4,
    `PNG decode dimensions changed for ${path}`,
  );
  return result.stdout;
}

function createPhaseStrip(
  images,
  outputPath,
  width,
  height,
) {
  const cellWidth = 720;
  const cellHeight = Math.round(
    (height / width) * cellWidth,
  );
  const result = spawnSync(
    '/opt/homebrew/bin/ffmpeg',
    [
      '-v',
      'error',
      ...images.flatMap((image) => ['-i', image]),
      '-filter_complex',
      [
        `[0:v]scale=${cellWidth}:${cellHeight}[a]`,
        `[1:v]scale=${cellWidth}:${cellHeight}[b]`,
        `[2:v]scale=${cellWidth}:${cellHeight}[c]`,
        '[a][b][c]hstack=inputs=3[out]',
      ].join(';'),
      '-map',
      '[out]',
      '-frames:v',
      '1',
      '-y',
      outputPath,
    ],
    { encoding: 'utf8' },
  );
  if (result.status !== 0) {
    throw new Error(
      `GPU phase-strip composition failed: ${result.stderr}`,
    );
  }
}

function changedPixelCount(
  left,
  right,
  width,
  height,
  threshold,
) {
  let changed = 0;
  forEachEvidencePixel(width, height, (x, y) => {
    const offset = (y * width + x) * 4;
    const difference =
      Math.abs(left[offset] - right[offset]) +
      Math.abs(left[offset + 1] - right[offset + 1]) +
      Math.abs(left[offset + 2] - right[offset + 2]);
    if (difference > threshold) changed += 1;
  });
  return changed;
}

function changedPixelCountInRect(
  left,
  right,
  width,
  height,
  threshold,
  rect,
) {
  let changed = 0;
  const minX = Math.max(0, Math.floor(rect.minX));
  const maxX = Math.min(width, Math.ceil(rect.maxX));
  const minY = Math.max(0, Math.floor(rect.minY));
  const maxY = Math.min(height, Math.ceil(rect.maxY));
  for (let y = minY; y < maxY; y += 1) {
    for (let x = minX; x < maxX; x += 1) {
      const offset = (y * width + x) * 4;
      const difference =
        Math.abs(left[offset] - right[offset]) +
        Math.abs(left[offset + 1] - right[offset + 1]) +
        Math.abs(left[offset + 2] - right[offset + 2]);
      if (difference > threshold) changed += 1;
    }
  }
  return changed;
}

function nonBackgroundPixelCount(
  pixels,
  width,
  height,
) {
  let count = 0;
  const background = [6, 16, 13];
  forEachEvidencePixel(width, height, (x, y) => {
    const offset = (y * width + x) * 4;
    const difference =
      Math.abs(pixels[offset] - background[0]) +
      Math.abs(pixels[offset + 1] - background[1]) +
      Math.abs(pixels[offset + 2] - background[2]);
    if (difference > 22) count += 1;
  });
  return count;
}

function forEachEvidencePixel(width, height, visit) {
  const minX = Math.min(width - 1, 320);
  const maxX = Math.max(minX + 1, width - 330);
  const minY = Math.min(height - 1, 180);
  const maxY = Math.floor(height * 0.82);
  for (let y = minY; y < maxY; y += 1) {
    for (let x = minX; x < maxX; x += 1) {
      visit(x, y);
    }
  }
}

function projectActorRoot(
  root,
  view,
  terrainLength,
  width,
  height,
) {
  assert.ok(root && view);
  const yawCos = Math.cos(view.yaw);
  const yawSin = Math.sin(view.yaw);
  const rotatedX =
    root.x * yawCos - root.z * yawSin;
  const rotatedZ =
    root.x * yawSin + root.z * yawCos;
  const zn =
    (rotatedZ + terrainLength * 0.5) / terrainLength;
  const perspective =
    (0.42 + (1 - zn) * 0.5) * view.zoom;
  const scaleX =
    Math.min(width / 16, height / 11) * perspective;
  return {
    x:
      width * (0.5 + view.panX) +
      rotatedX * scaleX,
    y:
      height * (0.9 + view.panY) -
      zn * height * 0.68 * view.tilt -
      root.y * 42 * perspective,
  };
}

function withQuery(url, values) {
  const next = new URL(url);
  for (const [key, value] of Object.entries(values)) {
    if (value === null) next.searchParams.delete(key);
    else next.searchParams.set(key, value);
  }
  return next.href;
}

function parseArgs(args) {
  const values = new Map();
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    if (!key?.startsWith('--') || value === undefined) {
      throw new Error(
        `invalid canonical viewer witness argument ${key ?? ''}`,
      );
    }
    values.set(key.slice(2), value);
  }
  const viewport = values.get('viewport') ?? '1600x1000';
  const match = /^(\d+)x(\d+)$/.exec(viewport);
  if (!match) {
    throw new Error(`invalid --viewport ${viewport}`);
  }
  const outputRoot = resolve(
    values.get('output-root') ??
      'artifacts/hill-gpu-canonical-viewer/run_001',
  );
  return {
    url:
      values.get('url') ??
      'http://127.0.0.1:4193/',
    width: Number(match[1]),
    height: Number(match[2]),
    actorTimeMs: Number(
      values.get('actor-time-ms') ?? '1100',
    ),
    secondEpisodeTimeMs: Number(
      values.get('second-episode-time-ms') ?? '4300',
    ),
    report: resolve(
      values.get('report') ??
        `${outputRoot}/receipt.json`,
    ),
    presentScreenshot: resolve(
      values.get('present-screenshot') ??
        `${outputRoot}/actor-present.png`,
    ),
    controlScreenshot: resolve(
      values.get('control-screenshot') ??
        `${outputRoot}/same-generation-actor-hidden.png`,
    ),
    secondEpisodeScreenshot: resolve(
      values.get('second-episode-screenshot') ??
        `${outputRoot}/second-episode.png`,
    ),
    departedScreenshot: resolve(
      values.get('departed-screenshot') ??
        `${outputRoot}/after-departure.png`,
    ),
    phaseStrip: resolve(
      values.get('phase-strip') ??
        `${outputRoot}/phase-strip.png`,
    ),
  };
}

class CdpConnection {
  static async open(url) {
    const socket = new WebSocket(url);
    await new Promise((resolveOpen, rejectOpen) => {
      socket.addEventListener('open', resolveOpen, {
        once: true,
      });
      socket.addEventListener('error', rejectOpen, {
        once: true,
      });
    });
    return new CdpConnection(socket);
  }

  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
    socket.addEventListener('message', ({ data }) => {
      const message = JSON.parse(String(data));
      if (!message.id) return;
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) {
        pending.reject(
          new Error(
            `${message.error.message} (${message.error.code})`,
          ),
        );
      } else {
        pending.resolve(message.result);
      }
    });
  }

  command(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolveCommand, rejectCommand) => {
      this.pending.set(id, {
        resolve: resolveCommand,
        reject: rejectCommand,
      });
      this.socket.send(
        JSON.stringify({ id, method, params }),
      );
    });
  }

  async evaluate(expression) {
    const response = await this.command('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (response.exceptionDetails) {
      throw new Error(
        response.exceptionDetails.exception
          ?.description ??
          response.exceptionDetails.text,
      );
    }
    return response.result.value;
  }

  close() {
    this.socket.close();
  }
}

async function freePort() {
  const server = createServer();
  await new Promise((resolveListen, rejectListen) => {
    server.once('error', rejectListen);
    server.listen(0, '127.0.0.1', resolveListen);
  });
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  await new Promise((resolveClose) =>
    server.close(resolveClose),
  );
  return address.port;
}

async function waitForPageTarget(port, process) {
  let stderr = '';
  process.stderr.on('data', (chunk) => {
    stderr += String(chunk);
  });
  const startedAt = Date.now();
  while (Date.now() - startedAt < 10_000) {
    if (process.exitCode !== null) {
      throw new Error(
        `Chrome exited before CDP target: ${stderr.trim()}`,
      );
    }
    try {
      const response = await fetch(
        `http://127.0.0.1:${port}/json/list`,
      );
      const targets = await response.json();
      const page = targets.find(
        (target) =>
          target.type === 'page' &&
          target.webSocketDebuggerUrl,
      );
      if (page) return page;
    } catch {}
    await delay(100);
  }
  throw new Error(
    `Chrome CDP page target timed out: ${stderr.trim()}`,
  );
}

async function waitFor(predicate, timeoutMs, label) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await predicate()) return;
    await delay(100);
  }
  throw new Error(
    `${label} timed out after ${timeoutMs} ms`,
  );
}

function delay(milliseconds) {
  return new Promise((resolveDelay) =>
    setTimeout(resolveDelay, milliseconds),
  );
}

async function stopChrome(chrome) {
  if (
    chrome.exitCode !== null ||
    chrome.signalCode !== null
  ) {
    return;
  }
  chrome.kill('SIGTERM');
  await waitForChildExit(chrome, 1_500);
  if (
    chrome.exitCode === null &&
    chrome.signalCode === null
  ) {
    chrome.kill('SIGKILL');
    await waitForChildExit(chrome, 1_500);
  }
}

async function waitForChildExit(child, timeoutMs) {
  if (
    child.exitCode !== null ||
    child.signalCode !== null
  ) {
    return;
  }
  await new Promise((resolveExit) => {
    const timer = setTimeout(() => {
      child.off('exit', onExit);
      resolveExit();
    }, timeoutMs);
    const onExit = () => {
      clearTimeout(timer);
      resolveExit();
    };
    child.once('exit', onExit);
  });
}

await runWitness();
process.exit(report.ok ? 0 : 1);
