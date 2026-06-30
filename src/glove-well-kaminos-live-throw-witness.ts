import {
  mkdirSync,
  readFileSync,
  writeFileSync
} from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { SimulationAuthority } from './contracts/first-vertical.ts';
import {
  GLOVE_INPUT_LIVE_REQUESTED_ROUTE
} from './glove-well-command.ts';
import {
  WILOR_GLOVE_INPUT_PACKET_SCHEMA,
  GLOVE_INPUT_WILOR_LIVE_EFFECTIVE_ROUTE,
  type WilorMiniGloveInputPacket,
  type WilorLandmarkRow
} from './glove-input-wilor-adapter.ts';
import {
  buildGloveWellLiveThrowCompositionWitnessReport,
  type GloveWellLiveThrowCompositionWitnessReport
} from './glove-well-live-throw-composition-witness.ts';

export const GLOVE_WELL_KAMINOS_LIVE_THROW_WITNESS_SCHEMA = 'lerms.glove-well-kaminos-live-throw-witness.v0' as const;
export const GLOVE_WELL_KAMINOS_LIVE_THROW_WITNESS_ROUTE = 'lerms/glove-well/kaminos-live-throw-witness-file' as const;
export const KAMINOS_HAND_CONTROL_EVENT_CACHE_SCHEMA = 'kaminos.hand-control-sidecar-event-cache.v0' as const;
export const PERCEPTASIA_HAND_CONTROL_SCHEMA = 'perceptasia.hand-control.v0' as const;
export const KAMINOS_HAND_CONTROL_TRANSPORT_SCHEMA = 'lerms.kaminos-hand-control-event-cache-transport.v0' as const;
export const DEFAULT_KAMINOS_SIDECAR_EVENT_URL = 'http://127.0.0.1:8096/hand-control-sidecar-event' as const;

type TransportMode = 'fixture_event_cache' | 'live_event_cache';

interface CliArgs {
  report: string | null;
  eventCache: string | null;
  sidecarEventUrl: string;
  frameId: string;
  timestampMs: number;
  sampleCount: number;
  pollIntervalMs: number;
  maxPolls: number;
  maxCacheAgeMs: number;
  kaminosBranch: string | null;
  kaminosCommit: string | null;
}

export interface PerceptasiaHandControlEvent {
  schema?: typeof PERCEPTASIA_HAND_CONTROL_SCHEMA | string;
  source_backend?: string;
  effective_route?: string;
  timestamp?: number;
  frame_id?: string;
  handedness?: string;
  confidence?: number;
  video_size?: {
    width: number;
    height: number;
  };
  palm_center?: {
    x: number;
    y: number;
  };
  landmarks_2d?: Array<{ x: number; y: number; z?: number }>;
  landmarks_3d?: Array<{ x: number; y: number; z?: number }>;
  world_landmarks?: Array<{ x: number; y: number; z?: number }>;
  pinch_distance?: number;
  openness?: number;
  fist_score?: number;
  spread?: number;
  native_frame_timing?: {
    capture_timestamp_ms?: number;
    capture_epoch_ms?: number;
    sidecar_received_epoch_ms?: number;
    model_latency_ms?: number;
  };
  webcam_frame?: {
    visible?: boolean;
    synthetic?: boolean;
    width?: number;
    height?: number;
    frame_ref?: string;
  };
  debug?: {
    evidence_route?: string;
    model_route?: string;
    device_route?: string;
    telemetry?: {
      model_latency_ms?: number;
      frame_age_ms?: number;
      include_vertices?: boolean;
    } | null;
    backend_errors?: unknown[];
  };
}

export interface KaminosHandControlSidecarEventCache {
  schema: typeof KAMINOS_HAND_CONTROL_EVENT_CACHE_SCHEMA | string;
  status: 'stored' | 'empty' | string;
  sequence: number;
  stored_at_ms: number | null;
  age_ms: number | null;
  event: PerceptasiaHandControlEvent | null;
}

