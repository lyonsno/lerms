import {
  FIRST_VERTICAL_INTERFACE_SCHEMA,
  SOURCE_TRUTH_SCHEMA,
  TERRAIN_SAMPLE_SCHEMA,
  type FirstVerticalFrame,
  type SimulationAuthority,
  type SourceTruth,
  type TerrainRegion,
  type TerrainSample,
  type Vec3
} from '../contracts/first-vertical.js';

export const HILL_OF_HILLS_WITNESS_SCHEMA = 'lerms.hill-of-hills-witness.v0' as const;

export type TerrainFallbackStatus = 'none' | 'synthetic_fixture' | 'fallback' | 'invalid';
export type HillOfHillsPhaseMode = 'stable' | 'ditch_forming' | 'trail_forming' | 'mixed_forming';
export type HillOfHillsPhaseKind = 'ditch_forming' | 'trail_forming';
export type HillOfHillsPhaseInfluenceKind = 'none' | HillOfHillsPhaseKind;
export type HillOfHillsTrailSeedMethod = 'none' | 'random_band' | 'topology_score';
export type HillOfHillsProxyMaterialKind =
  | 'crown-warmth'
  | 'approach-clay'
  | 'slope-moss'
  | 'basin-pool'
  | 'ditch-shadow'
  | 'rim-crust'
  | 'growth-lip';

export interface HillOfHillsTopology {
  flowDirection: Vec3;
  flowAccumulation: number;
  ridgeStrength: number;
  valleyStrength: number;
  routePressure: number;
  ditchPotential: number;
  growthPotential: number;
}

export interface HillOfHillsProxyMaterial {
  kind: HillOfHillsProxyMaterialKind;
  color: Vec3;
  wetness: number;
  growthTint: number;
  blends: Partial<Record<HillOfHillsProxyMaterialKind, number>>;
}

export interface HillOfHillsPhaseEpisode {
  id: string;
  kind: HillOfHillsPhaseKind;
  center: Vec3;
  radius: number;
  progress: number;
  intensity: number;
  direction: Vec3;
  trailWidth: number;
  sideDitchOffset: number;
  seedMethod: HillOfHillsTrailSeedMethod;
  seedScore: number;
  seedRoutePressure: number;
  seedValleyStrength: number;
  seedFlowAccumulation: number;
  seedDitchPotential: number;
  seedSlope: number;
}

export interface HillOfHillsPhaseState {
  mode: HillOfHillsPhaseMode;
  terrainEpoch: number;
  activeEpisodes: readonly HillOfHillsPhaseEpisode[];
  checksum: string;
  phaseClock: number;
  phaseProgress: number;
  trailSeedMethod: HillOfHillsTrailSeedMethod;
  trailCandidateChecksum: string;
  trailCandidateScoreRange: Range;
  selectedTrailScoreRange: Range;
}

export interface HillOfHillsPhaseInfluence {
  kind: HillOfHillsPhaseInfluenceKind;
  amount: number;
  trailAmount: number;
  sideDitchAmount: number;
  episodeId?: string;
}

export interface HillOfHillsTerrainParams {
  seed: number;
  width: number;
  length: number;
  channelRadius: number;
  channelCurvature: number;
  wallHeight: number;
  floorWidth: number;
  hillRadius: number;
  hillCount: number;
  hillHeight: number;
  hillVariance: number;
  valleyRadius: number;
  valleyCount: number;
  valleyHeight: number;
  valleyVariance: number;
  distanceScale: number;
  worldScale: number;
  featureSpacing: number;
  textureScale: number;
  textureDamping: number;
  detailDamping: number;
  ditchPhaseSeed: number;
  ditchPhaseIntensity: number;
  ditchPhaseLimit: number;
  ditchPhaseRadius: number;
  ditchPhaseTimeMs: number;
  ditchPhaseDurationMs: number;
  trailPhaseSeed: number;
  trailPhaseIntensity: number;
  trailPhaseLimit: number;
  trailPhaseRadius: number;
  trailPhaseTimeMs: number;
  trailPhaseDurationMs: number;
  gridResolutionX: number;
  gridResolutionZ: number;
  crownZ: number;
}

export interface HillOfHillsTerrain {
  params: HillOfHillsTerrainParams;
  source: SourceTruth;
  phaseState: HillOfHillsPhaseState;
  samples: readonly HillOfHillsTerrainSample[];
  witness: HillOfHillsWitness;
}

export interface HillOfHillsTerrainSample extends TerrainSample {
  topology: HillOfHillsTopology;
  proxyMaterial: HillOfHillsProxyMaterial;
  phaseInfluence: HillOfHillsPhaseInfluence;
}

export interface HillOfHillsWitness {
  schema: typeof HILL_OF_HILLS_WITNESS_SCHEMA;
  source: SourceTruth;
  sourceAuthority: SimulationAuthority;
  route: string;
  fallbackStatus: TerrainFallbackStatus;
  effectiveParams: HillOfHillsTerrainParams;
  gridResolution: {
    x: number;
    z: number;
  };
  sampleSpacing: {
    x: number;
    z: number;
  };
  sampleCount: number;
  sampleChecksum: string;
  heightRange: {
    min: number;
    max: number;
  };
  regionCounts: Partial<Record<TerrainRegion, number>>;
  topologyChecksum: string;
  proxyMaterialChecksum: string;
  phaseMode: HillOfHillsPhaseMode;
  terrainEpoch: number;
  activePhaseCount: number;
  activePhaseKinds: Partial<Record<HillOfHillsPhaseKind, number>>;
  phaseClock: number;
  phaseProgress: number;
  phaseChecksum: string;
  phaseInfluenceChecksum: string;
  phaseInfluenceRange: Range;
  trailInfluenceRange: Range;
  sideDitchInfluenceRange: Range;
  phaseInfluenceKinds: Partial<Record<HillOfHillsPhaseInfluenceKind, number>>;
  trailSeedMethod: HillOfHillsTrailSeedMethod;
  trailCandidateChecksum: string;
  trailCandidateScoreRange: Range;
  selectedTrailScoreRange: Range;
  topologyRanges: {
    flowAccumulation: Range;
    ridgeStrength: Range;
    valleyStrength: Range;
    routePressure: Range;
    ditchPotential: Range;
    growthPotential: Range;
  };
  proxyMaterialCounts: Partial<Record<HillOfHillsProxyMaterialKind, number>>;
}

export interface HillOfHillsSourceOptions {
  authority?: SimulationAuthority;
  route?: string;
  frameId?: string;
  timestampMs?: number;
  sampleAgeMs?: number;
  backend?: string;
  configId?: string;
  fallbackStatus?: TerrainFallbackStatus;
}

interface TerrainFeature {
  x: number;
  z: number;
  radius: number;
  height: number;
}

interface HeightParts {
  base: number;
  wall: number;
  gutter: number;
  hills: number;
  valleys: number;
  detail: number;
  phaseDitch: number;
  height: number;
}

