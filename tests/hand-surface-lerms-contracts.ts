import assert from 'node:assert/strict';

import {
  composeHandSurfaceLerms,
  createFixtureWilorHandPacket,
  renderHandSurfaceWitnessSvg,
} from '../src/hand-surface-lerms.ts';

type TestFn = () => void;
const tests: Array<{ name: string; fn: TestFn }> = [];

function test(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

const requestedRoute = 'native_wilor_mini_mlx_detector_sidecar_live';

function livePacket() {
  return createFixtureWilorHandPacket({
    effectiveRoute: requestedRoute,
    sourceBackend: 'native_wilor_mini_mlx_detector_sidecar_live',
    timestampMs: 1000,
    palmNormal: { x: 0.05, y: -0.18, z: 0.98 },
  });
}

function liveOptions(overrides = {}) {
  return {
    requestedRoute,
    nowMs: 1040,
    maxFreshnessMs: 120,
    webcam: {
      source: 'live_webcam',
      visible: true,
      blank: false,
      frameId: 'webcam-live-001',
      width: 1280,
      height: 720,
    },
    attachmentMode: 'hand_surface',
    lermAnchors: [
      { id: 'red-lerm-palm', face: [0, 5, 9], barycentric: [0.22, 0.34, 0.44], behaviorHint: 'cling' },
      { id: 'yellow-lerm-index', face: [5, 6, 10], barycentric: [0.18, 0.48, 0.34], behaviorHint: 'finger_walk' },
    ],
    moge: { requested: false },
    ...overrides,
  };
}

function assertDowngrade(report, code) {
  assert.ok(report.downgrades.some((entry) => entry.code === code), `expected downgrade ${code}`);
}

test('fresh WiLoR hand packet creates a live hand-surface frame with attached lerms', () => {
  const report = composeHandSurfaceLerms(livePacket(), liveOptions());

  assert.equal(report.schema, 'lerms.hand-surface-lerm-witness.v0');
  assert.equal(report.authority, 'live_hand_surface');
  assert.equal(report.surfaceFrame.status, 'valid');
  assert.equal(report.surfaceFrame.faces.length > 0, true);
  assert.equal(report.webcam.status, 'visible_live');
  assert.equal(report.attachments.every((attachment) => attachment.mode === 'hand_surface'), true);
  assert.equal(report.attachments.some((attachment) => attachment.behavior === 'finger_walk'), true);
});

test('fallback or replay hand backend cannot pretend to be live WiLoR', () => {
  const packet = createFixtureWilorHandPacket({
    effectiveRoute: 'wilor_mini_mps_saved_image_replay',
    sourceBackend: 'native_wilor_mini_mps_sidecar_replay',
    timestampMs: 1000,
  });

  const report = composeHandSurfaceLerms(packet, liveOptions());

  assert.notEqual(report.authority, 'live_hand_surface');
  assertDowngrade(report, 'hand_backend_not_live_wilor');
  assert.equal(report.routeTruth.effectiveRoute, 'wilor_mini_mps_saved_image_replay');
});

test('stale hand packets are downgraded loudly', () => {
  const report = composeHandSurfaceLerms(
    createFixtureWilorHandPacket({ effectiveRoute: requestedRoute, sourceBackend: requestedRoute, timestampMs: 800 }),
    liveOptions({ nowMs: 1040, maxFreshnessMs: 120 }),
  );

  assert.equal(report.authority, 'synthetic_fixture');
  assert.equal(report.freshness.status, 'stale');
  assertDowngrade(report, 'stale_hand_packet');
});

test('missing or empty hand mesh prevents hand-surface authority', () => {
  const packet = createFixtureWilorHandPacket({
    effectiveRoute: requestedRoute,
    sourceBackend: requestedRoute,
    timestampMs: 1000,
    landmarks2d: [],
    worldLandmarks: [],
  });

  const report = composeHandSurfaceLerms(packet, liveOptions());

  assert.equal(report.surfaceFrame.status, 'invalid');
  assert.equal(report.authority, 'invalid');
  assertDowngrade(report, 'missing_hand_surface_frame');
});

test('screen-space sticker anchors cannot satisfy hand-surface attachment', () => {
  const report = composeHandSurfaceLerms(
    livePacket(),
    liveOptions({
      attachmentMode: 'screen_space',
      lermAnchors: [{ id: 'fake-sticker', screen: { x: 0.5, y: 0.5 } }],
    }),
  );

  assert.equal(report.authority, 'invalid');
  assert.equal(report.attachments[0].mode, 'screen_space_rejected');
  assertDowngrade(report, 'screen_space_attachment_rejected');
});

test('MoGe requested without a fresh effective result is downgraded without hiding the hand route', () => {
  const report = composeHandSurfaceLerms(
    livePacket(),
    liveOptions({ moge: { requested: true, effectiveRoute: null, ageMs: null } }),
  );

  assert.equal(report.authority, 'live_hand_surface_scene_grounding_downgraded');
  assert.equal(report.moge.status, 'requested_unavailable');
  assertDowngrade(report, 'moge_requested_unavailable');
});

test('blank or hidden webcam frame invalidates the visual witness', () => {
  const report = composeHandSurfaceLerms(
    livePacket(),
    liveOptions({ webcam: { source: 'live_webcam', visible: true, blank: true, frameId: 'blank-001', width: 1280, height: 720 } }),
  );

  assert.equal(report.webcam.status, 'blank_or_hidden');
  assert.equal(report.authority, 'invalid');
  assertDowngrade(report, 'blank_or_hidden_webcam');
});

test('witness svg preserves webcam ground truth and renders lerms as surface inhabitants', () => {
  const report = composeHandSurfaceLerms(livePacket(), liveOptions());
  const svg = renderHandSurfaceWitnessSvg(report, { width: 720, height: 420 });

  assert.match(svg, /webcam-ground-truth/);
  assert.match(svg, /hand-surface-frame/);
  assert.match(svg, /red-lerm-palm/);
  assert.match(svg, /yellow-lerm-index/);
  assert.doesNotMatch(svg, /screen-space-sticker-success/);
});

for (const { name, fn } of tests) {
  fn();
  console.log(`ok - ${name}`);
}
