import type {
  HillOfHillsProducerContactHistory,
  HillOfHillsVec3
} from './terrain/hill-of-hills-producer-contact-history.js';
import {
  HILL_OF_HILLS_PRODUCER_CONTACT_HISTORY_SCHEMA,
  producerContactHistoryChecksum
} from './terrain/hill-of-hills-producer-contact-history.js';
import {
  createHillOfHillsLayerTileCache,
  createHillOfHillsTerrainWithCache,
  defaultHillOfHillsParams,
  type HillOfHillsSourceOptions,
  type HillOfHillsTerrain,
  type HillOfHillsTerrainParams
} from './terrain/hill-of-hills.js';

export const LERM_HORDE_PRODUCER_HISTORY_RECEIPT_SCHEMA =
  'lerms.lerm-horde.producer-history-composition-receipt.v0' as const;
export const LERM_HORDE_PRODUCER_HISTORY_ROUTE =
  'lerms/lerm-horde/live-producer-history-composition' as const;
export const LERM_HORDE_HILL_REVISION =
  '653175725ed695094a7420247ef4b9f96b988125' as const;
export const LERM_HORDE_PRODUCER_REVISION = 'ced6db3d' as const;

const SAMPLE_COUNT = 15;
const DESIRED_SPEED = 1.25;
const CREATURE_ID = 'motion-ready-719024';
const BODY_REVISION = 'motion-ready-719024-registration-cb519913';
const ROUTE_ID = 'lerm-horde-719024-control-crossing-v0';

export interface LermHordeProducerModule {
  validateAxialCrawlerRegistration(registration: unknown): unknown;
  sampleHillTerrainSurface(
    source: unknown,
    worldX: number,
    worldZ: number
  ): { height: number };
  createAxialTerrainRouteTransitionEvaluator(
    source: unknown,
    registration: unknown,
    options?: Record<string, unknown>
  ): (transition: unknown) => {
    admissible: boolean;
    additionalCost?: number;
    evidence: Record<string, unknown>;
  };
  compileCreatureScaleLocomotionRail(
    source: unknown,
    registration: unknown,
    routePlan: unknown,
    options?: Record<string, unknown>
  ): {
    schema: 'kaminos.creature-scale-locomotion-rail.v0';
    id: string;
    length: number;
  };
  sampleCreatureScaleLocomotionRail(
    rail: unknown,
    distance: number,
    options?: { attentionTarget?: HillOfHillsVec3 }
  ): {
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
  };
}

export interface LermHordeProducerHistoryCompositionOptions {
  producerModule: LermHordeProducerModule;
  registration: unknown;
  lermsRevision: string;
  producerBranch: string;
  producerRevision: string;
  producerModuleSha256: string;
  episodeId?: string;
}

