import type { HillOfHillsTerrainParams } from './hill-of-hills.js';

export const HILL_PHASE_FILMSTRIP_FRAME_COUNTS = [5, 10, 15, 25, 50] as const;

export type HillPhaseFilmstripFrameCount = (typeof HILL_PHASE_FILMSTRIP_FRAME_COUNTS)[number];
export type HillPhaseFilmstripReason =
  | 'epoch-boundary'
  | 'attack'
  | 'rise'
  | 'peak'
  | 'release'
  | 'tail';

export interface HillPhaseFilmstripFrame {
  index: number;
  phaseTimeMs: number;
  clock: number;
  epoch: number;
  reason: HillPhaseFilmstripReason;
}

export interface HillPhaseFilmstripLayout {
  frameCount: HillPhaseFilmstripFrameCount;
  columns: number;
  rows: number;
  cellWidth: number;
  cellHeight: number;
  gutter: number;
  width: number;
  height: number;
}

interface SalientPhasePoint {
  clock: number;
  reason: HillPhaseFilmstripReason;
}

const SALIENT_PHASE_POINTS: readonly SalientPhasePoint[] = [
  { clock: 0.02, reason: 'epoch-boundary' },
  { clock: 0.12, reason: 'attack' },
  { clock: 0.28, reason: 'rise' },
  { clock: 0.46, reason: 'peak' },
  { clock: 0.64, reason: 'release' },
  { clock: 0.84, reason: 'tail' },
  { clock: 0.98, reason: 'epoch-boundary' }
];

export function normalizeHillPhaseFilmstripFrameCount(
  value: unknown,
  fallback: HillPhaseFilmstripFrameCount = 10
): HillPhaseFilmstripFrameCount {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  let best: HillPhaseFilmstripFrameCount = HILL_PHASE_FILMSTRIP_FRAME_COUNTS[0];
  let bestDistance = Math.abs(numeric - best);
  for (const candidate of HILL_PHASE_FILMSTRIP_FRAME_COUNTS) {
    const distance = Math.abs(numeric - candidate);
    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }
  return best;
}

export function createHillPhaseFilmstripSchedule(
  params: Pick<HillOfHillsTerrainParams, 'topologyPhaseTimeMs' | 'topologyPhaseDurationMs'>,
  count: HillPhaseFilmstripFrameCount
): readonly HillPhaseFilmstripFrame[] {
  const durationMs = Math.max(1, finiteOr(params.topologyPhaseDurationMs, 1));
  const currentTimeMs = Math.max(0, finiteOr(params.topologyPhaseTimeMs, 0));
  const currentEpoch = Math.floor(currentTimeMs / durationMs);
  const frames: HillPhaseFilmstripFrame[] = [];
  let epoch = currentEpoch;

  while (frames.length < count) {
    for (const point of SALIENT_PHASE_POINTS) {
      const phaseTimeMs = (epoch + point.clock) * durationMs;
      if (phaseTimeMs <= currentTimeMs + 0.5) {
        continue;
      }
      frames.push({
        index: frames.length,
        phaseTimeMs,
        clock: point.clock,
        epoch,
        reason: point.reason
      });
      if (frames.length >= count) {
        break;
      }
    }
    epoch += 1;
  }

  return frames;
}

export function fitHillPhaseFilmstripLayout(
  count: HillPhaseFilmstripFrameCount,
  maxWidth = 1_600,
  maxHeight = 1_100
): HillPhaseFilmstripLayout {
  const columns = count <= 5 ? count : count <= 25 ? 5 : 10;
  const rows = Math.ceil(count / columns);
  const gutter = 8;
  const labelBand = 24;
  const usableWidth = Math.max(1, maxWidth - gutter * (columns - 1));
  const usableHeight = Math.max(1, maxHeight - gutter * (rows - 1));
  const cellWidth = Math.max(120, Math.floor(usableWidth / columns));
  const naturalHeight = Math.floor(cellWidth * 0.64) + labelBand;
  const cellHeight = Math.max(90, Math.min(240, naturalHeight, Math.floor(usableHeight / rows)));
  const width = columns * cellWidth + (columns - 1) * gutter;
  const height = rows * cellHeight + (rows - 1) * gutter;

  return {
    frameCount: count,
    columns,
    rows,
    cellWidth,
    cellHeight,
    gutter,
    width,
    height
  };
}

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}
