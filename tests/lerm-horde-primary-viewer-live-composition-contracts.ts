import assert from 'node:assert/strict';

import {
  LERM_HORDE_PRIMARY_VIEWER_LIVE_COMPOSITION_ROUTE,
  LERM_HORDE_PRIMARY_VIEWER_LIVE_COMPOSITION_SCHEMA,
  LERM_HORDE_PRIMARY_VIEWER_CANVAS2D_RASTERIZER_ROUTE,
  LERM_HORDE_PRIMARY_VIEWER_QUERY_KEY,
  LERM_HORDE_PRIMARY_VIEWER_QUERY_VALUE,
  LERM_HORDE_PRIMARY_VIEWER_SYNC_RUNTIME_ROUTE,
  createLermHordePrimaryViewerLiveComposition,
  isLermHordePrimaryViewerRequested,
  type LermHordePrimaryViewerLiveSource,
} from '../src/lerm-horde-primary-viewer-live-composition.js';
import {
  LERM_HORDE_PRIMARY_VIEWER_ACTOR_LAYER_ID,
} from '../src/lerm-horde-primary-viewer-actor-layer.js';
import {
  LERM_HORDE_PRIMARY_VIEWER_ACTOR_FRAME_ROUTE,
  type LermHordePrimaryViewerActorFrame,
} from '../src/lerm-horde-primary-viewer-actor-frame.js';
import {
  HILL_PRIMARY_VIEWER_ACTOR_HOST_ROUTE,
} from '../src/terrain/hill-primary-viewer-actor-host.js';
import type {
  LermHordeLiveRuntimeState,
} from '../src/lerm-horde-live-runtime-composition.js';
import {
  LERM_HORDE_LIVE_RUNTIME_ROUTE,
} from '../src/lerm-horde-live-runtime-composition.js';

const advances: number[] = [];
let state = createState(0, 'traversing');
const source: LermHordePrimaryViewerLiveSource = {
  get state() {
    return state;
  },
  durationMs: 2_800,
  completionElapsedMs: 3_700,
  advanceTo(elapsedMs) {
    advances.push(elapsedMs);
    state = createState(
      elapsedMs,
      elapsedMs > 2_800 ? 'departed' : 'traversing',
    );
    return state;
  },
  currentActorFrame() {
    return createActorFrame(state);
  },
  evaluateBodyPositions() {
    return state.phase === 'traversing'
      ? new Float32Array([
          0, 1, 0,
          1, 1, 0,
          0, 2, 0,
        ])
      : null;
  },
};

assert.equal(
  isLermHordePrimaryViewerRequested(
    `?${LERM_HORDE_PRIMARY_VIEWER_QUERY_KEY}=${LERM_HORDE_PRIMARY_VIEWER_QUERY_VALUE}`,
  ),
  true,
);
assert.equal(isLermHordePrimaryViewerRequested(''), false);
assert.equal(
  isLermHordePrimaryViewerRequested('?actor=some-other-producer'),
  false,
);

const composition =
  createLermHordePrimaryViewerLiveComposition(source);
assert.equal(
  composition.schema,
  LERM_HORDE_PRIMARY_VIEWER_LIVE_COMPOSITION_SCHEMA,
);
assert.equal(
  composition.route,
  LERM_HORDE_PRIMARY_VIEWER_LIVE_COMPOSITION_ROUTE,
);
assert.equal(
  composition.layer.id,
  LERM_HORDE_PRIMARY_VIEWER_ACTOR_LAYER_ID,
);
const initialAtomicFrame = (
  composition as unknown as {
    frame?: {
      generation: number;
      sourceElapsedMs: number;
      terrain: {
        frameId: string;
        sampleChecksum: string;
        topologyChecksum: string;
      };
      actor: LermHordePrimaryViewerActorFrame;
    };
  }
).frame;
assert.ok(
  initialAtomicFrame,
  'the live composition must publish one atomic terrain/actor frame before the host can draw',
);
assert.equal(initialAtomicFrame.generation, 0);
assert.equal(initialAtomicFrame.sourceElapsedMs, 0);
assert.equal(
  initialAtomicFrame.terrain.frameId,
  initialAtomicFrame.actor.terrain.frameId,
  'the published actor cannot cross ticks with its rendered Hill',
);

composition.advance(10_000);
assert.deepEqual(advances, [], 'first host frame establishes the live clock');
composition.advance(11_000);
assert.deepEqual(
  advances,
  [200],
  'the primary viewer advances the live runtime at its legible live-viewer cadence',
);
composition.advance(11_400);
assert.deepEqual(advances, [200, 280]);
assert.throws(
  () => composition.advance(11_399),
  /monotonic/i,
  'a regressing host clock cannot rewind and impersonate live composition',
);
composition.advance(30_000);
assert.equal(
  advances.at(-1),
  source.completionElapsedMs,
  'the live controller must advance through real departure and then settle',
);

