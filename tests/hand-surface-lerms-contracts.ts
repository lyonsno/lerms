import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  composeHandSurfaceLerms,
  createFixtureKaminosHandEventCache,
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

test('Kaminos event cache unwraps event and uses cache age for freshness', () => {
  const staleRemoteTimestampPacket = livePacket();
  staleRemoteTimestampPacket.timestamp = -100000;
  const cache = createFixtureKaminosHandEventCache({
    event: staleRemoteTimestampPacket,
    ageMs: 42,
    sequence: 77,
    effectiveEndpoint: 'http://127.0.0.1:8096/hand-control-sidecar-event',
  });

  const report = composeHandSurfaceLerms(cache, liveOptions({
    requestedEndpoint: '/kaminos-hand-control/hand-control-sidecar-event',
    effectiveEndpoint: 'http://127.0.0.1:8096/hand-control-sidecar-event',
    nowMs: 1040,
  }));

  assert.equal(report.authority, 'live_hand_surface');
  assert.equal(report.freshness.status, 'fresh');
  assert.equal(report.freshness.ageMs, 42);
  assert.equal(report.routeTruth.endpoint.effective, 'http://127.0.0.1:8096/hand-control-sidecar-event');
  assert.equal(report.routeTruth.kaminosCache.sequence, 77);
});

test('stale Kaminos event cache downgrades even when the inner packet timestamp looks fresh', () => {
  const cache = createFixtureKaminosHandEventCache({
    event: livePacket(),
    ageMs: 1500,
  });

  const report = composeHandSurfaceLerms(cache, liveOptions({ maxFreshnessMs: 120 }));

  assert.notEqual(report.authority, 'live_hand_surface');
  assert.equal(report.freshness.status, 'stale');
  assertDowngrade(report, 'stale_hand_packet');
});

test('empty Kaminos event cache cannot pretend to contain a hand surface', () => {
  const cache = createFixtureKaminosHandEventCache({
    event: null,
    status: 'empty',
    ageMs: null,
  });

  const report = composeHandSurfaceLerms(cache, liveOptions());

  assert.equal(report.authority, 'invalid');
  assertDowngrade(report, 'missing_kaminos_hand_event');
  assertDowngrade(report, 'missing_hand_surface_frame');
});

test('browser prototype owns the Kaminos frame-posting loop in the same viewport as lerm rendering', () => {
  const mainSource = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');

  assert.match(mainSource, /defaultKaminosNativeFrameUrl\s*=\s*'\/kaminos-hand-control\/hand-control-native-frame'/);
  assert.match(mainSource, /defaultKaminosSidecarLaunchUrl\s*=\s*'\/kaminos-hand-control\/hand-control-sidecar-launch'/);
  assert.match(mainSource, /postKaminosNativeFrameLoop/);
  assert.match(mainSource, /X-Kaminos-Hand-Surface-Client-Build/);
  assert.doesNotMatch(mainSource, /window\.setTimeout\(resolve,\s*250\)/, 'packet polling must not bake in the old two-tab quarter-second cache lag');
});

for (const { name, fn } of tests) {
  fn();
  console.log(`ok - ${name}`);
}