export interface BuildGloveWellKaminosLiveThrowWitnessOptions {
  outputPath: string;
  frameId: string;
  timestampMs: number;
  eventCaches: readonly KaminosHandControlSidecarEventCache[];
  sidecarEventUrl?: string;
  eventCachePath?: string | null;
  transportMode?: TransportMode;
  maxCacheAgeMs?: number;
  kaminosBranch?: string | null;
  kaminosCommit?: string | null;
}

export interface FetchKaminosEventCachesOptions {
  sidecarEventUrl?: string;
  sampleCount?: number;
  pollIntervalMs?: number;
  maxPolls?: number;
}

interface KaminosLiveThrowTransport {
  schema: typeof KAMINOS_HAND_CONTROL_TRANSPORT_SCHEMA;
  transportMode: TransportMode;
  sidecarEventUrl: string;
  eventCachePath: string | null;
  kaminosBranch: string | null;
  kaminosCommit: string | null;
  eventCacheSchema: typeof KAMINOS_HAND_CONTROL_EVENT_CACHE_SCHEMA;
  eventSchema: typeof PERCEPTASIA_HAND_CONTROL_SCHEMA;
  cacheSequences: number[];
  sequenceRange: {
    first: number;
    last: number;
  };
  packetFrameIds: string[];
  webcamFrameRefs: string[];
  maxCacheAgeMs: number;
  maxCameraFrameAgeMs: number;
  sourceBackends: string[];
  effectiveRoutes: string[];
  modelRoutes: string[];
  webcamSyntheticCount: number;
  fallbackCount: number;
}

interface KaminosLiveThrowSourceTruth {
  effectiveAuthority: SimulationAuthority;
  inputAuthority: SimulationAuthority;
  transportAuthority: SimulationAuthority;
  transportMode: TransportMode;
  requestedRoutes: string[];
  effectiveRoutes: string[];
  producerConfigIds: string[];
  fallbackReasons: string[];
  maxCameraFrameAgeMs: number;
  maxCacheAgeMs: number;
  nonFallbackLivePacketCount: number;
  fallbackPacketCount: number;
  staleCommandCount: number;
  webcamSyntheticCount: number;
}

export interface GloveWellKaminosLiveThrowWitnessReport {
  ok: true;
  schema: typeof GLOVE_WELL_KAMINOS_LIVE_THROW_WITNESS_SCHEMA;
  route: typeof GLOVE_WELL_KAMINOS_LIVE_THROW_WITNESS_ROUTE;
  outputPath: string;
  frameId: string;
  timestampMs: number;
  transport: KaminosLiveThrowTransport;
  sourceTruth: KaminosLiveThrowSourceTruth;
  liveThrow: GloveWellLiveThrowCompositionWitnessReport;
  whatRemainsFake: {
    sidecarProcessManager: boolean;
    fullVerticalSuccess: true;
    carrierDropJuiceHitMerge: true;
    finalGoinMesh: true;
    fullCrowdAi: true;
  };
}

interface KaminosLiveThrowFailureReport {
  ok: false;
  schema: typeof GLOVE_WELL_KAMINOS_LIVE_THROW_WITNESS_SCHEMA;
  route: typeof GLOVE_WELL_KAMINOS_LIVE_THROW_WITNESS_ROUTE;
  phase: 'building-glove-well-kaminos-live-throw-witness';
  failureKind: 'kaminos-live-throw-invalid' | 'kaminos-live-throw-release-missing';
  error: string;
  lastTrustworthyEvidence: {
    outputPath: string;
    eventCachePath: string | null;
    sidecarEventUrl: string;
    frameId: string;
    timestampMs: number;
    sampleCount: number;
  };
}

