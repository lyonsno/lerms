import {
  createHillOfHillsTerrain,
  defaultHillOfHillsParams,
} from '../src/terrain/hill-of-hills.js';
import {
  assertHillAnalyticImpactSupportQuery,
  createHillAnalyticImpactSupportQuery,
  HILL_ANALYTIC_IMPACT_SUPPORT_ROUTE,
  HILL_ANALYTIC_IMPACT_SUPPORT_SCHEMA,
  type HillAnalyticImpactSupportFrame,
  type HillAnalyticImpactSupportIdentity,
  type HillAnalyticImpactSupportQuery,
} from '../src/terrain/hill-of-hills-analytic-impact-support.js';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function expectReject(label: string, operation: () => unknown, messagePattern: RegExp): void {
  let error: unknown;
  try {
    operation();
  } catch (caught) {
    error = caught;
  }
  assert(error instanceof Error, `${label} did not reject`);
  assert(messagePattern.test(error.message), `${label} rejected for the wrong reason: ${error.message}`);
}

interface ExpectedCreateOptions {
  supportedWorldTime: Readonly<{ min: number; max: number }>;
  validationFrames: readonly HillAnalyticImpactSupportFrame[];
  maximumSpatialLipschitz?: number;
  maximumSignedDistanceRate?: number;
}

const createQuery = createHillAnalyticImpactSupportQuery as unknown as (
  frameAt: (worldTime: number) => HillAnalyticImpactSupportFrame,
  initialFrame: HillAnalyticImpactSupportFrame,
  options: ExpectedCreateOptions
) => HillAnalyticImpactSupportQuery;

function terrainAt(worldTime: number) {
  return createHillOfHillsTerrain(
    {
      ...defaultHillOfHillsParams,
      topologyPhaseIntensity: 1,
      topologyPhaseLimit: 4,
      topologyPhaseTimeMs: Math.round(worldTime * 1_000)
    },
    {
      route: 'lerms/hill-of-hills/analytic-impact-support-contract',
      frameId: `hill-analytic-impact-support-${worldTime.toFixed(3)}`,
      configId: 'hill-analytic-impact-support-contract-v1',
      timestampMs: Math.round(worldTime * 1_000),
      sampleAgeMs: 0
    }
  );
}

const identity: HillAnalyticImpactSupportIdentity = {
  schema: HILL_ANALYTIC_IMPACT_SUPPORT_SCHEMA,
  sourceId: 'hill-analytic-impact-support-moving-interval-v1',
  providerRoute: HILL_ANALYTIC_IMPACT_SUPPORT_ROUTE,
  artifactSha256: 'a'.repeat(64),
  terrainId: 'hill-of-hills',
  terrainGeneration: 1,
  transformEpoch: 1,
  topologyEpoch: 1,
  supportEpoch: 1,
  remapEpoch: 1,
  stale: false as const,
  fallbackRoute: null
};

const frameA = { terrain: terrainAt(100.104), identity, worldTime: 100.104 };
const frameB = { terrain: terrainAt(100.604), identity, worldTime: 100.604 };
const supportedWorldTime = { min: frameA.worldTime, max: frameB.worldTime };
const frameAt = (worldTime: number) => {
  if (Math.abs(worldTime - frameA.worldTime) < 1e-9) return frameA;
  if (Math.abs(worldTime - frameB.worldTime) < 1e-9) return frameB;
  return {
    terrain: terrainAt(worldTime),
    identity,
    worldTime
  };
};

const query = createQuery(frameAt, frameA, {
  supportedWorldTime,
  validationFrames: [frameA, frameB]
});
assertHillAnalyticImpactSupportQuery(query);

type ExactQueryContract = HillAnalyticImpactSupportQuery & {
  identity: HillAnalyticImpactSupportIdentity;
  maximumSpatialLipschitz: number;
  supportedWorldTime: Readonly<{ min: number; max: number }>;
};
const exactQuery = query as ExactQueryContract;
assert(exactQuery.identity !== undefined, 'query exposes one immutable exact identity');
assert(Object.isFrozen(exactQuery.identity), 'query identity is immutable');
assert(
  exactQuery.identity.artifactSha256 === identity.artifactSha256,
  'query identity preserves the exact artifact SHA-256'
);
assert(
  Number.isFinite(exactQuery.maximumSpatialLipschitz) && exactQuery.maximumSpatialLipschitz > 0,
  'query exposes a finite positive spatial Lipschitz bound'
);
assert(
  Number.isFinite(query.maximumSignedDistanceRate) && query.maximumSignedDistanceRate >= 0,
  'query exposes a finite non-negative Hill-only temporal bound'
);
assert(
  exactQuery.supportedWorldTime.min === supportedWorldTime.min &&
    exactQuery.supportedWorldTime.max === supportedWorldTime.max,
  'query preserves the exact supported world-time interval'
);

