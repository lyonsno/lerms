#!/usr/bin/env node

import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import {
  mkdtempSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

const EXPECTED_ROUTE =
  'lerms/lerm-horde/live-runtime-composition-v0';
const EXPECTED_RENDERER = 'three-webgl-full-hill-v0';
const EXPECTED_RENDERER_RECEIPT =
  'lerms.horde-live-runtime-renderer.v0';
const EXPECTED_RUNTIME_SCHEMA =
  'lerms.horde-live-runtime-composition.v0';
const EXPECTED_TERRAIN_SCHEMA =
  'lerms.hill-of-hills-terrain-buffer.v0';
const EXPECTED_CARRIER_SHA256 =
  '8fed20d958ef48797c14ad1d3846a50eae05d43e6ae67f8805060b02f1abde8e';
const EXPECTED_RAIL_REVISION =
  'ced6db3d2ed3325ae86f781ab9d7d565dc6d5f58';
const CHROME =
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const options = parseArgs(process.argv.slice(2));
const report = {
  schema: 'lerms.horde-live-runtime-browser-witness.v0',
  requestedUrl: options.url,
  effectiveUrl: null,
  viewport: { width: options.width, height: options.height },
  phase: 'launch',
  failurePhase: null,
  ok: false,
  liveClockVerified: false,
  wallClockCouplingVerified: false,
  wallClockCouplingRatio: 0,
  wallCouplingSamples: [],
  liveStateSamples: [],
  livePixelSamples: [],
  incrementalAdmissionVerified: false,
  currentHillSupportVerified: false,
  zeroReplayFramesVerified: false,
  pauseResumeVerified: false,
  oneRendererVerified: false,
  nativeDepthVerified: false,
  fullHillGeometryVerified: false,
  carrierCanvasNonblank: false,
  carrierCanvasMotionPixels: 0,
  terrainChangedDuringRuntime: false,
  departureBodyAbsent: false,
  departureHistoryRetained: false,
  deterministicRuntimeIdentity: false,
  carrierReceiptComplete: false,
  oneOperatorPlay: false,
  layoutContained: false,
  primaryOutputWritten: false,
  sampleAScreenshot: options.sampleAScreenshot,
  sampleBScreenshot: options.sampleBScreenshot,
  screenshot: options.screenshot,
  departureScreenshot: options.departureScreenshot,
};

async function runWitness() {
  let browser;
  let chrome;
  let profileDir;
  try {
    const port = await freePort();
    profileDir = mkdtempSync(`${tmpdir()}/lerms-live-runtime-chrome-`);
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
      mobile: options.width <= 700,
    });

    report.phase = 'navigate';
    await browser.command('Page.navigate', { url: options.url });
    await waitFor(
      async () => {
        const status = await browser.evaluate(
          'document.documentElement.dataset.smokeStatus',
        );
        return status === 'verified' || status === 'failed';
      },
      15_000,
      'live runtime source verification',
    );

    report.phase = 'route-identity';
    const identity = await browser.evaluate(`(() => {
      const data = document.documentElement.dataset;
      return {
        effectiveUrl: location.href,
        smokeStatus: data.smokeStatus ?? null,
        carrierStatus: data.carrierStatus ?? null,
        requestedRoute: data.requestedRoute ?? null,
        effectiveRoute: data.effectiveRoute ?? null,
        requestedRenderer: data.requestedRenderer ?? null,
        effectiveRenderer: data.effectiveRenderer ?? null,
        sourceStatus: data.sourceStatus ?? null,
        runtimeSchema: data.liveRuntimeSchema ?? null,
        terrainSchema: data.terrainBufferSchema ?? null,
        terrainSampleCount: Number(data.terrainSampleCount),
        terrainTriangleCount: Number(data.terrainTriangleCount),
        depthBits: Number(data.depthBits),
        bodySha256: data.carrierBodySha256 ?? null,
        railRevision: data.carrierRailRevision ?? null,
        precomputedFrameCount: Number(data.precomputedFrameCount),
        prefixRebuildCount: Number(data.prefixRebuildCount),
        replayConstructorCalls: Number(data.replayConstructorCalls),
        error: document.querySelector('[data-smoke-error]')?.textContent ?? null,
      };
    })()`);
    Object.assign(report, identity);
    assert.equal(
      identity.smokeStatus,
      'verified',
      `live source rejected: ${identity.error ?? 'no error surfaced'}`,
    );
    assert.equal(identity.requestedRoute, EXPECTED_ROUTE);
    assert.equal(identity.effectiveRoute, EXPECTED_ROUTE);
    assert.equal(identity.requestedRenderer, EXPECTED_RENDERER);
    assert.equal(identity.effectiveRenderer, EXPECTED_RENDERER);
    assert.equal(identity.sourceStatus, 'live-incremental-current-hill');
    assert.equal(identity.runtimeSchema, EXPECTED_RUNTIME_SCHEMA);
    assert.equal(identity.terrainSchema, EXPECTED_TERRAIN_SCHEMA);
    assert.equal(identity.terrainSampleCount, 2_880);
    assert.equal(identity.terrainTriangleCount, 5_546);
    assert.ok(identity.depthBits >= 16);
    assert.equal(identity.bodySha256, EXPECTED_CARRIER_SHA256);
    assert.equal(identity.railRevision, EXPECTED_RAIL_REVISION);
    report.zeroReplayFramesVerified =
      identity.precomputedFrameCount === 0 &&
      identity.prefixRebuildCount === 0 &&
      identity.replayConstructorCalls === 0;
    assert.ok(
      report.zeroReplayFramesVerified,
      'active route retained replay or prefix-rebuild authority',
    );

    report.phase = 'one-renderer';
    const structure = await browser.evaluate(`(() => ({
      canvasCount: document.querySelectorAll('.stage canvas').length,
      fullHillCanvasCount:
        document.querySelectorAll('.stage__renderer[data-full-hill="true"]').length,
      visibleSvgCount: [...document.querySelectorAll('.stage svg')]
        .filter((svg) => getComputedStyle(svg).display !== 'none').length,
      timelineStepCount: document.querySelectorAll('.timeline__step').length,
      speedControlCount: document.querySelectorAll('[data-speed]').length,
      rendererId:
        document.querySelector('.stage__renderer')?.dataset.rendererId ?? null,
    }))()`);
    report.oneRendererVerified =
      structure.canvasCount === 1 &&
      structure.fullHillCanvasCount === 1 &&
      structure.visibleSvgCount === 0 &&
      structure.timelineStepCount === 0 &&
      structure.speedControlCount === 0 &&
      structure.rendererId === EXPECTED_RENDERER;
    report.nativeDepthVerified = identity.depthBits >= 16;
    report.fullHillGeometryVerified =
      identity.terrainSampleCount === 2_880 &&
      identity.terrainTriangleCount === 5_546;
    assert.ok(report.oneRendererVerified, 'live stage is split or replay-controlled');
    assert.ok(report.nativeDepthVerified, 'live renderer has no depth buffer');
    assert.ok(report.fullHillGeometryVerified, 'live Hill grid is partial');

    report.phase = 'paused-on-open';
    const initial = await currentState(browser);
    const initialPixels = await readScenePixels(browser);
    await delay(650);
    const held = await currentState(browser);
    assert.equal(initial.elapsedMs, 0);
    assert.equal(initial.tickCount, 0);
    assert.equal(held.elapsedMs, initial.elapsedMs);
    assert.equal(held.tickCount, initial.tickCount);
    assert.equal(
      await browser.evaluate(
        'document.documentElement.dataset.operatorPlayCount',
      ),
      '0',
    );

    report.phase = 'live-clock';
    const wallStartedAt = performance.now();
    await browser.evaluate(
      `document.querySelector('[data-play-toggle]')?.click()`,
    );
    await delay(650);
    let sampleA;
    let wallElapsedAtSampleA;
    await waitFor(async () => {
      const candidate = await currentState(browser);
      const wallElapsed = performance.now() - wallStartedAt;
      report.wallCouplingSamples.push({
        runtimeElapsedMs: candidate.elapsedMs,
        wallElapsedMs: Number(wallElapsed.toFixed(1)),
        driftMs: Number((wallElapsed - candidate.elapsedMs).toFixed(1)),
      });
      const couplingRatio = candidate.elapsedMs / wallElapsed;
      if (
        candidate.elapsedMs > 0 &&
        couplingRatio >= 0.3 &&
        couplingRatio <= 1.25
      ) {
        sampleA = candidate;
        wallElapsedAtSampleA = wallElapsed;
        report.wallClockCouplingRatio = Number(
          couplingRatio.toFixed(3),
        );
        return true;
      }
      return false;
    }, 3_000, 'live runtime wall-clock coupling');
    sampleA = await currentState(browser, true);
    wallElapsedAtSampleA = performance.now() - wallStartedAt;
    report.wallClockCouplingRatio = Number(
      (sampleA.elapsedMs / wallElapsedAtSampleA).toFixed(3),
    );
    const pixelsA = await readScenePixels(browser);
    await captureScreenshot(browser, options.sampleAScreenshot);
    await browser.evaluate(
      `document.querySelector('[data-play-toggle]')?.click()`,
    );
    let sampleB;
    await waitFor(async () => {
      const candidate = await currentState(browser);
      if (
        candidate.elapsedMs >= sampleA.elapsedMs + 1_000 &&
        candidate.admittedIntervalCount >
          sampleA.admittedIntervalCount &&
        candidate.sourceDistance > sampleA.sourceDistance
      ) {
        sampleB = candidate;
        return true;
      }
      return false;
    }, 3_000, 'second live in-traversal sample');
    sampleB = await currentState(browser, true);
    const pixelsB = await readScenePixels(browser);
    await captureScreenshot(browser, options.sampleBScreenshot);
    await browser.evaluate(
      `document.querySelector('[data-play-toggle]')?.click()`,
    );
    report.liveStateSamples = [sampleA, sampleB];
    report.livePixelSamples = [pixelsA, pixelsB];
    report.liveClockVerified =
      sampleA.elapsedMs > 0 &&
      sampleB.elapsedMs > sampleA.elapsedMs &&
      sampleA.tickCount > 0 &&
      sampleB.tickCount > sampleA.tickCount &&
      sampleB.sourceDistance > sampleA.sourceDistance;
    report.wallClockCouplingVerified =
      report.wallClockCouplingRatio >= 0.3 &&
      report.wallClockCouplingRatio <= 1.25;
    report.incrementalAdmissionVerified =
      sampleA.admittedIntervalCount > 0 &&
      sampleB.admittedIntervalCount >
        sampleA.admittedIntervalCount &&
      sampleB.exposureSeconds > sampleA.exposureSeconds &&
      sampleB.trafficChecksum !== sampleA.trafficChecksum;
    report.currentHillSupportVerified =
      sampleA.supportHillSource.length > 0 &&
      sampleB.supportHillSource.length > 0 &&
      sampleB.supportHillSource !== sampleA.supportHillSource;
    report.terrainChangedDuringRuntime =
      sampleB.terrainSampleChecksum !==
        sampleA.terrainSampleChecksum ||
      sampleB.terrainTopologyChecksum !==
        sampleA.terrainTopologyChecksum;
    report.carrierCanvasNonblank =
      pixelsA.nonBackgroundSamples >= 32 &&
      pixelsA.distinctColors >= 8;
    report.carrierCanvasMotionPixels = Number(
      Math.hypot(
        pixelsB.redCentroidX - pixelsA.redCentroidX,
        pixelsB.redCentroidY - pixelsA.redCentroidY,
      ).toFixed(2),
    );
    assert.ok(report.liveClockVerified, 'runtime did not advance live state');
    assert.ok(
      report.wallClockCouplingVerified,
      `runtime ${sampleA.elapsedMs}ms did not advance meaningfully from pre-readback wall clock ${wallElapsedAtSampleA.toFixed(1)}ms`,
    );
    assert.ok(
      report.incrementalAdmissionVerified,
      'root exposure did not accumulate incrementally',
    );
    assert.ok(
      report.currentHillSupportVerified,
      'body support did not follow current Hill frames',
    );
    assert.ok(
      report.terrainChangedDuringRuntime,
      'Hill did not change during the live run',
    );
    assert.ok(report.carrierCanvasNonblank, 'live canvas is blank or partial');
    assert.ok(
      report.carrierCanvasMotionPixels >= 4,
      'carrier did not visibly move during live time',
    );
    await captureScreenshot(browser, options.screenshot);

    report.phase = 'pause-resume';
    await browser.evaluate(
      `document.querySelector('[data-play-toggle]')?.click()`,
    );
    await delay(100);
    const pausedA = await currentState(browser);
    await delay(450);
    const pausedB = await currentState(browser);
    await browser.evaluate(
      `document.querySelector('[data-play-toggle]')?.click()`,
    );
    report.pauseResumeVerified =
      pausedB.elapsedMs === pausedA.elapsedMs &&
      pausedB.tickCount === pausedA.tickCount;
    assert.ok(report.pauseResumeVerified, 'pause allowed hidden live advancement');

    report.phase = 'completion';
    await waitFor(
      () =>
        browser.evaluate(
          `document.documentElement.dataset.carrierReceiptStatus === 'complete'`,
        ),
      15_000,
      'live runtime completion receipt',
    );
    const completed = await browser.evaluate(`(() => ({
      receipt: window.__lermHordeLiveRuntimeReport ?? null,
      operatorPlayCount: document.documentElement.dataset.operatorPlayCount,
      carrierStatus: document.documentElement.dataset.carrierStatus,
    }))()`);
    const receipt = completed.receipt;
    report.carrierReceipt = receipt;
    report.carrierReceiptComplete =
      receipt?.schema === EXPECTED_RENDERER_RECEIPT &&
      receipt?.status?.ok === true &&
      receipt?.status?.phase === 'complete' &&
      receipt?.runtime?.schema === EXPECTED_RUNTIME_SCHEMA &&
      completed.carrierStatus === 'complete';
    report.oneOperatorPlay =
      completed.operatorPlayCount === '1' &&
      receipt?.playback?.operatorPlayCount === 1 &&
      receipt?.playback?.autoplayObserved === false;
    report.departureBodyAbsent =
      receipt?.carrier?.departed === true &&
      receipt?.runtime?.departure?.bodyVisible === false &&
      (await readScenePixels(browser)).redBodySamples === 0;
    report.departureHistoryRetained =
      receipt?.runtime?.admission?.trafficRetainedAfterDeparture ===
        true &&
      receipt?.runtime?.admission?.trafficChecksum?.length > 0 &&
      receipt?.runtime?.admission?.intervalCount ===
        receipt?.runtime?.admission?.uniqueEpisodeCount;
    report.deterministicRuntimeIdentity =
      receipt?.runtime?.clock?.maximumIncrementMs === 200 &&
      receipt?.runtime?.clock?.tickCount === 18 &&
      receipt?.runtime?.admission?.intervalCount === 13 &&
      receipt?.runtime?.admission?.uniqueEpisodeCount === 13 &&
      receipt?.runtime?.admission?.exposureSeconds ===
        1.9332167316682374 &&
      receipt?.runtime?.admission?.trafficChecksum === '8c8ba3e9' &&
      receipt?.runtime?.terrain?.sampleChecksum === '43ce0ebb' &&
      receipt?.runtime?.terrain?.topologyChecksum === '5335c118' &&
      receipt?.runtime?.terrain?.supportFrameChecksum === '34c0a178';
    report.zeroReplayFramesVerified &&=
      receipt?.runtime?.clock?.precomputedFrameCount === 0 &&
      receipt?.runtime?.clock?.prefixRebuildCount === 0 &&
      receipt?.runtime?.clock?.replayConstructorCalls === 0;
    assert.ok(report.carrierReceiptComplete, 'live completion receipt is missing');
    assert.ok(report.oneOperatorPlay, 'pause/resume counted as multiple runs');
    assert.ok(report.departureBodyAbsent, 'carrier remained after departure');
    assert.ok(
      report.departureHistoryRetained,
      'Hill traffic did not persist after departure',
    );
    assert.ok(
      report.deterministicRuntimeIdentity,
      'browser scheduling changed fixed live-runtime interval identity',
    );
    assert.ok(
      report.zeroReplayFramesVerified,
      'completion receipt smuggled replay authority',
    );
    await captureScreenshot(browser, options.departureScreenshot);

    report.phase = 'layout';
    const layout = await browser.evaluate(`(() => {
      const selectors = ['.smoke-header', '.stage', '.transport', '.smoke-footer'];
      const rects = selectors.map((selector) => {
        const rect = document.querySelector(selector)?.getBoundingClientRect();
        return rect && {
          left: rect.left, top: rect.top, right: rect.right,
          bottom: rect.bottom, width: rect.width, height: rect.height,
        };
      });
      return {
        contained: rects.every((rect) =>
          rect && rect.left >= -0.5 && rect.top >= -0.5 &&
          rect.right <= innerWidth + 0.5 && rect.bottom <= innerHeight + 0.5 &&
          rect.width > 0 && rect.height > 0
        ),
        ordered: rects.every((rect, index) =>
          index === 0 || rect.top >= rects[index - 1].bottom - 0.5
        ),
        noOverflow:
          document.documentElement.scrollWidth <= innerWidth &&
          document.documentElement.scrollHeight <= innerHeight,
        controlsFit: [...document.querySelectorAll('button, .source-state, .smoke-footer strong')]
          .every((element) =>
            element.scrollWidth <= element.clientWidth + 1 &&
            element.scrollHeight <= element.clientHeight + 1
          ),
      };
    })()`);
    report.layout = layout;
    report.layoutContained =
      layout.contained &&
      layout.ordered &&
      layout.noOverflow &&
      layout.controlsFit;
    assert.ok(report.layoutContained, 'live smoke layout overlaps or clips');

    report.phase = 'primary-output';
    report.primaryOutputWritten =
      statSync(options.screenshot).size >= 10_000 &&
      statSync(options.departureScreenshot).size >= 10_000;
    assert.ok(report.primaryOutputWritten, 'live visual evidence is missing or blank');
    report.phase = 'complete';
    report.ok = true;
  } catch (error) {
    report.failurePhase = report.phase;
    report.error = error instanceof Error ? error.message : String(error);
    process.exitCode = 1;
  } finally {
    try {
      browser?.close();
    } catch {}
    if (chrome && chrome.exitCode === null) {
      chrome.kill('SIGTERM');
      await Promise.race([
        new Promise((resolveExit) => chrome.once('exit', resolveExit)),
        delay(1_500),
      ]);
    }
    if (profileDir) {
      try {
        rmSync(profileDir, {
          recursive: true,
          force: true,
          maxRetries: 5,
          retryDelay: 100,
        });
      } catch (error) {
        report.cleanupError =
          error instanceof Error ? error.message : String(error);
      }
    }
    writeFileSync(options.report, `${JSON.stringify(report, null, 2)}\n`);
  }

  if (report.ok) {
    console.log(
      `Lerm Horde live runtime browser witness passed: ${options.report}`,
    );
  } else {
    console.error(
      `Lerm Horde live runtime browser witness failed during ${report.failurePhase}: ${report.error}`,
    );
  }
}