export interface LermHordeProducerHistoryCompositionReceipt {
  ok: true;
  schema: typeof LERM_HORDE_PRODUCER_HISTORY_RECEIPT_SCHEMA;
  phase: 'complete';
  route: typeof LERM_HORDE_PRODUCER_HISTORY_ROUTE;
  evidenceClass: 'live_producer_composition';
  lerms: {
    branch: 'cc/lerm-horde-live-producer-history-0723';
    revision: string;
    hillBaseRevision: typeof LERM_HORDE_HILL_REVISION;
  };
  producer: {
    repository: 'kaminos';
    branch: string;
    revision: string;
    moduleSha256: string;
    creatureId: typeof CREATURE_ID;
    bodyRevision: typeof BODY_REVISION;
    motionRevision: string;
    routeId: string;
    railId: string;
    railSchema: 'kaminos.creature-scale-locomotion-rail.v0';
    supportSchema: 'kaminos.axial-terrain-support-envelope.v0';
    routeSelection: {
      candidateId: string;
      attemptedCandidateCount: number;
      rejectedCandidates: readonly {
        id: string;
        reason: string;
      }[];
    };
  };
  hill: {
    requested: {
      route: string;
      authority: 'live_simulation';
      backend: string;
      configId: string;
    };
    effective: {
      route: string;
      authority: string;
      backend: string;
      configId: string;
      priorFrameId: string;
      admittedFrameId: string;
      postDepartureFrameId: string;
      sourceLineageKey: string;
    };
  };
  history: HillOfHillsProducerContactHistory;
  historySummary: {
    checksum: string;
    episodeId: string;
    orderedSampleCount: number;
    supportedRootCount: number;
    stanceContactCount: 0;
    firstTimestampMs: number;
    lastTimestampMs: number;
    firstSourceDistance: number;
    lastSourceDistance: number;
    firstRouteProgress: number;
    lastRouteProgress: number;
  };
  admission: {
    trafficChecksum: string;
    trafficRange: { min: number; max: number };
    exposureSeconds: number;
    admittedEpisodeCount: number;
    preHistoryTopologyPossibilityChecksum: string;
    postDepartureTopologyPossibilityChecksum: string;
    noHistoryTopologyPossibilityChecksum: string;
    integrationOriginMs: number;
    supportShockResetCount: number;
  };
  persistence: {
    producerTrafficChecksumAtAdmission: string;
    producerTrafficChecksumAfterDeparture: string;
    cacheGenerationBefore: number;
    cacheGenerationAtAdmission: number;
    cacheGenerationAfterDeparture: number;
  };
  assertions: {
    strictMonotonicHistory: true;
    exactPriorHillTarget: true;
    absentContactLawful: true;
    historyAdmittedOnce: true;
    persistedAfterDeparture: true;
    changedTopologyPossibility: true;
    identicalReplayIdempotent: true;
    sourceIdentityPreserved: true;
    zeroShockResets: true;
  };
  hordeSemanticOverlay: {
    actorId: typeof CREATURE_ID;
    speciesIdentity: 'producer-control-non-lerm';
    behavior: 'route-probe';
    motive: 'composition-validation';
    contactInference: 'none';
  };
  fallbackStatus: 'none';
  staleStatus: 'fresh';
  partialStatus: 'complete-root-only';
  failurePhase: null;
}

