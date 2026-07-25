import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  KAMINOS_FINGER_FLUID_LIVE_INLET_ECONOMICS_CONTRACT,
  normalizeFingerFluidLiveInletPacket,
  planFingerFluidLiveInletEconomics,
} from 'kaminos/finger-fluid-webgpu-core.js';

const liveHandSource = readFileSync(new URL('../src/hand/live-hand.ts', import.meta.url), 'utf8');
const pinnedKaminosSource = readFileSync(
  new URL('../node_modules/kaminos/finger-fluid-webgpu-core.js', import.meta.url),
  'utf8',
);

const normalized = normalizeFingerFluidLiveInletPacket({
  packet_id: 'route-truth-fixture',
  route_identity: 'native_wilor_mini_mlx_detector_sidecar_live',
  adapter_contract: 'hand-state-distal-axis-full-extension-emitters-v1',
  source_route: 'native_wilor_mini_mlx_detector_sidecar_live',
  simulation_authority: 'live_simulation',
  authority: { simulation_safe: true, stale: false },
  emitters: [],
});

assert.equal(
  normalized.sourceRoute,
  'native_wilor_mini_mlx_detector_sidecar_live',
  'Kaminos debug truth preserves the native effective route rather than substituting the adapter name',
);
assert.match(
  liveHandSource,
  /const LERMS_LIVE_FLUID_PARTICLE_COUNT = resolveRequestedParticleCount\(params\.get\('fluid_particles'\), 2_400\);/,
  'LERMS keeps 2,400 as its product starting coordinate while permitting explicit assay requests',
);
assert.match(
  liveHandSource,
  /if \(!Number\.isSafeInteger\(parsed\) \|\| parsed <= 0\)[\s\S]*return parsed;/,
  'the assay validates caller input without silently capping it below the solver capacity',
);
assert.match(
  liveHandSource,
  /particleCount:\s*LERMS_LIVE_FLUID_PARTICLE_COUNT,/,
  'the LERMS production target must reach the solver request',
);
assert.doesNotMatch(
  liveHandSource,
  /fluid \$\{KAMINOS_FINGER_FLUID_DEFAULT_PARTICLE_COUNT\}p/,
  'operator route truth must not report an unrelated package default as the effective allocation',
);
const economics = planFingerFluidLiveInletEconomics({
  packet_id: 'economics-fixture',
  route_identity: 'native_wilor_mini_mlx_detector_sidecar_live',
  source_route: 'native_wilor_mini_mlx_detector_sidecar_live',
  simulation_authority: 'live_simulation',
  authority: { simulation_safe: true, stale: false },
  emitters: [{
    id: 'index',
    origin_world: [0, 0, 0],
    aim_world: [0, 0, -1],
    radius: 0.08,
    strength: 1.8,
    emission_state: 'jet',
    active: true,
    source_flux_particles_per_second: 640,
    active_budget_particles: 960,
    lifetime_seconds: 7.5,
    optical_density_scale: 2.75,
    reconstruction_radius_scale: 1.9,
  }],
}, 2400);
assert.equal(
  economics.contract,
  KAMINOS_FINGER_FLUID_LIVE_INLET_ECONOMICS_CONTRACT,
  'the pinned runtime exposes canonical requested/effective inlet economics',
);
assert.equal(economics.effectiveReleasePoolBudget, 960, 'the explicit active occupancy reaches the GPU release-pool plan');
assert.equal(economics.unallocatedDormantParticleCount, 1440, 'dormant inventory remains explicit');
assert.equal(economics.inlets[0].requested.particleReleaseRate, 640, 'source flux remains caller-owned');
assert.equal(economics.inlets[0].effective.residenceSeconds, 7.5, 'lifetime reaches canonical GPU residence');
assert.equal(economics.inlets[0].opticalDensity.effective, null, 'consumer-owned optical density is not invented as physical inlet work');
assert.equal(economics.inlets[0].reconstructionRadius.effective, null, 'consumer-owned reconstruction is not invented as physical inlet work');
assert.throws(
  () => planFingerFluidLiveInletEconomics({
    packet_id: 'default-substitution-probe',
    route_identity: 'native_wilor_mini_mlx_detector_sidecar_live',
    source_route: 'native_wilor_mini_mlx_detector_sidecar_live',
    simulation_authority: 'live_simulation',
    authority: { simulation_safe: true, stale: false },
    emitters: [{
      id: 'index',
      origin_world: [0, 0, 0],
      aim_world: [0, 0, -1],
      radius: 0.08,
      strength: 1.8,
      emission_state: 'jet',
      active: true,
      active_budget_particles: 2401,
    }],
  }, 2400),
  /exceeds runtime capacity/,
  'the runtime rejects an occupancy request that cannot fit instead of replacing it with a default',
);
assert.match(
  liveHandSource,
  /createPinnedKaminosLiveInletRuntimeAuthority/,
  'operator debug truth must be assembled from the pinned runtime receipt',
);

console.log('Kaminos live inlet route contract ok');
