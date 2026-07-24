import type { LermHordeProducerHistoryCompositionReceipt } from './lerm-horde-producer-history-composition.js';
import {
  HILL_OF_HILLS_PRODUCER_CONTACT_HISTORY_SCHEMA,
  type HillOfHillsProducerContactHistory,
  type HillOfHillsProducerContactHistorySample,
  type HillOfHillsVec3,
} from './terrain/hill-of-hills-producer-contact-history.js';
import {
  createHillOfHillsLayerTileCache,
  createHillOfHillsTerrainWithCache,
  defaultHillOfHillsParams,
  sampleHillOfHillsTerrain,
  type HillOfHillsSourceOptions,
  type HillOfHillsTerrain,
  type HillOfHillsTerrainParams,
} from './terrain/hill-of-hills.js';

export const HILL_HORDE_LIVE_TRAVERSAL_ADMISSION_SCHEMA =
  'lerms.hill-of-hills.lerm-traversal-live-admission.v0' as const;
export const HILL_HORDE_LIVE_TRAVERSAL_ROUTE =
  'lerms/hill-of-hills/horde-live-traversal-admission' as const;
export const HILL_HORDE_REVIEWED_SOURCE_REVISION =
  '6cf5cd05c2bd13962cc58183b24f26a7b41ae5d2' as const;

const HILL_ROUTE = 'hill-of-hills/horde-live-traversal-admission';
const HILL_BACKEND = 'deterministic-cpu-heightfield';
const HILL_CONFIG_ID = 'horde-live-traversal-admission-v0';

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

export interface ComposeHordeTraversalIntoLiveHillInput {
  hordeReport: ReviewedHordeTraversalReport;
  producerReceipt: LermHordeProducerHistoryCompositionReceipt;
  producerReceiptSha256: string;
  hordeRevision: string;
  hillRevision: string;
}

export interface ReviewedHordeTraversalReport {
  ok: true;
  schema: 'lerms.lerm-horde.stable-rail-visual-witness.v0';
  phase: 'complete';
  route: {
    requested: string;
    effective: string;
    fallbackStatus: 'none';
    staleStatus: 'fresh';
    partialStatus: 'complete-root-only';
  };
  receipt: {
    sourceRevision: string;
    sha256: string;
  };
  producer: {
    revision: string;
    moduleSha256: string;
  };
  visibleBody: {
    assetIdentity: string;
    schemaIdentity: string;
    path: string;
    sha256: string;
    gitBlob: string;
    sourceRevision: string;
    dirtyInput: string;
    candidateId: string;
    candidateSchema: string;
    shapeSchema: string;
  };
  composition: {
    identity: {
      actorId: string;
      assetIdentity: string;
    };
    sources: {
      body: {
        sha256: string;
        sourceRevision: string;
      };
    };
    timeline: readonly {
      timestampMs: number;
      bodyRootWorld: HillOfHillsVec3;
    }[];
  };
  claimBoundary: {
    rootRailMotionTruth: true;
    liveCurrentHillTruth: false;
    liveContactTruth: false;
    bodyArticulationTruth: false;
  };
}

