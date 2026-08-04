import {
  createLermHordeCpuRouteChoiceQuery,
  evaluateLermHordeGpuRouteChoiceQuery,
  type LermHordeGpuRouteChoiceEvaluation,
  type LermHordeGpuRouteChoiceQuery,
  type LermHordeHistoryCandidate,
  type LermHordeHistoryCandidateId,
} from './lerm-horde-history-conditioned-decision.js';
import type {
  LermHordeProducerHistoryCompositionReceipt,
} from './lerm-horde-producer-history-composition.js';
import {
  createLermHordeLiveRuntime,
  type LermHordeLiveRailSample,
} from './lerm-horde-live-runtime-composition.js';

export const LERM_HORDE_HISTORY_COUNTERFACTUAL_SCHEMA =
  'lerms.horde-history-counterfactual-comparison.v0' as const;
export const LERM_HORDE_HISTORY_COUNTERFACTUAL_ROUTE =
  'lerms/lerm-horde/history-counterfactual-comparison-v0' as const;

export interface CreateLermHordeHistoryCounterfactualOptions {
  producerReceipt: LermHordeProducerHistoryCompositionReceipt;
  railSampler(sourceDistance: number): LermHordeLiveRailSample;
  hillRevision: string;
  nondeterminismEnvelope?: number;
}

export interface LermHordeHistoryCounterfactualSnapshot {
  queryRoute: LermHordeGpuRouteChoiceQuery['route'];
  generation: LermHordeGpuRouteChoiceQuery['generation'];
  hill: LermHordeGpuRouteChoiceQuery['hill'];
  policy: LermHordeGpuRouteChoiceQuery['policy'];
  candidates: readonly LermHordeHistoryCandidate[];
  selected: LermHordeHistoryCandidate;
  runnerUp: LermHordeHistoryCandidate;
  selectedExposure: number;
  runnerUpExposure: number;
  decisionMargin: number;
  nondeterminismEnvelope: number;
  decisionStable: boolean;
  stabilityBasis: LermHordeGpuRouteChoiceEvaluation['stabilityBasis'];
}

export interface LermHordeHistoryCounterfactualReceipt {
  ok: true;
  schema: typeof LERM_HORDE_HISTORY_COUNTERFACTUAL_SCHEMA;
  route: {
    requested: typeof LERM_HORDE_HISTORY_COUNTERFACTUAL_ROUTE;
    effective: typeof LERM_HORDE_HISTORY_COUNTERFACTUAL_ROUTE;
    fallbackStatus: 'none';
    staleStatus: 'fresh';
    failurePhase: null;
  };
  verdict: 'causal-route-change' | 'abstained';
  source: {
    hillRevision: string;
    producerRevision: string;
    producerModuleSha256: string;
    historyChecksum: string;
    historyEpisodeId: string;
    sourceBindingChecksum: string;
  };
  controls: {
    terrainInitialStateSealed: true;
    sameProducer: true;
    samePolicy: true;
    sameCandidateSet: true;
    randomStream: {
      consumed: false;
      identity: 'none-by-contract';
    };
  };
  alternatives: {
    zeroHistory: {
      primary: LermHordeHistoryCounterfactualSnapshot;
      repeat: LermHordeHistoryCounterfactualSnapshot;
    };
    inheritedHistory: {
      primary: LermHordeHistoryCounterfactualSnapshot;
      repeat: LermHordeHistoryCounterfactualSnapshot;
    };
  };
  delta: {
    selectedChanged: boolean;
    from: LermHordeHistoryCandidateId | null;
    to: LermHordeHistoryCandidateId | null;
    decisionMarginDelta: number;
    candidateAffordances: readonly {
      id: LermHordeHistoryCandidateId;
      zeroHistoryExposure: number;
      inheritedHistoryExposure: number;
      localExposureDelta: number;
      shockChanged: boolean;
      directionalPermeabilityDelta: number;
      lawfulChanged: boolean;
    }[];
    changedInputClasses: readonly [
      'sealed-hill-source-identity',
      'local-typed-affordance',
    ];
    onlyBoundedCausalInputsChanged: true;
  };
  assertions: {
    zeroHistoryEquivalent: true;
    inheritedHistoryDeterministic: true;
    sameProducer: true;
    samePolicy: true;
    sameCandidates: true;
    noRandomMutation: true;
    bothAlternativesPreserved: true;
    decisionMarginSufficient: boolean;
    sourceBound: true;
  };
}

