import {
  createHillOfHillsTerrainBuffer,
  transferListForHillOfHillsTerrainBuffer,
  type HillOfHillsSourceOptions,
  type HillOfHillsTerrain,
  type HillOfHillsTerrainBuffer,
  type HillOfHillsTerrainParams
} from './hill-of-hills.js';

export const HILL_TERRAIN_WORKER_REQUEST_SCHEMA = 'lerms.hill-of-hills-worker-request.v0' as const;
export const HILL_TERRAIN_WORKER_RESPONSE_SCHEMA = 'lerms.hill-of-hills-worker-response.v0' as const;

export interface HillTerrainWorkerRequest {
  schema: typeof HILL_TERRAIN_WORKER_REQUEST_SCHEMA;
  requestId: number;
  params: Partial<HillOfHillsTerrainParams>;
  sourceOptions: HillOfHillsSourceOptions;
}

export type HillTerrainWorkerResponse = HillTerrainWorkerSuccess | HillTerrainWorkerFailure;

export interface HillTerrainWorkerSuccess {
  schema: typeof HILL_TERRAIN_WORKER_RESPONSE_SCHEMA;
  requestId: number;
  ok: true;
  durationMs: number;
  terrain?: HillOfHillsTerrain;
  terrainBuffer: HillOfHillsTerrainBuffer;
}

export interface HillTerrainWorkerFailure {
  schema: typeof HILL_TERRAIN_WORKER_RESPONSE_SCHEMA;
  requestId: number;
  ok: false;
  error: {
    message: string;
    phase: string;
  };
}

export function createHillTerrainWorkerRequest(
  requestId: number,
  params: Partial<HillOfHillsTerrainParams>,
  sourceOptions: HillOfHillsSourceOptions
): HillTerrainWorkerRequest {
  return {
    schema: HILL_TERRAIN_WORKER_REQUEST_SCHEMA,
    requestId,
    params,
    sourceOptions
  };
}

export function createHillTerrainWorkerResponse(
  request: HillTerrainWorkerRequest,
  terrain: HillOfHillsTerrain,
  durationMs: number,
  options: { includeTerrain?: boolean } = {}
): HillTerrainWorkerSuccess {
  const response: HillTerrainWorkerSuccess = {
    schema: HILL_TERRAIN_WORKER_RESPONSE_SCHEMA,
    requestId: request.requestId,
    ok: true,
    durationMs,
    terrainBuffer: createHillOfHillsTerrainBuffer(terrain)
  };
  if (options.includeTerrain) {
    response.terrain = terrain;
  }
  return response;
}

export function createHillTerrainWorkerFailure(
  request: Pick<HillTerrainWorkerRequest, 'requestId'>,
  message: string,
  phase: string
): HillTerrainWorkerFailure {
  return {
    schema: HILL_TERRAIN_WORKER_RESPONSE_SCHEMA,
    requestId: request.requestId,
    ok: false,
    error: {
      message,
      phase
    }
  };
}

export function isFreshHillTerrainWorkerResponse(response: HillTerrainWorkerResponse, latestRequestId: number): response is HillTerrainWorkerSuccess {
  return response.schema === HILL_TERRAIN_WORKER_RESPONSE_SCHEMA && response.ok === true && response.requestId === latestRequestId;
}

export function hillTerrainWorkerTransferList(response: HillTerrainWorkerResponse): ArrayBuffer[] {
  if (!response.ok) {
    return [];
  }
  return transferListForHillOfHillsTerrainBuffer(response.terrainBuffer);
}
