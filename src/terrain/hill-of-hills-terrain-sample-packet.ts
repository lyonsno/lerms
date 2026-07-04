import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  createHillOfHillsLayerTileCache,
  createHillOfHillsTerrainBuffer,
  createHillOfHillsTerrainWithCache,
  defaultHillOfHillsParams,
  type HillOfHillsTerrain,
  type HillOfHillsTerrainBuffer,
  type HillOfHillsTerrainBufferMetricChannel,
  type HillOfHillsTerrainParams,
  type HillOfHillsProxyMaterialKind,
  type HillOfHillsSourceOptions
} from './hill-of-hills.js';
import type { SimulationAuthority, SourceTruth } from '../contracts/first-vertical.js';

export const KAMINOS_PREVIEW_BENCH_TERRAIN_SAMPLE_PACKET_SCHEMA = 'kaminos.preview-bench.terrain-sample-packet.v0' as const;
export const HILL_OF_HILLS_TERRAIN_SAMPLE_DATA_SCHEMA = 'lerms.hill-of-hills.terrain-sample-data.v0' as const;
export const HILL_OF_HILLS_MOTION_AFFORDANCE_PACKET_SCHEMA = 'lerms.hill-of-hills.motion-affordance-packet.v0' as const;
export const HILL_OF_HILLS_MOTION_AFFORDANCE_DATA_SCHEMA = 'lerms.hill-of-hills.motion-affordance-data.v0' as const;

export interface HillTerrainSamplePacketSourceRef {
  repo: string;
  branch?: string;
  commit?: string;
  path?: string;
}

export interface HillTerrainSamplePacketOptions {
  packetPath?: string;
  dataPath?: string;
  dataFetchUrl?: string;
  sourceRef?: HillTerrainSamplePacketSourceRef;
  generatedAt?: string;
  observedAt?: string;
}

export interface KaminosPreviewBenchTerrainSamplePacket {
  ok: true;
  schema: typeof KAMINOS_PREVIEW_BENCH_TERRAIN_SAMPLE_PACKET_SCHEMA;
  route: 'kaminos/preview-bench/terrain-sample-file';
  frameId: string;
  label: 'Hill raw terrain sample for Big Papa';
  generatedAt: string;
  observedAt: string;
  status: 'fresh-live-terrain-sample' | 'stale-terrain-sample';
  freshnessBudgetMs: number;
  source: {
    authority: SimulationAuthority;
    producerDiaulos: 'hill-of-hills-fucker';
    sourceRef: string;
    sourceRefDetail: HillTerrainSamplePacketSourceRef;
    route: 'lerms/hill-of-hills/terrain-sample-packet-file';
    configId?: string;
    backend?: string;
  };
  freshness: {
    observedAt: string;
    generatedAt: string;
    budgetMs: number;
    status: 'fresh-live-terrain-sample' | 'stale-terrain-sample';
    sampleAgeMs: number;
  };
  acceptanceSurface: {
    id: 'preview-bench-terrain-sample-contract';
    route: 'kaminos/preview-bench/terrain-sample-file';
    worldChamberId: 'lerms-underhill';
    posture: 'inspect';
    bench: 'terrain-preview';
    routeQuery: 'world_chamber=lerms-underhill&posture=inspect&bench=terrain-preview';
  };
  terrainSample: HillOfHillsTerrainSamplePacketSummary;
  terrainSampleData: HillOfHillsTerrainSampleData;
  rejectedDebugSurfaces: readonly {
    id: string;
    route: string;
    acceptanceSurface: false;
    reason: string;
  }[];
  custody: {
    sourceOwns: readonly string[];
    kaminosOwns: readonly string[];
    bigPapaOwns: readonly string[];
  };
}

export interface HillOfHillsMotionAffordancePacket {
  ok: true;
  schema: typeof HILL_OF_HILLS_MOTION_AFFORDANCE_PACKET_SCHEMA;
  route: 'lerms/hill-of-hills/motion-affordance-packet-file';
  frameId: string;
  label: 'Hill terrain motion affordance packet for Mushfinger';
  generatedAt: string;
  observedAt: string;
  status: 'fresh-live-motion-affordance' | 'stale-motion-affordance';
  freshnessBudgetMs: number;
  source: {
    authority: SimulationAuthority;
    producerDiaulos: 'hill-of-hills-fucker';
    intendedConsumerDiaulos: 'mushfinger-clayfucker';
    sourceRef: string;
    sourceRefDetail: HillTerrainSamplePacketSourceRef;
    route: 'lerms/hill-of-hills/motion-affordance-packet-file';
    configId?: string;
    backend?: string;
  };
  freshness: {
    observedAt: string;
    generatedAt: string;
    budgetMs: number;
    status: 'fresh-live-motion-affordance' | 'stale-motion-affordance';
    sampleAgeMs: number;
  };
  affordance: HillOfHillsMotionAffordanceSummary;
  motionAffordanceData: HillOfHillsMotionAffordanceData;
  rejectedDebugSurfaces: readonly {
    id: string;
    route: string;
    acceptanceSurface: false;
    reason: string;
  }[];
  custody: {
    sourceOwns: readonly string[];
    mushfingerOwns: readonly string[];
    bigPapaOwns: readonly string[];
    kaminosOwns: readonly string[];
  };
}

export interface HillOfHillsTerrainSamplePacketSummary {
  schema: 'lerms.terrain-sample.v0';
  route: 'lerms/hill-of-hills/terrain-sample-fetch';
  label: 'Hill terrain sample grid';
  sourceTruth: SourceTruth;
  grid: {
    columns: number;
    rows: number;
    sampleCount: number;
    spacing: {
      x: number;
      z: number;
    };
  };
  worldBounds: {
    x: {
      min: number;
      max: number;
    };
    y: {
      min: number;
      max: number;
    };
    z: {
      min: number;
      max: number;
    };
    label: string;
  };
  domainBounds: {
    u: {
      min: number;
      max: number;
    };
    v: {
      min: number;
      max: number;
    };
  };
  heightRange: {
    min: number;
    max: number;
  };
  channelLayout: readonly ['height', 'normal', 'gradient', 'heightDelta', 'surfaceVelocity'];
  transport: {
    kind: 'source-owned-fetch-url';
    encoding: 'json-base64-f32-le';
    fetchUrl: string;
    dataPath: string;
    byteOrder: 'little-endian';
    byteLengths: {
      height: number;
      normal: number;
      gradient: number;
      heightDelta: number;
      surfaceVelocity: number;
    };
  };
  checksums: {
    supportFrame: string;
    topology: string;
    sample: string;
    channels: string;
  };
  fields: readonly {
    label: string;
    value: string | number;
  }[];
}

