import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  createLermHordeHistoryCounterfactualReceipt,
  validateLermHordeHistoryCounterfactualReceipt,
} from '../src/lerm-horde-history-counterfactual-comparison.js';
import type {
  LermHordeProducerHistoryCompositionReceipt,
} from '../src/lerm-horde-producer-history-composition.js';
import type {
  LermHordeLiveRailSample,
} from '../src/lerm-horde-live-runtime-composition.js';

const producerReceipt = JSON.parse(
  readFileSync(
    resolve('artifacts/lerm-horde-producer-history/receipt.json'),
    'utf8',
  ),
) as LermHordeProducerHistoryCompositionReceipt;
const hillRevision = 'f6458e5bd74d9305c4149e6a2ee3844bf4613150';
const options = {
  producerReceipt,
  railSampler: createReceiptRailSampler(producerReceipt),
  hillRevision,
};

const receipt = createLermHordeHistoryCounterfactualReceipt(options);
assert.equal(receipt.ok, true);
assert.equal(
  receipt.schema,
  'lerms.horde-history-counterfactual-comparison.v0',
);
assert.equal(
  receipt.route.requested,
  'lerms/lerm-horde/history-counterfactual-comparison-v0',
);
assert.equal(receipt.route.effective, receipt.route.requested);
assert.equal(receipt.route.fallbackStatus, 'none');
assert.equal(receipt.route.staleStatus, 'fresh');
assert.equal(receipt.verdict, 'causal-route-change');
assert.equal(receipt.source.hillRevision, hillRevision);
assert.equal(
  receipt.source.producerRevision,
  producerReceipt.producer.revision,
);
assert.equal(
  receipt.source.producerModuleSha256,
  producerReceipt.producer.moduleSha256,
);
assert.equal(
  receipt.source.historyChecksum,
  producerReceipt.historySummary.checksum,
);
assert.equal(
  receipt.controls.terrainInitialStateSealed,
  true,
);
assert.equal(receipt.controls.sameProducer, true);
assert.equal(receipt.controls.samePolicy, true);
assert.equal(receipt.controls.sameCandidateSet, true);
assert.equal(receipt.controls.randomStream.consumed, false);
assert.equal(receipt.controls.randomStream.identity, 'none-by-contract');

const zero = receipt.alternatives.zeroHistory;
const inherited = receipt.alternatives.inheritedHistory;
assert.deepEqual(
  zero.primary,
  zero.repeat,
  'two independent zero-history reconstructions must agree exactly',
);
assert.deepEqual(
  inherited.primary,
  inherited.repeat,
  'two independent inherited-history reconstructions must agree exactly',
);
assert.equal(zero.primary.selected.id, 'left-longitudinal');
assert.equal(inherited.primary.selected.id, 'right-longitudinal');
assert.equal(zero.primary.decisionMargin, 0);
assert.ok(inherited.primary.decisionMargin > 0);
assert.equal(inherited.primary.decisionStable, true);
assert.equal(
  inherited.primary.stabilityBasis,
  'margin-exceeds-envelope',
);
assert.deepEqual(
  zero.primary.candidates.map(({ id }: { id: string }) => id),
  inherited.primary.candidates.map(({ id }: { id: string }) => id),
);
assert.equal(
  zero.primary.policy.candidateSetChecksum,
  inherited.primary.policy.candidateSetChecksum,
);
assert.notEqual(
  zero.primary.hill.producerTrafficFieldChecksum,
  inherited.primary.hill.producerTrafficFieldChecksum,
);
assert.equal(receipt.delta.selectedChanged, true);
assert.equal(receipt.delta.from, 'left-longitudinal');
assert.equal(receipt.delta.to, 'right-longitudinal');
assert.equal(receipt.delta.candidateAffordances.length, 2);
assert.ok(
  receipt.delta.candidateAffordances.some(
    ({ localExposureDelta }: { localExposureDelta: number }) =>
      Math.abs(localExposureDelta) > 0,
  ),
  'the claimed route change must expose a nonzero local memory delta',
);
assert.equal(receipt.delta.onlyBoundedCausalInputsChanged, true);
assert.deepEqual(receipt.delta.changedInputClasses, [
  'sealed-hill-source-identity',
  'local-typed-affordance',
]);
assert.equal(receipt.assertions.zeroHistoryEquivalent, true);
assert.equal(receipt.assertions.inheritedHistoryDeterministic, true);
assert.equal(receipt.assertions.bothAlternativesPreserved, true);
assert.equal(receipt.assertions.decisionMarginSufficient, true);
assert.equal(receipt.assertions.sourceBound, true);
validateLermHordeHistoryCounterfactualReceipt(receipt);

