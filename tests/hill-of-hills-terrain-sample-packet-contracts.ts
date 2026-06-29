import {
  createHillOfHillsTerrainSamplePacket,
  HILL_OF_HILLS_TERRAIN_SAMPLE_DATA_SCHEMA,
  KAMINOS_PREVIEW_BENCH_TERRAIN_SAMPLE_PACKET_SCHEMA
} from '../src/terrain/hill-of-hills-terrain-sample-packet.js';
import { createHillOfHillsLayerTileCache, createHillOfHillsTerrainWithCache, defaultHillOfHillsParams } from '../src/terrain/hill-of-hills.js';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function decodeF32(base64: string): Float32Array {
  const bytes = Buffer.from(base64, 'base64');
  return new Float32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / Float32Array.BYTES_PER_ELEMENT);
}

const cache = createHillOfHillsLayerTileCache();
const terrain = createHillOfHillsTerrainWithCache(
  cache,
  {
    ...defaultHillOfHillsParams,
    gridResolutionX: 34,
    gridResolutionZ: 46,
    trailPhaseIntensity: 0.74,
    trailPhaseLimit: 2,
    trailPhaseTimeMs: 940,
    ditchPhaseIntensity: 0.24,
    ditchPhaseLimit: 1,
    ditchPhaseTimeMs: 760
  },
  {
    route: 'hill-of-hills/terrain-sample-packet-contract',
    frameId: 'hill-terrain-sample-packet-contract-frame',
    configId: 'hill-terrain-sample-packet-contract-v0',
    timestampMs: 22_000,
    sampleAgeMs: 0
  }
);

const packet = createHillOfHillsTerrainSamplePacket(terrain, {
  packetPath: '/private/tmp/lerms-hill-of-hills-terrain-sample-packet.json',
  dataPath: '/private/tmp/lerms-hill-of-hills-terrain-sample-data.json',
  dataFetchUrl: '/api/read?root=lerms-preview&path=lerms-hill-of-hills-terrain-sample-data.json',
  sourceRef: {
    repo: 'lerms',
    branch: 'cc/hill-of-hills-live-terrain-evidence-0627',
    commit: 'test-terrain-sample-commit'
  },
  generatedAt: '2026-06-29T05:24:00.000Z',
  observedAt: '2026-06-29T05:24:00.000Z'
});

assert(KAMINOS_PREVIEW_BENCH_TERRAIN_SAMPLE_PACKET_SCHEMA === 'kaminos.preview-bench.terrain-sample-packet.v0', 'Kaminos terrain sample packet schema constant is stable');
assert(HILL_OF_HILLS_TERRAIN_SAMPLE_DATA_SCHEMA === 'lerms.hill-of-hills.terrain-sample-data.v0', 'Hill terrain sample data schema constant is stable');
assert(packet.ok === true, 'terrain sample packet is ok');
assert(packet.schema === KAMINOS_PREVIEW_BENCH_TERRAIN_SAMPLE_PACKET_SCHEMA, 'packet uses Kaminos terrain sample host schema');
assert(packet.route === 'kaminos/preview-bench/terrain-sample-file', 'packet uses Kaminos terrain sample host route');
assert(packet.frameId === terrain.source.frameId, 'packet preserves terrain frame id');
assert(packet.generatedAt === '2026-06-29T05:24:00.000Z', 'packet exposes top-level generatedAt for host display');
assert(packet.observedAt === '2026-06-29T05:24:00.000Z', 'packet exposes top-level observedAt for host display');
assert(packet.status === 'fresh-live-terrain-sample', 'packet exposes top-level freshness status for host display');
assert(packet.freshnessBudgetMs === 900_000, 'packet exposes top-level freshness budget for host display');
assert(packet.source.authority === 'live_simulation', 'packet preserves live terrain authority');
assert(packet.source.producerDiaulos === 'hill-of-hills-fucker', 'packet names Hill producer diaulos');
assert(packet.source.route === 'lerms/hill-of-hills/terrain-sample-packet-file', 'packet names Hill source-owned route');
assert(packet.source.sourceRef === 'lerms:cc/hill-of-hills-live-terrain-evidence-0627@test-terrain-sample-commit', 'packet provides display-safe source ref');
assert(packet.source.sourceRefDetail.commit === 'test-terrain-sample-commit', 'packet preserves structured source commit identity');
assert(packet.freshness.status === 'fresh-live-terrain-sample', 'packet marks fresh live terrain sample status');
assert(packet.acceptanceSurface.worldChamberId === 'lerms-underhill', 'packet targets lerms-underhill');
assert(packet.acceptanceSurface.bench === 'terrain-preview', 'packet targets terrain-preview bench');

