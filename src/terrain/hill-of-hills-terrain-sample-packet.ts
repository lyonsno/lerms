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
  type HillOfHillsSourceOptions
} from './hill-of-hills.js';
import type { SimulationAuthority, SourceTruth } from '../contracts/first-vertical.js';

export const KAMINOS_PREVIEW_BENCH_TERRAIN_SAMPLE_PACKET_SCHEMA = 'kaminos.preview-bench.terrain-sample-packet.v0' as const;
export const HILL_OF_HILLS_TERRAIN_SAMPLE_DATA_SCHEMA = 'lerms.hill-of-hills.terrain-sample-data.v0' as const;

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
const DEFAULT_DATA_FETCH_URL = '/api/read?root=lerms-preview&path=lerms-hill-of-hills-terrain-sample-data.json';
const FRESH_BUDGET_MS = 900_000;

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
  const packetPath = process.argv[2] ?? process.env.LERMS_HILL_TERRAIN_SAMPLE_PACKET_OUT ?? DEFAULT_PACKET_PATH;
  const dataPath = process.argv[3] ?? process.env.LERMS_HILL_TERRAIN_SAMPLE_DATA_OUT ?? DEFAULT_DATA_PATH;
  const packet = writeHillOfHillsTerrainSamplePacket(packetPath, dataPath, {}, {}, {
    dataFetchUrl: process.env.LERMS_HILL_TERRAIN_SAMPLE_DATA_FETCH_URL ?? DEFAULT_DATA_FETCH_URL
  });
  process.stdout.write(
    `${JSON.stringify({
      ok: true,
      path: packetPath,
      dataPath,
      schema: packet.schema,
      dataSchema: packet.terrainSampleData.schema,
      sampleChecksum: packet.terrainSample.checksums.sample,
      channelChecksum: packet.terrainSample.checksums.channels
    })}\n`
  );
}
