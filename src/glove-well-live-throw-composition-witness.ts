import {
  mkdirSync,
  readFileSync,
  writeFileSync
} from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildGloveWellCommandsFromInputSequence,
  type GloveInputFrame,
  type GloveWellCommand
} from './glove-well-command.ts';
import {
  adaptWilorMiniPacketToGloveInputFrame,
  GLOVE_INPUT_WILOR_LIVE_EFFECTIVE_ROUTE,
  type WilorMiniGloveInputPacket
} from './glove-input-wilor-adapter.ts';
import {
  buildGloveWellThrowPhysicsWitnessReportFromRelease,
  type GloveWellThrowPhysicsWitnessReport
} from './glove-well-throw-physics-witness.ts';
import type { SimulationAuthority } from './contracts/first-vertical.ts';

export const GLOVE_WELL_LIVE_THROW_COMPOSITION_WITNESS_SCHEMA = 'lerms.glove-well-live-throw-composition-witness.v0' as const;
export const GLOVE_WELL_LIVE_THROW_COMPOSITION_WITNESS_ROUTE = 'lerms/glove-well/live-throw-composition-witness-file' as const;

interface CliArgs {
  report: string | null;
  packets: string | null;
  frameId: string;
  timestampMs: number;
}

interface LiveThrowSourceTruth {
  effectiveAuthority: SimulationAuthority;
  inputAuthority: SimulationAuthority;
  physicsAuthority: SimulationAuthority;
  requestedRoutes: string[];
  effectiveRoutes: string[];
  producerConfigIds: string[];
  fallbackReasons: string[];
  maxCameraFrameAgeMs: number;
  maxRoundTripMs: number | null;
  maxModelLatencyMs: number | null;
  nonFallbackLivePacketCount: number;
  fallbackPacketCount: number;
  staleCommandCount: number;
}

interface LiveThrowFakeBoundary {
  sidecarProcessManager: true;
  fullVerticalSuccess: true;
  carrierDropJuiceHitMerge: true;
  finalGoinMesh: true;
  fullCrowdAi: true;
}

export interface GloveWellLiveThrowCompositionWitnessReport {
  ok: true;
  schema: typeof GLOVE_WELL_LIVE_THROW_COMPOSITION_WITNESS_SCHEMA;
  route: typeof GLOVE_WELL_LIVE_THROW_COMPOSITION_WITNESS_ROUTE;
  outputPath: string;
  inputPacketPath: string | null;
  frameId: string;
  timestampMs: number;
  packetCount: number;
  adaptedFrames: readonly GloveInputFrame[];
  commands: readonly GloveWellCommand[];
  commandPhaseTrace: string;
  releaseEventId: string;
  releaseSourceFrameId: string;
  sourceTruth: LiveThrowSourceTruth;
  throwPhysics: GloveWellThrowPhysicsWitnessReport;
  previewBenchPayload: GloveWellThrowPhysicsWitnessReport['previewBenchPayload'];
  whatRemainsFake: LiveThrowFakeBoundary;
}

interface LiveThrowFailureReport {
  ok: false;
  schema: typeof GLOVE_WELL_LIVE_THROW_COMPOSITION_WITNESS_SCHEMA;
  route: typeof GLOVE_WELL_LIVE_THROW_COMPOSITION_WITNESS_ROUTE;
  phase: 'building-glove-well-live-throw-composition-witness';
  failureKind: 'live-throw-invalid' | 'live-throw-release-missing';
  error: string;
  lastTrustworthyEvidence: {
    outputPath: string;
    inputPacketPath: string | null;
    frameId: string;
    timestampMs: number;
  };
}

export interface BuildGloveWellLiveThrowCompositionWitnessOptions {
  outputPath: string;
  frameId: string;
  timestampMs: number;
  packets: readonly WilorMiniGloveInputPacket[];
  inputPacketPath?: string | null;
}

class LiveThrowReleaseMissingError extends Error {
  constructor() {
    super('live throw composition requires a release command from WiLoR input');
  }
}

