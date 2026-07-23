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
import {
  HILL_OF_HILLS_PRESSURE_FIELD_KINDS,
  HILL_OF_HILLS_TOPOLOGY_EVENT_KINDS,
  defaultHillOfHillsParams,
  type HillOfHillsPressureFieldComfortBand,
  type HillOfHillsPressureFieldKind,
  type HillOfHillsPressureFieldSample,
  type HillOfHillsTerrain,
  type HillOfHillsTerrainParams,
  type HillOfHillsTerrainSample
} from '../terrain/hill-of-hills.ts';

export const FIRST_VERTICAL_COMPOSER_WITNESS_ROUTE = 'first-vertical-composer/witness-file' as const;

interface CliArgs {
  out: string | null;
  frameId: string;
  timestampMs: number;
  maxSampleAgeMs: number;
  redSampleAgeMs: number;
}

const TERRAIN_FIXTURE_PRESSURE: HillOfHillsPressureFieldSample = {
  slope: 0.05,
  curvature: 0,
  ridge: 0.5,
  valley: 0.1,
  saddle: 0,
  basin: 0.1,
  exposure: 0.95,
  route: 0.72,
  erosion: 0.15,
  bloom: 0.36,
  strata: 0.05,
  vegetation: 0.36
};

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
    pressure: TERRAIN_FIXTURE_PRESSURE,
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
      sideDitchAmount: 0,
      topologyAmount: 0,
      topologyHeightDelta: 0,
      topologyDeformation: 0,
      topologyVelocity: 0,
      topologyForce: 0,
      topologyGrossForce: 0,
      topologyOpposedForce: 0,
      topologyContention: 0,
      semanticMemberships: {}
    },
    support: {
      supportClass: 'single_valued_heightfield',
      mappingMode: 'static_domain_to_world',
      domain: { u: 0.5, v: 0.7833333333333333 },
      domainIndex: { x: 0, z: 0 },
      previousHeight: 1.8,
      heightDelta: 0,
      surfaceVelocity: [0, 0, 0],
      motionClass: 'stable',
      shock: 'none'
    },
    surfaceDetail: {
      kind: 'none',
      density: 0,
      edgeMix: 0,
      seed: 0
    },
    materialEdge: {
      kind: 'none',
      anchor: 'none',
      strength: 0,
      dissolve: 0,
      seed: 0
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
      phaseProgress: 0,
      ditchPhaseClock: 0,
      ditchPhaseProgress: 0,
      trailPhaseClock: 0,
      trailPhaseProgress: 0,
      topologyPhaseClock: 0,
      topologyPhaseProgress: 0,
      trailSeedMethod: 'none',
      trailCandidateChecksum: 'none',
      trailCandidateScoreRange: { min: 0, max: 0 },
      selectedTrailScoreRange: { min: 0, max: 0 },
      topologyEventCandidateChecksum: 'none',
      topologyEventCandidateScoreRange: { min: 0, max: 0 },
      selectedTopologyEventScoreRange: { min: 0, max: 0 },
      topologyDynamicsMode: 'direct_synthesis',
      topologyPossibilityMode: 'inherited',
      topologyPossibilityChecksum: 'inherited',
      topologyPossibilityRange: { min: 0, max: 0 }
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
      featureChecksum: 'inline-terrain-socket-feature-fixture-checksum',
      heightfieldMode: 'grid_heightfield',
      heightfieldChecksum: 'inline-terrain-socket-heightfield-fixture-checksum',
      cacheMode: 'uncached_full_grid',
      cacheGeneration: 0,
      cacheStableLayerChecksum: 'inline-terrain-socket-stable-layer-fixture-checksum',
      cacheStableLayerInvalidated: false,
      cacheInvalidated: false,
      cacheReusedSampleCount: 0,
      cacheRecomputedSampleCount: 1,
      recomputeMode: 'full_grid_with_dirty_tiles',
      recomputeTileSize: { x: 4, z: 4 },
      recomputeTileCount: 1,
      dirtyTileCount: 0,
      dirtySampleCount: 0,
      dirtyLayerKinds: [],
      dirtyRegionChecksum: 'none',
      dirtyHaloSamples: 1,
      supportFrame: {
        supportClass: 'single_valued_heightfield',
        mappingMode: 'static_domain_to_world',
        domainBounds: {
          u: { min: 0, max: 1 },
          v: { min: 0, max: 1 }
        },
        worldBounds: {
          x: { min: -5, max: 5 },
          z: { min: -6, max: 6 }
        },
        supportEpoch: 0,
        topologyEpoch: 0,
        substrateTileSize: { x: 4, z: 4 },
        substrateTileCount: 1,
        dirtySubstrateTileCount: 0,
        dirtySubstrateSampleCount: 0,
        dirtySubstrateRegionChecksum: 'none',
        minSupportWavelength: 0,
        maxHeightDelta: 0,
        maxSurfaceSpeed: 0,
        supportFrameChecksum: 'inline-terrain-socket-support-frame-fixture-checksum',
        motionClassCounts: { stable: 1 },
        shockClassCounts: { none: 1 }
      },
      topologyChecksum: 'inline-terrain-socket-topology-fixture-checksum',
      proxyMaterialChecksum: 'inline-terrain-socket-material-fixture-checksum',
      surfaceDetailChecksum: 'inline-terrain-socket-surface-detail-fixture-checksum',
      materialEdgeChecksum: 'inline-terrain-socket-material-edge-fixture-checksum',
      phaseMode: 'stable',
      terrainEpoch: 0,
      activePhaseCount: 0,
      activePhaseKinds: {},
      phaseClock: 0,
      phaseProgress: 0,
      ditchPhaseClock: 0,
      ditchPhaseProgress: 0,
      trailPhaseClock: 0,
      trailPhaseProgress: 0,
      topologyPhaseClock: 0,
      topologyPhaseProgress: 0,
      phaseChecksum: 'inline-terrain-socket-stable-phase-fixture-checksum',
      phaseInfluenceChecksum: 'inline-terrain-socket-stable-phase-influence-fixture-checksum',
      phaseInfluenceRange: { min: 0, max: 0 },
      trailInfluenceRange: { min: 0, max: 0 },
      sideDitchInfluenceRange: { min: 0, max: 0 },
      topologyInfluenceRange: { min: 0, max: 0 },
      topologyDynamicsMode: 'direct_synthesis',
      topologyPossibilityMode: 'inherited',
      topologyPossibilityChecksum: 'inherited',
      topologyPossibilityRange: { min: 0, max: 0 },
      producerTrafficFieldSchema: 'lerms.hill-of-hills.producer-traffic-field.v0',
      producerTrafficFieldChecksum: 'empty-fixture',
      producerTrafficFieldRange: { min: 0, max: 0 },
      producerTrafficAdmittedEpisodeCount: 0,
      producerTrafficStanceContactCount: 0,
      producerTrafficSupportedRootSampleCount: 0,
      producerTrafficExposureSeconds: 0,
      topologyDynamicsChecksum: 'inline-terrain-socket-dynamics-fixture-checksum',
      topologyDynamicsIntegrationOriginMs: 0,
      topologyDeformationRange: { min: 0, max: 0 },
      topologyVelocityRange: { min: 0, max: 0 },
      topologyForceRange: { min: 0, max: 0 },
      topologyGrossForceRange: { min: 0, max: 0 },
      topologyOpposedForceRange: { min: 0, max: 0 },
      topologyContentionRange: { min: 0, max: 0 },
      hillSwellMembershipRange: { min: 0, max: 0 },
      hillSlumpMembershipRange: { min: 0, max: 0 },
      phaseInfluenceKinds: { none: 1 },
      trailSeedMethod: 'none',
      trailCandidateChecksum: 'none',
      trailCandidateScoreRange: { min: 0, max: 0 },
      selectedTrailScoreRange: { min: 0, max: 0 },
      topologyEventVocabulary: HILL_OF_HILLS_TOPOLOGY_EVENT_KINDS,
      topologyEventCandidateChecksum: 'none',
      topologyEventCandidateScoreRange: { min: 0, max: 0 },
      selectedTopologyEventScoreRange: { min: 0, max: 0 },
      topologyEventDebug: [],
      topologyRanges: {
        flowAccumulation: { min: 0.42, max: 0.42 },
        ridgeStrength: { min: 0.5, max: 0.5 },
        valleyStrength: { min: 0.1, max: 0.1 },
        routePressure: { min: 0.72, max: 0.72 },
        ditchPotential: { min: 0.08, max: 0.08 },
        growthPotential: { min: 0.36, max: 0.36 }
      },
      pressureFieldVocabulary: HILL_OF_HILLS_PRESSURE_FIELD_KINDS,
      pressureFieldChecksum: 'inline-terrain-socket-pressure-fixture-checksum',
      pressureFieldRanges: buildFixturePressureRanges(),
      pressureFieldComfort: buildFixturePressureComfort(),
      proxyMaterialCounts: { 'crown-warmth': 1 },
      surfaceDetailCounts: { none: 1 },
      materialEdgeCounts: { none: 1 },
      surfaceAnchorCounts: { none: 1 }
    }
  };
}

