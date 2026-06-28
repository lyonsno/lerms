import {
  createHillTerrainWorkerFailure,
  createHillTerrainWorkerRequest,
  createHillTerrainWorkerResponse,
  hillTerrainWorkerTransferList,
  isFreshHillTerrainWorkerResponse
} from '../src/terrain/hill-of-hills-worker-client.js';
import {
  createHillOfHillsLayerTileCache,
  createHillOfHillsTerrainBuffer,
  createHillOfHillsTerrainWithCache,
  decodeHillOfHillsTerrainBufferSample,
  defaultHillOfHillsParams,
  transferListForHillOfHillsTerrainBuffer
} from '../src/terrain/hill-of-hills.js';

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
const terrainBuffer = createHillOfHillsTerrainBuffer(terrain);
const response = createHillTerrainWorkerResponse(request, terrain, 12.5);

assert(response.schema === 'lerms.hill-of-hills-worker-response.v0', 'worker response carries schema');
assert(response.ok === true, 'worker response is successful');
assert(response.requestId === request.requestId, 'worker response preserves request id');
assert(response.durationMs === 12.5, 'worker response records worker generation duration');
assert(response.terrain.witness.cacheMode === 'persistent_layer_tile_cache', 'worker response carries cache witness');
assert(response.terrain.source.route === request.sourceOptions.route, 'worker response terrain source preserves route');
assert(response.terrain.source.configId === request.sourceOptions.configId, 'worker response terrain source preserves config id');
assert(response.terrainBuffer.schema === 'lerms.hill-of-hills-terrain-buffer.v0', 'worker response carries compact terrain buffer schema');
assert(response.terrainBuffer.sampleSchema === 'lerms.terrain-sample.v0', 'terrain buffer preserves sample schema identity');
assert(response.terrainBuffer.witnessSchema === 'lerms.hill-of-hills-witness.v0', 'terrain buffer preserves witness schema identity');
assert(response.terrainBuffer.source.route === request.sourceOptions.route, 'terrain buffer source preserves route');
assert(response.terrainBuffer.source.configId === request.sourceOptions.configId, 'terrain buffer source preserves config id');
assert(response.terrainBuffer.gridResolution.x === terrain.params.gridResolutionX, 'terrain buffer records grid width');
assert(response.terrainBuffer.gridResolution.z === terrain.params.gridResolutionZ, 'terrain buffer records grid height');
assert(response.terrainBuffer.sampleCount === terrain.samples.length, 'terrain buffer sample count matches terrain samples');
assert(response.terrainBuffer.sampleChecksum === terrain.witness.sampleChecksum, 'terrain buffer preserves sample checksum');
assert(response.terrainBuffer.topologyChecksum === terrain.witness.topologyChecksum, 'terrain buffer preserves topology checksum');
assert(response.terrainBuffer.proxyMaterialChecksum === terrain.witness.proxyMaterialChecksum, 'terrain buffer preserves proxy material checksum');
assert(response.terrainBuffer.positions instanceof Float32Array, 'terrain buffer positions are Float32Array');
assert(response.terrainBuffer.normals instanceof Float32Array, 'terrain buffer normals are Float32Array');
assert(response.terrainBuffer.metrics instanceof Float32Array, 'terrain buffer metrics are Float32Array');
assert(response.terrainBuffer.regionCodes instanceof Uint8Array, 'terrain buffer region codes are Uint8Array');
assert(response.terrainBuffer.materialCodes instanceof Uint8Array, 'terrain buffer material codes are Uint8Array');
assert(response.terrainBuffer.positions.length === terrain.samples.length * 3, 'terrain buffer has packed xyz positions');
assert(response.terrainBuffer.normals.length === terrain.samples.length * 3, 'terrain buffer has packed normals');
assert(response.terrainBuffer.metrics.length === terrain.samples.length * response.terrainBuffer.channelLayout.metrics.length, 'terrain buffer has packed metric channels');
assert(response.terrainBuffer.channelLayout.metrics.includes('routePressure'), 'terrain buffer exposes route pressure channel');
assert(response.terrainBuffer.channelLayout.metrics.includes('sideDitchAmount'), 'terrain buffer exposes side-ditch channel');
assert(
  Array.from(response.terrainBuffer.metrics).every(Number.isFinite),
  'terrain buffer metric channels are finite'
);

const decoded = decodeHillOfHillsTerrainBufferSample(response.terrainBuffer, 17);
const original = terrain.samples[17];
assert(decoded.schema === original.schema, 'decoded terrain buffer sample preserves schema');
assert(decoded.id === original.id, 'decoded terrain buffer sample preserves id');
assert(decoded.source.route === original.source.route, 'decoded terrain buffer sample preserves source route');
assert(Math.abs(decoded.world[0] - original.world[0]) < 0.0001, 'decoded terrain buffer sample preserves world x');
assert(Math.abs(decoded.world[1] - original.world[1]) < 0.0001, 'decoded terrain buffer sample preserves world y');
assert(Math.abs(decoded.world[2] - original.world[2]) < 0.0001, 'decoded terrain buffer sample preserves world z');
assert(Math.abs(decoded.height - original.height) < 0.0001, 'decoded terrain buffer sample preserves height');
assert(Math.abs(decoded.topology.routePressure - original.topology.routePressure) < 0.0001, 'decoded terrain buffer sample preserves route pressure');
assert(Math.abs(decoded.phaseInfluence.sideDitchAmount - original.phaseInfluence.sideDitchAmount) < 0.0001, 'decoded terrain buffer sample preserves side ditch amount');
assert(decoded.region === original.region, 'decoded terrain buffer sample preserves terrain region');
assert(decoded.proxyMaterial.kind === original.proxyMaterial.kind, 'decoded terrain buffer sample preserves material kind');

const transferList = transferListForHillOfHillsTerrainBuffer(terrainBuffer);
assert(transferList.length === 5, 'terrain buffer transfer list includes the five compact channel buffers');
assert(transferList.includes(terrainBuffer.positions.buffer as ArrayBuffer), 'terrain buffer transfer list includes positions backing store');
assert(transferList.includes(terrainBuffer.normals.buffer as ArrayBuffer), 'terrain buffer transfer list includes normals backing store');
assert(transferList.includes(terrainBuffer.metrics.buffer as ArrayBuffer), 'terrain buffer transfer list includes metrics backing store');
assert(transferList.includes(terrainBuffer.regionCodes.buffer as ArrayBuffer), 'terrain buffer transfer list includes region code backing store');
assert(transferList.includes(terrainBuffer.materialCodes.buffer as ArrayBuffer), 'terrain buffer transfer list includes material code backing store');
assert(hillTerrainWorkerTransferList(response).length === 5, 'worker success exposes terrain buffer transfer list');
assert(isFreshHillTerrainWorkerResponse(response, 7), 'latest successful worker response is fresh');
assert(!isFreshHillTerrainWorkerResponse(response, 8), 'older worker response is rejected as stale');

const failure = createHillTerrainWorkerFailure(request, 'phase exploded', 'terrain-generation');
assert(failure.schema === 'lerms.hill-of-hills-worker-response.v0', 'worker failure carries response schema');
assert(failure.ok === false, 'worker failure is not ok');
assert(failure.error.message === 'phase exploded', 'worker failure records error message');
assert(failure.error.phase === 'terrain-generation', 'worker failure records failure phase');
assert(hillTerrainWorkerTransferList(failure).length === 0, 'worker failure has no transfer list');
assert(!isFreshHillTerrainWorkerResponse(failure, 7), 'failed worker response is not fresh terrain evidence');

console.log('hill of hills worker contracts ok');
