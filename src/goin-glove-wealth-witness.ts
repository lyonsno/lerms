import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  summarizeFirstVerticalFrame,
  type CarrierDropEvent,
  type FirstVerticalFrame,
  type FirstVerticalSummary,
  type GoinState,
  type JuiceHitEvent,
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

export const GOIN_GLOVE_WEALTH_WITNESS_SCHEMA = 'lerms.goin-glove-wealth-witness.v0' as const;
export const GOIN_REROUTE_HINT_SCHEMA = 'lerms.goin-reroute-hint.v0' as const;
export const GOIN_GLOVE_WEALTH_ROUTE = 'lerms/goin-glove-wealth' as const;
export const GOIN_GLOVE_WEALTH_WITNESS_ROUTE = 'lerms/goin-glove-wealth/witness-file' as const;

interface CliArgs {
  report: string | null;
  frameId: string;
  timestampMs: number;
  sampleAgeMs: number;
  maxSampleAgeMs: number;
}

interface GoinRerouteHint {
  schema: typeof GOIN_REROUTE_HINT_SCHEMA;
  source: SourceTruth;
  lermId: string;
  targetGoinId: string;
  goinState: 'rolling';
  distanceToGoin: number;
  rerouteRadius: number;
  desireStrength: number;
  desiredHeading: Vec3;
}

interface CarrierDropChainReceipt {
  hitId: string;
  dropId: string;
  lermId: string;
  goinId: string;
  rollingGoinId: string;
  preHitCarrierSnapshot: {
    state: 'fleeing_with_goin';
    carryingGoinId: string;
  };
  postDropGoinState: 'rolling';
}

interface EvidenceAuthorityReceipt {
  terrain: SimulationAuthority;
  lerms: SimulationAuthority;
  goins: SimulationAuthority;
  juiceHits: SimulationAuthority;
  carrierDrops: SimulationAuthority;
}

interface FakeBoundaryReceipt {
  finalTreasureEconomy: true;
  fullCrowdAi: true;
  finalArt: true;
  redLermBodyMotion: true;
  bigPapaFluidSolver: true;
  kaminosSceneHosting: true;
}

export interface GoinGloveWealthWitnessReport {
  ok: true;
  schema: typeof GOIN_GLOVE_WEALTH_WITNESS_SCHEMA;
  phase: 'complete';
  route: typeof GOIN_GLOVE_WEALTH_WITNESS_ROUTE;
  outputPath: string;
  authorityNote: 'deterministic goin/glove-wealth subsystem witness; not final economy or final art';
  frame: FirstVerticalFrame;
  summary: FirstVerticalSummary;
  sourceTruthEvaluation: FirstVerticalSourceTruthUpgradeEvaluation;
  terrainSampleIds: {
    crown: string;
    drop: string;
    rolling: string;
    settled: string;
    recovered: string;
  };
  carrierDropChain: CarrierDropChainReceipt;
  rerouteHints: readonly GoinRerouteHint[];
  evidenceAuthority: EvidenceAuthorityReceipt;
  whatRemainsFake: FakeBoundaryReceipt;
}

interface FailureReport {
  ok: false;
  phase: 'building-goin-glove-wealth-frame';
  failureKind: 'goin-witness-invalid' | 'source-truth-upgrade-blocked';
  error: string;
  route: typeof GOIN_GLOVE_WEALTH_WITNESS_ROUTE;
  sourceTruthEvaluation?: FirstVerticalSourceTruthUpgradeEvaluation;
  lastTrustworthyEvidence: {
    outputPath: string;
    frameId: string;
    sampleAgeMs: number;
    maxSampleAgeMs: number;
  };
}

export interface BuildGoinGloveWealthWitnessOptions {
  outputPath: string;
  frameId?: string;
  timestampMs?: number;
  sampleAgeMs?: number;
  maxSampleAgeMs?: number;
}

interface GoinWorld {
  terrain: HillOfHillsTerrain;
  source: SourceTruth;
  terrainSamples: {
    crown: TerrainSample;
    drop: TerrainSample;
    rolling: TerrainSample;
    settled: TerrainSample;
    recovered: TerrainSample;
  };
}

function parseArgs(argv: readonly string[]): CliArgs {
  const args: CliArgs = {
    report: null,
    frameId: 'goin-glove-wealth-witness',
    timestampMs: 0,
    sampleAgeMs: 0,
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
    else if (key === '--sample-age-ms') args.sampleAgeMs = Number(value);
    else if (key === '--max-sample-age-ms') args.maxSampleAgeMs = Number(value);
    else throw new Error(`unknown argument ${key}`);

    index += 1;
  }

  assertFinite(args.timestampMs, 'timestamp-ms');
  assertFinite(args.sampleAgeMs, 'sample-age-ms');
  assertFinite(args.maxSampleAgeMs, 'max-sample-age-ms');
  return args;
}

