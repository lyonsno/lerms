#!/usr/bin/env node

import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createServer } from 'node:net';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  analyzeActorFilmstrip,
  validateActorFilmstripFrames,
} from './lerm-horde-primary-viewer-filmstrip-analysis.mjs';

const SCHEMA = 'lerms.horde-primary-viewer-actor-filmstrip.v0';
const EXPECTED_COMPOSITION =
  'lerms/lerm-horde/primary-viewer-live-composition-v0';
const EXPECTED_VIEWER =
  'lerms/hill-of-hills/primary-viewer-v0';
const EXPECTED_PRESENTATION =
  'lerms/lerm-horde/indexed-textured-axial-gpu-v0';
const EXPECTED_QUERY = 'actor=lerm-horde-live';
const CHROME =
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const options = parseArgs(process.argv.slice(2));
const report = {
  schema: SCHEMA,
  requestedUrl: options.url,
  effectiveUrl: null,
  requestedCadenceMs: options.cadenceMs,
  requestedZoom: options.zoom,
  requestedFrameCount: options.frameCount,
  effectiveCadence: null,
  effectiveView: null,
  baselinePresentationRate: null,
  viewport: {
    width: options.width,
    height: options.height,
  },
  crop: {
    width: options.cropWidth,
    height: options.cropHeight,
  },
  route: null,
  phase: 'launch',
  failurePhase: null,
  ok: false,
  continuityStatus: 'unverified',
  primaryOutputWritten: false,
  frameDirectory: options.frameDirectory,
  contactSheet: options.contactSheet,
  contactSheetHtml: options.contactSheetHtml,
  frames: [],
  adjacentTransitions: [],
  rankedTransitions: [],
  suspicions: [],
};

