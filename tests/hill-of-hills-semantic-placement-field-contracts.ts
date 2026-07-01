import {
  createHillSemanticPlacementField,
  selectHillSemanticPlacementCandidates,
  type HillSemanticPlacementFieldInput
} from '../src/terrain/hill-of-hills-semantic-placement-field.js';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const baseInput: HillSemanticPlacementFieldInput = {
  schema: 'lerms.hill-of-hills.semantic-placement-input.v0',
  seedKey: 'placement-field-contract',
  candidates: [
    {
      sampleIndex: 12,
      source: 'meadow',
      position: { x: -1.2, y: 0.4, z: 2.8 },
      domain: { x: 0.22, z: 0.61 },
      normal: { x: 0.1, y: 0.96, z: -0.18 },
      tangent: { x: 0.88, z: 0.42 },
      proxyMaterial: 'basin-meadow',
      transitionLaw: 'soft-ground-fray',
      anchorFamily: 'ground-fiber',
      anchorKind: 'trail-fiber',
      growth: 0.58,
      wetness: 0.2,
      routePressure: 0.16,
      slope: 0.32,
      intensity: 0.62
    },
    {
      sampleIndex: 27,
      source: 'growth-edge',
      position: { x: 1.5, y: 0.75, z: 1.1 },
      domain: { x: 0.63, z: 0.52 },
      normal: { x: -0.22, y: 0.91, z: 0.18 },
      tangent: { x: -0.32, z: 0.95 },
      proxyMaterial: 'growth-lip',
      transitionLaw: 'growth-thicket',
      anchorFamily: 'vegetation',
      anchorKind: 'bushlet',
      growth: 0.94,
      wetness: 0.18,
      routePressure: 0.12,
      slope: 0.44,
      intensity: 0.9
    },
    {
      sampleIndex: 35,
      source: 'wet-route',
      position: { x: 0.4, y: 0.25, z: -0.7 },
      domain: { x: 0.51, z: 0.42 },
      normal: { x: 0.04, y: 0.98, z: 0.05 },
      tangent: { x: 1, z: 0 },
      proxyMaterial: 'basin-dust',
      transitionLaw: 'wet-bank-shadow',
      anchorFamily: 'wet-bank',
      anchorKind: 'reed-edge',
      growth: 0.06,
      wetness: 0.94,
      routePressure: 0.86,
      slope: 0.18,
      intensity: 0.82
    }
  ]
};

const field = createHillSemanticPlacementField(baseInput);
const repeat = createHillSemanticPlacementField(baseInput);
assert(JSON.stringify(repeat) === JSON.stringify(field), 'semantic placement field is deterministic for identical input');
assert(field.schema === 'lerms.hill-of-hills.semantic-placement-field.v0', 'field exposes stable schema identity');
assert(field.checksum !== 'none', 'field exposes a non-empty checksum');
assert(field.candidates.length >= 4, 'meadow and growth samples emit multiple placement candidates');
assert((field.countsByKind['meadow-fiber'] ?? 0) > 0, 'field counts meadow fiber candidates');
assert((field.countsByKind['edge-grass'] ?? 0) > 0, 'field counts edge grass candidates');
assert((field.countsBySource['growth-edge'] ?? 0) > 0, 'field counts growth-edge source candidates');
assert((field.countsBySource['wet-route'] ?? 0) === 0, 'wet route-only samples do not impersonate growth placement');

const first = field.candidates[0];
const sourceSample = baseInput.candidates.find((candidate) => candidate.sampleIndex === first.sampleIndex);
assert(sourceSample, 'candidate keeps source sample index');
assert(
  Math.abs(first.position.x - sourceSample.position.x) > 0.01 || Math.abs(first.position.z - sourceSample.position.z) > 0.01,
  'candidate position is jittered off the raw terrain sample point'
);
assert(Math.abs(first.localOffset.along) > 0 || Math.abs(first.localOffset.cross) > 0, 'candidate records non-zero local placement offset');
assert(first.rank >= 0 && first.rank <= 1, 'candidate rank is normalized');
assert(first.strength > 0 && first.strength <= 1, 'candidate strength is bounded');
assert(first.scale > 0 && first.scale <= 1.8, 'candidate scale is bounded');
assert(first.phase >= 0 && first.phase <= 1, 'candidate phase is normalized');

const lowDensity = selectHillSemanticPlacementCandidates(field.candidates, 0.28);
const highDensity = selectHillSemanticPlacementCandidates(field.candidates, 1);
assert(lowDensity.length > 0, 'low density still selects a sparse stable population');
assert(highDensity.length > lowDensity.length, 'higher density selects more candidates rather than only raising opacity');
for (const candidate of lowDensity) {
  assert(highDensity.some((other) => other.id === candidate.id), 'low density selection is a subset of high density selection');
}

const reseeded = createHillSemanticPlacementField({
  ...baseInput,
  seedKey: 'placement-field-contract-reseeded'
});
assert(reseeded.checksum !== field.checksum, 'seed key changes placement field checksum');
assert(reseeded.candidates[0]?.id !== field.candidates[0]?.id, 'seed key changes deterministic candidate identity');

console.log('hill of hills semantic placement field contracts ok');