interface TrailSeedCandidate {
  x: number;
  z: number;
  score: number;
  direction: Vec3;
  routePressure: number;
  valleyStrength: number;
  flowAccumulation: number;
  ditchPotential: number;
  slope: number;
  region: TerrainRegion;
}

interface TrailCandidateSummary {
  candidates: readonly TrailSeedCandidate[];
  checksum: string;
  scoreRange: Range;
}

interface Range {
  min: number;
  max: number;
}

export const defaultHillOfHillsParams: HillOfHillsTerrainParams = {
  seed: 52027,
  width: 11.5,
  length: 16,
  channelRadius: 5.2,
  channelCurvature: 1.18,
  wallHeight: 2.7,
  floorWidth: 3.8,
  hillRadius: 1.55,
  hillCount: 14,
  hillHeight: 1.05,
  hillVariance: 0.55,
  valleyRadius: 1.7,
  valleyCount: 12,
  valleyHeight: 0.82,
  valleyVariance: 0.5,
  distanceScale: 1.1,
  worldScale: 1,
  featureSpacing: 1,
  textureScale: 1,
  textureDamping: 0.5,
  detailDamping: 0.42,
  ditchPhaseSeed: 7301,
  ditchPhaseIntensity: 0,
  ditchPhaseLimit: 0,
  ditchPhaseRadius: 1.25,
  ditchPhaseTimeMs: 0,
  ditchPhaseDurationMs: 1800,
  trailPhaseSeed: 9109,
  trailPhaseIntensity: 0,
  trailPhaseLimit: 0,
  trailPhaseRadius: 1.4,
  trailPhaseTimeMs: 0,
  trailPhaseDurationMs: 1900,
  gridResolutionX: 72,
  gridResolutionZ: 96,
  crownZ: 5.2
};

export function createHillOfHillsTerrain(
  params: Partial<HillOfHillsTerrainParams> = {},
  sourceOptions: HillOfHillsSourceOptions = {}
): HillOfHillsTerrain {
  const effectiveParams = normalizeParams({ ...defaultHillOfHillsParams, ...params });
  const fallbackStatus = normalizeFallbackStatus(sourceOptions);
  const source = createTerrainSource(effectiveParams, sourceOptions, fallbackStatus);
  const phaseState = createPhaseState(effectiveParams);
  const samples = generateSamples(effectiveParams, source, phaseState);
  const witness = createWitness(effectiveParams, source, phaseState, samples, fallbackStatus);

  return {
    params: effectiveParams,
    source,
    phaseState,
    samples,
    witness
  };
}

export function sampleHillOfHillsTerrain(terrain: HillOfHillsTerrain, x: number, z: number): HillOfHillsTerrainSample {
  return sampleTerrain(terrain.params, terrain.source, terrain.phaseState, x, z);
}

export function createHillOfHillsFrame(terrain: HillOfHillsTerrain): FirstVerticalFrame {
  return {
    schema: FIRST_VERTICAL_INTERFACE_SCHEMA,
    source: terrain.source,
    terrainSamples: terrain.samples,
    lerms: [],
    goins: [],
    juiceHits: [],
    carrierDropEvents: []
  };
}

function normalizeParams(params: HillOfHillsTerrainParams): HillOfHillsTerrainParams {
  const worldScale = clamp(finiteOr(params.worldScale, 1), 0.55, 1.85);
  const channelRadius = finiteAtLeast(params.channelRadius, 1.2) * worldScale;
  const floorWidth = clamp(finiteAtLeast(params.floorWidth, 0.8) * worldScale, 0.8 * worldScale, channelRadius * 1.55);
  const length = finiteAtLeast(params.length, 4) * worldScale;

  return {
    seed: Math.floor(finiteOr(params.seed, defaultHillOfHillsParams.seed)),
    width: finiteAtLeast(params.width * worldScale, channelRadius * 2.05),
    length,
    channelRadius,
    channelCurvature: clamp(finiteOr(params.channelCurvature, 1), 0.25, 3),
    wallHeight: finiteAtLeast(params.wallHeight, 0.1),
    floorWidth,
    hillRadius: finiteAtLeast(params.hillRadius, 0.35) * worldScale,
    hillCount: Math.round(clamp(finiteOr(params.hillCount, 14), 1, 64)),
    hillHeight: finiteAtLeast(params.hillHeight, 0),
    hillVariance: clamp(finiteOr(params.hillVariance, 0.5), 0, 1.5),
    valleyRadius: finiteAtLeast(params.valleyRadius, 0.35) * worldScale,
    valleyCount: Math.round(clamp(finiteOr(params.valleyCount, 12), 1, 64)),
    valleyHeight: finiteAtLeast(params.valleyHeight, 0),
    valleyVariance: clamp(finiteOr(params.valleyVariance, 0.5), 0, 1.5),
    distanceScale: clamp(finiteOr(params.distanceScale, 1.1), 0.25, 3),
    worldScale,
    featureSpacing: clamp(finiteOr(params.featureSpacing, 1), 0.35, 2.5),
    textureScale: clamp(finiteOr(params.textureScale, 1), 0.25, 3.5),
    textureDamping: clamp(finiteOr(params.textureDamping, 0.5), 0, 1),
    detailDamping: clamp(finiteOr(params.detailDamping, 0.5), 0, 1),
    ditchPhaseSeed: Math.floor(finiteOr(params.ditchPhaseSeed, defaultHillOfHillsParams.ditchPhaseSeed)),
    ditchPhaseIntensity: clamp(finiteOr(params.ditchPhaseIntensity, 0), 0, 1),
    ditchPhaseLimit: Math.round(clamp(finiteOr(params.ditchPhaseLimit, 0), 0, 8)),
    ditchPhaseRadius: clamp(finiteAtLeast(params.ditchPhaseRadius, 0.35) * worldScale, 0.35 * worldScale, 3.2 * worldScale),
    ditchPhaseTimeMs: Math.max(0, finiteOr(params.ditchPhaseTimeMs, 0)),
    ditchPhaseDurationMs: finiteAtLeast(params.ditchPhaseDurationMs, 240),
    trailPhaseSeed: Math.floor(finiteOr(params.trailPhaseSeed, defaultHillOfHillsParams.trailPhaseSeed)),
    trailPhaseIntensity: clamp(finiteOr(params.trailPhaseIntensity, 0), 0, 1),
    trailPhaseLimit: Math.round(clamp(finiteOr(params.trailPhaseLimit, 0), 0, 8)),
    trailPhaseRadius: clamp(finiteAtLeast(params.trailPhaseRadius, 0.35) * worldScale, 0.35 * worldScale, 3.4 * worldScale),
    trailPhaseTimeMs: Math.max(0, finiteOr(params.trailPhaseTimeMs, 0)),
    trailPhaseDurationMs: finiteAtLeast(params.trailPhaseDurationMs, 240),
    gridResolutionX: Math.max(8, Math.round(finiteOr(params.gridResolutionX, 72))),
    gridResolutionZ: Math.max(8, Math.round(finiteOr(params.gridResolutionZ, 96))),
    crownZ: clamp(finiteOr(params.crownZ, defaultHillOfHillsParams.crownZ) * worldScale, -length * 0.5, length * 0.5)
  };
}

