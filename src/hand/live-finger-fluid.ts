import {
  LIVE_HAND_HYBRID_ROUTE,
  LIVE_HAND_ROUTE,
  type ManoDisplayTransform,
} from './live-hand-contract.js';

export const LIVE_FINGER_FLUID_ADAPTER_CONTRACT = 'hand-state-distal-axis-full-extension-emitters-v1' as const;
export const KAMINOS_FLUID_REVISION = '71d09e78fbf16c9edecde3ea72a82ba17b656bf2' as const;
export const FULL_EXTENSION_THRESHOLD = 0.86 as const;
export const LERMS_LIVE_FLUID_PARTICLE_COUNT = 2_400 as const;
export const PINNED_KAMINOS_LIVE_INLET_RESIDENCE_SECONDS = 1.65 as const;
export const PINNED_KAMINOS_LIVE_INLET_MAXIMUM_TRAVEL_DISTANCE = 2.4 as const;
export const LIVE_FLUID_CAMERA = Object.freeze({
  fovRadians: Math.PI / 3.15,
  yaw: 0,
  pitch: 0,
  distance: 6.2,
  target: Object.freeze([0, 0, -0.2] as const),
});

const LIVE_HAND_CAMERA = Object.freeze({
  fovDegrees: 32,
  position: Object.freeze([0, 0.05, 5.1] as const),
});

const MAX_LIVE_SAMPLE_AGE_MS = 750;
const LIVE_HAND_FLUID_ACCEPTED_ROUTES = new Set<string>([LIVE_HAND_ROUTE, LIVE_HAND_HYBRID_ROUTE]);

const FINGERS = Object.freeze([
  { id: 'thumb', joints: [1, 2, 3, 4] as const, chemistry: 'splash' },
  { id: 'index', joints: [5, 6, 7, 8] as const, chemistry: 'knockback' },
  { id: 'middle', joints: [9, 10, 11, 12] as const, chemistry: 'pooling' },
  { id: 'ring', joints: [13, 14, 15, 16] as const, chemistry: 'weird' },
  { id: 'pinky', joints: [17, 18, 19, 20] as const, chemistry: 'weird' },
]);

type Vec3 = readonly [number, number, number];

export interface LiveFingerFluidEconomicsOptions {
  requestedParticleCount?: number;
  requestedActiveParticleBudget?: number;
  sourceFluxParticlesPerSecond?: number;
  opticalDensityScale?: number;
  reconstructionRadiusScale?: number;
  lifetimeSeconds?: number;
}

export interface LiveFingerFluidEconomics {
  requestedParticleCount: number;
  effectiveParticleCount: number;
  requestedActiveParticleBudget: number;
  effectiveActiveParticleBudget: null;
  sourceFluxParticlesPerSecond: number;
  opticalDensityScale: number;
  reconstructionRadiusScale: number;
  lifetimeSeconds: number;
  defaultSubstitution: boolean;
  fallbackActive: boolean;
  fallbackReason: string | null;
}

export interface LiveFingerFluidJuiceBudget {
  schema: 'lerms.live-finger-fluid-juice-budget.v0';
  requestedBudget: number;
  effectiveBudget: number;
  zone: 'economy' | 'full' | 'redline';
  economics: Required<LiveFingerFluidEconomicsOptions>;
  defaultSubstitution: boolean;
  fallbackActive: boolean;
  fallbackReason: string | null;
}

