import { assertFirstVerticalFrame } from '../src/contracts/first-vertical.js';
import {
  createHillOfHillsLayerTileCache,
  createHillOfHillsFrame,
  createHillOfHillsTerrain,
  createHillOfHillsTerrainWithCache,
  defaultHillOfHillsParams,
  HILL_OF_HILLS_TOPOLOGY_EVENT_KINDS,
  sampleHillOfHillsTerrain,
  type HillOfHillsTerrainParams
} from '../src/terrain/hill-of-hills.js';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function closeEnough(actual: number, expected: number, epsilon: number, message: string): void {
  assert(Math.abs(actual - expected) <= epsilon, `${message}: expected ${expected}, got ${actual}`);
}

function assertUnit(value: number, message: string): void {
  assert(Number.isFinite(value), `${message} is finite`);
  assert(value >= 0 && value <= 1, `${message} is normalized`);
}

function maxAbsSupportDelta(samples: readonly { support: { heightDelta: number } }[]): number {
  return samples.reduce((maxDelta, terrainSample) => Math.max(maxDelta, Math.abs(terrainSample.support.heightDelta)), 0);
}

function sample(params: Partial<HillOfHillsTerrainParams>, x: number, z: number) {
  return sampleHillOfHillsTerrain(createHillOfHillsTerrain(params), x, z);
}

const baseline = createHillOfHillsTerrain({
  seed: 90210,
  gridResolutionX: 42,
  gridResolutionZ: 58
});

const center = sampleHillOfHillsTerrain(baseline, 0, 0);
const leftFloor = sampleHillOfHillsTerrain(baseline, -baseline.params.floorWidth * 0.42, 0);
const rightFloor = sampleHillOfHillsTerrain(baseline, baseline.params.floorWidth * 0.42, 0);

assert(center.schema === 'lerms.terrain-sample.v0', 'terrain sample emits first-vertical terrain schema');
assert(center.source.schema === 'lerms.source-truth.v0', 'terrain sample carries source truth');
assert(center.source.authority === 'live_simulation', 'terrain source authority is live simulation by default');
assert(center.source.route === 'hill-of-hills-terrain', 'terrain source route identifies Hill of Hills substrate');
assert(center.height > Math.min(leftFloor.height, rightFloor.height) - 0.08, 'center floor does not collapse into a divot');
assert(center.region === 'approach', 'center floor remains an approach lane');
closeEnough(center.normal[1], 1, 0.25, 'center floor normal stays traversable');

const centerTopology = (center as any).topology;
assert(centerTopology, 'terrain sample exposes topology fields for shader/route consumers');
assertUnit(centerTopology.routePressure, 'center route pressure');
assertUnit(centerTopology.flowAccumulation, 'center flow accumulation');
assertUnit(centerTopology.ridgeStrength, 'center ridge strength');
assertUnit(centerTopology.valleyStrength, 'center valley strength');
assertUnit(centerTopology.ditchPotential, 'center ditch potential');
assertUnit(centerTopology.growthPotential, 'center growth potential');
assert(Array.isArray(centerTopology.flowDirection) && centerTopology.flowDirection.length === 3, 'flow direction is Vec3');
assert(centerTopology.routePressure > 0.45, 'center approach lane advertises route pressure');

const centerMaterial = (center as any).proxyMaterial;
assert(centerMaterial, 'terrain sample exposes proxy material for visible topology shaders');
assert(typeof centerMaterial.kind === 'string' && centerMaterial.kind.length > 0, 'proxy material kind is named');
assert(Array.isArray(centerMaterial.color) && centerMaterial.color.length === 3, 'proxy material color is rgb Vec3');
assertUnit(centerMaterial.wetness, 'proxy material wetness');
assertUnit(centerMaterial.growthTint, 'proxy material growth tint');
assert(centerMaterial.blends, 'proxy material exposes blend weights');
for (const [kind, weight] of Object.entries(centerMaterial.blends)) {
  assert(typeof kind === 'string' && kind.length > 0, 'blend kind is named');
  assertUnit(weight as number, `blend weight ${kind}`);
}

const centerPhase = (center as any).phaseInfluence;
assert(centerPhase, 'terrain sample exposes phase influence for terrain decisions');
assert(centerPhase.kind === 'none', 'default center sample has no active phase influence');
assert(centerPhase.amount === 0, 'default center phase influence is zero');
assert(centerPhase.trailAmount === 0, 'default center trail phase influence is zero');
assert(centerPhase.sideDitchAmount === 0, 'default center side-ditch phase influence is zero');

const centerDetail = (center as any).surfaceDetail;
assert(centerDetail, 'terrain sample exposes deterministic surface detail for procedural ornament');
assert(typeof centerDetail.kind === 'string' && centerDetail.kind.length > 0, 'surface detail kind is named');
assertUnit(centerDetail.density, 'surface detail density');
assertUnit(centerDetail.edgeMix, 'surface detail edge mix');
assert(typeof centerDetail.seed === 'number' && Number.isInteger(centerDetail.seed), 'surface detail seed is deterministic integer');

const centerEdge = (center as any).materialEdge;
assert(centerEdge, 'terrain sample exposes material edge dissolve for procedural asset affordances');
assert(typeof centerEdge.kind === 'string' && centerEdge.kind.length > 0, 'material edge kind is named');
assert(typeof centerEdge.anchor === 'string' && centerEdge.anchor.length > 0, 'material edge anchor is named');
assertUnit(centerEdge.strength, 'material edge strength');
assertUnit(centerEdge.dissolve, 'material edge dissolve');
assert(typeof centerEdge.seed === 'number' && Number.isInteger(centerEdge.seed), 'material edge seed is deterministic integer');

const pushed = createHillOfHillsTerrain({
  channelRadius: 4.2,
  channelCurvature: 1.8,
  wallHeight: 4.4,
  floorWidth: 3.2,
  hillRadius: 1.1,
  hillCount: 22,
  hillHeight: 1.45,
  hillVariance: 0.95,
  valleyRadius: 1.25,
  valleyCount: 20,
  valleyHeight: 1.05,
  valleyVariance: 0.9,
  distanceScale: 1.65,
  worldScale: 1.18,
  featureSpacing: 0.72,
  textureScale: 1.9,
  textureDamping: 0.28,
  detailDamping: 0.24,
  gridResolutionX: 48,
  gridResolutionZ: 64,
  seed: 1776
});

for (const x of [-1.25, -0.6, 0, 0.6, 1.25]) {
  const floorSample = sampleHillOfHillsTerrain(pushed, x, -1.5);
  assert(Number.isFinite(floorSample.height), 'pushed floor sample stays finite');
  assert(floorSample.height > -0.45, 'pushed params do not crush the travel floor below traversable height');
  assert(floorSample.region !== 'rim' && floorSample.region !== 'gutter', 'pushed params keep center floor out of wall regions');
}

const regions = new Set(baseline.samples.map((terrainSample) => terrainSample.region));
for (const region of ['approach', 'slope', 'basin', 'rim', 'crown'] as const) {
  assert(regions.has(region), `terrain grid classifies ${region} samples`);
}

