import type { KaminosTerrainRemapReceipt } from '../fluid/hill-kaminos-runtime-exercise.js';
import type {
  HillFluidPackageAdapterFrame,
  KaminosTerrainFluidFrame
} from './hill-of-hills-fluid-package-adapter.js';

export const HILL_MOVING_SUPPORT_FIRST_IMPACT_SCHEMA =
  'lerms.hill-of-hills.moving-support-first-impact.v1' as const;
export const HILL_MOVING_SUPPORT_FIRST_IMPACT_ROUTE =
  'lerms/hill-of-hills/moving-support-first-impact-v1' as const;
export const HILL_MOVING_SUPPORT_FIRST_IMPACT_CONTRACT = Object.freeze({
  packageName: 'lerms',
  packageVersion: '0.0.0',
  modulePath: 'src/terrain/hill-of-hills-first-impact.ts',
  publicationStatus: 'lerms_source_contract',
  schema: HILL_MOVING_SUPPORT_FIRST_IMPACT_SCHEMA,
  route: HILL_MOVING_SUPPORT_FIRST_IMPACT_ROUTE
} as const);

export interface HillMovingSupportFirstImpact {
  schema: typeof HILL_MOVING_SUPPORT_FIRST_IMPACT_SCHEMA;
  route: {
    requested: typeof HILL_MOVING_SUPPORT_FIRST_IMPACT_ROUTE;
    effective: typeof HILL_MOVING_SUPPORT_FIRST_IMPACT_ROUTE;
  };
  status: 'hit';
  queryId: string;
  segment: {
    start: readonly [number, number, number];
    end: readonly [number, number, number];
    fraction: number;
  };
  impact: {
    point: readonly [number, number, number];
    normal: readonly [number, number, number];
    supportSampleIndices: readonly [number, number, number, number];
  };
  terrain: {
    terrainId: string;
    transformId: string;
    sourceFrameId: string;
    sourceRoute: string;
    sampleChecksum: string;
    supportFrameChecksum: string;
  };
  epochs: {
    priorTerrain: number;
    terrain: number;
    support: number;
    topology: number;
  };
  freshness: HillFluidPackageAdapterFrame['freshness'];
  successor: {
    status: 'current_without_successor' | 'remap_committed';
    remapReceiptId: string | null;
    previousTerrainEpoch: number | null;
    terrainEpoch: number | null;
    transformId: string | null;
  };
  complete: true;
  fallback: null;
}

export interface HillMovingSupportMiss {
  schema: typeof HILL_MOVING_SUPPORT_FIRST_IMPACT_SCHEMA;
  route: {
    requested: typeof HILL_MOVING_SUPPORT_FIRST_IMPACT_ROUTE;
    effective: typeof HILL_MOVING_SUPPORT_FIRST_IMPACT_ROUTE;
  };
  status: 'miss';
  queryId: string;
  reason: 'segment_outside_support' | 'no_surface_crossing';
  terrain: HillMovingSupportFirstImpact['terrain'];
  epochs: HillMovingSupportFirstImpact['epochs'];
  freshness: HillFluidPackageAdapterFrame['freshness'];
  successor: HillMovingSupportFirstImpact['successor'];
  complete: true;
  fallback: null;
}

export type HillMovingSupportFirstImpactResult =
  | HillMovingSupportFirstImpact
  | HillMovingSupportMiss;

export function findHillMovingSupportFirstImpact(
  adapterFrame: HillFluidPackageAdapterFrame,
  terrainFrame: KaminosTerrainFluidFrame,
  remapReceipt: KaminosTerrainRemapReceipt | null,
  options: {
    queryId: string;
    start: readonly [number, number, number];
    end: readonly [number, number, number];
  }
): HillMovingSupportFirstImpactResult {
  requireNonempty(options.queryId, 'query id');
  assertFiniteVec3(options.start, 'segment start');
  assertFiniteVec3(options.end, 'segment end');
  assertCurrentHillIdentity(adapterFrame, terrainFrame, remapReceipt);

  const identity = createIdentity(adapterFrame, terrainFrame, remapReceipt);
  let previous = sampleSupport(adapterFrame, terrainFrame, options.start);
  if (previous && previous.signedHeight <= 0) {
    return createHit(identity, options, 0, previous);
  }

  const stepCount = 256;
  for (let step = 1; step <= stepCount; step += 1) {
    const fraction = step / stepCount;
    const point = interpolateVec3(options.start, options.end, fraction);
    const current = sampleSupport(adapterFrame, terrainFrame, point);
    if (
      previous &&
      current &&
      previous.signedHeight > 0 &&
      current.signedHeight <= 0
    ) {
      let lower = (step - 1) / stepCount;
      let upper = fraction;
      let hit = current;
      for (let iteration = 0; iteration < 24; iteration += 1) {
        const middle = (lower + upper) * 0.5;
        const middlePoint = interpolateVec3(options.start, options.end, middle);
        const middleSample = sampleSupport(adapterFrame, terrainFrame, middlePoint);
        if (!middleSample || middleSample.signedHeight > 0) {
          lower = middle;
        } else {
          upper = middle;
          hit = middleSample;
        }
      }
      return createHit(identity, options, upper, hit);
    }
    previous = current;
  }

  const midpoint = interpolateVec3(options.start, options.end, 0.5);
  return {
    schema: HILL_MOVING_SUPPORT_FIRST_IMPACT_SCHEMA,
    route: exactRoute(),
    status: 'miss',
    queryId: options.queryId,
    reason: sampleSupport(adapterFrame, terrainFrame, midpoint)
      ? 'no_surface_crossing'
      : 'segment_outside_support',
    ...identity,
    complete: true,
    fallback: null
  };
}

