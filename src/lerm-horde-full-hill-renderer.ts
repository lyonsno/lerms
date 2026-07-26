import * as THREE from 'three';

import type { LermHordeProducerHistoryCompositionReceipt } from './lerm-horde-producer-history-composition.js';
import {
  HILL_HORDE_REVIEWED_SOURCE_REVISION,
  composeHordeTraversalIntoLiveHill,
  type ComposeHordeTraversalIntoLiveHillInput,
  type ReviewedHordeTraversalReport,
} from './hill-horde-live-traversal-admission.js';
import {
  LERM_HORDE_REVIEWED_LIVE_HILL_REVISION,
  composeLermHordeLiveBodyMotion,
} from './lerm-horde-live-body-motion.js';
import {
  createHillHordeSameScenePrefixReplay,
  type HillHordeSameScenePrefixReplay,
} from './hill-horde-same-scene-prefix-replay.js';
import {
  HILL_OF_HILLS_TERRAIN_BUFFER_SCHEMA,
  createHillOfHillsTerrainBuffer,
  type HillOfHillsTerrainBuffer,
} from './terrain/hill-of-hills.js';
import {
  EXACT_3D_CARRIER_BODY_SHA256,
  EXACT_3D_CARRIER_RAIL_HISTORY_SHA256,
} from './lerm-horde-3d-carrier-contract.js';

export const FULL_HILL_RENDERER_ID =
  'three-webgl-full-hill-v0' as const;
export const FULL_HILL_ONE_RENDERER_SCHEMA =
  'lerms.horde-full-hill-one-renderer.v0' as const;
export const FULL_HILL_REPLAY_FRAME_COUNT = 18 as const;
export const FULL_HILL_SOURCE_AUTHORITY = 'live_simulation' as const;
export const FULL_HILL_SOURCE_ROUTE =
  'hill-of-hills/horde-live-traversal-admission' as const;
export const FULL_HILL_SOURCE_BACKEND =
  'deterministic-cpu-heightfield' as const;
export const FULL_HILL_SOURCE_CONFIG =
  'horde-live-traversal-admission-v0' as const;

const REVIEWED_BODY_SHA256 =
  'df52b476836a386bc87270536d4bc39e53dc2b73ad2b13b721e3e73de6915c6b';
const REVIEWED_BODY_GIT_BLOB = '9463bee16d4c0a1e0380241d43a3722bbf24974c';
const REVIEWED_BODY_SOURCE_REVISION =
  '9dfc3fdcd6fe98eb8ef89316c03b5c04f6425137';
const REVIEWED_ACTOR_ID = 'lerm-horde-red-rail-witness-0001';
const REVIEWED_BODY_IDENTITY =
  'lerms.red-lerm-body.procedural-squash-thief.v0';
const REVIEWED_BODY_SCHEMA = 'lerms.red-lerm-body-schema.v0';

export interface FullHillOneRendererSource {
  input: ComposeHordeTraversalIntoLiveHillInput;
  replay: HillHordeSameScenePrefixReplay;
  buffers: readonly HillOfHillsTerrainBuffer[];
}

