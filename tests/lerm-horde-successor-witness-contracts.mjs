import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const root = process.cwd();
const tmp = mkdtempSync(join(tmpdir(), 'lerms-horde-successor-'));
const reportPath = join(tmp, 'successor-witness.json');

const run = spawnSync(
  process.execPath,
  [
    '--experimental-strip-types',
    'src/lerm-horde-successor-witness.ts',
    '--out',
    reportPath,
  ],
  { cwd: root, encoding: 'utf8' },
);

assert.equal(run.status, 0, run.stderr || run.stdout);

const report = JSON.parse(readFileSync(reportPath, 'utf8'));
assert.equal(report.ok, true);
assert.equal(report.schema, 'lerms.lerm-horde-successor-witness.v0');
assert.equal(report.route, 'lerms/lerm-horde-successor/witness-file');
assert.equal(report.phase, 'complete');
assert.equal(report.outputPath, reportPath);
assert.equal(report.diaulos, 'lerm-horde-fucker');
assert.equal(report.scope.owner, 'red-lerm-body-motion-source-truth');
assert.deepEqual(report.scope.nonGoals, [
  'central-kaminos-kiln-architecture',
  'generic-asset-becoming',
  'blue-yellow-lerm-species',
  'goin-physics',
  'crowd-simulation',
]);

assert.equal(report.cropMiningEvidence.length, 4);
const evidenceById = new Map(report.cropMiningEvidence.map((entry) => [entry.id, entry]));
assert.equal(
  evidenceById.get('hill-of-hills-contact-1024').sha256,
  '41de46c926f32d392e9692cf0c33edece23322726f622a43e01870bfec228f06',
);
assert.equal(
  evidenceById.get('contact-cropmine').sha256,
  '064a5574a93a47c84b3433b4bd8e38ae7e96fa5f78bfbc4328678336e1cab56d',
);
for (const entry of report.cropMiningEvidence) {
  assert.equal(entry.authority, 'directional_evidence');
  assert.equal(entry.sourceTruth, 'not_runtime_body_source');
  assert.ok(entry.failureEvidence.some((item) => item.includes('no-eye')));
}

assert.equal(report.specimenLaw.identity, 'eyeless-nose-led-squash-bodied-thief');
assert.equal(report.specimenLaw.visibleEyesAllowed, false);
assert.ok(report.specimenLaw.mustExpressAttentionThrough.includes('nub-orientation'));
assert.ok(report.specimenLaw.mustExpressAttentionThrough.includes('whole-body-posture'));
assert.ok(report.specimenLaw.requiredAffordances.includes('steal-carry-goin'));
assert.ok(report.specimenLaw.requiredAffordances.includes('hit-tumble-drop-reroute'));
assert.ok(report.specimenLaw.forbiddenDrift.includes('visible-eyes'));
assert.ok(report.specimenLaw.forbiddenDrift.includes('mascot-face-language'));

assert.equal(report.fixtureMotion.schema, 'lerms.red-lerm-body-motion.v0');
assert.equal(report.fixtureMotion.sourceTruth.effectiveMotionSource.kind, 'fixture');
assert.equal(report.fixtureMotion.sourceTruth.effectiveMotionSource.status, 'fixture');
assert.equal(report.fixtureMotion.assetTruth.representationKind, 'fixture');
assert.equal(report.fixtureMotion.assetTruth.truthStatus, 'scene-local-reference');
assert.equal(report.fixtureMotion.assetTruth.visualStatus, 'placeholder');
assert.equal(report.fixtureMotion.sourceTruth.fallbackActive, false);

assert.deepEqual(report.bucketCoverage.requiredStateBuckets, [
  'approach-uphill',
  'steal-goin',
  'carry-goin',
  'flee-with-goin',
  'hit-reaction',
  'tumble-flail',
  'drop-goin',
  'reroute-loose-goin',
]);
assert.deepEqual(report.bucketCoverage.missingBuckets, []);
for (const bucket of report.bucketCoverage.requiredStateBuckets) {
  assert.equal(report.bucketCoverage.counts[bucket], 1, `${bucket} is represented once`);
}

assert.equal(report.truthBoundary.builtRealMotion, false);
assert.equal(report.truthBoundary.builtGeneratedMesh, false);
assert.equal(report.truthBoundary.builtFixtureMotion, true);
assert.equal(report.truthBoundary.builtArchitectureOnly, false);
assert.equal(report.truthBoundary.closeoutPhrase, 'fixture-backed successor witness, not real motion');

console.log('lerm horde successor witness tests passed');
