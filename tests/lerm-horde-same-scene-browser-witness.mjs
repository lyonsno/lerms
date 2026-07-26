#!/usr/bin/env node

import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { isDeepStrictEqual } from 'node:util';
import {
  mkdtempSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

const EXPECTED_ROUTE = 'lerms/hill-of-hills/horde-same-scene-prefix-replay';
const EXPECTED_RENDERER = 'three-webgl-full-hill-v0';
const EXPECTED_RECEIPT_SCHEMA = 'lerms.horde-full-hill-one-renderer.v0';
const EXPECTED_TERRAIN_SCHEMA = 'lerms.hill-of-hills-terrain-buffer.v0';
const EXPECTED_CARRIER_SHA256 =
  '8fed20d958ef48797c14ad1d3846a50eae05d43e6ae67f8805060b02f1abde8e';
const EXPECTED_REGISTRATION_SHA256 =
  'a63fa02ffa7a144234eef3b9902ac9d349fd413d93a19c87ee1464b0b61ca7f9';
const EXPECTED_RAIL_REVISION =
  'ced6db3d2ed3325ae86f781ab9d7d565dc6d5f58';
const EXPECTED_RAIL_MODULE_SHA256 =
  'ffce984721d00468856e70bd0805961a852d8690bcd402d1dc5ae96ad1ec88f0';
const EXPECTED_RAIL_HISTORY_SHA256 =
  'c56627554f5cacb8f151361419bfe70177e2d86490193e30b2f148a11b430b2e';
const EXPECTED_RAIL_ID =
  'lerm-horde-719024-control-crossing-v0-left-longitudinal-short-rail';
const EXPECTED_EVALUATOR_ROUTE =
  'kaminos/fitted-proxy-rig/arbitrary-phase-plus-semantic-probes-v0';
const PRODUCER_RECEIPT_URL =
  '/vendor/lerms-c0ba891/artifacts/lerm-horde-producer-history/receipt.json';
const CHROME =
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const options = parseArgs(process.argv.slice(2));
const report = {
  schema: 'lerms.horde-full-hill-browser-witness.v0',
  requestedUrl: options.url,
  effectiveUrl: null,
  viewport: { width: options.width, height: options.height },
  carrierFrame: options.carrierFrame,
  phase: 'launch',
  failurePhase: null,
  ok: false,
  smokeStatus: null,
  carrierStatus: null,
  carrierReceiptComplete: false,
  initialPauseHeld: false,
  oneOperatorPlay: false,
  oneRendererVerified: false,
  nativeDepthVerified: false,
  fullHillGeometryVerified: false,
  exactCarrierVisible: false,
  carrierCanvasNonblank: false,
  carrierCanvasMotionPixels: 0,
  railFrameVerified: false,
  hillSupportTrackingVerified: false,
  fullSourceEnvelopeVerified: false,
  sourceEnvelopeSubstitutionRejected: false,
  sourceEnvelopeFrameCount: null,
  sourceEnvelopeReceiptUrl: null,
  terrainChangedAcrossPrefixes: false,
  departureBodyAbsent: false,
  departureHistoryRetained: false,
  motionBodyVisible: false,
  requestedRoute: null,
  effectiveRoute: null,
  requestedRenderer: null,
  effectiveRenderer: null,
  sourceStatus: null,
  terrainBufferSchema: null,
  terrainSampleCount: null,
  terrainTriangleCount: null,
  depthBits: null,
  carrierBodySha256: null,
  carrierRegistrationSha256: null,
  carrierRailRevision: null,
  carrierRailModuleSha256: null,
  carrierRailHistorySha256: null,
  effectiveRailId: null,
  effectiveEvaluatorRoute: null,
  playbackAdvanced: false,
  pauseHeld: false,
  layoutContained: false,
  headerHeightAcceptable: false,
  primaryOutputWritten: false,
  screenshot: options.screenshot,
  departureScreenshot: options.departureScreenshot,
};

async function runWitness() {
  let browser;
  let chrome;
  let profileDir;
  try {
    const port = await freePort();
    profileDir = mkdtempSync(`${tmpdir()}/lerms-full-hill-chrome-`);
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
      'full-Hill smoke verification',
    );

    report.phase = 'source-identity';
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
        fullHillReceiptSchema: data.fullHillReceiptSchema ?? null,
        terrainBufferSchema: data.terrainBufferSchema ?? null,
        terrainSampleCount: Number(data.terrainSampleCount),
        terrainTriangleCount: Number(data.terrainTriangleCount),
        depthBits: Number(data.depthBits),
        carrierBodySha256: data.carrierBodySha256 ?? null,
        carrierRegistrationSha256: data.carrierRegistrationSha256 ?? null,
        carrierRailRevision: data.carrierRailRevision ?? null,
        carrierRailModuleSha256: data.carrierRailModuleSha256 ?? null,
        carrierRailHistorySha256: data.carrierRailHistorySha256 ?? null,
        effectiveRailId: data.effectiveRailId ?? null,
        effectiveEvaluatorRoute: data.effectiveEvaluatorRoute ?? null,
        error: document.querySelector('[data-smoke-error]')?.textContent ?? null,
      };
    })()`);
    Object.assign(report, identity);
    assert.equal(
      report.smokeStatus,
      'verified',
      `smoke failed: ${identity.error ?? 'no error surfaced'}`,
    );
    assert.equal(report.requestedRoute, EXPECTED_ROUTE);
    assert.equal(report.effectiveRoute, EXPECTED_ROUTE);
    assert.equal(report.requestedRenderer, EXPECTED_RENDERER);
    assert.equal(report.effectiveRenderer, EXPECTED_RENDERER);
    assert.equal(report.sourceStatus, 'canonical-dynamic-full-hill-replay');
    assert.equal(identity.fullHillReceiptSchema, EXPECTED_RECEIPT_SCHEMA);
    assert.equal(report.terrainBufferSchema, EXPECTED_TERRAIN_SCHEMA);
    assert.equal(report.terrainSampleCount, 2_880);
    assert.equal(report.terrainTriangleCount, 5_546);
    assert.ok(report.depthBits >= 16);
    assert.equal(report.carrierBodySha256, EXPECTED_CARRIER_SHA256);
    assert.equal(
      report.carrierRegistrationSha256,
      EXPECTED_REGISTRATION_SHA256,
    );
    assert.equal(report.carrierRailRevision, EXPECTED_RAIL_REVISION);
    assert.equal(report.carrierRailModuleSha256, EXPECTED_RAIL_MODULE_SHA256);
    assert.equal(report.carrierRailHistorySha256, EXPECTED_RAIL_HISTORY_SHA256);
    assert.equal(report.effectiveRailId, EXPECTED_RAIL_ID);
    assert.equal(report.effectiveEvaluatorRoute, EXPECTED_EVALUATOR_ROUTE);

    report.phase = 'one-renderer-structure';
    const structure = await browser.evaluate(`(() => ({
      rendererCanvasCount: document.querySelectorAll('.stage canvas').length,
      fullHillCanvasCount:
        document.querySelectorAll('.stage__renderer[data-full-hill="true"]').length,
      visibleSvgCount: [...document.querySelectorAll('.stage svg')]
        .filter((svg) => getComputedStyle(svg).display !== 'none').length,
      rendererId:
        document.querySelector('.stage__renderer')?.dataset.rendererId ?? null,
    }))()`);
    report.oneRendererVerified =
      structure.rendererCanvasCount === 1 &&
      structure.fullHillCanvasCount === 1 &&
      structure.visibleSvgCount === 0 &&
      structure.rendererId === EXPECTED_RENDERER;
    report.nativeDepthVerified = report.depthBits >= 16;
    report.fullHillGeometryVerified =
      report.terrainSampleCount === 2_880 &&
      report.terrainTriangleCount === 5_546;
    assert.ok(report.oneRendererVerified, 'stage is not one renderer with zero SVG');
    assert.ok(report.nativeDepthVerified, 'renderer has no usable depth buffer');
    assert.ok(
      report.fullHillGeometryVerified,
      'renderer did not consume the full 48 by 60 Hill grid',
    );

    report.phase = 'paused-containment';
    const initialFrame = await currentFrame(browser);
    await delay(1_100);
    const heldInitialFrame = await currentFrame(browser);
    report.initialPauseHeld =
      initialFrame.frameIndex === '1' &&
      heldInitialFrame.frameIndex === initialFrame.frameIndex &&
      (await browser.evaluate(
        'document.documentElement.dataset.operatorPlayCount',
      )) === '0';
    report.pauseHeld = report.initialPauseHeld;
    assert.ok(report.initialPauseHeld, 'full-Hill traversal autoplayed');
    const initialPixels = await readScenePixels(browser);

    report.phase = 'moving-prefixes';
    await selectFrame(browser, options.carrierFrame);
    const movingFrame = await currentFrame(browser);
    const movingPixels = await readScenePixels(browser);
    await selectFrame(browser, 14);
    const lateFrame = await currentFrame(browser);
    const latePixels = await readScenePixels(browser);
    report.carrierCanvasNonblank =
      movingPixels.nonBackgroundSamples >= 32 &&
      movingPixels.distinctColors >= 8;
    report.carrierCanvasMotionPixels = Number(
      Math.hypot(
        movingPixels.redCentroidX - initialPixels.redCentroidX,
        movingPixels.redCentroidY - initialPixels.redCentroidY,
      ).toFixed(2),
    );
    report.exactCarrierVisible =
      movingFrame.frameKind === 'actor-prefix' &&
      movingPixels.redBodySamples >= 8 &&
      latePixels.redBodySamples >= 8;
    report.motionBodyVisible = report.exactCarrierVisible;
    report.terrainChangedAcrossPrefixes =
      movingFrame.terrainSampleChecksum !== lateFrame.terrainSampleChecksum ||
      movingFrame.terrainTopologyChecksum !==
        lateFrame.terrainTopologyChecksum;
    assert.ok(report.carrierCanvasNonblank, 'full-Hill canvas is blank or partial');
    assert.ok(report.exactCarrierVisible, 'exact red carrier is absent');
    assert.ok(
      report.carrierCanvasMotionPixels >= 4,
      'exact carrier did not move in rendered pixels',
    );
    assert.ok(
      report.terrainChangedAcrossPrefixes,
      'Hill buffer did not change across moving prefixes',
    );

    report.phase = 'departure';
    await selectFrame(browser, 17);
    const departure = await currentFrame(browser);
    const departurePixels = await readScenePixels(browser);
    report.departureBodyAbsent =
      departure.frameKind === 'after-departure' &&
      departure.prefixSampleCount === '15' &&
      departurePixels.redBodySamples === 0;
    assert.ok(report.departureBodyAbsent, 'body remained after departure');
    await captureScreenshot(browser, options.departureScreenshot);

    report.phase = 'one-play-completion';
    await browser.evaluate(
      `document.querySelector('[data-restart]')?.click();
       document.querySelector('[data-speed="1.5"]')?.click();
       document.querySelector('[data-play-toggle]')?.click();`,
    );
    await delay(700);
    report.playbackAdvanced = (await currentFrame(browser)).frameIndex !== '1';
    assert.ok(report.playbackAdvanced, 'operator-started traversal did not advance');
    await waitFor(
      () =>
        browser.evaluate(
          `document.documentElement.dataset.carrierReceiptStatus === 'complete'`,
        ),
      12_000,
      'full-Hill completion receipt',
    );
    const completed = await browser.evaluate(`(() => ({
      receipt: window.__lermHordeFullHillReport ?? null,
      operatorPlayCount: document.documentElement.dataset.operatorPlayCount,
      carrierStatus: document.documentElement.dataset.carrierStatus,
    }))()`);
    const expectedSource = await browser.evaluate(`(async () => {
      const requestedReceiptUrl = ${JSON.stringify(PRODUCER_RECEIPT_URL)};
      const response = await fetch(requestedReceiptUrl, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(
          \`canonical producer receipt fetch failed: \${response.status}\`,
        );
      }
      const producerReceipt = await response.json();
      const module = await import('/src/lerm-horde-full-hill-renderer.ts');
      const source = module.createFullHillOneRendererSource(producerReceipt);
      return {
        requestedReceiptUrl,
        effectiveReceiptUrl: new URL(response.url).pathname,
        frames: source.buffers.map((buffer) =>
          module.createFullHillFrameSourceEnvelope(buffer),
        ),
      };
    })()`);
    report.carrierReceipt = completed.receipt;
    report.carrierStatus = completed.carrierStatus;
    report.carrierReceiptComplete =
      completed.receipt?.schema === EXPECTED_RECEIPT_SCHEMA &&
      completed.receipt?.status?.ok === true &&
      completed.receipt?.status?.phase === 'complete' &&
      completed.carrierStatus === 'complete';
    report.oneOperatorPlay =
      completed.operatorPlayCount === '1' &&
      completed.receipt?.playback?.operatorPlayCount === 1 &&
      completed.receipt?.playback?.autoplayObserved === false;
    report.railFrameVerified =
      completed.receipt?.carrier?.bodySha256 === EXPECTED_CARRIER_SHA256 &&
      completed.receipt?.carrier?.visiblePrefixFrameCount === 15;
    report.hillSupportTrackingVerified =
      completed.receipt?.terrain?.frameCount === 18 &&
      completed.receipt?.terrain?.frames?.length === 18 &&
      completed.receipt.terrain.frames.every(
        (frame, index) =>
          frame.index === index &&
          frame.frameId &&
          /^[0-9a-f]{8,64}$/.test(frame.sampleChecksum) &&
          /^[0-9a-f]{8,64}$/.test(frame.topologyChecksum) &&
          /^[0-9a-f]{8,64}$/.test(frame.trafficChecksum),
      );
    report.sourceEnvelopeFrameCount = expectedSource.frames.length;
    report.sourceEnvelopeReceiptUrl = expectedSource.effectiveReceiptUrl;
    const substitutedEnvelope = structuredClone(expectedSource.frames[10]);
    substitutedEnvelope.source.timestampMs += 1;
    report.sourceEnvelopeSubstitutionRejected = !isDeepStrictEqual(
      substitutedEnvelope,
      expectedSource.frames[10],
    );
    report.fullSourceEnvelopeVerified =
      expectedSource.requestedReceiptUrl === PRODUCER_RECEIPT_URL &&
      expectedSource.effectiveReceiptUrl === PRODUCER_RECEIPT_URL &&
      expectedSource.frames.length === 18 &&
      completed.receipt?.terrain?.frames?.length === 18 &&
      completed.receipt.terrain.frames.every(
        (frame, index) =>
          isDeepStrictEqual(
            receiptFrameSourceEnvelope(frame),
            expectedSource.frames[index],
          ),
      );
    report.departureHistoryRetained =
      completed.receipt?.departure?.bodyVisible === false &&
      completed.receipt?.departure?.hillHistoryRetained === true &&
      completed.receipt?.departure?.trafficChecksum ===
        completed.receipt?.terrain?.frames?.[17]?.trafficChecksum;
    assert.ok(report.carrierReceiptComplete, 'completion receipt is missing');
    assert.ok(report.oneOperatorPlay, 'completion was not exactly one Play');
    assert.ok(report.railFrameVerified, 'carrier identity was substituted');
    assert.ok(
      report.hillSupportTrackingVerified,
      'terrain frame identity or checksums were lost',
    );
    assert.ok(
      report.sourceEnvelopeSubstitutionRejected,
      'source-envelope comparison accepted a substituted source timestamp',
    );
    assert.ok(
      report.fullSourceEnvelopeVerified,
      'terrain source or witness envelope was reduced or substituted',
    );
    assert.ok(
      report.departureHistoryRetained,
      'departure lost retained Hill history',
    );

    report.phase = 'layout';
    await selectFrame(browser, options.carrierFrame);
    const layout = await browser.evaluate(`(() => {
      const selectors = ['.smoke-header', '.stage', '.transport', '.smoke-footer'];
      const rects = selectors.map((selector) => {
        const rect = document.querySelector(selector)?.getBoundingClientRect();
        return rect && {
          selector,
          left: rect.left,
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height,
        };
      });
      return {
        rects,
        contained: rects.every((rect) =>
          rect && rect.left >= -0.5 && rect.top >= -0.5 &&
          rect.right <= innerWidth + 0.5 && rect.bottom <= innerHeight + 0.5 &&
          rect.width > 0 && rect.height > 0
        ),
        ordered: rects.every((rect, index) =>
          index === 0 || rect.top >= rects[index - 1].bottom - 0.5
        ),
        noPageOverflow:
          document.documentElement.scrollWidth <= innerWidth &&
          document.documentElement.scrollHeight <= innerHeight,
        unclippedControls: [
          ...document.querySelectorAll('button, .source-state, .smoke-footer strong'),
        ].every((element) =>
          element.scrollWidth <= element.clientWidth + 1 &&
          element.scrollHeight <= element.clientHeight + 1
        ),
      };
    })()`);
    report.layout = layout;
    report.headerHeightAcceptable =
      layout.rects[0].height <= (options.width <= 700 ? 120 : 100);
    report.layoutContained =
      layout.contained &&
      layout.ordered &&
      layout.noPageOverflow &&
      layout.unclippedControls &&
      report.headerHeightAcceptable;
    assert.ok(report.layoutContained, 'smoke layout is clipped or overlapping');

    report.phase = 'primary-output';
    await captureScreenshot(browser, options.screenshot);
    const finalPixels = await readScenePixels(browser);
    report.primaryOutputWritten =
      statSync(options.screenshot).size >= 10_000 &&
      finalPixels.nonBackgroundSamples >= 32 &&
      finalPixels.distinctColors >= 8 &&
      finalPixels.redBodySamples >= 8;
    assert.ok(
      report.primaryOutputWritten,
      'browser screenshot is missing, blank, partial, or lacks the carrier',
    );
    report.pixelEvidence = finalPixels;
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
      `Lerm Horde full-Hill browser witness passed: ${options.report} / ${options.screenshot}`,
    );
  } else {
    console.error(
      `Lerm Horde full-Hill browser witness failed during ${report.failurePhase}: ${report.error}`,
    );
  }
}

