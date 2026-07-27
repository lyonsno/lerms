#!/usr/bin/env node

import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
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

const EXPECTED_COMPOSITION =
  'lerms/lerm-horde/primary-viewer-live-composition-v0';
const EXPECTED_VIEWER =
  'lerms/hill-of-hills/primary-viewer-v0';
const EXPECTED_ACTOR =
  'lerms/lerm-horde/primary-viewer-actor-frame-v0';
const EXPECTED_PRESENTATION =
  'lerms/lerm-horde/indexed-textured-axial-gpu-v0';
const EXPECTED_RUNTIME =
  'lerms/lerm-horde/primary-viewer-live-worker-v0';
const EXPECTED_QUERY = 'actor=lerm-horde-live';
const CHROME =
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const options = parseArgs(process.argv.slice(2));
const report = {
  schema: 'lerms.horde-primary-viewer-browser-witness.v0',
  requestedUrl: options.url,
  effectiveUrl: null,
  viewport: {
    width: options.width,
    height: options.height,
  },
  phase: 'launch',
  failurePhase: null,
  ok: false,
  requestedRouteVerified: false,
  effectiveRouteVerified: false,
  noFallbackOrStaleState: false,
  hostTerrainIdentityVerified: false,
  atomicPublicationVerified: false,
  performanceMetricsVerified: false,
  oneCanonicalCanvasVerified: false,
  actorPixelsPresent: false,
  indexedPresentationVerified: false,
  actorPixelsAbsentAfterDeparture: false,
  cameraInteractionVerified: false,
  cameraInputState: null,
  terrainChangedDuringTraversal: false,
  retainedTrafficAfterDeparture: false,
  primaryOutputWritten: false,
  present: null,
  moved: null,
  departed: null,
  performance: null,
  screenshots: {
    present: options.presentScreenshot,
    moved: options.movedScreenshot,
    departed: options.departedScreenshot,
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
      `${tmpdir()}/lerms-primary-viewer-chrome-`,
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

    report.phase = 'navigating-primary-viewer';
    await browser.command('Page.navigate', { url: options.url });
    await waitFor(
      async () => {
        const state = await currentState(browser);
        return (
          state?.status === 'live' &&
          state?.lifecycle?.phase === 'traversing' &&
          state?.host?.drawnLayerCount === 1
        );
      },
      30_000,
      'live primary-viewer actor',
    );
    await installPerformanceProbe(browser);
    if (options.performanceOnly) {
      report.phase = 'profiling-canonical-route';
      const before = await currentState(browser);
      await delay(options.performanceDurationMs);
      const after = await currentState(browser);
      report.effectiveUrl = after.location;
      report.requestedRouteVerified =
        new URL(after.location).searchParams.get('actor') ===
          'lerm-horde-live' &&
        after.location.includes(EXPECTED_QUERY);
      report.effectiveRouteVerified =
        after.effective?.composition === EXPECTED_COMPOSITION &&
        after.effective?.viewer === EXPECTED_VIEWER &&
        after.effective?.actor === EXPECTED_ACTOR &&
        after.effective?.runtime === EXPECTED_RUNTIME &&
        after.effective?.runtimeBackend === 'dedicated-worker' &&
        (options.expectedActorRenderer === null ||
          after.effective?.actorRenderer ===
            options.expectedActorRenderer);
      report.noFallbackOrStaleState =
        after.effective?.fallbackStatus === 'none' &&
        hasHonestPublicationFreshness(after);
      report.performance = summarizePerformanceProbe(
        await collectPerformanceProbe(browser),
      );
      report.performanceMetricsVerified =
        report.performance.frameIntervalsMs.length >= 10 &&
        report.performance.frames.count >= 10 &&
        Number.isFinite(report.performance.frames.meanMs) &&
        Number.isFinite(report.performance.frames.p95Ms) &&
        Number.isFinite(report.performance.longTasks.totalMs);
      report.profile = { before, after };
      assert.equal(
        report.requestedRouteVerified,
        true,
        'performance witness navigated the wrong requested route',
      );
      assert.equal(
        report.effectiveRouteVerified,
        true,
        'performance witness effective route identity was missing or substituted',
      );
      assert.equal(
        report.noFallbackOrStaleState,
        true,
        'fallback or stale state impersonated the profiled canonical route',
      );
      assert.equal(
        report.performanceMetricsVerified,
        true,
        'performance witness did not capture complete frame and long-task metrics',
      );
      report.phase = 'complete';
      report.failurePhase = null;
      report.ok = true;
      return;
    }

    report.phase = 'verifying-route-and-present-actor';
    const present = await waitForState(
      browser,
      (state) =>
        state.lifecycle?.phase === 'traversing' &&
        state.lifecycle.elapsedMs >= 250 &&
        state.lifecycle.elapsedMs <= 2_500,
      10_000,
      'present actor sample',
    );
    const presentPixels = await canvasPixels(
      browser,
      present.presentation?.rootScreen,
    );
    const presentShot = await captureScreenshot(
      browser,
      options.presentScreenshot,
    );
    report.primaryOutputWritten = true;
    report.effectiveUrl = present.location;
    report.requestedRouteVerified =
      new URL(present.location).searchParams.get('actor') ===
        'lerm-horde-live' &&
      present.location.includes(EXPECTED_QUERY);
    report.effectiveRouteVerified =
      present.effective?.composition === EXPECTED_COMPOSITION &&
      present.effective?.viewer === EXPECTED_VIEWER &&
      present.effective?.actor === EXPECTED_ACTOR &&
      present.effective?.actorRenderer === EXPECTED_PRESENTATION &&
      present.effective?.runtime === EXPECTED_RUNTIME &&
      present.effective?.runtimeBackend === 'dedicated-worker';
    report.noFallbackOrStaleState =
      present.effective?.fallbackStatus === 'none' &&
      hasHonestPublicationFreshness(present);
    report.hostTerrainIdentityVerified =
      sameTerrain(present.terrain, present.host?.terrain);
    report.atomicPublicationVerified =
      validAtomicPublication(present);
    report.oneCanonicalCanvasVerified =
      present.canvasCount === 1 &&
      present.webglCarrierCanvasCount === 0 &&
      present.canvasRoute === EXPECTED_VIEWER;
    report.indexedPresentationVerified =
      present.presentation?.identity?.route ===
        EXPECTED_PRESENTATION &&
      present.presentation?.identity?.vertexCount === 148_118 &&
      present.presentation?.identity?.faceCount === 188_385 &&
      present.presentation?.identity?.indexed === true &&
      present.presentation?.identity?.textured === true &&
      present.presentation?.identity?.deformer ===
        'axial-parallel-transport-wave-v1' &&
      present.presentation?.identity?.terrainSupportStationCount ===
        7 &&
      present.presentation?.drawCount > 0 &&
      present.presentation?.terrainFrameId ===
        present.terrain.frameId &&
      Number.isFinite(
        present.presentation?.cpuSubmitMilliseconds,
      );
    report.actorPixelsPresent =
      presentPixels.rootCropSpeciesPixels >= 20 &&
      presentPixels.nonBackgroundPixels >= 1_000;
    report.present = {
      state: present,
      pixels: presentPixels,
      screenshotSha256: presentShot.sha256,
    };

    assert.equal(
      report.requestedRouteVerified,
      true,
      'primary-viewer witness navigated the wrong requested route',
    );
    assert.equal(
      report.effectiveRouteVerified,
      true,
      'primary-viewer effective route identity was missing or substituted',
    );
    assert.equal(
      report.noFallbackOrStaleState,
      true,
      'fallback or stale state impersonated the live primary viewer',
    );
    assert.equal(
      report.hostTerrainIdentityVerified,
      true,
      'actor host terrain does not match the visible live Hill',
    );
    assert.equal(
      report.atomicPublicationVerified,
      true,
      'present actor/Hill frame lacks complete atomic publication identity',
    );
    assert.equal(
      report.oneCanonicalCanvasVerified,
      true,
      'primary-viewer composition created a second renderer or canvas',
    );
    assert.equal(
      report.indexedPresentationVerified,
      true,
      'effective indexed textured presentation identity was missing or substituted',
    );
    assert.equal(
      report.actorPixelsPresent,
      true,
      'canonical canvas lacks a legible textured actor at its reported Hill root',
    );

    report.phase = 'exercising-camera-and-live-motion';
    await dragCamera(browser, options.width, options.height);
    report.cameraInputState = await currentState(browser);
    const moved = await waitForState(
      browser,
      (state) =>
        state.lifecycle?.phase === 'traversing' &&
        state.lifecycle.elapsedMs >=
          present.lifecycle.elapsedMs + 350 &&
        (Math.abs(state.view.yaw - present.view.yaw) >= 0.08 ||
          Math.abs(state.view.zoom - present.view.zoom) >= 0.08),
      10_000,
      'camera-moved live actor sample',
    );
    const movedPixels = await canvasPixels(
      browser,
      moved.presentation?.rootScreen,
    );
    const movedShot = await captureScreenshot(
      browser,
      options.movedScreenshot,
    );
    report.cameraInteractionVerified =
      Math.abs(moved.view.yaw - present.view.yaw) >= 0.08 ||
      Math.abs(moved.view.zoom - present.view.zoom) >= 0.08;
    report.terrainChangedDuringTraversal =
      moved.terrain.sampleChecksum !==
        present.terrain.sampleChecksum &&
      moved.terrain.trafficChecksum !==
        present.terrain.trafficChecksum;
    report.hostTerrainIdentityVerified =
      report.hostTerrainIdentityVerified &&
      sameTerrain(moved.terrain, moved.host?.terrain);
    report.atomicPublicationVerified =
      report.atomicPublicationVerified &&
      validAtomicPublication(moved);
    report.moved = {
      state: moved,
      pixels: movedPixels,
      screenshotSha256: movedShot.sha256,
    };
    assert.equal(
      report.cameraInteractionVerified,
      true,
      'canonical Hill camera did not respond to browser input',
    );
    assert.equal(
      report.terrainChangedDuringTraversal,
      true,
      'live actor motion did not advance current Hill state',
    );
    assert.notEqual(
      movedShot.sha256,
      presentShot.sha256,
      'actor/camera/Hill advancement produced an identical screenshot',
    );
    assert.ok(
      movedPixels.rootCropSpeciesPixels >= 20,
      'textured actor disappeared from its reported root before runtime departure',
    );

    report.phase = 'verifying-departure-and-retained-history';
    const departed = await waitForState(
      browser,
      (state) =>
        state.lifecycle?.phase === 'departed' &&
        state.lifecycle.visible === false &&
        state.lifecycle.settledAfterDeparture === true &&
        state.lifecycle.elapsedMs ===
          state.lifecycle.completionElapsedMs &&
        state.host?.registeredLayerCount === 1 &&
        state.host?.drawnLayerCount === 0,
      20_000,
      'actor departure',
    );
    const departedPixels = await canvasPixels(
      browser,
      departed.presentation?.rootScreen,
    );
    const departedShot = await captureScreenshot(
      browser,
      options.departedScreenshot,
    );
    await delay(600);
    const settled = await currentState(browser);
    report.actorPixelsAbsentAfterDeparture =
      departed.host?.drawnLayerCount === 0 &&
      departed.lifecycle?.visible === false &&
      departedPixels.rootCropSpeciesPixels <=
        Math.max(
          12,
          Math.floor(
            presentPixels.rootCropSpeciesPixels * 0.05,
          ),
        );
    report.retainedTrafficAfterDeparture =
      departed.terrain.trafficChecksum !==
        present.terrain.trafficChecksum &&
      departed.terrain.trafficChecksum ===
        settled.terrain.trafficChecksum &&
      departed.terrain.sampleChecksum ===
        settled.terrain.sampleChecksum &&
      departed.terrain.topologyChecksum ===
        settled.terrain.topologyChecksum;
    report.hostTerrainIdentityVerified =
      report.hostTerrainIdentityVerified &&
      sameTerrain(departed.terrain, departed.host?.terrain);
    report.atomicPublicationVerified =
      report.atomicPublicationVerified &&
      validAtomicPublication(departed);
    report.departed = {
      state: departed,
      settledState: settled,
      pixels: departedPixels,
      screenshotSha256: departedShot.sha256,
    };
    report.performance = summarizePerformanceProbe(
      await collectPerformanceProbe(browser),
    );
    report.performanceMetricsVerified =
      report.performance.frameIntervalsMs.length >= 10 &&
      report.performance.frames.count >= 10 &&
      Number.isFinite(report.performance.frames.meanMs) &&
      Number.isFinite(report.performance.frames.p95Ms) &&
      Number.isFinite(report.performance.longTasks.totalMs);
    assert.equal(
      report.actorPixelsAbsentAfterDeparture,
      true,
      'historical actor presence remained visible after departure',
    );
    assert.equal(
      report.retainedTrafficAfterDeparture,
      true,
      'the departed Hill did not retain a stable traversal history',
    );
    assert.equal(
      report.hostTerrainIdentityVerified,
      true,
      'host and visible Hill terrain diverged during the witness',
    );
    assert.equal(
      report.atomicPublicationVerified,
      true,
      'camera-moved or departed frame lost atomic publication identity',
    );
    assert.equal(
      report.performanceMetricsVerified,
      true,
      'canonical witness did not capture complete frame interval and long-task metrics',
    );
    assert.notEqual(
      departedShot.sha256,
      presentShot.sha256,
      'post-departure canonical canvas is identical to actor presence',
    );

    report.phase = 'complete';
    report.failurePhase = null;
    report.ok = true;
  } catch (error) {
    report.failurePhase = report.phase;
    report.error = error instanceof Error ? error.stack : String(error);
    report.phase = 'failed';
  } finally {
    if (browser && report.performance === null) {
      try {
        report.performance = summarizePerformanceProbe(
          await collectPerformanceProbe(browser),
        );
      } catch {}
    }
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
      `Lerm Horde primary-viewer browser witness failed during ${report.failurePhase}: ${report.error}`,
    );
    process.exitCode = 1;
    return;
  }
  console.log(
    `Lerm Horde primary-viewer browser witness passed: ${options.report}`,
  );
}

