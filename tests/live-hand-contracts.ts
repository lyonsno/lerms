import {
  LIVE_HAND_HYBRID_ROUTE,
  LIVE_HAND_HYBRID_FALLBACK_ROUTE,
  LIVE_HAND_ROUTE,
  assertLiveRuntimeHealth,
  assertLiveRuntimeSidecarStatus,
  decideHeldHandSurface,
  normalizeLiveManoFrame,
  normalizeManoSurface,
  normalizeTransientHybridFallback,
  summarizeLiveHandLatency,
  transientHybridFallbackReason,
} from '../src/hand/live-hand-contract.js';
import {
  LIVE_HAND_CAPTURE_REPLY_DEADLINE_MS,
  LIVE_HAND_CAPTURE_WORKER_ROUTE,
  isCaptureRunCurrent,
  normalizeCaptureWorkerResult,
} from '../src/hand/live-hand-capture-contract.js';
import {
  LiveHandFastDeliveryMailbox,
  coalesceFastDeliveryLineage,
} from '../src/hand/live-hand-fast-delivery.js';
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
import { LiveHandSidecarReadinessCoordinator } from '../src/hand/live-hand-sidecar-readiness.js';

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

async function assertRejects(fn: () => Promise<void>, expectedMessage: string): Promise<void> {
  try {
    await fn();
  } catch (error) {
    assert(error instanceof Error, 'expected an Error');
    assert(error.message.includes(expectedMessage), `expected "${error.message}" to include "${expectedMessage}"`);
    return;
  }
  throw new Error(`expected promise to reject with "${expectedMessage}"`);
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
  runtimeRunId: 'runtime-run-1',
  emittedStateChronology: {
    path: '/tmp/runtime/emitted-state-chronology.jsonl',
    statusPath: '/tmp/runtime/emitted-state-chronology-status.json',
    queueDepth: 0,
    writtenCount: 12,
    lastWrittenSequence: 12,
    failure: null,
  },
};
const healthTruth = assertLiveRuntimeHealth(health);
assert(healthTruth.burstMode === 'chunked', 'preserves chunked route identity');
assert(healthTruth.chunkSegments === 7, 'preserves effective chunk segment count');
assert(healthTruth.chunkYieldMs === 0.2, 'preserves effective chunk yield');
assert(healthTruth.manoRegeneratorAvailable, 'preserves MANO regenerator availability');
assert(healthTruth.hybridGeometryMode === 'native_mano_regeneration', 'preserves effective hybrid geometry identity');
assert(healthTruth.runtimeRunId === 'runtime-run-1', 'preserves runtime-run chronology identity');
assert(
  healthTruth.emittedStateChronology.writtenCount === 12
    && healthTruth.emittedStateChronology.lastWrittenSequence === 12,
  'preserves emitted-state chronology progress',
);

assertThrows(
  () => assertLiveRuntimeHealth({ ...health, runtimeOwner: 'perceptasia' }),
  'runtime owner',
);
assertThrows(
  () => assertLiveRuntimeHealth({
    ...health,
    emittedStateChronology: {
      ...health.emittedStateChronology,
      failure: { failurePhase: 'append_emitted_state_chronology' },
    },
  }),
  'persistence failure',
);

