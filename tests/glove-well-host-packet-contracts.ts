import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

import {
  GLOVE_WELL_HOST_PACKET_ROUTE,
  GLOVE_WELL_HOST_PACKET_SCHEMA,
  buildFixtureGloveWellHostPacket,
  runGloveWellHostPacketCli
} from '../src/glove-well-host-packet.ts';

assert.equal(GLOVE_WELL_HOST_PACKET_SCHEMA, 'lerms.glove-well-host-packet.v0');
assert.equal(GLOVE_WELL_HOST_PACKET_ROUTE, 'lerms/glove-well/host-packet');

const packet = buildFixtureGloveWellHostPacket({
  sourceUrl: '/scratch/greedy-glove-well-host-packet-fixture.json',
  capture: {
    state: 'complete',
    reportPath: '/tmp/lerms-glove-well-host-packet-fixture-capture.json',
    filmstripPath: '/tmp/lerms-glove-well-host-packet-fixture-filmstrip.html'
  }
});

assert.equal(packet.schema, 'lerms.glove-well-host-packet.v0');
assert.equal(packet.route, 'lerms/glove-well/host-packet');
assert.equal(packet.hostCandidate.requestedAdapter, 'glove-well');
assert.equal(packet.source.producerDiaulos, 'greedy-glove-fucker');
assert.equal(packet.source.sourceTruthAuthority, 'lerms.gloveWellBrowserSmokeState');
assert.equal(packet.coordinateFrame.space, 'operator_visible_webcam_mirrored_screen_normalized');
assert.equal(packet.gloveWell.phase, 'priming');
assert.equal(packet.gloveWell.releaseCount, 1);
assert.equal(packet.handSkeleton.landmarkCount, 21);
assert.equal(packet.goins.some((goin) => goin.state === 'held'), true);
assert.equal(packet.goins.some((goin) => goin.state === 'rolling'), true);
assert.ok(packet.downgrades.includes('local_browser_smoke_not_native_kaminos_host'));
assert.ok(packet.downgrades.includes('visual_capture_not_source_truth'));
assert.ok(packet.custody.greedyOwns.includes('sourceOwnedHostPacket'));
assert.ok(packet.custody.kaminosOwns.includes('host-surface adapter validation'));
assert.equal(packet.rejectedDebugSurfaces.some((surface) => surface.surface === 'preview_bench_smoke_offer_card'), true);

const tmp = mkdtempSync(join(tmpdir(), 'lerms-glove-well-host-packet-contract-'));
const reportPath = join(tmp, 'packet.json');
const exitCode = runGloveWellHostPacketCli([
  '--report', reportPath,
  '--source-url', '/scratch/greedy-glove-well-host-packet-fixture.json',
  '--capture-report', '/tmp/lerms-glove-well-capture.json',
  '--capture-filmstrip', '/tmp/lerms-glove-well-filmstrip.html'
]);
assert.equal(exitCode, 0);
assert.equal(existsSync(reportPath), true);
const written = JSON.parse(readFileSync(reportPath, 'utf8'));
assert.equal(written.schema, 'lerms.glove-well-host-packet.v0');
assert.equal(written.capture.reportPath, '/tmp/lerms-glove-well-capture.json');
assert.equal(written.capture.filmstripPath, '/tmp/lerms-glove-well-filmstrip.html');

const help = spawnSync(process.execPath, ['--experimental-strip-types', 'src/glove-well-host-packet.ts', '--help'], {
  cwd: process.cwd(),
  encoding: 'utf8'
});
assert.equal(help.status, 0);
assert.match(help.stdout, /--report/);
assert.match(help.stdout, /--source-url/);

console.log('glove well host packet contracts passed');
