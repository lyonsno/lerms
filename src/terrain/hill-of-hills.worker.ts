import { createHillOfHillsLayerTileCache, createHillOfHillsTerrainWithCache } from './hill-of-hills.js';
import {
  createHillTerrainWorkerFailure,
  createHillTerrainWorkerResponse,
  hillTerrainWorkerTransferList,
  type HillTerrainWorkerRequest,
  type HillTerrainWorkerResponse
} from './hill-of-hills-worker-client.js';

const cache = createHillOfHillsLayerTileCache();
const workerScope = self as unknown as {
  onmessage: ((event: MessageEvent<HillTerrainWorkerRequest>) => void) | null;
  postMessage: (response: HillTerrainWorkerResponse, transfer?: Transferable[]) => void;
};

workerScope.onmessage = (event: MessageEvent<HillTerrainWorkerRequest>) => {
  const request = event.data;
  const started = performance.now();

  try {
    const terrain = createHillOfHillsTerrainWithCache(cache, request.params, request.sourceOptions);
    const response = createHillTerrainWorkerResponse(request, terrain, performance.now() - started);
    workerScope.postMessage(response, hillTerrainWorkerTransferList(response));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const response: HillTerrainWorkerResponse = createHillTerrainWorkerFailure(request, message, 'terrain-generation');
    workerScope.postMessage(response);
  }
};
