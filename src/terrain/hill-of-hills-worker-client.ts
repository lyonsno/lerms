import type { HillOfHillsSourceOptions, HillOfHillsTerrain, HillOfHillsTerrainParams } from './hill-of-hills.js';

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
  terrain: HillOfHillsTerrain;
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
  durationMs: number
): HillTerrainWorkerSuccess {
  return {
    schema: HILL_TERRAIN_WORKER_RESPONSE_SCHEMA,
    requestId: request.requestId,
    ok: true,
    durationMs,
    terrain
  };
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