export interface HillOfHillsTerrainSampleData {
  schema: typeof HILL_OF_HILLS_TERRAIN_SAMPLE_DATA_SCHEMA;
  sourceTruth: SourceTruth;
  grid: HillOfHillsTerrainSamplePacketSummary['grid'];
  worldBounds: HillOfHillsTerrainSamplePacketSummary['worldBounds'];
  domainBounds: HillOfHillsTerrainSamplePacketSummary['domainBounds'];
  checksums: HillOfHillsTerrainSamplePacketSummary['checksums'];
  channels: Record<HillTerrainSampleChannelName, HillTerrainSampleEncodedChannel>;
}

export type HillTerrainSampleChannelName = 'height' | 'normal' | 'gradient' | 'heightDelta' | 'surfaceVelocity';

export interface HillOfHillsMotionAffordanceSummary {
  schema: 'lerms.hill-of-hills.motion-affordance-summary.v0';
  route: 'lerms/hill-of-hills/motion-affordance-fetch';
  label: 'Hill terrain affordance grid';
  sourceTruth: SourceTruth;
  intentEvidenceOnly: true;
  grid: HillOfHillsTerrainSamplePacketSummary['grid'];
  worldBounds: HillOfHillsTerrainSamplePacketSummary['worldBounds'];
  domainBounds: HillOfHillsTerrainSamplePacketSummary['domainBounds'];
  supportFrame: {
    supportEpoch: number;
    topologyEpoch: number;
    checksum: string;
    supportClass: string;
    mappingMode: string;
    maxHeightDelta: number;
    maxSurfaceSpeed: number;
  };
  phase: {
    mode: string;
    terrainEpoch: number;
    activePhaseCount: number;
    phaseClock: number;
    phaseProgress: number;
    phaseChecksum: string;
    phaseInfluenceChecksum: string;
  };
  dirty: {
    dirtyTileCount: number;
    dirtySampleCount: number;
    dirtyRegionChecksum: string;
    dirtyLayerKinds: readonly string[];
  };
  shock: {
    classCounts: Partial<Record<string, number>>;
    motionClassCounts: Partial<Record<string, number>>;
  };
  ranges: {
    routePressure: HillOfHillsTerrainSamplePacketSummary['heightRange'];
    flowAccumulation: HillOfHillsTerrainSamplePacketSummary['heightRange'];
    ridgeStrength: HillOfHillsTerrainSamplePacketSummary['heightRange'];
    valleyStrength: HillOfHillsTerrainSamplePacketSummary['heightRange'];
    ditchPotential: HillOfHillsTerrainSamplePacketSummary['heightRange'];
    growthPotential: HillOfHillsTerrainSamplePacketSummary['heightRange'];
    phaseAmount: HillOfHillsTerrainSamplePacketSummary['heightRange'];
    motionHint: HillOfHillsTerrainSamplePacketSummary['heightRange'];
    assetHint: HillOfHillsTerrainSamplePacketSummary['heightRange'];
  };
  channelLayout: readonly HillMotionAffordanceChannelName[];
  transport: {
    kind: 'source-owned-fetch-url';
    encoding: 'json-base64-f32-le';
    fetchUrl: string;
    dataPath: string;
    byteOrder: 'little-endian';
    byteLengths: Record<HillMotionAffordanceChannelName, number>;
  };
  checksums: {
    supportFrame: string;
    topology: string;
    material: string;
    phase: string;
    phaseInfluence: string;
    dirtyRegion: string;
    channels: string;
  };
  fields: readonly {
    label: string;
    value: string | number;
  }[];
}

export interface HillOfHillsMotionAffordanceData {
  schema: typeof HILL_OF_HILLS_MOTION_AFFORDANCE_DATA_SCHEMA;
  sourceTruth: SourceTruth;
  intentEvidenceOnly: true;
  grid: HillOfHillsTerrainSamplePacketSummary['grid'];
  worldBounds: HillOfHillsTerrainSamplePacketSummary['worldBounds'];
  domainBounds: HillOfHillsTerrainSamplePacketSummary['domainBounds'];
  checksums: HillOfHillsMotionAffordanceSummary['checksums'];
  channelLayout: readonly HillMotionAffordanceChannelName[];
  channels: Record<HillMotionAffordanceChannelName, HillTerrainSampleEncodedChannel>;
}

export type HillMotionAffordanceChannelName =
  | 'height'
  | 'normal'
  | 'gradient'
  | 'slope'
  | 'heightDelta'
  | 'surfaceVelocity'
  | 'routePressure'
  | 'flowAccumulation'
  | 'ridgeStrength'
  | 'valleyStrength'
  | 'ditchPotential'
  | 'growthPotential'
  | 'phaseAmount'
  | 'topologyAmount'
  | 'wetness'
  | 'growthTint'
  | 'materialClass'
  | 'regionClass'
  | 'motionHint'
  | 'assetHint'
  | 'dirty'
  | 'shock';

export interface HillTerrainSampleEncodedChannel {
  encoding: 'base64-f32-le';
  components: readonly string[];
  shape: readonly number[];
  byteLength: number;
  checksum: string;
  data: string;
}

