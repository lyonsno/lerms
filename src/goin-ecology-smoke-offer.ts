import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildGoinEcologyMergeWitnessReport,
  GOIN_ECOLOGY_MERGE_WITNESS_SCHEMA,
  type GoinEcologyMergeWitnessReport
} from './goin-ecology-merge-witness.ts';
import {
  KAMINOS_PREVIEW_BENCH_PAYLOAD_REPORT_ROUTE,
  KAMINOS_PREVIEW_BENCH_PAYLOAD_REPORT_SCHEMA
} from './glove-well-preview-bench-payload.ts';

export const KAMINOS_FORGE_HOST_SMOKE_OFFER_SCHEMA = 'kaminos.forge-host.smoke-offer.v0' as const;
export const KAMINOS_PREVIEW_BENCH_SMOKE_OFFER_ROUTE = 'kaminos/preview-bench/smoke-offer-file' as const;
export const LERMS_GOIN_ECOLOGY_PREVIEW_BENCH_PAYLOAD_SCHEMA = 'lerms.goin-ecology-preview-bench-payload.v0' as const;
export const LERMS_GOIN_ECOLOGY_PREVIEW_BENCH_PAYLOAD_ROUTE = 'lerms/goin-ecology/preview-bench-payload-file' as const;

interface CliArgs {
  report: string | null;
  sourceRef: string | null;
  sourceCommit: string | null;
  frameId: string;
  timestampMs: number;
  sampleAgeMs: number;
  maxSampleAgeMs: number;
  generatedAt: string | null;
  observedAt: string | null;
  freshnessBudgetMs: number;
}

interface SmokeOfferSource {
  authority: 'fixture' | 'live' | 'fallback' | 'stale';
  sourceTruthAuthority: string;
  producerDiaulos: 'greedy-glove-fucker';
  sourceRef: string;
  route: string;
  commit: string;
}

interface Freshness {
  generatedAt: string;
  observedAt: string;
  budgetMs: number;
  status: 'fresh-fixture';
}

interface SurfaceRef {
  id: string;
  route?: string;
  host?: string;
  worldChamberId?: 'lerms-underhill';
  posture?: 'inspect';
  bench?: 'terrain-preview';
  station?: string;
}

interface Field {
  label: string;
  value: string | number | boolean;
}

interface RejectedDebugSurface {
  id: string;
  reason: string;
}

interface GoinEcologyPreviewBenchPayload {
  schema: typeof LERMS_GOIN_ECOLOGY_PREVIEW_BENCH_PAYLOAD_SCHEMA;
  route: typeof LERMS_GOIN_ECOLOGY_PREVIEW_BENCH_PAYLOAD_ROUTE;
  label: 'Greedy goin ecology merge payload';
  source: SmokeOfferSource;
  sourceTruth: {
    effectiveAuthority: string;
    accepted: boolean;
    blockers: string[];
  };
  summary: {
    goinCount: number;
    rollingGoinCount: number;
    juiceHitCount: number;
    carrierDropCount: number;
    sharedDesireHintCount: number;
  };
  fields: Field[];
  downgrades: string[];
  rejectedSurfaces: string[];
  custody: {
    sourceDiaulos: 'greedy-glove-fucker';
    hostDiaulos: 'gutterglass-pornographer';
    sourceOwns: string[];
    kaminosOwns: string[];
  };
  sourceReports: {
    goinEcologyMerge: GoinEcologyMergeWitnessReport;
  };
}

interface GoinEcologyPayloadReport {
  ok: true;
  schema: typeof KAMINOS_PREVIEW_BENCH_PAYLOAD_REPORT_SCHEMA;
  route: typeof KAMINOS_PREVIEW_BENCH_PAYLOAD_REPORT_ROUTE;
  outputPath: string;
  reportPath: string;
  frameId: string;
  timestampMs: number;
  payload: GoinEcologyPreviewBenchPayload;
}

interface SmokeOffer {
  id: 'greedy-goin-ecology-merge';
  label: 'Greedy Goin Ecology Merge';
  schema: typeof GOIN_ECOLOGY_MERGE_WITNESS_SCHEMA;
  route: 'lerms/goin-ecology-merge/witness-file';
  payloadSchema: typeof LERMS_GOIN_ECOLOGY_PREVIEW_BENCH_PAYLOAD_SCHEMA;
  source: SmokeOfferSource;
  freshness: Freshness;
  targetSurface: SurfaceRef;
  acceptanceSurface: SurfaceRef;
  summary: GoinEcologyPreviewBenchPayload['summary'];
  fields: Field[];
  downgrades: string[];
  rejectedDebugSurfaces: RejectedDebugSurface[];
  payloadReport: GoinEcologyPayloadReport;
}

