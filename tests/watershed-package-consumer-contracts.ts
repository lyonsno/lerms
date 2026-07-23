import {
  createInstalledKaminosPackageEvidence,
  createKaminosFluidPackageRequest,
  loadPinnedKaminosFluidPackage,
  validateKaminosFluidOutputEvidence,
  validateKaminosFluidPackageDescriptor,
  validateInstalledKaminosPackageEvidence,
  type KaminosFluidOutputEvidence,
  type KaminosFluidPackageDescriptor,
  type KaminosFluidPackagePin
} from '../src/fluid/kaminos-fluid-package-consumer.js';
import {
  assertHillFluidPackageAdapterFrame,
  createBlockedHillFluidPackageReport,
  createHillFluidPackageAdapterFrame,
  HILL_FLUID_PACKAGE_ADAPTER_FRAME_SCHEMA,
  HILL_FLUID_PACKAGE_BLOCKED_REPORT_SCHEMA
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

const artifactRevision = 'a'.repeat(40);
const runtimeRevision = 'b'.repeat(40);
const pin: KaminosFluidPackagePin = {
  packageName: '@kaminos/fluid-webgpu',
  packageVersion: '0.0.0-contract-fixture',
  importSpecifier: '@kaminos/fluid-webgpu',
  integrity: 'sha512-contract-fixture-only',
  artifactRevision,
  runtimeRevision,
  cacheKey: `@kaminos/fluid-webgpu@0.0.0-contract-fixture:${artifactRevision}`,
  descriptorSchema: 'kaminos.fluid-package-descriptor.contract-fixture.v0',
  descriptorExport: 'KAMINOS_FLUID_PACKAGE_DESCRIPTOR',
  runtimeFactoryExport: 'createKaminosFluidRuntime',
  runtimeRoute: 'kaminos/terrain-coupled-conservative-water-core-v1',
  representationRoute: 'kaminos/macro-local-transaction-v1',
  outputRoute: 'kaminos/fluid-terrain-feedback-frame-v1'
};

const liveRequest = createKaminosFluidPackageRequest(pin, {
  executionMode: 'live_hill',
  requestedAtMs: 44_020
});
const contractRequest = createKaminosFluidPackageRequest(pin, {
  executionMode: 'contract_test',
  requestedAtMs: 44_020
});
const packageJsonEvidence = {
  dependencies: {
    [pin.packageName]: pin.packageVersion
  }
};
const packageLockEvidence = {
  lockfileVersion: 3,
  packages: {
    '': {
      dependencies: {
        [pin.packageName]: pin.packageVersion
      }
    },
    [`node_modules/${pin.packageName}`]: {
      version: pin.packageVersion,
      integrity: pin.integrity,
      resolved: 'https://packages.invalid/kaminos-fluid-webgpu-contract-fixture.tgz'
    }
  }
};
const installedEvidence = createInstalledKaminosPackageEvidence(liveRequest, packageJsonEvidence, packageLockEvidence);

assert(installedEvidence.packageName === pin.packageName, 'installed evidence reads the requested package from structured lock data');
assert(installedEvidence.packageVersion === pin.packageVersion, 'installed evidence preserves exact locked version');
assert(installedEvidence.integrity === pin.integrity, 'installed evidence preserves exact locked integrity');
assert(validateInstalledKaminosPackageEvidence(liveRequest, installedEvidence).length === 0, 'matching lock evidence passes');
assert(
  validateInstalledKaminosPackageEvidence(liveRequest, { ...installedEvidence, integrity: 'sha512-substituted' })
    .includes('reject-installed-package-integrity'),
  'installed evidence rejects substituted lock integrity'
);
assertThrows(
  () => createInstalledKaminosPackageEvidence(liveRequest, { dependencies: {} }, packageLockEvidence),
  'not declared',
  'clean-checkout evidence rejects an absent package declaration'
);
assertThrows(
  () => createInstalledKaminosPackageEvidence(
    liveRequest,
    { dependencies: { [pin.packageName]: '^0.0.0' } },
    packageLockEvidence
  ),
  'not the exact requested version',
  'clean-checkout evidence rejects a ranged dependency'
);
assertThrows(
  () => createInstalledKaminosPackageEvidence(liveRequest, packageJsonEvidence, {
    ...packageLockEvidence,
    packages: {
      ...packageLockEvidence.packages,
      [`node_modules/${pin.packageName}`]: {
        ...packageLockEvidence.packages[`node_modules/${pin.packageName}`],
        integrity: 'sha512-substituted'
      }
    }
  }),
  'integrity does not match',
  'clean-checkout evidence rejects substituted installed integrity'
);

for (const nonExactVersion of ['', 'latest', '^1.2.3', '~1.2.3', 'workspace:*']) {
  assertThrows(
    () => createKaminosFluidPackageRequest({ ...pin, packageVersion: nonExactVersion }, {
      executionMode: 'live_hill',
      requestedAtMs: 44_020
    }),
    'exact package version',
    `package request rejects non-exact version ${JSON.stringify(nonExactVersion)}`
  );
}

const terrain = createHillOfHillsTerrainWithCache(
  createHillOfHillsLayerTileCache(),
  {
    ...defaultHillOfHillsParams,
    gridResolutionX: 24,
    gridResolutionZ: 30,
    topologyPhaseIntensity: 0.72,
    topologyPhaseLimit: 2,
    topologyPhaseTimeMs: 860
  },
  {
    route: 'lerms/hill-of-hills/watershed-package-contract',
    frameId: 'hill-watershed-package-frame',
    configId: 'continuity-hills-contract',
    timestampMs: 44_000,
    sampleAgeMs: 20
  }
);
const terrainBuffer = createHillOfHillsTerrainBuffer(terrain);
const adapterFrame = createHillFluidPackageAdapterFrame(terrainBuffer, {
  frameId: 'hill-fluid-package-adapter-contract',
  generatedAtMs: 44_020,
  freshnessBudgetMs: 250,
  priorTerrainEpoch: Math.max(0, terrain.witness.terrainEpoch - 1),
  physicalScale: {
    metersPerWorldUnit: 1.25,
    secondsPerSimulationSecond: 1,
    gravityMetersPerSecondSquared: 9.80665
  }
});

assert(adapterFrame.schema === HILL_FLUID_PACKAGE_ADAPTER_FRAME_SCHEMA, 'Hill adapter frame carries its LERMS-owned schema');
assert(adapterFrame.source.authority === 'live_simulation', 'Hill adapter preserves live terrain authority');
assert(adapterFrame.source.route === 'lerms/hill-of-hills/watershed-package-adapter', 'Hill adapter owns an explicit route');
assert(adapterFrame.terrain.currentEpoch === terrain.witness.terrainEpoch, 'Hill adapter preserves current terrain epoch');
assert(adapterFrame.terrain.priorEpoch === Math.max(0, terrain.witness.terrainEpoch - 1), 'Hill adapter records prior terrain epoch');
assert(adapterFrame.terrain.supportEpoch === terrain.witness.supportFrame.supportEpoch, 'Hill adapter preserves support epoch');
assert(adapterFrame.terrain.supportFrameChecksum === terrain.witness.supportFrame.supportFrameChecksum, 'Hill adapter preserves support checksum');
assert(adapterFrame.terrain.sampleChecksum === terrainBuffer.sampleChecksum, 'Hill adapter preserves sample checksum');
assert(adapterFrame.terrain.dirtyRegionChecksum === terrain.witness.dirtyRegionChecksum, 'Hill adapter preserves dirty-region identity');
assert(adapterFrame.terrain.worldBounds === terrain.witness.supportFrame.worldBounds, 'Hill adapter preserves Hill world bounds without remapping');
assert(adapterFrame.channels.positions === terrainBuffer.positions, 'Hill adapter passes source-owned positions without copying');
assert(adapterFrame.channels.normals === terrainBuffer.normals, 'Hill adapter passes source-owned normals without copying');
assert(adapterFrame.channels.metrics === terrainBuffer.metrics, 'Hill adapter passes source-owned metric channels without copying');
assert(adapterFrame.channels.metricLayout.includes('height'), 'Hill adapter names the height channel');
assert(adapterFrame.channels.metricLayout.includes('previousHeight'), 'Hill adapter names prior height');
assert(adapterFrame.channels.metricLayout.includes('heightDelta'), 'Hill adapter names moving-bed delta');
assert(adapterFrame.channels.metricLayout.includes('surfaceVelocityY'), 'Hill adapter names support velocity');
assert(adapterFrame.physicalScale.metersPerWorldUnit === 1.25, 'Hill adapter records physical world scale');
assert(adapterFrame.providerBinding.status === 'awaiting_canonical_package', 'Hill adapter does not claim a provider before package load');
assert(adapterFrame.providerBinding.canonicalTerrainFluidFrameSchema === null, 'Hill adapter does not invent the canonical producer schema');
assertHillFluidPackageAdapterFrame(adapterFrame);

assertThrows(
  () => assertHillFluidPackageAdapterFrame({
    ...adapterFrame,
    terrain: { ...adapterFrame.terrain, sampleCount: adapterFrame.terrain.sampleCount - 1 }
  }),
  'sample count',
  'Hill adapter rejects partial terrain channels'
);
assertThrows(
  () => assertHillFluidPackageAdapterFrame({
    ...adapterFrame,
    source: { ...adapterFrame.source, authority: 'fallback' }
  }),
  'live terrain authority',
  'Hill adapter rejects fallback terrain authority'
);
assertThrows(
  () => createHillFluidPackageAdapterFrame(terrainBuffer, {
    frameId: 'stale-hill-frame',
    generatedAtMs: 45_000,
    freshnessBudgetMs: 250,
    priorTerrainEpoch: terrain.witness.terrainEpoch,
    physicalScale: adapterFrame.physicalScale
  }),
  'stale terrain frame',
  'Hill adapter rejects stale terrain before package execution'
);

const syntheticDescriptor: KaminosFluidPackageDescriptor = {
  schema: pin.descriptorSchema,
  sourceAuthority: 'synthetic_fixture',
  fallbackStatus: 'none',
  cacheStatus: 'fresh',
  packageName: pin.packageName,
  packageVersion: pin.packageVersion,
  integrity: pin.integrity,
  artifactRevision: pin.artifactRevision,
  runtimeRevision: pin.runtimeRevision,
  cacheKey: pin.cacheKey,
  runtimeRoute: pin.runtimeRoute,
  representationRoutes: [pin.representationRoute],
  outputRoutes: [pin.outputRoute]
};

assert(
  validateKaminosFluidPackageDescriptor(contractRequest, syntheticDescriptor).length === 0,
  'contract-test mode accepts an explicitly synthetic descriptor'
);
assert(
  validateKaminosFluidPackageDescriptor(liveRequest, syntheticDescriptor).includes('reject-non-live-package-authority'),
  'live Hill mode rejects a synthetic descriptor'
);
assert(
  validateKaminosFluidPackageDescriptor(contractRequest, {
    ...syntheticDescriptor,
    packageName: '@kaminos/substituted-fluid'
  }).includes('reject-substituted-package'),
  'descriptor validation rejects a substituted package'
);
assert(
  validateKaminosFluidPackageDescriptor(contractRequest, {
    ...syntheticDescriptor,
    cacheStatus: 'stale'
  }).includes('reject-stale-cached-package'),
  'descriptor validation rejects stale cache state'
);
assert(
  validateKaminosFluidPackageDescriptor(contractRequest, {
    ...syntheticDescriptor,
    fallbackStatus: 'default'
  }).includes('reject-default-package-route'),
  'descriptor validation rejects a default package route'
);

const missingEvidenceLoad = await loadPinnedKaminosFluidPackage(liveRequest, async () => ({
  [pin.descriptorExport]: { ...syntheticDescriptor, sourceAuthority: 'live_runtime' },
  [pin.runtimeFactoryExport]: () => ({ shouldNotRun: true })
}));
assert(missingEvidenceLoad.ok === false, 'live load rejects a module without lockfile evidence');
if (!missingEvidenceLoad.ok) {
  assert(missingEvidenceLoad.failurePhase === 'package-installation', 'missing lock evidence fails before import');
  assert(missingEvidenceLoad.rejections.includes('reject-missing-installed-package-evidence'), 'missing lock evidence is explicit');
}

const absentLoad = await loadPinnedKaminosFluidPackage(liveRequest, async () => {
  throw new Error('package not installed');
}, installedEvidence);
assert(absentLoad.ok === false, 'absent package returns a failure report');
if (!absentLoad.ok) {
  assert(absentLoad.failurePhase === 'package-import', 'absent package records import phase');
  assert(absentLoad.reason === 'package-unavailable', 'absent package records provider unavailability');
  assert(absentLoad.primaryOutputWritten === false, 'absent package cannot claim primary output');
  assert(absentLoad.requested.packageName === pin.packageName, 'absent package report preserves requested package');
  assert(absentLoad.effective === null, 'absent package has no effective identity');
}

const syntheticModule = {
  [pin.descriptorExport]: syntheticDescriptor,
  [pin.runtimeFactoryExport]: () => ({ fixtureOnly: true })
};
const liveSyntheticLoad = await loadPinnedKaminosFluidPackage(liveRequest, async () => syntheticModule, installedEvidence);
assert(liveSyntheticLoad.ok === false, 'live package load rejects a synthetic module');
if (!liveSyntheticLoad.ok) {
  assert(liveSyntheticLoad.rejections.includes('reject-non-live-package-authority'), 'live failure names synthetic authority rejection');
}
const contractSyntheticLoad = await loadPinnedKaminosFluidPackage(contractRequest, async () => syntheticModule);
assert(contractSyntheticLoad.ok === true, 'contract-test mode can exercise loader plumbing with a synthetic module');

const liveDescriptor: KaminosFluidPackageDescriptor = {
  ...syntheticDescriptor,
  sourceAuthority: 'live_runtime'
};
const validOutput: KaminosFluidOutputEvidence = {
  packageIdentity: liveDescriptor,
  runtime: {
    requestedRoute: pin.runtimeRoute,
    effectiveRoute: pin.runtimeRoute,
    requestedRevision: pin.runtimeRevision,
    effectiveRevision: pin.runtimeRevision
  },
  representation: {
    requestedRoute: pin.representationRoute,
    effectiveRoute: pin.representationRoute
  },
  terrain: {
    frameId: adapterFrame.frameId,
    currentEpoch: adapterFrame.terrain.currentEpoch,
    supportFrameChecksum: adapterFrame.terrain.supportFrameChecksum,
    metersPerWorldUnit: adapterFrame.physicalScale.metersPerWorldUnit
  },
  output: {
    requestedRoute: pin.outputRoute,
    effectiveRoute: pin.outputRoute,
    primaryOutputWritten: true,
    partial: false,
    blank: false,
    dynamicFrameDelta: 1
  }
};

assert(validateKaminosFluidOutputEvidence(liveRequest, adapterFrame, validOutput).length === 0, 'complete current dynamic output passes the consumer gate');

const falseClosureCases: readonly [KaminosFluidOutputEvidence, string][] = [
  [{ ...validOutput, packageIdentity: { ...liveDescriptor, packageVersion: '9.9.9' } }, 'reject-substituted-package-version'],
  [{ ...validOutput, runtime: { ...validOutput.runtime, effectiveRoute: 'default-runtime' } }, 'reject-runtime-substitution'],
  [{ ...validOutput, representation: { ...validOutput.representation, effectiveRoute: 'fallback-local' } }, 'reject-representation-substitution'],
  [{ ...validOutput, terrain: { ...validOutput.terrain, currentEpoch: validOutput.terrain.currentEpoch - 1 } }, 'reject-stale-terrain-epoch'],
  [{ ...validOutput, terrain: { ...validOutput.terrain, metersPerWorldUnit: 1 } }, 'reject-physical-scale-substitution'],
  [{ ...validOutput, output: { ...validOutput.output, effectiveRoute: 'default-output' } }, 'reject-output-substitution'],
  [{ ...validOutput, output: { ...validOutput.output, primaryOutputWritten: false } }, 'reject-pre-output-failure'],
  [{ ...validOutput, output: { ...validOutput.output, partial: true } }, 'reject-partial-output'],
  [{ ...validOutput, output: { ...validOutput.output, blank: true } }, 'reject-blank-output'],
  [{ ...validOutput, output: { ...validOutput.output, dynamicFrameDelta: 0 } }, 'reject-motionless-output']
];

for (const [evidence, expectedRejection] of falseClosureCases) {
  assert(
    validateKaminosFluidOutputEvidence(liveRequest, adapterFrame, evidence).includes(expectedRejection),
    `consumer gate records ${expectedRejection}`
  );
}

assert(absentLoad.ok === false, 'blocked report fixture requires a failed package load');
if (!absentLoad.ok) {
  const blocked = createBlockedHillFluidPackageReport(liveRequest, adapterFrame, absentLoad);
  assert(blocked.schema === HILL_FLUID_PACKAGE_BLOCKED_REPORT_SCHEMA, 'blocked provider report carries schema');
  assert(blocked.ok === false, 'blocked provider report is not success');
  assert(blocked.status === 'blocked_provider', 'blocked provider report names provider state');
  assert(blocked.primaryOutputWritten === false, 'blocked provider report cannot claim output');
  assert(blocked.requestedPackage.artifactRevision === pin.artifactRevision, 'blocked report preserves requested artifact revision');
  assert(blocked.effectivePackage === null, 'blocked report has no effective package');
  assert(blocked.terrain.currentEpoch === adapterFrame.terrain.currentEpoch, 'blocked report preserves current Hill epoch');
  assert(blocked.rejections.includes('package-unavailable'), 'blocked report preserves provider failure reason');
}

console.log('watershed package consumer contracts ok');