export interface FullHillOneRendererReceipt {
  schema: typeof FULL_HILL_ONE_RENDERER_SCHEMA;
  status: {
    ok: true;
    phase: 'complete';
    fallbackStatus: 'none';
    staleStatus: 'fresh';
    failurePhase: null;
  };
  renderer: {
    requested: typeof FULL_HILL_RENDERER_ID;
    effective: typeof FULL_HILL_RENDERER_ID;
    canvasCount: 1;
    sceneCount: 1;
    cameraCount: 1;
    depthBufferCount: 1;
    depthBits: number;
    visibleSvgCount: 0;
    terrainTextureSubstitution: false;
  };
  terrain: {
    schema: typeof HILL_OF_HILLS_TERRAIN_BUFFER_SCHEMA;
    gridResolution: { x: number; z: number };
    sampleCount: number;
    triangleCount: number;
    indexOrder: 'z-major-two-triangles-per-cell';
    frameCount: number;
    frames: Array<{
      index: number;
      kind:
        | 'no-history-control'
        | 'actor-prefix'
        | 'actor-departed'
        | 'after-departure';
      timestampMs: number;
      prefixSampleCount: number;
      frameId: string;
      source: {
        authority: typeof FULL_HILL_SOURCE_AUTHORITY;
        route: typeof FULL_HILL_SOURCE_ROUTE;
        frameId: string;
        timestampMs: number;
        backend: typeof FULL_HILL_SOURCE_BACKEND;
        configId: typeof FULL_HILL_SOURCE_CONFIG;
        fallbackStatus: 'none';
      };
      sampleChecksum: string;
      topologyChecksum: string;
      proxyMaterialChecksum: string;
      surfaceDetailChecksum: string;
      materialEdgeChecksum: string;
      trafficChecksum: string;
      producerTraffic: {
        fieldChecksum: string;
        admittedEpisodeCount: number;
        exposureSeconds: number;
      };
      topologyPossibilityChecksum: string;
      supportFrame: {
        supportClass: string;
        mappingMode: string;
        supportEpoch: number;
        topologyEpoch: number;
        checksum: string;
      };
    }>;
  };
  carrier: {
    identity: '719024';
    bodySha256: typeof EXACT_3D_CARRIER_BODY_SHA256;
    visiblePrefixFrameCount: number;
    departed: true;
  };
  playback: {
    initialState: 'paused';
    operatorPlayCount: 1;
    autoplayObserved: false;
  };
  departure: {
    bodyVisible: false;
    hillHistoryRetained: true;
    trafficChecksum: string;
  };
}

export function createFullHillOneRendererSource(
  producerReceipt: LermHordeProducerHistoryCompositionReceipt,
): FullHillOneRendererSource {
  const hordeReport = reviewedHordeReport(producerReceipt);
  const input: ComposeHordeTraversalIntoLiveHillInput = {
    hordeReport,
    producerReceipt,
    producerReceiptSha256: EXACT_3D_CARRIER_RAIL_HISTORY_SHA256,
    hordeRevision: HILL_HORDE_REVIEWED_SOURCE_REVISION,
    hillRevision: LERM_HORDE_REVIEWED_LIVE_HILL_REVISION,
  };
  const admission = composeHordeTraversalIntoLiveHill(input);
  const motion = composeLermHordeLiveBodyMotion(admission);
  const replay = createHillHordeSameScenePrefixReplay(admission, motion);
  const buffers = replay.frames.map(({ terrain }) =>
    createHillOfHillsTerrainBuffer(terrain),
  );
  if (
    replay.frames.length !== FULL_HILL_REPLAY_FRAME_COUNT ||
    buffers.length !== FULL_HILL_REPLAY_FRAME_COUNT
  ) {
    throw new Error('full-Hill replay is missing canonical frames');
  }
  return { input, replay, buffers };
}

export function createHillTerrainGridIndices(
  buffer: HillOfHillsTerrainBuffer,
): Uint16Array | Uint32Array {
  validateTerrainBuffer(buffer);
  const columns = buffer.gridResolution.x;
  const rows = buffer.gridResolution.z;
  const IndexArray =
    buffer.sampleCount <= 65_535 ? Uint16Array : Uint32Array;
  const indices = new IndexArray((columns - 1) * (rows - 1) * 6);
  let offset = 0;
  for (let z = 0; z < rows - 1; z += 1) {
    for (let x = 0; x < columns - 1; x += 1) {
      const northWest = z * columns + x;
      const southWest = (z + 1) * columns + x;
      const northEast = northWest + 1;
      const southEast = southWest + 1;
      indices[offset] = northWest;
      indices[offset + 1] = southWest;
      indices[offset + 2] = northEast;
      indices[offset + 3] = northEast;
      indices[offset + 4] = southWest;
      indices[offset + 5] = southEast;
      offset += 6;
    }
  }
  return indices;
}

