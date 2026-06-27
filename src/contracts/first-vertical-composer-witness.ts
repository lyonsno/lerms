import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  summarizeFirstVerticalFrame,
  type FirstVerticalFrame,
  type FirstVerticalSummary,
  type SourceTruth
} from './first-vertical.ts';
import { buildRedLermBodyMotionWitness } from '../red-lerm-body-motion.ts';
import { composeFirstVerticalFrame } from './first-vertical-composer.ts';
import type { HillOfHillsTerrain, HillOfHillsTerrainParams, HillOfHillsTerrainSample } from '../terrain/hill-of-hills.ts';

export const FIRST_VERTICAL_COMPOSER_WITNESS_ROUTE = 'first-vertical-composer/witness-file' as const;

interface CliArgs {
  out: string | null;
  frameId: string;
  timestampMs: number;
  maxSampleAgeMs: number;
  redSampleAgeMs: number;
}

export interface FirstVerticalComposerFixtureFrameOptions {
  frameId: string;
  timestampMs: number;
  maxSampleAgeMs?: number;
  redSampleAgeMs?: number;
}

export interface FirstVerticalComposerWitnessReport {
  ok: true;
  phase: 'complete';
  route: typeof FIRST_VERTICAL_COMPOSER_WITNESS_ROUTE;
  outputPath: string;
  authorityNote: 'integrated fixture evidence; not a live first vertical';
  chamberId: 'lerms-underhill';
  intentionallyEmpty: {
    liveFingerJuicePackets: true;
    liveGoinPhysics: true;
    liveCrowdAi: true;
    generatedLermMotion: true;
  };
  frame: FirstVerticalFrame;
  summary: FirstVerticalSummary;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    out: null,
    frameId: 'first-vertical-composer-witness',
    timestampMs: 0,
    maxSampleAgeMs: 500,
    redSampleAgeMs: 0
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
    else if (key === '--frame-id') args.frameId = value;
    else if (key === '--timestamp-ms') args.timestampMs = Number(value);
    else if (key === '--max-sample-age-ms') args.maxSampleAgeMs = Number(value);
    else if (key === '--red-sample-age-ms') args.redSampleAgeMs = Number(value);
    else throw new Error(`unknown argument ${key}`);

    index += 1;
  }

  if (!Number.isFinite(args.timestampMs)) throw new Error('timestamp-ms must be finite');
  if (!Number.isFinite(args.maxSampleAgeMs)) throw new Error('max-sample-age-ms must be finite');
  if (!Number.isFinite(args.redSampleAgeMs)) throw new Error('red-sample-age-ms must be finite');

  return args;
}

