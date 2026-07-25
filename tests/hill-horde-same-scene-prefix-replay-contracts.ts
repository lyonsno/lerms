import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { LermHordeProducerHistoryCompositionReceipt } from '../src/lerm-horde-producer-history-composition.js';
import {
  HILL_HORDE_REVIEWED_SOURCE_REVISION,
  composeHordeTraversalIntoLiveHill,
  type ReviewedHordeTraversalReport,
} from '../src/hill-horde-live-traversal-admission.js';
import {
  LERM_HORDE_REVIEWED_LIVE_HILL_REVISION,
  composeLermHordeLiveBodyMotion,
  verifyLermHordeSameSceneConsumerEvidence,
} from '../src/lerm-horde-live-body-motion.js';
import * as bodyMotionModule from '../src/lerm-horde-live-body-motion.js';
import {
  HILL_HORDE_SAME_SCENE_PREFIX_REPLAY_SCHEMA,
  createHillHordeSameScenePrefixReplay,
  renderHillHordeSameScenePrefixFrameSvg,
  renderHillHordeSameScenePrefixReplaySvg,
} from '../src/hill-horde-same-scene-prefix-replay.js';
import {
  createHillHordeSameSceneConsumerEvidence,
  runHillHordeSameScenePrefixWitnessCli,
} from '../src/hill-horde-same-scene-prefix-replay-witness.js';
import * as witnessModule from '../src/hill-horde-same-scene-prefix-replay-witness.js';

const REVIEWED_VERIFIER_REVISION =
  'f916a9309ef4ab3f35d3a94d4e6084a3cdd2f474';
const REVIEWED_VERIFIER_MODULE_BLOB =
  'ae5aec5b6978a6f9d192d0a37aa7a254408201d7';

const sha256 = (path: string) =>
  createHash('sha256').update(readFileSync(path)).digest('hex');
const hashText = (value: string) =>
  createHash('sha256').update(value).digest('hex');
const git = (args: string[]) =>
  execFileSync('git', args, { encoding: 'utf8' }).trim();

const producerReceiptPath = 'artifacts/lerm-horde-producer-history/receipt.json';
const producerReceipt = JSON.parse(
  readFileSync(producerReceiptPath, 'utf8'),
) as LermHordeProducerHistoryCompositionReceipt;
const bodyPath = 'src/red-lerm-body-candidates.ts';
const hordeReport: ReviewedHordeTraversalReport = {
  ok: true,
  schema: 'lerms.lerm-horde.stable-rail-visual-witness.v0',
  phase: 'complete',
  route: {
    requested: producerReceipt.history.producer.route,
    effective: producerReceipt.history.producer.route,
    fallbackStatus: 'none',
    staleStatus: 'fresh',
    partialStatus: 'complete-root-only',
  },
  receipt: {
    sourceRevision: producerReceipt.lerms.revision,
    sha256: sha256(producerReceiptPath),
  },
  producer: {
    revision: producerReceipt.producer.revision,
    moduleSha256: producerReceipt.producer.moduleSha256,
  },
  visibleBody: {
    assetIdentity: 'lerms.red-lerm-body.procedural-squash-thief.v0',
    schemaIdentity: 'lerms.red-lerm-body-schema.v0',
    path: bodyPath,
    sha256: sha256(bodyPath),
    gitBlob: git(['hash-object', bodyPath]),
    sourceRevision: git(['log', '-1', '--format=%H', '--', bodyPath]),
    dirtyInput: '',
    candidateId: 'procedural-squash-thief-v0',
    candidateSchema: 'lerms.red-lerm-body-candidate.v0',
    shapeSchema: 'lerms.red-lerm-procedural-shape.v0',
  },
  composition: {
    identity: {
      actorId: 'lerm-horde-red-rail-witness-0001',
      assetIdentity: 'lerms.red-lerm-body.procedural-squash-thief.v0',
    },
    sources: {
      body: {
        sha256: sha256(bodyPath),
        sourceRevision: git(['log', '-1', '--format=%H', '--', bodyPath]),
      },
    },
    timeline: producerReceipt.history.samples.map((sample) => ({
      timestampMs: sample.timestampMs,
      bodyRootWorld: sample.root.worldPosition,
    })),
  },
  claimBoundary: {
    rootRailMotionTruth: true,
    liveCurrentHillTruth: false,
    liveContactTruth: false,
    bodyArticulationTruth: false,
  },
};

