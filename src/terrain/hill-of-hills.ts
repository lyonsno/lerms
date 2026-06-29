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
export const HILL_OF_HILLS_TERRAIN_BUFFER_SCHEMA = 'lerms.hill-of-hills-terrain-buffer.v0' as const;

export type TerrainFallbackStatus = 'none' | 'synthetic_fixture' | 'fallback' | 'invalid';
export type HillOfHillsPhaseMode = 'stable' | 'ditch_forming' | 'trail_forming' | 'mixed_forming';
export type HillOfHillsPhaseKind = 'ditch_forming' | 'trail_forming';
export type HillOfHillsPhaseInfluenceKind = 'none' | HillOfHillsPhaseKind;
export type HillOfHillsTrailSeedMethod = 'none' | 'random_band' | 'topology_score';
export type HillOfHillsHeightfieldMode = 'direct_query' | 'grid_heightfield';
export type HillOfHillsRecomputeMode = 'full_grid_with_dirty_tiles';
export type HillOfHillsDirtyLayerKind = 'height' | 'phase_overlay' | 'topology_derivatives' | 'proxy_material' | 'support_frame';
export type HillOfHillsCacheMode = 'uncached_full_grid' | 'persistent_layer_tile_cache';
export type HillOfHillsSupportClass = 'single_valued_heightfield';
export type HillOfHillsSupportMappingMode = 'static_domain_to_world';
export type HillOfHillsSupportMotionClass = 'stable' | 'phase_morph' | 'shock_reset';
export type HillOfHillsSupportShockClass = 'none' | 'shock_reset';
export type HillOfHillsProxyMaterialKind =
  | 'crown-warmth'
  | 'approach-clay'
  | 'slope-moss'
  | 'basin-meadow'
  | 'basin-dust'
  | 'basin-pool'
  | 'ditch-shadow'
  | 'rim-crust'
  | 'growth-lip';
export type HillOfHillsTerrainBufferMetricChannel =
  | 'height'
  | 'slope'
  | 'routePressure'
  | 'flowAccumulation'
  | 'ditchPotential'
  | 'growthPotential'
  | 'phaseAmount'
  | 'trailAmount'
  | 'sideDitchAmount'
  | 'wetness'
  | 'growthTint'
  | 'previousHeight'
  | 'heightDelta'
  | 'surfaceVelocityY';

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
  ditchPhaseClock: number;
  ditchPhaseProgress: number;
  trailPhaseClock: number;
  trailPhaseProgress: number;
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

export interface HillOfHillsSupportSample {
  supportClass: HillOfHillsSupportClass;
  mappingMode: HillOfHillsSupportMappingMode;
  domain: {
    u: number;
    v: number;
  };
  domainIndex: {
    x: number;
    z: number;
  };
  previousHeight: number;
  heightDelta: number;
  surfaceVelocity: Vec3;
  motionClass: HillOfHillsSupportMotionClass;
  shock: HillOfHillsSupportShockClass;
}