async function currentState(browser) {
  return browser.evaluate(`(() => {
    const canvas = document.querySelector('#lerms-canvas');
    const state = window.__lermHordePrimaryViewer;
    return {
      ...state,
      location: window.location.href,
      canvasCount: document.querySelectorAll('canvas').length,
      webglCarrierCanvasCount:
        document.querySelectorAll('canvas.stage__renderer').length,
      canvasRoute: canvas?.dataset.primaryViewerRoute ?? '',
      canvasWidth: canvas?.width ?? 0,
      canvasHeight: canvas?.height ?? 0
    };
  })()`);
}

function validAtomicPublication(state) {
  const publication = state?.publication;
  return (
    Number.isInteger(publication?.generation) &&
    publication.generation >= 0 &&
    Number.isFinite(publication.sourceElapsedMs) &&
    publication.sourceElapsedMs === state.lifecycle?.elapsedMs &&
    Number.isFinite(publication.hostPublishedAtMs) &&
    Number.isFinite(publication.presentationAgeMs) &&
    publication.presentationAgeMs >= 0 &&
    publication.completeness === 'atomic-terrain-actor'
  );
}

function hasHonestPublicationFreshness(state) {
  const status = state?.effective?.staleStatus;
  return (
    status === 'fresh' ||
    (status === 'retained-complete-frame' &&
      validAtomicPublication(state) &&
      state.publication.presentationAgeMs > 0)
  );
}

