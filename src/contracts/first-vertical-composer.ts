import {
  FIRST_VERTICAL_INTERFACE_SCHEMA,
  SOURCE_TRUTH_SCHEMA,
  assertFirstVerticalFrame,
  type FirstVerticalFrame,
  type SimulationAuthority,
  type SourceTruth
} from './first-vertical.ts';
import type { HillOfHillsTerrain } from '../terrain/hill-of-hills.ts';

export interface ComposeFirstVerticalFrameOptions {
  frameId: string;
  timestampMs: number;
  terrain: HillOfHillsTerrain;
  sources?: readonly FirstVerticalFrame[];
  maxSampleAgeMs?: number;
  route?: string;
}

export function composeFirstVerticalFrame({
  frameId,
  timestampMs,
  terrain,
  sources = [],
  maxSampleAgeMs = 500,
  route = 'first-vertical-composer'
}: ComposeFirstVerticalFrameOptions): FirstVerticalFrame {
  const allSources = [createTerrainOnlyFrame(terrain), ...sources];

  assertFreshSources(allSources, maxSampleAgeMs);
  assertNoDuplicateIds(
    allSources.flatMap((source) => source.terrainSamples.map((sample) => sample.id)),
    'terrain sample'
  );
  assertNoDuplicateIds(
    allSources.flatMap((source) => source.lerms.map((lerm) => lerm.id)),
    'lerm'
  );
  assertNoDuplicateIds(
    allSources.flatMap((source) => source.goins.map((goin) => goin.id)),
    'goin'
  );
  assertNoDuplicateIds(
    allSources.flatMap((source) => source.juiceHits.map((hit) => hit.id)),
    'juice hit'
  );
  assertNoDuplicateIds(
    allSources.flatMap((source) => source.carrierDropEvents.map((drop) => drop.id)),
    'carrier drop event'
  );

  const frame: FirstVerticalFrame = {
    schema: FIRST_VERTICAL_INTERFACE_SCHEMA,
    source: createComposedSource(route, frameId, timestampMs, allSources),
    terrainSamples: allSources.flatMap((source) => source.terrainSamples),
    lerms: allSources.flatMap((source) => source.lerms),
    goins: allSources.flatMap((source) => source.goins),
    juiceHits: allSources.flatMap((source) => source.juiceHits),
    carrierDropEvents: allSources.flatMap((source) => source.carrierDropEvents)
  };

  assertFirstVerticalFrame(frame);
  return frame;
}

function createTerrainOnlyFrame(terrain: HillOfHillsTerrain): FirstVerticalFrame {
  return {
    schema: FIRST_VERTICAL_INTERFACE_SCHEMA,
    source: terrain.source,
    terrainSamples: terrain.samples,
    lerms: [],
    goins: [],
    juiceHits: [],
    carrierDropEvents: []
  };
}

function createComposedSource(
  route: string,
  frameId: string,
  timestampMs: number,
  frames: readonly FirstVerticalFrame[]
): SourceTruth {
  return {
    schema: SOURCE_TRUTH_SCHEMA,
    authority: foldAuthority(frames.map((frame) => frame.source.authority)),
    route,
    frameId,
    timestampMs,
    sampleAgeMs: Math.max(0, ...frames.map((frame) => frame.source.sampleAgeMs)),
    backend: 'first-vertical-composer',
    configId: frames.map((frame) => frame.source.configId ?? frame.source.frameId).join('+')
  };
}

function assertFreshSources(frames: readonly FirstVerticalFrame[], maxSampleAgeMs: number): void {
  for (const frame of frames) {
    if (frame.source.sampleAgeMs > maxSampleAgeMs) {
      throw new Error(
        `stale source "${frame.source.route}" age ${frame.source.sampleAgeMs}ms exceeds ${maxSampleAgeMs}ms`
      );
    }
  }
}

function assertNoDuplicateIds(ids: readonly string[], label: string): void {
  const seen = new Set<string>();

  for (const id of ids) {
    if (seen.has(id)) {
      throw new Error(`duplicate ${label} id "${id}"`);
    }
    seen.add(id);
  }
}

function foldAuthority(authorities: readonly SimulationAuthority[]): SimulationAuthority {
  if (authorities.includes('invalid')) return 'invalid';
  if (authorities.includes('fallback')) return 'fallback';
  if (authorities.includes('stale_hold')) return 'stale_hold';
  if (authorities.includes('visual_only')) return 'visual_only';
  if (authorities.includes('synthetic_fixture')) return 'synthetic_fixture';
  return 'live_simulation';
}
