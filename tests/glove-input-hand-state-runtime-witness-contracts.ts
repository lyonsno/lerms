import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';

import {
  buildGloveInputHandStateRuntimeWitnessReport,
  GLOVE_INPUT_HAND_STATE_RUNTIME_WITNESS_ROUTE,
  GLOVE_INPUT_HAND_STATE_RUNTIME_WITNESS_SCHEMA,
  type GloveInputHandStateRuntimeWitnessReport
} from '../src/glove-input-hand-state-runtime-witness.ts';
import type { HandStateRuntimeStateEnvelope } from '../src/glove-input-wilor-adapter.ts';

function runtimeState(overrides: any = {}): HandStateRuntimeStateEnvelope {
  const base: HandStateRuntimeStateEnvelope = {
    schema: 'hand-state.runtime-state.v0',
    runtimeOwner: 'hand-state-runtime',
    stateDir: '/tmp/handstate-runtime-state',
    status: 'fresh',
    fetchedAtMs: 52_200,
    maxAgeMs: 250,
    handInputSourceAuthority: 'synthetic_fixture',
    handInputFreshness: 'fresh',
    handInputRequestedRoute: 'hand-state-runtime/wilor-mini-mlx-sidecar/live-glove-input',
    handInputEffectiveRoute: 'hand-state-runtime/state-stream/ingested-fixture',
    handInputConfigId: 'hand-state-runtime-state-stream-test-v0',
    handInputFallbackReason: 'fixture_live_shape_not_camera',
    frame: {
      schema: 'hand-state.frame.v0',
      producer: {
        owner: 'hand-state-runtime',
        package: 'handstate_runtime',
        version: '0.1.0',
        sessionId: null,
        processId: 1234,
        stateDir: '/tmp/handstate-runtime-state'
      },
      source: {
        requestedRoute: 'hand-state-runtime/wilor-mini-mlx-sidecar/live-glove-input',
        effectiveRoute: 'hand-state-runtime/state-stream/ingested-fixture',
        backend: 'fixture',
        model: 'fixture-wilor-mini-shape-v0',
        detector: null,
        deviceRoute: 'cpu',
        dtypeRoute: 'float32',
        configId: 'hand-state-runtime-state-stream-test-v0',
        fallbackReason: 'fixture_live_shape_not_camera',
        rawSchema: null,
        evidenceRoute: 'hand-state-runtime/state-stream/ingested-fixture',
        rawEventSequence: null,
        rawEventPath: null
      },
      authority: {
        sourceAuthority: 'synthetic_fixture',
        freshness: 'fixture',
        fallbackReason: 'fixture_live_shape_not_camera',
        noLiveReason: 'fixture_backend_not_live_camera',
        authorityNote: 'Live-shaped fixture only; does not prove fresh camera or sidecar authority.',
        promotes: {
          liveGloveWellAuthority: false,
          kaminosAcceptance: false,
          firstVerticalTruth: false,
          visualSmokeSuccess: false
        }
      },
      frame: {
        frameId: 'runtime-state-witness-frame-001',
        captureTimestampMs: 52_120,
        ingestTimestampMs: 52_160,
        sourceVideoSize: null,
        encodedSize: null,
        frameAgeAtInferenceMs: 42
      },
      timing: {
        cameraFrameAgeMs: 42,
        modelLatencyMs: null,
        sidecarLoopLatencyMs: null,
        publishAgeMs: 10,
        stateStreamAgeMs: 40,
        roundTripMs: null
      },
      coordinateFrame: {
        space: 'screen_normalized',
        origin: 'top_left',
        handedness: 'operator_unmirrored',
        depthPolicy: 'non_load_bearing'
      },
      hand: {
        handedness: 'right',
        confidence: 0.94,
        palmCenter: { x: 0.42, y: 0.68 },
        bbox: null,
        landmarks: {
          wrist: { x: 0.42, y: 0.86 },
          thumb_ip: { x: 0.365, y: 0.67 },
          thumb_tip: { x: 0.405, y: 0.615 },
          index_mcp: { x: 0.455, y: 0.72 },
          index_tip: { x: 0.432, y: 0.605 },
          middle_mcp: { x: 0.48, y: 0.73 },
          middle_tip: { x: 0.49, y: 0.62 },
          ring_mcp: { x: 0.515, y: 0.735 },
          ring_tip: { x: 0.535, y: 0.65 },
          pinky_mcp: { x: 0.55, y: 0.74 },
          pinky_tip: { x: 0.665, y: 0.6 }
        },
        keypoints3d: null,
        palmBasis: null,
        palmNormal: null,
        openness: null,
        pinch: null,
        fist: null,
        spread: null
      },
      mano: {
        requested: false,
        available: false,
        coordinateSpace: null,
        vertexCount: 0,
        faceCount: 0,
        vertices: null,
        faces: null,
        diagnostic: 'not_requested'
      },
      diagnostics: {
        noHand: false,
        staleSkip: false,
        backendErrors: [],
        droppedFrames: 0,
        routeTruth: 'fixture_not_live_camera',
        hiddenFallback: false,
        validationWarnings: ['fixture_live_shape_not_camera']
      }
    },
    clientProjectImports: []
  };

  return {
    ...base,
    ...overrides,
    frame: {
      ...base.frame,
      ...overrides.frame,
      source: {
        ...base.frame.source,
        ...overrides.frame?.source
      },
      authority: {
        ...base.frame.authority,
        ...overrides.frame?.authority
      },
      frame: {
        ...base.frame.frame,
        ...overrides.frame?.frame
      },
      timing: {
        ...base.frame.timing,
        ...overrides.frame?.timing
      },
      coordinateFrame: {
        ...base.frame.coordinateFrame,
        ...overrides.frame?.coordinateFrame
      },
      hand: {
        ...base.frame.hand,
        ...overrides.frame?.hand
      }
    }
  };
}

