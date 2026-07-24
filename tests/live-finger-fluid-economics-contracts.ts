import {
  createLiveFingerFluidEmitterPacket,
  createLiveFingerFluidFrontierSweep,
  resolveLiveFingerFluidRouteEconomics,
} from '../src/hand/live-finger-fluid.js';
import * as liveFingerFluidModule from '../src/hand/live-finger-fluid.js';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const straightFinger = (x: number) => [
  [x, 0.00, 0],
  [x, 0.20, 0],
  [x, 0.40, 0],
  [x, 0.60, 0],
] as const;

const baseKeypoints: [number, number, number][] = Array.from({ length: 21 }, () => [0, 0, 0]);
baseKeypoints[0] = [0, -0.35, 0];
for (const [offset, joints] of [
  [-0.40, [1, 2, 3, 4]],
  [-0.20, [5, 6, 7, 8]],
  [0.00, [9, 10, 11, 12]],
  [0.20, [13, 14, 15, 16]],
  [0.40, [17, 18, 19, 20]],
] as const) {
  straightFinger(offset).forEach((point, index) => { baseKeypoints[joints[index]] = [...point]; });
}

function makeFrame(activeFingerCount: 1 | 5) {
  const keypoints: [number, number, number][] = baseKeypoints.map(point => [...point]);
  if (activeFingerCount === 1) {
    for (const tipIndex of [4, 12, 16, 20]) keypoints[tipIndex] = [...keypoints[tipIndex - 1]];
  }
  return {
    eventSequence: activeFingerCount,
    frameId: `frame-${activeFingerCount}`,
    captureTimestampMs: 1_000,
    effectiveRoute: 'native_wilor_mini_mlx_detector_sidecar_live',
    confidence: 0.96,
    handedness: 'right',
    keypoints3d: keypoints,
    manoTransform: { center: [0, 0, 0] as const, scale: 1 },
    viewport: { width: 1280, height: 720 },
    nowMs: 1_020,
  };
}

const packet = createLiveFingerFluidEmitterPacket(makeFrame(5), {
  requestedParticleCount: 2400,
  requestedActiveParticleBudget: 960,
  sourceFluxParticlesPerSecond: 640,
  opticalDensityScale: 2.75,
  reconstructionRadiusScale: 1.9,
  lifetimeSeconds: 7.5,
});

assert(packet.economics.requestedParticleCount === 2400, 'keeps the explicit 2400-particle product pool request');
assert(packet.economics.effectiveParticleCount === 2400, 'effective particle count cannot be silently defaulted away');
assert(packet.economics.requestedActiveParticleBudget === 960, 'preserves caller-owned active occupancy target');
assert(packet.economics.effectiveActiveParticleBudget === null, 'unsupported active-budget requests must not be echoed as effective');
assert(packet.economics.sourceFluxParticlesPerSecond === 640, 'preserves source flux as an independent control');
assert(packet.economics.opticalDensityScale === 2.75, 'preserves optical density separately from solver work');
assert(packet.economics.reconstructionRadiusScale === 1.9, 'preserves reconstruction radius separately from source flux');
assert(packet.economics.lifetimeSeconds === 7.5, 'preserves lifetime separately from active pool allocation');
assert(packet.economics.defaultSubstitution === false, 'non-default requests must not be laundered as defaults');
assert(packet.economics.fallbackActive === false, 'valid economics cannot claim fallback authority');
assert(packet.emitters.every(emitter => emitter.source_flux_particles_per_second === 128), 'source flux is distributed across five active emitters');
assert(packet.emitters.every(emitter => emitter.optical_density_scale === 2.75), 'emitter packet carries visible-density policy to the solver');

type RuntimeAuthorityFactory = (
  economics: typeof packet.economics,
  runtime: Record<string, unknown>,
) => {
  schema: string;
  complete: boolean;
  authority: string;
  requested: typeof packet.economics;
  effective: {
    particleCount: number | null;
    activeParticleBudget: number | null;
    expectedParticleReleaseRate: number | null;
    opticalDensityScale: number | null;
    reconstructionRadiusScale: number | null;
    residenceSeconds: number | null;
    maximumTravelDistance: number | null;
    packetId: string | null;
    sourceRoute: string | null;
  };
  support: {
    activeParticleBudget: string;
    sourceFlux: string;
    opticalDensity: string;
    reconstructionRadius: string;
    lifetime: string;
  };
};

