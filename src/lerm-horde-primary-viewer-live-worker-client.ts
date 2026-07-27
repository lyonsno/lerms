import {
  LERM_HORDE_PRIMARY_VIEWER_ATOMIC_FRAME_SCHEMA,
  LERM_HORDE_PRIMARY_VIEWER_TIME_SCALE,
  type LermHordePrimaryViewerAtomicFrame,
} from './lerm-horde-primary-viewer-live-contract.js';
import {
  LERM_HORDE_PRIMARY_VIEWER_ACTOR_FRAME_ROUTE,
  LERM_HORDE_PRIMARY_VIEWER_ACTOR_FRAME_SCHEMA,
} from './lerm-horde-primary-viewer-actor-frame.js';
import {
  transferListForHillOfHillsTerrainBuffer,
} from './terrain/hill-of-hills.js';

export const LERM_HORDE_PRIMARY_VIEWER_WORKER_REQUEST_SCHEMA =
  'lerms.horde-primary-viewer-worker-request.v0' as const;
export const LERM_HORDE_PRIMARY_VIEWER_WORKER_RESPONSE_SCHEMA =
  'lerms.horde-primary-viewer-worker-response.v0' as const;
export const LERM_HORDE_PRIMARY_VIEWER_WORKER_ROUTE =
  'lerms/lerm-horde/primary-viewer-live-worker-v0' as const;

export interface LermHordePrimaryViewerWorkerRequest {
  schema: typeof LERM_HORDE_PRIMARY_VIEWER_WORKER_REQUEST_SCHEMA;
  route: typeof LERM_HORDE_PRIMARY_VIEWER_WORKER_ROUTE;
  requestId: number;
  command: 'initialize' | 'advance';
  sourceElapsedMs: number;
}

export type LermHordePrimaryViewerWorkerResponse =
  | LermHordePrimaryViewerWorkerSuccess
  | LermHordePrimaryViewerWorkerFailure;

export interface LermHordePrimaryViewerWorkerSuccess {
  schema: typeof LERM_HORDE_PRIMARY_VIEWER_WORKER_RESPONSE_SCHEMA;
  route: {
    requested: typeof LERM_HORDE_PRIMARY_VIEWER_WORKER_ROUTE;
    effective: typeof LERM_HORDE_PRIMARY_VIEWER_WORKER_ROUTE;
    fallbackStatus: 'none';
  };
  requestId: number;
  command: LermHordePrimaryViewerWorkerRequest['command'];
  ok: true;
  workerDurationMs: number;
  completionElapsedMs: number;
  frame: LermHordePrimaryViewerAtomicFrame;
}

export interface LermHordePrimaryViewerWorkerFailure {
  schema: typeof LERM_HORDE_PRIMARY_VIEWER_WORKER_RESPONSE_SCHEMA;
  route: {
    requested: typeof LERM_HORDE_PRIMARY_VIEWER_WORKER_ROUTE;
    effective: typeof LERM_HORDE_PRIMARY_VIEWER_WORKER_ROUTE;
    fallbackStatus: 'none';
  };
  requestId: number;
  command: LermHordePrimaryViewerWorkerRequest['command'];
  ok: false;
  error: {
    phase: 'source-load' | 'runtime-advance' | 'publication';
    message: string;
  };
}

export interface LermHordePrimaryViewerWorkerPort {
  onmessage:
    | ((event: MessageEvent<LermHordePrimaryViewerWorkerResponse>) => void)
    | null;
  onerror: ((event: ErrorEvent) => void) | null;
  postMessage(request: LermHordePrimaryViewerWorkerRequest): void;
  terminate(): void;
}

export interface LermHordePrimaryViewerWorkerRuntime {
  readonly frame: LermHordePrimaryViewerAtomicFrame;
  readonly completionElapsedMs: number;
  readonly latestHostTimestampMs: number | null;
  readonly inFlight: boolean;
  advance(hostTimestampMs: number): LermHordePrimaryViewerAtomicFrame;
  publication(): {
    generation: number;
    sourceElapsedMs: number;
    hostPublishedAtMs: number;
    presentationAgeMs: number;
    completeness: 'atomic-terrain-actor';
  };
  terminate(): void;
}

