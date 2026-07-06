import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

import {
  GLOVE_WELL_SMOKE_BENCH_OFFER_ROUTE,
  GLOVE_WELL_SMOKE_BENCH_OFFER_SCHEMA,
  buildFixtureGloveWellSmokeBenchOffer,
  buildGloveWellSmokeBenchOffer,
  runGloveWellSmokeBenchOfferCli
} from '../src/glove-well-smoke-bench-offer.ts';
import { buildFixtureGloveWellHostPacket } from '../src/glove-well-host-packet.ts';

assert.equal(GLOVE_WELL_SMOKE_BENCH_OFFER_SCHEMA, 'lerms.glove-well-smoke-bench-offer.v0');
assert.equal(GLOVE_WELL_SMOKE_BENCH_OFFER_ROUTE, 'lerms/glove-well/smoke-bench-offer-file');

const hostPacket = buildFixtureGloveWellHostPacket({
  sourceUrl: 'http://127.0.0.1:5191/__lerms/glove-well-host-packet/live',
  capture: {
    state: 'complete',
    reportPath: '/tmp/lerms-glove-well-browser-smoke-capture-live/report.json',
    filmstripPath: '/tmp/lerms-glove-well-browser-smoke-capture-live/filmstrip.html'
  }
});

const offer = buildGloveWellSmokeBenchOffer(hostPacket, {
  generatedAt: '2026-07-04T04:10:00.000Z',
  sourceRef: 'src/glove-well-host-packet.ts#buildFixtureGloveWellHostPacket',
  liveHostPayloadUrl: 'http://127.0.0.1:5191/__lerms/glove-well-host-packet/live',
  kaminosHostUrl: 'http://127.0.0.1:18156/?kaminos_glove_well_host=1',
  transitionalHandEventUrl: 'http://127.0.0.1:18158/hand-control-sidecar-event',
  handStateRuntimeReport: 'projects/perceptasia/topoi/codex-palm-gimbal-cockpit-clutch-0521.reports/smoke-bench-wilor-extraction-boundary_2026-07-03.md'
});

