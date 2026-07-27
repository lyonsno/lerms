import {
  createExactCarrierLiveSource,
  type ExactCarrierLiveSource,
} from './lerm-horde-3d-carrier-renderer.js';
import {
  LERM_HORDE_PRIMARY_VIEWER_ACTOR_FRAME_ROUTE,
  type LermHordePrimaryViewerActorFrame,
} from './lerm-horde-primary-viewer-actor-frame.js';
import {
  createLermHordePrimaryViewerActorLayer,
  type LermHordePrimaryViewerActorLayerSource,
} from './lerm-horde-primary-viewer-actor-layer.js';
import {
  LERM_HORDE_PRIMARY_VIEWER_ATOMIC_FRAME_SCHEMA,
  LERM_HORDE_PRIMARY_VIEWER_TIME_SCALE,
  type LermHordePrimaryViewerAtomicFrame,
} from './lerm-horde-primary-viewer-live-contract.js';
import {
  LERM_HORDE_INDEXED_GPU_PRESENTER_ROUTE,
  type LermHordeIndexedGpuPresentationReceipt,
  type LermHordeIndexedGpuPresenterIdentity,
} from './lerm-horde-primary-viewer-gpu-presenter.js';
import {
  LERM_HORDE_LIVE_RUNTIME_ROUTE,
  type LermHordeLiveRuntimeState,
} from './lerm-horde-live-runtime-composition.js';
import {
  LERM_HORDE_PRIMARY_VIEWER_WORKER_ROUTE,
  createLermHordePrimaryViewerWorkerRuntime,
  type LermHordePrimaryViewerWorkerPort,
  type LermHordePrimaryViewerWorkerRuntime,
} from './lerm-horde-primary-viewer-live-worker-client.js';
import {
  HILL_PRIMARY_VIEWER_ACTOR_HOST_ROUTE,
  type HillPrimaryViewerActorLayer,
} from './terrain/hill-primary-viewer-actor-host.js';

export const LERM_HORDE_PRIMARY_VIEWER_LIVE_COMPOSITION_SCHEMA =
  'lerms.horde-primary-viewer-live-composition.v0' as const;
export const LERM_HORDE_PRIMARY_VIEWER_LIVE_COMPOSITION_ROUTE =
  'lerms/lerm-horde/primary-viewer-live-composition-v0' as const;
export const LERM_HORDE_PRIMARY_VIEWER_QUERY_KEY = 'actor' as const;
export const LERM_HORDE_PRIMARY_VIEWER_QUERY_VALUE =
  'lerm-horde-live' as const;
export const LERM_HORDE_PRIMARY_VIEWER_CANVAS2D_RASTERIZER_ROUTE =
  'lerms/lerm-horde/primary-viewer-canvas2d-reference-v0' as const;
export const LERM_HORDE_PRIMARY_VIEWER_SYNC_RUNTIME_ROUTE =
  'lerms/lerm-horde/primary-viewer-sync-runtime-reference-v0' as const;

export {
  LERM_HORDE_PRIMARY_VIEWER_ATOMIC_FRAME_SCHEMA,
  LERM_HORDE_PRIMARY_VIEWER_TIME_SCALE,
};
export type { LermHordePrimaryViewerAtomicFrame };

export interface LermHordePrimaryViewerLiveSource {
  readonly state: LermHordeLiveRuntimeState;
  readonly durationMs: number;
  readonly completionElapsedMs: number;
  readonly indexedPresentationIdentity:
    LermHordeIndexedGpuPresenterIdentity;
  readonly lastIndexedPresentation:
    LermHordeIndexedGpuPresentationReceipt | null;
  advanceTo(elapsedMs: number): LermHordeLiveRuntimeState;
  currentActorFrame(): LermHordePrimaryViewerActorFrame;
  presentIndexedBody: LermHordePrimaryViewerActorLayerSource['presentIndexedBody'];
}

