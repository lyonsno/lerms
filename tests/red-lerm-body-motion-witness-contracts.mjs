import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const tmp = mkdtempSync(join(tmpdir(), 'lerms-red-lerm-witness-'));

const fallbackReport = join(tmp, 'fallback-witness.json');
const fallbackRun = spawnSync(
  process.execPath,
  [
    '--experimental-strip-types',
    'src/red-lerm-body-motion-witness.ts',
    '--out',
    fallbackReport,
    '--fixture-id',
    'red-lerm-cli-fixture',
    '--requested-kind',
    'live',
    '--requested-id',
    'missing-live-route',
    '--requested-route',
    'wilor-mlx/live-red-lerm-motion',
  ],
  { cwd: root, encoding: 'utf8' },
);

assert.equal(fallbackRun.status, 0, fallbackRun.stderr || fallbackRun.stdout);

const fallback = JSON.parse(readFileSync(fallbackReport, 'utf8'));
assert.equal(fallback.ok, true);
assert.equal(fallback.phase, 'complete');
assert.equal(fallback.schema, 'lerms.red-lerm-body-motion.v0');
assert.equal(fallback.witness.sourceTruth.requestedMotionSource.kind, 'live');
assert.equal(fallback.witness.sourceTruth.effectiveMotionSource.kind, 'fixture');
assert.equal(fallback.witness.sourceTruth.effectiveMotionSource.status, 'fallback');
assert.equal(fallback.witness.sourceTruth.fallbackActive, true);
assert.equal(fallback.witness.stateBuckets['approach-uphill'], 1);
assert.equal(fallback.witness.stateBuckets['reroute-loose-goin'], 1);
assert.equal(fallback.outputPath, fallbackReport);

const invalidReport = join(tmp, 'invalid-source-report.json');
const invalidRun = spawnSync(
  process.execPath,
  [
    '--experimental-strip-types',
    'src/red-lerm-body-motion-witness.ts',
    '--out',
    invalidReport,
    '--requested-kind',
    'demo',
    '--requested-id',
    'bad-source',
    '--requested-route',
    'bad/source',
  ],
  { cwd: root, encoding: 'utf8' },
);

assert.notEqual(invalidRun.status, 0, 'invalid source kind should fail the CLI');

const invalid = JSON.parse(readFileSync(invalidReport, 'utf8'));
assert.equal(invalid.ok, false);
assert.equal(invalid.phase, 'validating-args');
assert.equal(invalid.failureKind, 'invalid-requested-kind');
assert.equal(invalid.lastTrustworthyEvidence.outputPath, invalidReport);

console.log('red-lerm body/motion witness CLI tests passed');
