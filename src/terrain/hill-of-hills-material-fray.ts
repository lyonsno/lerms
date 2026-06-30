import type { Vec3 } from '../contracts/first-vertical.js';
import type { HillOfHillsMaterialEdgeKind, HillOfHillsSurfaceAnchorKind } from './hill-of-hills.js';

export interface HillMaterialFrayInput {
  baseColor: Vec3;
  neighborColor: Vec3;
  edgeKind: HillOfHillsMaterialEdgeKind;
  anchor: HillOfHillsSurfaceAnchorKind;
  strength: number;
  dissolve: number;
  jitter: number;
  materialContrast: number;
}

export interface HillMaterialFrayColor {
  color: Vec3;
  mix: number;
}

export function hillMaterialFrayColor(input: HillMaterialFrayInput): HillMaterialFrayColor {
  const baseColor = roundColor(input.baseColor);
  const materialContrast = clamp(input.materialContrast, 0, 1);
  const strength = clamp(input.strength, 0, 1);
  const dissolve = clamp(input.dissolve, 0, 1);
  const jitter = clamp(input.jitter, 0, 1);

  if (
    input.edgeKind === 'none' ||
    input.anchor === 'none' ||
    strength <= 0.05 ||
    dissolve <= 0.05 ||
    materialContrast < 0.08
  ) {
    return {
      color: baseColor,
      mix: 0
    };
  }

  const noiseGate = 0.22 + dissolve * 0.82;
  if (jitter > noiseGate) {
    return {
      color: baseColor,
      mix: 0
    };
  }

  const coverage = clamp(dissolve * 0.84 + strength * 0.24 - jitter * 0.38, 0, 1);
  const kindScale = frayScaleFor(input.edgeKind, input.anchor);
  const mix = roundMix(smoothCap(coverage) * smoothCap(strength) * Math.sqrt(materialContrast) * kindScale);

  if (mix <= 0) {
    return {
      color: baseColor,
      mix: 0
    };
  }

  return {
    color: mixColor(input.baseColor, input.neighborColor, mix),
    mix
  };
}

function frayScaleFor(edgeKind: HillOfHillsMaterialEdgeKind, anchor: HillOfHillsSurfaceAnchorKind): number {
  if (edgeKind === 'damp-rim' || anchor === 'wet-rim') {
    return 0.68;
  }
  if (edgeKind === 'route-wear' || anchor === 'trail-accent') {
    return 0.52;
  }
  if (edgeKind === 'growth-cluster' || anchor === 'growth-cluster') {
    return 0.55;
  }
  if (edgeKind === 'slope-break' || anchor === 'stone-scatter') {
    return 0.48;
  }
  return 0.62;
}

function mixColor(a: Vec3, b: Vec3, mix: number): Vec3 {
  return [
    Math.round(a[0] + (b[0] - a[0]) * mix),
    Math.round(a[1] + (b[1] - a[1]) * mix),
    Math.round(a[2] + (b[2] - a[2]) * mix)
  ];
}

function roundColor(color: Vec3): Vec3 {
  return [Math.round(color[0]), Math.round(color[1]), Math.round(color[2])];
}

function roundMix(value: number): number {
  return Math.round(clamp(value, 0, 0.48) * 1000) / 1000;
}

function smoothCap(value: number): number {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
