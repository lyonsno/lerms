export type HillOverlayStrokeKind = 'ditch' | 'phaseDitch' | 'trail';

export interface HillOverlayStrokeStyle {
  strokeStyle: string;
  lineWidth: number;
  alpha: number;
}

export function hillOverlayStrokeStyle(kind: HillOverlayStrokeKind, strength: number): HillOverlayStrokeStyle {
  const localStrength = smoothCap(clamp(strength, 0, 1));
  if (kind === 'trail') {
    const alpha = roundStyleValue(0.15 + localStrength * 0.23);
    return {
      strokeStyle: `rgba(211, 190, 123, ${alpha.toFixed(3)})`,
      lineWidth: roundStyleValue(1.15 + localStrength * 2.35),
      alpha
    };
  }

  if (kind === 'phaseDitch') {
    const alpha = roundStyleValue(0.17 + localStrength * 0.27);
    return {
      strokeStyle: `rgba(24, 19, 45, ${alpha.toFixed(3)})`,
      lineWidth: roundStyleValue(2.1 + localStrength * 3.7),
      alpha
    };
  }

  const alpha = roundStyleValue(0.15 + localStrength * 0.21);
  return {
    strokeStyle: `rgba(31, 25, 58, ${alpha.toFixed(3)})`,
    lineWidth: roundStyleValue(1.45 + localStrength * 2.2),
    alpha
  };
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
