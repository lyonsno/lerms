import {
  existsSync,
  mkdtempSync,
  readFileSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

import {
  buildGloveWellLiveComparisonWitnessReport,
  GLOVE_WELL_LIVE_COMPARISON_WITNESS_SCHEMA,
  GLOVE_WELL_LIVE_COMPARISON_WITNESS_ROUTE
} from '../src/glove-well-live-comparison-witness.ts';
import {
  GLOVE_INPUT_WILOR_LIVE_EFFECTIVE_ROUTE,
  type WilorMiniGloveInputPacket
} from '../src/glove-input-wilor-adapter.ts';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertThrows(fn: () => void, expected: string): void {
  try {
    fn();
  } catch (error) {
    assert(error instanceof Error, 'expected Error');
    assert(error.message.includes(expected), `expected "${error.message}" to include "${expected}"`);
    return;
  }
  throw new Error(`expected function to throw ${expected}`);
}

function packet(frameId: string, timestampMs: number, kind: 'prime' | 'aim' | 'release'): WilorMiniGloveInputPacket {
  const pinched = kind !== 'release';
  const pinkyHoldMs = kind === 'prime' ? 0 : kind === 'aim' ? 180 : 320;
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
      cameraFrameAgeMs: 74,
      modelLatencyMs: 61,
      publishAgeMs: 17,
      roundTripMs: 118
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
  packet('wilor-live-prime-001', 20_000, 'prime'),
  packet('wilor-live-aim-001', 20_140, 'aim'),
  packet('wilor-live-release-001', 20_280, 'release')
];

const report = buildGloveWellLiveComparisonWitnessReport({
  outputPath: '/tmp/lerms-glove-well-live-comparison-test.json',
  frameId: 'glove-well-live-comparison-test',
  timestampMs: 20_000,
  packets: livePackets
});

assert(report.ok === true, 'live comparison report builds');
assert(report.schema === GLOVE_WELL_LIVE_COMPARISON_WITNESS_SCHEMA, 'comparison schema is versioned');
assert(report.route === GLOVE_WELL_LIVE_COMPARISON_WITNESS_ROUTE, 'comparison route is versioned');
assert(report.packetCount === 3, 'comparison records packet count');
assert(report.adaptedFrames.length === 3, 'comparison preserves adapted frames');
assert(report.liveCommands.map((command) => command.phase).join(',') === 'priming,aiming,released', 'live packets produce expected command phases');
assert(report.fixtureCommands.map((command) => command.phase).join(',') === 'idle,priming,aiming,released', 'fixture comparison phases are preserved');
assert(report.comparison.liveReleaseEventId?.includes('wilor-live-release-001'), 'live release traces to WiLoR frame');
assert(report.comparison.phaseAgreement === false, 'fixture and live sequences can differ without hiding the mismatch');
assert(report.comparison.livePhaseTrace === 'priming>aiming>released', 'live phase trace is compact');
assert(report.comparison.fixturePhaseTrace === 'idle>priming>aiming>released', 'fixture phase trace is compact');
assert(report.sourceTruth.effectiveAuthority === 'live_simulation', 'all non-fallback packets keep comparison live');
assert(report.sourceTruth.requestedRoutes.includes('perceptasia/wilor-mini-mlx-sidecar/live-glove-input'), 'requested route is recorded');
assert(report.sourceTruth.effectiveRoutes.includes(GLOVE_INPUT_WILOR_LIVE_EFFECTIVE_ROUTE), 'effective route is recorded');
assert(report.sourceTruth.fallbackReasons.length === 0, 'non-fallback comparison has no fallback reasons');
assert(report.sourceTruth.maxCameraFrameAgeMs === 74, 'camera age max is recorded');
assert(report.sourceTruth.maxRoundTripMs === 118, 'round trip max is recorded');
assert(report.whatRemainsFake.fullVerticalSuccess === true, 'comparison does not claim full vertical success');
assert(report.whatRemainsFake.sidecarProcessManager === true, 'comparison does not claim sidecar management');

const fallbackReport = buildGloveWellLiveComparisonWitnessReport({
  outputPath: '/tmp/lerms-glove-well-live-comparison-fallback-test.json',
  frameId: 'glove-well-live-comparison-fallback-test',
  timestampMs: 20_000,
  packets: [
    {
      ...livePackets[0],
      frameId: 'wilor-fallback-prime',
      source: {
        ...livePackets[0].source,
        effectiveRoute: 'lerms/glove-input/fixture-fallback',
        backend: 'fixture-fallback',
        fallbackReason: 'sidecar-timeout'
      }
    }
  ]
});
assert(fallbackReport.sourceTruth.effectiveAuthority === 'fallback', 'fallback packet downgrades comparison');
assert(fallbackReport.sourceTruth.fallbackReasons.includes('sidecar-timeout'), 'fallback reason is surfaced');
assert(fallbackReport.comparison.liveReleaseEventId === null, 'fallback comparison does not invent release');

assertThrows(
  () =>
    buildGloveWellLiveComparisonWitnessReport({
      outputPath: '/tmp/lerms-glove-well-live-comparison-empty-test.json',
      frameId: 'glove-well-live-comparison-empty-test',
      timestampMs: 20_000,
      packets: []
    }),
  'at least one WiLoR packet'
);

const tmp = mkdtempSync(join(tmpdir(), 'lerms-glove-well-live-comparison-'));
const packetPath = join(tmp, 'packets.json');
const reportPath = join(tmp, 'report.json');
writeFileSync(packetPath, JSON.stringify(livePackets, null, 2));
const cliRun = spawnSync(
  process.execPath,
  [
    '--experimental-strip-types',
    'src/glove-well-live-comparison-witness.ts',
    '--report',
    reportPath,
    '--packets',
    packetPath,
    '--frame-id',
    'glove-well-live-comparison-cli-test',
    '--timestamp-ms',
    '21000'
  ],
  { cwd: process.cwd(), encoding: 'utf8' }
);

assert(cliRun.status === 0, cliRun.stderr || cliRun.stdout);
assert(existsSync(reportPath), 'comparison CLI writes report');
const cliReport = JSON.parse(readFileSync(reportPath, 'utf8'));
assert(cliReport.ok === true, 'comparison CLI report is ok');
assert(cliReport.inputPacketPath === packetPath, 'comparison CLI records input packet path');
assert(cliReport.comparison.livePhaseTrace === 'priming>aiming>released', 'comparison CLI preserves live phase trace');

console.log('glove well live comparison witness contracts ok');
