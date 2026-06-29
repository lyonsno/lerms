import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildGoinGloveWealthWitnessReport,
  type GoinGloveWealthWitnessReport
} from './goin-glove-wealth-witness.ts';
import {
  buildGloveWellThrowPhysicsWitnessReport,
  type GloveWellThrowPhysicsWitnessReport
} from './glove-well-throw-physics-witness.ts';
import {
  assertFirstVerticalFrame,
  summarizeFirstVerticalFrame,
  type FirstVerticalFrame,
  type FirstVerticalSummary,
  type GoinState,
  type LermState,
  type SimulationAuthority,
  type SourceTruth,
  type Vec3
} from './contracts/first-vertical.ts';
import {
  evaluateFirstVerticalSourceTruthUpgrade,
  type FirstVerticalSourceTruthUpgradeEvaluation
} from './contracts/first-vertical-source-truth-upgrade.ts';

export const GOIN_ECOLOGY_MERGE_WITNESS_SCHEMA = 'lerms.goin-ecology-merge-witness.v0' as const;
export const GOIN_ECOLOGY_MERGE_WITNESS_ROUTE = 'lerms/goin-ecology-merge/witness-file' as const;
export const GOIN_ECOLOGY_MERGE_ROUTE = 'lerms/goin-ecology-merge' as const;

interface CliArgs {
  report: string | null;
  frameId: string;
  timestampMs: number;
  sampleAgeMs: number;
  maxSampleAgeMs: number;
}

interface SharedDesireHint {
  schema: 'lerms.goin-shared-desire-hint.v0';
  source: SourceTruth;
  lermId: string;
  targetGoinId: string;
  chosenTargetGoinId: string;
  candidateGoinIds: string[];
  distanceToGoin: number;
  rerouteRadius: number;
  desireStrength: number;
  desiredHeading: Vec3;
  reason: 'carrier_drop_desire' | 'thrown_sacrifice_desire';
}

interface EcologySourceTruthSummary {
  effectiveAuthority: SimulationAuthority;
  frameAuthority: SimulationAuthority;
  carrierDropAuthority: SimulationAuthority;
  throwAuthority: SimulationAuthority;
  deterministicEcologyAuthority: SimulationAuthority;
  downgrades: string[];
  sourceRoutes: string[];
  maxSampleAgeMs: number;
}

interface EcologyCarrierDropChain {
  hitId: string;
  dropId: string;
  lermId: string;
  carriedGoinId: string;
  droppedGoinId: string;
  postDropGoinState: 'rolling';
}

interface EcologyThrowChain {
  releaseEventId: string;
  sourceInputFrameId: string;
  rollingGoinId: string;
  phaseTrace: string;
  bounceCount: number;
}

interface EcologyFakeBoundary {
  liveOperatorCameraSmoke: true;
  sidecarProcessManager: true;
  finalGoinMesh: true;
  fullCrowdAi: true;
  finalTreasureEconomy: true;
  fullFirstVerticalSuccess: true;
}

export interface GoinEcologyMergeWitnessReport {
  ok: true;
  schema: typeof GOIN_ECOLOGY_MERGE_WITNESS_SCHEMA;
  route: typeof GOIN_ECOLOGY_MERGE_WITNESS_ROUTE;
  outputPath: string;
  frameId: string;
  timestampMs: number;
  sourceTruth: EcologySourceTruthSummary;
  sourceTruthEvaluation: FirstVerticalSourceTruthUpgradeEvaluation;
  frame: FirstVerticalFrame;
  summary: FirstVerticalSummary;
  carrierDropChain: EcologyCarrierDropChain;
  throwChain: EcologyThrowChain;
  rollingGoinIds: string[];
  sharedDesireHints: SharedDesireHint[];
  sourceReports: {
    carrierDropObjecthood: GoinGloveWealthWitnessReport;
    throwPhysics: GloveWellThrowPhysicsWitnessReport;
  };
  whatRemainsFake: EcologyFakeBoundary;
}

interface FailureReport {
  ok: false;
  schema: typeof GOIN_ECOLOGY_MERGE_WITNESS_SCHEMA;
  route: typeof GOIN_ECOLOGY_MERGE_WITNESS_ROUTE;
  phase: 'building-goin-ecology-merge-witness';
  failureKind: 'goin-ecology-merge-invalid';
  error: string;
  lastTrustworthyEvidence: {
    outputPath: string;
    frameId: string;
    timestampMs: number;
    sampleAgeMs: number;
    maxSampleAgeMs: number;
  };
}

export interface BuildGoinEcologyMergeWitnessOptions {
  outputPath: string;
  frameId?: string;
  timestampMs?: number;
  sampleAgeMs?: number;
  maxSampleAgeMs?: number;
}

