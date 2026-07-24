import {
  KAMINOS_FINGER_FLUID_PORTABLE_MACRO_PROVIDER_ROUTE,
  KAMINOS_FINGER_FLUID_PORTABLE_MACRO_PROVIDER_SCHEMA,
  createFingerFluidPortableMacroGeometryProvider
} from 'kaminos/finger-fluid-webgpu-core.js';
import {
  KAMINOS_FLUID_WEBGPU_PIN,
  type KaminosFluidPackageLoadSuccess
} from './kaminos-fluid-package-consumer.js';
import type {
  KaminosFluidRepresentationFrame,
  KaminosMappedMacroRuntime,
  KaminosPortableMacroSourceHandle,
  KaminosTerrainRemapReceipt
} from './hill-kaminos-runtime-exercise.js';
import {
  HILL_PORTABLE_MACRO_OPTICAL_CONVERSION_ROUTE,
  PORTABLE_MACRO_SUPPORT_GEOMETRY_CAPABILITY,
  createHillPortableMacroOpticalGeometryAdapterFrame
} from '../terrain/hill-of-hills-portable-optical-geometry-adapter.js';
import type {
  HillFluidPackageAdapterFrame,
  KaminosTerrainFluidFrame
} from '../terrain/hill-of-hills-fluid-package-adapter.js';

export const HILL_PORTABLE_MACRO_OPTICAL_PROVIDER_MOUNT_SCHEMA =
  'lerms.hill-of-hills.portable-macro-optical-provider-mount.v1' as const;
export const HILL_PORTABLE_MACRO_OPTICAL_PROVIDER_FAILURE_SCHEMA =
  'lerms.hill-of-hills.portable-macro-optical-provider-failure.v1' as const;
export const HILL_PORTABLE_MACRO_HOST_ROUTE =
  'lerms/hill-of-hills/portable-macro-optical-host-v1' as const;
export const HILL_PORTABLE_MACRO_DEBUG_OPTICAL_ROUTE =
  'lerms/hill-of-hills/cyan-macro-debug-composition-v1' as const;
export const KAMINOS_PORTABLE_MACRO_SOURCE_ROUTE =
  'kaminos/fluid/portable-macro-source' as const;
export const KAMINOS_PORTABLE_MACRO_SOURCE_CAPABILITY =
  'kaminos.fluid.portable-macro-source.v1' as const;

export const KAMINOS_PORTABLE_MACRO_PROVIDER_PIN = Object.freeze({
  packageName: 'kaminos',
  dependencySpecifier: 'https://github.com/lyonsno/kaminos/archive/d26f12c6750e174fc4a618f1182010ec1300f8f5.tar.gz',
  resolved: 'https://github.com/lyonsno/kaminos/archive/d26f12c6750e174fc4a618f1182010ec1300f8f5.tar.gz',
  moduleSpecifier: 'kaminos/finger-fluid-webgpu-core.js',
  revision: 'd26f12c6750e174fc4a618f1182010ec1300f8f5',
  exportName: 'createFingerFluidPortableMacroGeometryProvider',
  schema: 'kaminos.finger-fluid.portable-macro-geometry-provider.v1',
  route: 'kaminos/finger-fluid/portable-macro-geometry-provider'
} as const);

interface PortableProvider {
  schema: string;
  route: {
    requested: string;
    effective: string;
  };
  source: {
    schema: string;
    route: {
      requested: string;
      effective: string;
    };
    capability: string;
    handleId: string;
    sourceAuthority: string;
    fallbackStatus: string;
    releasePolicy: string;
    retainedTerrainEpoch: number;
    retainedFluidEpoch: number;
  };
  capability: string;
  hostIndependent: boolean;
  package: {
    name: string;
    version: string;
    artifactRevision: string;
    runtimeRevision: string;
    runtimeRoute: string;
    sourceAuthority: string;
    fallbackStatus: string;
  };
  producerRevision: string;
  fluidEpoch: number;
  terrainEpoch: number;
  ownershipIdentity: string;
  geometry: {
    identity: string;
    transformIdentity: string;
    terrainId: string;
    producerId: string;
    producerRevision: string;
    runtimeProducerRevision: string;
    sourceHandleId: string;
    sourceHandleLifetime: string;
    width: number;
    height: number;
    worldMetersPerUnit: number;
  };
  confidence: number;
  sampleCount: number;
  sampleSurface(index: number): {
    wet: boolean;
  };
  createUploadSnapshot(): {
    schema: string;
    sampleCount: number;
    terrainEpoch: number;
    fluidEpoch: number;
    supportPosition: Float64Array;
    tangentU: Float64Array;
    tangentV: Float64Array;
    normal: Float64Array;
    jacobian: Float64Array;
    mappedDepth: Float64Array;
  };
}