export function createLermHordeHistoryCounterfactualReceipt(
  options: CreateLermHordeHistoryCounterfactualOptions,
): LermHordeHistoryCounterfactualReceipt {
  validateOptions(options);
  const envelope = options.nondeterminismEnvelope ?? 0;
  const zeroPrimary = reconstructAlternative(options, 'zero-history', envelope);
  const zeroRepeat = reconstructAlternative(options, 'zero-history', envelope);
  const inheritedPrimary = reconstructAlternative(
    options,
    'inherited-history',
    envelope,
  );
  const inheritedRepeat = reconstructAlternative(
    options,
    'inherited-history',
    envelope,
  );
  const zeroHistoryEquivalent = equivalent(zeroPrimary, zeroRepeat);
  const inheritedHistoryDeterministic = equivalent(
    inheritedPrimary,
    inheritedRepeat,
  );
  if (!zeroHistoryEquivalent || !inheritedHistoryDeterministic) {
    throw new Error(
      'history counterfactual independent reconstruction was not deterministic',
    );
  }
  const samePolicy =
    equivalent(zeroPrimary.policy, inheritedPrimary.policy);
  const sameCandidates = candidateContractEquals(
    zeroPrimary.candidates,
    inheritedPrimary.candidates,
  );
  if (!samePolicy || !sameCandidates) {
    throw new Error(
      'history counterfactual policy or candidate set mutated across alternatives',
    );
  }
  const marginSufficient =
    inheritedPrimary.decisionStable &&
    inheritedPrimary.stabilityBasis === 'margin-exceeds-envelope';
  const observedSelectionChanged =
    zeroPrimary.selected.id !== inheritedPrimary.selected.id;
  const causalRouteChange = marginSufficient && observedSelectionChanged;
  const source = {
    hillRevision: options.hillRevision,
    producerRevision: options.producerReceipt.producer.revision,
    producerModuleSha256:
      options.producerReceipt.producer.moduleSha256,
    historyChecksum: options.producerReceipt.historySummary.checksum,
    historyEpisodeId:
      options.producerReceipt.historySummary.episodeId,
  };
  const receipt: LermHordeHistoryCounterfactualReceipt = {
    ok: true,
    schema: LERM_HORDE_HISTORY_COUNTERFACTUAL_SCHEMA,
    route: {
      requested: LERM_HORDE_HISTORY_COUNTERFACTUAL_ROUTE,
      effective: LERM_HORDE_HISTORY_COUNTERFACTUAL_ROUTE,
      fallbackStatus: 'none',
      staleStatus: 'fresh',
      failurePhase: null,
    },
    verdict: causalRouteChange ? 'causal-route-change' : 'abstained',
    source: {
      ...source,
      sourceBindingChecksum: checksumText(
        Object.values(source).join('|'),
      ),
    },
    controls: {
      terrainInitialStateSealed: true,
      sameProducer: true,
      samePolicy: true,
      sameCandidateSet: true,
      randomStream: {
        consumed: false,
        identity: 'none-by-contract',
      },
    },
    alternatives: {
      zeroHistory: {
        primary: zeroPrimary,
        repeat: zeroRepeat,
      },
      inheritedHistory: {
        primary: inheritedPrimary,
        repeat: inheritedRepeat,
      },
    },
    delta: {
      selectedChanged: causalRouteChange,
      from: causalRouteChange ? zeroPrimary.selected.id : null,
      to: causalRouteChange ? inheritedPrimary.selected.id : null,
      decisionMarginDelta:
        inheritedPrimary.decisionMargin - zeroPrimary.decisionMargin,
      candidateAffordances: zeroPrimary.candidates.map((zeroCandidate) => {
        const inheritedCandidate = inheritedPrimary.candidates.find(
          ({ id }) => id === zeroCandidate.id,
        );
        if (!inheritedCandidate) {
          throw new Error(
            `history counterfactual omitted candidate ${zeroCandidate.id}`,
          );
        }
        return {
          id: zeroCandidate.id,
          zeroHistoryExposure: zeroCandidate.localExposure,
          inheritedHistoryExposure: inheritedCandidate.localExposure,
          localExposureDelta:
            inheritedCandidate.localExposure - zeroCandidate.localExposure,
          shockChanged: inheritedCandidate.shock !== zeroCandidate.shock,
          directionalPermeabilityDelta:
            inheritedCandidate.directionalPermeability -
            zeroCandidate.directionalPermeability,
          lawfulChanged: inheritedCandidate.lawful !== zeroCandidate.lawful,
        };
      }),
      changedInputClasses: [
        'sealed-hill-source-identity',
        'local-typed-affordance',
      ],
      onlyBoundedCausalInputsChanged: true,
    },
    assertions: {
      zeroHistoryEquivalent: true,
      inheritedHistoryDeterministic: true,
      sameProducer: true,
      samePolicy: true,
      sameCandidates: true,
      noRandomMutation: true,
      bothAlternativesPreserved: true,
      decisionMarginSufficient: marginSufficient,
      sourceBound: true,
    },
  };
  validateLermHordeHistoryCounterfactualReceipt(receipt);
  return receipt;
}

