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

export interface HillAnalyticImpactSupportWorldTimeInterval {
  min: number;
  max: number;
}

export interface HillAnalyticImpactSupportCreateOptions {
  supportedWorldTime: HillAnalyticImpactSupportWorldTimeInterval;
  validationFrames: readonly HillAnalyticImpactSupportFrame[];
  maximumSpatialLipschitz: number;
  maximumSignedDistanceRate: number;
}

export interface HillAnalyticImpactSupportSample {
  distance: number;
  point: readonly [number, number, number];
  normal: readonly [number, number, number];
}

export interface HillAnalyticImpactSupportQuery {
  identity: HillAnalyticImpactSupportIdentity;
  /** Compatibility alias for the original Wet Border query shape. */
  supportIdentity: HillAnalyticImpactSupportIdentity;
  supportedWorldTime: Readonly<HillAnalyticImpactSupportWorldTimeInterval>;
  maximumSpatialLipschitz: number;
  maximumSignedDistanceRate: number;
  sampleSignedDistance(
    position: readonly [number, number, number],
    worldTime: number
  ): HillAnalyticImpactSupportSample;
}

export function createHillAnalyticImpactSupportQuery(
  frameAt: (worldTime: number) => HillAnalyticImpactSupportFrame,
  initialFrame: HillAnalyticImpactSupportFrame,
  options: HillAnalyticImpactSupportCreateOptions
): HillAnalyticImpactSupportQuery {
  if (typeof frameAt !== 'function') {
    throw new Error('Hill analytic impact support requires a frameAt function');
  }
  assertSupportIdentity(initialFrame.identity);
  assertFrameWorldTime(initialFrame, initialFrame.worldTime);
  const supportedWorldTime = freezeWorldTimeInterval(options?.supportedWorldTime);
  if (!worldTimeIsSupported(initialFrame.worldTime, supportedWorldTime)) {
    throw new Error('Hill analytic impact support initial frame is outside the supported world-time interval');
  }
  if (!Array.isArray(options?.validationFrames) || options.validationFrames.length === 0) {
    throw new Error('Hill analytic impact support requires validation frames for the published interval');
  }

  let derivedMaximumSpatialLipschitz = 0;
  let derivedMaximumSignedDistanceRate = 0;
  let validatesMinimumTime = false;
  let validatesMaximumTime = false;
  for (const frame of options.validationFrames) {
    assertSupportIdentity(frame.identity);
    assertSameIdentity(initialFrame.identity, frame.identity);
    assertFrameWorldTime(frame, frame.worldTime);
    if (!worldTimeIsSupported(frame.worldTime, supportedWorldTime)) {
      throw new Error('Hill analytic impact support validation frame is outside the supported world-time interval');
    }
    validatesMinimumTime ||= sameWorldTime(frame.worldTime, supportedWorldTime.min);
    validatesMaximumTime ||= sameWorldTime(frame.worldTime, supportedWorldTime.max);
    const terrain = unwrapTerrain(frame.terrain);
    derivedMaximumSpatialLipschitz = Math.max(
      derivedMaximumSpatialLipschitz,
      terrainSpatialLipschitzLowerBound(terrain)
    );
    derivedMaximumSignedDistanceRate = Math.max(
      derivedMaximumSignedDistanceRate,
      supportRate(terrain)
    );
  }
  if (!validatesMinimumTime || !validatesMaximumTime) {
    throw new Error('Hill analytic impact support validation frames must cover both interval boundaries');
  }

  const maximumSpatialLipschitz = resolveSpatialLipschitzBound(
    options.maximumSpatialLipschitz,
    derivedMaximumSpatialLipschitz
  );
  const maximumSignedDistanceRate = resolveTemporalRateBound(
    options.maximumSignedDistanceRate,
    derivedMaximumSignedDistanceRate
  );
  const identity = Object.freeze({ ...initialFrame.identity });

  const query: HillAnalyticImpactSupportQuery = {
    identity,
    supportIdentity: identity,
    supportedWorldTime,
    maximumSpatialLipschitz,
    maximumSignedDistanceRate,
    sampleSignedDistance(position, worldTime) {
      if (
        position.length !== 3 ||
        !position.every(Number.isFinite) ||
        !Number.isFinite(worldTime)
      ) {
        throw new Error('Hill analytic impact support query requires finite position and worldTime');
      }
      if (!worldTimeIsSupported(worldTime, supportedWorldTime)) {
        throw new Error('Hill analytic impact support query received unsupported world time');
      }
      const frame = frameAt(worldTime);
      assertSupportIdentity(frame.identity);
      assertSameIdentity(initialFrame.identity, frame.identity);
      assertFrameWorldTime(frame, worldTime);
      const terrain = unwrapTerrain(frame.terrain);
      assertFrameWithinPublishedBounds(
        terrain,
        maximumSpatialLipschitz,
        maximumSignedDistanceRate
      );
      const sample = sampleHillOfHillsTerrain(terrain, position[0], position[2]);
      const result: HillAnalyticImpactSupportSample = {
        distance: position[1] - sample.height,
        point: Object.freeze([...sample.world]) as unknown as readonly [number, number, number],
        normal: Object.freeze([...sample.normal]) as unknown as readonly [number, number, number]
      };
      assertFiniteSupportSample(result);
      assertLocalSampleWithinSpatialBound(result, maximumSpatialLipschitz);
      return result;
    }
  };
  assertHillAnalyticImpactSupportQuery(query);
  return Object.freeze(query);
}

