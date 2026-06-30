import {
  hillMaterialFrayColor,
  type HillMaterialFrayInput
} from '../src/terrain/hill-of-hills-material-fray.js';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function colorDistance(a: readonly number[], b: readonly number[]): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

const baseInput: HillMaterialFrayInput = {
  baseColor: [92, 136, 76],
  neighborColor: [151, 127, 74],
  edgeKind: 'meadow-dust',
  anchor: 'tuft-line',
  strength: 0.7,
  dissolve: 0.72,
  jitter: 0.22,
  materialContrast: 0.48
};

const noEdge = hillMaterialFrayColor({
  ...baseInput,
  edgeKind: 'none',
  anchor: 'none',
  strength: 0,
  dissolve: 0
});
assert(noEdge.mix === 0, 'no-edge material fray does not mix color');
assert(colorDistance(noEdge.color, baseInput.baseColor) === 0, 'no-edge material fray preserves base color');

const frayed = hillMaterialFrayColor(baseInput);
assert(frayed.mix > 0.08, 'edge material fray mixes visible neighbor color');
assert(frayed.mix < 0.5, 'edge material fray stays controlled rather than mush-blending');
assert(colorDistance(frayed.color, baseInput.baseColor) > 4, 'edge material fray visibly changes base material color');
assert(
  colorDistance(frayed.color, baseInput.neighborColor) < colorDistance(baseInput.baseColor, baseInput.neighborColor),
  'edge material fray moves color toward neighbor material'
);

const hiddenByNoise = hillMaterialFrayColor({
  ...baseInput,
  jitter: 0.98
});
assert(hiddenByNoise.mix === 0, 'high noise gate leaves this sample unfrayed');
assert(colorDistance(hiddenByNoise.color, baseInput.baseColor) === 0, 'noise-gated material fray preserves base color');

const weakContrast = hillMaterialFrayColor({
  ...baseInput,
  materialContrast: 0.03
});
assert(weakContrast.mix === 0, 'low material contrast does not fray same-material boundaries');

const stronger = hillMaterialFrayColor({
  ...baseInput,
  strength: 0.95,
  dissolve: 0.96,
  jitter: 0.12
});
assert(stronger.mix > frayed.mix, 'stronger edge dissolve increases material fray mix');
assert(
  colorDistance(stronger.color, baseInput.baseColor) > colorDistance(frayed.color, baseInput.baseColor),
  'stronger edge dissolve moves farther from the hard base material'
);

const repeat = hillMaterialFrayColor(baseInput);
assert(JSON.stringify(repeat) === JSON.stringify(frayed), 'material fray color is deterministic for identical input');

console.log('hill of hills material fray contracts ok');
