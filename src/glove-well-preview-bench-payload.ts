import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildGloveWellLaunchWitnessReport,
  type GloveWellLaunchWitnessReport
} from './glove-well-command.ts';
import {
  buildGoinGloveWealthWitnessReport,
  type GoinGloveWealthWitnessReport
} from './goin-glove-wealth-witness.ts';
import type { SimulationAuthority, SourceTruth, Vec3 } from './contracts/first-vertical.ts';

export const KAMINOS_PREVIEW_BENCH_PAYLOAD_REPORT_SCHEMA = 'kaminos.preview-bench.payload-report.v0' as const;
export const KAMINOS_PREVIEW_BENCH_PAYLOAD_REPORT_ROUTE = 'kaminos/preview-bench/payload-file' as const;
export const LERMS_GLOVE_WELL_PREVIEW_BENCH_PAYLOAD_SCHEMA = 'lerms.glove-well-preview-bench-payload.v0' as const;
export const LERMS_GLOVE_WELL_PREVIEW_BENCH_PAYLOAD_ROUTE = 'lerms/glove-well/preview-bench-payload-file' as const;

type PreviewMarkerKind = 'glove_well_launch' | 'rolling_goin' | 'carrier_drop' | 'reroute_lure';

interface CliArgs {
  report: string | null;
  frameId: string;
  timestampMs: number;
  maxSampleAgeMs: number;
}

interface PreviewBenchPayloadSource extends SourceTruth {
  requestedRoute: typeof KAMINOS_PREVIEW_BENCH_PAYLOAD_REPORT_ROUTE;
  effectiveRoute: typeof KAMINOS_PREVIEW_BENCH_PAYLOAD_REPORT_ROUTE;
  fallbackReason: string | null;
}

interface PreviewBenchAcceptanceSurface {
  kind: 'kaminos_preview_bench_payload';
  worldChamberId: 'lerms-underhill';
  posture: 'inspect';
  bench: 'terrain-preview';
  routeQuery: 'world_chamber=lerms-underhill&posture=inspect&bench=terrain-preview';
  expectedHost: 'kaminos_workbench_kiln_preview_bench';
}

interface PreviewBenchPayloadSourceTruth {
  effectiveAuthority: SimulationAuthority;
  sourceSchemas: string[];
  sourceRoutes: string[];
  fixtureInputDowngrade: boolean;
  goinObjecthoodAuthority: SimulationAuthority;
  gloveWellLaunchAuthority: SimulationAuthority;
  maxSampleAgeMs: number;
  fallbackReasons: string[];
}

interface PreviewBenchCustody {
  sourceDiaulos: 'greedy-glove-fucker';
  hostDiaulos: 'gutterglass-pornographer';
  worldChamberCustody: 'minion-spawnfucker';
  sourceOwns: string[];
  greedyOwns: string[];
  kaminosOwns: string[];
}

interface PreviewBenchObjectMarker {
  kind: PreviewMarkerKind;
  id: string;
  label: string;
  world: Vec3 | null;
  authority: SimulationAuthority;
  route: string;
}

interface PreviewBenchHints {
  focusKind: 'glove_well_goin';
  title: 'Glove Well / goin custody witness';
  routeBadges: string[];
  objectMarkers: PreviewBenchObjectMarker[];
}

interface PreviewBenchGloveWellSummary {
  phaseTrace: string;
  releaseEventId: string;
  sourceInputFrameId: string;
  depthPolicy: 'non_load_bearing';
  arcSampleCount: number;
  launchedGoinId: string;
  rerouteHintCount: number;
}

interface PreviewBenchGoinObjecthoodSummary {
  goinCount: number;
  rollingGoinCount: number;
  carriedGoinCount: number;
  carrierDropChain: GoinGloveWealthWitnessReport['carrierDropChain'];
  stateCounts: GoinGloveWealthWitnessReport['summary']['goinStateCounts'];
  rerouteHintCount: number;
}

interface PreviewBenchFakeBoundary {
  liveOperatorCameraSmoke: true;
  liveWilorSidecarManager: true;
  finalGoinMesh: true;
  fullCrowdAi: true;
  fullFirstVerticalSuccess: true;
  carrierDropJuiceHitMergeForGloveWellThrow: true;
}

