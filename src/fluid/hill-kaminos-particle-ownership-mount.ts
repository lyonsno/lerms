export const HILL_KAMINOS_PARTICLE_OWNERSHIP_MOUNT_SCHEMA =
  'lerms.hill-of-hills.kaminos-particle-ownership-mount.v0' as const;

export const HILL_KAMINOS_PARTICLE_OWNERSHIP_ROUTE =
  'lerms/hill-of-hills/same-device-particle-ownership-v0' as const;

export const HILL_KAMINOS_PARTICLE_SUPPORT_ROUTE =
  'lerms/hill-of-hills/gpu-moving-support-contact-v0' as const;

export const KAMINOS_HYDRO_COMPOSED_REVISION =
  '355572977cdfdb7c27958994ede61ec967ac4623' as const;

export const KAMINOS_PARTICLE_OWNERSHIP_CONTRACT =
  'gpu-spatial-first-support-contact-ownership-v0' as const;

export const KAMINOS_PARTICLE_OWNERSHIP_PACKING =
  'material-tracer-vec4-index-4-phase-source-generation-transition-frame-support-contact-v0' as const;

export const KAMINOS_PARTICLE_VISIBILITY_RULE =
  'pre_impact_hidden_post_impact_visible_v0' as const;

export const KAMINOS_PARTICLE_RUNTIME_ROUTE =
  'kaminos/finger-fluid/webgpu-core-v0' as const;

export const KAMINOS_PARTICLE_VISIBILITY_AUTHORITY =
  'gpu_descriptor_texture_without_host_readback' as const;

export type HillFluidComparisonMode =
  | 'particle_only'
  | 'hybrid_analytic_carrier';

export interface HillKaminosParticleOwnershipMountRequest {
  requestId: string;
  requestedRoute: typeof HILL_KAMINOS_PARTICLE_OWNERSHIP_ROUTE;
  requestedKaminosRevision: typeof KAMINOS_HYDRO_COMPOSED_REVISION;
  requestedMode: HillFluidComparisonMode;
  minimumWriteTick: number;
  hostReadbackVisibility: false;
}

export interface HillKaminosParticleOwnershipDescriptor {
  contract: string;
  packing: string;
  source: {
    repository: string;
    composedRevision: string;
    runtimeRoute: string;
  };
  device: object;
  queue: object;
  buffer: object;
  recordFloats: number;
  recordBytes: number;
  ownershipOffsetFloats: number;
  ownershipOffsetBytes: number;
  ownershipFloats: number;
  capacity: number;
  writeTick: number;
  ownershipAuthority: string;
  consumerVisibilityRule: string;
  visibilityAuthority: string;
  hostReadbackVisibility: boolean;
  supportContact: {
    route: string;
    owner: string;
    sourceId: string;
    terrainId: string;
    terrainEpoch: number;
    supportEpoch: number;
    remapEpoch: number;
    stale: boolean;
    fallbackRoute: string | null;
    execution: string;
  };
}

export interface HillKaminosMovingSupportProvider {
  device: object;
  queue: object;
  route: string;
  owner: string;
  sourceId: string;
  terrainId: string;
  terrainEpoch: number;
  supportEpoch: number;
  remapEpoch: number;
  stale: boolean;
  fallbackRoute: string | null;
  execution: string;
  visibilityAuthority: string;
  hostReadbackVisibility: boolean;
}

export interface HillKaminosParticleOwnershipMount {
  schema: typeof HILL_KAMINOS_PARTICLE_OWNERSHIP_MOUNT_SCHEMA;
  status: 'mounted';
  requestId: string;
  route: {
    requested: typeof HILL_KAMINOS_PARTICLE_OWNERSHIP_ROUTE;
    effective: typeof HILL_KAMINOS_PARTICLE_OWNERSHIP_ROUTE;
    fallback: null;
  };
  kaminosRevision: {
    requested: typeof KAMINOS_HYDRO_COMPOSED_REVISION;
    effective: typeof KAMINOS_HYDRO_COMPOSED_REVISION;
  };
  mode: {
    requested: HillFluidComparisonMode;
    effective: HillFluidComparisonMode;
    defaultSubstitution: false;
  };
  ownership: {
    contract: typeof KAMINOS_PARTICLE_OWNERSHIP_CONTRACT;
    packing: typeof KAMINOS_PARTICLE_OWNERSHIP_PACKING;
    visibilityRule: typeof KAMINOS_PARTICLE_VISIBILITY_RULE;
    authority: 'solver_spatial_first_support_contact_v0';
    deviceIdentity: 'same_solver_and_renderer_device';
    bufferIdentity: 'exact_solver_material_tracer_buffer';
    visibilityAuthority: typeof KAMINOS_PARTICLE_VISIBILITY_AUTHORITY;
    hostReadbackVisibility: false;
    capacity: number;
    writeTick: number;
  };
  supportContact: {
    route: typeof HILL_KAMINOS_PARTICLE_SUPPORT_ROUTE;
    owner: 'lerms_hill_of_hills';
    sourceId: string;
    terrainId: string;
    terrainEpoch: number;
    supportEpoch: number;
    remapEpoch: number;
    stale: false;
    fallbackRoute: null;
    execution: 'gpu_same_device_moving_hill_signed_distance_v0';
  };
}