export interface PinnedKaminosLiveInletRuntimeAuthority {
  schema: 'lerms.live-finger-fluid-runtime-authority.v0';
  pinnedRevision: typeof KAMINOS_FLUID_REVISION;
  complete: boolean;
  authority:
    | 'pinned_runtime_receipt'
    | 'missing_runtime_receipt'
    | 'stale_or_mismatched_runtime_receipt'
    | 'malformed_runtime_receipt'
    | 'invalid_requested_economics';
  requested: LiveFingerFluidEconomics;
  effective: {
    packetId: string | null;
    sourceRoute: string | null;
    particleCount: number | null;
    activeParticleBudget: null;
    expectedParticleReleaseRate: number | null;
    opticalDensityScale: null;
    reconstructionRadiusScale: null;
    residenceSeconds: typeof PINNED_KAMINOS_LIVE_INLET_RESIDENCE_SECONDS;
    maximumTravelDistance: typeof PINNED_KAMINOS_LIVE_INLET_MAXIMUM_TRAVEL_DISTANCE;
    inlets: readonly {
      id: string;
      radius: number;
      maximumSpeed: number;
      active: boolean;
    }[];
  };
  support: {
    particleCount: 'solver_initialization_receipt';
    activeParticleBudget: 'unsupported_by_pinned_runtime';
    sourceFlux: 'derived_from_aperture_and_speed';
    opticalDensity: 'unsupported_metadata_coupled_to_speed';
    reconstructionRadius: 'unsupported_metadata_coupled_to_aperture';
    lifetime: 'unsupported_metadata_hard_recycle';
  };
  fallbackActive: boolean;
  fallbackReason: string | null;
}

export interface LiveFingerFluidRouteResolution {
  provided: boolean;
  economics: LiveFingerFluidEconomics | null;
  error: string | null;
}

export interface LiveFingerFluidFrontierProfile extends Omit<Required<LiveFingerFluidEconomicsOptions>, 'requestedParticleCount'> {
  label: string;
}

export interface LiveFingerFluidFrame {
  eventSequence: number;
  frameId: string;
  captureTimestampMs: number;
  effectiveRoute: string;
  confidence: number;
  handedness: string;
  keypoints3d: readonly Vec3[];
  manoTransform: ManoDisplayTransform;
  viewport: { width: number; height: number };
  nowMs?: number;
}

export interface LiveFingerFluidEmitter {
  id: string;
  origin_world: Vec3;
  aim_world: Vec3;
  extension: number;
  emission_state: 'jet' | 'off';
  chemistry: string;
  radius: number;
  strength: number;
  source_flux_particles_per_second: number;
  optical_density_scale: number;
  reconstruction_radius_scale: number;
  lifetime_seconds: number;
  active: boolean;
}

export interface LiveFingerFluidPacket {
  packet_id: string;
  route_identity: string;
  adapter_contract: typeof LIVE_FINGER_FLUID_ADAPTER_CONTRACT;
  source_route: string;
  source_frame_id: string;
  timestamp_ms: number;
  sample_age_ms: number;
  simulation_authority: 'live_simulation' | 'invalid';
  authority: { simulation_safe: boolean; stale: boolean; reason: string | null };
  economics: LiveFingerFluidEconomics;
  emitters: LiveFingerFluidEmitter[];
}

export interface LiveFingerFluidFrontierSweepRow {
  profileLabel: string;
  fingerCase: 'one-finger' | 'five-finger';
  activeEmitterCount: number;
  requested: LiveFingerFluidEconomics;
  authority: {
    staleOrFallback: boolean;
    blankOrPartialOutput: boolean;
  };
  estimatedVisibleMaterialScore: number;
  estimatedSolverWorkScore: number;
}

export interface LiveFingerFluidFrontierSweep {
  schema: 'lerms.live-finger-fluid-frontier-sweep.v0';
  requestedParticleCount: number;
  rows: LiveFingerFluidFrontierSweepRow[];
}

export function isLiveFingerFluidPacketFresh(
  packet: LiveFingerFluidPacket,
  nowMs = Date.now(),
): boolean {
  return packet.simulation_authority === 'live_simulation'
    && packet.authority.simulation_safe
    && !packet.authority.stale
    && Math.max(0, nowMs - packet.timestamp_ms) <= MAX_LIVE_SAMPLE_AGE_MS;
}

function clamp(value: number, minimum = 0, maximum = 1): number {
  return Math.max(minimum, Math.min(maximum, Number.isFinite(value) ? value : minimum));
}

