import { pathToFileURL } from 'node:url';
import {
  KAMINOS_FLUID_WEBGPU_PIN,
  createInstalledKaminosPackageEvidence,
  createKaminosFluidPackageRequest,
  loadPinnedKaminosFluidPackage
} from '../src/fluid/kaminos-fluid-package-consumer.js';
import { executeHillKaminosPhaseMorphExercise } from '../src/fluid/hill-kaminos-runtime-exercise.js';
import {
  HILL_KAMINOS_PHASE_MORPH_RECIPE,
  createHillKaminosPhaseMorphRecipeBuffer
} from '../src/fluid/hill-kaminos-phase-morph-recipe.js';
import {
  HILL_PORTABLE_MACRO_OPTICAL_ADAPTER_SCHEMA,
  HILL_PORTABLE_MACRO_OPTICAL_CONVERSION_ROUTE,
  PORTABLE_MACRO_SUPPORT_GEOMETRY_CAPABILITY,
  assertHillPortableMacroOpticalGeometryAdapterFrame,
  createHillPortableMacroOpticalGeometryAdapterFrame
} from '../src/terrain/hill-of-hills-portable-optical-geometry-adapter.js';
import {
  createHillFluidPackageAdapterFrame,
  createKaminosTerrainFluidFrame
} from '../src/terrain/hill-of-hills-fluid-package-adapter.js';
import { createHillOfHillsLayerTileCache } from '../src/terrain/hill-of-hills.js';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function assertThrows(action: () => unknown, includes: string, message: string): void {
  let error: unknown;
  try {
    action();
  } catch (caught) {
    error = caught;
  }
  assert(error instanceof Error, message);
  assert(error.message.includes(includes), `${message}: ${error.message}`);
}

const cache = createHillOfHillsLayerTileCache();
const previousBuffer = createHillKaminosPhaseMorphRecipeBuffer(cache, 'previous');
const currentBuffer = createHillKaminosPhaseMorphRecipeBuffer(cache, 'current');
const physicalScale = {
  metersPerWorldUnit: 1,
  secondsPerSimulationSecond: 1,
  gravityMetersPerSecondSquared: 9.80665
};
const previousAdapter = createHillFluidPackageAdapterFrame(previousBuffer, {
  frameId: 'hill-portable-optics:previous',
  generatedAtMs: previousBuffer.source.timestampMs,
  freshnessBudgetMs: 1,
  priorTerrainEpoch: previousBuffer.witness.terrainEpoch,
  physicalScale
});
const currentAdapter = createHillFluidPackageAdapterFrame(currentBuffer, {
  frameId: 'hill-portable-optics:current',
  generatedAtMs: currentBuffer.source.timestampMs,
  freshnessBudgetMs: 1,
  priorTerrainEpoch: previousBuffer.witness.terrainEpoch,
  physicalScale
});
const previousTerrain = createKaminosTerrainFluidFrame(previousAdapter, {
  producerRevision: HILL_KAMINOS_PHASE_MORPH_RECIPE.producerRevision,
  requestedRoute: 'lerms/hill-of-hills/terrain-fluid-frame',
  requestedSourceId: previousBuffer.source.frameId,
  motionSubstepEnvelopeSeconds: HILL_KAMINOS_PHASE_MORPH_RECIPE.motionSubstepEnvelopeSeconds
});
const currentTerrain = createKaminosTerrainFluidFrame(currentAdapter, {
  producerRevision: HILL_KAMINOS_PHASE_MORPH_RECIPE.producerRevision,
  requestedRoute: previousTerrain.route.requested,
  requestedSourceId: currentBuffer.source.frameId,
  motionSubstepEnvelopeSeconds: HILL_KAMINOS_PHASE_MORPH_RECIPE.motionSubstepEnvelopeSeconds
});
const request = createKaminosFluidPackageRequest(KAMINOS_FLUID_WEBGPU_PIN, {
  executionMode: 'contract_test',
  requestedAtMs: previousBuffer.source.timestampMs
});
const installedEvidence = createInstalledKaminosPackageEvidence(request, {
  dependencies: {
    [KAMINOS_FLUID_WEBGPU_PIN.packageName]: KAMINOS_FLUID_WEBGPU_PIN.dependencySpecifier
  }
}, {
  lockfileVersion: 3,
  packages: {
    '': {
      dependencies: {
        [KAMINOS_FLUID_WEBGPU_PIN.packageName]: KAMINOS_FLUID_WEBGPU_PIN.dependencySpecifier
      }
    },
    [`node_modules/${KAMINOS_FLUID_WEBGPU_PIN.packageName}`]: {
      version: KAMINOS_FLUID_WEBGPU_PIN.packageVersion,
      integrity: KAMINOS_FLUID_WEBGPU_PIN.integrity,
      resolved: KAMINOS_FLUID_WEBGPU_PIN.resolved
    }
  }
}, {
  freshness: 'fresh',
  verifiedAtMs: previousBuffer.source.timestampMs
});
const loaded = await loadPinnedKaminosFluidPackage(
  request,
  () => import(pathToFileURL(
    `${process.cwd()}/node_modules/@kaminos/fluid-webgpu/mapped-macro-core.js`
  ).href),
  installedEvidence
);
assert(loaded.ok, 'portable optical adapter contract loads the pinned Kaminos package');