export interface HillHordeLiveTraversalAdmissionReceipt {
  ok: true;
  schema: typeof HILL_HORDE_LIVE_TRAVERSAL_ADMISSION_SCHEMA;
  phase: 'complete';
  route: typeof HILL_HORDE_LIVE_TRAVERSAL_ROUTE;
  evidenceClass: 'live_current_hill_lerm_traversal';
  source: {
    horde: {
      revision: string;
      reportSchema: ReviewedHordeTraversalReport['schema'];
      reportRoute: string;
      visibleBody: ReviewedHordeTraversalReport['visibleBody'];
      actorId: string;
    };
    rootRail: {
      revision: string;
      route: string;
      railId: string;
      railSchema: 'kaminos.creature-scale-locomotion-rail.v0';
      supportSchema: 'kaminos.axial-terrain-support-envelope.v0';
      receiptRevision: string;
      receiptSha256: string;
    };
  };
  hill: {
    targetRevision: string;
    requested: {
      route: typeof HILL_ROUTE;
      authority: 'live_simulation';
      backend: typeof HILL_BACKEND;
      configId: typeof HILL_CONFIG_ID;
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
      priorSampleChecksum: string;
      priorTopologyChecksum: string;
    };
  };
  traversal: {
    orderedRootCount: number;
    maxSupportHeightRemap: number;
    admittedHistory: HillOfHillsProducerContactHistory;
    liveRootWorld: readonly HillOfHillsVec3[];
  };
  admission: {
    trafficChecksum: string;
    trafficRange: { min: number; max: number };
    exposureSeconds: number;
    admittedEpisodeCount: number;
    supportedRootCount: number;
    stanceContactCount: 0;
    preHistoryTopologyPossibilityChecksum: string;
    postDepartureTopologyPossibilityChecksum: string;
    supportShockResetCount: 0;
  };
  control: {
    noHistoryTrafficChecksum: string;
    noHistoryTopologyPossibilityChecksum: string;
  };
  persistence: {
    trafficChecksumAtAdmission: string;
    trafficChecksumAfterDeparture: string;
  };
  assertions: {
    exactReviewedHordeTraversal: true;
    exactCurrentHillTarget: true;
    liveHillSupportResampled: true;
    rootPlanPreserved: true;
    visibleLermIdentityBound: true;
    historyAdmittedOnce: true;
    persistedAfterDeparture: true;
    changedTopologyPossibility: true;
    noHistoryControlDistinct: true;
    rootOnlyContactAbsencePreserved: true;
    zeroShockResets: true;
  };
  claimBoundary: {
    rootRailMotionTruth: true;
    visibleLermIdentityTruth: true;
    liveCurrentHillTruth: true;
    topologyResponseTruth: true;
    liveContactTruth: false;
    bodyArticulationTruth: false;
    morphologyPortability: false;
  };
  terrains: {
    control: HillOfHillsTerrain;
    admitted: HillOfHillsTerrain;
    afterDeparture: HillOfHillsTerrain;
  };
  fallbackStatus: 'none';
  staleStatus: 'fresh';
  partialStatus: 'complete-root-only';
  failurePhase: null;
}