export function createHillKaminosParticleOwnershipMount(
  request: HillKaminosParticleOwnershipMountRequest,
  descriptor: HillKaminosParticleOwnershipDescriptor,
  expected: {
    device: object;
    queue: object;
    particleBuffer: object;
    support: {
      sourceId: string;
      provider: HillKaminosMovingSupportProvider;
      terrainId: string;
      terrainEpoch: number;
      supportEpoch: number;
      remapEpoch: number;
    };
  },
): HillKaminosParticleOwnershipMount {
  requiredString(request?.requestId, 'request id');
  if (request?.requestedRoute !== HILL_KAMINOS_PARTICLE_OWNERSHIP_ROUTE) {
    fail('requested route is unsupported or defaulted');
  }
  if (request?.requestedKaminosRevision !== KAMINOS_HYDRO_COMPOSED_REVISION) {
    fail('requested Kaminos revision is stale, substituted, or unsupported');
  }
  if (
    request?.requestedMode !== 'particle_only'
    && request?.requestedMode !== 'hybrid_analytic_carrier'
  ) {
    fail('requested comparison mode is unsupported or defaulted');
  }
  const minimumWriteTick = nonnegativeInteger(
    request.minimumWriteTick,
    'minimum ownership write tick',
  );
  if (request.hostReadbackVisibility !== false) {
    fail('host readback visibility is forbidden');
  }

  if (!descriptor || typeof descriptor !== 'object') {
    fail('particle ownership descriptor is missing');
  }
  if (descriptor.contract !== KAMINOS_PARTICLE_OWNERSHIP_CONTRACT) {
    fail('particle ownership contract is missing or unsupported');
  }
  if (descriptor.packing !== KAMINOS_PARTICLE_OWNERSHIP_PACKING) {
    fail('particle ownership packing is missing or unsupported');
  }
  if (
    descriptor.source?.repository !== 'kaminos'
    || descriptor.source.composedRevision !== KAMINOS_HYDRO_COMPOSED_REVISION
    || descriptor.source.runtimeRoute !== KAMINOS_PARTICLE_RUNTIME_ROUTE
  ) {
    fail('Kaminos source identity is missing, stale, or substituted');
  }
  if (
    !expected?.device
    || typeof expected.device !== 'object'
    || descriptor.device !== expected.device
  ) {
    fail('solver and renderer do not share the same GPU device');
  }
  if (
    !expected.queue
    || typeof expected.queue !== 'object'
    || descriptor.queue !== expected.queue
  ) {
    fail('particle ownership GPU queue is missing or substituted');
  }
  if (
    !expected.particleBuffer
    || typeof expected.particleBuffer !== 'object'
    || descriptor.buffer !== expected.particleBuffer
  ) {
    fail('particle ownership descriptor does not expose the exact solver particle buffer');
  }
  if (
    descriptor.recordFloats !== 20
    || descriptor.recordBytes !== 80
    || descriptor.ownershipOffsetFloats !== 16
    || descriptor.ownershipOffsetBytes !== 64
    || descriptor.ownershipFloats !== 4
  ) {
    fail('particle ownership record layout is partial or unsupported');
  }
  const capacity = positiveInteger(descriptor.capacity, 'particle ownership capacity');
  const writeTick = nonnegativeInteger(descriptor.writeTick, 'particle ownership write tick');
  if (writeTick < minimumWriteTick) {
    fail(`stale ownership write tick ${writeTick}; expected at least ${minimumWriteTick}`);
  }
  if (descriptor.ownershipAuthority !== 'solver_spatial_first_support_contact_v0') {
    fail('particle ownership authority is missing or substituted');
  }
  if (descriptor.consumerVisibilityRule !== KAMINOS_PARTICLE_VISIBILITY_RULE) {
    fail('particle ownership visibility rule is missing or substituted');
  }
  if (
    descriptor.visibilityAuthority !== KAMINOS_PARTICLE_VISIBILITY_AUTHORITY
  ) {
    fail('particle ownership visibility authority is missing or substituted');
  }
  if (descriptor.hostReadbackVisibility !== false) {
    fail('descriptor-side host readback visibility is forbidden');
  }

  const support = descriptor.supportContact;
  if (!support || typeof support !== 'object') {
    fail('Hill GPU support contact authority is missing');
  }
  if (support.route !== HILL_KAMINOS_PARTICLE_SUPPORT_ROUTE) {
    fail('Hill GPU support contact route is missing or substituted');
  }
  if (support.owner !== 'lerms_hill_of_hills') {
    fail('Hill GPU support contact owner is missing or substituted');
  }
  if (
    !expected.support
    || typeof expected.support !== 'object'
    || !expected.support.provider
    || typeof expected.support.provider !== 'object'
  ) {
    fail('Hill support provider identity is missing or substituted');
  }
  const provider = expected.support.provider;
  if (
    provider.device !== expected.device
    || provider.queue !== expected.queue
  ) {
    fail('Hill support device is not the solver and renderer GPU device');
  }
  const sourceId = requiredString(support.sourceId, 'Hill support source id');
  if (
    sourceId !== requiredString(
      expected.support.sourceId,
      'expected Hill support source id',
    )
  ) {
    fail('Hill support source identity is stale or substituted');
  }
  const terrainId = requiredString(support.terrainId, 'Hill support terrain id');
  if (
    terrainId !== requiredString(
      expected.support.terrainId,
      'expected Hill support terrain id',
    )
  ) {
    fail('Hill support terrain id is stale or substituted');
  }
  const terrainEpoch = nonnegativeInteger(support.terrainEpoch, 'Hill support terrain epoch');
  const supportEpoch = nonnegativeInteger(support.supportEpoch, 'Hill support epoch');
  const remapEpoch = nonnegativeInteger(support.remapEpoch, 'Hill support remap epoch');
  if (
    terrainEpoch
      !== nonnegativeInteger(
        expected.support.terrainEpoch,
        'expected Hill support terrain epoch',
      )
  ) {
    fail('Hill support terrain epoch is stale or substituted');
  }
  if (
    supportEpoch
      !== nonnegativeInteger(
        expected.support.supportEpoch,
        'expected Hill support epoch',
      )
  ) {
    fail('Hill support epoch is stale or substituted');
  }
  if (
    remapEpoch
      !== nonnegativeInteger(
        expected.support.remapEpoch,
        'expected Hill support remap epoch',
      )
  ) {
    fail('Hill support remap epoch is stale or substituted');
  }
  if (support.stale !== false) {
    fail('stale Hill support contact authority is forbidden');
  }
  if (support.fallbackRoute !== null) {
    fail('fallback Hill support contact authority is forbidden');
  }
  if (support.execution !== 'gpu_same_device_moving_hill_signed_distance_v0') {
    fail('Hill support contact execution is not same-device GPU moving-support truth');
  }
  if (
    provider.route !== support.route
    || provider.owner !== support.owner
    || provider.sourceId !== sourceId
    || provider.terrainId !== terrainId
    || provider.terrainEpoch !== terrainEpoch
    || provider.supportEpoch !== supportEpoch
    || provider.remapEpoch !== remapEpoch
    || provider.stale !== false
    || provider.fallbackRoute !== null
    || provider.execution !== support.execution
    || provider.visibilityAuthority !== descriptor.visibilityAuthority
    || provider.hostReadbackVisibility !== false
  ) {
    fail('Hill support provider identity is missing or substituted');
  }

  return {
    schema: HILL_KAMINOS_PARTICLE_OWNERSHIP_MOUNT_SCHEMA,
    status: 'mounted',
    requestId: request.requestId,
    route: {
      requested: HILL_KAMINOS_PARTICLE_OWNERSHIP_ROUTE,
      effective: HILL_KAMINOS_PARTICLE_OWNERSHIP_ROUTE,
      fallback: null,
    },
    kaminosRevision: {
      requested: KAMINOS_HYDRO_COMPOSED_REVISION,
      effective: KAMINOS_HYDRO_COMPOSED_REVISION,
    },
    mode: {
      requested: request.requestedMode,
      effective: request.requestedMode,
      defaultSubstitution: false,
    },
    ownership: {
      contract: KAMINOS_PARTICLE_OWNERSHIP_CONTRACT,
      packing: KAMINOS_PARTICLE_OWNERSHIP_PACKING,
      visibilityRule: KAMINOS_PARTICLE_VISIBILITY_RULE,
      authority: 'solver_spatial_first_support_contact_v0',
      deviceIdentity: 'same_solver_and_renderer_device',
      bufferIdentity: 'exact_solver_material_tracer_buffer',
      visibilityAuthority: KAMINOS_PARTICLE_VISIBILITY_AUTHORITY,
      hostReadbackVisibility: descriptor.hostReadbackVisibility,
      capacity,
      writeTick,
    },
    supportContact: {
      route: HILL_KAMINOS_PARTICLE_SUPPORT_ROUTE,
      owner: 'lerms_hill_of_hills',
      sourceId,
      terrainId,
      terrainEpoch,
      supportEpoch,
      remapEpoch,
      stale: false,
      fallbackRoute: null,
      execution: 'gpu_same_device_moving_hill_signed_distance_v0',
    },
  };
}

function fail(message: string): never {
  throw new Error(`Invalid Hill Kaminos particle ownership mount: ${message}`);
}

function requiredString(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    fail(`${label} is missing`);
  }
  return value;
}

function nonnegativeInteger(value: unknown, label: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    fail(`${label} must be a nonnegative safe integer`);
  }
  return value as number;
}

function positiveInteger(value: unknown, label: string): number {
  const integer = nonnegativeInteger(value, label);
  if (integer < 1) fail(`${label} must be positive`);
  return integer;
}
