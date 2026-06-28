import {
  mkdirSync,
  readFileSync,
  writeFileSync
} from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildFixtureGloveInputSequence,
  buildGloveWellCommandsFromInputSequence,
  type GloveInputFrame,
  type GloveWellCommand
} from './glove-well-command.ts';
import {
  adaptWilorMiniPacketToGloveInputFrame,
  GLOVE_INPUT_WILOR_LIVE_EFFECTIVE_ROUTE,
  type WilorMiniGloveInputPacket
} from './glove-input-wilor-adapter.ts';
import type { SimulationAuthority } from './contracts/first-vertical.ts';

export const GLOVE_WELL_LIVE_COMPARISON_WITNESS_SCHEMA = 'lerms.glove-well-live-comparison-witness.v0' as const;
export const GLOVE_WELL_LIVE_COMPARISON_WITNESS_ROUTE = 'lerms/glove-well/live-comparison-witness-file' as const;

export interface BuildGloveWellLiveComparisonWitnessOptions {
  outputPath: string;
  frameId: string;
  timestampMs: number;
  packets: readonly WilorMiniGloveInputPacket[];
  inputPacketPath?: string | null;
}

interface CliArgs {
  report: string | null;
  packets: string | null;
  frameId: string;
  timestampMs: number;
}

export interface GloveWellLiveComparisonSourceTruth {
  effectiveAuthority: SimulationAuthority;
  requestedRoutes: string[];
  effectiveRoutes: string[];
  producerConfigIds: string[];
  fallbackReasons: string[];
  maxCameraFrameAgeMs: number;
  maxRoundTripMs: number | null;
  maxModelLatencyMs: number | null;
  nonFallbackLivePacketCount: number;
  fallbackPacketCount: number;
  stalePacketCount: number;
}

export interface GloveWellLiveComparison {
  livePhaseTrace: string;
  fixturePhaseTrace: string;
  phaseAgreement: boolean;
  liveReleaseEventId: string | null;
  fixtureReleaseEventId: string | null;
  liveReleaseSourceFrameId: string | null;
  fixtureReleaseSourceFrameId: string | null;
}

export interface GloveWellLiveComparisonWitnessReport {
  ok: true;
  schema: typeof GLOVE_WELL_LIVE_COMPARISON_WITNESS_SCHEMA;
  route: typeof GLOVE_WELL_LIVE_COMPARISON_WITNESS_ROUTE;
  outputPath: string;
  inputPacketPath: string | null;
  frameId: string;
  timestampMs: number;
  packetCount: number;
  adaptedFrames: readonly GloveInputFrame[];
  liveCommands: readonly GloveWellCommand[];
  fixtureCommands: readonly GloveWellCommand[];
  comparison: GloveWellLiveComparison;
  sourceTruth: GloveWellLiveComparisonSourceTruth;
  authorityNote: 'comparison witness only; live command authority requires fresh non-fallback WiLoR packets and does not upgrade the full vertical';
  whatRemainsFake: {
    fullVerticalSuccess: true;
    sidecarProcessManager: true;
    carrierDropJuiceHitMerge: true;
    kaminosSceneHosting: true;
  };
}

interface GloveWellLiveComparisonFailureReport {
  ok: false;
  schema: typeof GLOVE_WELL_LIVE_COMPARISON_WITNESS_SCHEMA;
  route: typeof GLOVE_WELL_LIVE_COMPARISON_WITNESS_ROUTE;
  phase: 'building-glove-well-live-comparison-witness';
  failureKind: 'glove-well-live-comparison-invalid';
  error: string;
  lastTrustworthyEvidence: {
    outputPath: string;
    inputPacketPath: string | null;
    frameId: string;
    timestampMs: number;
  };
}

export function buildGloveWellLiveComparisonWitnessReport({
  outputPath,
  frameId,
  timestampMs,
  packets,
  inputPacketPath = null
}: BuildGloveWellLiveComparisonWitnessOptions): GloveWellLiveComparisonWitnessReport {
  if (packets.length === 0) {
    throw new Error('glove well live comparison requires at least one WiLoR packet');
  }

  const adaptedFrames = packets.map((packet) => adaptWilorMiniPacketToGloveInputFrame(packet));
  const liveCommands = buildGloveWellCommandsFromInputSequence(adaptedFrames);
  const fixtureFrames = buildFixtureGloveInputSequence({
    frameIdPrefix: `${frameId}-fixture`,
    timestampMs
  });
  const fixtureCommands = buildGloveWellCommandsFromInputSequence(fixtureFrames);

  return {
    ok: true,
    schema: GLOVE_WELL_LIVE_COMPARISON_WITNESS_SCHEMA,
    route: GLOVE_WELL_LIVE_COMPARISON_WITNESS_ROUTE,
    outputPath,
    inputPacketPath,
    frameId,
    timestampMs,
    packetCount: packets.length,
    adaptedFrames,
    liveCommands,
    fixtureCommands,
    comparison: compareCommands(liveCommands, fixtureCommands),
    sourceTruth: summarizeSourceTruth(adaptedFrames),
    authorityNote:
      'comparison witness only; live command authority requires fresh non-fallback WiLoR packets and does not upgrade the full vertical',
    whatRemainsFake: {
      fullVerticalSuccess: true,
      sidecarProcessManager: true,
      carrierDropJuiceHitMerge: true,
      kaminosSceneHosting: true
    }
  };
}

