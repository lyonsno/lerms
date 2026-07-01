export const BROWSER_SMOKE_LIVE_BACKEND = 'native_wilor_mini_mlx_detector_sidecar_live' as const;

export type BrowserSmokeAuthority = 'live_simulation' | 'stale_hold' | 'fallback' | 'synthetic_fixture' | 'invalid';
export type BrowserSmokePhase = 'waiting' | 'priming' | 'aiming' | 'released';
export type BrowserSmokeStatusCode =
  | 'waiting'
  | 'tracking'
  | 'no_new_packet'
  | 'empty'
  | 'stale'
  | 'fallback'
  | 'synthetic'
  | 'replay'
  | 'invalid';

export interface BrowserSmokePoint {
  x: number;
  y: number;
}

export interface BrowserSmokeCacheSnapshot {
  schema: string;
  status: string;
  sequence: number;
  stored_at_ms: number | null;
  age_ms: number | null;
  event: BrowserSmokeHandEvent | null;
}

export interface BrowserSmokeHandEvent {
  schema?: string;
  source_backend?: string;
  effective_route?: string;
  timestamp?: number;
  frame_id?: string;
  handedness?: string;
  confidence?: number;
  video_size?: {
    width: number;
    height: number;
  };
  palm_center?: BrowserSmokePoint;
  landmarks_2d?: BrowserSmokePoint[];
  native_frame_timing?: {
    model_latency_ms?: number;
  };
  webcam_frame?: {
    visible?: boolean;
    synthetic?: boolean;
    width?: number;
    height?: number;
    frame_ref?: string;
  };
  debug?: {
    evidence_route?: string;
    model_route?: string;
    device_route?: string;
    telemetry?: {
      model_latency_ms?: number;
      frame_age_ms?: number;
    } | null;
  };
}

export interface BrowserSmokeAim {
  active: boolean;
  origin: BrowserSmokePoint;
  direction: BrowserSmokePoint;
  arcSamples: Array<BrowserSmokePoint & { t: number }>;
}

export interface BrowserSmokeGoin {
  id: string;
  state: 'held' | 'rolling' | 'settled';
  position: BrowserSmokePoint;
  velocity: BrowserSmokePoint;
  desireRadius: number;
}

export interface BrowserSmokeHandSkeletonSegment {
  from: number;
  to: number;
  start: BrowserSmokePoint;
  end: BrowserSmokePoint;
  group: 'palm' | 'thumb' | 'index' | 'middle' | 'ring' | 'pinky';
}

export interface BrowserSmokeHandSkeletonDebugPoint {
  id: 'wrist' | 'palm_center' | 'thumb_tip' | 'index_tip' | 'pinky_base' | 'pinky_tip';
  label: string;
  point: BrowserSmokePoint;
  landmarkIndex: number | null;
  role: 'context' | 'load_bearing';
}

export interface BrowserSmokeHandSkeleton {
  schema: 'lerms.glove-well-hand-skeleton-overlay.v0';
  visible: boolean;
  landmarkCount: number;
  landmarks: BrowserSmokePoint[];
  segments: BrowserSmokeHandSkeletonSegment[];
  debugPoints: BrowserSmokeHandSkeletonDebugPoint[];
  aimVector: {
    origin: BrowserSmokePoint;
    direction: BrowserSmokePoint;
  } | null;
}

export interface BrowserSmokeState {
  schema: 'lerms.glove-well-browser-smoke-state.v0';
  authority: BrowserSmokeAuthority;
  statusCode: BrowserSmokeStatusCode;
  phase: BrowserSmokePhase;
  source: {
    endpoint: string;
    sequence: number | null;
    frameId: string | null;
    effectiveRoute: string | null;
    backend: string | null;
    modelRoute: string | null;
    ageMs: number | null;
    cameraAgeMs: number | null;
    webcamSynthetic: boolean | null;
  };
  hand: {
    palmCenter: BrowserSmokePoint | null;
    thumbTip: BrowserSmokePoint | null;
    indexTip: BrowserSmokePoint | null;
    pinkyTip: BrowserSmokePoint | null;
    pinkyBase: BrowserSmokePoint | null;
    pinchDistance: number | null;
    pinchActive: boolean;
  };
  aim: BrowserSmokeAim;
  handSkeleton: BrowserSmokeHandSkeleton;
  goin: BrowserSmokeGoin;
  goins: BrowserSmokeGoin[];
  releaseCount: number;
  downgrades: string[];
  lastError: string | null;
}