async function installPerformanceProbe(browser) {
  await browser.evaluate(`(() => {
    const probe = {
      startedAtMs: performance.now(),
      endedAtMs: null,
      previousFrameMs: null,
      frameIntervalsMs: [],
      longTasks: []
    };
    window.__lermsPrimaryViewerPerformance = probe;
    const onFrame = (timestampMs) => {
      if (probe.previousFrameMs !== null) {
        probe.frameIntervalsMs.push(timestampMs - probe.previousFrameMs);
      }
      probe.previousFrameMs = timestampMs;
      requestAnimationFrame(onFrame);
    };
    requestAnimationFrame(onFrame);
    if (typeof PerformanceObserver === 'function') {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          probe.longTasks.push({
            startMs: entry.startTime,
            durationMs: entry.duration
          });
        }
      });
      observer.observe({ type: 'longtask' });
      window.__lermsPrimaryViewerPerformanceObserver = observer;
    }
    return true;
  })()`);
}

async function collectPerformanceProbe(browser) {
  return browser.evaluate(`(() => {
    const probe = window.__lermsPrimaryViewerPerformance;
    if (!probe) throw new Error('primary-viewer performance probe is missing');
    probe.endedAtMs = performance.now();
    return {
      startedAtMs: probe.startedAtMs,
      endedAtMs: probe.endedAtMs,
      frameIntervalsMs: [...probe.frameIntervalsMs],
      longTasks: probe.longTasks.map((task) => ({ ...task }))
    };
  })()`);
}