export interface LermHordePrimaryViewerLiveCompositionReceipt {
  schema: typeof LERM_HORDE_PRIMARY_VIEWER_LIVE_COMPOSITION_SCHEMA;
  route: {
    requested: typeof LERM_HORDE_PRIMARY_VIEWER_LIVE_COMPOSITION_ROUTE;
    effective: typeof LERM_HORDE_PRIMARY_VIEWER_LIVE_COMPOSITION_ROUTE;
    viewer: typeof HILL_PRIMARY_VIEWER_ACTOR_HOST_ROUTE;
    actor: typeof LERM_HORDE_PRIMARY_VIEWER_ACTOR_FRAME_ROUTE;
    actorRenderer: typeof LERM_HORDE_INDEXED_GPU_PRESENTER_ROUTE;
    runtime:
      | typeof LERM_HORDE_PRIMARY_VIEWER_WORKER_ROUTE
      | typeof LERM_HORDE_PRIMARY_VIEWER_SYNC_RUNTIME_ROUTE;
    runtimeBackend:
      | 'dedicated-worker'
      | 'synchronous-reference';
    fallbackStatus: 'none';
    staleStatus: 'fresh' | 'retained-complete-frame';
  };
  clock: {
    mode: 'live_viewer_timestamp';
    timeScale: typeof LERM_HORDE_PRIMARY_VIEWER_TIME_SCALE;
    hostTimestampMs: number;
    elapsedMs: number;
    completionElapsedMs: number;
    settledAfterDeparture: boolean;
  };
  lifecycle: {
    phase: LermHordeLiveRuntimeState['phase'];
    visible: boolean;
  };
  presentation: {
    identity: LermHordeIndexedGpuPresenterIdentity;
    drawCount: number;
    terrainFrameId: string | null;
    sourceDistance: number | null;
    phase: number | null;
    rootScreen: {
      x: number;
      y: number;
      depth: number;
    } | null;
    cpuSubmitMilliseconds: number | null;
  };
  terrain: {
    frameId: string;
    sampleChecksum: string;
    topologyChecksum: string;
    trafficChecksum: string;
  };
  publication: {
    generation: number;
    sourceElapsedMs: number;
    hostPublishedAtMs: number;
    presentationAgeMs: number;
    completeness: 'atomic-terrain-actor';
  };
}

export interface LermHordePrimaryViewerLiveComposition {
  readonly schema:
    typeof LERM_HORDE_PRIMARY_VIEWER_LIVE_COMPOSITION_SCHEMA;
  readonly route:
    typeof LERM_HORDE_PRIMARY_VIEWER_LIVE_COMPOSITION_ROUTE;
  readonly layer: HillPrimaryViewerActorLayer;
  readonly frame: LermHordePrimaryViewerAtomicFrame;
  advance(hostTimestampMs: number): LermHordePrimaryViewerAtomicFrame;
  receipt(): LermHordePrimaryViewerLiveCompositionReceipt;
}

export function isLermHordePrimaryViewerRequested(
  search: string,
): boolean {
  const value = new URLSearchParams(search).get(
    LERM_HORDE_PRIMARY_VIEWER_QUERY_KEY,
  );
  return value === LERM_HORDE_PRIMARY_VIEWER_QUERY_VALUE;
}

export async function loadLermHordePrimaryViewerLiveComposition(): Promise<LermHordePrimaryViewerLiveComposition> {
  const worker = new Worker(
    new URL(
      './lerm-horde-primary-viewer-live.worker.ts',
      import.meta.url,
    ),
    { type: 'module' },
  );
  try {
    const [source, workerRuntime] = await Promise.all([
      createExactCarrierLiveSource(),
      createLermHordePrimaryViewerWorkerRuntime(
        worker as LermHordePrimaryViewerWorkerPort,
      ),
    ]);
    return createLermHordePrimaryViewerWorkerComposition(
      source,
      workerRuntime,
    );
  } catch (error) {
    worker.terminate();
    throw error;
  }
}