const sample = query.sampleSignedDistance(
  [0, frameA.terrain.samples[0].height + 1, 0],
  frameA.worldTime
);
assert(Number.isFinite(sample.distance), 'support distance is finite');
assert(sample.point.every(Number.isFinite), 'support point is finite');
assert(sample.normal.every(Number.isFinite), 'support normal is finite');
assert(Math.abs(Math.hypot(...sample.normal) - 1) < 1e-6, 'support normal is unit length');

expectReject(
  'missing artifact digest',
  () =>
    createQuery(frameAt, {
      ...frameA,
      identity: { ...identity, artifactSha256: 'missing' }
    }, {
      supportedWorldTime,
      validationFrames: [frameA, frameB]
    }),
  /artifact SHA-256/i
);

expectReject(
  'partial identity',
  () =>
    createQuery(frameAt, {
      ...frameA,
      identity: { ...identity, stale: undefined } as unknown as HillAnalyticImpactSupportIdentity
    }, {
      supportedWorldTime,
      validationFrames: [frameA, frameB]
    }),
  /identity.*stale|stale.*identity/i
);

expectReject(
  'fallback identity',
  () =>
    createQuery(frameAt, {
      ...frameA,
      identity: {
        ...identity,
        fallbackRoute: 'lerms/hill-of-hills/default'
      } as unknown as HillAnalyticImpactSupportIdentity
    }, {
      supportedWorldTime,
      validationFrames: [frameA, frameB]
    }),
  /fallback/i
);

expectReject(
  'unsupported time',
  () => query.sampleSignedDistance([0, 1, 0], supportedWorldTime.max + 0.001),
  /unsupported world time/i
);

const driftQuery = createQuery(
  (worldTime) =>
    worldTime === frameB.worldTime
      ? {
          ...frameB,
          identity: { ...identity, supportEpoch: identity.supportEpoch + 2 }
        }
      : frameA,
  frameA,
  {
    supportedWorldTime,
    validationFrames: [frameA, frameB]
  }
);
expectReject(
  'skipped support epoch',
  () => driftQuery.sampleSignedDistance([0, 1, 0], frameB.worldTime),
  /identity changed|epoch/i
);

const substitutedFrameQuery = createQuery(
  () => frameA,
  frameA,
  {
    supportedWorldTime,
    validationFrames: [frameA, frameB]
  }
);
expectReject(
  'stale default frame substitution',
  () => substitutedFrameQuery.sampleSignedDistance([0, 1, 0], frameB.worldTime),
  /requested world time/i
);

expectReject(
  'understated spatial bound',
  () =>
    createQuery(frameAt, frameA, {
      supportedWorldTime,
      validationFrames: [frameA, frameB],
      maximumSpatialLipschitz: 0.5
    }),
  /spatial Lipschitz.*understate/i
);

expectReject(
  'understated temporal bound',
  () =>
    createQuery(frameAt, frameA, {
      supportedWorldTime,
      validationFrames: [frameA, frameB],
      maximumSignedDistanceRate: 0
    }),
  /temporal.*understate|signed-distance rate.*understate/i
);

const staticTerrain = createHillOfHillsTerrain(defaultHillOfHillsParams, {
  route: 'lerms/hill-of-hills/analytic-impact-support-static-contract',
  frameId: 'hill-analytic-impact-support-static',
  configId: 'hill-analytic-impact-support-static-v1',
  timestampMs: 20_000,
  sampleAgeMs: 0
});
const staticIdentity = { ...identity, sourceId: 'hill-static-support-v1', supportEpoch: 2 };
const staticFrame = { terrain: staticTerrain, identity: staticIdentity, worldTime: 20 };
const staticQuery = createQuery(() => staticFrame, staticFrame, {
  supportedWorldTime: { min: 20, max: 20 },
  validationFrames: [staticFrame],
  maximumSignedDistanceRate: 0
});
assert(staticQuery.maximumSignedDistanceRate === 0, 'static support lawfully publishes temporal rate zero');

console.log('hill analytic impact support contracts passed');