export interface HillOfHillsSupportFrameWitness {
  supportClass: HillOfHillsSupportClass;
  mappingMode: HillOfHillsSupportMappingMode;
  domainBounds: {
    u: Range;
    v: Range;
  };
  worldBounds: {
    x: Range;
    z: Range;
  };
  supportEpoch: number;
  topologyEpoch: number;
  substrateTileSize: {
    x: number;
    z: number;
  };
  substrateTileCount: number;
  dirtySubstrateTileCount: number;
  dirtySubstrateSampleCount: number;
  dirtySubstrateRegionChecksum: string;
  minSupportWavelength: number;
  maxHeightDelta: number;
  maxSurfaceSpeed: number;
  supportFrameChecksum: string;
  motionClassCounts: Partial<Record<HillOfHillsSupportMotionClass, number>>;
  shockClassCounts: Partial<Record<HillOfHillsSupportShockClass, number>>;
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

export interface HillOfHillsTerrainBuffer {
  schema: typeof HILL_OF_HILLS_TERRAIN_BUFFER_SCHEMA;
  sampleSchema: typeof TERRAIN_SAMPLE_SCHEMA;
  witnessSchema: typeof HILL_OF_HILLS_WITNESS_SCHEMA;
  source: SourceTruth;
  params: HillOfHillsTerrainParams;
  witness: HillOfHillsWitness;
  gridResolution: {
    x: number;
    z: number;
  };
  sampleCount: number;
  sampleChecksum: string;
  topologyChecksum: string;
  proxyMaterialChecksum: string;
  heightRange: {
    min: number;
    max: number;
  };
  channelLayout: {
    position: readonly ['x', 'y', 'z'];
    normal: readonly ['x', 'y', 'z'];
    color: readonly ['r', 'g', 'b'];
    metrics: readonly HillOfHillsTerrainBufferMetricChannel[];
  };
  positions: Float32Array;
  normals: Float32Array;
  colors: Float32Array;
  metrics: Float32Array;
  regionCodes: Uint8Array;
  materialCodes: Uint8Array;
}

export interface HillOfHillsLayerTileCache {
  generation: number;
  stableLayerKey?: string;
  stableLayerChecksum?: string;
  sourceKey?: string;
  stableHeightfield?: StableGridHeightfield;
  samples?: readonly HillOfHillsTerrainSample[];
  previousDirtyTiles?: readonly string[];
}

export interface HillOfHillsTerrainSample extends TerrainSample {
  topology: HillOfHillsTopology;
  proxyMaterial: HillOfHillsProxyMaterial;
  phaseInfluence: HillOfHillsPhaseInfluence;
  support: HillOfHillsSupportSample;
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
  featureChecksum: string;
  heightfieldMode: HillOfHillsHeightfieldMode;
  heightfieldChecksum: string;
  cacheMode: HillOfHillsCacheMode;
  cacheGeneration: number;
  cacheStableLayerChecksum: string;
  cacheStableLayerInvalidated: boolean;
  cacheInvalidated: boolean;
  cacheReusedSampleCount: number;
  cacheRecomputedSampleCount: number;
  recomputeMode: HillOfHillsRecomputeMode;
  recomputeTileSize: {
    x: number;
    z: number;
  };
  recomputeTileCount: number;
  dirtyTileCount: number;
  dirtySampleCount: number;
  dirtyLayerKinds: readonly HillOfHillsDirtyLayerKind[];
  dirtyRegionChecksum: string;
  dirtyHaloSamples: number;
  supportFrame: HillOfHillsSupportFrameWitness;
  topologyChecksum: string;
  proxyMaterialChecksum: string;
  phaseMode: HillOfHillsPhaseMode;
  terrainEpoch: number;
  activePhaseCount: number;
  activePhaseKinds: Partial<Record<HillOfHillsPhaseKind, number>>;
  phaseClock: number;
  phaseProgress: number;
  ditchPhaseClock: number;
  ditchPhaseProgress: number;
  trailPhaseClock: number;
  trailPhaseProgress: number;
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

interface TerrainFeatureCandidate extends TerrainFeature {
  clearance: number;
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

interface GridHeightfield {
  dx: number;
  dz: number;
  heights: readonly HeightParts[];
  phaseInfluences: readonly HillOfHillsPhaseInfluence[];
}

interface StableGridHeightfield {
  dx: number;
  dz: number;
  heights: readonly HeightParts[];
}

interface DirtyRecomputeWitness {
  mode: HillOfHillsRecomputeMode;
  tileSize: {
    x: number;
    z: number;
  };
  tileCount: number;
  dirtyTileCount: number;
  dirtySampleCount: number;
  dirtyLayerKinds: readonly HillOfHillsDirtyLayerKind[];
  dirtyRegionChecksum: string;
  dirtyHaloSamples: number;
  dirtyTiles: readonly string[];
}

interface HillOfHillsCacheStats {
  mode: HillOfHillsCacheMode;
  generation: number;
  stableLayerChecksum: string;
  stableLayerInvalidated: boolean;
  invalidated: boolean;
  reusedSampleCount: number;
  recomputedSampleCount: number;
  dirtyTiles?: readonly string[];
}

interface Range {
  min: number;
  max: number;
}

const terrainFeatureCache = new Map<string, readonly TerrainFeature[]>();
const RECOMPUTE_TILE_SIZE = {
  x: 4,
  z: 4
} as const;
const RECOMPUTE_HALO_SAMPLES = 1;
const TERRAIN_BUFFER_METRIC_CHANNELS: readonly HillOfHillsTerrainBufferMetricChannel[] = [
  'height',
  'slope',
  'routePressure',
  'flowAccumulation',
  'ditchPotential',
  'growthPotential',
  'phaseAmount',
  'trailAmount',
  'sideDitchAmount',
  'wetness',
  'growthTint',
  'previousHeight',
  'heightDelta',
  'surfaceVelocityY'
];
const TERRAIN_REGION_CODEBOOK: readonly TerrainRegion[] = ['crown', 'approach', 'slope', 'basin', 'gutter', 'rim', 'underhill_fixture'];
const PROXY_MATERIAL_CODEBOOK: readonly HillOfHillsProxyMaterialKind[] = [
  'crown-warmth',
  'approach-clay',
  'slope-moss',
  'basin-meadow',
  'basin-dust',
  'basin-pool',
  'ditch-shadow',
  'rim-crust',
  'growth-lip'
];

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

export function createHillOfHillsLayerTileCache(): HillOfHillsLayerTileCache {
  return {
    generation: 0
  };
}

export function createHillOfHillsTerrainWithCache(
  cache: HillOfHillsLayerTileCache,
  params: Partial<HillOfHillsTerrainParams> = {},
  sourceOptions: HillOfHillsSourceOptions = {}
): HillOfHillsTerrain {
  const effectiveParams = normalizeParams({ ...defaultHillOfHillsParams, ...params });
  const fallbackStatus = normalizeFallbackStatus(sourceOptions);
  const source = createTerrainSource(effectiveParams, sourceOptions, fallbackStatus);
  const phaseState = createPhaseState(effectiveParams);
  const stableLayerKey = stableLayerCacheKey(effectiveParams);
  const stableLayerChecksum = checksum(stableLayerKey);
  const sourceKey = sourceCacheKey(source);
  const stableInvalidated =
    cache.stableLayerKey !== stableLayerKey ||
    cache.stableHeightfield === undefined ||
    cache.samples === undefined ||
    cache.samples.length !== effectiveParams.gridResolutionX * effectiveParams.gridResolutionZ;
  const sourceInvalidated = cache.sourceKey !== undefined && cache.sourceKey !== sourceKey;
  const sampleInvalidated = stableInvalidated || sourceInvalidated;

  let stableHeightfield = cache.stableHeightfield;
  let samples: readonly HillOfHillsTerrainSample[];
  let reusedSampleCount = 0;
  let recomputedSampleCount = 0;
  let actualDirtyTiles: readonly string[];

  if (sampleInvalidated || !stableHeightfield || !cache.samples) {
    stableHeightfield = stableInvalidated ? buildStableGridHeightfield(effectiveParams) : stableHeightfield;
    if (!stableHeightfield) {
      stableHeightfield = buildStableGridHeightfield(effectiveParams);
    }
    samples = generateSamplesFromStableHeightfield(effectiveParams, source, phaseState, stableHeightfield);
    recomputedSampleCount = samples.length;
    actualDirtyTiles = allTileKeys(effectiveParams);
  } else {
    const currentDirty = dirtyRecomputeWitness(effectiveParams, phaseState).dirtyTiles;
    actualDirtyTiles = unionTileKeys(cache.previousDirtyTiles ?? [], currentDirty);
    const dirtyIndices = sampleIndicesForTiles(effectiveParams, actualDirtyTiles);
    const nextSamples = cache.samples.slice();

    for (const index of dirtyIndices) {
      const xi = index % effectiveParams.gridResolutionX;
      const zi = Math.floor(index / effectiveParams.gridResolutionX);
      nextSamples[index] = sampleTerrainFromStableHeightfield(effectiveParams, source, phaseState, stableHeightfield, xi, zi);
    }

    samples = nextSamples;
    recomputedSampleCount = dirtyIndices.length;
    reusedSampleCount = Math.max(0, samples.length - recomputedSampleCount);
  }

  cache.generation += 1;
  cache.stableLayerKey = stableLayerKey;
  cache.stableLayerChecksum = stableLayerChecksum;
  cache.sourceKey = sourceKey;
  cache.stableHeightfield = stableHeightfield;
  cache.samples = samples;
  cache.previousDirtyTiles = dirtyRecomputeWitness(effectiveParams, phaseState).dirtyTiles;

  const witness = createWitness(effectiveParams, source, phaseState, samples, fallbackStatus, {
    mode: 'persistent_layer_tile_cache',
    generation: cache.generation,
    stableLayerChecksum,
    stableLayerInvalidated: stableInvalidated,
    invalidated: sampleInvalidated,
    reusedSampleCount,
    recomputedSampleCount,
    dirtyTiles: actualDirtyTiles
  });

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

export function createHillOfHillsTerrainBuffer(terrain: HillOfHillsTerrain): HillOfHillsTerrainBuffer {
  const sampleCount = terrain.samples.length;
  const positions = new Float32Array(sampleCount * 3);
  const normals = new Float32Array(sampleCount * 3);
  const colors = new Float32Array(sampleCount * 3);
  const metrics = new Float32Array(sampleCount * TERRAIN_BUFFER_METRIC_CHANNELS.length);
  const regionCodes = new Uint8Array(sampleCount);
  const materialCodes = new Uint8Array(sampleCount);

  for (let index = 0; index < sampleCount; index += 1) {
    const sample = terrain.samples[index];
    const vectorOffset = index * 3;
    const metricOffset = index * TERRAIN_BUFFER_METRIC_CHANNELS.length;

    positions[vectorOffset] = sample.world[0];
    positions[vectorOffset + 1] = sample.world[1];
    positions[vectorOffset + 2] = sample.world[2];
    normals[vectorOffset] = sample.normal[0];
    normals[vectorOffset + 1] = sample.normal[1];
    normals[vectorOffset + 2] = sample.normal[2];
    colors[vectorOffset] = sample.proxyMaterial.color[0];
    colors[vectorOffset + 1] = sample.proxyMaterial.color[1];
    colors[vectorOffset + 2] = sample.proxyMaterial.color[2];
    metrics[metricOffset] = sample.height;
    metrics[metricOffset + 1] = sample.slope;
    metrics[metricOffset + 2] = sample.topology.routePressure;
    metrics[metricOffset + 3] = sample.topology.flowAccumulation;
    metrics[metricOffset + 4] = sample.topology.ditchPotential;
    metrics[metricOffset + 5] = sample.topology.growthPotential;
    metrics[metricOffset + 6] = sample.phaseInfluence.amount;
    metrics[metricOffset + 7] = sample.phaseInfluence.trailAmount;
    metrics[metricOffset + 8] = sample.phaseInfluence.sideDitchAmount;
    metrics[metricOffset + 9] = sample.proxyMaterial.wetness;
    metrics[metricOffset + 10] = sample.proxyMaterial.growthTint;
    metrics[metricOffset + 11] = sample.support.previousHeight;
    metrics[metricOffset + 12] = sample.support.heightDelta;
    metrics[metricOffset + 13] = sample.support.surfaceVelocity[1];
    regionCodes[index] = codeForTerrainRegion(sample.region);
    materialCodes[index] = codeForProxyMaterial(sample.proxyMaterial.kind);
  }

  return {
    schema: HILL_OF_HILLS_TERRAIN_BUFFER_SCHEMA,
    sampleSchema: TERRAIN_SAMPLE_SCHEMA,
    witnessSchema: HILL_OF_HILLS_WITNESS_SCHEMA,
    source: terrain.source,
    params: terrain.params,
    witness: terrain.witness,
    gridResolution: terrain.witness.gridResolution,
    sampleCount,
    sampleChecksum: terrain.witness.sampleChecksum,
    topologyChecksum: terrain.witness.topologyChecksum,
    proxyMaterialChecksum: terrain.witness.proxyMaterialChecksum,
    heightRange: terrain.witness.heightRange,
    channelLayout: {
      position: ['x', 'y', 'z'],
      normal: ['x', 'y', 'z'],
      color: ['r', 'g', 'b'],
      metrics: TERRAIN_BUFFER_METRIC_CHANNELS
    },
    positions,
    normals,
    colors,
    metrics,
    regionCodes,
    materialCodes
  };
}

export function transferListForHillOfHillsTerrainBuffer(buffer: HillOfHillsTerrainBuffer): ArrayBuffer[] {
  return [
    buffer.positions.buffer as ArrayBuffer,
    buffer.normals.buffer as ArrayBuffer,
    buffer.colors.buffer as ArrayBuffer,
    buffer.metrics.buffer as ArrayBuffer,
    buffer.regionCodes.buffer as ArrayBuffer,
    buffer.materialCodes.buffer as ArrayBuffer
  ];
}

export function decodeHillOfHillsTerrainBufferSample(buffer: HillOfHillsTerrainBuffer, index: number): HillOfHillsTerrainSample {
  if (index < 0 || index >= buffer.sampleCount) {
    throw new Error(`terrain buffer sample index ${index} is outside 0..${buffer.sampleCount - 1}`);
  }

  const vectorOffset = index * 3;
  const metricOffset = index * buffer.channelLayout.metrics.length;
  const xi = index % buffer.gridResolution.x;
  const zi = Math.floor(index / buffer.gridResolution.x);
  const materialKind = proxyMaterialForCode(buffer.materialCodes[index]);
  const wetness = metric(buffer, metricOffset, 'wetness');
  const growthTint = metric(buffer, metricOffset, 'growthTint');
  const region = terrainRegionForCode(buffer.regionCodes[index]);
  const phaseAmount = metric(buffer, metricOffset, 'phaseAmount');
  const trailAmount = metric(buffer, metricOffset, 'trailAmount');
  const sideDitchAmount = metric(buffer, metricOffset, 'sideDitchAmount');
  const heightDelta = metric(buffer, metricOffset, 'heightDelta');
  const surfaceVelocityY = metric(buffer, metricOffset, 'surfaceVelocityY');

  return {
    schema: TERRAIN_SAMPLE_SCHEMA,
    id: `terrain-${xi}-${zi}`,
    source: buffer.source,
    world: [buffer.positions[vectorOffset], buffer.positions[vectorOffset + 1], buffer.positions[vectorOffset + 2]],
    normal: [buffer.normals[vectorOffset], buffer.normals[vectorOffset + 1], buffer.normals[vectorOffset + 2]],
    height: metric(buffer, metricOffset, 'height'),
    slope: metric(buffer, metricOffset, 'slope'),
    region,
    topology: {
      flowDirection: [0, 0, 0],
      flowAccumulation: metric(buffer, metricOffset, 'flowAccumulation'),
      ridgeStrength: 0,
      valleyStrength: 0,
      routePressure: metric(buffer, metricOffset, 'routePressure'),
      ditchPotential: metric(buffer, metricOffset, 'ditchPotential'),
      growthPotential: metric(buffer, metricOffset, 'growthPotential')
    },
    proxyMaterial: {
      kind: materialKind,
      color: [buffer.colors[vectorOffset], buffer.colors[vectorOffset + 1], buffer.colors[vectorOffset + 2]],
      wetness,
      growthTint,
      blends: {
        [materialKind]: 1
      }
    },
    phaseInfluence: {
      kind: phaseAmount > 0 ? (trailAmount > sideDitchAmount ? 'trail_forming' : 'ditch_forming') : 'none',
      amount: phaseAmount,
      trailAmount,
      sideDitchAmount
    },
    support: {
      supportClass: 'single_valued_heightfield',
      mappingMode: 'static_domain_to_world',
      domain: {
        u: xi / Math.max(1, buffer.gridResolution.x - 1),
        v: zi / Math.max(1, buffer.gridResolution.z - 1)
      },
      domainIndex: {
        x: xi,
        z: zi
      },
      previousHeight: metric(buffer, metricOffset, 'previousHeight'),
      heightDelta,
      surfaceVelocity: [0, surfaceVelocityY, 0],
      motionClass: Math.abs(heightDelta) > 0 ? 'phase_morph' : 'stable',
      shock: 'none'
    }
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
  const ditchPhaseClock = ditchIntensity > 0 ? ditchTiming.clock : 0;
  const ditchPhaseProgress = ditchIntensity > 0 ? ditchTiming.progress : 0;
  const trailPhaseClock = trailIntensity > 0 ? trailTiming.clock : 0;
  const trailPhaseProgress = trailIntensity > 0 ? trailTiming.progress : 0;

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
      ditchPhaseClock,
      ditchPhaseProgress,
      trailPhaseClock,
      trailPhaseProgress,
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
    ditchPhaseClock,
    ditchPhaseProgress,
    trailPhaseClock,
    trailPhaseProgress,
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
      const region = classifyRegion(params, x, z, heightParts, slope);
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
    ditchPhaseClock: 0,
    ditchPhaseProgress: 0,
    trailPhaseClock: 0,
    trailPhaseProgress: 0,
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
  return generateSamplesFromStableHeightfield(params, source, phaseState, buildStableGridHeightfield(params));
}

function generateSamplesFromStableHeightfield(
  params: HillOfHillsTerrainParams,
  source: SourceTruth,
  phaseState: HillOfHillsPhaseState,
  stableHeightfield: StableGridHeightfield
): HillOfHillsTerrainSample[] {
  const samples: HillOfHillsTerrainSample[] = [];
  for (let zi = 0; zi < params.gridResolutionZ; zi += 1) {
    for (let xi = 0; xi < params.gridResolutionX; xi += 1) {
      samples.push(sampleTerrainFromStableHeightfield(params, source, phaseState, stableHeightfield, xi, zi));
    }
  }

  return samples;
}

function buildGridHeightfield(params: HillOfHillsTerrainParams, phaseState: HillOfHillsPhaseState): GridHeightfield {
  const stableHeightfield = buildStableGridHeightfield(params);
  const heights: HeightParts[] = [];
  const phaseInfluences: HillOfHillsPhaseInfluence[] = [];

  for (let index = 0; index < stableHeightfield.heights.length; index += 1) {
    const xi = index % params.gridResolutionX;
    const zi = Math.floor(index / params.gridResolutionX);
    const x = -params.width * 0.5 + xi * stableHeightfield.dx;
    const z = -params.length * 0.5 + zi * stableHeightfield.dz;
    const phaseInfluence = phaseInfluenceAt(phaseState, x, z);
    heights.push(applyPhaseToStableHeightParts(params, x, stableHeightfield.heights[index], phaseInfluence));
    phaseInfluences.push(phaseInfluence);
  }

  return {
    dx: stableHeightfield.dx,
    dz: stableHeightfield.dz,
    heights,
    phaseInfluences
  };
}

function buildStableGridHeightfield(params: HillOfHillsTerrainParams): StableGridHeightfield {
  const dx = params.width / (params.gridResolutionX - 1);
  const dz = params.length / (params.gridResolutionZ - 1);
  const heights: HeightParts[] = [];

  for (let zi = 0; zi < params.gridResolutionZ; zi += 1) {
    const z = -params.length * 0.5 + zi * dz;
    for (let xi = 0; xi < params.gridResolutionX; xi += 1) {
      const x = -params.width * 0.5 + xi * dx;
      heights.push(stableHeightAt(params, x, z));
    }
  }

  return {
    dx,
    dz,
    heights
  };
}

function sampleTerrainFromGridHeightfield(
  params: HillOfHillsTerrainParams,
  source: SourceTruth,
  phaseState: HillOfHillsPhaseState,
  heightfield: GridHeightfield,
  xi: number,
  zi: number
): HillOfHillsTerrainSample {
  return sampleTerrainFromHeightfieldParts(params, source, phaseState, heightfield, xi, zi);
}

function sampleTerrainFromStableHeightfield(
  params: HillOfHillsTerrainParams,
  source: SourceTruth,
  phaseState: HillOfHillsPhaseState,
  heightfield: StableGridHeightfield,
  xi: number,
  zi: number
): HillOfHillsTerrainSample {
  return sampleTerrainFromHeightfieldParts(params, source, phaseState, heightfield, xi, zi);
}

function sampleTerrainFromHeightfieldParts(
  params: HillOfHillsTerrainParams,
  source: SourceTruth,
  phaseState: HillOfHillsPhaseState,
  heightfield: GridHeightfield | StableGridHeightfield,
  xi: number,
  zi: number
): HillOfHillsTerrainSample {
  const x = -params.width * 0.5 + xi * heightfield.dx;
  const z = -params.length * 0.5 + zi * heightfield.dz;
  const heightParts = heightPartsForGridIndex(params, phaseState, heightfield, xi, zi);
  const phaseInfluence = phaseInfluenceForGridIndex(params, phaseState, heightfield, xi, zi);
  const leftHeight = heightPartsForGridIndex(params, phaseState, heightfield, Math.max(0, xi - 1), zi).height;
  const rightHeight = heightPartsForGridIndex(params, phaseState, heightfield, Math.min(params.gridResolutionX - 1, xi + 1), zi).height;
  const backHeight = heightPartsForGridIndex(params, phaseState, heightfield, xi, Math.max(0, zi - 1)).height;
  const forwardHeight = heightPartsForGridIndex(params, phaseState, heightfield, xi, Math.min(params.gridResolutionZ - 1, zi + 1)).height;
  const xDivisor = heightfield.dx * (xi === 0 || xi === params.gridResolutionX - 1 ? 1 : 2);
  const zDivisor = heightfield.dz * (zi === 0 || zi === params.gridResolutionZ - 1 ? 1 : 2);
  const terrainDx = (rightHeight - leftHeight) / Math.max(0.001, xDivisor);
  const terrainDz = (forwardHeight - backHeight) / Math.max(0.001, zDivisor);
  return sampleTerrainFromParts(params, source, phaseState, x, z, heightParts, phaseInfluence, terrainDx, terrainDz, `terrain-${xi}-${zi}`);
}

function heightPartsForGridIndex(
  params: HillOfHillsTerrainParams,
  phaseState: HillOfHillsPhaseState,
  heightfield: GridHeightfield | StableGridHeightfield,
  xi: number,
  zi: number
): HeightParts {
  const index = gridIndex(params, xi, zi);
  if ('phaseInfluences' in heightfield) {
    return heightfield.heights[index];
  }
  const x = -params.width * 0.5 + xi * heightfield.dx;
  return applyPhaseToStableHeightParts(params, x, heightfield.heights[index], phaseInfluenceForGridIndex(params, phaseState, heightfield, xi, zi));
}

function phaseInfluenceForGridIndex(
  params: HillOfHillsTerrainParams,
  phaseState: HillOfHillsPhaseState,
  heightfield: GridHeightfield | StableGridHeightfield,
  xi: number,
  zi: number
): HillOfHillsPhaseInfluence {
  const index = gridIndex(params, xi, zi);
  if ('phaseInfluences' in heightfield) {
    return heightfield.phaseInfluences[index];
  }
  const x = -params.width * 0.5 + xi * heightfield.dx;
  const z = -params.length * 0.5 + zi * heightfield.dz;
  return phaseInfluenceAt(phaseState, x, z);
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
  return sampleTerrainFromParts(params, source, phaseState, clampedX, clampedZ, heightParts, phaseInfluence, dx, dz, id);
}

function sampleTerrainFromParts(
  params: HillOfHillsTerrainParams,
  source: SourceTruth,
  phaseState: HillOfHillsPhaseState,
  x: number,
  z: number,
  heightParts: HeightParts,
  phaseInfluence: HillOfHillsPhaseInfluence,
  dx: number,
  dz: number,
  id?: string
): HillOfHillsTerrainSample {
  const height = heightParts.height;
  const normal = normalize([-dx, 1, -dz]);
  const slope = Math.hypot(dx, dz);
  const region = classifyRegion(params, x, z, heightParts, slope);
  const topology = topologyAt(params, x, z, heightParts, dx, dz, slope, region, phaseInfluence);
  const proxyMaterial = proxyMaterialFor(region, topology);
  const support = supportSampleFor(params, phaseState, x, z, heightParts, phaseInfluence);

  return {
    schema: TERRAIN_SAMPLE_SCHEMA,
    id: id ?? `terrain-${roundId(x)}-${roundId(z)}`,
    source,
    world: [x, height, z],
    normal,
    height,
    slope,
    region,
    topology,
    proxyMaterial,
    phaseInfluence,
    support
  };
}

function gridIndex(params: HillOfHillsTerrainParams, xi: number, zi: number): number {
  return zi * params.gridResolutionX + xi;
}

function supportSampleFor(
  params: HillOfHillsTerrainParams,
  phaseState: HillOfHillsPhaseState,
  x: number,
  z: number,
  heightParts: HeightParts,
  phaseInfluence: HillOfHillsPhaseInfluence
): HillOfHillsSupportSample {
  const domain = domainForWorld(params, x, z);
  const domainIndex = {
    x: worldXToSampleIndex(params, x),
    z: worldZToSampleIndex(params, z)
  };
  const activeMotion = phaseState.activeEpisodes.length > 0 && phaseInfluence.amount > 0;
  const heightDelta = activeMotion ? -heightParts.phaseDitch * 0.08 : 0;
  const previousHeight = heightParts.height - heightDelta;
  const supportTickSeconds = 16 / 1000;
  const surfaceVelocity: Vec3 = [0, heightDelta / supportTickSeconds, 0];
  const shock: HillOfHillsSupportShockClass = Math.abs(heightDelta) > 0.45 ? 'shock_reset' : 'none';
  const motionClass: HillOfHillsSupportMotionClass = shock === 'shock_reset' ? 'shock_reset' : activeMotion ? 'phase_morph' : 'stable';

  return {
    supportClass: 'single_valued_heightfield',
    mappingMode: 'static_domain_to_world',
    domain,
    domainIndex,
    previousHeight,
    heightDelta,
    surfaceVelocity,
    motionClass,
    shock
  };
}

function domainForWorld(params: HillOfHillsTerrainParams, x: number, z: number): { u: number; v: number } {
  return {
    u: clamp((x + params.width * 0.5) / Math.max(0.001, params.width), 0, 1),
    v: clamp((z + params.length * 0.5) / Math.max(0.001, params.length), 0, 1)
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
  const wetness = clamp(
    topology.flowAccumulation * 0.18 +
      topology.ditchPotential * 0.46 +
      topology.valleyStrength * (kind === 'basin-meadow' || kind === 'basin-dust' ? 0.04 : 0.12) +
      (kind === 'basin-pool' ? 0.34 : 0) +
      (kind === 'ditch-shadow' ? 0.15 : 0),
    0,
    1
  );
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
  if (region === 'gutter') return 'ditch-shadow';
  if (region === 'basin') {
    if (topology.ditchPotential > 0.76 && topology.flowAccumulation > 0.78) return 'basin-pool';
    if (topology.growthPotential > 0.28 || topology.routePressure > 0.42) return 'basin-meadow';
    return 'basin-dust';
  }
  if (topology.ditchPotential > 0.65) return 'ditch-shadow';
  if (region === 'rim') return 'rim-crust';
  if (region === 'slope') return 'slope-moss';
  return 'approach-clay';
}

function proxyColorFor(kind: HillOfHillsProxyMaterialKind): Vec3 {
  switch (kind) {
    case 'crown-warmth':
      return [205, 165, 72];
    case 'basin-meadow':
      return [91, 136, 76];
    case 'basin-dust':
      return [139, 129, 82];
    case 'basin-pool':
      return [49, 111, 128];
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

function codeForTerrainRegion(region: TerrainRegion): number {
  const index = TERRAIN_REGION_CODEBOOK.indexOf(region);
  return index >= 0 ? index : TERRAIN_REGION_CODEBOOK.indexOf('underhill_fixture');
}

function terrainRegionForCode(code: number): TerrainRegion {
  return TERRAIN_REGION_CODEBOOK[code] ?? 'underhill_fixture';
}

function codeForProxyMaterial(kind: HillOfHillsProxyMaterialKind): number {
  const index = PROXY_MATERIAL_CODEBOOK.indexOf(kind);
  return index >= 0 ? index : PROXY_MATERIAL_CODEBOOK.indexOf('approach-clay');
}

function proxyMaterialForCode(code: number): HillOfHillsProxyMaterialKind {
  return PROXY_MATERIAL_CODEBOOK[code] ?? 'approach-clay';
}

function metric(buffer: HillOfHillsTerrainBuffer, metricOffset: number, channel: HillOfHillsTerrainBufferMetricChannel): number {
  const index = buffer.channelLayout.metrics.indexOf(channel);
  if (index < 0) {
    throw new Error(`terrain buffer is missing metric channel ${channel}`);
  }
  return buffer.metrics[metricOffset + index];
}

function proxyMaterialBlendsFor(
  region: TerrainRegion,
  topology: HillOfHillsTopology,
  dominantKind: HillOfHillsProxyMaterialKind
): HillOfHillsProxyMaterial['blends'] {
  const basinWetPocket = clamp((topology.flowAccumulation - 0.72) / 0.24, 0, 1) * clamp((topology.ditchPotential - 0.62) / 0.24, 0, 1);
  const basinMeadow = region === 'basin' ? clamp(topology.growthPotential * 0.5 + topology.routePressure * 0.28 + (1 - topology.ditchPotential) * 0.18, 0, 1) : 0;
  const basinDust = region === 'basin' ? clamp((1 - topology.growthPotential) * 0.42 + topology.valleyStrength * 0.18 + (1 - topology.flowAccumulation) * 0.18, 0, 1) : 0;
  const raw: Partial<Record<HillOfHillsProxyMaterialKind, number>> = {
    [dominantKind]: 1,
    'ditch-shadow': topology.ditchPotential * (region === 'basin' ? 0.28 : 0.72),
    'basin-meadow': basinMeadow,
    'basin-dust': basinDust,
    'basin-pool': basinWetPocket * 0.72,
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
  return applyPhaseToStableHeightParts(params, x, stableHeightAt(params, x, z), phaseInfluenceAt(phaseState, x, z));
}

function stableHeightAt(params: HillOfHillsTerrainParams, x: number, z: number): HeightParts {
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
  const openFloor = base + wall + gutter + hills * macroDamping - valleys * valleyFloorDamping + detail;
  const floorMinimum = base - 0.12 - Math.max(0, params.valleyHeight - 1.2) * 0.08;
  const height = lateral <= halfFloor * 0.9 ? Math.max(openFloor, floorMinimum) : openFloor;

  return {
    base,
    wall,
    gutter,
    hills,
    valleys,
    detail,
    phaseDitch: 0,
    height
  };
}

function applyPhaseToStableHeightParts(
  params: HillOfHillsTerrainParams,
  x: number,
  stableParts: HeightParts,
  phaseInfluence: HillOfHillsPhaseInfluence
): HeightParts {
  const halfFloor = params.floorWidth * 0.5;
  const lateral = Math.abs(x);
  const phaseDitch =
    phaseInfluence.sideDitchAmount * (0.18 + params.valleyHeight * 0.24 + params.wallHeight * 0.035) +
    phaseInfluence.trailAmount * (0.06 + params.valleyHeight * 0.05);
  const floorProtection = 1 - smoothstep(halfFloor * 0.45, halfFloor * 0.95, lateral);
  const macroDamping = 1 - floorProtection * 0.58;
  const valleyFloorDamping = 1 - floorProtection * 0.82;
  const openFloor =
    stableParts.base +
    stableParts.wall +
    stableParts.gutter +
    stableParts.hills * macroDamping -
    stableParts.valleys * valleyFloorDamping +
    stableParts.detail -
    phaseDitch;
  const floorMinimum = stableParts.base - 0.12 - Math.max(0, params.valleyHeight - 1.2) * 0.08;
  const height = lateral <= halfFloor * 0.9 ? Math.max(openFloor, floorMinimum - phaseDitch * 0.86) : openFloor;

  return {
    base: stableParts.base,
    wall: stableParts.wall,
    gutter: stableParts.gutter,
    hills: stableParts.hills,
    valleys: stableParts.valleys,
    detail: stableParts.detail,
    phaseDitch,
    height
  };
}

function classifyRegion(
  params: HillOfHillsTerrainParams,
  x: number,
  z: number,
  heightParts: HeightParts,
  slope: number
): TerrainRegion {
  const lateral = Math.abs(x);
  const halfFloor = params.floorWidth * 0.5;

  if (Math.abs(z - params.crownZ) < params.length * 0.075 && lateral < params.floorWidth * 0.72) {
    return 'crown';
  }

  if (lateral > params.channelRadius * 0.88) {
    return 'rim';
  }

  if (lateral > halfFloor * 0.78 && lateral < params.channelRadius * 0.74 && heightParts.gutter < -0.12) {
    return 'gutter';
  }

  if (heightParts.valleys > heightParts.hills + 0.28 && heightParts.height < heightParts.base + heightParts.wall + 0.06) {
    return 'basin';
  }

  if (lateral > halfFloor * 0.72 || slope > 0.72) {
    return 'slope';
  }

  return 'approach';
}

function terrainFeatures(params: HillOfHillsTerrainParams, kind: 'hill' | 'valley'): readonly TerrainFeature[] {
  const cacheKey = terrainFeatureCacheKey(params, kind);
  const cached = terrainFeatureCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const rng = mulberry32(params.seed + (kind === 'hill' ? 9176 : 44107));
  const count = kind === 'hill' ? params.hillCount : params.valleyCount;
  const features: TerrainFeature[] = [];
  const radiusBase = kind === 'hill' ? params.hillRadius : params.valleyRadius;
  const heightBase = kind === 'hill' ? params.hillHeight : params.valleyHeight;
  const variance = kind === 'hill' ? params.hillVariance : params.valleyVariance;
  const minimumSeparation = radiusBase * (kind === 'hill' ? 0.68 : 0.58) * Math.sqrt(params.featureSpacing);
  const attemptCount = Math.max(8, Math.min(28, Math.ceil(count * 0.42)));
  const useDensePlacement = count > 32 || params.featureSpacing < 0.5;

  for (let i = 0; i < count; i += 1) {
    if (!useDensePlacement) {
      features.push(terrainFeatureCandidate(params, kind, i, radiusBase, heightBase, variance, rng));
      continue;
    }

    let selected: TerrainFeatureCandidate | undefined;

    for (let attempt = 0; attempt < attemptCount; attempt += 1) {
      const candidate = terrainFeatureCandidate(params, kind, i, radiusBase, heightBase, variance, rng);
      const clearance = featureClearance(candidate, features);
      const clearedCandidate = { ...candidate, clearance };
      if (!selected || clearedCandidate.clearance > selected.clearance) {
        selected = clearedCandidate;
      }
      if (clearance >= minimumSeparation) {
        break;
      }
    }

    if (selected) {
      const { clearance: _clearance, ...feature } = selected;
      features.push(limitDenseFeatureHeight(feature, heightBase, variance));
    }
  }

  if (kind === 'hill') {
    features.push({ x: -params.floorWidth * 0.88, z: params.length * 0.08, radius: radiusBase * 1.35, height: heightBase * 0.9 });
    features.push({ x: params.floorWidth * 0.82, z: -params.length * 0.18, radius: radiusBase * 1.2, height: heightBase * 0.82 });
  } else {
    features.push({ x: -params.floorWidth * 0.72, z: -params.length * 0.02, radius: radiusBase * 1.15, height: heightBase * 0.78 });
    features.push({ x: params.floorWidth * 0.68, z: params.length * 0.2, radius: radiusBase * 1.05, height: heightBase * 0.72 });
  }

  terrainFeatureCache.set(cacheKey, features);
  return features;
}

function terrainFeatureCandidate(
  params: HillOfHillsTerrainParams,
  kind: 'hill' | 'valley',
  index: number,
  radiusBase: number,
  heightBase: number,
  variance: number,
  rng: () => number
): TerrainFeature {
  const sideBias = index % 3 === 0 ? 0.18 : 0.95;
  const x = (rng() - 0.5) * params.width * sideBias;
  const z = (rng() - 0.5) * params.length * 0.92;
  const radius = radiusBase * (0.72 + rng() * (0.5 + variance * 0.75));
  const height = heightBase * (0.56 + rng() * (0.62 + variance * 0.72));
  return { x, z, radius, height };
}

function limitDenseFeatureHeight(feature: TerrainFeature, heightBase: number, variance: number): TerrainFeature {
  const heightCeiling = heightBase * (1.24 + variance * 0.46);
  return {
    ...feature,
    height: Math.min(feature.height, heightCeiling)
  };
}

function featureClearance(feature: TerrainFeature, features: readonly TerrainFeature[]): number {
  if (features.length === 0) {
    return Number.POSITIVE_INFINITY;
  }

  let clearance = Number.POSITIVE_INFINITY;
  for (const placed of features) {
    const centerDistance = Math.hypot(feature.x - placed.x, feature.z - placed.z);
    const radiusPressure = Math.max(0.001, (feature.radius + placed.radius) * 0.28);
    clearance = Math.min(clearance, centerDistance / radiusPressure);
  }
  return clearance;
}

function terrainFeatureCacheKey(params: HillOfHillsTerrainParams, kind: 'hill' | 'valley'): string {
  const radius = kind === 'hill' ? params.hillRadius : params.valleyRadius;
  const count = kind === 'hill' ? params.hillCount : params.valleyCount;
  const height = kind === 'hill' ? params.hillHeight : params.valleyHeight;
  const variance = kind === 'hill' ? params.hillVariance : params.valleyVariance;
  return [
    kind,
    params.seed,
    params.width.toFixed(4),
    params.length.toFixed(4),
    params.floorWidth.toFixed(4),
    radius.toFixed(4),
    count,
    height.toFixed(4),
    variance.toFixed(4),
    params.featureSpacing.toFixed(4)
  ].join(':');
}

function terrainFeatureChecksum(params: HillOfHillsTerrainParams): string {
  const featureDistanceScale = params.distanceScale / params.featureSpacing;
  const hillFeatures = terrainFeatures(params, 'hill');
  const valleyFeatures = terrainFeatures(params, 'valley');
  return checksum(
    [
      featureDistanceScale.toFixed(4),
      ...hillFeatures.map((feature) => terrainFeatureSignature('hill', feature)),
      ...valleyFeatures.map((feature) => terrainFeatureSignature('valley', feature))
    ].join('|')
  );
}

function terrainFeatureSignature(kind: 'hill' | 'valley', feature: TerrainFeature): string {
  return [
    kind,
    feature.x.toFixed(3),
    feature.z.toFixed(3),
    feature.radius.toFixed(3),
    feature.height.toFixed(3)
  ].join(':');
}

function featureContribution(features: readonly TerrainFeature[], x: number, z: number, distanceScale: number): number {
  let total = 0;
  let strongest = 0;

  for (const feature of features) {
    const dx = (x - feature.x) * distanceScale;
    const dz = (z - feature.z) * distanceScale;
    const d = Math.hypot(dx, dz);
    if (d < feature.radius) {
      const t = 1 - d / feature.radius;
      const contribution = feature.height * smoothCap(t);
      total += contribution;
      strongest = Math.max(strongest, contribution);
    }
  }

  if (strongest <= 0) {
    return 0;
  }

  const overlap = Math.max(0, total - strongest);
  const overlapReinforcement = overlap * 0.22 * (1 - smoothstep(strongest * 0.35, strongest * 1.2, overlap));
  return strongest + overlapReinforcement;
}

function createWitness(
  params: HillOfHillsTerrainParams,
  source: SourceTruth,
  phaseState: HillOfHillsPhaseState,
  samples: readonly HillOfHillsTerrainSample[],
  fallbackStatus: TerrainFallbackStatus,
  cacheStats?: HillOfHillsCacheStats
): HillOfHillsWitness {
  const regionCounts: Partial<Record<TerrainRegion, number>> = {};
  const proxyMaterialCounts: Partial<Record<HillOfHillsProxyMaterialKind, number>> = {};
  const phaseInfluenceKinds: Partial<Record<HillOfHillsPhaseInfluenceKind, number>> = {};
  const topologyRanges = createTopologyRanges();
  const phaseInfluenceRange = createRange();
  const trailInfluenceRange = createRange();
  const sideDitchInfluenceRange = createRange();
  const recomputeWitness = dirtyRecomputeWitness(params, phaseState, cacheStats?.dirtyTiles);
  const supportFrame = supportFrameWitness(params, phaseState, samples, recomputeWitness);
  const resolvedCacheStats =
    cacheStats ??
    ({
      mode: 'uncached_full_grid',
      generation: 0,
      stableLayerChecksum: checksum(stableLayerCacheKey(params)),
      stableLayerInvalidated: false,
      invalidated: false,
      reusedSampleCount: 0,
      recomputedSampleCount: samples.length
    } satisfies HillOfHillsCacheStats);
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
    sampleChecksum: checksumParts(samples.map((sample) => `${sample.id}:${sample.height.toFixed(4)}:${sample.region}`)),
    heightRange: {
      min,
      max
    },
    regionCounts,
    featureChecksum: terrainFeatureChecksum(params),
    heightfieldMode: 'grid_heightfield',
    heightfieldChecksum: heightfieldChecksum(samples),
    cacheMode: resolvedCacheStats.mode,
    cacheGeneration: resolvedCacheStats.generation,
    cacheStableLayerChecksum: resolvedCacheStats.stableLayerChecksum,
    cacheStableLayerInvalidated: resolvedCacheStats.stableLayerInvalidated,
    cacheInvalidated: resolvedCacheStats.invalidated,
    cacheReusedSampleCount: resolvedCacheStats.reusedSampleCount,
    cacheRecomputedSampleCount: resolvedCacheStats.recomputedSampleCount,
    recomputeMode: recomputeWitness.mode,
    recomputeTileSize: recomputeWitness.tileSize,
    recomputeTileCount: recomputeWitness.tileCount,
    dirtyTileCount: recomputeWitness.dirtyTileCount,
    dirtySampleCount: recomputeWitness.dirtySampleCount,
    dirtyLayerKinds: recomputeWitness.dirtyLayerKinds,
    dirtyRegionChecksum: recomputeWitness.dirtyRegionChecksum,
    dirtyHaloSamples: recomputeWitness.dirtyHaloSamples,
    supportFrame,
    topologyChecksum: checksumParts(samples.map((sample) => topologySignature(sample))),
    proxyMaterialChecksum: checksumParts(samples.map((sample) => `${sample.id}:${sample.proxyMaterial.kind}`)),
    phaseMode: phaseState.mode,
    terrainEpoch: phaseState.terrainEpoch,
    activePhaseCount: phaseState.activeEpisodes.length,
    activePhaseKinds: activePhaseKinds(phaseState.activeEpisodes),
    phaseClock: phaseState.phaseClock,
    phaseProgress: phaseState.phaseProgress,
    ditchPhaseClock: phaseState.ditchPhaseClock,
    ditchPhaseProgress: phaseState.ditchPhaseProgress,
    trailPhaseClock: phaseState.trailPhaseClock,
    trailPhaseProgress: phaseState.trailPhaseProgress,
    phaseChecksum: phaseState.checksum,
    phaseInfluenceChecksum: checksumParts(samples.map((sample) => phaseInfluenceSignature(sample))),
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

function supportFrameWitness(
  params: HillOfHillsTerrainParams,
  phaseState: HillOfHillsPhaseState,
  samples: readonly HillOfHillsTerrainSample[],
  recomputeWitness: DirtyRecomputeWitness
): HillOfHillsSupportFrameWitness {
  const motionClassCounts: Partial<Record<HillOfHillsSupportMotionClass, number>> = {};
  const shockClassCounts: Partial<Record<HillOfHillsSupportShockClass, number>> = {};
  let maxHeightDelta = 0;
  let maxSurfaceSpeed = 0;

  for (const sample of samples) {
    motionClassCounts[sample.support.motionClass] = (motionClassCounts[sample.support.motionClass] ?? 0) + 1;
    shockClassCounts[sample.support.shock] = (shockClassCounts[sample.support.shock] ?? 0) + 1;
    maxHeightDelta = Math.max(maxHeightDelta, Math.abs(sample.support.heightDelta));
    maxSurfaceSpeed = Math.max(maxSurfaceSpeed, Math.hypot(...sample.support.surfaceVelocity));
  }

  return {
    supportClass: 'single_valued_heightfield',
    mappingMode: 'static_domain_to_world',
    domainBounds: {
      u: { min: 0, max: 1 },
      v: { min: 0, max: 1 }
    },
    worldBounds: {
      x: { min: -params.width * 0.5, max: params.width * 0.5 },
      z: { min: -params.length * 0.5, max: params.length * 0.5 }
    },
    supportEpoch: phaseState.terrainEpoch,
    topologyEpoch: phaseState.terrainEpoch,
    substrateTileSize: recomputeWitness.tileSize,
    substrateTileCount: recomputeWitness.tileCount,
    dirtySubstrateTileCount: recomputeWitness.dirtyTileCount,
    dirtySubstrateSampleCount: recomputeWitness.dirtySampleCount,
    dirtySubstrateRegionChecksum: recomputeWitness.dirtyRegionChecksum,
    minSupportWavelength: Math.max(
      params.width / Math.max(1, params.gridResolutionX - 1),
      params.length / Math.max(1, params.gridResolutionZ - 1)
    ),
    maxHeightDelta,
    maxSurfaceSpeed,
    supportFrameChecksum: checksumParts(samples.map((sample) => supportSignature(sample))),
    motionClassCounts,
    shockClassCounts
  };
}

function supportSignature(sample: HillOfHillsTerrainSample): string {
  return [
    sample.id,
    sample.support.supportClass,
    sample.support.mappingMode,
    sample.support.domain.u.toFixed(4),
    sample.support.domain.v.toFixed(4),
    sample.support.domainIndex.x,
    sample.support.domainIndex.z,
    sample.support.heightDelta.toFixed(4),
    sample.support.motionClass,
    sample.support.shock
  ].join(':');
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

function heightfieldChecksum(samples: readonly HillOfHillsTerrainSample[]): string {
  return checksumParts(samples.map((sample) => `${sample.id}:${sample.height.toFixed(4)}:${sample.slope.toFixed(4)}:${sample.phaseInfluence.amount.toFixed(3)}`));
}

function dirtyRecomputeWitness(
  params: HillOfHillsTerrainParams,
  phaseState: HillOfHillsPhaseState,
  dirtyTileOverride?: readonly string[]
): DirtyRecomputeWitness {
  const tileSize = {
    x: RECOMPUTE_TILE_SIZE.x,
    z: RECOMPUTE_TILE_SIZE.z
  };
  const tileColumns = Math.ceil(params.gridResolutionX / tileSize.x);
  const tileRows = Math.ceil(params.gridResolutionZ / tileSize.z);
  const tileCount = tileColumns * tileRows;
  const haloSamples = RECOMPUTE_HALO_SAMPLES;
  const dirtyTiles = new Set<string>();

  if (dirtyTileOverride) {
    for (const tile of dirtyTileOverride) {
      dirtyTiles.add(tile);
    }
  } else {
    for (const episode of phaseState.activeEpisodes) {
      const xRadius = episode.kind === 'trail_forming' ? episode.radius * 0.72 + episode.sideDitchOffset * 1.35 : episode.radius * 0.72;
      const zRadius = episode.kind === 'trail_forming' ? episode.radius * 2.1 : episode.radius * 2.15;
      const minXi = worldXToSampleIndex(params, episode.center[0] - xRadius) - haloSamples;
      const maxXi = worldXToSampleIndex(params, episode.center[0] + xRadius) + haloSamples;
      const minZi = worldZToSampleIndex(params, episode.center[2] - zRadius) - haloSamples;
      const maxZi = worldZToSampleIndex(params, episode.center[2] + zRadius) + haloSamples;
      const minTileX = clampInt(Math.floor(minXi / tileSize.x), 0, tileColumns - 1);
      const maxTileX = clampInt(Math.floor(maxXi / tileSize.x), 0, tileColumns - 1);
      const minTileZ = clampInt(Math.floor(minZi / tileSize.z), 0, tileRows - 1);
      const maxTileZ = clampInt(Math.floor(maxZi / tileSize.z), 0, tileRows - 1);

      for (let tileZ = minTileZ; tileZ <= maxTileZ; tileZ += 1) {
        for (let tileX = minTileX; tileX <= maxTileX; tileX += 1) {
          dirtyTiles.add(`${tileX}:${tileZ}`);
        }
      }
    }
  }

  const sortedTiles = [...dirtyTiles].sort();
  const dirtySampleCount = sortedTiles.reduce((sum, tile) => {
    const [tileX, tileZ] = tile.split(':').map((value) => Number(value));
    const xCount = Math.max(0, Math.min(params.gridResolutionX, (tileX + 1) * tileSize.x) - tileX * tileSize.x);
    const zCount = Math.max(0, Math.min(params.gridResolutionZ, (tileZ + 1) * tileSize.z) - tileZ * tileSize.z);
    return sum + xCount * zCount;
  }, 0);
  const dirtyLayerKinds: readonly HillOfHillsDirtyLayerKind[] =
    sortedTiles.length === 0 ? [] : ['phase_overlay', 'height', 'topology_derivatives', 'proxy_material', 'support_frame'];

  return {
    mode: 'full_grid_with_dirty_tiles',
    tileSize,
    tileCount,
    dirtyTileCount: sortedTiles.length,
    dirtySampleCount,
    dirtyLayerKinds,
    dirtyRegionChecksum: sortedTiles.length === 0 ? 'none' : checksum(sortedTiles.join('|')),
    dirtyHaloSamples: haloSamples,
    dirtyTiles: sortedTiles
  };
}

function stableLayerCacheKey(params: HillOfHillsTerrainParams): string {
  return [
    params.seed,
    params.width.toFixed(4),
    params.length.toFixed(4),
    params.channelRadius.toFixed(4),
    params.channelCurvature.toFixed(4),
    params.wallHeight.toFixed(4),
    params.floorWidth.toFixed(4),
    params.hillRadius.toFixed(4),
    params.hillCount,
    params.hillHeight.toFixed(4),
    params.hillVariance.toFixed(4),
    params.valleyRadius.toFixed(4),
    params.valleyCount,
    params.valleyHeight.toFixed(4),
    params.valleyVariance.toFixed(4),
    params.distanceScale.toFixed(4),
    params.worldScale.toFixed(4),
    params.featureSpacing.toFixed(4),
    params.textureScale.toFixed(4),
    params.textureDamping.toFixed(4),
    params.detailDamping.toFixed(4),
    params.gridResolutionX,
    params.gridResolutionZ,
    params.crownZ.toFixed(4)
  ].join(':');
}

function sourceCacheKey(source: SourceTruth): string {
  return [
    source.authority,
    source.route,
    source.frameId,
    source.timestampMs,
    source.sampleAgeMs,
    source.backend ?? 'none',
    source.configId ?? 'none'
  ].join(':');
}

function allTileKeys(params: HillOfHillsTerrainParams): readonly string[] {
  const tileSize = RECOMPUTE_TILE_SIZE;
  const tileColumns = Math.ceil(params.gridResolutionX / tileSize.x);
  const tileRows = Math.ceil(params.gridResolutionZ / tileSize.z);
  const tiles: string[] = [];
  for (let tileZ = 0; tileZ < tileRows; tileZ += 1) {
    for (let tileX = 0; tileX < tileColumns; tileX += 1) {
      tiles.push(`${tileX}:${tileZ}`);
    }
  }
  return tiles;
}

function unionTileKeys(a: readonly string[], b: readonly string[]): readonly string[] {
  return [...new Set([...a, ...b])].sort();
}

function sampleIndicesForTiles(params: HillOfHillsTerrainParams, tiles: readonly string[]): readonly number[] {
  const tileSize = RECOMPUTE_TILE_SIZE;
  const indices: number[] = [];

  for (const tile of tiles) {
    const [tileX, tileZ] = tile.split(':').map((value) => Number(value));
    const minX = tileX * tileSize.x;
    const maxX = Math.min(params.gridResolutionX, (tileX + 1) * tileSize.x);
    const minZ = tileZ * tileSize.z;
    const maxZ = Math.min(params.gridResolutionZ, (tileZ + 1) * tileSize.z);
    for (let zi = minZ; zi < maxZ; zi += 1) {
      for (let xi = minX; xi < maxX; xi += 1) {
        indices.push(gridIndex(params, xi, zi));
      }
    }
  }

  return indices;
}

function worldXToSampleIndex(params: HillOfHillsTerrainParams, x: number): number {
  const t = (x + params.width * 0.5) / Math.max(0.001, params.width);
  return Math.round(clamp(t, 0, 1) * (params.gridResolutionX - 1));
}

function worldZToSampleIndex(params: HillOfHillsTerrainParams, z: number): number {
  const t = (z + params.length * 0.5) / Math.max(0.001, params.length);
  return Math.round(clamp(t, 0, 1) * (params.gridResolutionZ - 1));
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

function clampInt(value: number, min: number, max: number): number {
  return Math.round(clamp(value, min, max));
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

function checksumParts(parts: Iterable<string>): string {
  let hash = 2166136261;
  for (const part of parts) {
    for (let i = 0; i < part.length; i += 1) {
      hash ^= part.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    hash ^= 124;
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}