function buildFixturePressureRanges(): Record<HillOfHillsPressureFieldKind, { min: number; max: number }> {
  return Object.fromEntries(
    HILL_OF_HILLS_PRESSURE_FIELD_KINDS.map((kind) => [
      kind,
      {
        min: TERRAIN_FIXTURE_PRESSURE[kind],
        max: TERRAIN_FIXTURE_PRESSURE[kind]
      }
    ])
  ) as Record<HillOfHillsPressureFieldKind, { min: number; max: number }>;
}

function buildFixturePressureComfort(): Record<
  HillOfHillsPressureFieldKind,
  HillOfHillsPressureFieldComfortBand
> {
  return Object.fromEntries(
    HILL_OF_HILLS_PRESSURE_FIELD_KINDS.map((kind) => [
      kind,
      {
        target: { min: 0, max: 1 },
        below: 0,
        inside: 1,
        above: 0,
        maxViolation: 0
      }
    ])
  ) as Record<HillOfHillsPressureFieldKind, HillOfHillsPressureFieldComfortBand>;
}

function buildTerrainParams(): HillOfHillsTerrainParams {
  return {
    ...defaultHillOfHillsParams,
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
    topologyPhaseSeed: 12203,
    topologyPhaseIntensity: 0,
    topologyPhaseLimit: 0,
    topologyPhaseRadius: 1.45,
    topologyPhaseHeightScale: 1,
    topologyPhaseBasinBias: 1,
    topologyPhaseHillBias: 1,
    topologyPhaseSaddleBias: 1,
    topologyPhaseTimeMs: 0,
    topologyPhaseDurationMs: 1800,
    gridResolutionX: 1,
    gridResolutionZ: 1,
    crownZ: 3.4
  };
}

const currentModulePath = fileURLToPath(import.meta.url);

if (process.argv[1] === currentModulePath) {
  process.exitCode = runFirstVerticalComposerWitnessCli();
}
