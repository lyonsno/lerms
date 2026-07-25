import {
  createHillOfHillsTerrain,
  defaultHillOfHillsParams,
} from '../src/terrain/hill-of-hills.js';
import {
  assertHillAnalyticImpactSupportQuery,
  createHillAnalyticImpactSupportQuery,
  HILL_ANALYTIC_IMPACT_SUPPORT_ROUTE,
  HILL_ANALYTIC_IMPACT_SUPPORT_SCHEMA,
} from '../src/terrain/hill-of-hills-analytic-impact-support.js';

const terrain = createHillOfHillsTerrain({ ...defaultHillOfHillsParams, topologyPhaseTimeMs: 5_252 }, {
  route: 'lerms/hill-of-hills/wet-border-phase-morph-recipe',
  frameId: 'hill-topology-contention-phase-boundary-main-3a06670-v1',
  configId: 'topology-contention-phase-boundary-v1',
  timestampMs: 100_104,
  sampleAgeMs: 0
});
const identity = {
  schema: HILL_ANALYTIC_IMPACT_SUPPORT_SCHEMA,
  sourceId: 'hill-topology-contention-phase-boundary-main-3a06670-v1',
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
const frame = { terrain, identity, worldTime: 100.104 };
const query = createHillAnalyticImpactSupportQuery(() => frame, frame);
assertHillAnalyticImpactSupportQuery(query);
const sample = query.sampleSignedDistance([0, terrain.samples[0].height + 1, 0], 100.104);
if (!Number.isFinite(sample.distance) || !sample.normal.every(Number.isFinite)) throw new Error('support sample is not finite');
if (!Number.isFinite(query.maximumSignedDistanceRate) || query.maximumSignedDistanceRate < 0) throw new Error('support rate is not honest');

let missingDigestRejected = false;
try {
  createHillAnalyticImpactSupportQuery(() => frame, { ...frame, identity: { ...identity, artifactSha256: 'missing' } });
} catch {
  missingDigestRejected = true;
}
if (!missingDigestRejected) throw new Error('missing support artifact digest was accepted');

let identityDriftRejected = false;
try {
  query.sampleSignedDistance([0, 1, 0], 101);
} catch {
  identityDriftRejected = true;
}
if (identityDriftRejected) throw new Error('stable frame query unexpectedly drifted');
console.log('hill analytic impact support contracts passed');
