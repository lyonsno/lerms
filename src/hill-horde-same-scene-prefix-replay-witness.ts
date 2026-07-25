import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { LermHordeProducerHistoryCompositionReceipt } from './lerm-horde-producer-history-composition.js';
import {
  composeHordeTraversalIntoLiveHill,
  type ReviewedHordeTraversalReport,
} from './hill-horde-live-traversal-admission.js';
import { composeLermHordeLiveBodyMotion } from './lerm-horde-live-body-motion.js';
import {
  HILL_HORDE_SAME_SCENE_PREFIX_REPLAY_ROUTE,
  HILL_HORDE_SAME_SCENE_PREFIX_REPLAY_SCHEMA,
  createHillHordeSameScenePrefixReplay,
  renderHillHordeSameScenePrefixReplaySvg,
} from './hill-horde-same-scene-prefix-replay.js';

export const HILL_HORDE_SAME_SCENE_PREFIX_WITNESS_SCHEMA =
  'lerms.hill-of-hills.horde-same-scene-prefix-witness.v0' as const;

type Phase =
  | 'argument-parse'
  | 'input-read'
  | 'source-verification'
  | 'composition'
  | 'render'
  | 'write-primary'
  | 'write-report'
  | 'verify-final-output';

interface CliArgs {
  hordeReport: string | null;
  producerReceipt: string | null;
  hordeRevision: string | null;
  hillRevision: string | null;
  imageOut: string | null;
  reportOut: string | null;
}

interface WitnessRuntime {
  render: typeof renderHillHordeSameScenePrefixReplaySvg;
  sourceIdentity?: () => {
    head: string;
    dirty: string;
    hordeAncestor: (revision: string) => boolean;
    hillAncestor: (revision: string) => boolean;
  };
}

