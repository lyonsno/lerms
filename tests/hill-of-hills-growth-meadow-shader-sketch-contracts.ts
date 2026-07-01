import {
  hillGrowthMeadowShaderSketchFor,
  type HillGrowthMeadowShaderSketchInput
} from '../src/terrain/hill-of-hills-growth-meadow-shader-sketch.js';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const meadowBase: HillGrowthMeadowShaderSketchInput = {
  proxyMaterial: 'basin-meadow',
  transitionLaw: 'soft-ground-fray',
  anchorFamily: 'ground-fiber',
  anchorKind: 'trail-fiber',
  growth: 0.5,
  wetness: 0.24,
  routePressure: 0.18,
  slope: 0.36,
  intensity: 0.58,
  seedKey: 'basin-meadow:soft-ground-fray:meadow-0'
};

const meadow = hillGrowthMeadowShaderSketchFor(meadowBase);
assert(meadow.active, 'basin meadow with growth activates the shader sketch');
assert(meadow.fiberDensity > 0.34, 'meadow growth gets visible fiber density');
assert(meadow.tuftDensity > 0.18, 'meadow growth gets visible tuft density');
assert(meadow.tintAlpha > 0.05 && meadow.tintAlpha < 0.2, 'meadow tint is visible but still a proxy layer');
assert(meadow.assetOrderRequested === false, 'first shader sketch does not request concrete assets');
assert(meadow.assetNeed === 'none', 'plain meadow does not claim a concrete asset need');

const growthLip = hillGrowthMeadowShaderSketchFor({
  ...meadowBase,
  proxyMaterial: 'growth-lip',
  transitionLaw: 'growth-thicket',
  anchorFamily: 'vegetation',
  anchorKind: 'bushlet',
  growth: 0.92,
  wetness: 0.18,
  routePressure: 0.12,
  intensity: 0.86,
  seedKey: 'growth-lip:growth-thicket:bushlet'
});
assert(growthLip.active, 'growth lip activates the shader sketch');
assert(growthLip.fiberDensity > meadow.fiberDensity, 'growth thicket raises fiber density above meadow');
assert(growthLip.tuftDensity > meadow.tuftDensity, 'growth thicket raises tuft density above meadow');
assert(growthLip.edgeThickening > meadow.edgeThickening, 'growth thicket thickens edges above meadow');
assert(growthLip.anchorBoost > 0.2, 'vegetation anchors amplify growth sketch controls');
assert(growthLip.assetOrderRequested === false, 'generic growth categories still do not become an asset order');
assert(growthLip.assetNeed === 'generic-growth-categories', 'strong growth records only generic categories for the future asset order');

const wetRouteOnly = hillGrowthMeadowShaderSketchFor({
  ...meadowBase,
  proxyMaterial: 'basin-dust',
  transitionLaw: 'wet-bank-shadow',
  anchorFamily: 'wet-bank',
  anchorKind: 'reed-edge',
  growth: 0.08,
  wetness: 0.95,
  routePressure: 0.9,
  intensity: 0.88,
  seedKey: 'basin-dust:wet-bank-shadow:wet-route-only'
});
assert(!wetRouteOnly.active, 'wetness and route pressure alone do not impersonate meadow growth');
assert(wetRouteOnly.fiberDensity < meadow.fiberDensity * 0.45, 'wet route-only case keeps growth fibers low');
assert(wetRouteOnly.tuftDensity < meadow.tuftDensity * 0.45, 'wet route-only case keeps growth tufts low');
assert(wetRouteOnly.assetNeed === 'none', 'non-growth wet route case emits no asset need');

const vegetationAnchor = hillGrowthMeadowShaderSketchFor({
  ...meadowBase,
  anchorFamily: 'vegetation',
  anchorKind: 'edge-grass',
  seedKey: 'basin-meadow:soft-ground-fray:edge-grass'
});
assert(vegetationAnchor.tuftDensity > meadow.tuftDensity, 'edge grass anchors amplify meadow tuft density');
assert(vegetationAnchor.edgeThickening >= meadow.edgeThickening, 'edge grass anchors do not reduce edge thickening');

const repeatedGrowthLip = hillGrowthMeadowShaderSketchFor({
  ...meadowBase,
  proxyMaterial: 'growth-lip',
  transitionLaw: 'growth-thicket',
  anchorFamily: 'vegetation',
  anchorKind: 'bushlet',
  growth: 0.92,
  wetness: 0.18,
  routePressure: 0.12,
  intensity: 0.86,
  seedKey: 'growth-lip:growth-thicket:bushlet'
});
assert(JSON.stringify(repeatedGrowthLip) === JSON.stringify(growthLip), 'growth shader sketch is deterministic for identical input');

const reseededGrowthLip = hillGrowthMeadowShaderSketchFor({
  ...meadowBase,
  proxyMaterial: 'growth-lip',
  transitionLaw: 'growth-thicket',
  anchorFamily: 'vegetation',
  anchorKind: 'bushlet',
  growth: 0.92,
  wetness: 0.18,
  routePressure: 0.12,
  intensity: 0.86,
  seedKey: 'growth-lip:growth-thicket:bushlet:alternate'
});
assert(reseededGrowthLip.shimmerPhase !== growthLip.shimmerPhase, 'seed key changes shimmer phase');
assert(growthLip.shimmerPhase >= 0 && growthLip.shimmerPhase <= 1, 'shimmer phase stays normalized');

console.log('hill of hills growth meadow shader sketch contracts ok');
