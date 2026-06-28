import {
  buildGloveWellCommandsFromInputSequence,
  GLOVE_INPUT_FRAME_SCHEMA
} from '../src/glove-well-command.ts';
import {
  adaptWilorMiniPacketToGloveInputFrame,
  GLOVE_INPUT_WILOR_ADAPTER_CONFIG_ID,
  GLOVE_INPUT_WILOR_LIVE_EFFECTIVE_ROUTE,
  type WilorMiniGloveInputPacket
} from '../src/glove-input-wilor-adapter.ts';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertThrows(fn: () => void, expected: string): void {
  try {
    fn();
  } catch (error) {
    assert(error instanceof Error, 'expected Error');
    assert(error.message.includes(expected), `expected "${error.message}" to include "${expected}"`);
    return;
  }
  throw new Error(`expected function to throw ${expected}`);
}

const basePacket: WilorMiniGloveInputPacket = {
  schema: 'perceptasia.wilor-mini-glove-input-packet.v0',
  frameId: 'wilor-live-frame-001',
  timestampMs: 12_000,
  source: {
    requestedRoute: 'perceptasia/wilor-mini-mlx-sidecar/live-glove-input',
    effectiveRoute: GLOVE_INPUT_WILOR_LIVE_EFFECTIVE_ROUTE,
    backend: 'native_wilor_mini_mlx_detector_sidecar_live',
    model: 'wilor-mini-mlx',
    configId: 'native-wilor-mini-mlx-sidecar-live:v0',
    fallbackReason: null
  },
  timing: {
    cameraFrameAgeMs: 84,
    modelLatencyMs: 62,
    publishAgeMs: 18,
    roundTripMs: 126
  },
  coordinateFrame: {
    space: 'screen_normalized',
    origin: 'top_left',
    handedness: 'operator_unmirrored'
  },
  hand: {
    handedness: 'right',
    confidence: 0.94,
    palmCenter: { x: 0.42, y: 0.68 },
    landmarks: {
      wrist: { x: 0.42, y: 0.86 },
      thumb_tip: { x: 0.405, y: 0.615 },
      thumb_ip: { x: 0.365, y: 0.67 },
      index_mcp: { x: 0.455, y: 0.72 },
      index_tip: { x: 0.432, y: 0.605 },
      middle_mcp: { x: 0.48, y: 0.73 },
      middle_tip: { x: 0.49, y: 0.62 },
      ring_mcp: { x: 0.515, y: 0.735 },
      ring_tip: { x: 0.535, y: 0.65 },
      pinky_mcp: { x: 0.55, y: 0.74 },
      pinky_tip: { x: 0.665, y: 0.60 }
    }
  },
  gestures: {
    pinkyHoldMs: 180
  }
};

const liveFrame = adaptWilorMiniPacketToGloveInputFrame(basePacket);
assert(liveFrame.schema === GLOVE_INPUT_FRAME_SCHEMA, 'adapter emits glove input frame schema');
assert(liveFrame.frameId === basePacket.frameId, 'adapter preserves frame id');
assert(liveFrame.source.authority === 'live_simulation', 'non-fallback WiLoR source is live authority');
assert(liveFrame.source.route === 'perceptasia/wilor-mini-mlx-sidecar/live-glove-input', 'source route uses requested live bridge route');
assert(liveFrame.source.requestedRoute === basePacket.source.requestedRoute, 'source preserves requested route');
assert(liveFrame.source.effectiveRoute === GLOVE_INPUT_WILOR_LIVE_EFFECTIVE_ROUTE, 'source preserves effective route');
assert(liveFrame.source.backend === basePacket.source.backend, 'source preserves backend');
assert(liveFrame.source.model === 'wilor-mini-mlx', 'source preserves model');
assert(liveFrame.source.configId === GLOVE_INPUT_WILOR_ADAPTER_CONFIG_ID, 'adapter config is explicit and stable');
assert(liveFrame.source.producerConfigId === basePacket.source.configId, 'source preserves producer config id');
assert(liveFrame.source.sampleAgeMs === 84, 'source sample age follows camera age');
assert(liveFrame.timing.roundTripMs === 126, 'timing preserves round trip');
assert(liveFrame.coordinateFrame.handedness === 'operator_unmirrored', 'adapter refuses display-mirrored coordinates');
assert(liveFrame.coordinateFrame.depthPolicy === 'non_load_bearing', 'adapter declares depth non-load-bearing');
assert(liveFrame.hand.confidence === 0.94, 'hand confidence is preserved');
assert(liveFrame.fingers.thumb.tip.x === 0.405, 'thumb tip comes from WiLoR landmark');
assert(liveFrame.fingers.index.sourceLandmarkIds?.includes('index_tip'), 'finger source landmark ids are preserved');
assert(liveFrame.fingers.pinky.extended === true, 'pinky extension is detected');
assert(liveFrame.gestures.pinkyAim.active === true, 'pinky aim is active');
assert(liveFrame.gestures.pinkyAim.holdMs === 180, 'pinky hold is preserved');
assert(liveFrame.gestures.pinkyAim.direction.x > 0.5, 'pinky aim direction follows screen-plane tip-base vector');
assert(liveFrame.gestures.pinkyAim.direction.y < -0.2, 'pinky aim direction points upward in top-left screen coords');
assert(liveFrame.gestures.pinch.active === true, 'thumb/index pinch is detected');
assert(liveFrame.gestures.pinch.strength > 0.6, 'pinch strength is normalized from thumb/index distance');

