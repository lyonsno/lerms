export type HillOverlayStrokeKind = 'ditch' | 'phaseDitch' | 'trail' | 'topographicContour';

export interface HillOverlayStrokeStyle {
  strokeStyle: string;
  lineWidth: number;
  alpha: number;
}

export interface HillOverlayVisualControls {
  topologyLineStrength?: number;
  topographicContourStrength?: number;
}

export function hillOverlayStrokeStyle(
  kind: HillOverlayStrokeKind,
  strength: number,
  controls: HillOverlayVisualControls = {}
): HillOverlayStrokeStyle {
  const localStrength = smoothCap(clamp(strength, 0, 1));
  if (kind === 'topographicContour') {
    const visibility = clamp(controls.topographicContourStrength ?? 1, 0, 1);
    const alpha = roundStyleValue((0.07 + localStrength * 0.12) * visibility);
    return {
      strokeStyle: `rgba(237, 225, 166, ${alpha.toFixed(3)})`,
      lineWidth: roundStyleValue((0.7 + localStrength * 0.8) * (0.5 + visibility * 0.5)),
      alpha
    };
  }

  const visibility = clamp(controls.topologyLineStrength ?? 1, 0, 1);
  if (kind === 'trail') {
    const alpha = roundStyleValue((0.15 + localStrength * 0.23) * visibility);
    return {
      strokeStyle: `rgba(211, 190, 123, ${alpha.toFixed(3)})`,
      lineWidth: roundStyleValue((1.15 + localStrength * 2.35) * (0.42 + visibility * 0.58)),
      alpha
    };
  }

  if (kind === 'phaseDitch') {
    const alpha = roundStyleValue((0.17 + localStrength * 0.27) * visibility);
    return {
      strokeStyle: `rgba(24, 19, 45, ${alpha.toFixed(3)})`,
      lineWidth: roundStyleValue((2.1 + localStrength * 3.7) * (0.42 + visibility * 0.58)),
      alpha
    };
  }

  const alpha = roundStyleValue((0.15 + localStrength * 0.21) * visibility);
  return {
    strokeStyle: `rgba(31, 25, 58, ${alpha.toFixed(3)})`,
    lineWidth: roundStyleValue((1.45 + localStrength * 2.2) * (0.42 + visibility * 0.58)),
    alpha
  };
}

export function hillTopographicContourAmount(height: number, spacing: number, bandWidth: number): number {
  const safeSpacing = Math.max(0.001, Math.abs(spacing));
  const safeBandWidth = Math.max(0.001, Math.abs(bandWidth));
  const normalized = height / safeSpacing;
  const distanceToBand = Math.abs(normalized - Math.round(normalized)) * safeSpacing;
  if (distanceToBand >= safeBandWidth) {
    return 0;
  }
  const t = 1 - distanceToBand / safeBandWidth;
  return roundStyleValue(t * t * (3 - 2 * t));
}

export function shouldBreakHillTrailStroke(runSampleCount: number, localStrength: number, maximumRunSamples = 12): boolean {
  if (runSampleCount < 4) {
    return false;
  }

  const weaknessBreak = localStrength < 0.34 && runSampleCount >= Math.max(7, Math.floor(maximumRunSamples * 0.76));
  const longRunBreak = runSampleCount >= maximumRunSamples;
  return weaknessBreak || longRunBreak;
}

function roundStyleValue(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function smoothCap(value: number): number {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
