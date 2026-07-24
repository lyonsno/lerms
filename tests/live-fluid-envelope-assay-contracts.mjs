import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const liveHandSource = readFileSync(new URL('../src/hand/live-hand.ts', import.meta.url), 'utf8');
const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const witnessUrl = new URL('../live-fluid-envelope-witness.mjs', import.meta.url);

assert.match(
  liveHandSource,
  /lerms\.live-fluid-envelope\.synthetic-assay\.v0/,
  'the browser route must identify synthetic envelope evidence separately from live hand authority',
);
assert.match(
  liveHandSource,
  /__lermsLiveFluidEnvelopeAssay/,
  'the headed witness needs an explicit assay-only browser hook',
);
assert.match(
  liveHandSource,
  /if\s*\(\s*fluidAssayMode\s*\)\s*throw new Error\([^)]*synthetic fluid envelope assay[^)]*live hand/i,
  'synthetic assay mode must reject the live hand capture route',
);
assert.match(
  liveHandSource,
  /if\s*\(\s*fluidSolver\?\.available\s*&&\s*!fluidAssayMode\s*\)/,
  'synthetic assay mode must prevent live hand frames from overwriting assay inlets',
);
assert.match(
  liveHandSource,
  /requestedParticleCount/,
  'the assay must preserve caller-owned particle allocation identity',
);
assert.match(
  liveHandSource,
  /requestDiagnostics/,
  'the assay must request GPU diagnostics at explicit checkpoints',
);
assert.match(
  liveHandSource,
  /activeParticleCount[\s\S]*dormantParticleCount/,
  'the assay must surface exact active and dormant occupancy',
);
assert.ok(existsSync(witnessUrl), 'the headed fluid-envelope witness must exist');

const witnessSource = readFileSync(witnessUrl, 'utf8');
assert.match(
  witnessSource,
  /lerms\.live-fluid-envelope-witness\.v0/,
  'the witness report uses a stable schema',
);
assert.match(
  witnessSource,
  /--emitter-count[\s\S]*(?:1\|5|1 or 5)/,
  'the witness exposes explicit one-finger and five-finger cases',
);
assert.match(
  witnessSource,
  /requestedParticleCount[\s\S]*effectiveParticleCount/,
  'the witness records requested and effective particle identity',
);
assert.match(
  witnessSource,
  /activeParticleCount\s*\+\s*dormantParticleCount[\s\S]*effectiveParticleCount/,
  'the witness rejects inconsistent occupancy accounting',
);
assert.match(
  witnessSource,
  /wrongOrFallbackRoute[\s\S]*missingGpuDiagnostics[\s\S]*blankOrPartialOutput/,
  'the witness tries the relevant route, diagnostics, and blank-output false closures',
);
assert.match(
  witnessSource,
  /sourceFluxMismatch[\s\S]*observedParticleReleaseRate[\s\S]*expectedParticleReleaseRate/,
  'the witness rejects nominal source flux that is not observed by GPU recirculation truth',
);
assert.match(
  witnessSource,
  /retainedActiveRatio/,
  'the witness separates source throughput from active fluid residence',
);
assert.match(
  witnessSource,
  /failurePhase[\s\S]*lastTrustworthyEvidence[\s\S]*primaryOutputWritten/,
  'the witness writes durable failure-phase evidence before primary output exists',
);
assert.match(
  witnessSource,
  /DevToolsActivePort[\s\S]*browserWebSocketPath/,
  'the witness must bind CDP to the profile-specific browser endpoint it launched',
);
assert.match(
  witnessSource,
  /Page\.captureScreenshot/,
  'the witness captures the actual headed browser output',
);
assert.equal(
  packageJson.scripts['witness:fluid-envelope'],
  'node live-fluid-envelope-witness.mjs',
  'the assay is invocable through the package contract',
);

const failureDir = mkdtempSync(resolve(tmpdir(), 'lerms-fluid-envelope-spawn-failure-'));
const failureReport = resolve(failureDir, 'receipt.json');
try {
  const failedWitness = spawnSync(process.execPath, [
    witnessUrl.pathname,
    '--report',
    failureReport,
  ], {
    cwd: new URL('..', import.meta.url),
    encoding: 'utf8',
    env: {
      ...process.env,
      LERMS_CHROME: resolve(failureDir, 'missing-chrome'),
    },
  });
  assert.notEqual(failedWitness.status, 0, 'missing Chrome must fail the witness');
  assert.ok(existsSync(failureReport), 'Chrome spawn failure must still write a durable report');
  const failedReceipt = JSON.parse(readFileSync(failureReport, 'utf8'));
  assert.equal(failedReceipt.ok, false, 'spawn failure report must fail loud');
  assert.equal(failedReceipt.failurePhase, 'launch_chrome', 'spawn failure must name its failure phase');
  assert.equal(failedReceipt.primaryOutputWritten, false, 'spawn failure must not imply primary evidence');
} finally {
  rmSync(failureDir, { recursive: true, force: true });
}

console.log('live fluid envelope assay contracts ok');
