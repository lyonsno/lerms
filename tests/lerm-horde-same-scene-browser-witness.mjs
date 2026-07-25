#!/usr/bin/env node

import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { inflateSync } from 'node:zlib';

const EXPECTED_ROUTE = 'lerms/hill-of-hills/horde-same-scene-prefix-replay';
const EXPECTED_PRESENTER =
  '0482274d0612b55969ad6c71f8f5c79c8721ce77';
const EXPECTED_VERIFIER =
  'f916a9309ef4ab3f35d3a94d4e6084a3cdd2f474';
const EXPECTED_VERIFIER_BLOB =
  'ae5aec5b6978a6f9d192d0a37aa7a254408201d7';
const EXPECTED_RECEIPT_SHA256 =
  'c5e087987ebe5e092d7b83d56f3c514c97629413d3e81e5989955b0acf323663';
const EXPECTED_MANIFEST_SHA256 =
  'c8a25168cbbf9d45f7f2b225ab630e088f14a5b97f8b5cb561af7258e335c341';
const EXPECTED_SVG_SHA256 =
  'f657e3365833e5e0465a208ea367ce6c40a429125528f82f25fa71dda39e626c';
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
const EXPECTED_PRESENTATION_REVISION =
  '6217fff858c0b12e330499baf28127f9122826f7';
const EXPECTED_PLAYBACK_REVISION =
  'fbe2e851130bd142b64727a494809141b9954cef';
const EXPECTED_EVALUATOR_ROUTE =
  'kaminos/fitted-proxy-rig/arbitrary-phase-plus-semantic-probes-v0';
const CHROME =
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const options = parseArgs(process.argv.slice(2));
const report = {
  schema: 'lerms.horde-same-scene-browser-witness.v0',
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
  exactCarrierVisible: false,
  hiddenGlyphAbsent: false,
  carrierCanvasNonblank: false,
  carrierCanvasMotionPixels: 0,
  railFrameVerified: false,
  hillSupportTrackingVerified: false,
  hillScreenTrackingVerified: false,
  carrierBodySha256: null,
  carrierRegistrationSha256: null,
  carrierRailRevision: null,
  carrierRailModuleSha256: null,
  carrierRailHistorySha256: null,
  effectiveRailId: null,
  carrierPresentationRevision: null,
  carrierPlaybackRevision: null,
  effectiveEvaluatorRoute: null,
  requestedRoute: null,
  effectiveRoute: null,
  presenterRevision: null,
  verifierRevision: null,
  verifierModuleBlob: null,
  acceptedReceiptSha256: null,
  manifestSha256: null,
  svgSha256: null,
  sourceStatus: null,
  playbackAdvanced: false,
  pauseHeld: false,
  departureBodyAbsent: false,
  activePanelIsolated: false,
  motionBodyVisible: false,
  layoutContained: false,
  headerHeightAcceptable: false,
  primaryOutputWritten: false,
  screenshot: options.screenshot,
};