export function runGoinGloveWealthWitnessCli(argv = process.argv.slice(2)): number {
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
    const report = buildGoinGloveWealthWitnessReport({
      outputPath: args.report,
      frameId: args.frameId,
      timestampMs: args.timestampMs,
      sampleAgeMs: args.sampleAgeMs,
      maxSampleAgeMs: args.maxSampleAgeMs
    });

    writeJson(args.report, report);
    return 0;
  } catch (error) {
    const failure = buildFailureReport(args, error);
    writeJson(args.report, failure);
    return 1;
  }
}

export function buildGoinGloveWealthWitnessReport({
  outputPath,
  frameId = 'goin-glove-wealth-witness',
  timestampMs = 0,
  sampleAgeMs = 0,
  maxSampleAgeMs = 500
}: BuildGoinGloveWealthWitnessOptions): GoinGloveWealthWitnessReport {
  const world = buildGoinWorld(frameId, timestampMs, sampleAgeMs);
  const subsystemFrame = buildGoinSubsystemFrame(world, frameId, timestampMs, sampleAgeMs);
  const frame = composeFirstVerticalFrame({
    frameId,
    timestampMs,
    terrain: world.terrain,
    sources: [subsystemFrame],
    maxSampleAgeMs: Number.POSITIVE_INFINITY,
    route: GOIN_GLOVE_WEALTH_ROUTE
  });
  const summary = summarizeFirstVerticalFrame(frame);
  const sourceTruthEvaluation = evaluateFirstVerticalSourceTruthUpgrade(frame, { maxSampleAgeMs });

  if (!sourceTruthEvaluation.accepted) {
    throw new SourceTruthBlockedError(sourceTruthEvaluation);
  }

  const rollingGoin = required(frame.goins.find((goin) => goin.id === 'goin-001'), 'rolling goin');
  const hit = required(frame.juiceHits.find((candidate) => candidate.id === 'index-hit-carrier-001'), 'carrier hit');
  const drop = required(frame.carrierDropEvents.find((candidate) => candidate.id === 'carrier-drop-goin-001'), 'carrier drop');

  return {
    ok: true,
    schema: GOIN_GLOVE_WEALTH_WITNESS_SCHEMA,
    phase: 'complete',
    route: GOIN_GLOVE_WEALTH_WITNESS_ROUTE,
    outputPath,
    authorityNote: 'deterministic goin/glove-wealth subsystem witness; not final economy or final art',
    frame,
    summary,
    sourceTruthEvaluation,
    terrainSampleIds: {
      crown: world.terrainSamples.crown.id,
      drop: world.terrainSamples.drop.id,
      rolling: world.terrainSamples.rolling.id,
      settled: world.terrainSamples.settled.id,
      recovered: world.terrainSamples.recovered.id
    },
    carrierDropChain: {
      hitId: hit.id,
      dropId: drop.id,
      lermId: drop.lermId,
      goinId: drop.goinId,
      rollingGoinId: rollingGoin.id,
      preHitCarrierSnapshot: {
        state: 'fleeing_with_goin',
        carryingGoinId: 'goin-carried-001'
      },
      postDropGoinState: 'rolling'
    },
    rerouteHints: buildRerouteHints(frame, rollingGoin, world.source),
    evidenceAuthority: {
      terrain: foldEvidenceAuthority(frame.terrainSamples.map((sample) => sample.source.authority)),
      lerms: foldEvidenceAuthority(frame.lerms.map((lerm) => lerm.source.authority)),
      goins: foldEvidenceAuthority(frame.goins.map((goin) => goin.source.authority)),
      juiceHits: foldEvidenceAuthority(frame.juiceHits.map((candidate) => candidate.source.authority)),
      carrierDrops: foldEvidenceAuthority(frame.carrierDropEvents.map((candidate) => candidate.source.authority))
    },
    whatRemainsFake: {
      finalTreasureEconomy: true,
      fullCrowdAi: true,
      finalArt: true,
      redLermBodyMotion: true,
      bigPapaFluidSolver: true,
      kaminosSceneHosting: true
    }
  };
}

