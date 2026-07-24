export const LIVE_HAND_ROUTE = 'native_wilor_mini_mlx_detector_sidecar_live' as const;
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

export interface NormalizedManoFrame extends RuntimeRouteTruth {
  eventSequence: number;
  frameId: string;
  captureTimestampMs: number;
  requestedRoute: string;
  effectiveRoute: typeof LIVE_HAND_ROUTE;
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
  effectiveRoute: typeof LIVE_HAND_ROUTE;
  manoVertexCount: typeof MANO_VERTEX_COUNT;
  manoFaceCount: typeof MANO_FACE_COUNT;
  modelLatencyMs: Distribution;
  captureToWebglRenderReturnMs: Distribution;
}

type RecordLike = Record<string, unknown>;

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

export function assertLiveRuntimeHealth(value: unknown): RuntimeRouteTruth {
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
  return { runtimeOwner: LIVE_HAND_RUNTIME_OWNER, burstMode, chunkSegments, chunkYieldMs };
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
  if (effectiveRoute !== LIVE_HAND_ROUTE) throw new Error(`effective route must be ${LIVE_HAND_ROUTE}, got ${effectiveRoute}`);
  const mano = record(frame.mano, 'MANO surface');
  const surface = normalizeManoSurface(mano);
  const diagnostics = record(frame.diagnostics, 'frame diagnostics');
  const frameIdentity = record(frame.frame, 'frame identity');
  const timing = record(frame.timing, 'frame timing');
  const hand = record(frame.hand, 'hand state');
  const keypoints = hand.keypoints3d;
  if (!Array.isArray(keypoints) || keypoints.length < 21) throw new Error('live hand state must contain 21 3D keypoints');
  const burstMode = text(diagnostics.burstMode, 'burstMode');
  if (burstMode !== 'monolithic' && burstMode !== 'chunked') throw new Error(`unsupported burstMode: ${burstMode}`);
  return {
    runtimeOwner: LIVE_HAND_RUNTIME_OWNER,
    burstMode,
    chunkSegments: finiteNonNegative(diagnostics.chunkSegments, 'chunkSegments'),
    chunkYieldMs: finiteNonNegative(diagnostics.chunkYieldMs, 'chunkYieldMs'),
    eventSequence: finiteNonNegative(state.eventSequence, 'eventSequence'),
    frameId: text(frameIdentity.frameId, 'frameId'),
    captureTimestampMs: finiteNonNegative(frameIdentity.captureTimestampMs, 'captureTimestampMs'),
    requestedRoute: text(source.requestedRoute, 'requested route'),
    effectiveRoute: LIVE_HAND_ROUTE,
    model: text(source.model, 'model'),
    deviceRoute: text(source.deviceRoute, 'device route'),
    dtypeRoute: text(source.dtypeRoute, 'dtype route'),
    handedness: text(hand.handedness, 'handedness'),
    confidence: finiteNonNegative(hand.confidence, 'hand confidence'),
    keypoints3d: keypoints.slice(0, 21).map((point, index) => vec3(point, `hand.keypoints3d[${index}]`)),
    modelLatencyMs: finiteNonNegative(timing.modelLatencyMs, 'modelLatencyMs'),
    captureToSidecarPublishMs: finiteNonNegative(timing.cameraFrameAgeMs, 'cameraFrameAgeMs'),
    ...surface,
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
    if (sample.effectiveRoute !== LIVE_HAND_ROUTE) throw new Error(`effective route must be ${LIVE_HAND_ROUTE}`);
    if (sample.manoVertexCount !== MANO_VERTEX_COUNT || sample.manoFaceCount !== MANO_FACE_COUNT) {
      throw new Error(`sample lacks ${MANO_VERTEX_COUNT}/${MANO_FACE_COUNT} MANO topology`);
    }
    finiteNonNegative(sample.modelLatencyMs, 'modelLatencyMs');
    finiteNonNegative(sample.captureToWebglRenderReturnMs, 'captureToWebglRenderReturnMs');
  }
  return {
    schema: 'lerms.live-hand-latency-summary.v0',
    sampleCount: samples.length,
    effectiveRoute: LIVE_HAND_ROUTE,
    manoVertexCount: MANO_VERTEX_COUNT,
    manoFaceCount: MANO_FACE_COUNT,
    modelLatencyMs: distribution(samples.map(sample => sample.modelLatencyMs)),
    captureToWebglRenderReturnMs: distribution(samples.map(sample => sample.captureToWebglRenderReturnMs)),
  };
}
