export const LIVE_HAND_ROUTE = 'native_wilor_mini_mlx_detector_sidecar_live' as const;
export const LIVE_HAND_HYBRID_ROUTE = 'hand-state-runtime/hybrid-wilor-anchor-browser-fast-mano-v2' as const;
export const LIVE_HAND_HYBRID_FALLBACK_ROUTE = 'hand-state-runtime/hybrid-wilor-anchor-browser-fast-mano/fallback' as const;
export const LIVE_HAND_FAST_PATH_SOURCE = 'browser_mediapipe_hand_landmarker_live' as const;
export const LIVE_HAND_HYBRID_FUSION_MODE = 'wilor_anchor_mediapipe_mano_pose' as const;
export const LIVE_HAND_HYBRID_GEOMETRY_MODE = 'native_mano_regeneration' as const;
export const LIVE_HAND_FAST_LANDMARK_SCHEMA = 'hand-state.browser-fast-landmarks.v1' as const;
export const LIVE_HAND_RUNTIME_OWNER = 'hand-state-runtime' as const;
export const MANO_VERTEX_COUNT = 778 as const;
export const MANO_FACE_COUNT = 1538 as const;
export const MANO_DISPLAY_ORIENTATION = 'camera-mirrored-input-x-preserved-y-inverted-v1' as const;

export interface RuntimeRouteTruth {
  runtimeOwner: typeof LIVE_HAND_RUNTIME_OWNER;
  burstMode: 'monolithic' | 'chunked';
  chunkSegments: number;
  chunkYieldMs: number;
}

export interface RuntimeHealthTruth extends RuntimeRouteTruth {
  manoRegeneratorAvailable: boolean;
  hybridGeometryMode: string;
  runtimeRunId: string;
  emittedStateChronology: {
    path: string;
    statusPath: string;
    queueDepth: number;
    writtenCount: number;
    lastWrittenSequence: number | null;
    failure: null;
  };
}

export type RuntimeSidecarModelReadiness = 'warming' | 'ready' | 'failed_before_ready' | 'stopped';

export interface RuntimeSidecarStatusTruth {
  runtimeOwner: typeof LIVE_HAND_RUNTIME_OWNER;
  running: boolean;
  modelReady: boolean;
  modelReadiness: RuntimeSidecarModelReadiness;
  modelReadyAtMs: number | null;
  modelStartupMs: number | null;
  stopReason: string | null;
}

export type LiveHandFinger = 'thumb' | 'index' | 'middle' | 'ring' | 'pinky';

export type FingerExtensionTruth = Record<LiveHandFinger, number>;

export interface AnchorReplayTruth {
  mode: 'capture_time_fast_observation_replay_v1';
  anchorCaptureTimestampMs: number;
  observationCount: number;
  acceptedCount: number;
  lastAcceptedCaptureTimestampMs: number;
  candidateLastAcceptedCaptureTimestampMs: number | null;
  promotionCatchUpMode: 'accepted_pose_state_transplant_v1' | null;
  promotionCatchUpCaptureTimestampMs: number | null;
  failure: null;
}

export interface NormalizedManoFrame extends RuntimeRouteTruth {
  eventSequence: number;
  frameId: string;
  captureTimestampMs: number;
  requestedRoute: string;
  effectiveRoute: LiveHandEffectiveRoute;
  model: string;
  deviceRoute: string;
  dtypeRoute: string;
  handedness: string;
  confidence: number;
  keypoints3d: readonly (readonly [number, number, number])[];
  modelLatencyMs: number;
  captureToSidecarPublishMs: number;
  positions: Float32Array;
  indices: Uint32Array;
  vertexCount: typeof MANO_VERTEX_COUNT;
  faceCount: typeof MANO_FACE_COUNT;
  manoTransform: ManoDisplayTransform;
  orientationContract: typeof MANO_DISPLAY_ORIENTATION;
  fusionMode: string | null;
  geometryMode: string | null;
  anchorSource: string | null;
  anchorCaptureId: string | null;
  anchorAgeMs: number | null;
  pendingAnchorCaptureId: string | null;
  pendingAnchorAgeMs: number | null;
  pendingAnchorState:
    | 'none'
    | 'awaiting_fast_pair'
    | 'calibrating_off_presentation_lock'
    | 'calibration_failed';
  pendingAnchorError: string | null;
  fastPathSource: string | null;
  fastPathAgeMs: number | null;
  fastPathLatencyMs: number | null;
  fitResidualMean: number | null;
  fitResidualMax: number | null;
  baselineResidualMean: number | null;
  calibrationDeterminant: number | null;
  calibrationResidualMean: number | null;
  calibrationResidualMax: number | null;
  fastWorldBasisTransform: string | null;
  maxJointCorrectionRad: number | null;
  maxAnchorJointDeviationRad: number | null;
  jointStepIntervalMs: number | null;
  jointStepLimitRad: number | null;
  maxJointStepAppliedRad: number | null;
  jointStepPolicy: 'fixed_speed' | 'adaptive_confidence_residual_anchor_v2' | null;
  jointStepSpeedRadS: number | null;
  jointStepBaseLimitRad: number | null;
  adaptiveStepQuality: number | null;
  idealFitResidualMean: number | null;
  idealFitImprovementRatio: number | null;
  palmSolverMode: 'robust_palm_procrustes_v2' | null;
  palmSolverConsensusMode: 'fixed_radius_v1' | 'bounded_trimmed_v1' | null;
  palmSolverResidualMean: number | null;
  palmSolverInlierFraction: number | null;
  poseSolverMode: 'chain_coupled_anatomical_v1' | null;
  poseSolverIterations: number | null;
  poseSolverDofCount: number | null;
  poseSolverObjectiveInitial: number | null;
  poseSolverObjectiveFinal: number | null;
  poseSolverRobustInlierFraction: number | null;
  poseSolverConstraintSaturation: number | null;
  poseSolverDistalCouplingResidualRad: number | null;
  anchorReplay: AnchorReplayTruth | null;
  fingerExtension: {
    target: FingerExtensionTruth;
    output: FingerExtensionTruth;
  } | null;
}

