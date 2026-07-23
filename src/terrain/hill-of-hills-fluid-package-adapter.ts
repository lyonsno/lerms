import { SOURCE_TRUTH_SCHEMA, type SourceTruth } from '../contracts/first-vertical.js';
import type {
  KaminosFluidPackageLoadFailure,
  KaminosFluidPackagePin,
  KaminosFluidPackageRequest
} from '../fluid/kaminos-fluid-package-consumer.js';
import type {
  HillOfHillsSupportMotionClass,
  HillOfHillsSupportShockClass,
  HillOfHillsTerrainBuffer,
  HillOfHillsTerrainBufferMetricChannel
} from './hill-of-hills.js';

export const HILL_FLUID_PACKAGE_ADAPTER_FRAME_SCHEMA = 'lerms.hill-of-hills.watershed-package-adapter-frame.v0' as const;
export const HILL_FLUID_PACKAGE_BLOCKED_REPORT_SCHEMA = 'lerms.hill-of-hills.watershed-package-blocked-report.v0' as const;

const STABLE_FLUID_METRIC_CHANNELS = ['height', 'wetness', 'routePressure', 'surfaceVelocityY'] as const;
const SIGNED_TERRAIN_EVIDENCE_CHANNELS = [
  'topologyDeformation',
  'topologyVelocity',
  'topologyForce',
  'hillSwellMembership',
  'hillSlumpMembership'
] as const;

export interface HillFluidPhysicalScale {
  metersPerWorldUnit: number;
  secondsPerSimulationSecond: number;
  gravityMetersPerSecondSquared: number;
}

export interface HillFluidPackageAdapterFrame {
  schema: typeof HILL_FLUID_PACKAGE_ADAPTER_FRAME_SCHEMA;
  frameId: string;
  source: SourceTruth;
  freshness: {
    ageMs: number;
    budgetMs: number;
    status: 'fresh';
  };
  physicalScale: HillFluidPhysicalScale;
  terrain: {
    sourceFrameId: string;
    sourceRoute: string;
    sourceConfigId?: string;
    currentEpoch: number;
    priorEpoch: number;
    supportEpoch: number;
    topologyEpoch: number;
    supportFrameChecksum: string;
    sampleChecksum: string;
    topologyChecksum: string;
    proxyMaterialChecksum: string;
    dirtyRegionChecksum: string;
    dirtySampleCount: number;
    dirtyTileCount: number;
    supportMotionClassCounts: Partial<Record<HillOfHillsSupportMotionClass, number>>;
    supportShockClassCounts: Partial<Record<HillOfHillsSupportShockClass, number>>;
    worldBounds: HillOfHillsTerrainBuffer['witness']['supportFrame']['worldBounds'];
    domainBounds: HillOfHillsTerrainBuffer['witness']['supportFrame']['domainBounds'];
    gridResolution: HillOfHillsTerrainBuffer['gridResolution'];
    sampleCount: number;
    heightRange: HillOfHillsTerrainBuffer['heightRange'];
  };
  channels: {
    positions: Float32Array;
    normals: Float32Array;
    metrics: Float32Array;
    regionCodes: Uint8Array;
    materialCodes: Uint8Array;
    metricLayout: readonly HillOfHillsTerrainBufferMetricChannel[];
    stableFluidMetricChannels: typeof STABLE_FLUID_METRIC_CHANNELS;
    signedTerrainEvidenceChannels: typeof SIGNED_TERRAIN_EVIDENCE_CHANNELS;
  };
  providerBinding: {
    status: 'awaiting_canonical_package';
    canonicalTerrainFluidFrameSchema: null;
    reason: 'producer_contract_not_loaded';
  };
}

export interface HillFluidPackageBlockedReport {
  schema: typeof HILL_FLUID_PACKAGE_BLOCKED_REPORT_SCHEMA;
  ok: false;
  status: 'blocked_provider';
  frameId: string;
  generatedAtMs: number;
  primaryOutputWritten: false;
  requestedPackage: Readonly<KaminosFluidPackagePin>;
  effectivePackage: KaminosFluidPackageLoadFailure['effective'];
  terrain: {
    frameId: string;
    sourceFrameId: string;
    currentEpoch: number;
    supportFrameChecksum: string;
    sampleChecksum: string;
  };
  physicalScale: HillFluidPhysicalScale;
  requestedRuntimeRoute: string;
  requestedRepresentationRoute: string;
  requestedOutputRoute: string;
  failurePhase: KaminosFluidPackageLoadFailure['failurePhase'];
  error: string;
  rejections: readonly string[];
}

