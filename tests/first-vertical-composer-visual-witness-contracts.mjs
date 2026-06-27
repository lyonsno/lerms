import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const root = process.cwd();
const tmp = mkdtempSync(join(tmpdir(), 'lerms-first-vertical-composer-visual-'));
const reportPath = join(tmp, 'composer-visual-witness.json');
const imagePath = join(tmp, 'composer-visual-witness.ppm');

const run = spawnSync(
  process.execPath,
  [
    '--experimental-strip-types',
    'src/contracts/first-vertical-composer-visual-witness.ts',
    '--report',
    reportPath,
    '--image',
    imagePath,
    '--frame-id',
    'composer-visual-witness-test',
    '--timestamp-ms',
    '2600',
  ],
  { cwd: root, encoding: 'utf8' },
);

assert.equal(run.status, 0, run.stderr || run.stdout);

const report = JSON.parse(readFileSync(reportPath, 'utf8'));
assert.equal(report.ok, true);
assert.equal(report.schema, 'lerms.first-vertical-composer-visual-witness.v0');
assert.equal(report.route, 'first-vertical-composer/visual-witness-file');
assert.equal(report.chamberId, 'lerms-underhill');
assert.equal(report.authorityNote, 'integrated fixture evidence; not a live first vertical');
assert.equal(report.frameSchema, 'lerms.first-vertical-frame.v0');
assert.equal(report.sourceAuthority, 'synthetic_fixture');
assert.equal(report.frameSourceRoute, 'first-vertical-composer');
assert.equal(report.imagePath, imagePath);
assert.equal(report.width, 1280);
assert.equal(report.height, 720);
assert.equal(report.summary.lermCount, 8);
assert.equal(report.summary.goinCount, 2);
assert.equal(report.summary.juiceHitCount, 1);
assert.equal(report.summary.carrierDropCount, 1);
assert.deepEqual(report.intentionallyEmpty, {
  liveFingerJuicePackets: true,
  liveGoinPhysics: true,
  liveCrowdAi: true,
  generatedLermMotion: true,
});

assert.ok(report.nonBackgroundPixelCount > 18000, 'image should contain visible integrated frame content');
assert.ok(report.terrainPixelCount > 5000, 'image should contain terrain');
assert.ok(report.redLermPixelCount > 3200, 'image should contain red lerms');
assert.ok(report.goinPixelCount > 500, 'image should contain goins');
assert.ok(report.hitPixelCount > 180, 'image should contain a juice-hit marker');
assert.ok(report.dropPixelCount > 120, 'image should contain a carrier-drop marker');
assert.ok(report.sourceTruthPixelCount > 1000, 'image should contain source-truth/status bands');

const ppm = readFileSync(imagePath);
const header = ppm.subarray(0, 64).toString('ascii');
assert.match(header, /^P6\s+1280\s+720\s+255\s/);
assert.ok(ppm.byteLength > report.width * report.height * 2, 'PPM contains raster bytes');

console.log('first vertical composer visual witness tests passed');
