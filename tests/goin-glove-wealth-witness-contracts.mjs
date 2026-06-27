import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const tmp = mkdtempSync(join(tmpdir(), 'lerms-goin-witness-'));
const reportPath = join(tmp, 'goin-witness.json');

const okRun = spawnSync(
  process.execPath,
  [
    '--experimental-strip-types',
    'src/goin-glove-wealth-witness.ts',
    '--report',
    reportPath,
    '--frame-id',
    'goin-witness-test',
    '--timestamp-ms',
    '4200',
  ],
  { cwd: root, encoding: 'utf8' },
);

assert.equal(okRun.status, 0, okRun.stderr || okRun.stdout);

const report = JSON.parse(readFileSync(reportPath, 'utf8'));
assert.equal(report.ok, true);
assert.equal(report.schema, 'lerms.goin-glove-wealth-witness.v0');
assert.equal(report.route, 'lerms/goin-glove-wealth/witness-file');
assert.equal(report.outputPath, reportPath);
assert.equal(report.frame.schema, 'lerms.first-vertical-frame.v0');
assert.equal(report.frame.source.authority, 'live_simulation');
assert.equal(report.frame.source.route, 'lerms/goin-glove-wealth');
assert.equal(report.summary.goinCount, 6);
assert.equal(report.summary.carriedGoinCount, 1);
assert.equal(report.summary.rollingGoinCount, 1);
assert.equal(report.summary.carrierDropCount, 1);
assert.equal(report.summary.juiceHitCount, 1);
assert.equal(report.summary.goinStateCounts.hoarded, 1);
assert.equal(report.summary.goinStateCounts.carried, 1);
assert.equal(report.summary.goinStateCounts.dropped, 1);
assert.equal(report.summary.goinStateCounts.rolling, 1);
assert.equal(report.summary.goinStateCounts.settled, 1);
assert.equal(report.summary.goinStateCounts.recovered, 1);
assert.equal(report.sourceTruthEvaluation.accepted, true);
assert.equal(report.sourceTruthEvaluation.effectiveAuthority, 'live_simulation');
assert.deepEqual(report.sourceTruthEvaluation.blockers, []);

const states = new Map(report.frame.goins.map((goin) => [goin.state, goin]));
assert.equal(states.get('carried').carrierLermId, 'red-carrier-001');
assert.ok(states.get('dropped').velocity[2] < -0.2, 'dropped goin has downhill outgoing velocity');
assert.ok(states.get('rolling').velocity[2] < states.get('dropped').velocity[2], 'rolling goin accelerates downhill');
assert.ok(states.get('settled').desireRadius > 0.5, 'settled goin still has local desire');
assert.equal(states.get('recovered').desireRadius, 0, 'recovered goin no longer lures the swarm');

assert.equal(report.carrierDropChain.hitId, 'index-hit-carrier-001');
assert.equal(report.carrierDropChain.dropId, 'carrier-drop-goin-001');
assert.equal(report.carrierDropChain.lermId, 'red-carrier-001');
assert.equal(report.carrierDropChain.goinId, 'goin-001');
assert.equal(report.carrierDropChain.rollingGoinId, 'goin-001');

assert.ok(report.rerouteHints.length >= 2, 'nearby lerms get desire hints');
for (const hint of report.rerouteHints) {
  assert.equal(hint.schema, 'lerms.goin-reroute-hint.v0');
  assert.equal(hint.targetGoinId, 'goin-001');
  assert.ok(hint.desireStrength > 0 && hint.desireStrength <= 1, 'desire strength is normalized');
  assert.ok(hint.distanceToGoin <= hint.rerouteRadius, 'hint stays inside reroute radius');
}

assert.equal(report.evidenceAuthority.terrain, 'live_simulation');
assert.equal(report.evidenceAuthority.goins, 'live_simulation');
assert.equal(report.evidenceAuthority.lerms, 'live_simulation');
assert.equal(report.evidenceAuthority.juiceHits, 'live_simulation');
assert.equal(report.evidenceAuthority.carrierDrops, 'live_simulation');
assert.equal(report.whatRemainsFake.finalTreasureEconomy, true);
assert.equal(report.whatRemainsFake.fullCrowdAi, true);
assert.equal(report.whatRemainsFake.finalArt, true);

const stalePath = join(tmp, 'stale-goin-witness.json');
const staleRun = spawnSync(
  process.execPath,
  [
    '--experimental-strip-types',
    'src/goin-glove-wealth-witness.ts',
    '--report',
    stalePath,
    '--sample-age-ms',
    '999',
    '--max-sample-age-ms',
    '100',
  ],
  { cwd: root, encoding: 'utf8' },
);

assert.notEqual(staleRun.status, 0, 'stale goin source should fail the witness CLI');
const staleReport = JSON.parse(readFileSync(stalePath, 'utf8'));
assert.equal(staleReport.ok, false);
assert.equal(staleReport.phase, 'building-goin-glove-wealth-frame');
assert.equal(staleReport.failureKind, 'source-truth-upgrade-blocked');
assert.ok(staleReport.sourceTruthEvaluation.blockers.includes('stale-frame-source'));
assert.equal(staleReport.lastTrustworthyEvidence.outputPath, stalePath);
assert.equal(staleReport.lastTrustworthyEvidence.sampleAgeMs, 999);
assert.equal(staleReport.lastTrustworthyEvidence.maxSampleAgeMs, 100);

console.log('goin glove wealth witness contracts passed');
