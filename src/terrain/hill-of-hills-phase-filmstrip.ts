import type {
  HillOfHillsTerrain,
  HillOfHillsTerrainParams,
  HillOfHillsTerrainSample,
  HillOfHillsTopologyEventDebug,
  HillOfHillsTopologySupportLifecycle
} from './hill-of-hills.js';

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

export interface HillPhaseFilmstripViewportFit {
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
}

export interface HillPhaseContinuityMetric {
  maxAbs: number;
  rms: number;
}

export interface HillPhaseContinuityFrameRef {
  index: number;
  reason: HillPhaseFilmstripReason;
  clock: number;
  epoch: number;
  phaseTimeMs: number;
}

export interface HillPhaseContinuityLifecycleDelta {
  enteringCount: number;
  activeCount: number;
  tailingCount: number;
  enteredCount: number;
  exitedCount: number;
  persistedCount: number;
  tailingPersistedCount: number;
  hotEntrantCount: number;
  maxEnteringPhaseIn: number;
  maxEnteringAmount: number;
}

export type HillPhaseContinuitySuspicionKind =
  | 'hot-entering-support'
  | 'large-height-delta'
  | 'large-support-delta'
  | 'material-pop'
  | 'topology-pop'
  | 'support-exit';

export interface HillPhaseContinuitySuspicion {
  kind: HillPhaseContinuitySuspicionKind;
  severity: number;
  message: string;
}

