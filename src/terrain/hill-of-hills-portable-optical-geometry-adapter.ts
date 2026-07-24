import type {
  KaminosFluidRepresentationFrame,
  KaminosTerrainRemapReceipt
} from '../fluid/hill-kaminos-runtime-exercise.js';
import {
  assertHillFluidPackageAdapterFrame,
  type HillFluidPackageAdapterFrame,
  type KaminosTerrainFluidFrame
} from './hill-of-hills-fluid-package-adapter.js';

export const HILL_PORTABLE_MACRO_OPTICAL_ADAPTER_SCHEMA =
  'lerms.hill-of-hills.portable-macro-optical-geometry-adapter.v0' as const;
export const HILL_PORTABLE_MACRO_OPTICAL_CONVERSION_ROUTE =
  'lerms/hill-of-hills/portable-macro-optical-geometry-adapter-v0' as const;
export const PORTABLE_MACRO_SUPPORT_GEOMETRY_CAPABILITY =
  'portable-macro-support-geometry' as const;
export const HILL_PORTABLE_READONLY_SOURCE_HANDLE_SCHEMA =
  'lerms.portable-readonly-numeric-source-handle.v0' as const;

type NumericSource = Float32Array | Float64Array | Uint8Array;

export interface HillPortableReadonlyNumericSourceHandle {
  schema: typeof HILL_PORTABLE_READONLY_SOURCE_HANDLE_SCHEMA;
  handleId: string;
  access: 'read_only';
  lifetime: 'frame_scoped';
  owner: 'lerms/hill-of-hills' | 'kaminos/fluid-webgpu';
  elementType: 'float32' | 'float64' | 'uint8';
  length: number;
  sampleCount: number;
  componentsPerSample: number;
  read(index: number): number;
}

export interface HillPortableMacroOpticalGeometryAdapterFrame {
  schema: typeof HILL_PORTABLE_MACRO_OPTICAL_ADAPTER_SCHEMA;
  frameId: string;
  descriptorIdentity: string;
  conversion: {
    route: {
      requested: typeof HILL_PORTABLE_MACRO_OPTICAL_CONVERSION_ROUTE;
      effective: typeof HILL_PORTABLE_MACRO_OPTICAL_CONVERSION_ROUTE;
    };
    fallback: null;
    primaryOutputWritten: true;
    partial: false;
  };
  providerBinding: {
    status: 'awaiting_canonical_kaminos_provider_schema';
    requestedCapability: typeof PORTABLE_MACRO_SUPPORT_GEOMETRY_CAPABILITY;
    effectiveCapability: null;
    canonicalProviderSchema: null;
    canonicalProviderRoute: null;
    canonicalSourceHandleIdentity: null;
    reason: 'producer_provider_contract_pending';
  };
  source: {
    authority: 'live_simulation';
    adapterFrameId: string;
    terrainFrameSchema: KaminosTerrainFluidFrame['schema'];
    representationFrameSchema: KaminosFluidRepresentationFrame['schema'];
    sourceFrameId: string;
    sourceRoute: string;
    sourceConfigId?: string;
    requestedSourceId: string;
    effectiveSourceId: string;
    hillProducerRevision: string;
    fluidProducerRevision: string;
  };
  terrain: {
    terrainId: string;
    transformId: string;
    supportClass: KaminosTerrainFluidFrame['supportClass'];
    sourceFrameId: string;
    sampleChecksum: string;
    topologyChecksum: string;
    supportFrameChecksum: string;
    proxyMaterialChecksum: string;
    dirtyRegionChecksum: string;
  };
  epochs: {
    priorTerrain: number;
    terrain: number;
    support: number;
    topology: number;
    fluid: number;
  };
  motion: {
    class: KaminosTerrainFluidFrame['motionClass'];
    shockId: string | null;
    motionSubstepEnvelope: number | null;
    remapReceiptId: string | null;
    remapPreviousTerrainEpoch: number | null;
    remapTerrainEpoch: number | null;
    remapFluidEpoch: number | null;
  };
  supportGeometry: {
    geometryClass: 'mapped-heightfield-grid';
    coordinateSpace: 'world_space_meters';
    sampleCount: number;
    complete: true;
    grid: KaminosTerrainFluidFrame['grid'];
    worldBounds: HillFluidPackageAdapterFrame['terrain']['worldBounds'];
    domainBounds: HillFluidPackageAdapterFrame['terrain']['domainBounds'];
    dirtyRegions: KaminosTerrainFluidFrame['dirtyRegions'];
    metricLayout: readonly [
      'bedHeight',
      'jacobian',
      'gradient',
      'tangentU',
      'tangentV',
      'normal',
      'supportVelocity',
      'valid'
    ];
  };
  macroState: {
    route: KaminosFluidRepresentationFrame['route'];
    method: string;
    sampleCount: number;
    complete: true;
    materialChannels: readonly string[];
  };
  ownership: {
    identity: KaminosFluidRepresentationFrame['ownershipIdentity'];
    authoritativeRepresentation: 'macro';
    opticalSamplesOwnMass: false;
  };
  physicalScale: HillFluidPackageAdapterFrame['physicalScale'];
  conservationReceiptIds: readonly string[];
  lineageIds: readonly string[];
  sourceHandles: {
    bedHeight: HillPortableReadonlyNumericSourceHandle;
    jacobian: HillPortableReadonlyNumericSourceHandle;
    gradient: HillPortableReadonlyNumericSourceHandle;
    tangentU: HillPortableReadonlyNumericSourceHandle;
    tangentV: HillPortableReadonlyNumericSourceHandle;
    normal: HillPortableReadonlyNumericSourceHandle;
    supportVelocity: HillPortableReadonlyNumericSourceHandle;
    valid: HillPortableReadonlyNumericSourceHandle;
    mappedDepth: HillPortableReadonlyNumericSourceHandle;
    mappedMomentumU: HillPortableReadonlyNumericSourceHandle;
    mappedMomentumV: HillPortableReadonlyNumericSourceHandle;
    materialMasses: Readonly<Record<string, HillPortableReadonlyNumericSourceHandle>>;
  };
}

