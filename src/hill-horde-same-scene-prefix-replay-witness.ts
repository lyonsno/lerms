import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

import type { LermHordeProducerHistoryCompositionReceipt } from './lerm-horde-producer-history-composition.js';
import {
  composeHordeTraversalIntoLiveHill,
  type ReviewedHordeTraversalReport,
} from './hill-horde-live-traversal-admission.js';
import {
  LERM_HORDE_REVIEWED_LIVE_BODY_MOTION_REVISION,
  composeLermHordeLiveBodyMotion,
  deriveLermHordeSameScenePrefixChecksum,
  deriveLermHordeSameSceneSampleIdentity,
  verifyLermHordeSameSceneConsumerEvidence,
  type LermHordeLiveBodyMotionComposition,
  type LermHordeSameSceneConsumerEvidence,
} from './lerm-horde-live-body-motion.js';
import {
  HILL_HORDE_SAME_SCENE_PREFIX_REPLAY_ROUTE,
  HILL_HORDE_SAME_SCENE_PREFIX_REPLAY_SCHEMA,
  createHillHordeSameScenePrefixReplay,
  renderHillHordeSameScenePrefixFrameSvg,
  renderHillHordeSameScenePrefixReplaySvg,
  type HillHordeSameScenePrefixFrame,
  type HillHordeSameScenePrefixReplay,
} from './hill-horde-same-scene-prefix-replay.js';

export const HILL_HORDE_SAME_SCENE_PREFIX_WITNESS_SCHEMA =
  'lerms.hill-of-hills.horde-same-scene-prefix-witness.v0' as const;

type Phase =
  | 'argument-parse'
  | 'input-read'
  | 'source-verification'
  | 'composition'
  | 'render'
  | 'write-primary'
  | 'write-hill-evidence'
  | 'consumer-verification'
  | 'write-report'
  | 'verify-final-output';

interface CliArgs {
  hordeReport: string | null;
  producerReceipt: string | null;
  hordeRevision: string | null;
  hillRevision: string | null;
  imageOut: string | null;
  hillEvidenceOut: string | null;
  reportOut: string | null;
}

interface WitnessRuntime {
  render: typeof renderHillHordeSameScenePrefixReplaySvg;
  sourceIdentity?: () => {
    head: string;
    dirty: string;
    hordeAncestor: (revision: string) => boolean;
    hillAncestor: (revision: string) => boolean;
    verifierAncestor?: (revision: string) => boolean;
    verifierRevision?: string;
    verifierModuleBlob?: string;
    reviewedVerifierModuleBlob?: string;
  };
}

interface SameSceneConsumerEvidenceOptions {
  hillEvidenceReportPath: string;
  requestedOutputPath: string;
  effectiveOutputPath: string;
  presenterRevision: string;
  hordeVerifierRevision: string;
  hordeVerifierModuleBlob: string;
}

export type HillHordeSameSceneConsumerEvidence =
  LermHordeSameSceneConsumerEvidence & {
    source: LermHordeSameSceneConsumerEvidence['source'] & {
      hordeVerifierRevision: string;
      hordeVerifierModuleBlob: string;
    };
  };

export const HILL_HORDE_REVIEWED_SAME_SCENE_VERIFIER_REVISION =
  'f916a9309ef4ab3f35d3a94d4e6084a3cdd2f474' as const;
export const HILL_HORDE_REVIEWED_SAME_SCENE_VERIFIER_MODULE_BLOB =
  'ae5aec5b6978a6f9d192d0a37aa7a254408201d7' as const;

const SAME_SCENE_ID = 'hill-horde-live-hill-common-world-v1';
const SAME_SCENE_VIEW_ID = 'hill-horde-isometric-v1';
const SAME_SCENE_CAMERA_CHECKSUM =
  '040c0ae055c1a02360113879302189bb8623d9247dcc4a409dbd745a60f759b6';

