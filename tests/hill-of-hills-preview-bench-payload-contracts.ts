import {
  createHillOfHillsPreviewBenchPayloadReport,
  HILL_OF_HILLS_PREVIEW_BENCH_PAYLOAD_SCHEMA,
  KAMINOS_PREVIEW_BENCH_PAYLOAD_REPORT_SCHEMA
} from '../src/terrain/hill-of-hills-preview-bench-payload.js';
import { createHillOfHillsLayerTileCache, createHillOfHillsTerrainWithCache, defaultHillOfHillsParams } from '../src/terrain/hill-of-hills.js';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const cache = createHillOfHillsLayerTileCache();
const terrain = createHillOfHillsTerrainWithCache(
  cache,
  {
    ...defaultHillOfHillsParams,
    gridResolutionX: 42,
    gridResolutionZ: 58,
    trailPhaseIntensity: 0.72,
    trailPhaseLimit: 2,
    trailPhaseTimeMs: 940
  },
  {
    route: 'hill-of-hills/preview-bench-contract',
    frameId: 'hill-preview-bench-contract-frame',
    configId: 'hill-preview-bench-contract-v0',
    timestampMs: 18_000,
    sampleAgeMs: 0
  }
);
const report = createHillOfHillsPreviewBenchPayloadReport(terrain, {
  reportPath: '/private/tmp/lerms-hill-of-hills-preview-bench-payload.json',
  sourceRef: {
    repo: 'lerms',
    branch: 'cc/hill-of-hills-live-terrain-evidence-0627',
    commit: 'test-commit'
  },
  generatedAt: '2026-06-28T22:44:00.000Z',
  observedAt: '2026-06-28T22:44:00.000Z'
});

assert(KAMINOS_PREVIEW_BENCH_PAYLOAD_REPORT_SCHEMA === 'kaminos.preview-bench.payload-report.v0', 'Kaminos payload report schema constant is stable');
assert(HILL_OF_HILLS_PREVIEW_BENCH_PAYLOAD_SCHEMA === 'lerms.hill-of-hills.preview-bench-payload.v0', 'Hill payload schema constant is stable');
assert(report.ok === true, 'Preview Bench payload report is ok');
assert(report.schema === KAMINOS_PREVIEW_BENCH_PAYLOAD_REPORT_SCHEMA, 'report uses Kaminos Preview Bench payload-report schema');
assert(report.route === 'kaminos/preview-bench/payload-file', 'report uses Kaminos payload-file route');
assert(report.reportPath === '/private/tmp/lerms-hill-of-hills-preview-bench-payload.json', 'report records output path');

const payload = report.payload;
assert(payload.schema === HILL_OF_HILLS_PREVIEW_BENCH_PAYLOAD_SCHEMA, 'payload keeps Hill-owned schema');
assert(payload.route === 'lerms/hill-of-hills/preview-bench-payload-file', 'payload keeps Hill-owned route');
assert(payload.label === 'Hill of Hills Terrain Evidence', 'payload label is operator-readable');
assert(payload.acceptanceSurface.kind === 'kaminos_preview_bench_payload', 'payload targets the Kaminos Preview Bench adapter surface');
assert(payload.acceptanceSurface.worldChamberId === 'lerms-underhill', 'payload targets lerms-underhill');
assert(payload.acceptanceSurface.posture === 'inspect', 'payload targets inspect posture');
assert(payload.acceptanceSurface.bench === 'terrain-preview', 'payload targets terrain-preview bench');
assert(
  payload.acceptanceSurface.routeQuery === 'world_chamber=lerms-underhill&posture=inspect&bench=terrain-preview',
  'payload carries accepted Preview Bench route query'
);
assert(payload.source.diaulos === 'hill-of-hills-fucker', 'payload source names Hill diaulos');
assert(payload.source.authority === terrain.source.authority, 'payload source preserves terrain authority');
assert(payload.source.route === terrain.source.route, 'payload source preserves terrain route');
assert(payload.source.configId === terrain.source.configId, 'payload source preserves config id');
assert(payload.sourceRef.commit === 'test-commit', 'payload source ref preserves commit identity');
assert(payload.sourceTruth.schema === 'lerms.source-truth.v0', 'payload preserves LERMS source truth');

assert(payload.terrainBuffer.schema === 'lerms.hill-of-hills-terrain-buffer.v0', 'payload advertises terrain buffer schema');
assert(payload.terrainBuffer.sampleSchema === 'lerms.terrain-sample.v0', 'payload advertises terrain sample schema');
assert(payload.terrainBuffer.witnessSchema === 'lerms.hill-of-hills-witness.v0', 'payload advertises witness schema');
assert(payload.terrainBuffer.sampleCount === terrain.samples.length, 'payload buffer summary keeps sample count');
assert(payload.terrainBuffer.sampleChecksum === terrain.witness.sampleChecksum, 'payload buffer summary keeps sample checksum');
assert(payload.terrainBuffer.topologyChecksum === terrain.witness.topologyChecksum, 'payload buffer summary keeps topology checksum');
assert(payload.terrainBuffer.proxyMaterialChecksum === terrain.witness.proxyMaterialChecksum, 'payload buffer summary keeps material checksum');
assert(payload.terrainBuffer.transport === 'summary_only_typed_arrays_remain_source_owned', 'payload does not pretend to JSON-transport typed arrays');
assert(payload.phase.mode === terrain.witness.phaseMode, 'payload phase summary keeps phase mode');
assert(payload.supportFrame.supportFrameChecksum === terrain.witness.supportFrame.supportFrameChecksum, 'payload keeps support-frame checksum');
assert(payload.summary.sampleCount === terrain.samples.length, 'payload summary keeps sample count');
assert(payload.summary.activePhaseCount === terrain.witness.activePhaseCount, 'payload summary keeps active phase count');
assert(payload.fields.some((field) => field.label === 'Terrain buffer'), 'payload fields expose terrain buffer identity');
assert(payload.fields.some((field) => field.label === 'Route pressure max'), 'payload fields expose route pressure max');
assert(payload.downgrades.includes('host_visualization_not_source_truth'), 'payload carries host visualization downgrade');
assert(payload.downgrades.includes('terrain_only_not_full_vertical'), 'payload carries terrain-only downgrade');
assert(
  payload.rejectedSurfaces.some((surface) => surface.route === 'http://127.0.0.1:5187/' && surface.acceptanceSurface === false),
  'payload rejects the local Vite debug route as acceptance surface'
);
assert(payload.custody.sourceOwns.includes('terrain generation'), 'payload custody states source owns terrain generation');
assert(payload.custody.kaminosOwns.includes('host display'), 'payload custody states Kaminos owns host display');

console.log('hill of hills Preview Bench payload contracts ok');
