import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  linkSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  CED6DB3D_PRODUCER_REVISION,
  REJECTED_FITTED_CONTACT_REVISION,
  buildStableRailVisualWitness,
  runStableRailVisualWitnessCli,
} from '../src/lerm-horde-stable-rail-visual-witness.ts';

const receipt = JSON.parse(
  readFileSync('artifacts/lerm-horde-producer-history/receipt.json', 'utf8'),
);
const fileSha256 = (path) =>
  createHash('sha256').update(readFileSync(path)).digest('hex');
const gitText = (args) =>
  execFileSync('git', args, { encoding: 'utf8' }).trim();
const verifiedInputs = {
  receiptPath: 'artifacts/lerm-horde-producer-history/receipt.json',
  receiptSha256: fileSha256('artifacts/lerm-horde-producer-history/receipt.json'),
  receiptGitBlob: 'c172578aa6663bb82a5e2d9cc0ab273f9f9d0279',
  dirtyReceiptInput: '',
  producerRoot: '/private/tmp/kaminos-lerm-horde-producer-ced6db3d',
  producerRevision: CED6DB3D_PRODUCER_REVISION,
  producerModulePath: 'motion-ready-719024-core.js',
  producerModuleSha256: receipt.producer.moduleSha256,
  registrationPath: 'artifacts/motion-ready-719024/registration.json',
  registrationSha256: 'cb519913ad863441e88555b3d9fbd588ffef03650475de07c29ee1c71f500ff6',
  dirtyProducerInputs: '',
  bodyPath: 'src/red-lerm-body-candidates.ts',
  bodySha256: fileSha256('src/red-lerm-body-candidates.ts'),
  bodyGitBlob: gitText(['hash-object', 'src/red-lerm-body-candidates.ts']),
  bodySourceRevision: gitText([
    'log',
    '-1',
    '--format=%H',
    '--',
    'src/red-lerm-body-candidates.ts',
  ]),
  dirtyBodyInput: '',
};

const { report, pixels } = buildStableRailVisualWitness({
  receipt,
  verifiedInputs,
  imagePath: '/tmp/lerm-horde-stable-rail.ppm',
});

assert.equal(report.ok, true);
assert.equal(report.schema, 'lerms.lerm-horde.stable-rail-visual-witness.v0');
assert.equal(report.phase, 'complete');
assert.equal(report.visualStatus, 'rendered_uninspected');
assert.equal(report.producer.revision, CED6DB3D_PRODUCER_REVISION);
assert.equal(report.producer.moduleSha256, receipt.producer.moduleSha256);
assert.equal(report.producer.driverRole, 'producer-control-non-lerm');
assert.equal(report.receipt.path, verifiedInputs.receiptPath);
assert.equal(report.receipt.sha256, verifiedInputs.receiptSha256);
assert.equal(report.receipt.gitBlob, verifiedInputs.receiptGitBlob);
assert.equal(report.receipt.dirtyInput, '');
assert.equal(report.receipt.sourceRevision, receipt.lerms.revision);
assert.equal(report.visibleBody.assetIdentity, 'lerms.red-lerm-body.procedural-squash-thief.v0');
assert.equal(report.visibleBody.candidateId, 'procedural-squash-thief-v0');
assert.equal(report.visibleBody.candidateSchema, 'lerms.red-lerm-body-candidate.v0');
assert.equal(report.visibleBody.shapeSchema, 'lerms.red-lerm-procedural-shape.v0');
assert.equal(report.visibleBody.gitBlob, verifiedInputs.bodyGitBlob);
assert.equal(report.visibleBody.sourceRevision, verifiedInputs.bodySourceRevision);
assert.equal(report.visibleBody.dirtyInput, '');
const bodySourceBytes = execFileSync(
  'git',
  [
    'show',
    `${report.composition.sources.body.sourceRevision}:${report.composition.sources.body.path}`,
  ],
  { encoding: null },
);
assert.equal(
  createHash('sha256').update(bodySourceBytes).digest('hex'),
  report.composition.sources.body.sha256,
  'the reported body source revision must reproduce the verified source bytes',
);
assert.equal(report.composition.sourceVerification, 'declared_unverified');
assert.equal(report.composition.assertions.declaredPoseVariation, false);
assert.equal(report.composition.assertions.rootSupportSamplesDeclared, false);
assert.equal(report.composition.assertions.exactLandedHill, false);
assert.equal(report.composition.assertions.historicalRailReplay, true);
assert.equal(report.composition.timeline.length, 15);
assert.deepEqual(
  report.composition.timeline.map((frame) => frame.bodyRootWorld),
  receipt.history.samples.map((sample) => sample.root.worldPosition),
);
assert.ok(
  report.composition.timeline.every(
    (frame) =>
      frame.firstVerticalFrame.terrainSamples.length === 0 &&
      frame.lerm.terrainContact.grounded === false,
  ),
);
assert.deepEqual(report.renderedSampleSequences, [0, 3, 6, 9, 12, 14]);
assert.ok(report.metrics.nonBackgroundPixelCount > 20000);
assert.ok(report.metrics.redBodyPixelCount > 5000);
assert.ok(report.metrics.railPixelCount > 1000);
assert.equal(report.claimBoundary.liveContactTruth, false);
assert.equal(report.claimBoundary.liveCurrentHillTruth, false);
assert.equal(report.claimBoundary.bodyArticulationTruth, false);
assert.equal(report.claimBoundary.rejectedFittedContactConsumed, false);
assert.equal(report.rejectedInputs.fittedContactRevision, REJECTED_FITTED_CONTACT_REVISION);
assert.equal(pixels.byteLength, report.width * report.height * 3);

