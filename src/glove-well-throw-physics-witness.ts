import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildGloveWellLaunchWitnessReport,
  type GloveWellLaunchWitnessReport
} from './glove-well-command.ts';
import {
  buildGloveWellPreviewBenchPayloadReport,
  type GloveWellPreviewBenchPayloadReport
} from './glove-well-preview-bench-payload.ts';
import {
  assertFirstVerticalFrame,
  summarizeFirstVerticalFrame,
  type FirstVerticalFrame,
  type FirstVerticalSummary,
  type GoinState,
  type LermState,
  type SimulationAuthority,
  type SourceTruth,
  type TerrainRegion,
  type TerrainSample,
  type Vec3
} from './contracts/first-vertical.ts';

export const GLOVE_WELL_THROW_PHYSICS_WITNESS_SCHEMA = 'lerms.glove-well-throw-physics-witness.v0' as const;
export const GLOVE_WELL_THROW_PHYSICS_WITNESS_ROUTE = 'lerms/glove-well/throw-physics-witness-file' as const;
export const GLOVE_WELL_THROW_PHYSICS_ROUTE = 'lerms/glove-well/throw-physics' as const;

type ThrowPhase = 'launch' | 'flight' | 'bounce' | 'rolling' | 'settled' | 'recovered';

interface CliArgs {
  report: string | null;
  frameId: string;
  timestampMs: number;
  sampleAgeMs: number;
  maxSampleAgeMs: number;
}

export interface ThrowTrajectorySample {
  schema: 'lerms.glove-well-throw-trajectory-sample.v0';
  phase: ThrowPhase;
  tMs: number;
  world: Vec3;
  velocity: Vec3;
  terrainSampleId: string;
  contact: boolean;
  angularVelocityRadPerSec: number;
  desireRadius: number;
  desireStrength01: number;
  energy01: number;
}

export interface ThrowBounceContact {
  schema: 'lerms.glove-well-throw-bounce-contact.v0';
  bounceIndex: number;
  terrainSampleId: string;
  world: Vec3;
  incomingVelocity: Vec3;
  outgoingVelocity: Vec3;
  restitution: number;
  spinAfterRadPerSec: number;
}

