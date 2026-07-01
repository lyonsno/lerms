import type { HillOfHillsProxyMaterialKind } from './hill-of-hills.js';
import type {
  HillPlacementAffordanceFamily,
  HillPlacementAffordanceKind
} from './hill-of-hills-placement-affordance.js';
import type { HillMaterialTransitionLaw } from './hill-of-hills-transition-law.js';

export type HillGrowthMeadowShaderAssetNeed = 'none' | 'generic-growth-categories';

export interface HillGrowthMeadowShaderSketchInput {
  proxyMaterial: HillOfHillsProxyMaterialKind;
  transitionLaw: HillMaterialTransitionLaw;
  anchorFamily: HillPlacementAffordanceFamily | 'none';
  anchorKind: HillPlacementAffordanceKind | 'none';
  growth: number;
  wetness: number;
  routePressure: number;
  slope: number;
  intensity: number;
  seedKey: string;
}

export interface HillGrowthMeadowShaderSketch {
  active: boolean;
  tintRgb: readonly [number, number, number];
  tintAlpha: number;
  fiberDensity: number;
  tuftDensity: number;
  shimmerPhase: number;
  edgeThickening: number;
  anchorBoost: number;
  assetOrderRequested: boolean;
  assetNeed: HillGrowthMeadowShaderAssetNeed;
}

export function hillGrowthMeadowShaderSketchFor(input: HillGrowthMeadowShaderSketchInput): HillGrowthMeadowShaderSketch {
  const growth = clamp(input.growth, 0, 1);
  const wetness = clamp(input.wetness, 0, 1);
  const routePressure = clamp(input.routePressure, 0, 1);
  const slope = clamp(input.slope, 0, 1);
  const intensity = clamp(input.intensity, 0, 1);
  const materialAffinity = growthMaterialAffinity(input.proxyMaterial);
  const lawAffinity = growthLawAffinity(input.transitionLaw);
  const anchorBoost = growthAnchorBoost(input.anchorFamily, input.anchorKind);
  const activeScore = clamp(
    growth * 0.5 +
      materialAffinity * 0.25 +
      lawAffinity * 0.18 +
      anchorBoost * 0.24 +
      intensity * 0.08 -
      Math.max(wetness - growth, 0) * 0.12 -
      Math.max(routePressure - growth, 0) * 0.06,
    0,
    1
  );
  const active = activeScore >= 0.24;
  const shimmerPhase = round(unitHash(`${input.seedKey}:shimmer`));
  const fiberDensity = active
    ? round(clamp(activeScore * 0.82 + slope * 0.08 + lawAffinity * 0.1, 0, 1))
    : round(clamp(activeScore * 0.18, 0, 0.14));
  const tuftDensity = active
    ? round(clamp(activeScore * 0.52 + anchorBoost * 0.32 + materialAffinity * 0.08, 0, 1))
    : round(clamp(activeScore * 0.12, 0, 0.1));
  const edgeThickening = active
    ? round(clamp(intensity * 0.16 + anchorBoost * 0.34 + lawAffinity * 0.28 + materialAffinity * 0.08, 0, 1))
    : 0;
  const tintAlpha = active ? round(clamp(activeScore * 0.13 + intensity * 0.04, 0.035, 0.18)) : 0;
  const assetNeed =
    active &&
    (input.transitionLaw === 'growth-thicket' ||
      input.proxyMaterial === 'growth-lip' ||
      (input.anchorFamily === 'vegetation' && input.anchorKind !== 'edge-grass'))
      ? 'generic-growth-categories'
      : 'none';

  return {
    active,
    tintRgb: tintForMaterial(input.proxyMaterial, activeScore),
    tintAlpha,
    fiberDensity,
    tuftDensity,
    shimmerPhase,
    edgeThickening,
    anchorBoost: round(anchorBoost),
    assetOrderRequested: false,
    assetNeed
  };
}

function growthMaterialAffinity(material: HillOfHillsProxyMaterialKind): number {
  switch (material) {
    case 'growth-lip':
      return 0.82;
    case 'basin-meadow':
      return 0.56;
    case 'slope-moss':
      return 0.38;
    case 'crown-warmth':
      return 0.2;
    case 'approach-clay':
      return 0.12;
    case 'basin-dust':
    case 'basin-pool':
    case 'ditch-shadow':
    case 'rim-crust':
      return 0;
  }
}

function growthLawAffinity(law: HillMaterialTransitionLaw): number {
  switch (law) {
    case 'growth-thicket':
      return 0.88;
    case 'vegetation-creep':
      return 0.68;
    case 'soft-ground-fray':
      return 0.32;
    case 'route-wear-feather':
      return 0.08;
    case 'wet-bank-shadow':
    case 'dry-crust-chip':
    case 'stone-break':
    case 'none':
      return 0;
  }
}

function growthAnchorBoost(
  family: HillPlacementAffordanceFamily | 'none',
  kind: HillPlacementAffordanceKind | 'none'
): number {
  if (family === 'vegetation') {
    switch (kind) {
      case 'root-clump':
        return 0.52;
      case 'bushlet':
        return 0.42;
      case 'edge-grass':
        return 0.3;
      default:
        return 0.24;
    }
  }
  if (family === 'ground-fiber') {
    return kind === 'trail-fiber' ? 0.08 : 0.04;
  }
  return 0;
}

function tintForMaterial(
  material: HillOfHillsProxyMaterialKind,
  activeScore: number
): readonly [number, number, number] {
  switch (material) {
    case 'growth-lip':
      return mixRgb([64, 144, 72], [28, 92, 46], activeScore * 0.42);
    case 'basin-meadow':
      return mixRgb([122, 154, 88], [68, 130, 66], activeScore * 0.32);
    case 'slope-moss':
      return mixRgb([101, 146, 88], [54, 116, 62], activeScore * 0.28);
    default:
      return mixRgb([126, 146, 88], [75, 116, 64], activeScore * 0.24);
  }
}

function mixRgb(
  a: readonly [number, number, number],
  b: readonly [number, number, number],
  amount: number
): readonly [number, number, number] {
  const t = clamp(amount, 0, 1);
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t)
  ];
}

function unitHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