export interface KaminosTerrainFluidFrame {
  schema: 'kaminos.fluid.terrain-fluid-frame.v1';
  route: {
    requested: string;
    effective: string;
  };
  producer: {
    id: 'lerms/hill-of-hills';
    revision: string;
  };
  source: {
    requested: string;
    effective: string;
  };
  worldMetersPerUnit: 1;
  gravity: readonly [0, number, 0];
  terrainId: string;
  supportClass: 'heightfield';
  transformId: string;
  priorEpoch: number;
  currentEpoch: number;
  motionClass: 'stable' | 'phase_morph' | 'shock_reset';
  shockId: string | null;
  grid: {
    width: number;
    height: number;
    spacing: readonly [number, number];
    origin: readonly [number, number, number];
  };
  fields: {
    bedHeight: Float64Array;
    jacobian: Float64Array;
    gradient: Float64Array;
    tangentU: Float64Array;
    tangentV: Float64Array;
    normal: Float64Array;
    supportVelocity: Float64Array;
    valid: Uint8Array;
  };
  dirtyRegions: readonly {
    x: number;
    y: number;
    width: number;
    height: number;
    sourceChecksum: string;
    dirtySampleCount: number;
  }[];
  minimumFilteredSupportScale: null;
  motionSubstepEnvelope: null;
  complete: true;
  expectedSampleCount: number;
  actualSampleCount: number;
}

export function createHillFluidPackageAdapterFrame(
  terrainBuffer: HillOfHillsTerrainBuffer,
  options: {
    frameId: string;
    generatedAtMs: number;
    freshnessBudgetMs: number;
    priorTerrainEpoch: number;
    physicalScale: HillFluidPhysicalScale;
  }
): HillFluidPackageAdapterFrame {
  requireNonempty(options.frameId, 'adapter frame id');
  requireFinite(options.generatedAtMs, 'generatedAtMs');
  requirePositive(options.freshnessBudgetMs, 'freshness budget');
  requireNonnegativeInteger(options.priorTerrainEpoch, 'prior terrain epoch');
  assertPhysicalScale(options.physicalScale);

  const sourceAgeMs = Math.max(
    terrainBuffer.source.sampleAgeMs,
    Math.max(0, options.generatedAtMs - terrainBuffer.source.timestampMs)
  );
  if (sourceAgeMs > options.freshnessBudgetMs) {
    throw new Error(`stale terrain frame: age ${sourceAgeMs}ms exceeds ${options.freshnessBudgetMs}ms budget`);
  }
  if (options.priorTerrainEpoch > terrainBuffer.witness.terrainEpoch) {
    throw new Error('prior terrain epoch cannot be newer than current Hill terrain epoch');
  }

  const source: SourceTruth = {
    schema: SOURCE_TRUTH_SCHEMA,
    authority: terrainBuffer.source.authority,
    route: 'lerms/hill-of-hills/watershed-package-adapter',
    frameId: options.frameId,
    timestampMs: options.generatedAtMs,
    sampleAgeMs: sourceAgeMs,
    backend: terrainBuffer.source.backend,
    configId: terrainBuffer.source.configId
  };
  const support = terrainBuffer.witness.supportFrame;
  const frame: HillFluidPackageAdapterFrame = {
    schema: HILL_FLUID_PACKAGE_ADAPTER_FRAME_SCHEMA,
    frameId: options.frameId,
    source,
    freshness: {
      ageMs: sourceAgeMs,
      budgetMs: options.freshnessBudgetMs,
      status: 'fresh'
    },
    physicalScale: { ...options.physicalScale },
    terrain: {
      sourceFrameId: terrainBuffer.source.frameId,
      sourceRoute: terrainBuffer.source.route,
      sourceConfigId: terrainBuffer.source.configId,
      currentEpoch: terrainBuffer.witness.terrainEpoch,
      priorEpoch: options.priorTerrainEpoch,
      supportEpoch: support.supportEpoch,
      topologyEpoch: support.topologyEpoch,
      supportFrameChecksum: support.supportFrameChecksum,
      sampleChecksum: terrainBuffer.sampleChecksum,
      topologyChecksum: terrainBuffer.topologyChecksum,
      proxyMaterialChecksum: terrainBuffer.proxyMaterialChecksum,
      dirtyRegionChecksum: terrainBuffer.witness.dirtyRegionChecksum,
      dirtySampleCount: terrainBuffer.witness.dirtySampleCount,
      dirtyTileCount: terrainBuffer.witness.dirtyTileCount,
      supportMotionClassCounts: support.motionClassCounts,
      supportShockClassCounts: support.shockClassCounts,
      worldBounds: support.worldBounds,
      domainBounds: support.domainBounds,
      gridResolution: terrainBuffer.gridResolution,
      sampleCount: terrainBuffer.sampleCount,
      heightRange: terrainBuffer.heightRange
    },
    channels: {
      positions: terrainBuffer.positions,
      normals: terrainBuffer.normals,
      metrics: terrainBuffer.metrics,
      regionCodes: terrainBuffer.regionCodes,
      materialCodes: terrainBuffer.materialCodes,
      metricLayout: terrainBuffer.channelLayout.metrics,
      stableFluidMetricChannels: STABLE_FLUID_METRIC_CHANNELS,
      signedTerrainEvidenceChannels: SIGNED_TERRAIN_EVIDENCE_CHANNELS
    },
    providerBinding: {
      status: 'awaiting_canonical_package',
      canonicalTerrainFluidFrameSchema: null,
      reason: 'producer_contract_not_loaded'
    }
  };

  assertHillFluidPackageAdapterFrame(frame);
  return frame;
}

