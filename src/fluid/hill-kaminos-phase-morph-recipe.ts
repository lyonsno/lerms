import {
  createHillOfHillsTerrainBuffer,
  createHillOfHillsTerrainWithCache,
  defaultHillOfHillsParams,
  type HillOfHillsLayerTileCache,
  type HillOfHillsTerrainBuffer,
  type HillOfHillsTerrainParams
} from '../terrain/hill-of-hills.js';
import { applyHillDiagnosticParamPreset } from '../terrain/hill-of-hills-diagnostic-presets.js';

export const HILL_KAMINOS_PHASE_MORPH_RECIPE = Object.freeze({
  schema: 'lerms.hill-of-hills.phase-morph-frame-recipe.v1',
  producerRevision: '3a0667007efaf8e28727e507c53a6c1fbfdbd036',
  preset: 'topology-contention',
  sourceRoute: 'lerms/hill-of-hills/wet-border-phase-morph-recipe',
  sourceConfigId: 'topology-contention-phase-boundary-v1',
  sequenceId: 'hill-topology-contention-phase-boundary-main-3a06670-v1',
  backend: 'deterministic-cpu-heightfield',
  authority: 'live_simulation',
  sourceIntervalSeconds: 0.104,
  motionSubstepEnvelopeSeconds: 0.104,
  maximumBedDisplacement: 0.021151423454284668,
  maximumSupportSpeed: 0.26246118545532227,
  previous: {
    topologyPhaseTimeMs: 5_148,
    sourceTimestampMs: 100_000,
    terrainEpoch: 0,
    sampleChecksum: 'e8ea1f0c',
    topologyChecksum: 'caebb5e2',
    supportFrameChecksum: '1abdd1f8',
    stableSampleCount: 1_193,
    phaseMorphSampleCount: 5_719,
    shockFreeSampleCount: 6_912
  },
  current: {
    topologyPhaseTimeMs: 5_252,
    sourceTimestampMs: 100_104,
    terrainEpoch: 1,
    sampleChecksum: '1f7d3625',
    topologyChecksum: '8416fa5a',
    supportFrameChecksum: 'cef5f893',
    dirtyRegionChecksum: 'f5b60f25',
    dirtySampleCount: 6_912,
    stableSampleCount: 1_178,
    phaseMorphSampleCount: 5_734,
    shockFreeSampleCount: 6_912
  },
  grid: {
    x: 72,
    z: 96,
    sampleCount: 6_912
  }
} as const);

export type HillKaminosPhaseMorphRecipeFrame = 'previous' | 'current';

export function createHillKaminosPhaseMorphRecipeParams(
  frame: HillKaminosPhaseMorphRecipeFrame
): HillOfHillsTerrainParams {
  return {
    ...applyHillDiagnosticParamPreset(defaultHillOfHillsParams, HILL_KAMINOS_PHASE_MORPH_RECIPE.preset),
    topologyPhaseTimeMs: HILL_KAMINOS_PHASE_MORPH_RECIPE[frame].topologyPhaseTimeMs
  };
}

export function createHillKaminosPhaseMorphRecipeBuffer(
  cache: HillOfHillsLayerTileCache,
  frame: HillKaminosPhaseMorphRecipeFrame
): HillOfHillsTerrainBuffer {
  const recipeFrame = HILL_KAMINOS_PHASE_MORPH_RECIPE[frame];
  return createHillOfHillsTerrainBuffer(
    createHillOfHillsTerrainWithCache(
      cache,
      createHillKaminosPhaseMorphRecipeParams(frame),
      {
        route: HILL_KAMINOS_PHASE_MORPH_RECIPE.sourceRoute,
        frameId: HILL_KAMINOS_PHASE_MORPH_RECIPE.sequenceId,
        configId: HILL_KAMINOS_PHASE_MORPH_RECIPE.sourceConfigId,
        timestampMs: recipeFrame.sourceTimestampMs,
        sampleAgeMs: 0
      }
    )
  );
}