export async function composeLermHordeProducerHistory(
  options: LermHordeProducerHistoryCompositionOptions
): Promise<LermHordeProducerHistoryCompositionReceipt> {
  validateCompositionOptions(options);

  const terrainParams: HillOfHillsTerrainParams = {
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
    topologyPhaseTimeMs: 0
  };
  const route = 'hill-of-hills/lerm-horde-live-producer-history';
  const backend = 'deterministic-cpu-heightfield';
  const configId = 'lerm-horde-live-producer-history-v0';
  const sourceAt = (frameId: string, timestampMs: number): HillOfHillsSourceOptions => ({
    authority: 'live_simulation',
    route,
    frameId,
    backend,
    configId,
    timestampMs,
    sampleAgeMs: 0,
    fallbackStatus: 'none'
  });

  const activeCache = createHillOfHillsLayerTileCache();
  const prior = createHillOfHillsTerrainWithCache(
    activeCache,
    terrainParams,
    sourceAt('lerm-horde-hill-prior', 0)
  );
  const producerTerrain = hillToProducerTerrain(prior);
  const registration = options.producerModule.validateAxialCrawlerRegistration(options.registration);
  const transitionEvaluator = options.producerModule.createAxialTerrainRouteTransitionEvaluator(
    producerTerrain,
    registration,
    producerSupportOptions()
  );
  const railSelection = compileFirstAdmittedRail(
    options.producerModule,
    producerTerrain,
    registration,
    transitionEvaluator
  );
  const rail = railSelection.rail;
  if (
    rail.schema !== 'kaminos.creature-scale-locomotion-rail.v0' ||
    !rail.id?.trim() ||
    !Number.isFinite(rail.length) ||
    rail.length <= 0
  ) {
    throw new Error('producer returned an invalid creature-scale locomotion rail');
  }

  const episodeId = options.episodeId ?? 'lerm-horde-719024-live-control-crossing-0001';
  const history = createHistory(
    options,
    prior,
    rail,
    railSelection.routeId,
    episodeId
  );
  const historyChecksum = producerContactHistoryChecksum(history);

  const admitted = createHillOfHillsTerrainWithCache(
    activeCache,
    { ...terrainParams, topologyPhaseTimeMs: 120 },
    {
      ...sourceAt('lerm-horde-hill-admitted', 120),
      producerContactHistory: history
    }
  );
  const afterDeparture = createHillOfHillsTerrainWithCache(
    activeCache,
    { ...terrainParams, topologyPhaseTimeMs: 1230 },
    sourceAt('lerm-horde-hill-post-departure', 1230)
  );

  const controlCache = createHillOfHillsLayerTileCache();
  const controlPrior = createHillOfHillsTerrainWithCache(
    controlCache,
    terrainParams,
    sourceAt('lerm-horde-hill-prior', 0)
  );
  createHillOfHillsTerrainWithCache(
    controlCache,
    { ...terrainParams, topologyPhaseTimeMs: 120 },
    sourceAt('lerm-horde-hill-admitted', 120)
  );
  const noHistory = createHillOfHillsTerrainWithCache(
    controlCache,
    { ...terrainParams, topologyPhaseTimeMs: 1230 },
    sourceAt('lerm-horde-hill-post-departure', 1230)
  );

  const replayCache = createHillOfHillsLayerTileCache();
  const replayPrior = createHillOfHillsTerrainWithCache(
    replayCache,
    terrainParams,
    sourceAt('lerm-horde-hill-prior', 0)
  );
  const replayHistory = {
    ...history,
    hill: {
      sourceId: replayPrior.source.frameId,
      sampleChecksum: replayPrior.witness.sampleChecksum,
      topologyChecksum: replayPrior.witness.topologyChecksum
    },
    samples: history.samples.map((sample) => ({
      ...sample,
      root: {
        ...sample.root,
        support: {
          ...sample.root.support,
          provenance: {
            ...sample.root.support.provenance,
            hillSourceId: replayPrior.source.frameId
          }
        }
      }
    }))
  };
  createHillOfHillsTerrainWithCache(
    replayCache,
    { ...terrainParams, topologyPhaseTimeMs: 120 },
    {
      ...sourceAt('lerm-horde-hill-admitted', 120),
      producerContactHistory: replayHistory
    }
  );
  const replayAfterDeparture = createHillOfHillsTerrainWithCache(
    replayCache,
    { ...terrainParams, topologyPhaseTimeMs: 1230 },
    sourceAt('lerm-horde-hill-post-departure', 1230)
  );

  const strictMonotonicHistory = history.samples.every((sample, index, samples) =>
    index === 0 ||
    (
      sample.sequence === index &&
      sample.timestampMs > samples[index - 1].timestampMs &&
      sample.root.sourceDistance > samples[index - 1].root.sourceDistance &&
      sample.root.routeProgress > samples[index - 1].root.routeProgress
    )
  );
  const exactPriorHillTarget =
    history.hill.sourceId === prior.source.frameId &&
    history.hill.sampleChecksum === prior.witness.sampleChecksum &&
    history.hill.topologyChecksum === prior.witness.topologyChecksum;
  const absentContactLawful = history.samples.every(
    (sample) => sample.contacts === undefined && sample.locomotion === undefined
  );
  const historyAdmittedOnce = admitted.witness.producerTrafficAdmittedEpisodeCount === 1;
  const persistedAfterDeparture =
    afterDeparture.witness.producerTrafficFieldChecksum ===
      admitted.witness.producerTrafficFieldChecksum &&
    afterDeparture.witness.producerTrafficAdmittedEpisodeCount === 1;
  const changedTopologyPossibility =
    afterDeparture.witness.topologyPossibilityChecksum !==
    noHistory.witness.topologyPossibilityChecksum;
  const identicalReplayIdempotent =
    replayAfterDeparture.witness.producerTrafficFieldChecksum ===
      afterDeparture.witness.producerTrafficFieldChecksum &&
    replayAfterDeparture.witness.topologyPossibilityChecksum ===
      afterDeparture.witness.topologyPossibilityChecksum;
  const sourceIdentityPreserved =
    prior.source.authority === 'live_simulation' &&
    prior.source.route === admitted.source.route &&
    admitted.source.route === afterDeparture.source.route &&
    prior.source.backend === admitted.source.backend &&
    admitted.source.backend === afterDeparture.source.backend &&
    prior.source.configId === admitted.source.configId &&
    admitted.source.configId === afterDeparture.source.configId &&
    prior.witness.producerTrafficSourceLineageKey ===
      afterDeparture.witness.producerTrafficSourceLineageKey &&
    prior.witness.sampleChecksum === controlPrior.witness.sampleChecksum;
  const supportShockResetCount =
    afterDeparture.witness.supportFrame.shockClassCounts.shock_reset ?? 0;
  const zeroShockResets = supportShockResetCount === 0;

  requireClaim(strictMonotonicHistory, 'producer history samples are not strictly monotonic');
  requireClaim(exactPriorHillTarget, 'producer history does not target the exact prior Hill witness');
  requireClaim(absentContactLawful, 'root-only history unexpectedly contains inferred contact');
  requireClaim(historyAdmittedOnce, 'producer history was not admitted exactly once');
  requireClaim(persistedAfterDeparture, 'producer traffic did not persist after actor departure');
  requireClaim(changedTopologyPossibility, 'producer history did not change later topology possibility');
  requireClaim(identicalReplayIdempotent, 'identical producer-history replay was not idempotent');
  requireClaim(sourceIdentityPreserved, 'Hill route, backend, config, or source lineage changed');
  requireClaim(zeroShockResets, 'producer-history admission caused a support shock reset');

  const supportedRootCount = history.samples.slice(0, -1).filter(
    (sample) => sample.root.support.disposition === 'local-support'
  ).length;
  const firstSample = history.samples[0];
  const lastSample = history.samples.at(-1)!;

  return {
    ok: true,
    schema: LERM_HORDE_PRODUCER_HISTORY_RECEIPT_SCHEMA,
    phase: 'complete',
    route: LERM_HORDE_PRODUCER_HISTORY_ROUTE,
    evidenceClass: 'live_producer_composition',
    lerms: {
      branch: 'cc/lerm-horde-live-producer-history-0723',
      revision: options.lermsRevision,
      hillBaseRevision: LERM_HORDE_HILL_REVISION
    },
    producer: {
      repository: 'kaminos',
      branch: options.producerBranch,
      revision: options.producerRevision,
      moduleSha256: options.producerModuleSha256,
      creatureId: CREATURE_ID,
      bodyRevision: BODY_REVISION,
      motionRevision: options.producerRevision,
      routeId: railSelection.routeId,
      railId: rail.id,
      railSchema: rail.schema,
      supportSchema: 'kaminos.axial-terrain-support-envelope.v0',
      routeSelection: {
        candidateId: railSelection.candidateId,
        attemptedCandidateCount: railSelection.rejectedCandidates.length + 1,
        rejectedCandidates: railSelection.rejectedCandidates
      }
    },
    hill: {
      requested: {
        route,
        authority: 'live_simulation',
        backend,
        configId
      },
      effective: {
        route: afterDeparture.source.route,
        authority: afterDeparture.source.authority,
        backend: afterDeparture.source.backend ?? 'none',
        configId: afterDeparture.source.configId ?? 'none',
        priorFrameId: prior.source.frameId,
        admittedFrameId: admitted.source.frameId,
        postDepartureFrameId: afterDeparture.source.frameId,
        sourceLineageKey: afterDeparture.witness.producerTrafficSourceLineageKey
      }
    },
    history,
    historySummary: {
      checksum: historyChecksum,
      episodeId,
      orderedSampleCount: history.samples.length,
      supportedRootCount,
      stanceContactCount: 0,
      firstTimestampMs: firstSample.timestampMs,
      lastTimestampMs: lastSample.timestampMs,
      firstSourceDistance: firstSample.root.sourceDistance,
      lastSourceDistance: lastSample.root.sourceDistance,
      firstRouteProgress: firstSample.root.routeProgress,
      lastRouteProgress: lastSample.root.routeProgress
    },
    admission: {
      trafficChecksum: afterDeparture.witness.producerTrafficFieldChecksum,
      trafficRange: afterDeparture.witness.producerTrafficFieldRange,
      exposureSeconds: afterDeparture.witness.producerTrafficExposureSeconds,
      admittedEpisodeCount: afterDeparture.witness.producerTrafficAdmittedEpisodeCount,
      preHistoryTopologyPossibilityChecksum: prior.witness.topologyPossibilityChecksum,
      postDepartureTopologyPossibilityChecksum:
        afterDeparture.witness.topologyPossibilityChecksum,
      noHistoryTopologyPossibilityChecksum: noHistory.witness.topologyPossibilityChecksum,
      integrationOriginMs: afterDeparture.witness.topologyDynamicsIntegrationOriginMs,
      supportShockResetCount
    },
    persistence: {
      producerTrafficChecksumAtAdmission: admitted.witness.producerTrafficFieldChecksum,
      producerTrafficChecksumAfterDeparture:
        afterDeparture.witness.producerTrafficFieldChecksum,
      cacheGenerationBefore: prior.witness.cacheGeneration,
      cacheGenerationAtAdmission: admitted.witness.cacheGeneration,
      cacheGenerationAfterDeparture: afterDeparture.witness.cacheGeneration
    },
    assertions: {
      strictMonotonicHistory: true,
      exactPriorHillTarget: true,
      absentContactLawful: true,
      historyAdmittedOnce: true,
      persistedAfterDeparture: true,
      changedTopologyPossibility: true,
      identicalReplayIdempotent: true,
      sourceIdentityPreserved: true,
      zeroShockResets: true
    },
    hordeSemanticOverlay: {
      actorId: CREATURE_ID,
      speciesIdentity: 'producer-control-non-lerm',
      behavior: 'route-probe',
      motive: 'composition-validation',
      contactInference: 'none'
    },
    fallbackStatus: 'none',
    staleStatus: 'fresh',
    partialStatus: 'complete-root-only',
    failurePhase: null
  };
}

