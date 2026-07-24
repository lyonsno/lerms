import type { ManoDisplayTransform } from './live-hand-contract.js';

export const LIVE_FINGER_FLUID_ADAPTER_CONTRACT = 'hand-state-distal-axis-full-extension-emitters-v1' as const;
export const KAMINOS_FLUID_REVISION = '71d09e78fbf16c9edecde3ea72a82ba17b656bf2' as const;
export const FULL_EXTENSION_THRESHOLD = 0.86 as const;
export const LERMS_LIVE_FLUID_PARTICLE_COUNT = 2_400 as const;
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
  effectiveActiveParticleBudget: number;
  sourceFluxParticlesPerSecond: number;
  opticalDensityScale: number;
  reconstructionRadiusScale: number;
  lifetimeSeconds: number;
  defaultSubstitution: boolean;
  fallbackActive: boolean;
  fallbackReason: string | null;
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
    effectiveActiveParticleBudget: requestedActiveParticleBudget.value,
    sourceFluxParticlesPerSecond: sourceFluxParticlesPerSecond.value,
    opticalDensityScale: opticalDensityScale.value,
    reconstructionRadiusScale: reconstructionRadiusScale.value,
    lifetimeSeconds: lifetimeSeconds.value,
    defaultSubstitution,
    fallbackActive: defaultSubstitution,
    fallbackReason: defaultSubstitution ? 'invalid_fluid_economics_clamped' : null,
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
  const simulationSafe = frame.effectiveRoute === 'native_wilor_mini_mlx_detector_sidecar_live'
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
        * packet.economics.sourceFluxParticlesPerSecond
        * packet.economics.opticalDensityScale
        * packet.economics.reconstructionRadiusScale
        * Math.sqrt(packet.economics.lifetimeSeconds),
      estimatedSolverWorkScore: packet.economics.effectiveActiveParticleBudget
        * Math.max(1, activeEmitterCount)
        / packet.economics.effectiveParticleCount,
    };
  }));
  return {
    schema: 'lerms.live-finger-fluid-frontier-sweep.v0',
    requestedParticleCount,
    rows,
  };
}