async function currentState(browser, togglePlay = false) {
  return browser.evaluate(`(() => {
    ${
      togglePlay
        ? "document.querySelector('[data-play-toggle]')?.click();"
        : ''
    }
    const stage = document.querySelector('[data-smoke-viewport]');
    return {
      elapsedMs: Number(stage?.dataset.elapsedMs),
      tickCount: Number(stage?.dataset.frameIndex),
      frameKind: stage?.dataset.frameKind ?? '',
      admittedIntervalCount: Number(stage?.dataset.admittedIntervalCount),
      sourceDistance: Number(stage?.dataset.sourceDistance),
      progress: Number(stage?.dataset.progress),
      supportHillSource: stage?.dataset.supportHillSource ?? '',
      terrainSampleChecksum: stage?.dataset.terrainSampleChecksum ?? '',
      terrainTopologyChecksum: stage?.dataset.terrainTopologyChecksum ?? '',
      trafficChecksum: stage?.dataset.trafficChecksum ?? '',
      exposureSeconds: Number(
        document.querySelector('[data-exposure]')?.textContent ?? '0'
      ),
    };
  })()`);
}

async function readScenePixels(browser) {
  return browser.evaluate(`(() => {
    const canvas = document.querySelector('.stage__renderer');
    const context = canvas?.getContext('webgl2') ?? canvas?.getContext('webgl');
    if (!canvas || !context) {
      return {
        nonBackgroundSamples: 0, redBodySamples: 0, distinctColors: 0,
        redCentroidX: Number.NaN, redCentroidY: Number.NaN,
      };
    }
    const pixels = new Uint8Array(canvas.width * canvas.height * 4);
    context.readPixels(
      0, 0, canvas.width, canvas.height,
      context.RGBA, context.UNSIGNED_BYTE, pixels,
    );
    const colors = new Set();
    let nonBackgroundSamples = 0;
    let redBodySamples = 0;
    let weightedX = 0;
    let weightedY = 0;
    for (let y = 0; y < canvas.height; y += 4) {
      for (let x = 0; x < canvas.width; x += 4) {
        const offset = (y * canvas.width + x) * 4;
        const red = pixels[offset];
        const green = pixels[offset + 1];
        const blue = pixels[offset + 2];
        if (Math.abs(red - 6) + Math.abs(green - 16) + Math.abs(blue - 13) > 12) {
          nonBackgroundSamples += 1;
          colors.add(
            [Math.round(red / 16), Math.round(green / 16), Math.round(blue / 16)]
              .join(','),
          );
        }
        if (red > 70 && red > green * 1.35 && red > blue * 1.2) {
          redBodySamples += 1;
          weightedX += x;
          weightedY += y;
        }
      }
    }
    return {
      nonBackgroundSamples,
      redBodySamples,
      distinctColors: colors.size,
      redCentroidX:
        redBodySamples > 0 ? weightedX / redBodySamples : Number.NaN,
      redCentroidY:
        redBodySamples > 0 ? weightedY / redBodySamples : Number.NaN,
    };
  })()`);
}

