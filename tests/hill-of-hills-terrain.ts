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
assert((baseline.witness as any).topologyRanges.routePressure.max > 0.45, 'witness records route pressure range');
assert((baseline.witness as any).topologyRanges.growthPotential.max > 0.5, 'witness records growth candidate range');
assert((baseline.witness as any).proxyMaterialCounts['ditch-shadow'] > 0, 'witness counts ditch-shadow proxy material');

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
