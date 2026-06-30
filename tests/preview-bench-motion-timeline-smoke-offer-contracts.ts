import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

import {
  buildPreviewBenchActorTimelineSmokeOfferReport,
  KAMINOS_FORGE_HOST_SMOKE_OFFER_SCHEMA,
  KAMINOS_PREVIEW_BENCH_SMOKE_OFFER_ROUTE,
  LERMS_ACTOR_TIMELINE_PREVIEW_BENCH_PAYLOAD_SCHEMA,
} from '../src/preview-bench-motion-timeline-smoke-offer.ts';

const report = buildPreviewBenchActorTimelineSmokeOfferReport({
  outputPath: '/tmp/lerms-preview-bench-motion-timeline-smoke-offer-test.json',
  sourceRef: '/tmp/lerms-preview-bench-motion-timeline-0628.json',
  sourceCommit: 'e46f8fa',
  frameId: 'actor-timeline-smoke-offer-test',
  timestampMs: 76_000,
  generatedAt: '2026-06-29T22:00:00.000Z',
  observedAt: '2026-06-29T22:00:01.000Z',
});

assert.equal(report.ok, true);
assert.equal(report.schema, KAMINOS_FORGE_HOST_SMOKE_OFFER_SCHEMA);
assert.equal(report.route, KAMINOS_PREVIEW_BENCH_SMOKE_OFFER_ROUTE);
assert.equal(report.producerDiaulos, 'lerm-horde-fucker');
assert.equal(report.source.authority, 'fixture');
assert.equal(report.source.sourceTruthAuthority, 'synthetic_fixture');
assert.equal(report.source.route, 'lerms/preview-bench/actor-motion-timeline-file');
assert.equal(report.source.sourceRef, '/tmp/lerms-preview-bench-motion-timeline-0628.json');
assert.equal(report.source.commit, 'e46f8fa');
assert.equal(report.freshness.budgetMs, 86_400_000);
assert.equal(report.freshness.status, 'fresh-fixture');
assert.equal(report.acceptanceSurface.id, 'preview-bench-smoke-offer-contract');
assert.equal(report.acceptanceSurface.worldChamberId, 'lerms-underhill');
assert.equal(report.acceptanceSurface.posture, 'inspect');
assert.equal(report.acceptanceSurface.bench, 'terrain-preview');
assert.equal(report.targetSurface.station, 'red-lerm-actor-timeline');
assert.equal(report.offers.length, 1);

const offer = report.offers[0];
assert.equal(offer.id, 'lerm-horde-actor-motion-timeline');
assert.equal(offer.schema, 'lerms.preview-bench-actor-motion-timeline.v0');
assert.equal(offer.route, 'lerms/preview-bench/actor-motion-timeline-file');
assert.equal(offer.payloadSchema, LERMS_ACTOR_TIMELINE_PREVIEW_BENCH_PAYLOAD_SCHEMA);
assert.equal(offer.summary.frameCount, 8);
assert.equal(offer.summary.actorCount, 6);
assert.equal(offer.summary.possessionEventCount, 6);
assert.equal(offer.summary.contestedClaimantCount, 2);
assert.equal(offer.summary.contestedGoinId, 'goin-dropped-001');
assert.ok(offer.fields.some((field) => field.label === 'duration ms' && field.value === 8200));
assert.ok(offer.fields.some((field) => field.label === 'actor states' && String(field.value).includes('rerouting_to_goin')));
assert.ok(offer.fields.some((field) => field.label === 'contest winner' && field.value === 'red-lerm-001'));
assert.ok(offer.fields.some((field) => field.label === 'contest loser' && String(field.value).includes('red-lerm-006')));
assert.ok(offer.downgrades.includes('timevarying_payload_not_live_socket_stream'));
assert.ok(offer.downgrades.includes('forge_host_smoke_offer_is_not_source_authority'));
assert.ok(offer.rejectedDebugSurfaces.some((surface) => surface.id === 'browser/?schnoz_3d=1'));
assert.ok(offer.benchHints.objectMarkers.length >= 6);
assert.ok(offer.benchHints.objectMarkers.some((marker) => marker.kind === 'carrier_actor'));
assert.ok(offer.benchHints.objectMarkers.some((marker) => marker.kind === 'carried_goin'));
assert.ok(offer.benchHints.objectMarkers.some((marker) => marker.kind === 'reroute_target'));
assert.equal(offer.benchHints.activityReadoutStyle, 'partial-ground-ring');
assert.ok(offer.benchHints.objectMarkers.some((marker) => marker.kind === 'activity_lure_claim' && marker.label.includes('CLAIM red-lerm-001')));
assert.ok(offer.benchHints.objectMarkers.some((marker) => marker.kind === 'activity_lure_contest' && marker.label.includes('CONTEST')));
assert.ok(offer.benchHints.objectMarkers.some((marker) => marker.kind === 'activity_lure_winner' && marker.label.includes('WIN red-lerm-001')));
assert.ok(offer.benchHints.objectMarkers.some((marker) => marker.kind === 'activity_reroute_loser' && marker.label.includes('REROUTE red-lerm-006')));
const markerWorldKeys = offer.benchHints.objectMarkers.map((marker) => marker.world.join(':'));
assert.ok(new Set(markerWorldKeys).size < markerWorldKeys.length, 'carried/drop actor and goin markers should preserve coincident source coordinates for Kaminos fan-out');
assert.equal(offer.payloadReport.schema, 'kaminos.preview-bench.payload-report.v0');
assert.equal(offer.payloadReport.payload.schema, LERMS_ACTOR_TIMELINE_PREVIEW_BENCH_PAYLOAD_SCHEMA);
assert.equal(offer.payloadReport.payload.source.authority, 'fixture');
assert.equal(offer.payloadReport.payload.source.sourceTruthAuthority, 'synthetic_fixture');
assert.equal(offer.payloadReport.payload.summary.frameCount, 8);
assert.equal(offer.payloadReport.payload.summary.actorCount, 6);
assert.equal(offer.payloadReport.payload.summary.possessionEventCount, 6);
assert.equal(offer.payloadReport.payload.summary.contestedClaimantCount, 2);
assert.equal(offer.payloadReport.payload.sourceReports.actorMotionTimeline.timeline.behaviorLedger.decision.winnerActorId, 'red-lerm-001');
assert.equal(offer.payloadReport.payload.sourceReports.actorMotionTimeline.schema, 'lerms.preview-bench-actor-motion-timeline-report.v0');
assert.equal(report.whatRemainsFake.fullFirstVerticalSuccess, true);
assert.equal(report.whatRemainsFake.finalLermBodyAnimation, true);