export function assertHillAnalyticImpactSupportQuery(query: HillAnalyticImpactSupportQuery): void {
  assertSupportIdentity(query.identity);
  if (query.supportIdentity !== query.identity) {
    throw new Error('Hill analytic impact support query identity aliases have drifted');
  }
  const supportedWorldTime = freezeWorldTimeInterval(query.supportedWorldTime);
  if (
    supportedWorldTime.min !== query.supportedWorldTime.min ||
    supportedWorldTime.max !== query.supportedWorldTime.max
  ) {
    throw new Error('Hill analytic impact support query world-time interval is invalid');
  }
  if (!Number.isFinite(query.maximumSpatialLipschitz) || query.maximumSpatialLipschitz <= 0) {
    throw new Error('Hill analytic impact support query spatial Lipschitz bound is not finite and positive');
  }
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
  const rate = terrain.witness.supportFrame.maxSurfaceSpeed;
  if (!Number.isFinite(rate) || rate < 0) {
    throw new Error('Hill analytic impact support frame has an invalid temporal support rate');
  }
  return rate;
}

function assertSupportIdentity(identity: HillAnalyticImpactSupportIdentity): void {
  if (identity.schema !== HILL_ANALYTIC_IMPACT_SUPPORT_SCHEMA || identity.providerRoute !== HILL_ANALYTIC_IMPACT_SUPPORT_ROUTE) {
    throw new Error('Hill analytic impact support identity has the wrong schema or route');
  }
  if (typeof identity.sourceId !== 'string' || identity.sourceId.length === 0) {
    throw new Error('Hill analytic impact support identity is missing sourceId');
  }
  if (!/^[0-9a-f]{64}$/i.test(identity.artifactSha256)) {
    throw new Error('Hill analytic impact support requires an exact artifact SHA-256');
  }
  if (typeof identity.terrainId !== 'string' || identity.terrainId.length === 0) {
    throw new Error('Hill analytic impact support identity is missing terrainId');
  }
  for (const epoch of [identity.terrainGeneration, identity.transformEpoch, identity.topologyEpoch, identity.supportEpoch, identity.remapEpoch]) {
    if (!Number.isSafeInteger(epoch) || epoch < 0) throw new Error('Hill analytic impact support epoch is invalid');
  }
  if (identity.stale !== false) {
    throw new Error('Hill analytic impact support identity must explicitly declare stale false');
  }
  if (identity.fallbackRoute !== null) {
    throw new Error('Hill analytic impact support cannot use a fallback route');
  }
}

function assertSameIdentity(expected: HillAnalyticImpactSupportIdentity, actual: HillAnalyticImpactSupportIdentity): void {
  const fields: Array<keyof HillAnalyticImpactSupportIdentity> = [
    'schema', 'sourceId', 'providerRoute', 'artifactSha256', 'terrainId', 'terrainGeneration',
    'transformEpoch', 'topologyEpoch', 'supportEpoch', 'remapEpoch', 'stale', 'fallbackRoute'
  ];
  if (fields.some((field) => expected[field] !== actual[field])) {
    throw new Error('Hill analytic impact support frame identity changed during query');
  }
}

function freezeWorldTimeInterval(
  interval: HillAnalyticImpactSupportWorldTimeInterval | undefined
): Readonly<HillAnalyticImpactSupportWorldTimeInterval> {
  if (
    !interval ||
    !Number.isFinite(interval.min) ||
    !Number.isFinite(interval.max) ||
    interval.max < interval.min
  ) {
    throw new Error('Hill analytic impact support requires a finite ordered world-time interval');
  }
  return Object.freeze({ min: interval.min, max: interval.max });
}

function worldTimeIsSupported(
  worldTime: number,
  interval: Readonly<HillAnalyticImpactSupportWorldTimeInterval>
): boolean {
  return (
    worldTime >= interval.min - worldTimeTolerance(worldTime, interval.min) &&
    worldTime <= interval.max + worldTimeTolerance(worldTime, interval.max)
  );
}

