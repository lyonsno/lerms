import {
  sampleHillOfHillsTerrain,
  type HillOfHillsTerrain,
  type HillOfHillsTerrainBuffer,
} from './hill-of-hills.js';

export const HILL_ANALYTIC_IMPACT_SUPPORT_SCHEMA =
  'lerms.hill-of-hills.analytic-impact-support.v1' as const;
export const HILL_ANALYTIC_IMPACT_SUPPORT_ROUTE =
  'lerms/hill-of-hills/analytic-impact-support-v1' as const;

export interface HillAnalyticImpactSupportIdentity {
  schema: typeof HILL_ANALYTIC_IMPACT_SUPPORT_SCHEMA;
  sourceId: string;
  providerRoute: typeof HILL_ANALYTIC_IMPACT_SUPPORT_ROUTE;
  artifactSha256: string;
  terrainId: string;
  terrainGeneration: number;
  transformEpoch: number;
  topologyEpoch: number;
  supportEpoch: number;
  remapEpoch: number;
  stale: false;
  fallbackRoute: null;
}

export interface HillAnalyticImpactSupportFrame {
  terrain: HillOfHillsTerrain | HillOfHillsTerrainBuffer;
  identity: HillAnalyticImpactSupportIdentity;
  worldTime: number;
}

export interface HillAnalyticImpactSupportQuery {
  supportIdentity: HillAnalyticImpactSupportIdentity;
  sampleSignedDistance(position: readonly [number, number, number], worldTime: number): {
    distance: number;
    point: readonly [number, number, number];
    normal: readonly [number, number, number];
  };
  maximumSignedDistanceRate: number;
}

export function createHillAnalyticImpactSupportQuery(
  frameAt: (worldTime: number) => HillAnalyticImpactSupportFrame,
  initialFrame: HillAnalyticImpactSupportFrame
): HillAnalyticImpactSupportQuery {
  assertSupportIdentity(initialFrame.identity);
  const initialRate = supportRate(initialFrame.terrain);
  if (!Number.isFinite(initialRate) || initialRate < 0) {
    throw new Error('Hill analytic impact support requires a finite non-negative support rate');
  }
  return {
    supportIdentity: Object.freeze({ ...initialFrame.identity }),
    maximumSignedDistanceRate: initialRate,
    sampleSignedDistance(position, worldTime) {
      if (!position.every(Number.isFinite) || !Number.isFinite(worldTime)) {
        throw new Error('Hill analytic impact support query requires finite position and worldTime');
      }
      const frame = frameAt(worldTime);
      assertSupportIdentity(frame.identity);
      assertSameIdentity(initialFrame.identity, frame.identity);
      const terrain = unwrapTerrain(frame.terrain);
      const sample = sampleHillOfHillsTerrain(terrain, position[0], position[2]);
      return {
        distance: position[1] - sample.height,
        point: sample.world,
        normal: sample.normal
      };
    }
  };
}

export function assertHillAnalyticImpactSupportQuery(query: HillAnalyticImpactSupportQuery): void {
  assertSupportIdentity(query.supportIdentity);
  if (!Number.isFinite(query.maximumSignedDistanceRate) || query.maximumSignedDistanceRate < 0) {
    throw new Error('Hill analytic impact support query rate is not finite and non-negative');
  }
  if (typeof query.sampleSignedDistance !== 'function') {
    throw new Error('Hill analytic impact support query is missing sampleSignedDistance');
  }
}

function unwrapTerrain(terrain: HillOfHillsTerrain | HillOfHillsTerrainBuffer): HillOfHillsTerrain {
  if ('params' in terrain && 'phaseState' in terrain) return terrain;
  throw new Error('Hill analytic impact support requires a source terrain frame, not a detached buffer');
}

function supportRate(terrain: HillOfHillsTerrain | HillOfHillsTerrainBuffer): number {
  if (!('witness' in terrain)) throw new Error('Hill analytic impact support frame is missing witness support rate');
  return terrain.witness.supportFrame.maxSurfaceSpeed;
}

function assertSupportIdentity(identity: HillAnalyticImpactSupportIdentity): void {
  if (identity.schema !== HILL_ANALYTIC_IMPACT_SUPPORT_SCHEMA || identity.providerRoute !== HILL_ANALYTIC_IMPACT_SUPPORT_ROUTE) {
    throw new Error('Hill analytic impact support identity has the wrong schema or route');
  }
  if (!/^[0-9a-f]{64}$/i.test(identity.artifactSha256)) {
    throw new Error('Hill analytic impact support requires an exact artifact SHA-256');
  }
  for (const epoch of [identity.terrainGeneration, identity.transformEpoch, identity.topologyEpoch, identity.supportEpoch, identity.remapEpoch]) {
    if (!Number.isSafeInteger(epoch) || epoch < 0) throw new Error('Hill analytic impact support epoch is invalid');
  }
  if (identity.stale || identity.fallbackRoute !== null) throw new Error('Hill analytic impact support cannot be stale or fallback');
}

function assertSameIdentity(expected: HillAnalyticImpactSupportIdentity, actual: HillAnalyticImpactSupportIdentity): void {
  const fields: Array<keyof HillAnalyticImpactSupportIdentity> = [
    'schema', 'sourceId', 'providerRoute', 'artifactSha256', 'terrainId', 'terrainGeneration',
    'transformEpoch', 'topologyEpoch', 'supportEpoch', 'remapEpoch'
  ];
  if (fields.some((field) => expected[field] !== actual[field])) {
    throw new Error('Hill analytic impact support frame identity changed during query');
  }
}
