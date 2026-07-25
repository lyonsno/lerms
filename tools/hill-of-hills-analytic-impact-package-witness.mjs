import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve
} from 'node:path';

const EXACT_EXPORT_SUBPATH = './hill-of-hills/analytic-impact-support';
const REQUIRED_EXPORTS = [
  'createHillAnalyticImpactSupportQuery',
  'HILL_ANALYTIC_IMPACT_SUPPORT_ROUTE',
  'HILL_ANALYTIC_IMPACT_SUPPORT_SCHEMA'
];

function parseArgs(argv) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (!key.startsWith('--')) {
      throw new Error(`unexpected positional argument: ${key}`);
    }
    const value = argv[index + 1];
    if (value === undefined || value.startsWith('--')) {
      throw new Error(`missing value for ${key}`);
    }
    values.set(key, value);
    index += 1;
  }
  const outputDir = values.get('--output-dir');
  if (!outputDir) {
    throw new Error('--output-dir is required');
  }
  return {
    outputDir: resolve(outputDir),
    packageDir: resolve(values.get('--package-dir') ?? 'packages/hill-of-hills-support'),
    exportSubpath: values.get('--export-subpath') ?? EXACT_EXPORT_SUBPATH,
    sourceRevision: values.get('--source-revision') ?? gitHead()
  };
}

function gitHead() {
  return execFileSync('git', ['rev-parse', 'HEAD'], {
    encoding: 'utf8'
  }).trim();
}

function digest(algorithm, bytes) {
  return createHash(algorithm).update(bytes).digest();
}

function git(cwd, args) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  }).trim();
}