export interface GoinEcologySmokeOfferReport {
  ok: true;
  schema: typeof KAMINOS_FORGE_HOST_SMOKE_OFFER_SCHEMA;
  route: typeof KAMINOS_PREVIEW_BENCH_SMOKE_OFFER_ROUTE;
  producerDiaulos: 'greedy-glove-fucker';
  source: SmokeOfferSource;
  freshness: Freshness;
  targetSurface: SurfaceRef;
  acceptanceSurface: SurfaceRef;
  offers: [SmokeOffer];
  downgrades: string[];
  rejectedDebugSurfaces: RejectedDebugSurface[];
  whatRemainsFake: {
    liveOperatorCameraSmoke: true;
    sidecarProcessManager: true;
    finalGoinMesh: true;
    fullCrowdAi: true;
    finalTreasureEconomy: true;
    fullFirstVerticalSuccess: true;
  };
}

interface FailureReport {
  ok: false;
  schema: typeof KAMINOS_FORGE_HOST_SMOKE_OFFER_SCHEMA;
  route: typeof KAMINOS_PREVIEW_BENCH_SMOKE_OFFER_ROUTE;
  phase: 'building-goin-ecology-smoke-offer';
  failureKind: 'goin-ecology-smoke-offer-invalid';
  error: string;
  lastTrustworthyEvidence: {
    outputPath: string;
    sourceRef: string | null;
    frameId: string;
    timestampMs: number;
  };
}

export interface BuildGoinEcologySmokeOfferOptions {
  outputPath: string;
  sourceRef: string;
  sourceCommit?: string | null;
  frameId?: string;
  timestampMs?: number;
  sampleAgeMs?: number;
  maxSampleAgeMs?: number;
  generatedAt?: string | null;
  observedAt?: string | null;
  freshnessBudgetMs?: number;
}

export function buildGoinEcologySmokeOfferReport({
  outputPath,
  sourceRef,
  sourceCommit = null,
  frameId = 'goin-ecology-smoke-offer',
  timestampMs = 0,
  sampleAgeMs = 0,
  maxSampleAgeMs = 500,
  generatedAt = null,
  observedAt = null,
  freshnessBudgetMs = 86_400_000
}: BuildGoinEcologySmokeOfferOptions): GoinEcologySmokeOfferReport {
  assertFinite(timestampMs, 'timestampMs');
  assertFinite(sampleAgeMs, 'sampleAgeMs');
  assertFinite(maxSampleAgeMs, 'maxSampleAgeMs');
  assertFinite(freshnessBudgetMs, 'freshnessBudgetMs');
  if (!sourceRef) throw new Error('sourceRef is required');

  const goinEcologyMerge = buildGoinEcologyMergeWitnessReport({
    outputPath: `${outputPath}#goin-ecology-merge`,
    frameId: `${frameId}-merge`,
    timestampMs,
    sampleAgeMs,
    maxSampleAgeMs
  });
  const observed = observedAt ?? generatedAt ?? new Date().toISOString();
  const generated = generatedAt ?? observed;
  const source = buildSource(sourceRef, sourceCommit, goinEcologyMerge);
  const freshness: Freshness = {
    generatedAt: generated,
    observedAt: observed,
    budgetMs: freshnessBudgetMs,
    status: 'fresh-fixture'
  };
  const targetSurface = buildTargetSurface('goin-ecology-merge');
  const acceptanceSurface = buildAcceptanceSurface();
  const downgrades = unique([
    ...goinEcologyMerge.sourceTruth.downgrades,
    ...(sourceCommit ? [] : ['missing_git_source_commit_downgrades_offer']),
    'forge_host_smoke_offer_is_not_source_authority'
  ]);
  const rejectedDebugSurfaces = buildRejectedDebugSurfaces();
  const summary = {
    goinCount: goinEcologyMerge.summary.goinCount,
    rollingGoinCount: goinEcologyMerge.summary.rollingGoinCount,
    juiceHitCount: goinEcologyMerge.summary.juiceHitCount,
    carrierDropCount: goinEcologyMerge.summary.carrierDropCount,
    sharedDesireHintCount: goinEcologyMerge.sharedDesireHints.length
  };
  const fields = [
    { label: 'rolling goins', value: summary.rollingGoinCount },
    { label: 'desire hints', value: summary.sharedDesireHintCount },
    { label: 'carrier drops', value: summary.carrierDropCount },
    { label: 'source truth accepted', value: goinEcologyMerge.sourceTruthEvaluation.accepted },
    { label: 'source truth blocker', value: goinEcologyMerge.sourceTruthEvaluation.blockers.join(', ') || 'none' }
  ];
  const payloadReport = buildPayloadReport({
    outputPath,
    frameId,
    timestampMs,
    source,
    summary,
    fields,
    downgrades,
    goinEcologyMerge
  });

  return {
    ok: true,
    schema: KAMINOS_FORGE_HOST_SMOKE_OFFER_SCHEMA,
    route: KAMINOS_PREVIEW_BENCH_SMOKE_OFFER_ROUTE,
    producerDiaulos: 'greedy-glove-fucker',
    source,
    freshness,
    targetSurface,
    acceptanceSurface,
    offers: [
      {
        id: 'greedy-goin-ecology-merge',
        label: 'Greedy Goin Ecology Merge',
        schema: GOIN_ECOLOGY_MERGE_WITNESS_SCHEMA,
        route: 'lerms/goin-ecology-merge/witness-file',
        payloadSchema: LERMS_GOIN_ECOLOGY_PREVIEW_BENCH_PAYLOAD_SCHEMA,
        source,
        freshness,
        targetSurface,
        acceptanceSurface,
        summary,
        fields,
        downgrades,
        rejectedDebugSurfaces,
        payloadReport
      }
    ],
    downgrades,
    rejectedDebugSurfaces,
    whatRemainsFake: {
      liveOperatorCameraSmoke: true,
      sidecarProcessManager: true,
      finalGoinMesh: true,
      fullCrowdAi: true,
      finalTreasureEconomy: true,
      fullFirstVerticalSuccess: true
    }
  };
}

