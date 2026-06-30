import type { HillMaterialTransitionLaw } from './hill-of-hills-transition-law.js';

export type HillMaterialTransitionPreviewMotif =
  | 'silent'
  | 'soft-fiber'
  | 'creeping-vegetation'
  | 'wet-bank-smear'
  | 'dry-crust-chip'
  | 'route-feather'
  | 'stone-fracture'
  | 'growth-cluster';

export interface HillMaterialTransitionPreviewStyleInput {
  law: HillMaterialTransitionLaw;
  intensity: number;
  averageColor: readonly [number, number, number];
}

export interface HillMaterialTransitionPreviewStyle {
  motif: HillMaterialTransitionPreviewMotif;
  strokeRgb: readonly [number, number, number];
  fillRgb?: readonly [number, number, number];
  alpha: number;
  fillAlpha: number;
  lineWidth: number;
  fragmentLength: number;
  crossOffset: number;
  curveBias: number;
  normalBias: number;
  clusterCount: number;
  segmentCount: number;
}

export function hillMaterialTransitionPreviewStyleFor(
  input: HillMaterialTransitionPreviewStyleInput
): HillMaterialTransitionPreviewStyle {
  const intensity = clamp(input.intensity, 0, 1);

  switch (input.law) {
    case 'none':
      return style('silent', [0, 0, 0], intensity, {
        alpha: 0,
        fillAlpha: 0,
        lineWidth: 0,
        fragmentLength: 0,
        crossOffset: 0,
        curveBias: 0,
        normalBias: 0,
        clusterCount: 0,
        segmentCount: 0
      });
    case 'soft-ground-fray':
      return style('soft-fiber', input.averageColor, intensity, {
        alpha: 0.055 + intensity * 0.18,
        lineWidth: 0.65 + intensity * 0.95,
        fragmentLength: 3.5 + intensity * 8,
        crossOffset: 1.2 + intensity * 2.4,
        curveBias: 0.16,
        normalBias: 0,
        segmentCount: 1
      });
    case 'wet-bank-shadow':
      return style('wet-bank-smear', [38, 51, 88], intensity, {
        alpha: 0.11 + intensity * 0.24,
        lineWidth: 1.25 + intensity * 1.8,
        fragmentLength: 7 + intensity * 13,
        crossOffset: 0.8 + intensity * 2.5,
        curveBias: 0.08,
        normalBias: -0.85,
        segmentCount: 1
      });
    case 'route-wear-feather':
      return style('route-feather', [214, 196, 128], intensity, {
        alpha: 0.085 + intensity * 0.2,
        lineWidth: 0.7 + intensity * 0.9,
        fragmentLength: 5.5 + intensity * 10,
        crossOffset: 0.7 + intensity * 1.8,
        curveBias: 0.22,
        normalBias: 0.1,
        segmentCount: 1
      });
    case 'growth-thicket':
      return style('growth-cluster', [43, 124, 64], intensity, {
        fillRgb: [34, 112, 55],
        alpha: 0.1 + intensity * 0.24,
        fillAlpha: 0.085 + intensity * 0.22,
        lineWidth: 1 + intensity * 1.5,
        fragmentLength: 4 + intensity * 8,
        crossOffset: 1.4 + intensity * 4,
        curveBias: 0.42,
        normalBias: 0.25,
        clusterCount: 3 + Math.round(intensity * 3),
        segmentCount: 1
      });
    case 'vegetation-creep':
      return style('creeping-vegetation', [58, 139, 73], intensity, {
        fillRgb: [48, 126, 64],
        alpha: 0.075 + intensity * 0.2,
        fillAlpha: 0.035 + intensity * 0.11,
        lineWidth: 0.8 + intensity * 1.15,
        fragmentLength: 5 + intensity * 9,
        crossOffset: 1.2 + intensity * 3.2,
        curveBias: 0.36,
        normalBias: 0.18,
        clusterCount: 1 + Math.round(intensity * 2),
        segmentCount: 1
      });
    case 'dry-crust-chip':
      return style('dry-crust-chip', [182, 145, 82], intensity, {
        alpha: 0.09 + intensity * 0.21,
        lineWidth: 0.9 + intensity * 1.2,
        fragmentLength: 4 + intensity * 8,
        crossOffset: 1.5 + intensity * 3.2,
        curveBias: -0.2,
        normalBias: 0,
        segmentCount: 2
      });
    case 'stone-break':
      return style('stone-fracture', [92, 91, 95], intensity, {
        fillRgb: [80, 80, 84],
        alpha: 0.095 + intensity * 0.23,
        fillAlpha: 0.045 + intensity * 0.13,
        lineWidth: 0.85 + intensity * 1.15,
        fragmentLength: 3.5 + intensity * 7,
        crossOffset: 2.2 + intensity * 4.7,
        curveBias: -0.32,
        normalBias: 0,
        clusterCount: Math.round(intensity * 2),
        segmentCount: 3
      });
  }
}

function style(
  motif: HillMaterialTransitionPreviewMotif,
  strokeRgb: readonly [number, number, number],
  intensity: number,
  overrides: Partial<Omit<HillMaterialTransitionPreviewStyle, 'motif' | 'strokeRgb'>>
): HillMaterialTransitionPreviewStyle {
  return {
    motif,
    strokeRgb: rgb(strokeRgb),
    fillRgb: overrides.fillRgb ? rgb(overrides.fillRgb) : undefined,
    alpha: round(overrides.alpha ?? 0.08 + intensity * 0.2),
    fillAlpha: round(overrides.fillAlpha ?? 0),
    lineWidth: round(overrides.lineWidth ?? 0.8 + intensity),
    fragmentLength: round(overrides.fragmentLength ?? 4 + intensity * 8),
    crossOffset: round(overrides.crossOffset ?? 1 + intensity * 3),
    curveBias: round(overrides.curveBias ?? 0),
    normalBias: round(overrides.normalBias ?? 0),
    clusterCount: Math.max(0, Math.round(overrides.clusterCount ?? 0)),
    segmentCount: Math.max(0, Math.round(overrides.segmentCount ?? 1))
  };
}

function rgb(value: readonly [number, number, number]): readonly [number, number, number] {
  return [
    Math.round(clamp(value[0], 0, 255)),
    Math.round(clamp(value[1], 0, 255)),
    Math.round(clamp(value[2], 0, 255))
  ];
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