export interface PreviewBenchThrowPhysicsSummary {
  schema: string;
  route: string;
  bounceCount: number;
  trajectorySampleCount: number;
  phaseTrace: string;
  effectiveAuthority: SimulationAuthority;
  fixtureInputDowngrade: boolean;
}

export interface GloveWellPreviewBenchPayload {
  schema: typeof LERMS_GLOVE_WELL_PREVIEW_BENCH_PAYLOAD_SCHEMA;
  route: typeof LERMS_GLOVE_WELL_PREVIEW_BENCH_PAYLOAD_ROUTE;
  label: 'Greedy Glove Well / goin payload';
  acceptanceSurface: PreviewBenchAcceptanceSurface;
  source: PreviewBenchPayloadSource;
  sourceTruth: PreviewBenchPayloadSourceTruth;
  summary: Record<string, string | number | boolean>;
  fields: Array<{ label: string; value: string | number | boolean }>;
  downgrades: string[];
  rejectedSurfaces: string[];
  custody: PreviewBenchCustody;
  gloveWell: PreviewBenchGloveWellSummary;
  goinObjecthood: PreviewBenchGoinObjecthoodSummary;
  benchHints: PreviewBenchHints;
  throwPhysics?: PreviewBenchThrowPhysicsSummary;
  sourceReports: {
    gloveWellLaunch: GloveWellLaunchWitnessReport;
    goinObjecthood: GoinGloveWealthWitnessReport;
  };
  whatRemainsFake: PreviewBenchFakeBoundary;
}

export interface GloveWellPreviewBenchPayloadReport {
  ok: true;
  schema: typeof KAMINOS_PREVIEW_BENCH_PAYLOAD_REPORT_SCHEMA;
  route: typeof KAMINOS_PREVIEW_BENCH_PAYLOAD_REPORT_ROUTE;
  outputPath: string;
  reportPath: string;
  frameId: string;
  timestampMs: number;
  payload: GloveWellPreviewBenchPayload;
}

interface GloveWellPreviewBenchPayloadFailureReport {
  ok: false;
  schema: typeof KAMINOS_PREVIEW_BENCH_PAYLOAD_REPORT_SCHEMA;
  route: typeof KAMINOS_PREVIEW_BENCH_PAYLOAD_REPORT_ROUTE;
  phase: 'building-glove-well-preview-bench-payload';
  failureKind: 'glove-well-preview-bench-payload-invalid';
  error: string;
  lastTrustworthyEvidence: {
    outputPath: string;
    frameId: string;
    timestampMs: number;
    maxSampleAgeMs: number;
  };
}

export interface BuildGloveWellPreviewBenchPayloadOptions {
  outputPath: string;
  frameId?: string;
  timestampMs?: number;
  maxSampleAgeMs?: number;
}

export function buildGloveWellPreviewBenchPayloadReport({
  outputPath,
  frameId = 'glove-well-preview-bench-payload',
  timestampMs = 0,
  maxSampleAgeMs = 500
}: BuildGloveWellPreviewBenchPayloadOptions): GloveWellPreviewBenchPayloadReport {
  assertFinite(timestampMs, 'timestampMs');
  assertFinite(maxSampleAgeMs, 'maxSampleAgeMs');

  const gloveWellLaunch = buildGloveWellLaunchWitnessReport({
    outputPath: `${outputPath}#glove-well-launch`,
    frameId: `${frameId}-glove-well`,
    timestampMs,
    maxSampleAgeMs
  });
  const goinObjecthood = buildGoinGloveWealthWitnessReport({
    outputPath: `${outputPath}#goin-objecthood`,
    frameId: `${frameId}-goin-objecthood`,
    timestampMs: timestampMs + 20,
    maxSampleAgeMs
  });
  const payload = buildPayload({
    frameId,
    timestampMs,
    maxSampleAgeMs,
    gloveWellLaunch,
    goinObjecthood
  });

  return {
    ok: true,
    schema: KAMINOS_PREVIEW_BENCH_PAYLOAD_REPORT_SCHEMA,
    route: KAMINOS_PREVIEW_BENCH_PAYLOAD_REPORT_ROUTE,
    outputPath,
    reportPath: outputPath,
    frameId,
    timestampMs,
    payload
  };
}