function validateCompositionOptions(options: LermHordeProducerHistoryCompositionOptions): void {
  if (!options?.producerModule) throw new Error('producer module is required');
  for (const exportName of [
    'validateAxialCrawlerRegistration',
    'sampleHillTerrainSurface',
    'createAxialTerrainRouteTransitionEvaluator',
    'compileCreatureScaleLocomotionRail',
    'sampleCreatureScaleLocomotionRail'
  ] as const) {
    if (typeof options.producerModule[exportName] !== 'function') {
      throw new Error(`producer module export ${exportName} is required`);
    }
  }
  if (!options.lermsRevision?.trim()) throw new Error('LERMS revision is required');
  if (!options.producerBranch?.trim()) throw new Error('producer branch is required');
  if (options.producerRevision !== LERM_HORDE_PRODUCER_REVISION) {
    throw new Error(`producer revision must be immutable ${LERM_HORDE_PRODUCER_REVISION}`);
  }
  if (!options.producerModuleSha256?.trim()) {
    throw new Error('producer module sha256 is required');
  }
}

function producerSupportOptions(): Record<string, unknown> {
  return {
    scale: 1.14,
    clearance: 0.018,
    lateralExcursion: 0.1,
    maxPitchRadians: Math.PI / 5,
    maxBendRadiansPerStation: Math.PI / 10,
    maxSuspensionLift: 0.114
  };
}

