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
import {
  HILL_OF_HILLS_PRODUCER_TRAFFIC_FIELD_SCHEMA,
  admitHillOfHillsProducerContactHistory,
  createEmptyHillOfHillsProducerTrafficField,
  sampleHillOfHillsProducerTrafficField,
  type HillOfHillsProducerContactHistory,
  type HillOfHillsProducerTrafficField
} from './hill-of-hills-producer-contact-history.js';

export const HILL_OF_HILLS_WITNESS_SCHEMA = 'lerms.hill-of-hills-witness.v0' as const;
export const HILL_OF_HILLS_TERRAIN_BUFFER_SCHEMA = 'lerms.hill-of-hills-terrain-buffer.v0' as const;
export const HILL_OF_HILLS_TOPOLOGY_EVENT_KINDS = [
  'hill_swell',
  'hill_slump',
  'valley_deepen',
  'valley_fill',
  'ridge_lift',
  'ridge_shear',
  'saddle_pinch',
  'saddle_pass',
  'basin_bloom',
  'strata_reveal'
] as const;
export const HILL_OF_HILLS_TOPOLOGY_GESTURE_PRESETS = [
  'flicker',
  'pulse',
  'breath',
  'surge',
  'creep',
  'aftershock',
  'tide',
  'rupture'
] as const;

export type TerrainFallbackStatus = 'none' | 'synthetic_fixture' | 'fallback' | 'invalid';
export type HillOfHillsTopologyPhaseKind = (typeof HILL_OF_HILLS_TOPOLOGY_EVENT_KINDS)[number];
export type HillOfHillsTopologyGesturePreset = (typeof HILL_OF_HILLS_TOPOLOGY_GESTURE_PRESETS)[number];
export type HillOfHillsTopologyDynamicsMode = 'direct_synthesis' | 'persistent_pressure';
export type HillOfHillsTopologyPossibilityMode = 'inherited' | 'reauthored' | 'phase_recomposed';
export type HillOfHillsPhaseMode = 'stable' | 'ditch_forming' | 'trail_forming' | 'topology_morphing' | 'mixed_forming';
export type HillOfHillsPhaseKind = 'ditch_forming' | 'trail_forming' | HillOfHillsTopologyPhaseKind;
export type HillOfHillsPhaseInfluenceKind = 'none' | HillOfHillsPhaseKind;
export type HillOfHillsTopologyEventReasonKind =
  | 'crown_growth_pressure'
  | 'steep_crown_slump'
  | 'flow_cut_valley'
  | 'sediment_fill_valley'
  | 'ridge_lift_pressure'
  | 'ridge_shear_exposure'
  | 'saddle_compression'
  | 'route_pass_opening'
  | 'basin_growth_bloom'
  | 'eroded_strata_exposure';
export type HillOfHillsTopologyEventFalloffKind = 'smooth_radial' | 'elongated_band' | 'shear_band' | 'pass_band';
export type HillOfHillsTopologyEventMaterialHintKind =
  | 'growth'
  | 'dust'
  | 'damp'
  | 'stone'
  | 'route'
  | 'meadow'
  | 'exposed_strata';
export type HillOfHillsTopologyEventAssetHintKind =
  | 'brush_cluster'
  | 'fallen_scrub'
  | 'wet_rim'
  | 'dry_silt'
  | 'rock_rib'
  | 'shear_scree'
  | 'pass_mark'
  | 'meadow_bloom'
  | 'strata_chip';
export type HillOfHillsTrailSeedMethod = 'none' | 'random_band' | 'topology_score';
export type HillOfHillsHeightfieldMode = 'direct_query' | 'grid_heightfield';
export type HillOfHillsRecomputeMode = 'full_grid_with_dirty_tiles';
export type HillOfHillsDirtyLayerKind = 'height' | 'phase_overlay' | 'topology_derivatives' | 'proxy_material' | 'support_frame';
export type HillOfHillsCacheMode = 'uncached_full_grid' | 'persistent_layer_tile_cache';
export type HillOfHillsSupportClass = 'single_valued_heightfield';
export type HillOfHillsSupportMappingMode = 'static_domain_to_world';
export type HillOfHillsSupportMotionClass = 'stable' | 'phase_morph' | 'shock_reset';
export type HillOfHillsSupportShockClass = 'none' | 'shock_reset';
export type HillOfHillsSurfaceDetailKind =
  | 'none'
  | 'meadow-tuft'
  | 'dust-scuff'
  | 'slope-striation'
  | 'damp-edge'
  | 'trail-wear'
  | 'growth-bud';
export type HillOfHillsMaterialEdgeKind =
  | 'none'
  | 'meadow-dust'
  | 'meadow-growth'
  | 'dust-crust'
  | 'damp-rim'
  | 'route-wear'
  | 'growth-cluster'
  | 'slope-break';
export type HillOfHillsSurfaceAnchorKind =
  | 'none'
  | 'tuft-line'
  | 'scuff-line'
  | 'wet-rim'
  | 'trail-accent'
  | 'growth-cluster'
  | 'stone-scatter';
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
  | 'topologyAmount'
  | 'topologyHeightDelta'
  | 'topologyDeformation'
  | 'topologyVelocity'
  | 'topologyForce'
  | 'topologyGrossForce'
  | 'topologyOpposedForce'
  | 'topologyContention'
  | 'hillSwellMembership'
  | 'hillSlumpMembership'
  | 'wetness'
  | 'growthTint'
  | 'previousHeight'
  | 'heightDelta'
  | 'surfaceVelocityY'
  | 'surfaceDetailDensity'
  | 'surfaceDetailEdgeMix'
  | 'materialEdgeStrength'
  | 'materialEdgeDissolve'
  | 'slopePressure'
  | 'curvaturePressure'
  | 'ridgePressure'
  | 'valleyPressure'
  | 'saddlePressure'
  | 'basinPressure'
  | 'exposurePressure'
  | 'erosionPressure'
  | 'bloomPressure'
  | 'strataPressure'
  | 'vegetationPressure';

export const HILL_OF_HILLS_PRESSURE_FIELD_KINDS = [
  'slope',
  'curvature',
  'ridge',
  'valley',
  'saddle',
  'basin',
  'exposure',
  'route',
  'erosion',
  'bloom',
  'strata',
  'vegetation'
] as const;

export type HillOfHillsPressureFieldKind = (typeof HILL_OF_HILLS_PRESSURE_FIELD_KINDS)[number];

export type HillOfHillsPressureFieldSample = Record<HillOfHillsPressureFieldKind, number>;

export interface HillOfHillsPressureFieldComfortBand {
  target: Range;
  below: number;
  inside: number;
  above: number;
  maxViolation: number;
}

export const HILL_OF_HILLS_PRESSURE_FIELD_METRIC_CHANNELS: Record<
  HillOfHillsPressureFieldKind,
  HillOfHillsTerrainBufferMetricChannel
> = {
  slope: 'slopePressure',
  curvature: 'curvaturePressure',
  ridge: 'ridgePressure',
  valley: 'valleyPressure',
  saddle: 'saddlePressure',
  basin: 'basinPressure',
  exposure: 'exposurePressure',
  route: 'routePressure',
  erosion: 'erosionPressure',
  bloom: 'bloomPressure',
  strata: 'strataPressure',
  vegetation: 'vegetationPressure'
};

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

export interface HillOfHillsTopologyEventEligibility {
  score: number;
  possibility: number;
  hill: number;
  valley: number;
  ridge: number;
  saddle: number;
  basin: number;
  route: number;
  flow: number;
  growth: number;
  strata: number;
  slope: number;
}

export interface HillOfHillsTopologyEventClassConfig {
  enabled: boolean;
  appetite: number;
  force: number;
  gesture: HillOfHillsTopologyGesturePreset;
  phaseOffset: number;
  spread: number;
}

export type HillOfHillsTopologyEventClassConfigMap = Record<HillOfHillsTopologyPhaseKind, HillOfHillsTopologyEventClassConfig>;

export interface HillOfHillsTopologyEventEnvelope {
  clock: number;
  phaseIn: number;
  hold: number;
  phaseOut: number;
  amount: number;
  durationMs: number;
  cadenceMs: number;
  intensity: number;
  supportRadius: number;
  falloff: HillOfHillsTopologyEventFalloffKind;
  gesture: HillOfHillsTopologyGesturePreset;
  appetite: number;
  force: number;
  phaseOffset: number;
  spread: number;
}

export type HillOfHillsTopologySupportLifecycle = 'entering' | 'active' | 'tailing';

export interface HillOfHillsTopologyEventDebug {
  id: string;
  kind: HillOfHillsTopologyPhaseKind;
  supportEpoch: number;
  supportLifecycle: HillOfHillsTopologySupportLifecycle;
  supportClock: number;
  supportAmount: number;
  reason: HillOfHillsTopologyEventReasonKind;
  semanticReason: string;
  center: Vec3;
  direction: Vec3;
  eligibility: HillOfHillsTopologyEventEligibility;
  envelope: HillOfHillsTopologyEventEnvelope;
  materialHint: HillOfHillsTopologyEventMaterialHintKind;
  assetHint: HillOfHillsTopologyEventAssetHintKind;
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
  heightScale: number;
  seedMethod: HillOfHillsTrailSeedMethod;
  seedScore: number;
  seedRoutePressure: number;
  seedValleyStrength: number;
  seedFlowAccumulation: number;
  seedDitchPotential: number;
  seedSlope: number;
  topologyEvent?: HillOfHillsTopologyEventDebug;
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
  topologyPhaseClock: number;
  topologyPhaseProgress: number;
  trailSeedMethod: HillOfHillsTrailSeedMethod;
  trailCandidateChecksum: string;
  trailCandidateScoreRange: Range;
  selectedTrailScoreRange: Range;
  topologyEventCandidateChecksum: string;
  topologyEventCandidateScoreRange: Range;
  selectedTopologyEventScoreRange: Range;
  topologyDynamicsMode: HillOfHillsTopologyDynamicsMode;
  topologyPossibilityMode: HillOfHillsTopologyPossibilityMode;
  topologyPossibilityChecksum: string;
  topologyPossibilityRange: Range;
  persistentTopologyField?: PersistentTopologyField;
  producerTrafficField?: HillOfHillsProducerTrafficField;
}

export interface HillOfHillsPhaseInfluence {
  kind: HillOfHillsPhaseInfluenceKind;
  amount: number;
  trailAmount: number;
  sideDitchAmount: number;
  topologyAmount: number;
  topologyHeightDelta: number;
  topologyDeformation: number;
  topologyVelocity: number;
  topologyForce: number;
  topologyGrossForce: number;
  topologyOpposedForce: number;
  topologyContention: number;
  semanticMemberships: Partial<Record<HillOfHillsTopologyPhaseKind, number>>;
  episodeId?: string;
}

export function hillPhaseMembershipAmount(
  influence: HillOfHillsPhaseInfluence,
  ...kinds: readonly HillOfHillsTopologyPhaseKind[]
): number {
  let combined = 0;
  for (const kind of kinds) {
    const amount =
      influence.semanticMemberships[kind] ??
      (influence.kind === kind ? influence.topologyAmount : 0);
    combined = 1 - (1 - combined) * (1 - clamp(amount, 0, 1));
  }
  return clamp(combined, 0, 1);
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
  topologyPhaseSeed: number;
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
  topologyPhaseTimeMs: number;
  topologyPhaseDurationMs: number;
  topologyDynamicsMode: HillOfHillsTopologyDynamicsMode;
  topologyPossibilityMode: HillOfHillsTopologyPossibilityMode;
  topologyEventClasses: HillOfHillsTopologyEventClassConfigMap;
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
  surfaceDetailChecksum: string;
  materialEdgeChecksum: string;
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
  surfaceDetailCodes: Uint8Array;
  materialEdgeCodes: Uint8Array;
  surfaceAnchorCodes: Uint8Array;
}

export interface HillOfHillsLayerTileCache {
  generation: number;
  stableLayerKey?: string;
  stableLayerChecksum?: string;
  sourceKey?: string;
  topologyDynamicsKey?: string;
  persistentTopologyField?: PersistentTopologyField;
  producerTrafficField?: HillOfHillsProducerTrafficField;
  producerTrafficSourceLineageKey?: string;
  lastSourceFrameId?: string;
  lastSampleChecksum?: string;
  lastTopologyChecksum?: string;
  stableHeightfield?: StableGridHeightfield;
  samples?: readonly HillOfHillsTerrainSample[];
  previousDirtyTiles?: readonly string[];
}

export interface HillOfHillsTerrainSample extends TerrainSample {
  topology: HillOfHillsTopology;
  pressure: HillOfHillsPressureFieldSample;
  proxyMaterial: HillOfHillsProxyMaterial;
  phaseInfluence: HillOfHillsPhaseInfluence;
  support: HillOfHillsSupportSample;
  surfaceDetail: HillOfHillsSurfaceDetail;
  materialEdge: HillOfHillsMaterialEdge;
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
  topologyPhaseClock: number;
  topologyPhaseProgress: number;
  phaseChecksum: string;
  phaseInfluenceChecksum: string;
  phaseInfluenceRange: Range;
  trailInfluenceRange: Range;
  sideDitchInfluenceRange: Range;
  topologyInfluenceRange: Range;
  topologyDynamicsMode: HillOfHillsTopologyDynamicsMode;
  topologyPossibilityMode: HillOfHillsTopologyPossibilityMode;
  topologyPossibilityChecksum: string;
  topologyPossibilityRange: Range;
  producerTrafficFieldSchema: typeof HILL_OF_HILLS_PRODUCER_TRAFFIC_FIELD_SCHEMA;
  producerTrafficSourceLineageKey: string;
  producerTrafficFieldChecksum: string;
  producerTrafficFieldRange: Range;
  producerTrafficAdmittedEpisodeCount: number;
  producerTrafficStanceContactCount: number;
  producerTrafficSupportedRootSampleCount: number;
  producerTrafficExposureSeconds: number;
  topologyDynamicsChecksum: string;
  topologyDynamicsIntegrationOriginMs: number;
  topologyDeformationRange: Range;
  topologyVelocityRange: Range;
  topologyForceRange: Range;
  topologyGrossForceRange: Range;
  topologyOpposedForceRange: Range;
  topologyContentionRange: Range;
  hillSwellMembershipRange: Range;
  hillSlumpMembershipRange: Range;
  phaseInfluenceKinds: Partial<Record<HillOfHillsPhaseInfluenceKind, number>>;
  trailSeedMethod: HillOfHillsTrailSeedMethod;
  trailCandidateChecksum: string;
  trailCandidateScoreRange: Range;
  selectedTrailScoreRange: Range;
  topologyEventVocabulary: readonly HillOfHillsTopologyPhaseKind[];
  topologyEventCandidateChecksum: string;
  topologyEventCandidateScoreRange: Range;
  selectedTopologyEventScoreRange: Range;
  topologyEventDebug: readonly HillOfHillsTopologyEventDebug[];
  topologyRanges: {
    flowAccumulation: Range;
    ridgeStrength: Range;
    valleyStrength: Range;
    routePressure: Range;
    ditchPotential: Range;
    growthPotential: Range;
  };
  pressureFieldVocabulary: readonly HillOfHillsPressureFieldKind[];
  pressureFieldChecksum: string;
  pressureFieldRanges: Record<HillOfHillsPressureFieldKind, Range>;
  pressureFieldComfort: Record<HillOfHillsPressureFieldKind, HillOfHillsPressureFieldComfortBand>;
  proxyMaterialCounts: Partial<Record<HillOfHillsProxyMaterialKind, number>>;
  surfaceDetailChecksum: string;
  surfaceDetailCounts: Partial<Record<HillOfHillsSurfaceDetailKind, number>>;
  materialEdgeChecksum: string;
  materialEdgeCounts: Partial<Record<HillOfHillsMaterialEdgeKind, number>>;
  surfaceAnchorCounts: Partial<Record<HillOfHillsSurfaceAnchorKind, number>>;
}

export interface HillOfHillsSurfaceDetail {
  kind: HillOfHillsSurfaceDetailKind;
  density: number;
  edgeMix: number;
  seed: number;
}