export function createHillPortableMacroOpticalGeometryAdapterFrame(
  adapterFrame: HillFluidPackageAdapterFrame,
  terrainFrame: KaminosTerrainFluidFrame,
  representation: KaminosFluidRepresentationFrame,
  remapReceipt: KaminosTerrainRemapReceipt | null,
  options: {
    frameId: string;
    requestedCapability: string;
  }
): HillPortableMacroOpticalGeometryAdapterFrame {
  requireNonempty(options.frameId, 'frame id');
  if (options.requestedCapability !== PORTABLE_MACRO_SUPPORT_GEOMETRY_CAPABILITY) {
    throw new Error(
      `Hill portable optical adapter rejects unsupported capability ${JSON.stringify(options.requestedCapability)}`
    );
  }
  assertSourceInputs(adapterFrame, terrainFrame, representation, remapReceipt);

  const sampleCount = terrainFrame.expectedSampleCount;
  const supportIdentity = [
    terrainFrame.terrainId,
    terrainFrame.transformId,
    terrainFrame.currentEpoch,
    adapterFrame.terrain.supportFrameChecksum
  ].join(':');
  const macroIdentity = [
    representation.producerRevision,
    representation.route.effective,
    representation.terrainEpoch,
    representation.fluidEpoch
  ].join(':');
  const materialMasses = Object.freeze(Object.fromEntries(
    Object.entries(representation.macro.materialMasses).map(([name, values]) => [
      name,
      createReadonlyNumericSourceHandle(
        values,
        `${macroIdentity}:material:${name}`,
        'kaminos/fluid-webgpu',
        sampleCount,
        1
      )
    ])
  ));

  const frameWithoutIdentity = {
    schema: HILL_PORTABLE_MACRO_OPTICAL_ADAPTER_SCHEMA,
    frameId: options.frameId,
    conversion: {
      route: {
        requested: HILL_PORTABLE_MACRO_OPTICAL_CONVERSION_ROUTE,
        effective: HILL_PORTABLE_MACRO_OPTICAL_CONVERSION_ROUTE
      },
      fallback: null,
      primaryOutputWritten: true,
      partial: false
    },
    providerBinding: {
      status: 'awaiting_canonical_kaminos_provider_schema',
      requestedCapability: PORTABLE_MACRO_SUPPORT_GEOMETRY_CAPABILITY,
      effectiveCapability: null,
      canonicalProviderSchema: null,
      canonicalProviderRoute: null,
      canonicalSourceHandleIdentity: null,
      reason: 'producer_provider_contract_pending'
    },
    source: {
      authority: 'live_simulation',
      adapterFrameId: adapterFrame.frameId,
      terrainFrameSchema: terrainFrame.schema,
      representationFrameSchema: representation.schema,
      sourceFrameId: adapterFrame.terrain.sourceFrameId,
      sourceRoute: adapterFrame.terrain.sourceRoute,
      sourceConfigId: adapterFrame.terrain.sourceConfigId,
      requestedSourceId: terrainFrame.source.requested,
      effectiveSourceId: terrainFrame.source.effective,
      hillProducerRevision: terrainFrame.producer.revision,
      fluidProducerRevision: representation.producerRevision
    },
    terrain: {
      terrainId: terrainFrame.terrainId,
      transformId: terrainFrame.transformId,
      supportClass: terrainFrame.supportClass,
      sourceFrameId: adapterFrame.terrain.sourceFrameId,
      sampleChecksum: adapterFrame.terrain.sampleChecksum,
      topologyChecksum: adapterFrame.terrain.topologyChecksum,
      supportFrameChecksum: adapterFrame.terrain.supportFrameChecksum,
      proxyMaterialChecksum: adapterFrame.terrain.proxyMaterialChecksum,
      dirtyRegionChecksum: adapterFrame.terrain.dirtyRegionChecksum
    },
    epochs: {
      priorTerrain: terrainFrame.priorEpoch,
      terrain: terrainFrame.currentEpoch,
      support: adapterFrame.terrain.supportEpoch,
      topology: adapterFrame.terrain.topologyEpoch,
      fluid: representation.fluidEpoch
    },
    motion: {
      class: terrainFrame.motionClass,
      shockId: terrainFrame.shockId,
      motionSubstepEnvelope: terrainFrame.motionSubstepEnvelope,
      remapReceiptId: remapReceipt?.receiptId ?? null,
      remapPreviousTerrainEpoch: remapReceipt?.previousTerrainEpoch ?? null,
      remapTerrainEpoch: remapReceipt?.terrainEpoch ?? null,
      remapFluidEpoch: remapReceipt?.fluidEpoch ?? null
    },
    supportGeometry: {
      geometryClass: 'mapped-heightfield-grid',
      coordinateSpace: 'world_space_meters',
      sampleCount,
      complete: true,
      grid: cloneGrid(terrainFrame.grid),
      worldBounds: cloneRangeRecord(adapterFrame.terrain.worldBounds),
      domainBounds: cloneRangeRecord(adapterFrame.terrain.domainBounds),
      dirtyRegions: terrainFrame.dirtyRegions.map((region) => ({ ...region })),
      metricLayout: [
        'bedHeight',
        'jacobian',
        'gradient',
        'tangentU',
        'tangentV',
        'normal',
        'supportVelocity',
        'valid'
      ]
    },
    macroState: {
      route: { ...representation.route },
      method: representation.macro.method,
      sampleCount,
      complete: true,
      materialChannels: Object.keys(representation.macro.materialMasses).sort()
    },
    ownership: {
      identity: representation.ownershipIdentity,
      authoritativeRepresentation: 'macro',
      opticalSamplesOwnMass: false
    },
    physicalScale: { ...adapterFrame.physicalScale },
    conservationReceiptIds: [...representation.conservationReceiptIds],
    lineageIds: [...representation.lineageIds],
    sourceHandles: {
      bedHeight: createReadonlyNumericSourceHandle(
        terrainFrame.fields.bedHeight,
        `${supportIdentity}:bedHeight`,
        'lerms/hill-of-hills',
        sampleCount,
        1
      ),
      jacobian: createReadonlyNumericSourceHandle(
        terrainFrame.fields.jacobian,
        `${supportIdentity}:jacobian`,
        'lerms/hill-of-hills',
        sampleCount,
        1
      ),
      gradient: createReadonlyNumericSourceHandle(
        terrainFrame.fields.gradient,
        `${supportIdentity}:gradient`,
        'lerms/hill-of-hills',
        sampleCount,
        2
      ),
      tangentU: createReadonlyNumericSourceHandle(
        terrainFrame.fields.tangentU,
        `${supportIdentity}:tangentU`,
        'lerms/hill-of-hills',
        sampleCount,
        3
      ),
      tangentV: createReadonlyNumericSourceHandle(
        terrainFrame.fields.tangentV,
        `${supportIdentity}:tangentV`,
        'lerms/hill-of-hills',
        sampleCount,
        3
      ),
      normal: createReadonlyNumericSourceHandle(
        terrainFrame.fields.normal,
        `${supportIdentity}:normal`,
        'lerms/hill-of-hills',
        sampleCount,
        3
      ),
      supportVelocity: createReadonlyNumericSourceHandle(
        terrainFrame.fields.supportVelocity,
        `${supportIdentity}:supportVelocity`,
        'lerms/hill-of-hills',
        sampleCount,
        3
      ),
      valid: createReadonlyNumericSourceHandle(
        terrainFrame.fields.valid,
        `${supportIdentity}:valid`,
        'lerms/hill-of-hills',
        sampleCount,
        1
      ),
      mappedDepth: createReadonlyNumericSourceHandle(
        representation.macro.mappedDepth,
        `${macroIdentity}:mappedDepth`,
        'kaminos/fluid-webgpu',
        sampleCount,
        1
      ),
      mappedMomentumU: createReadonlyNumericSourceHandle(
        representation.macro.mappedMomentumU,
        `${macroIdentity}:mappedMomentumU`,
        'kaminos/fluid-webgpu',
        sampleCount,
        1
      ),
      mappedMomentumV: createReadonlyNumericSourceHandle(
        representation.macro.mappedMomentumV,
        `${macroIdentity}:mappedMomentumV`,
        'kaminos/fluid-webgpu',
        sampleCount,
        1
      ),
      materialMasses
    }
  } satisfies Omit<HillPortableMacroOpticalGeometryAdapterFrame, 'descriptorIdentity'>;
  const frame: HillPortableMacroOpticalGeometryAdapterFrame = {
    ...frameWithoutIdentity,
    descriptorIdentity: descriptorIdentity(frameWithoutIdentity)
  };

  deepFreezeDescriptor(frame);
  assertHillPortableMacroOpticalGeometryAdapterFrame(frame);
  return frame;
}

