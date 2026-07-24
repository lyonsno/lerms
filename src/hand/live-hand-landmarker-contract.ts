export const LIVE_HAND_LANDMARKER_WORKER_ROUTE = 'browser-mediapipe-hand-landmarker-worker-mirrored-v1' as const;
export const LIVE_HAND_LANDMARKER_RESULT_SCHEMA = 'lerms.live-hand-landmarker-result.v1' as const;
export const LIVE_HAND_LANDMARKER_ERROR_SCHEMA = 'lerms.live-hand-landmarker-error.v1' as const;
export const LIVE_HAND_LANDMARKER_DROP_SCHEMA = 'lerms.live-hand-landmarker-drop.v1' as const;
export const LIVE_HAND_LANDMARKER_READY_SCHEMA = 'lerms.live-hand-landmarker-ready.v1' as const;
export const LIVE_HAND_FAST_LANDMARK_SCHEMA = 'hand-state.browser-fast-landmarks.v1' as const;
export const LIVE_HAND_FAST_PATH_SOURCE = 'browser_mediapipe_hand_landmarker_live' as const;

type RecordLike = Record<string, unknown>;

export interface LiveHandLandmarkerWorkerResult {
  schema: typeof LIVE_HAND_LANDMARKER_RESULT_SCHEMA;
  routeIdentity: string;
  captureId: string;
  captureTimestampMs: number;
  publishedAtMs: number;
  handedness: string;
  confidence: number;
  imageLandmarks: readonly RecordLike[];
  worldLandmarks: readonly RecordLike[];
  workerLandmarkerMs: number;
  workerProcessingMs: number;
  mirroredInput: true;
}

export interface LiveHandLandmarkerWorkerError {
  schema: typeof LIVE_HAND_LANDMARKER_ERROR_SCHEMA;
  routeIdentity: string;
  captureId: string | null;
  failurePhase: string;
  error: string;
  primaryOutputWritten: false;
  lastTrustworthyEvidence: RecordLike;
}

export function normalizeLandmarkerWorkerResult(
  value: unknown,
  expectedCaptureId: string,
): LiveHandLandmarkerWorkerResult {
  const result = record(value, 'landmarker worker result');
  if (result.schema !== LIVE_HAND_LANDMARKER_RESULT_SCHEMA) throw new Error('landmarker worker result schema is invalid');
  if (result.routeIdentity !== LIVE_HAND_LANDMARKER_WORKER_ROUTE) throw new Error('landmarker worker route is invalid');
  if (result.captureId !== expectedCaptureId) throw new Error('landmarker worker result does not match its request');
  if (result.mirroredInput !== true) throw new Error('landmarker worker result lacks mirrored input authority');
  const confidence = finite(result.confidence, 'landmarker confidence');
  if (confidence < 0 || confidence > 1) throw new Error('landmarker confidence must be between 0 and 1');
  return {
    schema: LIVE_HAND_LANDMARKER_RESULT_SCHEMA,
    routeIdentity: LIVE_HAND_LANDMARKER_WORKER_ROUTE,
    captureId: expectedCaptureId,
    captureTimestampMs: finiteNonNegative(result.captureTimestampMs, 'capture timestamp'),
    publishedAtMs: finiteNonNegative(result.publishedAtMs, 'publish timestamp'),
    handedness: handedness(result.handedness),
    confidence,
    imageLandmarks: landmarks(result.imageLandmarks, 'image landmarks'),
    worldLandmarks: landmarks(result.worldLandmarks, 'world landmarks'),
    workerLandmarkerMs: finiteNonNegative(result.workerLandmarkerMs, 'worker landmarker duration'),
    workerProcessingMs: finiteNonNegative(result.workerProcessingMs, 'worker processing duration'),
    mirroredInput: true,
  };
}

export function normalizeLandmarkerWorkerError(value: unknown): LiveHandLandmarkerWorkerError {
  const error = record(value, 'landmarker worker error');
  if (error.schema !== LIVE_HAND_LANDMARKER_ERROR_SCHEMA) throw new Error('landmarker worker error schema is invalid');
  if (error.routeIdentity !== LIVE_HAND_LANDMARKER_WORKER_ROUTE) throw new Error('landmarker worker error route is invalid');
  if (error.primaryOutputWritten !== false) throw new Error('landmarker worker error must deny primary output');
  return {
    schema: LIVE_HAND_LANDMARKER_ERROR_SCHEMA,
    routeIdentity: LIVE_HAND_LANDMARKER_WORKER_ROUTE,
    captureId: error.captureId === null ? null : text(error.captureId, 'landmarker failure capture id'),
    failurePhase: text(error.failurePhase, 'landmarker failure phase'),
    error: text(error.error, 'landmarker failure'),
    primaryOutputWritten: false,
    lastTrustworthyEvidence: record(error.lastTrustworthyEvidence, 'landmarker failure evidence'),
  };
}

export function createFastLandmarkPayload(result: LiveHandLandmarkerWorkerResult): RecordLike {
  return {
    schema: LIVE_HAND_FAST_LANDMARK_SCHEMA,
    source: LIVE_HAND_FAST_PATH_SOURCE,
    frameId: `fast:${result.captureId}`,
    captureId: result.captureId,
    captureTimestampMs: result.captureTimestampMs,
    publishedAtMs: result.publishedAtMs,
    handedness: result.handedness,
    confidence: result.confidence,
    imageLandmarks: result.imageLandmarks,
    worldLandmarks: result.worldLandmarks,
    timing: {
      browserLandmarkerMs: result.workerLandmarkerMs,
      browserWorkerProcessingMs: result.workerProcessingMs,
      mirroredInput: result.mirroredInput,
      workerRoute: result.routeIdentity,
    },
  };
}

function record(value: unknown, label: string): RecordLike {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} is missing`);
  return value as RecordLike;
}

function text(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value) throw new Error(`${label} is missing`);
  return value;
}

function finite(value: unknown, label: string): number {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`${label} must be finite`);
  return number;
}

function finiteNonNegative(value: unknown, label: string): number {
  const number = finite(value, label);
  if (number < 0) throw new Error(`${label} must be non-negative`);
  return number;
}

function handedness(value: unknown): string {
  const normalized = text(value, 'landmarker handedness').toLowerCase();
  if (normalized !== 'left' && normalized !== 'right') throw new Error('landmarker handedness must be left or right');
  return normalized;
}

function landmarks(value: unknown, label: string): readonly RecordLike[] {
  if (!Array.isArray(value) || value.length !== 21) throw new Error(`${label} must contain exactly 21 points`);
  return value.map((candidate, index) => {
    const point = record(candidate, `${label}[${index}]`);
    return {
      x: finite(point.x, `${label}[${index}].x`),
      y: finite(point.y, `${label}[${index}].y`),
      z: finite(point.z, `${label}[${index}].z`),
    };
  });
}
