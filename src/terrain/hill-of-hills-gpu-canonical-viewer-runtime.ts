import {
  createExactCarrierLiveSource,
  type ExactCarrierLiveSource,
} from '../lerm-horde-3d-carrier-renderer.js';
import {
  LERM_HORDE_PRIMARY_VIEWER_TIME_SCALE,
} from '../lerm-horde-primary-viewer-live-contract.js';
import {
  createLermHordePrimaryViewerActorLayer,
} from '../lerm-horde-primary-viewer-actor-layer.js';
import {
  createLermHordeSupportProfileRequest,
  type LermHordePrimaryViewerActorFrame,
} from '../lerm-horde-primary-viewer-actor-frame.js';
import type {
  HillPrimaryViewerActorLayer,
} from './hill-primary-viewer-actor-host.js';
import {
  advanceHillGpuCpuOracle,
  createHillGpuCpuOracleState,
  createHillGpuInitialization,
  createHillGpuProducerEventBatch,
  createHillGpuSupportBinding,
  type HillGpuCpuOracleState,
  type HillGpuInitialization,
} from './hill-of-hills-gpu-resident.js';
import {
  createHillWebGpuResidentRuntime,
  type HillWebGpuResidentRuntime,
} from './hill-of-hills-webgpu-resident.js';
import {
  createHillGpuWebGpuPresenter,
  type HillGpuPresentationOverlay,
  type HillGpuPresentationView,
  type HillGpuWebGpuPresenter,
} from './hill-of-hills-webgpu-presentation.js';
import {
  HILL_GPU_CANONICAL_VIEWER_ROUTE,
  bindLermHordeActorFrameToHillGpuPresentation,
  createHillGpuPresentedFrameIdentity,
  type HillGpuPresentedFrameIdentity,
} from './hill-of-hills-gpu-canonical-viewer.js';
import type {
  HillOfHillsTerrainBuffer,
} from './hill-of-hills.js';

const GPU_STEP_MS = 50;

export interface HillGpuCanonicalViewerRuntime {
  readonly route: typeof HILL_GPU_CANONICAL_VIEWER_ROUTE;
  readonly layer: HillPrimaryViewerActorLayer;
  readonly projectionBuffer: HillOfHillsTerrainBuffer;
  readonly actor: LermHordePrimaryViewerActorFrame;
  readonly presentation: HillGpuPresentedFrameIdentity;
  readonly completionElapsedMs: number;
  readonly source: ExactCarrierLiveSource;
  advance(hostTimestampMs: number): void;
  present(
    view: Omit<
      HillGpuPresentationView,
      'presentationAlpha'
    >,
    overlay: HillGpuPresentationOverlay,
  ): void;
  status(): {
    requestedRoute: typeof HILL_GPU_CANONICAL_VIEWER_ROUTE;
    effectiveRoute: typeof HILL_GPU_CANONICAL_VIEWER_ROUTE;
    terrainRoute: string;
    backend: 'webgpu';
    device: {
      vendor: string;
      architecture: string;
      device: string;
      description: string;
    };
    fallbackStatus: 'none';
    staleStatus: 'fresh';
    sourceElapsedMs: number;
    completionElapsedMs: number;
    previousGeneration: number;
    generation: number;
    highestAdmittedEventSequence: number;
    queueSubmissionOrdinal: number;
    fullTerrainCpuUploads: 1;
    fullFieldWorkerTransfersAfterInitialization: 0;
    fullFieldReadbacksAfterInitialization: 0;
    actorFrameId: string;
    actorPhase: 'traversing' | 'departed';
    actorVisible: boolean;
    activeActorInstanceId: string | null;
    selectedContinuation: string | null;
  };
}