export interface HillPhaseContinuityDelta {
  from: HillPhaseContinuityFrameRef;
  to: HillPhaseContinuityFrameRef;
  matchedSampleCount: number;
  missingSampleCount: number;
  height: HillPhaseContinuityMetric;
  supportHeight: HillPhaseContinuityMetric;
  supportSpeed: HillPhaseContinuityMetric;
  topologyAmount: HillPhaseContinuityMetric;
  topologyHeightDelta: HillPhaseContinuityMetric;
  flowAccumulation: HillPhaseContinuityMetric;
  ridgeStrength: HillPhaseContinuityMetric;
  valleyStrength: HillPhaseContinuityMetric;
  proxyMaterialChangeRatio: number;
  surfaceDetailChangeRatio: number;
  materialEdgeChangeRatio: number;
  phaseInfluenceKindChangeRatio: number;
  regionChangeRatio: number;
  checksumChanged: {
    sample: boolean;
    topology: boolean;
    phaseInfluence: boolean;
    proxyMaterial: boolean;
    surfaceDetail: boolean;
    materialEdge: boolean;
    supportFrame: boolean;
  };
  lifecycle: HillPhaseContinuityLifecycleDelta;
  activeEventSummary: readonly string[];
  suspicions: readonly HillPhaseContinuitySuspicion[];
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
  const labelBand = 60;
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

export function fitHillPhaseFilmstripViewport(
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number
): HillPhaseFilmstripViewportFit {
  const safeSourceWidth = Math.max(1, Math.round(finiteOr(sourceWidth, 1)));
  const safeSourceHeight = Math.max(1, Math.round(finiteOr(sourceHeight, 1)));
  const safeTargetWidth = Math.max(1, Math.round(finiteOr(targetWidth, 1)));
  const safeTargetHeight = Math.max(1, Math.round(finiteOr(targetHeight, 1)));
  const scale = Math.min(safeTargetWidth / safeSourceWidth, safeTargetHeight / safeSourceHeight);
  const width = Math.max(1, Math.round(safeSourceWidth * scale));
  const height = Math.max(1, Math.round(safeSourceHeight * scale));

  return {
    x: Math.floor((safeTargetWidth - width) * 0.5),
    y: Math.floor((safeTargetHeight - height) * 0.5),
    width,
    height,
    scale
  };
}

export function compareHillPhaseContinuityFrames(
  fromFrame: HillPhaseFilmstripFrame,
  fromTerrain: HillOfHillsTerrain,
  toFrame: HillPhaseFilmstripFrame,
  toTerrain: HillOfHillsTerrain
): HillPhaseContinuityDelta {
  const fromSamples = new Map(fromTerrain.samples.map((sample) => [sample.id, sample]));
  const height = createMetricAccumulator();
  const supportHeight = createMetricAccumulator();
  const supportSpeed = createMetricAccumulator();
  const topologyAmount = createMetricAccumulator();
  const topologyHeightDelta = createMetricAccumulator();
  const flowAccumulation = createMetricAccumulator();
  const ridgeStrength = createMetricAccumulator();
  const valleyStrength = createMetricAccumulator();
  let matchedSampleCount = 0;
  let proxyMaterialChanges = 0;
  let surfaceDetailChanges = 0;
  let materialEdgeChanges = 0;
  let phaseInfluenceKindChanges = 0;
  let regionChanges = 0;

  for (const toSample of toTerrain.samples) {
    const fromSample = fromSamples.get(toSample.id);
    if (!fromSample) {
      continue;
    }
    matchedSampleCount += 1;
    includeMetric(height, toSample.height - fromSample.height);
    includeMetric(supportHeight, toSample.support.heightDelta - fromSample.support.heightDelta);
    includeMetric(supportSpeed, vecDeltaMagnitude(toSample.support.surfaceVelocity, fromSample.support.surfaceVelocity));
    includeMetric(topologyAmount, toSample.phaseInfluence.topologyAmount - fromSample.phaseInfluence.topologyAmount);
    includeMetric(topologyHeightDelta, toSample.phaseInfluence.topologyHeightDelta - fromSample.phaseInfluence.topologyHeightDelta);
    includeMetric(flowAccumulation, toSample.topology.flowAccumulation - fromSample.topology.flowAccumulation);
    includeMetric(ridgeStrength, toSample.topology.ridgeStrength - fromSample.topology.ridgeStrength);
    includeMetric(valleyStrength, toSample.topology.valleyStrength - fromSample.topology.valleyStrength);
    proxyMaterialChanges += boolCount(toSample.proxyMaterial.kind !== fromSample.proxyMaterial.kind);
    surfaceDetailChanges += boolCount(toSample.surfaceDetail.kind !== fromSample.surfaceDetail.kind);
    materialEdgeChanges += boolCount(toSample.materialEdge.kind !== fromSample.materialEdge.kind);
    phaseInfluenceKindChanges += boolCount(toSample.phaseInfluence.kind !== fromSample.phaseInfluence.kind);
    regionChanges += boolCount(toSample.region !== fromSample.region);
  }

  const lifecycle = compareTopologyEventLifecycles(fromTerrain.witness.topologyEventDebug, toTerrain.witness.topologyEventDebug);
  const delta: Omit<HillPhaseContinuityDelta, 'suspicions'> = {
    from: frameRef(fromFrame),
    to: frameRef(toFrame),
    matchedSampleCount,
    missingSampleCount: Math.max(0, toTerrain.samples.length - matchedSampleCount),
    height: resolveMetric(height),
    supportHeight: resolveMetric(supportHeight),
    supportSpeed: resolveMetric(supportSpeed),
    topologyAmount: resolveMetric(topologyAmount),
    topologyHeightDelta: resolveMetric(topologyHeightDelta),
    flowAccumulation: resolveMetric(flowAccumulation),
    ridgeStrength: resolveMetric(ridgeStrength),
    valleyStrength: resolveMetric(valleyStrength),
    proxyMaterialChangeRatio: ratio(proxyMaterialChanges, matchedSampleCount),
    surfaceDetailChangeRatio: ratio(surfaceDetailChanges, matchedSampleCount),
    materialEdgeChangeRatio: ratio(materialEdgeChanges, matchedSampleCount),
    phaseInfluenceKindChangeRatio: ratio(phaseInfluenceKindChanges, matchedSampleCount),
    regionChangeRatio: ratio(regionChanges, matchedSampleCount),
    checksumChanged: {
      sample: fromTerrain.witness.sampleChecksum !== toTerrain.witness.sampleChecksum,
      topology: fromTerrain.witness.topologyChecksum !== toTerrain.witness.topologyChecksum,
      phaseInfluence: fromTerrain.witness.phaseInfluenceChecksum !== toTerrain.witness.phaseInfluenceChecksum,
      proxyMaterial: fromTerrain.witness.proxyMaterialChecksum !== toTerrain.witness.proxyMaterialChecksum,
      surfaceDetail: fromTerrain.witness.surfaceDetailChecksum !== toTerrain.witness.surfaceDetailChecksum,
      materialEdge: fromTerrain.witness.materialEdgeChecksum !== toTerrain.witness.materialEdgeChecksum,
      supportFrame: fromTerrain.witness.supportFrame.supportFrameChecksum !== toTerrain.witness.supportFrame.supportFrameChecksum
    },
    lifecycle,
    activeEventSummary: toTerrain.witness.topologyEventDebug.slice(0, 6).map(eventDebugSummary)
  };

  return {
    ...delta,
    suspicions: createContinuitySuspicions(delta)
  };
}

export function formatHillPhaseContinuityDelta(delta: HillPhaseContinuityDelta): string {
  const suspicionSummary =
    delta.suspicions.length === 0
      ? 'ok'
      : delta.suspicions
          .slice(0, 2)
          .map((suspicion) => suspicion.kind)
          .join(',');
  return `dh ${delta.height.maxAbs.toFixed(3)}/${delta.height.rms.toFixed(3)} sup ${delta.supportHeight.maxAbs.toFixed(3)} topo ${delta.topologyAmount.maxAbs.toFixed(2)} mat ${percent(delta.proxyMaterialChangeRatio)} edge ${percent(delta.materialEdgeChangeRatio)} enter ${delta.lifecycle.enteringCount}/${delta.lifecycle.hotEntrantCount} tail ${delta.lifecycle.tailingCount} ${suspicionSummary}`;
}

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

interface MetricAccumulator {
  count: number;
  maxAbs: number;
  sumSquares: number;
}

function createMetricAccumulator(): MetricAccumulator {
  return {
    count: 0,
    maxAbs: 0,
    sumSquares: 0
  };
}

function includeMetric(accumulator: MetricAccumulator, value: number): void {
  if (!Number.isFinite(value)) {
    return;
  }
  const absValue = Math.abs(value);
  accumulator.count += 1;
  accumulator.maxAbs = Math.max(accumulator.maxAbs, absValue);
  accumulator.sumSquares += value * value;
}

function resolveMetric(accumulator: MetricAccumulator): HillPhaseContinuityMetric {
  return {
    maxAbs: accumulator.maxAbs,
    rms: accumulator.count === 0 ? 0 : Math.sqrt(accumulator.sumSquares / accumulator.count)
  };
}

function frameRef(frame: HillPhaseFilmstripFrame): HillPhaseContinuityFrameRef {
  return {
    index: frame.index,
    reason: frame.reason,
    clock: frame.clock,
    epoch: frame.epoch,
    phaseTimeMs: frame.phaseTimeMs
  };
}

function compareTopologyEventLifecycles(
  fromEvents: readonly HillOfHillsTopologyEventDebug[],
  toEvents: readonly HillOfHillsTopologyEventDebug[]
): HillPhaseContinuityLifecycleDelta {
  const fromIds = new Set(fromEvents.map((event) => event.id));
  const toIds = new Set(toEvents.map((event) => event.id));
  const lifecycleCounts = countLifecycles(toEvents);
  let enteredCount = 0;
  let exitedCount = 0;
  let persistedCount = 0;
  let tailingPersistedCount = 0;
  let hotEntrantCount = 0;
  let maxEnteringPhaseIn = 0;
  let maxEnteringAmount = 0;

  for (const event of toEvents) {
    const existed = fromIds.has(event.id);
    if (existed) {
      persistedCount += 1;
      tailingPersistedCount += boolCount(event.supportLifecycle === 'tailing');
    } else {
      enteredCount += 1;
    }
    if (event.supportLifecycle === 'entering') {
      maxEnteringPhaseIn = Math.max(maxEnteringPhaseIn, event.envelope.phaseIn);
      maxEnteringAmount = Math.max(maxEnteringAmount, event.envelope.amount, event.supportAmount);
      if (!existed && (event.envelope.phaseIn > 0.25 || event.envelope.amount > 0.25 || event.supportAmount > 0.25)) {
        hotEntrantCount += 1;
      }
    }
  }
  for (const event of fromEvents) {
    exitedCount += boolCount(!toIds.has(event.id));
  }

  return {
    enteringCount: lifecycleCounts.entering,
    activeCount: lifecycleCounts.active,
    tailingCount: lifecycleCounts.tailing,
    enteredCount,
    exitedCount,
    persistedCount,
    tailingPersistedCount,
    hotEntrantCount,
    maxEnteringPhaseIn,
    maxEnteringAmount
  };
}

function countLifecycles(
  events: readonly HillOfHillsTopologyEventDebug[]
): Record<HillOfHillsTopologySupportLifecycle, number> {
  return events.reduce<Record<HillOfHillsTopologySupportLifecycle, number>>(
    (counts, event) => {
      counts[event.supportLifecycle] += 1;
      return counts;
    },
    {
      entering: 0,
      active: 0,
      tailing: 0
    }
  );
}

function createContinuitySuspicions(
  delta: Omit<HillPhaseContinuityDelta, 'suspicions'>
): readonly HillPhaseContinuitySuspicion[] {
  const suspicions: HillPhaseContinuitySuspicion[] = [];
  if (delta.lifecycle.hotEntrantCount > 0) {
    suspicions.push({
      kind: 'hot-entering-support',
      severity: delta.lifecycle.hotEntrantCount,
      message: `${delta.lifecycle.hotEntrantCount} new support(s) entered above smooth attack threshold`
    });
  }
  if (delta.height.maxAbs > 0.8 && delta.supportHeight.maxAbs < 0.25) {
    suspicions.push({
      kind: 'large-height-delta',
      severity: delta.height.maxAbs,
      message: `height changed ${delta.height.maxAbs.toFixed(3)} while support delta stayed ${delta.supportHeight.maxAbs.toFixed(3)}`
    });
  }
  if (delta.supportHeight.maxAbs > 0.8) {
    suspicions.push({
      kind: 'large-support-delta',
      severity: delta.supportHeight.maxAbs,
      message: `support height delta jumped ${delta.supportHeight.maxAbs.toFixed(3)}`
    });
  }
  if (delta.proxyMaterialChangeRatio > 0.12 || delta.surfaceDetailChangeRatio > 0.16 || delta.materialEdgeChangeRatio > 0.16) {
    suspicions.push({
      kind: 'material-pop',
      severity: Math.max(delta.proxyMaterialChangeRatio, delta.surfaceDetailChangeRatio, delta.materialEdgeChangeRatio),
      message: `material/detail classes changed over ${percent(Math.max(delta.proxyMaterialChangeRatio, delta.surfaceDetailChangeRatio, delta.materialEdgeChangeRatio))} of matched samples`
    });
  }
  if (delta.topologyAmount.maxAbs > 0.6 || delta.phaseInfluenceKindChangeRatio > 0.12) {
    suspicions.push({
      kind: 'topology-pop',
      severity: Math.max(delta.topologyAmount.maxAbs, delta.phaseInfluenceKindChangeRatio),
      message: `topology influence changed ${delta.topologyAmount.maxAbs.toFixed(2)} with ${percent(delta.phaseInfluenceKindChangeRatio)} kind churn`
    });
  }
  if (delta.lifecycle.exitedCount > 0 && delta.lifecycle.tailingCount === 0) {
    suspicions.push({
      kind: 'support-exit',
      severity: delta.lifecycle.exitedCount,
      message: `${delta.lifecycle.exitedCount} support(s) exited without a visible tailing set`
    });
  }
  return suspicions;
}

function eventDebugSummary(event: HillOfHillsTopologyEventDebug): string {
  return `${event.supportLifecycle[0]}${event.supportEpoch}:${event.kind}:${event.id.slice(0, 4)} a${event.envelope.amount.toFixed(2)} s${event.supportAmount.toFixed(2)} p${event.envelope.phaseIn.toFixed(2)}`;
}

function boolCount(value: boolean): number {
  return value ? 1 : 0;
}

function ratio(count: number, total: number): number {
  return total <= 0 ? 0 : count / total;
}

function vecDeltaMagnitude(to: HillOfHillsTerrainSample['support']['surfaceVelocity'], from: HillOfHillsTerrainSample['support']['surfaceVelocity']): number {
  return Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2]);
}

function percent(value: number): string {
  return `${Math.round(Math.max(0, value) * 100)}%`;
}