export function validateLermHordeHistoryCounterfactualReceipt(
  receipt: LermHordeHistoryCounterfactualReceipt,
): void {
  requireReceipt(
    receipt?.ok === true &&
      receipt.schema === LERM_HORDE_HISTORY_COUNTERFACTUAL_SCHEMA,
    'history counterfactual receipt schema is invalid',
  );
  requireReceipt(
    receipt.route?.requested === LERM_HORDE_HISTORY_COUNTERFACTUAL_ROUTE &&
      receipt.route.effective === receipt.route.requested &&
      receipt.route.fallbackStatus === 'none' &&
      receipt.route.staleStatus === 'fresh' &&
      receipt.route.failurePhase === null,
    'history counterfactual route uses fallback, stale, or failed evidence',
  );
  const sourceValues = [
    receipt.source?.hillRevision,
    receipt.source?.producerRevision,
    receipt.source?.producerModuleSha256,
    receipt.source?.historyChecksum,
    receipt.source?.historyEpisodeId,
  ];
  requireReceipt(
    /^[0-9a-f]{40}$/.test(receipt.source?.hillRevision ?? '') &&
      /^[0-9a-f]{40}$/.test(receipt.source?.producerRevision ?? '') &&
      /^[0-9a-f]{64}$/.test(
        receipt.source?.producerModuleSha256 ?? '',
      ) &&
      sourceValues.every(nonblank) &&
      receipt.source.sourceBindingChecksum ===
        checksumText(sourceValues.join('|')),
    'history counterfactual source or producer binding is invalid',
  );
  requireReceipt(
    receipt.controls?.terrainInitialStateSealed === true &&
      receipt.controls.sameProducer === true &&
      receipt.controls.samePolicy === true &&
      receipt.controls.sameCandidateSet === true &&
      receipt.controls.randomStream?.consumed === false &&
      receipt.controls.randomStream.identity === 'none-by-contract',
    'history counterfactual controls or random-stream identity drifted',
  );
  const zero = receipt.alternatives?.zeroHistory;
  const inherited = receipt.alternatives?.inheritedHistory;
  validateSnapshot(zero?.primary, -1);
  validateSnapshot(zero?.repeat, -1);
  validateSnapshot(inherited?.primary, undefined);
  validateSnapshot(inherited?.repeat, undefined);
  requireReceipt(
    equivalent(zero.primary, zero.repeat),
    'history counterfactual zero-history repeat is not deterministic',
  );
  requireReceipt(
    equivalent(inherited.primary, inherited.repeat),
    'history counterfactual inherited-history repeat is not deterministic',
  );
  requireReceipt(
    equivalent(zero.primary.policy, inherited.primary.policy) &&
      candidateContractEquals(
        zero.primary.candidates,
        inherited.primary.candidates,
      ),
    'history counterfactual policy or candidate alternative mutated',
  );
  const expectedMarginSufficient =
    inherited.primary.decisionStable &&
    inherited.primary.stabilityBasis === 'margin-exceeds-envelope' &&
    inherited.primary.decisionMargin >
      inherited.primary.nondeterminismEnvelope;
  const observedSelectionChanged =
    zero.primary.selected.id !== inherited.primary.selected.id;
  const expectedCausal =
    expectedMarginSufficient && observedSelectionChanged;
  requireReceipt(
    receipt.verdict ===
      (expectedCausal ? 'causal-route-change' : 'abstained') &&
      receipt.assertions.decisionMarginSufficient ===
        expectedMarginSufficient &&
      receipt.delta.selectedChanged === expectedCausal &&
      receipt.delta.from ===
        (expectedCausal ? zero.primary.selected.id : null) &&
      receipt.delta.to ===
        (expectedCausal ? inherited.primary.selected.id : null),
    'history counterfactual verdict violates the measured margin or envelope',
  );
  requireReceipt(
    receipt.delta.onlyBoundedCausalInputsChanged === true &&
      equivalent(receipt.delta.changedInputClasses, [
        'sealed-hill-source-identity',
        'local-typed-affordance',
      ]) &&
      receipt.delta.candidateAffordances.length === 2 &&
      receipt.delta.candidateAffordances.every((delta, index) => {
        const left = zero.primary.candidates[index];
        const right = inherited.primary.candidates[index];
        return (
          delta.id === left.id &&
          delta.zeroHistoryExposure === left.localExposure &&
          delta.inheritedHistoryExposure === right.localExposure &&
          delta.localExposureDelta ===
            right.localExposure - left.localExposure &&
          delta.shockChanged === (right.shock !== left.shock) &&
          delta.directionalPermeabilityDelta ===
            right.directionalPermeability -
              left.directionalPermeability &&
          delta.lawfulChanged === (right.lawful !== left.lawful)
        );
      }),
    'history counterfactual bounded local affordance delta is invalid',
  );
  requireReceipt(
    Object.values(receipt.assertions).every(
      (value) => value === true || value === false,
    ) &&
      receipt.assertions.zeroHistoryEquivalent === true &&
      receipt.assertions.inheritedHistoryDeterministic === true &&
      receipt.assertions.sameProducer === true &&
      receipt.assertions.samePolicy === true &&
      receipt.assertions.sameCandidates === true &&
      receipt.assertions.noRandomMutation === true &&
      receipt.assertions.bothAlternativesPreserved === true &&
      receipt.assertions.sourceBound === true,
    'history counterfactual assertions are incomplete',
  );
}

