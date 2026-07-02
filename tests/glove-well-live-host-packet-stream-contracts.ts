import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  GLOVE_WELL_LIVE_HOST_PACKET_ROUTE,
  createGloveWellLiveHostPacketStream,
  type GloveWellLiveHostPacketStream
} from '../src/glove-well-live-host-packet-stream.ts';
import type { BrowserSmokeCacheSnapshot } from '../src/glove-well-browser-smoke-state.ts';

const LIVE_BACKEND = 'native_wilor_mini_mlx_detector_sidecar_live';
const EVENT_ENDPOINT = 'http://127.0.0.1:8096/hand-control-sidecar-event';

function snapshot(sequence: number, kind: 'prime' | 'aim' | 'release', ageMs = 54): BrowserSmokeCacheSnapshot {
  const pinched = kind !== 'release';
  const timestamp = 120_000 + sequence * 120;
  return {
    schema: 'kaminos.hand-control-sidecar-event-cache.v0',
    status: 'stored',
    sequence,
    stored_at_ms: timestamp + 8,
    age_ms: ageMs,
    event: {
      schema: 'perceptasia.hand-control.v0',
      source_backend: LIVE_BACKEND,
      timestamp,
      frame_id: `live-host-${kind}-${sequence}`,
      handedness: 'Right',
      confidence: 0.94,
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
        frame_ref: `webcam-live-host-${sequence}`
      },
      debug: {
        evidence_route: LIVE_BACKEND,
        model_route: 'wilor-mlx HandPosePipeline.from_pretrained',
        device_route: 'mlx',
        telemetry: {
          model_latency_ms: 58,
          frame_age_ms: ageMs
        }
      }
    }
  };
}

function assertStreamBasics(stream: GloveWellLiveHostPacketStream): void {
  assert.equal(stream.eventEndpoint, EVENT_ENDPOINT);
  assert.equal(stream.lastSequence(), null);
  assert.equal(stream.state.schema, 'lerms.glove-well-browser-smoke-state.v0');
  assert.equal(stream.state.source.endpoint, EVENT_ENDPOINT);
}

assert.equal(GLOVE_WELL_LIVE_HOST_PACKET_ROUTE, '/__lerms/glove-well-host-packet/live');

const stream = createGloveWellLiveHostPacketStream({ eventEndpoint: EVENT_ENDPOINT, sourceUrl: GLOVE_WELL_LIVE_HOST_PACKET_ROUTE });
assertStreamBasics(stream);

let packet = stream.ingestCache(snapshot(31, 'prime'), {
  nowMs: 120_000,
  generatedAtMs: 120_001,
  sourceUrl: GLOVE_WELL_LIVE_HOST_PACKET_ROUTE
});
assert.equal(stream.lastSequence(), 31);
assert.equal(packet.schema, 'lerms.glove-well-host-packet.v0');
assert.equal(packet.source.endpoint, EVENT_ENDPOINT);
assert.equal(packet.source.sourceUrl, GLOVE_WELL_LIVE_HOST_PACKET_ROUTE);
assert.equal(packet.source.authority, 'live_simulation');
assert.equal(packet.source.sequence, 31);
assert.equal(packet.freshness.status, 'fresh');
assert.equal(packet.gloveWell.phase, 'priming');
assert.equal(packet.surface.primitives.some((primitive) => primitive.role === 'held_goin'), true);
assert.ok(packet.downgrades.includes('local_browser_smoke_not_native_kaminos_host'));

packet = stream.ingestCache(snapshot(32, 'aim'), {
  nowMs: 120_120,
  generatedAtMs: 120_121,
  sourceUrl: GLOVE_WELL_LIVE_HOST_PACKET_ROUTE
});
assert.equal(packet.gloveWell.phase, 'aiming');
assert.equal(packet.surface.primitives.some((primitive) => primitive.role === 'aim_arc_sample'), true);