interface ThrowRerouteHint {
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

interface ThrowSourceTruthSummary {
  effectiveAuthority: SimulationAuthority;
  inputAuthority: SimulationAuthority;
  physicsAuthority: SimulationAuthority;
  fixtureInputDowngrade: boolean;
  sourceInputFrameId: string;
  releaseEventId: string;
  downgrades: string[];
  sourceRoutes: string[];
  maxSampleAgeMs: number;
}

interface ThrowFakeBoundary {
  liveOperatorCameraSmoke: true;
  liveWilorSidecarManager: true;
  finalGoinMesh: true;
  fullCrowdAi: true;
  fullFirstVerticalSuccess: true;
  carrierDropJuiceHitMergeForGloveWellThrow: true;
}

export interface GloveWellThrowPhysicsWitnessReport {
  ok: true;
  schema: typeof GLOVE_WELL_THROW_PHYSICS_WITNESS_SCHEMA;
  route: typeof GLOVE_WELL_THROW_PHYSICS_WITNESS_ROUTE;
  outputPath: string;
  frameId: string;
  timestampMs: number;
  launchWitnessSchema: GloveWellLaunchWitnessReport['schema'];
  sourceTruth: ThrowSourceTruthSummary;
  trajectory: ThrowTrajectorySample[];
  bounceContacts: ThrowBounceContact[];
  frame: FirstVerticalFrame;
  summary: FirstVerticalSummary;
  rerouteHints: ThrowRerouteHint[];
  previewBenchPayload: GloveWellPreviewBenchPayloadReport;
  whatRemainsFake: ThrowFakeBoundary;
}

interface ThrowFailureReport {
  ok: false;
  schema: typeof GLOVE_WELL_THROW_PHYSICS_WITNESS_SCHEMA;
  route: typeof GLOVE_WELL_THROW_PHYSICS_WITNESS_ROUTE;
  phase: 'building-glove-well-throw-physics-witness';
  failureKind: 'throw-physics-invalid' | 'throw-physics-source-stale';
  error: string;
  lastTrustworthyEvidence: {
    outputPath: string;
    frameId: string;
    timestampMs: number;
    sampleAgeMs: number;
    maxSampleAgeMs: number;
  };
}

export interface BuildGloveWellThrowPhysicsWitnessOptions {
  outputPath: string;
  frameId?: string;
  timestampMs?: number;
  sampleAgeMs?: number;
  maxSampleAgeMs?: number;
}

export interface ThrowReleaseEvidence {
  eventId: string;
  sourceInputFrameId: string;
  initialVelocity: Vec3;
  baseWorld?: Vec3;
}

export interface BuildGloveWellThrowPhysicsFromReleaseOptions {
  outputPath: string;
  frameId: string;
  timestampMs: number;
  sampleAgeMs?: number;
  maxSampleAgeMs?: number;
  release: ThrowReleaseEvidence;
  inputAuthority: SimulationAuthority;
  inputRoute: string;
  fixtureInputDowngrade: boolean;
  previewDowngrades?: string[];
}

class ThrowPhysicsSourceStaleError extends Error {
  constructor() {
    super('throw physics source is stale for requested max sample age');
  }
}

export function buildGloveWellThrowPhysicsWitnessReport({
  outputPath,
  frameId = 'glove-well-throw-physics-witness',
  timestampMs = 0,
  sampleAgeMs = 0,
  maxSampleAgeMs = 500
}: BuildGloveWellThrowPhysicsWitnessOptions): GloveWellThrowPhysicsWitnessReport {
  assertFinite(timestampMs, 'timestampMs');
  assertFinite(sampleAgeMs, 'sampleAgeMs');
  assertFinite(maxSampleAgeMs, 'maxSampleAgeMs');
  if (sampleAgeMs > maxSampleAgeMs) {
    throw new ThrowPhysicsSourceStaleError();
  }

  const launchWitness = buildGloveWellLaunchWitnessReport({
    outputPath: `${outputPath}#launch`,
    frameId: `${frameId}-launch`,
    timestampMs,
    maxSampleAgeMs: Number.POSITIVE_INFINITY
  });
  const launchedGoin = launchWitness.frame.goins.find((goin) => goin.id === launchWitness.launchEvidence.launchedGoinId);

  return buildGloveWellThrowPhysicsWitnessReportFromRelease({
    outputPath,
    frameId,
    timestampMs,
    sampleAgeMs,
    maxSampleAgeMs,
    release: {
      eventId: launchWitness.launchEvidence.releaseEventId,
      sourceInputFrameId: launchWitness.launchEvidence.sourceInputFrameId,
      initialVelocity: launchWitness.launchEvidence.initialVelocity,
      baseWorld: launchedGoin?.world
    },
    inputAuthority: launchWitness.frame.source.authority,
    inputRoute: launchWitness.route,
    fixtureInputDowngrade: launchWitness.frame.source.authority === 'synthetic_fixture',
    previewDowngrades: ['throw_physics_fixture_input_not_live_wilor']
  });
}

export function buildGloveWellThrowPhysicsWitnessReportFromRelease({
  outputPath,
  frameId,
  timestampMs,
  sampleAgeMs = 0,
  maxSampleAgeMs = 500,
  release,
  inputAuthority,
  inputRoute,
  fixtureInputDowngrade,
  previewDowngrades = []
}: BuildGloveWellThrowPhysicsFromReleaseOptions): GloveWellThrowPhysicsWitnessReport {
  assertFinite(timestampMs, 'timestampMs');
  assertFinite(sampleAgeMs, 'sampleAgeMs');
  assertFinite(maxSampleAgeMs, 'maxSampleAgeMs');
  if (sampleAgeMs > maxSampleAgeMs) {
    throw new ThrowPhysicsSourceStaleError();
  }

  const physicsSource = createSource('live_simulation', GLOVE_WELL_THROW_PHYSICS_ROUTE, frameId, timestampMs, sampleAgeMs);
  const effectiveAuthority = weakestAuthority([inputAuthority, physicsSource.authority]);
  const trajectory = buildTrajectoryFromRelease(release.initialVelocity, release.baseWorld ?? [1.18, 1.02, 1.62]);
  const terrainSamples = trajectory.map((sample, index) => terrainSampleForTrajectory(physicsSource, sample, index));
  const bounceContacts = buildBounceContacts(trajectory);
  const goins = buildGoins(physicsSource, trajectory);
  const lerms = buildReroutingLerms(physicsSource, goins[0]);
  const frameSource = createSource(effectiveAuthority, GLOVE_WELL_THROW_PHYSICS_WITNESS_ROUTE, frameId, timestampMs, sampleAgeMs);
  const frame: FirstVerticalFrame = {
    schema: 'lerms.first-vertical-frame.v0',
    source: frameSource,
    terrainSamples,
    lerms,
    goins,
    juiceHits: [],
    carrierDropEvents: []
  };
  assertFirstVerticalFrame(frame);
  const rerouteHints = buildRerouteHints(physicsSource, goins[0], lerms);
  const previewBenchPayload = buildThrowPreviewBenchPayload({
    outputPath,
    frameId,
    timestampMs,
    trajectory,
    bounceContacts,
    effectiveAuthority: frameSource.authority,
    fixtureInputDowngrade,
    extraDowngrades: previewDowngrades
  });

  return {
    ok: true,
    schema: GLOVE_WELL_THROW_PHYSICS_WITNESS_SCHEMA,
    route: GLOVE_WELL_THROW_PHYSICS_WITNESS_ROUTE,
    outputPath,
    frameId,
    timestampMs,
    launchWitnessSchema: 'lerms.glove-well-launch-witness.v0',
    sourceTruth: {
      effectiveAuthority: frameSource.authority,
      inputAuthority,
      physicsAuthority: physicsSource.authority,
      fixtureInputDowngrade,
      sourceInputFrameId: release.sourceInputFrameId,
      releaseEventId: release.eventId,
      downgrades: [
        ...(fixtureInputDowngrade ? ['fixture_glove_input_not_live_wilor'] : []),
        'throw_physics_transport_not_vertical_success',
        'no_carrier_drop_juice_hit_merge_for_glove_well_throw'
      ],
      sourceRoutes: [inputRoute, physicsSource.route],
      maxSampleAgeMs: physicsSource.sampleAgeMs
    },
    trajectory,
    bounceContacts,
    frame,
    summary: summarizeFirstVerticalFrame(frame),
    rerouteHints,
    previewBenchPayload,
    whatRemainsFake: {
      liveOperatorCameraSmoke: true,
      liveWilorSidecarManager: true,
      finalGoinMesh: true,
      fullCrowdAi: true,
      fullFirstVerticalSuccess: true,
      carrierDropJuiceHitMergeForGloveWellThrow: true
    }
  };
}

export function runGloveWellThrowPhysicsWitnessCli(argv = process.argv.slice(2)): number {
  const partialArgs = readPartialArgs(argv);
  let args: CliArgs;

  try {
    args = parseArgs(argv);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
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
      buildGloveWellThrowPhysicsWitnessReport({
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

function buildTrajectoryFromRelease(launchVelocity: Vec3, baseWorld: Vec3): ThrowTrajectorySample[] {
  const phases: Array<{
    phase: ThrowPhase;
    tMs: number;
    world: Vec3;
    velocity: Vec3;
    contact: boolean;
    angularVelocityRadPerSec: number;
    desireRadius: number;
    desireStrength01: number;
    energy01: number;
  }> = [
    {
      phase: 'launch',
      tMs: 0,
      world: baseWorld,
      velocity: launchVelocity,
      contact: false,
      angularVelocityRadPerSec: 2.4,
      desireRadius: 3.6,
      desireStrength01: 1,
      energy01: 1
    },
    {
      phase: 'flight',
      tMs: 110,
      world: addVec3(baseWorld, [0.52, 0.36, -0.62]),
      velocity: scaleVec3(addVec3(launchVelocity, [0, -0.32, -0.18]), 0.86),
      contact: false,
      angularVelocityRadPerSec: 4.9,
      desireRadius: 3.32,
      desireStrength01: 0.88,
      energy01: 0.82
    },
    {
      phase: 'bounce',
      tMs: 230,
      world: addVec3(baseWorld, [0.98, -0.08, -1.22]),
      velocity: [launchVelocity[0] * 0.62, 0.54, launchVelocity[2] * 0.76],
      contact: true,
      angularVelocityRadPerSec: 8.4,
      desireRadius: 3.05,
      desireStrength01: 0.73,
      energy01: 0.66
    },
    {
      phase: 'rolling',
      tMs: 390,
      world: addVec3(baseWorld, [1.34, -0.18, -1.82]),
      velocity: [launchVelocity[0] * 0.44, 0, launchVelocity[2] * 0.54],
      contact: true,
      angularVelocityRadPerSec: 7.2,
      desireRadius: 2.5,
      desireStrength01: 0.56,
      energy01: 0.48
    },
    {
      phase: 'bounce',
      tMs: 560,
      world: addVec3(baseWorld, [1.66, -0.22, -2.34]),
      velocity: [launchVelocity[0] * 0.24, 0.18, launchVelocity[2] * 0.32],
      contact: true,
      angularVelocityRadPerSec: 4.8,
      desireRadius: 1.62,
      desireStrength01: 0.31,
      energy01: 0.28
    },
    {
      phase: 'settled',
      tMs: 760,
      world: addVec3(baseWorld, [1.82, -0.24, -2.74]),
      velocity: [0, 0, 0],
      contact: true,
      angularVelocityRadPerSec: 0.4,
      desireRadius: 0.76,
      desireStrength01: 0.12,
      energy01: 0.08
    },
    {
      phase: 'recovered',
      tMs: 1020,
      world: addVec3(baseWorld, [1.82, -0.24, -2.74]),
      velocity: [0, 0, 0],
      contact: true,
      angularVelocityRadPerSec: 0,
      desireRadius: 0,
      desireStrength01: 0,
      energy01: 0
    }
  ];

  return phases.map((sample, index) => ({
    schema: 'lerms.glove-well-throw-trajectory-sample.v0',
    terrainSampleId: `throw-terrain-${index}-${sample.phase}`,
    ...sample
  }));
}

function terrainSampleForTrajectory(source: SourceTruth, sample: ThrowTrajectorySample, index: number): TerrainSample {
  const region: TerrainRegion =
    sample.phase === 'launch' ? 'crown' : sample.phase === 'settled' || sample.phase === 'recovered' ? 'basin' : 'slope';
  const height = sample.world[1] - (sample.contact ? 0.04 : 0.18);
  return {
    schema: 'lerms.terrain-sample.v0',
    id: sample.terrainSampleId,
    source,
    world: [sample.world[0], height, sample.world[2]],
    normal: normalizeVec3([0.03 + index * 0.006, 0.99, 0.12]),
    height,
    slope: 0.11 + index * 0.008,
    region
  };
}

function buildBounceContacts(trajectory: readonly ThrowTrajectorySample[]): ThrowBounceContact[] {
  return trajectory
    .filter((sample) => sample.phase === 'bounce')
    .map((sample, index) => {
      const restitution = index === 0 ? 0.62 : 0.34;
      return {
        schema: 'lerms.glove-well-throw-bounce-contact.v0',
        bounceIndex: index + 1,
        terrainSampleId: sample.terrainSampleId,
        world: sample.world,
        incomingVelocity: [sample.velocity[0] * 1.18, -Math.abs(sample.velocity[1]) - 0.4, sample.velocity[2] * 1.08],
        outgoingVelocity: sample.velocity,
        restitution,
        spinAfterRadPerSec: sample.angularVelocityRadPerSec
      };
    });
}

function buildGoins(source: SourceTruth, trajectory: readonly ThrowTrajectorySample[]): GoinState[] {
  const rolling = required(trajectory.find((sample) => sample.phase === 'rolling'), 'rolling trajectory');
  const settled = required(trajectory.find((sample) => sample.phase === 'settled'), 'settled trajectory');
  const recovered = required(trajectory.find((sample) => sample.phase === 'recovered'), 'recovered trajectory');
  return [
    trajectoryGoin(source, 'throw-physics-goin-rolling-001', 'rolling', rolling),
    trajectoryGoin(source, 'throw-physics-goin-settled-001', 'settled', settled),
    trajectoryGoin(source, 'throw-physics-goin-recovered-001', 'recovered', recovered)
  ];
}

function trajectoryGoin(
  source: SourceTruth,
  id: string,
  state: GoinState['state'],
  sample: ThrowTrajectorySample
): GoinState {
  return {
    schema: 'lerms.goin-state.v0',
    id,
    source,
    state,
    world: sample.world,
    velocity: sample.velocity,
    desireRadius: sample.desireRadius,
    mass: 1.45
  };
}

function buildReroutingLerms(source: SourceTruth, target: GoinState): LermState[] {
  return [
    reroutingLerm(source, 'red-throw-reroute-near-001', target, addVec3(target.world, [-0.72, 0.02, 0.38]), 1.7),
    reroutingLerm(source, 'red-throw-reroute-far-002', target, addVec3(target.world, [1.42, 0.02, 0.78]), 1.34)
  ];
}

function reroutingLerm(source: SourceTruth, id: string, target: GoinState, world: Vec3, speed: number): LermState {
  const toGoin = subtractVec3(target.world, world);
  return {
    schema: 'lerms.lerm-state.v0',
    id,
    source,
    species: 'red',
    state: 'rerouting_to_goin',
    world,
    heading: normalizeVec3([toGoin[0], 0, toGoin[2]]),
    terrainContact: {
      terrainSampleId: 'throw-terrain-3-rolling',
      grounded: true,
      contactWorld: target.world
    },
    targetGoinId: target.id,
    speed
  };
}

function buildRerouteHints(source: SourceTruth, target: GoinState, lerms: readonly LermState[]): ThrowRerouteHint[] {
  return lerms.map((lerm) => {
    const toGoin = subtractVec3(target.world, lerm.world);
    const distanceToGoin = Math.hypot(toGoin[0], toGoin[1], toGoin[2]);
    return {
      schema: 'lerms.goin-reroute-hint.v0',
      source,
      lermId: lerm.id,
      targetGoinId: target.id,
      goinState: 'rolling',
      distanceToGoin,
      rerouteRadius: target.desireRadius,
      desireStrength: clamp(1 - distanceToGoin / target.desireRadius, 0, 1),
      desiredHeading: normalizeVec3([toGoin[0], 0, toGoin[2]])
    };
  });
}

function buildThrowPreviewBenchPayload({
  outputPath,
  frameId,
  timestampMs,
  trajectory,
  bounceContacts,
  effectiveAuthority,
  fixtureInputDowngrade,
  extraDowngrades
}: {
  outputPath: string;
  frameId: string;
  timestampMs: number;
  trajectory: readonly ThrowTrajectorySample[];
  bounceContacts: readonly ThrowBounceContact[];
  effectiveAuthority: SimulationAuthority;
  fixtureInputDowngrade: boolean;
  extraDowngrades: readonly string[];
}): GloveWellPreviewBenchPayloadReport {
  const preview = buildGloveWellPreviewBenchPayloadReport({
    outputPath: `${outputPath}#preview-bench`,
    frameId: `${frameId}-preview-bench`,
    timestampMs
  });
  preview.payload.throwPhysics = {
    schema: GLOVE_WELL_THROW_PHYSICS_WITNESS_SCHEMA,
    route: GLOVE_WELL_THROW_PHYSICS_WITNESS_ROUTE,
    bounceCount: bounceContacts.length,
    trajectorySampleCount: trajectory.length,
    phaseTrace: trajectory.map((sample) => sample.phase).join('>'),
    effectiveAuthority,
    fixtureInputDowngrade
  };
  const inheritedDowngrades = fixtureInputDowngrade
    ? preview.payload.downgrades
    : preview.payload.downgrades.filter((downgrade) => downgrade !== 'fixture_glove_input_not_live_wilor');
  preview.payload.downgrades = [
    ...inheritedDowngrades,
    ...extraDowngrades,
    'throw_physics_transport_not_vertical_success'
  ];
  preview.payload.fields = [
    ...preview.payload.fields,
    { label: 'Throw phases', value: preview.payload.throwPhysics.phaseTrace },
    { label: 'Bounces', value: bounceContacts.length }
  ];
  return preview;
}

function createSource(
  authority: SimulationAuthority,
  route: string,
  frameId: string,
  timestampMs: number,
  sampleAgeMs: number
): SourceTruth {
  return {
    schema: 'lerms.source-truth.v0',
    authority,
    route,
    frameId,
    timestampMs,
    sampleAgeMs,
    backend: route === GLOVE_WELL_THROW_PHYSICS_ROUTE ? 'deterministic-glove-well-throw-physics-v1' : 'glove-well-throw-physics-fixture-input-bridge',
    configId: route === GLOVE_WELL_THROW_PHYSICS_ROUTE ? 'glove-well-throw-physics-v1' : 'glove-well-throw-physics-witness-v1'
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
    frameId: 'glove-well-throw-physics-witness',
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

function buildFailureReport(args: CliArgs, error: unknown): ThrowFailureReport {
  return {
    ok: false,
    schema: GLOVE_WELL_THROW_PHYSICS_WITNESS_SCHEMA,
    route: GLOVE_WELL_THROW_PHYSICS_WITNESS_ROUTE,
    phase: 'building-glove-well-throw-physics-witness',
    failureKind: error instanceof ThrowPhysicsSourceStaleError ? 'throw-physics-source-stale' : 'throw-physics-invalid',
    error: error instanceof Error ? error.message : String(error),
    lastTrustworthyEvidence: {
      outputPath: args.report ?? '',
      frameId: args.frameId,
      timestampMs: args.timestampMs,
      sampleAgeMs: args.sampleAgeMs,
      maxSampleAgeMs: args.maxSampleAgeMs
    }
  };
}

function addVec3(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function subtractVec3(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function scaleVec3(a: Vec3, scalar: number): Vec3 {
  return [a[0] * scalar, a[1] * scalar, a[2] * scalar];
}

function normalizeVec3(vector: Vec3): Vec3 {
  const length = Math.hypot(vector[0], vector[1], vector[2]) || 1;
  return [vector[0] / length, vector[1] / length, vector[2] / length];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
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

function writeJson(path: string, payload: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(payload, null, 2)}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = runGloveWellThrowPhysicsWitnessCli();
}