export interface BuildBrowserSmokeStateOptions {
  previous: BrowserSmokeState | null;
  cache: BrowserSmokeCacheSnapshot | null;
  nowMs: number;
  endpoint?: string;
  maxCacheAgeMs?: number;
}

const DEFAULT_ENDPOINT = '/kaminos-hand-control-sidecar-event';

export function buildInitialGloveWellBrowserSmokeState(endpoint = DEFAULT_ENDPOINT): BrowserSmokeState {
  const goin: BrowserSmokeGoin = {
    id: 'primed-goin-001',
    state: 'held',
    position: { x: 0.5, y: 0.5 },
    velocity: { x: 0, y: 0 },
    desireRadius: 0
  };
  return {
    schema: 'lerms.glove-well-browser-smoke-state.v0',
    authority: 'stale_hold',
    statusCode: 'waiting',
    phase: 'waiting',
    source: {
      endpoint,
      sequence: null,
      frameId: null,
      effectiveRoute: null,
      backend: null,
      modelRoute: null,
      ageMs: null,
      cameraAgeMs: null,
      webcamSynthetic: null
    },
    hand: {
      palmCenter: null,
      thumbTip: null,
      indexTip: null,
      pinkyTip: null,
      pinkyBase: null,
      pinchDistance: null,
      pinchActive: false
    },
    aim: {
      active: false,
      origin: { x: 0.5, y: 0.5 },
      direction: { x: 0.7, y: -0.45 },
      arcSamples: buildArcSamples({ x: 0.5, y: 0.5 }, normalize({ x: 0.7, y: -0.45 }))
    },
    handSkeleton: buildEmptyHandSkeleton(),
    goin,
    goins: [goin],
    releaseCount: 0,
    downgrades: ['waiting_for_kaminos_event_cache'],
    lastError: null
  };
}

