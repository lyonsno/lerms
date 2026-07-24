import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  LERM_HORDE_PRODUCER_HISTORY_RECEIPT_SCHEMA,
  LERM_HORDE_PRODUCER_REVISION,
  composeLermHordeProducerHistory,
  type LermHordeProducerModule
} from './lerm-horde-producer-history-composition.js';

type CliArgs = {
  out: string | null;
  lermsRepoRoot: string | null;
  producerRepoRoot: string | null;
  producerModule: string;
  registration: string;
};

type FailurePhase =
  | 'argument-parse'
  | 'input-validation'
  | 'source-identity'
  | 'producer-load'
  | 'composition'
  | 'write-output';

const EXPECTED_PRODUCER_BRANCH = 'cc/mushfinger-motion-ready-719024-0720';
const EXPECTED_LERMS_BRANCH = 'cc/lerm-horde-live-producer-history-0723';

export async function runLermHordeProducerHistoryWitnessCli(
  argv = process.argv.slice(2)
): Promise<number> {
  let args: CliArgs = {
    out: findArgValue(argv, '--out'),
    lermsRepoRoot: null,
    producerRepoRoot: null,
    producerModule: 'motion-ready-719024-core.js',
    registration: 'artifacts/motion-ready-719024/registration.json'
  };
  let phase: FailurePhase = 'argument-parse';
  const evidence: Record<string, unknown> = {};

  try {
    args = parseArgs(argv);
    phase = 'input-validation';
    if (!args.out) throw new Error('missing required --out path');
    if (!args.lermsRepoRoot) throw new Error('missing required --lerms-repo-root path');
    if (!args.producerRepoRoot) throw new Error('missing required --producer-repo-root path');

    const lermsRepoRoot = realpathSync(args.lermsRepoRoot);
    const producerRepoRoot = realpathSync(args.producerRepoRoot);
    const producerModulePath = resolveOwnedPath(
      producerRepoRoot,
      args.producerModule,
      'producer module'
    );
    const registrationPath = resolveOwnedPath(
      producerRepoRoot,
      args.registration,
      'producer registration'
    );
    evidence.requested = {
      lermsRepoRoot: args.lermsRepoRoot,
      producerRepoRoot: args.producerRepoRoot,
      producerModule: args.producerModule,
      registration: args.registration
    };
    evidence.effective = {
      lermsRepoRoot,
      producerRepoRoot,
      producerModulePath,
      registrationPath
    };

    phase = 'source-identity';
    const lermsRevision = git(lermsRepoRoot, 'rev-parse', 'HEAD');
    const lermsBranch = git(lermsRepoRoot, 'branch', '--show-current');
    const lermsDirty = git(lermsRepoRoot, 'status', '--porcelain');
    const producerRevision = git(producerRepoRoot, 'rev-parse', 'HEAD');
    const producerCheckoutBranch = readCurrentGitBranch(producerRepoRoot);
    const expectedProducerRevision = LERM_HORDE_PRODUCER_REVISION;
    const dirtyProducerInputs = git(
      producerRepoRoot,
      'status',
      '--porcelain',
      '--',
      relative(producerRepoRoot, producerModulePath),
      relative(producerRepoRoot, registrationPath)
    );
    evidence.git = {
      lermsBranch,
      lermsRevision,
      lermsDirty,
      expectedProducerBranch: EXPECTED_PRODUCER_BRANCH,
      producerCheckoutBranch,
      producerRevision,
      expectedProducerRevision,
      dirtyProducerInputs
    };
    if (lermsBranch !== EXPECTED_LERMS_BRANCH) {
      throw new Error(`LERMS branch must be ${EXPECTED_LERMS_BRANCH}`);
    }
    if (lermsDirty) {
      throw new Error('LERMS witness checkout must be clean so its revision names the executed source');
    }
    if (producerRevision !== expectedProducerRevision) {
      throw new Error(`producer checkout must be exact ${LERM_HORDE_PRODUCER_REVISION}`);
    }
    if (!producerCheckoutBranch) {
      throw new Error('producer checkout must expose an observed branch identity');
    }
    if (dirtyProducerInputs) {
      throw new Error('producer module and registration inputs must be clean');
    }

    const moduleBytes = readFileSync(producerModulePath);
    const producerModuleSha256 = createHash('sha256').update(moduleBytes).digest('hex');
    evidence.producerModuleSha256 = producerModuleSha256;

    phase = 'producer-load';
    const producerModule = await import(pathToFileURL(producerModulePath).href) as LermHordeProducerModule;
    const registration = JSON.parse(readFileSync(registrationPath, 'utf8'));

    phase = 'composition';
    const receipt = await composeLermHordeProducerHistory({
      producerModule,
      registration,
      lermsRevision,
      producerBranch: EXPECTED_PRODUCER_BRANCH,
      producerCheckoutBranch,
      producerRevision: LERM_HORDE_PRODUCER_REVISION,
      producerModuleSha256
    });

    phase = 'write-output';
    writeJson(args.out, {
      ...receipt,
      sourceIdentity: evidence
    });
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (args.out) {
      writeJson(args.out, {
        ok: false,
        schema: LERM_HORDE_PRODUCER_HISTORY_RECEIPT_SCHEMA,
        phase: 'failed',
        failurePhase: phase,
        error: message,
        fallbackStatus: 'none',
        staleStatus: 'unverified',
        partialStatus: 'failed-before-complete-receipt',
        lastTrustworthyEvidence: evidence
      });
    }
    process.stderr.write(`${message}\n`);
    return 1;
  }
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    out: null,
    lermsRepoRoot: null,
    producerRepoRoot: null,
    producerModule: 'motion-ready-719024-core.js',
    registration: 'artifacts/motion-ready-719024/registration.json'
  };
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key.startsWith('--')) throw new Error(`unexpected positional argument ${key}`);
    if (value === undefined || value.startsWith('--')) {
      throw new Error(`missing value for ${key}`);
    }
    if (key === '--out') args.out = value;
    else if (key === '--lerms-repo-root') args.lermsRepoRoot = value;
    else if (key === '--producer-repo-root') args.producerRepoRoot = value;
    else if (key === '--producer-module') args.producerModule = value;
    else if (key === '--registration') args.registration = value;
    else throw new Error(`unknown argument ${key}`);
    index += 1;
  }
  return args;
}

function findArgValue(argv: string[], key: string): string | null {
  const index = argv.indexOf(key);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : null;
}

function resolveOwnedPath(repoRoot: string, input: string, label: string): string {
  const candidate = realpathSync(isAbsolute(input) ? input : join(repoRoot, input));
  const relativePath = relative(repoRoot, candidate);
  if (relativePath.startsWith('..') || isAbsolute(relativePath)) {
    throw new Error(`${label} must resolve inside its explicit producer repo root`);
  }
  return candidate;
}

function git(repoRoot: string, ...args: string[]): string {
  return execFileSync('git', ['-C', repoRoot, ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  }).trim();
}

export function readCurrentGitBranch(repoRoot: string): string {
  return git(repoRoot, 'branch', '--show-current');
}

function writeJson(path: string, payload: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(payload, null, 2)}\n`);
}

const currentModulePath = fileURLToPath(import.meta.url);

if (
  process.argv[1] &&
  realpathSync(process.argv[1]) === realpathSync(currentModulePath)
) {
  process.exitCode = await runLermHordeProducerHistoryWitnessCli();
}