export function runGoinEcologySmokeOfferCli(argv = process.argv.slice(2)): number {
  const partialArgs = readPartialArgs(argv);
  let args: CliArgs;

  try {
    args = parseArgs(argv);
  } catch (error) {
    process.stderr.write(`${messageFor(error)}\n`);
    if (partialArgs.report) writeJson(partialArgs.report, buildFailureReport(partialArgs, error));
    return 1;
  }

  if (!args.report) {
    process.stderr.write('missing required --report path\n');
    return 1;
  }
  if (!args.sourceRef) {
    process.stderr.write('missing required --source-ref path\n');
    writeJson(args.report, buildFailureReport(args, new Error('missing required --source-ref path')));
    return 1;
  }

  try {
    writeJson(
      args.report,
      buildGoinEcologySmokeOfferReport({
        outputPath: args.report,
        sourceRef: args.sourceRef,
        sourceCommit: args.sourceCommit,
        frameId: args.frameId,
        timestampMs: args.timestampMs,
        sampleAgeMs: args.sampleAgeMs,
        maxSampleAgeMs: args.maxSampleAgeMs,
        generatedAt: args.generatedAt,
        observedAt: args.observedAt,
        freshnessBudgetMs: args.freshnessBudgetMs
      })
    );
    return 0;
  } catch (error) {
    writeJson(args.report, buildFailureReport(args, error));
    return 1;
  }
}

function buildSource(
  sourceRef: string,
  sourceCommit: string | null,
  goinEcologyMerge: GoinEcologyMergeWitnessReport
): SmokeOfferSource {
  return {
    authority: 'fixture',
    sourceTruthAuthority: goinEcologyMerge.sourceTruth.effectiveAuthority,
    producerDiaulos: 'greedy-glove-fucker',
    sourceRef,
    route: goinEcologyMerge.route,
    commit: sourceCommit ?? 'unrecorded-source-commit'
  };
}

function buildPayloadReport({
  outputPath,
  frameId,
  timestampMs,
  source,
  summary,
  fields,
  downgrades,
  goinEcologyMerge
}: {
  outputPath: string;
  frameId: string;
  timestampMs: number;
  source: SmokeOfferSource;
  summary: GoinEcologyPreviewBenchPayload['summary'];
  fields: Field[];
  downgrades: string[];
  goinEcologyMerge: GoinEcologyMergeWitnessReport;
}): GoinEcologyPayloadReport {
  return {
    ok: true,
    schema: KAMINOS_PREVIEW_BENCH_PAYLOAD_REPORT_SCHEMA,
    route: KAMINOS_PREVIEW_BENCH_PAYLOAD_REPORT_ROUTE,
    outputPath: `${outputPath}#payload-report`,
    reportPath: outputPath,
    frameId: `${frameId}-payload-report`,
    timestampMs,
    payload: {
      schema: LERMS_GOIN_ECOLOGY_PREVIEW_BENCH_PAYLOAD_SCHEMA,
      route: LERMS_GOIN_ECOLOGY_PREVIEW_BENCH_PAYLOAD_ROUTE,
      label: 'Greedy goin ecology merge payload',
      source,
      sourceTruth: {
        effectiveAuthority: goinEcologyMerge.sourceTruth.effectiveAuthority,
        accepted: goinEcologyMerge.sourceTruthEvaluation.accepted,
        blockers: goinEcologyMerge.sourceTruthEvaluation.blockers
      },
      summary,
      fields,
      downgrades,
      rejectedSurfaces: buildRejectedDebugSurfaces().map((surface) => surface.id),
      custody: {
        sourceDiaulos: 'greedy-glove-fucker',
        hostDiaulos: 'gutterglass-pornographer',
        sourceOwns: ['goin ecology law', 'source-truth boundaries', 'payload semantics'],
        kaminosOwns: ['Preview Bench mounting', 'browser witness capture', 'badge rendering']
      },
      sourceReports: {
        goinEcologyMerge
      }
    }
  };
}

