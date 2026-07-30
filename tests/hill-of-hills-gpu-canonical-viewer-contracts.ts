import assert from 'node:assert/strict';

import type {
  LermHordePrimaryViewerActorFrame,
} from '../src/lerm-horde-primary-viewer-actor-frame.js';
import {
  HILL_GPU_RESIDENT_ROUTE,
  advanceHillGpuCpuOracle,
  createHillGpuCpuOracleState,
  createHillGpuInitialization,
  createHillGpuProducerEventBatch,
  createHillGpuSupportBinding,
} from '../src/terrain/hill-of-hills-gpu-resident.js';
import {
  createHillOfHillsTerrain,
  createHillOfHillsTerrainBuffer,
} from '../src/terrain/hill-of-hills.js';
import {
  HILL_GPU_CANONICAL_VIEWER_ROUTE,
  assertHillGpuCanonicalViewerReceipt,
  bindLermHordeActorFrameToHillGpuPresentation,
  createHillGpuCanonicalViewerReceipt,
  createHillGpuPresentedFrameIdentity,
} from '../src/terrain/hill-of-hills-gpu-canonical-viewer.js';

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
    route: 'lerms/hill-of-hills/canonical-gpu-viewer-fixture-v0',
    frameId: 'canonical-gpu-viewer-fixture-0',
    configId: 'canonical-gpu-viewer-fixture-v0',
    timestampMs: 0,
    sampleAgeMs: 0,
  },
);
const initialization = createHillGpuInitialization(
  createHillOfHillsTerrainBuffer(terrain),
);
const state0 = createHillGpuCpuOracleState(initialization);
const state1 = advanceHillGpuCpuOracle(
  state0,
  createHillGpuProducerEventBatch(
    initialization,
    [
      {
        episodeId: 'episode-a',
        sequence: 0,
        startMs: 0,
        endMs: 50,
        worldX: -0.4,
        worldZ: -1.2,
        contactWeight: 0.9,
        radius: 0.72,
      },
    ],
  ),
  0.05,
);
const presented = createHillGpuPresentedFrameIdentity({
  state: state1,
  runtime: {
    requestedRoute: HILL_GPU_RESIDENT_ROUTE,
    effectiveRoute: HILL_GPU_RESIDENT_ROUTE,
    backend: 'webgpu',
    fallbackStatus: 'none',
    staleStatus: 'fresh',
    previousGeneration: 0,
    currentGeneration: 1,
    highestAdmittedEventSequence: 0,
    queueSubmissionOrdinal: 1,
  },
  presentationAlpha: 0.25,
});
assert.equal(presented.route.requested, HILL_GPU_RESIDENT_ROUTE);
assert.equal(presented.route.effective, HILL_GPU_RESIDENT_ROUTE);
assert.equal(presented.route.backend, 'webgpu');
assert.equal(presented.route.fallbackStatus, 'none');
assert.equal(presented.route.staleStatus, 'fresh');
assert.equal(presented.generation.current, 1);
assert.equal(presented.generation.previous, 0);
assert.equal(presented.frameId, state1.identity.frameId);
assert.equal(
  presented.producerTrafficFieldChecksum,
  state1.identity.trafficChecksum,
);
assert.equal(presented.supportFrameChecksum, state1.identity.heightChecksum);

const actor = fixtureActor();
const binding = createHillGpuSupportBinding(
  state1,
  {
    schema: 'lerms.horde-support-profile-request.v0',
    rootWorld: { x: -0.4, z: -1.2 },
    stations: Array.from({ length: 7 }, (_, index) => ({
      t: index / 6,
      worldX: -0.4,
      worldZ: -1.2 + 0.5358 - index * (1.0716 / 6),
    })),
  },
  presented.presentationAlpha,
);
const bound = bindLermHordeActorFrameToHillGpuPresentation(
  actor,
  binding,
  presented,
);
assert.equal(bound.terrain.frameId, presented.frameId);
assert.equal(bound.terrain.sampleChecksum, presented.heightChecksum);
assert.equal(
  bound.terrain.trafficChecksum,
  presented.producerTrafficFieldChecksum,
);
assert.equal(
  bound.pose?.support.renderedHillSourceId,
  presented.frameId,
);
assert.equal(
  bound.pose?.support.sampledHillSourceId,
  'cpu-oracle-hill-frame',
  'the adapter preserves the producer-side sample provenance',
);
assert.equal(
  bound.pose?.support.presentationBinding?.currentFrameId,
  presented.frameId,
);
assert.equal(
  bound.pose?.squirm.terrainSupportProfile.length,
  7,
);

for (const [label, mutate] of [
  [
    'frame',
    (value: typeof presented) => {
      value.frameId = 'forged-frame';
    },
  ],
  [
    'traffic',
    (value: typeof presented) => {
      value.producerTrafficFieldChecksum = 'forged-traffic';
    },
  ],
  [
    'support',
    (value: typeof presented) => {
      value.supportFrameChecksum = 'forged-support';
    },
  ],
  [
    'generation',
    (value: typeof presented) => {
      value.generation.current += 1;
    },
  ],
] as const) {
  const forged = structuredClone(presented);
  mutate(forged);
  assert.throws(
    () =>
      bindLermHordeActorFrameToHillGpuPresentation(
        actor,
        binding,
        forged,
      ),
    /presentation|support|identity|generation|frame/i,
    `${label} mismatch cannot compose`,
  );
}

assert.throws(
  () =>
    createHillGpuPresentedFrameIdentity({
      state: state1,
      runtime: {
        requestedRoute: HILL_GPU_RESIDENT_ROUTE,
        effectiveRoute: 'lerms/hill-of-hills/cpu-fallback-v0',
        backend: 'webgpu',
        fallbackStatus: 'fallback',
        staleStatus: 'fresh',
        previousGeneration: 0,
        currentGeneration: 1,
        highestAdmittedEventSequence: 0,
        queueSubmissionOrdinal: 1,
      },
      presentationAlpha: 0.25,
    }),
  /fallback|effective/i,
);

