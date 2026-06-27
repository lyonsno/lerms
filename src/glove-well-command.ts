import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  summarizeFirstVerticalFrame,
  type FirstVerticalFrame,
  type FirstVerticalSummary,
  type GoinState,
  type LermState,
  type SimulationAuthority,
  type SourceTruth,
  type TerrainSample,
  type Vec3
} from './contracts/first-vertical.ts';
import {
  evaluateFirstVerticalSourceTruthUpgrade,
  type FirstVerticalSourceTruthUpgradeEvaluation
} from './contracts/first-vertical-source-truth-upgrade.ts';
import { composeFirstVerticalFrame } from './contracts/first-vertical-composer.ts';
import type { HillOfHillsTerrain, HillOfHillsTerrainParams } from './terrain/hill-of-hills.ts';

export const GLOVE_INPUT_FRAME_SCHEMA = 'lerms.glove-input-frame.v0' as const;
export const GLOVE_WELL_COMMAND_SCHEMA = 'lerms.glove-well-command.v0' as const;
export const GLOVE_WELL_LAUNCH_WITNESS_SCHEMA = 'lerms.glove-well-launch-witness.v0' as const;
export const GLOVE_WELL_LAUNCH_ROUTE = 'lerms/glove-well-launch' as const;
export const GLOVE_INPUT_FIXTURE_ROUTE = 'lerms/glove-input/fixture-glove-well' as const;
export const GLOVE_INPUT_LIVE_REQUESTED_ROUTE = 'perceptasia/wilor-mini-mlx-sidecar/live-glove-input' as const;

export type GloveWellCommandPhase = 'idle' | 'priming' | 'aiming' | 'released' | 'cooldown';
export type ScreenPoint = { x: number; y: number };
export type FingerName = 'thumb' | 'index' | 'middle' | 'ring' | 'pinky';

export interface GloveInputSource extends SourceTruth {
  model?: string;
  requestedRoute?: string;
  effectiveRoute?: string;
  fallbackReason?: string | null;
}

export interface FingerInput {
  confidence: number;
  extended: boolean;
  extensionScore: number;
  tip: ScreenPoint;
  base?: ScreenPoint;
  direction: ScreenPoint;
  sourceLandmarkIds?: string[];
}

export interface GloveInputFrame {
  schema: typeof GLOVE_INPUT_FRAME_SCHEMA;
  frameId: string;
  timestampMs: number;
  source: GloveInputSource;
  timing: {
    cameraFrameAgeMs: number;
    modelLatencyMs?: number;
    publishAgeMs?: number;
    roundTripMs?: number;
  };
  coordinateFrame: {
    space: 'screen_normalized';
    origin: 'top_left';
    handedness: 'operator_unmirrored';
    depthPolicy: 'non_load_bearing';
  };
  hand: {
    handedness: 'right' | 'left' | 'unknown';
    confidence: number;
    palmCenter?: ScreenPoint;
    wrist?: ScreenPoint;
  };
  fingers: Record<FingerName, FingerInput>;
  gestures: {
    pinch: {
      active: boolean;
      strength: number;
      distancePx?: number;
      distanceNorm?: number;
      pair: ['thumb', 'index'];
    };
    pinkyAim: {
      active: boolean;
      holdMs: number;
      strength: number;
      origin: ScreenPoint;
      direction: ScreenPoint;
    };
    fist?: {
      active: boolean;
      strength: number;
    };
    openPalm?: {
      active: boolean;
      strength: number;
    };
  };
}

export interface GloveWellCommand {
  schema: typeof GLOVE_WELL_COMMAND_SCHEMA;
  phase: GloveWellCommandPhase;
  primedGoinId?: string;
  charge01: number;
  aim?: {
    origin: ScreenPoint;
    direction: ScreenPoint;
    arcSamples: Array<ScreenPoint & { t: number }>;
  };
  release?: {
    eventId: string;
    trigger: 'pinch_opened_after_prime';
    initialVelocity: ScreenPoint;
    sourceFrameId: string;
  };
  source: SourceTruth;
}

export interface BuildFixtureGloveInputSequenceOptions {
  frameIdPrefix: string;
  timestampMs: number;
}

export interface BuildGloveWellLaunchWitnessOptions {
  outputPath: string;
  frameId: string;
  timestampMs: number;
  maxSampleAgeMs?: number;
}

