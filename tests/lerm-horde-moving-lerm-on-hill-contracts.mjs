import assert from 'node:assert/strict';

import {
  buildRedLermBodyMotionWitness,
} from '../src/red-lerm-body-motion.ts';

assert.throws(
  () => buildRedLermBodyMotionWitness({
    requestedMotionSource: {
      kind: 'generated',
      id: 'producer-fitted-red-lerm-motion',
      route: 'kaminos/producer-fitted-motion',
    },
    availableMotionSources: [{
      kind: 'generated',
      id: 'producer-fitted-red-lerm-motion',
      route: 'kaminos/producer-fitted-motion',
    }],
  }),
  /generated motion requires caller-supplied body and motion evidence/,
  'a generated source label must not silently reuse the fixture body and samples',
);

const {
  LERM_HORDE_MOVING_LERM_HILL_REVISION,
  LERM_HORDE_MOVING_LERM_ON_HILL_SCHEMA,
  composeMovingLermOnHill,
} = await import('../src/lerm-horde-moving-lerm-on-hill.ts');

const sha = (digit) => digit.repeat(64);
const handle = ({
  schema,
  path,
  sha256,
  sourceRevision,
  requestedRoute,
  effectiveRoute = requestedRoute,
  backend,
  configId,
  fallbackStatus = 'none',
  staleStatus = 'fresh',
  partialStatus = 'complete',
}) => ({
  schema,
  path,
  sha256,
  sourceRevision,
  routeIdentity: {
    requestedRoute,
    effectiveRoute,
    backend,
    configId,
    fallbackStatus,
    staleStatus,
    partialStatus,
  },
});

const input = {
  schema: LERM_HORDE_MOVING_LERM_ON_HILL_SCHEMA,
  lermsRevision: LERM_HORDE_MOVING_LERM_HILL_REVISION,
  hill: {
    revision: LERM_HORDE_MOVING_LERM_HILL_REVISION,
    route: 'lerms/hill-of-hills/producer-history/operator-replay',
    authority: 'live_simulation',
    fallbackStatus: 'none',
    staleStatus: 'fresh',
    replaySchema: 'lerms.hill-of-hills-producer-history-operator-replay.v0',
  },
  identity: {
    actorId: 'red-lerm-moving-hill-001',
    assetIdentity: 'lerms.red-lerm-body.scene-local.candidate.v0',
    speciesIdentity: 'lerms.red-lerm.v0',
    bodySchemaIdentity: 'lerms.red-lerm-body-schema.v0',
    registrationId: 'red-lerm-moving-hill-registration-001',
  },
  body: {
    ...handle({
      schema: 'kaminos.motion-ready-creature-asset.v0',
      path: 'artifacts/motion-ready-red-lerm/creature.glb',
      sha256: sha('1'),
      sourceRevision: 'molten-body-revision',
      requestedRoute: 'kaminos/motion-ready-creature/body',
      backend: 'molten-body-producer',
      configId: 'red-lerm-body-config',
    }),
    representationKind: 'generated_mesh_imported',
    assetIdentity: 'lerms.red-lerm-body.scene-local.candidate.v0',
    registrationId: 'red-lerm-moving-hill-registration-001',
  },
  rig: {
    ...handle({
      schema: 'kaminos.fitted-proxy-rig.v0',
      path: 'artifacts/motion-ready-red-lerm/fitted-proxy-rig.json',
      sha256: sha('2'),
      sourceRevision: 'molten-rig-revision',
      requestedRoute: 'kaminos/fitted-proxy-rig',
      backend: 'molten-fitted-rig',
      configId: 'red-lerm-rig-config',
    }),
    assetIdentity: 'lerms.red-lerm-body.scene-local.candidate.v0',
    registrationId: 'red-lerm-moving-hill-registration-001',
  },
  support: {
    ...handle({
      schema: 'kaminos.motion-contact-constraints.v0',
      path: 'artifacts/motion-ready-red-lerm/motion-contact-constraints.json',
      sha256: sha('3'),
      sourceRevision: 'mushfinger-support-revision',
      requestedRoute: 'kaminos/motion-contact-constraints',
      backend: 'mushfinger-portable-support',
      configId: 'fd052b64-support-config',
    }),
    assetIdentity: 'lerms.red-lerm-body.scene-local.candidate.v0',
    registrationId: 'red-lerm-moving-hill-registration-001',
    hillRevision: LERM_HORDE_MOVING_LERM_HILL_REVISION,
  },
  motion: {
    ...handle({
      schema: 'kaminos.fitted-creature-motion.v0',
      path: 'artifacts/motion-ready-red-lerm/fitted-motion.json',
      sha256: sha('4'),
      sourceRevision: 'molten-motion-revision',
      requestedRoute: 'kaminos/fitted-creature-motion',
      backend: 'molten-fitted-motion',
      configId: 'red-lerm-motion-config',
    }),
    assetIdentity: 'lerms.red-lerm-body.scene-local.candidate.v0',
    registrationId: 'red-lerm-moving-hill-registration-001',
    samples: [
      {
        timestampMs: 0,
        poseSampleId: 'pose-000',
        poseFingerprint: 'pose-fingerprint-000',
        rootWorld: [-1.2, 0.62, -2.4],
        supportWorld: [-1.2, 0.5, -2.4],
        heading: [0.1, 0, 0.995],
        terrainNormal: [0, 1, 0],
        terrainSlope: 0.08,
        state: 'approaching_hoard',
      },
      {
        timestampMs: 160,
        poseSampleId: 'pose-160',
        poseFingerprint: 'pose-fingerprint-160',
        rootWorld: [-1.0, 0.68, -1.95],
        supportWorld: [-1.0, 0.54, -1.95],
        heading: [0.1, 0, 0.995],
        terrainNormal: [0, 1, 0],
        terrainSlope: 0.1,
        state: 'approaching_hoard',
      },
      {
        timestampMs: 320,
        poseSampleId: 'pose-320',
        poseFingerprint: 'pose-fingerprint-320',
        rootWorld: [-0.76, 0.75, -1.48],
        supportWorld: [-0.76, 0.58, -1.48],
        heading: [0.16, 0, 0.987],
        terrainNormal: [0, 1, 0],
        terrainSlope: 0.12,
        state: 'approaching_hoard',
      },
    ],
  },
  behavior: {
    route: 'lerms/horde/red-lerm/hill-traversal',
    backend: 'lerm-horde-behavior-spine',
    configId: 'red-lerm-hill-traversal-v0',
  },
};