export function buildGloveWellLiveThrowCompositionWitnessReport({
  outputPath,
  frameId,
  timestampMs,
  packets,
  inputPacketPath = null
}: BuildGloveWellLiveThrowCompositionWitnessOptions): GloveWellLiveThrowCompositionWitnessReport {
  if (packets.length === 0) {
    throw new Error('live throw composition requires at least one WiLoR packet');
  }

  const adaptedFrames = packets.map((packet) => adaptWilorMiniPacketToGloveInputFrame(packet));
  const commands = buildGloveWellCommandsFromInputSequence(adaptedFrames);
  const releaseCommand = commands.find((command) => command.phase === 'released' && command.release);
  if (!releaseCommand?.release) {
    throw new LiveThrowReleaseMissingError();
  }

  const sourceTruth = summarizeSourceTruth(adaptedFrames, commands);
  const throwPhysics = buildGloveWellThrowPhysicsWitnessReportFromRelease({
    outputPath: `${outputPath}#throw-physics`,
    frameId: `${frameId}-throw-physics`,
    timestampMs,
    release: {
      eventId: releaseCommand.release.eventId,
      sourceInputFrameId: releaseCommand.release.sourceFrameId,
      initialVelocity: [releaseCommand.release.initialVelocity.x, 0.08, -Math.abs(releaseCommand.release.initialVelocity.y) - 0.72]
    },
    inputAuthority: sourceTruth.inputAuthority,
    inputRoute: 'lerms/glove-well-command/from-wilor-input',
    fixtureInputDowngrade: sourceTruth.inputAuthority !== 'live_simulation',
    previewDowngrades: [
      'saved_wilor_packets_not_sidecar_process_manager',
      ...(sourceTruth.inputAuthority === 'live_simulation' ? [] : ['wilor_input_downgraded_before_throw'])
    ]
  });

  return {
    ok: true,
    schema: GLOVE_WELL_LIVE_THROW_COMPOSITION_WITNESS_SCHEMA,
    route: GLOVE_WELL_LIVE_THROW_COMPOSITION_WITNESS_ROUTE,
    outputPath,
    inputPacketPath,
    frameId,
    timestampMs,
    packetCount: packets.length,
    adaptedFrames,
    commands,
    commandPhaseTrace: phaseTrace(commands),
    releaseEventId: releaseCommand.release.eventId,
    releaseSourceFrameId: releaseCommand.release.sourceFrameId,
    sourceTruth: {
      ...sourceTruth,
      effectiveAuthority: throwPhysics.sourceTruth.effectiveAuthority,
      physicsAuthority: throwPhysics.sourceTruth.physicsAuthority
    },
    throwPhysics,
    previewBenchPayload: throwPhysics.previewBenchPayload,
    whatRemainsFake: {
      sidecarProcessManager: true,
      fullVerticalSuccess: true,
      carrierDropJuiceHitMerge: true,
      finalGoinMesh: true,
      fullCrowdAi: true
    }
  };
}

export function runGloveWellLiveThrowCompositionWitnessCli(argv = process.argv.slice(2)): number {
  let args: CliArgs;
  try {
    args = parseArgs(argv);
  } catch (error) {
    process.stderr.write(`${messageFor(error)}\n`);
    return 1;
  }

  if (!args.report) {
    process.stderr.write('missing required --report path\n');
    return 1;
  }
  if (!args.packets) {
    process.stderr.write('missing required --packets path\n');
    writeJson(args.report, buildFailureReport(args, new Error('missing required --packets path')));
    return 1;
  }

  try {
    const packets = JSON.parse(readFileSync(args.packets, 'utf8')) as unknown;
    if (!Array.isArray(packets)) {
      throw new Error('packet input must be a JSON array');
    }
    writeJson(
      args.report,
      buildGloveWellLiveThrowCompositionWitnessReport({
        outputPath: args.report,
        frameId: args.frameId,
        timestampMs: args.timestampMs,
        packets: packets as WilorMiniGloveInputPacket[],
        inputPacketPath: args.packets
      })
    );
    return 0;
  } catch (error) {
    writeJson(args.report, buildFailureReport(args, error));
    return 1;
  }
}

