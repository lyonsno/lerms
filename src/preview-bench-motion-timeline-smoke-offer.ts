import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  PREVIEW_BENCH_ACTOR_MOTION_TIMELINE_ROUTE,
  PREVIEW_BENCH_ACTOR_MOTION_TIMELINE_SCHEMA,
  buildPreviewBenchActorMotionTimeline,
  type PreviewBenchActorMotionTimelineReport,
} from './preview-bench-motion-timeline.ts';

export const KAMINOS_FORGE_HOST_SMOKE_OFFER_SCHEMA = 'kaminos.forge-host.smoke-offer.v0' as const;
export const KAMINOS_PREVIEW_BENCH_SMOKE_OFFER_ROUTE = 'kaminos/preview-bench/smoke-offer-file' as const;
export const KAMINOS_PREVIEW_BENCH_PAYLOAD_REPORT_SCHEMA = 'kaminos.preview-bench.payload-report.v0' as const;
export const KAMINOS_PREVIEW_BENCH_PAYLOAD_REPORT_ROUTE = 'kaminos/preview-bench/payload-file' as const;
export const LERMS_ACTOR_TIMELINE_PREVIEW_BENCH_PAYLOAD_SCHEMA = 'lerms.preview-bench-actor-motion-timeline-payload.v0' as const;
export const LERMS_ACTOR_TIMELINE_PREVIEW_BENCH_PAYLOAD_ROUTE = 'lerms/preview-bench/actor-motion-timeline-payload-file' as const;
const SMOKE_OFFER_SOURCE_TRUTH_AUTHORITY = 'synthetic_fixture' as const;

interface CliArgs {
  report: string | null;
  sourceRef: string | null;
  sourceCommit: string | null;
  frameId: string;
  timestampMs: number;
  generatedAt: string | null;
  observedAt: string | null;
  freshnessBudgetMs: number;
}