const withoutCommit = buildPreviewBenchActorTimelineSmokeOfferReport({
  outputPath: '/tmp/lerms-preview-bench-motion-timeline-smoke-offer-test-no-commit.json',
  sourceRef: '/tmp/lerms-preview-bench-motion-timeline-0628.json',
});
assert.equal(withoutCommit.source.commit, 'unrecorded-source-commit');
assert.ok(withoutCommit.downgrades.includes('missing_git_source_commit_downgrades_offer'));

const tmp = mkdtempSync(join(tmpdir(), 'lerms-preview-bench-timeline-smoke-offer-'));
const reportPath = join(tmp, 'smoke-offer.json');
const cliRun = spawnSync(
  process.execPath,
  [
    '--experimental-strip-types',
    'src/preview-bench-motion-timeline-smoke-offer.ts',
    '--report',
    reportPath,
    '--source-ref',
    '/tmp/lerms-preview-bench-motion-timeline-0628.json',
    '--source-commit',
    'e46f8fa',
    '--frame-id',
    'actor-timeline-smoke-offer-cli',
    '--timestamp-ms',
    '77000',
    '--generated-at',
    '2026-06-29T22:01:00.000Z',
    '--observed-at',
    '2026-06-29T22:01:01.000Z',
  ],
  { cwd: process.cwd(), encoding: 'utf8' },
);

assert.equal(cliRun.status, 0, cliRun.stderr || cliRun.stdout);
assert.equal(existsSync(reportPath), true);
const cliReport = JSON.parse(readFileSync(reportPath, 'utf8'));
assert.equal(cliReport.ok, true);
assert.equal(cliReport.offers[0].source.commit, 'e46f8fa');
assert.equal(cliReport.offers[0].payloadReport.payload.summary.possessionEventCount, 6);

const failurePath = join(tmp, 'failure.json');
const failureRun = spawnSync(
  process.execPath,
  [
    '--experimental-strip-types',
    'src/preview-bench-motion-timeline-smoke-offer.ts',
    '--report',
    failurePath,
  ],
  { cwd: process.cwd(), encoding: 'utf8' },
);
assert.equal(failureRun.status, 1);
const failureReport = JSON.parse(readFileSync(failurePath, 'utf8'));
assert.equal(failureReport.ok, false);
assert.equal(failureReport.phase, 'building-preview-bench-actor-timeline-smoke-offer');
assert.match(failureReport.error, /source-ref/);

console.log('preview bench motion timeline smoke offer contracts passed');
