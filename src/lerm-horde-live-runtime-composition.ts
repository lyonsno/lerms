import {
  LERM_HORDE_PRODUCER_REVISION,
  type LermHordeProducerHistoryCompositionReceipt,
} from './lerm-horde-producer-history-composition.js';
import {
  HILL_OF_HILLS_PRODUCER_CONTACT_HISTORY_SCHEMA,
  type HillOfHillsProducerContactHistory,
  type HillOfHillsProducerContactHistorySample,
  type HillOfHillsVec3,
} from './terrain/hill-of-hills-producer-contact-history.js';
import {
  HILL_OF_HILLS_TERRAIN_BUFFER_SCHEMA,
  createHillOfHillsLayerTileCache,
  createHillOfHillsTerrainBuffer,
  createHillOfHillsTerrainWithCache,
  defaultHillOfHillsParams,
  sampleHillOfHillsTerrain,
  type HillOfHillsLayerTileCache,
  type HillOfHillsSourceOptions,
  type HillOfHillsTerrain,
  type HillOfHillsTerrainBuffer,
  type HillOfHillsTerrainParams,
} from './terrain/hill-of-hills.js';

export const LERM_HORDE_LIVE_RUNTIME_SCHEMA =
  'lerms.horde-live-runtime-composition.v0' as const;
export const LERM_HORDE_LIVE_RUNTIME_ROUTE =
  'lerms/lerm-horde/live-runtime-composition-v0' as const;
export const LERM_HORDE_LIVE_HILL_ROUTE =
  'hill-of-hills/horde-live-runtime-composition' as const;
export const LERM_HORDE_LIVE_HILL_BACKEND =
  'deterministic-cpu-heightfield' as const;
export const LERM_HORDE_LIVE_HILL_CONFIG =
  'horde-live-runtime-composition-v0' as const;

const MAX_INCREMENT_MS = 200;

const LIVE_TERRAIN_PARAMS: HillOfHillsTerrainParams = {
  ...defaultHillOfHillsParams,
  seed: 414,
  width: 12,
  length: 15,
  gridResolutionX: 48,
  gridResolutionZ: 60,
  topologyDynamicsMode: 'persistent_pressure',
  topologyPossibilityMode: 'phase_recomposed',
  topologyPhaseDurationMs: 600,
  topologyPhaseIntensity: 0.92,
  topologyPhaseDriftIntensity: 1,
  topologyPhaseLimit: 4,
  topologyPhaseTimeMs: 0,
};

export interface LermHordeLiveRailSample {
  schema: 'kaminos.creature-scale-locomotion-rail-sample.v0';
  railId: string;
  sourceDistance: number;
  progress: number;
  position: HillOfHillsVec3;
  tangent: HillOfHillsVec3;
  locomotionFrame: {
    forward: HillOfHillsVec3;
    right: HillOfHillsVec3;
    up: HillOfHillsVec3;
  };
  attention: {
    direction: HillOfHillsVec3;
    authority: string;
  };
  support: {
    schema: 'kaminos.axial-terrain-support-envelope.v0';
    plannerDisposition: 'local-support' | 'reroute-required';
    rootLift: number;
    compliance: {
      minimumNormalizedMargin: number;
    };
  };
}

export interface LermHordeLiveBodySample {
  elapsedMs: number;
  sourceDistance: number;
  progress: number;
  rootWorld: HillOfHillsVec3;
  tangent: HillOfHillsVec3;
  locomotionFrame: LermHordeLiveRailSample['locomotionFrame'];
  attention: LermHordeLiveRailSample['attention'];
  support: {
    disposition: 'local-support' | 'reroute-required';
    rootLift: number;
    minimumComplianceMargin: number;
    sampledHeight: number;
    renderedHillSourceId: string;
    provenance: {
      hillSourceId: string;
      revision: string;
      freshnessMs: 0;
    };
  };
}

