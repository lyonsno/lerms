import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  LERM_HORDE_EPISODE_FINAL_DEPARTURE_MS,
  LERM_HORDE_EPISODE_RESEED_MS,
  LERM_HORDE_EPISODE_SETTLE_MS,
  LERM_HORDE_HISTORY_RUNTIME_ROUTE,
  LERM_HORDE_HISTORY_RUNTIME_SCHEMA,
  createLermHordeHistoryConditionedRuntime,
} from '../src/lerm-horde-history-conditioned-runtime.js';
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
const traversalMs = producerReceipt.historySummary.lastTimestampMs;
const episodeBStartMs =
  traversalMs +
  LERM_HORDE_EPISODE_SETTLE_MS +
  LERM_HORDE_EPISODE_RESEED_MS;
const episodeBEndMs = episodeBStartMs + traversalMs;
const finalSettleEndMs =
  episodeBEndMs + LERM_HORDE_EPISODE_SETTLE_MS;
const boundaryOnlyRuntime =
  createLermHordeHistoryConditionedRuntime({
    producerReceipt,
    railSampler: createReceiptRailSampler(producerReceipt),
    hillRevision: 'f6458e5bd74d9305c4149e6a2ee3844bf4613150',
  });
boundaryOnlyRuntime.advanceTo(traversalMs);
boundaryOnlyRuntime.advanceTo(episodeBStartMs);
boundaryOnlyRuntime.advanceTo(episodeBEndMs);
boundaryOnlyRuntime.advanceTo(
  boundaryOnlyRuntime.completionElapsedMs,
);
assert.throws(
  () => boundaryOnlyRuntime.createReceipt(),
  /positive visible settle/i,
  'touching traversal boundaries cannot impersonate positive visible settle intervals',
);

const runtime = createLermHordeHistoryConditionedRuntime({
  producerReceipt,
  railSampler: createReceiptRailSampler(producerReceipt),
  hillRevision: 'f6458e5bd74d9305c4149e6a2ee3844bf4613150',
});

assert.equal(runtime.state.episodeController.schema, LERM_HORDE_HISTORY_RUNTIME_SCHEMA);
assert.equal(runtime.state.episodeController.route, LERM_HORDE_HISTORY_RUNTIME_ROUTE);
assert.equal(runtime.state.episodeController.stage, 'traversing');
assert.equal(runtime.state.episodeController.activeEpisodeIndex, 0);
assert.equal(runtime.state.episodeController.activeActorInstanceId, 'lerm-episode-a');
assert.equal(runtime.state.episodeController.actorPrivateStateSource, 'fresh');
assert.equal(runtime.state.episodeController.decisions.length, 1);
assert.equal(runtime.state.episodeController.decisions[0].selected.id, 'left-longitudinal');
assert.ok(runtime.state.body);
assert.ok(runtime.state.body.rootWorld[0] < 0);
const initialTraffic =
  runtime.state.terrain.witness.producerTrafficFieldChecksum;

const episodeAEnd = runtime.advanceTo(traversalMs);
assert.equal(episodeAEnd.episodeController.stage, 'settling');
assert.equal(episodeAEnd.body?.progress, 1);
const settledRoot = episodeAEnd.body?.rootWorld;
const settle = runtime.advanceTo(traversalMs + 250);
assert.equal(settle.episodeController.stage, 'settling');
assert.deepEqual(settle.body?.rootWorld, settledRoot);
assert.equal(
  settle.terrain.witness.producerTrafficFieldChecksum,
  episodeAEnd.terrain.witness.producerTrafficFieldChecksum,
  'arrival settle cannot replay traversal deposition',
);

const reseed = runtime.advanceTo(episodeBStartMs - 1);
assert.equal(reseed.episodeController.stage, 'reseeding');
assert.equal(reseed.body, null);
assert.equal(reseed.phase, 'departed');
assert.equal(reseed.episodeController.activeActorInstanceId, null);

