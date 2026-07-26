import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  HILL_OF_HILLS_TERRAIN_BUFFER_SCHEMA,
} from '../src/terrain/hill-of-hills.js';
import {
  HILL_HORDE_REVIEWED_SOURCE_REVISION,
  composeHordeTraversalIntoLiveHill,
} from '../src/hill-horde-live-traversal-admission.js';
import {
  LERM_HORDE_REVIEWED_LIVE_HILL_REVISION,
  composeLermHordeLiveBodyMotion,
} from '../src/lerm-horde-live-body-motion.js';
import {
  createHillHordeSameScenePrefixReplay,
} from '../src/hill-horde-same-scene-prefix-replay.js';
import {
  FULL_HILL_RENDERER_ID,
  FULL_HILL_REPLAY_FRAME_COUNT,
  FULL_HILL_SOURCE_AUTHORITY,
  FULL_HILL_SOURCE_BACKEND,
  FULL_HILL_SOURCE_CONFIG,
  FULL_HILL_SOURCE_ROUTE,
  createFullHillOneRendererSource,
  createHillTerrainGeometry,
  createHillTerrainGridIndices,
  updateHillTerrainGeometry,
  validateFullHillOneRendererReceipt,
  type FullHillOneRendererReceipt,
} from '../src/lerm-horde-full-hill-renderer.js';

const root = process.cwd();
const producerReceiptPath = resolve(
  root,
  'artifacts/lerm-horde-producer-history/receipt.json',
);
const producerReceipt = JSON.parse(readFileSync(producerReceiptPath, 'utf8'));
const source = createFullHillOneRendererSource(producerReceipt);

assert.equal(source.replay.frames.length, FULL_HILL_REPLAY_FRAME_COUNT);
assert.equal(source.replay.frames.length, 18);
assert.equal(source.replay.frames[0].kind, 'no-history-control');
assert.equal(source.replay.frames.at(-2)?.kind, 'actor-departed');
assert.equal(source.replay.frames.at(-1)?.kind, 'after-departure');
assert.equal(source.replay.source.hillRevision, LERM_HORDE_REVIEWED_LIVE_HILL_REVISION);
assert.equal(source.replay.source.hordeRevision, HILL_HORDE_REVIEWED_SOURCE_REVISION);
assert.equal(source.buffers.length, source.replay.frames.length);

const firstBuffer = source.buffers[0];
assert.equal(firstBuffer.schema, HILL_OF_HILLS_TERRAIN_BUFFER_SCHEMA);
assert.deepEqual(firstBuffer.gridResolution, { x: 48, z: 60 });
assert.equal(firstBuffer.sampleCount, 2_880);
assert.equal(firstBuffer.positions.length, firstBuffer.sampleCount * 3);
assert.equal(firstBuffer.normals.length, firstBuffer.sampleCount * 3);
assert.equal(firstBuffer.colors.length, firstBuffer.sampleCount * 3);
assert.ok(
  Math.max(...firstBuffer.colors) > 1,
  'the Hill buffer must retain its authored 8-bit proxy-material color domain',
);

const terrainGeometry = createHillTerrainGeometry(firstBuffer);
const terrainColors = terrainGeometry.getAttribute('color');
assert.ok(
  Math.max(...terrainColors.array) <= 1,
  'the Three adapter must normalize authored 8-bit Hill colors for vertex-color rendering',
);
assert.ok(
  Math.abs(terrainColors.getX(0) - firstBuffer.colors[0] / 255) < 1e-7,
  'the Three adapter must preserve the authored red channel while normalizing it',
);
const laterBuffer = source.buffers[10];
updateHillTerrainGeometry(terrainGeometry, laterBuffer);
assert.ok(
  Math.abs(terrainColors.getY(0) - laterBuffer.colors[1] / 255) < 1e-7,
  'dynamic Hill updates must preserve the normalized authored color domain',
);

const indices = createHillTerrainGridIndices(firstBuffer);
assert.equal(indices.length, (48 - 1) * (60 - 1) * 6);
assert.equal(indices.length / 3, 5_546);
assert.deepEqual(
  [...indices.slice(0, 6)],
  [0, 48, 1, 1, 48, 49],
  'the terrain adapter must triangulate the canonical z-major grid without remapping samples',
);
assert.equal(Math.max(...indices), firstBuffer.sampleCount - 1);

for (const buffer of source.buffers) {
  assert.equal(buffer.schema, HILL_OF_HILLS_TERRAIN_BUFFER_SCHEMA);
  assert.deepEqual(buffer.gridResolution, firstBuffer.gridResolution);
  assert.equal(buffer.sampleCount, firstBuffer.sampleCount);
  assert.equal(buffer.source.authority, FULL_HILL_SOURCE_AUTHORITY);
  assert.equal(buffer.source.route, FULL_HILL_SOURCE_ROUTE);
  assert.equal(buffer.source.backend, FULL_HILL_SOURCE_BACKEND);
  assert.equal(buffer.source.configId, FULL_HILL_SOURCE_CONFIG);
  assert.equal(buffer.witness.fallbackStatus, 'none');
}

const canonicalReplay = createHillHordeSameScenePrefixReplay(
  composeHordeTraversalIntoLiveHill(source.input),
  composeLermHordeLiveBodyMotion(
    composeHordeTraversalIntoLiveHill(source.input),
  ),
);
assert.deepEqual(
  source.replay.frames.map((frame) => frame.terrain.witness.sampleChecksum),
  canonicalReplay.frames.map((frame) => frame.terrain.witness.sampleChecksum),
  'the browser source must consume the canonical replay instead of rebuilding an adjacent history path',
);

