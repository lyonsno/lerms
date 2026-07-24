import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { LermHordeProducerHistoryCompositionReceipt } from '../src/lerm-horde-producer-history-composition.js';
import {
  HILL_HORDE_REVIEWED_SOURCE_REVISION,
  composeHordeTraversalIntoLiveHill,
  type ReviewedHordeTraversalReport,
} from '../src/hill-horde-live-traversal-admission.js';
import {
  LERM_HORDE_LIVE_BODY_MOTION_SCHEMA,
  LERM_HORDE_REVIEWED_LIVE_HILL_REVISION,
  composeLermHordeLiveBodyMotion,
} from '../src/lerm-horde-live-body-motion.js';
import {
  LERM_HORDE_LIVE_BODY_MOTION_WITNESS_SCHEMA,
  buildLermHordeLiveBodyMotionWitness,
  runLermHordeLiveBodyMotionWitnessCli,
} from '../src/lerm-horde-live-body-motion-witness.js';

const fileSha256 = (path: string) =>
  createHash('sha256').update(readFileSync(path)).digest('hex');
const gitText = (args: readonly string[]) =>
  execFileSync('git', args, { encoding: 'utf8' }).trim();

const producerReceiptPath = 'artifacts/lerm-horde-producer-history/receipt.json';
const producerReceipt = JSON.parse(
  readFileSync(producerReceiptPath, 'utf8'),
) as LermHordeProducerHistoryCompositionReceipt;
const producerReceiptSha256 = fileSha256(producerReceiptPath);
const bodyPath = 'src/red-lerm-body-candidates.ts';
const bodySha256 = fileSha256(bodyPath);
const bodySourceRevision = gitText(['log', '-1', '--format=%H', '--', bodyPath]);
const presenterRevision = gitText(['rev-parse', 'HEAD']);
const hillRevision = LERM_HORDE_REVIEWED_LIVE_HILL_REVISION;

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
    sha256: producerReceiptSha256,
  },
  producer: {
    revision: producerReceipt.producer.revision,
    moduleSha256: producerReceipt.producer.moduleSha256,
  },
  visibleBody: {
    assetIdentity: 'lerms.red-lerm-body.procedural-squash-thief.v0',
    schemaIdentity: 'lerms.red-lerm-body-schema.v0',
    path: bodyPath,
    sha256: bodySha256,
    gitBlob: gitText(['hash-object', bodyPath]),
    sourceRevision: bodySourceRevision,
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
        sha256: bodySha256,
        sourceRevision: bodySourceRevision,
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
  producerReceiptSha256,
  hordeRevision: HILL_HORDE_REVIEWED_SOURCE_REVISION,
  hillRevision,
});
const motion = composeLermHordeLiveBodyMotion(admission);

