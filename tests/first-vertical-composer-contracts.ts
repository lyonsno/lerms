import {
  assertFirstVerticalFrame,
  summarizeFirstVerticalFrame,
  type FirstVerticalFrame
} from '../src/contracts/first-vertical.ts';
import {
  HILL_OF_HILLS_PRESSURE_FIELD_KINDS,
  HILL_OF_HILLS_TOPOLOGY_EVENT_KINDS,
  defaultHillOfHillsParams,
  type HillOfHillsPressureFieldComfortBand,
  type HillOfHillsPressureFieldKind,
  type HillOfHillsPressureFieldSample,
  type HillOfHillsTerrain,
  type HillOfHillsTerrainSample
} from '../src/terrain/hill-of-hills.ts';
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

const terrainFixturePressure: HillOfHillsPressureFieldSample = {
  slope: 0.05,
  curvature: 0,
  ridge: 0.5,
  valley: 0.1,
  saddle: 0,
  basin: 0.1,
  exposure: 0.95,
  route: 0.72,
  erosion: 0.15,
  bloom: 0.36,
  strata: 0.05,
  vegetation: 0.36
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
  pressure: terrainFixturePressure,
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
    sideDitchAmount: 0,
    topologyAmount: 0,
    topologyHeightDelta: 0
  },
  support: {
    supportClass: 'single_valued_heightfield',
    mappingMode: 'static_domain_to_world',
    domain: { u: 0.5, v: 0.7833333333333333 },
    domainIndex: { x: 0, z: 0 },
    previousHeight: 1.8,
    heightDelta: 0,
    surfaceVelocity: [0, 0, 0],
    motionClass: 'stable',
    shock: 'none'
  },
  surfaceDetail: {
    kind: 'none',
    density: 0,
    edgeMix: 0,
    seed: 0
  },
  materialEdge: {
    kind: 'none',
    anchor: 'none',
    strength: 0,
    dissolve: 0,
    seed: 0
  }
};

