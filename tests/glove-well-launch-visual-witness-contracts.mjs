import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const root = process.cwd();
const tmp = mkdtempSync(join(tmpdir(), 'lerms-glove-well-launch-visual-'));
const reportPath = join(tmp, 'glove-well-launch-visual.json');
const imagePath = join(tmp, 'glove-well-launch-filmstrip.ppm');

const run = spawnSync(
  process.execPath,
  [
    '--experimental-strip-types',
    'src/glove-well-launch-visual-witness.ts',
    '--report',
    reportPath,
    '--image',
    imagePath,
    '--frame-id',
    'glove-well-launch-visual-test',
    '--timestamp-ms',
    '10200',
  ],
  { cwd: root, encoding: 'utf8' },
);

assert.equal(run.status, 0, run.stderr || run.stdout);

const report = JSON.parse(readFileSync(reportPath, 'utf8'));
assert.equal(report.ok, true);
assert.equal(report.schema, 'lerms.glove-well-launch-visual-witness.v0');
assert.equal(report.launchWitnessSchema, 'lerms.glove-well-launch-witness.v0');
assert.equal(report.frameSchema, 'lerms.first-vertical-frame.v0');
assert.equal(report.route, 'lerms/glove-well-launch/visual-witness-file');
assert.equal(report.sourceAuthority, 'synthetic_fixture');
assert.equal(report.effectiveAuthority, 'synthetic_fixture');
assert.equal(report.authorityNote, 'operator visual smoke over fixture glove input; not live WiLoR evidence');
assert.equal(report.imagePath, imagePath);
assert.equal(report.width, 1440);
assert.equal(report.height, 480);
assert.deepEqual(report.renderedPanels, [
  'glove-well-idle',
  'pinch-prime',
  'pinky-aim',
  'release-launch',
  'bounce-roll',
  'lerm-reroute',
]);
assert.deepEqual(report.sourceTruthBlockers, [
  'source-authority-not-live',
  'missing-juice-hit-evidence',
  'missing-carrier-drop-evidence',
  'missing-hit-to-drop-chain',
]);
assert.equal(report.launchEvidence.releaseEventId, 'glove-well-release-glove-well-launch-visual-test-release');
assert.equal(report.launchEvidence.sourceInputFrameId, 'glove-well-launch-visual-test-release');
assert.ok(report.nonBackgroundPixelCount > 25000, 'filmstrip should contain visible smoke content');
assert.ok(report.gloveWellPixelCount > 1200, 'filmstrip should show Glove Well reservoir');
assert.ok(report.goinPixelCount > 1400, 'filmstrip should show launched goin pucks');
assert.ok(report.arcPixelCount > 300, 'filmstrip should show dotted pinky aim arc');
assert.ok(report.launchPixelCount > 500, 'filmstrip should show release/launch motion');
assert.ok(report.reroutePixelCount > 500, 'filmstrip should show lerm reroute desire');
assert.ok(report.sourceTruthPixelCount > 800, 'filmstrip should show source-truth/status marks');

const ppm = readFileSync(imagePath);
const header = ppm.subarray(0, 64).toString('ascii');
assert.match(header, /^P6\s+1440\s+480\s+255\s/);
assert.ok(ppm.byteLength > report.width * report.height * 2, 'PPM contains raster bytes');

console.log('glove well launch visual witness tests passed');