assert.throws(
  () =>
    buildStableRailVisualWitness({
      receipt,
      verifiedInputs: {
        ...verifiedInputs,
        producerRevision: REJECTED_FITTED_CONTACT_REVISION,
      },
      imagePath: '/tmp/rejected.ppm',
    }),
  /producer revision must be immutable ced6db3d/,
);

assert.throws(
  () =>
    buildStableRailVisualWitness({
      receipt,
      verifiedInputs: {
        ...verifiedInputs,
        producerModuleSha256: '0'.repeat(64),
      },
      imagePath: '/tmp/substituted.ppm',
    }),
  /producer module SHA-256 does not match reviewed receipt/,
);

assert.throws(
  () =>
    buildStableRailVisualWitness({
      receipt,
      verifiedInputs: {
        ...verifiedInputs,
        bodyPath: 'totally-different-body.ts',
        bodySha256: '2'.repeat(64),
      },
      imagePath: '/tmp/substituted-body.ppm',
    }),
  /visible body path must be src\/red-lerm-body-candidates.ts/,
);
assert.throws(
  () =>
    buildStableRailVisualWitness({
      receipt,
      verifiedInputs: {
        ...verifiedInputs,
        bodySha256: '2'.repeat(64),
      },
      imagePath: '/tmp/substituted-body-hash.ppm',
    }),
  /visible body SHA-256 does not match the reviewed procedural source/,
);

const mutatedReceipt = structuredClone(receipt);
mutatedReceipt.history.samples[7].root.worldPosition[0] = 99;
assert.throws(
  () =>
    buildStableRailVisualWitness({
      receipt: mutatedReceipt,
      verifiedInputs,
      imagePath: '/tmp/substituted-receipt.ppm',
    }),
  /receipt content does not match reviewed SHA-256/,
);

const failedRunDir = mkdtempSync(join(tmpdir(), 'lerms-stable-rail-failure-'));
const failedReportPath = join(failedRunDir, 'report.json');
assert.equal(
  runStableRailVisualWitnessCli([
    '--receipt',
    'artifacts/lerm-horde-producer-history/receipt.json',
    '--producer-root',
    join(failedRunDir, 'missing-producer'),
    '--report',
    failedReportPath,
    '--image',
    join(failedRunDir, 'missing.ppm'),
  ]),
  1,
);
const failedReport = JSON.parse(readFileSync(failedReportPath, 'utf8'));
assert.equal(failedReport.ok, false);
assert.equal(failedReport.phase, 'failed');
assert.equal(failedReport.failurePhase, 'verify_producer_inputs');
assert.equal(failedReport.requested.producerRevision, CED6DB3D_PRODUCER_REVISION);
assert.match(failedReport.message, /producer verification failed/);

const missingImageReportPath = join(failedRunDir, 'missing-image-report.json');
assert.equal(
  runStableRailVisualWitnessCli([
    '--receipt',
    'artifacts/lerm-horde-producer-history/receipt.json',
    '--producer-root',
    '/private/tmp/kaminos-lerm-horde-producer-ced6db3d',
    '--report',
    missingImageReportPath,
  ]),
  1,
);
const missingImageReport = JSON.parse(readFileSync(missingImageReportPath, 'utf8'));
assert.equal(missingImageReport.failurePhase, 'validate_arguments');
assert.match(missingImageReport.message, /missing required --image/);

const aliasPath = join(failedRunDir, 'aliased-output');
assert.equal(
  runStableRailVisualWitnessCli([
    '--receipt',
    'artifacts/lerm-horde-producer-history/receipt.json',
    '--producer-root',
    '/private/tmp/kaminos-lerm-horde-producer-ced6db3d',
    '--report',
    aliasPath,
    '--image',
    aliasPath,
  ]),
  1,
);
const aliasReport = JSON.parse(readFileSync(aliasPath, 'utf8'));
assert.equal(aliasReport.failurePhase, 'validate_arguments');
assert.match(aliasReport.message, /report and image paths must be distinct/);

const hardLinkReportPath = join(failedRunDir, 'hard-link-report.json');
const hardLinkImagePath = join(failedRunDir, 'hard-link-image.ppm');
writeFileSync(hardLinkReportPath, 'preexisting output object');
linkSync(hardLinkReportPath, hardLinkImagePath);
assert.equal(
  runStableRailVisualWitnessCli([
    '--receipt',
    'artifacts/lerm-horde-producer-history/receipt.json',
    '--producer-root',
    '/private/tmp/kaminos-lerm-horde-producer-ced6db3d',
    '--report',
    hardLinkReportPath,
    '--image',
    hardLinkImagePath,
  ]),
  1,
  'hard-linked report and image outputs must not yield a successful witness',
);
const hardLinkReport = JSON.parse(readFileSync(hardLinkReportPath, 'utf8'));
assert.equal(hardLinkReport.failurePhase, 'validate_arguments');
assert.match(hardLinkReport.message, /same filesystem object/);

