import {
  LIVE_HAND_HYBRID_ROUTE,
  LIVE_HAND_ROUTE,
  assertLiveRuntimeHealth,
  normalizeLiveManoFrame,
  normalizeManoSurface,
  summarizeLiveHandLatency,
} from '../src/hand/live-hand-contract.js';
import {
  LIVE_HAND_CAPTURE_REPLY_DEADLINE_MS,
  LIVE_HAND_CAPTURE_WORKER_ROUTE,
  isCaptureRunCurrent,
  normalizeCaptureWorkerResult,
} from '../src/hand/live-hand-capture-contract.js';
import { LiveHandLatencyReceiptJoiner } from '../src/hand/live-hand-latency-receipt.js';
import {
  planLiveHandSourceFrame,
  resolveLiveHandAnchorIntervalMs,
} from '../src/hand/live-hand-source-scheduler.js';
import {
  LIVE_HAND_LANDMARKER_ERROR_SCHEMA,
  LIVE_HAND_LANDMARKER_RESULT_SCHEMA,
  LIVE_HAND_LANDMARKER_WORKER_ROUTE,
  createFastLandmarkPayload,
  normalizeLandmarkerWorkerError,
  normalizeLandmarkerWorkerResult,
} from '../src/hand/live-hand-landmarker-contract.js';
import {
  LIVE_HAND_FLUID_FRAME_INTERVAL_MS,
  LIVE_HAND_FLUID_MAX_CATCH_UP_MS,
  advanceFluidSimulationClock,
  decideLiveHandFrameWork,
  initializeFluidSimulationClock,
  planLiveFluidSimulationCatchUp,
  shouldKeepHandPresentationPriority,
} from '../src/hand/live-hand-frame-budget.js';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertThrows(fn: () => void, expectedMessage: string): void {
  try {
    fn();
  } catch (error) {
    assert(error instanceof Error, 'expected an Error');
    assert(error.message.includes(expectedMessage), `expected "${error.message}" to include "${expectedMessage}"`);
    return;
  }
  throw new Error(`expected function to throw "${expectedMessage}"`);
}

const vertices = Array.from({ length: 778 }, (_, index) => [
  index === 0 ? -2 : index === 1 ? 2 : 0,
  index === 2 ? -1 : index === 3 ? 1 : 0,
  index === 4 ? -0.5 : index === 5 ? 0.5 : 0,
]);
const faces = Array.from({ length: 1538 }, (_, index) => [index % 778, (index + 1) % 778, (index + 2) % 778]);

const health = {
  runtimeOwner: 'hand-state-runtime',
  sidecarRuntimeConfig: { burstMode: 'chunked', chunkSegments: 7, chunkYieldMs: 0.2 },
  manoRegeneratorAvailable: true,
  hybridGeometryMode: 'native_mano_regeneration',
};
const healthTruth = assertLiveRuntimeHealth(health);
assert(healthTruth.burstMode === 'chunked', 'preserves chunked route identity');
assert(healthTruth.chunkSegments === 7, 'preserves effective chunk segment count');
assert(healthTruth.chunkYieldMs === 0.2, 'preserves effective chunk yield');
assert(healthTruth.manoRegeneratorAvailable, 'preserves MANO regenerator availability');
assert(healthTruth.hybridGeometryMode === 'native_mano_regeneration', 'preserves effective hybrid geometry identity');

assertThrows(
  () => assertLiveRuntimeHealth({ ...health, runtimeOwner: 'perceptasia' }),
  'runtime owner',
);

const workerBlob = new Blob(['jpeg'], { type: 'image/jpeg' });
const workerResult = normalizeCaptureWorkerResult({
  schema: 'lerms.live-hand-capture-result.v0',
  routeIdentity: 'transferable-videoframe-offscreen-jpeg-v0',
  captureId: 'capture-1',
  blob: workerBlob,
  workerEncodeMs: 4.5,
  width: 640,
  height: 480,
}, 'capture-1');
assert(LIVE_HAND_CAPTURE_WORKER_ROUTE === 'transferable-videoframe-offscreen-jpeg-v0', 'identifies the off-main capture route');
assert(LIVE_HAND_CAPTURE_REPLY_DEADLINE_MS === 750, 'capture deadline matches the live frame freshness horizon');
assert(isCaptureRunCurrent(8, 8, true), 'accepts a capture from the active run');
assert(!isCaptureRunCurrent(7, 8, true), 'rejects a capture from a stopped run after restart');
assert(!isCaptureRunCurrent(8, 8, false), 'rejects a capture after hand control stops');
assert(workerResult.blob.size === 4 && workerResult.workerEncodeMs === 4.5, 'accepts a nonblank worker JPEG receipt');
assertThrows(
  () => normalizeCaptureWorkerResult({
    ...workerResult,
    routeIdentity: 'main-thread-canvas-to-blob',
  }, 'capture-1'),
  'capture worker route',
);
assertThrows(
  () => normalizeCaptureWorkerResult({ ...workerResult, blob: new Blob([], { type: 'image/jpeg' }) }, 'capture-1'),
  'nonblank JPEG',
);

