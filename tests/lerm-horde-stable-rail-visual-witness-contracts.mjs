import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
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
const verifiedInputs = {
  producerRoot: '/private/tmp/kaminos-lerm-horde-producer-ced6db3d',
  producerRevision: CED6DB3D_PRODUCER_REVISION,
  producerModulePath: 'motion-ready-719024-core.js',
  producerModuleSha256: receipt.producer.moduleSha256,
  registrationPath: 'artifacts/motion-ready-719024/registration.json',
  registrationSha256: 'cb519913ad863441e88555b3d9fbd588ffef03650475de07c29ee1c71f500ff6',
  dirtyProducerInputs: '',
  bodyPath: 'src/red-lerm-body-candidates.ts',
  bodySha256: '1'.repeat(64),
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
assert.equal(report.visibleBody.assetIdentity, 'lerms.red-lerm-body.procedural-squash-thief.v0');
assert.equal(report.composition.sourceVerification, 'declared_unverified');
assert.equal(report.composition.assertions.declaredPoseVariation, false);
assert.equal(report.composition.assertions.rootSupportSamplesDeclared, false);
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

console.log('lerm horde stable rail visual witness contracts ok');