const exercise = executeHillKaminosPhaseMorphExercise(
  loaded,
  previousAdapter,
  previousTerrain,
  currentAdapter,
  currentTerrain,
  {
    transactionId: 'hill-portable-optics-deposit',
    lineageId: 'hill-portable-optics-lineage',
    allocationGeneration: 1,
    depositVolume: 0.42,
    depositMomentum: [0, 0, 0],
    materialMasses: { fingerJuiceKg: 418.74 },
    preRemapStepCount: 4,
    postRemapStepCount: 4,
    fluidDeltaSeconds: 0.012,
    terrainDeltaSeconds: HILL_KAMINOS_PHASE_MORPH_RECIPE.sourceIntervalSeconds
  }
);
const frame = createHillPortableMacroOpticalGeometryAdapterFrame(
  currentAdapter,
  currentTerrain,
  exercise.after.representation,
  exercise.remapReceipt,
  {
    frameId: 'hill-portable-optics-provider-candidate',
    requestedCapability: PORTABLE_MACRO_SUPPORT_GEOMETRY_CAPABILITY
  }
);

assert(frame.schema === HILL_PORTABLE_MACRO_OPTICAL_ADAPTER_SCHEMA, 'adapter uses a LERMS-owned schema');
assert(
  frame.conversion.route.requested === HILL_PORTABLE_MACRO_OPTICAL_CONVERSION_ROUTE &&
    frame.conversion.route.effective === HILL_PORTABLE_MACRO_OPTICAL_CONVERSION_ROUTE,
  'adapter records exact requested/effective conversion identity'
);
assert(frame.conversion.fallback === null, 'adapter has no fallback conversion');
assert(
  frame.providerBinding.status === 'awaiting_canonical_kaminos_provider_schema' &&
    frame.providerBinding.canonicalProviderSchema === null &&
    frame.providerBinding.canonicalProviderRoute === null &&
    frame.providerBinding.effectiveCapability === null,
  'adapter does not invent final Kaminos provider authority'
);
assert(frame.terrain.terrainId === currentTerrain.terrainId, 'adapter preserves terrain identity');
assert(frame.terrain.transformId === currentTerrain.transformId, 'adapter preserves transform identity');
assert(frame.terrain.sourceFrameId === currentBuffer.source.frameId, 'adapter preserves Hill source identity');
assert(frame.terrain.sampleChecksum === currentBuffer.sampleChecksum, 'adapter preserves Hill sample identity');
assert(frame.terrain.topologyChecksum === currentBuffer.topologyChecksum, 'adapter preserves Hill topology identity');
assert(
  frame.terrain.supportFrameChecksum === currentBuffer.witness.supportFrame.supportFrameChecksum,
  'adapter preserves Hill support identity'
);
assert(
  frame.epochs.priorTerrain === previousTerrain.currentEpoch &&
    frame.epochs.terrain === currentTerrain.currentEpoch &&
    frame.epochs.fluid === exercise.after.representation.fluidEpoch,
  'adapter preserves terrain and fluid epochs'
);
assert(frame.motion.remapReceiptId === exercise.remapReceipt.receiptId, 'adapter preserves remap identity');
assert(frame.ownership.identity === exercise.after.representation.ownershipIdentity, 'adapter preserves ownership identity');
assert(
  frame.conservationReceiptIds.includes(exercise.depositReceipt.transactionId) &&
    frame.conservationReceiptIds.includes(exercise.remapReceipt.receiptId),
  'adapter preserves deposit-plus-remap receipt lineage'
);
assert(frame.supportGeometry.sampleCount === currentTerrain.expectedSampleCount, 'support geometry is complete');
assert(frame.sourceHandles.bedHeight.read(0) === currentTerrain.fields.bedHeight[0], 'bed handle reads source truth');
assert(
  frame.sourceHandles.mappedDepth.read(0) === exercise.after.representation.macro.mappedDepth[0],
  'mapped-depth handle reads canonical macro state'
);
assert(!('view' in frame.sourceHandles.bedHeight), 'read-only source handles do not expose mutable typed arrays');
assert(Object.isFrozen(frame) && Object.isFrozen(frame.supportGeometry), 'consumer descriptors are immutable');
assert(
  !/(camera|projection|viewport|screenSpace)/i.test(JSON.stringify(frame)),
  'portable adapter descriptor contains no camera-owned state'
);
assertHillPortableMacroOpticalGeometryAdapterFrame(frame);