export interface LermHordeLiveRuntimeState {
  schema: typeof LERM_HORDE_LIVE_RUNTIME_SCHEMA;
  route: typeof LERM_HORDE_LIVE_RUNTIME_ROUTE;
  phase: 'traversing' | 'departed';
  elapsedMs: number;
  tickCount: number;
  admittedIntervalCount: number;
  admittedEpisodeIds: readonly string[];
  body: LermHordeLiveBodySample | null;
  terrain: HillOfHillsTerrain;
  terrainBuffer: HillOfHillsTerrainBuffer;
  lastAdmission: {
    episodeId: string;
    elapsed: { startMs: number; endMs: number };
    sourceDistance: { start: number; end: number };
    targetHill: {
      frameId: string;
      sampleChecksum: string;
      topologyChecksum: string;
    };
  } | null;
}

export interface LermHordeLiveRuntimeReceipt {
  schema: typeof LERM_HORDE_LIVE_RUNTIME_SCHEMA;
  route: {
    requested: typeof LERM_HORDE_LIVE_RUNTIME_ROUTE;
    effective: typeof LERM_HORDE_LIVE_RUNTIME_ROUTE;
    hill: typeof LERM_HORDE_LIVE_HILL_ROUTE;
    backend: typeof LERM_HORDE_LIVE_HILL_BACKEND;
    configId: typeof LERM_HORDE_LIVE_HILL_CONFIG;
    fallbackStatus: 'none';
    staleStatus: 'fresh';
    failurePhase: null;
  };
  clock: {
    mode: 'incremental_elapsed_time';
    maximumIncrementMs: typeof MAX_INCREMENT_MS;
    elapsedMs: number;
    traversalDurationMs: number;
    tickCount: number;
    precomputedFrameCount: 0;
    prefixRebuildCount: 0;
    replayConstructorCalls: 0;
  };
  source: {
    producerRevision: string;
    railId: string;
    firstSourceDistance: number;
    lastSourceDistance: number;
    hillRevision: string;
  };
  admission: {
    intervalCount: number;
    uniqueEpisodeCount: number;
    exposureSeconds: number;
    trafficChecksum: string;
    trafficRetainedAfterDeparture: true;
  };
  terrain: {
    schema: typeof HILL_OF_HILLS_TERRAIN_BUFFER_SCHEMA;
    sampleCount: number;
    cacheGeneration: number;
    sampleChecksum: string;
    topologyChecksum: string;
    supportFrameChecksum: string;
    shockResetCount: 0;
  };
  departure: {
    bodyVisible: false;
    elapsedMs: number;
  };
  claimBoundary: {
    sourceRailMotionTruth: true;
    liveCurrentHillTruth: true;
    liveRootExposureTruth: true;
    persistentHillTruth: true;
    liveContactTruth: false;
    morphologyPortability: false;
  };
}

export interface LermHordeLiveRuntime {
  readonly state: LermHordeLiveRuntimeState;
  advanceTo(elapsedMs: number): LermHordeLiveRuntimeState;
  createReceipt(): LermHordeLiveRuntimeReceipt;
}

export interface CreateLermHordeLiveRuntimeOptions {
  producerReceipt: LermHordeProducerHistoryCompositionReceipt;
  railSampler(sourceDistance: number): LermHordeLiveRailSample;
  hillRevision: string;
}

