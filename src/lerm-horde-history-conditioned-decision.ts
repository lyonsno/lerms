import type {
  HillOfHillsTerrain,
} from './terrain/hill-of-hills.js';
import {
  sampleHillOfHillsTraversalAffordance,
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

export interface LermHordeHillQuerySourceIdentity {
  route: string;
  frameId: string;
  sampleChecksum: string;
  topologyChecksum: string;
  supportFrameChecksum: string;
  producerTrafficFieldChecksum: string;
}

export interface LermHordeGpuRouteChoiceCandidate {
  id: LermHordeHistoryCandidateId;
  requestedWorldPosition: readonly [
    number,
    number,
    number,
  ];
  source: LermHordeHillQuerySourceIdentity;
  localExposure: number;
  shock: string;
  directionalPermeability: number;
}

export interface LermHordeHistoryCandidate {
  id: LermHordeHistoryCandidateId;
  stableOrder: 0 | 1;
  lateralOffset: 0 | 2.5;
  requestedWorldPosition: readonly [
    number,
    number,
    number,
  ];
  source: LermHordeHillQuerySourceIdentity;
  localExposure: number;
  shock: string;
  directionalPermeability: number;
  lawful: boolean;
}

const LERM_HORDE_HISTORY_CANDIDATE_SPECS = [
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
    LermHordeGpuRouteChoiceCandidate,
    LermHordeGpuRouteChoiceCandidate,
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
  candidates: readonly [
    LermHordeHistoryCandidate,
    LermHordeHistoryCandidate,
  ];
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
  const evaluation = evaluateLermHordeGpuRouteChoiceQuery(
    query,
    options.highestAdmittedEventSequence,
  );
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
    candidates: evaluation.candidates,
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
  const adaptCandidate = (
    candidate:
      (typeof LERM_HORDE_HISTORY_CANDIDATE_SPECS)[number],
  ): LermHordeGpuRouteChoiceCandidate => {
    const affordance = sampleHillOfHillsTraversalAffordance(
      terrain,
      candidate.worldPosition,
      [0, 0, 1],
    );
    return {
      id: candidate.id,
      requestedWorldPosition: [...candidate.worldPosition],
      source: compactSourceIdentity(affordance.source),
      localExposure: affordance.memory.localExposure,
      shock: affordance.support.shock,
      directionalPermeability:
        affordance.traversal.directionalPermeability,
    };
  };
  const candidates: [
    LermHordeGpuRouteChoiceCandidate,
    LermHordeGpuRouteChoiceCandidate,
  ] = [
    adaptCandidate(LERM_HORDE_HISTORY_CANDIDATE_SPECS[0]),
    adaptCandidate(LERM_HORDE_HISTORY_CANDIDATE_SPECS[1]),
  ];
  const source = candidates[0].source;
  if (
    candidates.some(({ source: candidateSource }) =>
      candidateSource.route !== source.route ||
      candidateSource.frameId !== source.frameId ||
      candidateSource.sampleChecksum !== source.sampleChecksum ||
      candidateSource.topologyChecksum !== source.topologyChecksum ||
      candidateSource.supportFrameChecksum !==
        source.supportFrameChecksum ||
      candidateSource.producerTrafficFieldChecksum !==
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
  expectedHighestAdmittedEventSequence: number,
): LermHordeGpuRouteChoiceEvaluation {
  requireQuery(
    query?.schema === LERM_HORDE_GPU_ROUTE_CHOICE_QUERY_SCHEMA,
    'route-choice query schema is unsupported',
  );
  requireQuery(
    hasExactKeys(query, [
      'schema',
      'route',
      'episodeIndex',
      'policy',
      'generation',
      'hill',
      'candidates',
      'nondeterminismEnvelope',
      'timing',
    ]),
    'route-choice query fields are invalid',
  );
  requireQuery(
    hasExactKeys(query.route, [
      'requested',
      'effective',
      'backend',
      'fallbackStatus',
      'staleStatus',
    ]) &&
      nonblank(query.route.requested) &&
      query.route.requested === query.route.effective &&
      (query.route.backend === 'cpu-oracle' ||
        query.route.backend === 'webgpu') &&
      query.route.fallbackStatus === 'none',
    'route-choice effective route or backend is invalid or uses fallback',
  );
  requireQuery(
    query.route.staleStatus === 'fresh',
    'route-choice query must be fresh',
  );
  requireQuery(
    hasExactKeys(query.generation, [
      'id',
      'frameId',
      'sealed',
      'complete',
      'highestAdmittedEventSequence',
    ]) &&
      query.generation.sealed === true &&
      query.generation.complete === true,
    'route-choice generation must be sealed and complete',
  );
  requireQuery(
    Number.isInteger(query.generation.id) &&
      query.generation.id >= 0 &&
      nonblank(query.generation.frameId) &&
      Number.isInteger(
        query.generation.highestAdmittedEventSequence,
      ) &&
      Number.isInteger(expectedHighestAdmittedEventSequence) &&
      expectedHighestAdmittedEventSequence >= -1 &&
      query.generation.highestAdmittedEventSequence ===
        expectedHighestAdmittedEventSequence &&
      (query.episodeIndex === 0
        ? expectedHighestAdmittedEventSequence === -1
        : expectedHighestAdmittedEventSequence >= 0),
    'route-choice generation identity is invalid',
  );
  requireQuery(
    hasExactKeys(query.policy, [
      'route',
      'candidateSetChecksum',
    ]) &&
      query.policy.route === LERM_HORDE_HISTORY_DECISION_POLICY &&
      query.policy.candidateSetChecksum ===
        LERM_HORDE_HISTORY_CANDIDATE_SET_CHECKSUM,
    'route-choice policy or candidate set drifted',
  );
  requireQuery(
    (query.episodeIndex === 0 || query.episodeIndex === 1) &&
      Array.isArray(query.candidates) &&
      query.candidates.length === 2 &&
      query.candidates[0]?.id === 'left-longitudinal' &&
      query.candidates[1]?.id === 'right-longitudinal',
    'route-choice query must contain the exact two candidates',
  );
  requireQuery(
    !containsFullTerrainPayload(query),
    'route-choice query cannot contain a full terrain payload',
  );
  requireQuery(
    hasExactKeys(query.timing, [
      'compactPayloadBytes',
      'mapLatencyMs',
      'queueLatencyMs',
      'generationAgeMs',
      'mainThreadWaitMs',
    ]) &&
      timingValuesAreNonnegative(query.timing),
    'route-choice timing receipt must be complete, finite, and nonnegative',
  );
  requireQuery(
    hasExactKeys(query.hill, [
      'route',
      'frameId',
      'sampleChecksum',
      'topologyChecksum',
      'supportFrameChecksum',
      'producerTrafficFieldChecksum',
    ]) &&
      sourceIdentityIsNonblank(query.hill),
    'route-choice Hill identity is incomplete',
  );
  const source = query.candidates[0].source;
  requireQuery(
    sourceIdentityIsNonblank(source) &&
      query.candidates.every(({ source: candidateSource }) =>
      sourceIdentityEquals(candidateSource, source)
    ) &&
      sourceIdentityEquals(query.hill, source) &&
      query.generation.frameId === source.frameId,
    'route-choice candidates crossed Hill or generation identity',
  );
  const materializeCandidate = (
    candidate: LermHordeGpuRouteChoiceCandidate,
    index: 0 | 1,
  ): LermHordeHistoryCandidate => {
      const spec =
        LERM_HORDE_HISTORY_CANDIDATE_SPECS[index];
      requireQuery(
        hasExactKeys(candidate, [
          'id',
          'requestedWorldPosition',
          'source',
          'localExposure',
          'shock',
          'directionalPermeability',
        ]) &&
          candidate.id === spec.id &&
          exactVec3(
            candidate.requestedWorldPosition,
            spec.worldPosition,
          ) &&
          hasExactKeys(candidate.source, [
            'route',
            'frameId',
            'sampleChecksum',
            'topologyChecksum',
            'supportFrameChecksum',
            'producerTrafficFieldChecksum',
          ]) &&
          Number.isFinite(candidate.localExposure) &&
          candidate.localExposure >= 0 &&
          candidate.localExposure <= 1 &&
          nonblank(candidate.shock) &&
          Number.isFinite(
            candidate.directionalPermeability,
          ) &&
          candidate.directionalPermeability >= 0 &&
          candidate.directionalPermeability <= 1,
        `route-choice candidate ${spec.id} fields are invalid`,
      );
      return {
        id: spec.id,
        stableOrder: spec.stableOrder,
        lateralOffset: spec.lateralOffset,
        requestedWorldPosition: [...spec.worldPosition],
        source: { ...candidate.source },
        localExposure: candidate.localExposure,
        shock: candidate.shock,
        directionalPermeability:
          candidate.directionalPermeability,
        lawful:
          candidate.shock !== 'shock_reset' &&
          candidate.directionalPermeability > 0,
      };
    };
  const candidates: [
    LermHordeHistoryCandidate,
    LermHordeHistoryCandidate,
  ] = [
    materializeCandidate(query.candidates[0], 0),
    materializeCandidate(query.candidates[1], 1),
  ];
  requireQuery(
    candidates.every(({ source: candidateSource }) =>
      candidateSource.route === source.route &&
      candidateSource.frameId === source.frameId &&
      candidateSource.sampleChecksum === source.sampleChecksum &&
      candidateSource.topologyChecksum ===
        source.topologyChecksum &&
      candidateSource.supportFrameChecksum ===
        source.supportFrameChecksum &&
      candidateSource.producerTrafficFieldChecksum ===
        source.producerTrafficFieldChecksum
    ),
    'route-choice candidates crossed Hill identity',
  );
  const lawful = [...candidates]
    .filter(({ lawful }) => lawful)
    .sort(
      (left, right) =>
        left.localExposure -
          right.localExposure ||
        left.stableOrder - right.stableOrder,
    );
  requireQuery(
    lawful.length >= 2,
    'route-choice query requires two lawful comparison candidates',
  );
  const [selected, runnerUp] = lawful;
  const selectedExposure = selected.localExposure;
  const runnerUpExposure = runnerUp.localExposure;
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
    candidates,
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

function compactSourceIdentity(
  source: LermHordeHillQuerySourceIdentity,
): LermHordeHillQuerySourceIdentity {
  return {
    route: source.route,
    frameId: source.frameId,
    sampleChecksum: source.sampleChecksum,
    topologyChecksum: source.topologyChecksum,
    supportFrameChecksum: source.supportFrameChecksum,
    producerTrafficFieldChecksum:
      source.producerTrafficFieldChecksum,
  };
}

function sourceIdentityEquals(
  left: LermHordeHillQuerySourceIdentity,
  right: LermHordeHillQuerySourceIdentity,
): boolean {
  return (
    left.route === right.route &&
    left.frameId === right.frameId &&
    left.sampleChecksum === right.sampleChecksum &&
    left.topologyChecksum === right.topologyChecksum &&
    left.supportFrameChecksum === right.supportFrameChecksum &&
    left.producerTrafficFieldChecksum ===
      right.producerTrafficFieldChecksum
  );
}

function sourceIdentityIsNonblank(
  source: LermHordeHillQuerySourceIdentity | null | undefined,
): boolean {
  return (
    !!source &&
    nonblank(source.route) &&
    nonblank(source.frameId) &&
    nonblank(source.sampleChecksum) &&
    nonblank(source.topologyChecksum) &&
    nonblank(source.supportFrameChecksum) &&
    nonblank(source.producerTrafficFieldChecksum)
  );
}

function timingValuesAreNonnegative(
  timing: LermHordeGpuRouteChoiceQuery['timing'],
): boolean {
  return (
    Number.isFinite(timing.compactPayloadBytes) &&
    timing.compactPayloadBytes > 0 &&
    Number.isFinite(timing.mapLatencyMs) &&
    timing.mapLatencyMs >= 0 &&
    Number.isFinite(timing.queueLatencyMs) &&
    timing.queueLatencyMs >= 0 &&
    Number.isFinite(timing.generationAgeMs) &&
    timing.generationAgeMs >= 0 &&
    Number.isFinite(timing.mainThreadWaitMs) &&
    timing.mainThreadWaitMs >= 0
  );
}

function exactVec3(
  value: readonly number[],
  expected: readonly number[],
): boolean {
  return (
    Array.isArray(value) &&
    value.length === 3 &&
    value.every(
      (component, index) =>
        Number.isFinite(component) &&
        component === expected[index],
    )
  );
}

function hasExactKeys(
  value: unknown,
  expected: readonly string[],
): boolean {
  if (!value || typeof value !== 'object') return false;
  const actual = Object.keys(value).sort();
  const canonical = [...expected].sort();
  return (
    actual.length === canonical.length &&
    actual.every((key, index) => key === canonical[index])
  );
}

function nonblank(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
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