const createRuntimeAuthority = (
  liveFingerFluidModule as unknown as Record<string, unknown>
).createPinnedKaminosLiveInletRuntimeAuthority as RuntimeAuthorityFactory | undefined;
assert(typeof createRuntimeAuthority === 'function', 'runtime authority factory must exist');

const verifiedRuntime = createRuntimeAuthority(packet.economics, {
  effectiveParticleCount: 2400,
  expectedPacketId: packet.packet_id,
  expectedSourceRoute: packet.source_route,
  packetAuthority: packet.authority,
  packetEconomics: packet.economics,
  receipt: {
    packetId: packet.packet_id,
    sourceRoute: packet.source_route,
    expectedParticleReleaseRate: 875.25,
  },
  liveInlets: {
    packetId: packet.packet_id,
    sourceRoute: packet.source_route,
    expectedParticleReleaseRate: 875.25,
    inlets: [
      { id: 'index', radius: 0.12, maximumSpeed: 1.8, active: true },
      { id: 'middle', radius: 0.14, maximumSpeed: 1.9, active: true },
    ],
  },
});
assert(verifiedRuntime.schema === 'lerms.live-finger-fluid-runtime-authority.v0', 'runtime authority uses a stable schema');
assert(verifiedRuntime.complete === true, 'effective inlet receipt completes runtime authority');
assert(verifiedRuntime.authority === 'pinned_runtime_receipt', 'effective values name pinned runtime receipt authority');
assert(verifiedRuntime.effective.particleCount === 2400, 'effective allocation comes from solver initialization');
assert(verifiedRuntime.effective.activeParticleBudget === null, 'pinned runtime has no effective active-budget control');
assert(verifiedRuntime.effective.expectedParticleReleaseRate === 875.25, 'effective release comes from the runtime release plan');
assert(verifiedRuntime.effective.opticalDensityScale === null, 'pinned runtime has no independent optical-density control');
assert(verifiedRuntime.effective.reconstructionRadiusScale === null, 'pinned runtime has no independent reconstruction-radius control');
assert(verifiedRuntime.effective.residenceSeconds === 1.65, 'effective residence reports the pinned hard recycle age');
assert(verifiedRuntime.effective.maximumTravelDistance === 2.4, 'effective residence reports the pinned distance recycle');
assert(verifiedRuntime.effective.packetId === packet.packet_id, 'effective state is joined to the exact packet id');
assert(verifiedRuntime.effective.sourceRoute === packet.source_route, 'effective state is joined to the exact source route');
assert(verifiedRuntime.support.activeParticleBudget === 'unsupported_by_pinned_runtime', 'active-budget support fails loud');
assert(verifiedRuntime.support.sourceFlux === 'derived_from_aperture_and_speed', 'source release names its actual coupled controls');
assert(verifiedRuntime.support.opticalDensity === 'unsupported_metadata_coupled_to_speed', 'optics request names its physical speed coupling');
assert(verifiedRuntime.support.reconstructionRadius === 'unsupported_metadata_coupled_to_aperture', 'reconstruction request names its aperture coupling');
assert(verifiedRuntime.support.lifetime === 'unsupported_metadata_hard_recycle', 'lifetime request names its hard recycle override');

const missingRuntime = createRuntimeAuthority(packet.economics, {
  effectiveParticleCount: null,
  liveInlets: null,
});
assert(missingRuntime.complete === false, 'missing runtime receipt cannot look complete');
assert(missingRuntime.authority === 'missing_runtime_receipt', 'missing effective evidence fails loud');
assert(missingRuntime.effective.expectedParticleReleaseRate === null, 'missing release evidence cannot fall back to the request');