async function selectFrame(browser, frameIndex) {
  await browser.evaluate(
    `document.querySelector('.timeline__step[data-frame-index="${frameIndex}"]')?.click()`,
  );
  await delay(260);
}

async function currentFrame(browser) {
  return browser.evaluate(`(() => {
    const stage = document.querySelector('[data-smoke-viewport]');
    return {
      frameIndex: stage?.dataset.frameIndex ?? null,
      frameKind: stage?.dataset.frameKind ?? null,
      prefixSampleCount: stage?.dataset.prefixSampleCount ?? null,
      terrainSampleChecksum: stage?.dataset.terrainSampleChecksum ?? null,
      terrainTopologyChecksum: stage?.dataset.terrainTopologyChecksum ?? null,
      trafficChecksum: stage?.dataset.trafficChecksum ?? null,
    };
  })()`);
}

async function readScenePixels(browser) {
  return browser.evaluate(`(() => {
    const canvas = document.querySelector('.stage__renderer');
    const context = canvas?.getContext('webgl2') ?? canvas?.getContext('webgl');
    if (!canvas || !context) {
      return {
        nonBackgroundSamples: 0,
        redBodySamples: 0,
        distinctColors: 0,
        redCentroidX: Number.NaN,
        redCentroidY: Number.NaN,
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

function receiptFrameSourceEnvelope(frame) {
  return {
    frameId: frame.frameId,
    source: frame.source,
    sampleChecksum: frame.sampleChecksum,
    topologyChecksum: frame.topologyChecksum,
    proxyMaterialChecksum: frame.proxyMaterialChecksum,
    surfaceDetailChecksum: frame.surfaceDetailChecksum,
    materialEdgeChecksum: frame.materialEdgeChecksum,
    trafficChecksum: frame.trafficChecksum,
    producerTraffic: frame.producerTraffic,
    topologyPossibilityChecksum: frame.topologyPossibilityChecksum,
    supportFrame: frame.supportFrame,
  };
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
  const carrierFrame = Number(values.get('carrier-frame') ?? 10);
  if (!Number.isInteger(carrierFrame) || carrierFrame < 1 || carrierFrame > 15) {
    throw new Error(`invalid --carrier-frame ${values.get('carrier-frame')}`);
  }
  return {
    url: values.get('url') ?? 'http://127.0.0.1:4198/smoke.html',
    width: Number(match[1]),
    height: Number(match[2]),
    carrierFrame,
    report: resolve(
      values.get('report') ??
        `${tmpdir()}/lerms-full-hill-smoke-${label}.json`,
    ),
    screenshot: resolve(
      values.get('screenshot') ??
        `${tmpdir()}/lerms-full-hill-smoke-${label}.png`,
    ),
    departureScreenshot: resolve(
      values.get('departure-screenshot') ??
        `${tmpdir()}/lerms-full-hill-smoke-${label}-departure.png`,
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
        (target) => target.type === 'page' && target.webSocketDebuggerUrl,
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
