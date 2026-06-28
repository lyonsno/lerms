import {
  existsSync,
  mkdtempSync,
  readFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';

import {
  buildGloveWellThrowPhysicsWitnessReport,
  GLOVE_WELL_THROW_PHYSICS_WITNESS_ROUTE,
  GLOVE_WELL_THROW_PHYSICS_WITNESS_SCHEMA
} from '../src/glove-well-throw-physics-witness.ts';

const tmp = mkdtempSync(join(tmpdir(), 'lerms-glove-well-throw-physics-'));
const outputPath = join(tmp, 'throw-physics.json');

const report = buildGloveWellThrowPhysicsWitnessReport({
  outputPath,
  frameId: 'glove-well-throw-physics-test',
  timestampMs: 32_000
});

assert.equal(report.ok, true);
assert.equal(report.schema, GLOVE_WELL_THROW_PHYSICS_WITNESS_SCHEMA);
assert.equal(report.route, GLOVE_WELL_THROW_PHYSICS_WITNESS_ROUTE);
assert.equal(report.outputPath, outputPath);
assert.equal(report.launchWitnessSchema, 'lerms.glove-well-launch-witness.v0');
assert.equal(report.sourceTruth.effectiveAuthority, 'synthetic_fixture');
assert.equal(report.sourceTruth.inputAuthority, 'synthetic_fixture');
assert.equal(report.sourceTruth.physicsAuthority, 'live_simulation');
assert.equal(report.sourceTruth.fixtureInputDowngrade, true);
assert.equal(report.sourceTruth.sourceInputFrameId.endsWith('-release'), true);
assert.equal(report.sourceTruth.releaseEventId.includes('glove-well-release-'), true);
assert.ok(report.sourceTruth.downgrades.includes('fixture_glove_input_not_live_wilor'));
assert.ok(report.sourceTruth.downgrades.includes('throw_physics_transport_not_vertical_success'));

assert.equal(report.trajectory.length, 7);
assert.deepEqual(report.trajectory.map((sample) => sample.phase), [
  'launch',
  'flight',
  'bounce',
  'rolling',
  'bounce',
  'settled',
  'recovered'
]);
assert.equal(report.bounceContacts.length, 2);
assert.equal(report.bounceContacts[0].bounceIndex, 1);
assert.equal(report.bounceContacts[1].bounceIndex, 2);
assert.ok(report.bounceContacts[0].restitution > report.bounceContacts[1].restitution, 'second bounce loses energy');
assert.ok(report.bounceContacts.every((contact) => contact.terrainSampleId.startsWith('throw-terrain-')));

for (let index = 1; index < report.trajectory.length; index += 1) {
  assert.ok(report.trajectory[index].energy01 <= report.trajectory[index - 1].energy01 + 0.001, 'energy decays monotonically');
  assert.ok(report.trajectory[index].desireStrength01 <= report.trajectory[index - 1].desireStrength01 + 0.001, 'desire strength decays monotonically');
}

const launch = report.trajectory[0];
const rolling = report.trajectory.find((sample) => sample.phase === 'rolling');
const settled = report.trajectory.find((sample) => sample.phase === 'settled');
const recovered = report.trajectory.at(-1);
assert.ok(launch.velocity[0] > 1, 'launch inherits positive aim impulse');
assert.ok(launch.velocity[2] < -1, 'launch moves downhill into the hill');
assert.ok(rolling && rolling.angularVelocityRadPerSec > 5, 'rolling sample carries spin');
assert.ok(settled && settled.velocity.every((value) => Math.abs(value) < 0.01), 'settled goin stops linear motion');
assert.equal(recovered?.phase, 'recovered');
assert.equal(recovered?.desireRadius, 0);
assert.equal(recovered?.desireStrength01, 0);

assert.equal(report.frame.schema, 'lerms.first-vertical-frame.v0');
assert.equal(report.frame.source.authority, 'synthetic_fixture');
assert.equal(report.summary.goinStateCounts.rolling, 1);
assert.equal(report.summary.goinStateCounts.settled, 1);
assert.equal(report.summary.goinStateCounts.recovered, 1);
assert.equal(report.summary.rollingGoinCount, 1);
assert.equal(report.rerouteHints.length, 2);
assert.ok(report.rerouteHints[0].desireStrength > report.rerouteHints[1].desireStrength, 'nearer lerm gets stronger lure');
assert.equal(report.previewBenchPayload.payload.schema, 'lerms.glove-well-preview-bench-payload.v0');
assert.equal(report.previewBenchPayload.payload.throwPhysics?.schema, GLOVE_WELL_THROW_PHYSICS_WITNESS_SCHEMA);
assert.equal(report.previewBenchPayload.payload.throwPhysics?.bounceCount, 2);
assert.ok(report.previewBenchPayload.payload.downgrades.includes('throw_physics_fixture_input_not_live_wilor'));

assert.equal(report.whatRemainsFake.liveOperatorCameraSmoke, true);
assert.equal(report.whatRemainsFake.finalGoinMesh, true);
assert.equal(report.whatRemainsFake.fullFirstVerticalSuccess, true);

const cliPath = join(tmp, 'cli-throw-physics.json');
const cliRun = spawnSync(
  process.execPath,
  [
    '--experimental-strip-types',
    'src/glove-well-throw-physics-witness.ts',
    '--report',
    cliPath,
    '--frame-id',
    'glove-well-throw-physics-cli',
    '--timestamp-ms',
    '32100'
  ],
  { cwd: process.cwd(), encoding: 'utf8' }
);

assert.equal(cliRun.status, 0, cliRun.stderr || cliRun.stdout);
assert.equal(existsSync(cliPath), true);
const cliReport = JSON.parse(readFileSync(cliPath, 'utf8'));
assert.equal(cliReport.ok, true);
assert.equal(cliReport.trajectory.length, 7);
assert.equal(cliReport.previewBenchPayload.payload.throwPhysics.bounceCount, 2);

const stalePath = join(tmp, 'stale-throw-physics.json');
const staleRun = spawnSync(
  process.execPath,
  [
    '--experimental-strip-types',
    'src/glove-well-throw-physics-witness.ts',
    '--report',
    stalePath,
    '--sample-age-ms',
    '999',
    '--max-sample-age-ms',
    '100'
  ],
  { cwd: process.cwd(), encoding: 'utf8' }
);

assert.notEqual(staleRun.status, 0, 'stale throw physics source fails loudly');
const staleReport = JSON.parse(readFileSync(stalePath, 'utf8'));
assert.equal(staleReport.ok, false);
assert.equal(staleReport.phase, 'building-glove-well-throw-physics-witness');
assert.equal(staleReport.failureKind, 'throw-physics-source-stale');
assert.equal(staleReport.lastTrustworthyEvidence.sampleAgeMs, 999);
assert.equal(staleReport.lastTrustworthyEvidence.outputPath, stalePath);

console.log('glove well throw physics witness contracts passed');