export function createHillHordeSameSceneConsumerEvidence(
  replay: HillHordeSameScenePrefixReplay,
  motion: LermHordeLiveBodyMotionComposition,
  options: SameSceneConsumerEvidenceOptions,
): HillHordeSameSceneConsumerEvidence {
  const movingFrames = replay.frames.filter(
    (frame) => frame.kind === 'actor-prefix',
  );
  const departure = replay.frames.find(
    (frame) => frame.kind === 'actor-departed',
  );
  if (
    replay?.ok !== true ||
    replay.schema !== HILL_HORDE_SAME_SCENE_PREFIX_REPLAY_SCHEMA ||
    replay.route !== HILL_HORDE_SAME_SCENE_PREFIX_REPLAY_ROUTE ||
    replay.phase !== 'complete' ||
    replay.evidenceClass !== 'same_scene_actual_hill_prefix_time_replay' ||
    replay.fallbackStatus !== 'none' ||
    replay.staleStatus !== 'fresh' ||
    replay.partialStatus !== 'complete-root-only' ||
    Object.values(replay.assertions).some((value) => value !== true) ||
    replay.source.hillRevision !== motion.source.admission.hillRevision ||
    replay.source.hordeRevision !== motion.source.admission.hordeRevision ||
    replay.source.actorId !== motion.source.admission.actorId ||
    replay.source.bodySourceRevision !== motion.source.body.sourceRevision ||
    movingFrames.length !== motion.samples.length ||
    !departure ||
    options.hillEvidenceReportPath.length === 0 ||
    options.requestedOutputPath.length === 0 ||
    options.requestedOutputPath !== options.effectiveOutputPath ||
    options.presenterRevision.length === 0 ||
    options.hordeVerifierRevision !==
      HILL_HORDE_REVIEWED_SAME_SCENE_VERIFIER_REVISION ||
    options.hordeVerifierModuleBlob !==
      HILL_HORDE_REVIEWED_SAME_SCENE_VERIFIER_MODULE_BLOB
  ) {
    throw new Error(
      'same-scene consumer evidence inputs are incomplete or incompatible',
    );
  }
  const outputBytes = readRequiredInput(
    options.effectiveOutputPath,
    'same-scene consumer output',
  );
  const expectedOutputSha256 = sha256(
    renderHillHordeSameScenePrefixReplaySvg(replay),
  );
  const outputSha256 = sha256(outputBytes);
  if (outputSha256 !== expectedOutputSha256) {
    throw new Error(
      'same-scene consumer output does not match the canonical Hill replay',
    );
  }
  const hillEvidenceBytes = readRequiredInput(
    options.hillEvidenceReportPath,
    'same-scene Hill evidence report',
  );
  const hillEvidenceReport = JSON.parse(
    hillEvidenceBytes.toString('utf8'),
  ) as unknown;
  validateHillEvidenceReport(
    hillEvidenceReport,
    replay,
    motion,
    options,
    outputSha256,
  );
  const hillEvidenceReportSha256 = sha256(hillEvidenceBytes);
  const sampleIdentities = motion.samples.map(
    deriveLermHordeSameSceneSampleIdentity,
  );
  const terrainSourceId = `hill-source-${sha256(
    JSON.stringify({
      hillRevision: replay.source.hillRevision,
      route: movingFrames[0]?.terrain.source.route,
      configId: movingFrames[0]?.terrain.source.configId,
      sampleChecksum: movingFrames[0]?.terrain.witness.sampleChecksum,
    }),
  ).slice(0, 24)}`;
  if (!terrainSourceId) {
    throw new Error('same-scene consumer evidence lacks Hill source identity');
  }

  const frames = movingFrames.map((frame, sequence) => {
    const actor = frame.actor;
    if (!actor || actor.sequence !== sequence) {
      throw new Error('same-scene consumer evidence body sequence is incomplete');
    }
    const admittedSampleIdentities = sampleIdentities.slice(0, sequence + 1);
    const prefixChecksum = deriveLermHordeSameScenePrefixChecksum(
      admittedSampleIdentities,
    );
    return consumerFrame(
      frame,
      sequence,
      admittedSampleIdentities,
      prefixChecksum,
      terrainSourceId,
      replay.source.hillRevision,
    );
  });
  const finalMovingFrame = frames.at(-1);
  if (!finalMovingFrame) {
    throw new Error('same-scene consumer evidence has no moving frames');
  }
  frames.push({
    sequence: motion.samples.length,
    timestampMs: departure.timestampMs,
    body: { present: false },
    history: {
      admittedSampleCount: sampleIdentities.length,
      admittedThroughTimestampMs: motion.samples.at(-1)?.timestampMs ?? null,
      admittedSampleIdentities: [...sampleIdentities],
      prefixChecksum: deriveLermHordeSameScenePrefixChecksum(sampleIdentities),
    },
    pressure: {
      visible: true,
      sourcePrefixChecksum: finalMovingFrame.history.prefixChecksum,
      trafficChecksum: finalMovingFrame.pressure.trafficChecksum,
    },
    hill: {
      ...finalMovingFrame.hill,
    },
    render: {
      sceneId: SAME_SCENE_ID,
      viewId: SAME_SCENE_VIEW_ID,
      cameraChecksum: SAME_SCENE_CAMERA_CHECKSUM,
      layout: 'single_common_world_view',
      frameImageSha256: sha256(
        renderHillHordeSameScenePrefixFrameSvg(departure),
      ),
      layers: ['actual_hill', 'prefix_pressure'],
    },
  });

  const frameImageSha256s = frames.map(
    ({ render }) => render.frameImageSha256,
  );
  if (new Set(frameImageSha256s).size !== frames.length) {
    throw new Error('same-scene consumer evidence frames are not dynamic');
  }
  const evidence: HillHordeSameSceneConsumerEvidence = {
    authority: 'hill_consumer_execution',
    source: {
      requestedRoute: HILL_HORDE_SAME_SCENE_PREFIX_REPLAY_ROUTE,
      effectiveRoute: replay.route,
      hillRevision: replay.source.hillRevision,
      hordeComponentRevision:
        LERM_HORDE_REVIEWED_LIVE_BODY_MOTION_REVISION,
      hordeVerifierRevision: options.hordeVerifierRevision,
      hordeVerifierModuleBlob: options.hordeVerifierModuleBlob,
      actorId: replay.source.actorId,
      bodySourceRevision: replay.source.bodySourceRevision,
      bodySha256: motion.source.body.sha256,
      hillEvidenceReportPath: options.hillEvidenceReportPath,
      hillEvidenceReportSha256,
    },
    world: {
      coordinateSpace: 'x-y-z-world',
      actualHillTerrain: true,
      commonWorldView: true,
      sceneId: SAME_SCENE_ID,
      viewId: SAME_SCENE_VIEW_ID,
      cameraChecksum: SAME_SCENE_CAMERA_CHECKSUM,
      renderLayout: 'single_common_world_view',
    },
    frames,
    witness: {
      requestedOutputPath: options.requestedOutputPath,
      effectiveOutputPath: options.effectiveOutputPath,
      outputSha256,
      frameCount: frames.length,
      dynamic: true,
      blank: false,
      cached: false,
      frameImageSha256s,
    },
    fallbackStatus: 'none',
    staleStatus: 'fresh',
    partialStatus: 'complete',
  };
  return evidence;
}