async function runWitness() {
  let browser;
  let chrome;
  let profileDir;

  try {
  const port = await freePort();
  profileDir = mkdtempSync(`${tmpdir()}/lerms-same-scene-chrome-`);
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
    12_000,
    'smoke source verification',
  );

  report.phase = 'source-identity';
  const identity = await browser.evaluate(`(() => ({
    effectiveUrl: location.href,
    smokeStatus: document.documentElement.dataset.smokeStatus ?? null,
    carrierStatus: document.documentElement.dataset.carrierStatus ?? null,
    carrierBodySha256:
      document.documentElement.dataset.carrierBodySha256 ?? null,
    carrierRegistrationSha256:
      document.documentElement.dataset.carrierRegistrationSha256 ?? null,
    carrierRailRevision:
      document.documentElement.dataset.carrierRailRevision ?? null,
    carrierRailModuleSha256:
      document.documentElement.dataset.carrierRailModuleSha256 ?? null,
    carrierRailHistorySha256:
      document.documentElement.dataset.carrierRailHistorySha256 ?? null,
    effectiveRailId:
      document.documentElement.dataset.effectiveRailId ?? null,
    carrierPresentationRevision:
      document.documentElement.dataset.carrierPresentationRevision ?? null,
    carrierPlaybackRevision:
      document.documentElement.dataset.carrierPlaybackRevision ?? null,
    effectiveEvaluatorRoute:
      document.documentElement.dataset.effectiveEvaluatorRoute ?? null,
    requestedRoute: document.documentElement.dataset.requestedRoute ?? null,
    effectiveRoute: document.documentElement.dataset.effectiveRoute ?? null,
    presenterRevision:
      document.documentElement.dataset.presenterRevision ?? null,
    verifierRevision:
      document.documentElement.dataset.verifierRevision ?? null,
    verifierModuleBlob:
      document.documentElement.dataset.verifierModuleBlob ?? null,
    acceptedReceiptSha256:
      document.documentElement.dataset.acceptedReceiptSha256 ?? null,
    manifestSha256:
      document.documentElement.dataset.manifestSha256 ?? null,
    svgSha256: document.documentElement.dataset.svgSha256 ?? null,
    sourceStatus: document.documentElement.dataset.sourceStatus ?? null,
    error: document.querySelector('[data-smoke-error]')?.textContent ?? null,
  }))()`);
  Object.assign(report, identity);
  assert.equal(
    report.smokeStatus,
    'verified',
    `smoke source did not verify: ${identity.error ?? 'no error surfaced'}`,
  );
  assert.equal(report.requestedRoute, EXPECTED_ROUTE);
  assert.equal(report.effectiveRoute, EXPECTED_ROUTE);
  assert.equal(report.presenterRevision, EXPECTED_PRESENTER);
  assert.equal(report.verifierRevision, EXPECTED_VERIFIER);
  assert.equal(report.verifierModuleBlob, EXPECTED_VERIFIER_BLOB);
  assert.equal(report.acceptedReceiptSha256, EXPECTED_RECEIPT_SHA256);
  assert.equal(report.manifestSha256, EXPECTED_MANIFEST_SHA256);
  assert.equal(report.svgSha256, EXPECTED_SVG_SHA256);
  assert.equal(report.sourceStatus, 'exact-accepted-replay');
  assert.equal(report.carrierStatus, 'verified-paused');
  assert.equal(report.carrierBodySha256, EXPECTED_CARRIER_SHA256);
  assert.equal(
    report.carrierRegistrationSha256,
    EXPECTED_REGISTRATION_SHA256,
  );
  assert.equal(report.carrierRailRevision, EXPECTED_RAIL_REVISION);
  assert.equal(report.carrierRailModuleSha256, EXPECTED_RAIL_MODULE_SHA256);
  assert.equal(report.carrierRailHistorySha256, EXPECTED_RAIL_HISTORY_SHA256);
  assert.equal(report.effectiveRailId, EXPECTED_RAIL_ID);
  assert.equal(
    report.carrierPresentationRevision,
    EXPECTED_PRESENTATION_REVISION,
  );
  assert.equal(report.carrierPlaybackRevision, EXPECTED_PLAYBACK_REVISION);
  assert.equal(report.effectiveEvaluatorRoute, EXPECTED_EVALUATOR_ROUTE);

  report.phase = 'paused-containment';
  const initialFrame = await browser.evaluate(
    `document.querySelector('[data-smoke-viewport]')?.dataset.frameIndex`,
  );
  await delay(1_100);
  const heldInitialFrame = await browser.evaluate(
    `document.querySelector('[data-smoke-viewport]')?.dataset.frameIndex`,
  );
  report.initialPauseHeld =
    initialFrame === '1' &&
    heldInitialFrame === initialFrame &&
    (await browser.evaluate(
      `document.documentElement.dataset.operatorPlayCount`,
    )) === '0';
  report.pauseHeld = report.initialPauseHeld;
  assert.ok(
    report.initialPauseHeld,
    'exact carrier autoplayed or did not begin on the first authored sample',
  );
  const initialCarrierPixels = await readCarrierCentroid(browser);

  report.phase = 'mid-traversal-carrier';
  await browser.evaluate(
    `document.querySelector('.timeline__step[data-frame-index="${options.carrierFrame}"]')?.click()`,
  );
  await delay(300);
  const carrierEvidence = await browser.evaluate(`(() => {
    const canvas = document.querySelector('.stage__carrier');
    const viewport = document.querySelector('[data-smoke-viewport]');
    const panel = viewport?.querySelector('[data-panel="${options.carrierFrame}"]');
    const glyph = panel?.querySelector('[data-visible-lerm-body="true"]');
    return {
      canvasPresent: canvas instanceof HTMLCanvasElement,
      frameIndex: viewport?.dataset.frameIndex,
      glyphOpacity: glyph ? getComputedStyle(glyph).opacity : null,
      carrierIdentity: canvas?.dataset.exactCarrier ?? null,
    };
  })()`);
  const midCarrierPixels = await readCarrierCentroid(browser);
  report.carrierCanvasNonblank =
    carrierEvidence.canvasPresent &&
    midCarrierPixels.nontransparentSamples >= 8;
  report.carrierCanvasMotionPixels = Number(
    Math.hypot(
      midCarrierPixels.centroidX - initialCarrierPixels.centroidX,
      midCarrierPixels.centroidY - initialCarrierPixels.centroidY,
    ).toFixed(2),
  );
  report.exactCarrierVisible =
    carrierEvidence.frameIndex === String(options.carrierFrame) &&
    carrierEvidence.carrierIdentity === '719024' &&
    report.carrierCanvasNonblank &&
    report.carrierCanvasMotionPixels >= 8;
  report.hiddenGlyphAbsent = carrierEvidence.glyphOpacity === '0';
  assert.ok(
    report.exactCarrierVisible,
    'mid-traversal exact carrier canvas is missing or blank',
  );
  assert.ok(
    report.hiddenGlyphAbsent,
    'accepted glyph remained visible under the exact 3D carrier',
  );

  report.phase = 'one-play-completion';
  await browser.evaluate(
    `document.querySelector('[data-restart]')?.click()`,
  );
  await browser.evaluate(
    `document.querySelector('[data-speed="1.5"]')?.click()`,
  );
  await browser.evaluate(
    `document.querySelector('[data-play-toggle]')?.click()`,
  );
  await delay(700);
  const advancedFrame = await browser.evaluate(
    `document.querySelector('[data-smoke-viewport]')?.dataset.frameIndex`,
  );
  report.playbackAdvanced = advancedFrame !== '1';
  assert.ok(report.playbackAdvanced, 'operator-started traversal did not advance');
  await waitFor(
    () =>
      browser.evaluate(
        `document.documentElement.dataset.carrierReceiptStatus === 'complete'`,
      ),
    12_000,
    'exact carrier completion receipt',
  );
  const completed = await browser.evaluate(`(() => ({
    receipt: window.__lermHorde3dCarrierReport ?? null,
    operatorPlayCount: document.documentElement.dataset.operatorPlayCount,
    carrierStatus: document.documentElement.dataset.carrierStatus,
    frameIndex:
      document.querySelector('[data-smoke-viewport]')?.dataset.frameIndex,
  }))()`);
  report.carrierReceipt = completed.receipt;
  report.carrierStatus = completed.carrierStatus;
  report.railFrameVerified =
    completed.receipt?.identity?.railModuleSha256 ===
      EXPECTED_RAIL_MODULE_SHA256 &&
    completed.receipt?.identity?.railHistorySha256 ===
      EXPECTED_RAIL_HISTORY_SHA256 &&
    completed.receipt?.identity?.effectiveRailId === EXPECTED_RAIL_ID &&
    completed.receipt?.samples?.length === 15 &&
    completed.receipt.samples.every(
      (sample) =>
        sample.rootFrameSource ===
          '0482274.acceptedHillRootHeight+ced6db3d.railFrame' &&
        sample.rootTransformApplications === 1 &&
        sample.rootFrameOrigin?.length === 3 &&
        sample.rootFrameLateral?.length === 3 &&
        sample.rootFrameNormal?.length === 3 &&
        sample.rootFrameTangent?.length === 3,
    );
  report.hillSupportTrackingVerified =
    completed.receipt?.composition?.hillSupportHeightPath ===
      '0482274.accepted-root-world-y' &&
    completed.receipt?.composition?.hillSupportHeightApplicationsPerSample ===
      1 &&
    completed.receipt?.samples?.length === 15 &&
    completed.receipt.samples.some(
      (sample) => Math.abs(sample.supportHeightDelta) > 1e-9,
    ) &&
    completed.receipt.samples.every(
      (sample) =>
        sample.hillSupportHeightApplications === 1 &&
        sample.railRootPosition?.length === 3 &&
        sample.hillSupportRootPosition?.length === 3 &&
        sample.rootFrameOrigin?.length === 3 &&
        nearlyEqual(
          sample.rootFrameOrigin[1],
          sample.hillSupportRootPosition[1],
        ) &&
        nearlyEqual(
          sample.rootFrameOrigin[0],
          sample.railRootPosition[0],
        ) &&
        nearlyEqual(
          sample.rootFrameOrigin[2],
          sample.railRootPosition[2],
        ) &&
        nearlyEqual(
          sample.supportHeightDelta,
          sample.hillSupportRootPosition[1] - sample.railRootPosition[1],
        ),
    );
  report.hillScreenTrackingVerified =
    completed.receipt?.composition?.hillScreenProjectionPath ===
      '0482274.accepted-support-marker' &&
    completed.receipt?.composition
      ?.hillScreenProjectionApplicationsPerSample === 1 &&
    completed.receipt?.samples?.length === 15 &&
    completed.receipt.samples.every(
      (sample) =>
        sample.hillScreenProjectionApplications === 1 &&
        sample.hillSupportScreenAnchor?.length === 2 &&
        sample.projectedRootScreenAnchor?.length === 2 &&
        sample.screenAnchorErrorPx <= 0.5 &&
        nearlyEqual(
          sample.screenAnchorErrorPx,
          Math.hypot(
            sample.hillSupportScreenAnchor[0] -
              sample.projectedRootScreenAnchor[0],
            sample.hillSupportScreenAnchor[1] -
              sample.projectedRootScreenAnchor[1],
          ),
          1e-6,
        ),
    );
  report.carrierReceiptComplete =
    completed.receipt?.status?.ok === true &&
    completed.receipt?.status?.phase === 'complete' &&
    completed.carrierStatus === 'complete';
  report.oneOperatorPlay =
    completed.operatorPlayCount === '1' &&
    completed.receipt?.playback?.operatorPlayCount === 1 &&
    completed.receipt?.playback?.autoplayObserved === false;
  assert.ok(
    report.carrierReceiptComplete,
    'exact carrier completion receipt is missing, partial, or failed',
  );
  assert.ok(
    report.oneOperatorPlay,
    'exact carrier traversal did not complete under exactly one operator Play',
  );
  assert.ok(
    report.railFrameVerified,
    'completion receipt did not preserve all exact rail-derived root frames',
  );
  assert.ok(
    report.hillSupportTrackingVerified,
    'completion receipt did not apply the accepted Hill support height exactly once',
  );
  assert.ok(
    report.hillScreenTrackingVerified,
    'completion receipt did not align the rendered root with the accepted Hill support marker',
  );

  report.phase = 'departure';
  await browser.evaluate(
    `document.querySelector('.timeline__step[data-frame-index="17"]')?.click()`,
  );
  await delay(200);
  const departure = await browser.evaluate(`(() => {
    const viewport = document.querySelector('[data-smoke-viewport]');
    const panel = viewport?.querySelector('[data-panel="17"]');
    return {
      frameIndex: viewport?.dataset.frameIndex,
      frameKind: viewport?.dataset.frameKind,
      prefixSampleCount: viewport?.dataset.prefixSampleCount,
      bodyAbsent: Boolean(panel) &&
        !panel.querySelector('[data-visible-lerm-body="true"]'),
      visiblePanelCount: [...(viewport?.querySelectorAll('[data-panel]') ?? [])]
        .filter((candidate) => getComputedStyle(candidate).display !== 'none')
        .length,
    };
  })()`);
  report.departureBodyAbsent =
    departure.frameIndex === '17' &&
    departure.frameKind === 'after-departure' &&
    departure.prefixSampleCount === '15' &&
    departure.bodyAbsent === true &&
    completed.receipt?.departure?.bodyVisible === false &&
    completed.receipt?.departure?.hillHistoryRetained === true;
  assert.ok(
    report.departureBodyAbsent,
    'later Hill frame did not preserve the accepted body-absent state',
  );
  report.activePanelIsolated = departure.visiblePanelCount === 1;
  assert.ok(
    report.activePanelIsolated,
    'inactive replay panels can bleed into the active viewport',
  );

  await browser.evaluate(
    `document.querySelector('.timeline__step[data-frame-index="${options.carrierFrame}"]')?.click()`,
  );
  await delay(200);
  const moving = await browser.evaluate(`(() => {
    const viewport = document.querySelector('[data-smoke-viewport]');
    const panel = viewport?.querySelector('[data-panel="${options.carrierFrame}"]');
    return {
      frameIndex: viewport?.dataset.frameIndex,
      frameKind: viewport?.dataset.frameKind,
      prefixSampleCount: viewport?.dataset.prefixSampleCount,
      bodyVisible: Boolean(
        panel?.querySelector('[data-visible-lerm-body="true"]'),
      ),
    };
  })()`);
  report.motionBodyVisible =
    moving.frameIndex === String(options.carrierFrame) &&
    moving.frameKind === 'actor-prefix' &&
    moving.prefixSampleCount === String(options.carrierFrame) &&
    moving.bodyVisible === true &&
    report.exactCarrierVisible &&
    report.hiddenGlyphAbsent;
  assert.ok(
    report.motionBodyVisible,
    'mid-traversal capture does not contain the accepted moving Lerm body',
  );

  report.phase = 'layout';
  const layout = await browser.evaluate(`(() => {
    const selectors = [
      '.smoke-header',
      '.stage',
      '.transport',
      '.smoke-footer',
    ];
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
    const contained = rects.every((rect) =>
      rect &&
      rect.left >= -0.5 &&
      rect.top >= -0.5 &&
      rect.right <= innerWidth + 0.5 &&
      rect.bottom <= innerHeight + 0.5 &&
      rect.width > 0 &&
      rect.height > 0
    );
    const ordered = rects.every((rect, index) =>
      index === 0 || rect.top >= rects[index - 1].bottom - 0.5
    );
    const noPageOverflow =
      document.documentElement.scrollWidth <= innerWidth &&
      document.documentElement.scrollHeight <= innerHeight;
    const unclippedControls = [
      ...document.querySelectorAll('button, .source-state, .smoke-footer strong'),
    ].every((element) =>
      element.scrollWidth <= element.clientWidth + 1 &&
      element.scrollHeight <= element.clientHeight + 1
    );
    return { rects, contained, ordered, noPageOverflow, unclippedControls };
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
  const capture = await browser.command('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
    captureBeyondViewport: false,
  });
  const png = Buffer.from(capture.data, 'base64');
  writeFileSync(options.screenshot, png);
  const pixelEvidence = inspectPng(png);
  report.pixelEvidence = pixelEvidence;
  report.primaryOutputWritten =
    statSync(options.screenshot).size === png.length &&
    pixelEvidence.sampledColors >= 32 &&
    pixelEvidence.luminanceRange >= 24;
  assert.ok(
    report.primaryOutputWritten,
    'browser screenshot is missing, blank, or partial',
  );

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
      `Lerm Horde browser witness passed: ${options.report} / ${options.screenshot}`,
    );
  } else {
    console.error(
      `Lerm Horde browser witness failed during ${report.failurePhase}: ${report.error}`,
    );
  }
}

async function readCarrierCentroid(browser) {
  return browser.evaluate(`(() => {
    const canvas = document.querySelector('.stage__carrier');
    const context = canvas?.getContext('webgl2') ?? canvas?.getContext('webgl');
    if (!canvas || !context) {
      return {
        nontransparentSamples: 0,
        centroidX: Number.NaN,
        centroidY: Number.NaN,
      };
    }
    const pixels = new Uint8Array(canvas.width * canvas.height * 4);
    context.readPixels(
      0,
      0,
      canvas.width,
      canvas.height,
      context.RGBA,
      context.UNSIGNED_BYTE,
      pixels,
    );
    let nontransparentSamples = 0;
    let weightedX = 0;
    let weightedY = 0;
    for (let y = 0; y < canvas.height; y += 4) {
      for (let x = 0; x < canvas.width; x += 4) {
        const alpha = pixels[(y * canvas.width + x) * 4 + 3];
        if (alpha === 0) continue;
        nontransparentSamples += 1;
        weightedX += x;
        weightedY += y;
      }
    }
    return {
      nontransparentSamples,
      centroidX:
        nontransparentSamples > 0
          ? weightedX / nontransparentSamples
          : Number.NaN,
      centroidY:
        nontransparentSamples > 0
          ? weightedY / nontransparentSamples
          : Number.NaN,
    };
  })()`);
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
  const carrierFrame = Number(values.get('carrier-frame') ?? 8);
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
        `${tmpdir()}/lerms-same-scene-smoke-${label}.json`,
    ),
    screenshot: resolve(
      values.get('screenshot') ??
        `${tmpdir()}/lerms-same-scene-smoke-${label}.png`,
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

function nearlyEqual(left, right, tolerance = 1e-9) {
  return Math.abs(left - right) <= tolerance;
}

function inspectPng(png) {
  assert.deepEqual(
    png.subarray(0, 8),
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    'primary output is not PNG',
  );
  let offset = 8;
  let width;
  let height;
  let bitDepth;
  let colorType;
  let interlace;
  const compressed = [];
  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.subarray(offset + 4, offset + 8).toString('ascii');
    const data = png.subarray(offset + 8, offset + 8 + length);
    offset += 12 + length;
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === 'IDAT') {
      compressed.push(data);
    } else if (type === 'IEND') {
      break;
    }
  }
  assert.equal(bitDepth, 8, 'unsupported screenshot PNG bit depth');
  assert.equal(interlace, 0, 'unsupported interlaced screenshot PNG');
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : null;
  assert.ok(channels, `unsupported screenshot PNG color type ${colorType}`);
  assert.equal(width, options.width);
  assert.equal(height, options.height);

  const raw = inflateSync(Buffer.concat(compressed));
  const stride = width * channels;
  const previous = Buffer.alloc(stride);
  const current = Buffer.alloc(stride);
  const colors = new Set();
  let minLuminance = 255;
  let maxLuminance = 0;
  let rawOffset = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = raw[rawOffset++];
    for (let x = 0; x < stride; x += 1) {
      const value = raw[rawOffset++];
      const left = x >= channels ? current[x - channels] : 0;
      const up = previous[x];
      const upperLeft = x >= channels ? previous[x - channels] : 0;
      current[x] = unfilter(filter, value, left, up, upperLeft);
    }
    if (y % 12 === 0) {
      for (let x = 0; x < width; x += 12) {
        const pixel = x * channels;
        const red = current[pixel];
        const green = current[pixel + 1];
        const blue = current[pixel + 2];
        colors.add(`${red},${green},${blue}`);
        const luminance = (red * 299 + green * 587 + blue * 114) / 1000;
        minLuminance = Math.min(minLuminance, luminance);
        maxLuminance = Math.max(maxLuminance, luminance);
      }
    }
    current.copy(previous);
  }
  return {
    width,
    height,
    sampledColors: colors.size,
    luminanceRange: Number((maxLuminance - minLuminance).toFixed(2)),
  };
}

function unfilter(filter, value, left, up, upperLeft) {
  if (filter === 0) return value;
  if (filter === 1) return (value + left) & 0xff;
  if (filter === 2) return (value + up) & 0xff;
  if (filter === 3) return (value + Math.floor((left + up) / 2)) & 0xff;
  if (filter === 4) return (value + paeth(left, up, upperLeft)) & 0xff;
  throw new Error(`unsupported screenshot PNG filter ${filter}`);
}

function paeth(left, up, upperLeft) {
  const prediction = left + up - upperLeft;
  const leftDistance = Math.abs(prediction - left);
  const upDistance = Math.abs(prediction - up);
  const upperLeftDistance = Math.abs(prediction - upperLeft);
  if (leftDistance <= upDistance && leftDistance <= upperLeftDistance) {
    return left;
  }
  return upDistance <= upperLeftDistance ? up : upperLeft;
}

await runWitness();
