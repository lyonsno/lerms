import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const packageManifest = resolve(
  'packages/hill-of-hills-support/package.json'
);
const witnessPath = resolve(
  'tools/hill-of-hills-analytic-impact-package-witness.mjs'
);
const exportSubpath = './hill-of-hills/analytic-impact-support';
const packageCoordinate =
  '@lerms/hill-of-hills-support/hill-of-hills/analytic-impact-support';

if (!existsSync(packageManifest)) {
  throw new Error(
    'Hill analytic impact support package manifest is missing from the published package boundary'
  );
}

const manifest = JSON.parse(readFileSync(packageManifest, 'utf8'));
if (manifest.name !== '@lerms/hill-of-hills-support') {
  throw new Error('package manifest exposes the wrong source-owned package identity');
}
if (typeof manifest.exports?.[exportSubpath]?.types !== 'string') {
  throw new Error('package manifest does not publish analytic support types');
}
if (typeof manifest.exports?.[exportSubpath]?.import !== 'string') {
  throw new Error('package manifest does not publish the analytic support runtime');
}

function runWitness(outputDir, extraArgs = []) {
  return spawnSync(
    process.execPath,
    [
      witnessPath,
      '--output-dir',
      outputDir,
      ...extraArgs
    ],
    {
      cwd: resolve('.'),
      encoding: 'utf8'
    }
  );
}

function readReport(outputDir) {
  const reportPath = join(outputDir, 'report.json');
  if (!existsSync(reportPath)) {
    throw new Error('package witness failed without a durable report');
  }
  return JSON.parse(readFileSync(reportPath, 'utf8'));
}

const outputDir = mkdtempSync(
  join(tmpdir(), 'lerms-hill-impact-package-contract-')
);

try {
  const success = runWitness(outputDir);
  if (success.status !== 0) {
    throw new Error(
      `package witness rejected the published route: ${success.stderr || success.stdout}`
    );
  }
  const successReport = readReport(outputDir);
  if (
    successReport.schema !==
    'lerms.hill-of-hills.analytic-impact-package-witness.v1'
  ) {
    throw new Error('package witness wrote an unexpected report schema');
  }
  if (
    successReport.ok !== true ||
    successReport.failurePhase !== null ||
    successReport.primaryOutputWritten !== true
  ) {
    throw new Error('package witness did not close only after primary output');
  }
  if (
    successReport.requested.exportSubpath !== exportSubpath ||
    successReport.effective.exportSubpath !== exportSubpath ||
    successReport.effective.packageCoordinate !== packageCoordinate
  ) {
    throw new Error('package witness substituted the requested package route');
  }
  if (
    successReport.fallbackRoute !== null ||
    successReport.artifactFreshness !== 'built_current_run'
  ) {
    throw new Error('package witness hid fallback or stale artifact state');
  }
  if (
    !/^[0-9a-f]{40}$/.test(successReport.requested.sourceRevision) ||
    !/^[0-9a-f]{64}$/.test(successReport.artifact.sha256) ||
    !successReport.artifact.integrity.startsWith('sha512-')
  ) {
    throw new Error('package witness omitted source or artifact identity');
  }
  if (
    !existsSync(successReport.artifact.path) ||
    statSync(successReport.artifact.path).size !==
      successReport.artifact.byteLength ||
    successReport.artifact.byteLength <= 0
  ) {
    throw new Error('package witness reported a missing, blank, or partial artifact');
  }
  for (const requiredExport of [
    'HILL_ANALYTIC_IMPACT_SUPPORT_ROUTE',
    'HILL_ANALYTIC_IMPACT_SUPPORT_SCHEMA',
    'createHillAnalyticImpactSupportQuery'
  ]) {
    if (!successReport.exportedNames.includes(requiredExport)) {
      throw new Error(
        `clean-installed package omitted required export: ${requiredExport}`
      );
    }
  }

  writeFileSync(
    join(outputDir, 'report.json'),
    `${JSON.stringify({ ok: true, artifactFreshness: 'cached_lie' })}\n`
  );
  const badRoute = './hill-of-hills/not-the-requested-route';
  const wrongRoute = runWitness(outputDir, [
    '--export-subpath',
    badRoute
  ]);
  if (wrongRoute.status === 0) {
    throw new Error('package witness accepted an unpublished route');
  }
  const wrongRouteReport = readReport(outputDir);
  if (
    wrongRouteReport.ok !== false ||
    wrongRouteReport.failurePhase !== 'validate-package-route' ||
    wrongRouteReport.primaryOutputWritten !== false ||
    wrongRouteReport.artifactFreshness !== 'not_built'
  ) {
    throw new Error('package witness preserved cached success after route failure');
  }
  if (
    wrongRouteReport.requested.exportSubpath !== badRoute ||
    wrongRouteReport.effective !== null ||
    wrongRouteReport.fallbackRoute !== null
  ) {
    throw new Error('package witness silently replaced an unsupported route');
  }

  const missingPackageDir = join(outputDir, 'missing-package');
  const missingPackage = runWitness(outputDir, [
    '--package-dir',
    missingPackageDir
  ]);
  if (missingPackage.status === 0) {
    throw new Error('package witness accepted a missing package source');
  }
  const missingPackageReport = readReport(outputDir);
  if (
    missingPackageReport.ok !== false ||
    missingPackageReport.failurePhase !== 'validate-config' ||
    missingPackageReport.primaryOutputWritten !== false ||
    missingPackageReport.requested.packageDir !== missingPackageDir
  ) {
    throw new Error('package witness failed to preserve pre-primary failure custody');
  }

  const rerun = runWitness(outputDir);
  if (rerun.status !== 0) {
    throw new Error(
      `package witness was not idempotently re-runnable: ${rerun.stderr || rerun.stdout}`
    );
  }
  const rerunReport = readReport(outputDir);
  if (
    rerunReport.ok !== true ||
    rerunReport.artifactFreshness !== 'built_current_run' ||
    rerunReport.lastTrustworthyEvidence.phase !== 'complete-primary-output'
  ) {
    throw new Error('package witness reused stale evidence on a successful rerun');
  }
} finally {
  rmSync(outputDir, { recursive: true, force: true });
}

process.stdout.write('hill analytic impact package contracts passed\n');
