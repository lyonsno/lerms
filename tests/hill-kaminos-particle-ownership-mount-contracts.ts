import {
  HILL_KAMINOS_PARTICLE_OWNERSHIP_MOUNT_SCHEMA,
  HILL_KAMINOS_PARTICLE_OWNERSHIP_ROUTE,
  HILL_KAMINOS_PARTICLE_SUPPORT_ROUTE,
  KAMINOS_HYDRO_COMPOSED_REVISION,
  KAMINOS_PARTICLE_OWNERSHIP_CONTRACT,
  KAMINOS_PARTICLE_OWNERSHIP_PACKING,
  KAMINOS_PARTICLE_RUNTIME_ROUTE,
  KAMINOS_PARTICLE_VISIBILITY_AUTHORITY,
  KAMINOS_PARTICLE_VISIBILITY_RULE,
  createHillKaminosParticleOwnershipMount,
  type HillKaminosParticleOwnershipDescriptor,
  type HillKaminosParticleOwnershipMountRequest,
} from '../src/fluid/hill-kaminos-particle-ownership-mount.js';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertThrows(fn: () => void, expected: RegExp): void {
  try {
    fn();
  } catch (error) {
    assert(error instanceof Error, 'expected an Error');
    assert(
      expected.test(error.message),
      `expected "${error.message}" to match ${expected}`,
    );
    return;
  }
  throw new Error(`expected function to throw ${expected}`);
}

const device = {};
const queue = {};
const particleBuffer = {};
const supportProvider = {
  device,
  queue,
  route: HILL_KAMINOS_PARTICLE_SUPPORT_ROUTE,
  owner: 'lerms_hill_of_hills',
  sourceId: 'hill-support-frame-42',
  terrainId: 'hill-of-hills',
  terrainEpoch: 2,
  supportEpoch: 7,
  remapEpoch: 1,
  stale: false,
  fallbackRoute: null,
  execution: 'gpu_same_device_moving_hill_signed_distance_v0',
  visibilityAuthority: KAMINOS_PARTICLE_VISIBILITY_AUTHORITY,
  hostReadbackVisibility: false,
};

const request: HillKaminosParticleOwnershipMountRequest = {
  requestId: 'hill-hydro-mount-1',
  requestedRoute: HILL_KAMINOS_PARTICLE_OWNERSHIP_ROUTE,
  requestedKaminosRevision: KAMINOS_HYDRO_COMPOSED_REVISION,
  requestedMode: 'hybrid_analytic_carrier',
  minimumWriteTick: 41,
  hostReadbackVisibility: false,
};

const descriptor: HillKaminosParticleOwnershipDescriptor = {
  contract: KAMINOS_PARTICLE_OWNERSHIP_CONTRACT,
  packing: KAMINOS_PARTICLE_OWNERSHIP_PACKING,
  source: {
    repository: 'kaminos',
    composedRevision: KAMINOS_HYDRO_COMPOSED_REVISION,
    runtimeRoute: KAMINOS_PARTICLE_RUNTIME_ROUTE,
  },
  device,
  queue,
  buffer: particleBuffer,
  recordFloats: 20,
  recordBytes: 80,
  ownershipOffsetFloats: 16,
  ownershipOffsetBytes: 64,
  ownershipFloats: 4,
  capacity: 2_400,
  writeTick: 42,
  ownershipAuthority: 'solver_spatial_first_support_contact_v0',
  consumerVisibilityRule: KAMINOS_PARTICLE_VISIBILITY_RULE,
  visibilityAuthority: KAMINOS_PARTICLE_VISIBILITY_AUTHORITY,
  hostReadbackVisibility: false,
  supportContact: {
    route: HILL_KAMINOS_PARTICLE_SUPPORT_ROUTE,
    owner: 'lerms_hill_of_hills',
    sourceId: 'hill-support-frame-42',
    terrainId: 'hill-of-hills',
    terrainEpoch: 2,
    supportEpoch: 7,
    remapEpoch: 1,
    stale: false,
    fallbackRoute: null,
    execution: 'gpu_same_device_moving_hill_signed_distance_v0',
  },
};

const expected = {
  device,
  queue,
  particleBuffer,
  support: {
    sourceId: descriptor.supportContact.sourceId,
    provider: supportProvider,
    terrainId: descriptor.supportContact.terrainId,
    terrainEpoch: descriptor.supportContact.terrainEpoch,
    supportEpoch: descriptor.supportContact.supportEpoch,
    remapEpoch: descriptor.supportContact.remapEpoch,
  },
};