function hillToProducerTerrain(terrain: HillOfHillsTerrain): unknown {
  return {
    schema: 'lerms.lerm-horde.hill-producer-surface.v0',
    source: terrain.source,
    grid: {
      columns: terrain.params.gridResolutionX,
      rows: terrain.params.gridResolutionZ
    },
    worldBounds: {
      x: terrain.witness.supportFrame.worldBounds.x,
      z: terrain.witness.supportFrame.worldBounds.z
    },
    channels: {
      height: {
        values: terrain.samples.map((sample) => sample.height)
      }
    }
  };
}

function createRoutePlan(
  producerModule: LermHordeProducerModule,
  producerTerrain: unknown,
  transitionEvaluator: ReturnType<LermHordeProducerModule['createAxialTerrainRouteTransitionEvaluator']>,
  candidate: {
    id: string;
    points: readonly (readonly [number, number])[];
  }
): unknown {
  const world = candidate.points.map(([x, z]) => {
    return [x, producerModule.sampleHillTerrainSurface(producerTerrain, x, z).height, z] as HillOfHillsVec3;
  });
  const routePoints = world.map((point, index) => {
    const pointId = `${candidate.id}:${index}`;
    if (index === 0) return { index: pointId, world: point };
    const before = world[index - 1];
    const heading = normalizeHorizontal([
      point[0] - before[0],
      0,
      point[2] - before[2]
    ]);
    const evaluation = transitionEvaluator({
      source: producerTerrain,
      from: { index: `${candidate.id}:${index - 1}`, grid: null, world: before },
      to: { index: pointId, grid: null, world: point },
      heading,
      previousHeading: heading,
      directionIndex: null,
      previousDirectionIndex: null
    });
    if (!evaluation?.admissible) {
      throw new Error(`producer route preflight rejected segment ${index - 1}->${index}`);
    }
    return {
      index: pointId,
      world: point,
      transitionEvidence: evaluation.evidence
    };
  });
  return {
    id: `${ROUTE_ID}-${candidate.id}`,
    source: {
      route: LERM_HORDE_PRODUCER_HISTORY_ROUTE
    },
    evidence: {
      transitionAdmission: 'caller-evaluated'
    },
    routePoints
  };
}