export function assertHillKaminosPhaseMorphRecipePair(
  previous: HillOfHillsTerrainBuffer,
  current: HillOfHillsTerrainBuffer
): void {
  assertRecipeFrame(previous, 'previous');
  assertRecipeFrame(current, 'current');

  if (
    current.witness.terrainEpoch !== previous.witness.terrainEpoch + 1 ||
    current.witness.supportFrame.supportEpoch !== current.witness.terrainEpoch ||
    current.witness.supportFrame.topologyEpoch !== current.witness.terrainEpoch
  ) {
    throw new Error('Hill recipe does not carry exact terrain/support/topology epoch succession');
  }
  if (
    previous.witness.supportFrame.supportClass !== current.witness.supportFrame.supportClass ||
    previous.witness.supportFrame.mappingMode !== current.witness.supportFrame.mappingMode ||
    previous.witness.supportFrame.minSupportWavelength !== current.witness.supportFrame.minSupportWavelength ||
    previous.witness.supportFrame.domainBounds.u.min !== current.witness.supportFrame.domainBounds.u.min ||
    previous.witness.supportFrame.domainBounds.u.max !== current.witness.supportFrame.domainBounds.u.max ||
    previous.witness.supportFrame.domainBounds.v.min !== current.witness.supportFrame.domainBounds.v.min ||
    previous.witness.supportFrame.domainBounds.v.max !== current.witness.supportFrame.domainBounds.v.max ||
    previous.witness.supportFrame.worldBounds.x.min !== current.witness.supportFrame.worldBounds.x.min ||
    previous.witness.supportFrame.worldBounds.x.max !== current.witness.supportFrame.worldBounds.x.max ||
    previous.witness.supportFrame.worldBounds.z.min !== current.witness.supportFrame.worldBounds.z.min ||
    previous.witness.supportFrame.worldBounds.z.max !== current.witness.supportFrame.worldBounds.z.max ||
    previous.witness.supportFrame.substrateTileSize.x !== current.witness.supportFrame.substrateTileSize.x ||
    previous.witness.supportFrame.substrateTileSize.z !== current.witness.supportFrame.substrateTileSize.z ||
    previous.witness.supportFrame.substrateTileCount !==
      current.witness.supportFrame.substrateTileCount
  ) {
    throw new Error('Hill recipe changed support topology or chart mapping');
  }
  if (
    (previous.witness.supportFrame.motionClassCounts.phase_morph ?? 0) !==
      HILL_KAMINOS_PHASE_MORPH_RECIPE.previous.phaseMorphSampleCount ||
    (previous.witness.supportFrame.motionClassCounts.stable ?? 0) !==
      HILL_KAMINOS_PHASE_MORPH_RECIPE.previous.stableSampleCount ||
    (previous.witness.supportFrame.shockClassCounts.none ?? 0) !==
      HILL_KAMINOS_PHASE_MORPH_RECIPE.previous.shockFreeSampleCount ||
    (previous.witness.supportFrame.shockClassCounts.shock_reset ?? 0) !== 0 ||
    (current.witness.supportFrame.motionClassCounts.phase_morph ?? 0) !==
      HILL_KAMINOS_PHASE_MORPH_RECIPE.current.phaseMorphSampleCount ||
    (current.witness.supportFrame.motionClassCounts.stable ?? 0) !==
      HILL_KAMINOS_PHASE_MORPH_RECIPE.current.stableSampleCount ||
    (current.witness.supportFrame.shockClassCounts.none ?? 0) !==
      HILL_KAMINOS_PHASE_MORPH_RECIPE.current.shockFreeSampleCount ||
    (current.witness.supportFrame.shockClassCounts.shock_reset ?? 0) !== 0
  ) {
    throw new Error('Hill recipe substituted phase-morph or shock classification');
  }
  if (
    current.witness.dirtySampleCount !== HILL_KAMINOS_PHASE_MORPH_RECIPE.current.dirtySampleCount ||
    current.witness.dirtyRegionChecksum !== HILL_KAMINOS_PHASE_MORPH_RECIPE.current.dirtyRegionChecksum
  ) {
    throw new Error('Hill recipe substituted dirty-region identity');
  }
}

function assertRecipeFrame(
  buffer: HillOfHillsTerrainBuffer,
  frame: HillKaminosPhaseMorphRecipeFrame
): void {
  const expected = HILL_KAMINOS_PHASE_MORPH_RECIPE[frame];
  if (
    buffer.source.authority !== HILL_KAMINOS_PHASE_MORPH_RECIPE.authority ||
    buffer.source.backend !== HILL_KAMINOS_PHASE_MORPH_RECIPE.backend ||
    buffer.source.route !== HILL_KAMINOS_PHASE_MORPH_RECIPE.sourceRoute ||
    buffer.source.frameId !== HILL_KAMINOS_PHASE_MORPH_RECIPE.sequenceId ||
    buffer.source.configId !== HILL_KAMINOS_PHASE_MORPH_RECIPE.sourceConfigId ||
    buffer.source.timestampMs !== expected.sourceTimestampMs ||
    buffer.witness.effectiveParams.topologyPhaseTimeMs !== expected.topologyPhaseTimeMs
  ) {
    throw new Error(`Hill ${frame} recipe frame substituted source identity`);
  }
  if (
    buffer.witness.terrainEpoch !== expected.terrainEpoch ||
    buffer.sampleChecksum !== expected.sampleChecksum ||
    buffer.topologyChecksum !== expected.topologyChecksum ||
    buffer.witness.supportFrame.supportFrameChecksum !== expected.supportFrameChecksum
  ) {
    throw new Error(`Hill ${frame} recipe frame substituted epoch or checksum identity`);
  }
  if (
    buffer.gridResolution.x !== HILL_KAMINOS_PHASE_MORPH_RECIPE.grid.x ||
    buffer.gridResolution.z !== HILL_KAMINOS_PHASE_MORPH_RECIPE.grid.z ||
    buffer.sampleCount !== HILL_KAMINOS_PHASE_MORPH_RECIPE.grid.sampleCount
  ) {
    throw new Error(`Hill ${frame} recipe frame substituted grid topology`);
  }
}