const sample = packet.terrainSample;
assert(sample.schema === 'lerms.terrain-sample.v0', 'terrain sample preserves LERMS terrain sample schema');
assert(sample.route === 'lerms/hill-of-hills/terrain-sample-fetch', 'terrain sample names source-owned fetch route');
assert(sample.grid.columns === terrain.witness.gridResolution.x, 'terrain sample grid preserves columns');
assert(sample.grid.rows === terrain.witness.gridResolution.z, 'terrain sample grid preserves rows');
assert(sample.grid.sampleCount === terrain.samples.length, 'terrain sample grid preserves sample count');
assert(sample.worldBounds.x.min === terrain.witness.supportFrame.worldBounds.x.min, 'terrain sample world x min matches support frame');
assert(sample.worldBounds.z.max === terrain.witness.supportFrame.worldBounds.z.max, 'terrain sample world z max matches support frame');
assert(sample.heightRange.min === terrain.witness.heightRange.min, 'terrain sample height min matches witness');
assert(sample.heightRange.max === terrain.witness.heightRange.max, 'terrain sample height max matches witness');
for (const channel of ['height', 'normal', 'gradient', 'heightDelta', 'surfaceVelocity'] as const) {
  assert(sample.channelLayout.includes(channel), `terrain sample includes ${channel} channel`);
}
assert(sample.transport.kind === 'source-owned-fetch-url', 'transport is source-owned fetch URL');
assert(sample.transport.encoding === 'json-base64-f32-le', 'transport names base64 f32 little-endian encoding');
assert(sample.transport.fetchUrl === '/api/read?root=lerms-preview&path=lerms-hill-of-hills-terrain-sample-data.json', 'transport preserves fetch URL');
assert(sample.transport.dataPath === '/private/tmp/lerms-hill-of-hills-terrain-sample-data.json', 'transport preserves data path');
assert(sample.transport.byteLengths.height === terrain.samples.length * Float32Array.BYTES_PER_ELEMENT, 'height byte length matches sample count');
assert(sample.transport.byteLengths.normal === terrain.samples.length * 3 * Float32Array.BYTES_PER_ELEMENT, 'normal byte length matches sample count');
assert(sample.transport.byteLengths.gradient === terrain.samples.length * 2 * Float32Array.BYTES_PER_ELEMENT, 'gradient byte length matches sample count');
assert(sample.transport.byteLengths.surfaceVelocity === terrain.samples.length * 3 * Float32Array.BYTES_PER_ELEMENT, 'surface velocity byte length matches sample count');
assert(sample.checksums.supportFrame === terrain.witness.supportFrame.supportFrameChecksum, 'packet preserves support-frame checksum');
assert(sample.checksums.topology === terrain.witness.topologyChecksum, 'packet preserves topology checksum');
assert(sample.checksums.sample === terrain.witness.sampleChecksum, 'packet preserves sample checksum');
assert(sample.checksums.channels.length > 0, 'packet records channel checksum');

assert(packet.terrainSampleData.schema === HILL_OF_HILLS_TERRAIN_SAMPLE_DATA_SCHEMA, 'packet carries decoded data document for direct writers');
assert(packet.terrainSampleData.grid.sampleCount === terrain.samples.length, 'data document keeps sample count');
assert(packet.terrainSampleData.channels.height.encoding === 'base64-f32-le', 'data document encodes height as f32 base64');
assert(packet.terrainSampleData.channels.normal.encoding === 'base64-f32-le', 'data document encodes normal as f32 base64');
assert(packet.terrainSampleData.channels.gradient.encoding === 'base64-f32-le', 'data document encodes gradient as f32 base64');
assert(packet.terrainSampleData.channels.heightDelta.encoding === 'base64-f32-le', 'data document encodes heightDelta as f32 base64');
assert(packet.terrainSampleData.channels.surfaceVelocity.encoding === 'base64-f32-le', 'data document encodes surfaceVelocity as f32 base64');
assert(decodeF32(packet.terrainSampleData.channels.height.data).length === terrain.samples.length, 'height channel decodes to one f32 per sample');
assert(decodeF32(packet.terrainSampleData.channels.normal.data).length === terrain.samples.length * 3, 'normal channel decodes to xyz f32 per sample');
assert(decodeF32(packet.terrainSampleData.channels.gradient.data).length === terrain.samples.length * 2, 'gradient channel decodes to xz f32 per sample');
assert(decodeF32(packet.terrainSampleData.channels.heightDelta.data).length === terrain.samples.length, 'heightDelta channel decodes to one f32 per sample');
assert(decodeF32(packet.terrainSampleData.channels.surfaceVelocity.data).length === terrain.samples.length * 3, 'surfaceVelocity channel decodes to xyz f32 per sample');
assert(packet.rejectedDebugSurfaces.some((surface) => surface.id === 'hill-local-canvas-debug'), 'packet rejects local debug canvas as acceptance surface');
assert(packet.custody.sourceOwns.includes('terrain sample channels'), 'custody says source owns terrain channels');
assert(packet.custody.kaminosOwns.includes('host display'), 'custody says Kaminos owns host display');

console.log('hill of hills terrain sample packet contracts ok');
