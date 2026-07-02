import {
  buildGloveWellBrowserSmokeState,
  buildGloveWellHostPacket,
  buildInitialGloveWellBrowserSmokeState,
  type BrowserSmokeCacheSnapshot,
  type BrowserSmokeState,
  type GloveWellHostPacket,
  type GloveWellHostPacketCapture
} from './glove-well-browser-smoke-state.ts';

export const GLOVE_WELL_LIVE_HOST_PACKET_ROUTE = '/__lerms/glove-well-host-packet/live' as const;
export const DEFAULT_GLOVE_WELL_LIVE_EVENT_ENDPOINT = 'http://127.0.0.1:8096/hand-control-sidecar-event' as const;

export interface GloveWellLiveHostPacketStreamOptions {
  eventEndpoint?: string | null;
  sourceUrl?: string | null;
  maxCacheAgeMs?: number | null;
  capture?: GloveWellHostPacketCapture | null;
}

export interface GloveWellLiveHostPacketSampleOptions {
  nowMs?: number | null;
  generatedAtMs?: number | null;
  sourceUrl?: string | null;
  capture?: GloveWellHostPacketCapture | null;
}

export interface GloveWellLiveHostPacketStream {
  readonly eventEndpoint: string;
  readonly sourceUrl: string | null;
  readonly state: BrowserSmokeState;
  lastSequence(): number | null;
  ingestCache(cache: BrowserSmokeCacheSnapshot | null, options?: GloveWellLiveHostPacketSampleOptions): GloveWellHostPacket;
  ingestFetchFailure(error: unknown, options?: GloveWellLiveHostPacketSampleOptions): GloveWellHostPacket;
  packet(options?: GloveWellLiveHostPacketSampleOptions): GloveWellHostPacket;
}

export function createGloveWellLiveHostPacketStream(options: GloveWellLiveHostPacketStreamOptions = {}): GloveWellLiveHostPacketStream {
  const eventEndpoint = options.eventEndpoint?.trim() || DEFAULT_GLOVE_WELL_LIVE_EVENT_ENDPOINT;
  const sourceUrl = options.sourceUrl ?? GLOVE_WELL_LIVE_HOST_PACKET_ROUTE;
  let state = buildInitialGloveWellBrowserSmokeState(eventEndpoint);

  function packet(sampleOptions: GloveWellLiveHostPacketSampleOptions = {}): GloveWellHostPacket {
    return buildGloveWellHostPacket(state, {
      sourceUrl: sampleOptions.sourceUrl ?? sourceUrl,
      generatedAtMs: sampleOptions.generatedAtMs ?? sampleOptions.nowMs ?? Date.now(),
      capture: sampleOptions.capture ?? options.capture ?? null
    });
  }

  const stream: GloveWellLiveHostPacketStream = {
    eventEndpoint,
    sourceUrl,
    get state() {
      return state;
    },
    lastSequence() {
      return state.source.sequence;
    },
    ingestCache(cache, sampleOptions = {}) {
      state = buildGloveWellBrowserSmokeState({
        previous: state,
        cache,
        nowMs: sampleOptions.nowMs ?? Date.now(),
        endpoint: eventEndpoint,
        maxCacheAgeMs: options.maxCacheAgeMs ?? undefined
      });
      return packet(sampleOptions);
    },
    ingestFetchFailure(error, sampleOptions = {}) {
      state = {
        ...buildGloveWellBrowserSmokeState({
          previous: state,
          cache: null,
          nowMs: sampleOptions.nowMs ?? Date.now(),
          endpoint: eventEndpoint,
          maxCacheAgeMs: options.maxCacheAgeMs ?? undefined
        }),
        authority: 'invalid',
        statusCode: 'invalid',
        downgrades: ['kaminos_event_cache_fetch_failed'],
        lastError: error instanceof Error ? error.message : String(error)
      };
      return packet(sampleOptions);
    },
    packet
  };

  return stream;
}
