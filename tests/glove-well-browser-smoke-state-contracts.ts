import assert from 'node:assert/strict';

import {
  buildGloveWellHostPacket,
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
assert.deepEqual(state.hand.palmCenter, { x: 0.57, y: 0.68 }, 'palm is mirrored into operator-visible webcam space');
assert.deepEqual(state.hand.thumbTip, { x: 0.588, y: 0.614 }, 'thumb tip is mirrored for display/tracking alignment');
assert.deepEqual(state.hand.indexTip, { x: 0.565, y: 0.606 }, 'index tip is mirrored for display/tracking alignment');
assert.deepEqual(state.goin.position, state.hand.palmCenter, 'held goin follows the mirrored palm position');
assert.equal(state.handSkeleton.visible, true);
assert.equal(state.handSkeleton.schema, 'lerms.glove-well-hand-skeleton-overlay.v0');
assert.equal(state.handSkeleton.landmarkCount, 21);
assert.equal(state.handSkeleton.segments.length >= 20, true, 'skeleton overlay exposes full hand bone segments');
assert.deepEqual(state.handSkeleton.landmarks[0], { x: 0.57, y: 0.86 }, 'skeleton wrist is mirrored into operator-visible space');
assert.deepEqual(state.handSkeleton.landmarks[20], { x: 0.33, y: 0.595 }, 'skeleton pinky tip is mirrored into operator-visible space');
assert.equal(state.handSkeleton.debugPoints.some((point) => point.id === 'thumb_tip' && point.landmarkIndex === 4), true);
assert.equal(state.handSkeleton.debugPoints.some((point) => point.id === 'index_tip' && point.landmarkIndex === 8), true);
assert.equal(state.handSkeleton.debugPoints.some((point) => point.id === 'pinky_base' && point.landmarkIndex === 17), true);
assert.equal(state.handSkeleton.debugPoints.some((point) => point.id === 'pinky_tip' && point.landmarkIndex === 20), true);
assert.equal(state.handSkeleton.debugPoints.some((point) => point.id === 'palm_center'), true);

state = buildGloveWellBrowserSmokeState({ previous: state, cache: snapshot(32, 'aim'), nowMs: 90_120 });
assert.equal(state.phase, 'aiming');
assert.equal(state.aim.active, true);
assert.equal(state.aim.arcSamples.length, 7);
assert.ok(state.aim.direction.x < 0, 'operator-visible aim flips mirrored source x so right-hand fixture points left on canvas');
assert.ok(state.aim.direction.y < 0);
assert.deepEqual(state.aim.origin, { x: 0.33, y: 0.595 }, 'aim dots originate at the mirrored pinky tip');
assert.deepEqual(state.handSkeleton.aimVector, {
  origin: state.aim.origin,
  direction: state.aim.direction
});

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

const hostPacket = buildGloveWellHostPacket(state, {
  sourceUrl: '/__lerms/glove-well-host-packet/current',
  generatedAtMs: 90_500,
  capture: {
    state: 'complete',
    reportPath: '/tmp/lerms-glove-well-browser-smoke-capture-live/capture-report.json',
    filmstripPath: '/tmp/lerms-glove-well-browser-smoke-capture-live/filmstrip.html'
  }
});
assert.equal(hostPacket.schema, 'lerms.glove-well-host-packet.v0');
assert.equal(hostPacket.route, 'lerms/glove-well/host-packet');
assert.equal(hostPacket.hostCandidate.hostId, 'glove-well');
assert.equal(hostPacket.hostCandidate.kind, 'kaminos_native_host_candidate');
assert.equal(hostPacket.source.producerDiaulos, 'greedy-glove-fucker');
assert.equal(hostPacket.source.authority, 'live_simulation');
assert.equal(hostPacket.source.sourceTruthAuthority, 'lerms.gloveWellBrowserSmokeState');
assert.equal(hostPacket.source.effectiveRoute, LIVE_BACKEND);
assert.equal(hostPacket.freshness.status, 'fresh');
assert.equal(hostPacket.coordinateFrame.space, 'operator_visible_webcam_mirrored_screen_normalized');
assert.equal(hostPacket.gloveWell.phase, 'priming');
assert.equal(hostPacket.gloveWell.releaseCount, 1);
assert.equal(hostPacket.handSkeleton.schema, 'lerms.glove-well-hand-skeleton-overlay.v0');
assert.equal(hostPacket.handSkeleton.landmarkCount, 21);
assert.deepEqual(hostPacket.handSkeleton.landmarks[20], { x: 0.33, y: 0.595 });
assert.equal(hostPacket.goins.length >= 2, true, 'host packet carries the held goin plus persistent rolling goin');
assert.equal(hostPacket.goins.some((goin) => goin.state === 'held'), true);
assert.equal(hostPacket.goins.some((goin) => goin.state === 'rolling'), true);
assert.equal(hostPacket.command.schema, 'lerms.glove-well-command-trace.v0');
assert.equal(hostPacket.command.phase, 'priming');
assert.equal(hostPacket.command.heldGoinId, 'primed-goin-002');
assert.equal(hostPacket.command.launchedGoinId, 'launched-goin-001');
assert.equal(hostPacket.command.releaseEventId, 'glove-well-release-001');
assert.equal(hostPacket.command.inputAuthority, 'live_simulation');
assert.equal(hostPacket.command.liveGloveWellAuthority, false);
assert.equal(hostPacket.sourceTruth.handInputAuthority, 'live_simulation');
assert.equal(hostPacket.sourceTruth.handInputFreshness, 'fresh');
assert.equal(hostPacket.sourceTruth.goinSimulationAuthority, 'live_simulation');
assert.equal(hostPacket.sourceTruth.liveGloveWellAuthority, false);
assert.equal(hostPacket.sourceTruth.kaminosAcceptance, false);
assert.equal(hostPacket.goinCustody.schema, 'lerms.glove-well-goin-custody-chain.v0');
assert.deepEqual(hostPacket.goinCustody.heldGoinIds, ['primed-goin-002']);
assert.deepEqual(hostPacket.goinCustody.launchedGoinIds, ['launched-goin-001']);
assert.equal(hostPacket.goinCustody.launchEvents.at(-1)?.eventId, 'glove-well-release-001');
assert.equal(hostPacket.goinCustody.launchEvents.at(-1)?.goinId, 'launched-goin-001');
assert.equal(hostPacket.goinCustody.invariants.launchedGoinsPersist, true);
assert.equal(hostPacket.goinCustody.invariants.secondPinchAllocatesNewHeldGoin, true);
assert.equal(hostPacket.goinCustody.invariants.handInputCannotPromoteLiveAuthority, true);
assert.equal(hostPacket.lermDesireHints.some((hint) => hint.reason === 'rolling_goin_lure' && hint.targetGoinId === rollingAfterRepinch!.id), true);
assert.equal(hostPacket.capture.state, 'complete');
assert.equal(hostPacket.capture.filmstripPath, '/tmp/lerms-glove-well-browser-smoke-capture-live/filmstrip.html');
assert.ok(hostPacket.downgrades.includes('local_browser_smoke_not_native_kaminos_host'));
assert.ok(hostPacket.downgrades.includes('visual_capture_not_source_truth'));
assert.ok(hostPacket.custody.greedyOwns.includes('goinObjecthoodTruth'));
assert.ok(hostPacket.custody.greedyOwns.includes('gloveWellCommandTruth'));
assert.ok(hostPacket.custody.kaminosOwns.includes('native host display'));
assert.equal(
  hostPacket.rejectedDebugSurfaces.some((surface) => surface.surface === 'local_lerms_browser_smoke' && surface.acceptanceSurface === false),
  true
);

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
assert.equal(staleState.handSkeleton.visible, true, 'stale state preserves last trustworthy skeleton overlay with stale authority');

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
const fallbackPacket = buildGloveWellHostPacket(fallbackState, {
  sourceUrl: '/__lerms/glove-well-host-packet/current',
  generatedAtMs: 90_721
});
assert.equal(fallbackPacket.sourceTruth.handInputAuthority, 'fallback');
assert.equal(fallbackPacket.sourceTruth.handInputFreshness, 'fallback');
assert.equal(fallbackPacket.sourceTruth.liveGloveWellAuthority, false);
assert.equal(fallbackPacket.goinCustody.invariants.handInputCannotPromoteLiveAuthority, true);

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