const realOutputParent = join(failedRunDir, 'real-output-parent');
const aliasOutputParent = join(failedRunDir, 'alias-output-parent');
mkdirSync(realOutputParent);
symlinkSync(realOutputParent, aliasOutputParent);
const parentAliasReportPath = join(realOutputParent, 'parent-alias-output');
const parentAliasImagePath = join(aliasOutputParent, 'parent-alias-output');
assert.equal(
  runStableRailVisualWitnessCli([
    '--receipt',
    'artifacts/lerm-horde-producer-history/receipt.json',
    '--producer-root',
    '/private/tmp/kaminos-lerm-horde-producer-ced6db3d',
    '--report',
    parentAliasReportPath,
    '--image',
    parentAliasImagePath,
  ]),
  1,
  'outputs through symlinked parent aliases must not yield a successful witness',
);
const parentAliasReport = JSON.parse(readFileSync(parentAliasReportPath, 'utf8'));
assert.equal(parentAliasReport.failurePhase, 'validate_arguments');
assert.match(parentAliasReport.message, /same canonical target/);

const protectedReceiptPath = join(failedRunDir, 'protected-receipt.json');
const protectedReceiptBytes = readFileSync(
  'artifacts/lerm-horde-producer-history/receipt.json',
);
writeFileSync(protectedReceiptPath, protectedReceiptBytes);
assert.equal(
  runStableRailVisualWitnessCli([
    '--receipt',
    protectedReceiptPath,
    '--producer-root',
    '/private/tmp/kaminos-lerm-horde-producer-ced6db3d',
    '--report',
    protectedReceiptPath,
    '--image',
    join(failedRunDir, 'protected-receipt-image.ppm'),
  ]),
  1,
);
assert.deepEqual(
  readFileSync(protectedReceiptPath),
  protectedReceiptBytes,
  'an aliased report path must not overwrite its receipt input with a failure report',
);

const symlinkTarget = join(failedRunDir, 'symlink-target.ppm');
const symlinkImage = join(failedRunDir, 'symlink-image.ppm');
writeFileSync(symlinkTarget, 'not evidence');
symlinkSync(symlinkTarget, symlinkImage);
const symlinkReportPath = join(failedRunDir, 'symlink-report.json');
assert.equal(
  runStableRailVisualWitnessCli([
    '--receipt',
    'artifacts/lerm-horde-producer-history/receipt.json',
    '--producer-root',
    '/private/tmp/kaminos-lerm-horde-producer-ced6db3d',
    '--report',
    symlinkReportPath,
    '--image',
    symlinkImage,
  ]),
  1,
);
const symlinkReport = JSON.parse(readFileSync(symlinkReportPath, 'utf8'));
assert.equal(symlinkReport.failurePhase, 'validate_arguments');
assert.match(symlinkReport.message, /image output path must not be a symbolic link/);

const renderFailureReportPath = join(failedRunDir, 'render-failure-report.json');
assert.equal(
  runStableRailVisualWitnessCli(
    [
      '--receipt',
      'artifacts/lerm-horde-producer-history/receipt.json',
      '--producer-root',
      '/private/tmp/kaminos-lerm-horde-producer-ced6db3d',
      '--report',
      renderFailureReportPath,
      '--image',
      join(failedRunDir, 'render-failure.ppm'),
    ],
    {
      renderRailFilmstrip() {
        throw new Error('forced render failure');
      },
    },
  ),
  1,
);
const renderFailureReport = JSON.parse(readFileSync(renderFailureReportPath, 'utf8'));
assert.equal(renderFailureReport.failurePhase, 'render');
assert.equal(renderFailureReport.lastTrustworthyEvidence.producer.revision, CED6DB3D_PRODUCER_REVISION);
assert.equal(renderFailureReport.lastTrustworthyEvidence.receipt.sha256, verifiedInputs.receiptSha256);

const blockedParent = join(failedRunDir, 'not-a-directory');
writeFileSync(blockedParent, 'regular file');
const writeFailureReportPath = join(failedRunDir, 'write-failure-report.json');
assert.equal(
  runStableRailVisualWitnessCli([
    '--receipt',
    'artifacts/lerm-horde-producer-history/receipt.json',
    '--producer-root',
    '/private/tmp/kaminos-lerm-horde-producer-ced6db3d',
    '--report',
    writeFailureReportPath,
    '--image',
    join(blockedParent, 'witness.ppm'),
  ]),
  1,
);
const writeFailureReport = JSON.parse(readFileSync(writeFailureReportPath, 'utf8'));
assert.equal(writeFailureReport.failurePhase, 'write_image');
assert.equal(writeFailureReport.lastTrustworthyEvidence.producer.revision, CED6DB3D_PRODUCER_REVISION);

console.log('lerm horde stable rail visual witness contracts ok');