export function buildGloveWellBrowserSmokeState({
  previous,
  cache,
  nowMs,
  endpoint = DEFAULT_ENDPOINT,
  maxCacheAgeMs = 180
}: BuildBrowserSmokeStateOptions): BrowserSmokeState {
  const prior = previous ?? buildInitialGloveWellBrowserSmokeState(endpoint);
  const advancedGoins = advanceGoins(worldGoins(prior), nowMs);
  const activeGoin = pickActiveGoin(advancedGoins, prior.goin);

  if (!cache) {
    return degraded(prior, advancedGoins, endpoint, 'stale_hold', 'empty', ['kaminos_event_cache_missing'], 'missing Kaminos cache snapshot');
  }

  if (cache.status !== 'stored' || !cache.event) {
    if (cache.status === 'empty' && prior.source.sequence !== null && cache.sequence === prior.source.sequence) {
      return {
        ...prior,
        statusCode: prior.statusCode === 'tracking' ? 'no_new_packet' : prior.statusCode,
        source: {
          ...prior.source,
          endpoint,
          sequence: cache.sequence
        },
        goin: activeGoin,
        goins: advancedGoins,
        downgrades: prior.statusCode === 'tracking' ? ['kaminos_event_cache_no_new_packet'] : prior.downgrades,
        lastError: prior.statusCode === 'tracking' ? 'waiting for a newer Kaminos hand-control packet' : prior.lastError
      };
    }
    return degraded(withSequence(prior, cache, endpoint), advancedGoins, endpoint, 'stale_hold', 'empty', ['kaminos_event_cache_empty'], 'Kaminos event cache is empty');
  }

  if (prior.source.sequence !== null && cache.sequence <= prior.source.sequence && prior.statusCode !== 'empty') {
    return degraded(withSequence(prior, cache, endpoint), advancedGoins, endpoint, 'stale_hold', 'replay', ['kaminos_event_cache_non_monotonic'], 'Kaminos event cache sequence did not advance');
  }

  if (cache.age_ms === null || cache.age_ms > maxCacheAgeMs) {
    return degraded(withSequence(prior, cache, endpoint), advancedGoins, endpoint, 'stale_hold', 'stale', ['kaminos_event_cache_stale'], 'Kaminos event cache is stale');
  }

  const event = cache.event;
  const effectiveRoute = event.debug?.evidence_route ?? event.effective_route ?? event.source_backend ?? null;
  const backend = event.source_backend ?? null;
  const sourceBase = {
    endpoint,
    sequence: cache.sequence,
    frameId: event.frame_id ?? null,
    effectiveRoute,
    backend,
    modelRoute: event.debug?.model_route ?? null,
    ageMs: cache.age_ms,
    cameraAgeMs: finite(event.debug?.telemetry?.frame_age_ms) ?? cache.age_ms,
    webcamSynthetic: event.webcam_frame?.synthetic ?? null
  };

  if (event.schema !== 'perceptasia.hand-control.v0') {
    return degraded({ ...prior, source: sourceBase }, advancedGoins, endpoint, 'invalid', 'invalid', ['kaminos_event_cache_wrong_schema'], 'Kaminos event schema is not perceptasia.hand-control.v0');
  }

  if (backend !== BROWSER_SMOKE_LIVE_BACKEND || effectiveRoute !== BROWSER_SMOKE_LIVE_BACKEND) {
    return degraded({ ...prior, source: sourceBase }, advancedGoins, endpoint, 'fallback', 'fallback', ['kaminos_event_cache_non_live_route'], 'Kaminos event is not from the live WiLoR-MLX route');
  }

  if (event.webcam_frame?.visible !== true || event.webcam_frame.synthetic !== false) {
    return degraded({ ...prior, source: sourceBase }, advancedGoins, endpoint, 'synthetic_fixture', 'synthetic', ['kaminos_event_cache_synthetic_webcam'], 'Kaminos event webcam frame is synthetic or not visible');
  }

  const landmarks = event.landmarks_2d ?? [];
  if (landmarks.length < 21) {
    return degraded({ ...prior, source: sourceBase }, advancedGoins, endpoint, 'invalid', 'invalid', ['kaminos_event_cache_missing_landmarks'], 'Kaminos event has fewer than 21 landmarks');
  }

  const wrist = landmarks[0];
  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];
  const pinkyBase = landmarks[17];
  const pinkyTip = landmarks[20];
  const palmCenter = event.palm_center ?? average([landmarks[5], landmarks[9], landmarks[13], landmarks[17]]);
  const pinchDistance = distance(thumbTip, indexTip);
  const pinchActive = pinchDistance <= 0.07;
  const rawPinkyDirection = subtract(pinkyTip, pinkyBase);
  const pinkyDirection = normalize({ x: -rawPinkyDirection.x, y: rawPinkyDirection.y });
  const pinkyLength = distance(pinkyTip, pinkyBase);
  const referenceLength = Math.max(0.08, distance(wrist, landmarks[9]));
  const pinkyActive = pinkyLength / referenceLength >= 0.7;
  const skeletonBase = buildHandSkeleton({
    landmarks,
    palmCenter,
    aimVector: null
  });

  let phase: BrowserSmokePhase = 'waiting';
  let aim = prior.aim;
  let handSkeleton = skeletonBase;
  let goin = activeGoin;
  let goins = advancedGoins;
  let releaseCount = prior.releaseCount;

  if (pinchActive && (prior.phase === 'priming' || prior.phase === 'aiming') && pinkyActive) {
    phase = 'aiming';
    aim = {
      active: true,
      origin: pinkyTip,
      direction: pinkyDirection,
      arcSamples: buildArcSamples(pinkyTip, pinkyDirection)
    };
    handSkeleton = buildHandSkeleton({
      landmarks,
      palmCenter,
      aimVector: {
        origin: aim.origin,
        direction: aim.direction
      }
    });
    goin = buildHeldGoin(palmCenter, releaseCount + 1);
    goins = [...advancedGoins.filter((candidate) => candidate.state !== 'held'), goin];
  } else if (pinchActive) {
    phase = 'priming';
    goin = buildHeldGoin(palmCenter, releaseCount + 1);
    goins = [...advancedGoins.filter((candidate) => candidate.state !== 'held'), goin];
  } else if (!pinchActive && (prior.phase === 'aiming' || prior.phase === 'released')) {
    phase = 'released';
    releaseCount = prior.phase === 'released' ? prior.releaseCount : prior.releaseCount + 1;
    if (prior.phase === 'released') {
      goin = pickRollingGoin(advancedGoins, activeGoin);
      goins = advancedGoins;
    } else {
      goin = {
        id: `launched-goin-${String(releaseCount).padStart(3, '0')}`,
        state: 'rolling',
        position: aim.origin,
        velocity: {
          x: round3(aim.direction.x * 0.022),
          y: round3(aim.direction.y * 0.022)
        },
        desireRadius: 0.18
      };
      goins = [...advancedGoins.filter((candidate) => candidate.state !== 'held'), goin];
    }
  } else {
    phase = 'waiting';
  }

  return {
    schema: 'lerms.glove-well-browser-smoke-state.v0',
    authority: 'live_simulation',
    statusCode: 'tracking',
    phase,
    source: sourceBase,
    hand: {
      palmCenter,
      thumbTip,
      indexTip,
      pinkyTip,
      pinkyBase,
      pinchDistance: round3(pinchDistance),
      pinchActive
    },
    aim,
    handSkeleton,
    goin,
    goins,
    releaseCount,
    downgrades: [],
    lastError: null
  };
}