function buildTargetSurface(station: string): SurfaceRef {
  return {
    id: 'forge-host-smoke-offer',
    host: 'Kaminos Preview Bench',
    worldChamberId: 'lerms-underhill',
    posture: 'inspect',
    bench: 'terrain-preview',
    station
  };
}

function buildAcceptanceSurface(): SurfaceRef {
  return {
    id: 'preview-bench-smoke-offer-contract',
    route: KAMINOS_PREVIEW_BENCH_SMOKE_OFFER_ROUTE,
    worldChamberId: 'lerms-underhill',
    posture: 'inspect',
    bench: 'terrain-preview'
  };
}

function buildRejectedDebugSurfaces(): RejectedDebugSurface[] {
  return [
    {
      id: 'browser/?greedy_glove=1',
      reason: 'lane-local debug route is not Kaminos Preview Bench acceptance'
    },
    {
      id: 'raw-lerms-json-opened-from-file',
      reason: 'raw JSON inspection is not browser-mounted smoke evidence'
    }
  ];
}

function parseArgs(argv: readonly string[]): CliArgs {
  const args = readPartialArgs(argv);
  if (!args.report) return args;
  assertFinite(args.timestampMs, 'timestamp-ms');
  assertFinite(args.sampleAgeMs, 'sample-age-ms');
  assertFinite(args.maxSampleAgeMs, 'max-sample-age-ms');
  assertFinite(args.freshnessBudgetMs, 'freshness-budget-ms');
  return args;
}

function readPartialArgs(argv: readonly string[]): CliArgs {
  const args: CliArgs = {
    report: null,
    sourceRef: null,
    sourceCommit: null,
    frameId: 'goin-ecology-smoke-offer',
    timestampMs: 0,
    sampleAgeMs: 0,
    maxSampleAgeMs: 500,
    generatedAt: null,
    observedAt: null,
    freshnessBudgetMs: 86_400_000
  };
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key.startsWith('--')) continue;
    if (value === undefined || value.startsWith('--')) {
      throw new Error(`missing value for ${key}`);
    }
    if (key === '--report') args.report = value;
    else if (key === '--source-ref') args.sourceRef = value;
    else if (key === '--source-commit') args.sourceCommit = value;
    else if (key === '--frame-id') args.frameId = value;
    else if (key === '--timestamp-ms') args.timestampMs = Number(value);
    else if (key === '--sample-age-ms') args.sampleAgeMs = Number(value);
    else if (key === '--max-sample-age-ms') args.maxSampleAgeMs = Number(value);
    else if (key === '--generated-at') args.generatedAt = value;
    else if (key === '--observed-at') args.observedAt = value;
    else if (key === '--freshness-budget-ms') args.freshnessBudgetMs = Number(value);
    else throw new Error(`unknown argument ${key}`);
    index += 1;
  }
  return args;
}

function buildFailureReport(args: CliArgs, error: unknown): FailureReport {
  return {
    ok: false,
    schema: KAMINOS_FORGE_HOST_SMOKE_OFFER_SCHEMA,
    route: KAMINOS_PREVIEW_BENCH_SMOKE_OFFER_ROUTE,
    phase: 'building-goin-ecology-smoke-offer',
    failureKind: 'goin-ecology-smoke-offer-invalid',
    error: messageFor(error),
    lastTrustworthyEvidence: {
      outputPath: args.report ?? '',
      sourceRef: args.sourceRef,
      frameId: args.frameId,
      timestampMs: args.timestampMs
    }
  };
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function assertFinite(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be finite`);
  }
}

function messageFor(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function writeJson(path: string, payload: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(payload, null, 2)}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = runGoinEcologySmokeOfferCli();
}