function summarizePerformanceProbe(raw) {
  const frameIntervalsMs = raw.frameIntervalsMs.filter(
    (value) => Number.isFinite(value) && value > 0,
  );
  const orderedFrames = [...frameIntervalsMs].sort(
    (left, right) => left - right,
  );
  const longTasks = raw.longTasks.filter(
    (task) =>
      Number.isFinite(task?.startMs) &&
      Number.isFinite(task?.durationMs) &&
      task.startMs >= raw.startedAtMs &&
      task.startMs <= raw.endedAtMs &&
      task.durationMs >= 0,
  );
  const wallMs = Math.max(0, raw.endedAtMs - raw.startedAtMs);
  const meanMs =
    frameIntervalsMs.length === 0
      ? 0
      : frameIntervalsMs.reduce((sum, value) => sum + value, 0) /
        frameIntervalsMs.length;
  return {
    wallMs,
    frameIntervalsMs,
    frames: {
      count: frameIntervalsMs.length,
      meanMs,
      p50Ms: percentile(orderedFrames, 0.5),
      p95Ms: percentile(orderedFrames, 0.95),
      p99Ms: percentile(orderedFrames, 0.99),
      maxMs: orderedFrames.at(-1) ?? 0,
      approxFps: meanMs > 0 ? 1000 / meanMs : 0,
    },
    longTasks: {
      entries: longTasks,
      count: longTasks.length,
      totalMs: longTasks.reduce(
        (sum, task) => sum + task.durationMs,
        0,
      ),
      maxMs: Math.max(
        0,
        ...longTasks.map((task) => task.durationMs),
      ),
    },
  };
}