export function assertHillMovingSupportFirstImpact(
  result: HillMovingSupportFirstImpactResult
): void {
  if (
    result.schema !== HILL_MOVING_SUPPORT_FIRST_IMPACT_SCHEMA ||
    result.route.requested !== HILL_MOVING_SUPPORT_FIRST_IMPACT_ROUTE ||
    result.route.effective !== result.route.requested ||
    !result.complete ||
    result.fallback !== null
  ) {
    throw new Error('moving Hill first-impact route or completion identity is invalid');
  }
  if (
    result.freshness.status !== 'fresh' ||
    result.freshness.ageMs > result.freshness.budgetMs
  ) {
    throw new Error('moving Hill first-impact source is stale');
  }
  if (result.epochs.terrain < result.epochs.priorTerrain) {
    throw new Error('moving Hill first-impact terrain epoch is stale');
  }
  if (result.epochs.terrain > result.epochs.priorTerrain) {
    if (
      result.successor.status !== 'remap_committed' ||
      result.successor.remapReceiptId === null ||
      result.successor.previousTerrainEpoch !== result.epochs.priorTerrain ||
      result.successor.terrainEpoch !== result.epochs.terrain ||
      result.successor.transformId !== result.terrain.transformId
    ) {
      throw new Error('moving Hill first-impact successor continuity is missing');
    }
  }
  if (result.status === 'hit') {
    assertFiniteVec3(result.impact.point, 'impact point');
    assertFiniteVec3(result.impact.normal, 'impact normal');
    const normalLength = Math.hypot(...result.impact.normal);
    if (Math.abs(normalLength - 1) > 1e-5) {
      throw new Error('moving Hill first-impact normal is not unit length');
    }
    if (result.segment.fraction < 0 || result.segment.fraction > 1) {
      throw new Error('moving Hill first-impact fraction is invalid');
    }
  }
}

function createIdentity(
  adapterFrame: HillFluidPackageAdapterFrame,
  terrainFrame: KaminosTerrainFluidFrame,
  remapReceipt: KaminosTerrainRemapReceipt | null
): Pick<
  HillMovingSupportFirstImpact,
  'terrain' | 'epochs' | 'freshness' | 'successor'
> {
  return {
    terrain: {
      terrainId: terrainFrame.terrainId,
      transformId: terrainFrame.transformId,
      sourceFrameId: adapterFrame.terrain.sourceFrameId,
      sourceRoute: adapterFrame.terrain.sourceRoute,
      sampleChecksum: adapterFrame.terrain.sampleChecksum,
      supportFrameChecksum: adapterFrame.terrain.supportFrameChecksum
    },
    epochs: {
      priorTerrain: terrainFrame.priorEpoch,
      terrain: terrainFrame.currentEpoch,
      support: adapterFrame.terrain.supportEpoch,
      topology: adapterFrame.terrain.topologyEpoch
    },
    freshness: { ...adapterFrame.freshness },
    successor: remapReceipt
      ? {
          status: 'remap_committed',
          remapReceiptId: remapReceipt.receiptId,
          previousTerrainEpoch: remapReceipt.previousTerrainEpoch,
          terrainEpoch: remapReceipt.terrainEpoch,
          transformId: remapReceipt.transformId
        }
      : {
          status: 'current_without_successor',
          remapReceiptId: null,
          previousTerrainEpoch: null,
          terrainEpoch: null,
          transformId: null
        }
  };
}

function createHit(
  identity: ReturnType<typeof createIdentity>,
  options: {
    queryId: string;
    start: readonly [number, number, number];
    end: readonly [number, number, number];
  },
  fraction: number,
  sample: SupportSample
): HillMovingSupportFirstImpact {
  const point = interpolateVec3(options.start, options.end, fraction);
  point[1] = sample.height;
  const result: HillMovingSupportFirstImpact = {
    schema: HILL_MOVING_SUPPORT_FIRST_IMPACT_SCHEMA,
    route: exactRoute(),
    status: 'hit',
    queryId: options.queryId,
    segment: {
      start: [...options.start],
      end: [...options.end],
      fraction
    },
    impact: {
      point,
      normal: sample.normal,
      supportSampleIndices: sample.indices
    },
    ...identity,
    complete: true,
    fallback: null
  };
  assertHillMovingSupportFirstImpact(result);
  return result;
}