function compileFirstAdmittedRail(
  producerModule: LermHordeProducerModule,
  producerTerrain: unknown,
  registration: unknown,
  transitionEvaluator: ReturnType<LermHordeProducerModule['createAxialTerrainRouteTransitionEvaluator']>
): {
  rail: ReturnType<LermHordeProducerModule['compileCreatureScaleLocomotionRail']>;
  candidateId: string;
  routeId: string;
  rejectedCandidates: readonly { id: string; reason: string }[];
} {
  const candidates = routeCandidates();
  const rejectedCandidates: { id: string; reason: string }[] = [];
  for (const candidate of candidates) {
    try {
      const routePlan = createRoutePlan(
        producerModule,
        producerTerrain,
        transitionEvaluator,
        candidate
      ) as { id: string };
      const rail = producerModule.compileCreatureScaleLocomotionRail(
        producerTerrain,
        registration,
        routePlan,
        {
          id: `${routePlan.id}-rail`,
          ...producerSupportOptions(),
          sampleSpacing: 0.08,
          transitionEvaluator
        }
      );
      return {
        rail,
        candidateId: candidate.id,
        routeId: routePlan.id,
        rejectedCandidates
      };
    } catch (error) {
      rejectedCandidates.push({
        id: candidate.id,
        reason: error instanceof Error ? error.message : String(error)
      });
    }
  }
  throw new Error(
    `producer rejected every Horde route candidate: ${rejectedCandidates
      .map(({ id, reason }) => `${id}=${reason}`)
      .join('; ')}`
  );
}