function createTerrainSource(
  params: HillOfHillsTerrainParams,
  options: HillOfHillsSourceOptions,
  fallbackStatus: TerrainFallbackStatus
): SourceTruth {
  const route = options.route ?? 'hill-of-hills-terrain';
  const configId = options.configId ?? `hill-of-hills:${checksum(JSON.stringify(params)).slice(0, 10)}`;

  return {
    schema: SOURCE_TRUTH_SCHEMA,
    authority: authorityForFallbackStatus(fallbackStatus, options.authority),
    route,
    frameId: options.frameId ?? `${route}:${configId}`,
    timestampMs: options.timestampMs ?? 0,
    sampleAgeMs: options.sampleAgeMs ?? 0,
    backend: options.backend ?? 'deterministic-cpu-heightfield',
    configId
  };
}

function normalizeFallbackStatus(options: HillOfHillsSourceOptions): TerrainFallbackStatus {
  if (options.fallbackStatus) {
    return options.fallbackStatus;
  }

  if (options.authority === 'fallback') return 'fallback';
  if (options.authority === 'invalid') return 'invalid';
  if (options.authority === 'synthetic_fixture') return 'synthetic_fixture';
  return 'none';
}

function authorityForFallbackStatus(
  fallbackStatus: TerrainFallbackStatus,
  requestedAuthority: SimulationAuthority | undefined
): SimulationAuthority {
  if (fallbackStatus === 'fallback') return 'fallback';
  if (fallbackStatus === 'invalid') return 'invalid';
  if (fallbackStatus === 'synthetic_fixture') return 'synthetic_fixture';
  return requestedAuthority ?? 'live_simulation';
}

function createPhaseState(params: HillOfHillsTerrainParams): HillOfHillsPhaseState {
  const episodes: HillOfHillsPhaseEpisode[] = [];
  const ditchTiming = phaseTiming(params.ditchPhaseTimeMs, params.ditchPhaseDurationMs);
  const trailTiming = phaseTiming(params.trailPhaseTimeMs, params.trailPhaseDurationMs);
  const ditchIntensity = clamp(params.ditchPhaseIntensity * ditchTiming.progress, 0, 1);
  const trailIntensity = clamp(params.trailPhaseIntensity * trailTiming.progress, 0, 1);
  const terrainEpoch = Math.max(ditchTiming.epoch, trailTiming.epoch);
  const halfFloor = params.floorWidth * 0.5;
  let trailSeedMethod: HillOfHillsTrailSeedMethod = 'none';
  let trailCandidateSummary = emptyTrailCandidateSummary();
  let selectedTrailScoreRange = zeroRange();

  if (ditchIntensity > 0 && params.ditchPhaseLimit > 0) {
    const rng = mulberry32(params.ditchPhaseSeed + ditchTiming.epoch * 131071 + params.seed * 17);
    for (let i = 0; i < params.ditchPhaseLimit; i += 1) {
      const side = rng() < 0.5 ? -1 : 1;
      const gutterBias = halfFloor * (0.86 + rng() * 0.86);
      const x = side * clamp(gutterBias, halfFloor * 0.66, params.channelRadius * 0.72);
      const z = -params.length * 0.42 + rng() * params.length * 0.84;
      const radius = params.ditchPhaseRadius * (0.72 + rng() * 0.46);
      const localProgress = clamp(ditchTiming.progress * (0.82 + rng() * 0.2), 0, 1);
      const localIntensity = ditchIntensity * (0.72 + rng() * 0.3);
      episodes.push({
        id: `ditch-${ditchTiming.epoch}-${i}-${roundId(x)}-${roundId(z)}`,
        kind: 'ditch_forming',
        center: [x, 0, z],
        radius,
        progress: localProgress,
        intensity: localIntensity,
        direction: [0, 0, 1],
        trailWidth: radius * 0.38,
        sideDitchOffset: radius * 0.42,
        seedMethod: 'random_band',
        seedScore: 0,
        seedRoutePressure: 0,
        seedValleyStrength: 0,
        seedFlowAccumulation: 0,
        seedDitchPotential: 0,
        seedSlope: 0
      });
    }
  }

  if (trailIntensity > 0 && params.trailPhaseLimit > 0) {
    const rng = mulberry32(params.trailPhaseSeed + trailTiming.epoch * 91757 + params.seed * 23);
    trailCandidateSummary = scoreTrailCandidates(params);
    const selectedCandidates = selectTrailCandidates(params, trailCandidateSummary.candidates, params.trailPhaseLimit, rng);
    selectedTrailScoreRange = scoreRangeForCandidates(selectedCandidates);
    trailSeedMethod = selectedCandidates.length > 0 ? 'topology_score' : 'none';

    for (let i = 0; i < selectedCandidates.length; i += 1) {
      const candidate = selectedCandidates[i];
      const angle = (rng() - 0.5) * 0.34;
      const direction = normalize([
        candidate.direction[0] * Math.cos(angle) + candidate.direction[2] * Math.sin(angle),
        0,
        candidate.direction[2] * Math.cos(angle) - candidate.direction[0] * Math.sin(angle)
      ]);
      const radius = params.trailPhaseRadius * (0.86 + rng() * 0.42);
      const trailWidth = Math.max(0.16, radius * (0.2 + rng() * 0.08));
      const sideDitchOffset = Math.max(trailWidth * 1.55, radius * (0.36 + rng() * 0.08));
      const localProgress = clamp(trailTiming.progress * (0.84 + rng() * 0.18), 0, 1);
      const localIntensity = trailIntensity * (0.76 + rng() * 0.24);
      episodes.push({
        id: `trail-${trailTiming.epoch}-${i}-${roundId(candidate.x)}-${roundId(candidate.z)}`,
        kind: 'trail_forming',
        center: [candidate.x, 0, candidate.z],
        radius,
        progress: localProgress,
        intensity: localIntensity,
        direction,
        trailWidth,
        sideDitchOffset,
        seedMethod: 'topology_score',
        seedScore: candidate.score,
        seedRoutePressure: candidate.routePressure,
        seedValleyStrength: candidate.valleyStrength,
        seedFlowAccumulation: candidate.flowAccumulation,
        seedDitchPotential: candidate.ditchPotential,
        seedSlope: candidate.slope
      });
    }
  }

  const mode = phaseModeFor(episodes);
  const phaseClock = episodes.length === 0 ? 0 : Math.max(ditchIntensity > 0 ? ditchTiming.clock : 0, trailIntensity > 0 ? trailTiming.clock : 0);
  const phaseProgress = episodes.length === 0 ? 0 : Math.max(ditchIntensity > 0 ? ditchTiming.progress : 0, trailIntensity > 0 ? trailTiming.progress : 0);

  if (episodes.length === 0) {
    const checksumInput = [
      'stable',
      terrainEpoch,
      params.ditchPhaseSeed,
      params.ditchPhaseIntensity.toFixed(3),
      params.trailPhaseSeed,
      params.trailPhaseIntensity.toFixed(3)
    ].join(':');
    return {
      mode,
      terrainEpoch,
      activeEpisodes: [],
      checksum: checksum(checksumInput),
      phaseClock,
      phaseProgress,
      trailSeedMethod,
      trailCandidateChecksum: trailCandidateSummary.checksum,
      trailCandidateScoreRange: trailCandidateSummary.scoreRange,
      selectedTrailScoreRange
    };
  }

  return {
    mode,
    terrainEpoch,
    activeEpisodes: episodes,
    checksum: checksum(episodes.map((episode) => phaseEpisodeSignature(episode)).join('|')),
    phaseClock,
    phaseProgress,
    trailSeedMethod,
    trailCandidateChecksum: trailCandidateSummary.checksum,
    trailCandidateScoreRange: trailCandidateSummary.scoreRange,
    selectedTrailScoreRange
  };
}

