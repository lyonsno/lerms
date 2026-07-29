import type {
  HillOfHillsTerrain,
} from './terrain/hill-of-hills.js';
import {
  sampleHillOfHillsTraversalAffordance,
  type HillOfHillsTraversalAffordance,
} from './terrain/hill-of-hills-traversal-affordance.js';

export const LERM_HORDE_HISTORY_DECISION_SCHEMA =
  'lerms.horde-history-conditioned-decision.v0' as const;
export const LERM_HORDE_HISTORY_DECISION_POLICY =
  'lerms/lerm-horde/seek-less-traversed-continuation-v0' as const;
export const LERM_HORDE_HISTORY_CANDIDATE_SET_CHECKSUM =
  'left-longitudinal@-1.25,-0.8>0,1|right-longitudinal@1.25,-0.8>0,1' as const;
export const LERM_HORDE_GPU_ROUTE_CHOICE_QUERY_SCHEMA =
  'lerms.horde-gpu-route-choice-query.v0' as const;
export const LERM_HORDE_CPU_ROUTE_CHOICE_QUERY_ROUTE =
  'lerms/lerm-horde/cpu-reference-route-choice-query-v0' as const;

export type LermHordeHistoryCandidateId =
  | 'left-longitudinal'
  | 'right-longitudinal';

export interface LermHordeHistoryCandidate {
  id: LermHordeHistoryCandidateId;
  stableOrder: 0 | 1;
  lateralOffset: 0 | 2.5;
  affordance: HillOfHillsTraversalAffordance;
  lawful: boolean;
}

export interface LermHordeHistoryConditionedDecision {
  schema: typeof LERM_HORDE_HISTORY_DECISION_SCHEMA;
  episodeIndex: 0 | 1;
  policy: {
    route: typeof LERM_HORDE_HISTORY_DECISION_POLICY;
    revision: 'seek-less-traversed-continuation-v0';
    motive: 'seek-less-traversed-continuation';
    unchangedAcrossEpisodes: true;
    candidateSetChecksum:
      typeof LERM_HORDE_HISTORY_CANDIDATE_SET_CHECKSUM;
  };
  hill: {
    route: string;
    frameId: string;
    sampleChecksum: string;
    topologyChecksum: string;
    supportFrameChecksum: string;
    producerTrafficFieldChecksum: string;
  };
  candidates: readonly [
    LermHordeHistoryCandidate,
    LermHordeHistoryCandidate,
  ];
  query: LermHordeGpuRouteChoiceQuery;
  selected: {
    id: LermHordeHistoryCandidateId;
    stableOrder: 0 | 1;
    lateralOffset: 0 | 2.5;
    reason: 'minimum-local-retained-traffic';
    selectedExposure: number;
    runnerUpExposure: number;
    decisionMargin: number;
    nondeterminismEnvelope: number;
    decisionStable: true;
    stabilityBasis:
      | 'margin-exceeds-envelope'
      | 'exact-stable-order-tie';
  };
}

export interface LermHordeGpuRouteChoiceQuery {
  schema: typeof LERM_HORDE_GPU_ROUTE_CHOICE_QUERY_SCHEMA;
  route: {
    requested: string;
    effective: string;
    backend: 'cpu-oracle' | 'webgpu';
    fallbackStatus: 'none' | 'fallback';
    staleStatus: 'fresh' | 'stale' | 'cached';
  };
  episodeIndex: 0 | 1;
  policy: {
    route: typeof LERM_HORDE_HISTORY_DECISION_POLICY;
    candidateSetChecksum:
      typeof LERM_HORDE_HISTORY_CANDIDATE_SET_CHECKSUM;
  };
  generation: {
    id: number;
    frameId: string;
    sealed: boolean;
    complete: boolean;
    highestAdmittedEventSequence: number;
  };
  hill: LermHordeHistoryConditionedDecision['hill'];
  candidates: readonly [
    LermHordeHistoryCandidate,
    LermHordeHistoryCandidate,
  ];
  nondeterminismEnvelope: number;
  timing: {
    compactPayloadBytes: number;
    mapLatencyMs: number;
    queueLatencyMs: number;
    generationAgeMs: number;
    mainThreadWaitMs: number;
  };
}

export interface LermHordeGpuRouteChoiceEvaluation {
  selected: LermHordeHistoryCandidate;
  runnerUp: LermHordeHistoryCandidate;
  selectedExposure: number;
  runnerUpExposure: number;
  decisionMargin: number;
  nondeterminismEnvelope: number;
  decisionStable: boolean;
  stabilityBasis:
    | 'margin-exceeds-envelope'
    | 'exact-stable-order-tie'
    | 'inside-nondeterminism-envelope';
}

export interface CreateLermHordeCpuRouteChoiceQueryOptions {
  nondeterminismEnvelope?: number;
  highestAdmittedEventSequence: number;
}