interface CliArgs {
  report: string | null;
  frameId: string;
  timestampMs: number;
  maxSampleAgeMs: number;
}

interface GloveWellLaunchFailureReport {
  ok: false;
  schema: typeof GLOVE_WELL_LAUNCH_WITNESS_SCHEMA;
  phase: 'building-glove-well-launch-witness';
  failureKind: 'glove-well-launch-invalid';
  error: string;
  route: typeof GLOVE_WELL_LAUNCH_ROUTE;
  lastTrustworthyEvidence: {
    outputPath: string;
    frameId: string;
    timestampMs: number;
    maxSampleAgeMs: number;
  };
}

interface GloveWellLaunchEvidence {
  schema: 'lerms.glove-well-launch-event.v0';
  releaseEventId: string;
  sourceInputFrameId: string;
  primedGoinId: string;
  launchedGoinId: string;
  initialVelocity: Vec3;
  arcSamples: Array<ScreenPoint & { t: number }>;
}

interface GoinRerouteHint {
  schema: 'lerms.goin-reroute-hint.v0';
  source: SourceTruth;
  lermId: string;
  targetGoinId: string;
  goinState: 'rolling';
  distanceToGoin: number;
  rerouteRadius: number;
  desireStrength: number;
  desiredHeading: Vec3;
}

export interface GloveWellLaunchWitnessReport {
  ok: true;
  schema: typeof GLOVE_WELL_LAUNCH_WITNESS_SCHEMA;
  route: typeof GLOVE_WELL_LAUNCH_ROUTE;
  outputPath: string;
  authorityNote: 'fixture glove input downgrades the composed frame until live WiLoR sidecar packets exist';
  inputFrames: readonly GloveInputFrame[];
  commands: readonly GloveWellCommand[];
  launchEvidence: GloveWellLaunchEvidence;
  frame: FirstVerticalFrame;
  summary: FirstVerticalSummary;
  sourceTruthEvaluation: FirstVerticalSourceTruthUpgradeEvaluation;
  rerouteHints: readonly GoinRerouteHint[];
  whatRemainsFake: {
    liveWilorSidecar: true;
    finalGoinArt: true;
    fullCrowdAi: true;
    finalTreasureEconomy: true;
  };
}

interface CommandState {
  hasPrimed: boolean;
  primedGoinId?: string;
  lastAim?: GloveWellCommand['aim'];
}

export function buildFixtureGloveInputSequence({
  frameIdPrefix,
  timestampMs
}: BuildFixtureGloveInputSequenceOptions): GloveInputFrame[] {
  const base = createFixtureInputFrame(`${frameIdPrefix}-idle`, timestampMs, {
    pinchActive: false,
    pinchStrength: 0,
    pinkyActive: false,
    pinkyHoldMs: 0
  });
  const priming = createFixtureInputFrame(`${frameIdPrefix}-prime`, timestampMs + 120, {
    pinchActive: true,
    pinchStrength: 0.62,
    pinkyActive: false,
    pinkyHoldMs: 0
  });
  const aiming = createFixtureInputFrame(`${frameIdPrefix}-aim`, timestampMs + 260, {
    pinchActive: true,
    pinchStrength: 0.82,
    pinkyActive: true,
    pinkyHoldMs: 160
  });
  const released = createFixtureInputFrame(`${frameIdPrefix}-release`, timestampMs + 390, {
    pinchActive: false,
    pinchStrength: 0.08,
    pinkyActive: true,
    pinkyHoldMs: 290
  });

  return [base, priming, aiming, released];
}

export function buildGloveWellCommandsFromInputSequence(frames: readonly GloveInputFrame[]): GloveWellCommand[] {
  const state: CommandState = {
    hasPrimed: false
  };

  return frames.map((frame) => buildGloveWellCommandFromInput(frame, state));
}