export function runHillHordeSameScenePrefixWitnessCli(
  argv = process.argv.slice(2),
  runtime: WitnessRuntime = {
    render: renderHillHordeSameScenePrefixReplaySvg,
  },
): number {
  let phase: Phase = 'argument-parse';
  let args: CliArgs = looseArgs(argv);
  const evidence: Record<string, unknown> = {};
  const protectedInputs: string[] = [];

  try {
    args = parseArgs(argv);
    const missing = [
      !args.hordeReport && '--horde-report',
      !args.producerReceipt && '--producer-receipt',
      !args.hordeRevision && '--horde-revision',
      !args.hillRevision && '--hill-revision',
      !args.imageOut && '--image-out',
      !args.reportOut && '--report-out',
    ].filter(Boolean);
    if (missing.length > 0) throw new Error(`missing required ${missing.join(', ')}`);
    const complete = args as { [Key in keyof CliArgs]: string };
    const effective = {
      hordeReport: resolve(complete.hordeReport),
      producerReceipt: resolve(complete.producerReceipt),
      imageOut: resolve(complete.imageOut),
      reportOut: resolve(complete.reportOut),
    };
    protectedInputs.push(effective.hordeReport, effective.producerReceipt);
    validateDistinctPaths(Object.values(effective));
    evidence.requested = { ...complete };
    evidence.effective = {
      ...effective,
      hordeRevision: complete.hordeRevision,
      hillRevision: complete.hillRevision,
    };

    phase = 'input-read';
    const hordeReportBytes = readRequiredInput(
      effective.hordeReport,
      'Horde report',
    );
    const producerReceiptBytes = readRequiredInput(
      effective.producerReceipt,
      'producer receipt',
    );
    evidence.input = {
      hordeReportSha256: sha256(hordeReportBytes),
      producerReceiptSha256: sha256(producerReceiptBytes),
      hordeReportByteLength: hordeReportBytes.length,
      producerReceiptByteLength: producerReceiptBytes.length,
    };
    const hordeReport = JSON.parse(
      hordeReportBytes.toString('utf8'),
    ) as ReviewedHordeTraversalReport;
    const producerReceipt = JSON.parse(
      producerReceiptBytes.toString('utf8'),
    ) as LermHordeProducerHistoryCompositionReceipt;

    phase = 'source-verification';
    const sourceIdentity = runtime.sourceIdentity?.() ?? inspectSourceIdentity();
    if (sourceIdentity.dirty) {
      throw new Error(`current same-scene source is dirty: ${sourceIdentity.dirty}`);
    }
    if (!sourceIdentity.hordeAncestor(complete.hordeRevision)) {
      throw new Error(
        `reviewed Horde revision ${complete.hordeRevision} is not an ancestor of current source`,
      );
    }
    if (!sourceIdentity.hillAncestor(complete.hillRevision)) {
      throw new Error(
        `reviewed Hill revision ${complete.hillRevision} is not an ancestor of current source`,
      );
    }
    evidence.source = {
      requestedHordeRevision: complete.hordeRevision,
      requestedHillRevision: complete.hillRevision,
      effectivePresenterRevision: sourceIdentity.head,
      dirty: sourceIdentity.dirty,
      hordeAncestor: true,
      hillAncestor: true,
    };

    phase = 'composition';
    const admission = composeHordeTraversalIntoLiveHill({
      hordeReport,
      producerReceipt,
      producerReceiptSha256: sha256(producerReceiptBytes),
      hordeRevision: complete.hordeRevision,
      hillRevision: complete.hillRevision,
    });
    const motion = composeLermHordeLiveBodyMotion(admission);
    const replay = createHillHordeSameScenePrefixReplay(admission, motion);

    phase = 'render';
    const svg = runtime.render(replay);
    verifySvg(svg);
    const svgSha256 = sha256(svg);

    phase = 'write-primary';
    atomicWrite(effective.imageOut, svg);
    verifyWrittenSvg(effective.imageOut, svgSha256);

    phase = 'write-report';
    const report = {
      ok: true,
      schema: HILL_HORDE_SAME_SCENE_PREFIX_WITNESS_SCHEMA,
      phase: 'complete',
      route: {
        requested: HILL_HORDE_SAME_SCENE_PREFIX_REPLAY_ROUTE,
        effective: replay.route,
      },
      config: {
        requested: admission.hill.requested.configId,
        effective: admission.hill.effective.configId,
      },
      backend: {
        requested: admission.hill.requested.backend,
        effective: admission.hill.effective.backend,
      },
      inputs: {
        requested: { ...complete },
        effective: {
          hordeReport: effective.hordeReport,
          producerReceipt: effective.producerReceipt,
          hordeRevision: admission.source.horde.revision,
          hillRevision: admission.hill.targetRevision,
          presenterRevision: sourceIdentity.head,
        },
        hordeReportSha256: sha256(hordeReportBytes),
        producerReceiptSha256: sha256(producerReceiptBytes),
      },
      replay: {
        schema: HILL_HORDE_SAME_SCENE_PREFIX_REPLAY_SCHEMA,
        evidenceClass: replay.evidenceClass,
        source: replay.source,
        assertions: replay.assertions,
        frames: replay.frames.map((frame) => ({
          index: frame.index,
          kind: frame.kind,
          timestampMs: frame.timestampMs,
          prefixSampleCount: frame.prefixSampleCount,
          actorSequence: frame.actor?.sequence ?? null,
          actorRootWorld: frame.actor?.rootWorld ?? null,
          trafficChecksum:
            frame.terrain.witness.producerTrafficFieldChecksum,
          trafficExposureSeconds:
            frame.terrain.witness.producerTrafficExposureSeconds,
          topologyPossibilityChecksum:
            frame.terrain.witness.topologyPossibilityChecksum,
          liveContactTruth: frame.claimBoundary.liveContactTruth,
        })),
      },
      output: {
        imageOut: effective.imageOut,
        reportOut: effective.reportOut,
        imageSha256: svgSha256,
        width: 1440,
        height: 720,
      },
      visualStatus: 'rendered_uninspected',
      fallbackStatus: replay.fallbackStatus,
      staleStatus: replay.staleStatus,
      partialStatus: replay.partialStatus,
      failurePhase: null,
    };
    atomicWrite(effective.reportOut, `${JSON.stringify(report, null, 2)}\n`);

    phase = 'verify-final-output';
    verifyWrittenSvg(effective.imageOut, svgSha256);
    const finalReport = JSON.parse(readFileSync(effective.reportOut, 'utf8'));
    if (
      finalReport.ok !== true ||
      finalReport.output?.imageSha256 !== svgSha256 ||
      finalReport.replay?.frames?.length !== 8
    ) {
      throw new Error('same-scene witness final report verification failed');
    }
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const failurePath = safeFailureReportPath(args, protectedInputs);
    if (failurePath) {
      try {
        atomicWrite(
          failurePath,
          `${JSON.stringify({
            ok: false,
            schema: HILL_HORDE_SAME_SCENE_PREFIX_WITNESS_SCHEMA,
            phase: 'failed',
            route: {
              requested: HILL_HORDE_SAME_SCENE_PREFIX_REPLAY_ROUTE,
              effective: null,
            },
            failurePhase: phase,
            error: message,
            primaryOutputWritten:
              phase === 'write-report' || phase === 'verify-final-output',
            lastTrustworthyEvidence: evidence,
          }, null, 2)}\n`,
        );
      } catch {
        // stderr remains authoritative when the requested report path is unusable.
      }
    }
    process.stderr.write(`${message}\n`);
    return 1;
  }
}