const DEFAULT_PACKET_PATH = '/private/tmp/lerms-hill-of-hills-terrain-sample-packet.json';
const DEFAULT_DATA_PATH = '/private/tmp/lerms-hill-of-hills-terrain-sample-data.json';
const DEFAULT_MOTION_AFFORDANCE_PACKET_PATH = '/private/tmp/lerms-hill-of-hills-motion-affordance-packet.json';
const DEFAULT_MOTION_AFFORDANCE_DATA_PATH = '/private/tmp/lerms-hill-of-hills-motion-affordance-data.json';
const DEFAULT_DATA_FETCH_URL = '/api/read?root=lerms-preview&path=lerms-hill-of-hills-terrain-sample-data.json';
const DEFAULT_MOTION_AFFORDANCE_DATA_FETCH_URL = '/api/read?root=lerms-preview&path=lerms-hill-of-hills-motion-affordance-data.json';
const FRESH_BUDGET_MS = 900_000;
const MOTION_AFFORDANCE_CHANNEL_LAYOUT: readonly HillMotionAffordanceChannelName[] = [
  'height',
  'normal',
  'gradient',
  'slope',
  'heightDelta',
  'surfaceVelocity',
  'routePressure',
  'flowAccumulation',
  'ridgeStrength',
  'valleyStrength',
  'ditchPotential',
  'growthPotential',
  'phaseAmount',
  'topologyAmount',
  'wetness',
  'growthTint',
  'materialClass',
  'regionClass',
  'motionHint',
  'assetHint',
  'dirty',
  'shock'
];

export function createHillOfHillsTerrainSamplePacket(
  terrain: HillOfHillsTerrain,
  options: HillTerrainSamplePacketOptions = {}
): KaminosPreviewBenchTerrainSamplePacket {
  const buffer = createHillOfHillsTerrainBuffer(terrain);
  const dataPath = options.dataPath ?? DEFAULT_DATA_PATH;
  const dataFetchUrl = options.dataFetchUrl ?? DEFAULT_DATA_FETCH_URL;
  const generatedAt = options.generatedAt ?? new Date(terrain.source.timestampMs || Date.now()).toISOString();
  const observedAt = options.observedAt ?? generatedAt;
  const sourceRef = options.sourceRef ?? sourceRefFromEnvironment();
  const channels = terrainSampleChannels(buffer);
  const channelChecksum = checksumParts(Object.values(channels).map((channel) => channel.checksum));
  const checksums = {
    supportFrame: terrain.witness.supportFrame.supportFrameChecksum,
    topology: terrain.witness.topologyChecksum,
    sample: terrain.witness.sampleChecksum,
    channels: channelChecksum
  };
  const grid = {
    columns: buffer.gridResolution.x,
    rows: buffer.gridResolution.z,
    sampleCount: buffer.sampleCount,
    spacing: terrain.witness.sampleSpacing
  };
  const worldBounds = {
    x: terrain.witness.supportFrame.worldBounds.x,
    y: terrain.witness.heightRange,
    z: terrain.witness.supportFrame.worldBounds.z,
    label: `x:${terrain.witness.supportFrame.worldBounds.x.min}..${terrain.witness.supportFrame.worldBounds.x.max} z:${terrain.witness.supportFrame.worldBounds.z.min}..${terrain.witness.supportFrame.worldBounds.z.max} y:${terrain.witness.heightRange.min}..${terrain.witness.heightRange.max}`
  };
  const domainBounds = terrain.witness.supportFrame.domainBounds;
  const terrainSample: HillOfHillsTerrainSamplePacketSummary = {
    schema: 'lerms.terrain-sample.v0',
    route: 'lerms/hill-of-hills/terrain-sample-fetch',
    label: 'Hill terrain sample grid',
    sourceTruth: terrain.source,
    grid,
    worldBounds,
    domainBounds,
    heightRange: terrain.witness.heightRange,
    channelLayout: ['height', 'normal', 'gradient', 'heightDelta', 'surfaceVelocity'],
    transport: {
      kind: 'source-owned-fetch-url',
      encoding: 'json-base64-f32-le',
      fetchUrl: dataFetchUrl,
      dataPath,
      byteOrder: 'little-endian',
      byteLengths: {
        height: channels.height.byteLength,
        normal: channels.normal.byteLength,
        gradient: channels.gradient.byteLength,
        heightDelta: channels.heightDelta.byteLength,
        surfaceVelocity: channels.surfaceVelocity.byteLength
      }
    },
    checksums,
    fields: terrainSampleFields(terrain, dataFetchUrl, channelChecksum)
  };
  const terrainSampleData: HillOfHillsTerrainSampleData = {
    schema: HILL_OF_HILLS_TERRAIN_SAMPLE_DATA_SCHEMA,
    sourceTruth: terrain.source,
    grid,
    worldBounds,
    domainBounds,
    checksums,
    channels
  };
  const sampleAgeMs = terrain.source.sampleAgeMs ?? 0;

  return {
    ok: true,
    schema: KAMINOS_PREVIEW_BENCH_TERRAIN_SAMPLE_PACKET_SCHEMA,
    route: 'kaminos/preview-bench/terrain-sample-file',
    frameId: terrain.source.frameId,
    label: 'Hill raw terrain sample for Big Papa',
    generatedAt,
    observedAt,
    status: sampleAgeMs <= FRESH_BUDGET_MS ? 'fresh-live-terrain-sample' : 'stale-terrain-sample',
    freshnessBudgetMs: FRESH_BUDGET_MS,
    source: {
      authority: terrain.source.authority,
      producerDiaulos: 'hill-of-hills-fucker',
      sourceRef: sourceRefLabel(sourceRef),
      sourceRefDetail: sourceRef,
      route: 'lerms/hill-of-hills/terrain-sample-packet-file',
      configId: terrain.source.configId,
      backend: terrain.source.backend
    },
    freshness: {
      observedAt,
      generatedAt,
      budgetMs: FRESH_BUDGET_MS,
      status: sampleAgeMs <= FRESH_BUDGET_MS ? 'fresh-live-terrain-sample' : 'stale-terrain-sample',
      sampleAgeMs
    },
    acceptanceSurface: {
      id: 'preview-bench-terrain-sample-contract',
      route: 'kaminos/preview-bench/terrain-sample-file',
      worldChamberId: 'lerms-underhill',
      posture: 'inspect',
      bench: 'terrain-preview',
      routeQuery: 'world_chamber=lerms-underhill&posture=inspect&bench=terrain-preview'
    },
    terrainSample,
    terrainSampleData,
    rejectedDebugSurfaces: [
      {
        id: 'hill-local-canvas-debug',
        route: 'http://127.0.0.1:5187/',
        acceptanceSurface: false,
        reason: 'local Vite canvas is an operator/debug preview, not the Kaminos terrain sample packet acceptance surface'
      }
    ],
    custody: {
      sourceOwns: [
        'terrain sample channels',
        'terrain source truth',
        'terrain generation',
        'support-frame semantics',
        'channel checksums'
      ],
      kaminosOwns: [
        'host display',
        'terrain-sample packet mounting',
        'route/source/fallback badges',
        'browser witness capture'
      ],
      bigPapaOwns: [
        'finger-juice collision coupling',
        'fluid solver interpretation',
        'reservoir/domain semantics'
      ]
    }
  };
}