function clampNumber(value: number | undefined, fallback: number, minimum: number, maximum: number): {
  value: number;
  substituted: boolean;
} {
  if (!Number.isFinite(value)) return { value: fallback, substituted: value !== undefined };
  const finiteValue = value as number;
  return {
    value: Math.max(minimum, Math.min(maximum, finiteValue)),
    substituted: finiteValue < minimum || finiteValue > maximum,
  };
}

const LIVE_FLUID_JUICE_ANCHORS = Object.freeze([
  {
    budget: 0,
    economics: {
      requestedParticleCount: LERMS_LIVE_FLUID_PARTICLE_COUNT,
      requestedActiveParticleBudget: 120,
      sourceFluxParticlesPerSecond: 60,
      opticalDensityScale: 0.5,
      reconstructionRadiusScale: 0.7,
      lifetimeSeconds: 1,
    },
  },
  {
    budget: 50,
    economics: {
      requestedParticleCount: LERMS_LIVE_FLUID_PARTICLE_COUNT,
      requestedActiveParticleBudget: 720,
      sourceFluxParticlesPerSecond: 360,
      opticalDensityScale: 1.7,
      reconstructionRadiusScale: 1.6,
      lifetimeSeconds: 6,
    },
  },
  {
    budget: 80,
    economics: {
      requestedParticleCount: LERMS_LIVE_FLUID_PARTICLE_COUNT,
      requestedActiveParticleBudget: 1_440,
      sourceFluxParticlesPerSecond: 960,
      opticalDensityScale: 1.7,
      reconstructionRadiusScale: 2.5,
      lifetimeSeconds: 10,
    },
  },
  {
    budget: 100,
    economics: {
      requestedParticleCount: LERMS_LIVE_FLUID_PARTICLE_COUNT,
      requestedActiveParticleBudget: 1_920,
      sourceFluxParticlesPerSecond: 1_440,
      opticalDensityScale: 1.7,
      reconstructionRadiusScale: 2.8,
      lifetimeSeconds: 12,
    },
  },
] as const);

function interpolate(left: number, right: number, amount: number): number {
  return left + (right - left) * amount;
}

function snap(value: number, minimum: number, step: number): number {
  return Number((minimum + Math.round((value - minimum) / step) * step).toFixed(6));
}

export function resolveLiveFingerFluidJuiceBudget(requestedBudget: number): LiveFingerFluidJuiceBudget {
  const valid = Number.isFinite(requestedBudget) && requestedBudget >= 0 && requestedBudget <= 100;
  const effectiveBudget = valid ? requestedBudget : 50;
  const rightIndex = Math.max(
    1,
    LIVE_FLUID_JUICE_ANCHORS.findIndex(anchor => effectiveBudget <= anchor.budget),
  );
  const left = LIVE_FLUID_JUICE_ANCHORS[rightIndex - 1];
  const right = LIVE_FLUID_JUICE_ANCHORS[rightIndex];
  const amount = (effectiveBudget - left.budget) / Math.max(1, right.budget - left.budget);
  const economics = {
    requestedParticleCount: LERMS_LIVE_FLUID_PARTICLE_COUNT,
    requestedActiveParticleBudget: snap(
      interpolate(left.economics.requestedActiveParticleBudget, right.economics.requestedActiveParticleBudget, amount),
      120,
      60,
    ),
    sourceFluxParticlesPerSecond: snap(
      interpolate(left.economics.sourceFluxParticlesPerSecond, right.economics.sourceFluxParticlesPerSecond, amount),
      60,
      20,
    ),
    opticalDensityScale: snap(
      interpolate(left.economics.opticalDensityScale, right.economics.opticalDensityScale, amount),
      0.5,
      0.1,
    ),
    reconstructionRadiusScale: snap(
      interpolate(left.economics.reconstructionRadiusScale, right.economics.reconstructionRadiusScale, amount),
      0.7,
      0.01,
    ),
    lifetimeSeconds: snap(
      interpolate(left.economics.lifetimeSeconds, right.economics.lifetimeSeconds, amount),
      1,
      0.5,
    ),
  };
  return {
    schema: 'lerms.live-finger-fluid-juice-budget.v0',
    requestedBudget,
    effectiveBudget,
    zone: effectiveBudget > 80 ? 'redline' : effectiveBudget >= 50 ? 'full' : 'economy',
    economics,
    defaultSubstitution: !valid,
    fallbackActive: !valid,
    fallbackReason: valid ? null : 'invalid_juice_budget',
  };
}

