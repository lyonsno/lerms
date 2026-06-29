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
  buildGloveWealthCustodyWitnessReport,
  GLOVE_WEALTH_CUSTODY_WITNESS_ROUTE,
  GLOVE_WEALTH_CUSTODY_WITNESS_SCHEMA
} from '../src/glove-wealth-custody-witness.ts';

const report = buildGloveWealthCustodyWitnessReport({
  outputPath: '/tmp/lerms-glove-wealth-custody-test.json',
  frameId: 'glove-wealth-custody-test',
  timestampMs: 72_000
});

assert.equal(report.ok, true);
assert.equal(report.schema, GLOVE_WEALTH_CUSTODY_WITNESS_SCHEMA);
assert.equal(report.route, GLOVE_WEALTH_CUSTODY_WITNESS_ROUTE);
assert.equal(report.sourceTruth.effectiveAuthority, 'synthetic_fixture');
assert.equal(report.sourceTruth.deterministicCustodyAuthority, 'live_simulation');
assert.equal(report.sourceTruth.evaluatorAccepted, false);
assert.ok(report.sourceTruth.blockers.includes('source-authority-not-live'));
assert.ok(report.sourceTruth.downgrades.includes('custody_lineage_composed_from_fixture_merge'));
assert.ok(report.sourceTruth.downgrades.includes('not_final_treasure_economy'));

assert.equal(report.gloveWell.id, 'glove-well-crown');
assert.equal(report.gloveWell.schema, 'lerms.glove-well-state.v0');
assert.equal(report.gloveWell.authority, 'synthetic_fixture');
assert.equal(report.gloveWell.primordialWealthFragmentIds.length, 2);

assert.equal(report.fragments.length, 5);
for (const fragment of report.fragments) {
  assert.equal(fragment.schema, 'lerms.glove-wealth-fragment.v0');
  assert.equal(fragment.originWellId, 'glove-well-crown');
  assert.equal(fragment.lineageId.length > 0, true);
  assert.ok(fragment.desireMass > 0);
  assert.ok(fragment.sourceRefs.some((ref) => ref.schema === 'lerms.goin-ecology-merge-witness.v0'));
}

const fragmentsByState = new Map(report.fragments.map((fragment) => [fragment.custodyState, fragment]));
assert.equal(fragmentsByState.get('hoarded')?.goinId, 'goin-hoard-001');
assert.equal(fragmentsByState.get('stolen_carried')?.holderId, 'red-carrier-001');
assert.equal(fragmentsByState.get('dropped_rolling')?.goinId, 'goin-001');
assert.equal(fragmentsByState.get('thrown_sacrifice_rolling')?.goinId, 'throw-physics-goin-rolling-001');
assert.equal(fragmentsByState.get('recovered_to_well')?.holderId, 'glove-well-crown');

assert.equal(report.custodyEvents.length, 7);
const eventKinds = report.custodyEvents.map((event) => event.kind);
assert.deepEqual(eventKinds, [
  'hoard_indexed',
  'lerm_theft',
  'carrier_hit_drop',
  'loose_rolling_desire',
  'glove_well_sacrifice_release',
  'thrown_rolling_desire',
  'recovered_to_well'
]);

const theft = report.custodyEvents.find((event) => event.kind === 'lerm_theft');
assert.equal(theft?.fromHolderId, 'glove-well-crown');
assert.equal(theft?.toHolderId, 'red-carrier-001');
assert.equal(theft?.goinId, 'goin-carried-001');

const drop = report.custodyEvents.find((event) => event.kind === 'carrier_hit_drop');
assert.equal(drop?.goinId, 'goin-001');
assert.equal(drop?.cause.refId, 'index-hit-carrier-001');
assert.equal(drop?.cause.kind, 'juice_hit');

const throwEvent = report.custodyEvents.find((event) => event.kind === 'glove_well_sacrifice_release');
assert.equal(throwEvent?.fromHolderId, 'glove-well-crown');
assert.equal(throwEvent?.toHolderId, 'loose-terrain');
assert.equal(throwEvent?.goinId, 'throw-physics-goin-rolling-001');
assert.equal(throwEvent?.cause.kind, 'glove_well_release');

assert.equal(report.custodySummary.sourceFragmentCount, 2);
assert.equal(report.custodySummary.activeLooseGoinCount, 2);
assert.equal(report.custodySummary.lineageContinuityOk, true);
assert.equal(report.custodySummary.noFinalEconomyUnits, true);
assert.equal(report.custodySummary.byHolder['glove-well-crown'], 2);
assert.equal(report.custodySummary.byHolder['loose-terrain'], 2);
assert.equal(report.custodySummary.byHolder['red-carrier-001'], 1);
assert.ok(report.custodySummary.totalDesireMass > report.custodySummary.looseDesireMass);
assert.equal(report.custodySummary.looseDesireWellCount, 2);

assert.equal(report.sourceReports.goinEcologyMerge.schema, 'lerms.goin-ecology-merge-witness.v0');
assert.equal(report.sourceReports.goinEcologyMerge.sharedDesireHints.length, 4);
assert.equal(report.whatRemainsFake.finalTreasureEconomy, true);
assert.equal(report.whatRemainsFake.finalGoinMesh, true);
assert.equal(report.whatRemainsFake.fullFirstVerticalSuccess, true);

const tmp = mkdtempSync(join(tmpdir(), 'lerms-glove-wealth-custody-'));
const reportPath = join(tmp, 'custody.json');
const cliRun = spawnSync(
  process.execPath,
  [
    '--experimental-strip-types',
    'src/glove-wealth-custody-witness.ts',
    '--report',
    reportPath,
    '--frame-id',
    'glove-wealth-custody-cli',
    '--timestamp-ms',
    '73000'
  ],
  { cwd: process.cwd(), encoding: 'utf8' }
);

assert.equal(cliRun.status, 0, cliRun.stderr || cliRun.stdout);
assert.equal(existsSync(reportPath), true);
const cliReport = JSON.parse(readFileSync(reportPath, 'utf8'));
assert.equal(cliReport.ok, true);
assert.equal(cliReport.custodySummary.lineageContinuityOk, true);
assert.equal(cliReport.custodyEvents.length, 7);

const stalePath = join(tmp, 'stale-custody.json');
const staleRun = spawnSync(
  process.execPath,
  [
    '--experimental-strip-types',
    'src/glove-wealth-custody-witness.ts',
    '--report',
    stalePath,
    '--sample-age-ms',
    '999',
    '--max-sample-age-ms',
    '100'
  ],
  { cwd: process.cwd(), encoding: 'utf8' }
);

assert.notEqual(staleRun.status, 0, 'stale custody evidence should fail loudly');
const staleReport = JSON.parse(readFileSync(stalePath, 'utf8'));
assert.equal(staleReport.ok, false);
assert.equal(staleReport.schema, GLOVE_WEALTH_CUSTODY_WITNESS_SCHEMA);
assert.equal(staleReport.phase, 'building-glove-wealth-custody-witness');
assert.equal(staleReport.failureKind, 'stale-custody-source');
assert.equal(staleReport.lastTrustworthyEvidence.outputPath, stalePath);
assert.equal(staleReport.lastTrustworthyEvidence.sampleAgeMs, 999);
assert.equal(staleReport.lastTrustworthyEvidence.maxSampleAgeMs, 100);

console.log('glove wealth custody witness contracts passed');