function buildHeldGoin(position: BrowserSmokePoint, ordinal: number): BrowserSmokeGoin {
  return {
    id: `primed-goin-${String(ordinal).padStart(3, '0')}`,
    state: 'held',
    position,
    velocity: { x: 0, y: 0 },
    desireRadius: 0
  };
}

function buildEmptyHandSkeleton(): BrowserSmokeHandSkeleton {
  return {
    schema: 'lerms.glove-well-hand-skeleton-overlay.v0',
    visible: false,
    landmarkCount: 0,
    landmarks: [],
    segments: [],
    debugPoints: [],
    aimVector: null
  };
}

function buildHandSkeleton({
  landmarks,
  palmCenter,
  aimVector
}: {
  landmarks: BrowserSmokePoint[];
  palmCenter: BrowserSmokePoint;
  aimVector: BrowserSmokeHandSkeleton['aimVector'];
}): BrowserSmokeHandSkeleton {
  const segmentSpecs: Array<{ from: number; to: number; group: BrowserSmokeHandSkeletonSegment['group'] }> = [
    { from: 0, to: 5, group: 'palm' },
    { from: 5, to: 9, group: 'palm' },
    { from: 9, to: 13, group: 'palm' },
    { from: 13, to: 17, group: 'palm' },
    { from: 0, to: 17, group: 'palm' },
    { from: 0, to: 1, group: 'thumb' },
    { from: 1, to: 2, group: 'thumb' },
    { from: 2, to: 3, group: 'thumb' },
    { from: 3, to: 4, group: 'thumb' },
    { from: 5, to: 6, group: 'index' },
    { from: 6, to: 7, group: 'index' },
    { from: 7, to: 8, group: 'index' },
    { from: 9, to: 10, group: 'middle' },
    { from: 10, to: 11, group: 'middle' },
    { from: 11, to: 12, group: 'middle' },
    { from: 13, to: 14, group: 'ring' },
    { from: 14, to: 15, group: 'ring' },
    { from: 15, to: 16, group: 'ring' },
    { from: 17, to: 18, group: 'pinky' },
    { from: 18, to: 19, group: 'pinky' },
    { from: 19, to: 20, group: 'pinky' }
  ];

  const segments = segmentSpecs
    .filter((segment) => landmarks[segment.from] && landmarks[segment.to])
    .map((segment) => ({
      ...segment,
      start: landmarks[segment.from],
      end: landmarks[segment.to]
    }));

  return {
    schema: 'lerms.glove-well-hand-skeleton-overlay.v0',
    visible: true,
    landmarkCount: landmarks.length,
    landmarks: landmarks.map((point) => ({ x: round3(point.x), y: round3(point.y) })),
    segments,
    debugPoints: [
      { id: 'wrist', label: 'WR', point: landmarks[0], landmarkIndex: 0, role: 'context' },
      { id: 'palm_center', label: 'PALM', point: palmCenter, landmarkIndex: null, role: 'load_bearing' },
      { id: 'thumb_tip', label: 'TH', point: landmarks[4], landmarkIndex: 4, role: 'load_bearing' },
      { id: 'index_tip', label: 'IX', point: landmarks[8], landmarkIndex: 8, role: 'load_bearing' },
      { id: 'pinky_base', label: 'PB', point: landmarks[17], landmarkIndex: 17, role: 'load_bearing' },
      { id: 'pinky_tip', label: 'PK', point: landmarks[20], landmarkIndex: 20, role: 'load_bearing' }
    ],
    aimVector
  };
}