assert.equal(motion.ok, true);
assert.equal(motion.schema, LERM_HORDE_LIVE_BODY_MOTION_SCHEMA);
assert.equal(
  motion.samples.length,
  admission.traversal.orderedRootCount,
  'every admitted root needs one body-motion sample',
);
assert.deepEqual(
  motion.samples.map(({ rootWorld }) => rootWorld),
  admission.traversal.liveRootWorld,
  'body motion must preserve the exact live-Hill admitted roots',
);
assert.ok(
  new Set(motion.samples.map(({ poseFingerprint }) => poseFingerprint)).size >= 4,
  'the moving body needs multiple distinct articulated poses',
);
assert.ok(
  new Set(motion.samples.map(({ body }) => `${body.scaleX}:${body.scaleY}`)).size >= 3,
  'the procedural body must visibly squash and stretch over the traversal',
);
assert.ok(
  motion.samples.some(({ legs }) => legs.leftReach > 0 && legs.rightReach < 0),
  'the gait needs a left-leading phase',
);
assert.ok(
  motion.samples.some(({ legs }) => legs.leftReach < 0 && legs.rightReach > 0),
  'the gait needs a right-leading phase',
);
assert.ok(
  motion.samples.some(({ body }) => body.bobWorld > 0),
  'body presentation needs a visible vertical cadence above the admitted root',
);
assert.deepEqual(motion.claimBoundary, {
  rootRailMotionTruth: true,
  liveCurrentHillTruth: true,
  topologyResponseTruth: true,
  bodyArticulationTruth: true,
  articulationClass: 'authored_procedural_presentation',
  sameSceneConsumerExerciseTruth: false,
  perFrameIncrementalAdmissionTruth: false,
  liveContactTruth: false,
  producerRigMotionTruth: false,
  morphologyPortability: false,
});
assert.equal(
  motion.source.admission.hillRevision,
  hillRevision,
  'motion remains bound to the exact reviewed Hill head',
);
assert.equal(
  motion.source.admission.hordeRevision,
  HILL_HORDE_REVIEWED_SOURCE_REVISION,
  'motion remains bound to the exact reviewed Horde rail source',
);
assert.equal(
  motion.source.body.sha256,
  bodySha256,
  'motion remains bound to the reviewed procedural body bytes',
);
assert.equal(motion.gait.phaseDriver, 'source_distance');
assert.equal(admission.admission.stanceContactCount, 0);
assert.equal(
  admission.persistence.trafficChecksumAtAdmission,
  admission.persistence.trafficChecksumAfterDeparture,
  'body presentation must retain Hill-owned post-departure traversal pressure',
);

const witness = buildLermHordeLiveBodyMotionWitness({
  hordeReport,
  producerReceipt,
  producerReceiptSha256,
  hordeRevision: HILL_HORDE_REVIEWED_SOURCE_REVISION,
  hillRevision,
});
assert.equal(
  witness.report.schema,
  LERM_HORDE_LIVE_BODY_MOTION_WITNESS_SCHEMA,
);
assert.equal(witness.report.render.visibleBodyPoseCount, 6);
assert.ok(witness.report.render.distinctRenderedGeometryCount >= 4);
assert.equal(witness.report.render.retainedTrafficPanelCount, 2);
assert.match(witness.svg, /data-authored-procedural-articulation="true"/);
assert.equal(
  (witness.svg.match(/data-visible-lerm-body-pose=/g) ?? []).length,
  6,
);
assert.equal(
  (witness.svg.match(/data-retained-hill-pressure=/g) ?? []).length,
  2,
);
const renderedBodies = [
  ...witness.svg.matchAll(
    /<ellipse cx="([^"]+)" cy="[^"]+" rx="([^"]+)" ry="[^"]+" fill="#df2a36"/g,
  ),
].map((match) => ({
  cx: Number(match[1]),
  rx: Number(match[2]),
}));
assert.equal(renderedBodies.length, 6);
renderedBodies.forEach(({ cx, rx }, panelIndex) => {
  const panelLeft = (panelIndex % 4) * 360;
  assert.ok(
    cx - rx >= panelLeft + 1 && cx + rx <= panelLeft + 359,
    `rendered body ${panelIndex} must fit inside its panel viewport`,
  );
});
assert.equal(
  witness.report.admission.trafficChecksumAtAdmission,
  witness.report.admission.trafficChecksumAfterDeparture,
);
assert.notEqual(
  witness.report.admission.postDepartureTopologyPossibilityChecksum,
  witness.report.admission.noHistoryTopologyPossibilityChecksum,
);

