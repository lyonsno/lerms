import {
  existsSync,
  mkdtempSync,
  readFileSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';

import {
  buildGloveWellLiveThrowCompositionWitnessReport,
  GLOVE_WELL_LIVE_THROW_COMPOSITION_WITNESS_ROUTE,
  GLOVE_WELL_LIVE_THROW_COMPOSITION_WITNESS_SCHEMA
} from '../src/glove-well-live-throw-composition-witness.ts';
import {
  GLOVE_INPUT_WILOR_LIVE_EFFECTIVE_ROUTE,
  type WilorMiniGloveInputPacket
} from '../src/glove-input-wilor-adapter.ts';

function packet(frameId: string, timestampMs: number, kind: 'prime' | 'aim' | 'release'): WilorMiniGloveInputPacket {
  const pinched = kind !== 'release';
  const pinkyHoldMs = kind === 'prime' ? 0 : kind === 'aim' ? 190 : 340;
  return {
    schema: 'perceptasia.wilor-mini-glove-input-packet.v0',
    frameId,
    timestampMs,
    source: {
      requestedRoute: 'perceptasia/wilor-mini-mlx-sidecar/live-glove-input',
      effectiveRoute: GLOVE_INPUT_WILOR_LIVE_EFFECTIVE_ROUTE,
      backend: 'native_wilor_mini_mlx_detector_sidecar_live',
      model: 'wilor-mini-mlx',
      configId: 'native-wilor-mini-mlx-sidecar-live:v0',
      fallbackReason: null
    },
    timing: {
      cameraFrameAgeMs: 72,
      modelLatencyMs: 59,
      publishAgeMs: 16,
      roundTripMs: 116
    },
    coordinateFrame: {
      space: 'screen_normalized',
      origin: 'top_left',
      handedness: 'operator_unmirrored'
    },
    hand: {
      handedness: 'right',
      confidence: 0.95,
      palmCenter: { x: 0.43, y: 0.68 },
      landmarks: {
        wrist: { x: 0.43, y: 0.86 },
        thumb_ip: { x: 0.36, y: 0.67 },
        thumb_tip: pinched ? { x: 0.412, y: 0.614 } : { x: 0.335, y: 0.642 },
        index_mcp: { x: 0.455, y: 0.72 },
        index_tip: pinched ? { x: 0.435, y: 0.606 } : { x: 0.505, y: 0.582 },
        middle_mcp: { x: 0.48, y: 0.73 },
        middle_tip: { x: 0.49, y: 0.62 },
        ring_mcp: { x: 0.515, y: 0.735 },
        ring_tip: { x: 0.535, y: 0.65 },
        pinky_mcp: { x: 0.55, y: 0.74 },
        pinky_tip: { x: 0.67, y: 0.595 }
      }
    },
    gestures: {
      pinkyHoldMs
    }
  };
}

const livePackets = [
  packet('wilor-throw-prime-001', 40_000, 'prime'),
  packet('wilor-throw-aim-001', 40_140, 'aim'),
  packet('wilor-throw-release-001', 40_280, 'release')
];

const report = buildGloveWellLiveThrowCompositionWitnessReport({
  outputPath: '/tmp/lerms-glove-well-live-throw-composition-test.json',
  frameId: 'glove-well-live-throw-composition-test',
  timestampMs: 40_000,
  packets: livePackets,
  inputPacketPath: '/tmp/saved-wilor-throw-packets.json'
});

assert.equal(report.ok, true);
assert.equal(report.schema, GLOVE_WELL_LIVE_THROW_COMPOSITION_WITNESS_SCHEMA);
assert.equal(report.route, GLOVE_WELL_LIVE_THROW_COMPOSITION_WITNESS_ROUTE);
assert.equal(report.packetCount, 3);
assert.equal(report.inputPacketPath, '/tmp/saved-wilor-throw-packets.json');
assert.equal(report.commandPhaseTrace, 'priming>aiming>released');
assert.equal(report.releaseEventId.includes('wilor-throw-release-001'), true);
assert.equal(report.releaseSourceFrameId, 'wilor-throw-release-001');
assert.equal(report.sourceTruth.effectiveAuthority, 'live_simulation');
assert.equal(report.sourceTruth.inputAuthority, 'live_simulation');
assert.equal(report.sourceTruth.physicsAuthority, 'live_simulation');
assert.equal(report.sourceTruth.fallbackPacketCount, 0);
assert.equal(report.sourceTruth.staleCommandCount, 0);
assert.equal(report.sourceTruth.nonFallbackLivePacketCount, 3);
assert.equal(report.sourceTruth.maxRoundTripMs, 116);
assert.equal(report.throwPhysics.schema, 'lerms.glove-well-throw-physics-witness.v0');
assert.equal(report.throwPhysics.sourceTruth.effectiveAuthority, 'live_simulation');
assert.equal(report.throwPhysics.trajectory.map((sample) => sample.phase).join('>'), 'launch>flight>bounce>rolling>bounce>settled>recovered');
assert.equal(report.throwPhysics.bounceContacts.length, 2);
assert.equal(report.throwPhysics.sourceTruth.sourceInputFrameId, 'wilor-throw-release-001');
assert.equal(report.throwPhysics.previewBenchPayload.payload.throwPhysics?.effectiveAuthority, 'live_simulation');
assert.equal(report.throwPhysics.previewBenchPayload.payload.throwPhysics?.fixtureInputDowngrade, false);
assert.equal(report.throwPhysics.previewBenchPayload.payload.downgrades.includes('fixture_glove_input_not_live_wilor'), false);
assert.equal(
  report.throwPhysics.previewBenchPayload.payload.downgrades.includes('throw_physics_fixture_input_not_live_wilor'),
  false
);
assert.equal(report.previewBenchPayload.payload.throwPhysics?.phaseTrace, 'launch>flight>bounce>rolling>bounce>settled>recovered');
assert.ok(report.previewBenchPayload.payload.downgrades.includes('saved_wilor_packets_not_sidecar_process_manager'));
assert.equal(report.whatRemainsFake.sidecarProcessManager, true);
assert.equal(report.whatRemainsFake.fullVerticalSuccess, true);

const fallbackReport = buildGloveWellLiveThrowCompositionWitnessReport({
  outputPath: '/tmp/lerms-glove-well-live-throw-composition-fallback-test.json',
  frameId: 'glove-well-live-throw-composition-fallback-test',
  timestampMs: 40_000,
  packets: livePackets.map((sourcePacket) => ({
    ...sourcePacket,
    frameId: `${sourcePacket.frameId}-fallback`,
    source: {
      ...sourcePacket.source,
      effectiveRoute: 'lerms/glove-input/fixture-fallback',
      backend: 'fixture-fallback',
      fallbackReason: 'sidecar-timeout'
    }
  }))
});
assert.equal(fallbackReport.sourceTruth.effectiveAuthority, 'fallback');
assert.equal(fallbackReport.throwPhysics.sourceTruth.effectiveAuthority, 'fallback');
assert.ok(fallbackReport.sourceTruth.fallbackReasons.includes('sidecar-timeout'));

const stalePackets = [
  livePackets[0],
  livePackets[1],
  {
    ...livePackets[2],
    frameId: 'wilor-throw-stale-release-001',
    timing: {
      ...livePackets[2].timing,
      cameraFrameAgeMs: 260
    }
  }
];
assert.throws(
  () =>
    buildGloveWellLiveThrowCompositionWitnessReport({
      outputPath: '/tmp/lerms-glove-well-live-throw-composition-stale-test.json',
      frameId: 'glove-well-live-throw-composition-stale-test',
      timestampMs: 40_000,
      packets: stalePackets
    }),
  /release command/
);

const tmp = mkdtempSync(join(tmpdir(), 'lerms-glove-well-live-throw-'));
const packetPath = join(tmp, 'packets.json');
const reportPath = join(tmp, 'live-throw.json');
writeFileSync(packetPath, JSON.stringify(livePackets, null, 2));
const cliRun = spawnSync(
  process.execPath,
  [
    '--experimental-strip-types',
    'src/glove-well-live-throw-composition-witness.ts',
    '--report',
    reportPath,
    '--packets',
    packetPath,
    '--frame-id',
    'glove-well-live-throw-cli',
    '--timestamp-ms',
    '41000'
  ],
  { cwd: process.cwd(), encoding: 'utf8' }
);

assert.equal(cliRun.status, 0, cliRun.stderr || cliRun.stdout);
assert.equal(existsSync(reportPath), true);
const cliReport = JSON.parse(readFileSync(reportPath, 'utf8'));
assert.equal(cliReport.ok, true);
assert.equal(cliReport.inputPacketPath, packetPath);
assert.equal(cliReport.throwPhysics.bounceContacts.length, 2);

const stalePath = join(tmp, 'stale-live-throw.json');
writeFileSync(join(tmp, 'stale-packets.json'), JSON.stringify(stalePackets, null, 2));
const staleRun = spawnSync(
  process.execPath,
  [
    '--experimental-strip-types',
    'src/glove-well-live-throw-composition-witness.ts',
    '--report',
    stalePath,
    '--packets',
    join(tmp, 'stale-packets.json'),
    '--timestamp-ms',
    '41000'
  ],
  { cwd: process.cwd(), encoding: 'utf8' }
);
assert.notEqual(staleRun.status, 0, 'stale release cannot quietly claim throw evidence');
const staleCliReport = JSON.parse(readFileSync(stalePath, 'utf8'));
assert.equal(staleCliReport.ok, false);
assert.equal(staleCliReport.failureKind, 'live-throw-release-missing');
assert.equal(staleCliReport.lastTrustworthyEvidence.inputPacketPath, join(tmp, 'stale-packets.json'));

console.log('glove well live throw composition witness contracts passed');