export async function createHillGpuCanonicalViewerRuntime(
  canvas: HTMLCanvasElement,
  options: {
    frozenSourceElapsedMs?: number;
  } = {},
): Promise<HillGpuCanonicalViewerRuntime> {
  const gpu = (
    navigator as Navigator & {
      gpu?: {
        requestAdapter(): Promise<{
          requestDevice(): Promise<unknown>;
        } | null>;
        getPreferredCanvasFormat(): string;
      };
    }
  ).gpu;
  requireRuntime(
    gpu !== undefined,
    'canonical Hill GPU viewer requested WebGPU but navigator.gpu is unavailable',
  );
  const [source, adapter] = await Promise.all([
    createExactCarrierLiveSource(
      true,
      'history-conditioned',
    ),
    gpu.requestAdapter(),
  ]);
  requireRuntime(
    adapter !== null,
    'canonical Hill GPU viewer could not acquire a WebGPU adapter',
  );
  const adapterIdentity = {
    vendor:
      (adapter as {
        info?: { vendor?: string };
      }).info?.vendor ?? 'unreported',
    architecture:
      (adapter as {
        info?: { architecture?: string };
      }).info?.architecture ?? 'unreported',
    device:
      (adapter as {
        info?: { device?: string };
      }).info?.device ?? 'unreported',
    description:
      (adapter as {
        info?: { description?: string };
      }).info?.description ?? 'unreported',
  };
  const device = await adapter.requestDevice();
  (
    device as {
      addEventListener?: (
        type: 'uncapturederror',
        listener: (event: {
          error?: { message?: string };
        }) => void,
      ) => void;
    }
  ).addEventListener?.('uncapturederror', (event) => {
    const message =
      event.error?.message ?? 'unknown WebGPU validation error';
    canvas.dataset.hillGpuUncapturedError = message;
    console.error(
      'canonical Hill GPU uncaptured error',
      message,
    );
  });
  const context = canvas.getContext('webgpu');
  requireRuntime(
    context !== null,
    'canonical Hill GPU viewer could not acquire the visible WebGPU canvas',
  );
  const projectionBuffer = source.state.terrainBuffer;
  const initialization = createHillGpuInitialization(
    projectionBuffer,
  );
  const gpuRuntime = createHillWebGpuResidentRuntime(
    device as Parameters<
      typeof createHillWebGpuResidentRuntime
    >[0],
    initialization,
  );
  const presenter = createHillGpuWebGpuPresenter(
    device as Parameters<
      typeof createHillGpuWebGpuPresenter
    >[0],
    context as unknown as Parameters<
      typeof createHillGpuWebGpuPresenter
    >[1],
    gpu.getPreferredCanvasFormat(),
    initialization,
    gpuRuntime,
  );
  return createRuntime(
    source,
    initialization,
    gpuRuntime,
    presenter,
    options,
    adapterIdentity,
  );
}

function createRuntime(
  source: ExactCarrierLiveSource,
  initialization: HillGpuInitialization,
  gpuRuntime: HillWebGpuResidentRuntime,
  presenter: HillGpuWebGpuPresenter,
  options: {
    frozenSourceElapsedMs?: number;
  },
  adapterIdentity: {
    vendor: string;
    architecture: string;
    device: string;
    description: string;
  },
): HillGpuCanonicalViewerRuntime {
  requireRuntime(
    options.frozenSourceElapsedMs === undefined ||
      (Number.isFinite(options.frozenSourceElapsedMs) &&
        options.frozenSourceElapsedMs >= 0 &&
        options.frozenSourceElapsedMs <=
          source.completionElapsedMs),
    'canonical Hill GPU frozen source time is outside the runtime',
  );
  let oracle = createHillGpuCpuOracleState(initialization);
  let firstHostTimestampMs: number | undefined;
  let latestHostTimestampMs: number | undefined;
  let simulatedElapsedMs = 0;
  let eventSequence = -1;
  let queueSubmissionOrdinal = 0;
  let presentation = presentedIdentity(
    oracle,
    gpuRuntime,
    queueSubmissionOrdinal,
  );
  let actor = bindCurrentActor(
    source,
    oracle,
    presentation,
  );
  const layer =
    createLermHordePrimaryViewerActorLayer({
      currentActorFrame: () => actor,
      presentIndexedBody: (frame, actorFrame) =>
        source.presentIndexedBody(frame, actorFrame),
    });

  return {
    route: HILL_GPU_CANONICAL_VIEWER_ROUTE,
    layer,
    projectionBuffer: source.state.terrainBuffer,
    get actor() {
      return actor;
    },
    get presentation() {
      return presentation;
    },
    completionElapsedMs: source.completionElapsedMs,
    source,
    advance(hostTimestampMs) {
      requireRuntime(
        Number.isFinite(hostTimestampMs) &&
          hostTimestampMs >= 0 &&
          (latestHostTimestampMs === undefined ||
            hostTimestampMs >= latestHostTimestampMs),
        'canonical Hill GPU host clock must be finite, nonnegative, and monotonic',
      );
      firstHostTimestampMs ??= hostTimestampMs;
      latestHostTimestampMs = hostTimestampMs;
      const targetElapsedMs = Math.min(
        options.frozenSourceElapsedMs ??
          (hostTimestampMs - firstHostTimestampMs) *
            LERM_HORDE_PRIMARY_VIEWER_TIME_SCALE,
        source.completionElapsedMs,
      );
      while (
        simulatedElapsedMs + GPU_STEP_MS <=
        targetElapsedMs
      ) {
        const startMs = simulatedElapsedMs;
        const endMs = startMs + GPU_STEP_MS;
        source.advanceTo(endMs);
        const body = source.state.body;
        const highestPreviouslyAdmittedEventSequence =
          eventSequence;
        const events = body
          ? [
              {
                episodeId:
                  source.state.episodeController
                    ?.activeActorInstanceId ??
                  'lerm-episode-a',
                sequence: eventSequence + 1,
                startMs,
                endMs,
                worldX: body.rootWorld[0],
                worldZ: body.rootWorld[2],
                contactWeight: 0.92,
                radius: 0.72,
              },
            ]
          : [];
        if (events.length > 0) eventSequence += 1;
        const batch = createHillGpuProducerEventBatch(
          initialization,
          events,
          highestPreviouslyAdmittedEventSequence,
        );
        gpuRuntime.dispatch(
          batch,
          GPU_STEP_MS / 1_000,
        );
        oracle = advanceHillGpuCpuOracle(
          oracle,
          batch,
          GPU_STEP_MS / 1_000,
        );
        queueSubmissionOrdinal += 1;
        simulatedElapsedMs = endMs;
      }
      if (targetElapsedMs > source.state.elapsedMs) {
        source.advanceTo(targetElapsedMs);
      }
      presentation = presentedIdentity(
        oracle,
        gpuRuntime,
        queueSubmissionOrdinal,
      );
      actor = bindCurrentActor(
        source,
        oracle,
        presentation,
      );
    },
    present(view, overlay) {
      presenter.render(
        {
          ...view,
          presentationAlpha:
            presentation.presentationAlpha,
        },
        overlay,
      );
    },
    status() {
      const controller = actor.episodeController;
      return {
        requestedRoute: HILL_GPU_CANONICAL_VIEWER_ROUTE,
        effectiveRoute: HILL_GPU_CANONICAL_VIEWER_ROUTE,
        terrainRoute: presentation.route.effective,
        backend: 'webgpu',
        device: { ...adapterIdentity },
        fallbackStatus: 'none',
        staleStatus: 'fresh',
        sourceElapsedMs: source.state.elapsedMs,
        completionElapsedMs: source.completionElapsedMs,
        previousGeneration:
          presentation.generation.previous,
        generation: presentation.generation.current,
        highestAdmittedEventSequence:
          presentation.generation
            .highestAdmittedEventSequence,
        queueSubmissionOrdinal,
        fullTerrainCpuUploads: 1,
        fullFieldWorkerTransfersAfterInitialization: 0,
        fullFieldReadbacksAfterInitialization: 0,
        actorFrameId: actor.terrain.frameId,
        actorPhase: actor.lifecycle.phase,
        actorVisible: actor.lifecycle.visible,
        activeActorInstanceId:
          controller?.activeActorInstanceId ?? null,
        selectedContinuation:
          controller?.decisions.at(-1)?.selectedId ?? null,
      };
    },
  };
}