const LIVE_FLUID_ROUTE_CONTROLS = Object.freeze([
  { query: 'fluid_active', option: 'requestedActiveParticleBudget', minimum: 120, maximum: 1920, step: 60 },
  { query: 'fluid_flux', option: 'sourceFluxParticlesPerSecond', minimum: 60, maximum: 1440, step: 20 },
  { query: 'fluid_optics', option: 'opticalDensityScale', minimum: 0.5, maximum: 5, step: 0.1 },
  { query: 'fluid_radius', option: 'reconstructionRadiusScale', minimum: 0.7, maximum: 3, step: 0.1 },
  { query: 'fluid_lifetime', option: 'lifetimeSeconds', minimum: 1, maximum: 12, step: 0.5 },
] as const);

export function resolveLiveFingerFluidRouteEconomics(
  params: Pick<URLSearchParams, 'get' | 'has'>,
  defaults: Required<LiveFingerFluidEconomicsOptions>,
): LiveFingerFluidRouteResolution {
  const provided = LIVE_FLUID_ROUTE_CONTROLS.some(control => params.has(control.query));
  if (!provided) return { provided: false, economics: null, error: null };

  const options: LiveFingerFluidEconomicsOptions = { ...defaults };
  for (const control of LIVE_FLUID_ROUTE_CONTROLS) {
    if (!params.has(control.query)) continue;
    const raw = params.get(control.query);
    if (raw === null || raw === '') {
      return { provided: true, economics: null, error: `${control.query} must not be empty` };
    }
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) {
      return { provided: true, economics: null, error: `${control.query} must be finite, received ${raw}` };
    }
    if (parsed < control.minimum || parsed > control.maximum) {
      return {
        provided: true,
        economics: null,
        error: `${control.query} must be between ${control.minimum} and ${control.maximum}, received ${raw}`,
      };
    }
    const stepOffset = (parsed - control.minimum) / control.step;
    if (Math.abs(stepOffset - Math.round(stepOffset)) > 1e-8) {
      return {
        provided: true,
        economics: null,
        error: `${control.query} must align to step ${control.step}, received ${raw}`,
      };
    }
    options[control.option] = parsed;
  }

  const economics = normalizeLiveFingerFluidEconomics(options);
  if (economics.fallbackActive) {
    return {
      provided: true,
      economics: null,
      error: `route fluid economics rejected: ${economics.fallbackReason || 'invalid economics'}`,
    };
  }
  return { provided: true, economics, error: null };
}