export interface KaminosPortableMacroProviderInstallEvidence {
  packageName: typeof KAMINOS_PORTABLE_MACRO_PROVIDER_PIN.packageName;
  dependencySpecifier: typeof KAMINOS_PORTABLE_MACRO_PROVIDER_PIN.dependencySpecifier;
  resolvedRevision: typeof KAMINOS_PORTABLE_MACRO_PROVIDER_PIN.revision;
  moduleSpecifier: typeof KAMINOS_PORTABLE_MACRO_PROVIDER_PIN.moduleSpecifier;
  exportName: typeof KAMINOS_PORTABLE_MACRO_PROVIDER_PIN.exportName;
}

export interface HillPortableMacroOpticalProviderMount {
  provider: PortableProvider;
  witness: HillPortableMacroOpticalProviderMountWitness;
}

export interface HillPortableMacroOpticalProviderMountWitness {
  schema: typeof HILL_PORTABLE_MACRO_OPTICAL_PROVIDER_MOUNT_SCHEMA;
  status: 'active';
  sequenceStage: 'pre_remap' | 'post_remap';
  package: {
    requested: {
      name: string;
      version: string;
      artifactRevision: string;
      runtimeRevision: string;
      runtimeRoute: string;
      sourceRoute: string;
    };
    effective: {
      name: string;
      version: string;
      artifactRevision: string;
      runtimeRevision: string;
      runtimeRoute: string;
      sourceRoute: string;
      sourceAuthority: 'live_runtime';
      fallbackStatus: 'none';
    };
  };
  source: {
    schema: string;
    handleId: string;
    route: {
      requested: typeof KAMINOS_PORTABLE_MACRO_SOURCE_ROUTE;
      effective: typeof KAMINOS_PORTABLE_MACRO_SOURCE_ROUTE;
    };
    capability: typeof KAMINOS_PORTABLE_MACRO_SOURCE_CAPABILITY;
    authority: 'live_runtime';
    fallbackStatus: 'none';
    releasePolicy: 'explicit-release-v1';
    retainedTerrainEpoch: number;
    retainedFluidEpoch: number;
    readGeneration: number;
  };
  provider: {
    schema: typeof KAMINOS_PORTABLE_MACRO_PROVIDER_PIN.schema;
    revision: typeof KAMINOS_PORTABLE_MACRO_PROVIDER_PIN.revision;
    dependencySpecifier: typeof KAMINOS_PORTABLE_MACRO_PROVIDER_PIN.dependencySpecifier;
    resolved: typeof KAMINOS_PORTABLE_MACRO_PROVIDER_PIN.resolved;
    moduleSpecifier: typeof KAMINOS_PORTABLE_MACRO_PROVIDER_PIN.moduleSpecifier;
    exportName: typeof KAMINOS_PORTABLE_MACRO_PROVIDER_PIN.exportName;
    route: {
      requested: typeof KAMINOS_PORTABLE_MACRO_PROVIDER_PIN.route;
      effective: typeof KAMINOS_PORTABLE_MACRO_PROVIDER_PIN.route;
    };
    hostIndependent: true;
    sourceHandleId: string;
  };
  host: {
    route: {
      requested: typeof HILL_PORTABLE_MACRO_HOST_ROUTE;
      effective: typeof HILL_PORTABLE_MACRO_HOST_ROUTE;
    };
    fallback: null;
  };
  optical: {
    route: {
      requested: typeof HILL_PORTABLE_MACRO_DEBUG_OPTICAL_ROUTE;
      effective: typeof HILL_PORTABLE_MACRO_DEBUG_OPTICAL_ROUTE;
    };
    closure: 'debug_composition_only';
    beautyClaim: false;
    fallback: null;
  };
  conversion: {
    schema: string;
    route: {
      requested: typeof HILL_PORTABLE_MACRO_OPTICAL_CONVERSION_ROUTE;
      effective: typeof HILL_PORTABLE_MACRO_OPTICAL_CONVERSION_ROUTE;
    };
    descriptorIdentity: string;
  };
  terrain: {
    terrainId: string;
    transformId: string;
    sourceFrameId: string;
    requestedSourceId: string;
    effectiveSourceId: string;
    hillProducerRevision: string;
    sampleChecksum: string;
    topologyChecksum: string;
    supportFrameChecksum: string;
  };
  epochs: {
    priorTerrain: number;
    terrain: number;
    support: number;
    topology: number;
    fluid: number;
  };
  remap: {
    status: 'pending' | 'committed';
    receiptId: string | null;
    previousTerrainEpoch: number | null;
    terrainEpoch: number | null;
    fluidEpoch: number | null;
  };
  support: {
    geometryIdentity: string;
    mapping: 'explicit-world-position-buffer-v1';
    positionSource: 'terrain-fluid-frame.fields.worldPosition';
    coordinateSpace: 'world_meters';
    sampleCount: number;
    worldPositionCount: number;
    metricTangentCount: number;
  };
  output: {
    primaryOutputWritten: boolean;
    partial: boolean;
    blank: boolean;
    wetSampleCount: number;
    providerUploadSchema: string;
  };
  release: {
    owner: '@kaminos/fluid-webgpu';
    policy: 'explicit-release-v1';
    state: 'retained';
  };
}

