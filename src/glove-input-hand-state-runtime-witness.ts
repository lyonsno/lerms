import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  adaptHandStateRuntimeStateToGloveInputFrame,
  HAND_STATE_RUNTIME_STATE_SCHEMA,
  type HandStateRuntimeStateEnvelope
} from './glove-input-wilor-adapter.ts';
import type { GloveInputFrame } from './glove-well-command.ts';
import type { SimulationAuthority } from './contracts/first-vertical.ts';

export const GLOVE_INPUT_HAND_STATE_RUNTIME_WITNESS_SCHEMA = 'lerms.glove-input-hand-state-runtime-witness.v0' as const;
export const GLOVE_INPUT_HAND_STATE_RUNTIME_WITNESS_ROUTE = 'lerms/glove-input/hand-state-runtime-witness-file' as const;

export interface GloveInputHandStateRuntimeWitnessOptions {
  outputPath: string;
  state: HandStateRuntimeStateEnvelope;
  inputStatePath?: string | null;
  frameId?: string;
  timestampMs?: number;
}

export interface GloveInputHandStateRuntimeWitnessReport {
  ok: true;
  schema: typeof GLOVE_INPUT_HAND_STATE_RUNTIME_WITNESS_SCHEMA;
  route: typeof GLOVE_INPUT_HAND_STATE_RUNTIME_WITNESS_ROUTE;
  outputPath: string;
  inputStatePath: string | null;
  inputStateSchema: typeof HAND_STATE_RUNTIME_STATE_SCHEMA;
  frameId: string;
  timestampMs: number;
  runtimeOwner: 'hand-state-runtime';
  adaptedFrame: GloveInputFrame;
  sourceTruth: {
    handInputSourceAuthority: SimulationAuthority;
    handInputFreshness: string;
    handInputRequestedRoute: string;
    handInputEffectiveRoute: string;
    handInputConfigId: string;
    handInputFallbackReason: string | null;
    liveGloveWellAuthority: false;
    kaminosAcceptance: false;
  };
  downgrades: string[];
  whatRemainsFake: {
    runtimeOwnedLiveSidecar: true;
    kaminosVisibleHostAcceptance: true;
    firstVerticalSuccess: true;
  };
}

export interface GloveInputHandStateRuntimeFailureReport {
  ok: false;
  schema: typeof GLOVE_INPUT_HAND_STATE_RUNTIME_WITNESS_SCHEMA;
  route: typeof GLOVE_INPUT_HAND_STATE_RUNTIME_WITNESS_ROUTE;
  phase: 'building-glove-input-hand-state-runtime-witness';
  failureKind: 'hand-state-runtime-input-invalid';
  error: string;
  lastTrustworthyEvidence: {
    outputPath: string;
    inputStatePath: string | null;
    inputStateSchema: string | null;
    handInputSourceAuthority: string | null;
    handInputFreshness: string | null;
    handInputEffectiveRoute: string | null;
    handInputConfigId: string | null;
    handInputFallbackReason: string | null;
  };
}

interface CliArgs {
  report: string | null;
  state: string | null;
  frameId: string;
  timestampMs: number;
}

export function buildGloveInputHandStateRuntimeWitnessReport({
  outputPath,
  state,
  inputStatePath = null,
  frameId = 'glove-input-hand-state-runtime-witness',
  timestampMs = 0
}: GloveInputHandStateRuntimeWitnessOptions): GloveInputHandStateRuntimeWitnessReport {
  assertFinite(timestampMs, 'timestampMs');
  const adaptedFrame = adaptHandStateRuntimeStateToGloveInputFrame(state);
  const sourceTruth = {
    handInputSourceAuthority: adaptedFrame.source.authority,
    handInputFreshness: state.handInputFreshness,
    handInputRequestedRoute: state.handInputRequestedRoute,
    handInputEffectiveRoute: state.handInputEffectiveRoute,
    handInputConfigId: state.handInputConfigId,
    handInputFallbackReason: state.handInputFallbackReason ?? null,
    liveGloveWellAuthority: false as const,
    kaminosAcceptance: false as const
  };

  return {
    ok: true,
    schema: GLOVE_INPUT_HAND_STATE_RUNTIME_WITNESS_SCHEMA,
    route: GLOVE_INPUT_HAND_STATE_RUNTIME_WITNESS_ROUTE,
    outputPath,
    inputStatePath,
    inputStateSchema: HAND_STATE_RUNTIME_STATE_SCHEMA,
    frameId,
    timestampMs,
    runtimeOwner: 'hand-state-runtime',
    adaptedFrame,
    sourceTruth,
    downgrades: buildDowngrades(state, adaptedFrame.source.authority),
    whatRemainsFake: {
      runtimeOwnedLiveSidecar: true,
      kaminosVisibleHostAcceptance: true,
      firstVerticalSuccess: true
    }
  };
}

