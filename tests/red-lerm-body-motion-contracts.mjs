import assert from 'node:assert/strict';

import {
  RED_LERM_BODY_MOTION_SCHEMA,
  buildRedLermBodyMotionWitness,
  resolveRedLermBodyMotionSource,
} from '../src/red-lerm-body-motion.ts';

assert.equal(
  RED_LERM_BODY_MOTION_SCHEMA,
  'lerms.red-lerm-body-motion.v0',
  'contract exposes the versioned red-lerm body/motion schema',
);

const witness = buildRedLermBodyMotionWitness({
  fixtureId: 'red-lerm-first-vertical-fixture',
  requestedMotionSource: {
    kind: 'fixture',
    id: 'red-lerm-state-spine-fixture-v0',
    route: 'tests/red-lerm-body-motion-contracts.mjs',
  },
});

assert.equal(witness.schema, RED_LERM_BODY_MOTION_SCHEMA);
assert.equal(witness.species, 'red-lerm');
assert.equal(witness.body.silhouetteId, 'red-lerm-springy-thief-v0');
assert.equal(witness.body.bodyIdentity, 'short-springy-overeager-red-lerm');
assert.equal(witness.sourceTruth.effectiveMotionSource.kind, 'fixture');
assert.equal(witness.sourceTruth.effectiveMotionSource.status, 'fixture');
assert.equal(witness.sourceTruth.fixtureId, 'red-lerm-first-vertical-fixture');
assert.equal(witness.sourceTruth.fallbackActive, false);
assert.ok(witness.sourceTruth.bodySource.id.includes('red-lerm'));
assert.ok(witness.sourceTruth.motionSourceTruthFields.includes('effectiveMotionSource.status'));

const requiredStateBuckets = [
  'approach-uphill',
  'steal-goin',
  'carry-goin',
  'flee-with-goin',
  'hit-reaction',
  'tumble-flail',
  'drop-goin',
  'reroute-loose-goin',
];

for (const bucket of requiredStateBuckets) {
  assert.equal(
    witness.stateBuckets[bucket],
    1,
    `witness includes exactly one ${bucket} sample in the fixture spine`,
  );
}

assert.equal(witness.samples.length, requiredStateBuckets.length);
assert.deepEqual(
  witness.samples.map((sample) => sample.stateBucket),
  requiredStateBuckets,
  'fixture timeline preserves the steal/carry/flee/drop/reroute spine order',
);

const approach = witness.samples[0];
assert.equal(approach.locomotion.kind, 'uphill-approach');
assert.equal(approach.terrainContact.kind, 'grounded');
assert.ok(approach.heading.uphillBias > 0.8);
assert.equal(approach.carryingGoin, false);

const carry = witness.samples.find((sample) => sample.stateBucket === 'carry-goin');
assert.ok(carry, 'carry sample exists');
assert.equal(carry.carryingGoin, true);
assert.equal(carry.goinInteraction.kind, 'carried');
assert.ok(carry.locomotion.speed > approach.locomotion.speed);

const hit = witness.samples.find((sample) => sample.stateBucket === 'hit-reaction');
assert.ok(hit, 'hit sample exists');
assert.equal(hit.hitReaction.kind, 'finger-juice-knockback');
assert.equal(hit.hitReaction.tumbleAffordance, 'armed');
assert.equal(hit.carryingGoin, true);

const tumble = witness.samples.find((sample) => sample.stateBucket === 'tumble-flail');
assert.ok(tumble, 'tumble sample exists');
assert.equal(tumble.hitReaction.kind, 'tumble-flail');
assert.ok(tumble.bodyPose.flailAmplitude > 0.75);

const drop = witness.samples.find((sample) => sample.stateBucket === 'drop-goin');
assert.ok(drop, 'drop sample exists');
assert.equal(drop.carryingGoin, false);
assert.equal(drop.goinInteraction.kind, 'dropped');
assert.equal(drop.rerouteIntent.kind, 'none');

const reroute = witness.samples.find((sample) => sample.stateBucket === 'reroute-loose-goin');
assert.ok(reroute, 'reroute sample exists');
assert.equal(reroute.rerouteIntent.kind, 'loose-goin-chase');
assert.ok(reroute.rerouteIntent.desire > 0.8);
assert.ok(reroute.heading.targetId?.includes('loose-goin'));

assert.deepEqual(witness.witnessFields.stateBuckets, requiredStateBuckets);
assert.deepEqual(witness.witnessFields.sourceTruth, [
  'bodySource.kind',
  'bodySource.status',
  'effectiveMotionSource.kind',
  'effectiveMotionSource.status',
  'fixtureId',
  'fallbackActive',
]);

const liveFallback = resolveRedLermBodyMotionSource({
  requestedMotionSource: {
    kind: 'live',
    id: 'missing-live-red-lerm-route',
    route: 'wilor-mlx/live-red-lerm-motion',
  },
  availableMotionSources: [],
  fixtureId: 'red-lerm-state-spine-fixture-v0',
});

assert.equal(liveFallback.requestedMotionSource.kind, 'live');
assert.equal(liveFallback.effectiveMotionSource.kind, 'fixture');
assert.equal(liveFallback.effectiveMotionSource.status, 'fallback');
assert.equal(liveFallback.fallbackActive, true);
assert.equal(
  liveFallback.fallbackReason,
  'requested-motion-source-unavailable',
  'fallbacks must name why live/generated/authored motion did not run',
);

console.log('red-lerm body/motion contract tests passed');