const ordinaryBasinTerrain = createHillOfHillsTerrain({
  seed: 5150,
  gridResolutionX: 56,
  gridResolutionZ: 72,
  hillCount: 18,
  valleyCount: 28,
  valleyRadius: 1.55,
  valleyHeight: 1.2,
  ditchPhaseIntensity: 0,
  trailPhaseIntensity: 0
});
const ordinaryBasinSamples = ordinaryBasinTerrain.samples.filter(
  (terrainSample) =>
    terrainSample.region === 'basin' &&
    terrainSample.topology.ditchPotential < 0.56 &&
    terrainSample.topology.flowAccumulation < 0.78
);
assert(ordinaryBasinSamples.length > 24, 'ordinary basin contract has enough non-ditch basin samples to judge material read');
const basinPoolSamples = ordinaryBasinSamples.filter((terrainSample) => terrainSample.proxyMaterial.kind === 'basin-pool');
assert(
  basinPoolSamples.length / ordinaryBasinSamples.length < 0.25,
  'ordinary valleys mostly read as ground, not default water pools'
);
assert(
  ordinaryBasinSamples.some((terrainSample) => ['basin-meadow', 'basin-dust'].includes(terrainSample.proxyMaterial.kind as string)),
  'ordinary basin samples expose ground-like meadow/dust proxy materials'
);
const ordinaryBasinAverageWetness =
  ordinaryBasinSamples.reduce((sum, terrainSample) => sum + terrainSample.proxyMaterial.wetness, 0) / ordinaryBasinSamples.length;
assert(ordinaryBasinAverageWetness < 0.54, 'ordinary basin wetness stays below fluid-like read');
assert(
  ordinaryBasinTerrain.witness.proxyMaterialCounts['basin-meadow'] || ordinaryBasinTerrain.witness.proxyMaterialCounts['basin-dust'],
  'witness counts ground-like basin proxy materials'
);
assert(typeof (ordinaryBasinTerrain.witness as any).surfaceDetailChecksum === 'string', 'witness exposes surface detail checksum');
assert((ordinaryBasinTerrain.witness as any).surfaceDetailChecksum !== 'none', 'surface detail checksum is not empty');
assert((ordinaryBasinTerrain.witness as any).surfaceDetailCounts['meadow-tuft'] > 0, 'basin meadow terrain emits meadow tuft detail');
assert((ordinaryBasinTerrain.witness as any).surfaceDetailCounts['dust-scuff'] > 0, 'dry basin terrain emits dust scuff detail');
assert(typeof (ordinaryBasinTerrain.witness as any).materialEdgeChecksum === 'string', 'witness exposes material edge checksum');
assert((ordinaryBasinTerrain.witness as any).materialEdgeChecksum !== 'none', 'material edge checksum is not empty');
assert(
  ((ordinaryBasinTerrain.witness as any).materialEdgeCounts['meadow-dust'] ?? 0) +
    ((ordinaryBasinTerrain.witness as any).materialEdgeCounts['dust-crust'] ?? 0) >
    0,
  'ordinary basin terrain emits meadow/dust edge dissolves for procedural asset placement'
);
assert(
  ((ordinaryBasinTerrain.witness as any).surfaceAnchorCounts['tuft-line'] ?? 0) +
    ((ordinaryBasinTerrain.witness as any).surfaceAnchorCounts['scuff-line'] ?? 0) >
    0,
  'ordinary basin terrain emits tuft/scuff anchors for procedural asset placement'
);

const noValleyStableRails = createHillOfHillsTerrain({
  seed: 83025,
  gridResolutionX: 52,
  gridResolutionZ: 68,
  valleyHeight: 0,
  valleyCount: 1,
  ditchPhaseIntensity: 0,
  trailPhaseIntensity: 0
});
const oldRailOffset = noValleyStableRails.params.floorWidth * 0.64;
const oldRailZs = [-0.36, -0.24, -0.12, 0, 0.12, 0.24, 0.36].map((z) => z * noValleyStableRails.params.length);
const oldFixedRailSamples = oldRailZs.flatMap((z) => [
  sampleHillOfHillsTerrain(noValleyStableRails, -oldRailOffset, z),
  sampleHillOfHillsTerrain(noValleyStableRails, oldRailOffset, z)
]);
assert(
  oldFixedRailSamples.every(
    (terrainSample) =>
      terrainSample.region !== 'gutter' &&
      terrainSample.proxyMaterial.kind !== 'ditch-shadow' &&
      terrainSample.topology.ditchPotential < 0.58
  ),
  'stable terrain no longer installs two permanent side-gutter ditch rails'
);

const floorWidthContinuityTerrain = createHillOfHillsTerrain({
  seed: 70303,
  gridResolutionX: 72,
  gridResolutionZ: 92,
  floorWidth: 5.1,
  channelRadius: 5.8,
  channelCurvature: 1.15,
  wallHeight: 2.4,
  hillCount: 5,
  hillHeight: 0.36,
  hillRadius: 1.2,
  valleyCount: 36,
  valleyHeight: 2.35,
  valleyRadius: 1.65,
  valleyVariance: 1.05,
  distanceScale: 1.9,
  featureSpacing: 0.78,
  textureDamping: 0.2,
  detailDamping: 0.16,
  ditchPhaseIntensity: 0,
  trailPhaseIntensity: 0
});
const floorShelfBoundary = floorWidthContinuityTerrain.params.floorWidth * 0.5 * 0.9;
const shelfProbeZs = [-0.42, -0.32, -0.22, -0.12, -0.02, 0.08, 0.18, 0.28, 0.38].map(
  (z) => z * floorWidthContinuityTerrain.params.length
);
const shelfBoundarySteps = shelfProbeZs.map((z) => {
  const justInside = sampleHillOfHillsTerrain(floorWidthContinuityTerrain, floorShelfBoundary - 0.035, z);
  const justOutside = sampleHillOfHillsTerrain(floorWidthContinuityTerrain, floorShelfBoundary + 0.035, z);
  return Math.abs(justInside.height - justOutside.height);
});
const maxShelfBoundaryStep = Math.max(...shelfBoundarySteps);
assert(
  maxShelfBoundaryStep < 0.32,
  `floor width changes should not install a hard lateral height shelf; max boundary step ${maxShelfBoundaryStep.toFixed(3)}`
);

const noValleyFloorBaseline = createHillOfHillsTerrain({
  ...floorWidthContinuityTerrain.params,
  valleyHeight: 0,
  valleyCount: 1
});
const centerValleyDig = [-0.32, -0.16, 0, 0.16, 0.32].flatMap((xFactor) =>
  shelfProbeZs.map((z) => {
    const x = xFactor * floorWidthContinuityTerrain.params.floorWidth;
    const noValley = sampleHillOfHillsTerrain(noValleyFloorBaseline, x, z);
    const valley = sampleHillOfHillsTerrain(floorWidthContinuityTerrain, x, z);
    return noValley.height - valley.height;
  })
);
assert(
  Math.max(...centerValleyDig) > 0.36,
  'floor valleys can dig materially below the no-valley travel floor instead of being clamped flat'
);
assert(
  baseline.samples.some((terrainSample) => (terrainSample as any).topology?.growthPotential > 0.5),
  'terrain exposes growth/tree candidate zones'
);
assert(
  baseline.samples.some((terrainSample) => (terrainSample as any).proxyMaterial?.kind === 'growth-lip'),
  'proxy materials include growth-lip shader band'
);

const sparseHills = createHillOfHillsTerrain({ seed: 1234, hillRadius: 1.35, hillCount: 6, valleyCount: 12 });
const denseHills = createHillOfHillsTerrain({ seed: 1234, hillRadius: 1.35, hillCount: 24, valleyCount: 12 });
assert(sparseHills.params.hillRadius === denseHills.params.hillRadius, 'hill density does not mutate hill radius');
assert(sparseHills.params.hillCount === 6, 'hill count is preserved in effective params');
assert(denseHills.params.hillCount === 24, 'dense hill count is preserved in effective params');
assert(
  sparseHills.witness.topologyChecksum !== denseHills.witness.topologyChecksum,
  'hill count changes topology independently from radius'
);