export function composeHordeTraversalIntoLiveHill(
  input: ComposeHordeTraversalIntoLiveHillInput,
): HillHordeLiveTraversalAdmissionReceipt {
  validateInput(input);

  const sourceAt = (frameId: string, timestampMs: number): HillOfHillsSourceOptions => ({
    authority: 'live_simulation',
    route: HILL_ROUTE,
    frameId,
    backend: HILL_BACKEND,
    configId: HILL_CONFIG_ID,
    timestampMs,
    sampleAgeMs: 0,
    fallbackStatus: 'none',
  });
  const activeCache = createHillOfHillsLayerTileCache();
  const prior = createHillOfHillsTerrainWithCache(
    activeCache,
    LIVE_TERRAIN_PARAMS,
    sourceAt('horde-live-hill-prior', 0),
  );
  const { history, liveRootWorld, maxSupportHeightRemap } = rebaseTraversalToLiveHill(
    input,
    prior,
  );
  const admitted = createHillOfHillsTerrainWithCache(
    activeCache,
    { ...LIVE_TERRAIN_PARAMS, topologyPhaseTimeMs: 120 },
    {
      ...sourceAt('horde-live-hill-admitted', 120),
      producerContactHistory: history,
    },
  );
  const afterDeparture = createHillOfHillsTerrainWithCache(
    activeCache,
    { ...LIVE_TERRAIN_PARAMS, topologyPhaseTimeMs: 1230 },
    sourceAt('horde-live-hill-post-departure', 1230),
  );

  const controlCache = createHillOfHillsLayerTileCache();
  const controlPrior = createHillOfHillsTerrainWithCache(
    controlCache,
    LIVE_TERRAIN_PARAMS,
    sourceAt('horde-live-hill-prior', 0),
  );
  createHillOfHillsTerrainWithCache(
    controlCache,
    { ...LIVE_TERRAIN_PARAMS, topologyPhaseTimeMs: 120 },
    sourceAt('horde-live-hill-admitted', 120),
  );
  const control = createHillOfHillsTerrainWithCache(
    controlCache,
    { ...LIVE_TERRAIN_PARAMS, topologyPhaseTimeMs: 1230 },
    sourceAt('horde-live-hill-post-departure', 1230),
  );

  const exactCurrentHillTarget =
    history.hill.sourceId === prior.source.frameId &&
    history.hill.sampleChecksum === prior.witness.sampleChecksum &&
    history.hill.topologyChecksum === prior.witness.topologyChecksum;
  const liveHillSupportResampled = history.samples.every(
    ({ root }) =>
      root.support.provenance.hillSourceId === prior.source.frameId &&
      root.support.provenance.revision === input.hillRevision &&
      root.support.provenance.freshnessMs === 0,
  );
  const rootPlanPreserved = rootPlanMatches(
    history.samples,
    input.producerReceipt.history.samples,
  );
  const visibleLermIdentityBound =
    history.producer.creatureId === input.hordeReport.composition.identity.actorId &&
    history.producer.bodyRevision.startsWith(
      input.hordeReport.visibleBody.sourceRevision,
    );
  const historyAdmittedOnce =
    admitted.witness.producerTrafficAdmittedEpisodeCount === 1 &&
    afterDeparture.witness.producerTrafficAdmittedEpisodeCount === 1;
  const persistedAfterDeparture =
    admitted.witness.producerTrafficFieldChecksum ===
    afterDeparture.witness.producerTrafficFieldChecksum;
  const changedTopologyPossibility =
    afterDeparture.witness.topologyPossibilityChecksum !==
    control.witness.topologyPossibilityChecksum;
  const noHistoryControlDistinct =
    control.witness.producerTrafficAdmittedEpisodeCount === 0 &&
    control.witness.producerTrafficFieldRange.max === 0 &&
    controlPrior.witness.sampleChecksum === prior.witness.sampleChecksum;
  const rootOnlyContactAbsencePreserved = history.samples.every(
    (sample) => sample.contacts === undefined && sample.locomotion === undefined,
  );
  const supportShockResetCount =
    afterDeparture.witness.supportFrame.shockClassCounts.shock_reset ?? 0;
  const zeroShockResets = supportShockResetCount === 0;

  requireClaim(exactCurrentHillTarget, 'traversal does not target the exact current Hill prior');
  requireClaim(liveHillSupportResampled, 'traversal support was not rebound to the live Hill prior');
  requireClaim(rootPlanPreserved, 'live Hill resampling changed Horde root-plan semantics');
  requireClaim(visibleLermIdentityBound, 'live Hill history lost the reviewed visible Lerm identity');
  requireClaim(historyAdmittedOnce, 'live Hill did not admit the Lerm traversal exactly once');
  requireClaim(persistedAfterDeparture, 'Lerm traversal pressure did not persist after departure');
  requireClaim(changedTopologyPossibility, 'Lerm traversal did not change later topology possibility');
  requireClaim(noHistoryControlDistinct, 'no-history control is not distinct from live admission');
  requireClaim(rootOnlyContactAbsencePreserved, 'live admission invented contact evidence');
  requireClaim(zeroShockResets, 'live Lerm traversal caused a support shock reset');

  const supportedRootCount = history.samples
    .slice(0, -1)
    .filter(({ root }) => root.support.disposition === 'local-support').length;

  return {
    ok: true,
    schema: HILL_HORDE_LIVE_TRAVERSAL_ADMISSION_SCHEMA,
    phase: 'complete',
    route: HILL_HORDE_LIVE_TRAVERSAL_ROUTE,
    evidenceClass: 'live_current_hill_lerm_traversal',
    source: {
      horde: {
        revision: input.hordeRevision,
        reportSchema: input.hordeReport.schema,
        reportRoute: input.hordeReport.route.effective,
        visibleBody: { ...input.hordeReport.visibleBody },
        actorId: input.hordeReport.composition.identity.actorId,
      },
      rootRail: {
        revision: input.producerReceipt.producer.revision,
        route: input.hordeReport.route.effective,
        railId: input.producerReceipt.producer.railId,
        railSchema: input.producerReceipt.producer.railSchema,
        supportSchema: input.producerReceipt.producer.supportSchema,
        receiptRevision: input.hordeReport.receipt.sourceRevision,
        receiptSha256: input.hordeReport.receipt.sha256,
      },
    },
    hill: {
      targetRevision: input.hillRevision,
      requested: {
        route: HILL_ROUTE,
        authority: 'live_simulation',
        backend: HILL_BACKEND,
        configId: HILL_CONFIG_ID,
      },
      effective: {
        route: afterDeparture.source.route,
        authority: afterDeparture.source.authority,
        backend: afterDeparture.source.backend ?? 'none',
        configId: afterDeparture.source.configId ?? 'none',
        priorFrameId: prior.source.frameId,
        admittedFrameId: admitted.source.frameId,
        postDepartureFrameId: afterDeparture.source.frameId,
        sourceLineageKey: afterDeparture.witness.producerTrafficSourceLineageKey,
        priorSampleChecksum: prior.witness.sampleChecksum,
        priorTopologyChecksum: prior.witness.topologyChecksum,
      },
    },
    traversal: {
      orderedRootCount: history.samples.length,
      maxSupportHeightRemap,
      admittedHistory: history,
      liveRootWorld,
    },
    admission: {
      trafficChecksum: afterDeparture.witness.producerTrafficFieldChecksum,
      trafficRange: afterDeparture.witness.producerTrafficFieldRange,
      exposureSeconds: afterDeparture.witness.producerTrafficExposureSeconds,
      admittedEpisodeCount: afterDeparture.witness.producerTrafficAdmittedEpisodeCount,
      supportedRootCount,
      stanceContactCount: 0,
      preHistoryTopologyPossibilityChecksum: prior.witness.topologyPossibilityChecksum,
      postDepartureTopologyPossibilityChecksum:
        afterDeparture.witness.topologyPossibilityChecksum,
      supportShockResetCount: 0,
    },
    control: {
      noHistoryTrafficChecksum: control.witness.producerTrafficFieldChecksum,
      noHistoryTopologyPossibilityChecksum:
        control.witness.topologyPossibilityChecksum,
    },
    persistence: {
      trafficChecksumAtAdmission: admitted.witness.producerTrafficFieldChecksum,
      trafficChecksumAfterDeparture:
        afterDeparture.witness.producerTrafficFieldChecksum,
    },
    assertions: {
      exactReviewedHordeTraversal: true,
      exactCurrentHillTarget: true,
      liveHillSupportResampled: true,
      rootPlanPreserved: true,
      visibleLermIdentityBound: true,
      historyAdmittedOnce: true,
      persistedAfterDeparture: true,
      changedTopologyPossibility: true,
      noHistoryControlDistinct: true,
      rootOnlyContactAbsencePreserved: true,
      zeroShockResets: true,
    },
    claimBoundary: {
      rootRailMotionTruth: true,
      visibleLermIdentityTruth: true,
      liveCurrentHillTruth: true,
      topologyResponseTruth: true,
      liveContactTruth: false,
      bodyArticulationTruth: false,
      morphologyPortability: false,
    },
    terrains: {
      control,
      admitted,
      afterDeparture,
    },
    fallbackStatus: 'none',
    staleStatus: 'fresh',
    partialStatus: 'complete-root-only',
    failurePhase: null,
  };
}

