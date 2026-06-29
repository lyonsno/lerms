import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  createHillOfHillsLayerTileCache,
  createHillOfHillsTerrainBuffer,
  createHillOfHillsTerrainWithCache,
  defaultHillOfHillsParams,
  type HillOfHillsTerrain,
  type HillOfHillsTerrainBuffer,
  type HillOfHillsTerrainParams,
  type HillOfHillsSourceOptions
} from './hill-of-hills.js';
import type { SimulationAuthority, SourceTruth } from '../contracts/first-vertical.js';

export const KAMINOS_PREVIEW_BENCH_PAYLOAD_REPORT_SCHEMA = 'kaminos.preview-bench.payload-report.v0' as const;
export const HILL_OF_HILLS_PREVIEW_BENCH_PAYLOAD_SCHEMA = 'lerms.hill-of-hills.preview-bench-payload.v0' as const;

export interface HillPreviewBenchPayloadSourceRef {
  repo: string;
  branch?: string;
  commit?: string;
  path?: string;
}

export interface HillPreviewBenchPayloadOptions {
  reportPath?: string;
  sourceRef?: HillPreviewBenchPayloadSourceRef;
  generatedAt?: string;
  observedAt?: string;
}

export interface KaminosPreviewBenchPayloadReport {
  ok: true;
  schema: typeof KAMINOS_PREVIEW_BENCH_PAYLOAD_REPORT_SCHEMA;
  route: 'kaminos/preview-bench/payload-file';
  reportPath: string;
  payload: HillOfHillsPreviewBenchPayload;
}

export interface HillOfHillsPreviewBenchPayload {
  schema: typeof HILL_OF_HILLS_PREVIEW_BENCH_PAYLOAD_SCHEMA;
  route: 'lerms/hill-of-hills/preview-bench-payload-file';
  label: 'Hill of Hills Terrain Evidence';
  acceptanceSurface: {
    kind: 'kaminos_preview_bench_payload';
    worldChamberId: 'lerms-underhill';
    posture: 'inspect';
    bench: 'terrain-preview';
    routeQuery: 'world_chamber=lerms-underhill&posture=inspect&bench=terrain-preview';
    expectedHost: 'kaminos_workbench_kiln_preview_bench';
  };
  source: {
    authority: SimulationAuthority;
    diaulos: 'hill-of-hills-fucker';
    route: string;
    configId?: string;
    frameId: string;
    backend?: string;
  };
  sourceRef: HillPreviewBenchPayloadSourceRef;
  sourceTruth: SourceTruth;
  generatedAt: string;
  observedAt: string;
  summary: {
    sampleCount: number;
    gridResolution: {
      x: number;
      z: number;
    };
    heightRange: {
      min: number;
      max: number;
    };
    activePhaseCount: number;
    phaseMode: string;
    routePressureMax: number;
    ditchPotentialMax: number;
    growthPotentialMax: number;
    supportFrameChecksum: string;
    terrainBufferChecksum: string;
  };
  fields: readonly {
    label: string;
    value: string | number;
  }[];
  terrainBuffer: {
    schema: string;
    sampleSchema: string;
    witnessSchema: string;
    transport: 'summary_only_typed_arrays_remain_source_owned';
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
    channelLayout: HillOfHillsTerrainBuffer['channelLayout'];
    byteLengths: {
      positions: number;
      normals: number;
      colors: number;
      metrics: number;
      regionCodes: number;
      materialCodes: number;
    };
  };
  phase: {
    mode: string;
    terrainEpoch: number;
    activePhaseCount: number;
    phaseClock: number;
    phaseProgress: number;
    phaseChecksum: string;
    phaseInfluenceChecksum: string;
    trailSeedMethod: string;
    trailCandidateChecksum: string;
  };
  supportFrame: {
    supportClass: string;
    mappingMode: string;
    supportEpoch: number;
    topologyEpoch: number;
    substrateTileCount: number;
    dirtySubstrateTileCount: number;
    supportFrameChecksum: string;
    maxHeightDelta: number;
    maxSurfaceSpeed: number;
  };
  downgrades: readonly string[];
  rejectedSurfaces: readonly {
    route: string;
    acceptanceSurface: false;
    reason: string;
  }[];
  custody: {
    sourceOwns: readonly string[];
    kaminosOwns: readonly string[];
  };
}

const DEFAULT_REPORT_PATH = '/private/tmp/lerms-hill-of-hills-preview-bench-payload.json';