const receipt: FullHillOneRendererReceipt = {
  schema: 'lerms.horde-full-hill-one-renderer.v0',
  status: {
    ok: true,
    phase: 'complete',
    fallbackStatus: 'none',
    staleStatus: 'fresh',
    failurePhase: null,
  },
  renderer: {
    requested: FULL_HILL_RENDERER_ID,
    effective: FULL_HILL_RENDERER_ID,
    canvasCount: 1,
    sceneCount: 1,
    cameraCount: 1,
    depthBufferCount: 1,
    depthBits: 24,
    visibleSvgCount: 0,
    terrainTextureSubstitution: false,
  },
  terrain: {
    schema: HILL_OF_HILLS_TERRAIN_BUFFER_SCHEMA,
    gridResolution: firstBuffer.gridResolution,
    sampleCount: firstBuffer.sampleCount,
    triangleCount: indices.length / 3,
    indexOrder: 'z-major-two-triangles-per-cell',
    frameCount: source.buffers.length,
    frames: source.replay.frames.map((frame, index) => {
      const buffer = source.buffers[index];
      return {
        index,
        kind: frame.kind,
        timestampMs: frame.timestampMs,
        prefixSampleCount: frame.prefixSampleCount,
        frameId: buffer.source.frameId,
        source: {
          authority: FULL_HILL_SOURCE_AUTHORITY,
          route: FULL_HILL_SOURCE_ROUTE,
          frameId: buffer.source.frameId,
          timestampMs: buffer.source.timestampMs,
          backend: FULL_HILL_SOURCE_BACKEND,
          configId: FULL_HILL_SOURCE_CONFIG,
          fallbackStatus: 'none',
        },
        sampleChecksum: buffer.sampleChecksum,
        topologyChecksum: buffer.topologyChecksum,
        proxyMaterialChecksum: buffer.proxyMaterialChecksum,
        surfaceDetailChecksum: buffer.surfaceDetailChecksum,
        materialEdgeChecksum: buffer.materialEdgeChecksum,
        trafficChecksum: buffer.witness.producerTrafficFieldChecksum,
        producerTraffic: {
          fieldChecksum: buffer.witness.producerTrafficFieldChecksum,
          admittedEpisodeCount:
            buffer.witness.producerTrafficAdmittedEpisodeCount,
          exposureSeconds: buffer.witness.producerTrafficExposureSeconds,
        },
        topologyPossibilityChecksum:
          buffer.witness.topologyPossibilityChecksum,
        supportFrame: {
          supportClass: buffer.witness.supportFrame.supportClass,
          mappingMode: buffer.witness.supportFrame.mappingMode,
          supportEpoch: buffer.witness.supportFrame.supportEpoch,
          topologyEpoch: buffer.witness.supportFrame.topologyEpoch,
          checksum: buffer.witness.supportFrame.supportFrameChecksum,
        },
      };
    }),
  },
  carrier: {
    identity: '719024',
    bodySha256:
      '8fed20d958ef48797c14ad1d3846a50eae05d43e6ae67f8805060b02f1abde8e',
    visiblePrefixFrameCount: 15,
    departed: true,
  },
  playback: {
    initialState: 'paused',
    operatorPlayCount: 1,
    autoplayObserved: false,
  },
  departure: {
    bodyVisible: false,
    hillHistoryRetained: true,
    trafficChecksum:
      source.replay.frames.at(-1)!.terrain.witness
        .producerTrafficFieldChecksum,
  },
};

assert.doesNotThrow(() => validateFullHillOneRendererReceipt(receipt));
const rejectionCases: Array<[string, (candidate: any) => void]> = [
  ['fallback renderer', (candidate) => (candidate.renderer.effective = 'svg-overlay')],
  ['second canvas', (candidate) => (candidate.renderer.canvasCount = 2)],
  ['missing depth', (candidate) => (candidate.renderer.depthBits = 0)],
  ['visible SVG', (candidate) => (candidate.renderer.visibleSvgCount = 1)],
  [
    'texture substitution',
    (candidate) => (candidate.renderer.terrainTextureSubstitution = true),
  ],
  ['partial grid', (candidate) => (candidate.terrain.sampleCount -= 1)],
  ['partial frames', (candidate) => candidate.terrain.frames.pop()],
  [
    'substituted source route',
    (candidate) =>
      (candidate.terrain.frames[10].source.route = 'lerms/fallback/hill'),
  ],
  [
    'substituted source backend',
    (candidate) =>
      (candidate.terrain.frames[10].source.backend = 'svg-texture'),
  ],
  [
    'substituted source config',
    (candidate) =>
      (candidate.terrain.frames[10].source.configId = 'adjacent-config'),
  ],
  [
    'fallback source',
    (candidate) =>
      (candidate.terrain.frames[10].source.fallbackStatus = 'fallback'),
  ],
  [
    'missing surface detail checksum',
    (candidate) =>
      delete candidate.terrain.frames[10].surfaceDetailChecksum,
  ],
  [
    'missing material edge checksum',
    (candidate) =>
      delete candidate.terrain.frames[10].materialEdgeChecksum,
  ],
  [
    'stale checksum',
    (candidate) => (candidate.terrain.frames[10].sampleChecksum = 'stale'),
  ],
  ['autoplay', (candidate) => (candidate.playback.autoplayObserved = true)],
  ['body retained', (candidate) => (candidate.departure.bodyVisible = true)],
];
for (const [label, mutate] of rejectionCases) {
  const candidate = structuredClone(receipt);
  mutate(candidate);
  assert.throws(
    () => validateFullHillOneRendererReceipt(candidate),
    { name: 'Error' },
    `${label} must not close the one-renderer full-Hill contract`,
  );
}

console.log('Lerm Horde full-Hill one-renderer contracts: ok');