export function buildGloveWellKaminosLiveThrowWitnessReport({
  outputPath,
  frameId,
  timestampMs,
  eventCaches,
  sidecarEventUrl = DEFAULT_KAMINOS_SIDECAR_EVENT_URL,
  eventCachePath = null,
  transportMode = 'fixture_event_cache',
  maxCacheAgeMs = 180,
  kaminosBranch = null,
  kaminosCommit = null
}: BuildGloveWellKaminosLiveThrowWitnessOptions): GloveWellKaminosLiveThrowWitnessReport {
  assertFinite(maxCacheAgeMs, 'maxCacheAgeMs');
  const normalized = normalizeKaminosEventCaches(eventCaches, { maxCacheAgeMs });
  const packets = normalized.map((row) => row.packet);
  const liveThrowRaw = buildGloveWellLiveThrowCompositionWitnessReport({
    outputPath: `${outputPath}#live-throw`,
    frameId: `${frameId}-live-throw`,
    timestampMs,
    packets,
    inputPacketPath: eventCachePath
  });
  const liveThrow = reframePreviewTransport(liveThrowRaw, transportMode);
  const transport = summarizeTransport({
    eventCaches: normalized.map((row) => row.cache),
    packets,
    sidecarEventUrl,
    eventCachePath,
    transportMode,
    kaminosBranch,
    kaminosCommit
  });
  const transportAuthority: SimulationAuthority = transportMode === 'live_event_cache' ? 'live_simulation' : 'synthetic_fixture';
  const effectiveAuthority = weakestAuthority([liveThrow.sourceTruth.effectiveAuthority, transportAuthority]);

  return {
    ok: true,
    schema: GLOVE_WELL_KAMINOS_LIVE_THROW_WITNESS_SCHEMA,
    route: GLOVE_WELL_KAMINOS_LIVE_THROW_WITNESS_ROUTE,
    outputPath,
    frameId,
    timestampMs,
    transport,
    sourceTruth: {
      effectiveAuthority,
      inputAuthority: liveThrow.sourceTruth.inputAuthority,
      transportAuthority,
      transportMode,
      requestedRoutes: liveThrow.sourceTruth.requestedRoutes,
      effectiveRoutes: liveThrow.sourceTruth.effectiveRoutes,
      producerConfigIds: liveThrow.sourceTruth.producerConfigIds,
      fallbackReasons: liveThrow.sourceTruth.fallbackReasons,
      maxCameraFrameAgeMs: liveThrow.sourceTruth.maxCameraFrameAgeMs,
      maxCacheAgeMs: transport.maxCacheAgeMs,
      nonFallbackLivePacketCount: liveThrow.sourceTruth.nonFallbackLivePacketCount,
      fallbackPacketCount: liveThrow.sourceTruth.fallbackPacketCount,
      staleCommandCount: liveThrow.sourceTruth.staleCommandCount,
      webcamSyntheticCount: transport.webcamSyntheticCount
    },
    liveThrow,
    whatRemainsFake: {
      sidecarProcessManager: transportMode !== 'live_event_cache',
      fullVerticalSuccess: true,
      carrierDropJuiceHitMerge: true,
      finalGoinMesh: true,
      fullCrowdAi: true
    }
  };
}

