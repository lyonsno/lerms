import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

import {
  GLOVE_WELL_KAMINOS_FIRING_RECEIPT_ROUTE,
  GLOVE_WELL_KAMINOS_FIRING_RECEIPT_SCHEMA,
  buildFixtureGloveWellKaminosFiringReceipt,
  buildGloveWellKaminosFiringReceipt,
  runGloveWellKaminosFiringReceiptCli
} from '../src/glove-well-kaminos-firing-receipt.ts';
import { buildFixtureGloveWellHostPacket } from '../src/glove-well-host-packet.ts';
import { buildGloveWellSmokeBenchOffer } from '../src/glove-well-smoke-bench-offer.ts';

const operatorRoute =
  'http://127.0.0.1:18156/?kaminos_forge_host=live&world_chamber=lerms-underhill&world_cartridge=lerms-terrarium&world_crucible=glove-emitter&forge_host_smoke_offer=glove-emitter-native-host-smoke-offer';

const kaminosReceipt = {
  schema: 'kaminos.forge-host.smoke-receipt.v0',
  receiptId: 'receipt:glove-emitter-native-host-smoke-offer:test',
  capturedAt: '2026-07-06T17:10:00.000Z',
  sourceOffer: {
    id: 'glove-emitter-native-host-smoke-offer',
    sourceRef: 'world-cartridge:lerms-terrarium/glove-emitter/glove-emitter-native-host-smoke-offer',
    authority: 'gap_report_route',
    freshness: 'waiting',
    displayState: 'waiting',
    targetSurface: 'glove-well',
    targetUrl: operatorRoute
  },
  smokeChamber: {
    schema: 'kaminos.forge-host.smoke-chamber.v0',
    routeKind: 'forge-host-smoke-offer-route',
    inlineHost: {
      kind: 'route-card',
      reason: 'recursive_forge_host_route',
      recursive: true,
      effectiveUrl: operatorRoute
    }
  },
  currentRoute: operatorRoute,
  capture: {
    kind: 'viewport_png_data_url',
    scope: 'kaminos-viewport',
    screenshotBytes: 12345
  },
  downgrades: ['recursive_forge_host_route', 'gap_report_route_not_visual_acceptance']
};

const hostPacket = buildFixtureGloveWellHostPacket({
  sourceUrl: 'http://127.0.0.1:5176/__lerms/glove-well-host-packet/live',
  capture: {
    state: 'complete',
    reportPath: '/tmp/lerms-glove-well-browser-smoke-capture-live/report.json',
    filmstripPath: '/tmp/lerms-glove-well-browser-smoke-capture-live/filmstrip.html'
  }
});
const offer = buildGloveWellSmokeBenchOffer(hostPacket, {
  generatedAt: '2026-07-06T17:09:00.000Z',
  liveHostPayloadUrl: 'http://127.0.0.1:5176/__lerms/glove-well-host-packet/live',
  kaminosHostUrl: operatorRoute,
  transitionalHandEventUrl: 'http://127.0.0.1:8096/hand-control-sidecar-event'
});

assert.equal(GLOVE_WELL_KAMINOS_FIRING_RECEIPT_SCHEMA, 'lerms.glove-well-kaminos-firing-receipt.v0');
assert.equal(GLOVE_WELL_KAMINOS_FIRING_RECEIPT_ROUTE, 'lerms/glove-well/kaminos-firing-receipt-file');

const report = buildGloveWellKaminosFiringReceipt({
  outputPath: '/tmp/lerms-glove-well-kaminos-firing-receipt-test.json',
  generatedAt: '2026-07-06T17:11:00.000Z',
  frameId: 'glove-well-kaminos-firing-receipt-test',
  sourcePacket: hostPacket,
  smokeBenchOffer: offer,
  kaminosReceipt,
  kaminosReceiptPath: '/tmp/kaminos-glove-emitter-smoke-receipt.json',
  operatorRoute
});

