import {
  assertFirstVerticalFrame,
  summarizeFirstVerticalFrame,
  type FirstVerticalFrame
} from '../src/contracts/first-vertical.ts';
import type { HillOfHillsTerrain, HillOfHillsTerrainSample } from '../src/terrain/hill-of-hills.ts';
import { buildRedLermBodyMotionWitness } from '../src/red-lerm-body-motion.ts';
import { composeFirstVerticalFrame } from '../src/contracts/first-vertical-composer.ts';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function assertThrows(fn: () => void, expectedMessage: string): void {
  try {
    fn();
  } catch (error) {
    assert(error instanceof Error, 'expected thrown error to be Error');
    assert(
      error.message.includes(expectedMessage),
      `expected "${error.message}" to include "${expectedMessage}"`
    );
    return;
  }
  throw new Error(`expected function to throw ${expectedMessage}`);
}

const terrainSource = {
  schema: 'lerms.source-truth.v0' as const,
  authority: 'live_simulation' as const,
  route: 'composer-test/terrain',
  frameId: 'composer-terrain-frame-001',
  timestampMs: 1000,
  sampleAgeMs: 8,
  backend: 'composer-terrain-fixture',
  configId: 'composer-terrain-fixture-v0'
};

const terrainSample: HillOfHillsTerrainSample = {
  schema: 'lerms.terrain-sample.v0',
  id: 'terrain-crown-fixture',
  source: terrainSource,
  world: [0, 1.8, 3.4],
  normal: [0, 1, 0],
  height: 1.8,
  slope: 0.05,
  region: 'crown',
  topology: {
    flowDirection: [0, 0.28, 1],
    flowAccumulation: 0.42,
    ridgeStrength: 0.5,
    valleyStrength: 0.1,
    routePressure: 0.72,
    ditchPotential: 0.08,
    growthPotential: 0.36
  },
  proxyMaterial: {
    kind: 'crown-warmth',
    color: [205, 165, 72],
    wetness: 0.18,
    growthTint: 0.26,
    blends: {
      'crown-warmth': 0.72,
      'approach-clay': 0.2,
      'growth-lip': 0.08
    }
  },
  phaseInfluence: {
    kind: 'none',
    amount: 0,
    trailAmount: 0,
    sideDitchAmount: 0
  }
};

const terrain: HillOfHillsTerrain = {
  source: terrainSource,
  params: {
    seed: 1,
    width: 10,
    length: 12,
    channelRadius: 4,
    channelCurvature: 1,
    wallHeight: 2,
    floorWidth: 3,
    hillRadius: 1,
    hillCount: 1,
    hillHeight: 1,
    hillVariance: 0.3,
    valleyRadius: 1,
    valleyCount: 1,
    valleyHeight: 0.8,
    valleyVariance: 0.3,
    distanceScale: 1,
    worldScale: 1,
    featureSpacing: 1,
    textureScale: 1,
    textureDamping: 0.5,
    detailDamping: 0.5,
    ditchPhaseSeed: 7301,
    ditchPhaseIntensity: 0,
    ditchPhaseLimit: 0,
    ditchPhaseRadius: 1.25,
    ditchPhaseTimeMs: 0,
    ditchPhaseDurationMs: 1800,
    trailPhaseSeed: 9109,
    trailPhaseIntensity: 0,
    trailPhaseLimit: 0,
    trailPhaseRadius: 1.4,
    trailPhaseTimeMs: 0,
    trailPhaseDurationMs: 1900,
    gridResolutionX: 1,
    gridResolutionZ: 1,
    crownZ: 3.4
  },
  phaseState: {
    mode: 'stable',
    terrainEpoch: 0,
    activeEpisodes: [],
    checksum: 'composer-stable-phase-fixture-checksum',
    phaseClock: 0,
    phaseProgress: 0,
    ditchPhaseClock: 0,
    ditchPhaseProgress: 0,
    trailPhaseClock: 0,
    trailPhaseProgress: 0,
    trailSeedMethod: 'none',
    trailCandidateChecksum: 'none',
    trailCandidateScoreRange: { min: 0, max: 0 },
    selectedTrailScoreRange: { min: 0, max: 0 }
  },
  samples: [terrainSample],
  witness: {
    schema: 'lerms.hill-of-hills-witness.v0',
    source: terrainSource,
    sourceAuthority: 'live_simulation',
    route: 'composer-test/terrain',
    fallbackStatus: 'none',
    effectiveParams: {
      seed: 1,
      width: 10,
      length: 12,
      channelRadius: 4,
      channelCurvature: 1,
      wallHeight: 2,
      floorWidth: 3,
      hillRadius: 1,
      hillCount: 1,
      hillHeight: 1,
      hillVariance: 0.3,
      valleyRadius: 1,
      valleyCount: 1,
      valleyHeight: 0.8,
      valleyVariance: 0.3,
      distanceScale: 1,
      worldScale: 1,
      featureSpacing: 1,
      textureScale: 1,
      textureDamping: 0.5,
      detailDamping: 0.5,
      ditchPhaseSeed: 7301,
      ditchPhaseIntensity: 0,
      ditchPhaseLimit: 0,
      ditchPhaseRadius: 1.25,
      ditchPhaseTimeMs: 0,
      ditchPhaseDurationMs: 1800,
      trailPhaseSeed: 9109,
      trailPhaseIntensity: 0,
      trailPhaseLimit: 0,
      trailPhaseRadius: 1.4,
      trailPhaseTimeMs: 0,
      trailPhaseDurationMs: 1900,
      gridResolutionX: 1,
      gridResolutionZ: 1,
      crownZ: 3.4
    },
    gridResolution: { x: 1, z: 1 },
    sampleSpacing: { x: 0, z: 0 },
    sampleCount: 1,
    sampleChecksum: 'composer-terrain-fixture-checksum',
    heightRange: { min: 1.8, max: 1.8 },
    regionCounts: { crown: 1 },
    topologyChecksum: 'composer-terrain-topology-fixture-checksum',
    proxyMaterialChecksum: 'composer-terrain-material-fixture-checksum',
    phaseMode: 'stable',
    terrainEpoch: 0,
    activePhaseCount: 0,
    activePhaseKinds: {},
    phaseClock: 0,
    phaseProgress: 0,
    ditchPhaseClock: 0,
    ditchPhaseProgress: 0,
    trailPhaseClock: 0,
    trailPhaseProgress: 0,
    phaseChecksum: 'composer-stable-phase-fixture-checksum',
    phaseInfluenceChecksum: 'composer-stable-phase-influence-fixture-checksum',
    phaseInfluenceRange: { min: 0, max: 0 },
    trailInfluenceRange: { min: 0, max: 0 },
    sideDitchInfluenceRange: { min: 0, max: 0 },
    phaseInfluenceKinds: { none: 1 },
    trailSeedMethod: 'none',
    trailCandidateChecksum: 'none',
    trailCandidateScoreRange: { min: 0, max: 0 },
    selectedTrailScoreRange: { min: 0, max: 0 },
    topologyRanges: {
      flowAccumulation: { min: 0.42, max: 0.42 },
      ridgeStrength: { min: 0.5, max: 0.5 },
      valleyStrength: { min: 0.1, max: 0.1 },
      routePressure: { min: 0.72, max: 0.72 },
      ditchPotential: { min: 0.08, max: 0.08 },
      growthPotential: { min: 0.36, max: 0.36 }
    },
    proxyMaterialCounts: { 'crown-warmth': 1 }
  }
};

