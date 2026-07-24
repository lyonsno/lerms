import assert from 'node:assert/strict';
import { chmod, mkdtemp, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  STABLE_CHROME,
  allocateDebugPort,
  createLaunchReceipt,
  resolveBrowserExecutable,
  writeFailureReceipt
} from './wet-border-browser-launch.mjs';

const root = await mkdtemp(join(tmpdir(), 'wet-border-browser-launch-'));
const independent = join(root, 'chrome-headless-shell');
await writeFile(independent, '#!/bin/sh\n');
await chmod(independent, 0o755);
const resolution = await resolveBrowserExecutable({ candidates: [independent, STABLE_CHROME], env: {} });
assert.equal(resolution.effective, independent);
assert.equal(resolution.source, 'independent_artifact');
await assert.rejects(
  resolveBrowserExecutable({ candidates: [STABLE_CHROME], env: {} }),
  /independent_browser_artifact_missing/
);
const explicit = await resolveBrowserExecutable({ explicit: independent, candidates: [STABLE_CHROME], env: {} });
assert.equal(explicit.source, 'explicit_override');
assert.equal(allocateDebugPort(), 0);
const launch = createLaunchReceipt({ resolution, requestedUrl: 'http://127.0.0.1:5193/', profileDirectory: root, debugPort: 0 });
assert.equal(launch.effectiveExecutable, independent);
assert.equal(launch.requestedDebugPort, 0);
const failurePath = await writeFailureReceipt(root, { phase: 'launch', reason: 'timeout', requestedExecutable: independent });
const failure = JSON.parse(await readFile(failurePath, 'utf8'));
assert.equal(failure.status, 'failed_before_primary_output');
assert.equal(failure.requestedExecutable, independent);
console.log('wet-border browser launch contracts passed');
