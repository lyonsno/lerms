import { writeFileSync } from 'node:fs';

import type { LermState, Vec3 } from './contracts/first-vertical.ts';
import {
  buildPreviewBenchActorMotionPayload,
  PREVIEW_BENCH_ROUTE_QUERY,
  type PreviewBenchActorMotionPayload,
} from './preview-bench-motion-payload.ts';
import {
  SCHNOZ_PROXY_BODY_IDENTITY,
  buildSchnozSimulationSnapshot,
  type SchnozRenderLerm,
  type SchnozSimulationSnapshot,
  type SchnozTimelineFrame,
} from './schnoz-lerm-simulation-core.ts';
import type { SchnozMotionAdapterOutput } from './schnoz-motion-adapter.ts';

export const PREVIEW_BENCH_ACTOR_MOTION_TIMELINE_SCHEMA = 'lerms.preview-bench-actor-motion-timeline.v0' as const;
export const PREVIEW_BENCH_ACTOR_MOTION_TIMELINE_FRAME_SCHEMA = 'lerms.preview-bench-actor-motion-timeline-frame.v0' as const;
export const PREVIEW_BENCH_ACTOR_MOTION_PLAYBACK_SCHEMA = 'lerms.preview-bench-actor-motion-playback.v0' as const;
export const PREVIEW_BENCH_ACTOR_MOTION_TIMELINE_STATE_SCHEMA = 'lerms.preview-bench-actor-motion-timeline-state.v0' as const;
export const PREVIEW_BENCH_ACTOR_MOTION_TIMELINE_ROUTE = 'lerms/preview-bench/actor-motion-timeline-file' as const;

type PreviewBenchTimelineDowngrade =
  | PreviewBenchActorMotionPayload['downgrades'][number]
  | 'timevarying_payload_not_live_socket_stream'
  | 'timeline_playback_not_behavior_engine'
  | 'kaminos_playback_must_not_claim_lerms_sim_ownership';

type PreviewBenchTimelineActorMotion = {
  schema: 'lerms.preview-bench-actor-motion.v0';
  actorId: string;
  species: 'red';
  role: 'carrier_actor';
  state: LermState['state'];
  world: Vec3;
  heading: Vec3;
  carryingGoinId?: string;
  targetGoinId?: string;
  terrainSampleId: string;
  motionAdapter: SchnozMotionAdapterOutput;
  selectedCliplet: {
    schema: 'kaminos.generated-motion-cliplet-playback-sample.v0';
    playbackId: string;
    sourceClipId: string;
    segmentId: string;
    clipletLabel: string;
    sourceFrame: number;
    sourceRange: SchnozMotionAdapterOutput['source']['sourceRange'];
    sourceRoute?: string;
    sourceModel?: string;
    sourceStatus?: string;
  };
  benchChannels: SchnozMotionAdapterOutput['channels'];
};

type PreviewBenchTimelineFrame = {
  schema: typeof PREVIEW_BENCH_ACTOR_MOTION_TIMELINE_FRAME_SCHEMA;
  frameIndex: number;
  label: string;
  timeMs: number;
  events: string[];
  actorMotion: PreviewBenchTimelineActorMotion[];
  goins: SchnozTimelineFrame['goins'];
  hitFlash?: SchnozTimelineFrame['hitFlash'];
  reroute?: SchnozTimelineFrame['reroute'];
  motionEvidence: SchnozTimelineFrame['motionEvidence'];
};