const receiptJoiner = new LiveHandLatencyReceiptJoiner<{ route: string }>();
const earlyFrameReceipt = receiptJoiner.registerFrame(
  'capture-state-first',
  { route: LIVE_HAND_ROUTE },
  1_100,
);
assert(earlyFrameReceipt === null, 'a state received before POST completion waits for its capture timing');
assert(receiptJoiner.snapshot().pendingFrameCount === 1, 'an unmatched live frame remains visible as pending evidence');
const stateFirstJoin = receiptJoiner.registerCapture('capture-state-first', {
  capturedAtMs: 1_000,
  captureAcquireMs: 1.5,
  captureRoute: LIVE_HAND_CAPTURE_WORKER_ROUTE,
  captureWorkerMs: 4.5,
  producerPostMs: 75,
});
assert(stateFirstJoin?.frame.route === LIVE_HAND_ROUTE, 'capture timing completes a state-first receipt');
assert(stateFirstJoin?.viewerReceiveTimestampMs === 1_100, 'state-first receipt preserves viewer arrival time');
assert(
  receiptJoiner.snapshot().pendingFrameCount === 0 && receiptJoiner.snapshot().completedCount === 1,
  'a completed state-first receipt leaves no unmatched evidence',
);
receiptJoiner.registerFrame('capture-never-completes', { route: LIVE_HAND_ROUTE }, 2_000);
receiptJoiner.prune(12_001, 10_000);
assert(
  receiptJoiner.snapshot().discardedFrameCount === 1,
  'a live frame whose capture timing never arrives is counted as discarded evidence',
);