export function createHillTerrainGeometry(
  buffer: HillOfHillsTerrainBuffer,
): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  geometry.setIndex(
    new THREE.BufferAttribute(createHillTerrainGridIndices(buffer), 1),
  );
  geometry.setAttribute(
    'position',
    new THREE.BufferAttribute(buffer.positions.slice(), 3),
  );
  geometry.setAttribute(
    'normal',
    new THREE.BufferAttribute(buffer.normals.slice(), 3),
  );
  geometry.setAttribute(
    'color',
    new THREE.BufferAttribute(normalizeTerrainColors(buffer.colors), 3),
  );
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  geometry.userData.hillTerrainBufferSchema = buffer.schema;
  geometry.userData.sampleChecksum = buffer.sampleChecksum;
  geometry.userData.topologyChecksum = buffer.topologyChecksum;
  return geometry;
}

export function updateHillTerrainGeometry(
  geometry: THREE.BufferGeometry,
  buffer: HillOfHillsTerrainBuffer,
): void {
  validateTerrainBuffer(buffer);
  const position = requiredAttribute(geometry, 'position');
  const normal = requiredAttribute(geometry, 'normal');
  const color = requiredAttribute(geometry, 'color');
  if (
    position.count !== buffer.sampleCount ||
    normal.count !== buffer.sampleCount ||
    color.count !== buffer.sampleCount
  ) {
    throw new Error('full-Hill geometry cannot accept a partial or changed grid');
  }
  position.copyArray(buffer.positions);
  normal.copyArray(buffer.normals);
  color.copyArray(normalizeTerrainColors(buffer.colors));
  position.needsUpdate = true;
  normal.needsUpdate = true;
  color.needsUpdate = true;
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  geometry.userData.sampleChecksum = buffer.sampleChecksum;
  geometry.userData.topologyChecksum = buffer.topologyChecksum;
}

