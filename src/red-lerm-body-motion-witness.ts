import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  RED_LERM_BODY_MOTION_SCHEMA,
  type RedLermSourceKind,
  buildRedLermBodyMotionWitness,
} from './red-lerm-body-motion.ts';

type CliArgs = {
  out: string | null;
  fixtureId: string;
  requestedKind: string;
  requestedId: string;
  requestedRoute: string;
};

const SOURCE_KINDS: RedLermSourceKind[] = ['fixture', 'authored', 'generated', 'live'];

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    out: null,
    fixtureId: 'red-lerm-state-spine-fixture-v0',
    requestedKind: 'fixture',
    requestedId: 'red-lerm-state-spine-fixture-v0',
    requestedRoute: 'lerms/red-lerm-body-motion/fixture',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1];

    if (!key.startsWith('--')) {
      continue;
    }

    if (value === undefined || value.startsWith('--')) {
      throw new Error(`missing value for ${key}`);
    }

    if (key === '--out') args.out = value;
    else if (key === '--fixture-id') args.fixtureId = value;
    else if (key === '--requested-kind') args.requestedKind = value;
    else if (key === '--requested-id') args.requestedId = value;
    else if (key === '--requested-route') args.requestedRoute = value;
    else throw new Error(`unknown argument ${key}`);

    index += 1;
  }

  return args;
}

function writeJson(path: string, payload: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(payload, null, 2)}\n`);
}

function isSourceKind(value: string): value is RedLermSourceKind {
  return SOURCE_KINDS.includes(value as RedLermSourceKind);
}

export function runRedLermBodyMotionWitnessCli(argv = process.argv.slice(2)): number {
  let args: CliArgs;

  try {
    args = parseArgs(argv);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    return 1;
  }

  if (!args.out) {
    process.stderr.write('missing required --out path\n');
    return 1;
  }

  if (!isSourceKind(args.requestedKind)) {
    writeJson(args.out, {
      ok: false,
      schema: RED_LERM_BODY_MOTION_SCHEMA,
      phase: 'validating-args',
      failureKind: 'invalid-requested-kind',
      requestedKind: args.requestedKind,
      allowedKinds: SOURCE_KINDS,
      lastTrustworthyEvidence: {
        outputPath: args.out,
      },
    });
    return 1;
  }

  const witness = buildRedLermBodyMotionWitness({
    fixtureId: args.fixtureId,
    requestedMotionSource: {
      kind: args.requestedKind,
      id: args.requestedId,
      route: args.requestedRoute,
    },
    availableMotionSources:
      args.requestedKind === 'fixture'
        ? [
            {
              kind: args.requestedKind,
              id: args.requestedId,
              route: args.requestedRoute,
            },
          ]
        : [],
  });

  writeJson(args.out, {
    ok: true,
    schema: RED_LERM_BODY_MOTION_SCHEMA,
    phase: 'complete',
    outputPath: args.out,
    witness,
  });

  return 0;
}

const currentModulePath = fileURLToPath(import.meta.url);

if (process.argv[1] === currentModulePath) {
  process.exitCode = runRedLermBodyMotionWitnessCli();
}