async function captureScreenshot(browser, outputPath) {
  const capture = await browser.command('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
    captureBeyondViewport: false,
  });
  const png = Buffer.from(capture.data, 'base64');
  assert.deepEqual(
    png.subarray(0, 8),
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    'primary output is not PNG',
  );
  writeFileSync(outputPath, png);
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
  const viewport = values.get('viewport') ?? '1440x900';
  const match = /^(\d+)x(\d+)$/.exec(viewport);
  if (!match) throw new Error(`invalid --viewport ${viewport}`);
  const label = values.get('label') ?? 'desktop';
  return {
    url: values.get('url') ?? 'http://127.0.0.1:4198/smoke.html',
    width: Number(match[1]),
    height: Number(match[2]),
    report: resolve(
      values.get('report') ??
        `${tmpdir()}/lerms-live-runtime-${label}.json`,
    ),
    screenshot: resolve(
      values.get('screenshot') ??
        `${tmpdir()}/lerms-live-runtime-${label}.png`,
    ),
    sampleAScreenshot: resolve(
      values.get('sample-a-screenshot') ??
        `${tmpdir()}/lerms-live-runtime-${label}-sample-a.png`,
    ),
    sampleBScreenshot: resolve(
      values.get('sample-b-screenshot') ??
        `${tmpdir()}/lerms-live-runtime-${label}-sample-b.png`,
    ),
    departureScreenshot: resolve(
      values.get('departure-screenshot') ??
        `${tmpdir()}/lerms-live-runtime-${label}-departure.png`,
    ),
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

await runWitness();