function writeJson(path: string, payload: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(payload, null, 2)}\n`);
}

export function runFirstVerticalComposerWitnessCli(argv = process.argv.slice(2)): number {
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

  try {
    writeJson(args.out, buildFirstVerticalComposerWitnessReport({
      outputPath: args.out,
      frameId: args.frameId,
      timestampMs: args.timestampMs,
      maxSampleAgeMs: args.maxSampleAgeMs,
      redSampleAgeMs: args.redSampleAgeMs
    }));
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    writeJson(args.out, {
      ok: false,
      phase: 'composing-first-vertical-frame',
      failureKind: 'composer-frame-invalid',
      error: message,
      route: FIRST_VERTICAL_COMPOSER_WITNESS_ROUTE,
      lastTrustworthyEvidence: {
        outputPath: args.out,
        redSampleAgeMs: args.redSampleAgeMs,
        maxSampleAgeMs: args.maxSampleAgeMs
      }
    });
    return 1;
  }
}

export function buildFirstVerticalComposerWitnessReport({
  outputPath,
  frameId,
  timestampMs,
  maxSampleAgeMs = 500,
  redSampleAgeMs = 0
}: FirstVerticalComposerFixtureFrameOptions & { outputPath: string }): FirstVerticalComposerWitnessReport {
  const frame = buildFirstVerticalComposerFixtureFrame({
    frameId,
    timestampMs,
    maxSampleAgeMs,
    redSampleAgeMs
  });
  const summary = summarizeFirstVerticalFrame(frame);

  return {
    ok: true,
    phase: 'complete',
    route: FIRST_VERTICAL_COMPOSER_WITNESS_ROUTE,
    outputPath,
    authorityNote: 'integrated fixture evidence; not a live first vertical',
    chamberId: 'lerms-underhill',
    intentionallyEmpty: {
      liveFingerJuicePackets: true,
      liveGoinPhysics: true,
      liveCrowdAi: true,
      generatedLermMotion: true
    },
    frame,
    summary
  };
}

export function buildFirstVerticalComposerFixtureFrame({
  frameId,
  timestampMs,
  maxSampleAgeMs = 500,
  redSampleAgeMs = 0
}: FirstVerticalComposerFixtureFrameOptions): FirstVerticalFrame {
  const terrain = buildTerrainFixture(timestampMs);
  const redLermWitness = buildRedLermBodyMotionWitness();
  const redFrame = {
    ...redLermWitness.firstVerticalFrame,
    source: {
      ...redLermWitness.firstVerticalFrame.source,
      sampleAgeMs: redSampleAgeMs
    }
  };

  return composeFirstVerticalFrame({
    frameId,
    timestampMs,
    terrain,
    sources: [redFrame],
    maxSampleAgeMs
  });
}

function buildTerrainFixture(timestampMs: number): HillOfHillsTerrain {
  const source: SourceTruth = {
    schema: 'lerms.source-truth.v0',
    authority: 'synthetic_fixture',
    route: 'first-vertical-composer/terrain-fixture',
    frameId: 'terrain-fixture-for-composer-witness',
    timestampMs,
    sampleAgeMs: 0,
    backend: 'inline-terrain-socket-fixture',
    configId: 'inline-terrain-socket-fixture-v0'
  };
  const params = buildTerrainParams();
  const sample: HillOfHillsTerrainSample = {
    schema: 'lerms.terrain-sample.v0',
    id: 'terrain-fixture-crown',
    source,
    world: [0, 1.8, 3.4],
    normal: [0, 1, 0],
    height: 1.8,
    slope: 0.05,
    region: 'crown',
    topology: {
      flowDirection: [0, 0.28, 1],
      flowAccumulation: 0.42,
      ridgeStrength: 0.5,
      valleyStrength: 0.1,
      routePressure: 0.72,
      ditchPotential: 0.08,
      growthPotential: 0.36
    },
    proxyMaterial: {
      kind: 'crown-warmth',
      color: [205, 165, 72],
      wetness: 0.18,
      growthTint: 0.26,
      blends: {
        'crown-warmth': 0.72,
        'approach-clay': 0.2,
        'growth-lip': 0.08
      }
    },
    phaseInfluence: {
      kind: 'none',
      amount: 0,
      trailAmount: 0,
      sideDitchAmount: 0
    }
  };

  return {
    source,
    params,
    phaseState: {
      mode: 'stable',
      terrainEpoch: 0,
      activeEpisodes: [],
      checksum: 'inline-terrain-socket-stable-phase-fixture-checksum',
      phaseClock: 0,
      phaseProgress: 0
    },
    samples: [sample],
    witness: {
      schema: 'lerms.hill-of-hills-witness.v0',
      source,
      sourceAuthority: 'synthetic_fixture',
      route: 'first-vertical-composer/terrain-fixture',
      fallbackStatus: 'synthetic_fixture',
      effectiveParams: params,
      gridResolution: { x: 1, z: 1 },
      sampleSpacing: { x: 0, z: 0 },
      sampleCount: 1,
      sampleChecksum: 'inline-terrain-socket-fixture-checksum',
      heightRange: { min: 1.8, max: 1.8 },
      regionCounts: { crown: 1 },
      topologyChecksum: 'inline-terrain-socket-topology-fixture-checksum',
      proxyMaterialChecksum: 'inline-terrain-socket-material-fixture-checksum',
      phaseMode: 'stable',
      terrainEpoch: 0,
      activePhaseCount: 0,
      activePhaseKinds: {},
      phaseClock: 0,
      phaseProgress: 0,
      phaseChecksum: 'inline-terrain-socket-stable-phase-fixture-checksum',
      phaseInfluenceChecksum: 'inline-terrain-socket-stable-phase-influence-fixture-checksum',
      phaseInfluenceRange: { min: 0, max: 0 },
      trailInfluenceRange: { min: 0, max: 0 },
      sideDitchInfluenceRange: { min: 0, max: 0 },
      phaseInfluenceKinds: { none: 1 },
      topologyRanges: {
        flowAccumulation: { min: 0.42, max: 0.42 },
        ridgeStrength: { min: 0.5, max: 0.5 },
        valleyStrength: { min: 0.1, max: 0.1 },
        routePressure: { min: 0.72, max: 0.72 },
        ditchPotential: { min: 0.08, max: 0.08 },
        growthPotential: { min: 0.36, max: 0.36 }
      },
      proxyMaterialCounts: { 'crown-warmth': 1 }
    }
  };
}

function buildTerrainParams(): HillOfHillsTerrainParams {
  return {
    seed: 1,
    width: 10,
    length: 12,
    channelRadius: 4,
    channelCurvature: 1,
    wallHeight: 2,
    floorWidth: 3,
    hillRadius: 1,
    hillCount: 1,
    hillHeight: 1,
    hillVariance: 0.3,
    valleyRadius: 1,
    valleyCount: 1,
    valleyHeight: 0.8,
    valleyVariance: 0.3,
    distanceScale: 1,
    worldScale: 1,
    featureSpacing: 1,
    textureScale: 1,
    textureDamping: 0.5,
    detailDamping: 0.5,
    ditchPhaseSeed: 7301,
    ditchPhaseIntensity: 0,
    ditchPhaseLimit: 0,
    ditchPhaseRadius: 1.25,
    ditchPhaseTimeMs: 0,
    ditchPhaseDurationMs: 1800,
    trailPhaseSeed: 9109,
    trailPhaseIntensity: 0,
    trailPhaseLimit: 0,
    trailPhaseRadius: 1.4,
    trailPhaseTimeMs: 0,
    trailPhaseDurationMs: 1900,
    gridResolutionX: 1,
    gridResolutionZ: 1,
    crownZ: 3.4
  };
}

const currentModulePath = fileURLToPath(import.meta.url);

if (process.argv[1] === currentModulePath) {
  process.exitCode = runFirstVerticalComposerWitnessCli();
}
