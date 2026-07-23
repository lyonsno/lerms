import type {
  HillOfHillsTerrain,
  HillOfHillsTerrainParams,
  HillOfHillsTerrainSample,
  HillOfHillsTopologyEventClassConfigMap,
  HillOfHillsTopologyEventDebug,
  HillOfHillsTopologySupportLifecycle
} from './hill-of-hills.js';

export const HILL_PHASE_CONTINUITY_REPORT_SCHEMA = 'lerms.hill-phase-continuity-report.v1' as const;

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
  hotExitedCount: number;
  maxExitedAmount: number;
  maxExitedSupportAmount: number;
  persistedCount: number;
  tailingPersistedCount: number;
  hotEntrantCount: number;
  maxEnteringPhaseIn: number;
  maxEnteringAmount: number;
}

export type HillPhaseContinuitySuspicionKind =
  | 'hot-entering-support'
  | 'broad-height-step'
  | 'local-height-spike'
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
  phaseTimeDeltaMs: number;
  severity: number;
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

export interface HillPhaseContinuityReportFrame {
  frame: HillPhaseContinuityFrameRef;
  sampleChecksum: string;
  topologyChecksum: string;
  phaseInfluenceChecksum: string;
  supportFrameChecksum: string;
  dynamics: HillPhaseContinuityDynamicsEvidence;
  activeEventSummary: readonly string[];
  delta: HillPhaseContinuityDelta | undefined;
}

export interface HillPhaseContinuityRangeEvidence {
  min: number;
  max: number;
}

export interface HillPhaseContinuityDynamicsEvidence {
  mode: HillOfHillsTerrainParams['topologyDynamicsMode'];
  integrationOriginMs: number;
  deformation: HillPhaseContinuityRangeEvidence;
  velocity: HillPhaseContinuityRangeEvidence;
  force: HillPhaseContinuityRangeEvidence;
  grossForce: HillPhaseContinuityRangeEvidence;
  opposedForce: HillPhaseContinuityRangeEvidence;
  contention: HillPhaseContinuityRangeEvidence;
  hillSwellMembership: HillPhaseContinuityRangeEvidence;
  hillSlumpMembership: HillPhaseContinuityRangeEvidence;
}

export interface HillPhaseContinuityControls {
  topologyDynamicsMode: HillOfHillsTerrainParams['topologyDynamicsMode'];
  topologyPossibilityMode: HillOfHillsTerrainParams['topologyPossibilityMode'];
  topologyPhaseIntensity: number;
  topologyPhaseLimit: number;
  topologyPhaseRadius: number;
  topologyPhaseHeightScale: number;
  topologyPhaseBasinBias: number;
  topologyPhaseValleyBias: number;
  topologyPhaseHillBias: number;
  topologyPhaseRidgeBias: number;
  topologyPhaseSaddleBias: number;
  topologyPhaseOverlap: number;
  topologyPhaseDetailScale: number;
  topologyPhaseDriftIntensity: number;
  topologyPhaseDurationMs: number;
  topologyEventClasses: HillOfHillsTopologyEventClassConfigMap;
}

export interface HillPhaseContinuityReportRequest {
  requestedParams: HillOfHillsTerrainParams;
  requireExactControls?: boolean;
  requestedSource: {
    route: string;
    configId?: string;
  };
}

export interface HillPhaseContinuitySourceIdentity {
  requestedRoute: string;
  requestedConfigId?: string;
  effectiveAuthority: HillOfHillsTerrain['source']['authority'];
  effectiveRoute: string;
  effectiveBackend?: string;
  effectiveConfigId?: string;
  effectiveConfigIds: readonly string[];
  fallbackStatus: HillOfHillsTerrain['witness']['fallbackStatus'];
}