export function runGloveInputHandStateRuntimeWitnessCli(argv = process.argv.slice(2)): number {
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
  if (!args.state) {
    process.stderr.write('missing required --state path\n');
    writeJson(args.report, buildFailureReport(args, null, new Error('missing required --state path')));
    return 1;
  }

  let state: HandStateRuntimeStateEnvelope | null = null;
  try {
    state = JSON.parse(readFileSync(args.state, 'utf8')) as HandStateRuntimeStateEnvelope;
    writeJson(
      args.report,
      buildGloveInputHandStateRuntimeWitnessReport({
        outputPath: args.report,
        state,
        inputStatePath: args.state,
        frameId: args.frameId,
        timestampMs: args.timestampMs
      })
    );
    return 0;
  } catch (error) {
    writeJson(args.report, buildFailureReport(args, state, error));
    return 1;
  }
}

function buildDowngrades(state: HandStateRuntimeStateEnvelope, authority: SimulationAuthority): string[] {
  const downgrades = [
    'hand_state_runtime_state_stream_not_sidecar_lifecycle',
    'live_glove_well_authority_not_promoted_by_hand_input',
    'kaminos_acceptance_not_claimed_by_lerms_adapter'
  ];
  if (authority !== 'live_simulation' || state.handInputFallbackReason) {
    downgrades.push('hand_state_runtime_fixture_or_fallback_not_live_camera');
  }
  if (state.clientProjectImports?.length) {
    downgrades.push('hand_state_runtime_client_project_imports_present');
  }
  return unique(downgrades);
}

function buildFailureReport(
  args: CliArgs,
  state: Partial<HandStateRuntimeStateEnvelope> | null,
  error: unknown
): GloveInputHandStateRuntimeFailureReport {
  return {
    ok: false,
    schema: GLOVE_INPUT_HAND_STATE_RUNTIME_WITNESS_SCHEMA,
    route: GLOVE_INPUT_HAND_STATE_RUNTIME_WITNESS_ROUTE,
    phase: 'building-glove-input-hand-state-runtime-witness',
    failureKind: 'hand-state-runtime-input-invalid',
    error: messageFor(error),
    lastTrustworthyEvidence: {
      outputPath: args.report ?? '',
      inputStatePath: args.state,
      inputStateSchema: typeof state?.schema === 'string' ? state.schema : null,
      handInputSourceAuthority: typeof state?.handInputSourceAuthority === 'string' ? state.handInputSourceAuthority : null,
      handInputFreshness: typeof state?.handInputFreshness === 'string' ? state.handInputFreshness : null,
      handInputEffectiveRoute: typeof state?.handInputEffectiveRoute === 'string' ? state.handInputEffectiveRoute : null,
      handInputConfigId: typeof state?.handInputConfigId === 'string' ? state.handInputConfigId : null,
      handInputFallbackReason:
        typeof state?.handInputFallbackReason === 'string' || state?.handInputFallbackReason === null
          ? state.handInputFallbackReason
          : null
    }
  };
}

function parseArgs(argv: readonly string[]): CliArgs {
  const args: CliArgs = {
    report: null,
    state: null,
    frameId: 'glove-input-hand-state-runtime-witness',
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
    else if (key === '--state') args.state = value;
    else if (key === '--frame-id') args.frameId = value;
    else if (key === '--timestamp-ms') args.timestampMs = Number(value);
    else throw new Error(`unknown argument ${key}`);
    index += 1;
  }

  assertFinite(args.timestampMs, 'timestamp-ms');
  return args;
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
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
  process.exitCode = runGloveInputHandStateRuntimeWitnessCli();
}