const receipt = composition.receipt();
assert.equal(receipt.schema, LERM_HORDE_PRIMARY_VIEWER_LIVE_COMPOSITION_SCHEMA);
assert.deepEqual(receipt.route, {
  requested: LERM_HORDE_PRIMARY_VIEWER_LIVE_COMPOSITION_ROUTE,
  effective: LERM_HORDE_PRIMARY_VIEWER_LIVE_COMPOSITION_ROUTE,
  viewer: HILL_PRIMARY_VIEWER_ACTOR_HOST_ROUTE,
  actor: LERM_HORDE_PRIMARY_VIEWER_ACTOR_FRAME_ROUTE,
  actorRenderer:
    LERM_HORDE_PRIMARY_VIEWER_CANVAS2D_RASTERIZER_ROUTE,
  runtime: LERM_HORDE_PRIMARY_VIEWER_SYNC_RUNTIME_ROUTE,
  runtimeBackend: 'synchronous-reference',
  fallbackStatus: 'none',
  staleStatus: 'fresh',
});
assert.equal(receipt.lifecycle.phase, 'departed');
assert.equal(receipt.lifecycle.visible, false);
assert.equal(receipt.clock.mode, 'live_viewer_timestamp');
assert.equal(receipt.clock.timeScale, 0.2);
assert.deepEqual(
  (
    receipt as unknown as {
      publication?: {
        generation: number;
        sourceElapsedMs: number;
        hostPublishedAtMs: number;
        presentationAgeMs: number;
        completeness: string;
      };
    }
  ).publication,
  {
    generation: advances.length,
    sourceElapsedMs: state.elapsedMs,
    hostPublishedAtMs: 30_000,
    presentationAgeMs: 0,
    completeness: 'atomic-terrain-actor',
  },
  'the receipt must make atomic publication identity and displayed age explicit',
);
assert.deepEqual(receipt.terrain, {
  frameId: state.terrainBuffer.source.frameId,
  sampleChecksum: state.terrainBuffer.sampleChecksum,
  topologyChecksum: state.terrainBuffer.topologyChecksum,
  trafficChecksum:
    state.terrainBuffer.witness.producerTrafficFieldChecksum,
});

const mismatchedSource: LermHordePrimaryViewerLiveSource = {
  ...source,
  currentActorFrame() {
    const actor = createActorFrame(state);
    actor.terrain.frameId = 'cross-tick-hill-frame';
    return actor;
  },
};
assert.throws(
  () => createLermHordePrimaryViewerLiveComposition(mismatchedSource),
  /atomic|same.*Hill|cross.tick/i,
  'the composition must reject a partial cross-tick terrain/actor publication before host drawing',
);

function createState(
  elapsedMs: number,
  phase: 'traversing' | 'departed',
): LermHordeLiveRuntimeState {
  const frameId = `horde-live-runtime-${elapsedMs}`;
  return {
    route: LERM_HORDE_LIVE_RUNTIME_ROUTE,
    elapsedMs,
    phase,
    body: phase === 'traversing' ? ({} as never) : null,
    terrainBuffer: {
      source: { frameId },
      sampleChecksum: `sample-${elapsedMs}`,
      topologyChecksum: `topology-${elapsedMs}`,
      witness: {
        producerTrafficFieldChecksum: `traffic-${elapsedMs}`,
      },
    },
  } as LermHordeLiveRuntimeState;
}

function createActorFrame(
  current: LermHordeLiveRuntimeState,
): LermHordePrimaryViewerActorFrame {
  return {
    route: {
      requested: LERM_HORDE_PRIMARY_VIEWER_ACTOR_FRAME_ROUTE,
      effective: LERM_HORDE_PRIMARY_VIEWER_ACTOR_FRAME_ROUTE,
      fallbackStatus: 'none',
      staleStatus: 'fresh',
    },
    lifecycle: {
      phase: current.phase,
      visible: current.phase === 'traversing',
      elapsedMs: current.elapsedMs,
      tickCount: advances.length,
    },
    pose: current.phase === 'traversing' ? ({} as never) : null,
    terrain: {
      frameId: current.terrainBuffer.source.frameId,
      sampleChecksum: current.terrainBuffer.sampleChecksum,
      topologyChecksum: current.terrainBuffer.topologyChecksum,
      trafficChecksum:
        current.terrainBuffer.witness.producerTrafficFieldChecksum,
      supportFrameChecksum: 'support',
    },
  } as LermHordePrimaryViewerActorFrame;
}

console.log('Lerm Horde primary-viewer live composition contracts passed');
