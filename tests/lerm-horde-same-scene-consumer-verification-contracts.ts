import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

import type { LermHordeProducerHistoryCompositionReceipt } from '../src/lerm-horde-producer-history-composition.js';
import {
  HILL_HORDE_REVIEWED_SOURCE_REVISION,
  composeHordeTraversalIntoLiveHill,
  type ReviewedHordeTraversalReport,
} from '../src/hill-horde-live-traversal-admission.js';
import * as bodyMotionModule from '../src/lerm-horde-live-body-motion.js';

type Verifier = (
  motion: bodyMotionModule.LermHordeLiveBodyMotionComposition,
  evidence: SameSceneEvidence,
  inspection?: SameSceneInspection,
) => {
  machineContractAccepted: boolean;
  visualOutcomeAccepted: boolean;
  pending: readonly string[];
};

interface SameSceneEvidence {
  authority: 'synthetic_verifier_fixture' | 'hill_consumer_execution';
  source: {
    requestedRoute: string;
    effectiveRoute: string;
    hillRevision: string;
    hordeComponentRevision: string;
    actorId: string;
    bodySourceRevision: string;
    bodySha256: string;
  };
  world: {
    coordinateSpace: 'x-y-z-world';
    actualHillTerrain: true;
    commonWorldView: true;
  };
  frames: Array<{
    sequence: number;
    timestampMs: number;
    body:
      | {
          present: true;
          rootWorld: readonly [number, number, number];
          heading: readonly [number, number, number];
          poseFingerprint: string;
        }
      | { present: false };
    history: {
      admittedSampleCount: number;
      admittedThroughTimestampMs: number | null;
    };
    pressure: {
      visible: boolean;
      trafficChecksum: string;
    };
  }>;
  witness: {
    requestedOutputPath: string;
    effectiveOutputPath: string;
    outputSha256: string;
    frameCount: number;
    dynamic: true;
    blank: false;
    cached: false;
  };
  fallbackStatus: 'none';
  staleStatus: 'fresh';
  partialStatus: 'complete';
}

interface SameSceneInspection {
  inspectorAuthority: 'lerms_body_motion_owner';
  artifactPath: string;
  inspectionReportPath: string;
  outputSha256: string;
  inspectedFrameCount: number;
  observed: {
    actualHillTerrain: true;
    commonWorldView: true;
    exactBodyAtRootAndHeading: true;
    prefixHistoryGrowth: true;
    pressureFormsBehindBody: true;
    bodyAbsentAfterDeparture: true;
    pressurePersistsAfterDeparture: true;
  };
}

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
const componentRevision =
  bodyMotionModule.LERM_HORDE_REVIEWED_LIVE_BODY_MOTION_REVISION;

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
  hillRevision: bodyMotionModule.LERM_HORDE_REVIEWED_LIVE_HILL_REVISION,
});
const motion = bodyMotionModule.composeLermHordeLiveBodyMotion(admission);
const claimBoundary = motion.claimBoundary as typeof motion.claimBoundary & {
  sameSceneConsumerExerciseTruth?: boolean;
  perFrameIncrementalAdmissionTruth?: boolean;
};

assert.equal(
  claimBoundary.sameSceneConsumerExerciseTruth,
  false,
  'the component must explicitly deny same-scene consumer closure',
);
assert.equal(
  claimBoundary.perFrameIncrementalAdmissionTruth,
  false,
  'the component must explicitly deny prefix-time admission closure',
);

const verifier = Reflect.get(
  bodyMotionModule,
  'verifyLermHordeSameSceneConsumerEvidence',
) as Verifier | undefined;
assert.equal(
  typeof verifier,
  'function',
  'the Horde same-scene consumer verifier must be exported',
);
assert.ok(verifier);

const outputSha256 = '1'.repeat(64);
const frames: SameSceneEvidence['frames'] = motion.samples.map(
  (sample, sequence) => ({
    sequence,
    timestampMs: sample.timestampMs,
    body: {
      present: true,
      rootWorld: sample.rootWorld,
      heading: sample.heading,
      poseFingerprint: sample.poseFingerprint,
    },
    history: {
      admittedSampleCount: sequence + 1,
      admittedThroughTimestampMs: sample.timestampMs,
    },
    pressure: {
      visible: true,
      trafficChecksum: `prefix-${sequence + 1}`,
    },
  }),
);
frames.push({
  sequence: motion.samples.length,
  timestampMs: motion.samples.at(-1)!.timestampMs + 100,
  body: { present: false },
  history: {
    admittedSampleCount: motion.samples.length,
    admittedThroughTimestampMs: motion.samples.at(-1)!.timestampMs,
  },
  pressure: {
    visible: true,
    trafficChecksum: `prefix-${motion.samples.length}`,
  },
});