export function createHillOfHillsMotionAffordancePacket(
  terrain: HillOfHillsTerrain,
  options: HillTerrainSamplePacketOptions = {}
): HillOfHillsMotionAffordancePacket {
  const dataPath = options.dataPath ?? DEFAULT_MOTION_AFFORDANCE_DATA_PATH;
  const dataFetchUrl = options.dataFetchUrl ?? DEFAULT_MOTION_AFFORDANCE_DATA_FETCH_URL;
  const generatedAt = options.generatedAt ?? new Date(terrain.source.timestampMs || Date.now()).toISOString();
  const observedAt = options.observedAt ?? generatedAt;
  const sourceRef = options.sourceRef ?? sourceRefFromEnvironment();
  const channels = motionAffordanceChannels(terrain);
  const channelChecksum = checksumParts(Object.values(channels).map((channel) => channel.checksum));
  const checksums = {
    supportFrame: terrain.witness.supportFrame.supportFrameChecksum,
    topology: terrain.witness.topologyChecksum,
    material: terrain.witness.proxyMaterialChecksum,
    phase: terrain.witness.phaseChecksum,
    phaseInfluence: terrain.witness.phaseInfluenceChecksum,
    dirtyRegion: terrain.witness.dirtyRegionChecksum,
    channels: channelChecksum
  };
  const grid = {
    columns: terrain.witness.gridResolution.x,
    rows: terrain.witness.gridResolution.z,
    sampleCount: terrain.witness.sampleCount,
    spacing: terrain.witness.sampleSpacing
  };
  const worldBounds = {
    x: terrain.witness.supportFrame.worldBounds.x,
    y: terrain.witness.heightRange,
    z: terrain.witness.supportFrame.worldBounds.z,
    label: `x:${terrain.witness.supportFrame.worldBounds.x.min}..${terrain.witness.supportFrame.worldBounds.x.max} z:${terrain.witness.supportFrame.worldBounds.z.min}..${terrain.witness.supportFrame.worldBounds.z.max} y:${terrain.witness.heightRange.min}..${terrain.witness.heightRange.max}`
  };
  const domainBounds = terrain.witness.supportFrame.domainBounds;
  const motionHint = decodeF32Channel(channels.motionHint);
  const assetHint = decodeF32Channel(channels.assetHint);
  const phaseAmount = decodeF32Channel(channels.phaseAmount);
  const affordance: HillOfHillsMotionAffordanceSummary = {
    schema: 'lerms.hill-of-hills.motion-affordance-summary.v0',
    route: 'lerms/hill-of-hills/motion-affordance-fetch',
    label: 'Hill terrain affordance grid',
    sourceTruth: terrain.source,
    intentEvidenceOnly: true,
    grid,
    worldBounds,
    domainBounds,
    supportFrame: {
      supportEpoch: terrain.witness.supportFrame.supportEpoch,
      topologyEpoch: terrain.witness.supportFrame.topologyEpoch,
      checksum: terrain.witness.supportFrame.supportFrameChecksum,
      supportClass: terrain.witness.supportFrame.supportClass,
      mappingMode: terrain.witness.supportFrame.mappingMode,
      maxHeightDelta: terrain.witness.supportFrame.maxHeightDelta,
      maxSurfaceSpeed: terrain.witness.supportFrame.maxSurfaceSpeed
    },
    phase: {
      mode: terrain.witness.phaseMode,
      terrainEpoch: terrain.witness.terrainEpoch,
      activePhaseCount: terrain.witness.activePhaseCount,
      phaseClock: terrain.witness.phaseClock,
      phaseProgress: terrain.witness.phaseProgress,
      phaseChecksum: terrain.witness.phaseChecksum,
      phaseInfluenceChecksum: terrain.witness.phaseInfluenceChecksum
    },
    dirty: {
      dirtyTileCount: terrain.witness.dirtyTileCount,
      dirtySampleCount: terrain.witness.dirtySampleCount,
      dirtyRegionChecksum: terrain.witness.dirtyRegionChecksum,
      dirtyLayerKinds: terrain.witness.dirtyLayerKinds
    },
    shock: {
      classCounts: terrain.witness.supportFrame.shockClassCounts,
      motionClassCounts: terrain.witness.supportFrame.motionClassCounts
    },
    ranges: {
      routePressure: terrain.witness.topologyRanges.routePressure,
      flowAccumulation: terrain.witness.topologyRanges.flowAccumulation,
      ridgeStrength: terrain.witness.topologyRanges.ridgeStrength,
      valleyStrength: terrain.witness.topologyRanges.valleyStrength,
      ditchPotential: terrain.witness.topologyRanges.ditchPotential,
      growthPotential: terrain.witness.topologyRanges.growthPotential,
      phaseAmount: rangeForValues(phaseAmount),
      motionHint: rangeForValues(motionHint),
      assetHint: rangeForValues(assetHint)
    },
    channelLayout: MOTION_AFFORDANCE_CHANNEL_LAYOUT,
    transport: {
      kind: 'source-owned-fetch-url',
      encoding: 'json-base64-f32-le',
      fetchUrl: dataFetchUrl,
      dataPath,
      byteOrder: 'little-endian',
      byteLengths: byteLengthsForChannels(channels)
    },
    checksums,
    fields: motionAffordanceFields(terrain, dataFetchUrl, channelChecksum)
  };
  const motionAffordanceData: HillOfHillsMotionAffordanceData = {
    schema: HILL_OF_HILLS_MOTION_AFFORDANCE_DATA_SCHEMA,
    sourceTruth: terrain.source,
    intentEvidenceOnly: true,
    grid,
    worldBounds,
    domainBounds,
    checksums,
    channelLayout: MOTION_AFFORDANCE_CHANNEL_LAYOUT,
    channels
  };
  const sampleAgeMs = terrain.source.sampleAgeMs ?? 0;
  const status = sampleAgeMs <= FRESH_BUDGET_MS ? 'fresh-live-motion-affordance' : 'stale-motion-affordance';

  return {
    ok: true,
    schema: HILL_OF_HILLS_MOTION_AFFORDANCE_PACKET_SCHEMA,
    route: 'lerms/hill-of-hills/motion-affordance-packet-file',
    frameId: terrain.source.frameId,
    label: 'Hill terrain motion affordance packet for Mushfinger',
    generatedAt,
    observedAt,
    status,
    freshnessBudgetMs: FRESH_BUDGET_MS,
    source: {
      authority: terrain.source.authority,
      producerDiaulos: 'hill-of-hills-fucker',
      intendedConsumerDiaulos: 'mushfinger-clayfucker',
      sourceRef: sourceRefLabel(sourceRef),
      sourceRefDetail: sourceRef,
      route: 'lerms/hill-of-hills/motion-affordance-packet-file',
      configId: terrain.source.configId,
      backend: terrain.source.backend
    },
    freshness: {
      observedAt,
      generatedAt,
      budgetMs: FRESH_BUDGET_MS,
      status,
      sampleAgeMs
    },
    affordance,
    motionAffordanceData,
    rejectedDebugSurfaces: [
      {
        id: 'hill-local-canvas-debug',
        route: 'http://127.0.0.1:5187/',
        acceptanceSurface: false,
        reason: 'local Vite canvas is an operator/debug preview, not the source-owned motion affordance acceptance surface'
      }
    ],
    custody: {
      sourceOwns: [
        'terrain affordance source truth',
        'support-frame semantics',
        'terrain topology channels',
        'phase/dirty/shock evidence',
        'channel checksums'
      ],
      mushfingerOwns: [
        'actor route intent interpretation',
        'crowd policy',
        'motion witness behavior mapping'
      ],
      bigPapaOwns: [
        'conserved fluid mass',
        'reservoir/domain semantics',
        'wetness feedback ownership'
      ],
      kaminosOwns: [
        'host display',
        'packet mounting',
        'browser witness capture'
      ]
    }
  };
}