export function buildGloveWellCommandFromInput(frame: GloveInputFrame, state: CommandState = { hasPrimed: false }): GloveWellCommand {
  assertGloveInputFrame(frame);
  const source = commandSourceForInput(frame);

  if (source.authority === 'stale_hold') {
    return {
      schema: GLOVE_WELL_COMMAND_SCHEMA,
      phase: 'cooldown',
      primedGoinId: state.primedGoinId,
      charge01: state.hasPrimed ? 1 : 0,
      aim: state.lastAim,
      source
    };
  }

  const pinchActive = frame.gestures.pinch.active && frame.gestures.pinch.strength >= 0.35;
  const pinkyActive =
    frame.gestures.pinkyAim.active &&
    frame.gestures.pinkyAim.strength >= 0.45 &&
    frame.gestures.pinkyAim.holdMs >= 100;

  if (pinchActive && pinkyActive) {
    const aim = createAim(frame);
    state.hasPrimed = true;
    state.primedGoinId = 'primed-goin-001';
    state.lastAim = aim;
    return {
      schema: GLOVE_WELL_COMMAND_SCHEMA,
      phase: 'aiming',
      primedGoinId: state.primedGoinId,
      charge01: clamp(frame.gestures.pinch.strength, 0, 1),
      aim,
      source
    };
  }

  if (pinchActive) {
    state.hasPrimed = true;
    state.primedGoinId = 'primed-goin-001';
    return {
      schema: GLOVE_WELL_COMMAND_SCHEMA,
      phase: 'priming',
      primedGoinId: state.primedGoinId,
      charge01: clamp(frame.gestures.pinch.strength, 0, 1),
      source
    };
  }

  if (!pinchActive && state.hasPrimed && state.lastAim) {
    const initialVelocity = scalePoint(state.lastAim.direction, 2.4);
    const command: GloveWellCommand = {
      schema: GLOVE_WELL_COMMAND_SCHEMA,
      phase: 'released',
      primedGoinId: state.primedGoinId,
      charge01: 1,
      aim: state.lastAim,
      release: {
        eventId: `glove-well-release-${frame.frameId}`,
        trigger: 'pinch_opened_after_prime',
        initialVelocity,
        sourceFrameId: frame.frameId
      },
      source
    };
    state.hasPrimed = false;
    return command;
  }

  if (!pinchActive && !state.hasPrimed && frame.gestures.pinkyAim.active) {
    throw new Error('release without prior priming is invalid');
  }

  return {
    schema: GLOVE_WELL_COMMAND_SCHEMA,
    phase: 'idle',
    charge01: 0,
    source
  };
}

export function buildGloveWellLaunchWitnessReport({
  outputPath,
  frameId,
  timestampMs,
  maxSampleAgeMs = 500
}: BuildGloveWellLaunchWitnessOptions): GloveWellLaunchWitnessReport {
  const inputFrames = buildFixtureGloveInputSequence({
    frameIdPrefix: frameId,
    timestampMs
  });
  const commands = buildGloveWellCommandsFromInputSequence(inputFrames);
  const releaseCommand = commands.find((command) => command.phase === 'released');

  if (!releaseCommand?.release || !releaseCommand.aim || !releaseCommand.primedGoinId) {
    throw new Error('fixture sequence did not produce a release command');
  }

  const physicsSource = createPhysicsSource(frameId, timestampMs);
  const terrain = createLaunchTerrain(physicsSource);
  const launchedGoin = createLaunchedGoin(physicsSource, releaseCommand);
  const lerms = createReroutingLerms(physicsSource, launchedGoin);
  const subsystemFrame: FirstVerticalFrame = {
    schema: 'lerms.first-vertical-frame.v0',
    source: physicsSource,
    terrainSamples: [],
    lerms,
    goins: [launchedGoin],
    juiceHits: [],
    carrierDropEvents: []
  };
  const frame = composeFirstVerticalFrame({
    frameId,
    timestampMs,
    terrain,
    sources: [subsystemFrame],
    maxSampleAgeMs: Number.POSITIVE_INFINITY,
    route: GLOVE_WELL_LAUNCH_ROUTE
  });
  const downgradedFrame: FirstVerticalFrame = {
    ...frame,
    source: {
      ...frame.source,
      authority: releaseCommand.source.authority,
      route: GLOVE_WELL_LAUNCH_ROUTE,
      backend: 'glove-well-command-fixture-bridge',
      configId: `${frame.source.configId}+${releaseCommand.source.configId}`
    }
  };
  const sourceTruthEvaluation = evaluateFirstVerticalSourceTruthUpgrade(downgradedFrame, { maxSampleAgeMs });
  const summary = summarizeFirstVerticalFrame(downgradedFrame);
  const launchEvidence: GloveWellLaunchEvidence = {
    schema: 'lerms.glove-well-launch-event.v0',
    releaseEventId: releaseCommand.release.eventId,
    sourceInputFrameId: releaseCommand.release.sourceFrameId,
    primedGoinId: releaseCommand.primedGoinId,
    launchedGoinId: launchedGoin.id,
    initialVelocity: launchedGoin.velocity,
    arcSamples: releaseCommand.aim.arcSamples
  };

  return {
    ok: true,
    schema: GLOVE_WELL_LAUNCH_WITNESS_SCHEMA,
    route: GLOVE_WELL_LAUNCH_ROUTE,
    outputPath,
    authorityNote: 'fixture glove input downgrades the composed frame until live WiLoR sidecar packets exist',
    inputFrames,
    commands,
    launchEvidence,
    frame: downgradedFrame,
    summary,
    sourceTruthEvaluation,
    rerouteHints: createRerouteHints(physicsSource, launchedGoin, lerms),
    whatRemainsFake: {
      liveWilorSidecar: true,
      finalGoinArt: true,
      fullCrowdAi: true,
      finalTreasureEconomy: true
    }
  };
}