export function assertHillPortableMacroOpticalGeometryAdapterFrame(
  frame: HillPortableMacroOpticalGeometryAdapterFrame
): void {
  if (frame.schema !== HILL_PORTABLE_MACRO_OPTICAL_ADAPTER_SCHEMA) {
    throw new Error(`unexpected Hill portable optical adapter schema ${String(frame.schema)}`);
  }
  if (
    frame.conversion.route.requested !== HILL_PORTABLE_MACRO_OPTICAL_CONVERSION_ROUTE ||
    frame.conversion.route.effective !== HILL_PORTABLE_MACRO_OPTICAL_CONVERSION_ROUTE ||
    frame.conversion.fallback !== null
  ) {
    throw new Error('Hill portable optical adapter carries fallback or substituted conversion identity');
  }
  if (!frame.conversion.primaryOutputWritten || frame.conversion.partial) {
    throw new Error('Hill portable optical adapter output is blank or partial');
  }
  if (
    frame.providerBinding.status !== 'awaiting_canonical_kaminos_provider_schema' ||
    frame.providerBinding.requestedCapability !== PORTABLE_MACRO_SUPPORT_GEOMETRY_CAPABILITY ||
    frame.providerBinding.effectiveCapability !== null ||
    frame.providerBinding.canonicalProviderSchema !== null ||
    frame.providerBinding.canonicalProviderRoute !== null ||
    frame.providerBinding.canonicalSourceHandleIdentity !== null
  ) {
    throw new Error('Hill portable optical adapter invents or substitutes canonical provider authority');
  }
  if (containsCameraOwnedKey(frame)) {
    throw new Error('Hill portable optical adapter cannot carry camera-owned producer state');
  }
  requireNonnegativeInteger(frame.epochs.priorTerrain, 'prior terrain epoch');
  requireNonnegativeInteger(frame.epochs.terrain, 'terrain epoch');
  requireNonnegativeInteger(frame.epochs.fluid, 'fluid epoch');
  if (frame.epochs.priorTerrain > frame.epochs.terrain) {
    throw new Error('Hill portable optical adapter prior terrain epoch exceeds current terrain epoch');
  }
  if (
    frame.supportGeometry.geometryClass !== 'mapped-heightfield-grid' ||
    frame.supportGeometry.coordinateSpace !== 'world_space_meters' ||
    !frame.supportGeometry.complete ||
    frame.supportGeometry.sampleCount <= 0 ||
    frame.macroState.sampleCount !== frame.supportGeometry.sampleCount ||
    !frame.macroState.complete
  ) {
    throw new Error('Hill portable optical adapter support or macro geometry is incomplete');
  }
  for (const handle of sourceHandleList(frame)) {
    assertReadonlyNumericSourceHandle(handle, frame.supportGeometry.sampleCount);
  }
  const expectedDescriptorIdentity = descriptorIdentity(frame);
  if (frame.descriptorIdentity !== expectedDescriptorIdentity) {
    throw new Error(
      `Hill portable optical adapter descriptor identity mismatch: ${frame.descriptorIdentity} != ${expectedDescriptorIdentity}`
    );
  }
}