export function validateFullHillOneRendererReceipt(
  receipt: FullHillOneRendererReceipt,
): FullHillOneRendererReceipt {
  requireReceipt(
    receipt?.schema === FULL_HILL_ONE_RENDERER_SCHEMA &&
      receipt.status?.ok === true &&
      receipt.status.phase === 'complete' &&
      receipt.status.fallbackStatus === 'none' &&
      receipt.status.staleStatus === 'fresh' &&
      receipt.status.failurePhase === null,
    'full-Hill one-renderer receipt is failed, stale, or fallback',
  );
  requireReceipt(
    receipt.renderer.requested === FULL_HILL_RENDERER_ID &&
      receipt.renderer.effective === FULL_HILL_RENDERER_ID &&
      receipt.renderer.canvasCount === 1 &&
      receipt.renderer.sceneCount === 1 &&
      receipt.renderer.cameraCount === 1 &&
      receipt.renderer.depthBufferCount === 1 &&
      receipt.renderer.depthBits >= 16 &&
      receipt.renderer.visibleSvgCount === 0 &&
      receipt.renderer.terrainTextureSubstitution === false,
    'full-Hill composition is not one renderer, camera, canvas, and depth buffer',
  );
  requireReceipt(
    receipt.terrain.schema === HILL_OF_HILLS_TERRAIN_BUFFER_SCHEMA &&
      receipt.terrain.gridResolution.x === 48 &&
      receipt.terrain.gridResolution.z === 60 &&
      receipt.terrain.sampleCount === 2_880 &&
      receipt.terrain.triangleCount === 5_546 &&
      receipt.terrain.indexOrder === 'z-major-two-triangles-per-cell' &&
      receipt.terrain.frameCount === FULL_HILL_REPLAY_FRAME_COUNT &&
      receipt.terrain.frames.length === FULL_HILL_REPLAY_FRAME_COUNT,
    'full-Hill terrain geometry is missing, partial, or remapped',
  );
  receipt.terrain.frames.forEach((frame, index) => {
    requireReceipt(
      frame.index === index &&
        Number.isFinite(frame.timestampMs) &&
        Number.isInteger(frame.prefixSampleCount) &&
        frame.prefixSampleCount >= 0 &&
        frame.prefixSampleCount <= 15 &&
        frame.frameId.length > 0 &&
        frame.source.authority === FULL_HILL_SOURCE_AUTHORITY &&
        frame.source.route === FULL_HILL_SOURCE_ROUTE &&
        frame.source.frameId === frame.frameId &&
        Number.isFinite(frame.source.timestampMs) &&
        frame.source.backend === FULL_HILL_SOURCE_BACKEND &&
        frame.source.configId === FULL_HILL_SOURCE_CONFIG &&
        frame.source.fallbackStatus === 'none' &&
        checksumLike(frame.sampleChecksum) &&
        checksumLike(frame.topologyChecksum) &&
        checksumLike(frame.proxyMaterialChecksum) &&
        checksumLike(frame.surfaceDetailChecksum) &&
        checksumLike(frame.materialEdgeChecksum) &&
        checksumLike(frame.trafficChecksum) &&
        frame.producerTraffic.fieldChecksum === frame.trafficChecksum &&
        Number.isInteger(frame.producerTraffic.admittedEpisodeCount) &&
        frame.producerTraffic.admittedEpisodeCount >= 0 &&
        Number.isFinite(frame.producerTraffic.exposureSeconds) &&
        frame.producerTraffic.exposureSeconds >= 0 &&
        checksumOrInherited(frame.topologyPossibilityChecksum) &&
        frame.supportFrame.supportClass.length > 0 &&
        frame.supportFrame.mappingMode.length > 0 &&
        Number.isInteger(frame.supportFrame.supportEpoch) &&
        frame.supportFrame.supportEpoch >= 0 &&
        Number.isInteger(frame.supportFrame.topologyEpoch) &&
        frame.supportFrame.topologyEpoch >= 0 &&
        checksumLike(frame.supportFrame.checksum),
      `full-Hill frame ${index} lost source or checksum identity`,
    );
  });
  requireReceipt(
    receipt.terrain.frames[0].kind === 'no-history-control' &&
      receipt.terrain.frames[0].prefixSampleCount === 0 &&
      receipt.terrain.frames
        .slice(1, 16)
        .every(
          (frame, index) =>
            frame.kind === 'actor-prefix' &&
            frame.prefixSampleCount === index + 1,
        ) &&
      receipt.terrain.frames[16].kind === 'actor-departed' &&
      receipt.terrain.frames[17].kind === 'after-departure' &&
      receipt.terrain.frames[16].prefixSampleCount === 15 &&
      receipt.terrain.frames[17].prefixSampleCount === 15,
    'full-Hill replay frame sequence is incomplete or reordered',
  );
  requireReceipt(
    receipt.carrier.identity === '719024' &&
      receipt.carrier.bodySha256 === EXACT_3D_CARRIER_BODY_SHA256 &&
      receipt.carrier.visiblePrefixFrameCount === 15 &&
      receipt.carrier.departed === true,
    'full-Hill receipt substituted or retained the exact carrier',
  );
  requireReceipt(
    receipt.playback.initialState === 'paused' &&
      receipt.playback.operatorPlayCount === 1 &&
      receipt.playback.autoplayObserved === false,
    'full-Hill playback did not remain operator-started',
  );
  requireReceipt(
    receipt.departure.bodyVisible === false &&
      receipt.departure.hillHistoryRetained === true &&
      receipt.departure.trafficChecksum ===
        receipt.terrain.frames[17].trafficChecksum &&
      receipt.terrain.frames[16].trafficChecksum ===
        receipt.terrain.frames[17].trafficChecksum,
    'full-Hill departure lost the body-absent persistent-history state',
  );
  return receipt;
}