function degraded(
  prior: BrowserSmokeState,
  goins: BrowserSmokeGoin[],
  endpoint: string,
  authority: BrowserSmokeAuthority,
  statusCode: BrowserSmokeStatusCode,
  downgrades: string[],
  lastError: string
): BrowserSmokeState {
  return {
    ...prior,
    authority,
    statusCode,
    source: {
      ...prior.source,
      endpoint
    },
    goin: pickActiveGoin(goins, prior.goin),
    goins,
    downgrades,
    lastError
  };
}

function withSequence(prior: BrowserSmokeState, cache: BrowserSmokeCacheSnapshot, endpoint: string): BrowserSmokeState {
  return {
    ...prior,
    source: {
      ...prior.source,
      endpoint,
      sequence: cache.sequence,
      ageMs: cache.age_ms
    }
  };
}

function advanceGoin(goin: BrowserSmokeGoin, nowMs: number): BrowserSmokeGoin {
  void nowMs;
  if (goin.state !== 'rolling') return goin;
  const nextVelocity = {
    x: round3(goin.velocity.x * 0.985),
    y: round3(goin.velocity.y * 0.985 + 0.0009)
  };
  const nextPosition = {
    x: round3(clamp(goin.position.x + nextVelocity.x, 0.04, 0.96)),
    y: round3(clamp(goin.position.y + nextVelocity.y, 0.08, 0.9))
  };
  const speed = Math.hypot(nextVelocity.x, nextVelocity.y);
  return {
    ...goin,
    state: speed < 0.002 ? 'settled' : 'rolling',
    position: nextPosition,
    velocity: nextVelocity,
    desireRadius: round3(Math.max(0.08, goin.desireRadius * 0.995))
  };
}

function advanceGoins(goins: BrowserSmokeGoin[], nowMs: number): BrowserSmokeGoin[] {
  return goins.map((goin) => advanceGoin(goin, nowMs));
}

function worldGoins(state: BrowserSmokeState): BrowserSmokeGoin[] {
  const goins = state.goins?.length ? state.goins : [state.goin];
  const seen = new Set<string>();
  return goins.filter((goin) => {
    if (seen.has(goin.id)) return false;
    seen.add(goin.id);
    return true;
  });
}

function pickActiveGoin(goins: BrowserSmokeGoin[], fallback: BrowserSmokeGoin): BrowserSmokeGoin {
  return goins.find((goin) => goin.state === 'held') ?? pickRollingGoin(goins, fallback);
}

function pickRollingGoin(goins: BrowserSmokeGoin[], fallback: BrowserSmokeGoin): BrowserSmokeGoin {
  return goins.find((goin) => goin.state === 'rolling') ?? goins.at(-1) ?? fallback;
}

function buildArcSamples(origin: BrowserSmokePoint, direction: BrowserSmokePoint): Array<BrowserSmokePoint & { t: number }> {
  return Array.from({ length: 7 }, (_, index) => {
    const t = (index + 1) / 7;
    return {
      t: round3(t),
      x: round3(clamp(origin.x + direction.x * t * 0.34, 0.03, 0.97)),
      y: round3(clamp(origin.y + direction.y * t * 0.34 + t * t * 0.09, 0.04, 0.94))
    };
  });
}

function average(points: readonly BrowserSmokePoint[]): BrowserSmokePoint {
  return {
    x: round3(points.reduce((sum, point) => sum + point.x, 0) / points.length),
    y: round3(points.reduce((sum, point) => sum + point.y, 0) / points.length)
  };
}

function subtract(a: BrowserSmokePoint, b: BrowserSmokePoint): BrowserSmokePoint {
  return {
    x: a.x - b.x,
    y: a.y - b.y
  };
}

function normalize(point: BrowserSmokePoint): BrowserSmokePoint {
  const length = Math.hypot(point.x, point.y) || 1;
  return {
    x: round3(point.x / length),
    y: round3(point.y / length)
  };
}

function distance(a: BrowserSmokePoint, b: BrowserSmokePoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function finite(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}