function routeCandidates(): readonly {
  id: string;
  points: readonly (readonly [number, number])[];
}[] {
  const line = (
    id: string,
    start: readonly [number, number],
    end: readonly [number, number]
  ) => ({
    id,
    points: Array.from({ length: 7 }, (_, index) => {
      const t = index / 6;
      return [
        start[0] + (end[0] - start[0]) * t,
        start[1] + (end[1] - start[1]) * t
      ] as const;
    })
  });
  return [
    line('left-longitudinal-wide', [-1.25, -3], [-1.25, 3]),
    line('right-longitudinal-wide', [1.25, -3], [1.25, 3]),
    line('center-longitudinal-wide', [0, -3], [0, 3]),
    line('left-longitudinal-mid', [-1.25, -2], [-1.25, 2]),
    line('right-longitudinal-mid', [1.25, -2], [1.25, 2]),
    line('center-longitudinal-mid', [0, -2], [0, 2]),
    line('left-longitudinal-short', [-1.25, -1.5], [-1.25, 1.5]),
    line('right-longitudinal-short', [1.25, -1.5], [1.25, 1.5]),
    line('center-longitudinal-short', [0, -1.5], [0, 1.5]),
    line('lower-lateral', [-3, -2], [3, -2]),
    line('center-lateral', [-3, 0], [3, 0]),
    line('upper-lateral', [-3, 2], [3, 2])
  ];
}

function createHistory(
  options: LermHordeProducerHistoryCompositionOptions,
  prior: HillOfHillsTerrain,
  rail: {
    schema: 'kaminos.creature-scale-locomotion-rail.v0';
    id: string;
    length: number;
  },
  routeId: string,
  episodeId: string
): HillOfHillsProducerContactHistory {
  const attentionTarget: HillOfHillsVec3 = [-1.25, 1.5, 3.5];
  const samples = Array.from({ length: SAMPLE_COUNT }, (_, sequence) => {
    const sourceDistance = rail.length * sequence / (SAMPLE_COUNT - 1);
    const producerSample = options.producerModule.sampleCreatureScaleLocomotionRail(
      rail,
      sourceDistance,
      { attentionTarget }
    );
    if (
      producerSample.schema !== 'kaminos.creature-scale-locomotion-rail-sample.v0' ||
      producerSample.railId !== rail.id
    ) {
      throw new Error(`producer rail sample ${sequence} identity mismatch`);
    }
    const timestampMs = Math.max(
      sequence,
      Math.round(sourceDistance / DESIRED_SPEED * 1000)
    );
    return {
      sequence,
      timestampMs,
      root: {
        worldPosition: producerSample.position,
        sourceDistance: producerSample.sourceDistance,
        routeProgress: producerSample.progress,
        tangent: producerSample.tangent,
        locomotionFrame: producerSample.locomotionFrame,
        attention: {
          direction: producerSample.attention.direction,
          authority: `producer:${producerSample.attention.authority}|horde:composition-validation`
        },
        support: {
          schema: producerSample.support.schema,
          disposition: producerSample.support.plannerDisposition,
          rootLift: producerSample.support.rootLift,
          minimumComplianceMargin:
            producerSample.support.compliance.minimumNormalizedMargin,
          provenance: {
            hillSourceId: prior.source.frameId,
            revision: LERM_HORDE_HILL_REVISION,
            freshnessMs: prior.source.sampleAgeMs
          }
        }
      }
    };
  });
  return {
    schema: HILL_OF_HILLS_PRODUCER_CONTACT_HISTORY_SCHEMA,
    episodeId,
    producer: {
      repository: 'kaminos',
      revision: options.producerRevision,
      route: 'motion-ready-719024/creature-scale-locomotion-rail',
      creatureId: CREATURE_ID,
      bodyRevision: BODY_REVISION,
      motionRevision: options.producerRevision,
      routeId,
      railSchema: rail.schema,
      railId: rail.id,
      supportSchema: 'kaminos.axial-terrain-support-envelope.v0'
    },
    hill: {
      sourceId: prior.source.frameId,
      sampleChecksum: prior.witness.sampleChecksum,
      topologyChecksum: prior.witness.topologyChecksum
    },
    coordinateSpace: {
      axes: 'x-y-z',
      up: 'y',
      units: 'world'
    },
    samples
  };
}

function normalizeHorizontal(value: HillOfHillsVec3): HillOfHillsVec3 {
  const length = Math.hypot(value[0], value[2]);
  if (length <= Number.EPSILON) return [0, 0, 1];
  return [value[0] / length, 0, value[2] / length];
}

function requireClaim(value: boolean, message: string): asserts value {
  if (!value) throw new Error(message);
}