function reconstructAlternative(
  options: CreateLermHordeHistoryCounterfactualOptions,
  condition: 'zero-history' | 'inherited-history',
  nondeterminismEnvelope: number,
): LermHordeHistoryCounterfactualSnapshot {
  const runtime = createLermHordeLiveRuntime({
    producerReceipt: options.producerReceipt,
    railSampler: options.railSampler,
    hillRevision: options.hillRevision,
  });
  if (condition === 'inherited-history') {
    runtime.advanceTo(
      options.producerReceipt.historySummary.lastTimestampMs + 900,
    );
  }
  const highestAdmittedEventSequence =
    condition === 'zero-history'
      ? -1
      : options.producerReceipt.history.samples.length - 1;
  const query = createLermHordeCpuRouteChoiceQuery(
    runtime.state.terrain,
    condition === 'zero-history' ? 0 : 1,
    {
      nondeterminismEnvelope,
      highestAdmittedEventSequence,
    },
  );
  const evaluation = evaluateLermHordeGpuRouteChoiceQuery(
    query,
    highestAdmittedEventSequence,
  );
  return {
    queryRoute: { ...query.route },
    generation: { ...query.generation },
    hill: { ...query.hill },
    policy: { ...query.policy },
    candidates: evaluation.candidates.map((candidate) => ({
      ...candidate,
      requestedWorldPosition: [...candidate.requestedWorldPosition],
      source: { ...candidate.source },
    })),
    selected: cloneCandidate(evaluation.selected),
    runnerUp: cloneCandidate(evaluation.runnerUp),
    selectedExposure: evaluation.selectedExposure,
    runnerUpExposure: evaluation.runnerUpExposure,
    decisionMargin: evaluation.decisionMargin,
    nondeterminismEnvelope: evaluation.nondeterminismEnvelope,
    decisionStable: evaluation.decisionStable,
    stabilityBasis: evaluation.stabilityBasis,
  };
}