function phaseTiming(timeMs: number, durationMs: number): { epoch: number; clock: number; progress: number } {
  const duration = Math.max(1, durationMs);
  const epoch = Math.floor(timeMs / duration);
  const clock = (timeMs % duration) / duration;
  const progress = smoothstep(0.04, 0.46, clock) * (1 - smoothstep(0.9, 1, clock));
  return { epoch, clock, progress };
}

function phaseModeFor(episodes: readonly HillOfHillsPhaseEpisode[]): HillOfHillsPhaseMode {
  const hasDitch = episodes.some((episode) => episode.kind === 'ditch_forming');
  const hasTrail = episodes.some((episode) => episode.kind === 'trail_forming');
  if (hasDitch && hasTrail) return 'mixed_forming';
  if (hasTrail) return 'trail_forming';
  if (hasDitch) return 'ditch_forming';
  return 'stable';
}

function scoreTrailCandidates(params: HillOfHillsTerrainParams): TrailCandidateSummary {
  const phaseState = stablePhaseStateForTopologyScoring();
  const phaseInfluence = emptyPhaseInfluence();
  const candidates: TrailSeedCandidate[] = [];
  const scoreRange = createRange();
  const halfFloor = params.floorWidth * 0.5;
  const xCount = 19;
  const zCount = 29;
  const xExtent = Math.min(params.width * 0.44, params.channelRadius * 0.88);
  const zExtent = params.length * 0.43;

  for (let zi = 0; zi < zCount; zi += 1) {
    const zT = zi / (zCount - 1);
    const z = -zExtent + zT * zExtent * 2;
    for (let xi = 0; xi < xCount; xi += 1) {
      const xT = xi / (xCount - 1);
      const x = -xExtent + xT * xExtent * 2;
      const heightParts = heightAt(params, phaseState, x, z);
      const epsX = Math.max(0.02, params.width / (params.gridResolutionX * 2));
      const epsZ = Math.max(0.02, params.length / (params.gridResolutionZ * 2));
      const heightLeft = heightAt(params, phaseState, x - epsX, z).height;
      const heightRight = heightAt(params, phaseState, x + epsX, z).height;
      const heightBack = heightAt(params, phaseState, x, z - epsZ).height;
      const heightForward = heightAt(params, phaseState, x, z + epsZ).height;
      const dx = (heightRight - heightLeft) / (epsX * 2);
      const dz = (heightForward - heightBack) / (epsZ * 2);
      const slope = Math.hypot(dx, dz);
      const region = classifyRegion(params, phaseState, x, z, heightParts.height, slope);
      const topology = topologyAt(params, x, z, heightParts, dx, dz, slope, region, phaseInfluence);
      const lateral = Math.abs(x);
      const centerFloor = 1 - smoothstep(halfFloor * 0.2, params.channelRadius * 0.76, lateral);
      const traversable = 1 - smoothstep(0.9, 2.2, slope);
      const crownPull = 1 - clamp(Math.abs(z - params.crownZ) / Math.max(0.001, params.length * 0.5), 0, 1);
      const fixedGutterPenalty = Math.exp(-Math.pow((lateral - halfFloor * 1.28) / Math.max(0.35, halfFloor * 0.33), 2));
      const crossSlopeSignal = clamp(Math.abs(topology.flowDirection[0]) * 0.06 + slope * 0.03, 0, 0.12);
      const regionBias =
        region === 'approach'
          ? 0.08
          : region === 'basin'
            ? 0.1
            : region === 'slope'
              ? 0.05
              : region === 'crown'
                ? 0.04
                : region === 'gutter'
                  ? -0.12
                  : -0.22;
      const score = clamp(
        topology.routePressure * 0.25 +
          topology.valleyStrength * 0.24 +
          topology.flowAccumulation * 0.18 +
          centerFloor * 0.07 +
          traversable * 0.08 +
          crownPull * 0.05 +
          topology.ditchPotential * 0.04 +
          crossSlopeSignal +
          regionBias -
          fixedGutterPenalty * 0.12,
        0,
        1
      );
      const direction = normalize([
        topology.flowDirection[0] * 0.5 - dx * 0.16,
        0,
        0.92 + topology.flowDirection[2] * 0.36 - dz * 0.12
      ]);

      includeInRange(scoreRange, score);
      candidates.push({
        x,
        z,
        score,
        direction,
        routePressure: topology.routePressure,
        valleyStrength: topology.valleyStrength,
        flowAccumulation: topology.flowAccumulation,
        ditchPotential: topology.ditchPotential,
        slope,
        region
      });
    }
  }

  return {
    candidates,
    checksum: checksum(candidates.map((candidate) => trailCandidateSignature(candidate)).join('|')),
    scoreRange: settledRange(scoreRange)
  };
}

function selectTrailCandidates(
  params: HillOfHillsTerrainParams,
  candidates: readonly TrailSeedCandidate[],
  limit: number,
  rng: () => number
): TrailSeedCandidate[] {
  const minimumSeparation = Math.max(params.trailPhaseRadius * 1.1, params.floorWidth * 0.42);
  const ranked = candidates
    .map((candidate) => ({
      candidate,
      rankScore: candidate.score + (rng() - 0.5) * 0.025
    }))
    .sort((a, b) => b.rankScore - a.rankScore);
  const selected: TrailSeedCandidate[] = [];

  for (const rankedCandidate of ranked) {
    const candidate = rankedCandidate.candidate;
    if (candidate.score < 0.18) continue;
    const tooClose = selected.some((selectedCandidate) => Math.hypot(candidate.x - selectedCandidate.x, candidate.z - selectedCandidate.z) < minimumSeparation);
    if (tooClose) continue;
    selected.push(candidate);
    if (selected.length >= limit) break;
  }

  return selected;
}

