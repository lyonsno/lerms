import assert from 'node:assert/strict';

import {
  createLermHordeSupportProfileRequest,
  resolveLermHordePresentationSupportBinding,
} from '../src/lerm-horde-primary-viewer-actor-frame.js';
import {
  HILL_GPU_RESIDENT_ROUTE,
  advanceHillGpuCpuOracle,
  assertHillGpuResidentReceipt,
  createHillGpuCpuOracleState,
  createHillGpuInitialization,
  createHillGpuPresentationPlan,
  createHillGpuProducerEventBatch,
  createHillGpuResidentReceipt,
  createHillGpuSupportBinding,
} from '../src/terrain/hill-of-hills-gpu-resident.js';
import {
  createHillOfHillsTerrain,
  createHillOfHillsTerrainBuffer,
} from '../src/terrain/hill-of-hills.js';

const terrain = createHillOfHillsTerrain(
  {
    gridResolutionX: 12,
    gridResolutionZ: 16,
    trailPhaseIntensity: 0,
    trailPhaseLimit: 0,
    topologyPhaseIntensity: 0,
    topologyPhaseLimit: 0,
  },
  {
    route: 'lerms/hill-of-hills/gpu-contract-fixture-v0',
    frameId: 'hill-gpu-contract-frame-0',
    configId: 'hill-gpu-contract-fixture-v0',
    timestampMs: 0,
    sampleAgeMs: 0,
  },
);
const terrainBuffer = createHillOfHillsTerrainBuffer(terrain);
const initialization = createHillGpuInitialization(terrainBuffer);

assert.equal(
  initialization.route.requested,
  HILL_GPU_RESIDENT_ROUTE,
);
assert.equal(
  initialization.route.effective,
  HILL_GPU_RESIDENT_ROUTE,
);
assert.equal(initialization.route.fallbackStatus, 'none');
assert.equal(initialization.route.staleStatus, 'fresh');
assert.equal(initialization.generation, 0);
assert.equal(initialization.sampleCount, terrainBuffer.sampleCount);
assert.equal(
  initialization.addressingKey,
  [
    terrainBuffer.gridResolution.x,
    terrainBuffer.gridResolution.z,
    terrainBuffer.params.length,
    terrainBuffer.params.width,
  ].join(':'),
  'GPU addressing identity binds grid and domain dimensions',
);
assert.equal(initialization.upload.fullTerrainUploadOrdinal, 1);
assert.ok(initialization.upload.fullTerrainBytes > 0);
assert.equal(initialization.channels.retainedTraffic.causal, true);
assert.equal(
  initialization.channels.retainedTraffic.interpolation,
  'authoritative-current',
);
assert.equal(
  initialization.channels.height.interpolation,
  'linear-compatible-addressing',
);
assert.equal(initialization.channels.normal.interpolation, 'derived');
assert.equal(
  initialization.channels.topologyMembership.interpolation,
  'snap-current',
);

const state0 = createHillGpuCpuOracleState(initialization);
const eventBatch = createHillGpuProducerEventBatch(
  initialization,
  [
    {
      episodeId: 'episode-a',
      sequence: 0,
      startMs: 0,
      endMs: 25,
      worldX: -1.25,
      worldZ: -0.8,
      contactWeight: 0.9,
      radius: 1.1,
    },
    {
      episodeId: 'episode-a',
      sequence: 1,
      startMs: 25,
      endMs: 50,
      worldX: -1.1,
      worldZ: -0.55,
      contactWeight: 0.8,
      radius: 1.1,
    },
  ],
);
assert.equal(eventBatch.schema, 'lerms.hill-gpu-producer-events.v0');
assert.equal(eventBatch.events.length, 2);
assert.equal(eventBatch.highestAdmittedEventSequence, 1);
assert.ok(eventBatch.compactPayloadBytes > 0);
assert.ok(
  eventBatch.compactPayloadBytes <
    initialization.upload.fullTerrainBytes,
  'producer ingress is compact relative to the one-time terrain upload',
);
assert.equal(
  JSON.stringify(eventBatch).includes('"positions"'),
  false,
  'producer ingress cannot smuggle the terrain position field',
);
assert.throws(
  () =>
    createHillGpuProducerEventBatch(initialization, [
      {
        episodeId: 'episode-a',
        sequence: 1,
        startMs: 25,
        endMs: 50,
        worldX: 0,
        worldZ: 0,
        contactWeight: 1,
        radius: 1,
      },
      {
        episodeId: 'episode-a',
        sequence: 0,
        startMs: 0,
        endMs: 25,
        worldX: 0,
        worldZ: 0,
        contactWeight: 1,
        radius: 1,
      },
    ]),
  /sequence|ordered/i,
);

const state1 = advanceHillGpuCpuOracle(
  state0,
  eventBatch,
  0.025,
);
assert.equal(state1.previousGeneration, 0);
assert.equal(state1.generation, 1);
assert.equal(state1.highestAdmittedEventSequence, 1);
const contactIndex = nearestSampleIndex(
  initialization.basePositions,
  -1.25,
  -0.8,
);
assert.ok(
  state1.currentTraffic[contactIndex] > 0,
  'Episode A contact writes retained GPU traffic',
);
assert.ok(
  state1.currentHeights[contactIndex] <
    initialization.basePositions[contactIndex * 3 + 1],
  'retained traffic causally compacts visible terrain height',
);