const warmingSidecar = assertLiveRuntimeSidecarStatus({
  runtimeOwner: 'hand-state-runtime',
  running: true,
  modelReady: false,
  modelReadiness: 'warming',
  modelReadyAtMs: null,
  modelStartupMs: null,
  stopReason: null,
});
assert(warmingSidecar.modelReadiness === 'warming' && !warmingSidecar.modelReady, 'preserves model warmup truth');
const readySidecar = assertLiveRuntimeSidecarStatus({
  runtimeOwner: 'hand-state-runtime',
  running: true,
  modelReady: true,
  modelReadiness: 'ready',
  modelReadyAtMs: 1250,
  modelStartupMs: 250,
  stopReason: null,
});
assert(readySidecar.modelReady && readySidecar.modelStartupMs === 250, 'preserves loaded model timing');
assertThrows(
  () => assertLiveRuntimeSidecarStatus({
    runtimeOwner: 'hand-state-runtime',
    running: true,
    modelReady: false,
    modelReadiness: 'ready',
    modelReadyAtMs: null,
    modelStartupMs: null,
    stopReason: null,
  }),
  'ready sidecar',
);
assertThrows(
  () => assertLiveRuntimeSidecarStatus({
    runtimeOwner: 'hand-state-runtime',
    running: true,
    modelReady: true,
    modelReadiness: 'ready',
    modelReadyAtMs: null,
    modelStartupMs: null,
    stopReason: null,
  }),
  'readiness timing',
);

const stoppedSidecar = {
  runtimeOwner: 'hand-state-runtime',
  running: false,
  modelReady: false,
  modelReadiness: 'stopped',
  modelReadyAtMs: null,
  modelStartupMs: null,
  stopReason: 'already_stopped',
};
const failedSidecar = {
  ...stoppedSidecar,
  modelReadiness: 'failed_before_ready',
  stopReason: null,
};
const readySidecarStatus = {
  runtimeOwner: 'hand-state-runtime',
  running: true,
  modelReady: true,
  modelReadiness: 'ready',
  modelReadyAtMs: 1250,
  modelStartupMs: 250,
  stopReason: null,
};

function scriptedSidecarReadiness({
  statuses,
  starts,
  events,
}: {
  statuses: unknown[];
  starts: unknown[];
  events: string[];
}): LiveHandSidecarReadinessCoordinator {
  return new LiveHandSidecarReadinessCoordinator({
    status: async () => {
      events.push('status');
      const value = statuses.shift();
      assert(value, 'scripted sidecar status exhausted');
      return value;
    },
    start: async () => {
      events.push('start');
      const value = starts.shift();
      assert(value, 'scripted sidecar start exhausted');
      return value;
    },
    wait: async () => {
      events.push('wait');
    },
  });
}

const staleEvents: string[] = [];
const staleCoordinator = scriptedSidecarReadiness({
  statuses: [
    stoppedSidecar,
    readySidecarStatus,
    stoppedSidecar,
    stoppedSidecar,
    readySidecarStatus,
    readySidecarStatus,
  ],
  starts: [readySidecarStatus, readySidecarStatus],
  events: staleEvents,
});
await staleCoordinator.ensureCurrentReady();
await Promise.all([
  staleCoordinator.ensureCurrentReady(),
  staleCoordinator.ensureCurrentReady(),
]);
assert(
  staleEvents.filter(event => event === 'start').length === 2,
  'resolved prewarm is not durable authority and concurrent stale callers share one replacement start',
);

let rejectedCameraCalls = 0;
const rejectedCoordinator = scriptedSidecarReadiness({
  statuses: [stoppedSidecar, failedSidecar],
  starts: [readySidecarStatus],
  events: [],
});
await assertRejects(async () => {
  await rejectedCoordinator.ensureCurrentReady();
  rejectedCameraCalls += 1;
}, 'not currently model-ready');
assert(rejectedCameraCalls === 0, 'second non-ready status rejects before camera admission');