export function writeHillOfHillsTerrainSamplePacket(
  packetPath = DEFAULT_PACKET_PATH,
  dataPath = DEFAULT_DATA_PATH,
  params: Partial<HillOfHillsTerrainParams> = {},
  sourceOptions: HillOfHillsSourceOptions = {},
  options: Omit<HillTerrainSamplePacketOptions, 'packetPath' | 'dataPath'> = {}
): KaminosPreviewBenchTerrainSamplePacket {
  const cache = createHillOfHillsLayerTileCache();
  const terrain = createHillOfHillsTerrainWithCache(
    cache,
    {
      ...defaultHillOfHillsParams,
      trailPhaseIntensity: 0.78,
      trailPhaseLimit: 2,
      trailPhaseTimeMs: 940,
      ditchPhaseIntensity: 0.18,
      ditchPhaseLimit: 1,
      ditchPhaseTimeMs: 760,
      gridResolutionX: 116,
      gridResolutionZ: 148,
      ...params
    },
    {
      route: 'hill-of-hills/terrain-sample-packet',
      frameId: 'hill-of-hills-terrain-sample-packet-frame',
      configId: 'hill-of-hills-terrain-sample-packet-v0',
      timestampMs: Date.now(),
      sampleAgeMs: 0,
      ...sourceOptions
    }
  );
  const packet = createHillOfHillsTerrainSamplePacket(terrain, {
    packetPath,
    dataPath,
    dataFetchUrl: options.dataFetchUrl ?? DEFAULT_DATA_FETCH_URL,
    sourceRef: options.sourceRef ?? sourceRefFromEnvironment(),
    generatedAt: options.generatedAt,
    observedAt: options.observedAt
  });
  mkdirSync(dirname(dataPath), { recursive: true });
  writeFileSync(dataPath, `${JSON.stringify(packet.terrainSampleData, null, 2)}\n`);
  mkdirSync(dirname(packetPath), { recursive: true });
  writeFileSync(packetPath, `${JSON.stringify(packet, null, 2)}\n`);
  return packet;
}

export function writeHillOfHillsMotionAffordancePacket(
  packetPath = DEFAULT_MOTION_AFFORDANCE_PACKET_PATH,
  dataPath = DEFAULT_MOTION_AFFORDANCE_DATA_PATH,
  params: Partial<HillOfHillsTerrainParams> = {},
  sourceOptions: HillOfHillsSourceOptions = {},
  options: Omit<HillTerrainSamplePacketOptions, 'packetPath' | 'dataPath'> = {}
): HillOfHillsMotionAffordancePacket {
  const cache = createHillOfHillsLayerTileCache();
  const terrain = createHillOfHillsTerrainWithCache(
    cache,
    {
      ...defaultHillOfHillsParams,
      trailPhaseIntensity: 0.72,
      trailPhaseLimit: 1,
      trailPhaseTimeMs: 880,
      ditchPhaseIntensity: 0,
      topologyPhaseIntensity: 0.74,
      topologyPhaseLimit: 6,
      topologyPhaseTimeMs: 1080,
      gridResolutionX: 116,
      gridResolutionZ: 148,
      ...params
    },
    {
      route: 'hill-of-hills/motion-affordance-packet',
      frameId: 'hill-of-hills-motion-affordance-packet-frame',
      configId: 'hill-of-hills-motion-affordance-packet-v0',
      timestampMs: Date.now(),
      sampleAgeMs: 0,
      ...sourceOptions
    }
  );
  const packet = createHillOfHillsMotionAffordancePacket(terrain, {
    packetPath,
    dataPath,
    dataFetchUrl: options.dataFetchUrl ?? DEFAULT_MOTION_AFFORDANCE_DATA_FETCH_URL,
    sourceRef: options.sourceRef ?? sourceRefFromEnvironment(),
    generatedAt: options.generatedAt,
    observedAt: options.observedAt
  });
  mkdirSync(dirname(dataPath), { recursive: true });
  writeFileSync(dataPath, `${JSON.stringify(packet.motionAffordanceData, null, 2)}\n`);
  mkdirSync(dirname(packetPath), { recursive: true });
  writeFileSync(packetPath, `${JSON.stringify(packet, null, 2)}\n`);
  return packet;
}