export function normalizeLiveFingerFluidEconomics(
  options: LiveFingerFluidEconomicsOptions = {},
): LiveFingerFluidEconomics {
  const requestedParticleCount = clampNumber(options.requestedParticleCount, LERMS_LIVE_FLUID_PARTICLE_COUNT, 1, 196_608);
  const requestedActiveParticleBudget = clampNumber(
    options.requestedActiveParticleBudget,
    Math.round(requestedParticleCount.value * 0.18),
    1,
    requestedParticleCount.value,
  );
  const sourceFluxParticlesPerSecond = clampNumber(options.sourceFluxParticlesPerSecond, 180, 0, 24_000);
  const opticalDensityScale = clampNumber(options.opticalDensityScale, 1, 0.05, 12);
  const reconstructionRadiusScale = clampNumber(options.reconstructionRadiusScale, 1, 0.1, 8);
  const lifetimeSeconds = clampNumber(options.lifetimeSeconds, 4, 0.1, 30);
  const defaultSubstitution = [
    requestedParticleCount,
    requestedActiveParticleBudget,
    sourceFluxParticlesPerSecond,
    opticalDensityScale,
    reconstructionRadiusScale,
    lifetimeSeconds,
  ].some(result => result.substituted);
  return {
    requestedParticleCount: options.requestedParticleCount ?? LERMS_LIVE_FLUID_PARTICLE_COUNT,
    effectiveParticleCount: requestedParticleCount.value,
    requestedActiveParticleBudget: options.requestedActiveParticleBudget ?? Math.round(requestedParticleCount.value * 0.18),
    effectiveActiveParticleBudget: null,
    sourceFluxParticlesPerSecond: sourceFluxParticlesPerSecond.value,
    opticalDensityScale: opticalDensityScale.value,
    reconstructionRadiusScale: reconstructionRadiusScale.value,
    lifetimeSeconds: lifetimeSeconds.value,
    defaultSubstitution,
    fallbackActive: defaultSubstitution,
    fallbackReason: defaultSubstitution ? 'invalid_fluid_economics_clamped' : null,
  };
}

