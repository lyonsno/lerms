import {
  hillPlacementAffordanceAnchorsFor,
  type HillPlacementAffordanceInput
} from '../src/terrain/hill-of-hills-placement-affordance.js';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const base: HillPlacementAffordanceInput = {
  law: 'growth-thicket',
  intensity: 0.86,
  seedKey: 'basin-meadow|growth-lip:growth-cluster:growth-cluster',
  edgeKind: 'growth-cluster',
  anchor: 'growth-cluster',
  midpoint: { x: 2.5, z: -1.25 },
  tangent: { x: 0.12, z: 0.99 },
  normal: { x: 0.99, z: -0.12 },
  wetness: 0.18,
  growth: 0.92,
  routePressure: 0.2,
  slope: 0.38
};

const growthAnchors = hillPlacementAffordanceAnchorsFor(base);
assert(growthAnchors.length >= 2, 'strong growth thicket emits multiple placement anchors');
assert(growthAnchors[0].kind === 'bushlet', 'growth thicket starts with a bushlet anchor');
assert(growthAnchors[0].family === 'vegetation', 'growth thicket anchors are vegetation family');
assert(growthAnchors.some((anchor) => anchor.kind === 'edge-grass'), 'growth thicket also emits edge grass');
assert(growthAnchors.every((anchor) => anchor.scale > 0.25 && anchor.scale <= 1.8), 'growth anchor scales stay bounded');
assert(growthAnchors.every((anchor) => anchor.strength > 0.4 && anchor.strength <= 1), 'growth anchor strengths stay bounded');

const repeatedGrowthAnchors = hillPlacementAffordanceAnchorsFor(base);
assert(JSON.stringify(repeatedGrowthAnchors) === JSON.stringify(growthAnchors), 'placement anchors are deterministic for identical input');

const reseededGrowthAnchors = hillPlacementAffordanceAnchorsFor({
  ...base,
  seedKey: `${base.seedKey}:alternate`
});
assert(reseededGrowthAnchors[0]?.id !== growthAnchors[0].id, 'seed key affects deterministic anchor identity');
assert(reseededGrowthAnchors[0]?.localOffset.along !== growthAnchors[0].localOffset.along, 'seed key affects deterministic anchor offset');

const wetBankAnchors = hillPlacementAffordanceAnchorsFor({
  ...base,
  law: 'wet-bank-shadow',
  seedKey: 'basin-meadow|ditch-shadow:damp-rim:wet-rim',
  edgeKind: 'damp-rim',
  anchor: 'wet-rim',
  wetness: 0.9,
  growth: 0.22,
  routePressure: 0.16
});
assert(wetBankAnchors.some((anchor) => anchor.kind === 'bank-slick'), 'wet bank emits bank slick');
assert(wetBankAnchors.some((anchor) => anchor.kind === 'reed-edge'), 'wet bank with high wetness emits reed edge');
assert(wetBankAnchors.every((anchor) => anchor.family === 'wet-bank'), 'wet bank anchors use wet-bank family');

const routeAnchors = hillPlacementAffordanceAnchorsFor({
  ...base,
  law: 'route-wear-feather',
  seedKey: 'approach-clay|basin-meadow:route-wear:trail-accent',
  edgeKind: 'route-wear',
  anchor: 'trail-accent',
  growth: 0.18,
  routePressure: 0.94
});
assert(routeAnchors.some((anchor) => anchor.kind === 'scuffed-path'), 'route wear emits scuffed path anchor');
assert(routeAnchors.some((anchor) => anchor.kind === 'trail-fiber'), 'route wear emits trail fiber anchor');
assert(routeAnchors.every((anchor) => anchor.family === 'route-wear'), 'route anchors use route-wear family');

const crustAnchors = hillPlacementAffordanceAnchorsFor({
  ...base,
  law: 'dry-crust-chip',
  seedKey: 'basin-dust|rim-crust:dust-crust:scuff-line',
  edgeKind: 'dust-crust',
  anchor: 'scuff-line',
  wetness: 0.05,
  growth: 0.08,
  routePressure: 0.12
});
assert(crustAnchors.some((anchor) => anchor.kind === 'cracked-rim'), 'dry crust emits cracked rim');
assert(crustAnchors.some((anchor) => anchor.kind === 'pebble-chip'), 'dry crust emits pebble chip');
assert(crustAnchors.every((anchor) => anchor.family === 'dry-break'), 'dry crust anchors use dry-break family');

const stoneAnchors = hillPlacementAffordanceAnchorsFor({
  ...base,
  law: 'stone-break',
  seedKey: 'rim-crust|slope-moss:slope-break:stone-scatter',
  edgeKind: 'slope-break',
  anchor: 'stone-scatter',
  wetness: 0.12,
  growth: 0.18,
  slope: 0.82
});
assert(stoneAnchors.some((anchor) => anchor.kind === 'loose-slate'), 'stone break emits loose slate');
assert(stoneAnchors.some((anchor) => anchor.kind === 'pebble-chip'), 'stone break emits pebble chip');

const softAnchors = hillPlacementAffordanceAnchorsFor({
  ...base,
  law: 'soft-ground-fray',
  intensity: 0.7,
  seedKey: 'basin-dust|basin-meadow:meadow-dust:tuft-line',
  edgeKind: 'meadow-dust',
  anchor: 'tuft-line',
  wetness: 0.3,
  growth: 0.46,
  routePressure: 0.18
});
assert(softAnchors.some((anchor) => anchor.kind === 'edge-grass'), 'soft ground fray emits edge grass');
assert(softAnchors.every((anchor) => anchor.family === 'vegetation' || anchor.family === 'ground-fiber'), 'soft anchors stay ground/vegetation oriented');

const noneAnchors = hillPlacementAffordanceAnchorsFor({
  ...base,
  law: 'none',
  intensity: 1
});
assert(noneAnchors.length === 0, 'none law emits no placement anchors');

const weakAnchors = hillPlacementAffordanceAnchorsFor({
  ...base,
  intensity: 0.12
});
assert(weakAnchors.length === 0, 'weak law emits no placement anchors');

console.log('hill of hills placement affordance contracts ok');