function summarizeSourceTruth(
  frames: readonly GloveInputFrame[],
  commands: readonly GloveWellCommand[]
): Omit<LiveThrowSourceTruth, 'effectiveAuthority' | 'physicsAuthority'> {
  const inputAuthority = weakestAuthority(commands.map((command) => command.source.authority));
  const roundTrips = frames.map((frame) => frame.timing.roundTripMs).filter((value): value is number => value !== undefined);
  const modelLatencies = frames.map((frame) => frame.timing.modelLatencyMs).filter((value): value is number => value !== undefined);

  return {
    inputAuthority,
    requestedRoutes: unique(frames.map((frame) => frame.source.requestedRoute).filter((route): route is string => Boolean(route))),
    effectiveRoutes: unique(frames.map((frame) => frame.source.effectiveRoute).filter((route): route is string => Boolean(route))),
    producerConfigIds: unique(frames.map((frame) => frame.source.producerConfigId).filter((id): id is string => Boolean(id))),
    fallbackReasons: unique(frames.map((frame) => frame.source.fallbackReason).filter((reason): reason is string => Boolean(reason))),
    maxCameraFrameAgeMs: Math.max(...frames.map((frame) => frame.timing.cameraFrameAgeMs)),
    maxRoundTripMs: roundTrips.length ? Math.max(...roundTrips) : null,
    maxModelLatencyMs: modelLatencies.length ? Math.max(...modelLatencies) : null,
    nonFallbackLivePacketCount: frames.filter((frame) => frame.source.effectiveRoute === GLOVE_INPUT_WILOR_LIVE_EFFECTIVE_ROUTE && frame.source.authority === 'live_simulation').length,
    fallbackPacketCount: frames.filter((frame) => frame.source.authority === 'fallback').length,
    staleCommandCount: commands.filter((command) => command.source.authority === 'stale_hold' || command.source.authority === 'invalid').length
  };
}

function phaseTrace(commands: readonly GloveWellCommand[]): string {
  return commands.map((command) => command.phase).join('>');
}

function weakestAuthority(authorities: readonly SimulationAuthority[]): SimulationAuthority {
  const rank: Record<SimulationAuthority, number> = {
    invalid: 0,
    fallback: 1,
    visual_only: 2,
    synthetic_fixture: 3,
    stale_hold: 4,
    live_simulation: 5
  };
  return authorities.reduce(
    (weakest, authority) => (rank[authority] < rank[weakest] ? authority : weakest),
    'live_simulation' as SimulationAuthority
  );
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function parseArgs(argv: readonly string[]): CliArgs {
  const args: CliArgs = {
    report: null,
    packets: null,
    frameId: 'glove-well-live-throw-composition-witness',
    timestampMs: 0
  };

  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key.startsWith('--')) continue;
    if (value === undefined || value.startsWith('--')) {
      throw new Error(`missing value for ${key}`);
    }
    if (key === '--report') args.report = value;
    else if (key === '--packets') args.packets = value;
    else if (key === '--frame-id') args.frameId = value;
    else if (key === '--timestamp-ms') args.timestampMs = Number(value);
    else throw new Error(`unknown argument ${key}`);
    index += 1;
  }

  assertFinite(args.timestampMs, 'timestamp-ms');
  return args;
}

function buildFailureReport(args: CliArgs, error: unknown): LiveThrowFailureReport {
  return {
    ok: false,
    schema: GLOVE_WELL_LIVE_THROW_COMPOSITION_WITNESS_SCHEMA,
    route: GLOVE_WELL_LIVE_THROW_COMPOSITION_WITNESS_ROUTE,
    phase: 'building-glove-well-live-throw-composition-witness',
    failureKind: error instanceof LiveThrowReleaseMissingError ? 'live-throw-release-missing' : 'live-throw-invalid',
    error: messageFor(error),
    lastTrustworthyEvidence: {
      outputPath: args.report ?? '',
      inputPacketPath: args.packets,
      frameId: args.frameId,
      timestampMs: args.timestampMs
    }
  };
}

function assertFinite(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be finite`);
  }
}

function messageFor(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function writeJson(path: string, payload: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(payload, null, 2)}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = runGloveWellLiveThrowCompositionWitnessCli();
}