const cliDir = mkdtempSync(join(tmpdir(), 'lerm-horde-live-body-motion-'));
const hordeReportPath = join(cliDir, 'horde-report.json');
const producerReceiptCopy = join(cliDir, 'producer-receipt.json');
const imageOut = join(cliDir, 'body-motion.svg');
const reportOut = join(cliDir, 'body-motion.json');
writeFileSync(hordeReportPath, `${JSON.stringify(hordeReport, null, 2)}\n`);
writeFileSync(
  producerReceiptCopy,
  `${JSON.stringify(producerReceipt, null, 2)}\n`,
);
const cleanSourceIdentity = {
  head: presenterRevision,
  dirty: '',
  hordeAncestor: () => true,
  hillAncestor: () => true,
};
assert.equal(
  runLermHordeLiveBodyMotionWitnessCli(
    [
      '--horde-report',
      hordeReportPath,
      '--producer-receipt',
      producerReceiptCopy,
      '--horde-revision',
      HILL_HORDE_REVIEWED_SOURCE_REVISION,
      '--hill-revision',
      hillRevision,
      '--image-out',
      imageOut,
      '--report-out',
      reportOut,
    ],
    {
      render: () => witness.svg,
      sourceIdentity: () => cleanSourceIdentity,
    },
  ),
  0,
);
const cliReport = JSON.parse(readFileSync(reportOut, 'utf8'));
assert.equal(cliReport.ok, true);
assert.equal(
  cliReport.schema,
  LERM_HORDE_LIVE_BODY_MOTION_WITNESS_SCHEMA,
);
assert.equal(cliReport.outputs.imageSha256, fileSha256(imageOut));
assert.equal(cliReport.inputs.effective.hillRevision, hillRevision);
assert.equal(
  cliReport.inputs.effective.presenterRevision,
  presenterRevision,
  'the Horde presenter revision must not impersonate the Hill target revision',
);
assert.equal(cliReport.motion.claimBoundary.liveContactTruth, false);

const blankImageOut = join(cliDir, 'blank.svg');
const blankReportOut = join(cliDir, 'blank.json');
writeFileSync(blankImageOut, 'preserve-existing-image');
assert.equal(
  runLermHordeLiveBodyMotionWitnessCli(
    [
      '--horde-report',
      hordeReportPath,
      '--producer-receipt',
      producerReceiptCopy,
      '--horde-revision',
      HILL_HORDE_REVIEWED_SOURCE_REVISION,
      '--hill-revision',
      hillRevision,
      '--image-out',
      blankImageOut,
      '--report-out',
      blankReportOut,
    ],
    {
      render: () => '',
      sourceIdentity: () => cleanSourceIdentity,
    },
  ),
  1,
);
assert.equal(
  JSON.parse(readFileSync(blankReportOut, 'utf8')).failurePhase,
  'render',
);
assert.equal(readFileSync(blankImageOut, 'utf8'), 'preserve-existing-image');

const staleReportOut = join(cliDir, 'stale.json');
assert.equal(
  runLermHordeLiveBodyMotionWitnessCli(
    [
      '--horde-report',
      hordeReportPath,
      '--producer-receipt',
      producerReceiptCopy,
      '--horde-revision',
      HILL_HORDE_REVIEWED_SOURCE_REVISION,
      '--hill-revision',
      hillRevision,
      '--image-out',
      join(cliDir, 'stale.svg'),
      '--report-out',
      staleReportOut,
    ],
    {
      render: () => witness.svg,
      sourceIdentity: () => ({
        ...cleanSourceIdentity,
        head: '0'.repeat(40),
        hillAncestor: () => false,
      }),
    },
  ),
  1,
);
assert.equal(
  JSON.parse(readFileSync(staleReportOut, 'utf8')).failurePhase,
  'source-verification',
);

const originalProducerBytes = readFileSync(producerReceiptCopy);
assert.equal(
  runLermHordeLiveBodyMotionWitnessCli(
    [
      '--horde-report',
      hordeReportPath,
      '--producer-receipt',
      producerReceiptCopy,
      '--horde-revision',
      HILL_HORDE_REVIEWED_SOURCE_REVISION,
      '--hill-revision',
      hillRevision,
      '--image-out',
      join(cliDir, 'collision.svg'),
      '--report-out',
      producerReceiptCopy,
    ],
    {
      render: () => witness.svg,
      sourceIdentity: () => cleanSourceIdentity,
    },
  ),
  1,
);
assert.deepEqual(
  readFileSync(producerReceiptCopy),
  originalProducerBytes,
  'invalid output collision must not overwrite the producer receipt',
);

console.log('Lerm Horde live body motion contracts ok');