export interface HillPhaseContinuityReport {
  schema: typeof HILL_PHASE_CONTINUITY_REPORT_SCHEMA;
  requestedControls: HillPhaseContinuityControls;
  effectiveControls: HillPhaseContinuityControls;
  sourceIdentity: HillPhaseContinuitySourceIdentity;
  frameCount: number;
  frames: readonly HillPhaseContinuityReportFrame[];
  rankedTransitions: readonly HillPhaseContinuityDelta[];
  suspicionCounts: Partial<Record<HillPhaseContinuitySuspicionKind, number>>;
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
  const delta: HillPhaseUnscoredContinuityDelta = {
    from: frameRef(fromFrame),
    to: frameRef(toFrame),
    phaseTimeDeltaMs: Math.max(0, toFrame.phaseTimeMs - fromFrame.phaseTimeMs),
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

  const suspicions = createContinuitySuspicions(delta);
  return {
    ...delta,
    severity: continuitySeverity(delta, suspicions),
    suspicions
  };
}

export function createHillPhaseContinuityReport(
  frames: readonly HillPhaseFilmstripFrame[],
  terrains: readonly HillOfHillsTerrain[],
  request: HillPhaseContinuityReportRequest
): HillPhaseContinuityReport {
  validateContinuityReportEvidence(frames, terrains, request);
  const count = frames.length;
  const requestedControls = continuityControls(request.requestedParams);
  const effectiveControls = continuityControls(terrains[0].params);
  const effectiveConfigIds = Array.from(
    new Set(terrains.map((terrain) => terrain.source.configId).filter((configId): configId is string => Boolean(configId)))
  );
  const reportFrames: HillPhaseContinuityReportFrame[] = [];
  const rankedTransitions: HillPhaseContinuityDelta[] = [];
  const suspicionCounts: Partial<Record<HillPhaseContinuitySuspicionKind, number>> = {};
  let previousFrame: HillPhaseFilmstripFrame | undefined;
  let previousTerrain: HillOfHillsTerrain | undefined;

  for (let index = 0; index < count; index += 1) {
    const frame = frames[index];
    const terrain = terrains[index];
    const delta =
      previousFrame && previousTerrain
        ? compareHillPhaseContinuityFrames(previousFrame, previousTerrain, frame, terrain)
        : undefined;
    if (delta) {
      rankedTransitions.push(delta);
      for (const suspicion of uniqueSuspicionKinds(delta.suspicions)) {
        suspicionCounts[suspicion] = (suspicionCounts[suspicion] ?? 0) + 1;
      }
    }
    reportFrames.push({
      frame: frameRef(frame),
      sampleChecksum: terrain.witness.sampleChecksum,
      topologyChecksum: terrain.witness.topologyChecksum,
      phaseInfluenceChecksum: terrain.witness.phaseInfluenceChecksum,
      supportFrameChecksum: terrain.witness.supportFrame.supportFrameChecksum,
      dynamics: {
        mode: terrain.witness.topologyDynamicsMode,
        integrationOriginMs: terrain.witness.topologyDynamicsIntegrationOriginMs,
        deformation: rangeEvidence(terrain.witness.topologyDeformationRange),
        velocity: rangeEvidence(terrain.witness.topologyVelocityRange),
        force: rangeEvidence(terrain.witness.topologyForceRange),
        grossForce: rangeEvidence(terrain.witness.topologyGrossForceRange),
        opposedForce: rangeEvidence(terrain.witness.topologyOpposedForceRange),
        contention: rangeEvidence(terrain.witness.topologyContentionRange),
        hillSwellMembership: rangeEvidence(terrain.witness.hillSwellMembershipRange),
        hillSlumpMembership: rangeEvidence(terrain.witness.hillSlumpMembershipRange)
      },
      activeEventSummary: terrain.witness.topologyEventDebug.slice(0, 8).map(eventDebugSummary),
      delta
    });
    previousFrame = frame;
    previousTerrain = terrain;
  }

  rankedTransitions.sort((a, b) => b.severity - a.severity);

  return {
    schema: HILL_PHASE_CONTINUITY_REPORT_SCHEMA,
    requestedControls,
    effectiveControls,
    sourceIdentity: {
      requestedRoute: request.requestedSource.route,
      requestedConfigId: request.requestedSource.configId,
      effectiveAuthority: terrains[0].source.authority,
      effectiveRoute: terrains[0].source.route,
      effectiveBackend: terrains[0].source.backend,
      effectiveConfigId: effectiveConfigIds.length === 1 ? effectiveConfigIds[0] : undefined,
      effectiveConfigIds,
      fallbackStatus: terrains[0].witness.fallbackStatus
    },
    frameCount: count,
    frames: reportFrames,
    rankedTransitions,
    suspicionCounts
  };
}

function validateContinuityReportEvidence(
  frames: readonly HillPhaseFilmstripFrame[],
  terrains: readonly HillOfHillsTerrain[],
  request: HillPhaseContinuityReportRequest
): void {
  if (frames.length === 0 || frames.length !== terrains.length) {
    throw new Error(`phase continuity report frame/terrain count mismatch: ${frames.length}/${terrains.length}`);
  }
  const requestedControls = continuityControls(request.requestedParams);
  const expectedSampleCount = terrains[0].samples.length;
  for (let index = 0; index < frames.length; index += 1) {
    const frame = frames[index];
    const terrain = terrains[index];
    if (terrain.samples.length === 0 || terrain.samples.length !== expectedSampleCount) {
      throw new Error(`phase continuity report partial terrain at frame ${index}`);
    }
    if (terrain.source.route !== request.requestedSource.route) {
      throw new Error(
        `phase continuity report route mismatch at frame ${index}: requested ${request.requestedSource.route}, effective ${terrain.source.route}`
      );
    }
    if (request.requestedSource.configId && terrain.source.configId !== request.requestedSource.configId) {
      throw new Error(
        `phase continuity report config mismatch at frame ${index}: requested ${request.requestedSource.configId}, effective ${terrain.source.configId ?? 'missing'}`
      );
    }
    if (terrain.source.authority !== 'live_simulation' || terrain.witness.fallbackStatus !== 'none') {
      throw new Error(
        `phase continuity report non-live source at frame ${index}: ${terrain.source.authority}/${terrain.witness.fallbackStatus}`
      );
    }
    if (Math.abs(terrain.params.topologyPhaseTimeMs - frame.phaseTimeMs) > 0.001) {
      throw new Error(`phase continuity report stale frame time at frame ${index}`);
    }
    if (
      request.requireExactControls &&
      !continuityControlsMatch(requestedControls, continuityControls(terrain.params), request.requestedParams.worldScale)
    ) {
      throw new Error(`phase continuity report effective controls mismatch at frame ${index}`);
    }
  }
}

function continuityControls(params: HillOfHillsTerrainParams): HillPhaseContinuityControls {
  const topologyEventClasses = {} as HillOfHillsTopologyEventClassConfigMap;
  for (const [kind, config] of Object.entries(params.topologyEventClasses)) {
    topologyEventClasses[kind as keyof HillOfHillsTopologyEventClassConfigMap] = { ...config };
  }
  return {
    topologyDynamicsMode: params.topologyDynamicsMode,
    topologyPossibilityMode: params.topologyPossibilityMode,
    topologyPhaseIntensity: params.topologyPhaseIntensity,
    topologyPhaseLimit: params.topologyPhaseLimit,
    topologyPhaseRadius: params.topologyPhaseRadius,
    topologyPhaseHeightScale: params.topologyPhaseHeightScale,
    topologyPhaseBasinBias: params.topologyPhaseBasinBias,
    topologyPhaseValleyBias: params.topologyPhaseValleyBias,
    topologyPhaseHillBias: params.topologyPhaseHillBias,
    topologyPhaseRidgeBias: params.topologyPhaseRidgeBias,
    topologyPhaseSaddleBias: params.topologyPhaseSaddleBias,
    topologyPhaseOverlap: params.topologyPhaseOverlap,
    topologyPhaseDetailScale: params.topologyPhaseDetailScale,
    topologyPhaseDriftIntensity: params.topologyPhaseDriftIntensity,
    topologyPhaseDurationMs: params.topologyPhaseDurationMs,
    topologyEventClasses
  };
}

function continuityControlsMatch(
  requested: HillPhaseContinuityControls,
  effective: HillPhaseContinuityControls,
  requestedWorldScale: number
): boolean {
  const requestedComparable = {
    ...requested,
    topologyPhaseRadius: requested.topologyPhaseRadius * requestedWorldScale
  };
  return JSON.stringify(requestedComparable) === JSON.stringify(effective);
}

function rangeEvidence(range: { min: number; max: number }): HillPhaseContinuityRangeEvidence {
  return { min: range.min, max: range.max };
}

export function formatHillPhaseContinuityDelta(delta: HillPhaseContinuityDelta): string {
  const suspicionSummary =
    delta.suspicions.length === 0
      ? 'ok'
      : delta.suspicions
          .slice(0, 2)
          .map((suspicion) => suspicion.kind)
          .join(',');
  return `dt ${Math.round(delta.phaseTimeDeltaMs)}ms dh ${delta.height.maxAbs.toFixed(3)}/${delta.height.rms.toFixed(3)} sup ${delta.supportHeight.maxAbs.toFixed(3)} topo ${delta.topologyAmount.maxAbs.toFixed(2)} mat ${percent(delta.proxyMaterialChangeRatio)} edge ${percent(delta.materialEdgeChangeRatio)} enter ${delta.lifecycle.enteringCount}/${delta.lifecycle.hotEntrantCount} exit ${delta.lifecycle.exitedCount}/${delta.lifecycle.hotExitedCount} tail ${delta.lifecycle.tailingCount} ${suspicionSummary}`;
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
  let hotExitedCount = 0;
  let maxExitedAmount = 0;
  let maxExitedSupportAmount = 0;
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
    if (toIds.has(event.id)) {
      continue;
    }
    exitedCount += 1;
    maxExitedAmount = Math.max(maxExitedAmount, event.envelope.amount);
    maxExitedSupportAmount = Math.max(maxExitedSupportAmount, event.supportAmount);
    if (event.envelope.amount > 0.04) {
      hotExitedCount += 1;
    }
  }