const composition = composeMovingLermOnHill(input);

assert.equal(composition.schema, LERM_HORDE_MOVING_LERM_ON_HILL_SCHEMA);
assert.equal(composition.evidenceClass, 'producer_fitted_moving_lerm');
assert.equal(composition.identity.speciesIdentity, 'lerms.red-lerm.v0');
assert.equal(composition.timeline.length, 3);
assert.deepEqual(
  composition.timeline.map((frame) => frame.lerm.id),
  ['red-lerm-moving-hill-001', 'red-lerm-moving-hill-001', 'red-lerm-moving-hill-001'],
  'the moving witness is one actor across time, not one fixture actor per state bucket',
);
assert.deepEqual(
  composition.timeline.map((frame) => frame.lerm.world),
  input.motion.samples.map((sample) => sample.rootWorld),
);
assert.deepEqual(
  composition.timeline.map((frame) => frame.lerm.terrainContact.contactWorld),
  input.motion.samples.map((sample) => sample.supportWorld),
);
assert.ok(composition.assertions.dynamicRootMotion);
assert.ok(composition.assertions.dynamicPoseMotion);
assert.ok(composition.assertions.stableActorIdentity);
assert.ok(composition.assertions.exactLandedHill);
assert.ok(composition.assertions.routeIdentityPreserved);
assert.ok(composition.assertions.sourceIdentityPreserved);

assert.throws(
  () => composeMovingLermOnHill({
    ...input,
    identity: {
      ...input.identity,
      speciesIdentity: 'producer-control-non-lerm',
    },
  }),
  /species identity must be lerms\.red-lerm\.v0/,
);

assert.throws(
  () => composeMovingLermOnHill({
    ...input,
    hill: {
      ...input.hill,
      revision: '81c5348',
    },
  }),
  /Hill revision must be landed fd052b64/,
);

assert.throws(
  () => composeMovingLermOnHill({
    ...input,
    support: {
      ...input.support,
      registrationId: 'substituted-registration',
    },
  }),
  /registration identity mismatch/,
);

assert.throws(
  () => composeMovingLermOnHill({
    ...input,
    support: {
      ...input.support,
      routeIdentity: {
        ...input.support.routeIdentity,
        fallbackStatus: 'fallback',
      },
    },
  }),
  /support route is fallback/,
);

assert.throws(
  () => composeMovingLermOnHill({
    ...input,
    motion: {
      ...input.motion,
      samples: input.motion.samples.map((sample) => ({
        ...sample,
        rootWorld: input.motion.samples[0].rootWorld,
      })),
    },
  }),
  /motion samples do not move the body root/,
);

assert.throws(
  () => composeMovingLermOnHill({
    ...input,
    motion: {
      ...input.motion,
      samples: input.motion.samples.map((sample) => ({
        ...sample,
        poseFingerprint: 'same-pose',
      })),
    },
  }),
  /motion samples do not change body pose/,
);

console.log('lerm horde moving lerm on hill contracts ok');