function assertSourceInputs(
  adapterFrame: HillFluidPackageAdapterFrame,
  terrainFrame: KaminosTerrainFluidFrame,
  representation: KaminosFluidRepresentationFrame,
  remapReceipt: KaminosTerrainRemapReceipt | null
): void {
  assertHillFluidPackageAdapterFrame(adapterFrame);
  if (!terrainFrame.complete || terrainFrame.actualSampleCount !== terrainFrame.expectedSampleCount) {
    throw new Error('Hill portable optical adapter requires complete terrain support geometry');
  }
  const count = terrainFrame.expectedSampleCount;
  const requiredLengths: readonly [NumericSource, number, string][] = [
    [terrainFrame.fields.bedHeight, count, 'bed height'],
    [terrainFrame.fields.jacobian, count, 'jacobian'],
    [terrainFrame.fields.gradient, count * 2, 'gradient'],
    [terrainFrame.fields.tangentU, count * 3, 'tangent U'],
    [terrainFrame.fields.tangentV, count * 3, 'tangent V'],
    [terrainFrame.fields.normal, count * 3, 'normal'],
    [terrainFrame.fields.supportVelocity, count * 3, 'support velocity'],
    [terrainFrame.fields.valid, count, 'validity']
  ];
  for (const [values, expectedLength, label] of requiredLengths) {
    if (values.length !== expectedLength) {
      throw new Error(`Hill portable optical adapter rejects partial ${label} source`);
    }
  }
  if (
    terrainFrame.terrainId.trim().length === 0 ||
    terrainFrame.transformId.trim().length === 0 ||
    terrainFrame.source.requested !== terrainFrame.source.effective
  ) {
    throw new Error('Hill portable optical adapter requires exact terrain/source identity');
  }
  rejectFallbackIdentity(terrainFrame.route.requested, 'terrain requested route');
  rejectFallbackIdentity(terrainFrame.route.effective, 'terrain effective route');
  rejectFallbackIdentity(representation.route.requested, 'representation requested route');
  rejectFallbackIdentity(representation.route.effective, 'representation effective route');
  if (terrainFrame.route.requested !== terrainFrame.route.effective) {
    throw new Error('Hill portable optical adapter rejects substituted terrain route');
  }
  if (representation.route.requested !== representation.route.effective) {
    throw new Error('Hill portable optical adapter rejects substituted representation route');
  }
  if (
    !representation.complete ||
    representation.expectedSampleCount !== count ||
    representation.macro.grid.width !== terrainFrame.grid.width ||
    representation.macro.grid.height !== terrainFrame.grid.height
  ) {
    throw new Error('Hill portable optical adapter requires complete macro representation geometry');
  }
  if (representation.terrainEpoch !== terrainFrame.currentEpoch) {
    throw new Error(
      `Hill portable optical adapter representation terrain epoch ${representation.terrainEpoch} does not match ${terrainFrame.currentEpoch}`
    );
  }
  const macroArrays: readonly [NumericSource, string][] = [
    [representation.macro.mappedDepth, 'mapped depth'],
    [representation.macro.mappedMomentumU, 'mapped momentum U'],
    [representation.macro.mappedMomentumV, 'mapped momentum V'],
    ...Object.entries(representation.macro.materialMasses).map(
      ([name, values]) => [values, `material ${name}`] as [NumericSource, string]
    )
  ];
  for (const [values, label] of macroArrays) {
    if (values.length !== count) {
      throw new Error(`Hill portable optical adapter rejects partial ${label} source`);
    }
  }
  const movingSuccessor = terrainFrame.currentEpoch > terrainFrame.priorEpoch;
  if (movingSuccessor && remapReceipt === null) {
    throw new Error('Hill portable optical adapter requires the committed remap receipt for a moving successor');
  }
  if (remapReceipt !== null) {
    if (
      remapReceipt.schema !== 'kaminos.fluid.terrain-remap-receipt.v1' ||
      remapReceipt.state !== 'committed' ||
      remapReceipt.terrainId !== terrainFrame.terrainId ||
      remapReceipt.sourceId !== terrainFrame.source.effective ||
      remapReceipt.transformId !== terrainFrame.transformId ||
      remapReceipt.previousTerrainEpoch !== terrainFrame.priorEpoch ||
      remapReceipt.terrainEpoch !== terrainFrame.currentEpoch ||
      remapReceipt.fluidEpoch > representation.fluidEpoch ||
      !representation.conservationReceiptIds.includes(remapReceipt.receiptId)
    ) {
      throw new Error('Hill portable optical adapter rejects substituted or stale remap receipt identity');
    }
  }
}