assert(LIVE_HAND_FLUID_FRAME_INTERVAL_MS === 1000 / 60, 'fluid simulation targets the 60 Hz interaction cadence');
assert(LIVE_HAND_FLUID_MAX_CATCH_UP_MS === 50, 'recovery debt is bounded without becoming a normal scheduling interval');
assert(initializeFluidSimulationClock(0, 125) === 125, 'the first animation frame starts the simulation clock');
assert(initializeFluidSimulationClock(80, 125) === 80, 'an existing simulation clock is preserved');
assert(
  planLiveFluidSimulationCatchUp(50).stepCount === 3,
  'a missed 50ms window catches up three stable 60Hz simulation steps',
);
assert(
  planLiveFluidSimulationCatchUp(50).simulationAdvanceMs === 50,
  'the bounded catch-up advances approximately the elapsed wall time',
);
assert(
  planLiveFluidSimulationCatchUp(17).stepCount === 1,
  'an ordinary fluid cadence advances one stable simulation step',
);
assert(
  planLiveFluidSimulationCatchUp(25).stepCount === 1,
  'an intermediate display interval cannot round 25ms up to 33ms of simulation',
);
assert(
  planLiveFluidSimulationCatchUp(30).simulationAdvanceMs === LIVE_HAND_FLUID_FRAME_INTERVAL_MS,
  'fractional simulation debt remains for a later frame instead of advancing ahead of wall time',
);
const firstIntermediatePlan = planLiveFluidSimulationCatchUp(25);
const intermediateSimulationClock = advanceFluidSimulationClock(100, firstIntermediatePlan.simulationAdvanceMs);
const secondIntermediatePlan = planLiveFluidSimulationCatchUp(150 - intermediateSimulationClock);
assert(
  firstIntermediatePlan.simulationAdvanceMs + secondIntermediatePlan.simulationAdvanceMs === 50,
  'two 25ms presentation intervals conserve 50ms of fixed-step simulation time',
);
assert(
  decideLiveHandFrameWork({
    nowMs: 100,
    previousFrameAtMs: 92,
    fluidSimulationClockAtMs: 50,
    handStatePending: true,
  }).reason === 'fluid_due',
  'a due fluid frame is not starved by continuous hand interpolation',
);
assert(
  decideLiveHandFrameWork({
    nowMs: 100,
    previousFrameAtMs: 92,
    fluidSimulationClockAtMs: 92,
    handStatePending: false,
  }).reason === 'cadence_wait',
  'fluid work does not follow a 120 Hz display cadence',
);
assert(
  decideLiveHandFrameWork({
    nowMs: 100,
    previousFrameAtMs: 10,
    fluidSimulationClockAtMs: 0,
    handStatePending: false,
    fluidGpuBusy: false,
  }).reason === 'hitch_recovery',
  'the first frame after a long hitch drains presentation work instead of immediately refilling the GPU queue',
);
assert(
  decideLiveHandFrameWork({
    nowMs: 100,
    previousFrameAtMs: 10,
    fluidSimulationClockAtMs: 20,
    handStatePending: false,
    fluidGpuBusy: false,
  }).rebaseFluidClock,
  'hitch recovery discards stale simulation debt instead of bursting it on the next frame',
);
assert(
  decideLiveHandFrameWork({
    nowMs: 100,
    previousFrameAtMs: 92,
    fluidSimulationClockAtMs: 40,
    handStatePending: false,
    fluidGpuBusy: true,
  }).reason === 'gpu_backpressure',
  'an incomplete fluid batch prevents another GPU submission',
);
assert(
  decideLiveHandFrameWork({
    nowMs: 100,
    previousFrameAtMs: 92,
    fluidSimulationClockAtMs: 40,
    handStatePending: false,
    fluidGpuBusy: true,
  }).rebaseFluidClock === false,
  'GPU backpressure blocks overlap without erasing ordinary simulation debt',
);
assert(
  decideLiveHandFrameWork({
    nowMs: 100,
    previousFrameAtMs: 92,
    fluidSimulationClockAtMs: 60,
    handStatePending: false,
  }).runFluid,
  'fluid advances when its bounded cadence is due and interaction presentation is clear',
);
assert(
  decideLiveHandFrameWork({
    nowMs: 200,
    previousFrameAtMs: 192,
    fluidSimulationClockAtMs: 90,
    handStatePending: true,
  }).reason === 'fluid_due',
  'continuous hand convergence uses the ordinary due cadence rather than a 100ms liveness escape hatch',
);
assert(
  shouldKeepHandPresentationPriority({ handStatePending: true, interpolationUnsettled: true }),
  'hand presentation priority survives until the received state has visibly converged',
);

const firstHybridCameraFrame = planLiveHandSourceFrame({
  mode: 'hybrid_mano',
  nowMs: 1_000,
  lastAnchorCaptureAtMs: null,
  anchorIntervalMs: resolveLiveHandAnchorIntervalMs('hybrid_mano'),
  fastPathAvailable: true,
  fastPathInFlight: false,
  anchorInFlight: false,
});
assert(firstHybridCameraFrame.submitFastPath && firstHybridCameraFrame.submitAnchor, 'the first hybrid frame feeds both paired routes');
const interAnchorCameraFrame = planLiveHandSourceFrame({
  mode: 'hybrid_mano',
  nowMs: 1_016,
  lastAnchorCaptureAtMs: 1_000,
  anchorIntervalMs: resolveLiveHandAnchorIntervalMs('hybrid_mano'),
  fastPathAvailable: true,
  fastPathInFlight: false,
  anchorInFlight: false,
});
assert(interAnchorCameraFrame.submitFastPath, 'MediaPipe preserves camera cadence between WiLoR anchors');
assert(!interAnchorCameraFrame.submitAnchor, 'WiLoR remains on its lower-cadence correction schedule');
const blockedHybridAnchor = planLiveHandSourceFrame({
  mode: 'hybrid_mano',
  nowMs: 1_216,
  lastAnchorCaptureAtMs: 1_000,
  anchorIntervalMs: resolveLiveHandAnchorIntervalMs('hybrid_mano'),
  fastPathAvailable: true,
  fastPathInFlight: true,
  anchorInFlight: false,
});
assert(
  !blockedHybridAnchor.submitFastPath && !blockedHybridAnchor.submitAnchor,
  'a hybrid anchor waits for a frame admitted to MediaPipe so paired capture identity cannot lie',
);
const pureAnchor = planLiveHandSourceFrame({
  mode: 'pure_wilor',
  nowMs: 1_064,
  lastAnchorCaptureAtMs: 1_000,
  anchorIntervalMs: resolveLiveHandAnchorIntervalMs('pure_wilor'),
  fastPathAvailable: false,
  fastPathInFlight: false,
  anchorInFlight: false,
});
assert(!pureAnchor.submitFastPath && pureAnchor.submitAnchor, 'pure WiLoR remains independent of browser-landmarker availability');
assert(resolveLiveHandAnchorIntervalMs('pure_wilor') === 50, 'pure WiLoR preserves the current 20Hz request schedule');
assert(resolveLiveHandAnchorIntervalMs('hybrid_mano') === 200, 'hybrid MANO starts the correction assay at 5Hz');