export function createPinnedKaminosLiveInletRuntimeAuthority(
  economics: LiveFingerFluidEconomics,
  runtime: {
    effectiveParticleCount: number | null;
    expectedPacketId?: unknown;
    expectedSourceRoute?: unknown;
    packetAuthority?: {
      simulation_safe?: unknown;
      stale?: unknown;
    } | null;
    packetEconomics?: LiveFingerFluidEconomics | null;
    receipt?: {
      packetId?: unknown;
      sourceRoute?: unknown;
      expectedParticleReleaseRate?: unknown;
    } | null;
    liveInlets: {
      packetId?: unknown;
      sourceRoute?: unknown;
      expectedParticleReleaseRate?: unknown;
      inlets?: unknown;
    } | null;
  },
): PinnedKaminosLiveInletRuntimeAuthority {
  const effectiveParticleCount = Number.isSafeInteger(runtime.effectiveParticleCount)
    && Number(runtime.effectiveParticleCount) > 0
    ? Number(runtime.effectiveParticleCount)
    : null;
  const packetId = typeof runtime.liveInlets?.packetId === 'string' && runtime.liveInlets.packetId.length > 0
    ? runtime.liveInlets.packetId
    : null;
  const sourceRoute = typeof runtime.liveInlets?.sourceRoute === 'string' && runtime.liveInlets.sourceRoute.length > 0
    ? runtime.liveInlets.sourceRoute
    : null;
  const liveReleaseValue = runtime.liveInlets?.expectedParticleReleaseRate;
  const expectedParticleReleaseRate = typeof liveReleaseValue === 'number'
    && Number.isFinite(liveReleaseValue)
    && liveReleaseValue >= 0
    ? liveReleaseValue
    : null;
  const inlets = Array.isArray(runtime.liveInlets?.inlets)
    ? runtime.liveInlets.inlets.flatMap((value): PinnedKaminosLiveInletRuntimeAuthority['effective']['inlets'][number][] => {
      if (!value || typeof value !== 'object') return [];
      const inlet = value as Record<string, unknown>;
      if (typeof inlet.id !== 'string'
        || inlet.id.length === 0
        || !Number.isFinite(inlet.radius)
        || Number(inlet.radius) <= 0
        || !Number.isFinite(inlet.maximumSpeed)
        || Number(inlet.maximumSpeed) < 0
        || typeof inlet.active !== 'boolean') return [];
      return [{
        id: inlet.id,
        radius: Number(inlet.radius),
        maximumSpeed: Number(inlet.maximumSpeed),
        active: inlet.active,
      }];
    })
    : [];
  const expectedPacketId = typeof runtime.expectedPacketId === 'string' && runtime.expectedPacketId.length > 0
    ? runtime.expectedPacketId
    : null;
  const expectedSourceRoute = typeof runtime.expectedSourceRoute === 'string' && runtime.expectedSourceRoute.length > 0
    ? runtime.expectedSourceRoute
    : null;
  const receiptPacketId = typeof runtime.receipt?.packetId === 'string' && runtime.receipt.packetId.length > 0
    ? runtime.receipt.packetId
    : null;
  const receiptSourceRoute = typeof runtime.receipt?.sourceRoute === 'string' && runtime.receipt.sourceRoute.length > 0
    ? runtime.receipt.sourceRoute
    : null;
  const receiptReleaseValue = runtime.receipt?.expectedParticleReleaseRate;
  const receiptReleaseRate = typeof receiptReleaseValue === 'number' ? receiptReleaseValue : Number.NaN;
  const packetEconomicsMatch = runtime.packetEconomics !== null
    && runtime.packetEconomics !== undefined
    && [
      'requestedParticleCount',
      'effectiveParticleCount',
      'requestedActiveParticleBudget',
      'sourceFluxParticlesPerSecond',
      'opticalDensityScale',
      'reconstructionRadiusScale',
      'lifetimeSeconds',
    ].every(key => runtime.packetEconomics?.[key as keyof LiveFingerFluidEconomics] === economics[key as keyof LiveFingerFluidEconomics]);
  const evidencePresent = effectiveParticleCount !== null
    && runtime.liveInlets !== null
    && runtime.receipt !== null
    && runtime.receipt !== undefined
    && expectedPacketId !== null
    && expectedSourceRoute !== null;
  const malformed = evidencePresent && (
    packetId === null
    || sourceRoute === null
    || receiptPacketId === null
    || receiptSourceRoute === null
    || expectedParticleReleaseRate === null
    || !Number.isFinite(receiptReleaseRate)
    || receiptReleaseRate < 0
    || !Array.isArray(runtime.liveInlets?.inlets)
    || inlets.length !== runtime.liveInlets?.inlets?.length
  );
  const identityMatch = !malformed
    && packetId === expectedPacketId
    && packetId === receiptPacketId
    && sourceRoute === expectedSourceRoute
    && sourceRoute === receiptSourceRoute
    && expectedParticleReleaseRate === receiptReleaseRate
    && packetEconomicsMatch
    && runtime.packetAuthority?.simulation_safe === true
    && runtime.packetAuthority?.stale === false;
  const complete = !economics.fallbackActive && evidencePresent && !malformed && identityMatch;
  const authority = economics.fallbackActive
    ? 'invalid_requested_economics'
    : !evidencePresent
      ? 'missing_runtime_receipt'
      : malformed
        ? 'malformed_runtime_receipt'
        : complete
          ? 'pinned_runtime_receipt'
          : 'stale_or_mismatched_runtime_receipt';
  return {
    schema: 'lerms.live-finger-fluid-runtime-authority.v0',
    pinnedRevision: KAMINOS_FLUID_REVISION,
    complete,
    authority,
    requested: economics,
    effective: {
      packetId,
      sourceRoute,
      particleCount: effectiveParticleCount,
      activeParticleBudget: null,
      expectedParticleReleaseRate,
      opticalDensityScale: null,
      reconstructionRadiusScale: null,
      residenceSeconds: PINNED_KAMINOS_LIVE_INLET_RESIDENCE_SECONDS,
      maximumTravelDistance: PINNED_KAMINOS_LIVE_INLET_MAXIMUM_TRAVEL_DISTANCE,
      inlets,
    },
    support: {
      particleCount: 'solver_initialization_receipt',
      activeParticleBudget: 'unsupported_by_pinned_runtime',
      sourceFlux: 'derived_from_aperture_and_speed',
      opticalDensity: 'unsupported_metadata_coupled_to_speed',
      reconstructionRadius: 'unsupported_metadata_coupled_to_aperture',
      lifetime: 'unsupported_metadata_hard_recycle',
    },
    fallbackActive: !complete,
    fallbackReason: complete ? null : authority,
  };
}