function consumerFrame(
  frame: HillHordeSameScenePrefixFrame,
  sequence: number,
  admittedSampleIdentities: readonly string[],
  prefixChecksum: string,
  terrainSourceId: string,
  hillRevision: string,
): LermHordeSameSceneConsumerEvidence['frames'][number] {
  const actor = frame.actor;
  if (!actor) throw new Error('same-scene moving frame lacks the Lerm body');
  const terrain = frame.terrain;
  return {
    sequence,
    timestampMs: actor.timestampMs,
    body: {
      present: true,
      rootWorld: actor.rootWorld,
      heading: actor.heading,
      poseFingerprint: actor.poseFingerprint,
    },
    history: {
      admittedSampleCount: sequence + 1,
      admittedThroughTimestampMs: actor.timestampMs,
      admittedSampleIdentities: [...admittedSampleIdentities],
      prefixChecksum,
    },
    pressure: {
      visible: true,
      sourcePrefixChecksum: prefixChecksum,
      trafficChecksum: sha256(
        JSON.stringify({
          prefixChecksum,
          trafficFieldChecksum:
            terrain.witness.producerTrafficFieldChecksum,
          exposureSeconds:
            terrain.witness.producerTrafficExposureSeconds,
          range: terrain.witness.producerTrafficFieldRange,
        }),
      ),
    },
    hill: {
      revision: hillRevision,
      terrainSourceId,
      sampleChecksum: sha256(
        JSON.stringify({
          terrainSourceId,
          sampleChecksum: terrain.witness.sampleChecksum,
        }),
      ),
      topologyChecksum: sha256(
        JSON.stringify({
          topologyChecksum: terrain.witness.topologyChecksum,
          topologyPossibilityChecksum:
            terrain.witness.topologyPossibilityChecksum,
        }),
      ),
    },
    render: {
      sceneId: SAME_SCENE_ID,
      viewId: SAME_SCENE_VIEW_ID,
      cameraChecksum: SAME_SCENE_CAMERA_CHECKSUM,
      layout: 'single_common_world_view',
      frameImageSha256: sha256(
        renderHillHordeSameScenePrefixFrameSvg(frame),
      ),
      layers: ['actual_hill', 'lerm_body', 'prefix_pressure'],
    },
  };
}

