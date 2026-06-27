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

const pushed = createHillOfHillsTerrain({
  channelRadius: 4.2,
  channelCurvature: 1.8,
  wallHeight: 4.4,
  floorWidth: 3.2,
  hillRadius: 1.1,
  hillHeight: 1.45,
  hillVariance: 0.95,
  valleyRadius: 1.25,
  valleyHeight: 1.05,
  valleyVariance: 0.9,
  distanceScale: 1.65,
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

const frame = createHillOfHillsFrame(baseline);
assertFirstVerticalFrame(frame);
assert(frame.terrainSamples.length === baseline.samples.length, 'first vertical frame includes generated terrain samples');

console.log('hill of hills terrain ok');