function validateInput(input: ComposeHordeTraversalIntoLiveHillInput): void {
  if (!input.hordeRevision?.trim() || !input.hillRevision?.trim()) {
    throw new Error('Horde and Hill source revisions are required');
  }
  if (input.hordeRevision !== HILL_HORDE_REVIEWED_SOURCE_REVISION) {
    throw new Error(
      `Horde revision does not match the reviewed source ${HILL_HORDE_REVIEWED_SOURCE_REVISION}`,
    );
  }
  if (!/^[0-9a-f]{64}$/.test(input.producerReceiptSha256)) {
    throw new Error('verified producer receipt SHA-256 is required');
  }
  const report = input.hordeReport;
  if (
    report?.ok !== true ||
    report.schema !== 'lerms.lerm-horde.stable-rail-visual-witness.v0' ||
    report.phase !== 'complete' ||
    report.route?.fallbackStatus !== 'none' ||
    report.route.staleStatus !== 'fresh' ||
    report.route.partialStatus !== 'complete-root-only'
  ) {
    throw new Error('live admission requires a fresh complete non-fallback Horde traversal');
  }
  if (
    report.claimBoundary.rootRailMotionTruth !== true ||
    report.claimBoundary.liveCurrentHillTruth !== false ||
    report.claimBoundary.liveContactTruth !== false ||
    report.claimBoundary.bodyArticulationTruth !== false
  ) {
    throw new Error('Horde traversal claim boundary is incompatible with live Hill admission');
  }
  if (
    report.composition.identity.assetIdentity !==
      report.visibleBody.assetIdentity ||
    report.composition.sources.body.sha256 !== report.visibleBody.sha256 ||
    report.composition.sources.body.sourceRevision !==
      report.visibleBody.sourceRevision
  ) {
    throw new Error('Horde visible body identity does not match its composition');
  }

  const producer = input.producerReceipt;
  if (
    producer?.ok !== true ||
    producer.phase !== 'complete' ||
    producer.fallbackStatus !== 'none' ||
    producer.staleStatus !== 'fresh' ||
    producer.partialStatus !== 'complete-root-only'
  ) {
    throw new Error('live admission requires a fresh complete root-only producer receipt');
  }
  if (
    report.receipt.sourceRevision !== producer.lerms.revision ||
    report.receipt.sha256 !== input.producerReceiptSha256 ||
    report.producer.revision !== producer.producer.revision ||
    report.producer.moduleSha256 !== producer.producer.moduleSha256 ||
    report.route.effective !== producer.history.producer.route
  ) {
    if (report.receipt.sha256 !== input.producerReceiptSha256) {
      throw new Error(
        'Horde report receipt SHA does not match the verified producer receipt',
      );
    }
    throw new Error('Horde report does not bind the supplied reviewed producer receipt');
  }
  if (
    report.composition.timeline.length !== producer.history.samples.length ||
    report.composition.timeline.some((frame, index) =>
      frame.timestampMs !== producer.history.samples[index].timestampMs ||
      !vec3Equal(
        frame.bodyRootWorld,
        producer.history.samples[index].root.worldPosition,
      ),
    )
  ) {
    throw new Error('Horde body timeline does not match the reviewed producer rail');
  }
}