assertThrows(
  () => createHillPortableMacroOpticalGeometryAdapterFrame(
    currentAdapter,
    { ...currentTerrain, fields: { ...currentTerrain.fields, bedHeight: currentTerrain.fields.bedHeight.slice(1) } },
    exercise.after.representation,
    exercise.remapReceipt,
    { frameId: 'partial-support', requestedCapability: PORTABLE_MACRO_SUPPORT_GEOMETRY_CAPABILITY }
  ),
  'partial',
  'adapter rejects partial support geometry before output'
);
assertThrows(
  () => createHillPortableMacroOpticalGeometryAdapterFrame(
    { ...currentAdapter, freshness: { ...currentAdapter.freshness, status: 'fresh', ageMs: 2 } },
    currentTerrain,
    exercise.after.representation,
    exercise.remapReceipt,
    { frameId: 'stale-support', requestedCapability: PORTABLE_MACRO_SUPPORT_GEOMETRY_CAPABILITY }
  ),
  'fresh',
  'adapter rejects stale Hill source truth'
);
assertThrows(
  () => createHillPortableMacroOpticalGeometryAdapterFrame(
    currentAdapter,
    currentTerrain,
    {
      ...exercise.after.representation,
      route: { ...exercise.after.representation.route, effective: 'fallback/default-representation' }
    },
    exercise.remapReceipt,
    { frameId: 'fallback-route', requestedCapability: PORTABLE_MACRO_SUPPORT_GEOMETRY_CAPABILITY }
  ),
  'fallback',
  'adapter rejects fallback representation routes'
);
assertThrows(
  () => createHillPortableMacroOpticalGeometryAdapterFrame(
    currentAdapter,
    currentTerrain,
    { ...exercise.after.representation, terrainEpoch: currentTerrain.currentEpoch - 1 },
    exercise.remapReceipt,
    { frameId: 'stale-fluid-terrain', requestedCapability: PORTABLE_MACRO_SUPPORT_GEOMETRY_CAPABILITY }
  ),
  'terrain epoch',
  'adapter rejects stale representation terrain epochs'
);
assertThrows(
  () => createHillPortableMacroOpticalGeometryAdapterFrame(
    currentAdapter,
    currentTerrain,
    exercise.after.representation,
    null,
    { frameId: 'missing-remap', requestedCapability: PORTABLE_MACRO_SUPPORT_GEOMETRY_CAPABILITY }
  ),
  'remap receipt',
  'adapter rejects a moving successor without remap identity'
);
assertThrows(
  () => createHillPortableMacroOpticalGeometryAdapterFrame(
    currentAdapter,
    currentTerrain,
    { ...exercise.after.representation, complete: false },
    exercise.remapReceipt,
    { frameId: 'partial-macro', requestedCapability: PORTABLE_MACRO_SUPPORT_GEOMETRY_CAPABILITY }
  ),
  'complete',
  'adapter rejects partial macro state'
);
assertThrows(
  () => createHillPortableMacroOpticalGeometryAdapterFrame(
    currentAdapter,
    currentTerrain,
    exercise.after.representation,
    { ...exercise.remapReceipt, transformId: 'substituted-transform' },
    { frameId: 'wrong-remap', requestedCapability: PORTABLE_MACRO_SUPPORT_GEOMETRY_CAPABILITY }
  ),
  'remap receipt',
  'adapter rejects substituted remap identity'
);
assertThrows(
  () => createHillPortableMacroOpticalGeometryAdapterFrame(
    currentAdapter,
    currentTerrain,
    exercise.after.representation,
    exercise.remapReceipt,
    { frameId: 'unsupported-capability', requestedCapability: 'camera-projected-hill-water' }
  ),
  'capability',
  'adapter rejects unsupported or host-specific capability requests'
);
assertThrows(
  () => assertHillPortableMacroOpticalGeometryAdapterFrame({
    ...frame,
    supportGeometry: {
      ...frame.supportGeometry,
      grid: {
        ...frame.supportGeometry.grid,
        spacing: [frame.supportGeometry.grid.spacing[0] + 1, frame.supportGeometry.grid.spacing[1]]
      }
    }
  }),
  'descriptor identity',
  'adapter rejects immutable descriptor substitution'
);
assertThrows(
  () => assertHillPortableMacroOpticalGeometryAdapterFrame({
    ...frame,
    hostComposition: { camera: 'forbidden' }
  } as typeof frame),
  'camera-owned',
  'adapter rejects camera-owned producer state'
);

console.log('watershed portable optical geometry adapter contracts ok');