const denseHillPileupParams: Partial<HillOfHillsTerrainParams> = {
  seed: 60629,
  gridResolutionX: 64,
  gridResolutionZ: 84,
  hillRadius: 2.05,
  hillCount: 64,
  hillHeight: 1.6,
  hillVariance: 1.25,
  valleyHeight: 0,
  valleyCount: 1,
  textureDamping: 1,
  detailDamping: 1,
  ditchPhaseIntensity: 0,
  trailPhaseIntensity: 0,
  featureSpacing: 0.42,
  distanceScale: 2.1
};
const denseHillPileup = createHillOfHillsTerrain(denseHillPileupParams);
const denseHillPileupWithoutHills = createHillOfHillsTerrain({
  ...denseHillPileupParams,
  hillHeight: 0
});
let maxDenseHillLift = 0;
for (let i = 0; i < denseHillPileup.samples.length; i += 1) {
  maxDenseHillLift = Math.max(maxDenseHillLift, denseHillPileup.samples[i].height - denseHillPileupWithoutHills.samples[i].height);
}
const denseHillSingleFeatureCeiling =
  denseHillPileup.params.hillHeight * (1.24 + denseHillPileup.params.hillVariance * 0.46);
assert(
  maxDenseHillLift <= denseHillSingleFeatureCeiling,
  'dense hill count is overlap-controlled instead of stacking accidental multi-hill spikes'
);
assert(
  denseHillPileup.witness.topologyChecksum !== denseHillPileupWithoutHills.witness.topologyChecksum,
  'overlap-controlled dense hills still change terrain topology'
);

const sparseValleys = createHillOfHillsTerrain({ seed: 4321, valleyRadius: 1.25, hillCount: 14, valleyCount: 5 });
const denseValleys = createHillOfHillsTerrain({ seed: 4321, valleyRadius: 1.25, hillCount: 14, valleyCount: 22 });
assert(sparseValleys.params.valleyRadius === denseValleys.params.valleyRadius, 'valley density does not mutate valley radius');
assert(
  sparseValleys.witness.topologyChecksum !== denseValleys.witness.topologyChecksum,
  'valley count changes topology independently from radius'
);

const scaleGrid = { gridResolutionX: 42, gridResolutionZ: 58 };
const widerWorld = createHillOfHillsTerrain({ ...scaleGrid, seed: 2718, worldScale: 1.45, featureSpacing: 1, textureScale: 1 });
const tighterFeatures = createHillOfHillsTerrain({ ...scaleGrid, seed: 2718, worldScale: 1, featureSpacing: 0.62, textureScale: 1 });
const sharperTexture = createHillOfHillsTerrain({ ...scaleGrid, seed: 2718, worldScale: 1, featureSpacing: 1, textureScale: 2.15 });
assert(widerWorld.params.worldScale === 1.45, 'world scale is preserved in effective params');
assert(tighterFeatures.params.featureSpacing === 0.62, 'feature spacing is preserved in effective params');
assert(sharperTexture.params.textureScale === 2.15, 'texture scale is preserved in effective params');
assert(
  widerWorld.witness.sampleSpacing.x > baseline.witness.sampleSpacing.x,
  'world scale expands sampled world spacing'
);
assert(
  tighterFeatures.witness.topologyChecksum !== sharperTexture.witness.topologyChecksum,
  'feature spacing and texture scale are independent topology controls'
);

const stablePhase = createHillOfHillsTerrain({
  seed: 9876,
  gridResolutionX: 34,
  gridResolutionZ: 48,
  ditchPhaseIntensity: 0,
  ditchPhaseLimit: 4,
  ditchPhaseTimeMs: 900
});
assert(stablePhase.phaseState.mode === 'stable', 'zero ditch phase intensity keeps terrain phase stable');
assert(stablePhase.phaseState.activeEpisodes.length === 0, 'stable terrain has no active phase episodes');
assert(stablePhase.witness.phaseMode === 'stable', 'stable witness records stable phase mode');
assert(stablePhase.witness.activePhaseCount === 0, 'stable witness records no active phase episodes');
assert(stablePhase.witness.phaseProgress === 0, 'stable witness phase progress is zero');
assert(stablePhase.witness.phaseInfluenceRange.max === 0, 'stable witness phase influence max is zero');
assert(
  stablePhase.samples.every(
    (terrainSample) =>
      terrainSample.phaseInfluence.kind === 'none' &&
      terrainSample.phaseInfluence.amount === 0 &&
      terrainSample.phaseInfluence.trailAmount === 0 &&
      terrainSample.phaseInfluence.sideDitchAmount === 0
  ),
  'stable samples carry explicit empty phase influence'
);

const ditchPhaseParams: Partial<HillOfHillsTerrainParams> = {
  seed: 9876,
  gridResolutionX: 34,
  gridResolutionZ: 48,
  ditchPhaseSeed: 1212,
  ditchPhaseIntensity: 0.9,
  ditchPhaseLimit: 3,
  ditchPhaseRadius: 1.4,
  ditchPhaseTimeMs: 900,
  ditchPhaseDurationMs: 1800
};
const ditchPhaseA = createHillOfHillsTerrain(ditchPhaseParams);
const ditchPhaseB = createHillOfHillsTerrain(ditchPhaseParams);
assert(ditchPhaseA.phaseState.mode === 'ditch_forming', 'ditch phase activates terrain phase state');
assert(ditchPhaseA.phaseState.activeEpisodes.length > 0, 'ditch phase creates active local episodes');
assert(
  ditchPhaseA.phaseState.activeEpisodes.every(
    (episode) => episode.kind !== 'ditch_forming' || (episode.seedDitchPotential > 0.42 && episode.seedValleyStrength > 0.22)
  ),
  'ditch phase seeds from local valley/flow evidence instead of fixed side gutters'
);
assert(ditchPhaseA.witness.phaseMode === 'ditch_forming', 'ditch phase witness records ditch-forming mode');
assert(ditchPhaseA.witness.activePhaseCount === ditchPhaseA.phaseState.activeEpisodes.length, 'witness active phase count matches phase state');
assert(ditchPhaseA.witness.phaseChecksum === ditchPhaseB.witness.phaseChecksum, 'ditch phase checksum is deterministic');
assert(ditchPhaseA.witness.phaseInfluenceChecksum === ditchPhaseB.witness.phaseInfluenceChecksum, 'ditch phase sample influence checksum is deterministic');
assert(ditchPhaseA.witness.phaseInfluenceRange.max > 0.35, 'ditch phase creates visible sample influence');
assert((ditchPhaseA.witness.phaseInfluenceKinds.ditch_forming ?? 0) > 0, 'witness counts ditch-forming influenced samples');
const influencedSamples = ditchPhaseA.samples.filter((terrainSample) => terrainSample.phaseInfluence.amount > 0.3);
assert(influencedSamples.length > 0, 'ditch phase marks local influenced samples');
assert(
  influencedSamples.some(
    (terrainSample) =>
      terrainSample.proxyMaterial.kind === 'ditch-shadow' ||
      terrainSample.proxyMaterial.wetness > 0.58 ||
      terrainSample.topology.ditchPotential > 0.72
  ),
  'ditch phase locally darkens or wets selected ditch samples'
);
const stableById = new Map(stablePhase.samples.map((terrainSample) => [terrainSample.id, terrainSample]));
const loweredInfluenced = influencedSamples.filter((terrainSample) => {
  const stableSample = stableById.get(terrainSample.id);
  return stableSample ? terrainSample.height < stableSample.height - 0.04 : false;
});
assert(loweredInfluenced.length > 0, 'ditch phase locally deepens selected samples versus stable terrain');
assert(
  ditchPhaseA.witness.topologyChecksum !== stablePhase.witness.topologyChecksum,
  'ditch phase changes topology checksum without changing feature density'
);
const railProbeXs = [
  -ditchPhaseA.params.floorWidth * 0.56,
  ditchPhaseA.params.floorWidth * 0.56
];
let railProbeInfluenceCount = 0;
for (const x of railProbeXs) {
  for (let i = 0; i < 17; i += 1) {
    const z = -ditchPhaseA.params.length * 0.42 + (ditchPhaseA.params.length * 0.84 * i) / 16;
    const terrainSample = sampleHillOfHillsTerrain(ditchPhaseA, x, z);
    if (terrainSample.phaseInfluence.sideDitchAmount > 0.24 && terrainSample.topology.valleyStrength < 0.18) {
      railProbeInfluenceCount += 1;
    }
  }
}
assert(
  railProbeInfluenceCount <= 2,
  'active ditch phase does not paint long low-evidence paired rails beside the old central path'
);

