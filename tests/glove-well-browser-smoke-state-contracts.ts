import assert from 'node:assert/strict';

import {
  buildGloveWellBrowserSmokeState,
  type BrowserSmokeCacheSnapshot
} from '../src/glove-well-browser-smoke-state.ts';

const LIVE_BACKEND = 'native_wilor_mini_mlx_detector_sidecar_live';

function snapshot(sequence: number, kind: 'prime' | 'aim' | 'release'): BrowserSmokeCacheSnapshot {
  const pinched = kind !== 'release';
  const timestamp = 90_000 + sequence * 120;
  return {
    schema: 'kaminos.hand-control-sidecar-event-cache.v0',
    status: 'stored',
    sequence,
    stored_at_ms: timestamp + 8,
    age_ms: 54,
    event: {
      schema: 'perceptasia.hand-control.v0',
      source_backend: LIVE_BACKEND,
      timestamp,
      frame_id: `browser-smoke-${kind}-${sequence}`,
      handedness: 'Right',
      confidence: 0.95,
      video_size: { width: 1280, height: 720 },
      palm_center: { x: 0.43, y: 0.68 },
      landmarks_2d: [
        { x: 0.43, y: 0.86 },
        { x: 0.36, y: 0.75 },
        { x: 0.35, y: 0.71 },
        { x: 0.36, y: 0.67 },
        pinched ? { x: 0.412, y: 0.614 } : { x: 0.335, y: 0.642 },
        { x: 0.455, y: 0.72 },
        { x: 0.45, y: 0.68 },
        { x: 0.442, y: 0.64 },
        pinched ? { x: 0.435, y: 0.606 } : { x: 0.505, y: 0.582 },
        { x: 0.48, y: 0.73 },
        { x: 0.485, y: 0.69 },
        { x: 0.488, y: 0.655 },
        { x: 0.49, y: 0.62 },
        { x: 0.515, y: 0.735 },
        { x: 0.522, y: 0.705 },
        { x: 0.53, y: 0.675 },
        { x: 0.535, y: 0.65 },
        { x: 0.55, y: 0.74 },
        { x: 0.59, y: 0.69 },
        { x: 0.63, y: 0.64 },
        { x: 0.67, y: 0.595 }
      ],
      native_frame_timing: {
        model_latency_ms: 58
      },
      webcam_frame: {
        visible: true,
        synthetic: false,
        width: 1280,
        height: 720,
        frame_ref: `webcam-${sequence}`
      },
      debug: {
        evidence_route: LIVE_BACKEND,
        model_route: 'wilor-mlx HandPosePipeline.from_pretrained',
        device_route: 'mlx',
        telemetry: {
          model_latency_ms: 58,
          frame_age_ms: 54
        }
      }
    }
  };
}

let state = buildGloveWellBrowserSmokeState({ previous: null, cache: snapshot(31, 'prime'), nowMs: 90_000 });
assert.equal(state.authority, 'live_simulation');
assert.equal(state.phase, 'priming');
assert.equal(state.statusCode, 'tracking');
assert.equal(state.releaseCount, 0);
assert.equal(state.source.sequence, 31);
assert.equal(state.source.frameId, 'browser-smoke-prime-31');

state = buildGloveWellBrowserSmokeState({ previous: state, cache: snapshot(32, 'aim'), nowMs: 90_120 });
assert.equal(state.phase, 'aiming');
assert.equal(state.aim.active, true);
assert.equal(state.aim.arcSamples.length, 7);
assert.ok(state.aim.direction.x < 0, 'operator-visible aim flips mirrored source x so right-hand fixture points left on canvas');
assert.ok(state.aim.direction.y < 0);

state = buildGloveWellBrowserSmokeState({ previous: state, cache: snapshot(33, 'release'), nowMs: 90_240 });
assert.equal(state.phase, 'released');
assert.equal(state.releaseCount, 1);
assert.equal(state.goin.state, 'rolling');
assert.equal(state.goin.velocity.x < 0, true);
assert.equal(state.goin.velocity.y < 0, true);
assert.equal(state.goin.desireRadius > 0.1, true);
assert.equal(state.downgrades.length, 0);