export function createLermHordePrimaryViewerWorkerRequest(
  requestId: number,
  command: LermHordePrimaryViewerWorkerRequest['command'],
  sourceElapsedMs: number,
): LermHordePrimaryViewerWorkerRequest {
  return {
    schema: LERM_HORDE_PRIMARY_VIEWER_WORKER_REQUEST_SCHEMA,
    route: LERM_HORDE_PRIMARY_VIEWER_WORKER_ROUTE,
    requestId,
    command,
    sourceElapsedMs,
  };
}

export function createLermHordePrimaryViewerWorkerSuccess(
  request: LermHordePrimaryViewerWorkerRequest,
  frame: LermHordePrimaryViewerAtomicFrame,
  completionElapsedMs: number,
  workerDurationMs: number,
): LermHordePrimaryViewerWorkerSuccess {
  return {
    schema: LERM_HORDE_PRIMARY_VIEWER_WORKER_RESPONSE_SCHEMA,
    route: exactWorkerRoute(),
    requestId: request.requestId,
    command: request.command,
    ok: true,
    workerDurationMs,
    completionElapsedMs,
    frame,
  };
}

export function createLermHordePrimaryViewerWorkerFailure(
  request: LermHordePrimaryViewerWorkerRequest,
  phase: LermHordePrimaryViewerWorkerFailure['error']['phase'],
  message: string,
): LermHordePrimaryViewerWorkerFailure {
  return {
    schema: LERM_HORDE_PRIMARY_VIEWER_WORKER_RESPONSE_SCHEMA,
    route: exactWorkerRoute(),
    requestId: request.requestId,
    command: request.command,
    ok: false,
    error: { phase, message },
  };
}

export function lermHordePrimaryViewerWorkerTransferList(
  response: LermHordePrimaryViewerWorkerResponse,
): ArrayBuffer[] {
  return response.ok
    ? transferListForHillOfHillsTerrainBuffer(
        response.frame.terrainBuffer,
      )
    : [];
}