function assertFrameWorldTime(
  frame: HillAnalyticImpactSupportFrame,
  requestedWorldTime: number
): void {
  if (!Number.isFinite(frame.worldTime)) {
    throw new Error('Hill analytic impact support frame world time is not finite');
  }
  if (!sameWorldTime(frame.worldTime, requestedWorldTime)) {
    throw new Error('Hill analytic impact support frame does not match the requested world time');
  }
}

function sameWorldTime(a: number, b: number): boolean {
  return Math.abs(a - b) <= worldTimeTolerance(a, b);
}

function worldTimeTolerance(a: number, b: number): number {
  return Number.EPSILON * Math.max(1, Math.abs(a), Math.abs(b)) * 8;
}

function terrainSpatialLipschitzLowerBound(terrain: HillOfHillsTerrain): number {
  let maximum = 1;
  for (const sample of terrain.samples) {
    const normalLength = Math.hypot(...sample.normal);
    const normalY = sample.normal[1];
    if (
      !sample.normal.every(Number.isFinite) ||
      !Number.isFinite(normalLength) ||
      Math.abs(normalLength - 1) > 1e-5 ||
      !Number.isFinite(normalY) ||
      normalY <= 0
    ) {
      throw new Error('Hill analytic impact support validation frame has an invalid terrain normal');
    }
    maximum = Math.max(maximum, 1 / normalY);
  }
  if (!Number.isFinite(maximum) || maximum <= 0) {
    throw new Error('Hill analytic impact support could not derive a finite spatial Lipschitz bound');
  }
  return maximum * (1 + 1e-9);
}

function resolveSpatialLipschitzBound(
  declared: number | undefined,
  derived: number
): number {
  if (declared === undefined) {
    throw new Error('Hill analytic impact support requires an explicit source-authoritative spatial Lipschitz bound');
  }
  if (!Number.isFinite(declared) || declared <= 0) {
    throw new Error('Hill analytic impact support spatial Lipschitz bound must be finite and positive');
  }
  if (declared < derived) {
    throw new Error('Hill analytic impact support spatial Lipschitz bound would understate validation frames');
  }
  return declared;
}

function resolveTemporalRateBound(
  declared: number | undefined,
  derived: number
): number {
  if (declared === undefined) {
    throw new Error('Hill analytic impact support requires an explicit source-authoritative temporal signed-distance rate');
  }
  if (!Number.isFinite(declared) || declared < 0) {
    throw new Error('Hill analytic impact support temporal signed-distance rate must be finite and non-negative');
  }
  if (declared < derived) {
    throw new Error('Hill analytic impact support temporal signed-distance rate would understate validation frames');
  }
  return declared;
}

function assertFrameWithinPublishedBounds(
  terrain: HillOfHillsTerrain,
  maximumSpatialLipschitz: number,
  maximumSignedDistanceRate: number
): void {
  const observedSpatialLipschitz = terrainSpatialLipschitzLowerBound(terrain);
  if (observedSpatialLipschitz > maximumSpatialLipschitz) {
    throw new Error('Hill analytic impact support sampled frame exceeds the published spatial Lipschitz bound');
  }
  const observedTemporalRate = supportRate(terrain);
  if (observedTemporalRate > maximumSignedDistanceRate) {
    throw new Error('Hill analytic impact support sampled frame exceeds the published temporal rate bound');
  }
}

function assertFiniteSupportSample(sample: HillAnalyticImpactSupportSample): void {
  if (
    !Number.isFinite(sample.distance) ||
    !sample.point.every(Number.isFinite) ||
    !sample.normal.every(Number.isFinite)
  ) {
    throw new Error('Hill analytic impact support produced a non-finite sample');
  }
  const normalLength = Math.hypot(...sample.normal);
  if (!Number.isFinite(normalLength) || normalLength <= 0 || Math.abs(normalLength - 1) > 1e-5) {
    throw new Error('Hill analytic impact support produced a non-unit normal');
  }
}

function assertLocalSampleWithinSpatialBound(
  sample: HillAnalyticImpactSupportSample,
  maximumSpatialLipschitz: number
): void {
  const normalY = sample.normal[1];
  if (!Number.isFinite(normalY) || normalY <= 0) {
    throw new Error('Hill analytic impact support produced a non-heightfield normal');
  }
  const localSpatialLipschitz = 1 / normalY;
  const tolerance = Number.EPSILON * Math.max(
    1,
    localSpatialLipschitz,
    maximumSpatialLipschitz
  ) * 16;
  if (localSpatialLipschitz > maximumSpatialLipschitz + tolerance) {
    throw new Error('Hill analytic impact support local sample exceeds the declared spatial Lipschitz bound');
  }
}