function terrainSampleChannels(buffer: HillOfHillsTerrainBuffer): Record<HillTerrainSampleChannelName, HillTerrainSampleEncodedChannel> {
  const height = new Float32Array(buffer.sampleCount);
  const gradient = new Float32Array(buffer.sampleCount * 2);
  const heightDelta = new Float32Array(buffer.sampleCount);
  const surfaceVelocity = new Float32Array(buffer.sampleCount * 3);
  const heightMetric = metricIndex(buffer, 'height');
  const heightDeltaMetric = metricIndex(buffer, 'heightDelta');
  const surfaceVelocityMetric = metricIndex(buffer, 'surfaceVelocityY');
  const metricsPerSample = buffer.channelLayout.metrics.length;

  for (let index = 0; index < buffer.sampleCount; index += 1) {
    const vectorOffset = index * 3;
    const metricOffset = index * metricsPerSample;
    const normalY = Math.abs(buffer.normals[vectorOffset + 1]) < 0.00001 ? 1 : buffer.normals[vectorOffset + 1];
    height[index] = buffer.metrics[metricOffset + heightMetric];
    gradient[index * 2] = -buffer.normals[vectorOffset] / normalY;
    gradient[index * 2 + 1] = -buffer.normals[vectorOffset + 2] / normalY;
    heightDelta[index] = buffer.metrics[metricOffset + heightDeltaMetric];
    surfaceVelocity[vectorOffset] = 0;
    surfaceVelocity[vectorOffset + 1] = buffer.metrics[metricOffset + surfaceVelocityMetric];
    surfaceVelocity[vectorOffset + 2] = 0;
  }

  return {
    height: encodedChannel(height, ['height'], [buffer.sampleCount]),
    normal: encodedChannel(buffer.normals, ['x', 'y', 'z'], [buffer.sampleCount, 3]),
    gradient: encodedChannel(gradient, ['dx', 'dz'], [buffer.sampleCount, 2]),
    heightDelta: encodedChannel(heightDelta, ['heightDelta'], [buffer.sampleCount]),
    surfaceVelocity: encodedChannel(surfaceVelocity, ['x', 'y', 'z'], [buffer.sampleCount, 3])
  };
}

function motionAffordanceChannels(terrain: HillOfHillsTerrain): Record<HillMotionAffordanceChannelName, HillTerrainSampleEncodedChannel> {
  const sampleCount = terrain.samples.length;
  const height = new Float32Array(sampleCount);
  const normal = new Float32Array(sampleCount * 3);
  const gradient = new Float32Array(sampleCount * 2);
  const slope = new Float32Array(sampleCount);
  const heightDelta = new Float32Array(sampleCount);
  const surfaceVelocity = new Float32Array(sampleCount * 3);
  const routePressure = new Float32Array(sampleCount);
  const flowAccumulation = new Float32Array(sampleCount);
  const ridgeStrength = new Float32Array(sampleCount);
  const valleyStrength = new Float32Array(sampleCount);
  const ditchPotential = new Float32Array(sampleCount);
  const growthPotential = new Float32Array(sampleCount);
  const phaseAmount = new Float32Array(sampleCount);
  const topologyAmount = new Float32Array(sampleCount);
  const wetness = new Float32Array(sampleCount);
  const growthTint = new Float32Array(sampleCount);
  const materialClass = new Float32Array(sampleCount);
  const regionClass = new Float32Array(sampleCount);
  const motionHint = new Float32Array(sampleCount);
  const assetHint = new Float32Array(sampleCount);
  const dirty = new Float32Array(sampleCount);
  const shock = new Float32Array(sampleCount);

  for (let index = 0; index < sampleCount; index += 1) {
    const sample = terrain.samples[index];
    const vectorOffset = index * 3;
    const normalY = Math.abs(sample.normal[1]) < 0.00001 ? 1 : sample.normal[1];

    height[index] = sample.height;
    normal[vectorOffset] = sample.normal[0];
    normal[vectorOffset + 1] = sample.normal[1];
    normal[vectorOffset + 2] = sample.normal[2];
    gradient[index * 2] = -sample.normal[0] / normalY;
    gradient[index * 2 + 1] = -sample.normal[2] / normalY;
    slope[index] = sample.slope;
    heightDelta[index] = sample.support.heightDelta;
    surfaceVelocity[vectorOffset] = sample.support.surfaceVelocity[0];
    surfaceVelocity[vectorOffset + 1] = sample.support.surfaceVelocity[1];
    surfaceVelocity[vectorOffset + 2] = sample.support.surfaceVelocity[2];
    routePressure[index] = sample.topology.routePressure;
    flowAccumulation[index] = sample.topology.flowAccumulation;
    ridgeStrength[index] = sample.topology.ridgeStrength;
    valleyStrength[index] = sample.topology.valleyStrength;
    ditchPotential[index] = sample.topology.ditchPotential;
    growthPotential[index] = sample.topology.growthPotential;
    phaseAmount[index] = sample.phaseInfluence.amount;
    topologyAmount[index] = sample.phaseInfluence.topologyAmount;
    wetness[index] = sample.proxyMaterial.wetness;
    growthTint[index] = sample.proxyMaterial.growthTint;
    materialClass[index] = codeForMotionProxyMaterial(sample.proxyMaterial.kind);
    regionClass[index] = codeForMotionRegion(sample.region);
    motionHint[index] = motionHintForSample(sample);
    assetHint[index] = assetHintForSample(sample);
    dirty[index] = sample.support.motionClass === 'stable' && sample.phaseInfluence.amount <= 0 ? 0 : 1;
    shock[index] = sample.support.shock === 'shock_reset' ? 1 : 0;
  }

  return {
    height: encodedChannel(height, ['height'], [sampleCount]),
    normal: encodedChannel(normal, ['x', 'y', 'z'], [sampleCount, 3]),
    gradient: encodedChannel(gradient, ['dx', 'dz'], [sampleCount, 2]),
    slope: encodedChannel(slope, ['slope'], [sampleCount]),
    heightDelta: encodedChannel(heightDelta, ['heightDelta'], [sampleCount]),
    surfaceVelocity: encodedChannel(surfaceVelocity, ['x', 'y', 'z'], [sampleCount, 3]),
    routePressure: encodedChannel(routePressure, ['routePressure'], [sampleCount]),
    flowAccumulation: encodedChannel(flowAccumulation, ['flowAccumulation'], [sampleCount]),
    ridgeStrength: encodedChannel(ridgeStrength, ['ridgeStrength'], [sampleCount]),
    valleyStrength: encodedChannel(valleyStrength, ['valleyStrength'], [sampleCount]),
    ditchPotential: encodedChannel(ditchPotential, ['ditchPotential'], [sampleCount]),
    growthPotential: encodedChannel(growthPotential, ['growthPotential'], [sampleCount]),
    phaseAmount: encodedChannel(phaseAmount, ['phaseAmount'], [sampleCount]),
    topologyAmount: encodedChannel(topologyAmount, ['topologyAmount'], [sampleCount]),
    wetness: encodedChannel(wetness, ['wetness'], [sampleCount]),
    growthTint: encodedChannel(growthTint, ['growthTint'], [sampleCount]),
    materialClass: encodedChannel(materialClass, ['materialClass'], [sampleCount]),
    regionClass: encodedChannel(regionClass, ['regionClass'], [sampleCount]),
    motionHint: encodedChannel(motionHint, ['routeIntent'], [sampleCount]),
    assetHint: encodedChannel(assetHint, ['placementAffordance'], [sampleCount]),
    dirty: encodedChannel(dirty, ['dirty'], [sampleCount]),
    shock: encodedChannel(shock, ['shock'], [sampleCount])
  };
}