export async function createLermHordePrimaryViewerWorkerRuntime(
  port: LermHordePrimaryViewerWorkerPort,
  now: () => number = () => performance.now(),
): Promise<LermHordePrimaryViewerWorkerRuntime> {
  requireWorkerRuntime(
    port !== null &&
      typeof port.postMessage === 'function' &&
      typeof port.terminate === 'function',
    'primary-viewer worker runtime requires a live worker port',
  );

  let requestId = 1;
  let activeRequest:
    | LermHordePrimaryViewerWorkerRequest
    | undefined = createLermHordePrimaryViewerWorkerRequest(
      requestId,
      'initialize',
      0,
    );
  let currentFrame: LermHordePrimaryViewerAtomicFrame | undefined;
  let completionElapsedMs: number | undefined;
  let firstHostTimestampMs: number | undefined;
  let latestHostTimestampMs: number | undefined;
  let queuedSourceElapsedMs: number | undefined;
  let fatalError: Error | undefined;
  let resolveInitialization:
    | ((runtime: LermHordePrimaryViewerWorkerRuntime) => void)
    | undefined;
  let rejectInitialization:
    | ((error: Error) => void)
    | undefined;

  const initialized = new Promise<LermHordePrimaryViewerWorkerRuntime>(
    (resolve, reject) => {
      resolveInitialization = resolve;
      rejectInitialization = reject;
    },
  );

  const fail = (message: string): void => {
    if (fatalError) return;
    fatalError = new Error(message);
    rejectInitialization?.(fatalError);
    rejectInitialization = undefined;
    resolveInitialization = undefined;
  };

  const dispatch = (
    command: LermHordePrimaryViewerWorkerRequest['command'],
    sourceElapsedMs: number,
  ): void => {
    requestId += 1;
    activeRequest = createLermHordePrimaryViewerWorkerRequest(
      requestId,
      command,
      sourceElapsedMs,
    );
    port.postMessage(activeRequest);
  };

  let runtime: LermHordePrimaryViewerWorkerRuntime;

  port.onmessage = (
    event: MessageEvent<LermHordePrimaryViewerWorkerResponse>,
  ) => {
    try {
      if (fatalError) return;
      const response = event.data;
      const request = activeRequest;
      validateResponseEnvelope(response, request);
      if (!response.ok) {
        fail(
          `primary-viewer worker ${response.error.phase} failure: ${response.error.message}`,
        );
        return;
      }
      validateAtomicFrame(
        response.frame,
        request,
        currentFrame?.generation,
      );
      requireWorkerRuntime(
        Number.isFinite(response.completionElapsedMs) &&
          response.completionElapsedMs > 0 &&
          (completionElapsedMs === undefined ||
            response.completionElapsedMs === completionElapsedMs),
        'primary-viewer worker changed or omitted completion elapsed time',
      );
      completionElapsedMs = response.completionElapsedMs;
      currentFrame = {
        ...response.frame,
        hostPublishedAtMs:
          latestHostTimestampMs === undefined
            ? null
            : Math.max(latestHostTimestampMs, now()),
      };
      activeRequest = undefined;

      if (resolveInitialization) {
        const resolve = resolveInitialization;
        resolveInitialization = undefined;
        rejectInitialization = undefined;
        resolve(runtime);
      }

      if (
        queuedSourceElapsedMs !== undefined &&
        queuedSourceElapsedMs > currentFrame.sourceElapsedMs
      ) {
        const nextSourceElapsedMs = queuedSourceElapsedMs;
        queuedSourceElapsedMs = undefined;
        dispatch('advance', nextSourceElapsedMs);
      } else {
        queuedSourceElapsedMs = undefined;
      }
    } catch (error) {
      fail(
        error instanceof Error
          ? error.message
          : `primary-viewer worker publication failed: ${String(error)}`,
      );
    }
  };
  port.onerror = (event: ErrorEvent) => {
    fail(
      `primary-viewer worker transport failure: ${
        event.message || 'unknown worker error'
      }`,
    );
  };

  runtime = {
    get frame() {
      return requirePublishedFrame();
    },
    get completionElapsedMs() {
      return publishedCompletionElapsedMs();
    },
    get latestHostTimestampMs() {
      return latestHostTimestampMs ?? null;
    },
    get inFlight() {
      return activeRequest !== undefined;
    },
    advance(hostTimestampMs) {
      if (fatalError) throw fatalError;
      let frame = requirePublishedFrame();
      const completion = publishedCompletionElapsedMs();
      requireWorkerRuntime(
        Number.isFinite(hostTimestampMs) && hostTimestampMs >= 0,
        'primary-viewer live host timestamp must be finite and nonnegative',
      );
      requireWorkerRuntime(
        latestHostTimestampMs === undefined ||
          hostTimestampMs >= latestHostTimestampMs,
        'primary-viewer live host timestamp must be monotonic',
      );
      firstHostTimestampMs ??= hostTimestampMs;
      latestHostTimestampMs = hostTimestampMs;
      if (frame.hostPublishedAtMs === null) {
        currentFrame = {
          ...frame,
          hostPublishedAtMs: hostTimestampMs,
        };
        frame = currentFrame;
      }
      const sourceElapsedMs = Math.min(
        (hostTimestampMs - firstHostTimestampMs) *
          LERM_HORDE_PRIMARY_VIEWER_TIME_SCALE,
        completion,
      );
      if (sourceElapsedMs > frame.sourceElapsedMs) {
        if (activeRequest) {
          queuedSourceElapsedMs = Math.max(
            queuedSourceElapsedMs ?? 0,
            sourceElapsedMs,
          );
        } else {
          dispatch('advance', sourceElapsedMs);
        }
      }
      return frame;
    },
    publication() {
      const frame = requirePublishedFrame();
      publishedCompletionElapsedMs();
      requireWorkerRuntime(
        latestHostTimestampMs !== undefined &&
          frame.hostPublishedAtMs !== null,
        'primary-viewer worker publication requires one host frame',
      );
      return {
        generation: frame.generation,
        sourceElapsedMs: frame.sourceElapsedMs,
        hostPublishedAtMs: frame.hostPublishedAtMs,
        presentationAgeMs: Math.max(
          0,
          latestHostTimestampMs - frame.hostPublishedAtMs,
        ),
        completeness: frame.completeness,
      };
    },
    terminate() {
      port.terminate();
    },
  };

  function requirePublishedFrame(): LermHordePrimaryViewerAtomicFrame {
    requireWorkerRuntime(
      currentFrame !== undefined,
      'primary-viewer worker runtime is not initialized',
    );
    return currentFrame;
  }

  function publishedCompletionElapsedMs(): number {
    requireWorkerRuntime(
      completionElapsedMs !== undefined,
      'primary-viewer worker runtime is not initialized',
    );
    return completionElapsedMs;
  }

  port.postMessage(activeRequest);
  return initialized;
}