const admittedEvents: string[] = [];
let admittedCameraCalls = 0;
const admittedCoordinator = scriptedSidecarReadiness({
  statuses: [stoppedSidecar, readySidecarStatus, readySidecarStatus],
  starts: [warmingSidecar],
  events: admittedEvents,
});
await admittedCoordinator.ensureCurrentReady();
admittedEvents.push('camera');
admittedCameraCalls += 1;
assert(admittedCameraCalls === 1, 'current ready truth admits camera exactly once');
assert(
  admittedEvents.join(',') === 'status,start,wait,status,status,camera',
  'camera admission occurs only after replacement warmup and current ready revalidation',
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
receiptJoiner.resolveWithoutPresentation('known-fast-fallback');
assert(
  receiptJoiner.snapshot().resolvedWithoutPresentationCount === 1,
  'a known fallback closes capture accounting without pretending it rendered',
);

const mailboxStarts: string[] = [];
const mailboxSupersessions: string[] = [];
let releaseFirstMailboxDelivery!: () => void;
const firstMailboxDelivery = new Promise<void>(resolve => {
  releaseFirstMailboxDelivery = resolve;
});
const mailbox = new LiveHandFastDeliveryMailbox<{ captureId: string }>(
  async item => {
    mailboxStarts.push(item.captureId);
    if (item.captureId === 'fast-a') await firstMailboxDelivery;
  },
  supersession => {
    mailboxSupersessions.push(
      `${supersession.superseded.captureId}->${supersession.replacement.captureId}:${supersession.reason}`,
    );
  },
  errorItem => {
    throw new Error(`unexpected mailbox failure for ${errorItem.captureId}`);
  },
);
mailbox.enqueue({ captureId: 'fast-a' });
mailbox.enqueue({ captureId: 'fast-b' });
mailbox.enqueue({ captureId: 'fast-c' });
assert(
  mailbox.snapshot().activeCaptureId === 'fast-a' && mailbox.snapshot().pendingCaptureId === 'fast-c',
  'one active delivery retains only the latest pending observation',
);
assert(
  mailboxSupersessions[0] === 'fast-b->fast-c:newer_fast_observation_before_post',
  'replacing pending work records exact superseded and replacement capture ids',
);
releaseFirstMailboxDelivery();
await mailbox.whenIdle();
assert(mailboxStarts.join(',') === 'fast-a,fast-c', 'obsolete pending work never enters runtime delivery');
assert(
  mailbox.snapshot().completedCount === 2 && mailbox.snapshot().supersededBeforePostCount === 1,
  'mailbox completion and supersession accounting close exactly',
);

const protectedStarts: string[] = [];
const protectedSupersessions: string[] = [];
const protectedReleases = new Map<string, () => void>();
const protectedMailbox = new LiveHandFastDeliveryMailbox<{
  captureId: string;
  anchorPairRequired?: boolean;
}>(
  item => new Promise<void>(resolve => {
    protectedStarts.push(item.captureId);
    protectedReleases.set(item.captureId, resolve);
  }),
  supersession => {
    protectedSupersessions.push(
      `${supersession.superseded.captureId}->${supersession.replacement.captureId}`,
    );
  },
  errorItem => {
    throw new Error(`unexpected protected mailbox failure for ${errorItem.captureId}`);
  },
);
protectedMailbox.enqueue({ captureId: 'active-fast' });
protectedMailbox.enqueue({ captureId: 'anchor-pair', anchorPairRequired: true });
protectedMailbox.enqueue({ captureId: 'ordinary-c' });
protectedMailbox.enqueue({ captureId: 'ordinary-d' });
const protectedQueuedSnapshot = protectedMailbox.snapshot() as ReturnType<
  typeof protectedMailbox.snapshot
> & { trailingCaptureId: string | null };
assert(
  protectedQueuedSnapshot.activeCaptureId === 'active-fast'
    && protectedQueuedSnapshot.pendingCaptureId === 'anchor-pair'
    && protectedQueuedSnapshot.trailingCaptureId === 'ordinary-d',
  'an anchor-pair observation remains next while ordinary observations coalesce behind it',
);
assert(
  protectedSupersessions.join(',') === 'ordinary-c->ordinary-d',
  'coalescing behind a protected anchor pair attributes only observations that are actually discarded',
);
protectedReleases.get('active-fast')?.();
await new Promise(resolve => setTimeout(resolve, 0));
assert(
  protectedStarts.join(',') === 'active-fast,anchor-pair',
  'the protected anchor pair enters runtime delivery before the latest ordinary observation',
);
protectedReleases.get('anchor-pair')?.();
await new Promise(resolve => setTimeout(resolve, 0));
assert(
  protectedStarts.join(',') === 'active-fast,anchor-pair,ordinary-d',
  'the latest ordinary observation follows the protected anchor pair without growing an unbounded queue',
);
protectedReleases.get('ordinary-d')?.();
await protectedMailbox.whenIdle();
assert(
  protectedMailbox.snapshot().completedCount === 3
    && protectedMailbox.snapshot().supersededBeforePostCount === 1,
  'protected pair delivery and ordinary coalescing close with exact accounting',
);

const firstLineage = coalesceFastDeliveryLineage([], 'fast-b', 'fast-c');
const transitiveLineage = coalesceFastDeliveryLineage(firstLineage, 'fast-c', 'fast-d');
assert(
  transitiveLineage.map(row => `${row.captureId}->${row.replacementCaptureId}`).join(',')
    === 'fast-b->fast-d,fast-c->fast-d',
  'transitive coalescing attributes every unposted observation to the state that actually reaches runtime',
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

const hybridState = {
  ...state,
  frame: {
    ...state.frame,
    frame: {
      ...state.frame.frame,
      frameId: 'fast:run-8-1099-4',
      captureTimestampMs: 1_099,
    },
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
      pendingAnchorCaptureId: null,
      pendingAnchorAgeMs: null,
      pendingAnchorState: 'none',
      pendingAnchorError: null,
      fastPathAgeMs: 12,
      fitResidualMean: 0.024,
      fitResidualMax: 0.041,
      baselineResidualMean: 0.032,
      calibrationDeterminant: 1,
      calibrationResidualMean: 0.004,
      calibrationResidualMax: 0.007,
      fastWorldBasisTransform: 'mediapipe_to_wilor_flip_z_v1',
      maxJointCorrectionRad: 0.18,
      maxAnchorJointDeviationRad: 0.42,
      jointStepIntervalMs: 16.667,
      jointStepLimitRad: 0.08,
      maxJointStepAppliedRad: 0.073,
      jointStepPolicy: 'adaptive_confidence_residual_anchor_v2',
      jointStepSpeedRadS: 4.8,
      jointStepBaseLimitRad: 0.04,
      adaptiveStepQuality: 1 / 3,
      idealFitResidualMean: 0.018,
      idealFitImprovementRatio: 0.4375,
      palmSolverMode: 'robust_palm_procrustes_v2',
      palmSolverConsensusMode: 'fixed_radius_v1',
      palmSolverResidualMean: 0.003,
      palmSolverInlierFraction: 1,
      poseSolverMode: 'chain_coupled_anatomical_v1',
      poseSolverIterations: 3,
      poseSolverDofCount: 20,
      poseSolverObjectiveInitial: 0.0018,
      poseSolverObjectiveFinal: 0.0007,
      poseSolverRobustInlierFraction: 0.8,
      poseSolverConstraintSaturation: 0.1,
      poseSolverDistalCouplingResidualRad: 0.12,
      anchorReplay: {
        mode: 'capture_time_fast_observation_replay_v1',
        anchorCaptureTimestampMs: 1_000,
        observationCount: 2,
        acceptedCount: 2,
        lastAcceptedCaptureTimestampMs: 1_066,
        failure: null,
      },
      fingerExtension: {
        target: { thumb: 0.72, index: 1, middle: 0.93, ring: 0.88, pinky: 0.81 },
        output: { thumb: 0.68, index: 0.97, middle: 0.9, ring: 0.85, pinky: 0.79 },
      },
    },
    timing: {
      ...state.frame.timing,
      fastPathLatencyMs: 8.5,
    },
  },
};
const hybrid = normalizeLiveManoFrame(hybridState);
assert(hybrid.effectiveRoute === LIVE_HAND_HYBRID_ROUTE, 'accepts the explicit WiLoR-anchor/browser-fast hybrid route');
assert(
  LIVE_HAND_HYBRID_ROUTE === 'hand-state-runtime/hybrid-wilor-anchor-browser-fast-mano-v2',
  'the consumer accepts only the articulated MANO route',
);
assert(hybrid.fusionMode === 'wilor_anchor_mediapipe_mano_pose', 'preserves the parameter-space fusion mode');
assert(hybrid.geometryMode === 'native_mano_regeneration', 'requires native MANO surface regeneration');
assert(hybrid.anchorCaptureId === 'run-8-1000-1', 'preserves the exact paired WiLoR/MediaPipe capture identity');
assert(hybrid.fitResidualMean === 0.024, 'preserves the articulated fit residual');
assert(hybrid.baselineResidualMean === 0.032, 'preserves the uncorrected anchor residual');
assert(hybrid.calibrationDeterminant === 1, 'preserves the paired calibration orientation');
assert(hybrid.calibrationResidualMean === 0.004, 'preserves paired calibration quality');
assert(hybrid.fastWorldBasisTransform === 'mediapipe_to_wilor_flip_z_v1', 'preserves the explicit model basis transform');
assert(hybrid.fastPathLatencyMs === 8.5, 'preserves MediaPipe inference timing separately from WiLoR anchor timing');
assert(hybrid.maxAnchorJointDeviationRad === 0.42, 'preserves absolute anchor-relative joint authority');
assert(hybrid.jointStepIntervalMs === 16.667, 'preserves the observed fast-path correction interval');
assert(hybrid.jointStepLimitRad === 0.08, 'preserves the cadence-scaled correction limit');
assert(hybrid.maxJointStepAppliedRad === 0.073, 'preserves the correction actually applied to the visible mesh');
assert(
  hybrid.jointStepPolicy === 'adaptive_confidence_residual_anchor_v2',
  'preserves the effective articulated debt policy',
);
assert(hybrid.jointStepSpeedRadS === 4.8, 'preserves the effective adaptive correction speed');
assert(hybrid.jointStepBaseLimitRad === 0.04, 'preserves the fixed-speed counterfactual step');
assert(hybrid.adaptiveStepQuality === 1 / 3, 'preserves the adaptive trust score');
assert(hybrid.idealFitResidualMean === 0.018, 'preserves the trust-bounded ideal fit residual');
assert(hybrid.idealFitImprovementRatio === 0.4375, 'preserves ideal improvement over the anchor');
assert(hybrid.palmSolverMode === 'robust_palm_procrustes_v2', 'preserves robust palm solver identity');
assert(hybrid.palmSolverConsensusMode === 'fixed_radius_v1', 'preserves palm consensus provenance');
assert(hybrid.palmSolverInlierFraction === 1, 'preserves robust palm inlier truth');
assertThrows(
  () => normalizeLiveManoFrame({
    ...hybridState,
    frame: {
      ...hybridState.frame,
      diagnostics: {
        ...hybridState.frame.diagnostics,
        palmSolverConsensusMode: 'unbounded_best_effort',
      },
    },
  }),
  'unsupported palmSolverConsensusMode: unbounded_best_effort',
);
const boundedPalmConsensus = normalizeLiveManoFrame({
  ...hybridState,
  frame: {
    ...hybridState.frame,
    diagnostics: {
      ...hybridState.frame.diagnostics,
      palmSolverConsensusMode: 'bounded_trimmed_v1',
    },
  },
});
assert(
  boundedPalmConsensus.palmSolverConsensusMode === 'bounded_trimmed_v1',
  'accepts and preserves bounded cross-model palm consensus provenance',
);
assert(hybrid.poseSolverMode === 'chain_coupled_anatomical_v1', 'preserves chain-coupled pose solver identity');
assert(hybrid.poseSolverDofCount === 20, 'preserves reduced anatomical coordinate count');
assert(hybrid.poseSolverIterations === 3, 'preserves pose solve iteration count');
assert(
  hybrid.poseSolverObjectiveFinal === 0.0007
    && hybrid.poseSolverObjectiveFinal <= hybrid.poseSolverObjectiveInitial!,
  'preserves monotonic pose objective truth',
);
assert(hybrid.poseSolverConstraintSaturation === 0.1, 'preserves anatomical bound saturation');
assert(
  hybrid.poseSolverDistalCouplingResidualRad === 0.12,
  'preserves distal-chain coupling residual',
);
assert(
  hybrid.anchorReplay?.mode === 'capture_time_fast_observation_replay_v1'
    && hybrid.anchorReplay.observationCount === 2
    && hybrid.anchorReplay.acceptedCount === 2
    && hybrid.anchorReplay.lastAcceptedCaptureTimestampMs === 1_066,
  'preserves delayed-anchor replay identity and chronological accounting',
);
assert(
  hybrid.fingerExtension?.target.index === 1
    && hybrid.fingerExtension.output.index === 0.97,
  'preserves target-versus-output finger extension without hiding index loss',
);
assertThrows(
  () => normalizeLiveManoFrame({
    ...hybridState,
    frame: {
      ...hybridState.frame,
      diagnostics: {
        ...hybridState.frame.diagnostics,
        anchorReplay: {
          ...hybridState.frame.diagnostics.anchorReplay,
          lastAcceptedCaptureTimestampMs: 1_100,
        },
      },
    },
  }),
  'anchor replay chronology exceeds visible frame capture',
);
assert(hybrid.anchorSource === LIVE_HAND_ROUTE, 'preserves the WiLoR MANO anchor source');
assert(hybrid.fastPathSource === 'browser_mediapipe_hand_landmarker_live', 'preserves the browser fast-path source');
assert(hybrid.pendingAnchorState === 'none', 'preserves the absence of a staged successor anchor');

const stagedAnchorHybrid = normalizeLiveManoFrame({
  ...hybridState,
  frame: {
    ...hybridState.frame,
    diagnostics: {
      ...hybridState.frame.diagnostics,
      pendingAnchorCaptureId: 'run-8-1084-4',
      pendingAnchorAgeMs: 18,
      pendingAnchorState: 'awaiting_fast_pair',
      pendingAnchorError: null,
    },
  },
});
assert(
  stagedAnchorHybrid.anchorCaptureId === 'run-8-1000-1'
    && stagedAnchorHybrid.pendingAnchorCaptureId === 'run-8-1084-4'
    && stagedAnchorHybrid.pendingAnchorAgeMs === 18
    && stagedAnchorHybrid.pendingAnchorState === 'awaiting_fast_pair',
  'distinguishes the active trustworthy anchor from a successor awaiting its exact fast pair',
);
const calibratingAnchorHybrid = normalizeLiveManoFrame({
  ...hybridState,
  frame: {
    ...hybridState.frame,
    diagnostics: {
      ...hybridState.frame.diagnostics,
      pendingAnchorCaptureId: 'run-8-1084-4',
      pendingAnchorAgeMs: 22,
      pendingAnchorState: 'calibrating_off_presentation_lock',
      pendingAnchorError: null,
    },
  },
});
assert(
  calibratingAnchorHybrid.pendingAnchorCaptureId === 'run-8-1084-4'
    && calibratingAnchorHybrid.pendingAnchorAgeMs === 22
    && calibratingAnchorHybrid.pendingAnchorState === 'calibrating_off_presentation_lock',
  'preserves a successor calibrating while the prior follower remains presentable',
);
assertThrows(
  () => normalizeLiveManoFrame({
    ...hybridState,
    frame: {
      ...hybridState.frame,
      diagnostics: {
        ...hybridState.frame.diagnostics,
        pendingAnchorCaptureId: 'run-8-1084-4',
        pendingAnchorAgeMs: 18,
        pendingAnchorState: 'none',
      },
    },
  }),
  'inactive pending anchor must not carry staged-anchor diagnostics',
);

const transientFallbackState = {
  ...hybridState,
  status: 'fallback',
  frame: {
    ...hybridState.frame,
    source: {
      ...hybridState.frame.source,
      effectiveRoute: LIVE_HAND_HYBRID_FALLBACK_ROUTE,
      backend: 'hybrid',
    },
    diagnostics: {
      ...hybridState.frame.diagnostics,
      fallbackState: 'reanchor_step_trust_conflict',
    },
  },
};
assert(
  transientHybridFallbackReason(transientFallbackState) === 'reanchor_step_trust_conflict',
  'admits a source-identifiable transient hybrid fallback for stale-surface presentation',
);
const failedPendingFallback = normalizeTransientHybridFallback({
  ...transientFallbackState,
  frame: {
    ...transientFallbackState.frame,
    diagnostics: {
      ...transientFallbackState.frame.diagnostics,
      pendingAnchorCaptureId: 'run-8-1084-4',
      pendingAnchorAgeMs: 31,
      pendingAnchorState: 'calibration_failed',
      pendingAnchorError: 'paired palm calibration is reflected',
    },
  },
});
assert(
  failedPendingFallback?.reason === 'reanchor_step_trust_conflict'
    && failedPendingFallback.pendingAnchor.captureId === 'run-8-1084-4'
    && failedPendingFallback.pendingAnchor.ageMs === 31
    && failedPendingFallback.pendingAnchor.state === 'calibration_failed'
    && failedPendingFallback.pendingAnchor.error === 'paired palm calibration is reflected',
  'preserves validated pending-anchor failure truth through a held hybrid fallback',
);
const calibratingPendingFallback = normalizeTransientHybridFallback({
  ...transientFallbackState,
  frame: {
    ...transientFallbackState.frame,
    diagnostics: {
      ...transientFallbackState.frame.diagnostics,
      fallbackState: 'stale_wilor_anchor',
      pendingAnchorCaptureId: 'run-8-1084-4',
      pendingAnchorAgeMs: 27,
      pendingAnchorState: 'calibrating_off_presentation_lock',
      pendingAnchorError: null,
    },
  },
});
assert(
  calibratingPendingFallback?.reason === 'stale_wilor_anchor'
    && calibratingPendingFallback.pendingAnchor.captureId === 'run-8-1084-4'
    && calibratingPendingFallback.pendingAnchor.state
      === 'calibrating_off_presentation_lock',
  'preserves calibrating pending-anchor identity through the bounded stale hold',
);
assert(
  transientHybridFallbackReason({
    ...transientFallbackState,
    frame: {
      ...transientFallbackState.frame,
      diagnostics: {
        ...transientFallbackState.frame.diagnostics,
        pendingAnchorCaptureId: 'run-8-1084-4',
        pendingAnchorAgeMs: 18,
        pendingAnchorState: 'none',
        pendingAnchorError: null,
      },
    },
  }) === null,
  'rejects a held fallback whose pending-anchor identity contradicts its declared state',
);
assert(
  transientHybridFallbackReason({
    ...transientFallbackState,
    frame: {
      ...transientFallbackState.frame,
      diagnostics: {
        ...transientFallbackState.frame.diagnostics,
        fallbackState: 'stale_wilor_anchor',
      },
    },
  }) === 'stale_wilor_anchor',
  'stale WiLoR authority may preserve only explicitly bounded stale presentation truth',
);
assert(
  transientHybridFallbackReason({
    ...transientFallbackState,
    frame: {
      ...transientFallbackState.frame,
      diagnostics: {
        ...transientFallbackState.frame.diagnostics,
        fallbackState: 'handedness_discontinuity',
      },
    },
  }) === null,
  'handedness discontinuity invalidates identity and cannot preserve the prior surface',
);
assert(
  transientHybridFallbackReason({
    ...transientFallbackState,
    frame: {
      ...transientFallbackState.frame,
      source: {
        ...transientFallbackState.frame.source,
        effectiveRoute: 'browser_mediapipe_fallback',
      },
    },
  }) === null,
  'a fallback without exact hybrid route identity cannot preserve prior presentation',
);
const heldSurface = decideHeldHandSurface({
  hasVisibleSurface: true,
  lastTrustworthyAtMs: 500,
  nowMs: 1000,
  maxAgeMs: 750,
});
assert(heldSurface.hold && heldSurface.ageMs === 500, 'holds a visible trustworthy surface inside its freshness horizon');
assert(
  !decideHeldHandSurface({
    hasVisibleSurface: true,
    lastTrustworthyAtMs: 500,
    nowMs: 1251,
    maxAgeMs: 750,
  }).hold,
  'expires held geometry immediately beyond the existing freshness horizon',
);
assert(
  !decideHeldHandSurface({
    hasVisibleSurface: false,
    lastTrustworthyAtMs: 500,
    nowMs: 600,
    maxAgeMs: 750,
  }).hold,
  'never invents a stale surface when no trustworthy surface is visible',
);
assert(
  !decideHeldHandSurface({
    hasVisibleSurface: true,
    lastTrustworthyAtMs: 500,
    nowMs: 651,
    maxAgeMs: 750,
    fallbackReason: 'stale_wilor_anchor',
  } as Parameters<typeof decideHeldHandSurface>[0]).hold,
  'stale-anchor presentation expires after its 150ms continuity bridge instead of inheriting the general 750ms hold',
);
assert(
  decideHeldHandSurface({
    hasVisibleSurface: true,
    lastTrustworthyAtMs: 500,
    nowMs: 650,
    maxAgeMs: 750,
    fallbackReason: 'stale_wilor_anchor',
  } as Parameters<typeof decideHeldHandSurface>[0]).hold,
  'stale-anchor presentation may bridge exactly 150ms while route truth and fluid authority remain invalid',
);

assertThrows(
  () => normalizeLiveManoFrame({
    ...hybridState,
    frame: {
      ...hybridState.frame,
      diagnostics: {
        ...hybridState.frame.diagnostics,
        jointStepPolicy: 'fixed_speed',
      },
    },
  }),
  'fixed-speed settling frame carries adaptive correction authority',
);
assertThrows(
  () => normalizeLiveManoFrame({
    ...hybridState,
    frame: {
      ...hybridState.frame,
      diagnostics: {
        ...hybridState.frame.diagnostics,
        jointStepSpeedRadS: 10,
      },
    },
  }),
  'adaptive joint correction policy exceeds its declared bounds',
);
assertThrows(
  () => normalizeLiveManoFrame({
    ...hybridState,
    frame: {
      ...hybridState.frame,
      diagnostics: {
        ...hybridState.frame.diagnostics,
        jointStepBaseLimitRad: 0.09,
      },
    },
  }),
  'adaptive joint correction limit is below its fixed-speed counterfactual',
);
assertThrows(
  () => normalizeLiveManoFrame({
    ...hybridState,
    frame: {
      ...hybridState.frame,
      diagnostics: {
        ...hybridState.frame.diagnostics,
        poseSolverMode: 'independent_bone_swings',
      },
    },
  }),
  'hybrid frame must expose the chain-coupled anatomical pose solver',
);
assertThrows(
  () => normalizeLiveManoFrame({
    ...hybridState,
    frame: {
      ...hybridState.frame,
      diagnostics: {
        ...hybridState.frame.diagnostics,
        poseSolverObjectiveFinal: 0.002,
      },
    },
  }),
  'pose solver final objective exceeds its initial objective',
);

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