export function runGloveWellLaunchWitnessCli(argv = process.argv.slice(2)): number {
  let args: CliArgs;

  try {
    args = parseArgs(argv);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    return 1;
  }

  if (!args.report) {
    process.stderr.write('missing required --report path\n');
    return 1;
  }

  try {
    writeJson(
      args.report,
      buildGloveWellLaunchWitnessReport({
        outputPath: args.report,
        frameId: args.frameId,
        timestampMs: args.timestampMs,
        maxSampleAgeMs: args.maxSampleAgeMs
      })
    );
    return 0;
  } catch (error) {
    writeJson(args.report, buildFailureReport(args, error));
    return 1;
  }
}

function parseArgs(argv: readonly string[]): CliArgs {
  const args: CliArgs = {
    report: null,
    frameId: 'glove-well-launch-witness',
    timestampMs: 0,
    maxSampleAgeMs: 500
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

    if (key === '--report') args.report = value;
    else if (key === '--frame-id') args.frameId = value;
    else if (key === '--timestamp-ms') args.timestampMs = Number(value);
    else if (key === '--max-sample-age-ms') args.maxSampleAgeMs = Number(value);
    else throw new Error(`unknown argument ${key}`);

    index += 1;
  }

  assertFinite(args.timestampMs, 'timestamp-ms');
  assertFinite(args.maxSampleAgeMs, 'max-sample-age-ms');
  return args;
}

function buildFailureReport(args: CliArgs, error: unknown): GloveWellLaunchFailureReport {
  const message = error instanceof Error ? error.message : String(error);
  return {
    ok: false,
    schema: GLOVE_WELL_LAUNCH_WITNESS_SCHEMA,
    phase: 'building-glove-well-launch-witness',
    failureKind: 'glove-well-launch-invalid',
    error: message,
    route: GLOVE_WELL_LAUNCH_ROUTE,
    lastTrustworthyEvidence: {
      outputPath: args.report ?? '',
      frameId: args.frameId,
      timestampMs: args.timestampMs,
      maxSampleAgeMs: args.maxSampleAgeMs
    }
  };
}

