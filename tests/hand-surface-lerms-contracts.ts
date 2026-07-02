import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  createHandSurfaceHostPacket,
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

function liveMeshPacket() {
  const packet = livePacket();
  packet.mano = {
    schema: 'kaminos.wilor-mlx.mano-surface.v0',
    coordinate_space: 'wilor_mlx_hand_local',
    vertices: [
      { x: 0.1, y: 0.1, z: 0.0 },
      { x: 0.9, y: 0.1, z: 0.1 },
      { x: 0.1, y: 0.9, z: 0.2 },
      { x: 0.9, y: 0.9, z: 0.3 },
    ],
    faces: [
      [0, 1, 2],
      [1, 3, 2],
    ],
  };
  packet.dense_mano = packet.mano;
  return packet;
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

test('actual WiLoR MANO mesh supports barycentric lerms on mesh triangles', () => {
  const report = composeHandSurfaceLerms(
    liveMeshPacket(),
    liveOptions({
      attachmentMode: 'hand_mesh',
      lermAnchors: [{ id: 'mesh-red-lerm', meshFaceIndex: 1, barycentric: [0.25, 0.5, 0.25], behaviorHint: 'cling' }],
    }),
  );

  assert.equal(report.authority, 'live_hand_surface');
  assert.equal(report.surfaceFrame.mesh.status, 'valid');
  assert.equal(report.surfaceFrame.mesh.vertices.length, 4);
  assert.equal(report.surfaceFrame.mesh.faces.length, 2);
  assert.equal(report.attachments[0].surfaceSource, 'mano_mesh');
  assert.equal(report.attachments[0].meshFaceIndex, 1);
  assert.deepEqual(report.attachments[0].face, [1, 3, 2]);
  assert.equal(report.surfaceFrame.mesh.projection.mirrorX, true);
  assert.equal(report.surfaceFrame.mesh.projection.mirrorZ, true);
  assert.equal(report.surfaceFrame.mesh.projection.reason, 'align_mano_mesh_to_mirrored_operator_webcam');
  assert.equal(report.surfaceFrame.mesh.projection.viewAxisReason, 'align_mano_depth_to_operator_webcam_view_axis');
  assert.equal(report.surfaceFrame.mesh.projection.viewAxisProjection, 'mirrored_z_parallax');
  assert.deepEqual(report.surfaceFrame.mesh.projection.viewAxisParallax, { x: -0.18, y: 0.04 });
  assert.equal(report.surfaceFrame.mesh.projection.postProjectionFlipX, true);
  assert.equal(report.attachments[0].screen.x, 0.705);
  assert.equal(report.attachments[0].screen.y, 0.74);
  assert.equal(report.attachments[0].depth, -0.225);
});

test('mesh lerm attachments expose provisional proxy schnoz bodies oriented by the MANO triangle frame', () => {
  const report = composeHandSurfaceLerms(
    liveMeshPacket(),
    liveOptions({
      attachmentMode: 'hand_mesh',
      lermAnchors: [{ id: 'mesh-red-lerm', meshFaceIndex: 1, barycentric: [0.25, 0.5, 0.25], behaviorHint: 'cling' }],
    }),
  );

  const bodyVisual = report.attachments[0].bodyVisual;
  assert.equal(bodyVisual.kind, 'proxy_schnoz_sphere');
  assert.equal(bodyVisual.downgrade, 'proxy_body_visual_only');
  assert.equal(bodyVisual.provisional, true);
  assert.equal(bodyVisual.orientationSource, 'mano_triangle_frame');
  assert.equal(bodyVisual.source, 'kaminos.origin-main.3a373d5.makeLermsPreviewActorVisualMesh');
  assert.deepEqual(bodyVisual.heading2d, { x: -0.122361, y: 0.992486 });
  assert.ok(bodyVisual.normal && bodyVisual.normal.z > 0.9, 'expected outward-ish triangle normal');
});

test('hand-surface host packet exports source-owned MANO anchors and proxy body truth', () => {
  const report = composeHandSurfaceLerms(
    liveMeshPacket(),
    liveOptions({
      attachmentMode: 'hand_mesh',
      lermAnchors: [{ id: 'mesh-red-lerm', meshFaceIndex: 1, barycentric: [0.25, 0.5, 0.25], behaviorHint: 'cling' }],
      requestedEndpoint: '/kaminos-hand-control/hand-control-sidecar-event',
      effectiveEndpoint: 'http://127.0.0.1:8096/hand-control-sidecar-event',
    }),
  );

  const packet = createHandSurfaceHostPacket(report, {
    generatedAtMs: 1100,
    sourceRoute: 'lerms/hand-surface/host-packet-file',
    sourceCommit: 'test-commit',
  });

  assert.equal(packet.schema, 'lerms.hand-surface-host-packet.v0');
  assert.equal(packet.source.route, 'lerms/hand-surface/host-packet-file');
  assert.equal(packet.source.commit, 'test-commit');
  assert.equal(packet.sourceAuthority, 'live_hand_surface');
  assert.equal(packet.surfaceAnchorFrame.kind, 'mano_mesh_barycentric');
  assert.equal(packet.surfaceAnchorFrame.projection.mirrorX, true);
  assert.equal(packet.surfaceAnchorFrame.projection.mirrorZ, true);
  assert.equal(packet.surfaceAnchorFrame.projection.viewAxisReason, 'align_mano_depth_to_operator_webcam_view_axis');
  assert.equal(packet.surfaceAnchorFrame.projection.viewAxisProjection, 'mirrored_z_parallax');
  assert.deepEqual(packet.surfaceAnchorFrame.projection.viewAxisParallax, { x: -0.18, y: 0.04 });
  assert.equal(packet.surfaceAnchorFrame.projection.postProjectionFlipX, true);
  assert.equal(packet.bodyStatus.kind, 'proxy_schnoz_sphere');
  assert.equal(packet.bodyStatus.downgrade, 'proxy_body_visual_only');
  assert.equal(packet.bodyStatus.finalAssets, false);
  assert.equal(packet.anchors[0].orientationSource, 'mano_triangle_frame');
  assert.equal(packet.anchors[0].body.kind, 'proxy_schnoz_sphere');
  assert.equal(packet.anchors[0].body.downgrade, 'proxy_body_visual_only');
  assert.equal(packet.anchors[0].meshFaceIndex, 1);
  assert.deepEqual(packet.anchors[0].face, [1, 3, 2]);
  assert.equal(packet.anchors[0].depth, -0.225);
  assert.deepEqual(packet.custody, {
    lermfeelOwns: ['hand-surface behavior', 'MANO barycentric anchors', 'proxy body status'],
    kaminosOwns: ['future native host shell', 'host witness ergonomics'],
  });
  assert.ok(packet.rejectedDebugSurfaces.includes('lerms-moving-timeline'));
  assert.ok(packet.rejectedDebugSurfaces.includes('screen_space_sticker_attachment'));
});

test('witness svg renders mesh lerms as proxy schnoz spheres with downgrade truth', () => {
  const report = composeHandSurfaceLerms(
    liveMeshPacket(),
    liveOptions({
      attachmentMode: 'hand_mesh',
      lermAnchors: [{ id: 'mesh-red-lerm', meshFaceIndex: 1, barycentric: [0.25, 0.5, 0.25], behaviorHint: 'cling' }],
    }),
  );
  const svg = renderHandSurfaceWitnessSvg(report, { width: 720, height: 420 });

  assert.match(svg, /proxy_schnoz_sphere/);
  assert.match(svg, /proxy_body_visual_only/);
  assert.match(svg, /schnoz-nub/);
  assert.match(svg, /orientationSource mano_triangle_frame/);
  assert.match(svg, /proj mx\/mz\/zp\/ppx=1\/1\/1\/1/);
});

test('hand mesh mode rejects landmark-only packets instead of silently falling back to stickers', () => {
  const report = composeHandSurfaceLerms(
    livePacket(),
    liveOptions({
      attachmentMode: 'hand_mesh',
      lermAnchors: [{ id: 'mesh-only-lerm', meshFaceIndex: 0, barycentric: [0.3, 0.3, 0.4] }],
    }),
  );

  assert.equal(report.authority, 'invalid');
  assert.equal(report.surfaceFrame.mesh.status, 'missing');
  assertDowngrade(report, 'missing_hand_mesh');
  assert.equal(report.attachments[0].surfaceSource, 'missing_mesh');
  assert.equal(report.attachments[0].mode, 'hand_surface');
});

test('browser prototype owns the Kaminos frame-posting loop in the same viewport as lerm rendering', () => {
  const mainSource = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');

  assert.match(mainSource, /defaultKaminosNativeFrameUrl\s*=\s*'\/kaminos-hand-control\/hand-control-native-frame'/);
  assert.match(mainSource, /defaultKaminosSidecarLaunchUrl\s*=\s*'\/kaminos-hand-control\/hand-control-sidecar-launch'/);
  assert.match(mainSource, /postKaminosNativeFrameLoop/);
  assert.match(mainSource, /X-Kaminos-Hand-Surface-Client-Build/);
  assert.doesNotMatch(mainSource, /window\.setTimeout\(resolve,\s*250\)/, 'packet polling must not bake in the old two-tab quarter-second cache lag');
});

test('browser prototype exposes a crude Underhill ghost shell for mesh mode', () => {
  const mainSource = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');

  assert.match(mainSource, /handMeshMode/);
  assert.match(mainSource, /drawUnderhillGhostShell/);
  assert.match(mainSource, /drawMeshGhostHand/);
  assert.match(mainSource, /attachmentMode:\s*handMeshMode\s*\?\s*'hand_mesh'\s*:\s*'hand_surface'/);
});

test('browser mesh smoke draws provisional proxy schnoz bodies instead of flat lerm ellipses', () => {
  const mainSource = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');

  assert.match(mainSource, /drawProxySchnozLerm/);
  assert.match(mainSource, /proxy_schnoz_sphere/);
  assert.match(mainSource, /proxy_body_visual_only/);
  assert.match(mainSource, /bodyVisual\.heading2d/);
});

test('browser mesh smoke renders all MANO faces and starts through an explicit witness button', () => {
  const mainSource = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');

  assert.match(mainSource, /start-hand-surface-smoke/);
  assert.match(mainSource, /stop-hand-surface-smoke/);
  assert.match(mainSource, /beginLiveSmoke/);
  assert.match(mainSource, /stopLiveSmoke/);
  assert.match(mainSource, /startWitnessSampler/);
  assert.match(mainSource, /hand-control-sidecar-stop/);
  assert.match(mainSource, /__lermsHandSurfaceFilmstrip/);
  assert.match(mainSource, /cameraFilmstripDataUrl/);
  assert.match(mainSource, /screenFilmstripDataUrl/);
  assert.doesNotMatch(mainSource, /mesh\.faces\.slice\(0,\s*180\)/, 'live MANO mesh rendering must not drop most faces');
});

for (const { name, fn } of tests) {
  fn();
  console.log(`ok - ${name}`);
}