export function assertHillFluidPackageAdapterFrame(frame: HillFluidPackageAdapterFrame): void {
  if (frame.schema !== HILL_FLUID_PACKAGE_ADAPTER_FRAME_SCHEMA) {
    throw new Error(`unexpected Hill package adapter schema ${String(frame.schema)}`);
  }
  if (frame.source.authority !== 'live_simulation') {
    throw new Error(`Hill package adapter requires live terrain authority, received ${frame.source.authority}`);
  }
  if (frame.freshness.status !== 'fresh' || frame.freshness.ageMs > frame.freshness.budgetMs) {
    throw new Error('Hill package adapter requires a fresh terrain frame');
  }
  requirePositive(frame.physicalScale.metersPerWorldUnit, 'meters per world unit');
  requirePositive(frame.physicalScale.secondsPerSimulationSecond, 'seconds per simulation second');
  requirePositive(frame.physicalScale.gravityMetersPerSecondSquared, 'gravity');
  requireNonnegativeInteger(frame.terrain.currentEpoch, 'current terrain epoch');
  requireNonnegativeInteger(frame.terrain.priorEpoch, 'prior terrain epoch');
  if (frame.terrain.priorEpoch > frame.terrain.currentEpoch) {
    throw new Error('Hill package adapter prior terrain epoch exceeds current epoch');
  }
  requireNonempty(frame.terrain.supportFrameChecksum, 'support frame checksum');
  requireNonempty(frame.terrain.sampleChecksum, 'sample checksum');
  requireNonempty(frame.terrain.dirtyRegionChecksum, 'dirty region checksum');
  requirePositiveInteger(frame.terrain.gridResolution.x, 'grid x resolution');
  requirePositiveInteger(frame.terrain.gridResolution.z, 'grid z resolution');
  requirePositiveInteger(frame.terrain.sampleCount, 'sample count');

  const expectedSampleCount = frame.terrain.gridResolution.x * frame.terrain.gridResolution.z;
  if (frame.terrain.sampleCount !== expectedSampleCount) {
    throw new Error(`Hill package adapter sample count ${frame.terrain.sampleCount} does not match grid ${expectedSampleCount}`);
  }
  if (frame.channels.positions.length !== frame.terrain.sampleCount * 3) {
    throw new Error('Hill package adapter positions are partial for sample count');
  }
  if (frame.channels.normals.length !== frame.terrain.sampleCount * 3) {
    throw new Error('Hill package adapter normals are partial for sample count');
  }
  if (frame.channels.metrics.length !== frame.terrain.sampleCount * frame.channels.metricLayout.length) {
    throw new Error('Hill package adapter metrics are partial for sample count');
  }
  if (frame.channels.regionCodes.length !== frame.terrain.sampleCount) {
    throw new Error('Hill package adapter region codes are partial for sample count');
  }
  if (frame.channels.materialCodes.length !== frame.terrain.sampleCount) {
    throw new Error('Hill package adapter material codes are partial for sample count');
  }
  for (const channel of STABLE_FLUID_METRIC_CHANNELS) {
    if (!frame.channels.metricLayout.includes(channel)) {
      throw new Error(`Hill package adapter is missing stable fluid metric channel ${channel}`);
    }
  }
  for (const channel of SIGNED_TERRAIN_EVIDENCE_CHANNELS) {
    if (!frame.channels.metricLayout.includes(channel)) {
      throw new Error(`Hill package adapter is missing signed terrain evidence channel ${channel}`);
    }
  }
  if (frame.providerBinding.status !== 'awaiting_canonical_package' || frame.providerBinding.canonicalTerrainFluidFrameSchema !== null) {
    throw new Error('Hill package adapter cannot claim a canonical provider binding before package load');
  }
}