function createFixtureInputFrame(
  frameId: string,
  timestampMs: number,
  {
    pinchActive,
    pinchStrength,
    pinkyActive,
    pinkyHoldMs
  }: {
    pinchActive: boolean;
    pinchStrength: number;
    pinkyActive: boolean;
    pinkyHoldMs: number;
  }
): GloveInputFrame {
  const source: GloveInputSource = {
    schema: 'lerms.source-truth.v0',
    authority: 'synthetic_fixture',
    route: GLOVE_INPUT_FIXTURE_ROUTE,
    frameId,
    timestampMs,
    sampleAgeMs: 0,
    backend: 'fixture-glove-input-sequence',
    model: 'fixture-wilor-mini-shape-v0',
    configId: 'fixture-glove-well-command-v0',
    requestedRoute: GLOVE_INPUT_FIXTURE_ROUTE,
    effectiveRoute: GLOVE_INPUT_FIXTURE_ROUTE,
    fallbackReason: null
  };
  const thumbTip = pinchActive ? { x: 0.43, y: 0.64 } : { x: 0.39, y: 0.66 };
  const indexTip = pinchActive ? { x: 0.455, y: 0.625 } : { x: 0.5, y: 0.58 };
  const pinkyDirection = normalizePoint({ x: 0.64, y: -0.36 });

  return {
    schema: GLOVE_INPUT_FRAME_SCHEMA,
    frameId,
    timestampMs,
    source,
    timing: {
      cameraFrameAgeMs: 96,
      modelLatencyMs: 38,
      publishAgeMs: 12,
      roundTripMs: 118
    },
    coordinateFrame: {
      space: 'screen_normalized',
      origin: 'top_left',
      handedness: 'operator_unmirrored',
      depthPolicy: 'non_load_bearing'
    },
    hand: {
      handedness: 'right',
      confidence: 0.92,
      palmCenter: { x: 0.45, y: 0.65 },
      wrist: { x: 0.43, y: 0.82 }
    },
    fingers: {
      thumb: createFinger(true, pinchStrength, thumbTip, { x: 0.9, y: -0.2 }, ['thumb-tip', 'thumb-ip']),
      index: createFinger(true, 0.86, indexTip, { x: 0.12, y: -0.99 }, ['index-tip', 'index-mcp']),
      middle: createFinger(false, 0.2, { x: 0.47, y: 0.61 }, { x: 0.02, y: -1 }, ['middle-tip', 'middle-mcp']),
      ring: createFinger(false, 0.18, { x: 0.49, y: 0.62 }, { x: 0.02, y: -1 }, ['ring-tip', 'ring-mcp']),
      pinky: createFinger(pinkyActive, pinkyActive ? 0.91 : 0.22, { x: 0.55, y: 0.66 }, pinkyDirection, [
        'pinky-tip',
        'pinky-mcp'
      ])
    },
    gestures: {
      pinch: {
        active: pinchActive,
        strength: pinchStrength,
        distancePx: pinchActive ? 18 : 64,
        distanceNorm: pinchActive ? 0.025 : 0.14,
        pair: ['thumb', 'index']
      },
      pinkyAim: {
        active: pinkyActive,
        holdMs: pinkyHoldMs,
        strength: pinkyActive ? 0.88 : 0.12,
        origin: { x: 0.55, y: 0.66 },
        direction: pinkyDirection
      },
      fist: {
        active: false,
        strength: 0.1
      },
      openPalm: {
        active: !pinchActive,
        strength: pinchActive ? 0.18 : 0.78
      }
    }
  };
}

function createFinger(
  extended: boolean,
  extensionScore: number,
  tip: ScreenPoint,
  direction: ScreenPoint,
  sourceLandmarkIds: string[]
): FingerInput {
  return {
    confidence: 0.9,
    extended,
    extensionScore,
    tip,
    base: { x: tip.x - direction.x * 0.12, y: tip.y - direction.y * 0.12 },
    direction: normalizePoint(direction),
    sourceLandmarkIds
  };
}

function assertGloveInputFrame(frame: GloveInputFrame): void {
  if (frame.schema !== GLOVE_INPUT_FRAME_SCHEMA) {
    throw new Error(`glove input schema must be ${GLOVE_INPUT_FRAME_SCHEMA}`);
  }
  if (frame.coordinateFrame.space !== 'screen_normalized') {
    throw new Error('glove input coordinateFrame.space must be screen_normalized');
  }
  if (frame.coordinateFrame.origin !== 'top_left') {
    throw new Error('glove input coordinateFrame.origin must be top_left');
  }
  if (frame.coordinateFrame.handedness !== 'operator_unmirrored') {
    throw new Error('glove input coordinateFrame.handedness must be operator_unmirrored');
  }
  if (frame.coordinateFrame.depthPolicy !== 'non_load_bearing') {
    throw new Error('glove input coordinateFrame.depthPolicy must be non_load_bearing');
  }
  if (frame.hand.confidence < 0.2) {
    throw new Error('glove input hand confidence too low');
  }
  for (const finger of Object.values(frame.fingers)) {
    assertFinitePoint(finger.tip, 'finger.tip');
    assertFinitePoint(finger.direction, 'finger.direction');
  }
  assertSourceRouteTruth(frame.source);
}

