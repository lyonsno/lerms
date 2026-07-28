const KAMINOS_REVISION = '355572977cdfdb7c27958994ede61ec967ac4623';
const SUPPORT_ROUTE = 'lerms/hill-of-hills/gpu-moving-support-contact-v0';
const OWNERSHIP_ROUTE = 'lerms/hill-of-hills/same-device-particle-ownership-v0';

export function assertHillParticleBrowserWitness(receipt) {
  if (!receipt.url.includes('watershedParticles=1')) return;

  const requestedCount = Number(
    new URL(receipt.url).searchParams.get('watershedParticleCount') ?? 2_400
  );
  const overlay = receipt.post?.particleOverlay;
  const requested = overlay?.requested;
  const effective = overlay?.effective;
  const mount = overlay?.ownershipMount;
  const support = overlay?.support;
  const solver = overlay?.solver;
  const diagnostics = solver?.diagnostics;
  const observation = receipt.particleObservation;

  if (
    requested?.enabled !== true ||
    requested.kaminosRevision !== KAMINOS_REVISION ||
    requested.supportRoute !== SUPPORT_ROUTE ||
    requested.particleCount !== requestedCount ||
    effective?.status !== 'active' ||
    effective.kaminosRevision !== KAMINOS_REVISION ||
    effective.supportRoute !== SUPPORT_ROUTE ||
    effective.fallbackRoute !== null ||
    effective.defaultSubstitution !== false ||
    overlay.sourceAuthority !== 'operator_smoke_fixture_not_live_hand'
  ) {
    throw new Error('particle witness observed a stale, substituted, or misattributed route');
  }

  if (
    mount?.status !== 'mounted' ||
    mount.route?.requested !== OWNERSHIP_ROUTE ||
    mount.route.effective !== OWNERSHIP_ROUTE ||
    mount.route.fallback !== null ||
    mount.kaminosRevision?.requested !== KAMINOS_REVISION ||
    mount.kaminosRevision.effective !== KAMINOS_REVISION ||
    mount.mode?.defaultSubstitution !== false ||
    mount.ownership?.deviceIdentity !== 'same_solver_and_renderer_device' ||
    mount.ownership?.bufferIdentity !== 'exact_solver_material_tracer_buffer' ||
    mount.ownership?.capacity !== requestedCount ||
    mount.supportContact?.route !== SUPPORT_ROUTE ||
    mount.supportContact.terrainEpoch !== support?.terrainEpoch ||
    mount.supportContact.supportEpoch !== support?.supportEpoch ||
    mount.supportContact.remapEpoch !== support?.remapEpoch ||
    mount.supportContact?.stale !== false ||
    mount.supportContact?.fallbackRoute !== null
  ) {
    throw new Error('particle witness did not preserve exact same-device ownership');
  }

  if (
    support?.route !== SUPPORT_ROUTE ||
    support.stale !== false ||
    support.fallbackRoute !== null ||
    support.hostReadbackVisibility !== false ||
    support.terrainEpoch !== receipt.post.portableOpticalProvider?.epochs?.terrain ||
    support.supportEpoch !== receipt.post.portableOpticalProvider?.epochs?.support ||
    support.remapEpoch < 1 ||
    solver?.available !== true ||
    solver.solver_backend !== 'webgpu_compute' ||
    solver.render_backend !== 'webgpu_direct_render' ||
    solver.supportContactRoute !== SUPPORT_ROUTE ||
    solver.supportContact?.deviceMatchesSolver !== true ||
    solver.supportContact.terrainEpoch !== support.terrainEpoch ||
    solver.supportContact.supportEpoch !== support.supportEpoch ||
    solver.supportContact.remapEpoch !== support.remapEpoch ||
    solver.liveInlets?.sourceLifecycle !== 'dormant_pool_progressive_gpu_release'
  ) {
    throw new Error('particle witness observed stale support or a noncanonical runtime');
  }

  if (
    diagnostics?.readbackMode !== 'explicit_sparse_gpu_diagnostics_v0' ||
    !Number.isSafeInteger(diagnostics.activeParticleCount) ||
    diagnostics.activeParticleCount <= 0 ||
    !Number.isSafeInteger(diagnostics.dormantParticleCount) ||
    diagnostics.dormantParticleCount < 0 ||
    diagnostics.activeParticleCount + diagnostics.dormantParticleCount !== requestedCount ||
    diagnostics.particleOwnership?.populationAccountingValid !== true ||
    diagnostics.particleOwnership.accountingValid !== true
  ) {
    throw new Error('particle witness lacks exact active and dormant GPU population accounting');
  }

  if (
    receipt.screenshots?.particleOnlyBytes < 1_000 ||
    observation?.authority !== 'browser_screenshot_pixel_readback' ||
    observation.observedPixelCount <= 0 ||
    observation.blank !== false
  ) {
    throw new Error('particle witness did not observe nonblank isolated particle output');
  }
}
