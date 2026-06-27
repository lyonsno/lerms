import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const tmp = mkdtempSync(join(tmpdir(), 'lerms-first-vertical-composer-'));

const reportPath = join(tmp, 'composer-witness.json');
const okRun = spawnSync(
  process.execPath,
  [
    '--experimental-strip-types',
    'src/contracts/first-vertical-composer-witness.ts',
    '--out',
    reportPath,
    '--frame-id',
    'composer-witness-test',
    '--timestamp-ms',
    '2000',
  ],
  { cwd: root, encoding: 'utf8' },
);

assert.equal(okRun.status, 0, okRun.stderr || okRun.stdout);

const report = JSON.parse(readFileSync(reportPath, 'utf8'));
assert.equal(report.ok, true);
assert.equal(report.phase, 'complete');
assert.equal(report.route, 'first-vertical-composer/witness-file');
assert.equal(report.outputPath, reportPath);
assert.equal(report.frame.schema, 'lerms.first-vertical-frame.v0');
assert.equal(report.frame.source.route, 'first-vertical-composer');
assert.equal(report.frame.source.authority, 'synthetic_fixture');
assert.ok(report.summary.lermCount >= 1);
assert.ok(report.summary.goinCount >= 1);
assert.ok(report.summary.carrierDropCount >= 1);
assert.equal(report.authorityNote, 'integrated fixture evidence; not a live first vertical');

const stalePath = join(tmp, 'stale-composer-witness.json');
const staleRun = spawnSync(
  process.execPath,
  [
    '--experimental-strip-types',
    'src/contracts/first-vertical-composer-witness.ts',
    '--out',
    stalePath,
    '--frame-id',
    'stale-composer-witness-test',
    '--timestamp-ms',
    '2000',
    '--red-sample-age-ms',
    '999',
    '--max-sample-age-ms',
    '100',
  ],
  { cwd: root, encoding: 'utf8' },
);

assert.notEqual(staleRun.status, 0, 'stale red-lerm source should fail the witness CLI');

const staleReport = JSON.parse(readFileSync(stalePath, 'utf8'));
assert.equal(staleReport.ok, false);
assert.equal(staleReport.phase, 'composing-first-vertical-frame');
assert.equal(staleReport.failureKind, 'composer-frame-invalid');
assert.match(staleReport.error, /stale source/);
assert.equal(staleReport.lastTrustworthyEvidence.outputPath, stalePath);
assert.equal(staleReport.lastTrustworthyEvidence.redSampleAgeMs, 999);
assert.equal(staleReport.lastTrustworthyEvidence.maxSampleAgeMs, 100);

console.log('first vertical composer witness CLI tests passed');