const imageLandmarks = Array.from({ length: 21 }, (_, index) => ({ x: index / 20, y: 1 - index / 20, z: -index / 100 }));
const worldLandmarks = imageLandmarks.map(point => ({ x: point.x - 0.5, y: 0.5 - point.y, z: point.z }));
assert(
  String(LIVE_HAND_LANDMARKER_WORKER_ROUTE) === 'browser-mediapipe-hand-landmarker-worker-unmirrored-v2',
  'the worker route declares the shared unmirrored camera coordinate contract',
);
const landmarkerResult = normalizeLandmarkerWorkerResult({
  schema: LIVE_HAND_LANDMARKER_RESULT_SCHEMA,
  routeIdentity: 'browser-mediapipe-hand-landmarker-worker-unmirrored-v2',
  captureId: 'run-8-1000-1',
  captureTimestampMs: 1_000,
  publishedAtMs: 1_011,
  handedness: 'Right',
  confidence: 0.93,
  imageLandmarks,
  worldLandmarks,
  workerLandmarkerMs: 8.5,
  workerProcessingMs: 10.25,
  mirroredInput: false,
  worldCoordinateBasis: 'mediapipe-world-unmirrored-x-right-y-down-z-camera-depth-v1',
}, 'run-8-1000-1');
const fastPayload = createFastLandmarkPayload(landmarkerResult);
assert(fastPayload.schema === 'hand-state.browser-fast-landmarks.v1', 'emits the runtime v1 fast-landmark schema');
assert(
  fastPayload.captureId === 'run-8-1000-1' && fastPayload.frameId === 'fast:run-8-1000-1',
  'preserves shared capture identity while keeping fast and anchor frame ids independently attributable',
);
assert(
  (fastPayload.timing as Record<string, unknown>).browserLandmarkerMs === 8.5
    && (fastPayload.timing as Record<string, unknown>).browserWorkerProcessingMs === 10.25,
  'preserves worker inference and total processing timing',
);
assert(
  (fastPayload.timing as Record<string, unknown>).worldCoordinateBasis
    === 'mediapipe-world-unmirrored-x-right-y-down-z-camera-depth-v1',
  'preserves the exact MediaPipe world basis for runtime conversion',
);
assertThrows(
  () => normalizeLandmarkerWorkerResult({ ...landmarkerResult, captureId: 'wrong-capture' }, 'run-8-1000-1'),
  'does not match',
);

const landmarkerFailure = normalizeLandmarkerWorkerError({
  schema: LIVE_HAND_LANDMARKER_ERROR_SCHEMA,
  routeIdentity: 'browser-mediapipe-hand-landmarker-worker-unmirrored-v2',
  captureId: null,
  failurePhase: 'initialize_model',
  error: 'model fetch failed',
  primaryOutputWritten: false,
  lastTrustworthyEvidence: {
    tasksVisionModuleLoaded: true,
    wasmLoaded: true,
    modelLoaded: false,
  },
});
assert(landmarkerFailure.failurePhase === 'initialize_model', 'pre-output failure names its exact phase');
assert(!landmarkerFailure.primaryOutputWritten, 'pre-output failure cannot imply a landmark result');
assert(landmarkerFailure.lastTrustworthyEvidence.modelLoaded === false, 'failure preserves the last trustworthy initialization evidence');
assert(
  !shouldKeepHandPresentationPriority({ handStatePending: true, interpolationUnsettled: false }),
  'hand presentation priority clears once the received state has visibly converged',
);