const trailPhaseParams: Partial<HillOfHillsTerrainParams> = {
  seed: 9876,
  gridResolutionX: 42,
  gridResolutionZ: 58,
  ditchPhaseIntensity: 0,
  trailPhaseSeed: 4040,
  trailPhaseIntensity: 0.88,
  trailPhaseLimit: 2,
  trailPhaseRadius: 1.55,
  trailPhaseTimeMs: 940,
  trailPhaseDurationMs: 1900
};
const trailPhaseA = createHillOfHillsTerrain(trailPhaseParams);
const trailPhaseB = createHillOfHillsTerrain(trailPhaseParams);
assert(trailPhaseA.phaseState.mode === 'trail_forming', 'trail phase activates trail-forming terrain phase state');
assert(trailPhaseA.witness.phaseMode === 'trail_forming', 'trail phase witness records trail-forming mode');
assert(trailPhaseA.witness.phaseChecksum === trailPhaseB.witness.phaseChecksum, 'trail phase checksum is deterministic');
assert(
  trailPhaseA.witness.phaseInfluenceChecksum === trailPhaseB.witness.phaseInfluenceChecksum,
  'trail phase influence checksum is deterministic'
);
assert(trailPhaseA.witness.recomputeMode === 'full_grid_with_dirty_tiles', 'trail phase witness records dirty-tile scaffold mode');
assert(trailPhaseA.witness.recomputeTileCount > 0, 'trail phase witness records recompute tile count');
assert(trailPhaseA.witness.dirtyTileCount > 0, 'trail phase marks localized dirty tiles');
assert(trailPhaseA.witness.dirtyTileCount < trailPhaseA.witness.recomputeTileCount, 'trail phase dirty tiles are a localized subset');
assert(trailPhaseA.witness.dirtySampleCount > 0, 'trail phase marks localized dirty samples');
assert(trailPhaseA.witness.dirtySampleCount < trailPhaseA.witness.sampleCount, 'trail phase dirty samples are less than the full grid');
assert(trailPhaseA.witness.dirtyLayerKinds.includes('phase_overlay'), 'dirty layer witness includes phase overlay');
assert(trailPhaseA.witness.dirtyLayerKinds.includes('topology_derivatives'), 'dirty layer witness includes topology derivatives');
assert(typeof trailPhaseA.witness.dirtyRegionChecksum === 'string', 'trail phase witness records dirty region checksum');
assert(trailPhaseA.witness.dirtyRegionChecksum === trailPhaseB.witness.dirtyRegionChecksum, 'dirty region checksum is deterministic');
assert(trailPhaseA.witness.supportFrame.dirtySubstrateTileCount === trailPhaseA.witness.dirtyTileCount, 'support frame ties dirty substrate tiles to recompute witness');
assert(
  trailPhaseA.witness.supportFrame.dirtySubstrateRegionChecksum === trailPhaseA.witness.dirtyRegionChecksum,
  'support frame exposes the same dirty substrate region checksum fluid domains should consume'
);
assert(trailPhaseA.witness.phaseProgress > 0.35, 'trail phase witness exposes active phase progress');
assert((trailPhaseA.witness.activePhaseKinds.trail_forming ?? 0) > 0, 'witness counts active trail-forming episodes');
assert((trailPhaseA.witness.phaseInfluenceKinds.trail_forming ?? 0) > 0, 'witness counts trail-forming influenced samples');
assert(trailPhaseA.witness.trailSeedMethod === 'topology_score', 'trail phase witness records topology-seeded placement');
assert(typeof trailPhaseA.witness.trailCandidateChecksum === 'string', 'trail phase witness records candidate checksum');
assert(trailPhaseA.witness.trailCandidateScoreRange.max > trailPhaseA.witness.trailCandidateScoreRange.min, 'trail candidate score range is populated');
assert(trailPhaseA.witness.selectedTrailScoreRange.max > 0.35, 'selected trail score range records strong terrain candidates');
assert(
  trailPhaseA.phaseState.activeEpisodes.every((episode) => episode.kind !== 'trail_forming' || episode.seedMethod === 'topology_score'),
  'trail episodes record topology score seed method'
);
assert(
  trailPhaseA.phaseState.activeEpisodes.every((episode) => episode.kind !== 'trail_forming' || episode.seedScore > 0.35),
  'trail episodes carry selected topology seed score'
);
assert(trailPhaseA.witness.trailInfluenceRange.max > 0.35, 'trail phase creates route scar influence');
assert(trailPhaseA.witness.sideDitchInfluenceRange.max > 0.28, 'trail phase creates side-ditch influence');
const trailSamples = trailPhaseA.samples.filter((terrainSample) => terrainSample.phaseInfluence.trailAmount > 0.32);
const sideDitchSamples = trailPhaseA.samples.filter((terrainSample) => terrainSample.phaseInfluence.sideDitchAmount > 0.25);
assert(trailSamples.length > 0, 'trail phase marks pathlike route samples');
assert(sideDitchSamples.length > 0, 'trail phase marks side-ditch samples');
assert(
  sideDitchSamples.some((terrainSample) => terrainSample.proxyMaterial.kind === 'ditch-shadow' || terrainSample.proxyMaterial.blends['ditch-shadow']),
  'active trail side ditches expose ditch-shadow shader material'
);
assert(
  trailSamples.some((terrainSample) => terrainSample.support.motionClass === 'phase_morph'),
  'active trail samples expose phase-morph support motion'
);
assert(
  trailSamples.some((terrainSample) => Math.abs(terrainSample.support.heightDelta) > 0.0001),
  'active trail samples expose support height delta for fluid contact'
);
assert(
  trailSamples.some((terrainSample) => Math.abs(terrainSample.support.surfaceVelocity[1]) > 0.0001),
  'active trail samples expose vertical support velocity for fluid contact'
);
assert(
  sideDitchSamples.some((terrainSample) => Math.abs(terrainSample.world[0]) < trailPhaseA.params.floorWidth * 0.72),
  'trail side ditches are not locked to the two wall gutter tracks'
);
assert(
  trailSamples.some((terrainSample) => terrainSample.topology.routePressure > 0.68),
  'trail phase raises route pressure along the trail scar'
);
assert(
  sideDitchSamples.some((terrainSample) => terrainSample.topology.ditchPotential > 0.66 || terrainSample.proxyMaterial.wetness > 0.55),
  'trail side ditches locally raise ditch potential or wetness'
);