export type PreviewBenchActorMotionTimeline = {
  schema: typeof PREVIEW_BENCH_ACTOR_MOTION_TIMELINE_SCHEMA;
  route: typeof PREVIEW_BENCH_ACTOR_MOTION_TIMELINE_ROUTE;
  acceptanceSurface: {
    kind: 'kaminos_preview_bench_timeline';
    worldChamberId: 'lerms-underhill';
    posture: 'inspect';
    bench: 'terrain-preview';
    routeQuery: typeof PREVIEW_BENCH_ROUTE_QUERY;
    expectedHost: 'kaminos_workbench_kiln_preview_bench';
  };
  basePayload: PreviewBenchActorMotionPayload;
  proxyBody: SchnozSimulationSnapshot['proxyBody'];
  durationMs: number;
  timeline: PreviewBenchTimelineFrame[];
  playback: {
    schema: typeof PREVIEW_BENCH_ACTOR_MOTION_PLAYBACK_SCHEMA;
    loop: true;
    interpolation: 'linear-between-frames';
    timeUnit: 'ms';
    minimumMovementActors: number;
    minimumStateTransitions: number;
  };
  witnessState: {
    schema: typeof PREVIEW_BENCH_ACTOR_MOTION_TIMELINE_STATE_SCHEMA;
    chamberId: 'lerms-underhill';
    posture: 'inspect';
    bench: 'terrain-preview';
    routeReady: true;
    requiresMotionWitness: true;
    staticActorPayloadAcceptedAsLoop: false;
    renderHostNeeded: 'gutterglass_or_minion_preview_bench';
    frameCount: number;
    actorIds: string[];
    states: LermState['state'][];
    outputsVisualPreview: false;
  };
  downgrades: PreviewBenchTimelineDowngrade[];
  custody: {
    lermsOwns: readonly string[];
    mushfingerOwns: readonly string[];
    gutterglassOwns: readonly string[];
    minionOwns: readonly string[];
  };
};

export type PreviewBenchActorMotionTimelineReport = {
  ok: true;
  schema: 'lerms.preview-bench-actor-motion-timeline-report.v0';
  route: typeof PREVIEW_BENCH_ACTOR_MOTION_TIMELINE_ROUTE;
  reportPath: string;
  timeline: PreviewBenchActorMotionTimeline;
};

export function buildPreviewBenchActorMotionTimeline(
  snapshot = buildSchnozSimulationSnapshot(),
): PreviewBenchActorMotionTimeline {
  const basePayload = buildPreviewBenchActorMotionPayload(snapshot);
  const timeline = snapshot.timeline.map((frame) => ({
    schema: PREVIEW_BENCH_ACTOR_MOTION_TIMELINE_FRAME_SCHEMA,
    frameIndex: frame.index,
    label: frame.label,
    timeMs: frame.timeMs,
    events: [...frame.events],
    actorMotion: frame.lerms.map(actorMotionForTimelineLerm),
    goins: frame.goins.map((goin) => ({ ...goin })),
    hitFlash: frame.hitFlash ? { ...frame.hitFlash } : undefined,
    reroute: frame.reroute ? { ...frame.reroute } : undefined,
    motionEvidence: {
      ...frame.motionEvidence,
      featureEvidenceSockets: [...frame.motionEvidence.featureEvidenceSockets],
      adaptedPoseFields: [...frame.motionEvidence.adaptedPoseFields],
    },
  }));
  const actorIds = [...new Set(timeline.flatMap((frame) => frame.actorMotion.map((actor) => actor.actorId)))];
  const states = [...new Set(timeline.flatMap((frame) => frame.actorMotion.map((actor) => actor.state)))];

  return {
    schema: PREVIEW_BENCH_ACTOR_MOTION_TIMELINE_SCHEMA,
    route: PREVIEW_BENCH_ACTOR_MOTION_TIMELINE_ROUTE,
    acceptanceSurface: {
      kind: 'kaminos_preview_bench_timeline',
      worldChamberId: 'lerms-underhill',
      posture: 'inspect',
      bench: 'terrain-preview',
      routeQuery: PREVIEW_BENCH_ROUTE_QUERY,
      expectedHost: 'kaminos_workbench_kiln_preview_bench',
    },
    basePayload,
    proxyBody: {
      ...snapshot.proxyBody,
      identity: SCHNOZ_PROXY_BODY_IDENTITY,
    },
    durationMs: timeline[timeline.length - 1]?.timeMs ?? 0,
    timeline,
    playback: {
      schema: PREVIEW_BENCH_ACTOR_MOTION_PLAYBACK_SCHEMA,
      loop: true,
      interpolation: 'linear-between-frames',
      timeUnit: 'ms',
      minimumMovementActors: 1,
      minimumStateTransitions: 2,
    },
    witnessState: {
      schema: PREVIEW_BENCH_ACTOR_MOTION_TIMELINE_STATE_SCHEMA,
      chamberId: 'lerms-underhill',
      posture: 'inspect',
      bench: 'terrain-preview',
      routeReady: true,
      requiresMotionWitness: true,
      staticActorPayloadAcceptedAsLoop: false,
      renderHostNeeded: 'gutterglass_or_minion_preview_bench',
      frameCount: timeline.length,
      actorIds,
      states,
      outputsVisualPreview: false,
    },
    downgrades: [
      ...basePayload.downgrades,
      'timevarying_payload_not_live_socket_stream',
      'timeline_playback_not_behavior_engine',
      'kaminos_playback_must_not_claim_lerms_sim_ownership',
    ],
    custody: {
      lermsOwns: [
        ...basePayload.custody.lermsOwns,
        'timelineBehaviorTruth',
        'actor state transitions',
        'goin carry/drop/reroute sequencing',
      ],
      mushfingerOwns: basePayload.custody.mushfingerOwns,
      gutterglassOwns: [
        ...basePayload.custody.gutterglassOwns,
        'Preview Bench playback and camera witness mechanics',
        'browser motion sampling evidence',
      ],
      minionOwns: basePayload.custody.minionOwns,
    },
  };
}

