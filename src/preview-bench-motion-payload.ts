import { writeFileSync } from 'node:fs';

import type { FirstVerticalFrame, LermState, Vec3 } from './contracts/first-vertical.ts';
import type { FirstVerticalSourceTruthUpgradeEvaluation } from './contracts/first-vertical-source-truth-upgrade.ts';
import {
  SCHNOZ_PROXY_BODY_IDENTITY,
  buildSchnozSimulationSnapshot,
  type SchnozSimulationSnapshot,
} from './schnoz-lerm-simulation-core.ts';
import type { SchnozMotionAdapterOutput } from './schnoz-motion-adapter.ts';

export const PREVIEW_BENCH_ACTOR_MOTION_PAYLOAD_SCHEMA = 'lerms.preview-bench-actor-motion-payload.v0' as const;
export const PREVIEW_BENCH_ACTOR_MOTION_STATE_SCHEMA = 'lerms.preview-bench-actor-motion-state.v0' as const;
export const PREVIEW_BENCH_ACTOR_MOTION_PAYLOAD_ROUTE = 'lerms/preview-bench/actor-motion-payload-file' as const;
export const PREVIEW_BENCH_ROUTE_QUERY = 'world_chamber=lerms-underhill&posture=inspect&bench=terrain-preview' as const;

type PreviewBenchDowngrade =
  | 'proxy_body_visual_only'
  | 'final_red_lerm_body_not_claimed'
  | 'kaminos_host_route_not_owned_by_lerms_payload'
  | 'gutterglass_camera_witness_custody_not_claimed'
  | 'minion_chamber_ontology_not_claimed'
  | 'fixture_or_visual_host_must_remain_downgraded';