assert.equal(report.ok, true);
assert.equal(report.schema, 'lerms.glove-well-kaminos-firing-receipt.v0');
assert.equal(report.route, 'lerms/glove-well/kaminos-firing-receipt-file');
assert.equal(report.pipeline.schema, 'lerms.glove-well-kaminos-pipeline.v0');
assert.equal(report.pipeline.primarySmokePath.kind, 'kaminos_forge_host_smoke_workbench');
assert.equal(report.pipeline.primarySmokePath.operatorRoute, operatorRoute);
assert.equal(report.pipeline.sourcePacket.schema, 'lerms.glove-well-host-packet.v0');
assert.equal(report.pipeline.sourcePacket.route, 'lerms/glove-well/host-packet');
assert.equal(report.pipeline.workbenchBinding.kaminos.cartridgeId, 'lerms-terrarium');
assert.equal(report.pipeline.workbenchBinding.kaminos.crucibleId, 'glove-emitter');
assert.equal(report.pipeline.workbenchBinding.kaminos.offerId, 'glove-emitter-native-host-smoke-offer');
assert.equal(report.pipeline.firing.outputClass, 'firing_receipt');
assert.equal(report.pipeline.firing.sourceRole, 'glove-well-source');
assert.equal(report.pipeline.firing.receiptSchema, 'kaminos.forge-host.smoke-receipt.v0');
assert.equal(report.kaminosReceipt.status, 'captured');
assert.equal(report.kaminosReceipt.receiptPath, '/tmp/kaminos-glove-emitter-smoke-receipt.json');
assert.equal(report.kaminosReceipt.offerId, 'glove-emitter-native-host-smoke-offer');
assert.equal(report.kaminosReceipt.inlineHost.kind, 'route-card');
assert.equal(report.kaminosReceipt.inlineHost.reason, 'recursive_forge_host_route');
assert.equal(report.sourceTruth.kaminosAcceptance, false);
assert.equal(report.sourceTruth.liveGloveWellAuthority, false);
assert.equal(report.sourceTruth.debugSurfacesAccepted, false);
assert.ok(report.sourceTruth.downgrades.includes('kaminos_offer_authority_gap_report_route'));
assert.ok(report.sourceTruth.downgrades.includes('perceptasia_debug_surface_not_primary_smoke_path'));
assert.equal(report.debugSurfacePosture.primary.path, 'kaminos_forge_host_smoke_workbench');
assert.equal(report.debugSurfacePosture.rejectedAcceptanceSurfaces.some((surface) => surface.surface === 'perceptasia_live_hand_frame'), true);
assert.equal(report.debugSurfacePosture.rejectedAcceptanceSurfaces.some((surface) => surface.surface === 'local_lerms_browser_smoke'), true);
assert.equal(report.debugSurfacePosture.rejectedAcceptanceSurfaces.every((surface) => surface.acceptanceSurface === false), true);
assert.equal(report.whatRemainsFake.nativeKaminosHostAcceptance, true);
assert.equal(report.whatRemainsFake.fullVerticalSuccess, true);

const nativeHostReceipt = {
  ...kaminosReceipt,
  sourceOffer: {
    ...kaminosReceipt.sourceOffer,
    targetSurface: 'kaminos/glove-well-host',
    targetUrl: 'index.html?kaminos_glove_well_host=1&glove_well_host_url=http%3A%2F%2F127.0.0.1%3A5176%2F__lerms%2Fglove-well-host-packet%2Flive&glove_well_host_live=1'
  },
  smokeChamber: undefined,
  inlineHost: {
    kind: 'iframe',
    reason: 'browser_target',
    recursive: false,
    effectiveUrl: 'http://127.0.0.1:18157/index.html?kaminos_glove_well_host=1&glove_well_host_url=http%3A%2F%2F127.0.0.1%3A5176%2F__lerms%2Fglove-well-host-packet%2Flive&glove_well_host_live=1'
  },
  embeddedHost: {
    schema: 'kaminos.embedded-host-state.v0',
    captured: true,
    state: {
      schema: 'kaminos.glove-well-host.state.v0',
      route: 'kaminos/glove-well-host',
      hostId: 'glove-well',
      hostRoute: 'kaminos/glove-well-host',
      packetSchema: 'lerms.glove-well-host-packet.v0',
      packetRoute: 'lerms/glove-well/host-packet',
      effectiveUrl: 'http://127.0.0.1:5176/__lerms/glove-well-host-packet/live',
      sourceAuthority: 'stale_hold',
      freshness: { status: 'waiting' },
      status: 'loaded',
      surface: { primitiveCount: 11 }
    }
  }
};
const nativeHostReport = buildGloveWellKaminosFiringReceipt({
  outputPath: '/tmp/lerms-glove-well-kaminos-firing-receipt-native-host-test.json',
  generatedAt: '2026-07-06T17:11:30.000Z',
  frameId: 'glove-well-kaminos-firing-receipt-native-host-test',
  sourcePacket: hostPacket,
  smokeBenchOffer: offer,
  kaminosReceipt: nativeHostReceipt,
  kaminosReceiptPath: '/tmp/kaminos-glove-emitter-native-host-smoke-receipt.json',
  operatorRoute
});
assert.equal(nativeHostReport.kaminosReceipt.inlineHost.kind, 'iframe');
assert.equal(nativeHostReport.kaminosReceipt.inlineHost.recursive, false);
assert.equal(nativeHostReport.kaminosReceipt.nativeHost?.verified, true);
assert.equal(nativeHostReport.kaminosReceipt.nativeHost?.hostId, 'glove-well');
assert.equal(nativeHostReport.kaminosReceipt.nativeHost?.packetSchema, 'lerms.glove-well-host-packet.v0');
assert.equal(nativeHostReport.kaminosReceipt.nativeHost?.packetRoute, 'lerms/glove-well/host-packet');
assert.equal(nativeHostReport.sourceTruth.nativeKaminosHostVerified, true);
assert.equal(nativeHostReport.sourceTruth.kaminosAcceptance, false);
assert.ok(!nativeHostReport.sourceTruth.downgrades.includes('native_kaminos_host_not_verified'));
assert.ok(nativeHostReport.sourceTruth.downgrades.includes('native_kaminos_host_verified_visual_receipt'));
assert.equal(nativeHostReport.whatRemainsFake.nativeKaminosHostAcceptance, true);