export function createKaminosTerrainFluidFrame(
  adapterFrame: HillFluidPackageAdapterFrame,
  options: {
    producerRevision: string;
    requestedRoute: string;
    requestedSourceId: string;
  }
): KaminosTerrainFluidFrame {
  assertHillFluidPackageAdapterFrame(adapterFrame);
  requireNonempty(options.producerRevision, 'Hill producer revision');
  requireNonempty(options.requestedRoute, 'terrain frame route');
  requireNonempty(options.requestedSourceId, 'terrain source id');
  if (adapterFrame.physicalScale.metersPerWorldUnit !== 1) {
    throw new Error('Kaminos mapped macro reference requires Hill coordinates normalized to one meter per world unit');
  }
  if (adapterFrame.physicalScale.secondsPerSimulationSecond !== 1) {
    throw new Error('Kaminos mapped macro reference requires one simulation second per physical second');
  }

  const sampleCount = adapterFrame.terrain.sampleCount;
  const bedHeight = new Float64Array(sampleCount);
  const jacobian = new Float64Array(sampleCount);
  const gradient = new Float64Array(sampleCount * 2);
  const tangentU = new Float64Array(sampleCount * 3);
  const tangentV = new Float64Array(sampleCount * 3);
  const normal = new Float64Array(sampleCount * 3);
  const supportVelocity = new Float64Array(sampleCount * 3);
  const valid = new Uint8Array(sampleCount);
  const supportVelocityMetricIndex = adapterFrame.channels.metricLayout.indexOf('surfaceVelocityY');

  if (supportVelocityMetricIndex < 0) {
    throw new Error('Hill package adapter is missing surfaceVelocityY for canonical support velocity');
  }

  for (let index = 0; index < sampleCount; index += 1) {
    const vectorOffset = index * 3;
    const sourceNormalY = adapterFrame.channels.normals[vectorOffset + 1];
    if (!Number.isFinite(sourceNormalY) || Math.abs(sourceNormalY) <= 1e-8) {
      throw new Error(`Hill sample ${index} has a degenerate heightfield normal`);
    }

    bedHeight[index] = adapterFrame.channels.positions[vectorOffset + 1];
    jacobian[index] = 1;
    gradient[index * 2] = -adapterFrame.channels.normals[vectorOffset] / sourceNormalY;
    gradient[index * 2 + 1] = -adapterFrame.channels.normals[vectorOffset + 2] / sourceNormalY;

    // The first Kaminos core uses a fixed orthogonal chart; slope remains in gradient/bed height.
    tangentU[vectorOffset] = 1;
    tangentV[vectorOffset + 2] = 1;
    normal[vectorOffset + 1] = 1;
    supportVelocity[vectorOffset + 1] =
      adapterFrame.channels.metrics[index * adapterFrame.channels.metricLayout.length + supportVelocityMetricIndex];
    valid[index] = 1;
  }

  const motionClass = canonicalMotionClass(adapterFrame);
  const width = adapterFrame.terrain.gridResolution.x;
  const height = adapterFrame.terrain.gridResolution.z;
  const worldBounds = adapterFrame.terrain.worldBounds;
  const spacingX = (worldBounds.x.max - worldBounds.x.min) / Math.max(1, width - 1);
  const spacingZ = (worldBounds.z.max - worldBounds.z.min) / Math.max(1, height - 1);
  requirePositive(spacingX, 'canonical terrain X spacing');
  requirePositive(spacingZ, 'canonical terrain Z spacing');

  return {
    schema: 'kaminos.fluid.terrain-fluid-frame.v1',
    route: {
      requested: options.requestedRoute,
      effective: options.requestedRoute
    },
    producer: {
      id: 'lerms/hill-of-hills',
      revision: options.producerRevision
    },
    source: {
      requested: options.requestedSourceId,
      effective: options.requestedSourceId
    },
    worldMetersPerUnit: 1,
    gravity: [0, -adapterFrame.physicalScale.gravityMetersPerSecondSquared, 0],
    terrainId: `hill-of-hills:${adapterFrame.terrain.sampleChecksum}`,
    supportClass: 'heightfield',
    transformId: `hill-support:${adapterFrame.terrain.supportFrameChecksum}`,
    priorEpoch: adapterFrame.terrain.priorEpoch,
    currentEpoch: adapterFrame.terrain.currentEpoch,
    motionClass,
    shockId: motionClass === 'shock_reset'
      ? `hill-shock:${adapterFrame.terrain.supportFrameChecksum}`
      : null,
    grid: {
      width,
      height,
      spacing: [spacingX, spacingZ],
      origin: [worldBounds.x.min, 0, worldBounds.z.min]
    },
    fields: {
      bedHeight,
      jacobian,
      gradient,
      tangentU,
      tangentV,
      normal,
      supportVelocity,
      valid
    },
    dirtyRegions: adapterFrame.terrain.dirtySampleCount > 0
      ? [{
          x: 0,
          y: 0,
          width,
          height,
          sourceChecksum: adapterFrame.terrain.dirtyRegionChecksum,
          dirtySampleCount: adapterFrame.terrain.dirtySampleCount
        }]
      : [],
    minimumFilteredSupportScale: null,
    motionSubstepEnvelope: null,
    complete: true,
    expectedSampleCount: sampleCount,
    actualSampleCount: sampleCount
  };
}

