import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const root = process.cwd();
const tmp = mkdtempSync(join(tmpdir(), 'lerms-schnoz-sim-'));
const reportPath = join(tmp, 'schnoz-sim.json');
const imagePath = join(tmp, 'schnoz-sim.ppm');

const run = spawnSync(
  process.execPath,
  [
    '--experimental-strip-types',
    'src/schnoz-lerm-simulation-witness.ts',
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
assert.equal(report.schema, 'lerms.schnoz-lerm-simulation-witness.v0');
assert.equal(report.route, 'lerms/schnoz-lerm-simulation/witness-file');
assert.equal(report.reportPath, reportPath);
assert.equal(report.imagePath, imagePath);
assert.equal(report.proxyBody.identity, 'proxy_schnoz_sphere');
assert.equal(report.proxyBody.visualConceptStatus, 'blocked_waiting_for_wake_and_bake');
assert.equal(report.proxyBody.claimsFinalRedLermBody, false);
assert.equal(report.proxyBody.orientationCue, 'schnoz_nub');
assert.ok(report.proxyBody.allowedBecause.includes('simulation-spine-before-final-body'));

assert.equal(report.sourceTruthUpgrade.schema, 'lerms.first-vertical-source-truth-upgrade.v0');
assert.equal(report.sourceTruthUpgrade.accepted, true);
assert.equal(report.sourceTruthUpgrade.effectiveAuthority, 'live_simulation');
assert.deepEqual(report.sourceTruthUpgrade.blockers, []);
assert.equal(report.sourceTruthUpgrade.predicates.hasHitToDropChain, true);
assert.equal(report.sourceTruthUpgrade.predicates.hasLerm, true);
assert.equal(report.sourceTruthUpgrade.predicates.hasGoin, true);
assert.equal(report.sourceTruthUpgrade.predicates.hasJuiceHit, true);
assert.equal(report.sourceTruthUpgrade.predicates.hasCarrierDrop, true);

assert.equal(report.frame.schema, 'lerms.first-vertical-frame.v0');
assert.equal(report.frame.source.authority, 'live_simulation');
assert.equal(report.frame.source.backend, 'schnoz-sphere-deterministic-sim');
assert.equal(report.frame.lerms.length, 6);
assert.equal(report.frame.goins.length, 3);
assert.equal(report.frame.juiceHits.length, 1);
assert.equal(report.frame.carrierDropEvents.length, 1);

for (const packet of [
  ...report.frame.terrainSamples,
  ...report.frame.lerms,
  ...report.frame.goins,
  ...report.frame.juiceHits,
  ...report.frame.carrierDropEvents,
]) {
  assert.equal(packet.source.authority, 'live_simulation');
  assert.ok(packet.source.sampleAgeMs <= 32, `${packet.id} source is fresh`);
}

const hit = report.frame.juiceHits[0];
const drop = report.frame.carrierDropEvents[0];
const droppedGoin = report.frame.goins.find((goin) => goin.id === drop.goinId);
assert.equal(drop.cause, 'juice_hit');
assert.equal(drop.triggeringHitId, hit.id);
assert.equal(hit.targetKind, 'lerm');
assert.equal(hit.targetId, drop.lermId);
assert.ok(['dropped', 'rolling'].includes(droppedGoin.state));
assert.ok(drop.rerouteRadius > 1);

const states = new Set(report.frame.lerms.map((lerm) => lerm.state));
assert.ok(states.has('approaching_hoard'));
assert.ok(states.has('carrying_goin'));
assert.ok(states.has('fleeing_with_goin'));
assert.ok(states.has('hit_reacting'));
assert.ok(states.has('tumbling'));
assert.ok(states.has('rerouting_to_goin'));

assert.equal(report.timeline.length, 6);
assert.ok(report.timeline.some((frame) => frame.events.includes('goin-stolen')));
assert.ok(report.timeline.some((frame) => frame.events.includes('juice-hit-carrier')));
assert.ok(report.timeline.some((frame) => frame.events.includes('loose-goin-reroute')));

assert.ok(report.renderMetrics.nonBackgroundPixelCount > 20000, 'visual witness has visible content');
assert.ok(report.renderMetrics.lermPixelCount > 3000, 'visual witness draws schnoz lerms');
assert.ok(report.renderMetrics.goinPixelCount > 800, 'visual witness draws goins');
assert.ok(report.renderMetrics.hitPixelCount > 200, 'visual witness draws the hit flash');
assert.ok(report.renderMetrics.reroutePixelCount > 200, 'visual witness draws reroute pressure');

const ppm = readFileSync(imagePath);
assert.match(ppm.subarray(0, 64).toString('ascii'), /^P6\s+1280\s+720\s+255\s/);

console.log('schnoz lerm simulation witness tests passed');