export function createKaminosPortableMacroProviderInstallEvidence(
  packageJson: {
    dependencies?: Record<string, string>;
  },
  packageLock: {
    packages?: Record<string, unknown>;
  }
): KaminosPortableMacroProviderInstallEvidence {
  const dependency = packageJson.dependencies?.[KAMINOS_PORTABLE_MACRO_PROVIDER_PIN.packageName];
  const lockEntry = packageLock.packages?.[
    `node_modules/${KAMINOS_PORTABLE_MACRO_PROVIDER_PIN.packageName}`
  ];
  const resolved = isRecord(lockEntry) && typeof lockEntry.resolved === 'string'
    ? lockEntry.resolved
    : null;
  if (dependency !== KAMINOS_PORTABLE_MACRO_PROVIDER_PIN.dependencySpecifier) {
    throw new Error('portable provider package dependency does not match the requested revision');
  }
  if (
    typeof resolved !== 'string' ||
    resolved !== KAMINOS_PORTABLE_MACRO_PROVIDER_PIN.resolved
  ) {
    throw new Error('portable provider lockfile does not resolve the requested revision');
  }
  if (
    KAMINOS_FINGER_FLUID_PORTABLE_MACRO_PROVIDER_SCHEMA !==
      KAMINOS_PORTABLE_MACRO_PROVIDER_PIN.schema ||
    KAMINOS_FINGER_FLUID_PORTABLE_MACRO_PROVIDER_ROUTE !==
      KAMINOS_PORTABLE_MACRO_PROVIDER_PIN.route
  ) {
    throw new Error('portable provider module substituted schema or route identity');
  }
  return Object.freeze({
    packageName: KAMINOS_PORTABLE_MACRO_PROVIDER_PIN.packageName,
    dependencySpecifier: KAMINOS_PORTABLE_MACRO_PROVIDER_PIN.dependencySpecifier,
    resolvedRevision: KAMINOS_PORTABLE_MACRO_PROVIDER_PIN.revision,
    moduleSpecifier: KAMINOS_PORTABLE_MACRO_PROVIDER_PIN.moduleSpecifier,
    exportName: KAMINOS_PORTABLE_MACRO_PROVIDER_PIN.exportName
  });
}

