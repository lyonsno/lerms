import assert from 'node:assert/strict';
import { normalizeFingerFluidLiveInletPacket } from 'kaminos/finger-fluid-webgpu-core.js';

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

console.log('Kaminos live inlet route contract ok');