async function runWitness() {
  let browser;
  let chrome;
  let profileDir;
  try {
    mkdirSync(options.frameDirectory, { recursive: true });
    mkdirSync(dirname(options.report), { recursive: true });
    mkdirSync(dirname(options.contactSheet), { recursive: true });
    report.phase = 'launching-chrome';
    const port = await freePort();
    profileDir = mkdtempSync(
      `${tmpdir()}/lerms-primary-viewer-filmstrip-chrome-`,
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
    browser = await CdpConnection.open(target.webSocketDebuggerUrl);
    await browser.command('Page.enable');
    await browser.command('Runtime.enable');
    await browser.command('Emulation.setDeviceMetricsOverride', {
      width: options.width,
      height: options.height,
      deviceScaleFactor: 1,
      mobile: false,
    });

    report.phase = 'navigating-canonical-viewer';
    await browser.command('Page.navigate', { url: options.url });
    const initial = await waitForState(
      browser,
      (state) =>
        state?.status === 'live' &&
        state?.lifecycle?.phase === 'traversing' &&
        state?.lifecycle?.elapsedMs >= 160 &&
        state?.host?.drawnLayerCount === 1 &&
        state?.actor?.supportProfile?.length === 7,
      30_000,
      'live actor telemetry',
    );
    report.effectiveUrl = initial.location;
    report.route = {
      requested: EXPECTED_COMPOSITION,
      effective: initial.effective?.composition,
      viewer: initial.effective?.viewer,
      presentation: initial.presentation?.identity?.route,
      fallbackStatus: initial.effective?.fallbackStatus,
      staleStatus: initial.effective?.staleStatus,
    };
    assert.equal(
      new URL(initial.location).searchParams.get('actor'),
      'lerm-horde-live',
      'filmstrip navigated a fallback route',
    );
    assert.equal(
      report.route.effective,
      EXPECTED_COMPOSITION,
      'filmstrip effective route is fallback or substituted',
    );
    assert.equal(
      report.route.viewer,
      EXPECTED_VIEWER,
      'filmstrip viewer route is fallback or substituted',
    );
    assert.equal(
      report.route.presentation,
      EXPECTED_PRESENTATION,
      'filmstrip presentation route is fallback or substituted',
    );
    assert.equal(
      report.route.fallbackStatus,
      'none',
      'fallback state cannot produce continuity evidence',
    );
    assert.equal(
      report.route.staleStatus,
      'fresh',
      'stale state cannot produce continuity evidence',
    );
    report.phase = 'setting-canonical-camera-zoom';
    const zoomed = await setCameraZoom(
      browser,
      initial.view.zoom,
      options.zoom,
      options.width,
      options.height,
    );
    report.effectiveView = { ...zoomed.view };
    report.phase = 'measuring-uninstrumented-presentation-rate';
    report.baselinePresentationRate =
      await measureBaselinePresentationRate(
        browser,
        options.rateWindowMs,
      );

    report.phase = 'capturing-fixed-cadence-frames';
    const witnessStartedAt = performance.now();
    for (let index = 0; index < options.frameCount; index += 1) {
      const targetStartedAt =
        witnessStartedAt + index * options.cadenceMs;
      await delayUntil(targetStartedAt);
      const captureStartedAtMs = performance.now() - witnessStartedAt;
      const observation = await captureActorObservation(browser);
      const state = observation.state;
      if (
        state?.lifecycle?.phase !== 'traversing' ||
        state?.lifecycle?.visible !== true
      ) {
        break;
      }
      assert.ok(
        state.actor &&
          state.presentation?.rootScreen &&
          state.host?.drawnLayerCount === 1,
        'visible actor disappeared before declared departure',
      );
      const pixels = observation.pixels;
      assert.ok(
        pixels.rootCropSpeciesPixels > 0,
        'visible actor disappeared from canonical canvas pixels',
      );
      const framePath = resolve(
        options.frameDirectory,
        `frame-${String(index).padStart(3, '0')}.png`,
      );
      const screenshot = writeCapturedPng(
        framePath,
        observation.pngBase64,
      );
      const captureCompletedAtMs =
        performance.now() - witnessStartedAt;
      report.frames.push({
        index,
        lifecyclePhase: state.lifecycle.phase,
        lifecycleVisible: state.lifecycle.visible,
        captureStartedAtMs,
        captureCompletedAtMs,
        runtimeElapsedMs: state.actor.elapsedMs,
        tickCount: state.actor.tickCount,
        drawCount: state.presentation.drawCount,
        terrainFrameId: state.terrain.frameId,
        observationToken:
          `${state.terrain.frameId}:${state.presentation.drawCount}:${state.actor.tickCount}`,
        rootWorld: { ...state.actor.rootWorld },
        rootScreen: { ...state.presentation.rootScreen },
        sourceDistance: state.actor.sourceDistance,
        phase: state.actor.phase,
        supportProfile: state.actor.supportProfile.map(
          (sample) => ({ ...sample }),
        ),
        rootCropSpeciesPixels:
          pixels.rootCropSpeciesPixels,
        speciesBounds: pixels.speciesBounds,
        nonBackgroundPixels: pixels.nonBackgroundPixels,
        screenshotPath: framePath,
        screenshotByteLength: screenshot.byteLength,
        screenshotSha256: screenshot.sha256,
      });
    }
    assert.ok(
      report.frames.length >= 2,
      'partial filmstrip ended before two traversal frames',
    );

    report.phase = 'writing-contact-sheet';
    writeFilmstripHtml(
      options.contactSheetHtml,
      report.frames,
      options,
    );
    await browser.command('Page.navigate', {
      url: pathToFileURL(options.contactSheetHtml).href,
    });
    await waitFor(
      async () =>
        (await browser.evaluate(
          'document.readyState === "complete" && Array.from(document.images).every((image) => image.complete)',
        )) === true,
      10_000,
      'filmstrip contact sheet images',
    );
    const sheetSize = contactSheetSize(
      report.frames.length,
      options,
    );
    await browser.command('Emulation.setDeviceMetricsOverride', {
      width: sheetSize.width,
      height: sheetSize.height,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await captureScreenshot(
      browser,
      options.contactSheet,
      undefined,
      true,
    );
    report.primaryOutputWritten = true;

    report.phase = 'validating-filmstrip';
    validateActorFilmstripFrames(report.frames);
    const analysis = analyzeActorFilmstrip(report.frames, {
      requestedCadenceMs: options.cadenceMs,
    });
    report.adjacentTransitions = analysis.adjacentTransitions;
    report.rankedTransitions = analysis.rankedTransitions;
    report.suspicions = analysis.suspicions;
    if (
      report.baselinePresentationRate.effectiveDrawHz < 30
    ) {
      report.suspicions.push({
        kind: 'presentation-rate-low',
        severity: Math.min(
          1,
          1 -
            report.baselinePresentationRate.effectiveDrawHz /
              30,
        ),
        fromIndex: null,
        toIndex: null,
        message:
          `uninstrumented canonical presentation ran at ` +
          `${report.baselinePresentationRate.effectiveDrawHz.toFixed(1)} Hz`,
      });
    }
    const cadences = analysis.adjacentTransitions.map(
      (transition) => transition.captureCadenceMs,
    );
    report.effectiveCadence = {
      sampleCount: cadences.length,
      minMs: Math.min(...cadences),
      maxMs: Math.max(...cadences),
      meanMs:
        cadences.reduce((sum, value) => sum + value, 0) /
        cadences.length,
    };
    report.continuityStatus =
      report.suspicions.length === 0 ? 'smooth' : 'suspect';
    report.phase = 'complete';
    report.failurePhase = null;
    report.ok = true;
  } catch (error) {
    report.failurePhase = report.phase;
    report.error = error instanceof Error ? error.stack : String(error);
    report.phase = 'failed';
    report.continuityStatus = 'capture-failed';
  } finally {
    writeFileSync(options.report, `${JSON.stringify(report, null, 2)}\n`);
    browser?.close();
    if (chrome) await stopChrome(chrome);
    if (profileDir) {
      try {
        rmSync(profileDir, { recursive: true, force: true });
      } catch {}
    }
  }

  if (!report.ok) {
    console.error(
      `Lerm Horde actor filmstrip failed during ${report.failurePhase}: ${report.error}`,
    );
    process.exitCode = 1;
    return;
  }
  console.log(
    `Lerm Horde actor filmstrip captured ${report.frames.length} frames with continuity ${report.continuityStatus}: ${options.report}`,
  );
}

async function currentState(browser) {
  return browser.evaluate(`(() => {
    const canvas = document.querySelector('#lerms-canvas');
    return {
      ...window.__lermHordePrimaryViewer,
      location: window.location.href,
      canvasWidth: canvas?.width ?? 0,
      canvasHeight: canvas?.height ?? 0
    };
  })()`);
}

async function measureBaselinePresentationRate(
  browser,
  requestedWindowMs,
) {
  const before = await currentState(browser);
  const startedAt = performance.now();
  await delay(requestedWindowMs);
  const after = await currentState(browser);
  const completedAt = performance.now();
  assert.equal(
    before?.lifecycle?.phase,
    'traversing',
    'baseline presentation rate started outside traversal',
  );
  assert.equal(
    after?.lifecycle?.phase,
    'traversing',
    'baseline presentation rate became partial at departure',
  );
  const wallDurationMs = completedAt - startedAt;
  const tickDelta =
    after.actor.tickCount - before.actor.tickCount;
  const drawDelta =
    after.presentation.drawCount -
    before.presentation.drawCount;
  assert.ok(
    wallDurationMs >= requestedWindowMs &&
      tickDelta > 0 &&
      drawDelta > 0,
    'baseline presentation rate is blank or non-advancing',
  );
  return {
    requestedWindowMs,
    wallDurationMs,
    tickDelta,
    drawDelta,
    runtimeDeltaMs:
      after.actor.elapsedMs - before.actor.elapsedMs,
    effectiveTickHz: (tickDelta * 1_000) / wallDurationMs,
    effectiveDrawHz: (drawDelta * 1_000) / wallDurationMs,
    startObservation:
      `${before.terrain.frameId}:${before.presentation.drawCount}:${before.actor.tickCount}`,
    endObservation:
      `${after.terrain.frameId}:${after.presentation.drawCount}:${after.actor.tickCount}`,
  };
}

async function captureActorObservation(browser) {
  return browser.evaluate(`(() => {
    const canvas = document.querySelector('#lerms-canvas');
    if (!(canvas instanceof HTMLCanvasElement)) {
      throw new Error('canonical LERMS canvas is missing');
    }
    const state = window.__lermHordePrimaryViewer;
    const rootScreen = state?.presentation?.rootScreen;
    if (!state || !rootScreen) {
      throw new Error('same-observation actor state is missing');
    }
    const halfWidth = ${Math.floor(options.cropWidth / 2)};
    const halfHeight = ${Math.floor(options.cropHeight / 2)};
    const left = Math.max(0, Math.min(
      canvas.width - ${options.cropWidth},
      Math.floor(rootScreen.x - halfWidth)
    ));
    const top = Math.max(0, Math.min(
      canvas.height - ${options.cropHeight},
      Math.floor(rootScreen.y - halfHeight)
    ));
    const width = Math.min(${options.cropWidth}, canvas.width - left);
    const height = Math.min(${options.cropHeight}, canvas.height - top);
    const crop = document.createElement('canvas');
    crop.width = width;
    crop.height = height;
    const context = crop.getContext('2d');
    if (!context) throw new Error('same-observation crop context is missing');
    context.drawImage(
      canvas,
      left,
      top,
      width,
      height,
      0,
      0,
      width,
      height
    );
    const pixels = context.getImageData(0, 0, width, height).data;
    const centerX = rootScreen.x - left;
    const centerY = rootScreen.y - top;
    let rootCropSpeciesPixels = 0;
    let nonBackgroundPixels = 0;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (let offset = 0; offset < pixels.length; offset += 16) {
      const pixelIndex = offset / 4;
      const pixelX = pixelIndex % width;
      const pixelY = Math.floor(pixelIndex / width);
      const red = pixels[offset];
      const green = pixels[offset + 1];
      const blue = pixels[offset + 2];
      const alpha = pixels[offset + 3];
      if (alpha > 0 && (red > 12 || green > 18 || blue > 16)) {
        nonBackgroundPixels += 1;
      }
      if (
        Math.abs(pixelX - centerX) <= 48 &&
        Math.abs(pixelY - centerY) <= 48 &&
        alpha > 180 &&
        red > 72 &&
        green > 58 &&
        red - blue > 28 &&
        green - blue > 18
      ) {
        rootCropSpeciesPixels += 1;
        minX = Math.min(minX, pixelX - centerX);
        minY = Math.min(minY, pixelY - centerY);
        maxX = Math.max(maxX, pixelX - centerX);
        maxY = Math.max(maxY, pixelY - centerY);
      }
    }
    const speciesBounds = rootCropSpeciesPixels > 0
      ? {
          minX,
          minY,
          maxX,
          maxY,
          width: maxX - minX + 1,
          height: maxY - minY + 1
        }
      : null;
    return {
      state: {
        ...state,
        location: window.location.href,
        canvasWidth: canvas.width,
        canvasHeight: canvas.height
      },
      pixels: {
        rootCropSpeciesPixels,
        speciesBounds,
        nonBackgroundPixels
      },
      pngBase64: crop.toDataURL('image/png').split(',')[1]
    };
  })()`);
}

function writeCapturedPng(outputPath, pngBase64) {
  assert.match(
    pngBase64,
    /^[a-zA-Z0-9+/]+=*$/,
    'same-observation screenshot is partial',
  );
  const bytes = Buffer.from(pngBase64, 'base64');
  assert.ok(
    bytes.length > 2_000,
    'same-observation screenshot is blank or partial',
  );
  writeFileSync(outputPath, bytes);
  return {
    byteLength: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  };
}

async function setCameraZoom(
  browser,
  initialZoom,
  requestedZoom,
  width,
  height,
) {
  await browser.command('Page.bringToFront');
  await browser.command('Emulation.setFocusEmulationEnabled', {
    enabled: true,
  });
  await browser.command('Input.dispatchMouseEvent', {
    type: 'mouseWheel',
    x: Math.round(width / 2),
    y: Math.round(height / 2),
    deltaX: 0,
    deltaY: (initialZoom - requestedZoom) / 0.001,
  });
  const state = await waitForState(
    browser,
    (candidate) =>
      Math.abs(candidate?.view?.zoom - requestedZoom) <= 0.011,
    5_000,
    'canonical camera zoom',
  );
  assert.ok(
    Math.abs(state.view.zoom - requestedZoom) <= 0.011,
    'canonical camera silently replaced the requested zoom',
  );
  return state;
}

async function captureScreenshot(
  browser,
  outputPath,
  clip,
  captureBeyondViewport = false,
) {
  const capture = await browser.command('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
    captureBeyondViewport,
    ...(clip ? { clip } : {}),
  });
  const bytes = Buffer.from(capture.data, 'base64');
  assert.ok(
    bytes.length > 2_000,
    'filmstrip screenshot is blank or partial',
  );
  writeFileSync(outputPath, bytes);
  return {
    byteLength: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  };
}

function writeFilmstripHtml(outputPath, frames, captureOptions) {
  mkdirSync(dirname(outputPath), { recursive: true });
  const html = `<!doctype html>
<html><head><meta charset="utf-8"><style>
*{box-sizing:border-box}html,body{margin:0;background:#06100d;color:#d8eadb;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
body{padding:16px}.header{display:flex;justify-content:space-between;gap:20px;margin-bottom:12px;font-size:13px}
.grid{display:grid;grid-template-columns:repeat(${captureOptions.columns},${captureOptions.cellWidth}px);gap:8px}
figure{margin:0;background:#0b1712;border:1px solid #355244;overflow:hidden}
img{display:block;width:${captureOptions.cellWidth}px;height:${captureOptions.cellHeight}px;object-fit:cover}
figcaption{height:45px;padding:5px 7px;font-size:10px;line-height:1.35;color:#b9d5c5}
</style></head><body>
<div class="header"><strong>Live actor continuity / canonical Hill</strong><span>${frames.length} frames · requested ${captureOptions.cadenceMs} ms cadence</span></div>
<div class="grid">${frames
    .map(
      (frame) => `<figure><img src="data:image/png;base64,${readFileSync(frame.screenshotPath).toString('base64')}"><figcaption>#${String(frame.index).padStart(2, '0')} · runtime ${frame.runtimeElapsedMs.toFixed(0)} ms · tick ${frame.tickCount}<br>distance ${frame.sourceDistance.toFixed(3)} · actor ${frame.rootCropSpeciesPixels}px · ${frame.speciesBounds.width.toFixed(0)}x${frame.speciesBounds.height.toFixed(0)}</figcaption></figure>`,
    )
    .join('')}</div></body></html>`;
  writeFileSync(outputPath, html);
}

function contactSheetSize(frameCount, captureOptions) {
  const rows = Math.ceil(frameCount / captureOptions.columns);
  return {
    width:
      32 +
      captureOptions.columns * captureOptions.cellWidth +
      (captureOptions.columns - 1) * 8,
    height:
      64 +
      rows * (captureOptions.cellHeight + 45) +
      (rows - 1) * 8,
  };
}

function parseArgs(args) {
  const values = new Map();
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    if (!key?.startsWith('--') || value === undefined) {
      throw new Error(`invalid filmstrip argument ${key ?? ''}`);
    }
    values.set(key.slice(2), value);
  }
  const viewport = values.get('viewport') ?? '1440x960';
  const match = /^(\d+)x(\d+)$/.exec(viewport);
  if (!match) throw new Error(`invalid --viewport ${viewport}`);
  const frameCount = Number(values.get('frame-count') ?? 36);
  const cadenceMs = Number(values.get('cadence-ms') ?? 450);
  const zoom = Number(values.get('zoom') ?? 1.75);
  const rateWindowMs = Number(
    values.get('rate-window-ms') ?? 1_200,
  );
  assert.ok(
    Number.isInteger(frameCount) && frameCount >= 2,
    '--frame-count must be an integer of at least 2',
  );
  assert.ok(
    Number.isFinite(cadenceMs) && cadenceMs > 0,
    '--cadence-ms must be positive',
  );
  assert.ok(
    Number.isFinite(zoom) && zoom >= 0.55 && zoom <= 1.75,
    '--zoom must be between 0.55 and 1.75',
  );
  assert.ok(
    Number.isFinite(rateWindowMs) && rateWindowMs > 0,
    '--rate-window-ms must be positive',
  );
  const outputRoot = resolve(
    values.get('output-root') ??
      `${tmpdir()}/lerms-primary-viewer-filmstrip`,
  );
  return {
    url:
      values.get('url') ??
      `http://127.0.0.1:4177/?${EXPECTED_QUERY}`,
    width: Number(match[1]),
    height: Number(match[2]),
    frameCount,
    cadenceMs,
    zoom,
    rateWindowMs,
    cropWidth: Number(values.get('crop-width') ?? 360),
    cropHeight: Number(values.get('crop-height') ?? 270),
    columns: Number(values.get('columns') ?? 6),
    cellWidth: Number(values.get('cell-width') ?? 220),
    cellHeight: Number(values.get('cell-height') ?? 165),
    report: resolve(
      values.get('report') ?? `${outputRoot}/report.json`,
    ),
    frameDirectory: resolve(
      values.get('frame-directory') ?? `${outputRoot}/frames`,
    ),
    contactSheet: resolve(
      values.get('contact-sheet') ?? `${outputRoot}/filmstrip.png`,
    ),
    contactSheetHtml: resolve(
      values.get('contact-sheet-html') ??
        `${outputRoot}/filmstrip.html`,
    ),
  };
}