export function buildGoinEcologyMergeWitnessReport({
  outputPath,
  frameId = 'goin-ecology-merge-witness',
  timestampMs = 0,
  sampleAgeMs = 0,
  maxSampleAgeMs = 500
}: BuildGoinEcologyMergeWitnessOptions): GoinEcologyMergeWitnessReport {
  assertFinite(timestampMs, 'timestampMs');
  assertFinite(sampleAgeMs, 'sampleAgeMs');
  assertFinite(maxSampleAgeMs, 'maxSampleAgeMs');

  const carrierDropObjecthood = buildGoinGloveWealthWitnessReport({
    outputPath: `${outputPath}#carrier-drop-objecthood`,
    frameId: `${frameId}-carrier-drop-objecthood`,
    timestampMs,
    sampleAgeMs,
    maxSampleAgeMs
  });
  const throwPhysics = buildGloveWellThrowPhysicsWitnessReport({
    outputPath: `${outputPath}#throw-physics`,
    frameId: `${frameId}-throw-physics`,
    timestampMs: timestampMs + 40,
    sampleAgeMs,
    maxSampleAgeMs
  });
  const source = createSource(frameId, timestampMs, sampleAgeMs, 'synthetic_fixture');
  const frame: FirstVerticalFrame = {
    schema: 'lerms.first-vertical-frame.v0',
    source,
    terrainSamples: [...carrierDropObjecthood.frame.terrainSamples, ...throwPhysics.frame.terrainSamples],
    lerms: [...carrierDropObjecthood.frame.lerms, ...throwPhysics.frame.lerms],
    goins: [...carrierDropObjecthood.frame.goins, ...throwPhysics.frame.goins],
    juiceHits: carrierDropObjecthood.frame.juiceHits,
    carrierDropEvents: carrierDropObjecthood.frame.carrierDropEvents
  };
  assertFirstVerticalFrame(frame);

  const rollingGoinIds = frame.goins.filter((goin) => goin.state === 'rolling').map((goin) => goin.id);
  const sharedDesireHints = buildSharedDesireHints(createSource(`${frameId}:desire`, timestampMs, sampleAgeMs, 'live_simulation'), frame);
  const sourceTruthEvaluation = evaluateFirstVerticalSourceTruthUpgrade(frame, { maxSampleAgeMs });
  const throwPhaseTrace = throwPhysics.trajectory.map((sample) => sample.phase).join('>');

  return {
    ok: true,
    schema: GOIN_ECOLOGY_MERGE_WITNESS_SCHEMA,
    route: GOIN_ECOLOGY_MERGE_WITNESS_ROUTE,
    outputPath,
    frameId,
    timestampMs,
    sourceTruth: {
      effectiveAuthority: sourceTruthEvaluation.effectiveAuthority,
      frameAuthority: frame.source.authority,
      carrierDropAuthority: carrierDropObjecthood.frame.source.authority,
      throwAuthority: throwPhysics.frame.source.authority,
      deterministicEcologyAuthority: 'live_simulation',
      downgrades: [
        'merged_frame_not_full_vertical_acceptance',
        'saved_or_fixture_throw_transport_not_full_vertical_truth',
        'operator_camera_sidecar_not_witnessed',
        'preview_bench_transport_not_source_authority'
      ],
      sourceRoutes: unique([
        carrierDropObjecthood.route,
        carrierDropObjecthood.frame.source.route,
        throwPhysics.route,
        throwPhysics.frame.source.route,
        GOIN_ECOLOGY_MERGE_ROUTE
      ]),
      maxSampleAgeMs
    },
    sourceTruthEvaluation,
    frame,
    summary: summarizeFirstVerticalFrame(frame),
    carrierDropChain: {
      hitId: carrierDropObjecthood.carrierDropChain.hitId,
      dropId: carrierDropObjecthood.carrierDropChain.dropId,
      lermId: carrierDropObjecthood.carrierDropChain.lermId,
      carriedGoinId: carrierDropObjecthood.carrierDropChain.preHitCarrierSnapshot.carryingGoinId,
      droppedGoinId: carrierDropObjecthood.carrierDropChain.rollingGoinId,
      postDropGoinState: carrierDropObjecthood.carrierDropChain.postDropGoinState
    },
    throwChain: {
      releaseEventId: throwPhysics.sourceTruth.releaseEventId,
      sourceInputFrameId: throwPhysics.sourceTruth.sourceInputFrameId,
      rollingGoinId: required(throwPhysics.frame.goins.find((goin) => goin.state === 'rolling'), 'throw rolling goin').id,
      phaseTrace: throwPhaseTrace,
      bounceCount: throwPhysics.bounceContacts.length
    },
    rollingGoinIds,
    sharedDesireHints,
    sourceReports: {
      carrierDropObjecthood,
      throwPhysics
    },
    whatRemainsFake: {
      liveOperatorCameraSmoke: true,
      sidecarProcessManager: true,
      finalGoinMesh: true,
      fullCrowdAi: true,
      finalTreasureEconomy: true,
      fullFirstVerticalSuccess: true
    }
  };
}