function createExpectedHillEvidenceReport(
  replay: HillHordeSameScenePrefixReplay,
  motion: LermHordeLiveBodyMotionComposition,
  options: SameSceneConsumerEvidenceOptions,
  outputSha256: string,
): Record<string, unknown> {
  const verifierFrames = replay.frames.filter(
    (frame) =>
      frame.kind === 'actor-prefix' || frame.kind === 'actor-departed',
  );
  return {
    ok: true,
    schema: 'lerms.hill-of-hills.horde-same-scene-consumer-evidence.v0',
    phase: 'complete',
    source: {
      route: replay.route,
      replaySchema: replay.schema,
      hillRevision: replay.source.hillRevision,
      hordeRevision: replay.source.hordeRevision,
      hordeComponentRevision:
        LERM_HORDE_REVIEWED_LIVE_BODY_MOTION_REVISION,
      hordeVerifierRevision: options.hordeVerifierRevision,
      hordeVerifierModuleBlob: options.hordeVerifierModuleBlob,
      bodySourceRevision: replay.source.bodySourceRevision,
      actorId: replay.source.actorId,
      presenterRevision: options.presenterRevision,
    },
    world: {
      coordinateSpace: 'x-y-z-world',
      sceneId: SAME_SCENE_ID,
      viewId: SAME_SCENE_VIEW_ID,
      cameraChecksum: SAME_SCENE_CAMERA_CHECKSUM,
      renderLayout: 'single_common_world_view',
      layers: ['actual_hill', 'lerm_body', 'prefix_pressure'],
    },
    frames: verifierFrames.map((frame) => ({
      sequence: frame.actor?.sequence ?? motion.samples.length,
      timestampMs: frame.timestampMs,
      kind: frame.kind,
      prefixSampleCount: frame.prefixSampleCount,
      trafficFieldChecksum:
        frame.terrain.witness.producerTrafficFieldChecksum,
      trafficExposureSeconds:
        frame.terrain.witness.producerTrafficExposureSeconds,
      topologyChecksum: frame.terrain.witness.topologyChecksum,
      topologyPossibilityChecksum:
        frame.terrain.witness.topologyPossibilityChecksum,
      frameImageSha256: sha256(
        renderHillHordeSameScenePrefixFrameSvg(frame),
      ),
      bodyPresent: frame.actor !== null,
      liveContactTruth: frame.claimBoundary.liveContactTruth,
    })),
    output: {
      requestedPath: options.requestedOutputPath,
      effectivePath: options.effectiveOutputPath,
      sha256: outputSha256,
      width: 2160,
      height: 1080,
      frameCount: verifierFrames.length,
      blank: false,
      cached: false,
    },
    fallbackStatus: 'none',
    staleStatus: 'fresh',
    partialStatus: 'complete',
    failurePhase: null,
    claimBoundary: {
      liveContactTruth: false,
      producerRigMotionTruth: false,
      morphologyPortability: false,
      hordeVisualOutcomeAccepted: false,
    },
  };
}

function validateHillEvidenceReport(
  report: unknown,
  replay: HillHordeSameScenePrefixReplay,
  motion: LermHordeLiveBodyMotionComposition,
  options: SameSceneConsumerEvidenceOptions,
  outputSha256: string,
): void {
  const expected = createExpectedHillEvidenceReport(
    replay,
    motion,
    options,
    outputSha256,
  );
  if (!isDeepStrictEqual(report, expected)) {
    throw new Error(
      'same-scene Hill evidence report does not match canonical source, status, world, frames, output, and claim identity',
    );
  }
}

