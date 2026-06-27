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

export interface HillOfHillsTerrainParams {
  seed: number;
  width: number;
  length: number;
  channelRadius: number;
  channelCurvature: number;
  wallHeight: number;
  floorWidth: number;
  hillRadius: number;
  hillHeight: number;
  hillVariance: number;
  valleyRadius: number;
  valleyHeight: number;
  valleyVariance: number;
  distanceScale: number;
  textureDamping: number;
  detailDamping: number;
  gridResolutionX: number;
  gridResolutionZ: number;
  crownZ: number;
}

export interface HillOfHillsTerrain {
  params: HillOfHillsTerrainParams;
  source: SourceTruth;
  samples: readonly TerrainSample[];
  witness: HillOfHillsWitness;
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
  height: number;
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
  hillHeight: 1.05,
  hillVariance: 0.55,
  valleyRadius: 1.7,
  valleyHeight: 0.82,
  valleyVariance: 0.5,
  distanceScale: 1.1,
  textureDamping: 0.5,
  detailDamping: 0.42,
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
  const samples = generateSamples(effectiveParams, source);
  const witness = createWitness(effectiveParams, source, samples, fallbackStatus);

  return {
    params: effectiveParams,
    source,
    samples,
    witness
  };
}

export function sampleHillOfHillsTerrain(terrain: HillOfHillsTerrain, x: number, z: number): TerrainSample {
  return sampleTerrain(terrain.params, terrain.source, x, z);
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
  const channelRadius = finiteAtLeast(params.channelRadius, 1.2);
  const floorWidth = clamp(finiteAtLeast(params.floorWidth, 0.8), 0.8, channelRadius * 1.55);

  return {
    seed: Math.floor(finiteOr(params.seed, defaultHillOfHillsParams.seed)),
    width: finiteAtLeast(params.width, channelRadius * 2.05),
    length: finiteAtLeast(params.length, 4),
    channelRadius,
    channelCurvature: clamp(finiteOr(params.channelCurvature, 1), 0.25, 3),
    wallHeight: finiteAtLeast(params.wallHeight, 0.1),
    floorWidth,
    hillRadius: finiteAtLeast(params.hillRadius, 0.35),
    hillHeight: finiteAtLeast(params.hillHeight, 0),
    hillVariance: clamp(finiteOr(params.hillVariance, 0.5), 0, 1.5),
    valleyRadius: finiteAtLeast(params.valleyRadius, 0.35),
    valleyHeight: finiteAtLeast(params.valleyHeight, 0),
    valleyVariance: clamp(finiteOr(params.valleyVariance, 0.5), 0, 1.5),
    distanceScale: finiteAtLeast(params.distanceScale, 0.25),
    textureDamping: clamp(finiteOr(params.textureDamping, 0.5), 0, 1),
    detailDamping: clamp(finiteOr(params.detailDamping, 0.5), 0, 1),
    gridResolutionX: Math.max(8, Math.round(finiteOr(params.gridResolutionX, 72))),
    gridResolutionZ: Math.max(8, Math.round(finiteOr(params.gridResolutionZ, 96))),
    crownZ: clamp(finiteOr(params.crownZ, defaultHillOfHillsParams.crownZ), -params.length * 0.5, params.length * 0.5)
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

function generateSamples(params: HillOfHillsTerrainParams, source: SourceTruth): TerrainSample[] {
  const samples: TerrainSample[] = [];
  const dx = params.width / (params.gridResolutionX - 1);
  const dz = params.length / (params.gridResolutionZ - 1);

  for (let zi = 0; zi < params.gridResolutionZ; zi += 1) {
    const z = -params.length * 0.5 + zi * dz;
    for (let xi = 0; xi < params.gridResolutionX; xi += 1) {
      const x = -params.width * 0.5 + xi * dx;
      samples.push(sampleTerrain(params, source, x, z, `terrain-${xi}-${zi}`));
    }
  }

  return samples;
}

function sampleTerrain(params: HillOfHillsTerrainParams, source: SourceTruth, x: number, z: number, id?: string): TerrainSample {
  const clampedX = clamp(x, -params.width * 0.5, params.width * 0.5);
  const clampedZ = clamp(z, -params.length * 0.5, params.length * 0.5);
  const height = heightAt(params, clampedX, clampedZ).height;
  const epsX = Math.max(0.02, params.width / (params.gridResolutionX * 2));
  const epsZ = Math.max(0.02, params.length / (params.gridResolutionZ * 2));
  const heightLeft = heightAt(params, clampedX - epsX, clampedZ).height;
  const heightRight = heightAt(params, clampedX + epsX, clampedZ).height;
  const heightBack = heightAt(params, clampedX, clampedZ - epsZ).height;
  const heightForward = heightAt(params, clampedX, clampedZ + epsZ).height;
  const dx = (heightRight - heightLeft) / (epsX * 2);
  const dz = (heightForward - heightBack) / (epsZ * 2);
  const normal = normalize([-dx, 1, -dz]);
  const slope = Math.hypot(dx, dz);

  return {
    schema: TERRAIN_SAMPLE_SCHEMA,
    id: id ?? `terrain-${roundId(clampedX)}-${roundId(clampedZ)}`,
    source,
    world: [clampedX, height, clampedZ],
    normal,
    height,
    slope,
    region: classifyRegion(params, clampedX, clampedZ, height, slope)
  };
}

function heightAt(params: HillOfHillsTerrainParams, x: number, z: number): HeightParts {
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
  const hills = featureContribution(hillFeatures, x, z, params.distanceScale);
  const valleys = featureContribution(valleyFeatures, x, z, params.distanceScale);
  const macroDamping = 1 - floorProtection * 0.58;
  const valleyFloorDamping = 1 - floorProtection * 0.82;
  const textureAmplitude = 0.18 * (1 - params.textureDamping);
  const detailAmplitude = 0.1 * (1 - params.detailDamping);
  const detail =
    textureAmplitude * Math.sin((x * 1.55 + z * 0.42 + params.seed * 0.001) * params.distanceScale) +
    detailAmplitude * Math.cos((x * 3.6 - z * 2.1 + params.seed * 0.002) * params.distanceScale);
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
    height
  };
}

function classifyRegion(params: HillOfHillsTerrainParams, x: number, z: number, height: number, slope: number): TerrainRegion {
  const lateral = Math.abs(x);
  const halfFloor = params.floorWidth * 0.5;
  const heightParts = heightAt(params, x, z);

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
  const count = kind === 'hill' ? 14 : 12;
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
  samples: readonly TerrainSample[],
  fallbackStatus: TerrainFallbackStatus
): HillOfHillsWitness {
  const regionCounts: Partial<Record<TerrainRegion, number>> = {};
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;

  for (const sample of samples) {
    min = Math.min(min, sample.height);
    max = Math.max(max, sample.height);
    regionCounts[sample.region] = (regionCounts[sample.region] ?? 0) + 1;
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
    regionCounts
  };
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
