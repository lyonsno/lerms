import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  LERM_HORDE_HISTORY_DECISION_POLICY,
  LERM_HORDE_HISTORY_DECISION_SCHEMA,
  chooseLermHordeHistoryConditionedContinuation,
} from '../src/lerm-horde-history-conditioned-decision.js';
import type {
  LermHordeProducerHistoryCompositionReceipt,
} from '../src/lerm-horde-producer-history-composition.js';
import {
  createLermHordeLiveRuntime,
  type LermHordeLiveRailSample,
} from '../src/lerm-horde-live-runtime-composition.js';

const receipt = JSON.parse(
  readFileSync(
    resolve('artifacts/lerm-horde-producer-history/receipt.json'),
    'utf8',
  ),
) as LermHordeProducerHistoryCompositionReceipt;
const runtime = createLermHordeLiveRuntime({
  producerReceipt: receipt,
  railSampler: createReceiptRailSampler(receipt),
  hillRevision: 'f6458e5bd74d9305c4149e6a2ee3844bf4613150',
});

const first = chooseLermHordeHistoryConditionedContinuation(
  runtime.state.terrain,
  0,
  {
    highestAdmittedEventSequence: -1,
  },
);
assert.equal(first.schema, LERM_HORDE_HISTORY_DECISION_SCHEMA);
assert.equal(first.policy.route, LERM_HORDE_HISTORY_DECISION_POLICY);
assert.equal(first.policy.unchangedAcrossEpisodes, true);
assert.equal(first.policy.motive, 'seek-less-traversed-continuation');
assert.deepEqual(
  first.candidates.map(({ id }) => id),
  ['left-longitudinal', 'right-longitudinal'],
  'candidate identity and order are fixed by the Horde policy',
);
assert.equal(first.selected.id, 'left-longitudinal');
assert.equal(first.selected.reason, 'minimum-local-retained-traffic');
assert.equal(first.candidates.every(({ lawful }) => lawful), true);
assert.equal(
  first.candidates.every(({ source }) =>
    source.producerTrafficFieldChecksum ===
      runtime.state.terrain.witness.producerTrafficFieldChecksum
  ),
  true,
  'all candidates must be queried against the same current Hill memory',
);

runtime.advanceTo(receipt.historySummary.lastTimestampMs + 900);
const second = chooseLermHordeHistoryConditionedContinuation(
  runtime.state.terrain,
  1,
  {
    highestAdmittedEventSequence:
      receipt.history.samples.length - 1,
  },
);
assert.equal(second.policy.route, first.policy.route);
assert.equal(second.policy.revision, first.policy.revision);
assert.equal(second.policy.candidateSetChecksum, first.policy.candidateSetChecksum);
assert.equal(second.selected.id, 'right-longitudinal');
assert.equal(second.selected.reason, 'minimum-local-retained-traffic');
assert.notEqual(
  second.hill.producerTrafficFieldChecksum,
  first.hill.producerTrafficFieldChecksum,
  'Episode A must materially change the Hill memory queried by Episode B',
);
assert.ok(
  exposure(second, 'left-longitudinal') >
    exposure(second, 'right-longitudinal'),
  'Episode B must see more retained traffic on Episode A\'s branch',
);
assert.ok(
  exposure(second, 'left-longitudinal') >
    exposure(first, 'left-longitudinal'),
  'the selected branch change must be explained by increased retained traffic',
);
assert.deepEqual(
  second.candidates.map(({ id }) => id),
  first.candidates.map(({ id }) => id),
  'the second decision cannot drift the candidate set',
);

assert.throws(
  () =>
    chooseLermHordeHistoryConditionedContinuation(
      runtime.state.terrain,
      2,
      {
        highestAdmittedEventSequence:
          receipt.history.samples.length - 1,
      },
    ),
  /episode index.*0 or 1/i,
  'the bounded controller cannot silently grow a third episode',
);

console.log('lerm horde history conditioned decision contracts ok');

function exposure(
  decision: ReturnType<
    typeof chooseLermHordeHistoryConditionedContinuation
  >,
  candidateId: string,
): number {
  const candidate = decision.candidates.find(
    ({ id }) => id === candidateId,
  );
  assert.ok(candidate, `missing candidate ${candidateId}`);
  return candidate.localExposure;
}

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
    const position = from.worldPosition.map(
      (value, index) =>
        value + (to.worldPosition[index] - value) * mix,
    ) as [number, number, number];
    return {
      schema: 'kaminos.creature-scale-locomotion-rail-sample.v0',
      railId: source.producer.railId,
      sourceDistance,
      progress:
        from.routeProgress +
        (to.routeProgress - from.routeProgress) * mix,
      position,
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