function subtract(left: Vec3, right: Vec3): Vec3 {
  return [left[0] - right[0], left[1] - right[1], left[2] - right[2]];
}

function length3(value: Vec3): number {
  return Math.hypot(value[0], value[1], value[2]);
}

function normalize3(value: Vec3): Vec3 {
  const length = length3(value);
  return length > 1e-6
    ? [value[0] / length, value[1] / length, value[2] / length]
    : [0, 0.35, 0.94];
}

function cosine(left: Vec3, right: Vec3): number {
  const denominator = length3(left) * length3(right);
  return denominator > 1e-6
    ? clamp((left[0] * right[0] + left[1] * right[1] + left[2] * right[2]) / denominator, -1, 1)
    : -1;
}

function displayPoint(point: Vec3, transform: ManoDisplayTransform): Vec3 {
  return [
    (point[0] - transform.center[0]) * transform.scale,
    -(point[1] - transform.center[1]) * transform.scale,
    (point[2] - transform.center[2]) * transform.scale,
  ];
}

function fingerExtension(points: readonly Vec3[], joints: readonly [number, number, number, number]): number {
  const chain = joints.map(index => points[index]);
  if (chain.some(point => !point)) return 0;
  const segments = chain.slice(1).map((point, index) => subtract(point, chain[index]));
  const chainLength = segments.reduce((sum, segment) => sum + length3(segment), 0);
  const reach = chainLength > 1e-6 ? length3(subtract(chain[3], chain[0])) / chainLength : 0;
  const straightness = Math.min(cosine(segments[0], segments[1]), cosine(segments[1], segments[2]));
  return clamp(Math.min(clamp((reach - 0.72) / 0.25), clamp((straightness - 0.68) / 0.3)));
}

export function projectDisplayPointToFluidWorld(display: Vec3, viewport: { width: number; height: number }): Vec3 {
  const width = Math.max(1, viewport.width);
  const height = Math.max(1, viewport.height);
  const fluidZ = -0.8 + display[2] * 0.16;
  const handFocalLength = height / (2 * Math.tan((LIVE_HAND_CAMERA.fovDegrees * Math.PI / 180) / 2));
  const handDepth = Math.max(0.01, LIVE_HAND_CAMERA.position[2] - display[2]);
  const screenX = width * 0.5 + display[0] * handFocalLength / handDepth;
  const screenY = height * 0.5 - (display[1] - LIVE_HAND_CAMERA.position[1]) * handFocalLength / handDepth;
  const fluidEyeZ = LIVE_FLUID_CAMERA.target[2] + LIVE_FLUID_CAMERA.distance;
  const fluidDepth = Math.max(0.01, fluidEyeZ - fluidZ);
  const fluidFocalLength = height / (2 * Math.tan(LIVE_FLUID_CAMERA.fovRadians / 2));
  return [
    (screenX - width * 0.5) * fluidDepth / fluidFocalLength,
    -(screenY - height * 0.5) * fluidDepth / fluidFocalLength,
    fluidZ,
  ];
}