type PreviewBenchActorMotion = {
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

export type PreviewBenchActorMotionPayload = {
  schema: typeof PREVIEW_BENCH_ACTOR_MOTION_PAYLOAD_SCHEMA;
  route: typeof PREVIEW_BENCH_ACTOR_MOTION_PAYLOAD_ROUTE;
  acceptanceSurface: {
    kind: 'kaminos_preview_bench_payload';
    worldChamberId: 'lerms-underhill';
    posture: 'inspect';
    bench: 'terrain-preview';
    routeQuery: typeof PREVIEW_BENCH_ROUTE_QUERY;
    expectedHost: 'kaminos_workbench_kiln_preview_bench';
  };
  rejectedSurfaces: Array<{
    route: string;
    acceptanceSurface: false;
    reason: string;
  }>;
  frame: FirstVerticalFrame;
  sourceTruthUpgrade: FirstVerticalSourceTruthUpgradeEvaluation;
  proxyBody: SchnozSimulationSnapshot['proxyBody'];
  actorMotion: PreviewBenchActorMotion[];
  witnessState: {
    schema: typeof PREVIEW_BENCH_ACTOR_MOTION_STATE_SCHEMA;
    chamberId: 'lerms-underhill';
    posture: 'inspect';
    bench: 'terrain-preview';
    routeReady: true;
    renderHostNeeded: 'gutterglass_or_minion_preview_bench';
    actorCount: number;
    motionAdapterSchema: 'lerms.schnoz-motion-adapter.v0';
    outputsVisualPreview: false;
    sourceTruthEffectiveAuthority: FirstVerticalSourceTruthUpgradeEvaluation['effectiveAuthority'];
    intentionallyAbsent: readonly string[];
  };
  downgrades: PreviewBenchDowngrade[];
  custody: {
    lermsOwns: readonly string[];
    mushfingerOwns: readonly string[];
    gutterglassOwns: readonly string[];
    minionOwns: readonly string[];
  };
};

export type PreviewBenchActorMotionPayloadReport = {
  ok: true;
  schema: 'lerms.preview-bench-actor-motion-payload-report.v0';
  route: typeof PREVIEW_BENCH_ACTOR_MOTION_PAYLOAD_ROUTE;
  reportPath: string;
  payload: PreviewBenchActorMotionPayload;
};

export function buildPreviewBenchActorMotionPayload(
  snapshot = buildSchnozSimulationSnapshot(),
): PreviewBenchActorMotionPayload {
  const payloadFrame = snapshot.timeline.find((frame) => frame.timeMs === snapshot.frame.source.timestampMs)
    ?? snapshot.timeline[snapshot.timeline.length - 1];
  const timelineById = new Map(payloadFrame.lerms.map((lerm) => [lerm.id, lerm]));
  const actorMotion = snapshot.frame.lerms.map((lerm) => {
    const renderLerm = timelineById.get(lerm.id);
    if (!renderLerm?.motionAdapter) {
      throw new Error(`Preview Bench payload cannot omit motion adapter for actor ${lerm.id}`);
    }
    if (lerm.species !== 'red') {
      throw new Error(`Preview Bench red-lerm actor payload cannot carry ${lerm.species} lerm ${lerm.id}`);
    }
    if (!lerm.terrainContact.terrainSampleId) {
      throw new Error(`Preview Bench actor ${lerm.id} needs a terrain sample for terrain-preview hosting`);
    }
    const adapter = renderLerm.motionAdapter;
    return {
      schema: 'lerms.preview-bench-actor-motion.v0' as const,
      actorId: lerm.id,
      species: 'red' as const,
      role: 'carrier_actor' as const,
      state: lerm.state,
      world: lerm.world,
      heading: lerm.heading,
      carryingGoinId: lerm.carryingGoinId,
      targetGoinId: lerm.targetGoinId,
      terrainSampleId: lerm.terrainContact.terrainSampleId,
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
  });

  return {
    schema: PREVIEW_BENCH_ACTOR_MOTION_PAYLOAD_SCHEMA,
    route: PREVIEW_BENCH_ACTOR_MOTION_PAYLOAD_ROUTE,
    acceptanceSurface: {
      kind: 'kaminos_preview_bench_payload',
      worldChamberId: 'lerms-underhill',
      posture: 'inspect',
      bench: 'terrain-preview',
      routeQuery: PREVIEW_BENCH_ROUTE_QUERY,
      expectedHost: 'kaminos_workbench_kiln_preview_bench',
    },
    rejectedSurfaces: [
      {
        route: 'browser/?schnoz_3d=1',
        acceptanceSurface: false,
        reason: 'standalone 3D debug route is not the operator acceptance surface',
      },
      {
        route: 'browser/?schnoz_sim=1',
        acceptanceSurface: false,
        reason: 'lane-local canvas smoke can support debugging but cannot replace Kaminos Preview Bench hosting',
      },
    ],
    frame: snapshot.frame,
    sourceTruthUpgrade: snapshot.sourceTruthUpgrade,
    proxyBody: {
      ...snapshot.proxyBody,
      identity: SCHNOZ_PROXY_BODY_IDENTITY,
    },
    actorMotion,
    witnessState: {
      schema: PREVIEW_BENCH_ACTOR_MOTION_STATE_SCHEMA,
      chamberId: 'lerms-underhill',
      posture: 'inspect',
      bench: 'terrain-preview',
      routeReady: true,
      renderHostNeeded: 'gutterglass_or_minion_preview_bench',
      actorCount: actorMotion.length,
      motionAdapterSchema: 'lerms.schnoz-motion-adapter.v0',
      outputsVisualPreview: false,
      sourceTruthEffectiveAuthority: snapshot.sourceTruthUpgrade.effectiveAuthority,
      intentionallyAbsent: [
        'kaminos_camera_route',
        'minion_chamber_descriptor',
        'final_red_lerm_mesh',
        'generated_or_rigged_lerm_motion',
        'scene_native_promotion',
      ],
    },
    downgrades: [
      'proxy_body_visual_only',
      'final_red_lerm_body_not_claimed',
      'kaminos_host_route_not_owned_by_lerms_payload',
      'gutterglass_camera_witness_custody_not_claimed',
      'minion_chamber_ontology_not_claimed',
      'fixture_or_visual_host_must_remain_downgraded',
    ],
    custody: {
      lermsOwns: [
        'lerms.first-vertical-frame.v0',
        'lerms.lerm-state.v0',
        'lerms.goin-state.v0',
        'lerms.juice-hit-event.v0',
        'lerms.carrier-drop-event.v0',
        'lerms.schnoz-motion-adapter.v0',
        'first-vertical acceptance and source truth',
      ],
      mushfingerOwns: [
        'kaminos.generated-motion-cliplet-playback.v0',
        'kaminos.generated-motion-cliplet-playback-sample.v0',
        'cliplet labels and source-frame evidence',
        'phase/cadence/effort/motion grammar semantics',
      ],
      gutterglassOwns: [
        'camera_and_browser_witness_route',
        'Preview Bench capture mechanics',
        'operator/agent same-route screenshot surface',
      ],
      minionOwns: [
        'lerms-underhill_chamber_ontology',
        'Workbench/Kiln preview bench placement',
        'Forge Rail relationship',
        'Kaminos fixture/fallback/stale badge presentation',
      ],
    },
  };
}

export function writePreviewBenchActorMotionPayloadReport(path: string): PreviewBenchActorMotionPayloadReport {
  const payload = buildPreviewBenchActorMotionPayload();
  const report: PreviewBenchActorMotionPayloadReport = {
    ok: true,
    schema: 'lerms.preview-bench-actor-motion-payload-report.v0',
    route: PREVIEW_BENCH_ACTOR_MOTION_PAYLOAD_ROUTE,
    reportPath: path,
    payload,
  };
  writeFileSync(path, `${JSON.stringify(report, null, 2)}\n`);
  return report;
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

if (process.argv[1]?.endsWith('preview-bench-motion-payload.ts')) {
  const out = readArgValue('--out', '/tmp/lerms-preview-bench-motion-payload.json');
  const report = writePreviewBenchActorMotionPayloadReport(out);
  console.log(JSON.stringify({
    ok: report.ok,
    schema: report.schema,
    route: report.route,
    reportPath: report.reportPath,
    actorCount: report.payload.actorMotion.length,
    chamberId: report.payload.acceptanceSurface.worldChamberId,
    bench: report.payload.acceptanceSurface.bench,
  }, null, 2));
}