const receipt = createHillGpuCanonicalViewerReceipt({
  presentation: presented,
  actor: bound,
  transfer: {
    fullTerrainCpuUploads: 1,
    fullFieldWorkerTransfersAfterInitialization: 0,
    fullFieldReadbacksAfterInitialization: 0,
  },
  composition: {
    visibleCanvasCount: 1,
    offscreenActorSurfaceCount: 1,
    actorImportKind: 'external-image-copy',
  },
  visualEvidence: {
    source: 'browser-capture',
    artifactPath:
      'artifacts/hill-gpu-canonical-viewer/frame-episode-a.png',
    sha256:
      '8fbcab9403ad9f50d0de6ec1c8c419c12b4a0a06fcd8fb53293042fc3996709d',
    width: 1280,
    height: 720,
    terrainPixelCount: 432_100,
    actorPixelCount: 8_902,
    sampledAtMs: 1_500,
  },
});
assertHillGpuCanonicalViewerReceipt(receipt);
assert.equal(receipt.route.requested, HILL_GPU_CANONICAL_VIEWER_ROUTE);
assert.equal(receipt.route.effective, HILL_GPU_CANONICAL_VIEWER_ROUTE);
assert.equal(receipt.route.terrain, HILL_GPU_RESIDENT_ROUTE);
assert.equal(receipt.route.fallbackStatus, 'none');
assert.equal(receipt.composition.visibleCanvasCount, 1);
assert.equal(receipt.visualEvidence.source, 'browser-capture');

assert.throws(
  () =>
    assertHillGpuCanonicalViewerReceipt({
      ...receipt,
      visualEvidence: {
        ...receipt.visualEvidence,
        terrainPixelCount: 0,
      },
    }),
  /terrain|blank|pixel/i,
);
assert.throws(
  () =>
    assertHillGpuCanonicalViewerReceipt(
      {
        ...receipt,
        transfer: {
          ...receipt.transfer,
          fullFieldReadbacksAfterInitialization: 1,
        },
      } as unknown as typeof receipt,
    ),
  /readback/i,
);
assert.throws(
  () =>
    assertHillGpuCanonicalViewerReceipt(
      {
        ...receipt,
        composition: {
          ...receipt.composition,
          visibleCanvasCount: 2,
        },
      } as unknown as typeof receipt,
    ),
  /canvas|visible/i,
);
assert.throws(
  () =>
    createHillGpuCanonicalViewerReceipt({
      presentation: presented,
      actor: bound,
      transfer: {
        fullTerrainCpuUploads: 1,
        fullFieldWorkerTransfersAfterInitialization: 0,
        fullFieldReadbacksAfterInitialization: 0,
      },
      composition: {
        visibleCanvasCount: 1,
        offscreenActorSurfaceCount: 1,
        actorImportKind: 'external-image-copy',
      },
      visualEvidence: {
        source: 'runtime-counter' as 'browser-capture',
        artifactPath: '',
        sha256: '',
        width: 1280,
        height: 720,
        terrainPixelCount: 1,
        actorPixelCount: 1,
        sampledAtMs: 1,
      },
    }),
  /browser|capture|artifact|hash/i,
  'a caller-provided runtime pixel integer cannot close visual evidence',
);

console.log('hill of hills canonical GPU viewer contracts ok');

function fixtureActor(): LermHordePrimaryViewerActorFrame {
  return {
    schema: 'lerms.horde-primary-viewer-actor-frame.v0',
    route: {
      requested: 'lerms/lerm-horde/primary-viewer-actor-frame-v0',
      effective: 'lerms/lerm-horde/primary-viewer-actor-frame-v0',
      fallbackStatus: 'none',
      staleStatus: 'fresh',
    },
    identity: {} as LermHordePrimaryViewerActorFrame['identity'],
    lifecycle: {
      phase: 'traversing',
      visible: true,
      elapsedMs: 500,
      tickCount: 3,
    },
    episodeController: null,
    pose: {
      sourceDistance: 1.25,
      motionPhase: 0.2,
      rootFrame: {
        schema: 'kaminos.creature-root-frame.v0',
        origin: { x: -0.4, y: 0.1, z: -1.2 },
        lateral: { x: 1, y: 0, z: 0 },
        normal: { x: 0, y: 1, z: 0 },
        tangent: { x: 0, y: 0, z: 1 },
      },
      attention: {} as NonNullable<
        LermHordePrimaryViewerActorFrame['pose']
      >['attention'],
      support: {
        disposition: 'local-support',
        rootLift: 0.12,
        minimumComplianceMargin: 0.4,
        sampledHeight: 0.1,
        sampledHillSourceId: 'cpu-oracle-hill-frame',
        renderedHillSourceId: 'cpu-oracle-hill-frame',
        hillRevision: 'fixture',
        presentationBinding: null,
      },
      squirm: {
        amplitude: 0.082,
        verticalAmplitude: 0.016,
        phase: 1.7,
        phaseSource: 'route-distance-v0',
        terrainSupportProfile: Array.from(
          { length: 7 },
          (_, index) => ({
            t: index / 6,
            localOffset: 0,
          }),
        ),
      },
      projection: { terrainLength: 15 },
    },
    terrain: {
      frameId: 'cpu-oracle-hill-frame',
      sampleChecksum: 'cpu-oracle-sample',
      topologyChecksum: 'cpu-oracle-topology',
      trafficChecksum: 'cpu-oracle-traffic',
      supportFrameChecksum: 'cpu-oracle-support',
    },
  };
}