function rebaseTraversalToLiveHill(
  input: ComposeHordeTraversalIntoLiveHillInput,
  prior: HillOfHillsTerrain,
): {
  history: HillOfHillsProducerContactHistory;
  liveRootWorld: readonly HillOfHillsVec3[];
  maxSupportHeightRemap: number;
} {
  const sourceHistory = input.producerReceipt.history;
  let maxSupportHeightRemap = 0;
  const samples = sourceHistory.samples.map((sample, sequence) => {
    const [x, sourceRootY, z] = sample.root.worldPosition;
    if (
      x < -prior.params.width * 0.5 ||
      x > prior.params.width * 0.5 ||
      z < -prior.params.length * 0.5 ||
      z > prior.params.length * 0.5
    ) {
      throw new Error(`Horde root ${sequence} falls outside the current Hill bounds`);
    }
    const liveSurface = sampleHillOfHillsTerrain(prior, x, z);
    const originalSurfaceHeight = sourceRootY - sample.root.support.rootLift;
    const supportHeightRemap = liveSurface.height - originalSurfaceHeight;
    const minimumComplianceMargin =
      sample.root.support.minimumComplianceMargin -
      Math.abs(supportHeightRemap);
    if (
      sample.root.support.disposition === 'local-support' &&
      minimumComplianceMargin < 0
    ) {
      throw new Error(
        `Horde root ${sequence} live Hill remap invalidates local support`,
      );
    }
    maxSupportHeightRemap = Math.max(
      maxSupportHeightRemap,
      Math.abs(supportHeightRemap),
    );
    const liveRoot: HillOfHillsVec3 = [
      x,
      liveSurface.height + sample.root.support.rootLift,
      z,
    ];
    return {
      ...sample,
      sequence,
      root: {
        ...sample.root,
        worldPosition: liveRoot,
        support: {
          ...sample.root.support,
          minimumComplianceMargin,
          provenance: {
            hillSourceId: prior.source.frameId,
            revision: input.hillRevision,
            freshnessMs: prior.source.sampleAgeMs,
          },
        },
      },
    } satisfies HillOfHillsProducerContactHistorySample;
  });
  const bodyRevision =
    `${input.hordeReport.visibleBody.sourceRevision}:` +
    input.hordeReport.visibleBody.sha256.slice(0, 16);
  const history: HillOfHillsProducerContactHistory = {
    schema: HILL_OF_HILLS_PRODUCER_CONTACT_HISTORY_SCHEMA,
    episodeId:
      `${input.hordeReport.composition.identity.actorId}:` +
      `live-hill:${input.hordeRevision.slice(0, 12)}`,
    producer: {
      repository: 'kaminos',
      revision: input.producerReceipt.producer.revision,
      route: input.hordeReport.route.effective,
      creatureId: input.hordeReport.composition.identity.actorId,
      bodyRevision,
      motionRevision: input.producerReceipt.producer.motionRevision,
      routeId: input.producerReceipt.producer.routeId,
      railSchema: input.producerReceipt.producer.railSchema,
      railId: input.producerReceipt.producer.railId,
      supportSchema: input.producerReceipt.producer.supportSchema,
    },
    hill: {
      sourceId: prior.source.frameId,
      sampleChecksum: prior.witness.sampleChecksum,
      topologyChecksum: prior.witness.topologyChecksum,
    },
    coordinateSpace: {
      axes: 'x-y-z',
      up: 'y',
      units: 'world',
    },
    samples,
  };
  return {
    history,
    liveRootWorld: samples.map(({ root }) => root.worldPosition),
    maxSupportHeightRemap,
  };
}