const report = buildGloveInputHandStateRuntimeWitnessReport({
  outputPath: '/tmp/lerms-glove-input-hand-state-runtime-witness-test.json',
  state: runtimeState(),
  inputStatePath: '/tmp/handstate-runtime-state.json',
  frameId: 'glove-input-hand-state-runtime-witness-test',
  timestampMs: 52_500
}) as GloveInputHandStateRuntimeWitnessReport;

assert.equal(report.ok, true);
assert.equal(report.schema, GLOVE_INPUT_HAND_STATE_RUNTIME_WITNESS_SCHEMA);
assert.equal(report.route, GLOVE_INPUT_HAND_STATE_RUNTIME_WITNESS_ROUTE);
assert.equal(report.inputStateSchema, 'hand-state.runtime-state.v0');
assert.equal(report.runtimeOwner, 'hand-state-runtime');
assert.equal(report.inputStatePath, '/tmp/handstate-runtime-state.json');
assert.equal(report.adaptedFrame.schema, 'lerms.glove-input-frame.v0');
assert.equal(report.adaptedFrame.source.authority, 'synthetic_fixture');
assert.equal(report.adaptedFrame.source.producerConfigId, 'hand-state-runtime-state-stream-test-v0');
assert.equal(report.sourceTruth.handInputSourceAuthority, 'synthetic_fixture');
assert.equal(report.sourceTruth.handInputFreshness, 'fresh');
assert.equal(report.sourceTruth.handInputRequestedRoute, 'hand-state-runtime/wilor-mini-mlx-sidecar/live-glove-input');
assert.equal(report.sourceTruth.handInputEffectiveRoute, 'hand-state-runtime/state-stream/ingested-fixture');
assert.equal(report.sourceTruth.handInputConfigId, 'hand-state-runtime-state-stream-test-v0');
assert.equal(report.sourceTruth.handInputFallbackReason, 'fixture_live_shape_not_camera');
assert.equal(report.sourceTruth.liveGloveWellAuthority, false);
assert.equal(report.sourceTruth.kaminosAcceptance, false);
assert.ok(report.downgrades.includes('hand_state_runtime_fixture_or_fallback_not_live_camera'));
assert.equal(report.whatRemainsFake.runtimeOwnedLiveSidecar, true);
assert.equal(report.whatRemainsFake.kaminosVisibleHostAcceptance, true);