export function chooseLermHordeHistoryConditionedContinuation(
  terrain: HillOfHillsTerrain,
  episodeIndex: number,
  options: CreateLermHordeCpuRouteChoiceQueryOptions,
): LermHordeHistoryConditionedDecision {
  const query = createLermHordeCpuRouteChoiceQuery(
    terrain,
    episodeIndex,
    options,
  );
  const evaluation = evaluateLermHordeGpuRouteChoiceQuery(query);
  if (!evaluation.decisionStable) {
    throw new Error(
      'history-conditioned route choice lies inside the nondeterminism envelope',
    );
  }
  const selected = evaluation.selected;
  return {
    schema: LERM_HORDE_HISTORY_DECISION_SCHEMA,
    episodeIndex: query.episodeIndex,
    policy: {
      route: LERM_HORDE_HISTORY_DECISION_POLICY,
      revision: 'seek-less-traversed-continuation-v0',
      motive: 'seek-less-traversed-continuation',
      unchangedAcrossEpisodes: true,
      candidateSetChecksum:
        LERM_HORDE_HISTORY_CANDIDATE_SET_CHECKSUM,
    },
    hill: { ...query.hill },
    candidates: query.candidates,
    query,
    selected: {
      id: selected.id,
      stableOrder: selected.stableOrder,
      lateralOffset: selected.lateralOffset,
      reason: 'minimum-local-retained-traffic',
      selectedExposure: evaluation.selectedExposure,
      runnerUpExposure: evaluation.runnerUpExposure,
      decisionMargin: evaluation.decisionMargin,
      nondeterminismEnvelope:
        evaluation.nondeterminismEnvelope,
      decisionStable: true,
      stabilityBasis:
        evaluation.stabilityBasis ===
        'inside-nondeterminism-envelope'
          ? 'margin-exceeds-envelope'
          : evaluation.stabilityBasis,
    },
  };
}

export function createLermHordeCpuRouteChoiceQuery(
  terrain: HillOfHillsTerrain,
  episodeIndex: number,
  options: CreateLermHordeCpuRouteChoiceQueryOptions,
): LermHordeGpuRouteChoiceQuery {
  if (episodeIndex !== 0 && episodeIndex !== 1) {
    throw new Error(
      'history-conditioned episode index must be 0 or 1',
    );
  }
  const candidateSpecs = [
    {
      id: 'left-longitudinal',
      stableOrder: 0,
      lateralOffset: 0,
      worldPosition: [-1.25, 0, -0.8],
    },
    {
      id: 'right-longitudinal',
      stableOrder: 1,
      lateralOffset: 2.5,
      worldPosition: [1.25, 0, -0.8],
    },
  ] as const;
  const candidates = candidateSpecs.map((candidate) => {
    const affordance = sampleHillOfHillsTraversalAffordance(
      terrain,
      candidate.worldPosition,
      [0, 0, 1],
    );
    return {
      id: candidate.id,
      stableOrder: candidate.stableOrder,
      lateralOffset: candidate.lateralOffset,
      affordance,
      lawful:
        affordance.support.shock !== 'shock_reset' &&
        affordance.traversal.directionalPermeability > 0,
    };
  }) as [
    LermHordeHistoryCandidate,
    LermHordeHistoryCandidate,
  ];
  const source = candidates[0].affordance.source;
  if (
    candidates.some(({ affordance }) =>
      affordance.source.route !== source.route ||
      affordance.source.frameId !== source.frameId ||
      affordance.source.sampleChecksum !== source.sampleChecksum ||
      affordance.source.topologyChecksum !== source.topologyChecksum ||
      affordance.source.supportFrameChecksum !==
        source.supportFrameChecksum ||
      affordance.source.producerTrafficFieldChecksum !==
        source.producerTrafficFieldChecksum
    )
  ) {
    throw new Error(
      'history-conditioned candidates crossed current Hill identity',
    );
  }
  const nondeterminismEnvelope =
    options.nondeterminismEnvelope ?? 0;
  requireQuery(
    Number.isFinite(nondeterminismEnvelope) &&
      nondeterminismEnvelope >= 0,
    'route-choice nondeterminism envelope must be finite and nonnegative',
  );
  const queryBase = {
    schema: LERM_HORDE_GPU_ROUTE_CHOICE_QUERY_SCHEMA,
    route: {
      requested: LERM_HORDE_CPU_ROUTE_CHOICE_QUERY_ROUTE,
      effective: LERM_HORDE_CPU_ROUTE_CHOICE_QUERY_ROUTE,
      backend: 'cpu-oracle',
      fallbackStatus: 'none',
      staleStatus: 'fresh',
    },
    episodeIndex,
    policy: {
      route: LERM_HORDE_HISTORY_DECISION_POLICY,
      candidateSetChecksum:
        LERM_HORDE_HISTORY_CANDIDATE_SET_CHECKSUM,
    },
    generation: {
      id: terrain.witness.cacheGeneration,
      frameId: source.frameId,
      sealed: true,
      complete: true,
      highestAdmittedEventSequence:
        options.highestAdmittedEventSequence,
    },
    hill: {
      route: source.route,
      frameId: source.frameId,
      sampleChecksum: source.sampleChecksum,
      topologyChecksum: source.topologyChecksum,
      supportFrameChecksum: source.supportFrameChecksum,
      producerTrafficFieldChecksum:
        source.producerTrafficFieldChecksum,
    },
    candidates,
    nondeterminismEnvelope,
  } as const;
  return {
    ...queryBase,
    timing: {
      compactPayloadBytes: encodedByteLength(queryBase),
      mapLatencyMs: 0,
      queueLatencyMs: 0,
      generationAgeMs: 0,
      mainThreadWaitMs: 0,
    },
  };
}