function percentile(ordered, ratio) {
  if (ordered.length === 0) return 0;
  const index = Math.min(
    ordered.length - 1,
    Math.max(0, Math.ceil(ordered.length * ratio) - 1),
  );
  return ordered[index];
}

async function canvasPixels(browser, rootScreen) {
  const rootX = Number(rootScreen?.x);
  const rootY = Number(rootScreen?.y);
  return browser.evaluate(`(() => {
    const canvas = document.querySelector('#lerms-canvas');
    if (!(canvas instanceof HTMLCanvasElement)) {
      throw new Error('canonical LERMS canvas is missing');
    }
    const context = canvas.getContext('2d');
    if (!context) throw new Error('canonical canvas context is missing');
    const pixels = context.getImageData(
      0,
      0,
      canvas.width,
      canvas.height
    ).data;
    let redActorPixels = 0;
    let rootCropSpeciesPixels = 0;
    let nonBackgroundPixels = 0;
    const rootX = ${Number.isFinite(rootX) ? rootX : -1};
    const rootY = ${Number.isFinite(rootY) ? rootY : -1};
    const sampleStride = 4;
    for (let offset = 0; offset < pixels.length; offset += sampleStride * 4) {
      const pixelIndex = offset / 4;
      const pixelX = pixelIndex % canvas.width;
      const pixelY = Math.floor(pixelIndex / canvas.width);
      const red = pixels[offset];
      const green = pixels[offset + 1];
      const blue = pixels[offset + 2];
      const alpha = pixels[offset + 3];
      if (
        alpha > 0 &&
        (red > 12 || green > 18 || blue > 16)
      ) {
        nonBackgroundPixels += 1;
      }
      if (
        alpha > 180 &&
        red > 58 &&
        red > green * 1.6 &&
        red > blue * 1.18
      ) {
        redActorPixels += 1;
      }
      if (
        Math.abs(pixelX - rootX) <= 48 &&
        Math.abs(pixelY - rootY) <= 48 &&
        alpha > 180 &&
        red > 72 &&
        green > 58 &&
        red - blue > 28 &&
        green - blue > 18
      ) {
        rootCropSpeciesPixels += 1;
      }
    }
    return {
      sampledPixelCount: pixels.length / 16,
      redActorPixels,
      rootCropSpeciesPixels,
      nonBackgroundPixels
    };
  })()`);
}