const staleRuntime = createRuntimeAuthority(packet.economics, {
  effectiveParticleCount: 2400,
  expectedPacketId: packet.packet_id,
  expectedSourceRoute: packet.source_route,
  packetAuthority: packet.authority,
  packetEconomics: packet.economics,
  receipt: {
    packetId: packet.packet_id,
    sourceRoute: packet.source_route,
    expectedParticleReleaseRate: 875.25,
  },
  liveInlets: {
    packetId: 'older-packet',
    sourceRoute: packet.source_route,
    expectedParticleReleaseRate: 875.25,
    inlets: [{ id: 'index', radius: 0.12, maximumSpeed: 1.8, active: true }],
  },
});
assert(staleRuntime.complete === false, 'a stale runtime packet cannot complete current authority');
assert(staleRuntime.authority === 'stale_or_mismatched_runtime_receipt', 'packet identity mismatch fails loud');

const malformedRuntime = createRuntimeAuthority(packet.economics, {
  effectiveParticleCount: 2400,
  expectedPacketId: packet.packet_id,
  expectedSourceRoute: packet.source_route,
  packetAuthority: packet.authority,
  packetEconomics: packet.economics,
  receipt: {
    packetId: packet.packet_id,
    sourceRoute: packet.source_route,
    expectedParticleReleaseRate: -1,
  },
  liveInlets: {
    packetId: packet.packet_id,
    sourceRoute: packet.source_route,
    expectedParticleReleaseRate: -1,
    inlets: [{ id: '', radius: -0.12, maximumSpeed: -1.8, active: true }],
  },
});
assert(malformedRuntime.complete === false, 'negative or empty runtime fields cannot look complete');
assert(malformedRuntime.authority === 'malformed_runtime_receipt', 'malformed runtime evidence fails loud');

const nullReleaseRuntime = createRuntimeAuthority(packet.economics, {
  effectiveParticleCount: 2400,
  expectedPacketId: packet.packet_id,
  expectedSourceRoute: packet.source_route,
  packetAuthority: packet.authority,
  packetEconomics: packet.economics,
  receipt: {
    packetId: packet.packet_id,
    sourceRoute: packet.source_route,
    expectedParticleReleaseRate: null,
  },
  liveInlets: {
    packetId: packet.packet_id,
    sourceRoute: packet.source_route,
    expectedParticleReleaseRate: null,
    inlets: [{ id: 'index', radius: 0.12, maximumSpeed: 1.8, active: true }],
  },
});
assert(nullReleaseRuntime.complete === false, 'null release fields cannot coerce into authoritative zeroes');
assert(nullReleaseRuntime.authority === 'malformed_runtime_receipt', 'null-like runtime numerics fail loud');

const stoppedRuntime = createRuntimeAuthority(packet.economics, {
  effectiveParticleCount: 2400,
  expectedPacketId: 'stop-packet',
  expectedSourceRoute: packet.source_route,
  packetAuthority: { simulation_safe: false, stale: true, reason: 'assay_stopped' },
  packetEconomics: packet.economics,
  receipt: {
    packetId: 'stop-packet',
    sourceRoute: packet.source_route,
    expectedParticleReleaseRate: 0,
  },
  liveInlets: {
    packetId: 'stop-packet',
    sourceRoute: packet.source_route,
    expectedParticleReleaseRate: 0,
    inlets: [],
  },
});
assert(stoppedRuntime.complete === false, 'a stopped or stale packet cannot retain runtime authority');
assert(stoppedRuntime.authority === 'stale_or_mismatched_runtime_receipt', 'stopped packet state fails loud');

type JuiceBudgetResolver = (requestedBudget: number) => {
  schema: string;
  requestedBudget: number;
  effectiveBudget: number;
  zone: 'economy' | 'full' | 'redline';
  fallbackActive: boolean;
  economics: {
    requestedParticleCount: number;
    requestedActiveParticleBudget: number;
    sourceFluxParticlesPerSecond: number;
    opticalDensityScale: number;
    reconstructionRadiusScale: number;
    lifetimeSeconds: number;
  };
};
const resolveJuiceBudget = (
  liveFingerFluidModule as unknown as Record<string, unknown>
).resolveLiveFingerFluidJuiceBudget as JuiceBudgetResolver | undefined;
assert(typeof resolveJuiceBudget === 'function', 'single Juice budget resolver must exist');