export function createLiveFingerFluidEmitterPacket(
  frame: LiveFingerFluidFrame,
  economicsOptions: LiveFingerFluidEconomicsOptions = {},
): LiveFingerFluidPacket {
  const nowMs = frame.nowMs ?? Date.now();
  const sampleAgeMs = Math.max(0, nowMs - frame.captureTimestampMs);
  const stale = sampleAgeMs > MAX_LIVE_SAMPLE_AGE_MS;
  const economics = normalizeLiveFingerFluidEconomics(economicsOptions);
  const simulationSafe = LIVE_HAND_FLUID_ACCEPTED_ROUTES.has(frame.effectiveRoute)
    && frame.confidence > 0
    && frame.keypoints3d.length >= 21
    && !stale;
  const emitterDrafts = FINGERS.map(finger => {
    const distal = frame.keypoints3d[finger.joints[2]];
    const tip = frame.keypoints3d[finger.joints[3]];
    const extension = fingerExtension(frame.keypoints3d, finger.joints);
    const active = simulationSafe && extension >= FULL_EXTENSION_THRESHOLD;
    const originWorld = projectDisplayPointToFluidWorld(displayPoint(tip, frame.manoTransform), frame.viewport);
    const distalWorld = projectDisplayPointToFluidWorld(displayPoint(distal, frame.manoTransform), frame.viewport);
    return {
      id: finger.id,
      origin_world: originWorld,
      aim_world: normalize3(subtract(originWorld, distalWorld)),
      extension,
      emission_state: active ? 'jet' as const : 'off' as const,
      chemistry: finger.chemistry,
      radius: finger.id === 'middle' ? 0.052 : 0.044,
      strength: 1.15,
      active,
    };
  });
  const activeEmitterCount = Math.max(1, emitterDrafts.filter(emitter => emitter.active).length);
  const emitters = emitterDrafts.map(emitter => ({
    ...emitter,
    radius: emitter.radius * economics.reconstructionRadiusScale,
    strength: emitter.strength * economics.opticalDensityScale,
    source_flux_particles_per_second: emitter.active
      ? economics.sourceFluxParticlesPerSecond / activeEmitterCount
      : 0,
    optical_density_scale: economics.opticalDensityScale,
    reconstruction_radius_scale: economics.reconstructionRadiusScale,
    lifetime_seconds: economics.lifetimeSeconds,
  }));
  return {
    packet_id: `lerms-hand-fluid-${frame.eventSequence}`,
    route_identity: frame.effectiveRoute,
    adapter_contract: LIVE_FINGER_FLUID_ADAPTER_CONTRACT,
    source_route: frame.effectiveRoute,
    source_frame_id: frame.frameId,
    timestamp_ms: frame.captureTimestampMs,
    sample_age_ms: sampleAgeMs,
    simulation_authority: simulationSafe ? 'live_simulation' : 'invalid',
    authority: {
      simulation_safe: simulationSafe && !economics.fallbackActive,
      stale,
      reason: simulationSafe
        ? economics.fallbackReason
        : stale ? 'stale_hand_frame' : 'invalid_live_hand_route',
    },
    economics,
    emitters,
  };
}

export function createLiveFingerFluidFrontierSweep({
  requestedParticleCount = LERMS_LIVE_FLUID_PARTICLE_COUNT,
  profiles,
  oneFingerFrame,
  fiveFingerFrame,
}: {
  requestedParticleCount?: number;
  profiles: readonly LiveFingerFluidFrontierProfile[];
  oneFingerFrame: LiveFingerFluidFrame;
  fiveFingerFrame: LiveFingerFluidFrame;
}): LiveFingerFluidFrontierSweep {
  const rows = profiles.flatMap(profile => ([
    ['one-finger', oneFingerFrame] as const,
    ['five-finger', fiveFingerFrame] as const,
  ]).map(([fingerCase, frame]) => {
    const packet = createLiveFingerFluidEmitterPacket(frame, { ...profile, requestedParticleCount });
    const activeEmitterCount = packet.emitters.filter(emitter => emitter.active).length;
    const staleOrFallback = packet.authority.stale || packet.economics.fallbackActive || packet.simulation_authority !== 'live_simulation';
    return {
      profileLabel: profile.label,
      fingerCase,
      activeEmitterCount,
      requested: packet.economics,
      authority: {
        staleOrFallback,
        blankOrPartialOutput: activeEmitterCount <= 0,
      },
      estimatedVisibleMaterialScore: activeEmitterCount
        * packet.economics.opticalDensityScale
        * packet.economics.reconstructionRadiusScale ** 2,
      estimatedSolverWorkScore: packet.economics.effectiveParticleCount,
    };
  }));
  return {
    schema: 'lerms.live-finger-fluid-frontier-sweep.v0',
    requestedParticleCount,
    rows,
  };
}