export function createLermHordeLiveRuntime(
  options: CreateLermHordeLiveRuntimeOptions,
): LermHordeLiveRuntime {
  validateOptions(options);
  const receipt = options.producerReceipt;
  const durationMs = receipt.historySummary.lastTimestampMs;
  const firstDistance = receipt.historySummary.firstSourceDistance;
  const lastDistance = receipt.historySummary.lastSourceDistance;
  const cache = createHillOfHillsLayerTileCache();
  const initialTerrain = createHillOfHillsTerrainWithCache(
    cache,
    LIVE_TERRAIN_PARAMS,
    sourceAt('horde-live-runtime-000000', 0),
  );
  const initialRail = sampleRail(options, firstDistance);
  let currentState: LermHordeLiveRuntimeState = {
    schema: LERM_HORDE_LIVE_RUNTIME_SCHEMA,
    route: LERM_HORDE_LIVE_RUNTIME_ROUTE,
    phase: 'traversing',
    elapsedMs: 0,
    tickCount: 0,
    admittedIntervalCount: 0,
    admittedEpisodeIds: [],
    body: bodySampleFor(
      options,
      initialRail,
      initialTerrain,
      initialTerrain,
      0,
    ),
    terrain: initialTerrain,
    terrainBuffer: createHillOfHillsTerrainBuffer(initialTerrain),
    lastAdmission: null,
  };
  let trafficAtTraversalEnd: string | null = null;

  const runtime: LermHordeLiveRuntime = {
    get state() {
      return currentState;
    },
    advanceTo(elapsedMs) {
      if (!Number.isFinite(elapsedMs) || elapsedMs < currentState.elapsedMs) {
        throw new Error('live runtime elapsed time must be finite and monotonic');
      }
      while (currentState.elapsedMs < elapsedMs) {
        const intervalEndMs = nextIntervalEnd(
          currentState.elapsedMs,
          elapsedMs,
          durationMs,
        );
        currentState = advanceInterval(
          options,
          cache,
          currentState,
          intervalEndMs,
          durationMs,
          firstDistance,
          lastDistance,
        );
        if (
          currentState.elapsedMs >= durationMs &&
          trafficAtTraversalEnd === null
        ) {
          trafficAtTraversalEnd =
            currentState.terrain.witness.producerTrafficFieldChecksum;
        }
      }
      return currentState;
    },
    createReceipt() {
      if (
        currentState.phase !== 'departed' ||
        currentState.body !== null ||
        currentState.admittedIntervalCount === 0 ||
        trafficAtTraversalEnd === null
      ) {
        throw new Error(
          'live runtime receipt requires a completed traversal and body departure',
        );
      }
      const shockResetCount =
        currentState.terrain.witness.supportFrame.motionClassCounts
          .shock_reset ?? 0;
      if (shockResetCount !== 0) {
        throw new Error('live runtime cannot close with a support shock reset');
      }
      if (
        currentState.terrain.witness.producerTrafficFieldChecksum !==
        trafficAtTraversalEnd
      ) {
        throw new Error(
          'live runtime lost producer traffic after body departure',
        );
      }
      const uniqueEpisodeCount = new Set(
        currentState.admittedEpisodeIds,
      ).size;
      if (uniqueEpisodeCount !== currentState.admittedIntervalCount) {
        throw new Error('live runtime reused an interval admission identity');
      }
      return {
        schema: LERM_HORDE_LIVE_RUNTIME_SCHEMA,
        route: {
          requested: LERM_HORDE_LIVE_RUNTIME_ROUTE,
          effective: LERM_HORDE_LIVE_RUNTIME_ROUTE,
          hill: LERM_HORDE_LIVE_HILL_ROUTE,
          backend: LERM_HORDE_LIVE_HILL_BACKEND,
          configId: LERM_HORDE_LIVE_HILL_CONFIG,
          fallbackStatus: 'none',
          staleStatus: 'fresh',
          failurePhase: null,
        },
        clock: {
          mode: 'incremental_elapsed_time',
          maximumIncrementMs: MAX_INCREMENT_MS,
          elapsedMs: currentState.elapsedMs,
          traversalDurationMs: durationMs,
          tickCount: currentState.tickCount,
          precomputedFrameCount: 0,
          prefixRebuildCount: 0,
          replayConstructorCalls: 0,
        },
        source: {
          producerRevision: receipt.producer.revision,
          railId: receipt.producer.railId,
          firstSourceDistance: firstDistance,
          lastSourceDistance: lastDistance,
          hillRevision: options.hillRevision,
        },
        admission: {
          intervalCount: currentState.admittedIntervalCount,
          uniqueEpisodeCount,
          exposureSeconds:
            currentState.terrain.witness.producerTrafficExposureSeconds,
          trafficChecksum:
            currentState.terrain.witness.producerTrafficFieldChecksum,
          trafficRetainedAfterDeparture: true,
        },
        terrain: {
          schema: HILL_OF_HILLS_TERRAIN_BUFFER_SCHEMA,
          sampleCount: currentState.terrainBuffer.sampleCount,
          cacheGeneration:
            currentState.terrain.witness.cacheGeneration,
          sampleChecksum:
            currentState.terrain.witness.sampleChecksum,
          topologyChecksum:
            currentState.terrain.witness.topologyChecksum,
          supportFrameChecksum:
            currentState.terrain.witness.supportFrame
              .supportFrameChecksum,
          shockResetCount: 0,
        },
        departure: {
          bodyVisible: false,
          elapsedMs: currentState.elapsedMs,
        },
        claimBoundary: {
          sourceRailMotionTruth: true,
          liveCurrentHillTruth: true,
          liveRootExposureTruth: true,
          persistentHillTruth: true,
          liveContactTruth: false,
          morphologyPortability: false,
        },
      };
    },
  };
  return runtime;
}

