import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const tmp = mkdtempSync(join(tmpdir(), 'lerms-red-lerm-visual-'));
const reportPath = join(tmp, 'visual-report.json');
const imagePath = join(tmp, 'red-lerm-filmstrip.ppm');

const run = spawnSync(
  process.execPath,
  [
    '--experimental-strip-types',
    'src/red-lerm-visual-witness.ts',
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
assert.equal(report.schema, 'lerms.red-lerm-visual-witness.v0');
assert.equal(report.motionSchema, 'lerms.red-lerm-body-motion.v0');
assert.equal(report.frameSchema, 'lerms.first-vertical-frame.v0');
assert.equal(report.sourceAuthority, 'synthetic_fixture');
assert.equal(report.imagePath, imagePath);
assert.equal(report.width, 1280);
assert.equal(report.height, 360);
assert.deepEqual(report.renderedStateBuckets, [
  'approach-uphill',
  'steal-goin',
  'carry-goin',
  'flee-with-goin',
  'hit-reaction',
  'tumble-flail',
  'drop-goin',
  'reroute-loose-goin',
]);
assert.ok(report.nonBackgroundPixelCount > 12000, 'filmstrip should contain visible drawn content');
assert.ok(report.redBodyPixelCount > 4000, 'filmstrip should contain red lerm bodies');
assert.ok(report.goinPixelCount > 900, 'filmstrip should contain goin pucks');
assert.ok(report.hitFlashPixelCount > 250, 'filmstrip should contain hit/tumble visual marks');
assert.ok(report.rerouteLinePixelCount > 200, 'filmstrip should contain reroute intent marks');

const ppm = readFileSync(imagePath);
const header = ppm.subarray(0, 64).toString('ascii');
assert.match(header, /^P6\s+1280\s+360\s+255\s/);
assert.ok(ppm.byteLength > report.width * report.height * 2, 'PPM contains raster bytes');

console.log('red-lerm visual witness tests passed');