const releaseFrame = adaptWilorMiniPacketToGloveInputFrame({
  ...basePacket,
  frameId: 'wilor-live-frame-release',
  timestampMs: 12_220,
  hand: {
    ...basePacket.hand,
    landmarks: {
      ...basePacket.hand.landmarks,
      thumb_tip: { x: 0.34, y: 0.64 },
      index_tip: { x: 0.50, y: 0.58 }
    }
  }
});
const commands = buildGloveWellCommandsFromInputSequence([liveFrame, releaseFrame]);
assert(commands[0].phase === 'aiming', 'live pinched pinky frame aims the Glove Well');
assert(commands[0].source.authority === 'live_simulation', 'live command source remains live before stale cutoff');
assert(commands[1].phase === 'released', 'pinch opening after live aim releases');
assert(commands[1].release?.sourceFrameId === releaseFrame.frameId, 'release traces to live WiLoR frame id');

const staleReleaseFrame = adaptWilorMiniPacketToGloveInputFrame({
  ...basePacket,
  frameId: 'wilor-live-frame-stale-release',
  timestampMs: 12_420,
  timing: {
    ...basePacket.timing,
    cameraFrameAgeMs: 260
  },
  hand: {
    ...basePacket.hand,
    landmarks: {
      ...basePacket.hand.landmarks,
      thumb_tip: { x: 0.34, y: 0.64 },
      index_tip: { x: 0.50, y: 0.58 }
    }
  }
});
const staleCommands = buildGloveWellCommandsFromInputSequence([liveFrame, staleReleaseFrame]);
assert(staleCommands[1].phase === 'cooldown', 'stale live frame cannot create release');
assert(staleCommands[1].source.authority === 'stale_hold', 'stale live frame downgrades command authority');

const fallbackFrame = adaptWilorMiniPacketToGloveInputFrame({
  ...basePacket,
  frameId: 'wilor-fallback-frame',
  source: {
    ...basePacket.source,
    effectiveRoute: 'lerms/glove-input/fixture-fallback',
    backend: 'fixture-fallback',
    fallbackReason: 'sidecar-timeout'
  }
});
assert(fallbackFrame.source.authority === 'fallback', 'fallback route is not live authority');
assert(fallbackFrame.source.fallbackReason === 'sidecar-timeout', 'fallback reason is preserved');
assert(fallbackFrame.source.producerConfigId === basePacket.source.configId, 'fallback still preserves producer config id');

assertThrows(
  () =>
    adaptWilorMiniPacketToGloveInputFrame({
      ...basePacket,
      coordinateFrame: {
        ...basePacket.coordinateFrame,
        handedness: 'display_mirrored'
      }
    }),
  'operator_unmirrored'
);

assertThrows(
  () =>
    adaptWilorMiniPacketToGloveInputFrame({
      ...basePacket,
      source: {
        ...basePacket.source,
        effectiveRoute: 'lerms/glove-input/fixture-fallback',
        fallbackReason: null
      }
    }),
  'fallbackReason'
);

const pixelPacket: WilorMiniGloveInputPacket = {
  ...basePacket,
  frameId: 'wilor-pixel-frame',
  coordinateFrame: {
    space: 'image_pixels',
    origin: 'top_left',
    handedness: 'operator_unmirrored',
    imageSize: { width: 1000, height: 500 }
  },
  hand: {
    ...basePacket.hand,
    palmCenter: { x: 420, y: 340 },
    landmarks: [
      { id: 'wrist', index: 0, x: 420, y: 430 },
      { id: 'thumb_tip', index: 4, x: 405, y: 308 },
      { id: 'thumb_ip', index: 3, x: 365, y: 335 },
      { id: 'index_mcp', index: 5, x: 455, y: 360 },
      { id: 'index_tip', index: 8, x: 432, y: 302 },
      { id: 'middle_mcp', index: 9, x: 480, y: 365 },
      { id: 'middle_tip', index: 12, x: 490, y: 310 },
      { id: 'ring_mcp', index: 13, x: 515, y: 368 },
      { id: 'ring_tip', index: 16, x: 535, y: 325 },
      { id: 'pinky_mcp', index: 17, x: 550, y: 370 },
      { id: 'pinky_tip', index: 20, x: 665, y: 300 }
    ]
  }
};
const pixelFrame = adaptWilorMiniPacketToGloveInputFrame(pixelPacket);
assert(Math.abs(pixelFrame.fingers.index.tip.x - 0.432) < 0.001, 'pixel landmarks normalize x');
assert(Math.abs(pixelFrame.fingers.pinky.tip.y - 0.6) < 0.001, 'pixel landmarks normalize y');
assert(pixelFrame.fingers.pinky.sourceLandmarkIds?.includes('20'), 'array landmark indexes remain traceable');

console.log('glove input WiLoR adapter contracts ok');