const rollingGoinPosition = state.goin.position;
state = buildGloveWellBrowserSmokeState({ previous: state, cache: snapshot(34, 'prime'), nowMs: 90_360 });
assert.equal(state.phase, 'priming');
assert.equal(state.releaseCount, 1);
assert.equal(Array.isArray(state.goins), true, 'browser smoke keeps a world goin collection instead of a single recycled goin');
assert.equal(state.goins.some((goin) => goin.state === 'held'), true, 'repinch primes a new held goin');
assert.equal(state.goins.some((goin) => goin.state === 'rolling'), true, 'repinch preserves the launched rolling goin in the world');
const rollingAfterRepinch = state.goins.find((goin) => goin.state === 'rolling');
assert.notEqual(rollingAfterRepinch, undefined);
assert.notDeepEqual(rollingAfterRepinch!.position, state.hand.palmCenter, 'launched goin does not teleport back into the pinched hand');
assert.notDeepEqual(rollingAfterRepinch!.position, rollingGoinPosition, 'launched goin continues advancing while a new goin is held');

const emptyState = buildGloveWellBrowserSmokeState({
  previous: state,
  cache: {
    schema: 'kaminos.hand-control-sidecar-event-cache.v0',
    status: 'empty',
    sequence: 34,
    stored_at_ms: null,
    age_ms: null,
    event: null
  },
  nowMs: 90_480
});
assert.equal(emptyState.authority, 'live_simulation');
assert.equal(emptyState.statusCode, 'no_new_packet');
assert.ok(emptyState.downgrades.includes('kaminos_event_cache_no_new_packet'));
assert.equal(emptyState.goins.some((goin) => goin.state === 'rolling'), true, 'last launched goin remains visible while source is stale');

const staleState = buildGloveWellBrowserSmokeState({
  previous: state,
  cache: { ...snapshot(35, 'aim'), age_ms: 400 },
  nowMs: 90_600
});
assert.equal(staleState.authority, 'stale_hold');
assert.equal(staleState.statusCode, 'stale');
assert.ok(staleState.downgrades.includes('kaminos_event_cache_stale'));

const fallbackState = buildGloveWellBrowserSmokeState({
  previous: state,
  cache: {
    ...snapshot(36, 'aim'),
    event: {
      ...snapshot(36, 'aim').event!,
      source_backend: 'saved_wilor_fixture',
      debug: { ...snapshot(36, 'aim').event!.debug, evidence_route: 'saved_wilor_fixture' }
    }
  },
  nowMs: 90_720
});
assert.equal(fallbackState.authority, 'fallback');
assert.equal(fallbackState.statusCode, 'fallback');
assert.ok(fallbackState.downgrades.includes('kaminos_event_cache_non_live_route'));

const syntheticState = buildGloveWellBrowserSmokeState({
  previous: state,
  cache: {
    ...snapshot(37, 'aim'),
    event: {
      ...snapshot(37, 'aim').event!,
      webcam_frame: { ...snapshot(37, 'aim').event!.webcam_frame!, synthetic: true }
    }
  },
  nowMs: 90_840
});
assert.equal(syntheticState.authority, 'synthetic_fixture');
assert.equal(syntheticState.statusCode, 'synthetic');
assert.ok(syntheticState.downgrades.includes('kaminos_event_cache_synthetic_webcam'));

const replayState = buildGloveWellBrowserSmokeState({
  previous: state,
  cache: snapshot(32, 'aim'),
  nowMs: 90_960
});
assert.equal(replayState.authority, 'stale_hold');
assert.equal(replayState.statusCode, 'replay');
assert.ok(replayState.downgrades.includes('kaminos_event_cache_non_monotonic'));

console.log('glove well browser smoke state contracts passed');