function assertSourceRouteTruth(source: GloveInputSource): void {
  if (!source.route || !source.backend || !source.configId || !source.frameId) {
    throw new Error('glove input source requires route, backend, configId, and frameId');
  }
  if (source.authority === 'fallback') {
    if (!source.requestedRoute || !source.effectiveRoute || !source.fallbackReason) {
      throw new Error('fallback source must include requestedRoute, effectiveRoute, and fallbackReason');
    }
  }
}

function commandSourceForInput(frame: GloveInputFrame): SourceTruth {
  const staleAuthority = authorityForFreshness(frame.source.authority, frame.timing.cameraFrameAgeMs);

  return {
    schema: 'lerms.source-truth.v0',
    authority: staleAuthority,
    route: 'lerms/glove-well-command/from-glove-input',
    frameId: `command:${frame.frameId}`,
    timestampMs: frame.timestampMs,
    sampleAgeMs: Math.max(frame.source.sampleAgeMs, frame.timing.cameraFrameAgeMs),
    backend: `glove-well-command-bridge:${frame.source.backend}`,
    configId: `${frame.source.configId}:screen-plane-no-depth`
  };
}

function authorityForFreshness(authority: SimulationAuthority, cameraFrameAgeMs: number): SimulationAuthority {
  if (cameraFrameAgeMs > 320) return 'invalid';
  if (cameraFrameAgeMs > 220) return 'stale_hold';
  return authority;
}

function createAim(frame: GloveInputFrame): GloveWellCommand['aim'] {
  const origin = copyPoint(frame.gestures.pinkyAim.origin);
  const direction = normalizePoint(frame.gestures.pinkyAim.direction);

  return {
    origin,
    direction,
    arcSamples: Array.from({ length: 7 }, (_, index) => {
      const t = index / 6;
      return {
        x: round3(origin.x + direction.x * t * 0.34),
        y: round3(origin.y + direction.y * t * 0.34 + t * t * 0.16),
        t: round3(t)
      };
    })
  };
}

function createPhysicsSource(frameId: string, timestampMs: number): SourceTruth {
  return {
    schema: 'lerms.source-truth.v0',
    authority: 'live_simulation',
    route: 'lerms/glove-well-launch/deterministic-physics',
    frameId: `${frameId}:physics`,
    timestampMs,
    sampleAgeMs: 0,
    backend: 'deterministic-glove-well-launch-physics',
    configId: 'glove-well-launch-physics-v0'
  };
}

function createLaunchTerrain(source: SourceTruth): HillOfHillsTerrain {
  const samples = [
    sampleLaunchTerrain(source, 'terrain-glove-well-crown', 0, 4.8),
    sampleLaunchTerrain(source, 'terrain-glove-well-roll', 0.9, 2.1),
    sampleLaunchTerrain(source, 'terrain-glove-well-settle', 1.55, 0.25)
  ];

  return {
    source,
    params: launchTerrainParams(),
    samples,
    witness: {
      schema: 'lerms.hill-of-hills-witness.v0',
      source,
      sourceAuthority: source.authority,
      route: source.route,
      fallbackStatus: 'none',
      effectiveParams: launchTerrainParams(),
      gridResolution: { x: 3, z: 1 },
      sampleSpacing: { x: 1, z: 1 },
      sampleCount: samples.length,
      sampleChecksum: checksum(samples.map((sample) => `${sample.id}:${sample.height.toFixed(4)}:${sample.region}`).join('|')),
      heightRange: {
        min: Math.min(...samples.map((sample) => sample.height)),
        max: Math.max(...samples.map((sample) => sample.height))
      },
      regionCounts: countRegions(samples)
    }
  };
}

function createLaunchedGoin(source: SourceTruth, command: GloveWellCommand): GoinState {
  if (!command.release) {
    throw new Error('launch requires release command');
  }

  return {
    schema: 'lerms.goin-state.v0',
    id: 'glove-well-launched-goin-001',
    source,
    state: 'rolling',
    world: [1.18, 1.02, 1.62],
    velocity: [command.release.initialVelocity.x, 0.08, -Math.abs(command.release.initialVelocity.y) - 0.72],
    desireRadius: 3.35,
    mass: 1.45
  };
}