export function createHillOfHillsPreviewBenchPayloadReport(
  terrain: HillOfHillsTerrain,
  options: HillPreviewBenchPayloadOptions = {}
): KaminosPreviewBenchPayloadReport {
  const terrainBuffer = createHillOfHillsTerrainBuffer(terrain);
  const reportPath = options.reportPath ?? DEFAULT_REPORT_PATH;
  const generatedAt = options.generatedAt ?? new Date(terrain.source.timestampMs || Date.now()).toISOString();
  const observedAt = options.observedAt ?? generatedAt;
  const sourceRef = options.sourceRef ?? {
    repo: 'lerms',
    branch: 'unknown',
    commit: 'unknown'
  };

  return {
    ok: true,
    schema: KAMINOS_PREVIEW_BENCH_PAYLOAD_REPORT_SCHEMA,
    route: 'kaminos/preview-bench/payload-file',
    reportPath,
    payload: {
      schema: HILL_OF_HILLS_PREVIEW_BENCH_PAYLOAD_SCHEMA,
      route: 'lerms/hill-of-hills/preview-bench-payload-file',
      label: 'Hill of Hills Terrain Evidence',
      acceptanceSurface: {
        kind: 'kaminos_preview_bench_payload',
        worldChamberId: 'lerms-underhill',
        posture: 'inspect',
        bench: 'terrain-preview',
        routeQuery: 'world_chamber=lerms-underhill&posture=inspect&bench=terrain-preview',
        expectedHost: 'kaminos_workbench_kiln_preview_bench'
      },
      source: {
        authority: terrain.source.authority,
        diaulos: 'hill-of-hills-fucker',
        route: terrain.source.route,
        configId: terrain.source.configId,
        frameId: terrain.source.frameId,
        backend: terrain.source.backend
      },
      sourceRef,
      sourceTruth: terrain.source,
      generatedAt,
      observedAt,
      summary: {
        sampleCount: terrain.witness.sampleCount,
        gridResolution: terrain.witness.gridResolution,
        heightRange: terrain.witness.heightRange,
        activePhaseCount: terrain.witness.activePhaseCount,
        phaseMode: terrain.witness.phaseMode,
        routePressureMax: terrain.witness.topologyRanges.routePressure.max,
        ditchPotentialMax: terrain.witness.topologyRanges.ditchPotential.max,
        growthPotentialMax: terrain.witness.topologyRanges.growthPotential.max,
        supportFrameChecksum: terrain.witness.supportFrame.supportFrameChecksum,
        terrainBufferChecksum: terrain.witness.sampleChecksum
      },
      fields: terrainPreviewFields(terrain, terrainBuffer),
      terrainBuffer: terrainBufferSummary(terrainBuffer),
      phase: {
        mode: terrain.witness.phaseMode,
        terrainEpoch: terrain.witness.terrainEpoch,
        activePhaseCount: terrain.witness.activePhaseCount,
        phaseClock: terrain.witness.phaseClock,
        phaseProgress: terrain.witness.phaseProgress,
        phaseChecksum: terrain.witness.phaseChecksum,
        phaseInfluenceChecksum: terrain.witness.phaseInfluenceChecksum,
        trailSeedMethod: terrain.witness.trailSeedMethod,
        trailCandidateChecksum: terrain.witness.trailCandidateChecksum
      },
      supportFrame: {
        supportClass: terrain.witness.supportFrame.supportClass,
        mappingMode: terrain.witness.supportFrame.mappingMode,
        supportEpoch: terrain.witness.supportFrame.supportEpoch,
        topologyEpoch: terrain.witness.supportFrame.topologyEpoch,
        substrateTileCount: terrain.witness.supportFrame.substrateTileCount,
        dirtySubstrateTileCount: terrain.witness.supportFrame.dirtySubstrateTileCount,
        supportFrameChecksum: terrain.witness.supportFrame.supportFrameChecksum,
        maxHeightDelta: terrain.witness.supportFrame.maxHeightDelta,
        maxSurfaceSpeed: terrain.witness.supportFrame.maxSurfaceSpeed
      },
      downgrades: [
        'host_visualization_not_source_truth',
        'terrain_only_not_full_vertical',
        'kaminos_preview_bench_not_lerms_world_law'
      ],
      rejectedSurfaces: [
        {
          route: 'http://127.0.0.1:5187/',
          acceptanceSurface: false,
          reason: 'local Vite preview is Hill debug/operator smoke, not the Kaminos Preview Bench acceptance surface'
        }
      ],
      custody: {
        sourceOwns: [
          'terrain generation',
          'terrain buffer schema',
          'terrain source truth',
          'phase/support-frame semantics',
          'full-vertical acceptance boundary'
        ],
        kaminosOwns: [
          'host display',
          'route/source/fallback badges',
          'browser witness capture',
          'Preview Bench camera/witness mechanics'
        ]
      }
    }
  };
}