const ambiguous = createLermHordeHistoryCounterfactualReceipt({
  ...options,
  nondeterminismEnvelope: 1,
});
assert.equal(ambiguous.verdict, 'abstained');
assert.equal(ambiguous.assertions.decisionMarginSufficient, false);
assert.equal(ambiguous.delta.selectedChanged, false);
assert.equal(ambiguous.delta.from, null);
assert.equal(ambiguous.delta.to, null);
validateLermHordeHistoryCounterfactualReceipt(ambiguous);

for (const [label, mutate, expected] of [
  [
    'fallback route',
    (candidate: any) => {
      candidate.route.effective = 'fallback/comparison';
      candidate.route.fallbackStatus = 'fallback';
    },
    /route|fallback/i,
  ],
  [
    'producer substitution',
    (candidate: any) => {
      candidate.source.producerRevision = '0'.repeat(40);
    },
    /source|producer/i,
  ],
  [
    'candidate mutation',
    (candidate: any) => {
      candidate.alternatives.inheritedHistory.primary.candidates[0].id =
        'invented-candidate';
    },
    /candidate|alternative/i,
  ],
  [
    'non-deterministic reconstruction',
    (candidate: any) => {
      candidate.alternatives.inheritedHistory.repeat.decisionMargin += 0.1;
    },
    /determin|repeat/i,
  ],
  [
    'causal claim inside envelope',
    (candidate: any) => {
      candidate.verdict = 'causal-route-change';
      candidate.assertions.decisionMarginSufficient = true;
      candidate.delta.selectedChanged = true;
      candidate.delta.from = 'left-longitudinal';
      candidate.delta.to = 'right-longitudinal';
    },
    /margin|envelope|verdict/i,
  ],
] as const) {
  const malformed = structuredClone(
    label === 'causal claim inside envelope' ? ambiguous : receipt,
  );
  mutate(malformed);
  assert.throws(
    () => validateLermHordeHistoryCounterfactualReceipt(malformed),
    expected,
    label,
  );
}

console.log(
  'lerm horde history counterfactual comparison contracts ok',
  JSON.stringify({
    verdict: receipt.verdict,
    zeroHistorySelection: zero.primary.selected.id,
    inheritedHistorySelection: inherited.primary.selected.id,
    inheritedHistoryMargin: inherited.primary.decisionMargin,
    nondeterminismEnvelope:
      inherited.primary.nondeterminismEnvelope,
    candidateAffordances: receipt.delta.candidateAffordances,
    sourceBindingChecksum: receipt.source.sourceBindingChecksum,
  }),
);

function createReceiptRailSampler(
  source: LermHordeProducerHistoryCompositionReceipt,
): (sourceDistance: number) => LermHordeLiveRailSample {
  const samples = source.history.samples;
  return (sourceDistance) => {
    const upperIndex = samples.findIndex(
      ({ root }) => root.sourceDistance >= sourceDistance,
    );
    const toIndex = upperIndex < 0 ? samples.length - 1 : upperIndex;
    const fromIndex = Math.max(0, toIndex - 1);
    const from = samples[fromIndex].root;
    const to = samples[toIndex].root;
    const span = Math.max(
      Number.EPSILON,
      to.sourceDistance - from.sourceDistance,
    );
    const mix = Math.max(
      0,
      Math.min(1, (sourceDistance - from.sourceDistance) / span),
    );
    return {
      schema: 'kaminos.creature-scale-locomotion-rail-sample.v0',
      railId: source.producer.railId,
      sourceDistance,
      progress:
        from.routeProgress +
        (to.routeProgress - from.routeProgress) * mix,
      position: from.worldPosition.map(
        (value, index) =>
          value + (to.worldPosition[index] - value) * mix,
      ) as [number, number, number],
      tangent: [...from.tangent],
      locomotionFrame: {
        forward: [...from.locomotionFrame.forward],
        right: [...from.locomotionFrame.right],
        up: [...from.locomotionFrame.up],
      },
      attention: {
        direction: [...from.attention.direction],
        authority: from.attention.authority,
      },
      support: {
        schema: from.support.schema,
        plannerDisposition: from.support.disposition,
        rootLift: from.support.rootLift,
        compliance: {
          minimumNormalizedMargin:
            from.support.minimumComplianceMargin,
        },
      },
    };
  };
}