export interface ManoDisplayTransform {
  center: readonly [number, number, number];
  scale: number;
}

export interface NormalizedManoSurface {
  positions: Float32Array;
  indices: Uint32Array;
  vertexCount: typeof MANO_VERTEX_COUNT;
  faceCount: typeof MANO_FACE_COUNT;
  manoTransform: ManoDisplayTransform;
  orientationContract: typeof MANO_DISPLAY_ORIENTATION;
}

export interface LiveHandLatencySample {
  frameId: string;
  runtimeOwner: string;
  sourceAuthority: string;
  effectiveRoute: string;
  manoVertexCount: number;
  manoFaceCount: number;
  modelLatencyMs: number;
  captureToWebglRenderReturnMs: number;
  captureToRenderCompleteMs: number;
  renderCompletionAuthority: 'webgl_render_call_complete_not_compositor_presented';
}

export interface Distribution {
  min: number;
  mean: number;
  p50: number;
  p90: number;
  p95: number;
  p99: number;
  max: number;
}

export interface LiveHandLatencySummary {
  schema: 'lerms.live-hand-latency-summary.v0';
  sampleCount: number;
  effectiveRoute: LiveHandEffectiveRoute | 'mixed_live_hand_routes';
  manoVertexCount: typeof MANO_VERTEX_COUNT;
  manoFaceCount: typeof MANO_FACE_COUNT;
  modelLatencyMs: Distribution;
  captureToWebglRenderReturnMs: Distribution;
}

export type LiveHandEffectiveRoute = typeof LIVE_HAND_ROUTE | typeof LIVE_HAND_HYBRID_ROUTE;

type RecordLike = Record<string, unknown>;

const TRANSIENT_HYBRID_FALLBACK_REASONS = new Set([
  'stale_fast_landmarks',
  'low_fast_path_confidence',
  'reanchor_step_trust_conflict',
  'articulated_pose_fit_failed',
  'articulated_fit_residual_too_large',
  'stale_wilor_anchor',
]);
export const STALE_WILOR_PRESENTATION_HOLD_MS = 150;

export interface HeldHandSurfaceDecision {
  hold: boolean;
  ageMs: number;
  maxAgeMs: number;
}

export interface PendingAnchorTruth {
  captureId: string | null;
  ageMs: number | null;
  state: NormalizedManoFrame['pendingAnchorState'];
  error: string | null;
}

export interface TransientHybridFallbackTruth {
  reason: string;
  pendingAnchor: PendingAnchorTruth;
}

function normalizePendingAnchorTruth(diagnostics: RecordLike): PendingAnchorTruth {
  const rawState = text(diagnostics.pendingAnchorState, 'pendingAnchorState');
  if (
    rawState !== 'none'
    && rawState !== 'awaiting_fast_pair'
    && rawState !== 'calibrating_off_presentation_lock'
    && rawState !== 'calibration_failed'
  ) {
    throw new Error(`unsupported pendingAnchorState: ${rawState}`);
  }
  const captureId = optionalText(diagnostics.pendingAnchorCaptureId);
  const ageMs = diagnostics.pendingAnchorAgeMs === null
    ? null
    : finiteNonNegative(diagnostics.pendingAnchorAgeMs, 'pendingAnchorAgeMs');
  const error = optionalText(diagnostics.pendingAnchorError);
  if (rawState === 'none' && (captureId !== null || ageMs !== null || error !== null)) {
    throw new Error('inactive pending anchor must not carry staged-anchor diagnostics');
  }
  if (
    (rawState === 'awaiting_fast_pair'
      || rawState === 'calibrating_off_presentation_lock')
    && (captureId === null || ageMs === null || error !== null)
  ) {
    throw new Error('pending anchor awaiting or calibrating must expose identity and age without a calibration error');
  }
  if (
    rawState === 'calibration_failed'
    && (captureId === null || ageMs === null || error === null)
  ) {
    throw new Error('failed pending-anchor calibration must expose identity, age, and error');
  }
  return { captureId, ageMs, state: rawState, error };
}

export function normalizeTransientHybridFallback(value: unknown): TransientHybridFallbackTruth | null {
  try {
    const state = record(value, 'runtime fallback state');
    if (state.runtimeOwner !== LIVE_HAND_RUNTIME_OWNER || state.status !== 'fallback') return null;
    const frame = record(state.frame, 'runtime fallback frame');
    const source = record(frame.source, 'runtime fallback source');
    if (
      source.effectiveRoute !== LIVE_HAND_HYBRID_FALLBACK_ROUTE
      || source.backend !== 'hybrid'
      || source.rawSchema !== LIVE_HAND_FAST_LANDMARK_SCHEMA
    ) {
      return null;
    }
    const diagnostics = record(frame.diagnostics, 'runtime fallback diagnostics');
    if (diagnostics.fusionMode !== LIVE_HAND_HYBRID_FUSION_MODE) return null;
    const reason = optionalText(diagnostics.fallbackState);
    if (!reason || !TRANSIENT_HYBRID_FALLBACK_REASONS.has(reason)) return null;
    return {
      reason,
      pendingAnchor: normalizePendingAnchorTruth(diagnostics),
    };
  } catch {
    return null;
  }
}

