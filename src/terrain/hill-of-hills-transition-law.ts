import type {
  HillOfHillsMaterialEdgeKind,
  HillOfHillsProxyMaterialKind,
  HillOfHillsSurfaceAnchorKind
} from './hill-of-hills.js';

export type HillMaterialTransitionLaw =
  | 'none'
  | 'soft-ground-fray'
  | 'vegetation-creep'
  | 'wet-bank-shadow'
  | 'dry-crust-chip'
  | 'route-wear-feather'
  | 'stone-break'
  | 'growth-thicket';

export interface HillMaterialTransitionInput {
  fromMaterial: HillOfHillsProxyMaterialKind;
  toMaterial: HillOfHillsProxyMaterialKind;
  edgeKind: HillOfHillsMaterialEdgeKind;
  anchor: HillOfHillsSurfaceAnchorKind;
  strength: number;
  dissolve: number;
  wetness: number;
  growth: number;
  routePressure: number;
  materialContrast: number;
}

export interface HillMaterialTransitionPair {
  a: HillOfHillsProxyMaterialKind;
  b: HillOfHillsProxyMaterialKind;
  key: string;
}

export interface HillMaterialTransitionDescriptor {
  law: HillMaterialTransitionLaw;
  intensity: number;
  pair: HillMaterialTransitionPair;
  seedKey: string;
}

export function normalizeHillMaterialTransitionPair(
  fromMaterial: HillOfHillsProxyMaterialKind,
  toMaterial: HillOfHillsProxyMaterialKind
): HillMaterialTransitionPair {
  const ordered = [fromMaterial, toMaterial].sort() as [HillOfHillsProxyMaterialKind, HillOfHillsProxyMaterialKind];
  return {
    a: ordered[0],
    b: ordered[1],
    key: `${ordered[0]}|${ordered[1]}`
  };
}

export function hillMaterialTransitionLawFor(input: HillMaterialTransitionInput): HillMaterialTransitionDescriptor {
  const pair = normalizeHillMaterialTransitionPair(input.fromMaterial, input.toMaterial);
  const strength = clamp(input.strength, 0, 1);
  const dissolve = clamp(input.dissolve, 0, 1);
  const materialContrast = clamp(input.materialContrast, 0, 1);

  if (
    input.fromMaterial === input.toMaterial ||
    input.edgeKind === 'none' ||
    input.anchor === 'none' ||
    strength < 0.08 ||
    dissolve < 0.08 ||
    materialContrast < 0.06
  ) {
    return descriptor('none', 0, pair, input);
  }

  const wetness = clamp(input.wetness, 0, 1);
  const growth = clamp(input.growth, 0, 1);
  const routePressure = clamp(input.routePressure, 0, 1);
  const baseIntensity = clamp(
    strength * 0.36 + dissolve * 0.36 + materialContrast * 0.18 + Math.max(wetness, growth, routePressure) * 0.1,
    0,
    1
  );

  if (input.edgeKind === 'damp-rim' || input.anchor === 'wet-rim' || hasMaterial(pair, 'ditch-shadow')) {
    return descriptor('wet-bank-shadow', clamp(baseIntensity + wetness * 0.22, 0, 1), pair, input);
  }

  if (input.edgeKind === 'route-wear' || input.anchor === 'trail-accent') {
    return descriptor('route-wear-feather', clamp(baseIntensity + routePressure * 0.2, 0, 1), pair, input);
  }

  if (input.edgeKind === 'growth-cluster' || input.anchor === 'growth-cluster') {
    return descriptor('growth-thicket', clamp(baseIntensity + growth * 0.22, 0, 1), pair, input);
  }

  if (input.edgeKind === 'meadow-growth' || hasMaterial(pair, 'growth-lip')) {
    return descriptor('vegetation-creep', clamp(baseIntensity + growth * 0.16, 0, 1), pair, input);
  }

  if (input.edgeKind === 'slope-break' || input.anchor === 'stone-scatter') {
    return descriptor('stone-break', baseIntensity, pair, input);
  }

  if (input.edgeKind === 'dust-crust' || hasMaterial(pair, 'rim-crust')) {
    return descriptor('dry-crust-chip', clamp(baseIntensity + (1 - wetness) * 0.12, 0, 1), pair, input);
  }

  if (input.edgeKind === 'meadow-dust' || hasMaterial(pair, 'basin-dust') || hasMaterial(pair, 'basin-meadow')) {
    return descriptor('soft-ground-fray', baseIntensity, pair, input);
  }

  return descriptor('soft-ground-fray', baseIntensity, pair, input);
}

function descriptor(
  law: HillMaterialTransitionLaw,
  intensity: number,
  pair: HillMaterialTransitionPair,
  input: HillMaterialTransitionInput
): HillMaterialTransitionDescriptor {
  return {
    law,
    intensity: roundIntensity(intensity),
    pair,
    seedKey: `${pair.key}:${input.edgeKind}:${input.anchor}`
  };
}

function hasMaterial(pair: HillMaterialTransitionPair, material: HillOfHillsProxyMaterialKind): boolean {
  return pair.a === material || pair.b === material;
}

function roundIntensity(value: number): number {
  return Math.round(clamp(value, 0, 1) * 1000) / 1000;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