function scoreRangeForCandidates(candidates: readonly TrailSeedCandidate[]): Range {
  const range = createRange();
  for (const candidate of candidates) {
    includeInRange(range, candidate.score);
  }
  return settledRange(range);
}

function trailCandidateSignature(candidate: TrailSeedCandidate): string {
  return [
    roundId(candidate.x),
    roundId(candidate.z),
    candidate.score.toFixed(3),
    candidate.routePressure.toFixed(3),
    candidate.valleyStrength.toFixed(3),
    candidate.flowAccumulation.toFixed(3),
    candidate.ditchPotential.toFixed(3),
    candidate.slope.toFixed(3),
    candidate.region
  ].join(':');
}

function stablePhaseStateForTopologyScoring(): HillOfHillsPhaseState {
  return {
    mode: 'stable',
    terrainEpoch: 0,
    activeEpisodes: [],
    checksum: 'stable-topology-scoring',
    phaseClock: 0,
    phaseProgress: 0,
    trailSeedMethod: 'none',
    trailCandidateChecksum: 'none',
    trailCandidateScoreRange: zeroRange(),
    selectedTrailScoreRange: zeroRange()
  };
}

function emptyPhaseInfluence(): HillOfHillsPhaseInfluence {
  return {
    kind: 'none',
    amount: 0,
    trailAmount: 0,
    sideDitchAmount: 0
  };
}

function emptyTrailCandidateSummary(): TrailCandidateSummary {
  return {
    candidates: [],
    checksum: 'none',
    scoreRange: zeroRange()
  };
}

function activePhaseKinds(episodes: readonly HillOfHillsPhaseEpisode[]): Partial<Record<HillOfHillsPhaseKind, number>> {
  const counts: Partial<Record<HillOfHillsPhaseKind, number>> = {};
  for (const episode of episodes) {
    counts[episode.kind] = (counts[episode.kind] ?? 0) + 1;
  }
  return counts;
}

function phaseInfluenceAt(phaseState: HillOfHillsPhaseState, x: number, z: number): HillOfHillsPhaseInfluence {
  let bestKind: HillOfHillsPhaseInfluenceKind = 'none';
  let bestAmount = 0;
  let bestTrailAmount = 0;
  let bestSideDitchAmount = 0;
  let bestEpisodeId: string | undefined;

  for (const episode of phaseState.activeEpisodes) {
    if (episode.kind === 'trail_forming') {
      const influence = trailInfluenceAtEpisode(episode, x, z);
      const amount = Math.max(influence.trailAmount * 0.92, influence.sideDitchAmount);
      if (amount > bestAmount) {
        bestKind = 'trail_forming';
        bestAmount = amount;
        bestTrailAmount = influence.trailAmount;
        bestSideDitchAmount = influence.sideDitchAmount;
        bestEpisodeId = episode.id;
      }
      continue;
    }

    const dx = (x - episode.center[0]) / Math.max(0.001, episode.radius * 0.48);
    const dz = (z - episode.center[2]) / Math.max(0.001, episode.radius * 1.9);
    const ellipticalDistance = Math.hypot(dx, dz);
    const band = 1 - smoothstep(0.12, 1, ellipticalDistance);
    const amount = clamp(band * episode.intensity, 0, 1);
    if (amount > bestAmount) {
      bestKind = 'ditch_forming';
      bestAmount = amount;
      bestTrailAmount = 0;
      bestSideDitchAmount = amount;
      bestEpisodeId = episode.id;
    }
  }

  if (bestAmount <= 0) {
    return {
      kind: 'none',
      amount: 0,
      trailAmount: 0,
      sideDitchAmount: 0
    };
  }

  return {
    kind: bestKind,
    amount: bestAmount,
    trailAmount: bestTrailAmount,
    sideDitchAmount: bestSideDitchAmount,
    episodeId: bestEpisodeId
  };
}

function trailInfluenceAtEpisode(
  episode: HillOfHillsPhaseEpisode,
  x: number,
  z: number
): { trailAmount: number; sideDitchAmount: number } {
  const px = x - episode.center[0];
  const pz = z - episode.center[2];
  const along = px * episode.direction[0] + pz * episode.direction[2];
  const lateral = px * episode.direction[2] - pz * episode.direction[0];
  const longBand = 1 - smoothstep(episode.radius * 0.18, episode.radius * 1.95, Math.abs(along));
  const trailBand = 1 - smoothstep(episode.trailWidth * 0.45, episode.trailWidth, Math.abs(lateral));
  const leftDitch = 1 - smoothstep(episode.trailWidth * 0.32, episode.trailWidth * 1.2, Math.abs(lateral - episode.sideDitchOffset));
  const rightDitch = 1 - smoothstep(episode.trailWidth * 0.32, episode.trailWidth * 1.2, Math.abs(lateral + episode.sideDitchOffset));
  return {
    trailAmount: clamp(trailBand * longBand * episode.intensity, 0, 1),
    sideDitchAmount: clamp(Math.max(leftDitch, rightDitch) * longBand * episode.intensity, 0, 1)
  };
}

function phaseEpisodeSignature(episode: HillOfHillsPhaseEpisode): string {
  return [
    episode.id,
    episode.kind,
    episode.center[0].toFixed(3),
    episode.center[2].toFixed(3),
    episode.radius.toFixed(3),
    episode.progress.toFixed(3),
    episode.intensity.toFixed(3),
    episode.direction[0].toFixed(3),
    episode.direction[2].toFixed(3),
    episode.trailWidth.toFixed(3),
    episode.sideDitchOffset.toFixed(3),
    episode.seedMethod,
    episode.seedScore.toFixed(3),
    episode.seedRoutePressure.toFixed(3),
    episode.seedValleyStrength.toFixed(3),
    episode.seedFlowAccumulation.toFixed(3),
    episode.seedDitchPotential.toFixed(3),
    episode.seedSlope.toFixed(3)
  ].join(':');
}

function generateSamples(
  params: HillOfHillsTerrainParams,
  source: SourceTruth,
  phaseState: HillOfHillsPhaseState
): HillOfHillsTerrainSample[] {
  const samples: HillOfHillsTerrainSample[] = [];
  const dx = params.width / (params.gridResolutionX - 1);
  const dz = params.length / (params.gridResolutionZ - 1);

  for (let zi = 0; zi < params.gridResolutionZ; zi += 1) {
    const z = -params.length * 0.5 + zi * dz;
    for (let xi = 0; xi < params.gridResolutionX; xi += 1) {
      const x = -params.width * 0.5 + xi * dx;
      samples.push(sampleTerrain(params, source, phaseState, x, z, `terrain-${xi}-${zi}`));
    }
  }

  return samples;
}