function advanceInterval(
  options: CreateLermHordeLiveRuntimeOptions,
  cache: HillOfHillsLayerTileCache,
  previousState: LermHordeLiveRuntimeState,
  endMs: number,
  durationMs: number,
  firstDistance: number,
  lastDistance: number,
): LermHordeLiveRuntimeState {
  const startMs = previousState.elapsedMs;
  const startDistance = distanceAt(
    options.producerReceipt,
    startMs,
    firstDistance,
    lastDistance,
  );
  const endDistance = distanceAt(
    options.producerReceipt,
    endMs,
    firstDistance,
    lastDistance,
  );
  const traversingInterval = startMs < durationMs;
  const episodeId =
    `motion-ready-719024:live-runtime:` +
    `${previousState.admittedIntervalCount.toString().padStart(6, '0')}`;
  const history = traversingInterval
    ? createIntervalHistory(
        options,
        previousState.terrain,
        episodeId,
        startMs,
        endMs,
        sampleRail(options, startDistance),
        sampleRail(options, endDistance),
      )
    : null;
  const terrain = createHillOfHillsTerrainWithCache(
    cache,
    {
      ...LIVE_TERRAIN_PARAMS,
      topologyPhaseTimeMs: endMs,
    },
    {
      ...sourceAt(
        `horde-live-runtime-${Math.round(endMs)
          .toString()
          .padStart(6, '0')}`,
        endMs,
      ),
      ...(history ? { producerContactHistory: history } : {}),
    },
  );
  const body =
    endMs <= durationMs
      ? bodySampleFor(
          options,
          sampleRail(options, endDistance),
          previousState.terrain,
          terrain,
          endMs,
        )
      : null;
  const lastAdmission = history
    ? {
        episodeId,
        elapsed: { startMs, endMs },
        sourceDistance: { start: startDistance, end: endDistance },
        targetHill: {
          frameId: previousState.terrain.source.frameId,
          sampleChecksum:
            previousState.terrain.witness.sampleChecksum,
          topologyChecksum:
            previousState.terrain.witness.topologyChecksum,
        },
      }
    : previousState.lastAdmission;
  const admittedEpisodeIds = history
    ? [...previousState.admittedEpisodeIds, episodeId]
    : previousState.admittedEpisodeIds;
  return {
    schema: LERM_HORDE_LIVE_RUNTIME_SCHEMA,
    route: LERM_HORDE_LIVE_RUNTIME_ROUTE,
    phase: endMs <= durationMs ? 'traversing' : 'departed',
    elapsedMs: endMs,
    tickCount: previousState.tickCount + 1,
    admittedIntervalCount:
      previousState.admittedIntervalCount + (history ? 1 : 0),
    admittedEpisodeIds,
    body,
    terrain,
    terrainBuffer: createHillOfHillsTerrainBuffer(terrain),
    lastAdmission,
  };
}

function createIntervalHistory(
  options: CreateLermHordeLiveRuntimeOptions,
  targetHill: HillOfHillsTerrain,
  episodeId: string,
  startMs: number,
  endMs: number,
  start: LermHordeLiveRailSample,
  end: LermHordeLiveRailSample,
): HillOfHillsProducerContactHistory {
  const receipt = options.producerReceipt;
  const samples: HillOfHillsProducerContactHistorySample[] = [
    supportedHistorySample(options, targetHill, start, 0, startMs),
    supportedHistorySample(options, targetHill, end, 1, endMs),
  ];
  return {
    schema: HILL_OF_HILLS_PRODUCER_CONTACT_HISTORY_SCHEMA,
    episodeId,
    producer: {
      ...receipt.history.producer,
    },
    hill: {
      sourceId: targetHill.source.frameId,
      sampleChecksum: targetHill.witness.sampleChecksum,
      topologyChecksum: targetHill.witness.topologyChecksum,
    },
    coordinateSpace: {
      axes: 'x-y-z',
      up: 'y',
      units: 'world',
    },
    samples,
  };
}