packet = stream.ingestCache(snapshot(33, 'release'), {
  nowMs: 120_240,
  generatedAtMs: 120_241,
  sourceUrl: GLOVE_WELL_LIVE_HOST_PACKET_ROUTE
});
assert.equal(packet.gloveWell.phase, 'released');
assert.equal(packet.goins.some((goin) => goin.state === 'rolling'), true);
assert.equal(packet.lermDesireHints.some((hint) => hint.reason === 'rolling_goin_lure'), true);

const stalePacket = stream.ingestCache(
  {
    schema: 'kaminos.hand-control-sidecar-event-cache.v0',
    status: 'empty',
    sequence: 33,
    stored_at_ms: null,
    age_ms: null,
    event: null
  },
  {
    nowMs: 120_360,
    generatedAtMs: 120_361,
    sourceUrl: GLOVE_WELL_LIVE_HOST_PACKET_ROUTE
  }
);
assert.equal(stalePacket.source.authority, 'live_simulation');
assert.equal(stalePacket.gloveWell.statusCode, 'no_new_packet');
assert.ok(stalePacket.downgrades.includes('kaminos_event_cache_no_new_packet'));
assert.equal(stalePacket.goins.some((goin) => goin.state === 'rolling'), true, 'world goins persist while the sidecar has no newer packet');

const tooOldPacket = stream.ingestCache(snapshot(34, 'aim', 400), {
  nowMs: 120_480,
  generatedAtMs: 120_481,
  sourceUrl: GLOVE_WELL_LIVE_HOST_PACKET_ROUTE
});
assert.equal(tooOldPacket.source.authority, 'stale_hold');
assert.equal(tooOldPacket.freshness.status, 'stale');
assert.ok(tooOldPacket.downgrades.includes('kaminos_event_cache_stale'));

const fallbackPacket = stream.ingestCache(
  {
    ...snapshot(35, 'aim'),
    event: {
      ...snapshot(35, 'aim').event!,
      source_backend: 'saved_wilor_fixture',
      debug: {
        ...snapshot(35, 'aim').event!.debug,
        evidence_route: 'saved_wilor_fixture'
      }
    }
  },
  {
    nowMs: 120_600,
    generatedAtMs: 120_601,
    sourceUrl: GLOVE_WELL_LIVE_HOST_PACKET_ROUTE
  }
);
assert.equal(fallbackPacket.source.authority, 'fallback');
assert.equal(fallbackPacket.freshness.status, 'fallback');
assert.ok(fallbackPacket.downgrades.includes('kaminos_event_cache_non_live_route'));

const fetchFailedPacket = stream.ingestFetchFailure('connect ECONNREFUSED 127.0.0.1:8096', {
  nowMs: 120_720,
  generatedAtMs: 120_721,
  sourceUrl: GLOVE_WELL_LIVE_HOST_PACKET_ROUTE
});
assert.equal(fetchFailedPacket.source.authority, 'invalid');
assert.equal(fetchFailedPacket.freshness.status, 'invalid');
assert.equal(fetchFailedPacket.gloveWell.statusCode, 'invalid');
assert.ok(fetchFailedPacket.downgrades.includes('kaminos_event_cache_fetch_failed'));
assert.match(fetchFailedPacket.gloveWell.hand.pinchDistance === null ? 'null' : 'value', /null|value/);

const viteConfig = readFileSync(new URL('../vite.config.ts', import.meta.url), 'utf8');
assert.match(viteConfig, /__lerms\/glove-well-host-packet\/live/, 'dev server exposes a live Glove Well host packet endpoint for Kaminos polling');
assert.match(viteConfig, /createGloveWellLiveHostPacketStream/, 'Vite route uses the source-owned Glove Well live packet stream, not an ad hoc packet shim');
assert.match(viteConfig, /Access-Control-Allow-Origin/, 'live packet route exposes CORS headers for the Kaminos host server');
assert.match(viteConfig, /hand-control-sidecar-event/, 'live packet route defaults to the WiLoR Mini hand-control sidecar cache');

console.log('glove well live host packet stream contracts passed');