function sampleTerrain(
  params: HillOfHillsTerrainParams,
  source: SourceTruth,
  phaseState: HillOfHillsPhaseState,
  x: number,
  z: number,
  id?: string
): HillOfHillsTerrainSample {
  const clampedX = clamp(x, -params.width * 0.5, params.width * 0.5);
  const clampedZ = clamp(z, -params.length * 0.5, params.length * 0.5);
  const phaseInfluence = phaseInfluenceAt(phaseState, clampedX, clampedZ);
  const heightParts = heightAt(params, phaseState, clampedX, clampedZ);
  const height = heightParts.height;
  const epsX = Math.max(0.02, params.width / (params.gridResolutionX * 2));
  const epsZ = Math.max(0.02, params.length / (params.gridResolutionZ * 2));
  const heightLeft = heightAt(params, phaseState, clampedX - epsX, clampedZ).height;
  const heightRight = heightAt(params, phaseState, clampedX + epsX, clampedZ).height;
  const heightBack = heightAt(params, phaseState, clampedX, clampedZ - epsZ).height;
  const heightForward = heightAt(params, phaseState, clampedX, clampedZ + epsZ).height;
  const dx = (heightRight - heightLeft) / (epsX * 2);
  const dz = (heightForward - heightBack) / (epsZ * 2);
  const normal = normalize([-dx, 1, -dz]);
  const slope = Math.hypot(dx, dz);
  const region = classifyRegion(params, phaseState, clampedX, clampedZ, height, slope);
  const topology = topologyAt(params, clampedX, clampedZ, heightParts, dx, dz, slope, region, phaseInfluence);
  const proxyMaterial = proxyMaterialFor(region, topology);

  return {
    schema: TERRAIN_SAMPLE_SCHEMA,
    id: id ?? `terrain-${roundId(clampedX)}-${roundId(clampedZ)}`,
    source,
    world: [clampedX, height, clampedZ],
    normal,
    height,
    slope,
    region,
    topology,
    proxyMaterial,
    phaseInfluence
  };
}

function topologyAt(
  params: HillOfHillsTerrainParams,
  x: number,
  z: number,
  heightParts: HeightParts,
  dx: number,
  dz: number,
  slope: number,
  region: TerrainRegion,
  phaseInfluence: HillOfHillsPhaseInfluence
): HillOfHillsTopology {
  const lateral = Math.abs(x);
  const halfFloor = params.floorWidth * 0.5;
  const uphill = (z + params.length * 0.5) / params.length;
  const centerRoute = 1 - smoothstep(halfFloor * 0.42, halfFloor * 1.08, lateral);
  const crownPull = 1 - clamp(Math.abs(z - params.crownZ) / Math.max(0.001, params.length * 0.48), 0, 1);
  const gutterBand = Math.exp(-Math.pow((lateral - halfFloor * 1.28) / Math.max(0.35, halfFloor * 0.33), 2));
  const valleyStrength = clamp(
    heightParts.valleys / Math.max(0.001, params.valleyHeight * 1.9) +
      phaseInfluence.sideDitchAmount * 0.2 +
      phaseInfluence.trailAmount * 0.08,
    0,
    1
  );
  const ridgeStrength = clamp(Math.max(heightParts.hills, heightParts.wall * 0.42) / Math.max(0.001, params.hillHeight * 1.8 + params.wallHeight * 0.35), 0, 1);
  const flowAccumulation = clamp(gutterBand * 0.66 + valleyStrength * 0.52 + uphill * 0.18 + phaseInfluence.sideDitchAmount * 0.32, 0, 1);
  const routePressure = clamp(
    centerRoute * 0.58 + crownPull * 0.24 + flowAccumulation * 0.2 + phaseInfluence.trailAmount * 0.42 + phaseInfluence.sideDitchAmount * 0.08 - slope * 0.12,
    0,
    1
  );
  const ditchPotential = clamp(gutterBand * 0.72 + valleyStrength * 0.48 + phaseInfluence.sideDitchAmount * 0.58 + (region === 'gutter' ? 0.18 : 0), 0, 1);
  const growthPotential = clamp(ridgeStrength * 0.46 + slope * 0.2 + crownPull * 0.12 - ditchPotential * 0.2, 0, 1);
  const flowDirection = normalize([dx, 0.18 + flowAccumulation * 0.22, dz + 0.28]);

  return {
    flowDirection,
    flowAccumulation,
    ridgeStrength,
    valleyStrength,
    routePressure,
    ditchPotential,
    growthPotential
  };
}

function proxyMaterialFor(region: TerrainRegion, topology: HillOfHillsTopology): HillOfHillsProxyMaterial {
  const kind = proxyMaterialKindFor(region, topology);
  const blends = proxyMaterialBlendsFor(region, topology, kind);
  const color = blendedProxyColor(blends);
  const wetness = clamp(topology.flowAccumulation * 0.5 + topology.ditchPotential * 0.42 + topology.valleyStrength * 0.26, 0, 1);
  const growthTint = clamp(topology.growthPotential * 0.86 + (kind === 'growth-lip' ? 0.14 : 0), 0, 1);

  return {
    kind,
    color,
    wetness,
    growthTint,
    blends
  };
}

function proxyMaterialKindFor(region: TerrainRegion, topology: HillOfHillsTopology): HillOfHillsProxyMaterialKind {
  if (region === 'crown') return 'crown-warmth';
  if (topology.growthPotential > 0.54 && (region === 'slope' || region === 'rim')) return 'growth-lip';
  if (region === 'gutter' || topology.ditchPotential > 0.58) return 'ditch-shadow';
  if (region === 'basin') return 'basin-pool';
  if (region === 'rim') return 'rim-crust';
  if (region === 'slope') return 'slope-moss';
  return 'approach-clay';
}

function proxyColorFor(kind: HillOfHillsProxyMaterialKind): Vec3 {
  switch (kind) {
    case 'crown-warmth':
      return [205, 165, 72];
    case 'basin-pool':
      return [43, 123, 137];
    case 'ditch-shadow':
      return [67, 58, 104];
    case 'growth-lip':
      return [78, 146, 84];
    case 'rim-crust':
      return [160, 137, 79];
    case 'slope-moss':
      return [104, 139, 73];
    case 'approach-clay':
      return [123, 126, 92];
  }
}