export function evaluateLermHordeGpuRouteChoiceQuery(
  query: LermHordeGpuRouteChoiceQuery,
): LermHordeGpuRouteChoiceEvaluation {
  requireQuery(
    query?.schema === LERM_HORDE_GPU_ROUTE_CHOICE_QUERY_SCHEMA,
    'route-choice query schema is unsupported',
  );
  requireQuery(
    query.route.requested === query.route.effective &&
      query.route.fallbackStatus === 'none',
    'route-choice effective route cannot use fallback',
  );
  requireQuery(
    query.route.staleStatus === 'fresh',
    'route-choice query must be fresh',
  );
  requireQuery(
    query.generation.sealed && query.generation.complete,
    'route-choice generation must be sealed and complete',
  );
  requireQuery(
    Number.isInteger(query.generation.id) &&
      query.generation.id >= 0 &&
      Number.isInteger(
        query.generation.highestAdmittedEventSequence,
      ) &&
      query.generation.highestAdmittedEventSequence >= -1,
    'route-choice generation identity is invalid',
  );
  requireQuery(
    query.policy.route === LERM_HORDE_HISTORY_DECISION_POLICY &&
      query.policy.candidateSetChecksum ===
        LERM_HORDE_HISTORY_CANDIDATE_SET_CHECKSUM,
    'route-choice policy or candidate set drifted',
  );
  requireQuery(
    query.candidates.length === 2 &&
      query.candidates[0].id === 'left-longitudinal' &&
      query.candidates[1].id === 'right-longitudinal',
    'route-choice query must contain the exact two candidates',
  );
  requireQuery(
    !containsFullTerrainPayload(query),
    'route-choice query cannot contain a full terrain payload',
  );
  for (const value of Object.values(query.timing)) {
    requireQuery(
      Number.isFinite(value) && value >= 0,
      'route-choice timing receipt must be finite and nonnegative',
    );
  }
  const source = query.candidates[0].affordance.source;
  requireQuery(
    query.candidates.every(({ affordance }) =>
      affordance.source.route === source.route &&
      affordance.source.frameId === source.frameId &&
      affordance.source.sampleChecksum === source.sampleChecksum &&
      affordance.source.topologyChecksum ===
        source.topologyChecksum &&
      affordance.source.supportFrameChecksum ===
        source.supportFrameChecksum &&
      affordance.source.producerTrafficFieldChecksum ===
        source.producerTrafficFieldChecksum
    ),
    'route-choice candidates crossed Hill identity',
  );
  const lawful = [...query.candidates]
    .filter(({ lawful }) => lawful)
    .sort(
      (left, right) =>
        left.affordance.memory.localExposure -
          right.affordance.memory.localExposure ||
        left.stableOrder - right.stableOrder,
    );
  requireQuery(
    lawful.length >= 2,
    'route-choice query requires two lawful comparison candidates',
  );
  const [selected, runnerUp] = lawful;
  const selectedExposure =
    selected.affordance.memory.localExposure;
  const runnerUpExposure =
    runnerUp.affordance.memory.localExposure;
  requireQuery(
    Number.isFinite(selectedExposure) &&
      Number.isFinite(runnerUpExposure) &&
      Number.isFinite(query.nondeterminismEnvelope) &&
      query.nondeterminismEnvelope >= 0,
    'route-choice values and envelope must be finite',
  );
  const decisionMargin = Math.abs(
    runnerUpExposure - selectedExposure,
  );
  const exactStableOrderTie =
    decisionMargin === 0 &&
    query.nondeterminismEnvelope === 0;
  const marginStable =
    decisionMargin > query.nondeterminismEnvelope;
  return {
    selected,
    runnerUp,
    selectedExposure,
    runnerUpExposure,
    decisionMargin,
    nondeterminismEnvelope: query.nondeterminismEnvelope,
    decisionStable: exactStableOrderTie || marginStable,
    stabilityBasis: exactStableOrderTie
      ? 'exact-stable-order-tie'
      : marginStable
        ? 'margin-exceeds-envelope'
        : 'inside-nondeterminism-envelope',
  };
}

function encodedByteLength(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}

function containsFullTerrainPayload(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  if (Array.isArray(value)) {
    return value.some(containsFullTerrainPayload);
  }
  const record = value as Record<string, unknown>;
  if (
    'samples' in record ||
    'positions' in record ||
    'normals' in record ||
    'metrics' in record ||
    'terrainBuffer' in record
  ) {
    return true;
  }
  return Object.values(record).some(containsFullTerrainPayload);
}

function requireQuery(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) throw new Error(message);
}