function packageSourceIdentity(packageDir, sourceRevision) {
  if (!/^[0-9a-f]{40}$/i.test(sourceRevision)) {
    throw new Error('requested source revision must be an exact Git revision');
  }
  const repositoryRoot = realpathSync(
    git(packageDir, ['rev-parse', '--show-toplevel'])
  );
  const repositoryHead = git(repositoryRoot, ['rev-parse', 'HEAD']);
  if (repositoryHead !== sourceRevision) {
    throw new Error(
      `requested source revision ${sourceRevision} differs from package repository HEAD ${repositoryHead}`
    );
  }
  const manifestPath = join(packageDir, 'package.json');
  const tsconfigPath = join(packageDir, 'tsconfig.json');
  if (!existsSync(tsconfigPath)) {
    throw new Error(`package TypeScript config does not exist: ${tsconfigPath}`);
  }
  const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf8'));
  if (!Array.isArray(tsconfig.files) || tsconfig.files.length === 0) {
    throw new Error('package TypeScript config must name exact source files');
  }
  const sourcePaths = [
    manifestPath,
    tsconfigPath,
    ...tsconfig.files.map((path) => resolve(packageDir, path))
  ].map((path) => realpathSync(path));
  const repositoryPaths = sourcePaths.map((path) => {
    const repositoryPath = relative(repositoryRoot, path);
    if (
      repositoryPath.length === 0 ||
      repositoryPath === '..' ||
      repositoryPath.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`)
    ) {
      throw new Error(`package source escapes its repository: ${path}`);
    }
    return repositoryPath;
  });
  git(repositoryRoot, [
    'ls-files',
    '--error-unmatch',
    '--',
    ...repositoryPaths
  ]);
  const dirty = git(repositoryRoot, [
    'status',
    '--porcelain=v1',
    '--untracked-files=all',
    '--',
    ...repositoryPaths
  ]);
  if (dirty.length > 0) {
    throw new Error(`package-relevant source is dirty:\n${dirty}`);
  }
  const sourceTreeSha256 = packageSourceTreeSha256(
    repositoryRoot,
    repositoryPaths
  );
  return {
    repositoryRoot,
    repositoryHead,
    repositoryPaths: Object.freeze([...repositoryPaths].sort()),
    sourceTreeSha256
  };
}

function packageSourceTreeSha256(repositoryRoot, repositoryPaths) {
  const hash = createHash('sha256');
  for (const repositoryPath of [...repositoryPaths].sort()) {
    const bytes = readFileSync(join(repositoryRoot, repositoryPath));
    hash.update(repositoryPath);
    hash.update('\0');
    hash.update(String(bytes.length));
    hash.update('\0');
    hash.update(bytes);
    hash.update('\0');
  }
  return hash.digest('hex');
}

function writeReport(reportPath, report) {
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
}

let config;
try {
  config = parseArgs(process.argv.slice(2));
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 2;
}

if (config) {
  mkdirSync(config.outputDir, { recursive: true });
  const reportPath = join(config.outputDir, 'report.json');
  const report = {
    schema: 'lerms.hill-of-hills.analytic-impact-package-witness.v1',
    ok: false,
    failurePhase: 'validate-config',
    primaryOutputWritten: false,
    lastTrustworthyEvidence: {
      phase: 'argument-parse'
    },
    requested: {
      packageDir: config.packageDir,
      exportSubpath: config.exportSubpath,
      outputDir: config.outputDir,
      sourceRevision: config.sourceRevision
    },
    effective: null,
    artifact: null,
    fallbackRoute: null,
    artifactFreshness: 'not_built'
  };
  writeReport(reportPath, report);
  let consumerDir;

  try {
    if (!existsSync(config.packageDir)) {
      throw new Error(`package directory does not exist: ${config.packageDir}`);
    }
    const manifestPath = join(config.packageDir, 'package.json');
    if (!existsSync(manifestPath)) {
      throw new Error(`package manifest does not exist: ${manifestPath}`);
    }
    report.failurePhase = 'validate-package-route';
    report.lastTrustworthyEvidence = {
      phase: 'package-manifest-read',
      manifestPath
    };
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    const expectedTarballName = `${manifest.name
      .replace(/^@/, '')
      .replace('/', '-')}-${manifest.version}.tgz`;
    const expectedTarballPath = join(config.outputDir, expectedTarballName);
    rmSync(expectedTarballPath, { force: true });
    const exportEntry = manifest.exports?.[config.exportSubpath];
    const effectiveImport = exportEntry?.import;
    if (typeof effectiveImport !== 'string') {
      throw new Error(`requested export subpath is not published: ${config.exportSubpath}`);
    }
    report.failurePhase = 'validate-source-identity';
    const sourceIdentity = packageSourceIdentity(
      config.packageDir,
      config.sourceRevision
    );
    report.effective = {
      packageName: manifest.name,
      packageVersion: manifest.version,
      exportSubpath: config.exportSubpath,
      importTarget: effectiveImport,
      packageCoordinate: `${manifest.name}${config.exportSubpath.slice(1)}`,
      sourceRevision: sourceIdentity.repositoryHead,
      repositoryRoot: sourceIdentity.repositoryRoot,
      repositoryHead: sourceIdentity.repositoryHead,
      repositoryPaths: sourceIdentity.repositoryPaths,
      sourceTreeSha256: sourceIdentity.sourceTreeSha256
    };
    report.lastTrustworthyEvidence = {
      phase: 'package-source-identity-verified',
      sourceRevision: sourceIdentity.repositoryHead,
      sourceTreeSha256: sourceIdentity.sourceTreeSha256
    };
    writeReport(reportPath, report);

    report.failurePhase = 'build-package';
    execFileSync('npm', ['run', 'build'], {
      cwd: config.packageDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    const postBuildSourceTreeSha256 = packageSourceTreeSha256(
      sourceIdentity.repositoryRoot,
      sourceIdentity.repositoryPaths
    );
    if (postBuildSourceTreeSha256 !== sourceIdentity.sourceTreeSha256) {
      throw new Error('package-relevant source changed during build');
    }

    report.failurePhase = 'pack-package';
    const packOutput = execFileSync(
      'npm',
      ['pack', '--json', '--pack-destination', config.outputDir],
      {
        cwd: config.packageDir,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe']
      }
    );
    const packRows = JSON.parse(packOutput);
    const packedFilename = packRows?.[0]?.filename;
    if (typeof packedFilename !== 'string') {
      throw new Error('npm pack did not report a package filename');
    }
    const tarballPath = isAbsolute(packedFilename)
      ? packedFilename
      : join(config.outputDir, basename(packedFilename));
    if (!existsSync(tarballPath) || statSync(tarballPath).size <= 0) {
      throw new Error('npm pack did not produce a nonblank package artifact');
    }
    const bytes = readFileSync(tarballPath);
    const sha256 = digest('sha256', bytes).toString('hex');
    const integrity = `sha512-${digest('sha512', bytes).toString('base64')}`;
    report.primaryOutputWritten = true;
    report.artifactFreshness = 'built_current_run';
    report.artifact = {
      path: tarballPath,
      filename: basename(tarballPath),
      byteLength: bytes.length,
      sha256,
      integrity
    };
    report.lastTrustworthyEvidence = {
      phase: 'package-artifact-hashed',
      sha256,
      byteLength: bytes.length
    };

    report.failurePhase = 'clean-install-consumer';
    consumerDir = mkdtempSync(join(tmpdir(), 'lerms-hill-impact-consumer-'));
    writeFileSync(
      join(consumerDir, 'package.json'),
      `${JSON.stringify({ private: true, type: 'module' }, null, 2)}\n`
    );
    execFileSync(
      'npm',
      ['install', '--ignore-scripts', '--no-audit', '--no-fund', tarballPath],
      {
        cwd: consumerDir,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe']
      }
    );
    const consumerPath = join(consumerDir, 'consumer.mjs');
    writeFileSync(
      consumerPath,
      [
        `import * as support from ${JSON.stringify(report.effective.packageCoordinate)};`,
        'process.stdout.write(JSON.stringify(Object.keys(support).sort()));'
      ].join('\n')
    );
    const exportedNames = JSON.parse(
      execFileSync(process.execPath, [consumerPath], {
        cwd: consumerDir,
        encoding: 'utf8'
      })
    );
    for (const name of REQUIRED_EXPORTS) {
      if (!exportedNames.includes(name)) {
        throw new Error(`clean-installed package is missing required export: ${name}`);
      }
    }

    report.failurePhase = null;
    report.ok = true;
    report.exportedNames = exportedNames;
    report.lastTrustworthyEvidence = {
      phase: 'complete-primary-output',
      packageCoordinate: report.effective.packageCoordinate,
      sha256: report.artifact.sha256
    };
  } catch (error) {
    report.error = error instanceof Error ? error.message : String(error);
    process.exitCode = 1;
  } finally {
    writeReport(reportPath, report);
    if (consumerDir) {
      rmSync(consumerDir, { recursive: true, force: true });
    }
  }
}
