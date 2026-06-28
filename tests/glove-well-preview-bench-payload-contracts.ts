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
  buildGloveWellPreviewBenchPayloadReport,
  KAMINOS_PREVIEW_BENCH_PAYLOAD_REPORT_ROUTE,
  KAMINOS_PREVIEW_BENCH_PAYLOAD_REPORT_SCHEMA,
  LERMS_GLOVE_WELL_PREVIEW_BENCH_PAYLOAD_ROUTE,
  LERMS_GLOVE_WELL_PREVIEW_BENCH_PAYLOAD_SCHEMA
} from '../src/glove-well-preview-bench-payload.ts';

const tmp = mkdtempSync(join(tmpdir(), 'lerms-glove-well-preview-bench-'));
const outputPath = join(tmp, 'preview-bench-payload.json');

const report = buildGloveWellPreviewBenchPayloadReport({
  outputPath,
  frameId: 'glove-well-preview-bench-test',
  timestampMs: 28_000
});

assert.equal(report.ok, true);
assert.equal(report.schema, KAMINOS_PREVIEW_BENCH_PAYLOAD_REPORT_SCHEMA);
assert.equal(report.route, KAMINOS_PREVIEW_BENCH_PAYLOAD_REPORT_ROUTE);
assert.equal(report.outputPath, outputPath);
assert.equal(report.reportPath, outputPath);
assert.equal(report.payload.schema, LERMS_GLOVE_WELL_PREVIEW_BENCH_PAYLOAD_SCHEMA);
assert.equal(report.payload.route, LERMS_GLOVE_WELL_PREVIEW_BENCH_PAYLOAD_ROUTE);
assert.equal(report.payload.label, 'Greedy Glove Well / goin payload');
assert.equal(report.payload.acceptanceSurface.kind, 'kaminos_preview_bench_payload');
assert.equal(report.payload.acceptanceSurface.worldChamberId, 'lerms-underhill');
assert.equal(report.payload.acceptanceSurface.posture, 'inspect');
assert.equal(report.payload.acceptanceSurface.bench, 'terrain-preview');
assert.equal(report.payload.acceptanceSurface.routeQuery, 'world_chamber=lerms-underhill&posture=inspect&bench=terrain-preview');
assert.equal(report.payload.acceptanceSurface.expectedHost, 'kaminos_workbench_kiln_preview_bench');
assert.equal(report.payload.source.authority, 'synthetic_fixture');
assert.equal(report.payload.source.route, LERMS_GLOVE_WELL_PREVIEW_BENCH_PAYLOAD_ROUTE);
assert.equal(report.payload.source.requestedRoute, 'kaminos/preview-bench/payload-file');
assert.equal(report.payload.source.effectiveRoute, 'kaminos/preview-bench/payload-file');
assert.equal(report.payload.source.backend, 'lerms-greedy-glove-preview-bench-exporter');
assert.equal(report.payload.source.configId, 'greedy-glove-preview-bench-payload-v0');
assert.equal(report.payload.source.fallbackReason, null);
assert.ok(report.payload.source.sampleAgeMs <= 500, 'payload source records fresh fixture age');

assert.deepEqual(report.payload.sourceTruth.sourceSchemas.sort(), [
  'lerms.goin-glove-wealth-witness.v0',
  'lerms.glove-well-launch-witness.v0'
].sort());
assert.ok(report.payload.sourceTruth.sourceRoutes.includes('lerms/glove-well-launch'));
assert.ok(report.payload.sourceTruth.sourceRoutes.includes('lerms/goin-glove-wealth/witness-file'));
assert.equal(report.payload.sourceTruth.effectiveAuthority, 'synthetic_fixture');
assert.equal(report.payload.sourceTruth.fixtureInputDowngrade, true);
assert.equal(report.payload.sourceTruth.goinObjecthoodAuthority, 'live_simulation');
assert.equal(report.payload.sourceTruth.gloveWellLaunchAuthority, 'synthetic_fixture');
assert.equal(report.payload.summary.authority, 'synthetic_fixture');
assert.equal(report.payload.summary.goinCount, 6);
assert.ok(report.payload.fields.some((field) => field.label === 'Glove Well phases' && field.value === 'idle>priming>aiming>released'));