export function retainHillPortableMacroSource(
  runtime: KaminosMappedMacroRuntime,
  terrainFrame: KaminosTerrainFluidFrame,
  options: {
    sourceHandleId: string;
  }
): KaminosPortableMacroSourceHandle {
  if (terrainFrame.fields.worldPosition.length !== terrainFrame.expectedSampleCount * 3) {
    throw new Error('Hill portable source requires complete explicit world positions');
  }
  return runtime.retainPortableMacroSource({
    sourceHandleId: options.sourceHandleId,
    requestedRoute: KAMINOS_PORTABLE_MACRO_SOURCE_ROUTE,
    effectiveRoute: KAMINOS_PORTABLE_MACRO_SOURCE_ROUTE,
    requestedCapability: KAMINOS_PORTABLE_MACRO_SOURCE_CAPABILITY,
    effectiveCapability: KAMINOS_PORTABLE_MACRO_SOURCE_CAPABILITY
  });
}

export function createHillPortableMacroOpticalProviderMount(
  loaded: KaminosFluidPackageLoadSuccess,
  sourceHandle: KaminosPortableMacroSourceHandle,
  adapterFrame: HillFluidPackageAdapterFrame,
  terrainFrame: KaminosTerrainFluidFrame,
  representation: KaminosFluidRepresentationFrame,
  remapReceipt: KaminosTerrainRemapReceipt | null,
  installEvidence: KaminosPortableMacroProviderInstallEvidence
): HillPortableMacroOpticalProviderMount {
  if (installEvidence.resolvedRevision !== KAMINOS_PORTABLE_MACRO_PROVIDER_PIN.revision) {
    throw new Error('portable provider install evidence is stale or substituted');
  }
  const conversion = createHillPortableMacroOpticalGeometryAdapterFrame(
    adapterFrame,
    terrainFrame,
    representation,
    remapReceipt,
    {
      frameId: [
        'hill-portable-provider-conversion',
        adapterFrame.terrain.sampleChecksum,
        representation.terrainEpoch,
        representation.fluidEpoch
      ].join(':'),
      requestedCapability: PORTABLE_MACRO_SUPPORT_GEOMETRY_CAPABILITY
    }
  );
  const expectedIdentity = {
    artifactRevision: loaded.effective.artifactRevision,
    producerRevision: loaded.effective.runtimeRevision,
    fluidEpoch: representation.fluidEpoch,
    terrainEpoch: terrainFrame.currentEpoch,
    source: {
      requested: terrainFrame.source.requested,
      effective: terrainFrame.source.effective,
      producerId: terrainFrame.producer.id,
      producerRevision: terrainFrame.producer.revision
    },
    packageDescriptor: loaded.effective
  };
  const provider = createFingerFluidPortableMacroGeometryProvider({
    sourceHandle,
    expectedIdentity
  }) as PortableProvider;
  const upload = provider.createUploadSnapshot();
  let wetSampleCount = 0;
  for (let index = 0; index < provider.sampleCount; index += 1) {
    if (provider.sampleSurface(index).wet) {
      wetSampleCount += 1;
    }
  }
  const witness: HillPortableMacroOpticalProviderMountWitness = {
    schema: HILL_PORTABLE_MACRO_OPTICAL_PROVIDER_MOUNT_SCHEMA,
    status: 'active',
    sequenceStage: remapReceipt ? 'post_remap' : 'pre_remap',
    package: {
      requested: {
        name: KAMINOS_FLUID_WEBGPU_PIN.packageName,
        version: KAMINOS_FLUID_WEBGPU_PIN.packageVersion,
        artifactRevision: KAMINOS_FLUID_WEBGPU_PIN.artifactRevision,
        runtimeRevision: KAMINOS_FLUID_WEBGPU_PIN.runtimeRevision,
        runtimeRoute: KAMINOS_FLUID_WEBGPU_PIN.runtimeRoute,
        sourceRoute: KAMINOS_FLUID_WEBGPU_PIN.sourceRoute
      },
      effective: {
        name: loaded.effective.packageName,
        version: loaded.effective.packageVersion,
        artifactRevision: loaded.effective.artifactRevision,
        runtimeRevision: loaded.effective.runtimeRevision,
        runtimeRoute: loaded.effective.runtimeRoute,
        sourceRoute: loaded.effective.sourceRoutes[0],
        sourceAuthority: 'live_runtime',
        fallbackStatus: 'none'
      }
    },
    source: {
      schema: provider.source.schema,
      handleId: provider.source.handleId,
      route: {
        requested: KAMINOS_PORTABLE_MACRO_SOURCE_ROUTE,
        effective: KAMINOS_PORTABLE_MACRO_SOURCE_ROUTE
      },
      capability: KAMINOS_PORTABLE_MACRO_SOURCE_CAPABILITY,
      authority: 'live_runtime',
      fallbackStatus: 'none',
      releasePolicy: 'explicit-release-v1',
      retainedTerrainEpoch: provider.source.retainedTerrainEpoch,
      retainedFluidEpoch: provider.source.retainedFluidEpoch,
      readGeneration: sourceHandle.status.readGeneration
    },
    provider: {
      schema: KAMINOS_PORTABLE_MACRO_PROVIDER_PIN.schema,
      revision: KAMINOS_PORTABLE_MACRO_PROVIDER_PIN.revision,
      dependencySpecifier: KAMINOS_PORTABLE_MACRO_PROVIDER_PIN.dependencySpecifier,
      resolved: KAMINOS_PORTABLE_MACRO_PROVIDER_PIN.resolved,
      moduleSpecifier: KAMINOS_PORTABLE_MACRO_PROVIDER_PIN.moduleSpecifier,
      exportName: KAMINOS_PORTABLE_MACRO_PROVIDER_PIN.exportName,
      route: {
        requested: KAMINOS_PORTABLE_MACRO_PROVIDER_PIN.route,
        effective: KAMINOS_PORTABLE_MACRO_PROVIDER_PIN.route
      },
      hostIndependent: true,
      sourceHandleId: provider.geometry.sourceHandleId
    },
    host: {
      route: {
        requested: HILL_PORTABLE_MACRO_HOST_ROUTE,
        effective: HILL_PORTABLE_MACRO_HOST_ROUTE
      },
      fallback: null
    },
    optical: {
      route: {
        requested: HILL_PORTABLE_MACRO_DEBUG_OPTICAL_ROUTE,
        effective: HILL_PORTABLE_MACRO_DEBUG_OPTICAL_ROUTE
      },
      closure: 'debug_composition_only',
      beautyClaim: false,
      fallback: null
    },
    conversion: {
      schema: conversion.schema,
      route: {
        requested: HILL_PORTABLE_MACRO_OPTICAL_CONVERSION_ROUTE,
        effective: HILL_PORTABLE_MACRO_OPTICAL_CONVERSION_ROUTE
      },
      descriptorIdentity: conversion.descriptorIdentity
    },
    terrain: {
      terrainId: terrainFrame.terrainId,
      transformId: terrainFrame.transformId,
      sourceFrameId: adapterFrame.terrain.sourceFrameId,
      requestedSourceId: terrainFrame.source.requested,
      effectiveSourceId: terrainFrame.source.effective,
      hillProducerRevision: terrainFrame.producer.revision,
      sampleChecksum: adapterFrame.terrain.sampleChecksum,
      topologyChecksum: adapterFrame.terrain.topologyChecksum,
      supportFrameChecksum: adapterFrame.terrain.supportFrameChecksum
    },
    epochs: {
      priorTerrain: terrainFrame.priorEpoch,
      terrain: terrainFrame.currentEpoch,
      support: adapterFrame.terrain.supportEpoch,
      topology: adapterFrame.terrain.topologyEpoch,
      fluid: representation.fluidEpoch
    },
    remap: {
      status: remapReceipt ? 'committed' : 'pending',
      receiptId: remapReceipt?.receiptId ?? null,
      previousTerrainEpoch: remapReceipt?.previousTerrainEpoch ?? null,
      terrainEpoch: remapReceipt?.terrainEpoch ?? null,
      fluidEpoch: remapReceipt?.fluidEpoch ?? null
    },
    support: {
      geometryIdentity: provider.geometry.identity,
      mapping: 'explicit-world-position-buffer-v1',
      positionSource: 'terrain-fluid-frame.fields.worldPosition',
      coordinateSpace: 'world_meters',
      sampleCount: provider.sampleCount,
      worldPositionCount: upload.supportPosition.length,
      metricTangentCount: upload.tangentU.length + upload.tangentV.length
    },
    output: {
      primaryOutputWritten: true,
      partial: upload.sampleCount !== terrainFrame.expectedSampleCount,
      blank: wetSampleCount === 0,
      wetSampleCount,
      providerUploadSchema: upload.schema
    },
    release: {
      owner: '@kaminos/fluid-webgpu',
      policy: 'explicit-release-v1',
      state: 'retained'
    }
  };
  assertHillPortableMacroOpticalProviderMountWitness(witness);
  return {
    provider,
    witness: deepFreeze(witness)
  };
}