export function runHillHordeSameScenePrefixWitnessCli(
  argv = process.argv.slice(2),
  runtime: WitnessRuntime = {
    render: renderHillHordeSameScenePrefixReplaySvg,
  },
): number {
  let phase: Phase = 'argument-parse';
  let args: CliArgs = looseArgs(argv);
  const evidence: Record<string, unknown> = {};
  const protectedInputs: string[] = [];

  try {
    args = parseArgs(argv);
    const missing = [
      !args.hordeReport && '--horde-report',
      !args.producerReceipt && '--producer-receipt',
      !args.hordeRevision && '--horde-revision',
      !args.hillRevision && '--hill-revision',
      !args.imageOut && '--image-out',
      !args.hillEvidenceOut && '--hill-evidence-out',
      !args.reportOut && '--report-out',
    ].filter(Boolean);
    if (missing.length > 0) throw new Error(`missing required ${missing.join(', ')}`);
    const complete = args as { [Key in keyof CliArgs]: string };
    const effective = {
      hordeReport: resolve(complete.hordeReport),
      producerReceipt: resolve(complete.producerReceipt),
      imageOut: resolve(complete.imageOut),
      hillEvidenceOut: resolve(complete.hillEvidenceOut),
      reportOut: resolve(complete.reportOut),
    };
    protectedInputs.push(effective.hordeReport, effective.producerReceipt);
    validateDistinctPaths(Object.values(effective));
    evidence.requested = { ...complete };
    evidence.effective = {
      ...effective,
      hordeRevision: complete.hordeRevision,
      hillRevision: complete.hillRevision,
    };

    phase = 'input-read';
    const hordeReportBytes = readRequiredInput(
      effective.hordeReport,
      'Horde report',
    );
    const producerReceiptBytes = readRequiredInput(
      effective.producerReceipt,
      'producer receipt',
    );
    evidence.input = {
      hordeReportSha256: sha256(hordeReportBytes),
      producerReceiptSha256: sha256(producerReceiptBytes),
      hordeReportByteLength: hordeReportBytes.length,
      producerReceiptByteLength: producerReceiptBytes.length,
    };
    const hordeReport = JSON.parse(
      hordeReportBytes.toString('utf8'),
    ) as ReviewedHordeTraversalReport;
    const producerReceipt = JSON.parse(
      producerReceiptBytes.toString('utf8'),
    ) as LermHordeProducerHistoryCompositionReceipt;

    phase = 'source-verification';
    const sourceIdentity = runtime.sourceIdentity?.() ?? inspectSourceIdentity();
    if (sourceIdentity.dirty) {
      throw new Error(`current same-scene source is dirty: ${sourceIdentity.dirty}`);
    }
    if (!sourceIdentity.hordeAncestor(complete.hordeRevision)) {
      throw new Error(
        `reviewed Horde revision ${complete.hordeRevision} is not an ancestor of current source`,
      );
    }
    if (!sourceIdentity.hillAncestor(complete.hillRevision)) {
      throw new Error(
        `reviewed Hill revision ${complete.hillRevision} is not an ancestor of current source`,
      );
    }
    if (
      sourceIdentity.verifierRevision !==
        HILL_HORDE_REVIEWED_SAME_SCENE_VERIFIER_REVISION ||
      sourceIdentity.verifierAncestor?.(
        HILL_HORDE_REVIEWED_SAME_SCENE_VERIFIER_REVISION,
      ) !== true ||
      sourceIdentity.verifierModuleBlob !==
        HILL_HORDE_REVIEWED_SAME_SCENE_VERIFIER_MODULE_BLOB ||
      sourceIdentity.reviewedVerifierModuleBlob !==
        HILL_HORDE_REVIEWED_SAME_SCENE_VERIFIER_MODULE_BLOB
    ) {
      throw new Error(
        `reviewed Horde verifier ${HILL_HORDE_REVIEWED_SAME_SCENE_VERIFIER_REVISION} ancestry or source blob is missing or substituted`,
      );
    }
    evidence.source = {
      requestedHordeRevision: complete.hordeRevision,
      requestedHillRevision: complete.hillRevision,
      reviewedHordeVerifierRevision:
        HILL_HORDE_REVIEWED_SAME_SCENE_VERIFIER_REVISION,
      effectivePresenterRevision: sourceIdentity.head,
      effectiveHordeVerifierModuleBlob:
        sourceIdentity.verifierModuleBlob,
      dirty: sourceIdentity.dirty,
      hordeAncestor: true,
      hillAncestor: true,
      hordeVerifierAncestor: true,
      hordeVerifierSourceExact: true,
    };

    phase = 'composition';
    const admission = composeHordeTraversalIntoLiveHill({
      hordeReport,
      producerReceipt,
      producerReceiptSha256: sha256(producerReceiptBytes),
      hordeRevision: complete.hordeRevision,
      hillRevision: complete.hillRevision,
    });
    const motion = composeLermHordeLiveBodyMotion(admission);
    const replay = createHillHordeSameScenePrefixReplay(admission, motion);

    phase = 'render';
    const svg = runtime.render(replay);
    verifySvg(svg);
    const svgSha256 = sha256(svg);

    phase = 'write-primary';
    atomicWrite(effective.imageOut, svg);
    verifyWrittenSvg(effective.imageOut, svgSha256);

    phase = 'write-hill-evidence';
    const hillEvidenceOptions: SameSceneConsumerEvidenceOptions = {
      hillEvidenceReportPath: effective.hillEvidenceOut,
      requestedOutputPath: complete.imageOut,
      effectiveOutputPath: effective.imageOut,
      presenterRevision: sourceIdentity.head,
      hordeVerifierRevision:
        HILL_HORDE_REVIEWED_SAME_SCENE_VERIFIER_REVISION,
      hordeVerifierModuleBlob:
        HILL_HORDE_REVIEWED_SAME_SCENE_VERIFIER_MODULE_BLOB,
    };
    const hillEvidenceReport = createExpectedHillEvidenceReport(
      replay,
      motion,
      hillEvidenceOptions,
      svgSha256,
    );
    const hillEvidenceText = `${JSON.stringify(hillEvidenceReport, null, 2)}\n`;
    atomicWrite(effective.hillEvidenceOut, hillEvidenceText);
    const hillEvidenceSha256 = sha256(
      readFileSync(effective.hillEvidenceOut),
    );

    phase = 'consumer-verification';
    const consumerEvidence = createHillHordeSameSceneConsumerEvidence(
      replay,
      motion,
      hillEvidenceOptions,
    );
    const consumerVerification = verifyLermHordeSameSceneConsumerEvidence(
      motion,
      consumerEvidence,
    );
    if (
      consumerVerification.machineContractAccepted !== true ||
      consumerVerification.visualOutcomeAccepted !== false ||
      consumerVerification.pending.length !== 1 ||
      consumerVerification.pending[0] !== 'horde_visual_inspection'
    ) {
      throw new Error(
        'Horde same-scene verifier did not accept the Hill consumer execution at the narrow claim boundary',
      );
    }

    phase = 'write-report';
    const report = {
      ok: true,
      schema: HILL_HORDE_SAME_SCENE_PREFIX_WITNESS_SCHEMA,
      phase: 'complete',
      route: {
        requested: HILL_HORDE_SAME_SCENE_PREFIX_REPLAY_ROUTE,
        effective: replay.route,
      },
      config: {
        requested: admission.hill.requested.configId,
        effective: admission.hill.effective.configId,
      },
      backend: {
        requested: admission.hill.requested.backend,
        effective: admission.hill.effective.backend,
      },
      inputs: {
        requested: { ...complete },
        effective: {
          hordeReport: effective.hordeReport,
          producerReceipt: effective.producerReceipt,
          hordeRevision: admission.source.horde.revision,
          hillRevision: admission.hill.targetRevision,
          hordeVerifierRevision:
            HILL_HORDE_REVIEWED_SAME_SCENE_VERIFIER_REVISION,
          hordeVerifierModuleBlob:
            HILL_HORDE_REVIEWED_SAME_SCENE_VERIFIER_MODULE_BLOB,
          presenterRevision: sourceIdentity.head,
        },
        hordeReportSha256: sha256(hordeReportBytes),
        producerReceiptSha256: sha256(producerReceiptBytes),
      },
      replay: {
        schema: HILL_HORDE_SAME_SCENE_PREFIX_REPLAY_SCHEMA,
        evidenceClass: replay.evidenceClass,
        source: replay.source,
        assertions: replay.assertions,
        frames: replay.frames.map((frame) => ({
          index: frame.index,
          kind: frame.kind,
          timestampMs: frame.timestampMs,
          prefixSampleCount: frame.prefixSampleCount,
          actorSequence: frame.actor?.sequence ?? null,
          actorRootWorld: frame.actor?.rootWorld ?? null,
          trafficChecksum:
            frame.terrain.witness.producerTrafficFieldChecksum,
          trafficExposureSeconds:
            frame.terrain.witness.producerTrafficExposureSeconds,
          topologyPossibilityChecksum:
            frame.terrain.witness.topologyPossibilityChecksum,
          liveContactTruth: frame.claimBoundary.liveContactTruth,
        })),
      },
      consumer: {
        verifierSource: {
          revision: HILL_HORDE_REVIEWED_SAME_SCENE_VERIFIER_REVISION,
          modulePath: 'src/lerm-horde-live-body-motion.ts',
          moduleBlob:
            HILL_HORDE_REVIEWED_SAME_SCENE_VERIFIER_MODULE_BLOB,
          ancestorOfPresenter: true,
          sourceExact: true,
        },
        evidence: consumerEvidence,
        verification: consumerVerification,
      },
      hillEvidence: {
        reportOut: effective.hillEvidenceOut,
        reportSha256: hillEvidenceSha256,
        schema: hillEvidenceReport.schema,
      },
      output: {
        imageOut: effective.imageOut,
        reportOut: effective.reportOut,
        imageSha256: svgSha256,
        width: 2160,
        height: 1080,
      },
      visualStatus: 'rendered_uninspected',
      fallbackStatus: replay.fallbackStatus,
      staleStatus: replay.staleStatus,
      partialStatus: replay.partialStatus,
      failurePhase: null,
    };
    atomicWrite(effective.reportOut, `${JSON.stringify(report, null, 2)}\n`);

    phase = 'verify-final-output';
    verifyWrittenSvg(effective.imageOut, svgSha256);
    const finalReport = JSON.parse(readFileSync(effective.reportOut, 'utf8'));
    if (
      finalReport.ok !== true ||
      finalReport.output?.imageSha256 !== svgSha256 ||
      finalReport.replay?.frames?.length !== 18 ||
      finalReport.consumer?.verifierSource?.revision !==
        HILL_HORDE_REVIEWED_SAME_SCENE_VERIFIER_REVISION ||
      finalReport.consumer?.verifierSource?.moduleBlob !==
        HILL_HORDE_REVIEWED_SAME_SCENE_VERIFIER_MODULE_BLOB ||
      finalReport.consumer?.verification?.machineContractAccepted !== true ||
      finalReport.consumer?.verification?.visualOutcomeAccepted !== false ||
      finalReport.hillEvidence?.reportSha256 !== hillEvidenceSha256 ||
      sha256(readFileSync(effective.hillEvidenceOut)) !== hillEvidenceSha256
    ) {
      throw new Error('same-scene witness final report verification failed');
    }
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const failurePath = safeFailureReportPath(args, protectedInputs);
    if (failurePath) {
      try {
        atomicWrite(
          failurePath,
          `${JSON.stringify({
            ok: false,
            schema: HILL_HORDE_SAME_SCENE_PREFIX_WITNESS_SCHEMA,
            phase: 'failed',
            route: {
              requested: HILL_HORDE_SAME_SCENE_PREFIX_REPLAY_ROUTE,
              effective: null,
            },
            failurePhase: phase,
            error: message,
            primaryOutputWritten:
              phase === 'write-hill-evidence' ||
              phase === 'consumer-verification' ||
              phase === 'write-report' ||
              phase === 'verify-final-output',
            lastTrustworthyEvidence: evidence,
          }, null, 2)}\n`,
        );
      } catch {
        // stderr remains authoritative when the requested report path is unusable.
      }
    }
    process.stderr.write(`${message}\n`);
    return 1;
  }
}