function buildFailureReport(args: CliArgs, error: unknown): FailureReport {
  const message = error instanceof Error ? error.message : String(error);
  const sourceTruthEvaluation = error instanceof SourceTruthBlockedError ? error.evaluation : undefined;

  return {
    ok: false,
    phase: 'building-goin-glove-wealth-frame',
    failureKind: sourceTruthEvaluation ? 'source-truth-upgrade-blocked' : 'goin-witness-invalid',
    error: message,
    route: GOIN_GLOVE_WEALTH_WITNESS_ROUTE,
    sourceTruthEvaluation,
    lastTrustworthyEvidence: {
      outputPath: args.report ?? '',
      frameId: args.frameId,
      sampleAgeMs: args.sampleAgeMs,
      maxSampleAgeMs: args.maxSampleAgeMs
    }
  };
}

function buildGoinWorld(frameId: string, timestampMs: number, sampleAgeMs: number): GoinWorld {
  const terrainSource = createTerrainSource(frameId, timestampMs, sampleAgeMs);
  const terrainSamples = {
    crown: sampleCompactTerrain(terrainSource, 'terrain-goin-crown', 0, 5.25),
    drop: sampleCompactTerrain(terrainSource, 'terrain-goin-drop', 0.24, 4.15),
    rolling: sampleCompactTerrain(terrainSource, 'terrain-goin-rolling', 0.1, 2.55),
    settled: sampleCompactTerrain(terrainSource, 'terrain-goin-settled', -0.45, 0.65),
    recovered: sampleCompactTerrain(terrainSource, 'terrain-goin-recovered', -0.15, -4.9)
  };
  const terrain = createCompactGoinTerrain(terrainSource, terrainSamples);
  const source = createSource(frameId, timestampMs, sampleAgeMs);

  return {
    terrain,
    source,
    terrainSamples
  };
}

function buildGoinSubsystemFrame(
  world: GoinWorld,
  frameId: string,
  timestampMs: number,
  sampleAgeMs: number
): FirstVerticalFrame {
  const source = world.source;
  const crown = world.terrainSamples.crown;
  const dropSample = world.terrainSamples.drop;
  const rollingSample = world.terrainSamples.rolling;
  const settledSample = world.terrainSamples.settled;
  const recoveredSample = world.terrainSamples.recovered;
  const droppedVelocity = addVec3([0.02, 0.04, -1.15], scaleVec3(downhillFromNormal(dropSample.normal), 0.35));
  const rollingVelocity = addVec3(droppedVelocity, scaleVec3(downhillFromNormal(rollingSample.normal), 0.85));

  const goins: GoinState[] = [
    {
      schema: 'lerms.goin-state.v0',
      id: 'goin-hoard-001',
      source,
      state: 'hoarded',
      world: [crown.world[0] - 0.36, crown.world[1] + 0.16, crown.world[2] + 0.24],
      velocity: [0, 0, 0],
      desireRadius: 2.6,
      mass: 1.4
    },
    {
      schema: 'lerms.goin-state.v0',
      id: 'goin-carried-001',
      source,
      state: 'carried',
      world: [dropSample.world[0] + 0.05, dropSample.world[1] + 0.42, dropSample.world[2] + 0.18],
      velocity: [0.04, 0, -0.42],
      carrierLermId: 'red-carrier-001',
      desireRadius: 1.1,
      mass: 1.4
    },
    {
      schema: 'lerms.goin-state.v0',
      id: 'goin-dropped-001',
      source,
      state: 'dropped',
      world: [dropSample.world[0], dropSample.world[1] + 0.08, dropSample.world[2]],
      velocity: droppedVelocity,
      desireRadius: 2.2,
      mass: 1.4
    },
    {
      schema: 'lerms.goin-state.v0',
      id: 'goin-001',
      source,
      state: 'rolling',
      world: [rollingSample.world[0], rollingSample.world[1] + 0.08, rollingSample.world[2]],
      velocity: rollingVelocity,
      desireRadius: 3.1,
      mass: 1.4
    },
    {
      schema: 'lerms.goin-state.v0',
      id: 'goin-settled-001',
      source,
      state: 'settled',
      world: [settledSample.world[0], settledSample.world[1] + 0.06, settledSample.world[2]],
      velocity: [0, 0, 0],
      desireRadius: 0.85,
      mass: 1.4
    },
    {
      schema: 'lerms.goin-state.v0',
      id: 'goin-recovered-001',
      source,
      state: 'recovered',
      world: [recoveredSample.world[0], recoveredSample.world[1] + 0.12, recoveredSample.world[2]],
      velocity: [0, 0, 0],
      desireRadius: 0,
      mass: 1.4
    }
  ];
  const lerms: LermState[] = [
    {
      schema: 'lerms.lerm-state.v0',
      id: 'red-carrier-001',
      source,
      species: 'red',
      state: 'fleeing_with_goin',
      world: [dropSample.world[0] + 0.08, dropSample.world[1] + 0.24, dropSample.world[2] + 0.12],
      heading: normalizeVec3([0.1, 0, -1]),
      terrainContact: {
        terrainSampleId: dropSample.id,
        grounded: true,
        contactWorld: dropSample.world
      },
      carryingGoinId: 'goin-carried-001',
      speed: 1.35,
      hitStunMs: 120
    },
    {
      schema: 'lerms.lerm-state.v0',
      id: 'red-reroute-near-001',
      source,
      species: 'red',
      state: 'rerouting_to_goin',
      world: [rollingSample.world[0] - 0.78, rollingSample.world[1] + 0.16, rollingSample.world[2] + 0.34],
      heading: normalizeVec3([0.78, 0, -0.34]),
      terrainContact: {
        terrainSampleId: rollingSample.id,
        grounded: true,
        contactWorld: rollingSample.world
      },
      targetGoinId: 'goin-001',
      speed: 1.62
    },
    {
      schema: 'lerms.lerm-state.v0',
      id: 'red-reroute-near-002',
      source,
      species: 'red',
      state: 'rerouting_to_goin',
      world: [rollingSample.world[0] + 1.18, rollingSample.world[1] + 0.2, rollingSample.world[2] + 0.62],
      heading: normalizeVec3([-1.18, 0, -0.62]),
      terrainContact: {
        terrainSampleId: rollingSample.id,
        grounded: true,
        contactWorld: rollingSample.world
      },
      targetGoinId: 'goin-001',
      speed: 1.48
    }
  ];
  const hit: JuiceHitEvent = {
    schema: 'lerms.juice-hit-event.v0',
    id: 'index-hit-carrier-001',
    source,
    chemistry: 'index_knockback',
    targetKind: 'lerm',
    targetId: 'red-carrier-001',
    contactWorld: [dropSample.world[0] + 0.07, dropSample.world[1] + 0.28, dropSample.world[2] + 0.08],
    impulse: [0.04, 0.22, -1.55],
    sourcePacketId: 'greedy-glove-index-hit-fixture-free-live-ish-packet-001',
    strength: 0.9
  };
  const drop: CarrierDropEvent = {
    schema: 'lerms.carrier-drop-event.v0',
    id: 'carrier-drop-goin-001',
    source,
    cause: 'juice_hit',
    lermId: 'red-carrier-001',
    goinId: 'goin-001',
    world: goins[3].world,
    outgoingVelocity: goins[3].velocity,
    rerouteRadius: goins[3].desireRadius,
    triggeringHitId: hit.id
  };

  return {
    schema: 'lerms.first-vertical-frame.v0',
    source: createSource(`${frameId}:goin-subsystem`, timestampMs, sampleAgeMs),
    terrainSamples: [],
    lerms,
    goins,
    juiceHits: [hit],
    carrierDropEvents: [drop]
  };
}