export interface HillOfHillsMaterialEdge {
  kind: HillOfHillsMaterialEdgeKind;
  anchor: HillOfHillsSurfaceAnchorKind;
  strength: number;
  dissolve: number;
  seed: number;
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
  producerContactHistory?: HillOfHillsProducerContactHistory;
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
  phaseTopology: number;
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

interface TopologyMotionCandidate extends TrailSeedCandidate {
  topologyKind: HillOfHillsTopologyPhaseKind;
  ridgeStrength: number;
  growthPotential: number;
  eligibility: HillOfHillsTopologyEventEligibility;
  reason: HillOfHillsTopologyEventReasonKind;
  semanticReason: string;
  materialHint: HillOfHillsTopologyEventMaterialHintKind;
  assetHint: HillOfHillsTopologyEventAssetHintKind;
  falloff: HillOfHillsTopologyEventFalloffKind;
}

interface TrailCandidateSummary {
  candidates: readonly TrailSeedCandidate[];
  checksum: string;
  scoreRange: Range;
}

interface TopologyMotionCandidateSummary {
  candidates: readonly TopologyMotionCandidate[];
  checksum: string;
  scoreRange: Range;
  possibilityChecksum: string;
  possibilityRange: Range;
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

interface PersistentTopologyField {
  timeMs: number;
  integrationOriginMs: number;
  xCount: number;
  zCount: number;
  dx: number;
  dz: number;
  deformation: readonly number[];
  velocity: readonly number[];
  force: readonly number[];
  grossForce: readonly number[];
  opposedForce: readonly number[];
  contention: readonly number[];
  hillMembership: readonly number[];
  slumpMembership: readonly number[];
  topologySelections: readonly PersistentTopologySelection[];
  producerTrafficField: HillOfHillsProducerTrafficField;
}

interface PersistentTopologySelection {
  epoch: number;
  selectionKey: string;
  candidates: readonly TopologyMotionCandidate[];
  candidateChecksum: string;
  candidateScoreRange: Range;
  possibilityChecksum: string;
  possibilityRange: Range;
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
  'topologyAmount',
  'topologyHeightDelta',
  'topologyDeformation',
  'topologyVelocity',
  'topologyForce',
  'hillSwellMembership',
  'hillSlumpMembership',
  'wetness',
  'growthTint',
  'previousHeight',
  'heightDelta',
  'surfaceVelocityY',
  'surfaceDetailDensity',
  'surfaceDetailEdgeMix',
  'materialEdgeStrength',
  'materialEdgeDissolve',
  'slopePressure',
  'curvaturePressure',
  'ridgePressure',
  'valleyPressure',
  'saddlePressure',
  'basinPressure',
  'exposurePressure',
  'erosionPressure',
  'bloomPressure',
  'strataPressure',
  'vegetationPressure',
  'topologyGrossForce',
  'topologyOpposedForce',
  'topologyContention'
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
const SURFACE_DETAIL_CODEBOOK: readonly HillOfHillsSurfaceDetailKind[] = [
  'none',
  'meadow-tuft',
  'dust-scuff',
  'slope-striation',
  'damp-edge',
  'trail-wear',
  'growth-bud'
];
const MATERIAL_EDGE_CODEBOOK: readonly HillOfHillsMaterialEdgeKind[] = [
  'none',
  'meadow-dust',
  'meadow-growth',
  'dust-crust',
  'damp-rim',
  'route-wear',
  'growth-cluster',
  'slope-break'
];
const SURFACE_ANCHOR_CODEBOOK: readonly HillOfHillsSurfaceAnchorKind[] = [
  'none',
  'tuft-line',
  'scuff-line',
  'wet-rim',
  'trail-accent',
  'growth-cluster',
  'stone-scatter'
];

export const defaultHillOfHillsTopologyEventClasses: HillOfHillsTopologyEventClassConfigMap = {
  hill_swell: {
    enabled: true,
    appetite: 1,
    force: 1,
    gesture: 'breath',
    phaseOffset: 0.04,
    spread: 1.08
  },
  hill_slump: {
    enabled: true,
    appetite: 0.9,
    force: 0.95,
    gesture: 'creep',
    phaseOffset: 0.18,
    spread: 1.05
  },
  valley_deepen: {
    enabled: true,
    appetite: 1,
    force: 1.05,
    gesture: 'surge',
    phaseOffset: 0.12,
    spread: 1.12
  },
  valley_fill: {
    enabled: true,
    appetite: 0.82,
    force: 0.78,
    gesture: 'tide',
    phaseOffset: 0.56,
    spread: 1.25
  },
  ridge_lift: {
    enabled: true,
    appetite: 0.94,
    force: 1,
    gesture: 'breath',
    phaseOffset: 0.22,
    spread: 1
  },
  ridge_shear: {
    enabled: true,
    appetite: 0.84,
    force: 1.15,
    gesture: 'rupture',
    phaseOffset: 0.34,
    spread: 0.85
  },
  saddle_pinch: {
    enabled: true,
    appetite: 0.86,
    force: 0.92,
    gesture: 'pulse',
    phaseOffset: 0.46,
    spread: 0.95
  },
  saddle_pass: {
    enabled: true,
    appetite: 0.78,
    force: 0.84,
    gesture: 'creep',
    phaseOffset: 0.62,
    spread: 1.18
  },
  basin_bloom: {
    enabled: true,
    appetite: 0.9,
    force: 0.72,
    gesture: 'tide',
    phaseOffset: 0.72,
    spread: 1.35
  },
  strata_reveal: {
    enabled: true,
    appetite: 0.74,
    force: 1.08,
    gesture: 'aftershock',
    phaseOffset: 0.38,
    spread: 0.75
  }
};

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
  topologyPhaseSeed: 12203,
  topologyPhaseIntensity: 0,
  topologyPhaseLimit: 0,
  topologyPhaseRadius: 1.45,
  topologyPhaseHeightScale: 1,
  topologyPhaseBasinBias: 1,
  topologyPhaseValleyBias: 1,
  topologyPhaseHillBias: 1,
  topologyPhaseRidgeBias: 1,
  topologyPhaseSaddleBias: 1,
  topologyPhaseOverlap: 0.32,
  topologyPhaseDetailScale: 1,
  topologyPhaseDriftIntensity: 0,
  topologyPhaseTimeMs: 0,
  topologyPhaseDurationMs: 1800,
  topologyDynamicsMode: 'direct_synthesis',
  topologyPossibilityMode: 'inherited',
  topologyEventClasses: defaultHillOfHillsTopologyEventClasses,
  gridResolutionX: 72,
  gridResolutionZ: 96,
  crownZ: 5.2
};

export function createHillOfHillsTerrain(
  params: Partial<HillOfHillsTerrainParams> = {},
  sourceOptions: HillOfHillsSourceOptions = {}
): HillOfHillsTerrain {
  if (sourceOptions.producerContactHistory) {
    throw new Error('producer contact history requires createHillOfHillsTerrainWithCache and a witnessed prior Hill');
  }
  const effectiveParams = normalizeParams({ ...defaultHillOfHillsParams, ...params });
  const fallbackStatus = normalizeFallbackStatus(sourceOptions);
  const source = createTerrainSource(effectiveParams, sourceOptions, fallbackStatus);
  const phaseState = createPhaseState(effectiveParams, undefined, emptyProducerTrafficFieldFor(effectiveParams));
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

function emptyProducerTrafficFieldFor(
  params: HillOfHillsTerrainParams,
  sourceLineageKey = 'unbound'
): HillOfHillsProducerTrafficField {
  return createEmptyHillOfHillsProducerTrafficField({
    xCount: Math.min(24, Math.max(8, params.gridResolutionX)),
    zCount: Math.min(32, Math.max(8, params.gridResolutionZ)),
    xMin: -params.width * 0.5,
    xMax: params.width * 0.5,
    zMin: -params.length * 0.5,
    zMax: params.length * 0.5
  }, sourceLineageKey);
}

function producerTrafficGridMatches(
  field: HillOfHillsProducerTrafficField,
  params: HillOfHillsTerrainParams,
  sourceLineageKey: string
): boolean {
  const expected = emptyProducerTrafficFieldFor(params, sourceLineageKey);
  return (
    field.xCount === expected.xCount &&
    field.zCount === expected.zCount &&
    field.xMin === expected.xMin &&
    field.xMax === expected.xMax &&
    field.zMin === expected.zMin &&
    field.zMax === expected.zMax &&
    field.sourceLineageKey === sourceLineageKey
  );
}

function assertProducerContactHistoryTargetsPriorHill(
  cache: HillOfHillsLayerTileCache,
  history: HillOfHillsProducerContactHistory,
  topologyDynamicsKey: string,
  currentSourceLineageKey: string
): void {
  if (!cache.lastSourceFrameId || !cache.lastSampleChecksum || !cache.lastTopologyChecksum) {
    throw new Error('producer contact history requires a witnessed prior Hill frame');
  }
  if (cache.topologyDynamicsKey !== topologyDynamicsKey) {
    throw new Error('producer contact history cannot cross a Hill topology trajectory change');
  }
  if (
    history.hill.sourceId !== cache.lastSourceFrameId ||
    history.hill.sampleChecksum !== cache.lastSampleChecksum ||
    history.hill.topologyChecksum !== cache.lastTopologyChecksum
  ) {
    throw new Error('producer contact history targets a different or stale Hill witness');
  }
  if (cache.producerTrafficSourceLineageKey !== currentSourceLineageKey) {
    throw new Error('producer contact history cannot cross the current Hill source lineage');
  }
}

export function createHillOfHillsTerrainWithCache(
  cache: HillOfHillsLayerTileCache,
  params: Partial<HillOfHillsTerrainParams> = {},
  sourceOptions: HillOfHillsSourceOptions = {}
): HillOfHillsTerrain {
  const effectiveParams = normalizeParams({ ...defaultHillOfHillsParams, ...params });
  const fallbackStatus = normalizeFallbackStatus(sourceOptions);
  const source = createTerrainSource(effectiveParams, sourceOptions, fallbackStatus);
  const topologyDynamicsKey = persistentTopologyTrajectoryKey(effectiveParams);
  const stableLayerKey = stableLayerCacheKey(effectiveParams);
  const producerTrafficSourceLineageKey = checksum(
    JSON.stringify({
      authority: source.authority,
      route: source.route,
      backend: source.backend ?? 'none',
      explicitConfigId: sourceOptions.configId ?? 'implicit-config-family'
    })
  );
  if (sourceOptions.producerContactHistory) {
    assertProducerContactHistoryTargetsPriorHill(
      cache,
      sourceOptions.producerContactHistory,
      topologyDynamicsKey,
      producerTrafficSourceLineageKey
    );
  }
  const reusableProducerTrafficField =
    cache.topologyDynamicsKey === topologyDynamicsKey &&
    cache.producerTrafficSourceLineageKey === producerTrafficSourceLineageKey
      ? cache.producerTrafficField
      : undefined;
  let producerTrafficField =
    reusableProducerTrafficField &&
    producerTrafficGridMatches(reusableProducerTrafficField, effectiveParams, producerTrafficSourceLineageKey)
      ? reusableProducerTrafficField
      : emptyProducerTrafficFieldFor(effectiveParams, producerTrafficSourceLineageKey);
  if (sourceOptions.producerContactHistory) {
    producerTrafficField = admitHillOfHillsProducerContactHistory(
      producerTrafficField,
      sourceOptions.producerContactHistory
    );
  }
  const reusablePersistentField =
    effectiveParams.topologyDynamicsMode === 'persistent_pressure' &&
    cache.topologyDynamicsKey === topologyDynamicsKey &&
    cache.producerTrafficSourceLineageKey === producerTrafficSourceLineageKey &&
    cache.persistentTopologyField &&
    cache.persistentTopologyField.timeMs <= effectiveParams.topologyPhaseTimeMs
      ? cache.persistentTopologyField
      : undefined;
  const phaseState = createPhaseState(effectiveParams, reusablePersistentField, producerTrafficField);
  const stableLayerChecksum = checksum(stableLayerKey);
  const sourceKey = sourceCacheKey(source);
  const stableInvalidated =
    cache.stableLayerKey !== stableLayerKey ||
    cache.stableHeightfield === undefined ||
    cache.samples === undefined ||
    cache.samples.length !== effectiveParams.gridResolutionX * effectiveParams.gridResolutionZ;
  const sourceInvalidated = cache.sourceKey !== undefined && cache.sourceKey !== sourceKey;
  const topologyDynamicsInvalidated = cache.topologyDynamicsKey !== topologyDynamicsKey;
  const sampleInvalidated = stableInvalidated || sourceInvalidated || topologyDynamicsInvalidated;

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
  cache.topologyDynamicsKey = topologyDynamicsKey;
  cache.persistentTopologyField = phaseState.persistentTopologyField;
  cache.producerTrafficField = producerTrafficField;
  cache.producerTrafficSourceLineageKey = producerTrafficSourceLineageKey;
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
  cache.lastSourceFrameId = source.frameId;
  cache.lastSampleChecksum = witness.sampleChecksum;
  cache.lastTopologyChecksum = witness.topologyChecksum;

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
  const surfaceDetailCodes = new Uint8Array(sampleCount);
  const materialEdgeCodes = new Uint8Array(sampleCount);
  const surfaceAnchorCodes = new Uint8Array(sampleCount);

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
    metrics[metricOffset + 9] = sample.phaseInfluence.topologyAmount;
    metrics[metricOffset + 10] = sample.phaseInfluence.topologyHeightDelta;
    metrics[metricOffset + 11] = sample.phaseInfluence.topologyDeformation;
    metrics[metricOffset + 12] = sample.phaseInfluence.topologyVelocity;
    metrics[metricOffset + 13] = sample.phaseInfluence.topologyForce;
    metrics[metricOffset + 14] = sample.phaseInfluence.semanticMemberships.hill_swell ?? 0;
    metrics[metricOffset + 15] = sample.phaseInfluence.semanticMemberships.hill_slump ?? 0;
    metrics[metricOffset + 16] = sample.proxyMaterial.wetness;
    metrics[metricOffset + 17] = sample.proxyMaterial.growthTint;
    metrics[metricOffset + 18] = sample.support.previousHeight;
    metrics[metricOffset + 19] = sample.support.heightDelta;
    metrics[metricOffset + 20] = sample.support.surfaceVelocity[1];
    metrics[metricOffset + 21] = sample.surfaceDetail.density;
    metrics[metricOffset + 22] = sample.surfaceDetail.edgeMix;
    metrics[metricOffset + 23] = sample.materialEdge.strength;
    metrics[metricOffset + 24] = sample.materialEdge.dissolve;
    metrics[metricOffset + 25] = sample.pressure.slope;
    metrics[metricOffset + 26] = sample.pressure.curvature;
    metrics[metricOffset + 27] = sample.pressure.ridge;
    metrics[metricOffset + 28] = sample.pressure.valley;
    metrics[metricOffset + 29] = sample.pressure.saddle;
    metrics[metricOffset + 30] = sample.pressure.basin;
    metrics[metricOffset + 31] = sample.pressure.exposure;
    metrics[metricOffset + 32] = sample.pressure.erosion;
    metrics[metricOffset + 33] = sample.pressure.bloom;
    metrics[metricOffset + 34] = sample.pressure.strata;
    metrics[metricOffset + 35] = sample.pressure.vegetation;
    metrics[metricOffset + 36] = sample.phaseInfluence.topologyGrossForce;
    metrics[metricOffset + 37] = sample.phaseInfluence.topologyOpposedForce;
    metrics[metricOffset + 38] = sample.phaseInfluence.topologyContention;
    regionCodes[index] = codeForTerrainRegion(sample.region);
    materialCodes[index] = codeForProxyMaterial(sample.proxyMaterial.kind);
    surfaceDetailCodes[index] = codeForSurfaceDetail(sample.surfaceDetail.kind);
    materialEdgeCodes[index] = codeForMaterialEdge(sample.materialEdge.kind);
    surfaceAnchorCodes[index] = codeForSurfaceAnchor(sample.materialEdge.anchor);
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
    surfaceDetailChecksum: terrain.witness.surfaceDetailChecksum,
    materialEdgeChecksum: terrain.witness.materialEdgeChecksum,
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
    materialCodes,
    surfaceDetailCodes,
    materialEdgeCodes,
    surfaceAnchorCodes
  };
}

export function transferListForHillOfHillsTerrainBuffer(buffer: HillOfHillsTerrainBuffer): ArrayBuffer[] {
  return [
    buffer.positions.buffer as ArrayBuffer,
    buffer.normals.buffer as ArrayBuffer,
    buffer.colors.buffer as ArrayBuffer,
    buffer.metrics.buffer as ArrayBuffer,
    buffer.regionCodes.buffer as ArrayBuffer,
    buffer.materialCodes.buffer as ArrayBuffer,
    buffer.surfaceDetailCodes.buffer as ArrayBuffer,
    buffer.materialEdgeCodes.buffer as ArrayBuffer,
    buffer.surfaceAnchorCodes.buffer as ArrayBuffer
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
  const surfaceDetailKind = surfaceDetailForCode(buffer.surfaceDetailCodes[index]);
  const materialEdgeKind = materialEdgeForCode(buffer.materialEdgeCodes[index]);
  const surfaceAnchorKind = surfaceAnchorForCode(buffer.surfaceAnchorCodes[index]);
  const wetness = metric(buffer, metricOffset, 'wetness');
  const growthTint = metric(buffer, metricOffset, 'growthTint');
  const region = terrainRegionForCode(buffer.regionCodes[index]);
  const phaseAmount = metric(buffer, metricOffset, 'phaseAmount');
  const trailAmount = metric(buffer, metricOffset, 'trailAmount');
  const sideDitchAmount = metric(buffer, metricOffset, 'sideDitchAmount');
  const topologyAmount = metric(buffer, metricOffset, 'topologyAmount');
  const topologyHeightDelta = metric(buffer, metricOffset, 'topologyHeightDelta');
  const topologyDeformation = optionalMetric(buffer, metricOffset, 'topologyDeformation', 0);
  const topologyVelocity = optionalMetric(buffer, metricOffset, 'topologyVelocity', 0);
  const topologyForce = optionalMetric(buffer, metricOffset, 'topologyForce', 0);
  const topologyGrossForce = optionalMetric(buffer, metricOffset, 'topologyGrossForce', Math.abs(topologyForce));
  const topologyOpposedForce = optionalMetric(buffer, metricOffset, 'topologyOpposedForce', 0);
  const topologyContention = optionalMetric(buffer, metricOffset, 'topologyContention', 0);
  const hillSwellMembership = optionalMetric(buffer, metricOffset, 'hillSwellMembership', 0);
  const hillSlumpMembership = optionalMetric(buffer, metricOffset, 'hillSlumpMembership', 0);
  const heightDelta = metric(buffer, metricOffset, 'heightDelta');
  const surfaceVelocityY = metric(buffer, metricOffset, 'surfaceVelocityY');
  const pressure = pressureFieldsFromBuffer(buffer, metricOffset);

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
      ridgeStrength: pressure.ridge,
      valleyStrength: pressure.valley,
      routePressure: metric(buffer, metricOffset, 'routePressure'),
      ditchPotential: metric(buffer, metricOffset, 'ditchPotential'),
      growthPotential: metric(buffer, metricOffset, 'growthPotential')
    },
    pressure,
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
      kind:
        phaseAmount > 0
          ? topologyAmount > Math.max(trailAmount, sideDitchAmount)
            ? 'valley_deepen'
            : trailAmount > sideDitchAmount
              ? 'trail_forming'
              : 'ditch_forming'
          : 'none',
      amount: phaseAmount,
      trailAmount,
      sideDitchAmount,
      topologyAmount,
      topologyHeightDelta,
      topologyDeformation,
      topologyVelocity,
      topologyForce,
      topologyGrossForce,
      topologyOpposedForce,
      topologyContention,
      semanticMemberships: {
        ...(hillSwellMembership > 0 ? { hill_swell: hillSwellMembership } : {}),
        ...(hillSlumpMembership > 0 ? { hill_slump: hillSlumpMembership } : {})
      }
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
    },
    surfaceDetail: {
      kind: surfaceDetailKind,
      density: metric(buffer, metricOffset, 'surfaceDetailDensity'),
      edgeMix: metric(buffer, metricOffset, 'surfaceDetailEdgeMix'),
      seed: detailSeedFor(buffer.source.configId ?? buffer.source.route, xi, zi, surfaceDetailKind)
    },
    materialEdge: {
      kind: materialEdgeKind,
      anchor: surfaceAnchorKind,
      strength: metric(buffer, metricOffset, 'materialEdgeStrength'),
      dissolve: metric(buffer, metricOffset, 'materialEdgeDissolve'),
      seed: detailSeedFor(buffer.source.configId ?? buffer.source.route, xi, zi, `${materialEdgeKind}:${surfaceAnchorKind}`)
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
    topologyPhaseSeed: Math.floor(finiteOr(params.topologyPhaseSeed, defaultHillOfHillsParams.topologyPhaseSeed)),
    topologyPhaseIntensity: clamp(finiteOr(params.topologyPhaseIntensity, 0), 0, 1),
    topologyPhaseLimit: Math.round(clamp(finiteOr(params.topologyPhaseLimit, 0), 0, 10)),
    topologyPhaseRadius: clamp(finiteAtLeast(params.topologyPhaseRadius, 0.35) * worldScale, 0.35 * worldScale, 3.5 * worldScale),
    topologyPhaseHeightScale: clamp(finiteOr(params.topologyPhaseHeightScale, 1), 0, 2),
    topologyPhaseBasinBias: clamp(finiteOr(params.topologyPhaseBasinBias, 1), 0, 2),
    topologyPhaseValleyBias: clamp(finiteOr(params.topologyPhaseValleyBias, 1), 0, 2),
    topologyPhaseHillBias: clamp(finiteOr(params.topologyPhaseHillBias, 1), 0, 2),
    topologyPhaseRidgeBias: clamp(finiteOr(params.topologyPhaseRidgeBias, 1), 0, 2),
    topologyPhaseSaddleBias: clamp(finiteOr(params.topologyPhaseSaddleBias, 1), 0, 2),
    topologyPhaseOverlap: clamp(finiteOr(params.topologyPhaseOverlap, 0.32), 0, 0.5),
    topologyPhaseDetailScale: clamp(finiteOr(params.topologyPhaseDetailScale, 1), 0, 2),
    topologyPhaseDriftIntensity: clamp(finiteOr(params.topologyPhaseDriftIntensity, 0), 0, 1),
    topologyPhaseTimeMs: Math.max(0, finiteOr(params.topologyPhaseTimeMs, 0)),
    topologyPhaseDurationMs: finiteAtLeast(params.topologyPhaseDurationMs, 240),
    topologyDynamicsMode:
      params.topologyPossibilityMode === 'phase_recomposed' ||
      params.topologyDynamicsMode === 'persistent_pressure'
        ? 'persistent_pressure'
        : 'direct_synthesis',
    topologyPossibilityMode:
      params.topologyPossibilityMode === 'reauthored' || params.topologyPossibilityMode === 'phase_recomposed'
        ? params.topologyPossibilityMode
        : 'inherited',
    topologyEventClasses: normalizeTopologyEventClasses(params.topologyEventClasses),
    gridResolutionX: Math.max(8, Math.round(finiteOr(params.gridResolutionX, 72))),
    gridResolutionZ: Math.max(8, Math.round(finiteOr(params.gridResolutionZ, 96))),
    crownZ: clamp(finiteOr(params.crownZ, defaultHillOfHillsParams.crownZ) * worldScale, -length * 0.5, length * 0.5)
  };
}

function normalizeTopologyEventClasses(input: unknown): HillOfHillsTopologyEventClassConfigMap {
  const source = isRecord(input) ? input : {};
  const normalized = {} as HillOfHillsTopologyEventClassConfigMap;

  for (const kind of HILL_OF_HILLS_TOPOLOGY_EVENT_KINDS) {
    const fallback = defaultHillOfHillsTopologyEventClasses[kind];
    const candidate = isRecord(source[kind]) ? source[kind] : {};
    const gesture = candidate.gesture;
    normalized[kind] = {
      enabled: typeof candidate.enabled === 'boolean' ? candidate.enabled : fallback.enabled,
      appetite: clamp(finiteOrValue(candidate.appetite, fallback.appetite), 0, 2),
      force: clamp(finiteOrValue(candidate.force, fallback.force), 0, 2),
      gesture: isTopologyGesturePreset(gesture) ? gesture : fallback.gesture,
      phaseOffset: clamp(finiteOrValue(candidate.phaseOffset, fallback.phaseOffset), 0, 1),
      spread: clamp(finiteOrValue(candidate.spread, fallback.spread), 0.25, 2)
    };
  }

  return normalized;
}

function topologyEventClassConfig(params: HillOfHillsTerrainParams, kind: HillOfHillsTopologyPhaseKind): HillOfHillsTopologyEventClassConfig {
  return params.topologyEventClasses[kind] ?? defaultHillOfHillsTopologyEventClasses[kind];
}

function isTopologyGesturePreset(value: unknown): value is HillOfHillsTopologyGesturePreset {
  return typeof value === 'string' && (HILL_OF_HILLS_TOPOLOGY_GESTURE_PRESETS as readonly string[]).includes(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function finiteOrValue(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
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

function createPhaseState(
  params: HillOfHillsTerrainParams,
  previousPersistentField?: PersistentTopologyField,
  producerTrafficField = emptyProducerTrafficFieldFor(params)
): HillOfHillsPhaseState {
  if (params.topologyDynamicsMode !== 'persistent_pressure') {
    return {
      ...createProceduralPhaseState(params),
      producerTrafficField
    };
  }

  const persistentTopologyField = createPersistentTopologyField(
    params,
    previousPersistentField,
    producerTrafficField
  );
  const proceduralState = createProceduralPhaseState(params, persistentTopologyField);

  return {
    ...proceduralState,
    topologyDynamicsMode: 'persistent_pressure',
    persistentTopologyField,
    producerTrafficField
  };
}

function createProceduralPhaseState(
  params: HillOfHillsTerrainParams,
  persistentTopologyField?: PersistentTopologyField
): HillOfHillsPhaseState {
  const episodes: HillOfHillsPhaseEpisode[] = [];
  const ditchTiming = phaseTiming(params.ditchPhaseTimeMs, params.ditchPhaseDurationMs);
  const trailTiming = phaseTiming(params.trailPhaseTimeMs, params.trailPhaseDurationMs);
  const topologyTiming = phaseTiming(params.topologyPhaseTimeMs, params.topologyPhaseDurationMs);
  const topologyWindows = topologyPhaseWindows(topologyTiming, params.topologyPhaseOverlap);
  const ditchIntensity = clamp(params.ditchPhaseIntensity * ditchTiming.progress, 0, 1);
  const trailIntensity = clamp(params.trailPhaseIntensity * trailTiming.progress, 0, 1);
  const topologyProgress = topologyWindows.reduce((maxProgress, window) => Math.max(maxProgress, window.amount), 0);
  const topologyIntensity = clamp(params.topologyPhaseIntensity * topologyProgress, 0, 1);
  const terrainEpoch = Math.max(ditchTiming.epoch, trailTiming.epoch, topologyTiming.epoch);
  let trailSeedMethod: HillOfHillsTrailSeedMethod = 'none';
  let trailCandidateSummary = emptyTrailCandidateSummary();
  let selectedTrailScoreRange = zeroRange();
  let topologyCandidateSummary = emptyTopologyCandidateSummary();
  let selectedTopologyEventScoreRange = zeroRange();

  if (ditchIntensity > 0 && params.ditchPhaseLimit > 0) {
    const rng = mulberry32(params.ditchPhaseSeed + ditchTiming.epoch * 131071 + params.seed * 17);
    const ditchCandidateSummary = scoreDitchCandidates(params);
    const selectedCandidates = selectDitchCandidates(params, ditchCandidateSummary.candidates, params.ditchPhaseLimit, rng);
    for (let i = 0; i < selectedCandidates.length; i += 1) {
      const candidate = selectedCandidates[i];
      const angle = (rng() - 0.5) * 0.44;
      const direction = normalize([
        candidate.direction[0] * Math.cos(angle) + candidate.direction[2] * Math.sin(angle),
        0,
        candidate.direction[2] * Math.cos(angle) - candidate.direction[0] * Math.sin(angle)
      ]);
      const radius = params.ditchPhaseRadius * (0.72 + rng() * 0.46);
      const localProgress = clamp(ditchTiming.progress * (0.82 + rng() * 0.2), 0, 1);
      const localIntensity = ditchIntensity * (0.72 + rng() * 0.3);
      episodes.push({
        id: `ditch-${ditchTiming.epoch}-${i}-${roundId(candidate.x)}-${roundId(candidate.z)}`,
        kind: 'ditch_forming',
        center: [candidate.x, 0, candidate.z],
        radius,
        progress: localProgress,
        intensity: localIntensity,
        direction,
        trailWidth: radius * 0.38,
        sideDitchOffset: radius * 0.42,
        heightScale: 1,
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
        heightScale: 1,
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

  if (params.topologyPhaseIntensity > 0 && params.topologyPhaseLimit > 0) {
    if (!persistentTopologyField) {
      topologyCandidateSummary = scoreTopologyMotionCandidates(params, undefined, topologyTiming.epoch + 0.5);
    }
    const selectedForScoreRange: TopologyMotionCandidate[] = [];
    const topologyEpisodeById = new Map<string, HillOfHillsPhaseEpisode>();

    for (const window of topologyWindows) {
      if (window.amount <= 0.001) continue;
      const persistentSelection = persistentTopologyField?.topologySelections.find(
        (selection) => selection.epoch === window.epoch
      );
      let selectedCandidates: readonly TopologyMotionCandidate[];
      if (persistentSelection) {
        selectedCandidates = persistentSelection.candidates;
        if (window.epoch === topologyTiming.epoch) {
          topologyCandidateSummary = {
            candidates: persistentSelection.candidates,
            checksum: persistentSelection.candidateChecksum,
            scoreRange: persistentSelection.candidateScoreRange,
            possibilityChecksum: persistentSelection.possibilityChecksum,
            possibilityRange: persistentSelection.possibilityRange
          };
        }
      } else {
        const candidateSummary = scoreTopologyMotionCandidates(
          params,
          persistentTopologyField,
          topologySelectionPhaseCursor(window)
        );
        const rng = mulberry32(topologyMotionSelectionSeed(params, window.epoch));
        selectedCandidates = selectTopologyMotionCandidates(
          params,
          candidateSummary.candidates,
          params.topologyPhaseLimit,
          rng,
          topologySelectionPhaseCursor(window)
        );
        topologyCandidateSummary = candidateSummary;
      }
      selectedForScoreRange.push(...selectedCandidates);

      for (let i = 0; i < selectedCandidates.length; i += 1) {
        const candidate = selectedCandidates[i];
        const eventConfig = topologyEventClassConfig(params, candidate.topologyKind);
        if (!eventConfig.enabled || eventConfig.appetite <= 0 || eventConfig.force <= 0) continue;
        const gestureState = topologyGestureState(eventConfig.gesture, topologyGestureClock(window, eventConfig.phaseOffset));
        const supportedGestureState = topologySupportGestureState(gestureState, window);
        const id = `topology-${candidate.topologyKind}-${roundId(candidate.x)}-${roundId(candidate.z)}`;
        const supportRng = mulberry32(detailSeedFor(params.topologyPhaseSeed, candidate.x, candidate.z, candidate.topologyKind));
        const angle = (supportRng() - 0.5) * 0.5;
        const direction = normalize([
          candidate.direction[0] * Math.cos(angle) + candidate.direction[2] * Math.sin(angle),
          0,
          candidate.direction[2] * Math.cos(angle) - candidate.direction[0] * Math.sin(angle)
        ]);
        const radius = params.topologyPhaseRadius * eventConfig.spread * (0.78 + supportRng() * 0.52);
        const trailWidth = Math.max(0.16, radius * (0.22 + supportRng() * 0.1));
        const sideDitchOffset = radius * (0.4 + supportRng() * 0.14);
        const localProgress = clamp(supportedGestureState.amount * (0.82 + supportRng() * 0.22), 0, 1);
        const localIntensity = clamp(params.topologyPhaseIntensity * supportedGestureState.amount * eventConfig.force * (0.68 + supportRng() * 0.28), 0, 1);
        const envelope = topologyEventEnvelope(
          supportedGestureState,
          params,
          radius,
          localProgress,
          localIntensity,
          candidate.falloff,
          eventConfig
        );
        const episode: HillOfHillsPhaseEpisode = {
          id,
          kind: candidate.topologyKind,
          center: [candidate.x, 0, candidate.z],
          radius,
          progress: localProgress,
          intensity: localIntensity,
          direction,
          trailWidth,
          sideDitchOffset,
          heightScale: params.topologyPhaseHeightScale,
          seedMethod: 'topology_score',
          seedScore: candidate.score,
          seedRoutePressure: candidate.routePressure,
          seedValleyStrength: candidate.valleyStrength,
          seedFlowAccumulation: candidate.flowAccumulation,
          seedDitchPotential: candidate.ditchPotential,
          seedSlope: candidate.slope,
          topologyEvent: {
            id,
            kind: candidate.topologyKind,
            supportEpoch: window.epoch,
            supportLifecycle: window.lifecycle,
            supportClock: window.clock,
            supportAmount: window.amount,
            reason: candidate.reason,
            semanticReason: candidate.semanticReason,
            center: [candidate.x, 0, candidate.z],
            direction,
            eligibility: candidate.eligibility,
            envelope,
            materialHint: candidate.materialHint,
            assetHint: candidate.assetHint
          }
        };
        const existing = topologyEpisodeById.get(id);
        topologyEpisodeById.set(id, existing ? mergeTopologyPhaseEpisodes(existing, episode) : episode);
      }
    }

    episodes.push(...topologyEpisodeById.values());
    selectedTopologyEventScoreRange = scoreRangeForCandidates(selectedForScoreRange);
  }

  const mode = phaseModeFor(episodes);
  const phaseClock =
    episodes.length === 0
      ? 0
      : Math.max(ditchIntensity > 0 ? ditchTiming.clock : 0, trailIntensity > 0 ? trailTiming.clock : 0, topologyIntensity > 0 ? topologyTiming.clock : 0);
  const phaseProgress =
    episodes.length === 0
      ? 0
      : Math.max(
          ditchIntensity > 0 ? ditchTiming.progress : 0,
          trailIntensity > 0 ? trailTiming.progress : 0,
          topologyIntensity > 0 ? topologyTiming.progress : 0
        );
  const ditchPhaseClock = ditchIntensity > 0 ? ditchTiming.clock : 0;
  const ditchPhaseProgress = ditchIntensity > 0 ? ditchTiming.progress : 0;
  const trailPhaseClock = trailIntensity > 0 ? trailTiming.clock : 0;
  const trailPhaseProgress = trailIntensity > 0 ? trailTiming.progress : 0;
  const topologyPhaseClock = topologyIntensity > 0 ? topologyTiming.clock : 0;
  const topologyPhaseProgress = topologyIntensity > 0 ? topologyProgress : 0;

  if (episodes.length === 0) {
    const checksumInput = [
      'stable',
      terrainEpoch,
      params.ditchPhaseSeed,
      params.ditchPhaseIntensity.toFixed(3),
      params.trailPhaseSeed,
      params.trailPhaseIntensity.toFixed(3),
      params.topologyPhaseSeed,
      params.topologyPhaseIntensity.toFixed(3),
      params.topologyPossibilityMode
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
      topologyPhaseClock,
      topologyPhaseProgress,
      trailSeedMethod,
      trailCandidateChecksum: trailCandidateSummary.checksum,
      trailCandidateScoreRange: trailCandidateSummary.scoreRange,
      selectedTrailScoreRange,
      topologyEventCandidateChecksum: topologyCandidateSummary.checksum,
      topologyEventCandidateScoreRange: topologyCandidateSummary.scoreRange,
      selectedTopologyEventScoreRange,
      topologyDynamicsMode: 'direct_synthesis',
      topologyPossibilityMode: params.topologyPossibilityMode,
      topologyPossibilityChecksum: topologyCandidateSummary.possibilityChecksum,
      topologyPossibilityRange: topologyCandidateSummary.possibilityRange
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
    topologyPhaseClock,
    topologyPhaseProgress,
    trailSeedMethod,
    trailCandidateChecksum: trailCandidateSummary.checksum,
    trailCandidateScoreRange: trailCandidateSummary.scoreRange,
    selectedTrailScoreRange,
    topologyEventCandidateChecksum: topologyCandidateSummary.checksum,
    topologyEventCandidateScoreRange: topologyCandidateSummary.scoreRange,
    selectedTopologyEventScoreRange,
    topologyDynamicsMode: 'direct_synthesis',
    topologyPossibilityMode: params.topologyPossibilityMode,
    topologyPossibilityChecksum: topologyCandidateSummary.possibilityChecksum,
    topologyPossibilityRange: topologyCandidateSummary.possibilityRange
  };
}

function phaseTiming(timeMs: number, durationMs: number): { epoch: number; clock: number; progress: number } {
  const duration = Math.max(1, durationMs);
  const epoch = Math.floor(timeMs / duration);
  const clock = (timeMs % duration) / duration;
  const progress = smoothstep(0.04, 0.46, clock) * (1 - smoothstep(0.9, 1, clock));
  return { epoch, clock, progress };
}

interface TopologyPhaseWindow {
  epoch: number;
  clock: number;
  progress: number;
  amount: number;
  lifecycle: HillOfHillsTopologySupportLifecycle;
}

interface TopologyGestureState {
  clock: number;
  phaseIn: number;
  hold: number;
  phaseOut: number;
  amount: number;
}

function topologyPhaseWindows(timing: { epoch: number; clock: number }, overlap: number): TopologyPhaseWindow[] {
  const windows: TopologyPhaseWindow[] = [];
  const clock = clamp(timing.clock, 0, 1);
  const currentProgress = topologyPhaseProgressAtClock(clock);
  if (currentProgress > 0.001) {
    windows.push({
      epoch: timing.epoch,
      clock,
      progress: currentProgress,
      amount: currentProgress,
      lifecycle: currentProgress < 0.999 ? 'entering' : 'active'
    });
  }

  const overlapWidth = clamp(overlap, 0, 0.5);
  if (timing.epoch > 0 && overlapWidth > 0 && clock < overlapWidth) {
    const previousClock = clamp(1 - clock, 0, 1);
    const fade = 1 - smoothstep(0, overlapWidth, clock);
    const previousProgress = topologyPhaseProgressAtClock(previousClock);
    const amount = clamp(previousProgress * fade, 0, 1);
    if (amount > 0.001) {
      windows.push({
        epoch: timing.epoch - 1,
        clock: previousClock,
        progress: previousProgress,
        amount,
        lifecycle: 'tailing'
      });
    }
  }
  return windows;
}

function topologyPhaseProgressAtClock(clock: number): number {
  return smoothstep(0.04, 0.46, clamp(clock, 0, 1));
}

function topologySelectionPhaseCursor(window: TopologyPhaseWindow): number {
  return window.epoch + 0.5;
}

function topologyGestureClock(window: TopologyPhaseWindow, phaseOffset: number): number {
  return clamp(window.clock + phaseOffset, 0, 1);
}

function topologyGestureState(gesture: HillOfHillsTopologyGesturePreset, clock: number): TopologyGestureState {
  const c = clamp(clock, 0, 1);
  switch (gesture) {
    case 'flicker':
      return gestureEnvelope(c, 0.02, 0.1, 0.12, 0.24);
    case 'pulse':
      return gestureEnvelope(c, 0.04, 0.22, 0.34, 0.62);
    case 'breath':
      return gestureEnvelope(c, 0.02, 0.38, 0.62, 0.96);
    case 'surge':
      return gestureEnvelope(c, 0.02, 0.18, 0.82, 0.96);
    case 'creep':
      return gestureEnvelope(c, 0.04, 0.68, 0.82, 1);
    case 'aftershock': {
      const primary = gestureEnvelope(c, 0.02, 0.18, 0.28, 0.48);
      const echo = gestureEnvelope(c, 0.5, 0.62, 0.74, 0.92);
      const amount = clamp(Math.max(primary.amount, echo.amount * 0.64), 0, 1);
      return {
        clock: c,
        phaseIn: Math.max(primary.phaseIn, echo.phaseIn * 0.64),
        hold: Math.max(primary.hold, echo.hold * 0.64),
        phaseOut: primary.amount >= echo.amount * 0.64 ? primary.phaseOut : echo.phaseOut,
        amount
      };
    }
    case 'tide':
      return gestureEnvelope(c, 0, 0.46, 0.54, 1);
    case 'rupture':
      return gestureEnvelope(c, 0.01, 0.08, 0.18, 0.7);
  }
}

function topologySupportGestureState(gestureState: TopologyGestureState, window: TopologyPhaseWindow): TopologyGestureState {
  const supportAmount = clamp(window.amount, 0, 1);
  const phaseOut = window.lifecycle === 'tailing' ? clamp(Math.max(gestureState.phaseOut, 1 - supportAmount), 0, 1) : gestureState.phaseOut;
  return {
    clock: gestureState.clock,
    phaseIn: clamp(gestureState.phaseIn * supportAmount, 0, 1),
    hold: clamp(gestureState.hold * supportAmount, 0, 1),
    phaseOut,
    amount: clamp(gestureState.amount * supportAmount, 0, 1)
  };
}

function gestureEnvelope(clock: number, attackEnd: number, holdStart: number, holdEnd: number, releaseEnd: number): TopologyGestureState {
  const c = clamp(clock, 0, 1);
  const phaseIn = smoothstep(0, Math.max(0.001, attackEnd), c);
  const hold = smoothstep(holdStart, holdEnd, c) * (1 - smoothstep(holdEnd, releaseEnd, c));
  const phaseOut = smoothstep(holdEnd, releaseEnd, c);
  const amount = clamp(phaseIn * (1 - phaseOut), 0, 1);
  return {
    clock: c,
    phaseIn,
    hold,
    phaseOut,
    amount
  };
}

function phaseModeFor(episodes: readonly HillOfHillsPhaseEpisode[]): HillOfHillsPhaseMode {
  const hasDitch = episodes.some((episode) => episode.kind === 'ditch_forming');
  const hasTrail = episodes.some((episode) => episode.kind === 'trail_forming');
  const hasTopology = episodes.some((episode) => episode.kind !== 'ditch_forming' && episode.kind !== 'trail_forming');
  if ([hasDitch, hasTrail, hasTopology].filter(Boolean).length > 1) return 'mixed_forming';
  if (hasTopology) return 'topology_morphing';
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
          regionBias,
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

function scoreDitchCandidates(params: HillOfHillsTerrainParams): TrailCandidateSummary {
  const phaseState = stablePhaseStateForTopologyScoring();
  const phaseInfluence = emptyPhaseInfluence();
  const candidates: TrailSeedCandidate[] = [];
  const scoreRange = createRange();
  const xCount = 21;
  const zCount = 31;
  const xExtent = Math.min(params.width * 0.46, params.channelRadius * 0.98);
  const zExtent = params.length * 0.44;

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
      const activeInterior = 1 - smoothstep(params.channelRadius * 0.78, params.channelRadius * 1.05, Math.abs(x));
      const basinRegion = region === 'basin' ? 0.16 : region === 'slope' ? 0.08 : region === 'rim' ? -0.24 : 0;
      const routePenalty = smoothstep(0.46, 0.9, topology.routePressure) * 0.18;
      const score = clamp(
        topology.ditchPotential * 0.42 +
          topology.valleyStrength * 0.34 +
          topology.flowAccumulation * 0.22 +
          (1 - smoothstep(0.55, 1.7, slope)) * 0.08 +
          activeInterior * 0.08 +
          basinRegion -
          routePenalty,
        0,
        1
      );
      const direction = normalize([
        topology.flowDirection[0] * 0.74 - dx * 0.2,
        0,
        topology.flowDirection[2] * 0.74 - dz * 0.2
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

function selectDitchCandidates(
  params: HillOfHillsTerrainParams,
  candidates: readonly TrailSeedCandidate[],
  limit: number,
  rng: () => number
): TrailSeedCandidate[] {
  const minimumSeparation = Math.max(params.ditchPhaseRadius * 1.18, params.floorWidth * 0.42);
  const selected: TrailSeedCandidate[] = [];
  const ranked = candidates
    .filter((candidate) => candidate.ditchPotential > 0.42 && candidate.valleyStrength > 0.22)
    .map((candidate) => ({
      candidate,
      rankScore: candidate.score + (rng() - 0.5) * 0.024
    }))
    .sort((a, b) => b.rankScore - a.rankScore);

  for (const rankedCandidate of ranked) {
    const candidate = rankedCandidate.candidate;
    if (candidate.score < 0.28) continue;
    const tooClose = selected.some((selectedCandidate) => Math.hypot(candidate.x - selectedCandidate.x, candidate.z - selectedCandidate.z) < minimumSeparation);
    if (tooClose) continue;
    selected.push(candidate);
    if (selected.length >= limit) break;
  }

  return selected;
}

function topologyCandidateHeightAt(
  params: HillOfHillsTerrainParams,
  phaseState: HillOfHillsPhaseState,
  persistentTopologyField: PersistentTopologyField | undefined,
  x: number,
  z: number
): HeightParts {
  const heightParts = heightAt(params, phaseState, x, z);
  if (params.topologyPossibilityMode !== 'phase_recomposed' || !persistentTopologyField) {
    return heightParts;
  }

  const dynamics = persistentTopologySampleAt(persistentTopologyField, params, x, z);
  const heightScale = 0.8 + params.hillHeight * 0.22 + params.valleyHeight * 0.18;
  return {
    ...heightParts,
    height: heightParts.height + dynamics.deformation / Math.max(0.001, heightScale)
  };
}

function scoreTopologyMotionCandidates(
  params: HillOfHillsTerrainParams,
  persistentTopologyField?: PersistentTopologyField,
  phaseCursor = topologyPhaseCursor(params)
): TopologyMotionCandidateSummary {
  const phaseState = stablePhaseStateForTopologyScoring();
  const phaseInfluence = emptyPhaseInfluence();
  const candidates: TopologyMotionCandidate[] = [];
  const scoreRange = createRange();
  const possibilityRange = createRange();
  const possibilitySignatures: string[] = [];
  const xCount = 21;
  const zCount = 31;
  const xExtent = Math.min(params.width * 0.46, params.channelRadius * 0.96);
  const zExtent = params.length * 0.44;

  for (let zi = 0; zi < zCount; zi += 1) {
    const zT = zi / (zCount - 1);
    const z = -zExtent + zT * zExtent * 2;
    for (let xi = 0; xi < xCount; xi += 1) {
      const xT = xi / (xCount - 1);
      const x = -xExtent + xT * xExtent * 2;
      const heightParts = topologyCandidateHeightAt(params, phaseState, persistentTopologyField, x, z);
      const epsX = Math.max(0.02, params.width / (params.gridResolutionX * 2));
      const epsZ = Math.max(0.02, params.length / (params.gridResolutionZ * 2));
      const heightLeft = topologyCandidateHeightAt(params, phaseState, persistentTopologyField, x - epsX, z).height;
      const heightRight = topologyCandidateHeightAt(params, phaseState, persistentTopologyField, x + epsX, z).height;
      const heightBack = topologyCandidateHeightAt(params, phaseState, persistentTopologyField, x, z - epsZ).height;
      const heightForward = topologyCandidateHeightAt(params, phaseState, persistentTopologyField, x, z + epsZ).height;
      const dx = (heightRight - heightLeft) / (epsX * 2);
      const dz = (heightForward - heightBack) / (epsZ * 2);
      const slope = Math.hypot(dx, dz);
      const region = classifyRegion(params, x, z, heightParts, slope);
      const topology = topologyAt(params, x, z, heightParts, dx, dz, slope, region, phaseInfluence);
      const traversable = 1 - smoothstep(0.72, 2.05, slope);
      const activeInterior = 1 - smoothstep(params.channelRadius * 0.72, params.channelRadius * 1.02, Math.abs(x));
      const basin = clamp(topology.valleyStrength * 0.66 + topology.flowAccumulation * 0.22 + traversable * 0.12, 0, 1);
      const saddle = clamp(
        Math.min(topology.ridgeStrength + 0.12, topology.valleyStrength + 0.12) * 0.48 +
          (1 - Math.abs(topology.ridgeStrength - topology.valleyStrength)) * 0.26 +
          topology.routePressure * 0.2,
        0,
        1
      );
      const strata = clamp(slope * 0.34 + topology.ridgeStrength * 0.3 + (1 - topology.growthPotential) * 0.18 + activeInterior * 0.08, 0, 1);
      const hill = clamp(topology.growthPotential * 0.44 + topology.ridgeStrength * 0.36 + activeInterior * 0.16, 0, 1);
      const eligibilityBase: Omit<HillOfHillsTopologyEventEligibility, 'score'> = {
        possibility: 0,
        hill,
        valley: topology.valleyStrength,
        ridge: topology.ridgeStrength,
        saddle,
        basin,
        route: topology.routePressure,
        flow: topology.flowAccumulation,
        growth: topology.growthPotential,
        strata,
        slope: clamp(slope / 2.2, 0, 1)
      };
      const eventOptions: {
        kind: HillOfHillsTopologyPhaseKind;
        score: number;
        reason: HillOfHillsTopologyEventReasonKind;
        semanticReason: string;
        materialHint: HillOfHillsTopologyEventMaterialHintKind;
        assetHint: HillOfHillsTopologyEventAssetHintKind;
        falloff: HillOfHillsTopologyEventFalloffKind;
      }[] = [];
      const valleyDeepenScore = clamp(
        (topology.valleyStrength * 0.36 + topology.flowAccumulation * 0.24 + topology.ditchPotential * 0.16 + traversable * 0.1) *
          params.topologyPhaseValleyBias,
        0,
        1
      );
      const hillSwellScore = clamp(
        (topology.ridgeStrength * 0.34 + topology.growthPotential * 0.28 + smoothstep(0.16, 0.9, slope) * 0.12 + activeInterior * 0.08) *
          params.topologyPhaseHillBias,
        0,
        1
      );
      const saddlePinchScore = clamp(
        (
        Math.min(topology.ridgeStrength + 0.12, topology.valleyStrength + 0.12) * 0.3 +
          topology.routePressure * 0.2 +
          (1 - Math.abs(topology.ridgeStrength - topology.valleyStrength)) * 0.16 +
          smoothstep(0.18, 0.82, slope) * 0.12
        ) * params.topologyPhaseSaddleBias,
        0,
        1
      );
      eventOptions.push(
        {
          kind: 'valley_deepen',
          score: valleyDeepenScore,
          reason: 'flow_cut_valley',
          semanticReason: 'flow and valley evidence favor a local cut',
          materialHint: 'damp',
          assetHint: 'wet_rim',
          falloff: 'elongated_band'
        },
        {
          kind: 'valley_fill',
          score: clamp(
            (topology.valleyStrength * 0.32 + traversable * 0.22 + (1 - topology.flowAccumulation) * 0.14 + topology.growthPotential * 0.1) *
              params.topologyPhaseValleyBias,
            0,
            1
          ),
          reason: 'sediment_fill_valley',
          semanticReason: 'shallow valley with weaker flow favors sediment fill',
          materialHint: 'meadow',
          assetHint: 'dry_silt',
          falloff: 'smooth_radial'
        },
        {
          kind: 'hill_swell',
          score: clamp(hillSwellScore + topology.growthPotential * 0.06 - smoothstep(0.58, 1.45, slope) * 0.06, 0, 1),
          reason: 'crown_growth_pressure',
          semanticReason: 'ridge and growth pressure favor hill swelling',
          materialHint: 'growth',
          assetHint: 'brush_cluster',
          falloff: 'smooth_radial'
        },
        {
          kind: 'hill_slump',
          score: clamp(
            (topology.ridgeStrength * 0.2 +
              smoothstep(0.42, 1.5, slope) * 0.42 +
              topology.valleyStrength * 0.14 +
              (1 - topology.growthPotential) * 0.1) *
              params.topologyPhaseHillBias,
            0,
            1
          ),
          reason: 'steep_crown_slump',
          semanticReason: 'steep raised ground favors a downhill slump',
          materialHint: 'dust',
          assetHint: 'fallen_scrub',
          falloff: 'elongated_band'
        },
        {
          kind: 'ridge_lift',
          score: clamp(
            (topology.ridgeStrength * 0.42 + hill * 0.2 + activeInterior * 0.14 + (1 - smoothstep(0.34, 1.1, slope)) * 0.16) *
              params.topologyPhaseRidgeBias,
            0,
            1
          ),
          reason: 'ridge_lift_pressure',
          semanticReason: 'ridge strength favors local lifting',
          materialHint: 'stone',
          assetHint: 'rock_rib',
          falloff: 'elongated_band'
        },
        {
          kind: 'ridge_shear',
          score: clamp((topology.ridgeStrength * 0.2 + strata * 0.18 + smoothstep(0.5, 1.65, slope) * 0.28) * params.topologyPhaseRidgeBias, 0, 1),
          reason: 'ridge_shear_exposure',
          semanticReason: 'steep ridge exposure favors a shear scar',
          materialHint: 'stone',
          assetHint: 'shear_scree',
          falloff: 'shear_band'
        },
        {
          kind: 'saddle_pinch',
          score: clamp(saddlePinchScore + (1 - topology.routePressure) * 0.12 + smoothstep(0.4, 1.25, slope) * 0.08, 0, 1),
          reason: 'saddle_compression',
          semanticReason: 'ridge-valley balance favors saddle pinching',
          materialHint: 'stone',
          assetHint: 'rock_rib',
          falloff: 'pass_band'
        },
        {
          kind: 'saddle_pass',
          score: clamp((saddle * 0.3 + topology.routePressure * 0.34 + traversable * 0.12) * params.topologyPhaseSaddleBias, 0, 1),
          reason: 'route_pass_opening',
          semanticReason: 'route pressure through a saddle favors pass opening',
          materialHint: 'route',
          assetHint: 'pass_mark',
          falloff: 'pass_band'
        },
        {
          kind: 'basin_bloom',
          score: clamp(
            (basin * 0.22 + topology.growthPotential * 0.48 + traversable * 0.1 + (1 - smoothstep(0.38, 0.95, slope)) * 0.14) *
              params.topologyPhaseBasinBias,
            0,
            1
          ),
          reason: 'basin_growth_bloom',
          semanticReason: 'basin shelter and growth potential favor a bloom',
          materialHint: 'growth',
          assetHint: 'meadow_bloom',
          falloff: 'smooth_radial'
        },
        {
          kind: 'strata_reveal',
          score: clamp((strata * 0.44 + topology.ridgeStrength * 0.1 + (1 - topology.growthPotential) * 0.28) * params.topologyPhaseRidgeBias, 0, 1),
          reason: 'eroded_strata_exposure',
          semanticReason: 'slope and low growth reveal exposed strata',
          materialHint: 'exposed_strata',
          assetHint: 'strata_chip',
          falloff: 'shear_band'
        }
      );
      const possibilityPressure = topologyDriftPressureAt(params, x, z, phaseCursor);
      const phasePointPressure =
        params.topologyPossibilityMode === 'phase_recomposed' && persistentTopologyField
          ? topologyPhasePointPressureAt(persistentTopologyField, params, x, z)
          : undefined;
      const configuredEventOptions = eventOptions.map((option) => {
        const eventConfig = topologyEventClassConfig(params, option.kind);
        const analyticPossibility =
          params.topologyPossibilityMode === 'inherited'
            ? 0
            : topologyDriftAffinityFor(option.kind, possibilityPressure);
        const possibility = phasePointPressure
          ? topologyPhasePointAffinityFor(option.kind, analyticPossibility, phasePointPressure)
          : analyticPossibility;
        const proposalScore = possibility <= 0.0001 ? 0 : clamp(0.14 + possibility * 1.08, 0, 1);
        const reauthoringStrength =
          params.topologyPossibilityMode === 'inherited' ? 0 : params.topologyPhaseDriftIntensity;
        const authoredScore = option.score * (1 - reauthoringStrength) + proposalScore * reauthoringStrength;
        return {
          ...option,
          possibility,
          score: eventConfig.enabled
            ? clamp(authoredScore * eventConfig.appetite, 0, 1)
            : 0
        };
      });
      if (params.topologyPossibilityMode !== 'inherited') {
        const purePossibility = configuredEventOptions.reduce(
          (maximum, option) => Math.max(maximum, option.possibility),
          0
        );
        includeInRange(possibilityRange, purePossibility);
        possibilitySignatures.push(
          [
            roundId(x),
            roundId(z),
            ...configuredEventOptions.map((option) => `${option.kind}:${option.possibility.toFixed(3)}`)
          ].join(':')
        );
      }
      let selected = configuredEventOptions[0];
      for (const option of configuredEventOptions) {
        if (option.score > selected.score) selected = option;
      }
      const explorationWeight =
        selected.kind === 'hill_swell' && persistentTopologyField
          ? persistentHillExplorationWeightAt(persistentTopologyField, params, x, z)
          : 1;
      const score = clamp(selected.score * (0.76 + activeInterior * 0.24) * explorationWeight, 0, 1);
      const direction = normalize([
        topology.flowDirection[0] * 0.42 - dx * 0.18,
        0,
        0.7 + topology.flowDirection[2] * 0.38 - dz * 0.14
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
        region,
        topologyKind: selected.kind,
        ridgeStrength: topology.ridgeStrength,
        growthPotential: topology.growthPotential,
        eligibility: {
          ...eligibilityBase,
          possibility: selected.possibility,
          hill: clamp(eligibilityBase.hill * explorationWeight, 0, 1),
          score
        },
        reason: selected.reason,
        semanticReason: selected.semanticReason,
        materialHint: selected.materialHint,
        assetHint: selected.assetHint,
        falloff: selected.falloff
      });
    }
  }

  return {
    candidates,
    checksum: checksum(candidates.map((candidate) => topologyMotionCandidateSignature(candidate)).join('|')),
    scoreRange: settledRange(scoreRange),
    possibilityChecksum:
      params.topologyPossibilityMode !== 'inherited'
        ? checksum(
            params.topologyPossibilityMode === 'phase_recomposed'
              ? `phase_recomposed|${possibilitySignatures.join('|')}`
              : possibilitySignatures.join('|')
          )
        : 'inherited',
    possibilityRange: settledRange(possibilityRange)
  };
}

function selectTopologyMotionCandidates(
  params: HillOfHillsTerrainParams,
  candidates: readonly TopologyMotionCandidate[],
  limit: number,
  rng: () => number,
  phaseCursor = topologyPhaseCursor(params)
): TopologyMotionCandidate[] {
  const minimumSeparation = Math.max(params.topologyPhaseRadius * 1.08, params.floorWidth * 0.36);
  const selected: TopologyMotionCandidate[] = [];
  const ranked = candidates
    .map((candidate) => {
      const driftPressure = topologyDriftPressureAt(params, candidate.x, candidate.z, phaseCursor);
      const driftAffinity = topologyDriftAffinityFor(candidate.topologyKind, driftPressure);
      const driftBoost = driftAffinity * params.topologyPhaseDriftIntensity * params.topologyPhaseIntensity;
      return {
        candidate,
        rankScore: candidate.score * (1 + driftBoost * 0.22) + driftBoost * 0.16 + (rng() - 0.5) * 0.03
      };
    })
    .sort((a, b) => b.rankScore - a.rankScore);

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

function topologyMotionSelectionSeed(params: HillOfHillsTerrainParams, epoch: number): number {
  const inheritedTerrainSeed = params.topologyPossibilityMode === 'inherited' ? params.seed * 31 : 0;
  return params.topologyPhaseSeed + epoch * 104729 + inheritedTerrainSeed;
}

interface TopologyDriftPressure {
  basin: number;
  bloom: number;
  damp: number;
  exposure: number;
  ridge: number;
  strata: number;
  appetite: number;
}

function topologyPhaseCursor(params: Pick<HillOfHillsTerrainParams, 'topologyPhaseTimeMs' | 'topologyPhaseDurationMs'>): number {
  return finiteOr(params.topologyPhaseTimeMs, 0) / Math.max(1, finiteOr(params.topologyPhaseDurationMs, 1));
}

function topologyDriftPressureAt(
  params: Pick<
    HillOfHillsTerrainParams,
    | 'seed'
    | 'width'
    | 'length'
    | 'channelRadius'
    | 'topologyPhaseSeed'
    | 'topologyPhaseIntensity'
    | 'topologyPhaseDriftIntensity'
    | 'topologyPhaseTimeMs'
    | 'topologyPhaseDurationMs'
    | 'topologyPossibilityMode'
  >,
  x: number,
  z: number,
  phaseCursor = topologyPhaseCursor(params)
): TopologyDriftPressure {
  const intensity = clamp(params.topologyPhaseIntensity * params.topologyPhaseDriftIntensity, 0, 1);
  if (intensity <= 0.0001) {
    return {
      basin: 0,
      bloom: 0,
      damp: 0,
      exposure: 0,
      ridge: 0,
      strata: 0,
      appetite: 0
    };
  }

  const tau = Math.PI * 2;
  const seedPhase =
    params.topologyPossibilityMode === 'inherited'
      ? params.seed * 0.0137 + params.topologyPhaseSeed * 0.0029
      : params.topologyPhaseSeed * 0.0173;
  const phase = phaseCursor * tau;
  const nx = x / Math.max(0.001, params.width * 0.46);
  const nz = z / Math.max(0.001, params.length * 0.46);

  const lobe = (slot: number, speed: number, spreadX: number, spreadZ: number, xReach: number, zReach: number): number => {
    const p = phase * speed + seedPhase * (slot * 0.37 + 0.61);
    const cx = Math.sin(p + slot * 1.91) * xReach + Math.sin(p * 0.41 + seedPhase * 1.7) * xReach * 0.32;
    const cz = Math.cos(p * 0.83 + slot * 2.17) * zReach + Math.sin(p * 0.31 + seedPhase * 0.9) * zReach * 0.28;
    const dx = (nx - cx) / spreadX;
    const dz = (nz - cz) / spreadZ;
    return Math.exp(-(dx * dx + dz * dz));
  };

  const slowBasin = lobe(1, 0.23, 0.34, 0.42, 0.52, 0.58);
  const meadowBloom = lobe(2, 0.31, 0.27, 0.34, 0.62, 0.54);
  const dampRun = lobe(3, 0.41, 0.24, 0.5, 0.5, 0.68);
  const exposedShoulder = lobe(4, 0.29, 0.22, 0.32, 0.72, 0.46);
  const strataWake = lobe(5, 0.17, 0.26, 0.3, 0.66, 0.62);
  const ridgePulse = lobe(6, 0.37, 0.18, 0.44, 0.78, 0.5);
  const appetite = clamp((slowBasin + meadowBloom + dampRun + exposedShoulder + strataWake + ridgePulse) / 2.9, 0, 1);

  return {
    basin: clamp(slowBasin * intensity, 0, 1),
    bloom: clamp(meadowBloom * intensity, 0, 1),
    damp: clamp(dampRun * intensity, 0, 1),
    exposure: clamp(exposedShoulder * intensity, 0, 1),
    ridge: clamp(ridgePulse * intensity, 0, 1),
    strata: clamp(strataWake * intensity, 0, 1),
    appetite: clamp(appetite * intensity, 0, 1)
  };
}

function topologyDriftAffinityFor(kind: HillOfHillsTopologyPhaseKind, pressure: TopologyDriftPressure): number {
  switch (kind) {
    case 'hill_swell':
      return clamp(pressure.bloom * 0.58 + pressure.ridge * 0.28 + pressure.appetite * 0.14, 0, 1);
    case 'hill_slump':
      return clamp(pressure.exposure * 0.48 + pressure.damp * 0.24 + pressure.appetite * 0.18, 0, 1);
    case 'valley_deepen':
      return clamp(pressure.damp * 0.62 + pressure.basin * 0.22 + pressure.strata * 0.12, 0, 1);
    case 'valley_fill':
      return clamp(pressure.basin * 0.48 + pressure.bloom * 0.34 + pressure.damp * 0.12, 0, 1);
    case 'ridge_lift':
      return clamp(pressure.ridge * 0.56 + pressure.strata * 0.26 + pressure.exposure * 0.12, 0, 1);
    case 'ridge_shear':
      return clamp(pressure.exposure * 0.5 + pressure.ridge * 0.28 + pressure.strata * 0.18, 0, 1);
    case 'saddle_pinch':
      return clamp(pressure.appetite * 0.42 + pressure.basin * 0.24 + pressure.ridge * 0.18, 0, 1);
    case 'saddle_pass':
      return clamp(pressure.appetite * 0.4 + pressure.damp * 0.26 + pressure.bloom * 0.18, 0, 1);
    case 'basin_bloom':
      return clamp(pressure.bloom * 0.58 + pressure.basin * 0.32 + pressure.damp * 0.08, 0, 1);
    case 'strata_reveal':
      return clamp(pressure.strata * 0.56 + pressure.exposure * 0.32 + pressure.ridge * 0.08, 0, 1);
  }
}

type TopologyPhasePointPressure = Record<HillOfHillsTopologyPhaseKind, number>;

function topologyPhasePointPressureAt(
  field: PersistentTopologyField,
  params: HillOfHillsTerrainParams,
  x: number,
  z: number
): TopologyPhasePointPressure {
  const center = persistentTopologySampleAt(field, params, x, z);
  const left = persistentTopologySampleAt(field, params, x - field.dx, z);
  const right = persistentTopologySampleAt(field, params, x + field.dx, z);
  const back = persistentTopologySampleAt(field, params, x, z - field.dz);
  const forward = persistentTopologySampleAt(field, params, x, z + field.dz);
  const deformationDx = (right.deformation - left.deformation) / Math.max(0.001, field.dx * 2);
  const deformationDz = (forward.deformation - back.deformation) / Math.max(0.001, field.dz * 2);
  const deformationGradient = smoothstep(0.006, 0.18, Math.hypot(deformationDx, deformationDz));
  const deformationLaplacian =
    left.deformation + right.deformation + back.deformation + forward.deformation - center.deformation * 4;
  const concave = smoothstep(0.002, 0.12, deformationLaplacian);
  const convex = smoothstep(0.002, 0.12, -deformationLaplacian);
  const raised = smoothstep(0.008, 0.22, center.deformation);
  const lowered = smoothstep(0.008, 0.22, -center.deformation);
  const rising = smoothstep(0.008, 0.42, center.velocity);
  const falling = smoothstep(0.008, 0.42, -center.velocity);
  const positiveForce = smoothstep(0.01, 0.72, center.force);
  const negativeForce = smoothstep(0.01, 0.72, -center.force);
  const grossForce = smoothstep(0.015, 1.1, center.grossForce);
  const membershipBalance = 1 - Math.abs(center.hillMembership - center.slumpMembership);
  const membershipMass = clamp(center.hillMembership + center.slumpMembership, 0, 1);
  const activity = clamp(
    Math.max(
      raised,
      lowered,
      rising,
      falling,
      positiveForce,
      negativeForce,
      grossForce,
      center.contention,
      membershipMass
    ),
    0,
    1
  );
  const calm = activity * (1 - smoothstep(0.02, 0.36, Math.abs(center.velocity)));
  const availableForHill = activity * (1 - center.hillMembership);
  const availableForSlump = activity * (1 - center.slumpMembership);

  const pressure: TopologyPhasePointPressure = {
    hill_swell: clamp(
      lowered * 0.32 +
        center.slumpMembership * 0.24 +
        falling * 0.14 +
        concave * 0.16 +
        availableForHill * 0.14,
      0,
      1
    ),
    hill_slump: clamp(
      raised * 0.3 +
        center.hillMembership * 0.24 +
        rising * 0.14 +
        convex * 0.16 +
        availableForSlump * 0.12 +
        center.contention * 0.04,
      0,
      1
    ),
    valley_deepen: clamp(
      raised * 0.2 +
        center.hillMembership * 0.16 +
        deformationGradient * 0.2 +
        convex * 0.18 +
        center.contention * 0.16 +
        positiveForce * 0.1,
      0,
      1
    ),
    valley_fill: clamp(
      lowered * 0.26 +
        center.slumpMembership * 0.18 +
        concave * 0.18 +
        calm * 0.18 +
        negativeForce * 0.1 +
        availableForHill * 0.1,
      0,
      1
    ),
    ridge_lift: clamp(
      lowered * 0.2 +
        concave * 0.26 +
        deformationGradient * 0.18 +
        availableForHill * 0.16 +
        falling * 0.1 +
        grossForce * 0.1,
      0,
      1
    ),
    ridge_shear: clamp(
      deformationGradient * 0.34 +
        center.contention * 0.28 +
        grossForce * 0.18 +
        convex * 0.1 +
        Math.max(rising, falling) * 0.1,
      0,
      1
    ),
    saddle_pinch: clamp(
      membershipBalance * membershipMass * 0.26 +
        deformationGradient * 0.18 +
        center.contention * 0.22 +
        Math.min(raised + convex, lowered + concave) * 0.2 +
        grossForce * 0.14,
      0,
      1
    ),
    saddle_pass: clamp(
      center.contention * 0.26 +
        deformationGradient * 0.22 +
        membershipBalance * membershipMass * 0.18 +
        calm * 0.16 +
        grossForce * 0.1 +
        availableForHill * 0.08,
      0,
      1
    ),
    basin_bloom: clamp(
      lowered * 0.28 +
        center.slumpMembership * 0.2 +
        concave * 0.2 +
        calm * 0.18 +
        availableForHill * 0.14,
      0,
      1
    ),
    strata_reveal: clamp(
      deformationGradient * 0.3 +
        center.contention * 0.24 +
        grossForce * 0.2 +
        convex * 0.12 +
        Math.max(positiveForce, negativeForce) * 0.14,
      0,
      1
    )
  };
  const localTraffic = smoothstep(
    0.002,
    0.045,
    sampleHillOfHillsProducerTrafficField(field.producerTrafficField, x, z)
  );
  if (localTraffic <= 0) return pressure;
  const trafficResponse: TopologyPhasePointPressure = {
    hill_swell: 0.06,
    hill_slump: 0.3,
    valley_deepen: 0.58,
    valley_fill: 0.08,
    ridge_lift: 0.04,
    ridge_shear: 0.22,
    saddle_pinch: 0.08,
    saddle_pass: 0.72,
    basin_bloom: 0.12,
    strata_reveal: 0.28
  };
  for (const kind of HILL_OF_HILLS_TOPOLOGY_EVENT_KINDS) {
    pressure[kind] = clamp(
      pressure[kind] + localTraffic * trafficResponse[kind] * (1 - pressure[kind] * 0.35),
      0,
      1
    );
  }
  return pressure;
}

function topologyPhasePointAffinityFor(
  kind: HillOfHillsTopologyPhaseKind,
  analyticPossibility: number,
  phasePointPressure: TopologyPhasePointPressure
): number {
  const currentWorldPossibility = phasePointPressure[kind];
  return clamp(
    analyticPossibility * 0.62 +
      currentWorldPossibility * 0.72 +
      analyticPossibility * currentWorldPossibility * 0.16,
    0,
    1
  );
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

function topologyMotionCandidateSignature(candidate: TopologyMotionCandidate): string {
  return [
    trailCandidateSignature(candidate),
    candidate.topologyKind,
    candidate.reason,
    candidate.ridgeStrength.toFixed(3),
    candidate.growthPotential.toFixed(3),
    candidate.eligibility.score.toFixed(3),
    candidate.eligibility.possibility.toFixed(3),
    candidate.eligibility.saddle.toFixed(3),
    candidate.eligibility.strata.toFixed(3)
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
    topologyPhaseClock: 0,
    topologyPhaseProgress: 0,
    trailSeedMethod: 'none',
    trailCandidateChecksum: 'none',
    trailCandidateScoreRange: zeroRange(),
    selectedTrailScoreRange: zeroRange(),
    topologyEventCandidateChecksum: 'none',
    topologyEventCandidateScoreRange: zeroRange(),
    selectedTopologyEventScoreRange: zeroRange(),
    topologyDynamicsMode: 'direct_synthesis',
    topologyPossibilityMode: 'inherited',
    topologyPossibilityChecksum: 'inherited',
    topologyPossibilityRange: zeroRange()
  };
}

function emptyPhaseInfluence(): HillOfHillsPhaseInfluence {
  return {
    kind: 'none',
    amount: 0,
    trailAmount: 0,
    sideDitchAmount: 0,
    topologyAmount: 0,
    topologyHeightDelta: 0,
    topologyDeformation: 0,
    topologyVelocity: 0,
    topologyForce: 0,
    topologyGrossForce: 0,
    topologyOpposedForce: 0,
    topologyContention: 0,
    semanticMemberships: {}
  };
}

function emptyTrailCandidateSummary(): TrailCandidateSummary {
  return {
    candidates: [],
    checksum: 'none',
    scoreRange: zeroRange()
  };
}

function emptyTopologyCandidateSummary(): TopologyMotionCandidateSummary {
  return {
    candidates: [],
    checksum: 'none',
    scoreRange: zeroRange(),
    possibilityChecksum: 'inherited',
    possibilityRange: zeroRange()
  };
}

function topologyEventEnvelope(
  gestureState: TopologyGestureState,
  params: HillOfHillsTerrainParams,
  radius: number,
  progress: number,
  intensity: number,
  falloff: HillOfHillsTopologyEventFalloffKind,
  eventConfig: HillOfHillsTopologyEventClassConfig
): HillOfHillsTopologyEventEnvelope {
  return {
    clock: gestureState.clock,
    phaseIn: gestureState.phaseIn,
    hold: gestureState.hold,
    phaseOut: gestureState.phaseOut,
    amount: clamp(progress * intensity, 0, 1),
    durationMs: params.topologyPhaseDurationMs,
    cadenceMs: params.topologyPhaseDurationMs,
    intensity,
    supportRadius: radius,
    falloff,
    gesture: eventConfig.gesture,
    appetite: eventConfig.appetite,
    force: eventConfig.force,
    phaseOffset: eventConfig.phaseOffset,
    spread: eventConfig.spread
  };
}

function mergeTopologyPhaseEpisodes(existing: HillOfHillsPhaseEpisode, incoming: HillOfHillsPhaseEpisode): HillOfHillsPhaseEpisode {
  if (!existing.topologyEvent || !incoming.topologyEvent) {
    return incoming.intensity >= existing.intensity ? incoming : existing;
  }

  const existingEnvelope = existing.topologyEvent.envelope;
  const incomingEnvelope = incoming.topologyEvent.envelope;
  const dominant = incomingEnvelope.amount >= existingEnvelope.amount ? incoming : existing;
  const dominantEvent = dominant.topologyEvent!;
  const progress = Math.max(existing.progress, incoming.progress);
  const intensity = clamp(1 - (1 - existing.intensity) * (1 - incoming.intensity), 0, 1);
  const envelopeAmount = clamp(1 - (1 - existingEnvelope.amount) * (1 - incomingEnvelope.amount), 0, 1);

  return {
    ...dominant,
    id: existing.id,
    center: existing.center,
    radius: existing.radius,
    direction: existing.direction,
    trailWidth: existing.trailWidth,
    sideDitchOffset: existing.sideDitchOffset,
    progress,
    intensity,
    topologyEvent: {
      ...dominantEvent,
      id: existing.id,
      center: existing.center,
      direction: existing.direction,
      envelope: {
        ...dominantEvent.envelope,
        amount: envelopeAmount,
        intensity,
        supportRadius: existing.radius
      }
    }
  };
}

function activePhaseKinds(episodes: readonly HillOfHillsPhaseEpisode[]): Partial<Record<HillOfHillsPhaseKind, number>> {
  const counts: Partial<Record<HillOfHillsPhaseKind, number>> = {};
  for (const episode of episodes) {
    counts[episode.kind] = (counts[episode.kind] ?? 0) + 1;
  }
  return counts;
}

function createPersistentTopologyField(
  params: HillOfHillsTerrainParams,
  previousField: PersistentTopologyField | undefined,
  producerTrafficField: HillOfHillsProducerTrafficField
): PersistentTopologyField {
  const xCount = Math.min(24, Math.max(8, params.gridResolutionX));
  const zCount = Math.min(32, Math.max(8, params.gridResolutionZ));
  const dx = params.width / Math.max(1, xCount - 1);
  const dz = params.length / Math.max(1, zCount - 1);
  const sampleCount = xCount * zCount;
  const reusablePreviousField =
    previousField &&
    previousField.xCount === xCount &&
    previousField.zCount === zCount &&
    previousField.timeMs <= params.topologyPhaseTimeMs
      ? previousField
      : undefined;
  let deformation = reusablePreviousField
    ? Array.from(reusablePreviousField.deformation)
    : new Array<number>(sampleCount).fill(0);
  let velocity = reusablePreviousField ? Array.from(reusablePreviousField.velocity) : new Array<number>(sampleCount).fill(0);
  let force = reusablePreviousField ? Array.from(reusablePreviousField.force) : new Array<number>(sampleCount).fill(0);
  let grossForce = reusablePreviousField
    ? Array.from(reusablePreviousField.grossForce ?? reusablePreviousField.force.map((value) => Math.abs(value)))
    : new Array<number>(sampleCount).fill(0);
  let opposedForce = reusablePreviousField
    ? Array.from(reusablePreviousField.opposedForce ?? new Array<number>(sampleCount).fill(0))
    : new Array<number>(sampleCount).fill(0);
  let contention = reusablePreviousField
    ? Array.from(reusablePreviousField.contention ?? new Array<number>(sampleCount).fill(0))
    : new Array<number>(sampleCount).fill(0);
  let hillMembership = reusablePreviousField
    ? Array.from(reusablePreviousField.hillMembership)
    : new Array<number>(sampleCount).fill(0);
  let slumpMembership = reusablePreviousField
    ? Array.from(reusablePreviousField.slumpMembership)
    : new Array<number>(sampleCount).fill(0);
  const trafficIdentityChanged =
    reusablePreviousField?.producerTrafficField.checksum !== producerTrafficField.checksum;
  let topologySelections = reusablePreviousField && !trafficIdentityChanged
    ? Array.from(reusablePreviousField.topologySelections)
    : [];
  const targetSeconds = params.topologyPhaseTimeMs / 1000;
  const fixedStepSeconds = 1 / 60;
  const integrationOriginMs = reusablePreviousField?.timeMs ?? 0;
  let elapsedSeconds = integrationOriginMs / 1000;

  while (elapsedSeconds < targetSeconds - 1e-9) {
    const stepSeconds = Math.min(fixedStepSeconds, targetSeconds - elapsedSeconds);
    const sampleTimeMs = (elapsedSeconds + stepSeconds) * 1000;
    let currentField: PersistentTopologyField = {
      timeMs: elapsedSeconds * 1000,
      integrationOriginMs,
      xCount,
      zCount,
      dx,
      dz,
      deformation,
      velocity,
      force,
      grossForce,
      opposedForce,
      contention,
      hillMembership,
      slumpMembership,
      topologySelections,
      producerTrafficField
    };
    const selectionEpoch = Math.floor(sampleTimeMs / Math.max(1, params.topologyPhaseDurationMs));
    const selectionKey = persistentTopologySelectionKey(params, producerTrafficField);
    const currentSelection = topologySelections.find((selection) => selection.epoch === selectionEpoch);
    if (!currentSelection || currentSelection.selectionKey !== selectionKey) {
      const selection = createPersistentTopologySelection(params, selectionEpoch, currentField);
      topologySelections = [
        ...topologySelections.filter(
          (candidate) => candidate.epoch >= selectionEpoch - 1 && candidate.epoch !== selectionEpoch
        ),
        selection
      ];
      currentField = {
        ...currentField,
        topologySelections
      };
    }
    const schedule = persistentTopologySchedule(params, sampleTimeMs, currentField);
    const nextDeformation = deformation.slice();
    const nextVelocity = velocity.slice();
    const nextForce = force.slice();
    const nextGrossForce = grossForce.slice();
    const nextOpposedForce = opposedForce.slice();
    const nextContention = contention.slice();
    const nextHillMembership = hillMembership.slice();
    const nextSlumpMembership = slumpMembership.slice();

    for (let zi = 0; zi < zCount; zi += 1) {
      const z = -params.length * 0.5 + zi * dz;
      for (let xi = 0; xi < xCount; xi += 1) {
        const x = -params.width * 0.5 + xi * dx;
        const index = zi * xCount + xi;
        const center = deformation[index];
        const left = deformation[zi * xCount + Math.max(0, xi - 1)];
        const right = deformation[zi * xCount + Math.min(xCount - 1, xi + 1)];
        const back = deformation[Math.max(0, zi - 1) * xCount + xi];
        const forward = deformation[Math.min(zCount - 1, zi + 1) * xCount + xi];
        const laplacian = (left + right + back + forward - center * 4) / Math.max(0.001, dx * dz);
        const eligibility = persistentHillEligibilityFromDeformedState(params, x, z, center, laplacian);
        const eventClaims = persistentTopologyEventClaimsAt(schedule, params, x, z, eligibility);
        const composedClaims = composePersistentTopologyClaims(eventClaims, center, velocity[index]);
        const swellForce = eventClaims.hillSwell;
        const slumpForce = eventClaims.hillSlump;
        const eventForce = composedClaims.force;
        const comfortExcess = Math.max(0, Math.abs(center) - 0.035);
        const restorativeForce = -Math.sign(center) * comfortExcess * 0.72;
        const smoothingForce = laplacian * 0.045;
        const netForce = clamp(eventForce + restorativeForce + smoothingForce - velocity[index] * 1.35, -2.4, 2.4);
        const nextV = clamp(velocity[index] + netForce * stepSeconds, -1.2, 1.2);
        const nextD = clamp(center + nextV * stepSeconds, -0.72, 0.72);
        const swellPresence = Math.max(
          smoothstep(0.0005, 0.08, swellForce),
          smoothstep(0.001, 0.16, Math.max(0, nextD)),
          smoothstep(0.002, 0.55, Math.max(0, nextV))
        );
        const hillMembershipTarget = clamp(
          eligibility * swellPresence * 0.55 +
            smoothstep(0.002, 0.16, nextD) * 0.32 +
            smoothstep(0.01, 0.55, Math.max(0, nextV)) * 0.13,
          0,
          1
        );
        const slumpPresence = Math.max(
          smoothstep(0.0005, 0.08, slumpForce),
          smoothstep(0.001, 0.16, Math.max(0, -nextD)),
          smoothstep(0.002, 0.55, Math.max(0, -nextV))
        );
        const slumpMembershipTarget = clamp(
          eligibility * slumpPresence * 0.55 +
            smoothstep(0.002, 0.16, -nextD) * 0.32 +
            smoothstep(0.01, 0.55, Math.max(0, -nextV)) * 0.13,
          0,
          1
        );
        const membershipBlend = 1 - Math.exp(-stepSeconds * 5.5);

        nextVelocity[index] = nextV;
        nextDeformation[index] = nextD;
        nextForce[index] = eventForce;
        nextGrossForce[index] = composedClaims.gross;
        nextOpposedForce[index] = composedClaims.opposed;
        nextContention[index] = composedClaims.contention;
        nextHillMembership[index] =
          hillMembership[index] + (hillMembershipTarget - hillMembership[index]) * membershipBlend;
        nextSlumpMembership[index] =
          slumpMembership[index] + (slumpMembershipTarget - slumpMembership[index]) * membershipBlend;
      }
    }

    deformation = nextDeformation;
    velocity = nextVelocity;
    force = nextForce;
    grossForce = nextGrossForce;
    opposedForce = nextOpposedForce;
    contention = nextContention;
    hillMembership = nextHillMembership;
    slumpMembership = nextSlumpMembership;
    elapsedSeconds += stepSeconds;
  }

  return {
    timeMs: params.topologyPhaseTimeMs,
    integrationOriginMs,
    xCount,
    zCount,
    dx,
    dz,
    deformation,
    velocity,
    force,
    grossForce,
    opposedForce,
    contention,
    hillMembership,
    slumpMembership,
    topologySelections,
    producerTrafficField
  };
}

function createPersistentTopologySelection(
  params: HillOfHillsTerrainParams,
  epoch: number,
  field: PersistentTopologyField
): PersistentTopologySelection {
  const selectionKey = persistentTopologySelectionKey(params, field.producerTrafficField);
  if (params.topologyPhaseIntensity <= 0 || params.topologyPhaseLimit <= 0) {
    return {
      epoch,
      selectionKey,
      candidates: [],
      candidateChecksum: 'none',
      candidateScoreRange: zeroRange(),
      possibilityChecksum:
        params.topologyPossibilityMode === 'inherited'
          ? 'inherited'
          : `empty-${params.topologyPossibilityMode}`,
      possibilityRange: zeroRange()
    };
  }
  const candidateSummary = scoreTopologyMotionCandidates(params, field, epoch + 0.5);
  const rng = mulberry32(topologyMotionSelectionSeed(params, epoch));
  return {
    epoch,
    selectionKey,
    candidates: selectTopologyMotionCandidates(
      params,
      candidateSummary.candidates,
      params.topologyPhaseLimit,
      rng,
      epoch + 0.5
    ),
    candidateChecksum: candidateSummary.checksum,
    candidateScoreRange: candidateSummary.scoreRange,
    possibilityChecksum: candidateSummary.possibilityChecksum,
    possibilityRange: candidateSummary.possibilityRange
  };
}

function persistentTopologyTrajectoryKey(params: HillOfHillsTerrainParams): string {
  if (params.topologyDynamicsMode === 'direct_synthesis') {
    return 'direct_synthesis';
  }
  return checksum(
    JSON.stringify({
      seed: params.seed,
      width: params.width,
      length: params.length,
      fieldResolutionX: Math.min(24, Math.max(8, params.gridResolutionX)),
      fieldResolutionZ: Math.min(32, Math.max(8, params.gridResolutionZ)),
      topologyPhaseSeed: params.topologyPhaseSeed,
      topologyDynamicsMode: 'persistent_pressure'
    })
  );
}

function persistentTopologySelectionKey(
  params: HillOfHillsTerrainParams,
  producerTrafficField: HillOfHillsProducerTrafficField
): string {
  return checksum(
    JSON.stringify({
      topologyPhaseIntensity: params.topologyPhaseIntensity,
      topologyPhaseLimit: params.topologyPhaseLimit,
      topologyPhaseRadius: params.topologyPhaseRadius,
      topologyPhaseBasinBias: params.topologyPhaseBasinBias,
      topologyPhaseValleyBias: params.topologyPhaseValleyBias,
      topologyPhaseHillBias: params.topologyPhaseHillBias,
      topologyPhaseRidgeBias: params.topologyPhaseRidgeBias,
      topologyPhaseSaddleBias: params.topologyPhaseSaddleBias,
      topologyPhaseDriftIntensity: params.topologyPhaseDriftIntensity,
      topologyPhaseDurationMs: params.topologyPhaseDurationMs,
      topologyPossibilityMode: params.topologyPossibilityMode,
      topologyEventClasses: params.topologyEventClasses,
      producerTrafficFieldChecksum: producerTrafficField.checksum
    })
  );
}

function persistentTopologySchedule(
  params: HillOfHillsTerrainParams,
  timeMs: number,
  persistentTopologyField: PersistentTopologyField
): HillOfHillsPhaseState {
  const scheduleParams: HillOfHillsTerrainParams = {
    ...params,
    topologyPhaseTimeMs: timeMs,
    topologyDynamicsMode: 'direct_synthesis'
  };
  return createProceduralPhaseState(scheduleParams, persistentTopologyField);
}

interface PersistentTopologyEventClaims {
  positive: number;
  negative: number;
  hillSwell: number;
  hillSlump: number;
}

interface ComposedPersistentTopologyClaims {
  force: number;
  gross: number;
  opposed: number;
  contention: number;
}

function persistentTopologyEventClaimsAt(
  phaseState: HillOfHillsPhaseState,
  params: HillOfHillsTerrainParams,
  x: number,
  z: number,
  hillEligibility: number
): PersistentTopologyEventClaims {
  let positiveSquared = 0;
  let negativeSquared = 0;
  let hillSwellSquared = 0;
  let hillSlumpSquared = 0;
  for (const episode of phaseState.activeEpisodes) {
    if (!episode.topologyEvent) continue;
    let signedForce = persistentTopologyEventSignedForceAtEpisode(episode, params, x, z);
    if (episode.kind === 'hill_swell') {
      signedForce *= 0.52 + hillEligibility * 0.48;
      hillSwellSquared += signedForce * signedForce;
    } else if (episode.kind === 'hill_slump') {
      signedForce *= 0.46 + hillEligibility * 0.54;
      hillSlumpSquared += signedForce * signedForce;
    }
    if (signedForce > 0) {
      positiveSquared += signedForce * signedForce;
    } else if (signedForce < 0) {
      negativeSquared += signedForce * signedForce;
    }
  }
  return {
    positive: Math.sqrt(positiveSquared),
    negative: Math.sqrt(negativeSquared),
    hillSwell: Math.sqrt(hillSwellSquared),
    hillSlump: Math.sqrt(hillSlumpSquared)
  };
}

function composePersistentTopologyClaims(
  claims: PersistentTopologyEventClaims,
  deformation: number,
  velocity: number
): ComposedPersistentTopologyClaims {
  const positive = claims.positive;
  const negative = claims.negative;
  const gross = positive + negative;
  const opposed = Math.min(positive, negative);
  const contention = gross > 0.000001 ? opposed / Math.max(positive, negative, 0.000001) : 0;
  const rememberedOwnership = clamp(deformation / 0.18 + velocity / 0.52, -1, 1);
  const ownershipBias = rememberedOwnership * opposed * 0.64;
  return {
    force: clamp(positive - negative + ownershipBias, -2.4, 2.4),
    gross,
    opposed,
    contention
  };
}

function persistentTopologyEventSignedForceAtEpisode(
  episode: HillOfHillsPhaseEpisode,
  params: HillOfHillsTerrainParams,
  x: number,
  z: number
): number {
  if (!episode.topologyEvent) return 0;
  const px = x - episode.center[0];
  const pz = z - episode.center[2];
  const along = px * episode.direction[0] + pz * episode.direction[2];
  const lateral = px * episode.direction[2] - pz * episode.direction[0];
  const radial = Math.hypot(px / Math.max(0.001, episode.radius), pz / Math.max(0.001, episode.radius * 1.06));
  const core = 1 - smoothstep(0.08, 1, radial);
  if (core <= 0) return 0;
  const envelope = episode.topologyEvent.envelope;
  const gestureAmount = clamp(envelope.phaseIn * (1 - envelope.phaseOut), 0, 1);
  const magnitude =
    core *
    gestureAmount *
    params.topologyPhaseIntensity *
    envelope.force *
    episode.heightScale *
    1.15;

  if (episode.kind === 'valley_deepen') {
    return -magnitude * (0.85 + episode.seedValleyStrength * 0.32);
  }
  if (episode.kind === 'valley_fill') {
    return magnitude * (0.38 + (1 - episode.seedFlowAccumulation) * 0.28);
  }
  if (episode.kind === 'hill_swell' || episode.kind === 'ridge_lift') {
    return magnitude * (0.78 + episode.seedScore * 0.28);
  }
  if (episode.kind === 'hill_slump') {
    const downhill = clamp((along / Math.max(0.001, episode.radius)) * 0.34 + core * 0.42, -0.4, 0.78);
    return -magnitude * (0.35 + downhill + episode.seedSlope * 0.12);
  }
  if (episode.kind === 'ridge_shear' || episode.kind === 'strata_reveal') {
    const shear = clamp(
      Math.sign(lateral || 1) * 0.2 +
        core * 0.26 -
        (Math.abs(lateral) / Math.max(0.001, episode.radius)) * 0.18,
      -0.4,
      0.46
    );
    return magnitude * shear;
  }
  if (episode.kind === 'basin_bloom') {
    return magnitude * (0.18 + episode.seedValleyStrength * 0.12);
  }
  if (episode.kind === 'saddle_pass') {
    const passBand = 1 - smoothstep(episode.radius * 0.08, episode.radius * 0.62, Math.abs(lateral));
    const passTrim = 1 - smoothstep(episode.radius * 0.18, episode.radius * 0.94, Math.abs(along));
    return magnitude * (passBand * 0.34 - passTrim * 0.46);
  }
  const longBand = 1 - smoothstep(episode.radius * 0.12, episode.radius * 0.92, Math.abs(along));
  const lateralBand = 1 - smoothstep(episode.radius * 0.08, episode.radius * 0.72, Math.abs(lateral));
  const pinch = clamp(lateralBand * 0.72 - longBand * 0.5 + core * 0.22, -0.72, 0.82);
  return magnitude * pinch;
}

function persistentHillEligibilityFromDeformedState(
  params: HillOfHillsTerrainParams,
  x: number,
  z: number,
  deformation: number,
  deformationLaplacian: number
): number {
  const stable = stableHeightAt(params, x, z);
  const baseRelief = stable.hills / Math.max(0.001, params.hillHeight * 1.6);
  const deformedRelief = smoothstep(-0.03, 0.2, deformation);
  const roundedCrown = 1 - smoothstep(0.08, 0.9, Math.max(0, deformationLaplacian));
  const wallExclusion = 1 - smoothstep(params.channelRadius * 0.72, params.channelRadius, Math.abs(x));
  const longitudinalInterior = 1 - smoothstep(params.length * 0.42, params.length * 0.5, Math.abs(z));
  return clamp(baseRelief * 0.46 + deformedRelief * 0.3 + roundedCrown * 0.12 + wallExclusion * longitudinalInterior * 0.12, 0, 1);
}

function persistentHillExplorationWeightAt(
  field: PersistentTopologyField,
  params: HillOfHillsTerrainParams,
  x: number,
  z: number
): number {
  const dynamics = persistentTopologySampleAt(field, params, x, z);
  const deformationSaturation = smoothstep(0.035, 0.24, Math.max(0, dynamics.deformation));
  const activeForceSaturation = smoothstep(0.015, 0.24, dynamics.force);
  const saturation = clamp(
    dynamics.hillMembership * 0.72 + deformationSaturation * 0.2 + activeForceSaturation * 0.08,
    0,
    1
  );
  return 1 - saturation * 0.88;
}

function persistentTopologySampleAt(field: PersistentTopologyField, params: HillOfHillsTerrainParams, x: number, z: number) {
  const gridX = clamp((x + params.width * 0.5) / Math.max(0.001, field.dx), 0, field.xCount - 1);
  const gridZ = clamp((z + params.length * 0.5) / Math.max(0.001, field.dz), 0, field.zCount - 1);
  const x0 = Math.floor(gridX);
  const z0 = Math.floor(gridZ);
  const x1 = Math.min(field.xCount - 1, x0 + 1);
  const z1 = Math.min(field.zCount - 1, z0 + 1);
  const tx = gridX - x0;
  const tz = gridZ - z0;
  const interpolate = (values: readonly number[]) => {
    const a = values[z0 * field.xCount + x0] * (1 - tx) + values[z0 * field.xCount + x1] * tx;
    const b = values[z1 * field.xCount + x0] * (1 - tx) + values[z1 * field.xCount + x1] * tx;
    return a * (1 - tz) + b * tz;
  };
  return {
    deformation: interpolate(field.deformation),
    velocity: interpolate(field.velocity),
    force: interpolate(field.force),
    grossForce: Math.max(0, interpolate(field.grossForce)),
    opposedForce: Math.max(0, interpolate(field.opposedForce)),
    contention: clamp(interpolate(field.contention), 0, 1),
    hillMembership: clamp(interpolate(field.hillMembership), 0, 1),
    slumpMembership: clamp(interpolate(field.slumpMembership), 0, 1)
  };
}

function phaseInfluenceAt(phaseState: HillOfHillsPhaseState, x: number, z: number, params?: HillOfHillsTerrainParams): HillOfHillsPhaseInfluence {
  let bestKind: HillOfHillsPhaseInfluenceKind = 'none';
  let bestAmount = 0;
  let bestTrailAmount = 0;
  let bestSideDitchAmount = 0;
  let bestEpisodeId: string | undefined;
  let topologyKind: HillOfHillsPhaseInfluenceKind = 'none';
  let topologyEpisodeId: string | undefined;
  let topologyDominantAmount = 0;
  let topologyAmount = 0;
  let topologyHeightDeltaSum = 0;
  let topologyWeight = 0;
  const topologySemanticMemberships: Partial<Record<HillOfHillsTopologyPhaseKind, number>> = {};

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

    if (episode.kind !== 'ditch_forming') {
      const influence = topologyInfluenceAtEpisode(episode, x, z);
      if (influence.amount > 0) {
        topologySemanticMemberships[episode.kind] =
          1 -
          (1 - (topologySemanticMemberships[episode.kind] ?? 0)) *
            (1 - influence.amount);
        topologyAmount = 1 - (1 - topologyAmount) * (1 - influence.amount);
        if (phaseState.topologyDynamicsMode !== 'persistent_pressure') {
          topologyHeightDeltaSum += influence.heightDelta;
          topologyWeight += influence.amount;
        }
        if (influence.amount > topologyDominantAmount) {
          topologyKind = episode.kind;
          topologyDominantAmount = influence.amount;
          topologyEpisodeId = episode.id;
        }
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

  let topologyHeightDelta =
    topologyWeight > 0 ? topologyHeightDeltaSum / Math.max(1, Math.sqrt(topologyWeight)) : 0;
  let topologyDeformation = 0;
  let topologyVelocity = 0;
  let topologyForce = 0;
  let topologyGrossForce = 0;
  let topologyOpposedForce = 0;
  let topologyContention = 0;
  let semanticMemberships: Partial<Record<HillOfHillsTopologyPhaseKind, number>> = {
    ...topologySemanticMemberships
  };

  if (phaseState.topologyDynamicsMode === 'persistent_pressure' && phaseState.persistentTopologyField && params) {
    const dynamics = persistentTopologySampleAt(phaseState.persistentTopologyField, params, x, z);
    topologyDeformation = dynamics.deformation;
    topologyVelocity = dynamics.velocity;
    topologyForce = dynamics.force;
    topologyGrossForce = dynamics.grossForce;
    topologyOpposedForce = dynamics.opposedForce;
    topologyContention = dynamics.contention;
    semanticMemberships = {
      ...semanticMemberships,
      hill_swell: dynamics.hillMembership,
      hill_slump: dynamics.slumpMembership
    };
    topologyAmount = 1 - (1 - topologyAmount) * (1 - Math.max(dynamics.hillMembership, dynamics.slumpMembership));
    const heightScale = 0.8 + params.hillHeight * 0.22 + params.valleyHeight * 0.18;
    topologyHeightDelta += dynamics.deformation / Math.max(0.001, heightScale);
    if (dynamics.hillMembership > topologyDominantAmount) {
      topologyKind = 'hill_swell';
      topologyDominantAmount = dynamics.hillMembership;
      topologyEpisodeId = 'persistent-hill-swell-field';
    }
    if (dynamics.slumpMembership > topologyDominantAmount) {
      topologyKind = 'hill_slump';
      topologyDominantAmount = dynamics.slumpMembership;
      topologyEpisodeId = 'persistent-hill-slump-field';
    }
  }

  if (topologyAmount > bestAmount) {
    bestKind = topologyKind;
    bestAmount = topologyAmount;
    bestTrailAmount = 0;
    bestSideDitchAmount = 0;
    bestEpisodeId = topologyEpisodeId;
  }

  if (bestAmount <= 0) {
    return {
      kind: 'none',
      amount: 0,
      trailAmount: 0,
      sideDitchAmount: 0,
      topologyAmount: 0,
      topologyHeightDelta: 0,
      topologyDeformation,
      topologyVelocity,
      topologyForce,
      topologyGrossForce,
      topologyOpposedForce,
      topologyContention,
      semanticMemberships
    };
  }

  return {
    kind: bestKind,
    amount: bestAmount,
    trailAmount: bestTrailAmount,
    sideDitchAmount: bestSideDitchAmount,
    topologyAmount,
    topologyHeightDelta,
    topologyDeformation,
    topologyVelocity,
    topologyForce,
    topologyGrossForce,
    topologyOpposedForce,
    topologyContention,
    semanticMemberships,
    episodeId: bestEpisodeId ?? topologyEpisodeId
  };
}

function topologyInfluenceAtEpisode(episode: HillOfHillsPhaseEpisode, x: number, z: number): { amount: number; heightDelta: number } {
  const px = x - episode.center[0];
  const pz = z - episode.center[2];
  const along = px * episode.direction[0] + pz * episode.direction[2];
  const lateral = px * episode.direction[2] - pz * episode.direction[0];
  const radial = Math.hypot(px / Math.max(0.001, episode.radius), pz / Math.max(0.001, episode.radius * 1.06));
  const core = 1 - smoothstep(0.12, 1, radial);
  const amount = clamp(core * episode.intensity, 0, 1);
  if (amount <= 0) {
    return { amount: 0, heightDelta: 0 };
  }

  const scale =
    (0.18 + episode.seedSlope * 0.055 + episode.radius * 0.026) *
    clamp(episode.progress, 0, 1) *
    episode.heightScale;
  if (episode.kind === 'valley_deepen') {
    return { amount, heightDelta: -amount * scale * (0.85 + episode.seedValleyStrength * 0.32) };
  }
  if (episode.kind === 'valley_fill') {
    return { amount, heightDelta: amount * scale * (0.38 + (1 - episode.seedFlowAccumulation) * 0.28) };
  }
  if (episode.kind === 'hill_swell' || episode.kind === 'ridge_lift') {
    return { amount, heightDelta: amount * scale * (0.78 + episode.seedScore * 0.28) };
  }
  if (episode.kind === 'hill_slump') {
    const downhill = clamp((along / Math.max(0.001, episode.radius)) * 0.34 + core * 0.42, -0.4, 0.78);
    return { amount, heightDelta: -amount * scale * (0.35 + downhill + episode.seedSlope * 0.12) };
  }
  if (episode.kind === 'ridge_shear' || episode.kind === 'strata_reveal') {
    const shear = clamp(Math.sign(lateral || 1) * 0.2 + core * 0.26 - Math.abs(lateral) / Math.max(0.001, episode.radius) * 0.18, -0.4, 0.46);
    return { amount, heightDelta: amount * scale * shear };
  }
  if (episode.kind === 'basin_bloom') {
    return { amount, heightDelta: amount * scale * (0.18 + episode.seedValleyStrength * 0.12) };
  }
  if (episode.kind === 'saddle_pass') {
    const passBand = 1 - smoothstep(episode.radius * 0.08, episode.radius * 0.62, Math.abs(lateral));
    const passTrim = 1 - smoothstep(episode.radius * 0.18, episode.radius * 0.94, Math.abs(along));
    return { amount, heightDelta: amount * scale * (passBand * 0.34 - passTrim * 0.46) };
  }

  const longBand = 1 - smoothstep(episode.radius * 0.12, episode.radius * 0.92, Math.abs(along));
  const lateralBand = 1 - smoothstep(episode.radius * 0.08, episode.radius * 0.72, Math.abs(lateral));
  const pinch = clamp(lateralBand * 0.72 - longBand * 0.5 + core * 0.22, -0.72, 0.82);
  return {
    amount,
    heightDelta: amount * scale * pinch
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
    episode.heightScale.toFixed(3),
    episode.seedMethod,
    episode.seedScore.toFixed(3),
    episode.seedRoutePressure.toFixed(3),
    episode.seedValleyStrength.toFixed(3),
    episode.seedFlowAccumulation.toFixed(3),
    episode.seedDitchPotential.toFixed(3),
    episode.seedSlope.toFixed(3),
    episode.topologyEvent?.reason ?? 'none',
    episode.topologyEvent?.envelope.gesture ?? 'none',
    episode.topologyEvent?.envelope.appetite.toFixed(3) ?? 'none',
    episode.topologyEvent?.envelope.force.toFixed(3) ?? 'none',
    episode.topologyEvent?.envelope.phaseOffset.toFixed(3) ?? 'none',
    episode.topologyEvent?.envelope.spread.toFixed(3) ?? 'none',
    episode.topologyEvent?.supportEpoch.toString() ?? 'none',
    episode.topologyEvent?.supportLifecycle ?? 'none',
    episode.topologyEvent?.supportClock.toFixed(3) ?? 'none',
    episode.topologyEvent?.supportAmount.toFixed(3) ?? 'none',
    episode.topologyEvent?.materialHint ?? 'none',
    episode.topologyEvent?.assetHint ?? 'none'
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
    const phaseInfluence = phaseInfluenceAt(phaseState, x, z, params);
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
  return phaseInfluenceAt(phaseState, x, z, params);
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
  const phaseInfluence = phaseInfluenceAt(phaseState, clampedX, clampedZ, params);
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
  const pressure = pressureFieldsFor(params, x, z, heightParts, slope, region, topology, proxyMaterial, phaseInfluence);
  const support = supportSampleFor(params, phaseState, x, z, heightParts, phaseInfluence);
  const surfaceDetail = surfaceDetailFor(params, x, z, region, topology, proxyMaterial, phaseInfluence, slope);
  const materialEdge = materialEdgeFor(params, x, z, region, topology, proxyMaterial, phaseInfluence, surfaceDetail, slope);

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
    pressure,
    proxyMaterial,
    phaseInfluence,
    support,
    surfaceDetail,
    materialEdge
  };
}

function surfaceDetailFor(
  params: HillOfHillsTerrainParams,
  x: number,
  z: number,
  region: TerrainRegion,
  topology: HillOfHillsTopology,
  proxyMaterial: HillOfHillsProxyMaterial,
  phaseInfluence: HillOfHillsPhaseInfluence,
  slope: number
): HillOfHillsSurfaceDetail {
  const edgeMix = clamp(
    Math.max(
      topology.ditchPotential * 0.54,
      topology.valleyStrength * 0.34,
      topology.routePressure * 0.28,
      slope * 0.3,
      phaseInfluence.trailAmount * 0.86,
      phaseInfluence.sideDitchAmount * 0.9,
      phaseInfluence.topologyAmount * 0.46
    ),
    0,
    1
  );
  const seed = detailSeedFor(params.seed, x, z, proxyMaterial.kind);
  const jitter = seededUnit(seed);
  const growthPhaseDetail = smoothstep(
    0.04,
    0.28,
    hillPhaseMembershipAmount(phaseInfluence, 'hill_swell', 'basin_bloom') * params.topologyPhaseDetailScale
  );
  const valleyCutPhaseDetail = smoothstep(
    0.04,
    0.28,
    hillPhaseMembershipAmount(phaseInfluence, 'valley_deepen') * params.topologyPhaseDetailScale
  );
  const meadowPhaseDetail = smoothstep(
    0.04,
    0.28,
    hillPhaseMembershipAmount(phaseInfluence, 'valley_fill') * params.topologyPhaseDetailScale
  );
  const slopePhaseDetail = smoothstep(
    0.04,
    0.28,
    hillPhaseMembershipAmount(phaseInfluence, 'hill_slump', 'ridge_lift', 'ridge_shear', 'strata_reveal') *
      params.topologyPhaseDetailScale
  );
  const saddlePhaseDetail = smoothstep(
    0.04,
    0.28,
    hillPhaseMembershipAmount(phaseInfluence, 'saddle_pass', 'saddle_pinch') * params.topologyPhaseDetailScale
  );
  let kind: HillOfHillsSurfaceDetailKind = 'none';
  let density = 0;

  if (phaseInfluence.trailAmount > 0.24) {
    kind = 'trail-wear';
    density = clamp(0.34 + phaseInfluence.trailAmount * 0.58 + topology.routePressure * 0.16 + jitter * 0.08, 0, 1);
  } else if (growthPhaseDetail > 0 && topology.growthPotential > 0.42) {
    kind = 'growth-bud';
    density = clamp(0.18 + growthPhaseDetail * 0.58 + topology.growthPotential * 0.22 + jitter * 0.08, 0, 1);
  } else if (valleyCutPhaseDetail > 0 && topology.ditchPotential > 0.48) {
    kind = 'damp-edge';
    density = clamp(0.14 + valleyCutPhaseDetail * 0.5 + topology.ditchPotential * 0.22 + jitter * 0.08, 0, 1);
  } else if (meadowPhaseDetail > 0) {
    kind = 'meadow-tuft';
    density = clamp(0.12 + meadowPhaseDetail * 0.44 + topology.growthPotential * 0.18 + jitter * 0.1, 0, 1);
  } else if (slopePhaseDetail > 0) {
    kind = 'slope-striation';
    density = clamp(0.14 + slopePhaseDetail * 0.5 + slope * 0.22 + topology.ridgeStrength * 0.14 + jitter * 0.08, 0, 1);
  } else if (saddlePhaseDetail > 0) {
    kind = 'trail-wear';
    density = clamp(0.12 + saddlePhaseDetail * 0.42 + topology.routePressure * 0.18 + jitter * 0.08, 0, 1);
  } else if (region === 'approach' && topology.routePressure > 0.68) {
    kind = 'trail-wear';
    density = clamp(0.16 + topology.routePressure * 0.28 + topology.valleyStrength * 0.08 + jitter * 0.1, 0, 1);
  } else if (topology.ditchPotential > 0.64 || phaseInfluence.sideDitchAmount > 0.24 || proxyMaterial.wetness > 0.62) {
    kind = 'damp-edge';
    density = clamp(0.28 + topology.ditchPotential * 0.48 + phaseInfluence.sideDitchAmount * 0.28 + jitter * 0.08, 0, 1);
  } else if (topology.growthPotential > 0.6 && (region === 'slope' || region === 'rim' || proxyMaterial.kind === 'growth-lip')) {
    kind = 'growth-bud';
    density = clamp(0.24 + topology.growthPotential * 0.58 + jitter * 0.12, 0, 1);
  } else if (proxyMaterial.kind === 'basin-meadow') {
    kind = 'meadow-tuft';
    density = clamp(0.22 + topology.growthPotential * 0.48 + topology.routePressure * 0.14 + jitter * 0.16, 0, 1);
  } else if (proxyMaterial.kind === 'basin-dust' || (region === 'basin' && proxyMaterial.wetness < 0.48)) {
    kind = 'dust-scuff';
    density = clamp(0.22 + (1 - topology.growthPotential) * 0.34 + topology.valleyStrength * 0.16 + jitter * 0.16, 0, 1);
  } else if (region === 'slope' || slope > 0.34 || topology.ridgeStrength > 0.38) {
    kind = 'slope-striation';
    density = clamp(0.18 + slope * 0.34 + topology.ridgeStrength * 0.2 + jitter * 0.1, 0, 1);
  }

  return {
    kind,
    density,
    edgeMix,
    seed
  };
}

function materialEdgeFor(
  params: HillOfHillsTerrainParams,
  x: number,
  z: number,
  region: TerrainRegion,
  topology: HillOfHillsTopology,
  proxyMaterial: HillOfHillsProxyMaterial,
  phaseInfluence: HillOfHillsPhaseInfluence,
  surfaceDetail: HillOfHillsSurfaceDetail,
  slope: number
): HillOfHillsMaterialEdge {
  const secondary = strongestSecondaryBlend(proxyMaterial);
  const blendEdge = clamp(secondary.weight * 1.65, 0, 1);
  const topologyEdge = clamp(
    Math.max(
      surfaceDetail.edgeMix * 0.72,
      topology.ditchPotential * 0.64,
      topology.growthPotential * 0.42,
      topology.routePressure * 0.34,
      topology.valleyStrength * 0.3,
      slope * 0.26,
      phaseInfluence.trailAmount * 0.92,
      phaseInfluence.sideDitchAmount * 0.88,
      phaseInfluence.topologyAmount * 0.48
    ),
    0,
    1
  );
  let kind: HillOfHillsMaterialEdgeKind = 'none';
  let anchor: HillOfHillsSurfaceAnchorKind = 'none';
  let strength = clamp(Math.max(blendEdge, topologyEdge) * 0.78, 0, 1);
  const growthPhaseDetail = smoothstep(
    0.04,
    0.28,
    hillPhaseMembershipAmount(phaseInfluence, 'hill_swell', 'basin_bloom') * params.topologyPhaseDetailScale
  );
  const slopePhaseDetail = smoothstep(
    0.04,
    0.28,
    hillPhaseMembershipAmount(phaseInfluence, 'saddle_pinch', 'ridge_lift', 'ridge_shear', 'strata_reveal') *
      params.topologyPhaseDetailScale
  );
  const saddlePassPhaseDetail = smoothstep(
    0.04,
    0.28,
    hillPhaseMembershipAmount(phaseInfluence, 'saddle_pass') * params.topologyPhaseDetailScale
  );
  const valleyCutPhaseDetail = smoothstep(
    0.04,
    0.28,
    hillPhaseMembershipAmount(phaseInfluence, 'valley_deepen') * params.topologyPhaseDetailScale
  );
  const softGroundPhaseDetail = smoothstep(
    0.04,
    0.28,
    hillPhaseMembershipAmount(phaseInfluence, 'valley_fill', 'hill_slump') * params.topologyPhaseDetailScale
  );

  if (phaseInfluence.trailAmount > 0.2 || (region === 'approach' && topology.routePressure > 0.64)) {
    kind = 'route-wear';
    anchor = 'trail-accent';
    strength = clamp(Math.max(strength, 0.24 + topology.routePressure * 0.42 + phaseInfluence.trailAmount * 0.42), 0, 1);
  } else if (growthPhaseDetail > 0) {
    kind = 'growth-cluster';
    anchor = 'growth-cluster';
    strength = clamp(Math.max(strength, 0.18 + growthPhaseDetail * 0.48 + topology.growthPotential * 0.18 + slope * 0.12), 0, 1);
  } else if (saddlePassPhaseDetail > Math.max(0.02, slopePhaseDetail)) {
    kind = 'route-wear';
    anchor = 'trail-accent';
    strength = clamp(Math.max(strength, 0.2 + saddlePassPhaseDetail * 0.46 + slope * 0.18 + topology.ridgeStrength * 0.12), 0, 1);
  } else if (slopePhaseDetail > 0) {
    kind = 'slope-break';
    anchor = 'stone-scatter';
    strength = clamp(Math.max(strength, 0.2 + slopePhaseDetail * 0.46 + slope * 0.18 + topology.ridgeStrength * 0.12), 0, 1);
  } else if (valleyCutPhaseDetail > 0) {
    kind = 'damp-rim';
    anchor = 'wet-rim';
    strength = clamp(Math.max(strength, 0.18 + valleyCutPhaseDetail * 0.42 + topology.ditchPotential * 0.24), 0, 1);
  } else if (softGroundPhaseDetail > 0) {
    kind = 'meadow-dust';
    anchor =
      hillPhaseMembershipAmount(phaseInfluence, 'valley_fill') >=
      hillPhaseMembershipAmount(phaseInfluence, 'hill_slump')
        ? 'tuft-line'
        : 'scuff-line';
    strength = clamp(Math.max(strength, 0.16 + softGroundPhaseDetail * 0.38 + topology.valleyStrength * 0.12), 0, 1);
  } else if (topology.ditchPotential > 0.58 || phaseInfluence.sideDitchAmount > 0.18 || proxyMaterial.wetness > 0.56) {
    kind = 'damp-rim';
    anchor = 'wet-rim';
    strength = clamp(Math.max(strength, 0.22 + topology.ditchPotential * 0.48 + phaseInfluence.sideDitchAmount * 0.28), 0, 1);
  } else if (topology.growthPotential > 0.55 && (proxyMaterial.kind === 'growth-lip' || region === 'slope' || region === 'rim')) {
    kind = 'growth-cluster';
    anchor = 'growth-cluster';
    strength = clamp(Math.max(strength, 0.2 + topology.growthPotential * 0.58 + slope * 0.12), 0, 1);
  } else if (proxyMaterial.kind === 'basin-meadow' && secondary.kind === 'basin-dust') {
    kind = 'meadow-dust';
    anchor = 'tuft-line';
    strength = clamp(Math.max(strength, 0.2 + secondary.weight * 0.62 + topology.valleyStrength * 0.12), 0, 1);
  } else if (proxyMaterial.kind === 'basin-meadow' || secondary.kind === 'growth-lip') {
    kind = 'meadow-growth';
    anchor = 'tuft-line';
    strength = clamp(Math.max(strength, 0.18 + topology.growthPotential * 0.48 + secondary.weight * 0.24), 0, 1);
  } else if (proxyMaterial.kind === 'basin-dust' || proxyMaterial.kind === 'rim-crust') {
    kind = 'dust-crust';
    anchor = 'scuff-line';
    strength = clamp(Math.max(strength, 0.18 + (1 - topology.growthPotential) * 0.3 + topology.ridgeStrength * 0.14), 0, 1);
  } else if (region === 'slope' || topology.ridgeStrength > 0.42 || slope > 0.4) {
    kind = 'slope-break';
    anchor = 'stone-scatter';
    strength = clamp(Math.max(strength, 0.16 + slope * 0.32 + topology.ridgeStrength * 0.24), 0, 1);
  } else if (strength > 0.34 && secondary.kind === 'basin-dust') {
    kind = 'meadow-dust';
    anchor = 'tuft-line';
  }

  if (strength < 0.14) {
    kind = 'none';
    anchor = 'none';
    strength = 0;
  }

  const seed = detailSeedFor(params.seed, x, z, `${kind}:${anchor}`);
  const jitter = seededUnit(seed);
  const dissolve = kind === 'none' ? 0 : clamp(strength * (0.58 + jitter * 0.34) + surfaceDetail.density * 0.08, 0, 1);

  return {
    kind,
    anchor,
    strength,
    dissolve,
    seed
  };
}

function strongestSecondaryBlend(proxyMaterial: HillOfHillsProxyMaterial): { kind: HillOfHillsProxyMaterialKind; weight: number } {
  let strongest: { kind: HillOfHillsProxyMaterialKind; weight: number } = {
    kind: proxyMaterial.kind,
    weight: 0
  };

  for (const [kind, weight] of Object.entries(proxyMaterial.blends)) {
    if (kind === proxyMaterial.kind || typeof weight !== 'number') {
      continue;
    }
    if (weight > strongest.weight) {
      strongest = {
        kind: kind as HillOfHillsProxyMaterialKind,
        weight
      };
    }
  }

  return strongest;
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
  const persistentMotion = phaseState.topologyDynamicsMode === 'persistent_pressure';
  const heightDelta = persistentMotion
    ? clamp(phaseInfluence.topologyVelocity * (16 / 1000), -0.24, 0.24)
    : activeMotion
      ? clamp((heightParts.phaseTopology - heightParts.phaseDitch) * 0.08, -0.24, 0.24)
      : 0;
  const previousHeight = heightParts.height - heightDelta;
  const supportTickSeconds = 16 / 1000;
  const surfaceVelocity: Vec3 = [0, persistentMotion ? phaseInfluence.topologyVelocity : heightDelta / supportTickSeconds, 0];
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
  const valleyCutMotion = hillPhaseMembershipAmount(phaseInfluence, 'valley_deepen');
  const valleyFillMotion = hillPhaseMembershipAmount(phaseInfluence, 'valley_fill');
  const hillMotion = hillPhaseMembershipAmount(phaseInfluence, 'hill_swell', 'ridge_lift');
  const slumpMotion = hillPhaseMembershipAmount(phaseInfluence, 'hill_slump');
  const shearMotion = hillPhaseMembershipAmount(phaseInfluence, 'ridge_shear', 'strata_reveal');
  const saddleMotion = hillPhaseMembershipAmount(phaseInfluence, 'saddle_pinch', 'saddle_pass');
  const bloomMotion = hillPhaseMembershipAmount(phaseInfluence, 'basin_bloom');
  const valleyStrength = clamp(
    heightParts.valleys / Math.max(0.001, params.valleyHeight * 1.9) +
      phaseInfluence.sideDitchAmount * 0.2 +
      phaseInfluence.trailAmount * 0.08 +
      valleyCutMotion * 0.34 -
      valleyFillMotion * 0.12 +
      saddleMotion * 0.12,
    0,
    1
  );
  const ridgeStrength = clamp(
    Math.max(heightParts.hills, heightParts.wall * 0.42) / Math.max(0.001, params.hillHeight * 1.8 + params.wallHeight * 0.35) +
      hillMotion * 0.28 +
      shearMotion * 0.1 -
      slumpMotion * 0.08 +
      saddleMotion * 0.12,
    0,
    1
  );
  const flowAccumulation = clamp(
    valleyStrength * 0.58 +
      uphill * 0.18 +
      phaseInfluence.sideDitchAmount * 0.42 +
      phaseInfluence.trailAmount * 0.08 +
      valleyCutMotion * 0.22 -
      valleyFillMotion * 0.08 +
      saddleMotion * 0.1,
    0,
    1
  );
  const routePressure = clamp(
    centerRoute * 0.58 +
      crownPull * 0.24 +
      flowAccumulation * 0.2 +
      phaseInfluence.trailAmount * 0.42 +
      phaseInfluence.sideDitchAmount * 0.08 +
      saddleMotion * 0.22 +
      hillMotion * 0.06 -
      shearMotion * 0.04 -
      slope * 0.12,
    0,
    1
  );
  const ditchPotential = clamp(
    valleyStrength * 0.56 + flowAccumulation * 0.18 + phaseInfluence.sideDitchAmount * 0.64 + valleyCutMotion * 0.2 - valleyFillMotion * 0.08,
    0,
    1
  );
  const growthPotential = clamp(
    ridgeStrength * 0.46 +
      slope * 0.2 +
      crownPull * 0.12 +
      hillMotion * 0.18 +
      bloomMotion * 0.28 +
      saddleMotion * 0.08 -
      ditchPotential * 0.2 -
      shearMotion * 0.06,
    0,
    1
  );
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

function pressureFieldsFor(
  params: HillOfHillsTerrainParams,
  x: number,
  z: number,
  heightParts: HeightParts,
  slope: number,
  region: TerrainRegion,
  topology: HillOfHillsTopology,
  proxyMaterial: HillOfHillsProxyMaterial,
  phaseInfluence: HillOfHillsPhaseInfluence
): HillOfHillsPressureFieldSample {
  const topologyAmount = phaseInfluence.topologyAmount;
  const relief = clamp(
    Math.abs(heightParts.hills) * 0.28 +
      heightParts.valleys * 0.32 +
      Math.abs(heightParts.phaseTopology) * 0.22 +
      Math.abs(heightParts.detail) * 0.08,
    0,
    1
  );
  const curvature = clamp(
    topology.ridgeStrength * 0.34 + topology.valleyStrength * 0.34 + relief * 0.2 + topologyAmount * 0.16 + Math.abs(heightParts.detail) * 0.04,
    0,
    1
  );
  const strongestFold = Math.max(topology.ridgeStrength, topology.valleyStrength);
  const saddle = clamp(
    topology.routePressure * (1 - Math.abs(topology.ridgeStrength - topology.valleyStrength) * 0.68) * (1 - strongestFold * 0.2) +
      hillPhaseMembershipAmount(phaseInfluence, 'saddle_pinch', 'saddle_pass') * 0.22,
    0,
    1
  );
  const basin = clamp(
    topology.valleyStrength * 0.54 + topology.flowAccumulation * 0.18 + (region === 'basin' ? 0.22 : 0) + (proxyMaterial.kind === 'basin-meadow' ? 0.08 : 0),
    0,
    1
  );
  const exposure = clamp(
    slope * 0.34 +
      topology.ridgeStrength * 0.36 +
      (1 - topology.growthPotential) * 0.14 +
      (proxyMaterial.kind === 'rim-crust' ? 0.12 : 0) +
      hillPhaseMembershipAmount(phaseInfluence, 'strata_reveal') * 0.16,
    0,
    1
  );
  const erosion = clamp(
    topology.flowAccumulation * 0.34 + topology.valleyStrength * 0.28 + topology.ditchPotential * 0.22 + slope * 0.14 + phaseInfluence.sideDitchAmount * 0.16,
    0,
    1
  );
  const bloom = clamp(
    topology.growthPotential * 0.5 +
      proxyMaterial.growthTint * 0.26 +
      (1 - clamp(slope, 0, 1)) * 0.08 +
      hillPhaseMembershipAmount(phaseInfluence, 'basin_bloom') * 0.28 -
      exposure * 0.05,
    0,
    1
  );
  const strata = clamp(
    exposure * 0.42 +
      topology.ridgeStrength * 0.22 +
      slope * 0.16 +
      (proxyMaterial.kind === 'rim-crust' || proxyMaterial.kind === 'basin-dust' ? 0.1 : 0) +
      hillPhaseMembershipAmount(phaseInfluence, 'strata_reveal') * 0.22,
    0,
    1
  );
  const vegetation = clamp(
    topology.growthPotential * 0.56 + proxyMaterial.growthTint * 0.24 + bloom * 0.16 + (proxyMaterial.kind === 'growth-lip' ? 0.08 : 0) - exposure * 0.06,
    0,
    1
  );
  const driftPressure = topologyDriftPressureAt(params, x, z);

  return {
    slope: clamp(slope, 0, 1),
    curvature: clamp(curvature + driftPressure.ridge * 0.1 + driftPressure.strata * 0.08 - driftPressure.basin * 0.04, 0, 1),
    ridge: clamp(topology.ridgeStrength + driftPressure.ridge * 0.18 + driftPressure.exposure * 0.06 - driftPressure.damp * 0.04, 0, 1),
    valley: clamp(topology.valleyStrength + driftPressure.damp * 0.16 + driftPressure.basin * 0.1 - driftPressure.exposure * 0.05, 0, 1),
    saddle: clamp(saddle + driftPressure.appetite * 0.08, 0, 1),
    basin: clamp(basin + driftPressure.basin * 0.3 + driftPressure.damp * 0.08 - driftPressure.exposure * 0.06, 0, 1),
    exposure: clamp(exposure + driftPressure.exposure * 0.24 + driftPressure.strata * 0.08 - driftPressure.bloom * 0.08, 0, 1),
    route: topology.routePressure,
    erosion: clamp(erosion + driftPressure.damp * 0.14 + driftPressure.strata * 0.12, 0, 1),
    bloom: clamp(bloom + driftPressure.bloom * 0.34 + driftPressure.basin * 0.06 - driftPressure.exposure * 0.08, 0, 1),
    strata: clamp(strata + driftPressure.strata * 0.28 + driftPressure.exposure * 0.06 - driftPressure.bloom * 0.04, 0, 1),
    vegetation: clamp(vegetation + driftPressure.bloom * 0.26 + driftPressure.basin * 0.08 - driftPressure.exposure * 0.08, 0, 1)
  };
}

function proxyMaterialKindFor(region: TerrainRegion, topology: HillOfHillsTopology): HillOfHillsProxyMaterialKind {
  if (region === 'crown') return 'crown-warmth';
  if (topology.growthPotential > 0.54 && (region === 'slope' || region === 'rim')) return 'growth-lip';
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

function codeForSurfaceDetail(kind: HillOfHillsSurfaceDetailKind): number {
  const index = SURFACE_DETAIL_CODEBOOK.indexOf(kind);
  return index >= 0 ? index : SURFACE_DETAIL_CODEBOOK.indexOf('none');
}

function surfaceDetailForCode(code: number): HillOfHillsSurfaceDetailKind {
  return SURFACE_DETAIL_CODEBOOK[code] ?? 'none';
}

function codeForMaterialEdge(kind: HillOfHillsMaterialEdgeKind): number {
  const index = MATERIAL_EDGE_CODEBOOK.indexOf(kind);
  return index >= 0 ? index : MATERIAL_EDGE_CODEBOOK.indexOf('none');
}

function materialEdgeForCode(code: number): HillOfHillsMaterialEdgeKind {
  return MATERIAL_EDGE_CODEBOOK[code] ?? 'none';
}

function codeForSurfaceAnchor(kind: HillOfHillsSurfaceAnchorKind): number {
  const index = SURFACE_ANCHOR_CODEBOOK.indexOf(kind);
  return index >= 0 ? index : SURFACE_ANCHOR_CODEBOOK.indexOf('none');
}

function surfaceAnchorForCode(code: number): HillOfHillsSurfaceAnchorKind {
  return SURFACE_ANCHOR_CODEBOOK[code] ?? 'none';
}

function metric(buffer: HillOfHillsTerrainBuffer, metricOffset: number, channel: HillOfHillsTerrainBufferMetricChannel): number {
  const index = buffer.channelLayout.metrics.indexOf(channel);
  if (index < 0) {
    throw new Error(`terrain buffer is missing metric channel ${channel}`);
  }
  return buffer.metrics[metricOffset + index];
}

function optionalMetric(buffer: HillOfHillsTerrainBuffer, metricOffset: number, channel: HillOfHillsTerrainBufferMetricChannel, fallback: number): number {
  const index = buffer.channelLayout.metrics.indexOf(channel);
  return index >= 0 ? buffer.metrics[metricOffset + index] : fallback;
}

function pressureFieldsFromBuffer(buffer: HillOfHillsTerrainBuffer, metricOffset: number): HillOfHillsPressureFieldSample {
  return {
    slope: optionalMetric(buffer, metricOffset, 'slopePressure', metric(buffer, metricOffset, 'slope')),
    curvature: optionalMetric(buffer, metricOffset, 'curvaturePressure', 0),
    ridge: optionalMetric(buffer, metricOffset, 'ridgePressure', 0),
    valley: optionalMetric(buffer, metricOffset, 'valleyPressure', 0),
    saddle: optionalMetric(buffer, metricOffset, 'saddlePressure', 0),
    basin: optionalMetric(buffer, metricOffset, 'basinPressure', 0),
    exposure: optionalMetric(buffer, metricOffset, 'exposurePressure', 0),
    route: metric(buffer, metricOffset, 'routePressure'),
    erosion: optionalMetric(buffer, metricOffset, 'erosionPressure', 0),
    bloom: optionalMetric(buffer, metricOffset, 'bloomPressure', 0),
    strata: optionalMetric(buffer, metricOffset, 'strataPressure', 0),
    vegetation: optionalMetric(buffer, metricOffset, 'vegetationPressure', 0)
  };
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
  return applyPhaseToStableHeightParts(params, x, stableHeightAt(params, x, z), phaseInfluenceAt(phaseState, x, z, params));
}

function stableHeightAt(params: HillOfHillsTerrainParams, x: number, z: number): HeightParts {
  const halfFloor = params.floorWidth * 0.5;
  const lateral = Math.abs(x);
  const uphill = (z + params.length * 0.5) / params.length;
  const base = 0.34 + uphill * 0.66;
  const wallT = smoothstep(halfFloor, params.channelRadius, lateral);
  const cylindricalLift = 1 - Math.sqrt(Math.max(0, 1 - wallT * wallT));
  const wall = params.wallHeight * Math.pow(cylindricalLift, 0.8 / params.channelCurvature);
  const gutter = 0;
  const floorProtection = 1 - smoothstep(halfFloor * 0.45, halfFloor * 0.95, lateral);
  const hillFeatures = terrainFeatures(params, 'hill');
  const valleyFeatures = terrainFeatures(params, 'valley');
  const featureDistanceScale = params.distanceScale / params.featureSpacing;
  const hills = featureContribution(hillFeatures, x, z, featureDistanceScale);
  const valleys = featureContribution(valleyFeatures, x, z, featureDistanceScale);
  const macroDamping = 1 - floorProtection * 0.44;
  const valleyFloorDamping = 1 - floorProtection * 0.34;
  const textureAmplitude = 0.18 * (1 - params.textureDamping);
  const detailAmplitude = 0.1 * (1 - params.detailDamping);
  const detail =
    textureAmplitude * Math.sin((x * 1.55 + z * 0.42 + params.seed * 0.001) * params.textureScale) +
    detailAmplitude * Math.cos((x * 3.6 - z * 2.1 + params.seed * 0.002) * params.textureScale);
  const openFloor = base + wall + gutter + hills * macroDamping - valleys * valleyFloorDamping + detail;
  const height = openFloor;

  return {
    base,
    wall,
    gutter,
    hills,
    valleys,
    detail,
    phaseDitch: 0,
    phaseTopology: 0,
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
  const rawPhaseTopology =
    phaseInfluence.topologyHeightDelta * (0.8 + params.hillHeight * 0.22 + params.valleyHeight * 0.18);
  const topologyLimit = 0.78;
  const phaseTopology = Math.tanh(rawPhaseTopology / topologyLimit) * topologyLimit;
  const floorProtection = 1 - smoothstep(halfFloor * 0.45, halfFloor * 0.95, lateral);
  const macroDamping = 1 - floorProtection * 0.44;
  const valleyFloorDamping = 1 - floorProtection * 0.34;
  const openFloor =
    stableParts.base +
    stableParts.wall +
    stableParts.gutter +
    stableParts.hills * macroDamping -
    stableParts.valleys * valleyFloorDamping +
    stableParts.detail -
    phaseDitch +
    phaseTopology;
  const height = openFloor;

  return {
    base: stableParts.base,
    wall: stableParts.wall,
    gutter: stableParts.gutter,
    hills: stableParts.hills,
    valleys: stableParts.valleys,
    detail: stableParts.detail,
    phaseDitch,
    phaseTopology,
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
  const surfaceDetailCounts: Partial<Record<HillOfHillsSurfaceDetailKind, number>> = {};
  const materialEdgeCounts: Partial<Record<HillOfHillsMaterialEdgeKind, number>> = {};
  const surfaceAnchorCounts: Partial<Record<HillOfHillsSurfaceAnchorKind, number>> = {};
  const phaseInfluenceKinds: Partial<Record<HillOfHillsPhaseInfluenceKind, number>> = {};
  const topologyRanges = createTopologyRanges();
  const pressureFieldRanges = createPressureFieldRanges();
  const pressureFieldComfort = createPressureFieldComfort();
  const phaseInfluenceRange = createRange();
  const trailInfluenceRange = createRange();
  const sideDitchInfluenceRange = createRange();
  const topologyInfluenceRange = createRange();
  const topologyDeformationRange = createRange();
  const topologyVelocityRange = createRange();
  const topologyForceRange = createRange();
  const topologyGrossForceRange = createRange();
  const topologyOpposedForceRange = createRange();
  const topologyContentionRange = createRange();
  const hillSwellMembershipRange = createRange();
  const hillSlumpMembershipRange = createRange();
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
    surfaceDetailCounts[sample.surfaceDetail.kind] = (surfaceDetailCounts[sample.surfaceDetail.kind] ?? 0) + 1;
    materialEdgeCounts[sample.materialEdge.kind] = (materialEdgeCounts[sample.materialEdge.kind] ?? 0) + 1;
    surfaceAnchorCounts[sample.materialEdge.anchor] = (surfaceAnchorCounts[sample.materialEdge.anchor] ?? 0) + 1;
    phaseInfluenceKinds[sample.phaseInfluence.kind] = (phaseInfluenceKinds[sample.phaseInfluence.kind] ?? 0) + 1;
    includeInRange(phaseInfluenceRange, sample.phaseInfluence.amount);
    includeInRange(trailInfluenceRange, sample.phaseInfluence.trailAmount);
    includeInRange(sideDitchInfluenceRange, sample.phaseInfluence.sideDitchAmount);
    includeInRange(topologyInfluenceRange, sample.phaseInfluence.topologyAmount);
    includeInRange(topologyDeformationRange, sample.phaseInfluence.topologyDeformation);
    includeInRange(topologyVelocityRange, sample.phaseInfluence.topologyVelocity);
    includeInRange(topologyForceRange, sample.phaseInfluence.topologyForce);
    includeInRange(topologyGrossForceRange, sample.phaseInfluence.topologyGrossForce);
    includeInRange(topologyOpposedForceRange, sample.phaseInfluence.topologyOpposedForce);
    includeInRange(topologyContentionRange, sample.phaseInfluence.topologyContention);
    includeInRange(hillSwellMembershipRange, sample.phaseInfluence.semanticMemberships.hill_swell ?? 0);
    includeInRange(hillSlumpMembershipRange, sample.phaseInfluence.semanticMemberships.hill_slump ?? 0);
    includeInRange(topologyRanges.flowAccumulation, sample.topology.flowAccumulation);
    includeInRange(topologyRanges.ridgeStrength, sample.topology.ridgeStrength);
    includeInRange(topologyRanges.valleyStrength, sample.topology.valleyStrength);
    includeInRange(topologyRanges.routePressure, sample.topology.routePressure);
    includeInRange(topologyRanges.ditchPotential, sample.topology.ditchPotential);
    includeInRange(topologyRanges.growthPotential, sample.topology.growthPotential);
    for (const pressureKind of HILL_OF_HILLS_PRESSURE_FIELD_KINDS) {
      const value = sample.pressure[pressureKind];
      includeInRange(pressureFieldRanges[pressureKind], value);
      includePressureFieldComfort(pressureFieldComfort[pressureKind], value);
    }
  }

  const producerTrafficField =
    phaseState.producerTrafficField ??
    phaseState.persistentTopologyField?.producerTrafficField ??
    emptyProducerTrafficFieldFor(params);

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
    topologyPhaseClock: phaseState.topologyPhaseClock,
    topologyPhaseProgress: phaseState.topologyPhaseProgress,
    phaseChecksum: phaseState.checksum,
    phaseInfluenceChecksum: checksumParts(samples.map((sample) => phaseInfluenceSignature(sample))),
    phaseInfluenceRange,
    trailInfluenceRange,
    sideDitchInfluenceRange,
    topologyInfluenceRange,
    topologyDynamicsMode: phaseState.topologyDynamicsMode,
    topologyPossibilityMode: phaseState.topologyPossibilityMode,
    topologyPossibilityChecksum: phaseState.topologyPossibilityChecksum,
    topologyPossibilityRange: phaseState.topologyPossibilityRange,
    producerTrafficFieldSchema: producerTrafficField.schema,
    producerTrafficSourceLineageKey: producerTrafficField.sourceLineageKey,
    producerTrafficFieldChecksum: producerTrafficField.checksum,
    producerTrafficFieldRange: producerTrafficField.range,
    producerTrafficAdmittedEpisodeCount: producerTrafficField.admittedEpisodeCount,
    producerTrafficStanceContactCount: producerTrafficField.stanceContactCount,
    producerTrafficSupportedRootSampleCount: producerTrafficField.supportedRootSampleCount,
    producerTrafficExposureSeconds: producerTrafficField.exposureSeconds,
    topologyDynamicsChecksum: checksumParts(samples.map((sample) => topologyDynamicsSignature(sample))),
    topologyDynamicsIntegrationOriginMs: phaseState.persistentTopologyField?.integrationOriginMs ?? 0,
    topologyDeformationRange: settledRange(topologyDeformationRange),
    topologyVelocityRange: settledRange(topologyVelocityRange),
    topologyForceRange: settledRange(topologyForceRange),
    topologyGrossForceRange: settledRange(topologyGrossForceRange),
    topologyOpposedForceRange: settledRange(topologyOpposedForceRange),
    topologyContentionRange: settledRange(topologyContentionRange),
    hillSwellMembershipRange: settledRange(hillSwellMembershipRange),
    hillSlumpMembershipRange: settledRange(hillSlumpMembershipRange),
    phaseInfluenceKinds,
    trailSeedMethod: phaseState.trailSeedMethod,
    trailCandidateChecksum: phaseState.trailCandidateChecksum,
    trailCandidateScoreRange: phaseState.trailCandidateScoreRange,
    selectedTrailScoreRange: phaseState.selectedTrailScoreRange,
    topologyEventVocabulary: HILL_OF_HILLS_TOPOLOGY_EVENT_KINDS,
    topologyEventCandidateChecksum: phaseState.topologyEventCandidateChecksum,
    topologyEventCandidateScoreRange: phaseState.topologyEventCandidateScoreRange,
    selectedTopologyEventScoreRange: phaseState.selectedTopologyEventScoreRange,
    topologyEventDebug: phaseState.activeEpisodes
      .map((episode) => episode.topologyEvent)
      .filter((event): event is HillOfHillsTopologyEventDebug => Boolean(event)),
    topologyRanges,
    pressureFieldVocabulary: HILL_OF_HILLS_PRESSURE_FIELD_KINDS,
    pressureFieldChecksum: checksumParts(samples.map((sample) => pressureFieldSignature(sample))),
    pressureFieldRanges,
    pressureFieldComfort,
    proxyMaterialCounts,
    surfaceDetailChecksum: checksumParts(samples.map((sample) => surfaceDetailSignature(sample))),
    surfaceDetailCounts,
    materialEdgeChecksum: checksumParts(samples.map((sample) => materialEdgeSignature(sample))),
    materialEdgeCounts,
    surfaceAnchorCounts
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
    sample.phaseInfluence.sideDitchAmount.toFixed(3),
    sample.phaseInfluence.topologyAmount.toFixed(3),
    sample.phaseInfluence.topologyHeightDelta.toFixed(3),
    sample.phaseInfluence.topologyDeformation.toFixed(3),
    sample.phaseInfluence.topologyVelocity.toFixed(3),
    sample.phaseInfluence.topologyForce.toFixed(3),
    sample.phaseInfluence.topologyGrossForce.toFixed(3),
    sample.phaseInfluence.topologyOpposedForce.toFixed(3),
    sample.phaseInfluence.topologyContention.toFixed(3),
    (sample.phaseInfluence.semanticMemberships.hill_swell ?? 0).toFixed(3),
    (sample.phaseInfluence.semanticMemberships.hill_slump ?? 0).toFixed(3)
  ].join(':');
}

function topologyDynamicsSignature(sample: HillOfHillsTerrainSample): string {
  return [
    sample.id,
    sample.phaseInfluence.topologyDeformation.toFixed(4),
    sample.phaseInfluence.topologyVelocity.toFixed(4),
    sample.phaseInfluence.topologyForce.toFixed(4),
    sample.phaseInfluence.topologyGrossForce.toFixed(4),
    sample.phaseInfluence.topologyOpposedForce.toFixed(4),
    sample.phaseInfluence.topologyContention.toFixed(4),
    (sample.phaseInfluence.semanticMemberships.hill_swell ?? 0).toFixed(4),
    (sample.phaseInfluence.semanticMemberships.hill_slump ?? 0).toFixed(4)
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

const PRESSURE_FIELD_COMFORT_TARGETS: Record<HillOfHillsPressureFieldKind, Range> = {
  slope: { min: 0.05, max: 0.75 },
  curvature: { min: 0.08, max: 0.86 },
  ridge: { min: 0.05, max: 0.9 },
  valley: { min: 0.05, max: 0.9 },
  saddle: { min: 0.02, max: 0.7 },
  basin: { min: 0.04, max: 0.86 },
  exposure: { min: 0.04, max: 0.86 },
  route: { min: 0.04, max: 0.82 },
  erosion: { min: 0.04, max: 0.88 },
  bloom: { min: 0.06, max: 0.92 },
  strata: { min: 0.03, max: 0.82 },
  vegetation: { min: 0.08, max: 0.95 }
};

function createPressureFieldRanges(): Record<HillOfHillsPressureFieldKind, Range> {
  return mapPressureFieldKinds(() => createRange());
}

function createPressureFieldComfort(): Record<HillOfHillsPressureFieldKind, HillOfHillsPressureFieldComfortBand> {
  return mapPressureFieldKinds((kind) => ({
    target: { ...PRESSURE_FIELD_COMFORT_TARGETS[kind] },
    below: 0,
    inside: 0,
    above: 0,
    maxViolation: 0
  }));
}

function includePressureFieldComfort(band: HillOfHillsPressureFieldComfortBand, value: number): void {
  if (value < band.target.min) {
    band.below += 1;
    band.maxViolation = Math.max(band.maxViolation, Math.min(1, band.target.min - value));
    return;
  }
  if (value > band.target.max) {
    band.above += 1;
    band.maxViolation = Math.max(band.maxViolation, Math.min(1, value - band.target.max));
    return;
  }
  band.inside += 1;
}

function pressureFieldSignature(sample: HillOfHillsTerrainSample): string {
  return [
    sample.id,
    ...HILL_OF_HILLS_PRESSURE_FIELD_KINDS.map((kind) => `${kind}:${sample.pressure[kind].toFixed(3)}`)
  ].join(':');
}

function mapPressureFieldKinds<T>(create: (kind: HillOfHillsPressureFieldKind) => T): Record<HillOfHillsPressureFieldKind, T> {
  return Object.fromEntries(HILL_OF_HILLS_PRESSURE_FIELD_KINDS.map((kind) => [kind, create(kind)])) as Record<HillOfHillsPressureFieldKind, T>;
}

function surfaceDetailSignature(sample: HillOfHillsTerrainSample): string {
  return [
    sample.id,
    sample.surfaceDetail.kind,
    sample.surfaceDetail.density.toFixed(3),
    sample.surfaceDetail.edgeMix.toFixed(3),
    sample.surfaceDetail.seed
  ].join(':');
}

function materialEdgeSignature(sample: HillOfHillsTerrainSample): string {
  return [
    sample.id,
    sample.materialEdge.kind,
    sample.materialEdge.anchor,
    sample.materialEdge.strength.toFixed(3),
    sample.materialEdge.dissolve.toFixed(3),
    sample.materialEdge.seed
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

    const persistentField = phaseState.persistentTopologyField;
    if (phaseState.topologyDynamicsMode === 'persistent_pressure' && persistentField) {
      for (let fieldZ = 0; fieldZ < persistentField.zCount; fieldZ += 1) {
        for (let fieldX = 0; fieldX < persistentField.xCount; fieldX += 1) {
          const fieldIndex = fieldZ * persistentField.xCount + fieldX;
          if (
            Math.abs(persistentField.deformation[fieldIndex]) <= 0.0005 &&
            Math.abs(persistentField.velocity[fieldIndex]) <= 0.0005 &&
            Math.abs(persistentField.force[fieldIndex]) <= 0.0005
          ) {
            continue;
          }
          const sampleX = Math.round((fieldX / Math.max(1, persistentField.xCount - 1)) * (params.gridResolutionX - 1));
          const sampleZ = Math.round((fieldZ / Math.max(1, persistentField.zCount - 1)) * (params.gridResolutionZ - 1));
          const tileX = clampInt(Math.floor(sampleX / tileSize.x), 0, tileColumns - 1);
          const tileZ = clampInt(Math.floor(sampleZ / tileSize.z), 0, tileRows - 1);
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

function detailSeedFor(seedOrConfig: number | string, x: number, z: number, kind: string): number {
  return parseInt(checksum(`${seedOrConfig}:${roundId(x)}:${roundId(z)}:${kind}`), 16) >>> 0;
}

function seededUnit(seed: number): number {
  return (seed >>> 0) / 0xffffffff;
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