const terrain: HillOfHillsTerrain = {
  source: terrainSource,
  params: {
    ...defaultHillOfHillsParams,
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
    topologyPhaseSeed: 12203,
    topologyPhaseIntensity: 0,
    topologyPhaseLimit: 0,
    topologyPhaseRadius: 1.45,
    topologyPhaseHeightScale: 1,
    topologyPhaseBasinBias: 1,
    topologyPhaseHillBias: 1,
    topologyPhaseSaddleBias: 1,
    topologyPhaseTimeMs: 0,
    topologyPhaseDurationMs: 1800,
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
    topologyPhaseClock: 0,
    topologyPhaseProgress: 0,
    trailSeedMethod: 'none',
    trailCandidateChecksum: 'none',
    trailCandidateScoreRange: { min: 0, max: 0 },
    selectedTrailScoreRange: { min: 0, max: 0 },
    topologyEventCandidateChecksum: 'none',
    topologyEventCandidateScoreRange: { min: 0, max: 0 },
    selectedTopologyEventScoreRange: { min: 0, max: 0 }
  },
  samples: [terrainSample],
  witness: {
    schema: 'lerms.hill-of-hills-witness.v0',
    source: terrainSource,
    sourceAuthority: 'live_simulation',
    route: 'composer-test/terrain',
    fallbackStatus: 'none',
    effectiveParams: {
      ...defaultHillOfHillsParams,
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
      topologyPhaseSeed: 12203,
      topologyPhaseIntensity: 0,
      topologyPhaseLimit: 0,
      topologyPhaseRadius: 1.45,
      topologyPhaseHeightScale: 1,
      topologyPhaseBasinBias: 1,
      topologyPhaseHillBias: 1,
      topologyPhaseSaddleBias: 1,
      topologyPhaseTimeMs: 0,
      topologyPhaseDurationMs: 1800,
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
    featureChecksum: 'composer-terrain-feature-fixture-checksum',
    heightfieldMode: 'grid_heightfield',
    heightfieldChecksum: 'composer-terrain-heightfield-fixture-checksum',
    cacheMode: 'uncached_full_grid',
    cacheGeneration: 0,
    cacheStableLayerChecksum: 'composer-terrain-stable-layer-fixture-checksum',
    cacheStableLayerInvalidated: false,
    cacheInvalidated: false,
    cacheReusedSampleCount: 0,
    cacheRecomputedSampleCount: 1,
    recomputeMode: 'full_grid_with_dirty_tiles',
    recomputeTileSize: { x: 4, z: 4 },
    recomputeTileCount: 1,
    dirtyTileCount: 0,
    dirtySampleCount: 0,
    dirtyLayerKinds: [],
    dirtyRegionChecksum: 'none',
    dirtyHaloSamples: 1,
    supportFrame: {
      supportClass: 'single_valued_heightfield',
      mappingMode: 'static_domain_to_world',
      domainBounds: {
        u: { min: 0, max: 1 },
        v: { min: 0, max: 1 }
      },
      worldBounds: {
        x: { min: -5, max: 5 },
        z: { min: -6, max: 6 }
      },
      supportEpoch: 0,
      topologyEpoch: 0,
      substrateTileSize: { x: 4, z: 4 },
      substrateTileCount: 1,
      dirtySubstrateTileCount: 0,
      dirtySubstrateSampleCount: 0,
      dirtySubstrateRegionChecksum: 'none',
      minSupportWavelength: 0,
      maxHeightDelta: 0,
      maxSurfaceSpeed: 0,
      supportFrameChecksum: 'composer-terrain-support-frame-fixture-checksum',
      motionClassCounts: { stable: 1 },
      shockClassCounts: { none: 1 }
    },
    topologyChecksum: 'composer-terrain-topology-fixture-checksum',
    proxyMaterialChecksum: 'composer-terrain-material-fixture-checksum',
    surfaceDetailChecksum: 'composer-terrain-surface-detail-fixture-checksum',
    materialEdgeChecksum: 'composer-terrain-material-edge-fixture-checksum',
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
    topologyPhaseClock: 0,
    topologyPhaseProgress: 0,
    phaseChecksum: 'composer-stable-phase-fixture-checksum',
    phaseInfluenceChecksum: 'composer-stable-phase-influence-fixture-checksum',
    phaseInfluenceRange: { min: 0, max: 0 },
    trailInfluenceRange: { min: 0, max: 0 },
    sideDitchInfluenceRange: { min: 0, max: 0 },
    topologyInfluenceRange: { min: 0, max: 0 },
    phaseInfluenceKinds: { none: 1 },
    trailSeedMethod: 'none',
    trailCandidateChecksum: 'none',
    trailCandidateScoreRange: { min: 0, max: 0 },
    selectedTrailScoreRange: { min: 0, max: 0 },
    topologyEventVocabulary: HILL_OF_HILLS_TOPOLOGY_EVENT_KINDS,
    topologyEventCandidateChecksum: 'none',
    topologyEventCandidateScoreRange: { min: 0, max: 0 },
    selectedTopologyEventScoreRange: { min: 0, max: 0 },
    topologyEventDebug: [],
    topologyRanges: {
      flowAccumulation: { min: 0.42, max: 0.42 },
      ridgeStrength: { min: 0.5, max: 0.5 },
      valleyStrength: { min: 0.1, max: 0.1 },
      routePressure: { min: 0.72, max: 0.72 },
      ditchPotential: { min: 0.08, max: 0.08 },
      growthPotential: { min: 0.36, max: 0.36 }
    },
    pressureFieldVocabulary: HILL_OF_HILLS_PRESSURE_FIELD_KINDS,
    pressureFieldChecksum: 'composer-terrain-pressure-fixture-checksum',
    pressureFieldRanges: buildFixturePressureRanges(),
    pressureFieldComfort: buildFixturePressureComfort(),
    proxyMaterialCounts: { 'crown-warmth': 1 },
    surfaceDetailCounts: { none: 1 },
    materialEdgeCounts: { none: 1 },
    surfaceAnchorCounts: { none: 1 }
  }
};

function buildFixturePressureRanges(): Record<HillOfHillsPressureFieldKind, { min: number; max: number }> {
  return Object.fromEntries(
    HILL_OF_HILLS_PRESSURE_FIELD_KINDS.map((kind) => [
      kind,
      {
        min: terrainFixturePressure[kind],
        max: terrainFixturePressure[kind]
      }
    ])
  ) as Record<HillOfHillsPressureFieldKind, { min: number; max: number }>;
}

function buildFixturePressureComfort(): Record<
  HillOfHillsPressureFieldKind,
  HillOfHillsPressureFieldComfortBand
> {
  return Object.fromEntries(
    HILL_OF_HILLS_PRESSURE_FIELD_KINDS.map((kind) => [
      kind,
      {
        target: { min: 0, max: 1 },
        below: 0,
        inside: 1,
        above: 0,
        maxViolation: 0
      }
    ])
  ) as Record<HillOfHillsPressureFieldKind, HillOfHillsPressureFieldComfortBand>;
}

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