const tmp = mkdtempSync(join(tmpdir(), 'lerms-hand-state-runtime-witness-'));
const inputPath = join(tmp, 'runtime-state.json');
const reportPath = join(tmp, 'runtime-state-witness.json');
writeFileSync(inputPath, JSON.stringify(runtimeState(), null, 2));
const cliRun = spawnSync(
  process.execPath,
  [
    '--experimental-strip-types',
    'src/glove-input-hand-state-runtime-witness.ts',
    '--state',
    inputPath,
    '--report',
    reportPath,
    '--frame-id',
    'glove-input-hand-state-runtime-cli',
    '--timestamp-ms',
    '52600'
  ],
  { cwd: process.cwd(), encoding: 'utf8' }
);

assert.equal(cliRun.status, 0, cliRun.stderr || cliRun.stdout);
assert.equal(existsSync(reportPath), true);
const cliReport = JSON.parse(readFileSync(reportPath, 'utf8'));
assert.equal(cliReport.ok, true);
assert.equal(cliReport.inputStatePath, inputPath);
assert.equal(cliReport.sourceTruth.handInputConfigId, 'hand-state-runtime-state-stream-test-v0');

const fallbackPath = join(tmp, 'fallback-runtime-state.json');
const fallbackReportPath = join(tmp, 'fallback-runtime-state-witness.json');
writeFileSync(
  fallbackPath,
  JSON.stringify(
    runtimeState({
      status: 'fallback',
      handInputSourceAuthority: 'fallback',
      handInputFreshness: 'missing',
      handInputEffectiveRoute: 'hand-state-runtime/wilor-mini-mlx-sidecar/stale-or-missing',
      handInputConfigId: 'hand-state-runtime-live-v0',
      handInputFallbackReason: 'no_ingested_hand_state_frame',
      frame: {
        source: {
          effectiveRoute: 'hand-state-runtime/wilor-mini-mlx-sidecar/stale-or-missing',
          backend: 'none',
          model: null,
          configId: 'hand-state-runtime-live-v0',
          fallbackReason: 'no_ingested_hand_state_frame'
        },
        authority: {
          sourceAuthority: 'fallback',
          freshness: 'stale',
          fallbackReason: 'no_ingested_hand_state_frame',
          noLiveReason: 'no_ingested_hand_state_frame'
        },
        frame: {
          frameId: 'none'
        },
        hand: {
          handedness: 'unknown',
          confidence: 0,
          palmCenter: null,
          landmarks: []
        }
      }
    }),
    null,
    2
  )
);
const fallbackRun = spawnSync(
  process.execPath,
  [
    '--experimental-strip-types',
    'src/glove-input-hand-state-runtime-witness.ts',
    '--state',
    fallbackPath,
    '--report',
    fallbackReportPath
  ],
  { cwd: process.cwd(), encoding: 'utf8' }
);
assert.notEqual(fallbackRun.status, 0, 'fallback runtime state cannot quietly claim adapted hand input evidence');
const fallbackCliReport = JSON.parse(readFileSync(fallbackReportPath, 'utf8'));
assert.equal(fallbackCliReport.ok, false);
assert.equal(fallbackCliReport.failureKind, 'hand-state-runtime-input-invalid');
assert.match(fallbackCliReport.error, /no live hand landmarks/);
assert.equal(fallbackCliReport.lastTrustworthyEvidence.inputStatePath, fallbackPath);
assert.equal(fallbackCliReport.lastTrustworthyEvidence.inputStateSchema, 'hand-state.runtime-state.v0');
assert.equal(fallbackCliReport.lastTrustworthyEvidence.handInputSourceAuthority, 'fallback');
assert.equal(fallbackCliReport.lastTrustworthyEvidence.handInputFallbackReason, 'no_ingested_hand_state_frame');

console.log('glove input hand-state runtime witness contracts passed');