const shiftedTrailTopology = createHillOfHillsTerrain({
  ...trailPhaseParams,
  hillCount: 30,
  valleyCount: 5,
  featureSpacing: 0.68,
  distanceScale: 1.85
});
assert(
  shiftedTrailTopology.witness.trailCandidateChecksum !== trailPhaseA.witness.trailCandidateChecksum,
  'trail candidate checksum changes when underlying terrain topology changes'
);
assert(
  shiftedTrailTopology.witness.phaseChecksum !== trailPhaseA.witness.phaseChecksum,
  'same trail seed/time chooses different topology-seeded trail episodes after topology changes'
);
assert(
  shiftedTrailTopology.phaseState.activeEpisodes.some(
    (episode, index) =>
      episode.kind === 'trail_forming' &&
      trailPhaseA.phaseState.activeEpisodes[index]?.kind === 'trail_forming' &&
      (Math.abs(episode.center[0] - trailPhaseA.phaseState.activeEpisodes[index].center[0]) > 0.08 ||
        Math.abs(episode.center[2] - trailPhaseA.phaseState.activeEpisodes[index].center[2]) > 0.08)
  ),
  'terrain topology changes move at least one selected trail episode'
);

const trailPhaseEarlier = createHillOfHillsTerrain({
  ...trailPhaseParams,
  trailPhaseTimeMs: 620
});
const trailPhaseLater = createHillOfHillsTerrain({
  ...trailPhaseParams,
  trailPhaseTimeMs: 1320
});
const trailPhaseFadeout = createHillOfHillsTerrain({
  ...trailPhaseParams,
  trailPhaseTimeMs: 1885
});
const trailPhaseNextCycle = createHillOfHillsTerrain({
  ...trailPhaseParams,
  trailPhaseTimeMs: 1900
});
assert(
  trailPhaseEarlier.witness.trailCandidateChecksum === trailPhaseLater.witness.trailCandidateChecksum,
  'trail topology candidate checksum stays stable across phase motion ticks'
);
assert(
  trailPhaseEarlier.witness.phaseClock !== trailPhaseLater.witness.phaseClock,
  'trail phase witness clock moves across phase motion ticks'
);
assert(
  trailPhaseEarlier.witness.trailPhaseClock < trailPhaseLater.witness.trailPhaseClock,
  'trail phase witness exposes trail-specific clock motion'
);
assert(
  trailPhaseEarlier.witness.trailPhaseProgress > 0 && trailPhaseLater.witness.trailPhaseProgress > 0,
  'trail phase witness exposes trail-specific active progress'
);
assert(trailPhaseEarlier.witness.ditchPhaseProgress === 0, 'trail-only motion witness keeps ditch progress separate');
assert(
  trailPhaseEarlier.witness.phaseChecksum !== trailPhaseLater.witness.phaseChecksum,
  'trail phase checksum moves when phase time changes'
);
assert(
  trailPhaseEarlier.witness.phaseInfluenceChecksum !== trailPhaseLater.witness.phaseInfluenceChecksum,
  'trail influence checksum moves when phase time changes'
);
assert(
  trailPhaseFadeout.witness.phaseProgress < trailPhaseLater.witness.phaseProgress,
  'trail phase progress fades late in the motion cycle'
);
assert(
  trailPhaseFadeout.witness.trailInfluenceRange.max < trailPhaseLater.witness.trailInfluenceRange.max,
  'trail phase influence fades late in the motion cycle'
);
assert(trailPhaseNextCycle.phaseState.mode === 'stable', 'trail phase can fully fade instead of leaving permanent stamped bands');
assert(trailPhaseNextCycle.witness.trailSeedMethod === 'none', 'fully faded trail phase stops claiming topology-seeded active trails');
assert(trailPhaseNextCycle.witness.trailPhaseProgress === 0, 'fully faded trail phase witness exposes zero trail progress');