function createReadonlyNumericSourceHandle(
  source: NumericSource,
  handleId: string,
  owner: HillPortableReadonlyNumericSourceHandle['owner'],
  sampleCount: number,
  componentsPerSample: number
): HillPortableReadonlyNumericSourceHandle {
  if (source.length !== sampleCount * componentsPerSample) {
    throw new Error(`Hill portable optical adapter rejects partial source handle ${handleId}`);
  }
  const handle: HillPortableReadonlyNumericSourceHandle = {
    schema: HILL_PORTABLE_READONLY_SOURCE_HANDLE_SCHEMA,
    handleId,
    access: 'read_only',
    lifetime: 'frame_scoped',
    owner,
    elementType: elementType(source),
    length: source.length,
    sampleCount,
    componentsPerSample,
    read(index: number): number {
      if (!Number.isInteger(index) || index < 0 || index >= source.length) {
        throw new RangeError(`source handle ${handleId} index ${index} is out of range`);
      }
      return source[index];
    }
  };
  return Object.freeze(handle);
}

function assertReadonlyNumericSourceHandle(
  handle: HillPortableReadonlyNumericSourceHandle,
  expectedSampleCount: number
): void {
  if (
    handle.schema !== HILL_PORTABLE_READONLY_SOURCE_HANDLE_SCHEMA ||
    handle.access !== 'read_only' ||
    handle.lifetime !== 'frame_scoped' ||
    handle.handleId.trim().length === 0 ||
    handle.sampleCount !== expectedSampleCount ||
    handle.length !== handle.sampleCount * handle.componentsPerSample ||
    handle.componentsPerSample <= 0
  ) {
    throw new Error('Hill portable optical adapter carries an invalid read-only source handle');
  }
  if (handle.length > 0) {
    const first = handle.read(0);
    const last = handle.read(handle.length - 1);
    if (!Number.isFinite(first) || !Number.isFinite(last)) {
      throw new Error(`Hill portable optical adapter source handle ${handle.handleId} is non-finite`);
    }
  }
}