export async function collectKaminosEventCaches({
  sidecarEventUrl = DEFAULT_KAMINOS_SIDECAR_EVENT_URL,
  sampleCount = 3,
  pollIntervalMs = 120,
  maxPolls = 30
}: FetchKaminosEventCachesOptions = {}): Promise<KaminosHandControlSidecarEventCache[]> {
  assertPositiveInteger(sampleCount, 'sampleCount');
  assertPositiveInteger(maxPolls, 'maxPolls');
  assertFinite(pollIntervalMs, 'pollIntervalMs');
  const collected: KaminosHandControlSidecarEventCache[] = [];
  let after: number | null = null;

  for (let poll = 0; poll < maxPolls && collected.length < sampleCount; poll += 1) {
    const url = new URL(sidecarEventUrl);
    if (after !== null) url.searchParams.set('after', String(after));
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Kaminos sidecar event fetch failed with HTTP ${response.status}`);
    }
    const cache = (await response.json()) as KaminosHandControlSidecarEventCache;
    if (cache.status === 'stored' && cache.event) {
      collected.push(cache);
      after = cache.sequence;
    }
    if (collected.length < sampleCount) {
      await sleep(pollIntervalMs);
    }
  }

  if (collected.length < sampleCount) {
    throw new Error(`Kaminos sidecar event fetch collected ${collected.length} of ${sampleCount} requested samples`);
  }
  return collected;
}

export async function runGloveWellKaminosLiveThrowWitnessCli(argv = process.argv.slice(2)): Promise<number> {
  let args: CliArgs;
  try {
    args = parseArgs(argv);
  } catch (error) {
    process.stderr.write(`${messageFor(error)}\n`);
    return 1;
  }

  if (!args.report) {
    process.stderr.write('missing required --report path\n');
    return 1;
  }

  try {
    const eventCaches = args.eventCache
      ? readEventCacheFile(args.eventCache)
      : await collectKaminosEventCaches({
          sidecarEventUrl: args.sidecarEventUrl,
          sampleCount: args.sampleCount,
          pollIntervalMs: args.pollIntervalMs,
          maxPolls: args.maxPolls
        });
    writeJson(
      args.report,
      buildGloveWellKaminosLiveThrowWitnessReport({
        outputPath: args.report,
        frameId: args.frameId,
        timestampMs: args.timestampMs,
        eventCaches,
        sidecarEventUrl: args.sidecarEventUrl,
        eventCachePath: args.eventCache,
        transportMode: args.eventCache ? 'fixture_event_cache' : 'live_event_cache',
        maxCacheAgeMs: args.maxCacheAgeMs,
        kaminosBranch: args.kaminosBranch,
        kaminosCommit: args.kaminosCommit
      })
    );
    return 0;
  } catch (error) {
    writeJson(args.report, buildFailureReport(args, error));
    return 1;
  }
}

interface NormalizedCache {
  cache: KaminosHandControlSidecarEventCache;
  packet: WilorMiniGloveInputPacket;
}

function normalizeKaminosEventCaches(
  eventCaches: readonly KaminosHandControlSidecarEventCache[],
  { maxCacheAgeMs }: { maxCacheAgeMs: number }
): NormalizedCache[] {
  if (eventCaches.length === 0) {
    throw new Error('Kaminos live throw witness requires at least one stored event cache');
  }

  let previousSequence = Number.NEGATIVE_INFINITY;
  let pinkyHoldStartMs: number | null = null;
  return eventCaches.map((cache) => {
    assertEventCache(cache, maxCacheAgeMs);
    if (cache.sequence <= previousSequence) {
      throw new Error('Kaminos hand-control event cache sequence must be monotonic');
    }
    previousSequence = cache.sequence;
    const event = cache.event;
    if (!event) {
      throw new Error('Kaminos hand-control event cache requires a stored event');
    }
    const timestampMs = finite(event.timestamp) ?? finite(event.native_frame_timing?.capture_timestamp_ms) ?? 0;
    if (pinkyHoldStartMs === null) {
      pinkyHoldStartMs = timestampMs;
    }
    const pinkyHoldMs = Math.max(0, timestampMs - pinkyHoldStartMs);
    return {
      cache,
      packet: eventToWilorPacket(event, cache, pinkyHoldMs)
    };
  });
}

function assertEventCache(cache: KaminosHandControlSidecarEventCache, maxCacheAgeMs: number): void {
  if (cache.schema !== KAMINOS_HAND_CONTROL_EVENT_CACHE_SCHEMA) {
    throw new Error(`Kaminos hand-control event cache schema must be ${KAMINOS_HAND_CONTROL_EVENT_CACHE_SCHEMA}`);
  }
  assertFinite(cache.sequence, 'cache.sequence');
  if (cache.status !== 'stored' || !cache.event) {
    throw new Error('Kaminos live throw witness requires a stored event');
  }
  if (cache.age_ms === null || cache.age_ms === undefined) {
    throw new Error('Kaminos hand-control event cache requires age_ms');
  }
  assertFinite(cache.age_ms, 'cache.age_ms');
  if (cache.age_ms > maxCacheAgeMs) {
    throw new Error(`stale Kaminos hand-control event cache age_ms ${cache.age_ms} exceeds maxCacheAgeMs ${maxCacheAgeMs}`);
  }
  assertEvent(cache.event);
}

function assertEvent(event: PerceptasiaHandControlEvent): void {
  if (event.schema !== PERCEPTASIA_HAND_CONTROL_SCHEMA) {
    throw new Error(`Kaminos event must contain ${PERCEPTASIA_HAND_CONTROL_SCHEMA}`);
  }
  const effectiveRoute = event.debug?.evidence_route ?? event.effective_route ?? event.source_backend;
  if (event.source_backend !== GLOVE_INPUT_WILOR_LIVE_EFFECTIVE_ROUTE || effectiveRoute !== GLOVE_INPUT_WILOR_LIVE_EFFECTIVE_ROUTE) {
    throw new Error(`non-live Kaminos hand-control route ${effectiveRoute ?? 'missing'}`);
  }
  if (!event.debug?.model_route || !event.debug.evidence_route) {
    throw new Error('Kaminos hand-control event requires route/config identity');
  }
  if (!event.webcam_frame || event.webcam_frame.visible !== true) {
    throw new Error('Kaminos hand-control event requires visible webcam_frame');
  }
  if (event.webcam_frame.synthetic !== false) {
    throw new Error('Kaminos hand-control event contains synthetic webcam frame');
  }
  if (!Array.isArray(event.landmarks_2d) || event.landmarks_2d.length < 21) {
    throw new Error('Kaminos hand-control event requires at least 21 landmarks_2d landmarks');
  }
  const timestamp = finite(event.timestamp) ?? finite(event.native_frame_timing?.capture_timestamp_ms);
  if (timestamp === null) {
    throw new Error('Kaminos hand-control event requires timestamp');
  }
  if (!event.frame_id) {
    throw new Error('Kaminos hand-control event requires frame_id');
  }
  if (!event.video_size || event.video_size.width <= 0 || event.video_size.height <= 0) {
    throw new Error('Kaminos hand-control event requires positive video_size');
  }
  if (!event.palm_center) {
    throw new Error('Kaminos hand-control event requires palm_center');
  }
}

function eventToWilorPacket(
  event: PerceptasiaHandControlEvent,
  cache: KaminosHandControlSidecarEventCache,
  pinkyHoldMs: number
): WilorMiniGloveInputPacket {
  const timestampMs = finite(event.timestamp) ?? finite(event.native_frame_timing?.capture_timestamp_ms) ?? 0;
  const modelLatencyMs = finite(event.native_frame_timing?.model_latency_ms) ?? finite(event.debug?.telemetry?.model_latency_ms) ?? undefined;
  const cameraFrameAgeMs = Math.max(cache.age_ms ?? 0, finite(event.debug?.telemetry?.frame_age_ms) ?? 0);
  const roundTripMs = roundTripFor(event, cache);

  return {
    schema: WILOR_GLOVE_INPUT_PACKET_SCHEMA,
    frameId: event.frame_id ?? `kaminos-cache-${cache.sequence}`,
    timestampMs,
    source: {
      requestedRoute: GLOVE_INPUT_LIVE_REQUESTED_ROUTE,
      effectiveRoute: event.debug?.evidence_route ?? event.effective_route ?? event.source_backend ?? '',
      backend: event.source_backend ?? '',
      model: event.debug?.model_route,
      configId: `kaminos:${event.debug?.model_route ?? event.source_backend}`,
      fallbackReason: null
    },
    timing: {
      cameraFrameAgeMs,
      modelLatencyMs,
      publishAgeMs: cache.age_ms ?? undefined,
      roundTripMs
    },
    coordinateFrame: {
      space: 'screen_normalized',
      origin: 'top_left',
      handedness: 'operator_unmirrored'
    },
    hand: {
      handedness: normalizeHandedness(event.handedness),
      confidence: event.confidence ?? 1,
      palmCenter: event.palm_center,
      landmarks: (event.landmarks_2d ?? []).map((point, index): WilorLandmarkRow => ({
        index,
        x: point.x,
        y: point.y,
        z: point.z
      }))
    },
    gestures: {
      pinkyHoldMs
    }
  };
}

function summarizeTransport({
  eventCaches,
  packets,
  sidecarEventUrl,
  eventCachePath,
  transportMode,
  kaminosBranch,
  kaminosCommit
}: {
  eventCaches: readonly KaminosHandControlSidecarEventCache[];
  packets: readonly WilorMiniGloveInputPacket[];
  sidecarEventUrl: string;
  eventCachePath: string | null;
  transportMode: TransportMode;
  kaminosBranch: string | null;
  kaminosCommit: string | null;
}): KaminosLiveThrowTransport {
  const sequences = eventCaches.map((cache) => cache.sequence);
  const events = eventCaches.map((cache) => cache.event).filter((event): event is PerceptasiaHandControlEvent => Boolean(event));

  return {
    schema: KAMINOS_HAND_CONTROL_TRANSPORT_SCHEMA,
    transportMode,
    sidecarEventUrl,
    eventCachePath,
    kaminosBranch,
    kaminosCommit,
    eventCacheSchema: KAMINOS_HAND_CONTROL_EVENT_CACHE_SCHEMA,
    eventSchema: PERCEPTASIA_HAND_CONTROL_SCHEMA,
    cacheSequences: sequences,
    sequenceRange: {
      first: sequences[0],
      last: sequences[sequences.length - 1]
    },
    packetFrameIds: packets.map((packet) => packet.frameId),
    webcamFrameRefs: events.map((event) => event.webcam_frame?.frame_ref).filter((ref): ref is string => Boolean(ref)),
    maxCacheAgeMs: Math.max(...eventCaches.map((cache) => cache.age_ms ?? 0)),
    maxCameraFrameAgeMs: Math.max(...packets.map((packet) => packet.timing.cameraFrameAgeMs)),
    sourceBackends: unique(events.map((event) => event.source_backend).filter((backend): backend is string => Boolean(backend))),
    effectiveRoutes: unique(events.map((event) => event.debug?.evidence_route ?? event.effective_route).filter((route): route is string => Boolean(route))),
    modelRoutes: unique(events.map((event) => event.debug?.model_route).filter((route): route is string => Boolean(route))),
    webcamSyntheticCount: events.filter((event) => event.webcam_frame?.synthetic !== false).length,
    fallbackCount: events.filter((event) => event.source_backend !== GLOVE_INPUT_WILOR_LIVE_EFFECTIVE_ROUTE || event.debug?.evidence_route !== GLOVE_INPUT_WILOR_LIVE_EFFECTIVE_ROUTE).length
  };
}

function reframePreviewTransport(
  liveThrow: GloveWellLiveThrowCompositionWitnessReport,
  transportMode: TransportMode
): GloveWellLiveThrowCompositionWitnessReport {
  const transportDowngrade = transportMode === 'fixture_event_cache' ? 'kaminos_event_cache_fixture_not_live_fetch' : null;
  const downgrades = liveThrow.previewBenchPayload.payload.downgrades.filter(
    (downgrade) => downgrade !== 'saved_wilor_packets_not_sidecar_process_manager'
  );
  if (transportDowngrade) downgrades.push(transportDowngrade);
  const previewBenchPayload = {
    ...liveThrow.previewBenchPayload,
    payload: {
      ...liveThrow.previewBenchPayload.payload,
      downgrades: unique(downgrades)
    }
  };
  return {
    ...liveThrow,
    throwPhysics: {
      ...liveThrow.throwPhysics,
      previewBenchPayload
    },
    previewBenchPayload
  };
}

function readEventCacheFile(path: string): KaminosHandControlSidecarEventCache[] {
  const parsed = JSON.parse(readFileSync(path, 'utf8')) as unknown;
  if (Array.isArray(parsed)) return parsed as KaminosHandControlSidecarEventCache[];
  if (isRecord(parsed) && Array.isArray(parsed.eventCaches)) return parsed.eventCaches as KaminosHandControlSidecarEventCache[];
  if (isRecord(parsed) && Array.isArray(parsed.snapshots)) return parsed.snapshots as KaminosHandControlSidecarEventCache[];
  if (isRecord(parsed)) return [parsed as unknown as KaminosHandControlSidecarEventCache];
  throw new Error('Kaminos event cache input must be an object or array');
}

function parseArgs(argv: readonly string[]): CliArgs {
  const args: CliArgs = {
    report: null,
    eventCache: null,
    sidecarEventUrl: DEFAULT_KAMINOS_SIDECAR_EVENT_URL,
    frameId: 'glove-well-kaminos-live-throw-witness',
    timestampMs: 0,
    sampleCount: 3,
    pollIntervalMs: 120,
    maxPolls: 30,
    maxCacheAgeMs: 180,
    kaminosBranch: null,
    kaminosCommit: null
  };

  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key.startsWith('--')) continue;
    if (value === undefined || value.startsWith('--')) {
      throw new Error(`missing value for ${key}`);
    }
    if (key === '--report') args.report = value;
    else if (key === '--event-cache') args.eventCache = value;
    else if (key === '--sidecar-event-url' || key === '--kaminos-sidecar-event-url') args.sidecarEventUrl = value;
    else if (key === '--frame-id') args.frameId = value;
    else if (key === '--timestamp-ms') args.timestampMs = Number(value);
    else if (key === '--sample-count') args.sampleCount = Number(value);
    else if (key === '--poll-interval-ms') args.pollIntervalMs = Number(value);
    else if (key === '--max-polls') args.maxPolls = Number(value);
    else if (key === '--max-cache-age-ms') args.maxCacheAgeMs = Number(value);
    else if (key === '--kaminos-branch') args.kaminosBranch = value;
    else if (key === '--kaminos-commit') args.kaminosCommit = value;
    else throw new Error(`unknown argument ${key}`);
    index += 1;
  }

  assertFinite(args.timestampMs, 'timestamp-ms');
  assertPositiveInteger(args.sampleCount, 'sample-count');
  assertPositiveInteger(args.maxPolls, 'max-polls');
  assertFinite(args.pollIntervalMs, 'poll-interval-ms');
  assertFinite(args.maxCacheAgeMs, 'max-cache-age-ms');
  return args;
}

function buildFailureReport(args: CliArgs, error: unknown): KaminosLiveThrowFailureReport {
  const message = messageFor(error);
  return {
    ok: false,
    schema: GLOVE_WELL_KAMINOS_LIVE_THROW_WITNESS_SCHEMA,
    route: GLOVE_WELL_KAMINOS_LIVE_THROW_WITNESS_ROUTE,
    phase: 'building-glove-well-kaminos-live-throw-witness',
    failureKind: message.includes('release command') ? 'kaminos-live-throw-release-missing' : 'kaminos-live-throw-invalid',
    error: message,
    lastTrustworthyEvidence: {
      outputPath: args.report ?? '',
      eventCachePath: args.eventCache,
      sidecarEventUrl: args.sidecarEventUrl,
      frameId: args.frameId,
      timestampMs: args.timestampMs,
      sampleCount: args.sampleCount
    }
  };
}

function roundTripFor(event: PerceptasiaHandControlEvent, cache: KaminosHandControlSidecarEventCache): number | undefined {
  const captureEpoch = finite(event.native_frame_timing?.capture_epoch_ms);
  const sidecarReceived = finite(event.native_frame_timing?.sidecar_received_epoch_ms);
  if (captureEpoch !== null && sidecarReceived !== null) {
    return Math.max(0, sidecarReceived - captureEpoch + (cache.age_ms ?? 0));
  }
  return cache.age_ms ?? undefined;
}

function normalizeHandedness(value: string | undefined): 'right' | 'left' | 'unknown' {
  const normalized = (value ?? '').toLowerCase();
  if (normalized === 'right') return 'right';
  if (normalized === 'left') return 'left';
  return 'unknown';
}

function weakestAuthority(authorities: readonly SimulationAuthority[]): SimulationAuthority {
  const rank: Record<SimulationAuthority, number> = {
    invalid: 0,
    fallback: 1,
    visual_only: 2,
    synthetic_fixture: 3,
    stale_hold: 4,
    live_simulation: 5
  };
  return authorities.reduce(
    (weakest, authority) => (rank[authority] < rank[weakest] ? authority : weakest),
    'live_simulation' as SimulationAuthority
  );
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function finite(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function assertFinite(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be finite`);
  }
}

function assertPositiveInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive integer`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function messageFor(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function writeJson(path: string, payload: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(payload, null, 2)}\n`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runGloveWellKaminosLiveThrowWitnessCli().then((code) => {
    process.exitCode = code;
  });
}