export function transientHybridFallbackReason(value: unknown): string | null {
  return normalizeTransientHybridFallback(value)?.reason ?? null;
}

export function decideHeldHandSurface(input: {
  hasVisibleSurface: boolean;
  lastTrustworthyAtMs: number;
  nowMs: number;
  maxAgeMs: number;
  fallbackReason?: string;
}): HeldHandSurfaceDecision {
  const ageMs = Math.max(0, input.nowMs - input.lastTrustworthyAtMs);
  const maxAgeMs = input.fallbackReason === 'stale_wilor_anchor'
    ? Math.min(input.maxAgeMs, STALE_WILOR_PRESENTATION_HOLD_MS)
    : input.maxAgeMs;
  return {
    hold: (
      input.hasVisibleSurface
      && Number.isFinite(input.lastTrustworthyAtMs)
      && input.lastTrustworthyAtMs > 0
      && Number.isFinite(input.nowMs)
      && Number.isFinite(maxAgeMs)
      && maxAgeMs >= 0
      && ageMs <= maxAgeMs
    ),
    ageMs,
    maxAgeMs,
  };
}

function record(value: unknown, label: string): RecordLike {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} is missing`);
  return value as RecordLike;
}

function finite(value: unknown, label: string): number {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`${label} is missing or invalid`);
  return number;
}

function finiteNonNegative(value: unknown, label: string): number {
  const number = finite(value, label);
  if (number < 0) throw new Error(`${label} must be non-negative`);
  return number;
}

function text(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.length === 0) throw new Error(`${label} is missing`);
  return value;
}

function optionalText(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function isLiveHandEffectiveRoute(value: string): value is LiveHandEffectiveRoute {
  return value === LIVE_HAND_ROUTE || value === LIVE_HAND_HYBRID_ROUTE;
}

function vec3(value: unknown, label: string): readonly [number, number, number] {
  if (Array.isArray(value) && value.length >= 3) {
    return [finite(value[0], `${label}[0]`), finite(value[1], `${label}[1]`), finite(value[2], `${label}[2]`)];
  }
  if (value && typeof value === 'object') {
    const point = value as RecordLike;
    return [finite(point.x, `${label}.x`), finite(point.y, `${label}.y`), finite(point.z, `${label}.z`)];
  }
  throw new Error(`${label} must be a vec3`);
}

export function assertLiveRuntimeHealth(value: unknown): RuntimeHealthTruth {
  const health = record(value, 'runtime health');
  if (health.runtimeOwner !== LIVE_HAND_RUNTIME_OWNER) {
    throw new Error(`runtime owner must be ${LIVE_HAND_RUNTIME_OWNER}`);
  }
  const config = record(health.sidecarRuntimeConfig, 'sidecar runtime config');
  const chunkSegments = finiteNonNegative(config.chunkSegments, 'chunkSegments');
  const chunkYieldMs = finiteNonNegative(config.chunkYieldMs, 'chunkYieldMs');
  const burstMode = text(config.burstMode, 'burstMode');
  if (burstMode !== 'monolithic' && burstMode !== 'chunked') throw new Error(`unsupported burstMode: ${burstMode}`);
  if (burstMode === 'chunked' && chunkSegments < 2) throw new Error('chunked runtime must expose at least 2 segments');
  if (burstMode === 'monolithic' && chunkSegments !== 0) throw new Error('monolithic runtime must expose 0 segments');
  const chronology = record(health.emittedStateChronology, 'emitted state chronology');
  if (chronology.failure !== null) throw new Error('emitted state chronology reports a persistence failure');
  const lastWrittenSequence = chronology.lastWrittenSequence === null
    ? null
    : finiteNonNegative(chronology.lastWrittenSequence, 'chronology last written sequence');
  return {
    runtimeOwner: LIVE_HAND_RUNTIME_OWNER,
    burstMode,
    chunkSegments,
    chunkYieldMs,
    manoRegeneratorAvailable: health.manoRegeneratorAvailable === true,
    hybridGeometryMode: text(health.hybridGeometryMode, 'hybrid geometry mode'),
    runtimeRunId: text(health.runtimeRunId, 'runtime run id'),
    emittedStateChronology: {
      path: text(chronology.path, 'chronology path'),
      statusPath: text(chronology.statusPath, 'chronology status path'),
      queueDepth: finiteNonNegative(chronology.queueDepth, 'chronology queue depth'),
      writtenCount: finiteNonNegative(chronology.writtenCount, 'chronology written count'),
      lastWrittenSequence,
      failure: null,
    },
  };
}

export function assertLiveRuntimeSidecarStatus(value: unknown): RuntimeSidecarStatusTruth {
  const status = record(value, 'runtime sidecar status');
  if (status.runtimeOwner !== LIVE_HAND_RUNTIME_OWNER) {
    throw new Error(`sidecar runtime owner must be ${LIVE_HAND_RUNTIME_OWNER}`);
  }
  if (typeof status.running !== 'boolean') throw new Error('sidecar running truth is missing');
  if (typeof status.modelReady !== 'boolean') throw new Error('sidecar model readiness truth is missing');
  const modelReadiness = text(status.modelReadiness, 'sidecar model readiness');
  if (
    modelReadiness !== 'warming'
    && modelReadiness !== 'ready'
    && modelReadiness !== 'failed_before_ready'
    && modelReadiness !== 'stopped'
  ) {
    throw new Error(`unsupported sidecar model readiness: ${modelReadiness}`);
  }
  if (modelReadiness === 'ready' && (!status.running || !status.modelReady)) {
    throw new Error('ready sidecar must be running with a loaded model');
  }
  if (modelReadiness === 'warming' && (!status.running || status.modelReady)) {
    throw new Error('warming sidecar must be running without a loaded model');
  }
  if ((modelReadiness === 'failed_before_ready' || modelReadiness === 'stopped') && status.modelReady) {
    throw new Error(`${modelReadiness} sidecar cannot claim a loaded model`);
  }
  const modelReadyAtMs = status.modelReadyAtMs === null
    ? null
    : finiteNonNegative(status.modelReadyAtMs, 'sidecar model ready timestamp');
  const modelStartupMs = status.modelStartupMs === null
    ? null
    : finiteNonNegative(status.modelStartupMs, 'sidecar model startup duration');
  if (status.modelReady && (modelReadyAtMs === null || modelStartupMs === null)) {
    throw new Error('loaded sidecar model must expose readiness timing');
  }
  return {
    runtimeOwner: LIVE_HAND_RUNTIME_OWNER,
    running: status.running,
    modelReady: status.modelReady,
    modelReadiness,
    modelReadyAtMs,
    modelStartupMs,
    stopReason: status.stopReason === null ? null : text(status.stopReason, 'sidecar stop reason'),
  };
}

const LIVE_HAND_FINGERS = ['thumb', 'index', 'middle', 'ring', 'pinky'] as const;

function normalizeFingerExtensions(value: unknown, label: string): FingerExtensionTruth {
  const extensions = record(value, label);
  return Object.fromEntries(
    LIVE_HAND_FINGERS.map(finger => {
      const extension = finiteNonNegative(extensions[finger], `${label}.${finger}`);
      if (extension > 1) throw new Error(`${label}.${finger} must be in [0, 1]`);
      return [finger, extension];
    }),
  ) as unknown as FingerExtensionTruth;
}

function normalizeAnchorReplay(
  value: unknown,
  frameCaptureTimestampMs: number,
): AnchorReplayTruth {
  const replay = record(value, 'anchorReplay');
  if (replay.mode !== 'capture_time_fast_observation_replay_v1') {
    throw new Error('hybrid frame must expose capture-time fast-observation replay');
  }
  const anchorCaptureTimestampMs = finiteNonNegative(
    replay.anchorCaptureTimestampMs,
    'anchorReplay.anchorCaptureTimestampMs',
  );
  const observationCount = finiteNonNegative(
    replay.observationCount,
    'anchorReplay.observationCount',
  );
  const acceptedCount = finiteNonNegative(
    replay.acceptedCount,
    'anchorReplay.acceptedCount',
  );
  const lastAcceptedCaptureTimestampMs = finiteNonNegative(
    replay.lastAcceptedCaptureTimestampMs,
    'anchorReplay.lastAcceptedCaptureTimestampMs',
  );
  if (!Number.isSafeInteger(observationCount) || !Number.isSafeInteger(acceptedCount)) {
    throw new Error('anchor replay counts must be safe integers');
  }
  if (acceptedCount > observationCount) {
    throw new Error('anchor replay accepted count exceeds its observation count');
  }
  if (lastAcceptedCaptureTimestampMs < anchorCaptureTimestampMs) {
    throw new Error('anchor replay chronology precedes the anchor capture');
  }
  if (
    anchorCaptureTimestampMs > frameCaptureTimestampMs
    || lastAcceptedCaptureTimestampMs > frameCaptureTimestampMs
  ) {
    throw new Error('anchor replay chronology exceeds visible frame capture');
  }
  if (replay.failure !== null) {
    throw new Error('fresh hybrid frame cannot carry a failed anchor replay');
  }
  const hasPromotionCatchUp = replay.promotionCatchUpMode !== undefined;
  let candidateLastAcceptedCaptureTimestampMs: number | null = null;
  let promotionCatchUpMode: AnchorReplayTruth['promotionCatchUpMode'] = null;
  let promotionCatchUpCaptureTimestampMs: number | null = null;
  if (hasPromotionCatchUp) {
    if (replay.promotionCatchUpMode !== 'accepted_pose_state_transplant_v1') {
      throw new Error('unsupported anchor replay promotion catch-up mode');
    }
    promotionCatchUpMode = 'accepted_pose_state_transplant_v1';
    candidateLastAcceptedCaptureTimestampMs = finiteNonNegative(
      replay.candidateLastAcceptedCaptureTimestampMs,
      'anchorReplay.candidateLastAcceptedCaptureTimestampMs',
    );
    promotionCatchUpCaptureTimestampMs = finiteNonNegative(
      replay.promotionCatchUpCaptureTimestampMs,
      'anchorReplay.promotionCatchUpCaptureTimestampMs',
    );
    if (candidateLastAcceptedCaptureTimestampMs !== lastAcceptedCaptureTimestampMs) {
      throw new Error('anchor replay candidate cutoff contradicts replay chronology');
    }
    if (
      promotionCatchUpCaptureTimestampMs < candidateLastAcceptedCaptureTimestampMs
      || promotionCatchUpCaptureTimestampMs > frameCaptureTimestampMs
    ) {
      throw new Error('anchor replay promotion catch-up chronology is invalid');
    }
  } else if (
    replay.candidateLastAcceptedCaptureTimestampMs !== undefined
    || replay.promotionCatchUpCaptureTimestampMs !== undefined
  ) {
    throw new Error('anchor replay promotion catch-up provenance is incomplete');
  }
  return {
    mode: 'capture_time_fast_observation_replay_v1',
    anchorCaptureTimestampMs,
    observationCount,
    acceptedCount,
    lastAcceptedCaptureTimestampMs,
    candidateLastAcceptedCaptureTimestampMs,
    promotionCatchUpMode,
    promotionCatchUpCaptureTimestampMs,
    failure: null,
  };
}

export function normalizeLiveManoFrame(value: unknown): NormalizedManoFrame {
  const state = record(value, 'runtime state');
  if (state.runtimeOwner !== LIVE_HAND_RUNTIME_OWNER) throw new Error(`runtime owner must be ${LIVE_HAND_RUNTIME_OWNER}`);
  const frame = record(state.frame, 'runtime frame');
  const authority = record(frame.authority, 'frame authority');
  if (authority.sourceAuthority !== 'live_simulation' || authority.freshness !== 'fresh') {
    throw new Error('frame lacks fresh live authority');
  }
  const source = record(frame.source, 'frame source');
  const effectiveRoute = text(source.effectiveRoute, 'effective route');
  if (!isLiveHandEffectiveRoute(effectiveRoute)) {
    throw new Error(`effective route must be ${LIVE_HAND_ROUTE} or ${LIVE_HAND_HYBRID_ROUTE}, got ${effectiveRoute}`);
  }
  const mano = record(frame.mano, 'MANO surface');
  const surface = normalizeManoSurface(mano);
  const diagnostics = record(frame.diagnostics, 'frame diagnostics');
  const frameIdentity = record(frame.frame, 'frame identity');
  const captureTimestampMs = finiteNonNegative(
    frameIdentity.captureTimestampMs,
    'captureTimestampMs',
  );
  const timing = record(frame.timing, 'frame timing');
  const hand = record(frame.hand, 'hand state');
  const keypoints = hand.keypoints3d;
  if (!Array.isArray(keypoints) || keypoints.length < 21) throw new Error('live hand state must contain 21 3D keypoints');
  const burstMode = text(diagnostics.burstMode, 'burstMode');
  if (burstMode !== 'monolithic' && burstMode !== 'chunked') throw new Error(`unsupported burstMode: ${burstMode}`);
  const fusionMode = optionalText(diagnostics.fusionMode);
  const geometryMode = optionalText(diagnostics.geometryMode);
  const anchorSource = optionalText(diagnostics.anchorSource);
  const anchorCaptureId = optionalText(diagnostics.anchorCaptureId);
  const fastPathSource = optionalText(diagnostics.fastPathSource);
  let anchorAgeMs: number | null = null;
  let pendingAnchorCaptureId: string | null = null;
  let pendingAnchorAgeMs: number | null = null;
  let pendingAnchorState: NormalizedManoFrame['pendingAnchorState'] = 'none';
  let pendingAnchorError: string | null = null;
  let fastPathAgeMs: number | null = null;
  let fastPathLatencyMs: number | null = null;
  let fitResidualMean: number | null = null;
  let fitResidualMax: number | null = null;
  let baselineResidualMean: number | null = null;
  let calibrationDeterminant: number | null = null;
  let calibrationResidualMean: number | null = null;
  let calibrationResidualMax: number | null = null;
  let fastWorldBasisTransform: string | null = null;
  let maxJointCorrectionRad: number | null = null;
  let maxAnchorJointDeviationRad: number | null = null;
  let jointStepIntervalMs: number | null = null;
  let jointStepLimitRad: number | null = null;
  let maxJointStepAppliedRad: number | null = null;
  let jointStepPolicy: NormalizedManoFrame['jointStepPolicy'] = null;
  let jointStepSpeedRadS: number | null = null;
  let jointStepBaseLimitRad: number | null = null;
  let adaptiveStepQuality: number | null = null;
  let idealFitResidualMean: number | null = null;
  let idealFitImprovementRatio: number | null = null;
  let palmSolverMode: NormalizedManoFrame['palmSolverMode'] = null;
  let palmSolverConsensusMode: NormalizedManoFrame['palmSolverConsensusMode'] = null;
  let palmSolverResidualMean: number | null = null;
  let palmSolverInlierFraction: number | null = null;
  let poseSolverMode: NormalizedManoFrame['poseSolverMode'] = null;
  let poseSolverIterations: number | null = null;
  let poseSolverDofCount: number | null = null;
  let poseSolverObjectiveInitial: number | null = null;
  let poseSolverObjectiveFinal: number | null = null;
  let poseSolverRobustInlierFraction: number | null = null;
  let poseSolverConstraintSaturation: number | null = null;
  let poseSolverDistalCouplingResidualRad: number | null = null;
  let anchorReplay: AnchorReplayTruth | null = null;
  let fingerExtension: NormalizedManoFrame['fingerExtension'] = null;
  if (effectiveRoute === LIVE_HAND_HYBRID_ROUTE) {
    if (source.rawSchema !== LIVE_HAND_FAST_LANDMARK_SCHEMA) {
      throw new Error(`hybrid frame must expose ${LIVE_HAND_FAST_LANDMARK_SCHEMA}`);
    }
    if (fusionMode !== LIVE_HAND_HYBRID_FUSION_MODE) throw new Error('hybrid frame must expose the MANO pose fusion mode');
    if (geometryMode !== LIVE_HAND_HYBRID_GEOMETRY_MODE || mano.diagnostic !== LIVE_HAND_HYBRID_GEOMETRY_MODE) {
      throw new Error('hybrid frame must expose native MANO regeneration');
    }
    if (anchorSource !== LIVE_HAND_ROUTE) throw new Error(`hybrid frame must name ${LIVE_HAND_ROUTE} as its anchor source`);
    if (!anchorCaptureId) throw new Error('hybrid frame must expose its paired anchor capture id');
    if (fastPathSource !== LIVE_HAND_FAST_PATH_SOURCE) throw new Error('hybrid frame must name the browser MediaPipe fast-path source');
    if (diagnostics.fallbackState !== null) throw new Error('hybrid frame must not carry an active fallback state');
    anchorAgeMs = finiteNonNegative(diagnostics.anchorAgeMs, 'anchorAgeMs');
    const pendingAnchor = normalizePendingAnchorTruth(diagnostics);
    pendingAnchorState = pendingAnchor.state;
    pendingAnchorCaptureId = pendingAnchor.captureId;
    pendingAnchorAgeMs = pendingAnchor.ageMs;
    pendingAnchorError = pendingAnchor.error;
    fastPathAgeMs = finiteNonNegative(diagnostics.fastPathAgeMs, 'fastPathAgeMs');
    fastPathLatencyMs = finiteNonNegative(timing.fastPathLatencyMs, 'fastPathLatencyMs');
    fitResidualMean = finiteNonNegative(diagnostics.fitResidualMean, 'fitResidualMean');
    fitResidualMax = finiteNonNegative(diagnostics.fitResidualMax, 'fitResidualMax');
    baselineResidualMean = finiteNonNegative(diagnostics.baselineResidualMean, 'baselineResidualMean');
    calibrationDeterminant = finite(diagnostics.calibrationDeterminant, 'calibrationDeterminant');
    if (Math.abs(calibrationDeterminant - 1) > 1e-6) {
      throw new Error('hybrid frame must carry a proper paired calibration');
    }
    calibrationResidualMean = finiteNonNegative(diagnostics.calibrationResidualMean, 'calibrationResidualMean');
    calibrationResidualMax = finiteNonNegative(diagnostics.calibrationResidualMax, 'calibrationResidualMax');
    fastWorldBasisTransform = optionalText(diagnostics.fastWorldBasisTransform);
    if (fastWorldBasisTransform !== 'mediapipe_to_wilor_flip_z_v1') {
      throw new Error('hybrid frame must expose the MediaPipe-to-WiLoR basis transform');
    }
    maxJointCorrectionRad = finiteNonNegative(diagnostics.maxJointCorrectionRad, 'maxJointCorrectionRad');
    maxAnchorJointDeviationRad = finiteNonNegative(
      diagnostics.maxAnchorJointDeviationRad,
      'maxAnchorJointDeviationRad',
    );
    jointStepIntervalMs = finiteNonNegative(diagnostics.jointStepIntervalMs, 'jointStepIntervalMs');
    jointStepLimitRad = finiteNonNegative(diagnostics.jointStepLimitRad, 'jointStepLimitRad');
    maxJointStepAppliedRad = finiteNonNegative(
      diagnostics.maxJointStepAppliedRad,
      'maxJointStepAppliedRad',
    );
    const rawJointStepPolicy = text(diagnostics.jointStepPolicy, 'jointStepPolicy');
    if (
      rawJointStepPolicy !== 'fixed_speed'
      && rawJointStepPolicy !== 'adaptive_confidence_residual_anchor_v2'
    ) {
      throw new Error(`unsupported jointStepPolicy: ${rawJointStepPolicy}`);
    }
    jointStepPolicy = rawJointStepPolicy;
    jointStepSpeedRadS = finiteNonNegative(diagnostics.jointStepSpeedRadS, 'jointStepSpeedRadS');
    jointStepBaseLimitRad = finiteNonNegative(
      diagnostics.jointStepBaseLimitRad,
      'jointStepBaseLimitRad',
    );
    adaptiveStepQuality = finiteNonNegative(
      diagnostics.adaptiveStepQuality,
      'adaptiveStepQuality',
    );
    idealFitResidualMean = finiteNonNegative(
      diagnostics.idealFitResidualMean,
      'idealFitResidualMean',
    );
    idealFitImprovementRatio = finiteNonNegative(
      diagnostics.idealFitImprovementRatio,
      'idealFitImprovementRatio',
    );
    const rawPalmSolverMode = text(diagnostics.palmSolverMode, 'palmSolverMode');
    if (rawPalmSolverMode !== 'robust_palm_procrustes_v2') {
      throw new Error('hybrid frame must expose the robust palm Procrustes solver');
    }
    palmSolverMode = rawPalmSolverMode;
    const rawPalmSolverConsensusMode = text(
      diagnostics.palmSolverConsensusMode,
      'palmSolverConsensusMode',
    );
    if (
      rawPalmSolverConsensusMode !== 'fixed_radius_v1'
      && rawPalmSolverConsensusMode !== 'bounded_trimmed_v1'
    ) {
      throw new Error(
        `unsupported palmSolverConsensusMode: ${rawPalmSolverConsensusMode}`,
      );
    }
    palmSolverConsensusMode = rawPalmSolverConsensusMode;
    palmSolverResidualMean = finiteNonNegative(
      diagnostics.palmSolverResidualMean,
      'palmSolverResidualMean',
    );
    palmSolverInlierFraction = finiteNonNegative(
      diagnostics.palmSolverInlierFraction,
      'palmSolverInlierFraction',
    );
    const rawPoseSolverMode = text(diagnostics.poseSolverMode, 'poseSolverMode');
    if (rawPoseSolverMode !== 'chain_coupled_anatomical_v1') {
      throw new Error('hybrid frame must expose the chain-coupled anatomical pose solver');
    }
    poseSolverMode = rawPoseSolverMode;
    poseSolverIterations = finiteNonNegative(
      diagnostics.poseSolverIterations,
      'poseSolverIterations',
    );
    if (!Number.isInteger(poseSolverIterations)) {
      throw new Error('poseSolverIterations must be an integer');
    }
    poseSolverDofCount = finiteNonNegative(
      diagnostics.poseSolverDofCount,
      'poseSolverDofCount',
    );
    if (poseSolverDofCount !== 20) {
      throw new Error('chain-coupled pose solver must expose 20 anatomical coordinates');
    }
    poseSolverObjectiveInitial = finiteNonNegative(
      diagnostics.poseSolverObjectiveInitial,
      'poseSolverObjectiveInitial',
    );
    poseSolverObjectiveFinal = finiteNonNegative(
      diagnostics.poseSolverObjectiveFinal,
      'poseSolverObjectiveFinal',
    );
    poseSolverRobustInlierFraction = finiteNonNegative(
      diagnostics.poseSolverRobustInlierFraction,
      'poseSolverRobustInlierFraction',
    );
    poseSolverConstraintSaturation = finiteNonNegative(
      diagnostics.poseSolverConstraintSaturation,
      'poseSolverConstraintSaturation',
    );
    poseSolverDistalCouplingResidualRad = finiteNonNegative(
      diagnostics.poseSolverDistalCouplingResidualRad,
      'poseSolverDistalCouplingResidualRad',
    );
    if (
      palmSolverInlierFraction > 1
      || poseSolverRobustInlierFraction > 1
      || poseSolverConstraintSaturation > 1
    ) {
      throw new Error('pose solver fractions must remain in [0, 1]');
    }
    if (poseSolverObjectiveFinal > poseSolverObjectiveInitial + 1e-12) {
      throw new Error('pose solver final objective exceeds its initial objective');
    }
    anchorReplay = normalizeAnchorReplay(
      diagnostics.anchorReplay,
      captureTimestampMs,
    );
    const rawFingerExtension = record(diagnostics.fingerExtension, 'fingerExtension');
    fingerExtension = {
      target: normalizeFingerExtensions(
        rawFingerExtension.target,
        'fingerExtension.target',
      ),
      output: normalizeFingerExtensions(
        rawFingerExtension.output,
        'fingerExtension.output',
      ),
    };
    if (maxJointStepAppliedRad > jointStepLimitRad + 1e-8) {
      throw new Error('visible joint correction exceeds the cadence-scaled correction limit');
    }
    if (jointStepBaseLimitRad > jointStepLimitRad + 1e-8) {
      throw new Error('adaptive joint correction limit is below its fixed-speed counterfactual');
    }
    if (
      jointStepSpeedRadS < 2.4 - 1e-8
      || jointStepSpeedRadS > 9.6 + 1e-8
      || adaptiveStepQuality > 1
    ) {
      throw new Error('adaptive joint correction policy exceeds its declared bounds');
    }
    if (
      jointStepPolicy === 'fixed_speed'
      && (
        Math.abs(jointStepSpeedRadS - 2.4) > 1e-8
        || Math.abs(jointStepLimitRad - jointStepBaseLimitRad) > 1e-8
        || adaptiveStepQuality !== 0
      )
    ) {
      throw new Error('fixed-speed settling frame carries adaptive correction authority');
    }
  }
  return {
    runtimeOwner: LIVE_HAND_RUNTIME_OWNER,
    burstMode,
    chunkSegments: finiteNonNegative(diagnostics.chunkSegments, 'chunkSegments'),
    chunkYieldMs: finiteNonNegative(diagnostics.chunkYieldMs, 'chunkYieldMs'),
    eventSequence: finiteNonNegative(state.eventSequence, 'eventSequence'),
    frameId: text(frameIdentity.frameId, 'frameId'),
    captureTimestampMs,
    requestedRoute: text(source.requestedRoute, 'requested route'),
    effectiveRoute,
    model: text(source.model, 'model'),
    deviceRoute: text(source.deviceRoute, 'device route'),
    dtypeRoute: text(source.dtypeRoute, 'dtype route'),
    handedness: text(hand.handedness, 'handedness'),
    confidence: finiteNonNegative(hand.confidence, 'hand confidence'),
    keypoints3d: keypoints.slice(0, 21).map((point, index) => vec3(point, `hand.keypoints3d[${index}]`)),
    modelLatencyMs: finiteNonNegative(timing.modelLatencyMs, 'modelLatencyMs'),
    captureToSidecarPublishMs: finiteNonNegative(timing.cameraFrameAgeMs, 'cameraFrameAgeMs'),
    ...surface,
    fusionMode,
    geometryMode,
    anchorSource,
    anchorCaptureId,
    anchorAgeMs,
    pendingAnchorCaptureId,
    pendingAnchorAgeMs,
    pendingAnchorState,
    pendingAnchorError,
    fastPathSource,
    fastPathAgeMs,
    fastPathLatencyMs,
    fitResidualMean,
    fitResidualMax,
    baselineResidualMean,
    calibrationDeterminant,
    calibrationResidualMean,
    calibrationResidualMax,
    fastWorldBasisTransform,
    maxJointCorrectionRad,
    maxAnchorJointDeviationRad,
    jointStepIntervalMs,
    jointStepLimitRad,
    maxJointStepAppliedRad,
    jointStepPolicy,
    jointStepSpeedRadS,
    jointStepBaseLimitRad,
    adaptiveStepQuality,
    idealFitResidualMean,
    idealFitImprovementRatio,
    palmSolverMode,
    palmSolverConsensusMode,
    palmSolverResidualMean,
    palmSolverInlierFraction,
    poseSolverMode,
    poseSolverIterations,
    poseSolverDofCount,
    poseSolverObjectiveInitial,
    poseSolverObjectiveFinal,
    poseSolverRobustInlierFraction,
    poseSolverConstraintSaturation,
    poseSolverDistalCouplingResidualRad,
    anchorReplay,
    fingerExtension,
  };
}

export function normalizeManoSurface(value: unknown): NormalizedManoSurface {
  const mano = record(value, 'MANO surface');
  const vertices = mano.vertices;
  const faces = mano.faces;
  if (mano.available !== true || !Array.isArray(vertices) || vertices.length !== MANO_VERTEX_COUNT) {
    throw new Error(`live MANO surface must contain ${MANO_VERTEX_COUNT} vertices`);
  }
  if (!Array.isArray(faces) || faces.length !== MANO_FACE_COUNT) {
    throw new Error(`live MANO surface must contain ${MANO_FACE_COUNT} faces`);
  }

  const points = vertices.map((vertex, index) => vec3(vertex, `mano.vertices[${index}]`));
  const center = [0, 0, 0];
  for (const point of points) {
    center[0] += point[0];
    center[1] += point[1];
    center[2] += point[2];
  }
  center[0] /= points.length;
  center[1] /= points.length;
  center[2] /= points.length;
  let radius = 0;
  for (const point of points) {
    radius = Math.max(radius, Math.hypot(point[0] - center[0], point[1] - center[1], point[2] - center[2]));
  }
  if (radius < 1e-6) throw new Error('MANO surface radius is degenerate');
  const scale = 1.05 / radius;
  const manoTransform: ManoDisplayTransform = {
    center: [center[0], center[1], center[2]],
    scale,
  };
  const positions = new Float32Array(MANO_VERTEX_COUNT * 3);
  points.forEach((point, index) => {
    positions[index * 3] = (point[0] - center[0]) * scale;
    positions[index * 3 + 1] = -(point[1] - center[1]) * scale;
    positions[index * 3 + 2] = (point[2] - center[2]) * scale;
  });
  const indices = new Uint32Array(MANO_FACE_COUNT * 3);
  faces.forEach((face, index) => {
    const triangle = vec3(face, `mano.faces[${index}]`);
    triangle.forEach((vertexIndex, component) => {
      if (!Number.isInteger(vertexIndex) || vertexIndex < 0 || vertexIndex >= MANO_VERTEX_COUNT) {
        throw new Error(`mano.faces[${index}][${component}] is outside the vertex array`);
      }
      indices[index * 3 + component] = vertexIndex;
    });
  });

  return {
    positions,
    indices,
    vertexCount: MANO_VERTEX_COUNT,
    faceCount: MANO_FACE_COUNT,
    manoTransform,
    orientationContract: MANO_DISPLAY_ORIENTATION,
  };
}

function quantile(sorted: readonly number[], probability: number): number {
  return sorted[Math.max(0, Math.ceil(sorted.length * probability) - 1)];
}

function rounded(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function distribution(values: readonly number[]): Distribution {
  const sorted = [...values].sort((left, right) => left - right);
  return {
    min: rounded(sorted[0]),
    mean: rounded(sorted.reduce((sum, value) => sum + value, 0) / sorted.length),
    p50: rounded(quantile(sorted, 0.5)),
    p90: rounded(quantile(sorted, 0.9)),
    p95: rounded(quantile(sorted, 0.95)),
    p99: rounded(quantile(sorted, 0.99)),
    max: rounded(sorted.at(-1) as number),
  };
}

export function summarizeLiveHandLatency(samples: readonly LiveHandLatencySample[]): LiveHandLatencySummary {
  if (!Array.isArray(samples) || samples.length === 0) throw new Error('no live latency samples');
  const frameIds = new Set<string>();
  for (const sample of samples) {
    if (!sample.frameId || frameIds.has(sample.frameId)) throw new Error(`missing or duplicate frameId: ${sample.frameId || 'missing'}`);
    frameIds.add(sample.frameId);
    if (sample.runtimeOwner !== LIVE_HAND_RUNTIME_OWNER) throw new Error(`runtime owner must be ${LIVE_HAND_RUNTIME_OWNER}`);
    if (sample.sourceAuthority !== 'live_simulation') throw new Error('sample lacks live authority');
    if (!isLiveHandEffectiveRoute(sample.effectiveRoute)) {
      throw new Error(`effective route must be ${LIVE_HAND_ROUTE} or ${LIVE_HAND_HYBRID_ROUTE}`);
    }
    if (sample.manoVertexCount !== MANO_VERTEX_COUNT || sample.manoFaceCount !== MANO_FACE_COUNT) {
      throw new Error(`sample lacks ${MANO_VERTEX_COUNT}/${MANO_FACE_COUNT} MANO topology`);
    }
    finiteNonNegative(sample.modelLatencyMs, 'modelLatencyMs');
    finiteNonNegative(sample.captureToWebglRenderReturnMs, 'captureToWebglRenderReturnMs');
    finiteNonNegative(sample.captureToRenderCompleteMs, 'captureToRenderCompleteMs');
    if (sample.captureToRenderCompleteMs !== sample.captureToWebglRenderReturnMs) {
      throw new Error('captureToRenderCompleteMs must preserve the WebGL render-return measurement');
    }
    if (sample.renderCompletionAuthority !== 'webgl_render_call_complete_not_compositor_presented') {
      throw new Error('sample lacks explicit WebGL render-return authority');
    }
  }
  return {
    schema: 'lerms.live-hand-latency-summary.v0',
    sampleCount: samples.length,
    effectiveRoute: (() => {
      const routes = new Set(samples.map(sample => sample.effectiveRoute as LiveHandEffectiveRoute));
      return routes.size === 1 ? routes.values().next().value as LiveHandEffectiveRoute : 'mixed_live_hand_routes';
    })(),
    manoVertexCount: MANO_VERTEX_COUNT,
    manoFaceCount: MANO_FACE_COUNT,
    modelLatencyMs: distribution(samples.map(sample => sample.modelLatencyMs)),
    captureToWebglRenderReturnMs: distribution(samples.map(sample => sample.captureToWebglRenderReturnMs)),
  };
}
