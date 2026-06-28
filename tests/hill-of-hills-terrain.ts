import { assertFirstVerticalFrame } from '../src/contracts/first-vertical.js';
import {
  createHillOfHillsFrame,
  createHillOfHillsTerrain,
  defaultHillOfHillsParams,
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
for (const region of ['approach', 'slope', 'basin', 'gutter', 'rim', 'crown'] as const) {
  assert(regions.has(region), `terrain grid classifies ${region} samples`);
}

const gutterSamples = baseline.samples.filter((terrainSample) => terrainSample.region === 'gutter');
assert(gutterSamples.some((terrainSample) => (terrainSample as any).topology?.ditchPotential > 0.55), 'gutters advertise ditch potential');
assert(
  baseline.samples.some((terrainSample) => (terrainSample as any).topology?.growthPotential > 0.5),
  'terrain exposes growth/tree candidate zones'
);
assert(
  baseline.samples.some((terrainSample) => (terrainSample as any).proxyMaterial?.kind === 'ditch-shadow'),
  'proxy materials include ditch-shadow shader band'
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
assert((baseline.witness as any).topologyRanges.routePressure.max > 0.45, 'witness records route pressure range');
assert((baseline.witness as any).topologyRanges.growthPotential.max > 0.5, 'witness records growth candidate range');
assert((baseline.witness as any).proxyMaterialCounts['ditch-shadow'] > 0, 'witness counts ditch-shadow proxy material');
assert(repeatA.witness.featureChecksum === repeatB.witness.featureChecksum, 'terrain feature checksum is deterministic for seed and params');
assert(
  shiftedTrailTopology.witness.featureChecksum !== trailPhaseA.witness.featureChecksum,
  'terrain feature checksum changes when feature density or spacing changes'
);

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