export function assertHillPortableMacroOpticalProviderMountWitness(
  witness: HillPortableMacroOpticalProviderMountWitness
): void {
  if (
    witness.schema !== HILL_PORTABLE_MACRO_OPTICAL_PROVIDER_MOUNT_SCHEMA ||
    witness.status !== 'active'
  ) {
    throw mountFailure('portable provider mount schema or status is invalid');
  }
  if (
    witness.package.requested.name !== KAMINOS_FLUID_WEBGPU_PIN.packageName ||
    witness.package.requested.version !== KAMINOS_FLUID_WEBGPU_PIN.packageVersion ||
    witness.package.requested.artifactRevision !== KAMINOS_FLUID_WEBGPU_PIN.artifactRevision ||
    witness.package.requested.runtimeRevision !== KAMINOS_FLUID_WEBGPU_PIN.runtimeRevision ||
    witness.package.requested.runtimeRoute !== KAMINOS_FLUID_WEBGPU_PIN.runtimeRoute ||
    witness.package.requested.sourceRoute !== KAMINOS_FLUID_WEBGPU_PIN.sourceRoute ||
    witness.package.effective.name !== witness.package.requested.name ||
    witness.package.effective.version !== witness.package.requested.version ||
    witness.package.effective.artifactRevision !== witness.package.requested.artifactRevision ||
    witness.package.effective.runtimeRevision !== witness.package.requested.runtimeRevision ||
    witness.package.effective.runtimeRoute !== witness.package.requested.runtimeRoute ||
    witness.package.effective.sourceRoute !== witness.package.requested.sourceRoute ||
    witness.package.effective.sourceAuthority !== 'live_runtime' ||
    witness.package.effective.fallbackStatus !== 'none'
  ) {
    throw mountFailure('portable provider package requested/effective identity disagrees');
  }
  assertExactRoute(witness.source.route, KAMINOS_PORTABLE_MACRO_SOURCE_ROUTE, 'source route');
  if (
    witness.source.capability !== KAMINOS_PORTABLE_MACRO_SOURCE_CAPABILITY ||
    witness.source.authority !== 'live_runtime' ||
    witness.source.fallbackStatus !== 'none' ||
    witness.source.releasePolicy !== 'explicit-release-v1'
  ) {
    throw mountFailure('portable provider source capability, authority, fallback, or release identity disagrees');
  }
  assertExactRoute(witness.provider.route, KAMINOS_PORTABLE_MACRO_PROVIDER_PIN.route, 'provider route');
  if (
    witness.provider.schema !== KAMINOS_PORTABLE_MACRO_PROVIDER_PIN.schema ||
    witness.provider.revision !== KAMINOS_PORTABLE_MACRO_PROVIDER_PIN.revision ||
    witness.provider.dependencySpecifier !== KAMINOS_PORTABLE_MACRO_PROVIDER_PIN.dependencySpecifier ||
    witness.provider.resolved !== KAMINOS_PORTABLE_MACRO_PROVIDER_PIN.resolved ||
    witness.provider.moduleSpecifier !== KAMINOS_PORTABLE_MACRO_PROVIDER_PIN.moduleSpecifier ||
    witness.provider.exportName !== KAMINOS_PORTABLE_MACRO_PROVIDER_PIN.exportName ||
    !witness.provider.hostIndependent ||
    witness.provider.sourceHandleId !== witness.source.handleId
  ) {
    throw mountFailure('portable provider identity or source handle disagrees');
  }
  assertExactRoute(witness.host.route, HILL_PORTABLE_MACRO_HOST_ROUTE, 'host route');
  assertExactRoute(witness.optical.route, HILL_PORTABLE_MACRO_DEBUG_OPTICAL_ROUTE, 'optical route');
  if (
    witness.host.fallback !== null ||
    witness.optical.fallback !== null ||
    witness.optical.closure !== 'debug_composition_only' ||
    witness.optical.beautyClaim
  ) {
    throw mountFailure('portable provider host or optical closure is unsupported');
  }
  if (
    witness.terrain.requestedSourceId !== witness.terrain.effectiveSourceId ||
    witness.epochs.terrain < 0 ||
    witness.epochs.fluid < witness.source.retainedFluidEpoch ||
    witness.epochs.terrain < witness.source.retainedTerrainEpoch
  ) {
    throw mountFailure('portable provider terrain epoch or source identity is stale');
  }
  if (witness.sequenceStage === 'post_remap') {
    if (
      witness.remap.status !== 'committed' ||
      witness.remap.receiptId === null ||
      witness.remap.previousTerrainEpoch !== witness.epochs.priorTerrain ||
      witness.remap.terrainEpoch !== witness.epochs.terrain ||
      witness.remap.fluidEpoch === null ||
      witness.remap.fluidEpoch > witness.epochs.fluid
    ) {
      throw mountFailure('portable provider remap terrain epoch identity is missing or stale');
    }
  } else if (witness.remap.status !== 'pending' || witness.remap.receiptId !== null) {
    throw mountFailure('portable provider pre-remap identity is invalid');
  }
  if (
    witness.support.mapping !== 'explicit-world-position-buffer-v1' ||
    witness.support.positionSource !== 'terrain-fluid-frame.fields.worldPosition' ||
    witness.support.coordinateSpace !== 'world_meters' ||
    witness.support.worldPositionCount !== witness.support.sampleCount * 3 ||
    witness.support.metricTangentCount !== witness.support.sampleCount * 6
  ) {
    throw mountFailure('portable provider support geometry is partial or unsupported');
  }
  if (!witness.output.primaryOutputWritten) {
    throw mountFailure('portable provider primary output was not written');
  }
  if (witness.output.partial) {
    throw mountFailure('portable provider output is partial');
  }
  if (witness.output.blank || witness.output.wetSampleCount <= 0) {
    throw mountFailure('portable provider output is blank');
  }
  if (
    witness.release.owner !== '@kaminos/fluid-webgpu' ||
    witness.release.policy !== 'explicit-release-v1' ||
    witness.release.state !== 'retained'
  ) {
    throw mountFailure('portable provider release authority was substituted');
  }
}

function assertExactRoute(
  route: {
    requested: string;
    effective: string;
  },
  expected: string,
  label: string
): void {
  if (
    route.requested !== expected ||
    route.effective !== expected ||
    route.requested !== route.effective
  ) {
    throw mountFailure(`${label} requested/effective identity disagrees`);
  }
}

function mountFailure(message: string): Error {
  const failure = new Error(message);
  Object.defineProperty(failure, 'report', {
    configurable: false,
    enumerable: true,
    writable: false,
    value: Object.freeze({
      schema: HILL_PORTABLE_MACRO_OPTICAL_PROVIDER_FAILURE_SCHEMA,
      status: 'failed',
      phase: 'validate-mounted-output',
      lastTrustworthyEvidence: 'canonical-provider-output-observed',
      primaryOutputWritten: false,
      partial: true,
      blank: true,
      message
    })
  });
  return failure;
}

function deepFreeze<T>(value: T): T {
  if (
    value === null ||
    typeof value !== 'object' ||
    ArrayBuffer.isView(value) ||
    Object.isFrozen(value)
  ) {
    return value;
  }
  for (const child of Object.values(value)) {
    deepFreeze(child);
  }
  return Object.freeze(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