const zeroJuice = resolveJuiceBudget(0);
assert(zeroJuice.schema === 'lerms.live-finger-fluid-juice-budget.v0', 'Juice mapping uses a stable schema');
assert(zeroJuice.zone === 'economy', 'low Juice is the economy region');
assert(zeroJuice.economics.requestedParticleCount === 2400, 'Juice mapping starts from the explicit product pool');
assert(zeroJuice.economics.requestedActiveParticleBudget === 120, 'zero Juice starts at the lowest requested occupancy probe');
assert(zeroJuice.economics.sourceFluxParticlesPerSecond === 60, 'zero Juice starts at the lowest requested release probe');
assert(zeroJuice.economics.opticalDensityScale === 0.5, 'zero Juice starts at the lowest effective speed scale');
assert(zeroJuice.economics.reconstructionRadiusScale === 0.7, 'zero Juice starts at the lowest effective aperture scale');
assert(zeroJuice.economics.lifetimeSeconds === 1, 'zero Juice preserves the lowest requested lifetime probe');

const honestKnee = resolveJuiceBudget(80);
assert(honestKnee.zone === 'full', 'the strongest honest composite preset sits at the full-region knee');
assert(honestKnee.economics.requestedActiveParticleBudget === 1440, 'the knee preserves the measured intermediate active request');
assert(honestKnee.economics.sourceFluxParticlesPerSecond === 960, 'the knee preserves the measured intermediate flux request');
assert(honestKnee.economics.opticalDensityScale === 1.7, 'the knee requests the pinned maximum speed without overshooting its clamp');
assert(honestKnee.economics.reconstructionRadiusScale === 2.5, 'the knee preserves the measured intermediate aperture scale');
assert(honestKnee.economics.lifetimeSeconds === 10, 'the knee preserves the measured intermediate lifetime request');

const redline = resolveJuiceBudget(100);
assert(redline.zone === 'redline', 'the upper range is explicitly redline evidence');
assert(redline.economics.requestedActiveParticleBudget === 1920, 'redline retains the measured max-long occupancy request');
assert(redline.economics.sourceFluxParticlesPerSecond === 1440, 'redline retains the measured max-long flux request');
assert(redline.economics.opticalDensityScale === 1.7, 'redline does not advance a speed request after effective speed saturates');
assert(redline.economics.reconstructionRadiusScale === 2.8, 'redline stops below the pinned aperture clamp instead of creating a dead zone');
assert(redline.economics.lifetimeSeconds === 12, 'redline retains the measured max-long lifetime request');

const nearRedline = resolveJuiceBudget(94);
const terminalNeighbor = resolveJuiceBudget(99);
const nearRedlinePacket = createLiveFingerFluidEmitterPacket(makeFrame(5), nearRedline.economics);
const terminalNeighborPacket = createLiveFingerFluidEmitterPacket(makeFrame(5), terminalNeighbor.economics);
const redlinePacket = createLiveFingerFluidEmitterPacket(makeFrame(5), redline.economics);
const effectiveRadius = (radius: number) => Math.min(0.18, Math.max(0.035, radius * 1.45));
const effectiveSpeed = (strength: number) => Math.min(2.6, Math.max(0.25, strength * 1.35));
assert(
  effectiveRadius(redlinePacket.emitters[0].radius) > effectiveRadius(nearRedlinePacket.emitters[0].radius),
  'the final Juice range must continue changing effective inlet aperture',
);
assert(
  effectiveRadius(redlinePacket.emitters[0].radius) > effectiveRadius(terminalNeighborPacket.emitters[0].radius),
  'adjacent terminal Juice positions must not collapse into a physical dead zone',
);
assert(
  effectiveSpeed(redlinePacket.emitters[0].strength) === effectiveSpeed(honestKnee.economics.opticalDensityScale * 1.15),
  'the macro must expose the pinned speed plateau instead of pretending later requests increase speed',
);

const invalidJuice = resolveJuiceBudget(Number.NaN);
assert(invalidJuice.fallbackActive === true, 'invalid Juice cannot silently become an authoritative default');