export function runGloveWellLiveComparisonWitnessCli(argv = process.argv.slice(2)): number {
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
    writeJson(args.report, buildFailureReport(args, 'missing required --packets path'));
    return 1;
  }

  try {
    const packets = JSON.parse(readFileSync(args.packets, 'utf8')) as unknown;
    if (!Array.isArray(packets)) {
      throw new Error('packet input must be a JSON array');
    }
    writeJson(
      args.report,
      buildGloveWellLiveComparisonWitnessReport({
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

function compareCommands(
  liveCommands: readonly GloveWellCommand[],
  fixtureCommands: readonly GloveWellCommand[]
): GloveWellLiveComparison {
  const livePhaseTrace = phaseTrace(liveCommands);
  const fixturePhaseTrace = phaseTrace(fixtureCommands);
  const liveRelease = liveCommands.find((command) => command.phase === 'released');
  const fixtureRelease = fixtureCommands.find((command) => command.phase === 'released');

  return {
    livePhaseTrace,
    fixturePhaseTrace,
    phaseAgreement: livePhaseTrace === fixturePhaseTrace,
    liveReleaseEventId: liveRelease?.release?.eventId ?? null,
    fixtureReleaseEventId: fixtureRelease?.release?.eventId ?? null,
    liveReleaseSourceFrameId: liveRelease?.release?.sourceFrameId ?? null,
    fixtureReleaseSourceFrameId: fixtureRelease?.release?.sourceFrameId ?? null
  };
}

function phaseTrace(commands: readonly GloveWellCommand[]): string {
  return commands.map((command) => command.phase).join('>');
}

function summarizeSourceTruth(frames: readonly GloveInputFrame[]): GloveWellLiveComparisonSourceTruth {
  const authorities = frames.map((frame) => frame.source.authority);
  const effectiveAuthority = weakestAuthority(authorities);
  const fallbackReasons = unique(
    frames.map((frame) => frame.source.fallbackReason).filter((reason): reason is string => Boolean(reason))
  );
  const roundTrips = frames.map((frame) => frame.timing.roundTripMs).filter((value): value is number => value !== undefined);
  const modelLatencies = frames.map((frame) => frame.timing.modelLatencyMs).filter((value): value is number => value !== undefined);

  return {
    effectiveAuthority,
    requestedRoutes: unique(frames.map((frame) => frame.source.requestedRoute).filter((route): route is string => Boolean(route))),
    effectiveRoutes: unique(frames.map((frame) => frame.source.effectiveRoute).filter((route): route is string => Boolean(route))),
    producerConfigIds: unique(frames.map((frame) => frame.source.producerConfigId).filter((id): id is string => Boolean(id))),
    fallbackReasons,
    maxCameraFrameAgeMs: Math.max(...frames.map((frame) => frame.timing.cameraFrameAgeMs)),
    maxRoundTripMs: roundTrips.length ? Math.max(...roundTrips) : null,
    maxModelLatencyMs: modelLatencies.length ? Math.max(...modelLatencies) : null,
    nonFallbackLivePacketCount: frames.filter((frame) => frame.source.effectiveRoute === GLOVE_INPUT_WILOR_LIVE_EFFECTIVE_ROUTE && frame.source.authority === 'live_simulation').length,
    fallbackPacketCount: frames.filter((frame) => frame.source.authority === 'fallback').length,
    stalePacketCount: frames.filter((frame) => frame.source.authority === 'stale_hold' || frame.source.authority === 'invalid').length
  };
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
  return authorities.reduce((weakest, authority) => (rank[authority] < rank[weakest] ? authority : weakest), 'live_simulation' as SimulationAuthority);
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function parseArgs(argv: readonly string[]): CliArgs {
  const args: CliArgs = {
    report: null,
    packets: null,
    frameId: 'glove-well-live-comparison-witness',
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

function buildFailureReport(args: CliArgs, error: unknown): GloveWellLiveComparisonFailureReport {
  return {
    ok: false,
    schema: GLOVE_WELL_LIVE_COMPARISON_WITNESS_SCHEMA,
    route: GLOVE_WELL_LIVE_COMPARISON_WITNESS_ROUTE,
    phase: 'building-glove-well-live-comparison-witness',
    failureKind: 'glove-well-live-comparison-invalid',
    error: messageFor(error),
    lastTrustworthyEvidence: {
      outputPath: args.report ?? '',
      inputPacketPath: args.packets,
      frameId: args.frameId,
      timestampMs: args.timestampMs
    }
  };
}

function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function assertFinite(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be finite`);
  }
}

function messageFor(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = runGloveWellLiveComparisonWitnessCli();
}
