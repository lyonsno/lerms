import {
  assertFluidTerrainWitness,
  createFluidTerrainFailureReport,
  createTerrainFluidFrame,
  runConservativeTerrainFluidStep,
  TERRAIN_FLUID_FRAME_SCHEMA,
  FLUID_TERRAIN_FEEDBACK_FRAME_SCHEMA,
  FLUID_TERRAIN_WITNESS_SCHEMA
} from '../src/terrain/hill-of-hills-fluid-consumer.js';
import {
  createHillOfHillsLayerTileCache,
  createHillOfHillsTerrainBuffer,
  createHillOfHillsTerrainWithCache,
  defaultHillOfHillsParams
} from '../src/terrain/hill-of-hills.js';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const kaminosRuntime = {
  repo: 'kaminos',
  branch: 'origin/main',
  commit: 'ffc1bd973f890cf77f990e4d129da081764018e2',
  packageName: 'kaminos',
  solverIdentity: 'webgpu-pbf-linked-cell-fluid-v0',
  solverRoute: 'webgpu-pbf-linked-cell-fluid-v0',
  representationRoute: 'terrain-heightfield-conservative-water-v0',
  rendererRoute: 'webgpu-screen-space-liquid-surface-v0',
  sourcePath: 'finger-fluid-webgpu-core.js',
  producerDiaulos: 'kaminos-big-papa-fluid-runtime'
} as const;

const terrain = createHillOfHillsTerrainWithCache(
  createHillOfHillsLayerTileCache(),
  {
    ...defaultHillOfHillsParams,
    gridResolutionX: 28,
    gridResolutionZ: 34,
    topologyPhaseIntensity: 0.8,
    topologyPhaseLimit: 3,
    topologyPhaseTimeMs: 920,
    trailPhaseIntensity: 0.32,
    trailPhaseTimeMs: 760
  },
  {
    route: 'hill-of-hills/fluid-consumer-contract',
    frameId: 'hill-fluid-contract-frame',
    configId: 'hill-fluid-contract-v0',
    timestampMs: 44_000,
    sampleAgeMs: 0
  }
);
const terrainBuffer = createHillOfHillsTerrainBuffer(terrain);

const frame = createTerrainFluidFrame(terrainBuffer, {
  frameId: 'terrain-fluid-frame-contract',
  requestedRuntime: kaminosRuntime,
  requestedRepresentationRoute: 'terrain-heightfield-conservative-water-v0',
  requestedOutputRoute: 'lerms/hill-of-hills/fluid-terrain-feedback-frame',
  generatedAtMs: 44_000
});

assert(TERRAIN_FLUID_FRAME_SCHEMA === 'lerms.hill-of-hills.terrain-fluid-frame.v0', 'terrain-fluid frame schema is stable');
assert(FLUID_TERRAIN_FEEDBACK_FRAME_SCHEMA === 'lerms.hill-of-hills.fluid-terrain-feedback-frame.v0', 'feedback frame schema is stable');
assert(FLUID_TERRAIN_WITNESS_SCHEMA === 'lerms.hill-of-hills.fluid-terrain-witness.v0', 'witness schema is stable');
assert(frame.schema === TERRAIN_FLUID_FRAME_SCHEMA, 'terrain-fluid frame carries schema');
assert(frame.source.authority === 'live_simulation', 'terrain-fluid frame preserves live terrain authority');
assert(frame.terrain.sourceFrameId === terrainBuffer.source.frameId, 'terrain-fluid frame records terrain frame id');
assert(frame.terrain.supportFrameChecksum === terrainBuffer.witness.supportFrame.supportFrameChecksum, 'terrain-fluid frame records support checksum');
assert(frame.terrain.terrainEpoch === terrainBuffer.witness.terrainEpoch, 'terrain-fluid frame records terrain epoch');
assert(frame.terrain.topologyEpoch === terrainBuffer.witness.supportFrame.topologyEpoch, 'terrain-fluid frame records topology epoch');
assert(frame.terrain.sampleChecksum === terrainBuffer.sampleChecksum, 'terrain-fluid frame records sample checksum');
assert(frame.terrain.heightChannel === 'height', 'terrain-fluid frame names height channel');
assert(frame.terrain.surfaceVelocityChannel === 'surfaceVelocityY', 'terrain-fluid frame names surface velocity channel');
assert(frame.runtime.requested.commit === kaminosRuntime.commit, 'terrain-fluid frame records requested Kaminos commit');
assert(frame.runtime.effective.commit === kaminosRuntime.commit, 'terrain-fluid frame records effective Kaminos commit');
assert(frame.runtime.requested.solverRoute === 'webgpu-pbf-linked-cell-fluid-v0', 'terrain-fluid frame records requested solver route');
assert(frame.runtime.effective.solverRoute === 'webgpu-pbf-linked-cell-fluid-v0', 'terrain-fluid frame records effective solver route');
assert(frame.runtime.requested.representationRoute === 'terrain-heightfield-conservative-water-v0', 'terrain-fluid frame records requested representation route');
assert(frame.runtime.effective.representationRoute === 'terrain-heightfield-conservative-water-v0', 'terrain-fluid frame records effective representation route');
assert(frame.falseClosureGuards.includes('reject-stale-terrain-epoch'), 'frame lists stale epoch guard');
assert(frame.falseClosureGuards.includes('reject-default-runtime-substitution'), 'frame lists runtime substitution guard');
assert(frame.falseClosureGuards.includes('report-pre-output-failure'), 'frame lists pre-output failure guard');

