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
  buildGoinEcologySmokeOfferReport,
  KAMINOS_FORGE_HOST_SMOKE_OFFER_SCHEMA,
  KAMINOS_PREVIEW_BENCH_SMOKE_OFFER_ROUTE
} from '../src/goin-ecology-smoke-offer.ts';

const report = buildGoinEcologySmokeOfferReport({
  outputPath: '/tmp/lerms-goin-ecology-smoke-offer-test.json',
  sourceRef: '/tmp/lerms-goin-ecology-merge-witness-0629.json',
  sourceCommit: 'eea6e4e09a875bb4177a7f2406780d923c3f3de9',
  frameId: 'goin-ecology-smoke-offer-test',
  timestampMs: 64_000,
  generatedAt: '2026-06-29T04:40:00.000Z',
  observedAt: '2026-06-29T04:40:01.000Z'
});

assert.equal(report.ok, true);
assert.equal(report.schema, KAMINOS_FORGE_HOST_SMOKE_OFFER_SCHEMA);
assert.equal(report.route, KAMINOS_PREVIEW_BENCH_SMOKE_OFFER_ROUTE);
assert.equal(report.producerDiaulos, 'greedy-glove-fucker');
assert.equal(report.source.authority, 'fixture');
assert.equal(report.source.sourceTruthAuthority, 'synthetic_fixture');
assert.equal(report.source.sourceRef, '/tmp/lerms-goin-ecology-merge-witness-0629.json');
assert.equal(report.source.commit, 'eea6e4e09a875bb4177a7f2406780d923c3f3de9');
assert.equal(report.freshness.budgetMs, 86_400_000);
assert.equal(report.freshness.status, 'fresh-fixture');
assert.equal(report.acceptanceSurface.id, 'preview-bench-smoke-offer-contract');
assert.equal(report.targetSurface.worldChamberId, 'lerms-underhill');
assert.equal(report.offers.length, 1);

const offer = report.offers[0];
assert.equal(offer.id, 'greedy-goin-ecology-merge');
assert.equal(offer.schema, 'lerms.goin-ecology-merge-witness.v0');
assert.equal(offer.route, 'lerms/goin-ecology-merge/witness-file');
assert.equal(offer.payloadSchema, 'lerms.goin-ecology-preview-bench-payload.v0');
assert.equal(offer.source.sourceRef, '/tmp/lerms-goin-ecology-merge-witness-0629.json');
assert.equal(offer.source.authority, 'fixture');
assert.ok(offer.downgrades.includes('merged_frame_not_full_vertical_acceptance'));
assert.ok(offer.downgrades.includes('operator_camera_sidecar_not_witnessed'));
assert.ok(offer.rejectedDebugSurfaces.some((surface) => surface.id === 'browser/?greedy_glove=1'));
assert.ok(offer.fields.some((field) => field.label === 'rolling goins' && field.value === 2));
assert.ok(offer.fields.some((field) => field.label === 'desire hints' && field.value === 4));
assert.equal(offer.payloadReport.schema, 'kaminos.preview-bench.payload-report.v0');
assert.equal(offer.payloadReport.payload.schema, 'lerms.goin-ecology-preview-bench-payload.v0');
assert.equal(offer.payloadReport.payload.source.authority, 'fixture');
assert.equal(offer.payloadReport.payload.source.sourceTruthAuthority, 'synthetic_fixture');
assert.equal(offer.payloadReport.payload.summary.rollingGoinCount, 2);
assert.equal(offer.payloadReport.payload.summary.sharedDesireHintCount, 4);
assert.equal(offer.payloadReport.payload.sourceReports.goinEcologyMerge.schema, 'lerms.goin-ecology-merge-witness.v0');
assert.equal(report.whatRemainsFake.fullFirstVerticalSuccess, true);

const tmp = mkdtempSync(join(tmpdir(), 'lerms-goin-ecology-smoke-offer-'));
const reportPath = join(tmp, 'smoke-offer.json');
const cliRun = spawnSync(
  process.execPath,
  [
    '--experimental-strip-types',
    'src/goin-ecology-smoke-offer.ts',
    '--report',
    reportPath,
    '--source-ref',
    '/tmp/lerms-goin-ecology-merge-witness-0629.json',
    '--source-commit',
    'eea6e4e09a875bb4177a7f2406780d923c3f3de9',
    '--frame-id',
    'goin-ecology-smoke-offer-cli',
    '--timestamp-ms',
    '65000',
    '--generated-at',
    '2026-06-29T04:41:00.000Z',
    '--observed-at',
    '2026-06-29T04:41:01.000Z'
  ],
  { cwd: process.cwd(), encoding: 'utf8' }
);

assert.equal(cliRun.status, 0, cliRun.stderr || cliRun.stdout);
assert.equal(existsSync(reportPath), true);
const cliReport = JSON.parse(readFileSync(reportPath, 'utf8'));
assert.equal(cliReport.ok, true);
assert.equal(cliReport.offers[0].payloadReport.payload.summary.sharedDesireHintCount, 4);
assert.equal(cliReport.offers[0].source.commit, 'eea6e4e09a875bb4177a7f2406780d923c3f3de9');

console.log('goin ecology smoke offer contracts passed');