assert.ok(report.payload.downgrades.includes('fixture_glove_input_not_live_wilor'));
assert.ok(report.payload.downgrades.includes('preview_bench_transport_not_source_authority'));
assert.ok(report.payload.downgrades.includes('no_operator_camera_sidecar_manager'));
assert.ok(report.payload.downgrades.includes('no_glove_well_carrier_drop_juice_hit_merge'));
assert.ok(report.payload.rejectedSurfaces.includes('browser/?greedy_glove=1'));
assert.ok(report.payload.rejectedSurfaces.includes('kaminos.preview-bench route is display transport only'));

assert.equal(report.payload.custody.sourceDiaulos, 'greedy-glove-fucker');
assert.equal(report.payload.custody.hostDiaulos, 'gutterglass-pornographer');
assert.equal(report.payload.custody.sourceOwns.includes('goin/Glove Well domain truth'), true);
assert.equal(report.payload.custody.greedyOwns.includes('goin physics/custody law'), true);
assert.equal(report.payload.custody.kaminosOwns.includes('Preview Bench host rendering'), true);

assert.equal(report.payload.gloveWell.phaseTrace, 'idle>priming>aiming>released');
assert.ok(report.payload.gloveWell.releaseEventId.includes('glove-well-release-'));
assert.equal(report.payload.gloveWell.depthPolicy, 'non_load_bearing');
assert.equal(report.payload.gloveWell.arcSampleCount, 7);
assert.equal(report.payload.gloveWell.launchedGoinId, 'glove-well-launched-goin-001');

assert.equal(report.payload.goinObjecthood.goinCount, 6);
assert.equal(report.payload.goinObjecthood.rollingGoinCount, 1);
assert.equal(report.payload.goinObjecthood.carrierDropChain.hitId, 'index-hit-carrier-001');
assert.equal(report.payload.goinObjecthood.carrierDropChain.dropId, 'carrier-drop-goin-001');
assert.equal(report.payload.goinObjecthood.carrierDropChain.postDropGoinState, 'rolling');
assert.ok(report.payload.goinObjecthood.rerouteHintCount >= 2);

assert.equal(report.payload.benchHints.focusKind, 'glove_well_goin');
assert.ok(report.payload.benchHints.objectMarkers.some((marker) => marker.kind === 'rolling_goin' && marker.authority === 'live_simulation'));
assert.ok(report.payload.benchHints.objectMarkers.some((marker) => marker.kind === 'glove_well_launch' && marker.authority === 'synthetic_fixture'));
assert.ok(report.payload.benchHints.routeBadges.includes('fixture input'));
assert.ok(report.payload.benchHints.routeBadges.includes('source truth downgraded'));

assert.equal(report.payload.whatRemainsFake.liveOperatorCameraSmoke, true);
assert.equal(report.payload.whatRemainsFake.finalGoinMesh, true);
assert.equal(report.payload.whatRemainsFake.fullFirstVerticalSuccess, true);

const cliPath = join(tmp, 'cli-preview-bench-payload.json');
const cliRun = spawnSync(
  process.execPath,
  [
    '--experimental-strip-types',
    'src/glove-well-preview-bench-payload.ts',
    '--report',
    cliPath,
    '--frame-id',
    'glove-well-preview-bench-cli-test',
    '--timestamp-ms',
    '28100'
  ],
  { cwd: process.cwd(), encoding: 'utf8' }
);

assert.equal(cliRun.status, 0, cliRun.stderr || cliRun.stdout);
assert.equal(existsSync(cliPath), true, 'CLI writes Preview Bench payload report');
const cliReport = JSON.parse(readFileSync(cliPath, 'utf8'));
assert.equal(cliReport.ok, true);
assert.equal(cliReport.payload.schema, LERMS_GLOVE_WELL_PREVIEW_BENCH_PAYLOAD_SCHEMA);
assert.equal(cliReport.payload.gloveWell.phaseTrace, 'idle>priming>aiming>released');

const badRun = spawnSync(
  process.execPath,
  [
    '--experimental-strip-types',
    'src/glove-well-preview-bench-payload.ts',
    '--report',
    join(tmp, 'bad-preview-bench-payload.json'),
    '--timestamp-ms',
    'not-a-number'
  ],
  { cwd: process.cwd(), encoding: 'utf8' }
);

assert.notEqual(badRun.status, 0, 'invalid CLI args fail');

console.log('glove well Preview Bench payload contracts passed');