export function createLermHordePrimaryViewerLiveComposition(
  source: LermHordePrimaryViewerLiveSource,
): LermHordePrimaryViewerLiveComposition {
  validateSource(source);
  let firstHostTimestampMs: number | undefined;
  let lastHostTimestampMs: number | undefined;
  let generation = 0;
  let currentFrame = createLermHordePrimaryViewerAtomicFrame(
    source,
    generation,
    null,
  );
  const layer = createLermHordePrimaryViewerActorLayer({
    currentActorFrame: () => currentFrame.actor,
    presentIndexedBody: (frame, actorFrame) =>
      source.presentIndexedBody(frame, actorFrame),
  });

  return {
    schema: LERM_HORDE_PRIMARY_VIEWER_LIVE_COMPOSITION_SCHEMA,
    route: LERM_HORDE_PRIMARY_VIEWER_LIVE_COMPOSITION_ROUTE,
    layer,
    get frame() {
      return currentFrame;
    },
    advance(hostTimestampMs) {
      requireComposition(
        Number.isFinite(hostTimestampMs) && hostTimestampMs >= 0,
        'primary-viewer live host timestamp must be finite and nonnegative',
      );
      requireComposition(
        lastHostTimestampMs === undefined ||
          hostTimestampMs >= lastHostTimestampMs,
        'primary-viewer live host timestamp must be monotonic',
      );
      firstHostTimestampMs ??= hostTimestampMs;
      lastHostTimestampMs = hostTimestampMs;
      const elapsedMs = Math.min(
        (hostTimestampMs - firstHostTimestampMs) *
          LERM_HORDE_PRIMARY_VIEWER_TIME_SCALE,
        source.completionElapsedMs,
      );
      if (elapsedMs > source.state.elapsedMs) {
        source.advanceTo(elapsedMs);
        generation += 1;
      }
      currentFrame = createLermHordePrimaryViewerAtomicFrame(
        source,
        generation,
        hostTimestampMs,
      );
      return currentFrame;
    },
    receipt() {
      requireComposition(
        lastHostTimestampMs !== undefined,
        'primary-viewer live receipt requires one host frame',
      );
      const actorFrame = currentFrame.actor;
      const terrain = currentFrame.terrainBuffer;
      const presentation = source.lastIndexedPresentation;
      return {
        schema: LERM_HORDE_PRIMARY_VIEWER_LIVE_COMPOSITION_SCHEMA,
        route: {
          requested: LERM_HORDE_PRIMARY_VIEWER_LIVE_COMPOSITION_ROUTE,
          effective: LERM_HORDE_PRIMARY_VIEWER_LIVE_COMPOSITION_ROUTE,
          viewer: HILL_PRIMARY_VIEWER_ACTOR_HOST_ROUTE,
          actor: LERM_HORDE_PRIMARY_VIEWER_ACTOR_FRAME_ROUTE,
          actorRenderer: source.indexedPresentationIdentity.route,
          runtime: LERM_HORDE_PRIMARY_VIEWER_SYNC_RUNTIME_ROUTE,
          runtimeBackend: 'synchronous-reference',
          fallbackStatus: 'none',
          staleStatus: 'fresh',
        },
        clock: {
          mode: 'live_viewer_timestamp',
          timeScale: LERM_HORDE_PRIMARY_VIEWER_TIME_SCALE,
          hostTimestampMs: lastHostTimestampMs,
          elapsedMs: source.state.elapsedMs,
          completionElapsedMs: source.completionElapsedMs,
          settledAfterDeparture:
            source.state.phase === 'departed' &&
            source.state.elapsedMs === source.completionElapsedMs,
        },
        lifecycle: {
          phase: actorFrame.lifecycle.phase,
          visible: actorFrame.lifecycle.visible,
        },
        presentation: {
          identity: { ...source.indexedPresentationIdentity },
          drawCount: presentation?.drawCount ?? 0,
          terrainFrameId: presentation?.terrainFrameId ?? null,
          sourceDistance: presentation?.sourceDistance ?? null,
          phase: presentation?.phase ?? null,
          rootScreen: presentation
            ? { ...presentation.rootScreen }
            : null,
          cpuSubmitMilliseconds:
            presentation?.cpuSubmitMilliseconds ?? null,
        },
        terrain: {
          frameId: terrain.source.frameId,
          sampleChecksum: terrain.sampleChecksum,
          topologyChecksum: terrain.topologyChecksum,
          trafficChecksum:
            terrain.witness.producerTrafficFieldChecksum,
        },
        publication: {
          generation: currentFrame.generation,
          sourceElapsedMs: currentFrame.sourceElapsedMs,
          hostPublishedAtMs:
            currentFrame.hostPublishedAtMs ?? lastHostTimestampMs,
          presentationAgeMs: Math.max(
            0,
            lastHostTimestampMs -
              (currentFrame.hostPublishedAtMs ?? lastHostTimestampMs),
          ),
          completeness: currentFrame.completeness,
        },
      };
    },
  };
}

export function createLermHordePrimaryViewerAtomicFrame(
  source: LermHordePrimaryViewerLiveSource,
  generation: number,
  hostPublishedAtMs: number | null,
  terrainBuffer: LermHordeLiveRuntimeState['terrainBuffer'] =
    source.state.terrainBuffer,
): LermHordePrimaryViewerAtomicFrame {
  const state = source.state;
  const actor = source.currentActorFrame();
  requireComposition(
    Number.isInteger(generation) &&
      generation >= 0 &&
      actor.lifecycle.elapsedMs === state.elapsedMs &&
      actor.terrain.frameId === terrainBuffer.source.frameId &&
      actor.terrain.sampleChecksum === terrainBuffer.sampleChecksum &&
      actor.terrain.topologyChecksum === terrainBuffer.topologyChecksum,
    'primary-viewer atomic frame cannot cross ticks or substitute a different Hill',
  );
  return {
    schema: LERM_HORDE_PRIMARY_VIEWER_ATOMIC_FRAME_SCHEMA,
    generation,
    sourceElapsedMs: state.elapsedMs,
    hostPublishedAtMs,
    completeness: 'atomic-terrain-actor',
    terrainBuffer,
    terrain: {
      frameId: terrainBuffer.source.frameId,
      sampleChecksum: terrainBuffer.sampleChecksum,
      topologyChecksum: terrainBuffer.topologyChecksum,
    },
    actor,
  };
}