const admission = composeHordeTraversalIntoLiveHill({
  hordeReport,
  producerReceipt,
  producerReceiptSha256: sha256(producerReceiptPath),
  hordeRevision: HILL_HORDE_REVIEWED_SOURCE_REVISION,
  hillRevision: LERM_HORDE_REVIEWED_LIVE_HILL_REVISION,
});
const motion = composeLermHordeLiveBodyMotion(admission);
const replay = createHillHordeSameScenePrefixReplay(admission, motion);

assert.equal(
  typeof Reflect.get(
    bodyMotionModule,
    'verifyLermHordeSameSceneConsumerEvidence',
  ),
  'function',
  'Hill must consume Horde verifier f916a93 rather than self-certifying the rendezvous',
);
assert.equal(
  typeof Reflect.get(witnessModule, 'createHillHordeSameSceneConsumerEvidence'),
  'function',
  'Hill witness must export the source-bound adapter that feeds its actual common-world replay into Horde verification',
);

assert.equal(replay.schema, HILL_HORDE_SAME_SCENE_PREFIX_REPLAY_SCHEMA);
assert.equal(replay.frames.length, 18);
assert.equal(replay.frames[0].kind, 'no-history-control');
assert.equal(replay.frames[0].actor, null);
assert.equal(replay.frames[0].prefixSampleCount, 0);
assert.equal(replay.frames.at(-1)?.kind, 'after-departure');
assert.equal(replay.frames.at(-1)?.actor, null);
const immediateDeparture = replay.frames.find(
  (frame) => frame.kind === 'actor-departed',
);
assert.ok(immediateDeparture);
assert.equal(immediateDeparture.actor, null);

const motionFrames = replay.frames.filter((frame) => frame.kind === 'actor-prefix');
assert.deepEqual(
  motionFrames.map(({ prefixSampleCount }) => prefixSampleCount),
  Array.from({ length: 15 }, (_, index) => index + 1),
);
assert.deepEqual(
  motionFrames.map(({ actor }) => actor?.sequence),
  Array.from({ length: 15 }, (_, index) => index),
);
motionFrames.forEach((frame) => {
  assert.ok(frame.actor);
  assert.deepEqual(frame.actor.rootWorld, motion.samples[frame.actor.sequence].rootWorld);
  assert.equal(frame.claimBoundary.liveContactTruth, false);
  assert.equal(frame.sameSceneTerrainAndActor, true);
});

const prefixExposure = motionFrames.map(
  ({ terrain }) => terrain.witness.producerTrafficExposureSeconds,
);
for (let index = 1; index < prefixExposure.length; index += 1) {
  assert.ok(
    prefixExposure[index] > prefixExposure[index - 1],
    'each elapsed prefix must add exposure rather than showing completed history early',
  );
}
assert.equal(prefixExposure[0], 0);
assert.equal(
  motionFrames.at(-1)?.terrain.witness.producerTrafficFieldChecksum,
  immediateDeparture.terrain.witness.producerTrafficFieldChecksum,
  'departure must retain the final elapsed traffic field',
);
assert.equal(
  motionFrames.at(-1)?.terrain.witness.topologyChecksum,
  immediateDeparture.terrain.witness.topologyChecksum,
  'immediate departure must preserve the exact final Hill snapshot',
);
assert.equal(
  motionFrames.at(-1)?.terrain.witness.producerTrafficFieldChecksum,
  admission.persistence.trafficChecksumAtAdmission,
  'full prefix must reproduce the reviewed complete-history traffic field',
);
assert.notEqual(
  replay.frames[0].terrain.witness.topologyPossibilityChecksum,
  replay.frames.at(-1)?.terrain.witness.topologyPossibilityChecksum,
);

const svg = renderHillHordeSameScenePrefixReplaySvg(replay);
assert.equal((svg.match(/data-same-scene="true"/g) ?? []).length, 18);
assert.equal((svg.match(/data-actual-hill-terrain="true"/g) ?? []).length, 18);
assert.equal((svg.match(/data-visible-lerm-body="true"/g) ?? []).length, 15);
assert.equal((svg.match(/data-actor-absent="true"/g) ?? []).length, 3);
assert.match(svg, /prefix 1\/15/);
assert.match(svg, /prefix 15\/15/);
assert.match(svg, /actor departed · retained prefix/);
assert.match(svg, /later after departure/);

assert.throws(
  () =>
    createHillHordeSameScenePrefixReplay(
      admission,
      {
        ...motion,
        source: {
          ...motion.source,
          admission: {
            ...motion.source.admission,
            hillRevision: 'wrong-hill',
          },
        },
      },
    ),
  /motion source does not match admission/,
);

