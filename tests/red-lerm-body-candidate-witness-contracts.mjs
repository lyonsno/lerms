import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const root = process.cwd();
const tmp = mkdtempSync(join(tmpdir(), 'lerms-red-lerm-body-candidates-'));
const reportPath = join(tmp, 'body-candidate-report.json');
const imagePath = join(tmp, 'body-candidate-sheet.ppm');

const run = spawnSync(
  process.execPath,
  [
    '--experimental-strip-types',
    'src/red-lerm-body-candidate-witness.ts',
    '--report',
    reportPath,
    '--image',
    imagePath,
  ],
  { cwd: root, encoding: 'utf8' },
);

assert.equal(run.status, 0, run.stderr || run.stdout);

const report = JSON.parse(readFileSync(reportPath, 'utf8'));
assert.equal(report.ok, true);
assert.equal(report.schema, 'lerms.red-lerm-body-candidate-witness.v0');
assert.equal(report.candidateSchema, 'lerms.red-lerm-body-candidate.v0');
assert.equal(report.route, 'lerms/red-lerm-body-candidate/witness-file');
assert.equal(report.imagePath, imagePath);
assert.equal(report.width, 1280);
assert.equal(report.height, 720);
assert.equal(report.motionContractIdentity, 'lerms.red-lerm-body-motion.v0');
assert.equal(report.frameSchema, 'lerms.first-vertical-frame.v0');
assert.equal(report.selectedDefaultCandidateId, 'procedural-squash-thief-v0');
assert.equal(report.comparisonBaselineCandidateId, 'sphere-nub-baseline-v0');
assert.deepEqual(report.requiredStateBuckets, [
  'approach-uphill',
  'steal-goin',
  'carry-goin',
  'flee-with-goin',
  'hit-reaction',
  'tumble-flail',
  'drop-goin',
  'reroute-loose-goin',
]);

assert.equal(report.candidates.length, 4);
const candidateIds = report.candidates.map((candidate) => candidate.id);
assert.deepEqual(candidateIds, [
  'sphere-nub-baseline-v0',
  'procedural-squash-thief-v0',
  'trellis-red-lerm-greenroom-probe',
  'pixall3d-red-lerm-greenroom-probe',
]);

const procedural = report.candidates.find((candidate) => candidate.id === 'procedural-squash-thief-v0');
assert.equal(procedural.sourceTruth.representationKind, 'authored_procedural');
assert.equal(procedural.sourceTruth.authority, 'synthetic_fixture');
assert.equal(procedural.affordance.canRepresentAllRequiredBuckets, true);
assert.ok(procedural.evaluation.motionAffordance > report.candidates[0].evaluation.motionAffordance);
assert.ok(procedural.evaluation.carrySocket > report.candidates[0].evaluation.carrySocket);

const trellis = report.candidates.find((candidate) => candidate.id === 'trellis-red-lerm-greenroom-probe');
assert.equal(trellis.sourceTruth.representationKind, 'generated_mesh_planned');
assert.equal(trellis.sourceTruth.authority, 'visual_only');
assert.equal(trellis.generatorPlan.backend, 'trellis');
assert.equal(trellis.generatorPlan.substrate, 'gpu_greenroom');
assert.deepEqual(trellis.generatorPlan.resolutionLadder, {
  seedProbe: 512,
  qualityProbe: 768,
  longProbe: 1024,
  confirmationStatus: 'operator_prior_pending_readme_confirmation',
});
assert.equal(trellis.affordance.canRepresentAllRequiredBuckets, false);

const pixall = report.candidates.find((candidate) => candidate.id === 'pixall3d-red-lerm-greenroom-probe');
assert.equal(pixall.generatorPlan.backend, 'pixall3d');
assert.equal(pixall.generatorPlan.substrate, 'gpu_greenroom');
assert.equal(pixall.affordance.canRepresentAllRequiredBuckets, false);

assert.ok(report.nonBackgroundPixelCount > 30000, 'witness sheet should contain visible candidate content');
assert.ok(report.baselinePixelCount > 3000, 'witness sheet should render the sphere-nub baseline');
assert.ok(report.proceduralPixelCount > 7000, 'witness sheet should render the procedural body candidate');
assert.ok(report.plannedExternalPixelCount > 3000, 'witness sheet should render planned external candidate placeholders');
assert.ok(report.sourceTruthPixelCount > 4000, 'witness sheet should render source-truth/status bands');

const ppm = readFileSync(imagePath);
const header = ppm.subarray(0, 64).toString('ascii');
assert.match(header, /^P6\s+1280\s+720\s+255\s/);
assert.ok(ppm.byteLength > report.width * report.height * 2, 'PPM contains raster bytes');

console.log('red-lerm body candidate witness tests passed');