function validateSnapshot(
  snapshot: LermHordeHistoryCounterfactualSnapshot | undefined,
  expectedSequence: number | undefined,
): asserts snapshot is LermHordeHistoryCounterfactualSnapshot {
  requireReceipt(!!snapshot, 'history counterfactual alternative is missing');
  requireReceipt(
    snapshot.queryRoute.requested === snapshot.queryRoute.effective &&
      snapshot.queryRoute.backend === 'cpu-oracle' &&
      snapshot.queryRoute.fallbackStatus === 'none' &&
      snapshot.queryRoute.staleStatus === 'fresh',
    'history counterfactual alternative query route is invalid',
  );
  requireReceipt(
    snapshot.generation.sealed === true &&
      snapshot.generation.complete === true &&
      (expectedSequence === undefined
        ? snapshot.generation.highestAdmittedEventSequence >= 0
        : snapshot.generation.highestAdmittedEventSequence ===
          expectedSequence),
    'history counterfactual alternative generation is not sealed',
  );
  requireReceipt(
    snapshot.candidates.length === 2 &&
      snapshot.candidates[0].id === 'left-longitudinal' &&
      snapshot.candidates[1].id === 'right-longitudinal' &&
      snapshot.candidates.every(
        (candidate) =>
          candidate.source.route === snapshot.hill.route &&
          candidate.source.frameId === snapshot.hill.frameId &&
          candidate.source.sampleChecksum ===
            snapshot.hill.sampleChecksum &&
          candidate.source.topologyChecksum ===
            snapshot.hill.topologyChecksum &&
          candidate.source.supportFrameChecksum ===
            snapshot.hill.supportFrameChecksum &&
          candidate.source.producerTrafficFieldChecksum ===
            snapshot.hill.producerTrafficFieldChecksum,
      ),
    'history counterfactual candidate alternative crossed source identity',
  );
  requireReceipt(
    snapshot.selected.id === snapshot.candidates[0].id ||
      snapshot.selected.id === snapshot.candidates[1].id,
    'history counterfactual selected candidate is not preserved',
  );
}

function candidateContractEquals(
  left: readonly LermHordeHistoryCandidate[],
  right: readonly LermHordeHistoryCandidate[],
): boolean {
  return (
    left.length === right.length &&
    left.every((candidate, index) => {
      const other = right[index];
      return (
        candidate.id === other?.id &&
        candidate.stableOrder === other.stableOrder &&
        candidate.lateralOffset === other.lateralOffset &&
        equivalent(
          candidate.requestedWorldPosition,
          other.requestedWorldPosition,
        )
      );
    })
  );
}

function cloneCandidate(
  candidate: LermHordeHistoryCandidate,
): LermHordeHistoryCandidate {
  return {
    ...candidate,
    requestedWorldPosition: [...candidate.requestedWorldPosition],
    source: { ...candidate.source },
  };
}

function validateOptions(
  options: CreateLermHordeHistoryCounterfactualOptions,
): void {
  const envelope = options?.nondeterminismEnvelope ?? 0;
  if (
    options?.producerReceipt?.ok !== true ||
    typeof options.railSampler !== 'function' ||
    !/^[0-9a-f]{40}$/.test(options.hillRevision) ||
    !Number.isFinite(envelope) ||
    envelope < 0
  ) {
    throw new Error(
      'history counterfactual requires exact producer receipt, rail sampler, Hill revision, and nonnegative envelope',
    );
  }
}

function equivalent(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function nonblank(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function checksumText(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

function requireReceipt(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) throw new Error(message);
}