function looseArgs(argv: readonly string[]): CliArgs {
  return {
    hordeReport: findArgValue(argv, '--horde-report'),
    producerReceipt: findArgValue(argv, '--producer-receipt'),
    hordeRevision: findArgValue(argv, '--horde-revision'),
    hillRevision: findArgValue(argv, '--hill-revision'),
    imageOut: findArgValue(argv, '--image-out'),
    reportOut: findArgValue(argv, '--report-out'),
  };
}

function parseArgs(argv: readonly string[]): CliArgs {
  const known = new Set([
    '--horde-report',
    '--producer-receipt',
    '--horde-revision',
    '--hill-revision',
    '--image-out',
    '--report-out',
  ]);
  if (argv.length % 2 !== 0) {
    throw new Error(`invalid argument sequence near ${argv.at(-1) ?? 'end'}`);
  }
  for (let index = 0; index < argv.length; index += 2) {
    if (
      !known.has(argv[index]) ||
      !argv[index + 1] ||
      argv[index + 1].startsWith('--')
    ) {
      throw new Error(`invalid argument sequence near ${argv[index] ?? 'end'}`);
    }
  }
  return looseArgs(argv);
}

function findArgValue(argv: readonly string[], name: string): string | null {
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] ?? null : null;
}

function readRequiredInput(path: string, label: string): Buffer {
  const bytes = readFileSync(path);
  if (bytes.length === 0) throw new Error(`${label} is blank`);
  return bytes;
}

function inspectSourceIdentity(): {
  head: string;
  dirty: string;
  hordeAncestor: (revision: string) => boolean;
  hillAncestor: (revision: string) => boolean;
} {
  const git = (args: readonly string[]) =>
    execFileSync('git', args, { encoding: 'utf8' }).trim();
  const isAncestor = (revision: string) => {
    try {
      execFileSync('git', ['merge-base', '--is-ancestor', revision, 'HEAD'], {
        stdio: 'ignore',
      });
      return true;
    } catch {
      return false;
    }
  };
  return {
    head: git(['rev-parse', 'HEAD']),
    dirty: git(['status', '--porcelain=v1']),
    hordeAncestor: isAncestor,
    hillAncestor: isAncestor,
  };
}

function validateDistinctPaths(paths: readonly string[]): void {
  for (const path of paths) {
    if (existsSync(path) && lstatSync(path).isSymbolicLink()) {
      throw new Error(`input and output leaves must not be symbolic links: ${path}`);
    }
  }
  for (let left = 0; left < paths.length; left += 1) {
    for (let right = left + 1; right < paths.length; right += 1) {
      if (pathsAlias(paths[left], paths[right])) {
        throw new Error(`input and output paths must be distinct: ${paths[left]}`);
      }
    }
  }
}

function pathsAlias(left: string, right: string): boolean {
  if (resolve(left) === resolve(right)) return true;
  if (!existsSync(left) || !existsSync(right)) return false;
  return realpathSync(left) === realpathSync(right);
}

function safeFailureReportPath(
  args: CliArgs,
  protectedInputs: readonly string[],
): string | null {
  if (!args.reportOut) return null;
  const candidate = resolve(args.reportOut);
  if (
    protectedInputs.some(
      (input) => pathsAlias(candidate, input) || resolve(input) === candidate,
    )
  ) {
    return null;
  }
  return candidate;
}

function verifySvg(svg: string): void {
  if (
    !svg.startsWith('<svg ') ||
    svg.length < 20_000 ||
    (svg.match(/data-same-scene="true"/g) ?? []).length !== 8 ||
    (svg.match(/data-actual-hill-terrain="true"/g) ?? []).length !== 8 ||
    (svg.match(/data-visible-lerm-body="true"/g) ?? []).length !== 6
  ) {
    throw new Error('same-scene primary output is missing, blank, or partial');
  }
}

function atomicWrite(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}`;
  writeFileSync(temporary, content);
  renameSync(temporary, path);
}

function verifyWrittenSvg(path: string, expectedSha256: string): void {
  if (!existsSync(path) || !statSync(path).isFile()) {
    throw new Error('same-scene witness primary output is missing');
  }
  const bytes = readFileSync(path);
  if (bytes.length < 20_000 || sha256(bytes) !== expectedSha256) {
    throw new Error('same-scene witness primary output is blank, partial, or changed');
  }
}

function sha256(bytes: string | Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

const isMain =
  process.argv[1] !== undefined &&
  realpathSync(resolve(process.argv[1])) ===
    realpathSync(fileURLToPath(import.meta.url));
if (isMain) process.exitCode = runHillHordeSameScenePrefixWitnessCli();
