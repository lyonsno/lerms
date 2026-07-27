import {
  createExactCarrierLiveSource,
  type ExactCarrierLiveSource,
} from './lerm-horde-3d-carrier-renderer.js';
import {
  createLermHordePrimaryViewerAtomicFrame,
} from './lerm-horde-primary-viewer-live-composition.js';
import {
  LERM_HORDE_PRIMARY_VIEWER_WORKER_REQUEST_SCHEMA,
  LERM_HORDE_PRIMARY_VIEWER_WORKER_ROUTE,
  createLermHordePrimaryViewerWorkerFailure,
  createLermHordePrimaryViewerWorkerSuccess,
  lermHordePrimaryViewerWorkerTransferList,
  type LermHordePrimaryViewerWorkerRequest,
  type LermHordePrimaryViewerWorkerResponse,
} from './lerm-horde-primary-viewer-live-worker-client.js';
import {
  createHillOfHillsTerrainBuffer,
} from './terrain/hill-of-hills.js';

const workerScope = self as unknown as {
  onmessage:
    | ((event: MessageEvent<LermHordePrimaryViewerWorkerRequest>) => void)
    | null;
  postMessage(
    response: LermHordePrimaryViewerWorkerResponse,
    transfer?: Transferable[],
  ): void;
};

let sourcePromise: Promise<ExactCarrierLiveSource> | undefined;

workerScope.onmessage = (
  event: MessageEvent<LermHordePrimaryViewerWorkerRequest>,
) => {
  void handleRequest(event.data);
};

async function handleRequest(
  request: LermHordePrimaryViewerWorkerRequest,
): Promise<void> {
  const startedAtMs = performance.now();
  if (!isValidRequest(request)) {
    const response = createLermHordePrimaryViewerWorkerFailure(
      request,
      'publication',
      'worker request schema, route, id, command, or elapsed time is invalid',
    );
    workerScope.postMessage(response);
    return;
  }

  let source: ExactCarrierLiveSource;
  try {
    sourcePromise ??= createExactCarrierLiveSource();
    source = await sourcePromise;
  } catch (error) {
    const response = createLermHordePrimaryViewerWorkerFailure(
      request,
      'source-load',
      messageFor(error),
    );
    workerScope.postMessage(response);
    return;
  }

  try {
    if (request.command === 'initialize') {
      if (request.sourceElapsedMs !== 0 || source.state.elapsedMs !== 0) {
        throw new Error(
          'worker initialization requires the exact unadvanced source',
        );
      }
    } else {
      source.advanceTo(request.sourceElapsedMs);
    }
  } catch (error) {
    const response = createLermHordePrimaryViewerWorkerFailure(
      request,
      'runtime-advance',
      messageFor(error),
    );
    workerScope.postMessage(response);
    return;
  }

  try {
    const terrainBuffer = createHillOfHillsTerrainBuffer(
      source.state.terrain,
    );
    const frame = createLermHordePrimaryViewerAtomicFrame(
      source,
      source.state.tickCount,
      null,
      terrainBuffer,
    );
    const response = createLermHordePrimaryViewerWorkerSuccess(
      request,
      frame,
      source.completionElapsedMs,
      performance.now() - startedAtMs,
    );
    workerScope.postMessage(
      response,
      lermHordePrimaryViewerWorkerTransferList(response),
    );
  } catch (error) {
    const response = createLermHordePrimaryViewerWorkerFailure(
      request,
      'publication',
      messageFor(error),
    );
    workerScope.postMessage(response);
  }
}

function isValidRequest(
  request: LermHordePrimaryViewerWorkerRequest,
): boolean {
  return (
    request?.schema ===
      LERM_HORDE_PRIMARY_VIEWER_WORKER_REQUEST_SCHEMA &&
    request.route === LERM_HORDE_PRIMARY_VIEWER_WORKER_ROUTE &&
    Number.isInteger(request.requestId) &&
    request.requestId > 0 &&
    (request.command === 'initialize' ||
      request.command === 'advance') &&
    Number.isFinite(request.sourceElapsedMs) &&
    request.sourceElapsedMs >= 0
  );
}

function messageFor(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