const substitutedAdmissions = [
  {
    name: 'requested route',
    value: {
      ...admission,
      hill: {
        ...admission.hill,
        requested: {
          ...admission.hill.requested,
          route: 'substituted/hill-route',
        },
      },
    },
  },
  {
    name: 'effective backend and config',
    value: {
      ...admission,
      hill: {
        ...admission.hill,
        effective: {
          ...admission.hill.effective,
          backend: 'substituted-backend',
          configId: 'substituted-config',
        },
      },
    },
  },
  {
    name: 'fallback status',
    value: {
      ...admission,
      fallbackStatus: 'fallback',
    },
  },
  {
    name: 'claim boundary',
    value: {
      ...admission,
      claimBoundary: {
        ...admission.claimBoundary,
        topologyResponseTruth: false,
      },
    },
  },
] as const;
substitutedAdmissions.forEach(({ name, value }) => {
  assert.throws(
    () =>
      createHillHordeSameScenePrefixReplay(
        value as unknown as typeof admission,
        motion,
      ),
    /admission identity is incompatible/,
    `${name} substitution must fail before replay assertions are stamped`,
  );
});

const substitutedMotions = [
  {
    name: 'motion route',
    value: {
      ...motion,
      route: 'substituted-motion-route',
    },
  },
  {
    name: 'motion stale status',
    value: {
      ...motion,
      staleStatus: 'stale',
    },
  },
  {
    name: 'motion claim boundary',
    value: {
      ...motion,
      claimBoundary: {
        ...motion.claimBoundary,
        liveContactTruth: true,
      },
    },
  },
  {
    name: 'motion body identity',
    value: {
      ...motion,
      source: {
        ...motion.source,
        body: {
          ...motion.source.body,
          candidateId: 'substituted-body',
        },
      },
    },
  },
] as const;
substitutedMotions.forEach(({ name, value }) => {
  assert.throws(
    () =>
      createHillHordeSameScenePrefixReplay(
        admission,
        value as unknown as typeof motion,
      ),
    /motion identity is incompatible/,
    `${name} substitution must fail before replay assertions are stamped`,
  );
});

const tempDir = mkdtempSync('/tmp/lerms-hill-horde-prefix-contracts.');
const directOutputPath = join(tempDir, 'direct-common-world.svg');
const minimizedEvidenceReportPath = join(
  tempDir,
  'minimized-hill-evidence.json',
);
const directEvidenceReportPath = join(tempDir, 'direct-hill-evidence.json');
writeFileSync(directOutputPath, svg);
writeFileSync(
  minimizedEvidenceReportPath,
  `${JSON.stringify({
    ok: true,
    schema: 'lerms.hill-of-hills.horde-same-scene-consumer-evidence.v0',
    source: {
      route: replay.route,
      hillRevision: replay.source.hillRevision,
      actorId: replay.source.actorId,
    },
    output: {
      effectivePath: directOutputPath,
      sha256: sha256(directOutputPath),
      frameCount: motion.samples.length + 1,
    },
  }, null, 2)}\n`,
);
assert.throws(
  () =>
    createHillHordeSameSceneConsumerEvidence(replay, motion, {
      hillEvidenceReportPath: minimizedEvidenceReportPath,
      requestedOutputPath: directOutputPath,
      effectiveOutputPath: directOutputPath,
      presenterRevision: 'candidate-presenter-revision',
      hordeVerifierRevision: REVIEWED_VERIFIER_REVISION,
      hordeVerifierModuleBlob: REVIEWED_VERIFIER_MODULE_BLOB,
    }),
  /Hill evidence report/,
  'a minimized companion report must fail before Horde machine acceptance',
);