const mount = createHillKaminosParticleOwnershipMount(
  request,
  descriptor,
  expected,
);
assert(
  mount.schema === HILL_KAMINOS_PARTICLE_OWNERSHIP_MOUNT_SCHEMA,
  'mount schema is exact',
);
assert(mount.status === 'mounted', 'complete source-owned descriptor mounts');
assert(
  mount.route.requested === mount.route.effective
    && mount.route.fallback === null,
  'requested and effective route remain exact with null fallback',
);
assert(
  mount.kaminosRevision.requested === mount.kaminosRevision.effective,
  'requested and effective Kaminos revisions remain exact',
);
assert(
  mount.mode.requested === 'hybrid_analytic_carrier'
    && mount.mode.effective === 'hybrid_analytic_carrier'
    && mount.mode.defaultSubstitution === false,
  'comparison mode cannot be silently defaulted',
);
assert(
  mount.ownership.deviceIdentity === 'same_solver_and_renderer_device',
  'mount proves one GPU device',
);
assert(
  mount.ownership.bufferIdentity === 'exact_solver_material_tracer_buffer',
  'mount proves the exact solver ownership buffer',
);
assert(
  mount.ownership.visibilityAuthority
    === KAMINOS_PARTICLE_VISIBILITY_AUTHORITY,
  'mount proves descriptor-buffer visibility without host readback',
);
assert(
  mount.supportContact.route === HILL_KAMINOS_PARTICLE_SUPPORT_ROUTE
    && mount.supportContact.sourceId === expected.support.sourceId
    && mount.supportContact.stale === false
    && mount.supportContact.fallbackRoute === null,
  'mount preserves live Hill support authority',
);

function mutated(
  mutate: (value: HillKaminosParticleOwnershipDescriptor) => void,
): HillKaminosParticleOwnershipDescriptor {
  const value = {
    ...descriptor,
    source: { ...descriptor.source },
    supportContact: { ...descriptor.supportContact },
  };
  mutate(value);
  return value;
}

assertThrows(
  () => createHillKaminosParticleOwnershipMount(
    request,
    mutated(value => { value.device = {}; }),
    expected,
  ),
  /same.*device/i,
);
assertThrows(
  () => createHillKaminosParticleOwnershipMount(
    request,
    mutated(value => { value.queue = {}; }),
    expected,
  ),
  /GPU queue/i,
);
assertThrows(
  () => createHillKaminosParticleOwnershipMount(
    request,
    mutated(value => { value.buffer = {}; }),
    expected,
  ),
  /particle.*buffer/i,
);
assertThrows(
  () => createHillKaminosParticleOwnershipMount(
    request,
    mutated(value => { value.contract = 'fallback-ownership'; }),
    expected,
  ),
  /ownership contract/i,
);
assertThrows(
  () => createHillKaminosParticleOwnershipMount(
    request,
    mutated(value => { value.consumerVisibilityRule = 'host-readback-mask'; }),
    expected,
  ),
  /visibility rule/i,
);
assertThrows(
  () => createHillKaminosParticleOwnershipMount(
    request,
    mutated(value => { value.writeTick = 40; }),
    expected,
  ),
  /stale.*write tick/i,
);
assertThrows(
  () => createHillKaminosParticleOwnershipMount(
    request,
    mutated(value => { delete (value as Partial<typeof value>).supportContact; }),
    expected,
  ),
  /Hill.*support contact/i,
);
assertThrows(
  () => createHillKaminosParticleOwnershipMount(
    request,
    mutated(value => { value.supportContact.stale = true; }),
    expected,
  ),
  /stale.*Hill support/i,
);
assertThrows(
  () => createHillKaminosParticleOwnershipMount(
    request,
    mutated(value => { value.supportContact.fallbackRoute = 'toy-floor'; }),
    expected,
  ),
  /fallback.*Hill support/i,
);
assertThrows(
  () => createHillKaminosParticleOwnershipMount(
    { ...request, hostReadbackVisibility: true as false },
    descriptor,
    expected,
  ),
  /host readback/i,
);