function sourceHandleList(
  frame: HillPortableMacroOpticalGeometryAdapterFrame
): readonly HillPortableReadonlyNumericSourceHandle[] {
  return [
    frame.sourceHandles.bedHeight,
    frame.sourceHandles.jacobian,
    frame.sourceHandles.gradient,
    frame.sourceHandles.tangentU,
    frame.sourceHandles.tangentV,
    frame.sourceHandles.normal,
    frame.sourceHandles.supportVelocity,
    frame.sourceHandles.valid,
    frame.sourceHandles.mappedDepth,
    frame.sourceHandles.mappedMomentumU,
    frame.sourceHandles.mappedMomentumV,
    ...Object.values(frame.sourceHandles.materialMasses)
  ];
}

function descriptorIdentity(
  frame: Omit<HillPortableMacroOpticalGeometryAdapterFrame, 'descriptorIdentity'> |
    HillPortableMacroOpticalGeometryAdapterFrame
): string {
  const payload = JSON.stringify({
    schema: frame.schema,
    frameId: frame.frameId,
    conversion: frame.conversion,
    providerBinding: frame.providerBinding,
    source: frame.source,
    terrain: frame.terrain,
    epochs: frame.epochs,
    motion: frame.motion,
    supportGeometry: frame.supportGeometry,
    macroState: frame.macroState,
    ownership: frame.ownership,
    physicalScale: frame.physicalScale,
    conservationReceiptIds: frame.conservationReceiptIds,
    lineageIds: frame.lineageIds,
    sourceHandles: sourceHandleList(frame as HillPortableMacroOpticalGeometryAdapterFrame).map((handle) => ({
      schema: handle.schema,
      handleId: handle.handleId,
      access: handle.access,
      lifetime: handle.lifetime,
      owner: handle.owner,
      elementType: handle.elementType,
      length: handle.length,
      sampleCount: handle.sampleCount,
      componentsPerSample: handle.componentsPerSample
    }))
  });
  return `hill-portable-optical:${fnv1a(payload)}`;
}

