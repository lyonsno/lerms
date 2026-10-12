import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const args = new Map();
for (let i = 2; i < process.argv.length; i += 2) args.set(process.argv[i], process.argv[i + 1]);
const out = resolve(args.get('--output'));
mkdirSync(out, { recursive: true });
const reportPath = `${out}/report.json`;
const report = {
  schema: 'lerms.recorded-hand-diagnosis.v0', status: 'running',
  receiver: args.get('--receiver') ?? null, terminalEvidence: reportPath,
  primaryOutputWritten: false, failurePhase: 'input_validation',
  authority: 'recorded_replay_with_explicit_clock_rebase_not_live_camera',
  errors: [],
};
const save = () => writeFileSync(reportPath, JSON.stringify(report, null, 2));
const sha = value => createHash('sha256').update(value).digest('hex');
save();
let browser;
let page;

// Append a probe in the existing module scope. No production statement is replaced.
const injection = `
window.__recordedHandProbe = {
  snapshot() {
    return { visible: handMesh.visible, status: status.textContent,
      surfaceFrameId: latestPresentedRouteFrame?.frameId ?? null,
      lastLiveAt, heldSurfaceReason,
      packetAuthority: latestFluidPacket?.authority ?? null,
      packetSource: latestFluidPacket?.source_route ?? null,
      fluidAvailable: fluidSolver?.available ?? false };
  },
  capture() {
    renderer.render(scene, camera);
    const copy = document.createElement('canvas');
    copy.width = canvas.width; copy.height = canvas.height;
    const context = copy.getContext('2d');
    context.drawImage(canvas, 0, 0);
    const pixels = context.getImageData(0, 0, copy.width, copy.height).data;
    const dataUrl = copy.toDataURL('image/png');
    const visible = handMesh.visible;
    handMesh.visible = false; renderer.render(scene, camera);
    context.clearRect(0, 0, copy.width, copy.height);
    context.drawImage(canvas, 0, 0);
    const blank = context.getImageData(0, 0, copy.width, copy.height).data;
    let handPixels = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      if (Math.abs(pixels[i]-blank[i]) + Math.abs(pixels[i+1]-blank[i+1])
        + Math.abs(pixels[i+2]-blank[i+2]) > 12) handPixels++;
    }
    handMesh.visible = visible; renderer.render(scene, camera);
    return { dataUrl, handPixels };
  },
  apply(state, ageMs = 50, sequenced = false) {
    this.evidenceNowMs = state.frame.frame.captureTimestampMs + ageMs;
    Date.now = () => this.evidenceNowMs;
    const accepted = sequenced ? applySequencedRuntimeState(state, state.eventDelivery.mode) : (applyState(state), true);
    updateInterpolatedSurface();
    renderer.render(scene, camera);
    return { ...this.snapshot(), accepted };
  },
  mode(mode) {
    deactivateFluidInlets('probe_route_change');
    sourceMode = mode;
  },
  tick(elapsedMs = 0) {
    const originalNow = Date.now;
    const originalRaf = window.requestAnimationFrame;
    const originalRunning = running;
    const now = lastLiveAt + elapsedMs;
    Date.now = () => this.evidenceNowMs + elapsedMs;
    window.requestAnimationFrame = () => 0;
    running = true;
    lastAnimationFrameAt = now - 17;
    fluidSimulationClockAt = now - 100;
    fluidGpuBusy = false;
    handPresentationPending = false;
    try { animate(now); } finally {
      Date.now = originalNow;
      window.requestAnimationFrame = originalRaf;
      running = originalRunning;
    }
    renderer.render(scene, camera);
    return this.snapshot();
  },
  drawSurface(mano) {
    if (!mano?.available) { handMesh.visible = false; }
    else {
      updateSurface(normalizeManoSurface(mano));
      currentPositions.set(targetPositions);
      handGeometry.getAttribute('position').needsUpdate = true;
      handGeometry.computeVertexNormals();
      handGeometry.computeBoundingSphere();
    }
    renderer.render(scene, camera);
  },
  async comparison({ pure, fast, rawTime, label }) {
    const video = window.__diagnosisVideo;
    if (Math.abs(video.currentTime - rawTime) > 0.0001) {
      await new Promise((resolve, reject) => {
        video.addEventListener('seeked', resolve, { once: true });
        video.addEventListener('error', reject, { once: true });
        video.currentTime = rawTime;
      });
    }
    const combined = document.createElement('canvas');
    combined.width = 960; combined.height = 282;
    const ctx = combined.getContext('2d');
    ctx.fillStyle = '#070b0d'; ctx.fillRect(0, 0, 960, 282);
    ctx.drawImage(video, 0, 24, 320, 240);
    this.drawSurface(pure);
    ctx.drawImage(renderer.domElement, 320, 24, 320, 240);
    this.drawSurface(fast);
    ctx.drawImage(renderer.domElement, 640, 24, 320, 240);
    ctx.fillStyle = '#ffffff'; ctx.font = '13px monospace';
    ctx.fillText('RECORDED CAMERA', 6, 17);
    ctx.fillText('WILOR CAPTURE-ALIGNED REFERENCE', 326, 17);
    ctx.fillText('HYBRID CAPTURE-ALIGNED TARGET', 646, 17);
    ctx.fillText(label, 6, 277);
    return combined.toDataURL('image/png');
  }
};
`;