interface SupportSample {
  signedHeight: number;
  height: number;
  normal: [number, number, number];
  indices: [number, number, number, number];
}

function sampleSupport(
  adapterFrame: HillFluidPackageAdapterFrame,
  terrainFrame: KaminosTerrainFluidFrame,
  point: readonly [number, number, number]
): SupportSample | null {
  const { width, height, spacing, origin } = terrainFrame.grid;
  const x = (point[0] - origin[0]) / spacing[0];
  const z = (point[2] - origin[2]) / spacing[1];
  if (x < 0 || z < 0 || x > width - 1 || z > height - 1) {
    return null;
  }
  const x0 = Math.min(width - 1, Math.floor(x));
  const z0 = Math.min(height - 1, Math.floor(z));
  const x1 = Math.min(width - 1, x0 + 1);
  const z1 = Math.min(height - 1, z0 + 1);
  const tx = x - x0;
  const tz = z - z0;
  const indices: [number, number, number, number] = [
    z0 * width + x0,
    z0 * width + x1,
    z1 * width + x0,
    z1 * width + x1
  ];
  const weights = [
    (1 - tx) * (1 - tz),
    tx * (1 - tz),
    (1 - tx) * tz,
    tx * tz
  ];
  let supportHeight = 0;
  const normal: [number, number, number] = [0, 0, 0];
  for (let corner = 0; corner < 4; corner += 1) {
    const index = indices[corner];
    const weight = weights[corner];
    supportHeight += terrainFrame.fields.worldPosition[index * 3 + 1] * weight;
    normal[0] += adapterFrame.channels.normals[index * 3] * weight;
    normal[1] += adapterFrame.channels.normals[index * 3 + 1] * weight;
    normal[2] += adapterFrame.channels.normals[index * 3 + 2] * weight;
  }
  const normalLength = Math.hypot(...normal);
  if (!Number.isFinite(normalLength) || normalLength <= 1e-8) {
    throw new Error('moving Hill first-impact support normal is degenerate');
  }
  normal[0] /= normalLength;
  normal[1] /= normalLength;
  normal[2] /= normalLength;
  return {
    signedHeight: point[1] - supportHeight,
    height: supportHeight,
    normal,
    indices
  };
}

function assertCurrentHillIdentity(
  adapterFrame: HillFluidPackageAdapterFrame,
  terrainFrame: KaminosTerrainFluidFrame,
  remapReceipt: KaminosTerrainRemapReceipt | null
): void {
  if (
    adapterFrame.freshness.status !== 'fresh' ||
    adapterFrame.freshness.ageMs > adapterFrame.freshness.budgetMs
  ) {
    throw new Error('moving Hill first-impact rejects stale support');
  }
  if (
    terrainFrame.source.requested !== terrainFrame.source.effective ||
    terrainFrame.currentEpoch !== adapterFrame.terrain.currentEpoch ||
    terrainFrame.expectedSampleCount !== adapterFrame.terrain.sampleCount ||
    terrainFrame.fields.worldPosition.length !== terrainFrame.expectedSampleCount * 3
  ) {
    throw new Error('moving Hill first-impact rejects partial or substituted support');
  }
  if (terrainFrame.currentEpoch > terrainFrame.priorEpoch) {
    if (
      !remapReceipt ||
      remapReceipt.state !== 'committed' ||
      remapReceipt.previousTerrainEpoch !== terrainFrame.priorEpoch ||
      remapReceipt.terrainEpoch !== terrainFrame.currentEpoch ||
      remapReceipt.terrainId !== terrainFrame.terrainId ||
      remapReceipt.transformId !== terrainFrame.transformId
    ) {
      throw new Error('moving Hill first-impact requires exact successor remap continuity');
    }
  }
}

function exactRoute(): HillMovingSupportFirstImpact['route'] {
  return {
    requested: HILL_MOVING_SUPPORT_FIRST_IMPACT_ROUTE,
    effective: HILL_MOVING_SUPPORT_FIRST_IMPACT_ROUTE
  };
}

function interpolateVec3(
  start: readonly [number, number, number],
  end: readonly [number, number, number],
  fraction: number
): [number, number, number] {
  return [
    start[0] + (end[0] - start[0]) * fraction,
    start[1] + (end[1] - start[1]) * fraction,
    start[2] + (end[2] - start[2]) * fraction
  ];
}

function assertFiniteVec3(value: readonly number[], label: string): void {
  if (value.length !== 3 || value.some((component) => !Number.isFinite(component))) {
    throw new Error(`moving Hill first-impact requires finite ${label}`);
  }
}

function requireNonempty(value: string, label: string): void {
  if (value.trim().length === 0) {
    throw new Error(`moving Hill first-impact requires ${label}`);
  }
}