function containsCameraOwnedKey(value: unknown, seen = new Set<object>()): boolean {
  if (value === null || typeof value !== 'object') {
    return false;
  }
  if (seen.has(value)) {
    return false;
  }
  seen.add(value);
  for (const [key, child] of Object.entries(value)) {
    if (/(^|_)(camera|projection|viewport|screen.?space)($|_)/i.test(key)) {
      return true;
    }
    if (containsCameraOwnedKey(child, seen)) {
      return true;
    }
  }
  return false;
}

function deepFreezeDescriptor(value: unknown, seen = new Set<object>()): void {
  if (value === null || typeof value !== 'object' || seen.has(value)) {
    return;
  }
  seen.add(value);
  for (const child of Object.values(value)) {
    deepFreezeDescriptor(child, seen);
  }
  Object.freeze(value);
}

function cloneGrid(grid: KaminosTerrainFluidFrame['grid']): KaminosTerrainFluidFrame['grid'] {
  return {
    width: grid.width,
    height: grid.height,
    spacing: [...grid.spacing],
    origin: [...grid.origin]
  };
}

function cloneRangeRecord<T extends Record<string, { min: number; max: number }>>(bounds: T): T {
  return Object.fromEntries(
    Object.entries(bounds).map(([key, range]) => [key, { ...range }])
  ) as T;
}

function rejectFallbackIdentity(value: string, label: string): void {
  requireNonempty(value, label);
  if (/(^|[/:_-])(fallback|default)([/:_-]|$)/i.test(value)) {
    throw new Error(`Hill portable optical adapter rejects fallback ${label} ${JSON.stringify(value)}`);
  }
}

function elementType(source: NumericSource): HillPortableReadonlyNumericSourceHandle['elementType'] {
  if (source instanceof Float32Array) {
    return 'float32';
  }
  if (source instanceof Float64Array) {
    return 'float64';
  }
  return 'uint8';
}

function fnv1a(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function requireNonempty(value: string, label: string): void {
  if (value.trim().length === 0) {
    throw new Error(`Hill portable optical adapter requires ${label}`);
  }
}

function requireNonnegativeInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`Hill portable optical adapter requires non-negative integer ${label}`);
  }
}
