import { pathToFileURL } from 'node:url';
import {
  KAMINOS_FLUID_WEBGPU_PIN,
  createInstalledKaminosPackageEvidence,
  createKaminosFluidPackageRequest,
  loadPinnedKaminosFluidPackage
} from '../src/fluid/kaminos-fluid-package-consumer.js';
import { executeHillKaminosRuntimeExercise } from '../src/fluid/hill-kaminos-runtime-exercise.js';
import {
  createHillFluidPackageAdapterFrame,
  createKaminosTerrainFluidFrame
} from '../src/terrain/hill-of-hills-fluid-package-adapter.js';
import {
  createHillOfHillsLayerTileCache,
  createHillOfHillsTerrainBuffer,
  createHillOfHillsTerrainWithCache,
  defaultHillOfHillsParams
} from '../src/terrain/hill-of-hills.js';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const request = createKaminosFluidPackageRequest(KAMINOS_FLUID_WEBGPU_PIN, {
  executionMode: 'live_hill',
  requestedAtMs: 71_020
});
const packageJson = {
  dependencies: {
    [KAMINOS_FLUID_WEBGPU_PIN.packageName]: KAMINOS_FLUID_WEBGPU_PIN.dependencySpecifier
  }
};
const packageLock = {
  lockfileVersion: 3,
  packages: {
    '': {
      dependencies: packageJson.dependencies
    },
    [`node_modules/${KAMINOS_FLUID_WEBGPU_PIN.packageName}`]: {
      version: KAMINOS_FLUID_WEBGPU_PIN.packageVersion,
      resolved: KAMINOS_FLUID_WEBGPU_PIN.resolved,
      integrity: KAMINOS_FLUID_WEBGPU_PIN.integrity
    }
  }
};
const installedEvidence = createInstalledKaminosPackageEvidence(request, packageJson, packageLock, {
  freshness: 'fresh',
  verifiedAtMs: 71_020
});
const packageEntryUrl = pathToFileURL(
  `${process.cwd()}/node_modules/@kaminos/fluid-webgpu/mapped-macro-core.js`
).href;
const loaded = await loadPinnedKaminosFluidPackage(
  request,
  () => import(packageEntryUrl),
  installedEvidence
);

if (loaded.ok === false) {
  throw new Error(`exact installed Kaminos package must load: ${loaded.error}`);
}
assert(loaded.effective.packageVersion === '0.2.1', 'effective package version is exact');
assert(
  loaded.effective.artifactRevision === '@kaminos/fluid-webgpu@0.2.1',
  'effective artifact revision is semantic package identity'
);
assert(
  loaded.effective.runtimeRevision === '95920668287205517bc2e22f4f224b0d7584f53e',
  'effective runtime revision is the numerical-core SHA'
);

const terrain = createHillOfHillsTerrainWithCache(
  createHillOfHillsLayerTileCache(),
  {
    ...defaultHillOfHillsParams,
    gridResolutionX: 24,
    gridResolutionZ: 30,
    ditchPhaseIntensity: 0,
    ditchPhaseLimit: 0,
    trailPhaseIntensity: 0,
    trailPhaseLimit: 0,
    topologyPhaseIntensity: 0,
    topologyPhaseLimit: 0
  },
  {
    route: 'lerms/hill-of-hills/watershed-installed-package-contract',
    frameId: 'hill-watershed-installed-package-frame',
    configId: 'continuity-hills-installed-package-contract',
    timestampMs: 71_000,
    sampleAgeMs: 20
  }
);
const terrainBuffer = createHillOfHillsTerrainBuffer(terrain);
const adapterFrame = createHillFluidPackageAdapterFrame(terrainBuffer, {
  frameId: 'hill-kaminos-installed-package-adapter',
  generatedAtMs: 71_020,
  freshnessBudgetMs: 250,
  priorTerrainEpoch: terrain.witness.terrainEpoch,
  physicalScale: {
    metersPerWorldUnit: 1,
    secondsPerSimulationSecond: 1,
    gravityMetersPerSecondSquared: 9.80665
  }
});
const terrainFrame = createKaminosTerrainFluidFrame(adapterFrame, {
  producerRevision: 'f7571e987bb4cb205012798b68c7a711565fd8cd',
  requestedRoute: 'lerms/hill-of-hills/terrain-fluid-frame',
  requestedSourceId: terrainBuffer.source.frameId
});

assert(terrainFrame.schema === 'kaminos.fluid.terrain-fluid-frame.v1', 'adapter emits canonical producer terrain schema');
assert(terrainFrame.route.requested === terrainFrame.route.effective, 'terrain route cannot fall back');
assert(terrainFrame.source.requested === terrainFrame.source.effective, 'terrain source cannot be substituted');
assert(terrainFrame.currentEpoch === adapterFrame.terrain.currentEpoch, 'canonical terrain frame preserves current Hill epoch');
assert(terrainFrame.fields.bedHeight.length === terrainBuffer.sampleCount, 'canonical terrain frame contains every Hill sample');
assert(terrainFrame.fields.valid.every((value) => value === 1), 'canonical terrain frame marks every signed sample valid');

const result = executeHillKaminosRuntimeExercise(loaded, adapterFrame, terrainFrame, {
  transactionId: 'hill-pbf-to-macro-transaction-0001',
  lineageId: 'hill-pbf-lineage-0001',
  allocationGeneration: 1,
  depositVolume: 0.42,
  depositMomentum: [0, 0, 0],
  materialMasses: {
    fingerJuiceKg: 418.74
  },
  stepCount: 8,
  deltaSeconds: 0.012
});

assert(result.ok, 'installed package completes the real Hill runtime exercise');
assert(result.receipt.state === 'committed', 'local-to-macro exchange receipt is committed');
assert(result.receipt.transactionId === 'hill-pbf-to-macro-transaction-0001', 'receipt preserves transaction identity');
assert(result.receipt.residual.volume === 0, 'receipt conserves deposited volume');
assert(result.outwardWave.reachedCellCount > 1, 'deposited fluid produces an outward macro wave');
assert(result.outwardWave.maximumRadiusCells > 0, 'outward wave moves beyond the deposit cell');
assert(result.feedback.terrainEpoch === terrainFrame.currentEpoch, 'feedback preserves exact Hill epoch');
assert(result.feedback.conservationReceiptIds.includes(result.receipt.transactionId), 'feedback points back to deposit receipt');
assert(result.representation.route.requested === KAMINOS_FLUID_WEBGPU_PIN.representationRoute, 'representation preserves requested route');
assert(result.representation.route.effective === KAMINOS_FLUID_WEBGPU_PIN.representationRoute, 'representation executes requested route');
assert(result.outputEvidence.output.dynamicFrameDelta > 0, 'consumer evidence records dynamic producer output');

console.log('watershed installed package runtime contracts ok');
