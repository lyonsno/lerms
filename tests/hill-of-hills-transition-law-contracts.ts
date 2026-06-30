import {
  hillMaterialTransitionLawFor,
  normalizeHillMaterialTransitionPair,
  type HillMaterialTransitionInput
} from '../src/terrain/hill-of-hills-transition-law.js';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const baseline: HillMaterialTransitionInput = {
  fromMaterial: 'basin-meadow',
  toMaterial: 'basin-dust',
  edgeKind: 'meadow-dust',
  anchor: 'tuft-line',
  strength: 0.7,
  dissolve: 0.72,
  wetness: 0.24,
  growth: 0.42,
  routePressure: 0.34,
  materialContrast: 0.46
};

const softGround = hillMaterialTransitionLawFor(baseline);
assert(softGround.law === 'soft-ground-fray', 'meadow/dust tuft boundary resolves to soft ground fray');
assert(softGround.intensity > 0.2 && softGround.intensity < 0.8, 'soft ground law carries bounded intensity');
assert(softGround.seedKey === 'basin-dust|basin-meadow:meadow-dust:tuft-line', 'transition seed key normalizes material pair');

const reversed = hillMaterialTransitionLawFor({
  ...baseline,
  fromMaterial: 'basin-dust',
  toMaterial: 'basin-meadow'
});
assert(reversed.law === softGround.law, 'material transition law is stable when from/to order flips');
assert(reversed.seedKey === softGround.seedKey, 'material transition seed key is stable when from/to order flips');

const wetBank = hillMaterialTransitionLawFor({
  ...baseline,
  fromMaterial: 'ditch-shadow',
  toMaterial: 'basin-meadow',
  edgeKind: 'damp-rim',
  anchor: 'wet-rim',
  wetness: 0.82,
  growth: 0.26,
  routePressure: 0.18
});
assert(wetBank.law === 'wet-bank-shadow', 'wet rim ditch boundary resolves to wet bank shadow');
assert(wetBank.intensity > softGround.intensity, 'wet bank shadow intensifies over ordinary soft ground fray');

const routeWear = hillMaterialTransitionLawFor({
  ...baseline,
  fromMaterial: 'approach-clay',
  toMaterial: 'basin-meadow',
  edgeKind: 'route-wear',
  anchor: 'trail-accent',
  routePressure: 0.88,
  growth: 0.22
});
assert(routeWear.law === 'route-wear-feather', 'route/trail boundary resolves to route wear feather');

const growth = hillMaterialTransitionLawFor({
  ...baseline,
  fromMaterial: 'growth-lip',
  toMaterial: 'slope-moss',
  edgeKind: 'growth-cluster',
  anchor: 'growth-cluster',
  growth: 0.76,
  routePressure: 0.2
});
assert(growth.law === 'growth-thicket', 'growth-cluster boundary resolves to growth thicket');

const meadowGrowth = hillMaterialTransitionLawFor({
  ...baseline,
  fromMaterial: 'basin-meadow',
  toMaterial: 'growth-lip',
  edgeKind: 'meadow-growth',
  anchor: 'tuft-line',
  growth: 0.66,
  routePressure: 0.22
});
assert(meadowGrowth.law === 'vegetation-creep', 'meadow/growth boundary resolves to vegetation creep');

const dryCrust = hillMaterialTransitionLawFor({
  ...baseline,
  fromMaterial: 'rim-crust',
  toMaterial: 'basin-dust',
  edgeKind: 'dust-crust',
  anchor: 'scuff-line',
  wetness: 0.08,
  growth: 0.1,
  routePressure: 0.12
});
assert(dryCrust.law === 'dry-crust-chip', 'dust/crust scuff boundary resolves to dry crust chip');

const stoneBreak = hillMaterialTransitionLawFor({
  ...baseline,
  fromMaterial: 'rim-crust',
  toMaterial: 'slope-moss',
  edgeKind: 'slope-break',
  anchor: 'stone-scatter',
  wetness: 0.18,
  growth: 0.34,
  routePressure: 0.1
});
assert(stoneBreak.law === 'stone-break', 'slope-break stone boundary resolves to stone break');

const sameMaterial = hillMaterialTransitionLawFor({
  ...baseline,
  fromMaterial: 'basin-meadow',
  toMaterial: 'basin-meadow'
});
assert(sameMaterial.law === 'none', 'same material resolves to no transition law');
assert(sameMaterial.intensity === 0, 'same material transition intensity is zero');

const weakEdge = hillMaterialTransitionLawFor({
  ...baseline,
  strength: 0.03,
  dissolve: 0.04
});
assert(weakEdge.law === 'none', 'weak edge resolves to no transition law');

const pair = normalizeHillMaterialTransitionPair('ditch-shadow', 'basin-meadow');
assert(pair.key === 'basin-meadow|ditch-shadow', 'material pair normalization is lexical and deterministic');
assert(pair.a === 'basin-meadow' && pair.b === 'ditch-shadow', 'normalized pair exposes stable sides');

console.log('hill of hills transition law contracts ok');