function encodedChannel(values: Float32Array, components: readonly string[], shape: readonly number[]): HillTerrainSampleEncodedChannel {
  const bytes = new Uint8Array(values.buffer, values.byteOffset, values.byteLength);
  const data = Buffer.from(bytes).toString('base64');
  return {
    encoding: 'base64-f32-le',
    components,
    shape,
    byteLength: values.byteLength,
    checksum: checksumBytes(bytes),
    data
  };
}

function terrainSampleFields(
  terrain: HillOfHillsTerrain,
  fetchUrl: string,
  channelChecksum: string
): readonly {
  label: string;
  value: string | number;
}[] {
  return [
    { label: 'Grid', value: `${terrain.witness.gridResolution.x} x ${terrain.witness.gridResolution.z}` },
    { label: 'Samples', value: terrain.witness.sampleCount },
    { label: 'Fetch URL', value: fetchUrl },
    { label: 'Sample checksum', value: terrain.witness.sampleChecksum },
    { label: 'Topology checksum', value: terrain.witness.topologyChecksum },
    { label: 'Support checksum', value: terrain.witness.supportFrame.supportFrameChecksum },
    { label: 'Channel checksum', value: channelChecksum },
    { label: 'Height range', value: `${terrain.witness.heightRange.min.toFixed(3)}..${terrain.witness.heightRange.max.toFixed(3)}` },
    { label: 'Phase', value: terrain.witness.phaseMode }
  ];
}

function motionAffordanceFields(
  terrain: HillOfHillsTerrain,
  fetchUrl: string,
  channelChecksum: string
): readonly {
  label: string;
  value: string | number;
}[] {
  return [
    { label: 'Grid', value: `${terrain.witness.gridResolution.x} x ${terrain.witness.gridResolution.z}` },
    { label: 'Samples', value: terrain.witness.sampleCount },
    { label: 'Fetch URL', value: fetchUrl },
    { label: 'Support checksum', value: terrain.witness.supportFrame.supportFrameChecksum },
    { label: 'Topology checksum', value: terrain.witness.topologyChecksum },
    { label: 'Material checksum', value: terrain.witness.proxyMaterialChecksum },
    { label: 'Phase checksum', value: terrain.witness.phaseChecksum },
    { label: 'Phase influence checksum', value: terrain.witness.phaseInfluenceChecksum },
    { label: 'Dirty region checksum', value: terrain.witness.dirtyRegionChecksum },
    { label: 'Channel checksum', value: channelChecksum },
    { label: 'Phase', value: terrain.witness.phaseMode },
    { label: 'Intent authority', value: 'terrain evidence only' }
  ];
}

function byteLengthsForChannels(
  channels: Record<HillMotionAffordanceChannelName, HillTerrainSampleEncodedChannel>
): Record<HillMotionAffordanceChannelName, number> {
  return Object.fromEntries(MOTION_AFFORDANCE_CHANNEL_LAYOUT.map((channel) => [channel, channels[channel].byteLength])) as Record<
    HillMotionAffordanceChannelName,
    number
  >;
}

function decodeF32Channel(channel: HillTerrainSampleEncodedChannel): Float32Array {
  const bytes = Buffer.from(channel.data, 'base64');
  return new Float32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / Float32Array.BYTES_PER_ELEMENT);
}

function rangeForValues(values: Float32Array): { min: number; max: number } {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const value of values) {
    if (!Number.isFinite(value)) {
      continue;
    }
    min = Math.min(min, value);
    max = Math.max(max, value);
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return { min: 0, max: 0 };
  }
  return { min: roundMetric(min), max: roundMetric(max) };
}