type TopologyMotionParams = Partial<HillOfHillsTerrainParams> & {
  topologyPhaseSeed: number;
  topologyPhaseIntensity: number;
  topologyPhaseLimit: number;
  topologyPhaseRadius: number;
  topologyPhaseTimeMs: number;
  topologyPhaseDurationMs: number;
};
const topologyPhaseParams: TopologyMotionParams = {
  seed: 9876,
  gridResolutionX: 42,
  gridResolutionZ: 58,
  ditchPhaseIntensity: 0,
  trailPhaseIntensity: 0,
  topologyPhaseSeed: 7331,
  topologyPhaseIntensity: 0.82,
  topologyPhaseLimit: 3,
  topologyPhaseRadius: 1.55,
  topologyPhaseTimeMs: 820,
  topologyPhaseDurationMs: 1800
};
const topologyPhaseA = createHillOfHillsTerrain(topologyPhaseParams);
const topologyPhaseB = createHillOfHillsTerrain(topologyPhaseParams);
const topologyEventKinds = HILL_OF_HILLS_TOPOLOGY_EVENT_KINDS;
const topologyEventKindSet = new Set<string>(topologyEventKinds);
assert(
  topologyEventKindSet.size === 10 &&
    topologyEventKinds.includes('hill_swell') &&
    topologyEventKinds.includes('hill_slump') &&
    topologyEventKinds.includes('valley_deepen') &&
    topologyEventKinds.includes('valley_fill') &&
    topologyEventKinds.includes('ridge_lift') &&
    topologyEventKinds.includes('ridge_shear') &&
    topologyEventKinds.includes('saddle_pinch') &&
    topologyEventKinds.includes('saddle_pass') &&
    topologyEventKinds.includes('basin_bloom') &&
    topologyEventKinds.includes('strata_reveal'),
  'topology motion publishes the full typed terrain-event vocabulary'
);
assert((topologyPhaseA.phaseState.mode as string) === 'topology_morphing', 'topology motion activates topology-morphing phase state');
assert(topologyPhaseA.phaseState.activeEpisodes.length > 0, 'topology motion creates active local episodes');
assert(
  topologyPhaseA.phaseState.activeEpisodes.every((episode) => topologyEventKindSet.has(episode.kind as string)),
  'topology motion episodes stay in topology-specific kinds'
);
assert(
  topologyPhaseA.phaseState.activeEpisodes.every(
    (episode) =>
      episode.topologyEvent &&
      topologyEventKindSet.has(episode.topologyEvent.kind) &&
      episode.topologyEvent.semanticReason.length > 8 &&
      episode.topologyEvent.eligibility.score > 0 &&
      Number.isFinite(episode.topologyEvent.eligibility.hill) &&
      Number.isFinite(episode.topologyEvent.eligibility.valley) &&
      Number.isFinite(episode.topologyEvent.eligibility.ridge) &&
      Number.isFinite(episode.topologyEvent.eligibility.saddle) &&
      Number.isFinite(episode.topologyEvent.eligibility.basin) &&
      Number.isFinite(episode.topologyEvent.eligibility.strata) &&
      episode.topologyEvent.envelope.amount > 0 &&
      episode.topologyEvent.envelope.durationMs === topologyPhaseA.params.topologyPhaseDurationMs &&
      episode.topologyEvent.envelope.supportRadius === episode.radius &&
      episode.topologyEvent.materialHint.length > 0 &&
      episode.topologyEvent.assetHint.length > 0
  ),
  'topology episodes carry eligibility evidence, semantic reasons, envelopes, and material/asset hints'
);
assert((topologyPhaseA.witness.phaseMode as string) === 'topology_morphing', 'topology motion witness records topology-morphing mode');
assert(topologyPhaseA.witness.phaseChecksum === topologyPhaseB.witness.phaseChecksum, 'topology motion checksum is deterministic');
assert(
  topologyPhaseA.witness.phaseInfluenceChecksum === topologyPhaseB.witness.phaseInfluenceChecksum,
  'topology motion influence checksum is deterministic'
);
assert(topologyPhaseA.witness.topologyPhaseProgress > 0.35, 'topology motion witness exposes topology-specific progress');
assert(topologyPhaseA.witness.topologyPhaseClock > 0, 'topology motion witness exposes topology-specific clock');
assert(topologyPhaseA.witness.topologyInfluenceRange.max > 0.28, 'topology motion creates visible local topology influence');
assert(
  topologyPhaseA.witness.topologyEventVocabulary.length === HILL_OF_HILLS_TOPOLOGY_EVENT_KINDS.length,
  'topology witness advertises the event vocabulary for shader/debug consumers'
);
assert(
  topologyPhaseA.witness.topologyEventDebug.length === topologyPhaseA.phaseState.activeEpisodes.length,
  'topology witness exposes one debug record per active topology event'
);
assert(
  topologyPhaseA.witness.topologyEventDebug.every(
    (event) =>
      topologyEventKindSet.has(event.kind) &&
      event.semanticReason.length > 8 &&
      event.eligibility.score > 0 &&
      event.envelope.amount > 0 &&
      event.materialHint.length > 0 &&
      event.assetHint.length > 0
  ),
  'topology witness debug records preserve event kind, reason, eligibility, envelope, and hint channels'
);
assert(
  topologyPhaseA.witness.topologyEventCandidateChecksum === topologyPhaseB.witness.topologyEventCandidateChecksum,
  'topology event candidate checksum is deterministic'
);
assert(
  topologyPhaseA.witness.selectedTopologyEventScoreRange.max > topologyPhaseA.witness.selectedTopologyEventScoreRange.min,
  'selected topology event score range records typed event strength'
);
assert(
  Object.entries(topologyPhaseA.witness.activePhaseKinds as Record<string, number>).some(
    ([kind, count]) => topologyEventKindSet.has(kind) && count > 0
  ),
  'witness counts active topology motion episode kinds'
);
assert(
  Object.entries(topologyPhaseA.witness.phaseInfluenceKinds as Record<string, number>).some(
    ([kind, count]) => topologyEventKindSet.has(kind) && count > 0
  ),
  'witness counts topology motion influenced samples'
);
assert(topologyPhaseA.witness.dirtyTileCount > 0, 'topology motion marks localized dirty tiles');
assert(topologyPhaseA.witness.dirtyTileCount < topologyPhaseA.witness.recomputeTileCount, 'topology motion dirty tiles are localized');
assert(topologyPhaseA.witness.supportFrame.dirtySubstrateTileCount === topologyPhaseA.witness.dirtyTileCount, 'support frame tracks topology motion dirty tiles');
const stableTopologyCounterpart = createHillOfHillsTerrain({
  ...topologyPhaseParams,
  topologyPhaseIntensity: 0
} as TopologyMotionParams);
const stableTopologyById = new Map(stableTopologyCounterpart.samples.map((terrainSample) => [terrainSample.id, terrainSample]));
const topologyInfluencedSamples = topologyPhaseA.samples.filter((terrainSample) =>
  topologyEventKindSet.has(terrainSample.phaseInfluence.kind as string)
);
assert(topologyInfluencedSamples.length > 0, 'topology motion marks topology-influenced samples');
assert(
  topologyInfluencedSamples.some((terrainSample) => {
    const stableSample = stableTopologyById.get(terrainSample.id);
    return stableSample ? Math.abs(terrainSample.height - stableSample.height) > 0.04 : false;
  }),
  'topology motion changes local geometry versus stable terrain'
);
assert(
  topologyInfluencedSamples.every((terrainSample) => Number.isFinite(terrainSample.height) && Math.abs(terrainSample.support.heightDelta) < 0.25),
  'topology motion keeps local height/support deltas finite and bounded'
);
assert(
  topologyInfluencedSamples.some((terrainSample) => Math.abs(terrainSample.support.surfaceVelocity[1]) > 0.0001),
  'topology motion exposes vertical support velocity for fluid contact'
);
assert(
  topologyPhaseA.witness.topologyChecksum !== stableTopologyCounterpart.witness.topologyChecksum,
  'topology motion changes topology checksum without changing stable feature density'
);
assert(
  topologyPhaseA.witness.proxyMaterialChecksum !== stableTopologyCounterpart.witness.proxyMaterialChecksum ||
    topologyPhaseA.witness.materialEdgeChecksum !== stableTopologyCounterpart.witness.materialEdgeChecksum,
  'topology motion reaches material or edge consumers, not only raw height'
);
const topologyPhaseEarlier = createHillOfHillsTerrain({
  ...topologyPhaseParams,
  topologyPhaseTimeMs: 620
} as TopologyMotionParams);
const topologyPhaseLater = createHillOfHillsTerrain({
  ...topologyPhaseParams,
  topologyPhaseTimeMs: 1320
} as TopologyMotionParams);
assert(
  topologyPhaseEarlier.witness.topologyPhaseClock < topologyPhaseLater.witness.topologyPhaseClock,
  'topology motion witness clock moves across phase ticks'
);
assert(
  topologyPhaseEarlier.witness.phaseChecksum !== topologyPhaseLater.witness.phaseChecksum,
  'topology motion checksum moves when topology phase time changes'
);
assert(
  topologyPhaseEarlier.witness.phaseInfluenceChecksum !== topologyPhaseLater.witness.phaseInfluenceChecksum,
  'topology motion influence checksum moves when topology phase time changes'
);
assert(topologyPhaseEarlier.witness.trailPhaseProgress === 0, 'topology-only motion keeps trail progress separate');
assert(topologyPhaseEarlier.witness.ditchPhaseProgress === 0, 'topology-only motion keeps ditch progress separate');

const topologyLowHeight = createHillOfHillsTerrain({
  ...topologyPhaseParams,
  topologyPhaseHeightScale: 0.22
} as TopologyMotionParams);
const topologyHighHeight = createHillOfHillsTerrain({
  ...topologyPhaseParams,
  topologyPhaseHeightScale: 1.45
} as TopologyMotionParams);
assert(
  topologyLowHeight.witness.topologyInfluenceRange.max > 0.2 && topologyHighHeight.witness.topologyInfluenceRange.max > 0.2,
  'topology height scaling preserves active topology influence'
);
assert(
  maxAbsSupportDelta(topologyHighHeight.samples) > maxAbsSupportDelta(topologyLowHeight.samples) * 1.8,
  'topology height scale changes vertical terrain motion independently from topology influence placement'
);

const topologyBeforeWrap = createHillOfHillsTerrain({
  ...topologyPhaseParams,
  topologyPhaseTimeMs: topologyPhaseParams.topologyPhaseDurationMs - 4,
  topologyPhaseOverlap: 0.32,
  topologyPhaseDetailScale: 1
} as TopologyMotionParams);
const topologyAfterWrap = createHillOfHillsTerrain({
  ...topologyPhaseParams,
  topologyPhaseTimeMs: topologyPhaseParams.topologyPhaseDurationMs + 4,
  topologyPhaseOverlap: 0.32,
  topologyPhaseDetailScale: 1
} as TopologyMotionParams);
assert(
  topologyBeforeWrap.phaseState.mode === 'topology_morphing' && topologyAfterWrap.phaseState.mode === 'topology_morphing',
  'topology motion crossfades active episodes across the phase wrap'
);
assert(
  topologyBeforeWrap.witness.topologyInfluenceRange.max > 0.12 && topologyAfterWrap.witness.topologyInfluenceRange.max > 0.12,
  'topology motion keeps visible influence on both sides of the phase wrap'
);
assert(
  Math.abs(topologyBeforeWrap.witness.topologyInfluenceRange.max - topologyAfterWrap.witness.topologyInfluenceRange.max) < 0.48,
  'topology motion avoids a full influence collapse at the phase wrap'
);
assert(
  topologyAfterWrap.witness.topologyEventDebug.some((event) => event.envelope.amount > 0.1),
  'topology event debug exposes nonzero semantic envelope just after wrap'
);

