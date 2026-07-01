import type { HillOfHillsProxyMaterialKind } from './hill-of-hills.js';
import {
  hillGrowthMeadowShaderSketchFor,
  type HillGrowthMeadowShaderSketch
} from './hill-of-hills-growth-meadow-shader-sketch.js';
import type {
  HillPlacementAffordanceFamily,
  HillPlacementAffordanceKind
} from './hill-of-hills-placement-affordance.js';
import type { HillMaterialTransitionLaw } from './hill-of-hills-transition-law.js';

export const HILL_SEMANTIC_PLACEMENT_INPUT_SCHEMA = 'lerms.hill-of-hills.semantic-placement-input.v0' as const;
export const HILL_SEMANTIC_PLACEMENT_FIELD_SCHEMA = 'lerms.hill-of-hills.semantic-placement-field.v0' as const;

export type HillSemanticPlacementKind =
  | 'meadow-fiber'
  | 'meadow-tuft'
  | 'edge-grass'
  | 'bushlet'
  | 'root-clump';

export type HillSemanticPlacementSource =
  | 'meadow'
  | 'moss-slope'
  | 'growth-edge'
  | 'growth-thicket'
  | 'wet-route';

export interface HillSemanticPlacementVec2 {
  x: number;
  z: number;
}

export interface HillSemanticPlacementVec3 {
  x: number;
  y: number;
  z: number;
}

export interface HillSemanticPlacementLocalOffset {
  along: number;
  cross: number;
  lift: number;
}

export interface HillSemanticPlacementCandidateInput {
  sampleIndex: number;
  source: HillSemanticPlacementSource;
  position: HillSemanticPlacementVec3;
  domain: HillSemanticPlacementVec2;
  normal: HillSemanticPlacementVec3;
  tangent: HillSemanticPlacementVec2;
  proxyMaterial: HillOfHillsProxyMaterialKind;
  transitionLaw: HillMaterialTransitionLaw;
  anchorFamily: HillPlacementAffordanceFamily | 'none';
  anchorKind: HillPlacementAffordanceKind | 'none';
  growth: number;
  wetness: number;
  routePressure: number;
  slope: number;
  intensity: number;
}

export interface HillSemanticPlacementFieldInput {
  schema: typeof HILL_SEMANTIC_PLACEMENT_INPUT_SCHEMA;
  seedKey: string;
  candidates: readonly HillSemanticPlacementCandidateInput[];
}

export interface HillSemanticPlacementCandidate {
  id: string;
  kind: HillSemanticPlacementKind;
  source: HillSemanticPlacementSource;
  sampleIndex: number;
  seedKey: string;
  position: HillSemanticPlacementVec3;
  domain: HillSemanticPlacementVec2;
  direction: HillSemanticPlacementVec2;
  normal: HillSemanticPlacementVec3;
  localOffset: HillSemanticPlacementLocalOffset;
  scale: number;
  strength: number;
  rank: number;
  phase: number;
  sketch: HillGrowthMeadowShaderSketch;
}

export interface HillSemanticPlacementField {
  schema: typeof HILL_SEMANTIC_PLACEMENT_FIELD_SCHEMA;
  seedKey: string;
  checksum: string;
  candidateCount: number;
  countsByKind: Partial<Record<HillSemanticPlacementKind, number>>;
  countsBySource: Partial<Record<HillSemanticPlacementSource, number>>;
  candidates: readonly HillSemanticPlacementCandidate[];
}

interface CandidateSpec {
  kind: HillSemanticPlacementKind;
  ordinal: number;
  source: HillSemanticPlacementSource;
  normalBias: number;
  scaleBase: number;
  strengthBase: number;
}