export function runGoinEcologyMergeWitnessCli(argv = process.argv.slice(2)): number {
  const partialArgs = readPartialArgs(argv);
  let args: CliArgs;

  try {
    args = parseArgs(argv);
  } catch (error) {
    process.stderr.write(`${messageFor(error)}\n`);
    if (partialArgs.report) writeJson(partialArgs.report, buildFailureReport(partialArgs, error));
    return 1;
  }

  if (!args.report) {
    process.stderr.write('missing required --report path\n');
    return 1;
  }

  try {
    writeJson(
      args.report,
      buildGoinEcologyMergeWitnessReport({
        outputPath: args.report,
        frameId: args.frameId,
        timestampMs: args.timestampMs,
        sampleAgeMs: args.sampleAgeMs,
        maxSampleAgeMs: args.maxSampleAgeMs
      })
    );
    return 0;
  } catch (error) {
    writeJson(args.report, buildFailureReport(args, error));
    return 1;
  }
}

function buildSharedDesireHints(source: SourceTruth, frame: FirstVerticalFrame): SharedDesireHint[] {
  const rollingGoins = frame.goins.filter((goin) => goin.state === 'rolling');
  const candidateGoinIds = rollingGoins.map((goin) => goin.id);
  return frame.lerms
    .filter((lerm) => lerm.state === 'rerouting_to_goin' && lerm.targetGoinId)
    .map((lerm) => {
      const target = required(rollingGoins.find((goin) => goin.id === lerm.targetGoinId), `rolling target ${lerm.targetGoinId}`);
      const toGoin = subtractVec3(target.world, lerm.world);
      const distanceToGoin = Math.hypot(toGoin[0], toGoin[1], toGoin[2]);
      return {
        schema: 'lerms.goin-shared-desire-hint.v0',
        source,
        lermId: lerm.id,
        targetGoinId: target.id,
        chosenTargetGoinId: target.id,
        candidateGoinIds,
        distanceToGoin,
        rerouteRadius: target.desireRadius,
        desireStrength: clamp(1 - distanceToGoin / target.desireRadius, 0.05, 1),
        desiredHeading: normalizeVec3([toGoin[0], 0, toGoin[2]]),
        reason: target.id.startsWith('throw-physics') ? 'thrown_sacrifice_desire' : 'carrier_drop_desire'
      };
    });
}

function createSource(
  frameId: string,
  timestampMs: number,
  sampleAgeMs: number,
  authority: SimulationAuthority
): SourceTruth {
  return {
    schema: 'lerms.source-truth.v0',
    authority,
    route: GOIN_ECOLOGY_MERGE_ROUTE,
    frameId,
    timestampMs,
    sampleAgeMs,
    backend: 'deterministic-goin-ecology-merge-v0',
    configId: 'goin-ecology-merge-v0'
  };
}

function parseArgs(argv: readonly string[]): CliArgs {
  const args = readPartialArgs(argv);
  if (!args.report) return args;
  assertFinite(args.timestampMs, 'timestamp-ms');
  assertFinite(args.sampleAgeMs, 'sample-age-ms');
  assertFinite(args.maxSampleAgeMs, 'max-sample-age-ms');
  return args;
}

function readPartialArgs(argv: readonly string[]): CliArgs {
  const args: CliArgs = {
    report: null,
    frameId: 'goin-ecology-merge-witness',
    timestampMs: 0,
    sampleAgeMs: 0,
    maxSampleAgeMs: 500
  };
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key.startsWith('--')) continue;
    if (value === undefined || value.startsWith('--')) {
      throw new Error(`missing value for ${key}`);
    }
    if (key === '--report') args.report = value;
    else if (key === '--frame-id') args.frameId = value;
    else if (key === '--timestamp-ms') args.timestampMs = Number(value);
    else if (key === '--sample-age-ms') args.sampleAgeMs = Number(value);
    else if (key === '--max-sample-age-ms') args.maxSampleAgeMs = Number(value);
    else throw new Error(`unknown argument ${key}`);
    index += 1;
  }
  return args;
}

function buildFailureReport(args: CliArgs, error: unknown): FailureReport {
  return {
    ok: false,
    schema: GOIN_ECOLOGY_MERGE_WITNESS_SCHEMA,
    route: GOIN_ECOLOGY_MERGE_WITNESS_ROUTE,
    phase: 'building-goin-ecology-merge-witness',
    failureKind: 'goin-ecology-merge-invalid',
    error: messageFor(error),
    lastTrustworthyEvidence: {
      outputPath: args.report ?? '',
      frameId: args.frameId,
      timestampMs: args.timestampMs,
      sampleAgeMs: args.sampleAgeMs,
      maxSampleAgeMs: args.maxSampleAgeMs
    }
  };
}

function subtractVec3(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function normalizeVec3(vector: Vec3): Vec3 {
  const length = Math.hypot(vector[0], vector[1], vector[2]) || 1;
  return [vector[0] / length, vector[1] / length, vector[2] / length];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function assertFinite(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be finite`);
  }
}

function required<T>(value: T | undefined, label: string): T {
  if (value === undefined) {
    throw new Error(`missing ${label}`);
  }
  return value;
}

function messageFor(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function writeJson(path: string, payload: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(payload, null, 2)}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = runGoinEcologyMergeWitnessCli();
}