function createReroutingLerms(source: SourceTruth, goin: GoinState): LermState[] {
  return [
    createReroutingLerm(source, 'red-glove-well-reroute-001', goin, [0.24, 0.88, 2.18]),
    createReroutingLerm(source, 'red-glove-well-reroute-002', goin, [2.2, 0.8, 2.42])
  ];
}

function createReroutingLerm(source: SourceTruth, id: string, goin: GoinState, world: Vec3): LermState {
  const toGoin = subtractVec3(goin.world, world);
  return {
    schema: 'lerms.lerm-state.v0',
    id,
    source,
    species: 'red',
    state: 'rerouting_to_goin',
    world,
    heading: normalizeVec3([toGoin[0], 0, toGoin[2]]),
    terrainContact: {
      terrainSampleId: 'terrain-glove-well-roll',
      grounded: true,
      contactWorld: [goin.world[0], 0.94, goin.world[2]]
    },
    targetGoinId: goin.id,
    speed: 1.5
  };
}

function createRerouteHints(source: SourceTruth, goin: GoinState, lerms: readonly LermState[]): GoinRerouteHint[] {
  return lerms.map((lerm) => {
    const toGoin = subtractVec3(goin.world, lerm.world);
    const distanceToGoin = Math.hypot(toGoin[0], toGoin[1], toGoin[2]);
    return {
      schema: 'lerms.goin-reroute-hint.v0',
      source,
      lermId: lerm.id,
      targetGoinId: goin.id,
      goinState: 'rolling',
      distanceToGoin,
      rerouteRadius: goin.desireRadius,
      desireStrength: clamp(1 - distanceToGoin / goin.desireRadius, 0.05, 1),
      desiredHeading: normalizeVec3([toGoin[0], 0, toGoin[2]])
    };
  });
}

function sampleLaunchTerrain(source: SourceTruth, id: string, x: number, z: number): TerrainSample {
  const height = 0.52 + z * 0.12 + Math.sin(x * 1.2 + z * 0.25) * 0.03;
  const dx = Math.cos(x * 1.2 + z * 0.25) * 0.036;
  const dz = 0.12 + Math.cos(x * 1.2 + z * 0.25) * 0.0075;
  return {
    schema: 'lerms.terrain-sample.v0',
    id,
    source,
    world: [x, height, z],
    normal: normalizeVec3([-dx, 1, -dz]),
    height,
    slope: Math.hypot(dx, dz),
    region: z > 4 ? 'crown' : z > 1 ? 'slope' : 'basin'
  };
}

function launchTerrainParams(): HillOfHillsTerrainParams {
  return {
    seed: 880055,
    width: 4,
    length: 6,
    channelRadius: 4,
    channelCurvature: 1,
    wallHeight: 1,
    floorWidth: 3,
    hillRadius: 1,
    hillHeight: 0.4,
    hillVariance: 0.1,
    valleyRadius: 1,
    valleyHeight: 0.2,
    valleyVariance: 0.1,
    distanceScale: 1,
    textureDamping: 0.8,
    detailDamping: 0.8,
    gridResolutionX: 3,
    gridResolutionZ: 1,
    crownZ: 4.8
  };
}

function countRegions(samples: readonly TerrainSample[]): HillOfHillsTerrain['witness']['regionCounts'] {
  const counts: HillOfHillsTerrain['witness']['regionCounts'] = {};
  for (const sample of samples) {
    counts[sample.region] = (counts[sample.region] ?? 0) + 1;
  }
  return counts;
}

function assertFinitePoint(point: ScreenPoint, label: string): void {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    throw new Error(`${label} must have finite x/y`);
  }
}

function assertFinite(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be finite`);
  }
}

function writeJson(path: string, payload: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(payload, null, 2)}\n`);
}

function copyPoint(point: ScreenPoint): ScreenPoint {
  return { x: point.x, y: point.y };
}

function scalePoint(point: ScreenPoint, scale: number): ScreenPoint {
  return {
    x: round3(point.x * scale),
    y: round3(point.y * scale)
  };
}

function normalizePoint(point: ScreenPoint): ScreenPoint {
  const length = Math.hypot(point.x, point.y) || 1;
  return {
    x: point.x / length,
    y: point.y / length
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

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function checksum(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = runGloveWellLaunchWitnessCli();
}
