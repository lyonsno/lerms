import {
  hillTerrainCellColorPatches,
  neutralHillGeometryColor
} from '../src/terrain/hill-of-hills-preview-shading.js';
import {
  hillPhaseMembershipAmount,
  type HillOfHillsPhaseInfluence
} from '../src/terrain/hill-of-hills.js';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function assertNear(actual: number, expected: number, message: string): void {
  assert(Math.abs(actual - expected) < 1e-6, `${message}: expected ${expected}, got ${actual}`);
}

const flatPatches = hillTerrainCellColorPatches([
  [80, 100, 120],
  [80, 100, 120],
  [80, 100, 120],
  [80, 100, 120]
]);
assert(flatPatches.length === 1, 'flat-color cells stay one cheap patch');
assert(
  flatPatches[0].color[0] === 80 && flatPatches[0].color[1] === 100 && flatPatches[0].color[2] === 120,
  'flat-color cell patch preserves its color'
);

const mixedPatches = hillTerrainCellColorPatches([
  [0, 0, 0],
  [200, 0, 0],
  [200, 200, 0],
  [0, 200, 0]
]);
assert(mixedPatches.length === 4, 'material-contrast cells subdivide instead of stamping one corner over the quad');
assert(
  new Set(mixedPatches.map((patch) => patch.color.join(','))).size === 4,
  'subdivided material cell carries a spatially varying bilinear color field'
);
assertNear(mixedPatches[0].color[0], 50, 'upper-left patch interpolates horizontal material color');
assertNear(mixedPatches[0].color[1], 50, 'upper-left patch interpolates vertical material color');
assertNear(mixedPatches[3].color[0], 150, 'lower-right patch interpolates horizontal material color');
assertNear(mixedPatches[3].color[1], 150, 'lower-right patch interpolates vertical material color');

const neutralA = neutralHillGeometryColor({
  height: 0.5,
  heightRange: { min: -1, max: 2 },
  normal: [0.15, 0.96, -0.12]
});
const neutralB = neutralHillGeometryColor({
  height: 0.5,
  heightRange: { min: -1, max: 2 },
  normal: [0.15, 0.96, -0.12]
});
assert(neutralA.join(',') === neutralB.join(','), 'neutral geometry shading is deterministic');
assert(
  neutralA.every((channel) => Number.isFinite(channel) && channel >= 0 && channel <= 255),
  'neutral geometry shading remains finite and bounded'
);

const mixedInfluence: HillOfHillsPhaseInfluence = {
  kind: 'hill_swell',
  amount: 0.74,
  trailAmount: 0,
  sideDitchAmount: 0,
  topologyAmount: 0.82,
  topologyHeightDelta: 0.1,
  topologyDeformation: 0.2,
  topologyVelocity: 0.04,
  topologyForce: 0.6,
  topologyGrossForce: 0.9,
  topologyOpposedForce: 0.3,
  topologyContention: 0.5,
  semanticMemberships: {
    hill_swell: 0.62,
    valley_deepen: 0.47,
    ridge_lift: 0.31
  }
};
assertNear(hillPhaseMembershipAmount(mixedInfluence, 'hill_swell'), 0.62, 'hill motion reads continuous membership');
assertNear(hillPhaseMembershipAmount(mixedInfluence, 'valley_deepen'), 0.47, 'valley motion survives a different categorical winner');
assertNear(hillPhaseMembershipAmount(mixedInfluence, 'ridge_lift'), 0.31, 'ridge motion survives a different categorical winner');
assertNear(hillPhaseMembershipAmount(mixedInfluence, 'basin_bloom'), 0, 'absent memberships remain silent');

console.log('hill of hills preview shading contracts ok');