export function runGloveWellPreviewBenchPayloadCli(argv = process.argv.slice(2)): number {
  const partialArgs = readPartialArgs(argv);
  let args: CliArgs;

  try {
    args = parseArgs(argv);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    if (partialArgs.report) {
      writeJson(partialArgs.report, buildFailureReport(partialArgs, error));
    }
    return 1;
  }

  if (!args.report) {
    process.stderr.write('missing required --report path\n');
    return 1;
  }

  try {
    writeJson(
      args.report,
      buildGloveWellPreviewBenchPayloadReport({
        outputPath: args.report,
        frameId: args.frameId,
        timestampMs: args.timestampMs,
        maxSampleAgeMs: args.maxSampleAgeMs
      })
    );
    return 0;
  } catch (error) {
    writeJson(args.report, buildFailureReport(args, error));
    return 1;
  }
}

function buildPayload({
  frameId,
  timestampMs,
  maxSampleAgeMs,
  gloveWellLaunch,
  goinObjecthood
}: {
  frameId: string;
  timestampMs: number;
  maxSampleAgeMs: number;
  gloveWellLaunch: GloveWellLaunchWitnessReport;
  goinObjecthood: GoinGloveWealthWitnessReport;
}): GloveWellPreviewBenchPayload {
  const sourceTruth = summarizeSourceTruth(gloveWellLaunch, goinObjecthood, maxSampleAgeMs);
  const payloadSource: PreviewBenchPayloadSource = {
    schema: 'lerms.source-truth.v0',
    authority: sourceTruth.effectiveAuthority,
    route: LERMS_GLOVE_WELL_PREVIEW_BENCH_PAYLOAD_ROUTE,
    frameId,
    timestampMs,
    sampleAgeMs: sourceTruth.maxSampleAgeMs,
    backend: 'lerms-greedy-glove-preview-bench-exporter',
    configId: 'greedy-glove-preview-bench-payload-v0',
    requestedRoute: KAMINOS_PREVIEW_BENCH_PAYLOAD_REPORT_ROUTE,
    effectiveRoute: KAMINOS_PREVIEW_BENCH_PAYLOAD_REPORT_ROUTE,
    fallbackReason: null
  };

  return {
    schema: LERMS_GLOVE_WELL_PREVIEW_BENCH_PAYLOAD_SCHEMA,
    route: LERMS_GLOVE_WELL_PREVIEW_BENCH_PAYLOAD_ROUTE,
    label: 'Greedy Glove Well / goin payload',
    acceptanceSurface: {
      kind: 'kaminos_preview_bench_payload',
      worldChamberId: 'lerms-underhill',
      posture: 'inspect',
      bench: 'terrain-preview',
      routeQuery: 'world_chamber=lerms-underhill&posture=inspect&bench=terrain-preview',
      expectedHost: 'kaminos_workbench_kiln_preview_bench'
    },
    source: payloadSource,
    sourceTruth,
    summary: {
      authority: sourceTruth.effectiveAuthority,
      phaseTrace: summarizeGloveWell(gloveWellLaunch).phaseTrace,
      goinCount: goinObjecthood.summary.goinCount,
      carrierDrops: goinObjecthood.summary.carrierDropCount,
      fixtureInputDowngrade: sourceTruth.fixtureInputDowngrade
    },
    fields: [
      { label: 'Authority', value: sourceTruth.effectiveAuthority },
      { label: 'Glove Well phases', value: summarizeGloveWell(gloveWellLaunch).phaseTrace },
      { label: 'Goins', value: goinObjecthood.summary.goinCount },
      { label: 'Carrier drops', value: goinObjecthood.summary.carrierDropCount },
      { label: 'Fixture downgrade', value: sourceTruth.fixtureInputDowngrade }
    ],
    downgrades: [
      'fixture_glove_input_not_live_wilor',
      'preview_bench_transport_not_source_authority',
      'no_operator_camera_sidecar_manager',
      'no_glove_well_carrier_drop_juice_hit_merge',
      'not_full_first_vertical_success'
    ],
    rejectedSurfaces: [
      'browser/?greedy_glove=1',
      'kaminos.preview-bench route is display transport only',
      'fixture filmstrip is not live WiLoR camera evidence'
    ],
    custody: {
      sourceDiaulos: 'greedy-glove-fucker',
      hostDiaulos: 'gutterglass-pornographer',
      worldChamberCustody: 'minion-spawnfucker',
      sourceOwns: [
        'payload semantics',
        'source schemas and routes',
        'freshness and authority declarations',
        'goin/Glove Well domain truth'
      ],
      greedyOwns: [
        'goin physics/custody law',
        'Glove Well packet-to-command law',
        'fixture/live/source-truth downgrade declarations'
      ],
      kaminosOwns: [
        'Preview Bench host rendering',
        'payload loading route',
        'operator-visible route/source/fallback badges'
      ]
    },
    gloveWell: summarizeGloveWell(gloveWellLaunch),
    goinObjecthood: summarizeGoinObjecthood(goinObjecthood),
    benchHints: buildBenchHints(gloveWellLaunch, goinObjecthood),
    sourceReports: {
      gloveWellLaunch,
      goinObjecthood
    },
    whatRemainsFake: {
      liveOperatorCameraSmoke: true,
      liveWilorSidecarManager: true,
      finalGoinMesh: true,
      fullCrowdAi: true,
      fullFirstVerticalSuccess: true,
      carrierDropJuiceHitMergeForGloveWellThrow: true
    }
  };
}