function looseArgs(argv: readonly string[]): CliArgs {
  return {
    hordeReport: findArgValue(argv, '--horde-report'),
    producerReceipt: findArgValue(argv, '--producer-receipt'),
    hordeRevision: findArgValue(argv, '--horde-revision'),
    hillRevision: findArgValue(argv, '--hill-revision'),
    imageOut: findArgValue(argv, '--image-out'),
    hillEvidenceOut: findArgValue(argv, '--hill-evidence-out'),
    reportOut: findArgValue(argv, '--report-out'),
  };
}

function parseArgs(argv: readonly string[]): CliArgs {
  const known = new Set([
    '--horde-report',
    '--producer-receipt',
    '--horde-revision',
    '--hill-revision',
    '--image-out',
    '--hill-evidence-out',
    '--report-out',
  ]);
  if (argv.length % 2 !== 0) {
    throw new Error(`invalid argument sequence near ${argv.at(-1) ?? 'end'}`);
  }
  for (let index = 0; index < argv.length; index += 2) {
    if (
      !known.has(argv[index]) ||
      !argv[index + 1] ||
      argv[index + 1].startsWith('--')
    ) {
      throw new Error(`invalid argument sequence near ${argv[index] ?? 'end'}`);
    }
  }
  return looseArgs(argv);
}

