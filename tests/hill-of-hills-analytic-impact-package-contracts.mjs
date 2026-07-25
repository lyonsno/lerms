import { spawnSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

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

function runCommand(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8'
  });
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(' ')} failed: ${result.stderr || result.stdout}`
    );
  }
  return result.stdout.trim();
}

const testRoot = mkdtempSync(
  join(tmpdir(), 'lerms-hill-impact-package-contract-')
);
const outputDir = join(testRoot, 'output');
const fixtureRoot = join(testRoot, 'fixture-repo');
const fixturePackageDir = join(
  fixtureRoot,
  'packages',
  'hill-of-hills-support'
);
mkdirSync(fixturePackageDir, { recursive: true });
cpSync(packageManifest, join(fixturePackageDir, 'package.json'));
const packageTsconfig = resolve(
  'packages/hill-of-hills-support/tsconfig.json'
);
cpSync(packageTsconfig, join(fixturePackageDir, 'tsconfig.json'));
const tsconfig = JSON.parse(readFileSync(packageTsconfig, 'utf8'));
for (const file of tsconfig.files) {
  const source = resolve(dirname(packageTsconfig), file);
  const target = resolve(fixturePackageDir, file);
  mkdirSync(dirname(target), { recursive: true });
  cpSync(source, target);
}
symlinkSync(resolve('node_modules'), join(fixtureRoot, 'node_modules'), 'dir');
runCommand('git', ['init', '-q'], fixtureRoot);
runCommand('git', ['config', 'user.name', 'Hill Package Contract'], fixtureRoot);
runCommand(
  'git',
  ['config', 'user.email', 'hill-package-contract@example.invalid'],
  fixtureRoot
);
runCommand('git', ['add', '.'], fixtureRoot);
runCommand('git', ['commit', '-q', '-m', 'fixture package source'], fixtureRoot);
const fixtureRevision = runCommand('git', ['rev-parse', 'HEAD'], fixtureRoot);

function runWitness(outputDir, extraArgs = []) {
  return spawnSync(
    process.execPath,
    [
      witnessPath,
      '--output-dir',
      outputDir,
      '--package-dir',
      fixturePackageDir,
      '--source-revision',
      fixtureRevision,
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
    successReport.requested.sourceRevision !== fixtureRevision ||
    successReport.effective.sourceRevision !== fixtureRevision ||
    successReport.effective.repositoryHead !== fixtureRevision ||
    !/^[0-9a-f]{64}$/.test(successReport.effective.sourceTreeSha256) ||
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

  const falseRevision = 'b'.repeat(40);
  const wrongRevision = runWitness(outputDir, [
    '--source-revision',
    falseRevision
  ]);
  if (wrongRevision.status === 0) {
    throw new Error('package witness accepted a claimed revision different from package source HEAD');
  }
  const wrongRevisionReport = readReport(outputDir);
  if (
    wrongRevisionReport.ok !== false ||
    wrongRevisionReport.failurePhase !== 'validate-source-identity' ||
    wrongRevisionReport.primaryOutputWritten !== false ||
    wrongRevisionReport.artifactFreshness !== 'not_built' ||
    wrongRevisionReport.requested.sourceRevision !== falseRevision
  ) {
    throw new Error('package witness did not fail loud on claimed-revision substitution');
  }
  if (existsSync(successReport.artifact.path)) {
    throw new Error('package witness retained stale primary output after source-identity failure');
  }

  const fixtureAnalyticSource = resolve(
    fixturePackageDir,
    '../../src/terrain/hill-of-hills-analytic-impact-support.ts'
  );
  const cleanAnalyticSource = readFileSync(fixtureAnalyticSource, 'utf8');
  writeFileSync(
    fixtureAnalyticSource,
    `${cleanAnalyticSource}\n// dirty source must not inherit committed identity\n`
  );
  const dirtySource = runWitness(outputDir);
  writeFileSync(fixtureAnalyticSource, cleanAnalyticSource);
  if (dirtySource.status === 0) {
    throw new Error('package witness accepted dirty package-relevant source');
  }
  const dirtySourceReport = readReport(outputDir);
  if (
    dirtySourceReport.ok !== false ||
    dirtySourceReport.failurePhase !== 'validate-source-identity' ||
    dirtySourceReport.primaryOutputWritten !== false ||
    dirtySourceReport.artifactFreshness !== 'not_built'
  ) {
    throw new Error('package witness did not fail loud on dirty source substitution');
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
  rmSync(testRoot, { recursive: true, force: true });
}

process.stdout.write('hill analytic impact package contracts passed\n');