function proxyMaterialBlendsFor(
  region: TerrainRegion,
  topology: HillOfHillsTopology,
  dominantKind: HillOfHillsProxyMaterialKind
): HillOfHillsProxyMaterial['blends'] {
  const raw: Partial<Record<HillOfHillsProxyMaterialKind, number>> = {
    [dominantKind]: 1,
    'ditch-shadow': topology.ditchPotential * 0.72,
    'basin-pool': topology.valleyStrength * 0.56,
    'growth-lip': topology.growthPotential * 0.62,
    'approach-clay': topology.routePressure * 0.48,
    'slope-moss': topology.ridgeStrength * 0.32,
    'rim-crust': region === 'rim' ? 0.52 : topology.ridgeStrength * 0.16,
    'crown-warmth': region === 'crown' ? 0.82 : 0
  };
  raw[dominantKind] = Math.max(raw[dominantKind] ?? 0, 1);

  const total = Object.values(raw).reduce((sum, value) => sum + Math.max(0, value ?? 0), 0) || 1;
  const normalized: Partial<Record<HillOfHillsProxyMaterialKind, number>> = {};
  for (const [kind, value] of Object.entries(raw) as [HillOfHillsProxyMaterialKind, number][]) {
    const weight = clamp(value / total, 0, 1);
    if (weight > 0.015) {
      normalized[kind] = weight;
    }
  }
  return normalized;
}

function blendedProxyColor(blends: HillOfHillsProxyMaterial['blends']): Vec3 {
  let r = 0;
  let g = 0;
  let b = 0;
  let total = 0;

  for (const [kind, weight] of Object.entries(blends) as [HillOfHillsProxyMaterialKind, number][]) {
    const color = proxyColorFor(kind);
    r += color[0] * weight;
    g += color[1] * weight;
    b += color[2] * weight;
    total += weight;
  }

  const divisor = total || 1;
  return [r / divisor, g / divisor, b / divisor];
}

function heightAt(params: HillOfHillsTerrainParams, phaseState: HillOfHillsPhaseState, x: number, z: number): HeightParts {
  const halfFloor = params.floorWidth * 0.5;
  const lateral = Math.abs(x);
  const uphill = (z + params.length * 0.5) / params.length;
  const base = 0.34 + uphill * 0.66;
  const wallT = smoothstep(halfFloor, params.channelRadius, lateral);
  const cylindricalLift = 1 - Math.sqrt(Math.max(0, 1 - wallT * wallT));
  const wall = params.wallHeight * Math.pow(cylindricalLift, 0.8 / params.channelCurvature);
  const gutterT = Math.exp(-Math.pow((lateral - halfFloor * 1.28) / Math.max(0.35, halfFloor * 0.33), 2));
  const gutter = -0.26 * gutterT * (0.75 + 0.25 * Math.sin(z * 1.4));
  const floorProtection = 1 - smoothstep(halfFloor * 0.45, halfFloor * 0.95, lateral);
  const hillFeatures = terrainFeatures(params, 'hill');
  const valleyFeatures = terrainFeatures(params, 'valley');
  const featureDistanceScale = params.distanceScale / params.featureSpacing;
  const hills = featureContribution(hillFeatures, x, z, featureDistanceScale);
  const valleys = featureContribution(valleyFeatures, x, z, featureDistanceScale);
  const macroDamping = 1 - floorProtection * 0.58;
  const valleyFloorDamping = 1 - floorProtection * 0.82;
  const textureAmplitude = 0.18 * (1 - params.textureDamping);
  const detailAmplitude = 0.1 * (1 - params.detailDamping);
  const detail =
    textureAmplitude * Math.sin((x * 1.55 + z * 0.42 + params.seed * 0.001) * params.textureScale) +
    detailAmplitude * Math.cos((x * 3.6 - z * 2.1 + params.seed * 0.002) * params.textureScale);
  const phaseInfluence = phaseInfluenceAt(phaseState, x, z);
  const phaseDitch =
    phaseInfluence.sideDitchAmount * (0.18 + params.valleyHeight * 0.24 + params.wallHeight * 0.035) +
    phaseInfluence.trailAmount * (0.06 + params.valleyHeight * 0.05);
  const openFloor = base + wall + gutter + hills * macroDamping - valleys * valleyFloorDamping + detail - phaseDitch;
  const floorMinimum = base - 0.12 - Math.max(0, params.valleyHeight - 1.2) * 0.08;
  const height = lateral <= halfFloor * 0.9 ? Math.max(openFloor, floorMinimum - phaseDitch * 0.86) : openFloor;

  return {
    base,
    wall,
    gutter,
    hills,
    valleys,
    detail,
    phaseDitch,
    height
  };
}

function classifyRegion(
  params: HillOfHillsTerrainParams,
  phaseState: HillOfHillsPhaseState,
  x: number,
  z: number,
  height: number,
  slope: number
): TerrainRegion {
  const lateral = Math.abs(x);
  const halfFloor = params.floorWidth * 0.5;
  const heightParts = heightAt(params, phaseState, x, z);

  if (Math.abs(z - params.crownZ) < params.length * 0.075 && lateral < params.floorWidth * 0.72) {
    return 'crown';
  }

  if (lateral > params.channelRadius * 0.88) {
    return 'rim';
  }

  if (lateral > halfFloor * 0.78 && lateral < params.channelRadius * 0.74 && heightParts.gutter < -0.12) {
    return 'gutter';
  }

  if (heightParts.valleys > heightParts.hills + 0.28 && height < heightParts.base + heightParts.wall + 0.06) {
    return 'basin';
  }

  if (lateral > halfFloor * 0.72 || slope > 0.72) {
    return 'slope';
  }

  return 'approach';
}

function terrainFeatures(params: HillOfHillsTerrainParams, kind: 'hill' | 'valley'): TerrainFeature[] {
  const rng = mulberry32(params.seed + (kind === 'hill' ? 9176 : 44107));
  const count = kind === 'hill' ? params.hillCount : params.valleyCount;
  const features: TerrainFeature[] = [];
  const radiusBase = kind === 'hill' ? params.hillRadius : params.valleyRadius;
  const heightBase = kind === 'hill' ? params.hillHeight : params.valleyHeight;
  const variance = kind === 'hill' ? params.hillVariance : params.valleyVariance;

  for (let i = 0; i < count; i += 1) {
    const sideBias = i % 3 === 0 ? 0.18 : 0.95;
    const x = (rng() - 0.5) * params.width * sideBias;
    const z = (rng() - 0.5) * params.length * 0.92;
    const radius = radiusBase * (0.72 + rng() * (0.5 + variance * 0.75));
    const height = heightBase * (0.56 + rng() * (0.62 + variance * 0.72));
    features.push({ x, z, radius, height });
  }

  if (kind === 'hill') {
    features.push({ x: -params.floorWidth * 0.88, z: params.length * 0.08, radius: radiusBase * 1.35, height: heightBase * 0.9 });
    features.push({ x: params.floorWidth * 0.82, z: -params.length * 0.18, radius: radiusBase * 1.2, height: heightBase * 0.82 });
  } else {
    features.push({ x: -params.floorWidth * 0.72, z: -params.length * 0.02, radius: radiusBase * 1.15, height: heightBase * 0.78 });
    features.push({ x: params.floorWidth * 0.68, z: params.length * 0.2, radius: radiusBase * 1.05, height: heightBase * 0.72 });
  }

  return features;
}