function reviewedHordeReport(
  producerReceipt: LermHordeProducerHistoryCompositionReceipt,
): ReviewedHordeTraversalReport {
  return {
    ok: true,
    schema: 'lerms.lerm-horde.stable-rail-visual-witness.v0',
    phase: 'complete',
    route: {
      requested: producerReceipt.history.producer.route,
      effective: producerReceipt.history.producer.route,
      fallbackStatus: 'none',
      staleStatus: 'fresh',
      partialStatus: 'complete-root-only',
    },
    receipt: {
      sourceRevision: producerReceipt.lerms.revision,
      sha256: EXACT_3D_CARRIER_RAIL_HISTORY_SHA256,
    },
    producer: {
      revision: producerReceipt.producer.revision,
      moduleSha256: producerReceipt.producer.moduleSha256,
    },
    visibleBody: {
      assetIdentity: REVIEWED_BODY_IDENTITY,
      schemaIdentity: REVIEWED_BODY_SCHEMA,
      path: 'src/red-lerm-body-candidates.ts',
      sha256: REVIEWED_BODY_SHA256,
      gitBlob: REVIEWED_BODY_GIT_BLOB,
      sourceRevision: REVIEWED_BODY_SOURCE_REVISION,
      dirtyInput: '',
      candidateId: 'procedural-squash-thief-v0',
      candidateSchema: 'lerms.red-lerm-body-candidate.v0',
      shapeSchema: 'lerms.red-lerm-procedural-shape.v0',
    },
    composition: {
      identity: {
        actorId: REVIEWED_ACTOR_ID,
        assetIdentity: REVIEWED_BODY_IDENTITY,
      },
      sources: {
        body: {
          sha256: REVIEWED_BODY_SHA256,
          sourceRevision: REVIEWED_BODY_SOURCE_REVISION,
        },
      },
      timeline: producerReceipt.history.samples.map((sample) => ({
        timestampMs: sample.timestampMs,
        bodyRootWorld: sample.root.worldPosition,
      })),
    },
    claimBoundary: {
      rootRailMotionTruth: true,
      liveCurrentHillTruth: false,
      liveContactTruth: false,
      bodyArticulationTruth: false,
    },
  };
}

function validateTerrainBuffer(buffer: HillOfHillsTerrainBuffer): void {
  const sampleCount =
    buffer?.gridResolution?.x * buffer?.gridResolution?.z;
  if (
    buffer?.schema !== HILL_OF_HILLS_TERRAIN_BUFFER_SCHEMA ||
    buffer.witness.fallbackStatus !== 'none' ||
    buffer.sampleCount !== sampleCount ||
    buffer.positions.length !== sampleCount * 3 ||
    buffer.normals.length !== sampleCount * 3 ||
    buffer.colors.length !== sampleCount * 3 ||
    buffer.gridResolution.x < 2 ||
    buffer.gridResolution.z < 2
  ) {
    throw new Error('Hill terrain buffer is fallback, partial, or malformed');
  }
}

function requiredAttribute(
  geometry: THREE.BufferGeometry,
  name: 'position' | 'normal' | 'color',
): THREE.BufferAttribute {
  const attribute = geometry.getAttribute(name);
  if (!(attribute instanceof THREE.BufferAttribute)) {
    throw new Error(`full-Hill geometry is missing ${name}`);
  }
  return attribute;
}

function checksumLike(value: string): boolean {
  return /^[0-9a-f]{8,64}$/.test(value);
}

function checksumOrInherited(value: string): boolean {
  return value === 'inherited' || checksumLike(value);
}

function normalizeTerrainColors(colors: Float32Array): Float32Array {
  const normalized = new Float32Array(colors.length);
  for (let index = 0; index < colors.length; index += 1) {
    const value = colors[index];
    if (!Number.isFinite(value) || value < 0 || value > 255) {
      throw new Error(`Hill terrain color channel ${index} is outside 8-bit range`);
    }
    normalized[index] = value / 255;
  }
  return normalized;
}

function requireReceipt(
  condition: boolean,
  message: string,
): asserts condition {
  if (!condition) throw new Error(message);
}