assertThrows(
  () => createHillKaminosParticleOwnershipMount(
    request,
    mutated(value => {
      value.source = {
        ...value.source,
        composedRevision: '0'.repeat(40),
      };
    }),
    expected,
  ),
  /source identity/i,
);
assertThrows(
  () => createHillKaminosParticleOwnershipMount(
    request,
    mutated(value => { value.source.repository = 'unrelated-runtime'; }),
    expected,
  ),
  /source identity/i,
);
assertThrows(
  () => createHillKaminosParticleOwnershipMount(
    request,
    mutated(value => { value.source.runtimeRoute = 'fallback-runtime'; }),
    expected,
  ),
  /source identity/i,
);
assertThrows(
  () => createHillKaminosParticleOwnershipMount(
    request,
    descriptor,
    {
      ...expected,
      support: {
        ...expected.support,
        provider: { ...supportProvider, sourceId: 'substituted-provider' },
      },
    },
  ),
  /support provider/i,
);
assertThrows(
  () => createHillKaminosParticleOwnershipMount(
    request,
    mutated(value => { value.visibilityAuthority = 'host_readback_projection'; }),
    expected,
  ),
  /visibility authority/i,
);
assertThrows(
  () => createHillKaminosParticleOwnershipMount(
    request,
    mutated(value => { value.hostReadbackVisibility = true; }),
    expected,
  ),
  /host readback/i,
);
assertThrows(
  () => createHillKaminosParticleOwnershipMount(
    request,
    descriptor,
    {
      ...expected,
      support: {
        ...expected.support,
        provider: { ...supportProvider, device: {} },
      },
    },
  ),
  /support.*device/i,
);
assertThrows(
  () => createHillKaminosParticleOwnershipMount(
    request,
    descriptor,
    {
      ...expected,
      support: {
        ...expected.support,
        provider: { ...supportProvider, queue: {} },
      },
    },
  ),
  /support.*device/i,
);
assertThrows(
  () => createHillKaminosParticleOwnershipMount(
    request,
    mutated(value => { value.supportContact.sourceId = 'stale-hill-frame'; }),
    expected,
  ),
  /support.*source/i,
);
assertThrows(
  () => createHillKaminosParticleOwnershipMount(
    request,
    mutated(value => { value.supportContact.terrainId = 'other-terrain'; }),
    expected,
  ),
  /terrain id/i,
);
assertThrows(
  () => createHillKaminosParticleOwnershipMount(
    request,
    mutated(value => { value.supportContact.terrainEpoch += 1; }),
    expected,
  ),
  /terrain epoch/i,
);
assertThrows(
  () => createHillKaminosParticleOwnershipMount(
    request,
    mutated(value => { value.supportContact.supportEpoch += 1; }),
    expected,
  ),
  /support epoch/i,
);
assertThrows(
  () => createHillKaminosParticleOwnershipMount(
    request,
    mutated(value => { value.supportContact.remapEpoch += 1; }),
    expected,
  ),
  /remap epoch/i,
);
assertThrows(
  () => createHillKaminosParticleOwnershipMount(
    request,
    mutated(value => { value.supportContact.route = 'toy-floor'; }),
    expected,
  ),
  /support contact route/i,
);
assertThrows(
  () => createHillKaminosParticleOwnershipMount(
    request,
    mutated(value => { value.supportContact.owner = 'renderer_mask'; }),
    expected,
  ),
  /support contact owner/i,
);
assertThrows(
  () => createHillKaminosParticleOwnershipMount(
    request,
    mutated(value => { value.supportContact.execution = 'cpu_height_query'; }),
    expected,
  ),
  /same-device GPU moving-support truth/i,
);

const currentHydroDescriptor = {
  contract: descriptor.contract,
  packing: descriptor.packing,
  device,
  queue,
  buffer: particleBuffer,
  recordFloats: descriptor.recordFloats,
  recordBytes: descriptor.recordBytes,
  ownershipOffsetFloats: descriptor.ownershipOffsetFloats,
  ownershipOffsetBytes: descriptor.ownershipOffsetBytes,
  ownershipFloats: descriptor.ownershipFloats,
  capacity: descriptor.capacity,
  writeTick: descriptor.writeTick,
  ownershipAuthority: descriptor.ownershipAuthority,
  consumerVisibilityRule: descriptor.consumerVisibilityRule,
} as unknown as HillKaminosParticleOwnershipDescriptor;

assertThrows(
  () => createHillKaminosParticleOwnershipMount(
    request,
    currentHydroDescriptor,
    expected,
  ),
  /source identity/i,
);

console.log('Hill Kaminos particle ownership mount contracts passed');