async function waitForState(browser, predicate, timeoutMs, label) {
  let latest;
  await waitFor(
    async () => {
      latest = await currentState(browser);
      return Boolean(latest && predicate(latest));
    },
    timeoutMs,
    label,
  );
  return latest;
}

class CdpConnection {
  static async open(url) {
    const socket = new WebSocket(url);
    await new Promise((resolveOpen, rejectOpen) => {
      socket.addEventListener('open', resolveOpen, { once: true });
      socket.addEventListener('error', rejectOpen, { once: true });
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
          new Error(`${message.error.message} (${message.error.code})`),
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
      this.socket.send(JSON.stringify({ id, method, params }));
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
        response.exceptionDetails.exception?.description ??
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
  await new Promise((resolveClose) => server.close(resolveClose));
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
  throw new Error(`${label} timed out after ${timeoutMs} ms`);
}

async function delayUntil(targetMs) {
  const remaining = targetMs - performance.now();
  if (remaining > 0) await delay(remaining);
}

function delay(milliseconds) {
  return new Promise((resolveDelay) =>
    setTimeout(resolveDelay, milliseconds),
  );
}

async function stopChrome(chrome) {
  if (chrome.exitCode !== null || chrome.signalCode !== null) return;
  chrome.kill('SIGTERM');
  await waitForChildExit(chrome, 1_500);
  if (chrome.exitCode === null && chrome.signalCode === null) {
    chrome.kill('SIGKILL');
    await waitForChildExit(chrome, 1_500);
  }
}

async function waitForChildExit(child, timeoutMs) {
  if (child.exitCode !== null || child.signalCode !== null) return;
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