const topologyBasinBiased = createHillOfHillsTerrain({
  ...topologyPhaseParams,
  topologyPhaseValleyBias: 1.8,
  topologyPhaseBasinBias: 0,
  topologyPhaseHillBias: 0,
  topologyPhaseRidgeBias: 0,
  topologyPhaseSaddleBias: 0
} as TopologyMotionParams);
assert(
  topologyBasinBiased.phaseState.activeEpisodes.length > 0,
  'topology kind bias still creates topology motion episodes'
);
assert(
  topologyBasinBiased.phaseState.activeEpisodes.every((episode) => episode.kind === 'valley_deepen'),
  'topology valley bias can steer topology motion toward valley deepening'
);

const cacheSource = {
  timestampMs: 11_000,
  frameId: 'cached-terrain-contract',
  route: 'hill-of-hills/cache-contract',
  configId: 'hill-of-hills-cache-contract-v0'
};
const layerTileCache = createHillOfHillsLayerTileCache();
const cachedFirst = createHillOfHillsTerrainWithCache(layerTileCache, trailPhaseEarlier.params, cacheSource);
const uncachedFirst = createHillOfHillsTerrain(trailPhaseEarlier.params, cacheSource);
assert(cachedFirst.witness.cacheMode === 'persistent_layer_tile_cache', 'cached terrain witness records persistent layer/tile cache mode');
assert(cachedFirst.witness.cacheInvalidated === true, 'first cached terrain generation invalidates an empty cache');
assert(cachedFirst.witness.cacheReusedSampleCount === 0, 'first cached terrain generation cannot reuse samples');
assert(cachedFirst.witness.cacheRecomputedSampleCount === cachedFirst.samples.length, 'first cached terrain generation computes the full sample set');
assert(cachedFirst.witness.sampleChecksum === uncachedFirst.witness.sampleChecksum, 'first cached terrain matches uncached sample checksum');
assert(cachedFirst.witness.heightfieldChecksum === uncachedFirst.witness.heightfieldChecksum, 'first cached terrain matches uncached heightfield checksum');

const cachedLater = createHillOfHillsTerrainWithCache(layerTileCache, trailPhaseLater.params, cacheSource);
const uncachedLater = createHillOfHillsTerrain(trailPhaseLater.params, cacheSource);
assert(cachedLater.witness.cacheMode === 'persistent_layer_tile_cache', 'second cached terrain stays on persistent cache path');
assert(cachedLater.witness.cacheInvalidated === false, 'phase-only tick does not invalidate stable cached layers');
assert(cachedLater.witness.cacheStableLayerInvalidated === false, 'phase-only tick does not invalidate stable heightfield layers');
assert(cachedLater.witness.cacheReusedSampleCount > 0, 'phase-only tick reuses untouched cached samples');
assert(cachedLater.witness.cacheRecomputedSampleCount > 0, 'phase-only tick recomputes dirty phase samples');
assert(cachedLater.witness.cacheRecomputedSampleCount < cachedLater.samples.length, 'phase-only tick recomputes fewer samples than the full grid');
assert(
  cachedLater.witness.cacheRecomputedSampleCount === cachedLater.witness.supportFrame.dirtySubstrateSampleCount,
  'cached recompute count matches actual dirty substrate sample count'
);
assert(cachedLater.witness.sampleChecksum === uncachedLater.witness.sampleChecksum, 'cached phase tick matches uncached sample checksum');
assert(cachedLater.witness.topologyChecksum === uncachedLater.witness.topologyChecksum, 'cached phase tick matches uncached topology checksum');
assert(cachedLater.witness.phaseInfluenceChecksum === uncachedLater.witness.phaseInfluenceChecksum, 'cached phase tick matches uncached phase influence checksum');
assert(cachedLater.witness.supportFrame.supportFrameChecksum === uncachedLater.witness.supportFrame.supportFrameChecksum, 'cached phase tick matches uncached support frame checksum');
assert(
  cachedLater.samples.some((terrainSample, index) => terrainSample === cachedFirst.samples[index]),
  'cached phase tick preserves object identity for at least one untouched sample'
);

const cachedStableInvalidated = createHillOfHillsTerrainWithCache(
  layerTileCache,
  {
    ...trailPhaseLater.params,
    hillCount: trailPhaseLater.params.hillCount + 3
  },
  cacheSource
);
assert(cachedStableInvalidated.witness.cacheInvalidated === true, 'stable topology changes invalidate cached terrain layers');
assert(cachedStableInvalidated.witness.cacheReusedSampleCount === 0, 'stable topology invalidation reuses no prior samples');
assert(
  cachedStableInvalidated.witness.cacheStableLayerChecksum !== cachedLater.witness.cacheStableLayerChecksum,
  'stable topology invalidation changes the cached stable layer checksum'
);

for (const terrainSample of baseline.samples) {
  assert(Number.isFinite(terrainSample.height), `sample ${terrainSample.id} height is finite`);
  assert(Number.isFinite(terrainSample.slope), `sample ${terrainSample.id} slope is finite`);
  terrainSample.normal.forEach((component, index) => {
    assert(Number.isFinite(component), `sample ${terrainSample.id} normal[${index}] is finite`);
  });
}

const repeatA = createHillOfHillsTerrain({ ...defaultHillOfHillsParams, seed: 314159 });
const repeatB = createHillOfHillsTerrain({ ...defaultHillOfHillsParams, seed: 314159 });
assert(repeatA.witness.sampleChecksum === repeatB.witness.sampleChecksum, 'terrain generation is deterministic for seed and params');
assert(
  JSON.stringify(repeatA.samples.slice(0, 25)) === JSON.stringify(repeatB.samples.slice(0, 25)),
  'terrain samples are deterministic for seed and params'
);