assert.equal(offer.schema, 'lerms.glove-well-smoke-bench-offer.v0');
assert.equal(offer.route, 'lerms/glove-well/smoke-bench-offer-file');
assert.equal(offer.smokeBench.schema, 'kaminos.smoke-bench.offer.v0');
assert.equal(offer.smokeBench.producerDiaulos, 'greedy-glove-fucker');
assert.equal(offer.smokeBench.primaryTarget.kind, 'native-host');
assert.equal(offer.smokeBench.primaryTarget.surface, 'glove-well');
assert.equal(offer.smokeBench.primaryTarget.adapter.id, 'glove-well');
assert.equal(offer.smokeBench.primaryTarget.adapter.kind, 'native_host');
assert.equal(offer.smokeBench.primaryTarget.adapter.acceptancePredicate, 'source_owned_glove_well_primitives_visible_in_kaminos_adapter');
assert.equal(offer.smokeBench.primaryTarget.hostPayload.schema, 'lerms.glove-well-host-packet.v0');
assert.equal(offer.smokeBench.primaryTarget.hostPayload.route, 'lerms/glove-well/host-packet');
assert.equal(offer.smokeBench.primaryTarget.hostPayload.liveUrl, 'http://127.0.0.1:5191/__lerms/glove-well-host-packet/live');
assert.equal(offer.smokeBench.primaryTarget.hostPayload.workbenchBinding.kaminos.cartridgeId, 'lerms-terrarium');
assert.equal(offer.smokeBench.primaryTarget.hostPayload.workbenchBinding.kaminos.crucibleId, 'glove-emitter');
assert.equal(offer.smokeBench.primaryTarget.hostPayload.workbenchBinding.kaminos.offerId, 'glove-emitter-native-host-smoke-offer');
assert.equal(offer.smokeBench.primaryTarget.hostPayload.workbenchBinding.receipt.expectedSchema, 'kaminos.forge-host.smoke-receipt.v0');
assert.equal(offer.smokeBench.hostPayload.schema, 'lerms.glove-well-host-packet.v0');
assert.equal(offer.smokeBench.hostPayload.workbenchBinding.kaminos.offerAuthority, 'gap_report_route');
assert.equal(offer.smokeBench.stateStream.schema, 'perceptasia.hand-control.v0');
assert.equal(offer.smokeBench.stateStream.compatTargetSchema, 'hand-state.frame.v0');
assert.equal(offer.smokeBench.stateStream.transitional, true);
assert.equal(offer.smokeBench.stateStream.depthLoadBearing, false);
assert.equal(offer.smokeBench.stateStream.effectiveRoute, 'native_wilor_mini_mlx_detector_sidecar_live');
assert.equal(offer.sourceTruth.hostPayloadAuthority, 'live_simulation');
assert.equal(offer.sourceTruth.handInputAuthority, 'transitional_live_bridge');
assert.equal(offer.sourceTruth.displayAuthority, 'local_browser_smoke_not_native_kaminos_host');
assert.ok(offer.smokeBench.downgrades.includes('hand_state_runtime_not_extracted'));
assert.ok(offer.smokeBench.downgrades.includes('current_hand_input_is_perceptasia_compat_not_neutral_hand_state'));
assert.ok(offer.smokeBench.downgrades.includes('local_browser_smoke_not_native_kaminos_host'));
assert.ok(offer.smokeBench.downgrades.includes('visual_capture_not_source_truth'));
assert.ok(offer.rejectedAcceptanceSurfaces.some((surface) => surface.surface === 'link_out_or_popout'));
assert.ok(offer.rejectedAcceptanceSurfaces.some((surface) => surface.surface === 'preview_bench_offer_card'));
assert.ok(offer.custody.greedyOwns.includes('glove-well hostPayload'));
assert.ok(offer.custody.kaminosOwns.includes('Smoke Bench host display acceptance'));
assert.ok(offer.custody.palmOwns.includes('neutral hand-state runtime extraction'));
assert.ok(offer.custody.gutterglassSupports.includes('bounded proxy inventory only'));
assert.ok(offer.minionContract.requiredTerms.includes('primaryTarget'));
assert.ok(offer.minionContract.requiredTerms.includes('hostPayload'));
assert.ok(offer.minionContract.requiredTerms.includes('stateStream'));
assert.equal(offer.minionContract.acceptanceSurface, 'Kaminos-controlled native adapter surface');
assert.deepEqual(offer.requiredPrimitiveRoles, [
  'wealth_source',
  'rolling_goin',
  'hand_skeleton_bone',
  'aim_arc_sample',
  'lerm_desire_link'
]);
assert.equal(offer.offer.schema, 'kaminos.smoke-bench.offer.v0');
assert.equal(offer.offer.primaryTarget.kind, 'native-host');
assert.equal(offer.offer.primaryTarget.hostPayload.schema, 'lerms.glove-well-host-packet.v0');
assert.equal(offer.adapterState.schema, 'kaminos.host-surface.state.v0');
assert.equal(offer.adapterState.hostId, 'glove-well');
assert.equal(offer.adapterState.hostRoute, 'kaminos/glove-well-host');
assert.equal(offer.adapterState.packetSchema, 'lerms.glove-well-host-packet.v0');
assert.equal(offer.adapterState.packetRoute, 'lerms/glove-well/host-packet');
assert.equal(offer.adapterState.workbenchBinding.kaminos.offerId, 'glove-emitter-native-host-smoke-offer');
assert.equal(offer.adapterState.visual.canvasNonblank, true);
assert.equal(offer.adapterState.visual.defaultMarkers, false);
assert.equal(offer.adapterState.visual.primitiveRoleCounts.wealth_source > 0, true);
assert.equal(offer.adapterState.visual.primitiveRoleCounts.rolling_goin > 0, true);
assert.equal(offer.adapterState.visual.primitiveRoleCounts.hand_skeleton_bone > 0, true);
assert.equal(offer.adapterState.visual.primitiveRoleCounts.aim_arc_sample > 0, true);
assert.equal(offer.adapterState.visual.primitiveRoleCounts.lerm_desire_link > 0, true);
assert.equal(offer.adapterState.rejectedDebugSurfaces.every((surface) => surface.acceptanceSurface === false), true);
assert.equal(offer.screenshot.path, null);
assert.equal(offer.screenshot.kind, 'missing_supporting_artifact');

