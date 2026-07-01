import type {
  HillOfHillsMaterialEdgeKind,
  HillOfHillsSurfaceAnchorKind
} from './hill-of-hills.js';
import type { HillMaterialTransitionLaw } from './hill-of-hills-transition-law.js';

export type HillPlacementAffordanceKind =
  | 'edge-grass'
  | 'bushlet'
  | 'root-clump'
  | 'bank-slick'
  | 'reed-edge'
  | 'sediment-streak'
  | 'pebble-chip'
  | 'cracked-rim'
  | 'loose-slate'
  | 'scuffed-path'
  | 'trail-fiber';

export type HillPlacementAffordanceFamily =
  | 'vegetation'
  | 'wet-bank'
  | 'dry-break'
  | 'stone-break'
  | 'route-wear'
  | 'ground-fiber';

export interface HillPlacementVec2 {
  x: number;
  z: number;
}

export interface HillPlacementLocalOffset {
  along: number;
  cross: number;
}

export interface HillPlacementAffordanceInput {
  law: HillMaterialTransitionLaw;
  intensity: number;
  seedKey: string;
  edgeKind: HillOfHillsMaterialEdgeKind;
  anchor: HillOfHillsSurfaceAnchorKind;
  midpoint: HillPlacementVec2;
  tangent: HillPlacementVec2;
  normal: HillPlacementVec2;
  wetness: number;
  growth: number;
  routePressure: number;
  slope: number;
}

export interface HillPlacementAffordanceAnchor {
  id: string;
  kind: HillPlacementAffordanceKind;
  family: HillPlacementAffordanceFamily;
  law: HillMaterialTransitionLaw;
  sourceEdgeKind: HillOfHillsMaterialEdgeKind;
  sourceAnchor: HillOfHillsSurfaceAnchorKind;
  position: HillPlacementVec2;
  direction: HillPlacementVec2;
  normal: HillPlacementVec2;
  localOffset: HillPlacementLocalOffset;
  scale: number;
  strength: number;
}

export function hillPlacementAffordanceAnchorsFor(input: HillPlacementAffordanceInput): readonly HillPlacementAffordanceAnchor[] {
  const intensity = clamp(input.intensity, 0, 1);
  if (input.law === 'none' || intensity < 0.2) {
    return [];
  }

  switch (input.law) {
    case 'growth-thicket':
      return [
        anchor(input, 'bushlet', 'vegetation', 0, 0.34, 1.1),
        anchor(input, 'edge-grass', 'vegetation', 1, -0.18, 0.72),
        ...(input.growth > 0.78 ? [anchor(input, 'root-clump', 'vegetation', 2, 0.08, 0.86)] : [])
      ];
    case 'vegetation-creep':
      return [
        anchor(input, 'edge-grass', 'vegetation', 0, 0.22, 0.68),
        ...(input.growth > 0.58 ? [anchor(input, 'bushlet', 'vegetation', 1, 0.42, 0.78)] : [])
      ];
    case 'wet-bank-shadow':
      return [
        anchor(input, 'bank-slick', 'wet-bank', 0, -0.26, 1),
        ...(input.wetness > 0.52 ? [anchor(input, 'reed-edge', 'wet-bank', 1, 0.18, 0.76)] : []),
        ...(input.wetness > 0.78 ? [anchor(input, 'sediment-streak', 'wet-bank', 2, -0.46, 0.88)] : [])
      ];
    case 'dry-crust-chip':
      return [
        anchor(input, 'cracked-rim', 'dry-break', 0, 0.18, 0.9),
        anchor(input, 'pebble-chip', 'dry-break', 1, -0.28, 0.62)
      ];
    case 'stone-break':
      return [
        anchor(input, 'loose-slate', 'stone-break', 0, 0.24, 0.96),
        anchor(input, 'pebble-chip', 'stone-break', 1, -0.22, 0.66)
      ];
    case 'route-wear-feather':
      return [
        anchor(input, 'scuffed-path', 'route-wear', 0, 0.04, 0.88),
        anchor(input, 'trail-fiber', 'route-wear', 1, -0.16, 0.58)
      ];
    case 'soft-ground-fray':
      return [
        ...(input.growth > 0.28 ? [anchor(input, 'edge-grass', 'vegetation', 0, 0.2, 0.58)] : []),
        anchor(input, 'trail-fiber', 'ground-fiber', 1, -0.12, 0.5)
      ];
  }
}

function anchor(
  input: HillPlacementAffordanceInput,
  kind: HillPlacementAffordanceKind,
  family: HillPlacementAffordanceFamily,
  ordinal: number,
  normalBias: number,
  scaleBase: number
): HillPlacementAffordanceAnchor {
  const intensity = clamp(input.intensity, 0, 1);
  const tangent = normalize(input.tangent);
  const normal = normalize(input.normal);
  const seed = unitHash(`${input.seedKey}:${kind}:${ordinal}`);
  const secondarySeed = unitHash(`${input.seedKey}:${kind}:${ordinal}:secondary`);
  const along = round((seed - 0.5) * (0.42 + intensity * 0.72));
  const cross = round(normalBias + (secondarySeed - 0.5) * (0.12 + intensity * 0.18));
  const strengthDriver = Math.max(input.wetness, input.growth, input.routePressure, input.slope * 0.72);
  const strength = round(clamp(intensity * 0.7 + strengthDriver * 0.3, 0, 1));
  const scale = round(clamp(scaleBase * (0.72 + secondarySeed * 0.42) * (0.68 + intensity * 0.46), 0.25, 1.8));

  return {
    id: `${input.seedKey}:${kind}:${ordinal}:${Math.round(seed * 1000000).toString(36)}`,
    kind,
    family,
    law: input.law,
    sourceEdgeKind: input.edgeKind,
    sourceAnchor: input.anchor,
    position: {
      x: round(input.midpoint.x + tangent.x * along + normal.x * cross),
      z: round(input.midpoint.z + tangent.z * along + normal.z * cross)
    },
    direction: tangent,
    normal,
    localOffset: { along, cross },
    scale,
    strength
  };
}

function normalize(vector: HillPlacementVec2): HillPlacementVec2 {
  const length = Math.hypot(vector.x, vector.z);
  if (length < 0.0001) {
    return { x: 1, z: 0 };
  }
  return {
    x: round(vector.x / length),
    z: round(vector.z / length)
  };
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
