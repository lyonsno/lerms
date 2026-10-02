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

// Append a probe in the existing module scope. No production statement is replaced.
const injection = `
window.__recordedHandProbe = {
  snapshot() {
    return { visible: handMesh.visible, status: status.textContent,
      packetAuthority: latestFluidPacket?.authority ?? null,
      packetSource: latestFluidPacket?.source_route ?? null,
      fluidAvailable: fluidSolver?.available ?? false };
  },
  apply(state) {
    const originalNow = Date.now;
    this.evidenceNowMs = state.frame.frame.captureTimestampMs + 50;
    Date.now = () => this.evidenceNowMs;
    try { applyState(state); } finally { Date.now = originalNow; }
    updateInterpolatedSurface();
    renderer.render(scene, camera);
    return this.snapshot();
  },
  fluidExpiryBranch() {
    const fresh = latestFluidPacket && isLiveFingerFluidPacketFresh(latestFluidPacket, this.evidenceNowMs);
    if (latestFluidPacket && !fresh) deactivateFluidInlets('hand_state_packet_expired');
    renderer.render(scene, camera);
    return { ...this.snapshot(), fresh };
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
  const page = await browser.newPage({ viewport: report.viewport, deviceScaleFactor: 1 });
  page.on('pageerror', error => report.errors.push(String(error)));
  await page.route('**/src/hand/live-hand.ts', async route => {
    const response = await route.fetch();
    const original = await response.text();
    assert(original.includes('function applyState('), 'consumer_module_identity_missing');
    report.servedModuleSha256 = sha(original);
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
  await page.waitForFunction(() => window.__recordedHandProbe?.snapshot().fluidAvailable === true);
  report.browserVersion = browser.version();
  report.effectiveUrl = page.url();
  const apply = async row => {
    const state = structuredClone(row.state);
    // Keep all source timestamps consistent; freeze the probe clock in module scope.
    return page.evaluate(state => window.__recordedHandProbe.apply(state), state);
  };
  report.failurePhase = 'visibility_reproduction'; save();
  const validHybrid = await apply(tracking);
  const anchorAfterHybrid = await apply(anchors[0]);
  const recoveredHybrid = await apply(tracking);
  const holdBeforeFluid = await apply(held);
  const holdAfterFluid = await page.evaluate(() => window.__recordedHandProbe.fluidExpiryBranch());
  const recoveryAfterHold = await apply(tracking);
  const invalid = structuredClone(tracking);
  invalid.state.frame.mano.vertices = [];
  const partialMesh = await apply(invalid);
  report.visibilityReproduction = { validHybrid, anchorAfterHybrid, recoveredHybrid,
    holdBeforeFluid, holdAfterFluid, recoveryAfterHold, partialMesh,
    sourceSequences: { tracking: tracking.eventSequence, held: held.eventSequence, anchor: anchors[0].eventSequence },
    contractChecks: { validHybridVisible: validHybrid.visible,
      anchorDoesNotEraseHybrid: anchorAfterHybrid.visible,
      articulationHoldRemainsVisibleWhenFluidIsDisabled: holdAfterFluid.visible,
      nextTrackingFrameRecovers: recoveryAfterHold.visible,
      partialMeshRejected: !partialMesh.visible } };
  assert(validHybrid.visible && recoveredHybrid.visible && holdBeforeFluid.visible
    && recoveryAfterHold.visible && !partialMesh.visible, 'reproduction_controls_failed');
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
} catch (error) {
  report.status = 'failed'; report.error = String(error); process.exitCode = 1;
} finally {
  await browser?.close();
  report.browserClosed = true;
  save();
}
