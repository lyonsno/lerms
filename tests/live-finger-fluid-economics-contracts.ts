import {
  createLiveFingerFluidEmitterPacket,
  createLiveFingerFluidFrontierSweep,
} from '../src/hand/live-finger-fluid.js';

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
assert(packet.economics.effectiveActiveParticleBudget === 960, 'effective active target reflects the requested operating point');
assert(packet.economics.sourceFluxParticlesPerSecond === 640, 'preserves source flux as an independent control');
assert(packet.economics.opticalDensityScale === 2.75, 'preserves optical density separately from solver work');
assert(packet.economics.reconstructionRadiusScale === 1.9, 'preserves reconstruction radius separately from source flux');
assert(packet.economics.lifetimeSeconds === 7.5, 'preserves lifetime separately from active pool allocation');
assert(packet.economics.defaultSubstitution === false, 'non-default requests must not be laundered as defaults');
assert(packet.economics.fallbackActive === false, 'valid economics cannot claim fallback authority');
assert(packet.emitters.every(emitter => emitter.source_flux_particles_per_second === 128), 'source flux is distributed across five active emitters');
assert(packet.emitters.every(emitter => emitter.optical_density_scale === 2.75), 'emitter packet carries visible-density policy to the solver');

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

console.log('live finger fluid economics contracts ok');