function supportedHistorySample(
  options: CreateLermHordeLiveRuntimeOptions,
  targetHill: HillOfHillsTerrain,
  rail: LermHordeLiveRailSample,
  sequence: number,
  timestampMs: number,
): HillOfHillsProducerContactHistorySample {
  const surface = sampleHillOfHillsTerrain(
    targetHill,
    rail.position[0],
    rail.position[2],
  );
  const sourceSurfaceHeight =
    rail.position[1] - rail.support.rootLift;
  const supportHeightRemap = surface.height - sourceSurfaceHeight;
  const minimumComplianceMargin =
    rail.support.compliance.minimumNormalizedMargin -
    Math.abs(supportHeightRemap);
  if (
    rail.support.plannerDisposition === 'local-support' &&
    minimumComplianceMargin < 0
  ) {
    throw new Error(
      `live runtime support remap invalidates source compliance at ${timestampMs}ms`,
    );
  }
  return {
    sequence,
    timestampMs,
    root: {
      worldPosition: [
        rail.position[0],
        surface.height + rail.support.rootLift,
        rail.position[2],
      ],
      sourceDistance: rail.sourceDistance,
      routeProgress: rail.progress,
      tangent: rail.tangent,
      locomotionFrame: rail.locomotionFrame,
      attention: rail.attention,
      support: {
        schema: rail.support.schema,
        disposition: rail.support.plannerDisposition,
        rootLift: rail.support.rootLift,
        minimumComplianceMargin,
        provenance: {
          hillSourceId: targetHill.source.frameId,
          revision: options.hillRevision,
          freshnessMs: 0,
        },
      },
    },
  };
}

function bodySampleFor(
  options: CreateLermHordeLiveRuntimeOptions,
  rail: LermHordeLiveRailSample,
  sampledHill: HillOfHillsTerrain,
  renderedHill: HillOfHillsTerrain,
  elapsedMs: number,
): LermHordeLiveBodySample {
  const sampledSurface = sampleHillOfHillsTerrain(
    sampledHill,
    rail.position[0],
    rail.position[2],
  );
  const renderedSurface = sampleHillOfHillsTerrain(
    renderedHill,
    rail.position[0],
    rail.position[2],
  );
  const sourceSurfaceHeight =
    rail.position[1] - rail.support.rootLift;
  const minimumComplianceMargin =
    rail.support.compliance.minimumNormalizedMargin -
    Math.abs(sampledSurface.height - sourceSurfaceHeight);
  return {
    elapsedMs,
    sourceDistance: rail.sourceDistance,
    progress: rail.progress,
    rootWorld: [
      rail.position[0],
      renderedSurface.height + rail.support.rootLift,
      rail.position[2],
    ],
    tangent: rail.tangent,
    locomotionFrame: rail.locomotionFrame,
    attention: rail.attention,
    support: {
      disposition: rail.support.plannerDisposition,
      rootLift: rail.support.rootLift,
      minimumComplianceMargin,
      sampledHeight: sampledSurface.height,
      renderedHillSourceId: renderedHill.source.frameId,
      provenance: {
        hillSourceId: sampledHill.source.frameId,
        revision: options.hillRevision,
        freshnessMs: 0,
      },
    },
  };
}

function nextIntervalEnd(
  currentMs: number,
  requestedMs: number,
  durationMs: number,
): number {
  const nextGlobalBoundary =
    (Math.floor(currentMs / MAX_INCREMENT_MS) + 1) *
    MAX_INCREMENT_MS;
  let next = Math.min(requestedMs, nextGlobalBoundary);
  if (currentMs < durationMs && next > durationMs) next = durationMs;
  return next;
}