function validateResponseEnvelope(
  response: LermHordePrimaryViewerWorkerResponse,
  activeRequest: LermHordePrimaryViewerWorkerRequest | undefined,
): asserts activeRequest is LermHordePrimaryViewerWorkerRequest {
  requireWorkerRuntime(
    activeRequest !== undefined &&
      response?.schema ===
        LERM_HORDE_PRIMARY_VIEWER_WORKER_RESPONSE_SCHEMA &&
      response.route?.requested ===
        LERM_HORDE_PRIMARY_VIEWER_WORKER_ROUTE &&
      response.route.effective ===
        LERM_HORDE_PRIMARY_VIEWER_WORKER_ROUTE &&
      response.route.fallbackStatus === 'none' &&
      response.requestId === activeRequest.requestId &&
      response.command === activeRequest.command,
    'primary-viewer worker response is stale, substituted, or does not match its active request',
  );
}

function validateAtomicFrame(
  frame: LermHordePrimaryViewerAtomicFrame,
  request: LermHordePrimaryViewerWorkerRequest,
  retainedGeneration: number | undefined,
): void {
  requireWorkerRuntime(
    frame?.schema === LERM_HORDE_PRIMARY_VIEWER_ATOMIC_FRAME_SCHEMA &&
      Number.isInteger(frame.generation) &&
      frame.generation >= 0 &&
      (request.command === 'initialize'
        ? retainedGeneration === undefined &&
          frame.generation === 0
        : retainedGeneration !== undefined &&
          frame.generation > retainedGeneration) &&
      frame.completeness === 'atomic-terrain-actor' &&
      frame.hostPublishedAtMs === null &&
      frame.sourceElapsedMs === request.sourceElapsedMs &&
      frame.actor?.schema ===
        LERM_HORDE_PRIMARY_VIEWER_ACTOR_FRAME_SCHEMA &&
      frame.actor.route?.requested ===
        LERM_HORDE_PRIMARY_VIEWER_ACTOR_FRAME_ROUTE &&
      frame.actor.route.effective ===
        LERM_HORDE_PRIMARY_VIEWER_ACTOR_FRAME_ROUTE &&
      frame.actor.route.fallbackStatus === 'none' &&
      frame.actor.route.staleStatus === 'fresh' &&
      frame.actor.lifecycle.tickCount === frame.generation &&
      frame.actor.lifecycle.elapsedMs === frame.sourceElapsedMs &&
      frame.terrain?.frameId === frame.terrainBuffer?.source?.frameId &&
      frame.terrain.sampleChecksum ===
        frame.terrainBuffer.sampleChecksum &&
      frame.terrain.topologyChecksum ===
        frame.terrainBuffer.topologyChecksum &&
      frame.actor.terrain.frameId === frame.terrain.frameId &&
      frame.actor.terrain.sampleChecksum ===
        frame.terrain.sampleChecksum &&
      frame.actor.terrain.topologyChecksum ===
        frame.terrain.topologyChecksum &&
      frame.actor.terrain.trafficChecksum ===
        frame.terrainBuffer.witness
          .producerTrafficFieldChecksum &&
      frame.actor.terrain.supportFrameChecksum ===
        frame.terrainBuffer.witness.supportFrame
          .supportFrameChecksum,
    'primary-viewer atomic worker frame cannot regress generation, cross ticks, or substitute a different Hill checksum',
  );
}

function requireWorkerRuntime(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) throw new Error(message);
}

function exactWorkerRoute(): LermHordePrimaryViewerWorkerSuccess['route'] {
  return {
    requested: LERM_HORDE_PRIMARY_VIEWER_WORKER_ROUTE,
    effective: LERM_HORDE_PRIMARY_VIEWER_WORKER_ROUTE,
    fallbackStatus: 'none',
  };
}