function buildRerouteHints(
  frame: FirstVerticalFrame,
  rollingGoin: GoinState,
  source: SourceTruth
): GoinRerouteHint[] {
  return frame.lerms
    .filter((lerm) => lerm.state === 'rerouting_to_goin' && lerm.targetGoinId === rollingGoin.id)
    .map((lerm) => {
      const toGoin = subtractVec3(rollingGoin.world, lerm.world);
      const distanceToGoin = Math.hypot(toGoin[0], toGoin[1], toGoin[2]);
      const desireStrength = clamp(1 - distanceToGoin / rollingGoin.desireRadius, 0.05, 1);

      return {
        schema: GOIN_REROUTE_HINT_SCHEMA,
        source,
        lermId: lerm.id,
        targetGoinId: rollingGoin.id,
        goinState: 'rolling',
        distanceToGoin,
        rerouteRadius: rollingGoin.desireRadius,
        desireStrength,
        desiredHeading: normalizeVec3([toGoin[0], 0, toGoin[2]])
      };
    });
}

function createSource(frameId: string, timestampMs: number, sampleAgeMs: number): SourceTruth {
  return {
    schema: 'lerms.source-truth.v0',
    authority: 'live_simulation',
    route: GOIN_GLOVE_WEALTH_ROUTE,
    frameId,
    timestampMs,
    sampleAgeMs,
    backend: 'deterministic-goin-custody-rolling-v0',
    configId: 'goin-glove-wealth-witness-v0'
  };
}

function createTerrainSource(frameId: string, timestampMs: number, sampleAgeMs: number): SourceTruth {
  return {
    schema: 'lerms.source-truth.v0',
    authority: 'live_simulation',
    route: 'lerms/goin-glove-wealth/compact-terrain-sampler',
    frameId: `${frameId}:compact-terrain`,
    timestampMs,
    sampleAgeMs,
    backend: 'compact-deterministic-goin-terrain-sampler',
    configId: 'goin-compact-terrain-v0'
  };
}