try {
  const executable = args.get('--browser');
  assert(executable && existsSync(executable), 'independent_browser_missing');
  assert(executable.includes('/ms-playwright/') || executable.includes('Chrome for Testing'), 'independent_browser_required');
  const traceBytes = readFileSync(args.get('--trace'));
  const trace = JSON.parse(traceBytes);
  assert.equal(trace.schema, 'hand-state.recorded-comparison.v0');
  assert.equal(trace.sourceAuthority, 'recorded_replay_not_live');
  assert.equal(trace.faces.length, 1538);
  const hybridRoute = 'hand-state-runtime/hybrid-wilor-anchor-browser-fast-mano-v6';
  const pureRoute = 'native_wilor_mini_mlx_detector_sidecar_live';
  const anchors = trace.rows.filter(row => row.deliverySource === 'sidecar_ingest');
  const fastRows = trace.rows.filter(row => row.deliverySource === 'fast_landmark_ingest');
  assert(anchors.length && fastRows.length, 'missing_comparison_route');
  for (const row of trace.rows) {
    if (row.state.frame.mano.available) row.state.frame.mano.faces = trace.faces;
  }
  assert(anchors.every(row => row.state.frame.source.effectiveRoute === pureRoute));
  const tracking = fastRows.find(row => row.state.frame.source.effectiveRoute === hybridRoute
    && row.state.frame.diagnostics.articulationAuthorityMode === 'tracking');
  const held = fastRows.find(row => row.state.frame.source.effectiveRoute === hybridRoute
    && row.state.frame.diagnostics.articulationAuthorityMode === 'ambiguous_articulation_hold');
  assert(tracking && held, 'missing_observed_probe_cases');
  const rawBytes = readFileSync(args.get('--raw-video'));
  assert.equal(sha(rawBytes), trace.sourceHashes['raw-camera.webm'], 'wrong_raw_camera');
  report.inputs = { trace: resolve(args.get('--trace')), traceSha256: sha(traceBytes),
    rawVideoSha256: sha(rawBytes), sessionId: trace.sourceReport.sessionId,
    sourceRows: trace.rows.length, anchorRows: anchors.length, fastRows: fastRows.length };
  report.browserExecutable = executable;
  report.moduleInjectionSha256 = sha(injection);
  report.viewport = { width: 640, height: 480 };
  report.failurePhase = 'browser_launch'; save();
  browser = await chromium.launch({ executablePath: executable, headless: true });
  page = await browser.newPage({ viewport: report.viewport, deviceScaleFactor: 1 });
  page.on('pageerror', error => report.errors.push(String(error)));
  report.console = [];
  page.on('console', message => report.console.push({ type: message.type(), text: message.text() }));
  await page.route(url => url.pathname === '/src/hand/live-hand.ts', async route => {
    const response = await route.fetch();
    const original = await response.text();
    assert(original.includes('function applyState('), 'consumer_module_identity_missing');
    report.servedModuleSha256 = sha(original);
    report.servedModuleUrl = route.request().url();
    await route.fulfill({ response, body: `${original}\n${injection}` });
  });
  await page.route('**/tests/fixtures/wilor-mano-surface.json', route => route.fulfill({
    json: { schema: 'hand-state.wilor-mano-surface-fixture.v0', mano: anchors[0].state.frame.mano },
  }));
  await page.route('**/diagnosis-raw.webm', route => route.fulfill({
    contentType: 'video/webm', body: rawBytes,
  }));
  report.failurePhase = 'consumer_load'; save();
  const url = new URL('/live-hand.html?fixture=1&hand_route=hybrid_mano', args.get('--url'));
  await page.goto(url.href);
  assert(report.servedModuleSha256, 'consumer_module_not_intercepted');
  assert(await page.evaluate(() => Boolean(window.__recordedHandProbe)), 'consumer_probe_not_installed');
  await page.waitForFunction(() => window.__recordedHandProbe?.snapshot().fluidAvailable === true);
  report.browserVersion = browser.version();
  report.effectiveUrl = page.url();
  const apply = async row => {
    const state = structuredClone(row.state);
    // Keep all source timestamps consistent; freeze the probe clock in module scope.
    return page.evaluate(state => window.__recordedHandProbe.apply(state), state);
  };
  report.visibilityPixels = {};
  const capture = async name => {
    const { dataUrl, handPixels } = await page.evaluate(() => window.__recordedHandProbe.capture());
    writeFileSync(`${out}/${name}.png`, Buffer.from(dataUrl.split(',')[1], 'base64'));
    report.visibilityPixels[name] = { file: `${name}.png`, handPixels };
  };
  report.failurePhase = 'visibility_reproduction'; save();
  const validHybrid = await apply(tracking);
  await capture('tracking');
  const anchorAfterHybrid = await apply(anchors[0]);
  await capture('after-correction');
  const recoveredHybrid = await apply(tracking);
  const holdBeforeFluid = await apply(held);
  const holdAfterFluid = await page.evaluate(() => window.__recordedHandProbe.tick());
  await capture('held-fluid-disabled');
  const heldExpired = await page.evaluate(() => window.__recordedHandProbe.tick(751));
  const recoveryAfterHold = await apply(tracking);
  const trackingExpired = await page.evaluate(() => window.__recordedHandProbe.tick(751));
  await apply(tracking);
  const wrongRoute = structuredClone(tracking);
  wrongRoute.state.frame.source.effectiveRoute = 'unverified-route';
  const wrongRouteRejected = await apply(wrongRoute);
  await apply(tracking);
  const invalid = structuredClone(tracking);
  invalid.state.frame.mano.vertices = [];
  const partialMesh = await apply(invalid);
  await capture('invalid-mesh');
  await apply(tracking);
  const flipped = structuredClone(anchors[0]);
  flipped.state.frame.hand.handedness = tracking.state.frame.hand.handedness === 'right' ? 'left' : 'right';
  const wrongHand = await apply(flipped);
  const expiredIncoming = await page.evaluate(state => window.__recordedHandProbe.apply(state, 751), tracking.state);
  const fallback = fastRows.find(row => row.state.frame.diagnostics.fallbackState === 'stale_wilor_anchor');
  assert(fallback, 'observed_stale_anchor_fallback_missing');
  await apply(tracking);
  const boundedFallback = await apply(fallback);
  const expiredFallback = await page.evaluate(() => window.__recordedHandProbe.tick(751));
  await apply(tracking);
  const identityFallback = structuredClone(fallback);
  identityFallback.state.frame.diagnostics.fallbackState = 'handedness_discontinuity';
  const invalidIdentity = await apply(identityFallback);
  await page.evaluate(() => window.__recordedHandProbe.mode('pure_wilor'));
  const pureFrame = await apply(anchors[0]);
  await page.evaluate(() => window.__recordedHandProbe.mode('hybrid_mano'));
  const correctionOnly = await apply(anchors[0]);
  const sequencedTracking = structuredClone(tracking.state);
  sequencedTracking.eventDelivery.mode = 'fast_ingest_response';
  const sequenced = await page.evaluate(state => window.__recordedHandProbe.apply(state, 50, true), sequencedTracking);
  const duplicate = await page.evaluate(state => window.__recordedHandProbe.apply(state, 50, true), sequencedTracking);
  const olderAnchor = structuredClone(anchors[0].state);
  olderAnchor.eventDelivery.mode = 'long_poll';
  const outOfOrder = await page.evaluate(state => window.__recordedHandProbe.apply(state, 50, true), olderAnchor);
  report.visibilityReproduction = { validHybrid, anchorAfterHybrid, recoveredHybrid,
    holdBeforeFluid, holdAfterFluid, heldExpired, trackingExpired, wrongRouteRejected,
    recoveryAfterHold, partialMesh, wrongHand, expiredIncoming, boundedFallback,
    expiredFallback, invalidIdentity, pureFrame, correctionOnly, sequenced, duplicate, outOfOrder,
    sourceSequences: { tracking: tracking.eventSequence, held: held.eventSequence, anchor: anchors[0].eventSequence },
    contractChecks: { validHybridVisible: validHybrid.visible,
      anchorDoesNotEraseHybrid: anchorAfterHybrid.visible,
      correctionDoesNotRefreshSurfaceClock: anchorAfterHybrid.lastLiveAt === validHybrid.lastLiveAt,
      correctionDoesNotReplaceSurface: anchorAfterHybrid.surfaceFrameId === validHybrid.surfaceFrameId,
      articulationHoldRemainsVisibleWhenFluidIsDisabled: holdAfterFluid.visible,
      articulationHoldDisablesFluid: holdAfterFluid.packetAuthority?.simulation_safe !== true,
      heldSurfaceExpires: !heldExpired.visible,
      trackingSurfaceExpires: !trackingExpired.visible,
      unknownRouteRejected: !wrongRouteRejected.visible,
      nextTrackingFrameRecovers: recoveryAfterHold.visible,
      partialMeshRejected: !partialMesh.visible } };
  Object.assign(report.visibilityReproduction.contractChecks, {
    correctionHandednessChangeClears: !wrongHand.visible,
    expiredIncomingRejected: !expiredIncoming.visible,
    staleAnchorFallbackHeld: boundedFallback.visible && boundedFallback.heldSurfaceReason === 'stale_wilor_anchor',
    staleAnchorFallbackExpires: !expiredFallback.visible,
    identityFallbackClears: !invalidIdentity.visible,
    pureRouteStillPresents: pureFrame.visible,
    correctionCannotCreateHybridSurface: !correctionOnly.visible,
    directResponseApplied: sequenced.accepted && sequenced.visible,
    duplicateIgnored: !duplicate.accepted && duplicate.visible,
    outOfOrderIgnored: !outOfOrder.accepted && outOfOrder.visible,
    trackingPixelsPresent: report.visibilityPixels.tracking.handPixels > 0,
    correctionPixelsPresent: report.visibilityPixels['after-correction'].handPixels > 0,
    heldPixelsPresent: report.visibilityPixels['held-fluid-disabled'].handPixels > 0,
    invalidPixelsAbsent: report.visibilityPixels['invalid-mesh'].handPixels === 0,
  });
  assert(validHybrid.visible && recoveredHybrid.visible && holdBeforeFluid.visible
    && recoveryAfterHold.visible && !partialMesh.visible, 'reproduction_controls_failed');
  save();
  if (args.get('--assert-continuity') === 'true') {
    const failed = Object.entries(report.visibilityReproduction.contractChecks).filter(([, passed]) => !passed);
    assert.equal(failed.length, 0, `consumer_continuity_contracts_failed: ${failed.map(([name]) => name).join(', ')}`);
  }
  if (args.get('--visibility-only') === 'true') {
    report.status = 'diagnosed'; report.primaryOutputWritten = true; report.failurePhase = null;
  } else {
  report.failurePhase = 'comparison_frames'; save();
  await page.evaluate(async () => {
    const video = document.createElement('video');
    video.muted = true; video.preload = 'auto'; video.src = '/diagnosis-raw.webm';
    window.__diagnosisVideo = video;
    await new Promise((resolve, reject) => {
      video.onloadeddata = resolve; video.onerror = reject;
    });
  });
  const start = trace.sourceReport.captureStartedAtMs;
  const offset = trace.sourceReport.startedAtMs - start;
  const captureMs = row => row.state.frame.diagnostics.fastMeasurementReplay?.captureTimestampMs
    ?? row.state.frame.frame.captureTimestampMs;
  fastRows.sort((a, b) => captureMs(a) - captureMs(b));
  anchors.sort((a, b) => captureMs(a) - captureMs(b));
  mkdirSync(`${out}/frames`, { recursive: true });
  report.comparisonFrames = [];
  for (let index = 0; index < fastRows.length; index += 1) {
    const fast = fastRows[index];
    const time = captureMs(fast);
    const anchor = anchors.findLast(row => captureMs(row) <= time);
    const frame = fast.state.frame;
    const name = `frame-${String(index).padStart(5, '0')}.png`;
    const age = anchor ? time - captureMs(anchor) : null;
    const rawTime = Math.max(0, (time - start - offset) / 1000);
    const mode = frame.diagnostics.articulationAuthorityMode ?? frame.authority.fallbackReason;
    const label = `capture ${(time-start).toFixed(0)}ms | WiLoR reference age ${age ?? 'missing'}ms | hybrid ${mode} | recorded target poses, not live latency`;
    const dataUrl = await page.evaluate(input => window.__recordedHandProbe.comparison(input), {
      pure: anchor?.state.frame.mano ?? null, fast: frame.mano, rawTime, label,
    });
    const bytes = Buffer.from(dataUrl.split(',')[1], 'base64');
    assert(bytes.length > 1000, 'empty_comparison_frame');
    writeFileSync(`${out}/frames/${name}`, bytes);
    report.comparisonFrames.push({ file: `frames/${name}`, captureOffsetMs: time-start,
      anchorSequence: anchor?.eventSequence ?? null, fastSequence: fast.eventSequence,
      exactCapturePair: age === 0, hybridMode: mode, byteCount: bytes.length });
  }
  assert.equal(report.comparisonFrames.length, fastRows.length);
  const concat = [];
  for (let i = 0; i < report.comparisonFrames.length; i += 1) {
    const frame = report.comparisonFrames[i];
    concat.push(`file '${frame.file}'`);
    const next = report.comparisonFrames[i + 1];
    if (next) concat.push(`duration ${Math.max(0.001, (next.captureOffsetMs-frame.captureOffsetMs)/1000)}`);
  }
  writeFileSync(`${out}/comparison.ffconcat`, 'ffconcat version 1.0\n' + concat.join('\n') + '\n');
  report.comparisonScope = 'All fast observations sorted by source capture time, including fallbacks. Latest earlier-capture WiLoR mesh is a retrospective reference, not available-at-capture latency. No interpolation. Actual product camera and surface normalization. Raw clock lower-bound alignment has unmeasured recorder-start offset.';
  report.status = 'diagnosed'; report.primaryOutputWritten = true; report.failurePhase = null;
  }
} catch (error) {
  report.status = 'failed'; report.error = String(error); process.exitCode = 1;
  if (page) {
    report.failurePageText = await page.locator('body').innerText().catch(String);
    await page.screenshot({ path: `${out}/failure.png` }).catch(error => report.errors.push(String(error)));
  }
} finally {
  await browser?.close();
  report.browserClosed = true;
  save();
}
