import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizeFingerFluidLiveInletPacket } from 'kaminos/finger-fluid-webgpu-core.js';

const liveHandSource = readFileSync(new URL('../src/hand/live-hand.ts', import.meta.url), 'utf8');

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

console.log('Kaminos live inlet route contract ok');
