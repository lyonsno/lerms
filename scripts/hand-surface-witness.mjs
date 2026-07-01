import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import {
  composeHandSurfaceLerms,
  createHandSurfaceHostPacket,
  createFixtureKaminosHandEventCache,
  createFixtureWilorHandPacket,
  renderHandSurfaceWitnessSvg,
} from '../src/hand-surface-lerms.ts';

const jsonPath = process.argv[2] ?? '/tmp/lerms-hand-surface-witness-0629.json';
const svgPath = process.argv[3] ?? '/tmp/lerms-hand-surface-witness-0629.svg';
const hostPacketPath = process.argv[4] ?? '/tmp/lerms-hand-surface-host-packet-0701.json';
const requestedRoute = 'native_wilor_mini_mlx_detector_sidecar_live';
const nowMs = 1200;
const packet = createFixtureWilorHandPacket({
  effectiveRoute: 'wilor_hand_surface_synthetic_fixture',
  sourceBackend: 'wilor_hand_surface_synthetic_fixture',
  timestampMs: 1168,
  palmNormal: { x: 0.08, y: -0.28, z: 0.92 },
  mano: {
    schema: 'kaminos.wilor-mlx.mano-surface.v0',
    coordinate_space: 'wilor_mlx_hand_local',
    vertices: [
      { x: 0.12, y: 0.18, z: 0.0 },
      { x: 0.86, y: 0.16, z: 0.05 },
      { x: 0.18, y: 0.84, z: 0.12 },
      { x: 0.82, y: 0.88, z: 0.2 },
      { x: 0.46, y: 0.02, z: -0.04 },
      { x: 0.48, y: 0.98, z: 0.26 },
    ],
    faces: [
      [0, 1, 2],
      [1, 3, 2],
      [0, 4, 1],
      [2, 3, 5],
      [0, 2, 5],
      [1, 4, 3],
    ],
  },
});
const cache = createFixtureKaminosHandEventCache({
  event: packet,
  sequence: 12,
  ageMs: 32,
  effectiveEndpoint: 'http://127.0.0.1:8096/hand-control-sidecar-event',
});
const report = composeHandSurfaceLerms(cache, {
  requestedRoute,
  nowMs,
  maxFreshnessMs: 180,
  requestedEndpoint: '/kaminos-hand-control/hand-control-sidecar-event',
  effectiveEndpoint: 'http://127.0.0.1:8096/hand-control-sidecar-event',
  webcam: {
    source: 'synthetic_fixture',
    visible: true,
    blank: false,
    frameId: 'synthetic-webcam-gradient',
    width: 1280,
    height: 720,
  },
  attachmentMode: 'hand_mesh',
  lermAnchors: [
    { id: 'red-lerm-palm', meshFaceIndex: 1, barycentric: [0.22, 0.34, 0.44], behaviorHint: 'cling' },
    { id: 'yellow-lerm-index', meshFaceIndex: 3, barycentric: [0.18, 0.48, 0.34], behaviorHint: 'finger_walk' },
    { id: 'blue-lerm-ring', meshFaceIndex: 4, barycentric: [0.24, 0.46, 0.3], behaviorHint: 'curious' },
  ],
  moge: { requested: true, effectiveRoute: null, ageMs: null },
});
const hostPacket = createHandSurfaceHostPacket(report, {
  generatedAtMs: nowMs,
  sourceRoute: 'lerms/hand-surface/host-packet-file',
  sourceCommit: process.env.LERMS_SOURCE_COMMIT ?? null,
});
const witness = {
  ok: report.surfaceFrame.status === 'valid' && report.attachments.every((attachment) => attachment.mode === 'hand_surface'),
  visibleDeltaAssessment: 'Synthetic fixture filmstrip shows an Underhill ghost-shell panel, a MANO-shaped mesh frame, and three provisional proxy schnoz-sphere lerm bodies attached by barycentric mesh-triangle coordinates and oriented from local triangle frames; it does not prove live operator webcam/WiLoR authority or final lerm assets.',
  handSurfaceAttachment: report.authority,
  bodyVisuals: report.attachments.map((attachment) => ({
    id: attachment.id,
    kind: attachment.bodyVisual?.kind ?? null,
    downgrade: attachment.bodyVisual?.downgrade ?? null,
    orientationSource: attachment.bodyVisual?.orientationSource ?? null,
    source: attachment.bodyVisual?.source ?? null,
  })),
  requestedRoute: report.routeTruth.requestedRoute,
  effectiveRoute: report.routeTruth.effectiveRoute,
  backendIdentity: report.routeTruth.backendIdentity,
  freshness: report.freshness,
  fallback: report.routeTruth.fallback,
  downgradeState: report.downgrades,
  webcam: report.webcam,
  moge: report.moge,
  artifacts: {
    jsonPath,
    svgPath,
    hostPacketPath,
  },
  hostPacketSchema: hostPacket.schema,
  hostPacketRoute: hostPacket.source.route,
  report,
};

await mkdir(dirname(jsonPath), { recursive: true });
await mkdir(dirname(svgPath), { recursive: true });
await mkdir(dirname(hostPacketPath), { recursive: true });
await writeFile(jsonPath, `${JSON.stringify(witness, null, 2)}\n`, 'utf8');
await writeFile(svgPath, `${renderHandSurfaceWitnessSvg(report, { width: 960, height: 540 })}\n`, 'utf8');
await writeFile(hostPacketPath, `${JSON.stringify(hostPacket, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ ok: witness.ok, jsonPath, svgPath, hostPacketPath, authority: report.authority, downgrades: report.downgrades }, null, 2));