const emptyBatch = createHillGpuProducerEventBatch(
  initialization,
  [],
  1,
);
const state2 = advanceHillGpuCpuOracle(
  state1,
  emptyBatch,
  0.025,
);
assert.equal(state2.generation, 2);
assert.equal(state2.highestAdmittedEventSequence, 1);
assert.ok(
  state2.currentTraffic[contactIndex] > 0,
  'traffic persists after producer departure',
);
assert.ok(
  state2.currentTraffic[contactIndex] <
    state1.currentTraffic[contactIndex],
  'retained traffic follows the explicit bounded decay law',
);
assert.equal(
  state2.previousTraffic[contactIndex],
  state1.currentTraffic[contactIndex],
  'previous/current generations preserve presentation interpolation state',
);

const presentation = createHillGpuPresentationPlan(
  state2,
  0.35,
);
assert.equal(presentation.previousGeneration, 1);
assert.equal(presentation.currentGeneration, 2);
assert.equal(presentation.presentationAlpha, 0.35);
assert.deepEqual(presentation.fields.interpolated, [
  'height',
  'continuous-material-weights',
]);
assert.deepEqual(presentation.fields.derived, ['normal']);
assert.deepEqual(presentation.fields.snapped, [
  'retained-traffic',
  'topology-membership',
  'material-category',
  'event-identity',
  'shock-state',
]);

const rootFrame = {
  schema: 'kaminos.creature-root-frame.v0' as const,
  origin: { x: -1.25, y: 0, z: -0.8 },
  lateral: { x: 1, y: 0, z: 0 },
  normal: { x: 0, y: 1, z: 0 },
  tangent: { x: 0, y: 0, z: 1 },
};
const supportRequest =
  createLermHordeSupportProfileRequest(rootFrame);
const supportBinding = createHillGpuSupportBinding(
  state2,
  supportRequest,
  presentation.presentationAlpha,
);
assert.equal(supportBinding.route.backend, 'webgpu');
assert.equal(
  supportBinding.route.requested,
  supportBinding.route.effective,
);
assert.equal(supportBinding.route.fallbackStatus, 'none');
assert.equal(supportBinding.route.staleStatus, 'fresh');
assert.equal(supportBinding.previous.stations.length, 7);
assert.equal(supportBinding.current.stations.length, 7);
assert.equal(supportBinding.previous.generation, 1);
assert.equal(supportBinding.current.generation, 2);
assert.equal(supportBinding.presentationAlpha, 0.35);
assert.equal(
  supportBinding.timing.synchronousAtPresentationFrequency,
  false,
);
assert.equal(
  JSON.stringify(supportBinding).includes('"positions"'),
  false,
  'support egress cannot contain the full terrain field',
);
const resolvedSupport =
  resolveLermHordePresentationSupportBinding(
    supportBinding,
    rootFrame,
  );
assert.equal(resolvedSupport.terrainSupportProfile.length, 7);
assert.equal(resolvedSupport.presentationAlpha, 0.35);

const receipt = createHillGpuResidentReceipt({
  state: state2,
  presentation,
  renderedPixelCount: 12_345,
  compactQueryCount: 1,
  compactQueryBytes: 384,
  supportBindingCount: 1,
  supportBindingBytes:
    supportBinding.timing.compactPayloadBytes,
  mapLatencyMs: 0.4,
  queueLatencyMs: 0.2,
  generationAgeMs: 3.5,
  mainThreadWaitMs: 0,
  simulationDebtMs: 0,
  droppedProducerEvents: 0,
  delayedQueryCount: 0,
  decisionStabilityEnvelope: 0.0001,
});
assertHillGpuResidentReceipt(receipt);
assert.equal(receipt.ok, true);
assert.equal(receipt.route.requested, HILL_GPU_RESIDENT_ROUTE);
assert.equal(receipt.route.effective, HILL_GPU_RESIDENT_ROUTE);
assert.equal(receipt.route.backend, 'webgpu');
assert.equal(receipt.route.fallbackStatus, 'none');
assert.equal(receipt.route.staleStatus, 'fresh');
assert.equal(receipt.transfer.fullTerrainCpuUploads, 1);
assert.equal(
  receipt.transfer.fullFieldWorkerTransfersAfterInitialization,
  0,
);
assert.equal(
  receipt.transfer.fullFieldReadbacksAfterInitialization,
  0,
);
assert.equal(receipt.presentation.renderedPixelCount, 12_345);
assert.equal(receipt.failure.phase, null);

assert.throws(
  () =>
    assertHillGpuResidentReceipt({
      ...receipt,
      route: {
        ...receipt.route,
        effective: 'lerms/hill-of-hills/cpu-fallback-v0',
        fallbackStatus: 'fallback',
      },
    }),
  /fallback|effective route/i,
);
assert.throws(
  () =>
    assertHillGpuResidentReceipt({
      ...receipt,
      presentation: {
        ...receipt.presentation,
        renderedPixelCount: 0,
      },
    }),
  /blank|pixel/i,
);
assert.throws(
  () =>
    assertHillGpuResidentReceipt({
      ...receipt,
      route: {
        ...receipt.route,
        staleStatus: 'stale',
      },
    }),
  /stale|fresh/i,
);
assert.throws(
  () =>
    assertHillGpuResidentReceipt({
      ...receipt,
      failure: {
        phase: 'device-loss',
        message: 'device vanished',
      },
    }),
  /device-loss|failure/i,
);

console.log('hill of hills GPU resident contracts ok');

function nearestSampleIndex(
  positions: Float32Array,
  x: number,
  z: number,
): number {
  let selected = -1;
  let selectedDistance = Number.POSITIVE_INFINITY;
  for (let index = 0; index < positions.length / 3; index += 1) {
    const dx = positions[index * 3] - x;
    const dz = positions[index * 3 + 2] - z;
    const distance = dx * dx + dz * dz;
    if (distance < selectedDistance) {
      selected = index;
      selectedDistance = distance;
    }
  }
  return selected;
}