export function createHillSemanticPlacementField(input: HillSemanticPlacementFieldInput): HillSemanticPlacementField {
  const candidates: HillSemanticPlacementCandidate[] = [];

  for (const candidateInput of input.candidates) {
    const sketch = hillGrowthMeadowShaderSketchFor({
      proxyMaterial: candidateInput.proxyMaterial,
      transitionLaw: candidateInput.transitionLaw,
      anchorFamily: candidateInput.anchorFamily,
      anchorKind: candidateInput.anchorKind,
      growth: candidateInput.growth,
      wetness: candidateInput.wetness,
      routePressure: candidateInput.routePressure,
      slope: candidateInput.slope,
      intensity: candidateInput.intensity,
      seedKey: `${input.seedKey}:${candidateInput.sampleIndex}:${candidateInput.source}`
    });
    if (!sketch.active) {
      continue;
    }

    for (const spec of candidateSpecsFor(candidateInput, sketch)) {
      candidates.push(placementCandidate(input.seedKey, candidateInput, sketch, spec));
    }
  }

  candidates.sort((a, b) => a.rank - b.rank || a.id.localeCompare(b.id));

  const countsByKind: Partial<Record<HillSemanticPlacementKind, number>> = {};
  const countsBySource: Partial<Record<HillSemanticPlacementSource, number>> = {};
  for (const candidate of candidates) {
    countsByKind[candidate.kind] = (countsByKind[candidate.kind] ?? 0) + 1;
    countsBySource[candidate.source] = (countsBySource[candidate.source] ?? 0) + 1;
  }

  return {
    schema: HILL_SEMANTIC_PLACEMENT_FIELD_SCHEMA,
    seedKey: input.seedKey,
    checksum: candidates.length > 0 ? checksumParts(candidates.map(candidateSignature)) : 'none',
    candidateCount: candidates.length,
    countsByKind,
    countsBySource,
    candidates
  };
}

export function selectHillSemanticPlacementCandidates(
  candidates: readonly HillSemanticPlacementCandidate[],
  density: number
): readonly HillSemanticPlacementCandidate[] {
  const threshold = clamp(density, 0, 1);
  if (threshold <= 0 || candidates.length === 0) {
    return [];
  }
  return candidates.filter((candidate) => candidate.rank <= threshold);
}

function candidateSpecsFor(
  input: HillSemanticPlacementCandidateInput,
  sketch: HillGrowthMeadowShaderSketch
): readonly CandidateSpec[] {
  const source = sourceFor(input);
  const specs: CandidateSpec[] = [];

  if (sketch.fiberDensity > 0.16) {
    specs.push({
      kind: 'meadow-fiber',
      ordinal: 0,
      source,
      normalBias: -0.1,
      scaleBase: 0.68,
      strengthBase: sketch.fiberDensity
    });
  }
  if (sketch.tuftDensity > 0.18) {
    specs.push({
      kind: 'meadow-tuft',
      ordinal: 1,
      source,
      normalBias: 0.12,
      scaleBase: 0.78,
      strengthBase: sketch.tuftDensity
    });
  }
  if (input.anchorFamily === 'vegetation' || input.transitionLaw === 'vegetation-creep') {
    specs.push({
      kind: 'edge-grass',
      ordinal: 2,
      source: input.source === 'meadow' ? 'growth-edge' : source,
      normalBias: 0.26,
      scaleBase: 0.72,
      strengthBase: Math.max(sketch.tuftDensity, sketch.edgeThickening)
    });
  }
  if (input.anchorKind === 'bushlet' || input.transitionLaw === 'growth-thicket') {
    specs.push({
      kind: 'bushlet',
      ordinal: 3,
      source: 'growth-thicket',
      normalBias: 0.34,
      scaleBase: 1.05,
      strengthBase: Math.max(sketch.tuftDensity, sketch.anchorBoost)
    });
  }
  if (input.anchorKind === 'root-clump' && input.growth > 0.72) {
    specs.push({
      kind: 'root-clump',
      ordinal: 4,
      source: 'growth-thicket',
      normalBias: -0.24,
      scaleBase: 0.92,
      strengthBase: Math.max(sketch.edgeThickening, input.growth)
    });
  }

  return specs;
}

