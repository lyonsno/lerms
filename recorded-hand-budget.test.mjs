import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

function runMissingRuntime(wrongCamera = false) {
  const root = mkdtempSync(join(tmpdir(), 'hand-budget-missing-runner-'));
  const camera = join(root, 'camera.y4m');
  const trace = join(root, 'trace.json');
  const receipt = join(root, 'camera-receipt.json');
  writeFileSync(camera, 'synthetic-input-no-browser-launched');
  writeFileSync(trace, JSON.stringify({ sourceAuthority: 'recorded_replay_not_live',
    sourceReport: { captureStartedAtMs: 0, captureStoppedAtMs: 1 },
    sourceHashes: { 'raw-camera.webm': 'synthetic-source' } }));
  writeFileSync(receipt, JSON.stringify({ schema: 'hand-camera-conversion.v0',
    sourceSha256: 'synthetic-source',
    outputSha256: wrongCamera ? 'wrong' : createHash('sha256').update(readFileSync(camera)).digest('hex') }));
  const run = spawnSync(process.execPath, ['recorded-hand-budget.mjs',
    '--output', root, '--browser', '/missing/Chrome for Testing', '--camera', camera,
    '--trace', trace, '--camera-receipt', receipt,
    '--runtime-python', '/missing/runtime-python', '--runtime-root', root],
  { encoding: 'utf8' });
  assert.notEqual(run.status, 0);
  const report = JSON.parse(readFileSync(join(root, 'report.json')));
  return report;
}

test('missing runtime executable leaves a terminal report before browser launch', () => {
  const report = runMissingRuntime();
  assert.equal(report.status, 'failed');
  assert.equal(report.failurePhase, 'pure-mono:runtime_start');
  assert.match(report.error, /ENOENT/);
  assert(report.ownedProcessExits.some(exit => exit.error?.includes('ENOENT')));
});

test('unrelated replay camera fails before any service starts', () => {
  const report = runMissingRuntime(true);
  assert.equal(report.status, 'failed');
  assert.equal(report.failurePhase, 'input_validation');
  assert.match(report.error, /wrong_converted_camera/);
  assert.deepEqual(report.ownedProcessExits, []);
});