interface SmokeOfferSource {
  authority: 'fixture' | 'live' | 'fallback' | 'stale';
  sourceTruthAuthority: string;
  producerDiaulos: 'lerm-horde-fucker';
  sourceRef: string;
  route: typeof PREVIEW_BENCH_ACTOR_MOTION_TIMELINE_ROUTE;
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

interface ActorTimelinePreviewBenchPayload {
  schema: typeof LERMS_ACTOR_TIMELINE_PREVIEW_BENCH_PAYLOAD_SCHEMA;
  route: typeof LERMS_ACTOR_TIMELINE_PREVIEW_BENCH_PAYLOAD_ROUTE;
  label: 'LERM Horde actor timeline payload';
  source: SmokeOfferSource;
  sourceTruth: {
    effectiveAuthority: string;
    accepted: false;
    blockers: string[];
  };
  summary: ActorTimelineSummary;
  fields: Field[];
  downgrades: string[];
  rejectedSurfaces: string[];
  custody: {
    sourceDiaulos: 'lerm-horde-fucker';
    hostDiaulos: 'gutterglass-pornographer';
    sourceOwns: string[];
    kaminosOwns: string[];
  };
  sourceReports: {
    actorMotionTimeline: PreviewBenchActorMotionTimelineReport;
  };
}

interface ActorTimelinePayloadReport {
  ok: true;
  schema: typeof KAMINOS_PREVIEW_BENCH_PAYLOAD_REPORT_SCHEMA;
  route: typeof KAMINOS_PREVIEW_BENCH_PAYLOAD_REPORT_ROUTE;
  outputPath: string;
  reportPath: string;
  frameId: string;
  timestampMs: number;
  payload: ActorTimelinePreviewBenchPayload;
}

interface ActorTimelineSummary {
  frameCount: number;
  actorCount: number;
  goinCount: number;
  possessionEventCount: number;
  durationMs: number;
  stableActorIdentities: boolean;
  stateCount: number;
}

interface ActorTimelineSmokeOffer {
  id: 'lerm-horde-actor-motion-timeline';
  label: 'LERM Horde Actor Motion Timeline';
  schema: typeof PREVIEW_BENCH_ACTOR_MOTION_TIMELINE_SCHEMA;
  route: typeof PREVIEW_BENCH_ACTOR_MOTION_TIMELINE_ROUTE;
  payloadSchema: typeof LERMS_ACTOR_TIMELINE_PREVIEW_BENCH_PAYLOAD_SCHEMA;
  source: SmokeOfferSource;
  freshness: Freshness;
  targetSurface: SurfaceRef;
  acceptanceSurface: SurfaceRef;
  summary: ActorTimelineSummary;
  fields: Field[];
  downgrades: string[];
  rejectedDebugSurfaces: RejectedDebugSurface[];
  payloadReport: ActorTimelinePayloadReport;
}

export interface PreviewBenchActorTimelineSmokeOfferReport {
  ok: true;
  schema: typeof KAMINOS_FORGE_HOST_SMOKE_OFFER_SCHEMA;
  route: typeof KAMINOS_PREVIEW_BENCH_SMOKE_OFFER_ROUTE;
  producerDiaulos: 'lerm-horde-fucker';
  source: SmokeOfferSource;
  freshness: Freshness;
  targetSurface: SurfaceRef;
  acceptanceSurface: SurfaceRef;
  offers: [ActorTimelineSmokeOffer];
  downgrades: string[];
  rejectedDebugSurfaces: RejectedDebugSurface[];
  whatRemainsFake: {
    liveOperatorCameraSmoke: true;
    finalLermBodyAnimation: true;
    finalGoinPhysics: true;
    fullCrowdAi: true;
    fullFirstVerticalSuccess: true;
  };
}

interface FailureReport {
  ok: false;
  schema: typeof KAMINOS_FORGE_HOST_SMOKE_OFFER_SCHEMA;
  route: typeof KAMINOS_PREVIEW_BENCH_SMOKE_OFFER_ROUTE;
  phase: 'building-preview-bench-actor-timeline-smoke-offer';
  failureKind: 'preview-bench-actor-timeline-smoke-offer-invalid';
  error: string;
  lastTrustworthyEvidence: {
    outputPath: string;
    sourceRef: string | null;
    frameId: string;
    timestampMs: number;
  };
}

export interface BuildPreviewBenchActorTimelineSmokeOfferOptions {
  outputPath: string;
  sourceRef: string;
  sourceCommit?: string | null;
  frameId?: string;
  timestampMs?: number;
  generatedAt?: string | null;
  observedAt?: string | null;
  freshnessBudgetMs?: number;
}

export function buildPreviewBenchActorTimelineSmokeOfferReport({
  outputPath,
  sourceRef,
  sourceCommit = null,
  frameId = 'actor-timeline-smoke-offer',
  timestampMs = 0,
  generatedAt = null,
  observedAt = null,
  freshnessBudgetMs = 86_400_000,
}: BuildPreviewBenchActorTimelineSmokeOfferOptions): PreviewBenchActorTimelineSmokeOfferReport {
  assertFinite(timestampMs, 'timestampMs');
  assertFinite(freshnessBudgetMs, 'freshnessBudgetMs');
  if (!sourceRef) throw new Error('sourceRef is required');

  const timeline = buildPreviewBenchActorMotionTimeline();
  const actorMotionTimeline: PreviewBenchActorMotionTimelineReport = {
    ok: true,
    schema: 'lerms.preview-bench-actor-motion-timeline-report.v0',
    route: PREVIEW_BENCH_ACTOR_MOTION_TIMELINE_ROUTE,
    reportPath: sourceRef,
    timeline,
  };
  const observed = observedAt ?? generatedAt ?? new Date().toISOString();
  const generated = generatedAt ?? observed;
  const source = buildSource(sourceRef, sourceCommit, actorMotionTimeline);
  const freshness: Freshness = {
    generatedAt: generated,
    observedAt: observed,
    budgetMs: freshnessBudgetMs,
    status: 'fresh-fixture',
  };
  const targetSurface = buildTargetSurface('red-lerm-actor-timeline');
  const acceptanceSurface = buildAcceptanceSurface();
  const downgrades = unique([
    ...timeline.downgrades,
    ...(sourceCommit ? [] : ['missing_git_source_commit_downgrades_offer']),
    'forge_host_smoke_offer_is_not_source_authority',
    'actor_timeline_smoke_offer_not_live_first_vertical',
  ]);
  const rejectedDebugSurfaces = buildRejectedDebugSurfaces(timeline);
  const summary = buildSummary(actorMotionTimeline);
  const fields = buildFields(actorMotionTimeline, summary);
  const payloadReport = buildPayloadReport({
    outputPath,
    frameId,
    timestampMs,
    source,
    summary,
    fields,
    downgrades,
    rejectedDebugSurfaces,
    actorMotionTimeline,
  });

  return {
    ok: true,
    schema: KAMINOS_FORGE_HOST_SMOKE_OFFER_SCHEMA,
    route: KAMINOS_PREVIEW_BENCH_SMOKE_OFFER_ROUTE,
    producerDiaulos: 'lerm-horde-fucker',
    source,
    freshness,
    targetSurface,
    acceptanceSurface,
    offers: [
      {
        id: 'lerm-horde-actor-motion-timeline',
        label: 'LERM Horde Actor Motion Timeline',
        schema: PREVIEW_BENCH_ACTOR_MOTION_TIMELINE_SCHEMA,
        route: PREVIEW_BENCH_ACTOR_MOTION_TIMELINE_ROUTE,
        payloadSchema: LERMS_ACTOR_TIMELINE_PREVIEW_BENCH_PAYLOAD_SCHEMA,
        source,
        freshness,
        targetSurface,
        acceptanceSurface,
        summary,
        fields,
        downgrades,
        rejectedDebugSurfaces,
        payloadReport,
      },
    ],
    downgrades,
    rejectedDebugSurfaces,
    whatRemainsFake: {
      liveOperatorCameraSmoke: true,
      finalLermBodyAnimation: true,
      finalGoinPhysics: true,
      fullCrowdAi: true,
      fullFirstVerticalSuccess: true,
    },
  };
}

export function runPreviewBenchActorTimelineSmokeOfferCli(argv = process.argv.slice(2)): number {
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
      buildPreviewBenchActorTimelineSmokeOfferReport({
        outputPath: args.report,
        sourceRef: args.sourceRef,
        sourceCommit: args.sourceCommit,
        frameId: args.frameId,
        timestampMs: args.timestampMs,
        generatedAt: args.generatedAt,
        observedAt: args.observedAt,
        freshnessBudgetMs: args.freshnessBudgetMs,
      }),
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
  actorMotionTimeline: PreviewBenchActorMotionTimelineReport,
): SmokeOfferSource {
  return {
    authority: 'fixture',
    sourceTruthAuthority: SMOKE_OFFER_SOURCE_TRUTH_AUTHORITY,
    producerDiaulos: 'lerm-horde-fucker',
    sourceRef,
    route: actorMotionTimeline.route,
    commit: sourceCommit ?? 'unrecorded-source-commit',
  };
}

function buildSummary(actorMotionTimeline: PreviewBenchActorMotionTimelineReport): ActorTimelineSummary {
  const timeline = actorMotionTimeline.timeline;
  return {
    frameCount: timeline.timeline.length,
    actorCount: timeline.continuity.actorIds.length,
    goinCount: timeline.goinCustody.goinIds.length,
    possessionEventCount: timeline.goinCustody.possessionEvents.length,
    durationMs: timeline.durationMs,
    stableActorIdentities: timeline.continuity.stableActorIdentities,
    stateCount: timeline.witnessState.states.length,
  };
}

function buildFields(
  actorMotionTimeline: PreviewBenchActorMotionTimelineReport,
  summary: ActorTimelineSummary,
): Field[] {
  const timeline = actorMotionTimeline.timeline;
  return [
    { label: 'timeline frames', value: summary.frameCount },
    { label: 'duration ms', value: summary.durationMs },
    { label: 'actors', value: summary.actorCount },
    { label: 'stable identities', value: summary.stableActorIdentities },
    { label: 'actor states', value: timeline.witnessState.states.join(', ') },
    { label: 'possession events', value: summary.possessionEventCount },
    { label: 'primary goin custody', value: timeline.goinCustody.primaryCustodyChain.join(' -> ') },
  ];
}

function buildPayloadReport({
  outputPath,
  frameId,
  timestampMs,
  source,
  summary,
  fields,
  downgrades,
  rejectedDebugSurfaces,
  actorMotionTimeline,
}: {
  outputPath: string;
  frameId: string;
  timestampMs: number;
  source: SmokeOfferSource;
  summary: ActorTimelineSummary;
  fields: Field[];
  downgrades: string[];
  rejectedDebugSurfaces: RejectedDebugSurface[];
  actorMotionTimeline: PreviewBenchActorMotionTimelineReport;
}): ActorTimelinePayloadReport {
  return {
    ok: true,
    schema: KAMINOS_PREVIEW_BENCH_PAYLOAD_REPORT_SCHEMA,
    route: KAMINOS_PREVIEW_BENCH_PAYLOAD_REPORT_ROUTE,
    outputPath: `${outputPath}#payload-report`,
    reportPath: outputPath,
    frameId: `${frameId}-payload-report`,
    timestampMs,
    payload: {
      schema: LERMS_ACTOR_TIMELINE_PREVIEW_BENCH_PAYLOAD_SCHEMA,
      route: LERMS_ACTOR_TIMELINE_PREVIEW_BENCH_PAYLOAD_ROUTE,
      label: 'LERM Horde actor timeline payload',
      source,
      sourceTruth: {
        effectiveAuthority: source.sourceTruthAuthority,
        accepted: false,
        blockers: [
          'timeline is a fixture playback export',
          'Kaminos Preview Bench smoke-offer route is host evidence, not LERMS source truth',
        ],
      },
      summary,
      fields,
      downgrades,
      rejectedSurfaces: rejectedDebugSurfaces.map((surface) => surface.id),
      custody: {
        sourceDiaulos: 'lerm-horde-fucker',
        hostDiaulos: 'gutterglass-pornographer',
        sourceOwns: [
          ...actorMotionTimeline.timeline.custody.lermsOwns,
          'actor timeline smoke-offer payload semantics',
        ],
        kaminosOwns: [
          ...actorMotionTimeline.timeline.custody.gutterglassOwns,
          'Forge Host smoke-offer intake route',
          'Preview Bench badge and evidence presentation',
        ],
      },
      sourceReports: {
        actorMotionTimeline,
      },
    },
  };
}

function buildTargetSurface(station: string): SurfaceRef {
  return {
    id: 'forge-host-smoke-offer',
    host: 'Kaminos Preview Bench',
    worldChamberId: 'lerms-underhill',
    posture: 'inspect',
    bench: 'terrain-preview',
    station,
  };
}

function buildAcceptanceSurface(): SurfaceRef {
  return {
    id: 'preview-bench-smoke-offer-contract',
    route: KAMINOS_PREVIEW_BENCH_SMOKE_OFFER_ROUTE,
    worldChamberId: 'lerms-underhill',
    posture: 'inspect',
    bench: 'terrain-preview',
  };
}

function buildRejectedDebugSurfaces(
  timeline: PreviewBenchActorMotionTimelineReport['timeline'],
): RejectedDebugSurface[] {
  return [
    ...timeline.basePayload.rejectedSurfaces.map((surface) => ({
      id: surface.route,
      reason: surface.reason,
    })),
    {
      id: 'raw-lerms-json-opened-from-file',
      reason: 'raw JSON inspection is not browser-mounted smoke evidence',
    },
  ];
}

function parseArgs(argv: readonly string[]): CliArgs {
  const args = readPartialArgs(argv);
  if (!args.report) return args;
  assertFinite(args.timestampMs, 'timestamp-ms');
  assertFinite(args.freshnessBudgetMs, 'freshness-budget-ms');
  return args;
}

function readPartialArgs(argv: readonly string[]): CliArgs {
  const args: CliArgs = {
    report: null,
    sourceRef: null,
    sourceCommit: null,
    frameId: 'actor-timeline-smoke-offer',
    timestampMs: 0,
    generatedAt: null,
    observedAt: null,
    freshnessBudgetMs: 86_400_000,
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
    phase: 'building-preview-bench-actor-timeline-smoke-offer',
    failureKind: 'preview-bench-actor-timeline-smoke-offer-invalid',
    error: messageFor(error),
    lastTrustworthyEvidence: {
      outputPath: args.report ?? '',
      sourceRef: args.sourceRef,
      frameId: args.frameId,
      timestampMs: args.timestampMs,
    },
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
  process.exitCode = runPreviewBenchActorTimelineSmokeOfferCli();
}