function distanceAt(
  receipt: LermHordeProducerHistoryCompositionReceipt,
  elapsedMs: number,
  firstDistance: number,
  lastDistance: number,
): number {
  if (elapsedMs <= 0) return firstDistance;
  if (elapsedMs >= receipt.historySummary.lastTimestampMs) {
    return lastDistance;
  }
  const source = receipt.history.samples;
  const upperIndex = source.findIndex(
    (sample) => sample.timestampMs >= elapsedMs,
  );
  const upper = source[Math.max(1, upperIndex)];
  const lower = source[Math.max(0, upper.sequence - 1)];
  const span = upper.timestampMs - lower.timestampMs;
  const amount =
    span <= 0 ? 0 : (elapsedMs - lower.timestampMs) / span;
  return (
    lower.root.sourceDistance +
    (upper.root.sourceDistance - lower.root.sourceDistance) *
      amount
  );
}

function sampleRail(
  options: CreateLermHordeLiveRuntimeOptions,
  sourceDistance: number,
): LermHordeLiveRailSample {
  const sample = options.railSampler(sourceDistance);
  if (
    sample?.schema !==
      'kaminos.creature-scale-locomotion-rail-sample.v0' ||
    sample.railId !== options.producerReceipt.producer.railId ||
    !Number.isFinite(sample.sourceDistance) ||
    Math.abs(sample.sourceDistance - sourceDistance) > 1e-8 ||
    !Number.isFinite(sample.progress) ||
    sample.progress < 0 ||
    sample.progress > 1 ||
    sample.support?.schema !==
      'kaminos.axial-terrain-support-envelope.v0' ||
    !Number.isFinite(sample.support.rootLift) ||
    !Number.isFinite(
      sample.support.compliance?.minimumNormalizedMargin,
    )
  ) {
    throw new Error('live runtime rail sampler substituted source identity');
  }
  for (const vector of [
    sample.position,
    sample.tangent,
    sample.locomotionFrame.forward,
    sample.locomotionFrame.right,
    sample.locomotionFrame.up,
    sample.attention.direction,
  ]) {
    if (
      vector.length !== 3 ||
      vector.some((component) => !Number.isFinite(component))
    ) {
      throw new Error('live runtime rail sampler returned a non-finite frame');
    }
  }
  return sample;
}

function sourceAt(
  frameId: string,
  timestampMs: number,
): HillOfHillsSourceOptions {
  return {
    authority: 'live_simulation',
    route: LERM_HORDE_LIVE_HILL_ROUTE,
    frameId,
    backend: LERM_HORDE_LIVE_HILL_BACKEND,
    configId: LERM_HORDE_LIVE_HILL_CONFIG,
    timestampMs,
    sampleAgeMs: 0,
    fallbackStatus: 'none',
  };
}

function validateOptions(
  options: CreateLermHordeLiveRuntimeOptions,
): void {
  const receipt = options?.producerReceipt;
  if (
    receipt?.ok !== true ||
    receipt.phase !== 'complete' ||
    receipt.producer.revision !== LERM_HORDE_PRODUCER_REVISION ||
    receipt.history.producer.revision !==
      LERM_HORDE_PRODUCER_REVISION ||
    receipt.history.samples.length < 2 ||
    receipt.historySummary.orderedSampleCount !==
      receipt.history.samples.length ||
    receipt.historySummary.firstTimestampMs !== 0 ||
    receipt.historySummary.lastTimestampMs <= 0 ||
    receipt.historySummary.lastSourceDistance <=
      receipt.historySummary.firstSourceDistance ||
    receipt.fallbackStatus !== 'none' ||
    receipt.staleStatus !== 'fresh' ||
    receipt.partialStatus !== 'complete-root-only'
  ) {
    throw new Error(
      'live runtime requires the exact fresh root-only producer receipt',
    );
  }
  if (
    typeof options.railSampler !== 'function' ||
    !/^[0-9a-f]{40}$/.test(options.hillRevision)
  ) {
    throw new Error(
      'live runtime requires a source rail sampler and exact Hill revision',
    );
  }
}