const directVerifierFrames = replay.frames.filter(
  (frame) =>
    frame.kind === 'actor-prefix' || frame.kind === 'actor-departed',
);
writeFileSync(
  directEvidenceReportPath,
  `${JSON.stringify({
    ok: true,
    schema: 'lerms.hill-of-hills.horde-same-scene-consumer-evidence.v0',
    phase: 'complete',
    source: {
      route: replay.route,
      replaySchema: replay.schema,
      hillRevision: replay.source.hillRevision,
      hordeRevision: replay.source.hordeRevision,
      hordeComponentRevision:
        bodyMotionModule.LERM_HORDE_REVIEWED_LIVE_BODY_MOTION_REVISION,
      hordeVerifierRevision: REVIEWED_VERIFIER_REVISION,
      hordeVerifierModuleBlob: REVIEWED_VERIFIER_MODULE_BLOB,
      bodySourceRevision: replay.source.bodySourceRevision,
      actorId: replay.source.actorId,
      presenterRevision: 'candidate-presenter-revision',
    },
    world: {
      coordinateSpace: 'x-y-z-world',
      sceneId: 'hill-horde-live-hill-common-world-v1',
      viewId: 'hill-horde-isometric-v1',
      cameraChecksum:
        '040c0ae055c1a02360113879302189bb8623d9247dcc4a409dbd745a60f759b6',
      renderLayout: 'single_common_world_view',
      layers: ['actual_hill', 'lerm_body', 'prefix_pressure'],
    },
    frames: directVerifierFrames.map((frame) => ({
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
      frameImageSha256: hashText(
        renderHillHordeSameScenePrefixFrameSvg(frame),
      ),
      bodyPresent: frame.actor !== null,
      liveContactTruth: false,
    })),
    output: {
      requestedPath: directOutputPath,
      effectivePath: directOutputPath,
      sha256: sha256(directOutputPath),
      width: 2160,
      height: 1080,
      frameCount: motion.samples.length + 1,
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
  }, null, 2)}\n`,
);
const directEvidence = createHillHordeSameSceneConsumerEvidence(
  replay,
  motion,
  {
    hillEvidenceReportPath: directEvidenceReportPath,
    requestedOutputPath: directOutputPath,
    effectiveOutputPath: directOutputPath,
    presenterRevision: 'candidate-presenter-revision',
    hordeVerifierRevision: REVIEWED_VERIFIER_REVISION,
    hordeVerifierModuleBlob: REVIEWED_VERIFIER_MODULE_BLOB,
  },
);
const directVerification = verifyLermHordeSameSceneConsumerEvidence(
  motion,
  directEvidence,
);
assert.equal(directEvidence.authority, 'hill_consumer_execution');
assert.equal(directEvidence.frames.length, motion.samples.length + 1);
assert.equal(directEvidence.frames.at(-1)?.body.present, false);
assert.equal(
  directEvidence.frames.at(-1)?.pressure.trafficChecksum,
  directEvidence.frames.at(-2)?.pressure.trafficChecksum,
);
assert.equal(directVerification.machineContractAccepted, true);
assert.equal(directVerification.visualOutcomeAccepted, false);
assert.deepEqual(directVerification.pending, ['horde_visual_inspection']);

const exactHillEvidence = JSON.parse(
  readFileSync(directEvidenceReportPath, 'utf8'),
);
[
  {
    name: 'verifier revision',
    mutate: (candidate: any) => {
      candidate.source.hordeVerifierRevision = '0'.repeat(40);
    },
  },
  {
    name: 'fallback status',
    mutate: (candidate: any) => {
      candidate.fallbackStatus = 'fallback';
    },
  },
  {
    name: 'frame image identity',
    mutate: (candidate: any) => {
      candidate.frames[3].frameImageSha256 = '0'.repeat(64);
    },
  },
  {
    name: 'visual authority',
    mutate: (candidate: any) => {
      candidate.claimBoundary.hordeVisualOutcomeAccepted = true;
    },
  },
].forEach(({ name, mutate }, index) => {
  const candidate = structuredClone(exactHillEvidence);
  mutate(candidate);
  const path = join(tempDir, `substituted-hill-evidence-${index}.json`);
  writeFileSync(path, `${JSON.stringify(candidate, null, 2)}\n`);
  assert.throws(
    () =>
      createHillHordeSameSceneConsumerEvidence(replay, motion, {
        hillEvidenceReportPath: path,
        requestedOutputPath: directOutputPath,
        effectiveOutputPath: directOutputPath,
        presenterRevision: 'candidate-presenter-revision',
        hordeVerifierRevision: REVIEWED_VERIFIER_REVISION,
        hordeVerifierModuleBlob: REVIEWED_VERIFIER_MODULE_BLOB,
      }),
    /Hill evidence report/,
    `${name} substitution must fail before Horde machine acceptance`,
  );
});

const hordeReportPath = join(tempDir, 'horde-report.json');
writeFileSync(hordeReportPath, `${JSON.stringify(hordeReport, null, 2)}\n`);