function motionHintForSample(sample: HillOfHillsTerrain['samples'][number]): number {
  return clamp01(
    sample.topology.routePressure * 0.36 +
      sample.topology.flowAccumulation * 0.16 +
      sample.topology.valleyStrength * 0.18 +
      sample.topology.ditchPotential * 0.12 +
      sample.phaseInfluence.trailAmount * 0.18 +
      sample.phaseInfluence.topologyAmount * 0.14 -
      sample.topology.ridgeStrength * 0.12 +
      (1 - sample.slope) * 0.12
  );
}

function assetHintForSample(sample: HillOfHillsTerrain['samples'][number]): number {
  return clamp01(
    sample.topology.growthPotential * 0.34 +
      sample.proxyMaterial.growthTint * 0.18 +
      sample.surfaceDetail.density * 0.24 +
      sample.materialEdge.strength * 0.16 +
      sample.phaseInfluence.topologyAmount * 0.12 +
      (sample.proxyMaterial.kind === 'rim-crust' || sample.proxyMaterial.kind === 'basin-dust' ? 0.08 : 0)
  );
}

function codeForMotionProxyMaterial(kind: HillOfHillsProxyMaterialKind): number {
  return (
    [
      'crown-warmth',
      'approach-clay',
      'slope-moss',
      'basin-meadow',
      'basin-dust',
      'basin-pool',
      'ditch-shadow',
      'rim-crust',
      'growth-lip'
    ] as const
  ).indexOf(kind) + 1;
}

function codeForMotionRegion(region: string): number {
  const codebook = ['crown', 'approach', 'slope', 'basin', 'gutter', 'rim', 'underhill_fixture'] as const;
  const index = codebook.indexOf(region as (typeof codebook)[number]);
  return index < 0 ? 0 : index + 1;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1, value));
}

function roundMetric(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function metricIndex(buffer: HillOfHillsTerrainBuffer, channel: HillOfHillsTerrainBufferMetricChannel): number {
  const index = buffer.channelLayout.metrics.indexOf(channel);
  if (index < 0) {
    throw new Error(`terrain buffer missing metric channel ${channel}`);
  }
  return index;
}

function sourceRefFromEnvironment(): HillTerrainSamplePacketSourceRef {
  return {
    repo: process.env.LERMS_SOURCE_REPO ?? 'lerms',
    branch: process.env.LERMS_SOURCE_BRANCH ?? process.env.GIT_BRANCH ?? 'unknown',
    commit: process.env.LERMS_SOURCE_COMMIT ?? process.env.GIT_COMMIT ?? 'unknown'
  };
}

function sourceRefLabel(sourceRef: HillTerrainSamplePacketSourceRef): string {
  const branch = sourceRef.branch ? `:${sourceRef.branch}` : '';
  const commit = sourceRef.commit ? `@${sourceRef.commit}` : '';
  const path = sourceRef.path ? ` ${sourceRef.path}` : '';
  return `${sourceRef.repo}${branch}${commit}${path}`;
}

function checksumParts(parts: readonly string[]): string {
  return checksumBytes(Buffer.from(parts.join('|'), 'utf8'));
}

function checksumBytes(bytes: Uint8Array): string {
  let hash = 0x811c9dc5;
  for (const byte of bytes) {
    hash ^= byte;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

if (process.argv[1]?.endsWith('hill-of-hills-terrain-sample-packet.js')) {
  const packetKind = process.argv.includes('--motion-affordance') || process.env.LERMS_HILL_PACKET_KIND === 'motion-affordance' ? 'motion-affordance' : 'terrain-sample';
  const positionalArgs = process.argv.slice(2).filter((arg) => arg !== '--motion-affordance');
  const packetPath =
    positionalArgs[0] ??
    (packetKind === 'motion-affordance'
      ? (process.env.LERMS_HILL_MOTION_AFFORDANCE_PACKET_OUT ?? DEFAULT_MOTION_AFFORDANCE_PACKET_PATH)
      : (process.env.LERMS_HILL_TERRAIN_SAMPLE_PACKET_OUT ?? DEFAULT_PACKET_PATH));
  const dataPath =
    positionalArgs[1] ??
    (packetKind === 'motion-affordance'
      ? (process.env.LERMS_HILL_MOTION_AFFORDANCE_DATA_OUT ?? DEFAULT_MOTION_AFFORDANCE_DATA_PATH)
      : (process.env.LERMS_HILL_TERRAIN_SAMPLE_DATA_OUT ?? DEFAULT_DATA_PATH));
  const packet =
    packetKind === 'motion-affordance'
      ? writeHillOfHillsMotionAffordancePacket(packetPath, dataPath, {}, {}, {
          dataFetchUrl: process.env.LERMS_HILL_MOTION_AFFORDANCE_DATA_FETCH_URL ?? DEFAULT_MOTION_AFFORDANCE_DATA_FETCH_URL
        })
      : writeHillOfHillsTerrainSamplePacket(packetPath, dataPath, {}, {}, {
          dataFetchUrl: process.env.LERMS_HILL_TERRAIN_SAMPLE_DATA_FETCH_URL ?? DEFAULT_DATA_FETCH_URL
        });
  process.stdout.write(
    `${JSON.stringify({
      ok: true,
      packetKind,
      path: packetPath,
      dataPath,
      schema: packet.schema,
      dataSchema:
        packetKind === 'motion-affordance'
          ? (packet as HillOfHillsMotionAffordancePacket).motionAffordanceData.schema
          : (packet as KaminosPreviewBenchTerrainSamplePacket).terrainSampleData.schema,
      sampleChecksum:
        packetKind === 'motion-affordance'
          ? (packet as HillOfHillsMotionAffordancePacket).affordance.checksums.topology
          : (packet as KaminosPreviewBenchTerrainSamplePacket).terrainSample.checksums.sample,
      channelChecksum:
        packetKind === 'motion-affordance'
          ? (packet as HillOfHillsMotionAffordancePacket).affordance.checksums.channels
          : (packet as KaminosPreviewBenchTerrainSamplePacket).terrainSample.checksums.channels
    })}\n`
  );
}