  return {
    enteringCount: lifecycleCounts.entering,
    activeCount: lifecycleCounts.active,
    tailingCount: lifecycleCounts.tailing,
    enteredCount,
    exitedCount,
    hotExitedCount,
    maxExitedAmount,
    maxExitedSupportAmount,
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
  delta: HillPhaseUnscoredContinuityDelta
): readonly HillPhaseContinuitySuspicion[] {
  const suspicions: HillPhaseContinuitySuspicion[] = [];
  const shortContinuityWindow = isShortContinuityWindow(delta);
  if (delta.lifecycle.hotEntrantCount > 0) {
    suspicions.push({
      kind: 'hot-entering-support',
      severity: delta.lifecycle.hotEntrantCount,
      message: `${delta.lifecycle.hotEntrantCount} new support(s) entered above smooth attack threshold`
    });
  }
  if (delta.height.rms > 0.28 && delta.height.maxAbs > 0.35) {
    suspicions.push({
      kind: 'broad-height-step',
      severity: delta.height.rms,
      message: `broad height field moved ${delta.height.rms.toFixed(3)} rms across matched samples`
    });
  }
  if (delta.height.maxAbs > 1 && delta.height.rms < 0.18) {
    suspicions.push({
      kind: 'local-height-spike',
      severity: delta.height.maxAbs,
      message: `localized height spike reached ${delta.height.maxAbs.toFixed(3)} while field rms stayed ${delta.height.rms.toFixed(3)}`
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
  if (
    shortContinuityWindow &&
    (delta.proxyMaterialChangeRatio > 0.12 || delta.surfaceDetailChangeRatio > 0.16 || delta.materialEdgeChangeRatio > 0.16)
  ) {
    suspicions.push({
      kind: 'material-pop',
      severity: Math.max(delta.proxyMaterialChangeRatio, delta.surfaceDetailChangeRatio, delta.materialEdgeChangeRatio),
      message: `material/detail classes changed over ${percent(Math.max(delta.proxyMaterialChangeRatio, delta.surfaceDetailChangeRatio, delta.materialEdgeChangeRatio))} of matched samples`
    });
  }
  if (
    shortContinuityWindow &&
    hasVisibleTopologyContinuityDelta(delta) &&
    (delta.topologyAmount.maxAbs > 0.6 || delta.phaseInfluenceKindChangeRatio > 0.12)
  ) {
    suspicions.push({
      kind: 'topology-pop',
      severity: Math.max(delta.topologyAmount.maxAbs, delta.phaseInfluenceKindChangeRatio),
      message: `topology influence changed ${delta.topologyAmount.maxAbs.toFixed(2)} with ${percent(delta.phaseInfluenceKindChangeRatio)} kind churn`
    });
  }
  if (
    shortContinuityWindow &&
    delta.lifecycle.hotExitedCount > 0 &&
    delta.lifecycle.tailingCount === 0 &&
    hasVisibleContinuityDelta(delta)
  ) {
    suspicions.push({
      kind: 'support-exit',
      severity: delta.lifecycle.hotExitedCount,
      message: `${delta.lifecycle.hotExitedCount} visible support(s) exited without a visible tailing set`
    });
  }
  return suspicions;
}

function isShortContinuityWindow(delta: HillPhaseUnscoredContinuityDelta): boolean {
  return delta.phaseTimeDeltaMs <= 140;
}

function hasVisibleContinuityDelta(delta: HillPhaseUnscoredContinuityDelta): boolean {
  return (
    delta.height.maxAbs > 0.025 ||
    delta.supportHeight.maxAbs > 0.01 ||
    delta.topologyAmount.maxAbs > 0.06 ||
    delta.proxyMaterialChangeRatio > 0.02 ||
    delta.materialEdgeChangeRatio > 0.03 ||
    delta.surfaceDetailChangeRatio > 0.03 ||
    delta.phaseInfluenceKindChangeRatio > 0.02
  );
}

function hasVisibleTopologyContinuityDelta(delta: HillPhaseUnscoredContinuityDelta): boolean {
  return (
    delta.height.maxAbs > 0.025 ||
    delta.supportHeight.maxAbs > 0.01 ||
    delta.topologyAmount.maxAbs > 0.06 ||
    delta.topologyHeightDelta.maxAbs > 0.01
  );
}

function continuitySeverity(
  delta: HillPhaseUnscoredContinuityDelta,
  suspicions: readonly HillPhaseContinuitySuspicion[]
): number {
  const suspicionSeverity = suspicions.reduce((max, suspicion) => Math.max(max, suspicion.severity), 0);
  return Math.max(
    suspicionSeverity,
    delta.height.rms,
    delta.supportHeight.rms,
    delta.topologyAmount.rms,
    delta.proxyMaterialChangeRatio,
    delta.materialEdgeChangeRatio
  );
}

type HillPhaseUnscoredContinuityDelta = Omit<HillPhaseContinuityDelta, 'severity' | 'suspicions'>;

function uniqueSuspicionKinds(
  suspicions: readonly HillPhaseContinuitySuspicion[]
): readonly HillPhaseContinuitySuspicionKind[] {
  return [...new Set(suspicions.map((suspicion) => suspicion.kind))];
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