const recordedSurface = normalizeManoSurface({ available: true, vertices, faces });
assert(recordedSurface.vertexCount === 778 && recordedSurface.faceCount === 1538, 'recorded fixture uses the real topology contract');
const objectVertices = vertices.map(([x, y, z]) => ({ x, y, z }));
const objectSurface = normalizeManoSurface({ available: true, vertices: objectVertices, faces });
assert(objectSurface.positions[0] < 0 && objectSurface.positions[3] > 0, 'accepts runtime object-form MANO vertices');

const state = {
  runtimeOwner: 'hand-state-runtime',
  eventSequence: 42,
  frame: {
    authority: { sourceAuthority: 'live_simulation', freshness: 'fresh' },
    source: {
      requestedRoute: LIVE_HAND_ROUTE,
      effectiveRoute: LIVE_HAND_ROUTE,
      model: 'WiLoR-MLX+HandDetector-MLX',
      deviceRoute: 'mlx',
      dtypeRoute: 'float16',
    },
    frame: { frameId: 'frame-42', captureTimestampMs: 1000 },
    timing: { modelLatencyMs: 61, cameraFrameAgeMs: 79 },
    hand: { confidence: 0.95, handedness: 'right', keypoints3d: Array.from({ length: 21 }, (_, index) => [index, index * 0.5, index * 0.1]) },
    mano: { available: true, vertexCount: 778, faceCount: 1538, vertices, faces },
    diagnostics: { burstMode: 'chunked', chunkSegments: 7, chunkYieldMs: 0.2 },
  },
};

const normalized = normalizeLiveManoFrame(state);
assert(normalized.vertexCount === 778, 'accepts complete MANO vertex payload');
assert(normalized.faceCount === 1538, 'accepts complete MANO topology');
assert(normalized.positions[0] < 0 && normalized.positions[3] > 0, 'preserves display x instead of mirroring it');
assert(normalized.positions[7] > normalized.positions[10], 'inverts camera y into display y');
assert(normalized.burstMode === 'chunked' && normalized.chunkSegments === 7, 'carries chunk identity with the frame');

const hybrid = normalizeLiveManoFrame({
  ...state,
  frame: {
    ...state.frame,
    source: {
      ...state.frame.source,
      effectiveRoute: LIVE_HAND_HYBRID_ROUTE,
      model: 'WiLoR-MLX+HandDetector-MLX anchor + browser MediaPipe landmarks',
      deviceRoute: 'mlx+browser',
      rawSchema: 'hand-state.browser-fast-landmarks.v1',
    },
    mano: { ...state.frame.mano, diagnostic: 'native_mano_regeneration' },
    diagnostics: {
      ...state.frame.diagnostics,
      fusionMode: 'wilor_anchor_mediapipe_mano_pose',
      geometryMode: 'native_mano_regeneration',
      anchorSource: LIVE_HAND_ROUTE,
      anchorCaptureId: 'run-8-1000-1',
      fastPathSource: 'browser_mediapipe_hand_landmarker_live',
      fallbackState: null,
      anchorAgeMs: 84,
      fastPathAgeMs: 12,
      fitResidualMean: 0.024,
      fitResidualMax: 0.041,
      calibrationDeterminant: 1,
      calibrationResidualMean: 0.004,
      calibrationResidualMax: 0.007,
      fastWorldBasisTransform: 'mediapipe_to_wilor_flip_z_v1',
      maxJointCorrectionRad: 0.18,
      maxAnchorJointDeviationRad: 0.42,
      jointStepIntervalMs: 16.667,
      jointStepLimitRad: 0.08,
      maxJointStepAppliedRad: 0.073,
    },
    timing: {
      ...state.frame.timing,
      fastPathLatencyMs: 8.5,
    },
  },
});
assert(hybrid.effectiveRoute === LIVE_HAND_HYBRID_ROUTE, 'accepts the explicit WiLoR-anchor/browser-fast hybrid route');
assert(
  LIVE_HAND_HYBRID_ROUTE === 'hand-state-runtime/hybrid-wilor-anchor-browser-fast-mano-v2',
  'the consumer accepts only the articulated MANO route',
);
assert(hybrid.fusionMode === 'wilor_anchor_mediapipe_mano_pose', 'preserves the parameter-space fusion mode');
assert(hybrid.geometryMode === 'native_mano_regeneration', 'requires native MANO surface regeneration');
assert(hybrid.anchorCaptureId === 'run-8-1000-1', 'preserves the exact paired WiLoR/MediaPipe capture identity');
assert(hybrid.fitResidualMean === 0.024, 'preserves the articulated fit residual');
assert(hybrid.calibrationDeterminant === 1, 'preserves the paired calibration orientation');
assert(hybrid.calibrationResidualMean === 0.004, 'preserves paired calibration quality');
assert(hybrid.fastWorldBasisTransform === 'mediapipe_to_wilor_flip_z_v1', 'preserves the explicit model basis transform');
assert(hybrid.fastPathLatencyMs === 8.5, 'preserves MediaPipe inference timing separately from WiLoR anchor timing');
assert(hybrid.maxAnchorJointDeviationRad === 0.42, 'preserves absolute anchor-relative joint authority');
assert(hybrid.jointStepIntervalMs === 16.667, 'preserves the observed fast-path correction interval');
assert(hybrid.jointStepLimitRad === 0.08, 'preserves the cadence-scaled correction limit');
assert(hybrid.maxJointStepAppliedRad === 0.073, 'preserves the correction actually applied to the visible mesh');
assert(hybrid.anchorSource === LIVE_HAND_ROUTE, 'preserves the WiLoR MANO anchor source');
assert(hybrid.fastPathSource === 'browser_mediapipe_hand_landmarker_live', 'preserves the browser fast-path source');