function summarizeSourceTruth(
  gloveWellLaunch: GloveWellLaunchWitnessReport,
  goinObjecthood: GoinGloveWealthWitnessReport,
  maxSampleAgeMs: number
): PreviewBenchPayloadSourceTruth {
  const gloveWellAuthority = gloveWellLaunch.frame.source.authority;
  const goinAuthority = goinObjecthood.sourceTruthEvaluation.effectiveAuthority;

  return {
    effectiveAuthority: weakestAuthority([gloveWellAuthority, goinAuthority]),
    sourceSchemas: [gloveWellLaunch.schema, goinObjecthood.schema],
    sourceRoutes: [gloveWellLaunch.route, goinObjecthood.route],
    fixtureInputDowngrade: gloveWellAuthority === 'synthetic_fixture',
    goinObjecthoodAuthority: goinAuthority,
    gloveWellLaunchAuthority: gloveWellAuthority,
    maxSampleAgeMs: Math.max(gloveWellLaunch.frame.source.sampleAgeMs, goinObjecthood.frame.source.sampleAgeMs),
    fallbackReasons: collectFallbackReasons(gloveWellLaunch)
  };
}

function summarizeGloveWell(report: GloveWellLaunchWitnessReport): PreviewBenchGloveWellSummary {
  return {
    phaseTrace: report.commands.map((command) => command.phase).join('>'),
    releaseEventId: report.launchEvidence.releaseEventId,
    sourceInputFrameId: report.launchEvidence.sourceInputFrameId,
    depthPolicy: report.inputFrames[0]?.coordinateFrame.depthPolicy ?? 'non_load_bearing',
    arcSampleCount: report.launchEvidence.arcSamples.length,
    launchedGoinId: report.launchEvidence.launchedGoinId,
    rerouteHintCount: report.rerouteHints.length
  };
}

function summarizeGoinObjecthood(report: GoinGloveWealthWitnessReport): PreviewBenchGoinObjecthoodSummary {
  return {
    goinCount: report.summary.goinCount,
    rollingGoinCount: report.summary.rollingGoinCount,
    carriedGoinCount: report.summary.carriedGoinCount,
    carrierDropChain: report.carrierDropChain,
    stateCounts: report.summary.goinStateCounts,
    rerouteHintCount: report.rerouteHints.length
  };
}