function placementCandidate(
  seedKey: string,
  input: HillSemanticPlacementCandidateInput,
  sketch: HillGrowthMeadowShaderSketch,
  spec: CandidateSpec
): HillSemanticPlacementCandidate {
  const direction = normalize2(input.tangent);
  const cross = placementCrossVector(input, direction);
  const normal = normalize3(input.normal);
  const key = `${seedKey}:${input.sampleIndex}:${spec.kind}:${spec.ordinal}:${spec.source}`;
  const primary = unitHash(`${key}:primary`);
  const secondary = unitHash(`${key}:secondary`);
  const phase = round(unitHash(`${key}:phase`));
  const along = round((primary - 0.5) * (0.16 + spec.scaleBase * 0.34 + sketch.fiberDensity * 0.22));
  const crossOffset = round(spec.normalBias + (secondary - 0.5) * (0.12 + sketch.tuftDensity * 0.26));
  const lift = round(0.045 + sketch.edgeThickening * 0.035 + sketch.tuftDensity * 0.025);
  const strength = round(clamp(spec.strengthBase * 0.78 + sketch.anchorBoost * 0.18 + input.growth * 0.12, 0, 1));
  const scale = round(clamp(spec.scaleBase * (0.76 + secondary * 0.42) * (0.72 + strength * 0.46), 0.22, 1.8));
  const rawRank = unitHash(`${key}:rank`);
  const rank = round(clamp(rawRank * 0.58 + (1 - strength) * 0.28 - sketch.anchorBoost * 0.12, 0.02, 0.98));
  const position = {
    x: round(input.position.x + direction.x * along + cross.x * crossOffset),
    y: round(input.position.y + lift),
    z: round(input.position.z + direction.z * along + cross.z * crossOffset)
  };

  return {
    id: `${key}:${Math.round(unitHash(`${key}:id`) * 1000000).toString(36)}`,
    kind: spec.kind,
    source: spec.source,
    sampleIndex: input.sampleIndex,
    seedKey: key,
    position,
    domain: {
      x: round(clamp(input.domain.x + direction.x * along * 0.04 + cross.x * crossOffset * 0.04, 0, 1)),
      z: round(clamp(input.domain.z + direction.z * along * 0.04 + cross.z * crossOffset * 0.04, 0, 1))
    },
    direction,
    normal,
    localOffset: { along, cross: crossOffset, lift },
    scale,
    strength,
    rank,
    phase,
    sketch
  };
}

function sourceFor(input: HillSemanticPlacementCandidateInput): HillSemanticPlacementSource {
  if (input.source !== 'meadow') {
    return input.source;
  }
  if (input.transitionLaw === 'growth-thicket') {
    return 'growth-thicket';
  }
  if (input.proxyMaterial === 'slope-moss') {
    return 'moss-slope';
  }
  if (input.proxyMaterial === 'growth-lip' || input.transitionLaw === 'vegetation-creep') {
    return 'growth-edge';
  }
  return input.source;
}

function placementCrossVector(
  input: HillSemanticPlacementCandidateInput,
  direction: HillSemanticPlacementVec2
): HillSemanticPlacementVec2 {
  const normalProjection = normalize2({ x: input.normal.x, z: input.normal.z });
  if (Math.abs(normalProjection.x) + Math.abs(normalProjection.z) > 0.001) {
    return normalProjection;
  }
  return { x: round(-direction.z), z: round(direction.x) };
}

function candidateSignature(candidate: HillSemanticPlacementCandidate): string {
  return [
    candidate.id,
    candidate.kind,
    candidate.source,
    candidate.sampleIndex,
    candidate.position.x.toFixed(3),
    candidate.position.y.toFixed(3),
    candidate.position.z.toFixed(3),
    candidate.scale.toFixed(3),
    candidate.strength.toFixed(3),
    candidate.rank.toFixed(3),
    candidate.phase.toFixed(3)
  ].join(':');
}

function checksumParts(parts: readonly string[]): string {
  let hash = 2166136261;
  for (const part of parts) {
    for (let index = 0; index < part.length; index += 1) {
      hash ^= part.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function unitHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

function normalize2(vector: HillSemanticPlacementVec2): HillSemanticPlacementVec2 {
  const length = Math.hypot(vector.x, vector.z);
  if (length < 0.0001) {
    return { x: 1, z: 0 };
  }
  return {
    x: round(vector.x / length),
    z: round(vector.z / length)
  };
}

function normalize3(vector: HillSemanticPlacementVec3): HillSemanticPlacementVec3 {
  const length = Math.hypot(vector.x, vector.y, vector.z);
  if (length < 0.0001) {
    return { x: 0, y: 1, z: 0 };
  }
  return {
    x: round(vector.x / length),
    y: round(vector.y / length),
    z: round(vector.z / length)
  };
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