const missingVerifierSource = {
  head: 'candidate-presenter-revision',
  dirty: '',
  hordeAncestor: () => true,
  hillAncestor: () => true,
};
const cleanSource = {
  ...missingVerifierSource,
  verifierAncestor: () => true,
  verifierRevision: REVIEWED_VERIFIER_REVISION,
  verifierModuleBlob: REVIEWED_VERIFIER_MODULE_BLOB,
  reviewedVerifierModuleBlob: REVIEWED_VERIFIER_MODULE_BLOB,
};
const witnessArgs = (imageOut: string, reportOut: string) => [
  '--horde-report',
  hordeReportPath,
  '--producer-receipt',
  producerReceiptPath,
  '--horde-revision',
  HILL_HORDE_REVIEWED_SOURCE_REVISION,
  '--hill-revision',
  LERM_HORDE_REVIEWED_LIVE_HILL_REVISION,
  '--image-out',
  imageOut,
  '--hill-evidence-out',
  `${reportOut}.hill-evidence.json`,
  '--report-out',
  reportOut,
];

const successImagePath = join(tempDir, 'success.svg');
const successReportPath = join(tempDir, 'success.json');
const missingVerifierImagePath = join(tempDir, 'missing-verifier.svg');
const missingVerifierReportPath = join(tempDir, 'missing-verifier.json');
assert.equal(
  runHillHordeSameScenePrefixWitnessCli(
    witnessArgs(missingVerifierImagePath, missingVerifierReportPath),
    {
      render: renderHillHordeSameScenePrefixReplaySvg,
      sourceIdentity: () => missingVerifierSource,
    },
  ),
  1,
  'body-motion ancestry without exact reviewed verifier provenance must fail',
);
const missingVerifierReport = JSON.parse(
  readFileSync(missingVerifierReportPath, 'utf8'),
);
assert.equal(missingVerifierReport.failurePhase, 'source-verification');
assert.equal(missingVerifierReport.primaryOutputWritten, false);
assert.equal(existsSync(missingVerifierImagePath), false);

assert.equal(
  runHillHordeSameScenePrefixWitnessCli(
    witnessArgs(successImagePath, successReportPath),
    {
      render: renderHillHordeSameScenePrefixReplaySvg,
      sourceIdentity: () => cleanSource,
    },
  ),
  0,
);
const successReport = JSON.parse(readFileSync(successReportPath, 'utf8'));
assert.equal(successReport.ok, true);
assert.equal(
  successReport.route.effective,
  'lerms/hill-of-hills/horde-same-scene-prefix-replay',
);
assert.equal(successReport.inputs.effective.presenterRevision, cleanSource.head);
assert.equal(
  successReport.inputs.effective.hordeVerifierRevision,
  REVIEWED_VERIFIER_REVISION,
);
assert.equal(
  successReport.inputs.effective.hordeVerifierModuleBlob,
  REVIEWED_VERIFIER_MODULE_BLOB,
);
assert.equal(successReport.replay.frames.length, 18);
assert.deepEqual(successReport.consumer.verifierSource, {
  revision: REVIEWED_VERIFIER_REVISION,
  modulePath: 'src/lerm-horde-live-body-motion.ts',
  moduleBlob: REVIEWED_VERIFIER_MODULE_BLOB,
  ancestorOfPresenter: true,
  sourceExact: true,
});
assert.equal(
  successReport.consumer.verification.machineContractAccepted,
  true,
);
assert.equal(successReport.consumer.verification.visualOutcomeAccepted, false);
assert.deepEqual(successReport.consumer.verification.pending, [
  'horde_visual_inspection',
]);
assert.equal(successReport.consumer.evidence.frames.length, 16);
assert.equal(
  new Set(successReport.consumer.evidence.witness.frameImageSha256s).size,
  16,
);
assert.equal(
  successReport.consumer.evidence.source.hillEvidenceReportSha256,
  sha256(`${successReportPath}.hill-evidence.json`),
);
assert.equal(successReport.visualStatus, 'rendered_uninspected');
assert.ok(existsSync(successImagePath));
assert.ok(existsSync(`${successReportPath}.hill-evidence.json`));