function rootPlanMatches(
  live: readonly HillOfHillsProducerContactHistorySample[],
  source: readonly HillOfHillsProducerContactHistorySample[],
): boolean {
  return (
    live.length === source.length &&
    live.every((sample, index) => {
      const original = source[index];
      return (
        sample.sequence === original.sequence &&
        sample.timestampMs === original.timestampMs &&
        sample.root.worldPosition[0] === original.root.worldPosition[0] &&
        sample.root.worldPosition[2] === original.root.worldPosition[2] &&
        sample.root.sourceDistance === original.root.sourceDistance &&
        sample.root.routeProgress === original.root.routeProgress &&
        vec3Equal(sample.root.tangent, original.root.tangent) &&
        vec3Equal(
          sample.root.locomotionFrame.forward,
          original.root.locomotionFrame.forward,
        ) &&
        vec3Equal(
          sample.root.locomotionFrame.right,
          original.root.locomotionFrame.right,
        ) &&
        vec3Equal(
          sample.root.locomotionFrame.up,
          original.root.locomotionFrame.up,
        ) &&
        vec3Equal(
          sample.root.attention.direction,
          original.root.attention.direction,
        ) &&
        sample.root.attention.authority === original.root.attention.authority
      );
    })
  );
}

function vec3Equal(
  left: readonly number[],
  right: readonly number[],
): boolean {
  return (
    left.length === 3 &&
    right.length === 3 &&
    left.every((value, index) => value === right[index])
  );
}

function requireClaim(value: boolean, message: string): asserts value {
  if (!value) throw new Error(message);
}