const feedback = runConservativeTerrainFluidStep(frame, {
  sourceWorld: [0, terrainBuffer.heightRange.max + 0.35, -2.4],
  sourceRate: 0.22,
  dtSeconds: 1 / 30,
  damping: 0.985
});

assert(feedback.schema === FLUID_TERRAIN_FEEDBACK_FRAME_SCHEMA, 'feedback frame carries schema');
assert(feedback.ok === true, 'feedback step is ok');
assert(feedback.frameId === 'terrain-fluid-frame-contract:feedback', 'feedback frame derives from request frame');
assert(feedback.runtime.requested.commit === kaminosRuntime.commit, 'feedback preserves requested runtime commit');
assert(feedback.runtime.effective.commit === kaminosRuntime.commit, 'feedback preserves effective runtime commit');
assert(feedback.runtime.requested.representationRoute === feedback.runtime.effective.representationRoute, 'feedback records exact requested/effective representation');
assert(feedback.output.requestedRoute === 'lerms/hill-of-hills/fluid-terrain-feedback-frame', 'feedback preserves requested output route');
assert(feedback.output.effectiveRoute === 'lerms/hill-of-hills/fluid-terrain-feedback-frame', 'feedback preserves effective output route');
assert(feedback.output.partial === false, 'feedback is not partial');
assert(feedback.output.blank === false, 'feedback is not blank');
assert(feedback.terrain.sourceFrameId === terrain.source.frameId, 'feedback records terrain source frame');
assert(feedback.terrain.supportFrameChecksum === terrain.witness.supportFrame.supportFrameChecksum, 'feedback records support checksum');
assert(feedback.fluid.waterDepth.length === terrainBuffer.sampleCount, 'feedback water depth covers terrain grid');
assert(feedback.fluid.wetness.length === terrainBuffer.sampleCount, 'feedback wetness covers terrain grid');
assert(feedback.fluid.momentumX.length === terrainBuffer.sampleCount, 'feedback momentum x covers terrain grid');
assert(feedback.fluid.momentumZ.length === terrainBuffer.sampleCount, 'feedback momentum z covers terrain grid');
assert(feedback.fluid.maxDepth > 0, 'feedback creates positive water depth');
assert(feedback.fluid.wetSampleCount > 0, 'feedback wets terrain samples');
assert(feedback.fluid.totalMass > 0, 'feedback reports positive total mass');
assert(feedback.conservation.inputMass > 0, 'feedback records input mass');
assert(Math.abs(feedback.conservation.totalMass - feedback.fluid.totalMass) < 1e-6, 'feedback conservation total matches fluid mass');
assert(feedback.feedback.dirtySampleCount === feedback.fluid.wetSampleCount, 'feedback dirty sample count matches wet sample count');
assert(feedback.feedback.erosionPressureMax >= feedback.feedback.erosionPressureMean, 'erosion pressure max bounds mean');
assert(feedback.witness.schema === FLUID_TERRAIN_WITNESS_SCHEMA, 'feedback includes witness schema');
assert(feedback.witness.dynamicFrameIndex > 0, 'witness records dynamic frame index');
assert(feedback.witness.identityComplete === true, 'witness says identity is complete');
assert(feedback.witness.dynamic === true, 'witness says water is dynamic');
assert(feedback.witness.falseClosureRejections.length === 0, 'valid feedback has no false closure rejections');
assertFluidTerrainWitness(feedback);

for (const bad of [
  createTerrainFluidFrame(terrainBuffer, {
    frameId: 'runtime-mismatch',
    requestedRuntime: kaminosRuntime,
    effectiveRuntime: { ...kaminosRuntime, commit: 'stale-default-runtime' },
    requestedRepresentationRoute: 'terrain-heightfield-conservative-water-v0',
    requestedOutputRoute: 'lerms/hill-of-hills/fluid-terrain-feedback-frame'
  }),
  createTerrainFluidFrame(terrainBuffer, {
    frameId: 'representation-mismatch',
    requestedRuntime: kaminosRuntime,
    requestedRepresentationRoute: 'terrain-heightfield-conservative-water-v0',
    effectiveRepresentationRoute: 'fallback-pbf-local',
    requestedOutputRoute: 'lerms/hill-of-hills/fluid-terrain-feedback-frame'
  }),
  createTerrainFluidFrame(terrainBuffer, {
    frameId: 'stale-terrain',
    requestedRuntime: kaminosRuntime,
    requestedRepresentationRoute: 'terrain-heightfield-conservative-water-v0',
    requestedOutputRoute: 'lerms/hill-of-hills/fluid-terrain-feedback-frame',
    terrainEpochOverride: terrain.witness.terrainEpoch - 1
  })
]) {
  const failed = createFluidTerrainFailureReport(bad, 'identity-validation', 'intentional bad contract');
  assert(failed.ok === false, 'failure report is not ok');
  assert(failed.failurePhase === 'identity-validation', 'failure report records phase');
  assert(failed.primaryOutputWritten === false, 'failure before output records no primary output');
  assert(failed.witness.falseClosureRejections.length > 0, 'failure report records false-closure rejection');
  let threw = false;
  try {
    assertFluidTerrainWitness(failed);
  } catch {
    threw = true;
  }
  assert(threw, 'assertFluidTerrainWitness rejects failed frame');
}

console.log('hill of hills fluid consumer contracts ok');
