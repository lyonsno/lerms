import {
  FULL_EXTENSION_THRESHOLD,
  KAMINOS_FLUID_REVISION,
  LIVE_FINGER_FLUID_ADAPTER_CONTRACT,
  createLiveFingerFluidEmitterPacket,
  isLiveFingerFluidPacketFresh,
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

const keypoints: [number, number, number][] = Array.from({ length: 21 }, () => [0, 0, 0]);
keypoints[0] = [0, -0.35, 0];
for (const [offset, joints] of [
  [-0.40, [1, 2, 3, 4]],
  [-0.20, [5, 6, 7, 8]],
  [0.00, [9, 10, 11, 12]],
  [0.20, [13, 14, 15, 16]],
  [0.40, [17, 18, 19, 20]],
] as const) {
  straightFinger(offset).forEach((point, index) => { keypoints[joints[index]] = [...point]; });
}

const packet = createLiveFingerFluidEmitterPacket({
  eventSequence: 17,
  frameId: 'frame-17',
  captureTimestampMs: 1_000,
  effectiveRoute: 'native_wilor_mini_mlx_detector_sidecar_live',
  confidence: 0.96,
  handedness: 'right',
  keypoints3d: keypoints,
  manoTransform: { center: [0, 0, 0], scale: 1 },
  viewport: { width: 1280, height: 720 },
  nowMs: 1_040,
});
const hybridPacket = createLiveFingerFluidEmitterPacket({
  eventSequence: 171,
  frameId: 'frame-hybrid-17',
  captureTimestampMs: 1_000,
  effectiveRoute: 'hand-state-runtime/hybrid-wilor-anchor-browser-fast-mano-v2',
  confidence: 0.96,
  handedness: 'right',
  keypoints3d: keypoints,
  manoTransform: { center: [0, 0, 0], scale: 1 },
  viewport: { width: 1280, height: 720 },
  nowMs: 1_040,
});

assert(LIVE_FINGER_FLUID_ADAPTER_CONTRACT === 'hand-state-distal-axis-full-extension-emitters-v1', 'identifies the LERMS live adapter');
assert(KAMINOS_FLUID_REVISION === '71d09e78fbf16c9edecde3ea72a82ba17b656bf2', 'exposes the exact pinned Kaminos fluid revision');
assert(FULL_EXTENSION_THRESHOLD === 0.86, 'retains the accepted full-extension gate');
assert(packet.simulation_authority === 'live_simulation', 'fresh native frames carry live simulation authority');
assert(packet.route_identity === 'native_wilor_mini_mlx_detector_sidecar_live', 'packet route identity preserves the effective native source');
assert(packet.adapter_contract === LIVE_FINGER_FLUID_ADAPTER_CONTRACT, 'packet identifies the LERMS hand-to-fluid adapter separately');
assert(packet.authority.simulation_safe === true && packet.authority.stale === false, 'fresh native frames pass the solver authority gate');
assert(hybridPacket.simulation_authority === 'live_simulation', 'fresh hybrid frames carry live simulation authority');
assert(hybridPacket.source_route === 'hand-state-runtime/hybrid-wilor-anchor-browser-fast-mano-v2', 'hybrid packet preserves fused source route');
assert(hybridPacket.authority.simulation_safe === true && hybridPacket.authority.stale === false, 'fresh hybrid frames pass the solver authority gate');
assert(packet.emitters.length === 5, 'publishes one emitter per finger');
assert(packet.emitters.every(emitter => emitter.active && emitter.emission_state === 'jet'), 'fully extended fingers emit jets');
assert(Math.abs(packet.emitters[1].aim_world[1]) > 0.98, 'index jet follows its transformed distal-to-tip axis');
assert(isLiveFingerFluidPacketFresh(packet, 1_040), 'a newly consumed packet remains live');
assert(!isLiveFingerFluidPacketFresh(packet, 1_751), 'an accepted packet expires when no newer hand state arrives');

const bent: [number, number, number][] = keypoints.map(point => [...point]);
bent[8] = [-0.20, 0.22, 0];
const bentPacket = createLiveFingerFluidEmitterPacket({
  eventSequence: 18,
  frameId: 'frame-18',
  captureTimestampMs: 1_100,
  effectiveRoute: 'native_wilor_mini_mlx_detector_sidecar_live',
  confidence: 0.96,
  handedness: 'right',
  keypoints3d: bent,
  manoTransform: { center: [0, 0, 0], scale: 1 },
  viewport: { width: 1280, height: 720 },
  nowMs: 1_130,
});
assert(bentPacket.emitters[1].active === false, 'a bent index finger does not dribble');
assert(bentPacket.emitters[1].emission_state === 'off', 'partial extension fails closed instead of becoming a proxy jet');

const stalePacket = createLiveFingerFluidEmitterPacket({
  eventSequence: 19,
  frameId: 'frame-19',
  captureTimestampMs: 1_000,
  effectiveRoute: 'native_wilor_mini_mlx_detector_sidecar_live',
  confidence: 0.96,
  handedness: 'right',
  keypoints3d: keypoints,
  manoTransform: { center: [0, 0, 0], scale: 1 },
  viewport: { width: 1280, height: 720 },
  nowMs: 2_000,
});
assert(stalePacket.authority.simulation_safe === false && stalePacket.authority.stale === true, 'stale hand state fails closed');
assert(stalePacket.emitters.every(emitter => !emitter.active), 'stale hand state cannot drive fluid');

console.log('live finger fluid contracts ok');
