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
} from '../src/lerm-horde-live-body-motion.js';
import {
  HILL_HORDE_SAME_SCENE_PREFIX_REPLAY_SCHEMA,
  createHillHordeSameScenePrefixReplay,
  renderHillHordeSameScenePrefixReplaySvg,
} from '../src/hill-horde-same-scene-prefix-replay.js';
import { runHillHordeSameScenePrefixWitnessCli } from '../src/hill-horde-same-scene-prefix-replay-witness.js';

const sha256 = (path: string) =>
  createHash('sha256').update(readFileSync(path)).digest('hex');
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

assert.equal(replay.schema, HILL_HORDE_SAME_SCENE_PREFIX_REPLAY_SCHEMA);
assert.equal(replay.frames.length, 8);
assert.equal(replay.frames[0].kind, 'no-history-control');
assert.equal(replay.frames[0].actor, null);
assert.equal(replay.frames[0].prefixSampleCount, 0);
assert.equal(replay.frames.at(-1)?.kind, 'after-departure');
assert.equal(replay.frames.at(-1)?.actor, null);

const motionFrames = replay.frames.filter((frame) => frame.kind === 'actor-prefix');
assert.deepEqual(
  motionFrames.map(({ prefixSampleCount }) => prefixSampleCount),
  [1, 4, 7, 10, 13, 15],
);
assert.deepEqual(
  motionFrames.map(({ actor }) => actor?.sequence),
  [0, 3, 6, 9, 12, 14],
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
  replay.frames.at(-1)?.terrain.witness.producerTrafficFieldChecksum,
  'departure must retain the final elapsed traffic field',
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
assert.equal((svg.match(/data-same-scene="true"/g) ?? []).length, 8);
assert.equal((svg.match(/data-actual-hill-terrain="true"/g) ?? []).length, 8);
assert.equal((svg.match(/data-visible-lerm-body="true"/g) ?? []).length, 6);
assert.equal((svg.match(/data-actor-absent="true"/g) ?? []).length, 2);
assert.match(svg, /prefix 1\/15/);
assert.match(svg, /prefix 15\/15/);
assert.match(svg, /after departure/);

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
const hordeReportPath = join(tempDir, 'horde-report.json');
writeFileSync(hordeReportPath, `${JSON.stringify(hordeReport, null, 2)}\n`);

const cleanSource = {
  head: 'candidate-presenter-revision',
  dirty: '',
  hordeAncestor: () => true,
  hillAncestor: () => true,
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
  '--report-out',
  reportOut,
];

const successImagePath = join(tempDir, 'success.svg');
const successReportPath = join(tempDir, 'success.json');
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
assert.equal(successReport.replay.frames.length, 8);
assert.equal(successReport.visualStatus, 'rendered_uninspected');
assert.ok(existsSync(successImagePath));

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