const fixtureOffer = buildFixtureGloveWellSmokeBenchOffer({
  generatedAt: '2026-07-04T04:12:00.000Z',
  liveHostPayloadUrl: 'http://127.0.0.1:5191/__lerms/glove-well-host-packet/live'
});
assert.equal(fixtureOffer.smokeBench.primaryTarget.hostPayload.schema, 'lerms.glove-well-host-packet.v0');
assert.equal(fixtureOffer.smokeBench.authority, 'live_simulation');

const tmp = mkdtempSync(join(tmpdir(), 'lerms-glove-well-smoke-bench-offer-'));
const reportPath = join(tmp, 'offer.json');
const conformanceFixturePath = join(tmp, 'native-host-conformance-fixture.json');
const exitCode = runGloveWellSmokeBenchOfferCli([
  '--report', reportPath,
  '--conformance-fixture', conformanceFixturePath,
  '--live-host-payload-url', 'http://127.0.0.1:5191/__lerms/glove-well-host-packet/live',
  '--kaminos-host-url', 'http://127.0.0.1:18156/?kaminos_glove_well_host=1',
  '--hand-event-url', 'http://127.0.0.1:18158/hand-control-sidecar-event'
]);
assert.equal(exitCode, 0);
assert.equal(existsSync(reportPath), true);
const written = JSON.parse(readFileSync(reportPath, 'utf8'));
assert.equal(written.schema, 'lerms.glove-well-smoke-bench-offer.v0');
assert.equal(written.smokeBench.schema, 'kaminos.smoke-bench.offer.v0');
assert.equal(written.offer.schema, 'kaminos.smoke-bench.offer.v0');
assert.equal(written.adapterState.schema, 'kaminos.host-surface.state.v0');
assert.equal(written.smokeBench.primaryTarget.kind, 'native-host');
assert.equal(written.smokeBench.primaryTarget.hostPayload.liveUrl, 'http://127.0.0.1:5191/__lerms/glove-well-host-packet/live');
assert.equal(written.smokeBench.primaryTarget.hostPayload.workbenchBinding.kaminos.offerId, 'glove-emitter-native-host-smoke-offer');
assert.equal(written.smokeBench.stateStream.url, 'http://127.0.0.1:18158/hand-control-sidecar-event');
assert.equal(existsSync(conformanceFixturePath), true);
const conformanceFixture = JSON.parse(readFileSync(conformanceFixturePath, 'utf8'));
assert.equal(conformanceFixture.route, undefined);
assert.equal(conformanceFixture.offer.schema, 'kaminos.smoke-bench.offer.v0');
assert.equal(conformanceFixture.adapterState.schema, 'kaminos.host-surface.state.v0');
assert.deepEqual(conformanceFixture.requiredPrimitiveRoles, offer.requiredPrimitiveRoles);
assert.equal(conformanceFixture.screenshot.path, null);
assert.equal(conformanceFixture.screenshot.kind, 'missing_supporting_artifact');

const help = spawnSync(process.execPath, ['--experimental-strip-types', 'src/glove-well-smoke-bench-offer.ts', '--help'], {
  cwd: process.cwd(),
  encoding: 'utf8'
});
assert.equal(help.status, 0);
assert.match(help.stdout, /--live-host-payload-url/);
assert.match(help.stdout, /--hand-event-url/);
assert.match(help.stdout, /--conformance-fixture/);

console.log('glove well smoke bench offer contracts passed');