function findArgValue(argv: readonly string[], name: string): string | null {
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] ?? null : null;
}

function readRequiredInput(path: string, label: string): Buffer {
  const bytes = readFileSync(path);
  if (bytes.length === 0) throw new Error(`${label} is blank`);
  return bytes;
}

function inspectSourceIdentity(): {
  head: string;
  dirty: string;
  hordeAncestor: (revision: string) => boolean;
  hillAncestor: (revision: string) => boolean;
  verifierAncestor: (revision: string) => boolean;
  verifierRevision: string;
  verifierModuleBlob: string;
  reviewedVerifierModuleBlob: string;
} {
  const git = (args: readonly string[]) =>
    execFileSync('git', args, { encoding: 'utf8' }).trim();
  const isAncestor = (revision: string) => {
    try {
      execFileSync('git', ['merge-base', '--is-ancestor', revision, 'HEAD'], {
        stdio: 'ignore',
      });
      return true;
    } catch {
      return false;
    }
  };
  return {
    head: git(['rev-parse', 'HEAD']),
    dirty: git(['status', '--porcelain=v1']),
    hordeAncestor: isAncestor,
    hillAncestor: isAncestor,
    verifierAncestor: isAncestor,
    verifierRevision:
      HILL_HORDE_REVIEWED_SAME_SCENE_VERIFIER_REVISION,
    verifierModuleBlob: git([
      'hash-object',
      'src/lerm-horde-live-body-motion.ts',
    ]),
    reviewedVerifierModuleBlob: git([
      'rev-parse',
      `${HILL_HORDE_REVIEWED_SAME_SCENE_VERIFIER_REVISION}:src/lerm-horde-live-body-motion.ts`,
    ]),
  };
}