export function writePreviewBenchActorMotionTimelineReport(path: string): PreviewBenchActorMotionTimelineReport {
  const timeline = buildPreviewBenchActorMotionTimeline();
  const report: PreviewBenchActorMotionTimelineReport = {
    ok: true,
    schema: 'lerms.preview-bench-actor-motion-timeline-report.v0',
    route: PREVIEW_BENCH_ACTOR_MOTION_TIMELINE_ROUTE,
    reportPath: path,
    timeline,
  };
  writeFileSync(path, `${JSON.stringify(report, null, 2)}\n`);
  return report;
}

function actorMotionForTimelineLerm(lerm: SchnozRenderLerm): PreviewBenchTimelineActorMotion {
  if (!lerm.motionAdapter) {
    throw new Error(`Preview Bench timeline cannot omit motion adapter for actor ${lerm.id}`);
  }
  const adapter = lerm.motionAdapter;
  return {
    schema: 'lerms.preview-bench-actor-motion.v0',
    actorId: lerm.id,
    species: 'red',
    role: 'carrier_actor',
    state: lerm.state,
    world: lerm.world,
    heading: lerm.heading,
    carryingGoinId: lerm.carryingGoinId,
    targetGoinId: lerm.targetGoinId,
    terrainSampleId: terrainSampleIdForWorld(lerm.world),
    motionAdapter: adapter,
    selectedCliplet: {
      schema: adapter.source.schema,
      playbackId: adapter.source.playbackId,
      sourceClipId: adapter.source.sourceClipId,
      segmentId: adapter.source.segmentId,
      clipletLabel: adapter.source.clipletLabel,
      sourceFrame: adapter.source.sourceFrame,
      sourceRange: adapter.source.sourceRange,
      sourceRoute: adapter.source.sourceRoute,
      sourceModel: adapter.source.sourceModel,
      sourceStatus: adapter.source.sourceStatus,
    },
    benchChannels: adapter.channels,
  };
}

function terrainSampleIdForWorld(world: Vec3): string {
  if (world[0] > 0.1) return 'terrain-crown-right';
  if (world[0] < -0.7 && world[2] < -0.25) return 'terrain-gutter-drop';
  return 'terrain-approach-left';
}

function readArgValue(flag: string, fallback: string): string {
  const index = process.argv.indexOf(flag);
  if (index === -1) return fallback;
  const value = process.argv[index + 1];
  if (!value || value.startsWith('--')) {
    throw new Error(`Expected value after ${flag}`);
  }
  return value;
}

if (process.argv[1]?.endsWith('preview-bench-motion-timeline.ts')) {
  const out = readArgValue('--out', '/tmp/lerms-preview-bench-motion-timeline.json');
  const report = writePreviewBenchActorMotionTimelineReport(out);
  console.log(JSON.stringify({
    ok: report.ok,
    schema: report.schema,
    route: report.route,
    reportPath: report.reportPath,
    frameCount: report.timeline.timeline.length,
    durationMs: report.timeline.durationMs,
  }, null, 2));
}