const sweep = createLiveFingerFluidFrontierSweep({
  requestedParticleCount: 2400,
  profiles: [
    { label: 'thin-fast', sourceFluxParticlesPerSecond: 120, requestedActiveParticleBudget: 180, opticalDensityScale: 1, reconstructionRadiusScale: 1, lifetimeSeconds: 3 },
    { label: 'forceful', sourceFluxParticlesPerSecond: 720, requestedActiveParticleBudget: 1080, opticalDensityScale: 3.2, reconstructionRadiusScale: 2.1, lifetimeSeconds: 8 },
  ],
  oneFingerFrame: makeFrame(1),
  fiveFingerFrame: makeFrame(5),
});

assert(sweep.schema === 'lerms.live-finger-fluid-frontier-sweep.v0', 'frontier sweep uses a stable schema');
assert(sweep.requestedParticleCount === 2400, 'frontier starts from the current product pool');
assert(sweep.rows.length === 4, 'sweep includes deterministic one-finger and five-finger rows for each profile');
assert(sweep.rows.some(row => row.profileLabel === 'forceful' && row.activeEmitterCount === 5), 'five-finger forceful row is explicit');
assert(sweep.rows.every(row => row.requested.effectiveParticleCount === 2400), 'every row reports effective particle identity');
assert(sweep.rows.every(row => row.authority.blankOrPartialOutput === false), 'bench rows cannot look successful while blank or partial');
assert(sweep.rows.every(row => row.authority.staleOrFallback === false), 'bench rows reject stale or fallback source authority');
assert(sweep.rows.every(row => row.estimatedVisibleMaterialScore > 0), 'frontier estimates visible material separately from solver work');

const routeDefaults = {
  requestedParticleCount: 2400,
  requestedActiveParticleBudget: 720,
  sourceFluxParticlesPerSecond: 360,
  opticalDensityScale: 2.2,
  reconstructionRadiusScale: 1.6,
  lifetimeSeconds: 6,
};
const completeRoute = resolveLiveFingerFluidRouteEconomics(new URLSearchParams({
  fluid_active: '1440',
  fluid_flux: '960',
  fluid_optics: '4',
  fluid_radius: '2.5',
  fluid_lifetime: '10',
}), routeDefaults);
assert(completeRoute.provided === true && completeRoute.error === null, 'complete route economics must resolve without fallback');
assert(completeRoute.economics?.requestedActiveParticleBudget === 1440, 'complete route preserves active budget');
assert(completeRoute.economics?.sourceFluxParticlesPerSecond === 960, 'complete route preserves source flux');
assert(completeRoute.economics?.opticalDensityScale === 4, 'complete route preserves optical density');
assert(completeRoute.economics?.reconstructionRadiusScale === 2.5, 'complete route preserves reconstruction radius');
assert(completeRoute.economics?.lifetimeSeconds === 10, 'complete route preserves lifetime');
assert(completeRoute.economics?.fallbackActive === false, 'valid route economics remain authoritative');

const partialRoute = resolveLiveFingerFluidRouteEconomics(new URLSearchParams({
  fluid_optics: '4',
}), routeDefaults);
assert(partialRoute.economics?.opticalDensityScale === 4, 'partial query changes the requested field');
assert(partialRoute.economics?.sourceFluxParticlesPerSecond === 360, 'partial query preserves untouched UI defaults');

for (const [query, expectedReason] of [
  ['fluid_flux=', 'fluid_flux must not be empty'],
  ['fluid_flux=wat', 'fluid_flux must be finite'],
  ['fluid_flux=370', 'fluid_flux must align to step 20'],
  ['fluid_flux=2000', 'fluid_flux must be between 60 and 1440'],
  ['fluid_active=2100', 'fluid_active must be between 120 and 1920'],
  ['fluid_optics=8', 'fluid_optics must be between 0.5 and 5'],
  ['fluid_radius=6', 'fluid_radius must be between 0.7 and 3'],
  ['fluid_lifetime=20', 'fluid_lifetime must be between 1 and 12'],
] as const) {
  const invalid = resolveLiveFingerFluidRouteEconomics(new URLSearchParams(query), routeDefaults);
  assert(invalid.provided === true, `${query} remains explicit route input`);
  assert(invalid.economics === null, `${query} cannot silently clamp into authoritative economics`);
  assert(invalid.error?.includes(expectedReason), `${query} reports its exact invalid-route reason`);
}

console.log('live finger fluid economics contracts ok');