const evidence: SameSceneEvidence = {
  authority: 'synthetic_verifier_fixture',
  source: {
    requestedRoute: 'lerms/hill-of-hills/horde-same-scene-prefix-replay',
    effectiveRoute: 'lerms/hill-of-hills/horde-same-scene-prefix-replay',
    hillRevision: bodyMotionModule.LERM_HORDE_REVIEWED_LIVE_HILL_REVISION,
    hordeComponentRevision: componentRevision,
    actorId: motion.source.admission.actorId,
    bodySourceRevision: motion.source.body.sourceRevision,
    bodySha256: motion.source.body.sha256,
  },
  world: {
    coordinateSpace: 'x-y-z-world',
    actualHillTerrain: true,
    commonWorldView: true,
  },
  frames,
  witness: {
    requestedOutputPath: '/tmp/lerms-hill-horde-same-scene.svg',
    effectiveOutputPath: '/tmp/lerms-hill-horde-same-scene.svg',
    outputSha256,
    frameCount: frames.length,
    dynamic: true,
    blank: false,
    cached: false,
  },
  fallbackStatus: 'none',
  staleStatus: 'fresh',
  partialStatus: 'complete',
};
const inspection: SameSceneInspection = {
  inspectorAuthority: 'lerms_body_motion_owner',
  artifactPath: evidence.witness.effectiveOutputPath,
  inspectionReportPath:
    'artifacts/lerm-horde-same-scene/inspection.json',
  outputSha256,
  inspectedFrameCount: frames.length,
  observed: {
    actualHillTerrain: true,
    commonWorldView: true,
    exactBodyAtRootAndHeading: true,
    prefixHistoryGrowth: true,
    pressureFormsBehindBody: true,
    bodyAbsentAfterDeparture: true,
    pressurePersistsAfterDeparture: true,
  },
};

const syntheticResult = verifier(motion, evidence, inspection);
assert.equal(syntheticResult.machineContractAccepted, true);
assert.equal(
  syntheticResult.visualOutcomeAccepted,
  false,
  'synthetic verifier input must never close the visual outcome',
);
assert.deepEqual(syntheticResult.pending, ['hill_consumer_execution']);

const liveEvidence = structuredClone(evidence);
liveEvidence.authority = 'hill_consumer_execution';
const accepted = verifier(motion, liveEvidence, inspection);
assert.equal(accepted.machineContractAccepted, true);
assert.equal(accepted.visualOutcomeAccepted, true);
assert.deepEqual(accepted.pending, []);

const expectReject = (
  mutate: (candidate: SameSceneEvidence) => void,
  expected: RegExp,
) => {
  const candidate = structuredClone(liveEvidence);
  mutate(candidate);
  assert.throws(() => verifier(motion, candidate, inspection), expected);
};

expectReject(
  (candidate) => {
    candidate.source.hordeComponentRevision = '0'.repeat(40);
  },
  /Horde component revision/,
);
expectReject(
  (candidate) => {
    const body = candidate.frames[3].body;
    assert.equal(body.present, true);
    body.rootWorld = [body.rootWorld[0] + 1, body.rootWorld[1], body.rootWorld[2]];
  },
  /body root/,
);
expectReject(
  (candidate) => {
    candidate.frames[2].history.admittedSampleCount = motion.samples.length;
  },
  /prefix history/,
);
expectReject(
  (candidate) => {
    candidate.frames[4].history.admittedSampleCount = 3;
  },
  /prefix history/,
);
expectReject(
  (candidate) => {
    candidate.frames[5].body = { present: false };
  },
  /body presence/,
);
expectReject(
  (candidate) => {
    candidate.frames.at(-1)!.body = {
      present: true,
      rootWorld: motion.samples.at(-1)!.rootWorld,
      heading: motion.samples.at(-1)!.heading,
      poseFingerprint: motion.samples.at(-1)!.poseFingerprint,
    };
  },
  /departure/,
);
expectReject(
  (candidate) => {
    candidate.frames.at(-1)!.pressure.trafficChecksum = 'lost-pressure';
  },
  /pressure persistence/,
);
expectReject(
  (candidate) => {
    candidate.source.effectiveRoute = 'fallback/scene';
  },
  /requested and effective route/,
);
expectReject(
  (candidate) => {
    candidate.witness.effectiveOutputPath = '/tmp/substituted.svg';
  },
  /requested and effective witness output/,
);
expectReject(
  (candidate) => {
    candidate.witness.blank = true as false;
  },
  /witness output/,
);

assert.throws(
  () =>
    verifier(motion, liveEvidence, {
      ...inspection,
      outputSha256: '2'.repeat(64),
    }),
  /inspection output SHA/,
);
assert.throws(
  () =>
    verifier(motion, liveEvidence, {
      ...inspection,
      artifactPath: '/tmp/substituted.svg',
    }),
  /inspection artifact path/,
);

console.log('Lerm Horde same-scene consumer verification contracts ok');