function featureContribution(features: readonly TerrainFeature[], x: number, z: number, distanceScale: number): number {
  let total = 0;

  for (const feature of features) {
    const dx = (x - feature.x) * distanceScale;
    const dz = (z - feature.z) * distanceScale;
    const d = Math.hypot(dx, dz);
    if (d < feature.radius) {
      const t = 1 - d / feature.radius;
      total += feature.height * smoothCap(t);
    }
  }

  return total;
}

function createWitness(
  params: HillOfHillsTerrainParams,
  source: SourceTruth,
  phaseState: HillOfHillsPhaseState,
  samples: readonly HillOfHillsTerrainSample[],
  fallbackStatus: TerrainFallbackStatus
): HillOfHillsWitness {
  const regionCounts: Partial<Record<TerrainRegion, number>> = {};
  const proxyMaterialCounts: Partial<Record<HillOfHillsProxyMaterialKind, number>> = {};
  const phaseInfluenceKinds: Partial<Record<HillOfHillsPhaseInfluenceKind, number>> = {};
  const topologyRanges = createTopologyRanges();
  const phaseInfluenceRange = createRange();
  const trailInfluenceRange = createRange();
  const sideDitchInfluenceRange = createRange();
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;

  for (const sample of samples) {
    min = Math.min(min, sample.height);
    max = Math.max(max, sample.height);
    regionCounts[sample.region] = (regionCounts[sample.region] ?? 0) + 1;
    proxyMaterialCounts[sample.proxyMaterial.kind] = (proxyMaterialCounts[sample.proxyMaterial.kind] ?? 0) + 1;
    phaseInfluenceKinds[sample.phaseInfluence.kind] = (phaseInfluenceKinds[sample.phaseInfluence.kind] ?? 0) + 1;
    includeInRange(phaseInfluenceRange, sample.phaseInfluence.amount);
    includeInRange(trailInfluenceRange, sample.phaseInfluence.trailAmount);
    includeInRange(sideDitchInfluenceRange, sample.phaseInfluence.sideDitchAmount);
    includeInRange(topologyRanges.flowAccumulation, sample.topology.flowAccumulation);
    includeInRange(topologyRanges.ridgeStrength, sample.topology.ridgeStrength);
    includeInRange(topologyRanges.valleyStrength, sample.topology.valleyStrength);
    includeInRange(topologyRanges.routePressure, sample.topology.routePressure);
    includeInRange(topologyRanges.ditchPotential, sample.topology.ditchPotential);
    includeInRange(topologyRanges.growthPotential, sample.topology.growthPotential);
  }

  return {
    schema: HILL_OF_HILLS_WITNESS_SCHEMA,
    source,
    sourceAuthority: source.authority,
    route: source.route,
    fallbackStatus,
    effectiveParams: params,
    gridResolution: {
      x: params.gridResolutionX,
      z: params.gridResolutionZ
    },
    sampleSpacing: {
      x: params.width / (params.gridResolutionX - 1),
      z: params.length / (params.gridResolutionZ - 1)
    },
    sampleCount: samples.length,
    sampleChecksum: checksum(samples.map((sample) => `${sample.id}:${sample.height.toFixed(4)}:${sample.region}`).join('|')),
    heightRange: {
      min,
      max
    },
    regionCounts,
    topologyChecksum: checksum(samples.map((sample) => topologySignature(sample)).join('|')),
    proxyMaterialChecksum: checksum(samples.map((sample) => `${sample.id}:${sample.proxyMaterial.kind}`).join('|')),
    phaseMode: phaseState.mode,
    terrainEpoch: phaseState.terrainEpoch,
    activePhaseCount: phaseState.activeEpisodes.length,
    activePhaseKinds: activePhaseKinds(phaseState.activeEpisodes),
    phaseClock: phaseState.phaseClock,
    phaseProgress: phaseState.phaseProgress,
    phaseChecksum: phaseState.checksum,
    phaseInfluenceChecksum: checksum(samples.map((sample) => phaseInfluenceSignature(sample)).join('|')),
    phaseInfluenceRange,
    trailInfluenceRange,
    sideDitchInfluenceRange,
    phaseInfluenceKinds,
    trailSeedMethod: phaseState.trailSeedMethod,
    trailCandidateChecksum: phaseState.trailCandidateChecksum,
    trailCandidateScoreRange: phaseState.trailCandidateScoreRange,
    selectedTrailScoreRange: phaseState.selectedTrailScoreRange,
    topologyRanges,
    proxyMaterialCounts
  };
}

function phaseInfluenceSignature(sample: HillOfHillsTerrainSample): string {
  return [
    sample.id,
    sample.phaseInfluence.kind,
    sample.phaseInfluence.episodeId ?? 'none',
    sample.phaseInfluence.amount.toFixed(3),
    sample.phaseInfluence.trailAmount.toFixed(3),
    sample.phaseInfluence.sideDitchAmount.toFixed(3)
  ].join(':');
}

function topologySignature(sample: HillOfHillsTerrainSample): string {
  return [
    sample.id,
    sample.topology.flowAccumulation.toFixed(3),
    sample.topology.ridgeStrength.toFixed(3),
    sample.topology.valleyStrength.toFixed(3),
    sample.topology.routePressure.toFixed(3),
    sample.topology.ditchPotential.toFixed(3),
    sample.topology.growthPotential.toFixed(3)
  ].join(':');
}

function createTopologyRanges(): HillOfHillsWitness['topologyRanges'] {
  return {
    flowAccumulation: createRange(),
    ridgeStrength: createRange(),
    valleyStrength: createRange(),
    routePressure: createRange(),
    ditchPotential: createRange(),
    growthPotential: createRange()
  };
}

function createRange(): Range {
  return {
    min: Number.POSITIVE_INFINITY,
    max: Number.NEGATIVE_INFINITY
  };
}

function zeroRange(): Range {
  return { min: 0, max: 0 };
}

function settledRange(range: Range): Range {
  if (!Number.isFinite(range.min) || !Number.isFinite(range.max)) {
    return zeroRange();
  }
  return range;
}

function includeInRange(range: Range, value: number): void {
  range.min = Math.min(range.min, value);
  range.max = Math.max(range.max, value);
}

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function finiteAtLeast(value: number, minimum: number): number {
  return Math.max(minimum, finiteOr(value, minimum));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  if (edge0 === edge1) {
    return value < edge0 ? 0 : 1;
  }
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function smoothCap(value: number): number {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

function normalize(vector: Vec3): Vec3 {
  const length = Math.hypot(vector[0], vector[1], vector[2]) || 1;
  return [vector[0] / length, vector[1] / length, vector[2] / length];
}

function roundId(value: number): string {
  return value.toFixed(3).replaceAll('-', 'm').replaceAll('.', 'p');
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function checksum(value: string): string {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}