function buildBenchHints(
  gloveWellLaunch: GloveWellLaunchWitnessReport,
  goinObjecthood: GoinGloveWealthWitnessReport
): PreviewBenchHints {
  const launched = gloveWellLaunch.frame.goins.find((goin) => goin.id === gloveWellLaunch.launchEvidence.launchedGoinId);
  const rolling = goinObjecthood.frame.goins.find((goin) => goin.id === goinObjecthood.carrierDropChain.rollingGoinId);
  const drop = goinObjecthood.frame.carrierDropEvents.find((event) => event.id === goinObjecthood.carrierDropChain.dropId);
  const lure = goinObjecthood.rerouteHints[0];

  return {
    focusKind: 'glove_well_goin',
    title: 'Glove Well / goin custody witness',
    routeBadges: ['fixture input', 'source truth downgraded', 'goin objecthood live-ish', 'Preview Bench transport'],
    objectMarkers: [
      {
        kind: 'glove_well_launch',
        id: gloveWellLaunch.launchEvidence.releaseEventId,
        label: 'fixture Glove Well launch',
        world: launched?.world ?? null,
        authority: gloveWellLaunch.frame.source.authority,
        route: gloveWellLaunch.route
      },
      {
        kind: 'rolling_goin',
        id: goinObjecthood.carrierDropChain.rollingGoinId,
        label: 'rolling goin lure',
        world: rolling?.world ?? null,
        authority: rolling?.source.authority ?? goinObjecthood.sourceTruthEvaluation.effectiveAuthority,
        route: goinObjecthood.route
      },
      {
        kind: 'carrier_drop',
        id: goinObjecthood.carrierDropChain.dropId,
        label: 'hit-caused carrier drop',
        world: drop?.world ?? null,
        authority: drop?.source.authority ?? goinObjecthood.sourceTruthEvaluation.effectiveAuthority,
        route: goinObjecthood.route
      },
      {
        kind: 'reroute_lure',
        id: lure?.targetGoinId ?? goinObjecthood.carrierDropChain.rollingGoinId,
        label: 'nearby lerm desire reroute',
        world: rolling?.world ?? null,
        authority: lure?.source.authority ?? goinObjecthood.sourceTruthEvaluation.effectiveAuthority,
        route: goinObjecthood.route
      }
    ]
  };
}

function collectFallbackReasons(report: GloveWellLaunchWitnessReport): string[] {
  return [
    ...new Set(
      report.inputFrames
        .map((frame) => frame.source.fallbackReason)
        .filter((reason): reason is string => Boolean(reason))
    )
  ];
}

function weakestAuthority(authorities: readonly SimulationAuthority[]): SimulationAuthority {
  const rank: Record<SimulationAuthority, number> = {
    invalid: 0,
    fallback: 1,
    visual_only: 2,
    synthetic_fixture: 3,
    stale_hold: 4,
    live_simulation: 5
  };
  return authorities.reduce(
    (weakest, authority) => (rank[authority] < rank[weakest] ? authority : weakest),
    'live_simulation' as SimulationAuthority
  );
}

function parseArgs(argv: readonly string[]): CliArgs {
  const partial = readPartialArgs(argv);
  if (!partial.report) {
    return {
      ...partial,
      report: null
    };
  }
  assertFinite(partial.timestampMs, 'timestamp-ms');
  assertFinite(partial.maxSampleAgeMs, 'max-sample-age-ms');
  return partial;
}

function readPartialArgs(argv: readonly string[]): CliArgs {
  const args: CliArgs = {
    report: null,
    frameId: 'glove-well-preview-bench-payload',
    timestampMs: 0,
    maxSampleAgeMs: 500
  };

  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1];

    if (!key.startsWith('--')) {
      continue;
    }

    if (value === undefined || value.startsWith('--')) {
      throw new Error(`missing value for ${key}`);
    }

    if (key === '--report') args.report = value;
    else if (key === '--frame-id') args.frameId = value;
    else if (key === '--timestamp-ms') args.timestampMs = Number(value);
    else if (key === '--max-sample-age-ms') args.maxSampleAgeMs = Number(value);
    else throw new Error(`unknown argument ${key}`);

    index += 1;
  }

  return args;
}

function buildFailureReport(
  args: Pick<CliArgs, 'report' | 'frameId' | 'timestampMs' | 'maxSampleAgeMs'>,
  error: unknown
): GloveWellPreviewBenchPayloadFailureReport {
  return {
    ok: false,
    schema: KAMINOS_PREVIEW_BENCH_PAYLOAD_REPORT_SCHEMA,
    route: KAMINOS_PREVIEW_BENCH_PAYLOAD_REPORT_ROUTE,
    phase: 'building-glove-well-preview-bench-payload',
    failureKind: 'glove-well-preview-bench-payload-invalid',
    error: error instanceof Error ? error.message : String(error),
    lastTrustworthyEvidence: {
      outputPath: args.report ?? '',
      frameId: args.frameId,
      timestampMs: args.timestampMs,
      maxSampleAgeMs: args.maxSampleAgeMs
    }
  };
}

function assertFinite(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be finite`);
  }
}

function writeJson(path: string, payload: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(payload, null, 2)}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = runGloveWellPreviewBenchPayloadCli();
}