const substitutedImagePath = join(tempDir, 'substituted-render.svg');
const substitutedReportPath = join(tempDir, 'substituted-render.json');
assert.equal(
  runHillHordeSameScenePrefixWitnessCli(
    witnessArgs(substitutedImagePath, substitutedReportPath),
    {
      render: (candidate) =>
        renderHillHordeSameScenePrefixReplaySvg(candidate).replace(
          'traffic ',
          'traffiq ',
        ),
      sourceIdentity: () => cleanSource,
    },
  ),
  1,
  'a structurally complete substituted renderer must not manufacture verifier acceptance',
);
const substitutedReport = JSON.parse(
  readFileSync(substitutedReportPath, 'utf8'),
);
assert.equal(substitutedReport.ok, false);
assert.equal(substitutedReport.failurePhase, 'consumer-verification');
assert.equal(substitutedReport.primaryOutputWritten, true);
assert.match(
  substitutedReport.error,
  /does not match the canonical Hill replay/,
);
assert.ok(existsSync(substitutedImagePath));
assert.ok(existsSync(`${substitutedReportPath}.hill-evidence.json`));

const wrongSourceImagePath = join(tempDir, 'wrong-source.svg');
const wrongSourceReportPath = join(tempDir, 'wrong-source.json');
assert.equal(
  runHillHordeSameScenePrefixWitnessCli(
    witnessArgs(wrongSourceImagePath, wrongSourceReportPath),
    {
      render: renderHillHordeSameScenePrefixReplaySvg,
      sourceIdentity: () => ({
        ...cleanSource,
        hillAncestor: () => false,
      }),
    },
  ),
  1,
);
const wrongSourceReport = JSON.parse(
  readFileSync(wrongSourceReportPath, 'utf8'),
);
assert.equal(wrongSourceReport.ok, false);
assert.equal(wrongSourceReport.failurePhase, 'source-verification');
assert.equal(wrongSourceReport.primaryOutputWritten, false);
assert.equal(existsSync(wrongSourceImagePath), false);

const blankImagePath = join(tempDir, 'blank.svg');
const blankReportPath = join(tempDir, 'blank.json');
assert.equal(
  runHillHordeSameScenePrefixWitnessCli(
    witnessArgs(blankImagePath, blankReportPath),
    {
      render: () => '<svg />',
      sourceIdentity: () => cleanSource,
    },
  ),
  1,
);
const blankReport = JSON.parse(readFileSync(blankReportPath, 'utf8'));
assert.equal(blankReport.ok, false);
assert.equal(blankReport.failurePhase, 'render');
assert.equal(blankReport.primaryOutputWritten, false);
assert.equal(existsSync(blankImagePath), false);

const aliasedImagePath = join(tempDir, 'aliased-evidence.svg');
const aliasedReportPath = join(tempDir, 'aliased-evidence.json');
const aliasedArgs = witnessArgs(aliasedImagePath, aliasedReportPath);
const hillEvidenceIndex = aliasedArgs.indexOf('--hill-evidence-out');
aliasedArgs[hillEvidenceIndex + 1] = producerReceiptPath;
assert.equal(
  runHillHordeSameScenePrefixWitnessCli(aliasedArgs, {
    render: renderHillHordeSameScenePrefixReplaySvg,
    sourceIdentity: () => cleanSource,
  }),
  1,
);
const aliasedReport = JSON.parse(readFileSync(aliasedReportPath, 'utf8'));
assert.equal(aliasedReport.ok, false);
assert.equal(aliasedReport.failurePhase, 'argument-parse');
assert.equal(aliasedReport.primaryOutputWritten, false);
assert.equal(existsSync(aliasedImagePath), false);

const argumentReportPath = join(tempDir, 'argument-failure.json');
assert.equal(
  runHillHordeSameScenePrefixWitnessCli([
    '--report-out',
    argumentReportPath,
  ]),
  1,
);
const argumentReport = JSON.parse(readFileSync(argumentReportPath, 'utf8'));
assert.equal(argumentReport.ok, false);
assert.equal(argumentReport.failurePhase, 'argument-parse');

const subprocessReportPath = join(tempDir, 'subprocess-argument-failure.json');
const witnessEntryPath = fileURLToPath(
  new URL(
    '../src/hill-horde-same-scene-prefix-replay-witness.js',
    import.meta.url,
  ),
);
const subprocess = spawnSync(
  process.execPath,
  [witnessEntryPath, '--report-out', subprocessReportPath],
  { encoding: 'utf8' },
);
assert.equal(
  subprocess.status,
  1,
  'compiled CLI must execute even when /tmp and /private/tmp spellings differ',
);
assert.match(subprocess.stderr, /missing required --horde-report/);
const subprocessReport = JSON.parse(
  readFileSync(subprocessReportPath, 'utf8'),
);
assert.equal(subprocessReport.ok, false);
assert.equal(subprocessReport.failurePhase, 'argument-parse');
