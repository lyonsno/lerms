import { hillMaterialTransitionPreviewStyleFor } from '../src/terrain/hill-of-hills-transition-preview-style.js';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const none = hillMaterialTransitionPreviewStyleFor({
  law: 'none',
  intensity: 0.9,
  averageColor: [120, 140, 95]
});
assert(none.motif === 'silent', 'none law stays visually silent');
assert(none.alpha === 0, 'none law carries zero alpha');
assert(none.fragmentLength === 0, 'none law has no fragment length');

const softGround = hillMaterialTransitionPreviewStyleFor({
  law: 'soft-ground-fray',
  intensity: 0.42,
  averageColor: [124, 148, 95]
});
assert(softGround.motif === 'soft-fiber', 'soft ground fray resolves to soft fiber motif');
assert(softGround.strokeRgb[0] === 124 && softGround.strokeRgb[1] === 148, 'soft ground fray borrows the caller average color');
assert(softGround.alpha > 0 && softGround.alpha < 0.22, 'soft ground fray stays quiet');

const wetBank = hillMaterialTransitionPreviewStyleFor({
  law: 'wet-bank-shadow',
  intensity: 0.72,
  averageColor: [95, 122, 104]
});
assert(wetBank.motif === 'wet-bank-smear', 'wet bank shadow resolves to bank smear motif');
assert(wetBank.strokeRgb[2] > wetBank.strokeRgb[0], 'wet bank smear is blue-shadow weighted');
assert(wetBank.fragmentLength > softGround.fragmentLength, 'wet bank smear draws longer low fragments than soft fiber');
assert(wetBank.normalBias < 0, 'wet bank smear hugs the low/bank side of a boundary');

const routeWear = hillMaterialTransitionPreviewStyleFor({
  law: 'route-wear-feather',
  intensity: 0.66,
  averageColor: [128, 132, 108]
});
assert(routeWear.motif === 'route-feather', 'route wear resolves to route feather motif');
assert(routeWear.strokeRgb[0] > routeWear.strokeRgb[2], 'route feather is pale warm rubbed ground');
assert(routeWear.lineWidth < wetBank.lineWidth, 'route feather is thinner than wet bank smear');

const growth = hillMaterialTransitionPreviewStyleFor({
  law: 'growth-thicket',
  intensity: 0.78,
  averageColor: [88, 150, 85]
});
assert(growth.motif === 'growth-cluster', 'growth thicket resolves to clustered growth motif');
assert(growth.clusterCount >= 3, 'growth thicket asks the renderer for clustered dots');
assert(growth.fillAlpha > 0, 'growth thicket exposes fill dots');

const vegetation = hillMaterialTransitionPreviewStyleFor({
  law: 'vegetation-creep',
  intensity: 0.7,
  averageColor: [90, 145, 83]
});
assert(vegetation.motif === 'creeping-vegetation', 'vegetation creep resolves to creeping vegetation motif');
assert(vegetation.clusterCount > 0 && vegetation.clusterCount < growth.clusterCount, 'vegetation creep clusters less heavily than thicket');

const crust = hillMaterialTransitionPreviewStyleFor({
  law: 'dry-crust-chip',
  intensity: 0.64,
  averageColor: [150, 135, 92]
});
assert(crust.motif === 'dry-crust-chip', 'dry crust resolves to chipped crust motif');
assert(crust.strokeRgb[0] > crust.strokeRgb[1] && crust.strokeRgb[1] > crust.strokeRgb[2], 'dry crust is ochre chipped');
assert(crust.segmentCount >= 2, 'dry crust asks for chipped broken segments');

const stone = hillMaterialTransitionPreviewStyleFor({
  law: 'stone-break',
  intensity: 0.69,
  averageColor: [112, 122, 106]
});
assert(stone.motif === 'stone-fracture', 'stone break resolves to fracture motif');
assert(stone.strokeRgb[0] === stone.strokeRgb[1] || Math.abs(stone.strokeRgb[0] - stone.strokeRgb[1]) < 12, 'stone fracture is grey balanced');
assert(stone.segmentCount > crust.segmentCount, 'stone fracture breaks into more segments than dry crust');
assert(stone.crossOffset > routeWear.crossOffset, 'stone fracture crosses the boundary harder than route feather');

console.log('hill of hills transition preview style contracts ok');