function createLermHordePrimaryViewerWorkerComposition(
  source: LermHordePrimaryViewerLiveSource,
  workerRuntime: LermHordePrimaryViewerWorkerRuntime,
): LermHordePrimaryViewerLiveComposition {
  validateSource(source);
  const layer = createLermHordePrimaryViewerActorLayer({
    currentActorFrame: () => workerRuntime.frame.actor,
    presentIndexedBody: (frame, actorFrame) =>
      source.presentIndexedBody(frame, actorFrame),
  });

  return {
    schema: LERM_HORDE_PRIMARY_VIEWER_LIVE_COMPOSITION_SCHEMA,
    route: LERM_HORDE_PRIMARY_VIEWER_LIVE_COMPOSITION_ROUTE,
    layer,
    get frame() {
      return workerRuntime.frame;
    },
    advance(hostTimestampMs) {
      return workerRuntime.advance(hostTimestampMs);
    },
    receipt() {
      const hostTimestampMs = workerRuntime.latestHostTimestampMs;
      requireComposition(
        hostTimestampMs !== null,
        'primary-viewer live receipt requires one host frame',
      );
      const frame = workerRuntime.frame;
      const actorFrame = frame.actor;
      const terrain = frame.terrainBuffer;
      const publication = workerRuntime.publication();
      const presentation = source.lastIndexedPresentation;
      return {
        schema: LERM_HORDE_PRIMARY_VIEWER_LIVE_COMPOSITION_SCHEMA,
        route: {
          requested: LERM_HORDE_PRIMARY_VIEWER_LIVE_COMPOSITION_ROUTE,
          effective: LERM_HORDE_PRIMARY_VIEWER_LIVE_COMPOSITION_ROUTE,
          viewer: HILL_PRIMARY_VIEWER_ACTOR_HOST_ROUTE,
          actor: LERM_HORDE_PRIMARY_VIEWER_ACTOR_FRAME_ROUTE,
          actorRenderer: source.indexedPresentationIdentity.route,
          runtime: LERM_HORDE_PRIMARY_VIEWER_WORKER_ROUTE,
          runtimeBackend: 'dedicated-worker',
          fallbackStatus: 'none',
          staleStatus:
            publication.presentationAgeMs === 0
              ? 'fresh'
              : 'retained-complete-frame',
        },
        clock: {
          mode: 'live_viewer_timestamp',
          timeScale: LERM_HORDE_PRIMARY_VIEWER_TIME_SCALE,
          hostTimestampMs,
          elapsedMs: frame.sourceElapsedMs,
          completionElapsedMs: workerRuntime.completionElapsedMs,
          settledAfterDeparture:
            actorFrame.lifecycle.phase === 'departed' &&
            frame.sourceElapsedMs ===
              workerRuntime.completionElapsedMs,
        },
        lifecycle: {
          phase: actorFrame.lifecycle.phase,
          visible: actorFrame.lifecycle.visible,
        },
        presentation: {
          identity: { ...source.indexedPresentationIdentity },
          drawCount: presentation?.drawCount ?? 0,
          terrainFrameId: presentation?.terrainFrameId ?? null,
          sourceDistance: presentation?.sourceDistance ?? null,
          phase: presentation?.phase ?? null,
          rootScreen: presentation
            ? { ...presentation.rootScreen }
            : null,
          cpuSubmitMilliseconds:
            presentation?.cpuSubmitMilliseconds ?? null,
        },
        terrain: {
          frameId: terrain.source.frameId,
          sampleChecksum: terrain.sampleChecksum,
          topologyChecksum: terrain.topologyChecksum,
          trafficChecksum:
            terrain.witness.producerTrafficFieldChecksum,
        },
        publication,
      };
    },
  };
}

function validateSource(
  source: LermHordePrimaryViewerLiveSource,
): void {
  requireComposition(
    source?.state?.route === LERM_HORDE_LIVE_RUNTIME_ROUTE &&
      Number.isFinite(source.durationMs) &&
      source.durationMs > 0 &&
      Number.isFinite(source.completionElapsedMs) &&
      source.completionElapsedMs > source.durationMs &&
      typeof source.advanceTo === 'function' &&
      typeof source.currentActorFrame === 'function' &&
      typeof source.presentIndexedBody === 'function' &&
      source.indexedPresentationIdentity?.indexed === true &&
      source.indexedPresentationIdentity.textured === true,
    'primary-viewer live composition requires the exact live Horde source',
  );
}

function requireComposition(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) throw new Error(message);
}

const _exactSourceCompatibility: ExactCarrierLiveSource extends
  LermHordePrimaryViewerLiveSource
  ? true
  : never = true;
void _exactSourceCompatibility;