const missingReceiptReport = buildFixtureGloveWellKaminosFiringReceipt({
  outputPath: '/tmp/lerms-glove-well-kaminos-firing-receipt-missing-test.json',
  generatedAt: '2026-07-06T17:12:00.000Z',
  operatorRoute
});
assert.equal(missingReceiptReport.kaminosReceipt.status, 'missing');
assert.ok(missingReceiptReport.sourceTruth.downgrades.includes('kaminos_forge_host_receipt_missing'));
assert.equal(missingReceiptReport.sourceTruth.kaminosAcceptance, false);

assert.throws(
  () =>
    buildGloveWellKaminosFiringReceipt({
      outputPath: '/tmp/lerms-glove-well-kaminos-firing-receipt-bad-schema-test.json',
      frameId: 'bad-schema',
      sourcePacket: hostPacket,
      smokeBenchOffer: offer,
      kaminosReceipt: { ...kaminosReceipt, schema: 'not-a-kaminos-receipt' },
      operatorRoute
    }),
  /kaminos.forge-host.smoke-receipt.v0/
);

assert.throws(
  () =>
    buildGloveWellKaminosFiringReceipt({
      outputPath: '/tmp/lerms-glove-well-kaminos-firing-receipt-wrong-offer-test.json',
      frameId: 'wrong-offer',
      sourcePacket: hostPacket,
      smokeBenchOffer: offer,
      kaminosReceipt: { ...kaminosReceipt, sourceOffer: { ...kaminosReceipt.sourceOffer, id: 'wrong-offer' } },
      operatorRoute
    }),
  /receipt offer id/
);

const tmp = mkdtempSync(join(tmpdir(), 'lerms-glove-well-kaminos-firing-receipt-'));
const kaminosReceiptPath = join(tmp, 'kaminos-receipt.json');
const reportPath = join(tmp, 'firing-receipt.json');
writeFileSync(kaminosReceiptPath, JSON.stringify(kaminosReceipt, null, 2));
const exitCode = runGloveWellKaminosFiringReceiptCli([
  '--report', reportPath,
  '--kaminos-receipt', kaminosReceiptPath,
  '--operator-route', operatorRoute,
  '--generated-at', '2026-07-06T17:13:00.000Z'
]);
assert.equal(exitCode, 0);
assert.equal(existsSync(reportPath), true);
const written = JSON.parse(readFileSync(reportPath, 'utf8'));
assert.equal(written.ok, true);
assert.equal(written.pipeline.workbenchBinding.kaminos.offerId, 'glove-emitter-native-host-smoke-offer');
assert.equal(written.kaminosReceipt.status, 'captured');
assert.equal(written.kaminosReceipt.receiptPath, kaminosReceiptPath);

const badReceiptPath = join(tmp, 'bad-kaminos-receipt.json');
const badReportPath = join(tmp, 'bad-firing-receipt.json');
writeFileSync(badReceiptPath, JSON.stringify({ ...kaminosReceipt, sourceOffer: { ...kaminosReceipt.sourceOffer, id: 'wrong-offer' } }, null, 2));
const badRun = spawnSync(
  process.execPath,
  [
    '--experimental-strip-types',
    'src/glove-well-kaminos-firing-receipt.ts',
    '--report',
    badReportPath,
    '--kaminos-receipt',
    badReceiptPath,
    '--operator-route',
    operatorRoute
  ],
  { cwd: process.cwd(), encoding: 'utf8' }
);
assert.notEqual(badRun.status, 0);
const badReport = JSON.parse(readFileSync(badReportPath, 'utf8'));
assert.equal(badReport.ok, false);
assert.equal(badReport.phase, 'building-glove-well-kaminos-firing-receipt');
assert.equal(badReport.lastTrustworthyEvidence.kaminosReceiptPath, badReceiptPath);
assert.equal(badReport.lastTrustworthyEvidence.operatorRoute, operatorRoute);

const help = spawnSync(process.execPath, ['--experimental-strip-types', 'src/glove-well-kaminos-firing-receipt.ts', '--help'], {
  cwd: process.cwd(),
  encoding: 'utf8'
});
assert.equal(help.status, 0);
assert.match(help.stdout, /--kaminos-receipt/);
assert.match(help.stdout, /--operator-route/);

console.log('glove well Kaminos firing receipt contracts passed');