export function writeHillOfHillsPreviewBenchPayloadReport(
  reportPath = DEFAULT_REPORT_PATH,
  params: Partial<HillOfHillsTerrainParams> = {},
  sourceOptions: HillOfHillsSourceOptions = {},
  options: Omit<HillPreviewBenchPayloadOptions, 'reportPath'> = {}
): KaminosPreviewBenchPayloadReport {
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
      route: 'hill-of-hills/preview-bench-payload',
      frameId: 'hill-of-hills-preview-bench-payload-frame',
      configId: 'hill-of-hills-preview-bench-payload-v0',
      timestampMs: Date.now(),
      sampleAgeMs: 0,
      ...sourceOptions
    }
  );
  const report = createHillOfHillsPreviewBenchPayloadReport(terrain, {
    reportPath,
    sourceRef: options.sourceRef ?? sourceRefFromEnvironment(),
    generatedAt: options.generatedAt,
    observedAt: options.observedAt
  });
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  return report;
}

function terrainPreviewFields(
  terrain: HillOfHillsTerrain,
  terrainBuffer: HillOfHillsTerrainBuffer
): readonly {
  label: string;
  value: string | number;
}[] {
  return [
    { label: 'Terrain buffer', value: terrainBuffer.schema },
    { label: 'Authority', value: terrain.source.authority },
    { label: 'Route', value: terrain.source.route },
    { label: 'Grid', value: `${terrain.witness.gridResolution.x} x ${terrain.witness.gridResolution.z}` },
    { label: 'Samples', value: terrain.witness.sampleCount },
    { label: 'Sample checksum', value: terrain.witness.sampleChecksum },
    { label: 'Topology checksum', value: terrain.witness.topologyChecksum },
    { label: 'Material checksum', value: terrain.witness.proxyMaterialChecksum },
    { label: 'Phase', value: terrain.witness.phaseMode },
    { label: 'Active phases', value: terrain.witness.activePhaseCount },
    { label: 'Route pressure max', value: terrain.witness.topologyRanges.routePressure.max.toFixed(3) },
    { label: 'Ditch potential max', value: terrain.witness.topologyRanges.ditchPotential.max.toFixed(3) },
    { label: 'Growth potential max', value: terrain.witness.topologyRanges.growthPotential.max.toFixed(3) },
    { label: 'Support checksum', value: terrain.witness.supportFrame.supportFrameChecksum }
  ];
}

function terrainBufferSummary(buffer: HillOfHillsTerrainBuffer): HillOfHillsPreviewBenchPayload['terrainBuffer'] {
  return {
    schema: buffer.schema,
    sampleSchema: buffer.sampleSchema,
    witnessSchema: buffer.witnessSchema,
    transport: 'summary_only_typed_arrays_remain_source_owned',
    gridResolution: buffer.gridResolution,
    sampleCount: buffer.sampleCount,
    sampleChecksum: buffer.sampleChecksum,
    topologyChecksum: buffer.topologyChecksum,
    proxyMaterialChecksum: buffer.proxyMaterialChecksum,
    heightRange: buffer.heightRange,
    channelLayout: buffer.channelLayout,
    byteLengths: {
      positions: buffer.positions.byteLength,
      normals: buffer.normals.byteLength,
      colors: buffer.colors.byteLength,
      metrics: buffer.metrics.byteLength,
      regionCodes: buffer.regionCodes.byteLength,
      materialCodes: buffer.materialCodes.byteLength
    }
  };
}

function sourceRefFromEnvironment(): HillPreviewBenchPayloadSourceRef {
  return {
    repo: process.env.LERMS_SOURCE_REPO ?? 'lerms',
    branch: process.env.LERMS_SOURCE_BRANCH ?? process.env.GIT_BRANCH ?? 'unknown',
    commit: process.env.LERMS_SOURCE_COMMIT ?? process.env.GIT_COMMIT ?? 'unknown'
  };
}

if (process.argv[1]?.endsWith('hill-of-hills-preview-bench-payload.js')) {
  const outputPath = process.argv[2] ?? process.env.LERMS_HILL_PREVIEW_BENCH_PAYLOAD_OUT ?? DEFAULT_REPORT_PATH;
  const report = writeHillOfHillsPreviewBenchPayloadReport(outputPath);
  process.stdout.write(`${JSON.stringify({ ok: true, path: outputPath, schema: report.schema, payloadSchema: report.payload.schema })}\n`);
}
