import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import type { LermHordeProducerHistoryCompositionReceipt } from '../src/lerm-horde-producer-history-composition.js';
import {
  HILL_OF_HILLS_TERRAIN_BUFFER_SCHEMA,
} from '../src/terrain/hill-of-hills.js';
import {
  LERM_HORDE_LIVE_RUNTIME_ROUTE,
  LERM_HORDE_LIVE_RUNTIME_SCHEMA,
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

const initial = runtime.state;
assert.equal(initial.schema, LERM_HORDE_LIVE_RUNTIME_SCHEMA);
assert.equal(initial.route, LERM_HORDE_LIVE_RUNTIME_ROUTE);
assert.equal(initial.phase, 'traversing');
assert.equal(initial.elapsedMs, 0);
assert.equal(initial.tickCount, 0);
assert.equal(initial.admittedIntervalCount, 0);
assert.equal(initial.terrainBuffer.schema, HILL_OF_HILLS_TERRAIN_BUFFER_SCHEMA);
assert.equal(initial.terrainBuffer.sampleCount, 2_880);
assert.equal(initial.body?.sourceDistance, 0);
assert.equal(initial.body?.progress, 0);
assert.equal(initial.body?.support.provenance.hillSourceId, initial.terrain.source.frameId);

const first = runtime.advanceTo(40);
assert.equal(first.phase, 'traversing');
assert.ok(first.tickCount >= 1);
assert.equal(first.admittedIntervalCount, first.tickCount);
assert.ok(first.body);
assert.ok(first.body.sourceDistance > 0);
assert.ok(first.body.progress > 0);
assert.equal(
  first.body.support.renderedHillSourceId,
  first.terrain.source.frameId,
);
assert.equal(
  first.lastAdmission?.targetHill.frameId,
  initial.terrain.source.frameId,
);
assert.equal(
  first.lastAdmission?.targetHill.sampleChecksum,
  initial.terrain.witness.sampleChecksum,
);
assert.ok(first.terrain.witness.producerTrafficExposureSeconds > 0);
assert.equal(
  first.terrain.witness.producerTrafficAdmittedEpisodeCount,
  first.admittedIntervalCount,
);
assert.equal(first.terrain.witness.cacheGeneration, initial.terrain.witness.cacheGeneration + first.tickCount);

const middle = runtime.advanceTo(receipt.historySummary.lastTimestampMs * 0.52);
assert.equal(middle.phase, 'traversing');
assert.ok(middle.body);
assert.ok(middle.body.progress > first.body.progress);
assert.ok(middle.admittedIntervalCount > first.admittedIntervalCount);
assert.ok(
  middle.terrain.witness.producerTrafficExposureSeconds >
    first.terrain.witness.producerTrafficExposureSeconds,
);
assert.notEqual(
  middle.terrain.witness.producerTrafficFieldChecksum,
  first.terrain.witness.producerTrafficFieldChecksum,
);
assert.equal(
  new Set(middle.admittedEpisodeIds).size,
  middle.admittedEpisodeIds.length,
);
assert.equal(
  middle.admittedEpisodeIds.length,
  middle.admittedIntervalCount,
);

const atEnd = runtime.advanceTo(receipt.historySummary.lastTimestampMs);
assert.equal(atEnd.phase, 'traversing');
assert.ok(atEnd.body);
assert.equal(atEnd.body.progress, 1);
assert.equal(
  atEnd.body.sourceDistance,
  receipt.historySummary.lastSourceDistance,
);
const trafficAtEnd = atEnd.terrain.witness.producerTrafficFieldChecksum;
const exposureAtEnd = atEnd.terrain.witness.producerTrafficExposureSeconds;
const admittedAtEnd = atEnd.admittedIntervalCount;

const departed = runtime.advanceTo(
  receipt.historySummary.lastTimestampMs + 900,
);
assert.equal(departed.phase, 'departed');
assert.equal(departed.body, null);
assert.equal(departed.admittedIntervalCount, admittedAtEnd);
assert.equal(
  departed.terrain.witness.producerTrafficFieldChecksum,
  trafficAtEnd,
);
assert.equal(
  departed.terrain.witness.producerTrafficExposureSeconds,
  exposureAtEnd,
);
assert.ok(departed.tickCount > atEnd.tickCount);
assert.notEqual(
  departed.terrain.witness.sampleChecksum,
  atEnd.terrain.witness.sampleChecksum,
  'the persistent Hill must continue evolving after the body departs',
);
assert.equal(
  departed.terrain.witness.supportFrame.shockClassCounts.shock_reset ?? 0,
  0,
);

assert.equal(runtime.state, departed);
assert.throws(
  () => runtime.advanceTo(departed.elapsedMs - 1),
  /monotonic/i,
);

const runtimeReceipt = runtime.createReceipt();
assert.equal(runtimeReceipt.schema, LERM_HORDE_LIVE_RUNTIME_SCHEMA);
assert.equal(runtimeReceipt.route.requested, LERM_HORDE_LIVE_RUNTIME_ROUTE);
assert.equal(runtimeReceipt.route.effective, LERM_HORDE_LIVE_RUNTIME_ROUTE);
assert.equal(runtimeReceipt.route.fallbackStatus, 'none');
assert.equal(runtimeReceipt.route.staleStatus, 'fresh');
assert.equal(runtimeReceipt.clock.mode, 'incremental_elapsed_time');
assert.equal(runtimeReceipt.clock.precomputedFrameCount, 0);
assert.equal(runtimeReceipt.clock.prefixRebuildCount, 0);
assert.equal(runtimeReceipt.clock.replayConstructorCalls, 0);
assert.equal(runtimeReceipt.clock.tickCount, departed.tickCount);
assert.equal(runtimeReceipt.admission.intervalCount, admittedAtEnd);
assert.equal(runtimeReceipt.admission.uniqueEpisodeCount, admittedAtEnd);
assert.equal(runtimeReceipt.admission.trafficRetainedAfterDeparture, true);
assert.equal(runtimeReceipt.claimBoundary.liveCurrentHillTruth, true);
assert.equal(runtimeReceipt.claimBoundary.liveRootExposureTruth, true);
assert.equal(runtimeReceipt.claimBoundary.liveContactTruth, false);

console.log('lerm Horde live runtime composition contracts passed');

function createReceiptRailSampler(
  source: LermHordeProducerHistoryCompositionReceipt,
): (sourceDistance: number) => LermHordeLiveRailSample {
  return (sourceDistance) => {
    const samples = source.history.samples;
    const upperIndex = Math.max(
      1,
      samples.findIndex(
        (sample) => sample.root.sourceDistance >= sourceDistance,
      ),
    );
    const upper = samples[Math.min(samples.length - 1, upperIndex)];
    const lower = samples[Math.max(0, upperIndex - 1)];
    const span =
      upper.root.sourceDistance - lower.root.sourceDistance;
    const amount =
      span <= 0
        ? 0
        : (sourceDistance - lower.root.sourceDistance) / span;
    return {
      schema: 'kaminos.creature-scale-locomotion-rail-sample.v0',
      railId: source.producer.railId,
      sourceDistance,
      progress:
        lower.root.routeProgress +
        (upper.root.routeProgress - lower.root.routeProgress) * amount,
      position: mixVec3(
        lower.root.worldPosition,
        upper.root.worldPosition,
        amount,
      ),
      tangent: normalize(
        mixVec3(lower.root.tangent, upper.root.tangent, amount),
      ),
      locomotionFrame: {
        forward: normalize(
          mixVec3(
            lower.root.locomotionFrame.forward,
            upper.root.locomotionFrame.forward,
            amount,
          ),
        ),
        right: normalize(
          mixVec3(
            lower.root.locomotionFrame.right,
            upper.root.locomotionFrame.right,
            amount,
          ),
        ),
        up: normalize(
          mixVec3(
            lower.root.locomotionFrame.up,
            upper.root.locomotionFrame.up,
            amount,
          ),
        ),
      },
      attention: {
        direction: normalize(
          mixVec3(
            lower.root.attention.direction,
            upper.root.attention.direction,
            amount,
          ),
        ),
        authority: lower.root.attention.authority,
      },
      support: {
        schema: 'kaminos.axial-terrain-support-envelope.v0',
        plannerDisposition:
          lower.root.support.disposition === 'local-support' &&
          upper.root.support.disposition === 'local-support'
            ? 'local-support'
            : 'reroute-required',
        rootLift:
          lower.root.support.rootLift +
          (upper.root.support.rootLift - lower.root.support.rootLift) *
            amount,
        compliance: {
          minimumNormalizedMargin:
            lower.root.support.minimumComplianceMargin +
            (upper.root.support.minimumComplianceMargin -
              lower.root.support.minimumComplianceMargin) *
              amount,
        },
      },
    };
  };
}

function mixVec3(
  left: readonly [number, number, number],
  right: readonly [number, number, number],
  amount: number,
): [number, number, number] {
  return [
    left[0] + (right[0] - left[0]) * amount,
    left[1] + (right[1] - left[1]) * amount,
    left[2] + (right[2] - left[2]) * amount,
  ];
}

function normalize(
  value: readonly [number, number, number],
): [number, number, number] {
  const length = Math.hypot(...value);
  return [
    value[0] / length,
    value[1] / length,
    value[2] / length,
  ];
}
