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
    assetIdentity: 'lerms.red-lerm-body.procedural-squash-thief.v0',
    speciesIdentity: 'lerms.red-lerm.v0',
    bodySchemaIdentity: 'lerms.red-lerm-body-schema.v0',
  },
  driver: {
    assetIdentity: 'motion-ready-719024:axial-footprint',
    role: 'producer-control-non-lerm',
    registrationId: 'motion-ready-719024-registration',
  },
  body: {
    ...handle({
      schema: 'lerms.red-lerm-procedural-body.v0',
      path: 'src/red-lerm-visual-witness.ts',
      sha256: sha('1'),
      sourceRevision: LERM_HORDE_MOVING_LERM_HILL_REVISION,
      requestedRoute: 'lerms/red-lerm-body/procedural-squash-thief-v0',
      backend: 'lerm-horde-authored-procedural-body',
      configId: 'procedural-squash-thief-v0',
    }),
    representationKind: 'authored_procedural',
    assetIdentity: 'lerms.red-lerm-body.procedural-squash-thief.v0',
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
    assetIdentity: 'motion-ready-719024:axial-footprint',
    registrationId: 'motion-ready-719024-registration',
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
    assetIdentity: 'motion-ready-719024:axial-footprint',
    registrationId: 'motion-ready-719024-registration',
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
    assetIdentity: 'motion-ready-719024:axial-footprint',
    registrationId: 'motion-ready-719024-registration',
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
assert.equal(
  composition.evidenceClass,
  'caller_supplied_moving_lerm_composition',
  'a manifest-only adapter must not claim it verified producer files',
);
assert.equal(composition.sourceVerification, 'declared_unverified');
assert.equal(composition.identity.speciesIdentity, 'lerms.red-lerm.v0');
assert.equal(composition.sources.body.assetIdentity, input.identity.assetIdentity);
assert.equal(composition.driver.role, 'producer-control-non-lerm');
assert.equal(composition.driver.assetIdentity, input.driver.assetIdentity);
assert.notEqual(composition.identity.assetIdentity, composition.driver.assetIdentity);
assert.equal(composition.sources.rig.assetIdentity, input.driver.assetIdentity);
assert.equal(composition.sources.rig.registrationId, input.driver.registrationId);
assert.equal(composition.sources.support.hillRevision, LERM_HORDE_MOVING_LERM_HILL_REVISION);
assert.equal(composition.sources.motion.assetIdentity, input.driver.assetIdentity);
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
  composition.timeline.map((frame) => frame.supportWorld),
  input.motion.samples.map((sample) => sample.supportWorld),
  'caller-declared support samples remain available without becoming grounded Hill evidence',
);
assert.ok(composition.assertions.dynamicRootMotion);
assert.ok(composition.assertions.declaredPoseVariation);
assert.equal(
  composition.assertions.dynamicPoseMotion,
  undefined,
  'opaque pose fingerprint labels must not claim verified body articulation',
);
assert.ok(composition.assertions.stableActorIdentity);
assert.ok(composition.assertions.exactLandedHill);
assert.ok(composition.assertions.routeIdentityPreserved);
assert.ok(composition.assertions.sourceIdentityDeclared);
assert.ok(composition.assertions.rootSupportSamplesDeclared);
assert.ok(composition.assertions.visibleBodyDriverSeparated);
assert.ok(composition.assertions.declaredLermIdentity);
assert.equal(
  composition.assertions.actualLermIdentity,
  undefined,
  'caller declarations must not claim verified actual Lerm identity',
);
assert.equal(
  composition.assertions.sourceIdentityPreserved,
  undefined,
  'the manifest cannot claim file identity verification without reading the files',
);

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
    driver: {
      ...input.driver,
      assetIdentity: input.identity.assetIdentity,
    },
    rig: {
      ...input.rig,
      assetIdentity: input.identity.assetIdentity,
    },
    support: {
      ...input.support,
      assetIdentity: input.identity.assetIdentity,
    },
    motion: {
      ...input.motion,
      assetIdentity: input.identity.assetIdentity,
    },
  }),
  /visible Lerm body and non-Lerm driver identities must differ/,
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

const adversarialSupport = composeMovingLermOnHill({
  ...input,
  motion: {
    ...input.motion,
    samples: input.motion.samples.map((sample, index) => ({
      ...sample,
      supportWorld: index === 0 ? [999, -999, 999] : sample.supportWorld,
    })),
  },
});
assert.equal(
  adversarialSupport.timeline[0].firstVerticalFrame.terrainSamples[0].source.authority,
  'visual_only',
  'motion-carried support coordinates are not live Hill evidence',
);
assert.equal(
  adversarialSupport.timeline[0].lerm.terrainContact.grounded,
  false,
  'uncorroborated motion-carried support cannot assert grounded contact',
);

assert.throws(
  () => composeMovingLermOnHill({
    ...input,
    motion: {
      ...input.motion,
      samples: input.motion.samples.map((sample) => ({
        ...sample,
        state: 'not_a_lerm_state',
      })),
    },
  }),
  /lerms\[0\]\.state must be a known Lerm state; got not_a_lerm_state/,
);

assert.throws(
  () => composeMovingLermOnHill({
    ...input,
    identity: {
      ...input.identity,
      assetIdentity: 'generated.arbitrary-body.v0',
      bodySchemaIdentity: 'unrelated-schema',
    },
    body: {
      ...input.body,
      schema: 'anything.nonempty',
      representationKind: 'generated_mesh_imported',
      assetIdentity: 'generated.arbitrary-body.v0',
    },
  }),
  /body schema must be lerms\.red-lerm-procedural-body\.v0/,
);

console.log('lerm horde moving lerm on hill contracts ok');