function presentedIdentity(
  oracle: HillGpuCpuOracleState,
  runtime: HillWebGpuResidentRuntime,
  queueSubmissionOrdinal: number,
): HillGpuPresentedFrameIdentity {
  return createHillGpuPresentedFrameIdentity({
    state: oracle,
    runtime: {
      requestedRoute: runtime.route.requested,
      effectiveRoute: runtime.route.effective,
      backend: runtime.route.backend,
      fallbackStatus: runtime.route.fallbackStatus,
      staleStatus: runtime.route.staleStatus,
      previousGeneration: runtime.previousGeneration,
      currentGeneration: runtime.generation,
      highestAdmittedEventSequence:
        runtime.highestAdmittedEventSequence,
      queueSubmissionOrdinal,
    },
    presentationAlpha: 1,
  });
}

function bindCurrentActor(
  source: ExactCarrierLiveSource,
  oracle: HillGpuCpuOracleState,
  presentation: HillGpuPresentedFrameIdentity,
): LermHordePrimaryViewerActorFrame {
  const actor = source.currentActorFrame();
  if (!actor.pose) {
    return bindLermHordeActorFrameToHillGpuPresentation(
      actor,
      createDepartureBinding(oracle, presentation),
      presentation,
    );
  }
  const request = createLermHordeSupportProfileRequest(
    actor.pose.rootFrame,
  );
  const binding = createHillGpuSupportBinding(
    oracle,
    request,
    presentation.presentationAlpha,
  );
  return bindLermHordeActorFrameToHillGpuPresentation(
    actor,
    binding,
    presentation,
  );
}

function createDepartureBinding(
  oracle: HillGpuCpuOracleState,
  presentation: HillGpuPresentedFrameIdentity,
) {
  const request = {
    schema:
      'lerms.horde-support-profile-request.v0' as const,
    rootWorld: { x: 0, z: 0 },
    stations: Array.from(
      { length: 7 },
      (_, index) => ({
        t: index / 6,
        worldX: 0,
        worldZ: 0.5358 - index * (1.0716 / 6),
      }),
    ),
  };
  return createHillGpuSupportBinding(
    oracle,
    request,
    presentation.presentationAlpha,
  );
}

function requireRuntime(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) throw new Error(message);
}