function validateDistinctPaths(paths: readonly string[]): void {
  for (const path of paths) {
    if (existsSync(path) && lstatSync(path).isSymbolicLink()) {
      throw new Error(`input and output leaves must not be symbolic links: ${path}`);
    }
  }
  for (let left = 0; left < paths.length; left += 1) {
    for (let right = left + 1; right < paths.length; right += 1) {
      if (pathsAlias(paths[left], paths[right])) {
        throw new Error(`input and output paths must be distinct: ${paths[left]}`);
      }
    }
  }
}

function pathsAlias(left: string, right: string): boolean {
  if (resolve(left) === resolve(right)) return true;
  if (!existsSync(left) || !existsSync(right)) return false;
  return realpathSync(left) === realpathSync(right);
}

function safeFailureReportPath(
  args: CliArgs,
  protectedInputs: readonly string[],
): string | null {
  if (!args.reportOut) return null;
  const candidate = resolve(args.reportOut);
  if (
    protectedInputs.some(
      (input) => pathsAlias(candidate, input) || resolve(input) === candidate,
    )
  ) {
    return null;
  }
  return candidate;
}

function verifySvg(svg: string): void {
  if (
    !svg.startsWith('<svg ') ||
    svg.length < 20_000 ||
    (svg.match(/data-same-scene="true"/g) ?? []).length !== 18 ||
    (svg.match(/data-actual-hill-terrain="true"/g) ?? []).length !== 18 ||
    (svg.match(/data-visible-lerm-body="true"/g) ?? []).length !== 15
  ) {
    throw new Error('same-scene primary output is missing, blank, or partial');
  }
}

function atomicWrite(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}`;
  writeFileSync(temporary, content);
  renameSync(temporary, path);
}

function verifyWrittenSvg(path: string, expectedSha256: string): void {
  if (!existsSync(path) || !statSync(path).isFile()) {
    throw new Error('same-scene witness primary output is missing');
  }
  const bytes = readFileSync(path);
  if (bytes.length < 20_000 || sha256(bytes) !== expectedSha256) {
    throw new Error('same-scene witness primary output is blank, partial, or changed');
  }
}

function sha256(bytes: string | Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function isSha256(value: string): boolean {
  return /^[a-f0-9]{64}$/.test(value);
}

const isMain =
  process.argv[1] !== undefined &&
  realpathSync(resolve(process.argv[1])) ===
    realpathSync(fileURLToPath(import.meta.url));
if (isMain) process.exitCode = runHillHordeSameScenePrefixWitnessCli();