async function dragCamera(browser, width, height) {
  const startX = Math.round(width * 0.56);
  const startY = Math.round(height * 0.55);
  await browser.command('Page.bringToFront');
  await browser.command('Emulation.setFocusEmulationEnabled', {
    enabled: true,
  });
  await browser.command('Input.dispatchMouseEvent', {
    type: 'mouseMoved',
    x: startX,
    y: startY,
    button: 'none',
    buttons: 0,
  });
  await browser.command('Input.dispatchMouseEvent', {
    type: 'mousePressed',
    x: startX,
    y: startY,
    button: 'left',
    buttons: 1,
    clickCount: 1,
  });
  await browser.command('Input.dispatchMouseEvent', {
    type: 'mouseMoved',
    x: startX + 90,
    y: startY - 24,
    button: 'left',
    buttons: 1,
  });
  await browser.command('Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    x: startX + 90,
    y: startY - 24,
    button: 'left',
    buttons: 0,
    clickCount: 1,
  });
  await browser.command('Input.dispatchMouseEvent', {
    type: 'mouseWheel',
    x: startX,
    y: startY,
    deltaX: 0,
    deltaY: -140,
  });
}

function sameTerrain(left, right) {
  return (
    left?.frameId === right?.frameId &&
    left?.sampleChecksum === right?.sampleChecksum &&
    left?.topologyChecksum === right?.topologyChecksum
  );
}

async function captureScreenshot(browser, outputPath) {
  const capture = await browser.command('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
    captureBeyondViewport: false,
  });
  const bytes = Buffer.from(capture.data, 'base64');
  assert.ok(bytes.length > 10_000, 'canonical screenshot is blank or partial');
  writeFileSync(outputPath, bytes);
  return {
    byteLength: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
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

function parseArgs(args) {
  const values = new Map();
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    if (!key?.startsWith('--') || value === undefined) {
      throw new Error(`invalid browser witness argument ${key ?? ''}`);
    }
    values.set(key.slice(2), value);
  }
  const viewport = values.get('viewport') ?? '1440x960';
  const match = /^(\d+)x(\d+)$/.exec(viewport);
  if (!match) throw new Error(`invalid --viewport ${viewport}`);
  const label = values.get('label') ?? 'desktop';
  return {
    url:
      values.get('url') ??
      `http://127.0.0.1:4201/?${EXPECTED_QUERY}`,
    width: Number(match[1]),
    height: Number(match[2]),
    report: resolve(
      values.get('report') ??
        `${tmpdir()}/lerms-primary-viewer-${label}.json`,
    ),
    presentScreenshot: resolve(
      values.get('present-screenshot') ??
        `${tmpdir()}/lerms-primary-viewer-${label}-present.png`,
    ),
    movedScreenshot: resolve(
      values.get('moved-screenshot') ??
        `${tmpdir()}/lerms-primary-viewer-${label}-moved.png`,
    ),
    departedScreenshot: resolve(
      values.get('departed-screenshot') ??
        `${tmpdir()}/lerms-primary-viewer-${label}-departed.png`,
    ),
    performanceOnly:
      values.get('performance-only') === 'true',
    performanceDurationMs: Number(
      values.get('performance-duration-ms') ?? '15633',
    ),
    expectedActorRenderer:
      values.get('expected-actor-renderer') ?? null,
  };
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
      throw new Error(`Chrome exited before CDP target: ${stderr.trim()}`);
    }
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`);
      const targets = await response.json();
      const page = targets.find(
        (target) =>
          target.type === 'page' && target.webSocketDebuggerUrl,
      );
      if (page) return page;
    } catch {}
    await delay(100);
  }
  throw new Error(`Chrome CDP page target timed out: ${stderr.trim()}`);
}

async function waitFor(predicate, timeoutMs, label) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await predicate()) return;
    await delay(100);
  }
  throw new Error(`${label} timed out after ${timeoutMs} ms`);
}

function delay(milliseconds) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));
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
