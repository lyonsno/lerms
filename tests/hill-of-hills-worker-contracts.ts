import {
  createHillTerrainWorkerFailure,
  createHillTerrainWorkerRequest,
  createHillTerrainWorkerResponse,
  isFreshHillTerrainWorkerResponse
} from '../src/terrain/hill-of-hills-worker-client.js';
import { createHillOfHillsLayerTileCache, createHillOfHillsTerrainWithCache, defaultHillOfHillsParams } from '../src/terrain/hill-of-hills.js';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const params = {
  ...defaultHillOfHillsParams,
  gridResolutionX: 42,
  gridResolutionZ: 58,
  trailPhaseIntensity: 0.65,
  trailPhaseLimit: 2,
  trailPhaseTimeMs: 820,
  ditchPhaseIntensity: 0.2,
  ditchPhaseLimit: 1,
  ditchPhaseTimeMs: 640
};
const sourceOptions = {
  route: 'hill-of-hills/worker-contract',
  frameId: 'hill-worker-contract-frame',
  configId: 'hill-worker-contract-v0',
  timestampMs: 12_000,
  sampleAgeMs: 0
};
const request = createHillTerrainWorkerRequest(7, params, sourceOptions);

assert(request.schema === 'lerms.hill-of-hills-worker-request.v0', 'worker request carries schema');
assert(request.requestId === 7, 'worker request carries caller request id');
assert(request.params.gridResolutionX === 42, 'worker request carries terrain params');
assert(request.sourceOptions.route === 'hill-of-hills/worker-contract', 'worker request carries terrain route');
assert(request.sourceOptions.configId === 'hill-worker-contract-v0', 'worker request carries stable cache config id');

const cache = createHillOfHillsLayerTileCache();
const terrain = createHillOfHillsTerrainWithCache(cache, request.params, request.sourceOptions);
const response = createHillTerrainWorkerResponse(request, terrain, 12.5);

assert(response.schema === 'lerms.hill-of-hills-worker-response.v0', 'worker response carries schema');
assert(response.ok === true, 'worker response is successful');
assert(response.requestId === request.requestId, 'worker response preserves request id');
assert(response.durationMs === 12.5, 'worker response records worker generation duration');
assert(response.terrain.witness.cacheMode === 'persistent_layer_tile_cache', 'worker response carries cache witness');
assert(response.terrain.source.route === request.sourceOptions.route, 'worker response terrain source preserves route');
assert(response.terrain.source.configId === request.sourceOptions.configId, 'worker response terrain source preserves config id');
assert(isFreshHillTerrainWorkerResponse(response, 7), 'latest successful worker response is fresh');
assert(!isFreshHillTerrainWorkerResponse(response, 8), 'older worker response is rejected as stale');

const failure = createHillTerrainWorkerFailure(request, 'phase exploded', 'terrain-generation');
assert(failure.schema === 'lerms.hill-of-hills-worker-response.v0', 'worker failure carries response schema');
assert(failure.ok === false, 'worker failure is not ok');
assert(failure.error.message === 'phase exploded', 'worker failure records error message');
assert(failure.error.phase === 'terrain-generation', 'worker failure records failure phase');
assert(!isFreshHillTerrainWorkerResponse(failure, 7), 'failed worker response is not fresh terrain evidence');

console.log('hill of hills worker contracts ok');