export function createBlockedHillFluidPackageReport(
  request: KaminosFluidPackageRequest,
  adapterFrame: HillFluidPackageAdapterFrame,
  packageFailure: KaminosFluidPackageLoadFailure
): HillFluidPackageBlockedReport {
  assertHillFluidPackageAdapterFrame(adapterFrame);
  const rejections = [...new Set([packageFailure.reason, ...packageFailure.rejections])];
  return {
    schema: HILL_FLUID_PACKAGE_BLOCKED_REPORT_SCHEMA,
    ok: false,
    status: 'blocked_provider',
    frameId: `${adapterFrame.frameId}:blocked-provider`,
    generatedAtMs: adapterFrame.source.timestampMs,
    primaryOutputWritten: false,
    requestedPackage: request.requested,
    effectivePackage: packageFailure.effective,
    terrain: {
      frameId: adapterFrame.frameId,
      sourceFrameId: adapterFrame.terrain.sourceFrameId,
      currentEpoch: adapterFrame.terrain.currentEpoch,
      supportFrameChecksum: adapterFrame.terrain.supportFrameChecksum,
      sampleChecksum: adapterFrame.terrain.sampleChecksum
    },
    physicalScale: adapterFrame.physicalScale,
    requestedRuntimeRoute: request.requested.runtimeRoute,
    requestedRepresentationRoute: request.requested.representationRoute,
    requestedOutputRoute: request.requested.outputRoute,
    failurePhase: packageFailure.failurePhase,
    error: packageFailure.error,
    rejections
  };
}

function assertPhysicalScale(scale: HillFluidPhysicalScale): void {
  requirePositive(scale.metersPerWorldUnit, 'meters per world unit');
  requirePositive(scale.secondsPerSimulationSecond, 'seconds per simulation second');
  requirePositive(scale.gravityMetersPerSecondSquared, 'gravity');
}

function canonicalMotionClass(
  frame: HillFluidPackageAdapterFrame
): KaminosTerrainFluidFrame['motionClass'] {
  if ((frame.terrain.supportShockClassCounts.shock_reset ?? 0) > 0) {
    return 'shock_reset';
  }
  if ((frame.terrain.supportMotionClassCounts.phase_morph ?? 0) > 0) {
    return 'phase_morph';
  }
  return 'stable';
}

function requireNonempty(value: string, label: string): void {
  if (value.trim().length === 0) {
    throw new Error(`Hill package adapter requires ${label}`);
  }
}

function requireFinite(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new Error(`Hill package adapter requires finite ${label}`);
  }
}

function requirePositive(value: number, label: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`Hill package adapter requires positive ${label}`);
  }
}

function requirePositiveInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`Hill package adapter requires positive integer ${label}`);
  }
}

function requireNonnegativeInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`Hill package adapter requires nonnegative integer ${label}`);
  }
}
