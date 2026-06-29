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
  buildGoinEcologyMergeWitnessReport,
  GOIN_ECOLOGY_MERGE_WITNESS_ROUTE,
  GOIN_ECOLOGY_MERGE_WITNESS_SCHEMA
} from '../src/goin-ecology-merge-witness.ts';

const report = buildGoinEcologyMergeWitnessReport({
  outputPath: '/tmp/lerms-goin-ecology-merge-test.json',
  frameId: 'goin-ecology-merge-test',
  timestampMs: 52_000
});

assert.equal(report.ok, true);
assert.equal(report.schema, GOIN_ECOLOGY_MERGE_WITNESS_SCHEMA);
assert.equal(report.route, GOIN_ECOLOGY_MERGE_WITNESS_ROUTE);
assert.equal(report.frame.schema, 'lerms.first-vertical-frame.v0');
assert.equal(report.summary.carrierDropCount, 1);
assert.equal(report.summary.juiceHitCount, 1);
assert.ok(report.summary.goinCount >= 6);
assert.equal(report.sourceTruthEvaluation.accepted, false);
assert.ok(report.sourceTruthEvaluation.blockers.includes('source-authority-not-live'));
assert.ok(report.sourceTruth.downgrades.includes('saved_or_fixture_throw_transport_not_full_vertical_truth'));

assert.equal(report.carrierDropChain.hitId, 'index-hit-carrier-001');
assert.equal(report.carrierDropChain.dropId, 'carrier-drop-goin-001');
assert.equal(report.carrierDropChain.droppedGoinId, 'goin-001');
assert.equal(report.carrierDropChain.postDropGoinState, 'rolling');
assert.equal(report.throwChain.releaseEventId.length > 0, true);
assert.equal(report.throwChain.rollingGoinId, 'throw-physics-goin-rolling-001');
assert.equal(report.throwChain.phaseTrace, 'launch>flight>bounce>rolling>bounce>settled>recovered');
assert.equal(report.throwChain.bounceCount, 2);

const droppedRolling = report.frame.goins.find((goin) => goin.id === report.carrierDropChain.droppedGoinId);
const thrownRolling = report.frame.goins.find((goin) => goin.id === report.throwChain.rollingGoinId);
assert.equal(droppedRolling?.state, 'rolling');
assert.equal(thrownRolling?.state, 'rolling');
assert.ok((droppedRolling?.desireRadius ?? 0) > (thrownRolling?.desireRadius ?? Number.POSITIVE_INFINITY));

const hintsByTarget = new Map<string, number>();
for (const hint of report.sharedDesireHints) {
  hintsByTarget.set(hint.targetGoinId, (hintsByTarget.get(hint.targetGoinId) ?? 0) + 1);
  assert.equal(hint.chosenTargetGoinId, hint.targetGoinId);
  assert.ok(hint.desireStrength > 0);
  assert.ok(hint.distanceToGoin > 0);
}
assert.ok((hintsByTarget.get('goin-001') ?? 0) >= 2);
assert.ok((hintsByTarget.get('throw-physics-goin-rolling-001') ?? 0) >= 2);

const lermTargets = new Set(report.frame.lerms.map((lerm) => lerm.targetGoinId).filter(Boolean));
assert.equal(lermTargets.has('goin-001'), true);
assert.equal(lermTargets.has('throw-physics-goin-rolling-001'), true);

const tmp = mkdtempSync(join(tmpdir(), 'lerms-goin-ecology-merge-'));
const reportPath = join(tmp, 'merge.json');
const cliRun = spawnSync(
  process.execPath,
  [
    '--experimental-strip-types',
    'src/goin-ecology-merge-witness.ts',
    '--report',
    reportPath,
    '--frame-id',
    'goin-ecology-merge-cli',
    '--timestamp-ms',
    '53000'
  ],
  { cwd: process.cwd(), encoding: 'utf8' }
);

assert.equal(cliRun.status, 0, cliRun.stderr || cliRun.stdout);
assert.equal(existsSync(reportPath), true);
const cliReport = JSON.parse(readFileSync(reportPath, 'utf8'));
assert.equal(cliReport.ok, true);
assert.equal(cliReport.sharedDesireHints.length, report.sharedDesireHints.length);
assert.equal(cliReport.throwChain.bounceCount, 2);

console.log('goin ecology merge witness contracts passed');
