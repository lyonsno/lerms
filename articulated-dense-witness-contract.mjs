export const ARTICULATED_DENSE_FLUID_PROFILE = Object.freeze({
  pinnedRevision: '71d09e78fbf16c9edecde3ea72a82ba17b656bf2',
  inletContract: 'wgsl-live-hand-round-inlet-uniform-v1',
  inletReleaseContract: 'gpu-dormant-pool-source-flux-release-v0',
  adapterContract: 'hand-state-distal-axis-full-extension-emitters-v1',
  packetSourceRoute: 'lerms_density_bench_fixture_not_live_hand',
  requestedParticleCount: 2400,
  requestedActiveParticleBudget: 1440,
  sourceFluxParticlesPerSecond: 960,
  opticalDensityScale: 1.7,
  reconstructionRadiusScale: 2.5,
  lifetimeSeconds: 10,
  activeEmitterCount: 5,
  solverBackend: 'webgpu_compute',
  renderBackend: 'webgpu_direct_render',
  renderer: 'webgpu-screen-space-liquid-refraction-v0',
});

function exactProfileEconomics(economics, expected) {
  return economics?.requestedParticleCount === expected.requestedParticleCount
    && economics?.requestedActiveParticleBudget === expected.requestedActiveParticleBudget
    && economics?.sourceFluxParticlesPerSecond === expected.sourceFluxParticlesPerSecond
    && economics?.opticalDensityScale === expected.opticalDensityScale
    && economics?.reconstructionRadiusScale === expected.reconstructionRadiusScale
    && economics?.lifetimeSeconds === expected.lifetimeSeconds;
}

export function evaluateExactFluidWorkloadMismatch(debugState) {
  const fluid = debugState?.fluid;
  const expected = ARTICULATED_DENSE_FLUID_PROFILE;
  return debugState?.densityBenchAuthority !== 'fixture_density_bench_not_live_hand'
    || fluid?.pinnedRevision !== expected.pinnedRevision
    || fluid?.inletContract !== expected.inletContract
    || fluid?.inletReleaseContract !== expected.inletReleaseContract
    || fluid?.adapterContract !== expected.adapterContract
    || !exactProfileEconomics(fluid?.economics, expected)
    || fluid?.economics?.defaultSubstitution !== false
    || fluid?.economics?.fallbackActive !== false
    || !exactProfileEconomics(fluid?.juiceBudget?.lastMacroMapping?.economics, expected)
    || fluid?.juiceBudget?.lastMacroMapping?.effectiveBudget !== 80
    || fluid?.juiceBudget?.lastMacroMapping?.defaultSubstitution !== false
    || fluid?.juiceBudget?.lastMacroMapping?.fallbackActive !== false
    || fluid?.requestedParticleCount !== expected.requestedParticleCount
    || fluid?.effectiveParticleCount !== expected.requestedParticleCount
    || fluid?.requestedActiveParticleBudget !== expected.requestedActiveParticleBudget
    || fluid?.activeEmitterCount !== expected.activeEmitterCount
    || fluid?.latestPacketActiveEmitterCount !== expected.activeEmitterCount
    || fluid?.latestPacketSourceRoute !== expected.packetSourceRoute
    || fluid?.latestPacketAuthority?.simulation_safe !== true
    || fluid?.latestPacketAuthority?.stale !== false
    || fluid?.latestPacketAuthority?.reason !== 'fixture_density_bench_not_live_hand'
    || fluid?.runtimeEconomicsAuthority?.complete !== true
    || fluid?.runtimeEconomicsAuthority?.authority !== 'pinned_runtime_receipt'
    || fluid?.runtimeEconomicsAuthority?.fallbackActive !== false
    || fluid?.liveInlets?.requestedMode !== 'live_hand_inlets'
    || fluid?.liveInlets?.effectiveMode !== 'live_hand_inlets'
    || fluid?.liveInlets?.activeInletCount !== expected.activeEmitterCount
    || fluid?.liveInlets?.activated !== true
    || fluid?.solver?.available !== true
    || fluid?.solver?.solver_backend !== expected.solverBackend
    || fluid?.solver?.render_backend !== expected.renderBackend
    || fluid?.solver?.requestedRenderer !== expected.renderer
    || fluid?.solver?.effectiveRenderer !== expected.renderer
    || fluid?.solver?.fallbackReason !== null;
}

export function evaluateHandVisualMismatch({
  requestedFrameCount,
  handFrames,
  handVisualDeltas,
}) {
  if (handFrames.length !== requestedFrameCount) return true;
  if (handFrames.some(frame => frame.byteCount <= 0 || frame.dynamicRange < 16)) return true;
  const requiredMovingPairs = Math.min(3, Math.max(0, requestedFrameCount - 1));
  return handVisualDeltas.filter(delta => delta.changedRatio >= 0.0002).length < requiredMovingPairs;
}

export function mayPromotePrimaryOutput({ failedChecks }) {
  return Array.isArray(failedChecks) && failedChecks.length === 0;
}