assert(baseline.witness.schema === 'lerms.hill-of-hills-witness.v0', 'terrain witness emits witness schema');
assert(baseline.witness.fallbackStatus === 'none', 'terrain witness reports no fallback fixture');
assert(baseline.witness.gridResolution.x === 42, 'terrain witness exposes grid resolution x');
assert(baseline.witness.gridResolution.z === 58, 'terrain witness exposes grid resolution z');
assert(baseline.witness.effectiveParams.floorWidth === baseline.params.floorWidth, 'terrain witness exposes effective params');
assert(typeof (baseline.witness as any).topologyChecksum === 'string', 'terrain witness exposes topology checksum');
assert(typeof (baseline.witness as any).proxyMaterialChecksum === 'string', 'terrain witness exposes proxy material checksum');
assert(typeof (baseline.witness as any).featureChecksum === 'string', 'terrain witness exposes cached terrain feature checksum');
assert(baseline.witness.heightfieldMode === 'grid_heightfield', 'terrain witness records reusable grid heightfield generation');
assert(typeof baseline.witness.heightfieldChecksum === 'string', 'terrain witness exposes grid heightfield checksum');
assert(baseline.witness.recomputeMode === 'full_grid_with_dirty_tiles', 'terrain witness exposes dirty-tile scaffold mode');
assert(baseline.witness.recomputeTileCount > 0, 'terrain witness exposes recompute tile count');
assert(baseline.witness.dirtyTileCount === 0, 'stable terrain has no localized dirty phase tiles');
assert(baseline.witness.dirtySampleCount === 0, 'stable terrain has no localized dirty phase samples');
assert(baseline.witness.dirtyLayerKinds.length === 0, 'stable terrain has no localized dirty layer kinds');
assert(baseline.witness.dirtyRegionChecksum === 'none', 'stable terrain dirty region checksum is explicitly none');
assert(baseline.witness.supportFrame.supportClass === 'single_valued_heightfield', 'support frame declares single-valued terrain support');
assert(baseline.witness.supportFrame.mappingMode === 'static_domain_to_world', 'support frame declares current domain mapping mode');
assert(baseline.witness.supportFrame.domainBounds.u.min === 0, 'support frame domain u begins at zero');
assert(baseline.witness.supportFrame.domainBounds.u.max === 1, 'support frame domain u ends at one');
assert(baseline.witness.supportFrame.domainBounds.v.min === 0, 'support frame domain v begins at zero');
assert(baseline.witness.supportFrame.domainBounds.v.max === 1, 'support frame domain v ends at one');
assert(baseline.witness.supportFrame.substrateTileCount === baseline.witness.recomputeTileCount, 'support frame reuses recompute tile count as substrate tile count');
assert(baseline.witness.supportFrame.dirtySubstrateTileCount === 0, 'stable support frame has no dirty substrate tiles');
assert(baseline.witness.supportFrame.dirtySubstrateRegionChecksum === 'none', 'stable support frame dirty substrate checksum is none');
assert(baseline.witness.supportFrame.maxHeightDelta === 0, 'stable support frame has no height delta');
assert(baseline.witness.supportFrame.maxSurfaceSpeed === 0, 'stable support frame has no surface speed');
assert((baseline.witness.supportFrame.motionClassCounts.stable ?? 0) === baseline.samples.length, 'stable support frame counts every sample as stable');
assert((baseline.witness.supportFrame.shockClassCounts.none ?? 0) === baseline.samples.length, 'stable support frame reports no shocks');
assert(typeof baseline.witness.supportFrame.supportFrameChecksum === 'string', 'support frame exposes checksum for fluid witness freshness');
assert((baseline.witness as any).topologyRanges.routePressure.max > 0.45, 'witness records route pressure range');
assert((baseline.witness as any).topologyRanges.growthPotential.max > 0.5, 'witness records growth candidate range');
assert(typeof (baseline.witness as any).surfaceDetailChecksum === 'string', 'witness records surface detail checksum');
assert((baseline.witness as any).surfaceDetailCounts['slope-striation'] > 0, 'witness counts slope striation detail');
assert((baseline.witness as any).surfaceDetailCounts['growth-bud'] > 0, 'witness counts growth bud detail');
assert((trailPhaseA.witness as any).surfaceDetailCounts['trail-wear'] > 0, 'trail phase witness counts trail-worn detail');
assert((trailPhaseA.witness as any).surfaceDetailCounts['damp-edge'] > 0, 'active trail witness counts damp edge detail');
assert((trailPhaseA.witness as any).proxyMaterialCounts['ditch-shadow'] > 0, 'active trail witness counts ditch-shadow proxy material');
assert(typeof (baseline.witness as any).materialEdgeChecksum === 'string', 'witness records material edge checksum');
assert((baseline.witness as any).materialEdgeCounts['growth-cluster'] > 0, 'witness counts growth cluster material edges');
assert((baseline.witness as any).surfaceAnchorCounts['growth-cluster'] > 0, 'witness counts growth cluster surface anchors');
assert((trailPhaseA.witness as any).materialEdgeCounts['damp-rim'] > 0, 'active trail witness counts damp rim material edges');
assert((trailPhaseA.witness as any).surfaceAnchorCounts['wet-rim'] > 0, 'active trail witness counts wet rim surface anchors');
assert((trailPhaseA.witness as any).materialEdgeCounts['route-wear'] > 0, 'trail phase witness counts route-wear material edges');
assert((trailPhaseA.witness as any).surfaceAnchorCounts['trail-accent'] > 0, 'trail phase witness counts trail accent anchors');
assert(
  repeatA.witness.surfaceDetailChecksum === repeatB.witness.surfaceDetailChecksum,
  'surface detail checksum is deterministic for seed and params'
);
assert(
  (repeatA.witness as any).materialEdgeChecksum === (repeatB.witness as any).materialEdgeChecksum,
  'material edge checksum is deterministic for seed and params'
);
assert(repeatA.witness.featureChecksum === repeatB.witness.featureChecksum, 'terrain feature checksum is deterministic for seed and params');
assert(repeatA.witness.heightfieldChecksum === repeatB.witness.heightfieldChecksum, 'terrain heightfield checksum is deterministic for seed and params');
assert(
  shiftedTrailTopology.witness.featureChecksum !== trailPhaseA.witness.featureChecksum,
  'terrain feature checksum changes when feature density or spacing changes'
);

for (const terrainSample of baseline.samples) {
  assert(terrainSample.support.supportClass === 'single_valued_heightfield', `sample ${terrainSample.id} declares single-valued support`);
  assert(terrainSample.support.domain.u >= 0 && terrainSample.support.domain.u <= 1, `sample ${terrainSample.id} domain u is normalized`);
  assert(terrainSample.support.domain.v >= 0 && terrainSample.support.domain.v <= 1, `sample ${terrainSample.id} domain v is normalized`);
  assert(Number.isInteger(terrainSample.support.domainIndex.x), `sample ${terrainSample.id} support domain x index is integer`);
  assert(Number.isInteger(terrainSample.support.domainIndex.z), `sample ${terrainSample.id} support domain z index is integer`);
  assert(terrainSample.support.previousHeight === terrainSample.height, `stable sample ${terrainSample.id} previous height matches current height`);
  assert(terrainSample.support.heightDelta === 0, `stable sample ${terrainSample.id} height delta is zero`);
  assert(terrainSample.support.surfaceVelocity[1] === 0, `stable sample ${terrainSample.id} vertical support velocity is zero`);
  assert(terrainSample.support.motionClass === 'stable', `stable sample ${terrainSample.id} motion class is stable`);
  assert(terrainSample.support.shock === 'none', `stable sample ${terrainSample.id} has no shock`);
}

const fallbackTerrain = createHillOfHillsTerrain(
  { gridResolutionX: 12, gridResolutionZ: 12 },
  { authority: 'live_simulation', fallbackStatus: 'fallback', route: 'hill-of-hills/fallback-smoke' }
);
assert(fallbackTerrain.source.authority === 'fallback', 'fallback terrain cannot claim live source authority');
assert(fallbackTerrain.witness.sourceAuthority === 'fallback', 'fallback witness source authority downgrades with source');
assert(
  fallbackTerrain.samples.every((terrainSample) => terrainSample.source.authority === 'fallback'),
  'fallback terrain samples carry fallback source truth'
);

const fixtureTerrain = createHillOfHillsTerrain(
  { gridResolutionX: 12, gridResolutionZ: 12 },
  { authority: 'live_simulation', fallbackStatus: 'synthetic_fixture', route: 'hill-of-hills/fixture-smoke' }
);
assert(fixtureTerrain.source.authority === 'synthetic_fixture', 'fixture terrain cannot claim live source authority');
assert(fixtureTerrain.witness.sourceAuthority === 'synthetic_fixture', 'fixture witness source authority downgrades with source');

const frame = createHillOfHillsFrame(baseline);
assertFirstVerticalFrame(frame);
assert(frame.terrainSamples.length === baseline.samples.length, 'first vertical frame includes generated terrain samples');

console.log('hill of hills terrain ok');
