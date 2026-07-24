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
};
const healthTruth = assertLiveRuntimeHealth(health);
assert(healthTruth.burstMode === 'chunked', 'preserves chunked route identity');
assert(healthTruth.chunkSegments === 7, 'preserves effective chunk segment count');
assert(healthTruth.chunkYieldMs === 0.2, 'preserves effective chunk yield');

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
    },
    diagnostics: {
      ...state.frame.diagnostics,
      fusionMode: 'wilor_anchor_browser_fast_delta',
      anchorSource: LIVE_HAND_ROUTE,
      fastPathSource: 'browser_mediapipe_hand_landmarker_live',
      fallbackState: null,
      anchorAgeMs: 84,
      fastPathAgeMs: 12,
      residualMean: 0.024,
    },
  },
});
assert(hybrid.effectiveRoute === LIVE_HAND_HYBRID_ROUTE, 'accepts the explicit WiLoR-anchor/browser-fast hybrid route');
assert(hybrid.fusionMode === 'wilor_anchor_browser_fast_delta', 'preserves the effective fusion mode');
assert(hybrid.anchorSource === LIVE_HAND_ROUTE, 'preserves the WiLoR MANO anchor source');
assert(hybrid.fastPathSource === 'browser_mediapipe_hand_landmarker_live', 'preserves the browser fast-path source');

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
};
const summary = summarizeLiveHandLatency([
  sample,
  { ...sample, frameId: 'frame-43', modelLatencyMs: 63, captureToWebglRenderReturnMs: 97 },
  { ...sample, frameId: 'frame-44', effectiveRoute: LIVE_HAND_HYBRID_ROUTE, modelLatencyMs: 70, captureToWebglRenderReturnMs: 110 },
]);
assert(summary.sampleCount === 3, 'counts live samples');
assert(summary.modelLatencyMs.p50 === 63, 'reports model p50');
assert(summary.captureToWebglRenderReturnMs.p95 === 110, 'reports capture-to-WebGL-return p95');

assertThrows(
  () => summarizeLiveHandLatency([{ ...sample, effectiveRoute: 'unknown' }]),
  'effective route',
);

console.log('live hand contracts ok');