assertThrows(
  () => normalizeLiveManoFrame({
    ...state,
    frame: {
      ...state.frame,
      source: {
        ...state.frame.source,
        effectiveRoute: 'hand-state-runtime/hybrid-wilor-anchor-browser-fast-v0',
      },
      diagnostics: {
        ...state.frame.diagnostics,
        fusionMode: 'wilor_anchor_browser_fast_delta',
        fallbackState: null,
      },
    },
  }),
  'effective route',
);

assertThrows(
  () => normalizeLiveManoFrame({
    ...state,
    frame: { ...state.frame, source: { ...state.frame.source, effectiveRoute: 'browser_mediapipe_fallback' } },
  }),
  'effective route',
);
assertThrows(
  () => normalizeLiveManoFrame({
    ...state,
    frame: { ...state.frame, mano: { ...state.frame.mano, vertices: vertices.slice(0, 777), vertexCount: 777 } },
  }),
  '778 vertices',
);
assertThrows(
  () => normalizeLiveManoFrame({
    ...state,
    frame: { ...state.frame, authority: { sourceAuthority: 'recorded_fixture', freshness: 'fresh' } },
  }),
  'live authority',
);

const sample = {
  frameId: 'frame-42',
  runtimeOwner: 'hand-state-runtime',
  sourceAuthority: 'live_simulation',
  effectiveRoute: LIVE_HAND_ROUTE,
  manoVertexCount: 778,
  manoFaceCount: 1538,
  modelLatencyMs: 61,
  captureToWebglRenderReturnMs: 92,
  captureToRenderCompleteMs: 92,
  renderCompletionAuthority: 'webgl_render_call_complete_not_compositor_presented' as const,
};
const summary = summarizeLiveHandLatency([
  sample,
  {
    ...sample,
    frameId: 'frame-43',
    modelLatencyMs: 63,
    captureToWebglRenderReturnMs: 97,
    captureToRenderCompleteMs: 97,
  },
  {
    ...sample,
    frameId: 'frame-44',
    effectiveRoute: LIVE_HAND_HYBRID_ROUTE,
    modelLatencyMs: 70,
    captureToWebglRenderReturnMs: 110,
    captureToRenderCompleteMs: 110,
  },
]);
assert(summary.sampleCount === 3, 'counts live samples');
assert(summary.modelLatencyMs.p50 === 63, 'reports model p50');
assert(summary.captureToWebglRenderReturnMs.p95 === 110, 'reports capture-to-WebGL-return p95');

assertThrows(
  () => summarizeLiveHandLatency([{ ...sample, effectiveRoute: 'unknown' }]),
  'effective route',
);
assertThrows(
  () => summarizeLiveHandLatency([{ ...sample, captureToRenderCompleteMs: 93 }]),
  'preserve the WebGL render-return measurement',
);

console.log('live hand contracts ok');