const redLermWitness = buildRedLermBodyMotionWitness();

const frame = composeFirstVerticalFrame({
  frameId: 'composer-frame-001',
  timestampMs: 1100,
  terrain,
  sources: [redLermWitness.firstVerticalFrame]
});

assertFirstVerticalFrame(frame);

const summary = summarizeFirstVerticalFrame(frame);
assert(frame.source.route === 'first-vertical-composer', 'composer owns frame source route');
assert(frame.source.authority === 'synthetic_fixture', 'synthetic red-lerm source downgrades composed authority');
assert(
  frame.terrainSamples.some((sample) => sample.id === terrainSample.id),
  'terrain socket sample survives composition'
);
assert(summary.lermCount >= 1, 'red lerms come from red-lerm branch');
assert(summary.goinCount >= 1, 'goins come from red-lerm branch');
assert(summary.carrierDropCount >= 1, 'carrier-drop event comes from red-lerm branch');
assert(summary.juiceHitCount >= 1, 'juice-hit event comes from red-lerm branch');
assert(summary.lermStateCounts.fleeing_with_goin === 1, 'state buckets survive composition');
assert(summary.goinStateCounts.dropped === 1, 'dropped goin survives composition');

const duplicateLermSource: FirstVerticalFrame = {
  ...redLermWitness.firstVerticalFrame,
  source: {
    ...redLermWitness.firstVerticalFrame.source,
    frameId: 'duplicate-source'
  },
  lerms: [
    ...redLermWitness.firstVerticalFrame.lerms,
    {
      ...redLermWitness.firstVerticalFrame.lerms[0],
      world: [9, 9, 9]
    }
  ]
};

assertThrows(
  () =>
    composeFirstVerticalFrame({
      frameId: 'composer-frame-duplicate-lerm',
      timestampMs: 1200,
      terrain,
      sources: [duplicateLermSource]
    }),
  'duplicate lerm id'
);

assertThrows(
  () =>
    composeFirstVerticalFrame({
      frameId: 'composer-frame-stale',
      timestampMs: 1200,
      terrain,
      maxSampleAgeMs: 100,
      sources: [
        {
          ...redLermWitness.firstVerticalFrame,
          source: {
            ...redLermWitness.firstVerticalFrame.source,
            sampleAgeMs: 250
          }
        }
      ]
    }),
  'stale source'
);

console.log('first vertical composer contracts ok');