const episodeBStart = runtime.advanceTo(episodeBStartMs);
assert.equal(episodeBStart.episodeController.stage, 'traversing');
assert.equal(episodeBStart.episodeController.activeEpisodeIndex, 1);
assert.equal(
  episodeBStart.episodeController.activeActorInstanceId,
  'lerm-episode-b',
);
assert.equal(
  episodeBStart.episodeController.actorPrivateStateSource,
  'fresh',
);
assert.equal(
  episodeBStart.episodeController.previousActorPrivateStateCarried,
  false,
);
assert.equal(episodeBStart.episodeController.decisions.length, 2);
const [decisionA, decisionB] = episodeBStart.episodeController.decisions;
assert.equal(decisionA.selected.id, 'left-longitudinal');
assert.equal(decisionB.selected.id, 'right-longitudinal');
assert.equal(decisionB.policy.route, decisionA.policy.route);
assert.equal(
  decisionB.policy.candidateSetChecksum,
  decisionA.policy.candidateSetChecksum,
);
assert.notEqual(
  decisionB.hill.producerTrafficFieldChecksum,
  decisionA.hill.producerTrafficFieldChecksum,
);
assert.equal(
  decisionB.hill.producerTrafficFieldChecksum,
  reseed.terrain.witness.producerTrafficFieldChecksum,
  'Episode B decision must consume the exact retained Hill presented before reseed',
);
assert.ok(episodeBStart.body);
assert.ok(episodeBStart.body.rootWorld[0] > 0);
assert.notEqual(
  episodeBStart.terrain.witness.producerTrafficFieldChecksum,
  initialTraffic,
);

const episodeBMiddle = runtime.advanceTo(
  episodeBStartMs + traversalMs * 0.5,
);
assert.equal(episodeBMiddle.episodeController.stage, 'traversing');
assert.ok(episodeBMiddle.body);
assert.ok(episodeBMiddle.body.rootWorld[0] > 0);
assert.ok(episodeBMiddle.body.progress > 0);
assert.ok(episodeBMiddle.body.progress < 1);

const episodeBEnd = runtime.advanceTo(episodeBEndMs);
assert.equal(episodeBEnd.episodeController.stage, 'settling');
assert.equal(episodeBEnd.body?.progress, 1);
const finalSettle = runtime.advanceTo(finalSettleEndMs);
assert.equal(finalSettle.episodeController.stage, 'settling');
assert.ok(finalSettle.body);

const complete = runtime.advanceTo(runtime.completionElapsedMs);
assert.equal(
  runtime.completionElapsedMs,
  finalSettleEndMs + LERM_HORDE_EPISODE_FINAL_DEPARTURE_MS,
);
assert.equal(complete.episodeController.stage, 'complete');
assert.equal(complete.episodeController.activeEpisodeIndex, null);
assert.equal(complete.episodeController.activeActorInstanceId, null);
assert.equal(complete.body, null);
assert.equal(complete.phase, 'departed');

const receipt = runtime.createReceipt();
assert.equal(receipt.ok, true);
assert.equal(receipt.schema, LERM_HORDE_HISTORY_RUNTIME_SCHEMA);
assert.equal(receipt.route.requested, LERM_HORDE_HISTORY_RUNTIME_ROUTE);
assert.equal(receipt.route.effective, LERM_HORDE_HISTORY_RUNTIME_ROUTE);
assert.equal(receipt.route.fallbackStatus, 'none');
assert.equal(receipt.route.staleStatus, 'fresh');
assert.equal(receipt.episodes.length, 2);
assert.deepEqual(
  receipt.episodes.map(({ actorInstanceId }) => actorInstanceId),
  ['lerm-episode-a', 'lerm-episode-b'],
);
assert.equal(receipt.assertions.samePolicy, true);
assert.equal(receipt.assertions.sameCandidates, true);
assert.equal(receipt.assertions.freshSecondActor, true);
assert.equal(receipt.assertions.retainedHillChangedDecision, true);
assert.equal(receipt.assertions.bothTraversalsLive, true);
assert.equal(receipt.assertions.bothSettlesVisible, true);
assert.equal(receipt.assertions.noReplay, true);
assert.equal(receipt.assertions.noFallback, true);

console.log('lerm horde history conditioned runtime contracts ok');

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