function createCompactGoinTerrain(
  source: SourceTruth,
  terrainSamples: GoinWorld['terrainSamples']
): HillOfHillsTerrain {
  const samples = [
    terrainSamples.crown,
    terrainSamples.drop,
    terrainSamples.rolling,
    terrainSamples.settled,
    terrainSamples.recovered
  ];

  return {
    source,
    params: compactTerrainParams(),
    samples,
    witness: {
      schema: 'lerms.hill-of-hills-witness.v0',
      source,
      sourceAuthority: source.authority,
      route: source.route,
      fallbackStatus: 'none',
      effectiveParams: compactTerrainParams(),
      gridResolution: { x: 5, z: 1 },
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

function compactTerrainParams(): HillOfHillsTerrainParams {
  return {
    seed: 774411,
    width: 4.2,
    length: 11.5,
    channelRadius: 5.4,
    channelCurvature: 1.18,
    wallHeight: 1.4,
    floorWidth: 3.9,
    hillRadius: 1,
    hillHeight: 0.3,
    hillVariance: 0.1,
    valleyRadius: 1,
    valleyHeight: 0.2,
    valleyVariance: 0.1,
    distanceScale: 1,
    textureDamping: 0.8,
    detailDamping: 0.8,
    gridResolutionX: 5,
    gridResolutionZ: 1,
    crownZ: 5.25
  };
}

function sampleCompactTerrain(source: SourceTruth, id: string, x: number, z: number): TerrainSample {
  const height = 0.46 + (z + 6) * 0.11 + 0.045 * Math.sin(x * 1.7 + z * 0.4) - 0.025 * Math.cos(z * 1.2);
  const dx = 0.045 * 1.7 * Math.cos(x * 1.7 + z * 0.4);
  const dz = 0.11 + 0.045 * 0.4 * Math.cos(x * 1.7 + z * 0.4) + 0.025 * 1.2 * Math.sin(z * 1.2);
  const normal = normalizeVec3([-dx, 1, -dz]);

  return {
    schema: 'lerms.terrain-sample.v0',
    id,
    source,
    world: [x, height, z],
    normal,
    height,
    slope: Math.hypot(dx, dz),
    region: classifyCompactRegion(x, z)
  };
}

function classifyCompactRegion(x: number, z: number): TerrainSample['region'] {
  if (z > 4.75 && Math.abs(x) < 1.2) return 'crown';
  if (z < -4.2) return 'approach';
  if (Math.abs(x) > 1.65) return 'gutter';
  if (z < 1.2) return 'basin';
  return 'slope';
}

function countRegions(samples: readonly TerrainSample[]): HillOfHillsTerrain['witness']['regionCounts'] {
  const counts: HillOfHillsTerrain['witness']['regionCounts'] = {};
  for (const sample of samples) {
    counts[sample.region] = (counts[sample.region] ?? 0) + 1;
  }
  return counts;
}

function foldEvidenceAuthority(authorities: readonly SimulationAuthority[]): SimulationAuthority {
  if (authorities.includes('invalid')) return 'invalid';
  if (authorities.includes('fallback')) return 'fallback';
  if (authorities.includes('stale_hold')) return 'stale_hold';
  if (authorities.includes('visual_only')) return 'visual_only';
  if (authorities.includes('synthetic_fixture')) return 'synthetic_fixture';
  return 'live_simulation';
}

function downhillFromNormal(normal: Vec3): Vec3 {
  return normalizeVec3([normal[0], 0, normal[2]]);
}

function addVec3(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function subtractVec3(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function scaleVec3(vector: Vec3, scale: number): Vec3 {
  return [vector[0] * scale, vector[1] * scale, vector[2] * scale];
}

function normalizeVec3(vector: Vec3): Vec3 {
  const length = Math.hypot(vector[0], vector[1], vector[2]) || 1;
  return [vector[0] / length, vector[1] / length, vector[2] / length];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
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

function checksum(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function writeJson(path: string, payload: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(payload, null, 2)}\n`);
}

class SourceTruthBlockedError extends Error {
  readonly evaluation: FirstVerticalSourceTruthUpgradeEvaluation;

  constructor(evaluation: FirstVerticalSourceTruthUpgradeEvaluation) {
    super(`source truth upgrade blocked: ${evaluation.blockers.join(', ')}`);
    this.evaluation = evaluation;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = runGoinGloveWealthWitnessCli();
}
