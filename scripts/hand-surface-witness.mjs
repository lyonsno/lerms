import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import {
  composeHandSurfaceLerms,
  createFixtureKaminosHandEventCache,
  createFixtureWilorHandPacket,
  renderHandSurfaceWitnessSvg,
} from '../src/hand-surface-lerms.ts';

const jsonPath = process.argv[2] ?? '/tmp/lerms-hand-surface-witness-0629.json';
const svgPath = process.argv[3] ?? '/tmp/lerms-hand-surface-witness-0629.svg';
const requestedRoute = 'native_wilor_mini_mlx_detector_sidecar_live';
const nowMs = 1200;
const packet = createFixtureWilorHandPacket({
  effectiveRoute: 'wilor_hand_surface_synthetic_fixture',
  sourceBackend: 'wilor_hand_surface_synthetic_fixture',
  timestampMs: 1168,
  palmNormal: { x: 0.08, y: -0.28, z: 0.92 },
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
  attachmentMode: 'hand_surface',
  lermAnchors: [
    { id: 'red-lerm-palm', face: [0, 5, 9], barycentric: [0.22, 0.34, 0.44], behaviorHint: 'cling' },
    { id: 'yellow-lerm-index', face: [5, 6, 10], barycentric: [0.18, 0.48, 0.34], behaviorHint: 'finger_walk' },
    { id: 'blue-lerm-ring', face: [13, 14, 18], barycentric: [0.24, 0.46, 0.3], behaviorHint: 'curious' },
  ],
  moge: { requested: true, effectiveRoute: null, ageMs: null },
});
const witness = {
  ok: report.surfaceFrame.status === 'valid' && report.attachments.every((attachment) => attachment.mode === 'hand_surface'),
  visibleDeltaAssessment: 'Synthetic fixture filmstrip shows a webcam-ground-truth panel, WiLoR-shaped hand-surface triangulation, and three lerm placeholders attached by barycentric hand-face coordinates; it does not prove live operator webcam/WiLoR authority.',
  handSurfaceAttachment: report.authority,
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
  },
  report,
};

await mkdir(dirname(jsonPath), { recursive: true });
await mkdir(dirname(svgPath), { recursive: true });
await writeFile(jsonPath, `${JSON.stringify(witness, null, 2)}\n`, 'utf8');
await writeFile(svgPath, `${renderHandSurfaceWitnessSvg(report, { width: 960, height: 540 })}\n`, 'utf8');
console.log(JSON.stringify({ ok: witness.ok, jsonPath, svgPath, authority: report.authority, downgrades: report.downgrades }, null, 2));
