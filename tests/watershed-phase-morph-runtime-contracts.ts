import { pathToFileURL } from 'node:url';
import {
  KAMINOS_FLUID_WEBGPU_PIN,
  createInstalledKaminosPackageEvidence,
  createKaminosFluidPackageRequest,
  loadPinnedKaminosFluidPackage
} from '../src/fluid/kaminos-fluid-package-consumer.js';
import { executeHillKaminosPhaseMorphExercise } from '../src/fluid/hill-kaminos-runtime-exercise.js';
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
  requestedAtMs: 90_200
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
  verifiedAtMs: 90_200
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
  throw new Error(`phase-morph package must load: ${loaded.error}`);
}
assert(loaded.effective.packageVersion === '0.2.1', 'phase-morph exercise consumes exact package 0.2.1');

const cache = createHillOfHillsLayerTileCache();
const commonParams = {
  ...defaultHillOfHillsParams,
  gridResolutionX: 24,
  gridResolutionZ: 30,
  topologyDynamicsMode: 'direct_synthesis' as const,
  ditchPhaseIntensity: 0,
  ditchPhaseLimit: 0,
  trailPhaseIntensity: 0,
  trailPhaseLimit: 0,
  topologyPhaseIntensity: 0.54,
  topologyPhaseLimit: 3,
  topologyPhaseDurationMs: 1_800
};
const source = {
  route: 'lerms/hill-of-hills/watershed-phase-morph-contract',
  frameId: 'hill-watershed-phase-morph-sequence',
  configId: 'continuity-hills-phase-morph-contract',
  sampleAgeMs: 0
};
const terrainA = createHillOfHillsTerrainWithCache(
  cache,
  {
    ...commonParams,
    topologyPhaseTimeMs: 1_760
  },
  {
    ...source,
    timestampMs: 90_000
  }
);
const terrainB = createHillOfHillsTerrainWithCache(
  cache,
  {
    ...commonParams,
    topologyPhaseTimeMs: 1_920
  },
  {
    ...source,
    timestampMs: 90_160
  }
);
assert(
  terrainB.witness.terrainEpoch === terrainA.witness.terrainEpoch + 1,
  'Hill A/B fixture crosses exactly one terrain epoch'
);
const bufferA = createHillOfHillsTerrainBuffer(terrainA);
const bufferB = createHillOfHillsTerrainBuffer(terrainB);
const adapterA = createHillFluidPackageAdapterFrame(bufferA, {
  frameId: 'hill-phase-morph-adapter-a',
  generatedAtMs: 90_000,
  freshnessBudgetMs: 250,
  priorTerrainEpoch: terrainA.witness.terrainEpoch,
  physicalScale: {
    metersPerWorldUnit: 1,
    secondsPerSimulationSecond: 1,
    gravityMetersPerSecondSquared: 9.80665
  }
});
const adapterB = createHillFluidPackageAdapterFrame(bufferB, {
  frameId: 'hill-phase-morph-adapter-b',
  generatedAtMs: 90_160,
  freshnessBudgetMs: 250,
  priorTerrainEpoch: terrainA.witness.terrainEpoch,
  physicalScale: adapterA.physicalScale
});
const terrainFrameA = createKaminosTerrainFluidFrame(adapterA, {
  producerRevision: 'f7571e987bb4cb205012798b68c7a711565fd8cd',
  requestedRoute: 'lerms/hill-of-hills/terrain-fluid-frame',
  requestedSourceId: bufferA.source.frameId,
  motionSubstepEnvelopeSeconds: 0.16
});
const terrainFrameB = createKaminosTerrainFluidFrame(adapterB, {
  producerRevision: 'f7571e987bb4cb205012798b68c7a711565fd8cd',
  requestedRoute: 'lerms/hill-of-hills/terrain-fluid-frame',
  requestedSourceId: bufferB.source.frameId,
  motionSubstepEnvelopeSeconds: 0.16
});

assert(terrainFrameA.terrainId === terrainFrameB.terrainId, 'terrain identity remains stable across Hill epochs');
assert(terrainFrameA.transformId === terrainFrameB.transformId, 'chart transform remains stable across Hill epochs');
assert(terrainFrameB.motionClass === 'phase_morph', 'next Hill frame preserves source phase-morph identity');
assert(terrainFrameB.priorEpoch === terrainFrameA.currentEpoch, 'next Hill frame names the exact prior epoch');
assert(bufferA.sampleChecksum !== bufferB.sampleChecksum, 'sequential Hill frames carry changing terrain samples');
assert(
  bufferA.witness.supportFrame.supportFrameChecksum !== bufferB.witness.supportFrame.supportFrameChecksum,
  'sequential Hill frames carry changing support state'
);
assert(bufferB.witness.dirtySampleCount > 0, 'next Hill frame carries a nonempty dirty region');

let maximumBedDisplacement = 0;
let maximumSupportSpeed = 0;
for (let index = 0; index < terrainFrameB.expectedSampleCount; index += 1) {
  maximumBedDisplacement = Math.max(
    maximumBedDisplacement,
    Math.abs(terrainFrameB.fields.bedHeight[index] - terrainFrameA.fields.bedHeight[index])
  );
  const offset = index * 3;
  maximumSupportSpeed = Math.max(
    maximumSupportSpeed,
    Math.hypot(
      terrainFrameB.fields.supportVelocity[offset],
      terrainFrameB.fields.supportVelocity[offset + 1],
      terrainFrameB.fields.supportVelocity[offset + 2]
    )
  );
}
assert(maximumBedDisplacement > 0, 'sequential Hill frame changes bed height');
assert(maximumSupportSpeed > 0, 'sequential Hill frame carries nonzero support velocity');

const result = executeHillKaminosPhaseMorphExercise(
  loaded,
  adapterA,
  terrainFrameA,
  adapterB,
  terrainFrameB,
  {
    transactionId: 'hill-phase-morph-deposit-0001',
    lineageId: 'hill-phase-morph-lineage-0001',
    allocationGeneration: 1,
    depositVolume: 0.42,
    depositMomentum: [0, 0, 0],
    materialMasses: {
      fingerJuiceKg: 418.74
    },
    preRemapStepCount: 4,
    postRemapStepCount: 4,
    fluidDeltaSeconds: 0.012,
    terrainDeltaSeconds: 0.16
  }
);

assert(result.ok, 'persistent runtime completes the sequential real-Hill phase morph');
assert(result.remapReceipt.state === 'committed', 'phase-morph remap receipt is committed');
assert(result.remapReceipt.mode === 'phase_morph', 'receipt preserves source motion identity');
assert(result.remapReceipt.previousTerrainEpoch === terrainFrameA.currentEpoch, 'receipt preserves prior Hill epoch');
assert(result.remapReceipt.terrainEpoch === terrainFrameB.currentEpoch, 'receipt advances to current Hill epoch');
assert(result.remapReceipt.fluidEpoch === result.before.runtimeIdentity.fluidEpoch, 'terrain update preserves fluid epoch');
assert(result.remapReceipt.lineageIds.includes(result.depositReceipt.lineageId), 'remap preserves deposit lineage');
assert(
  result.before.runtimeIdentity.terrainEpoch === terrainFrameA.currentEpoch &&
    result.after.runtimeIdentity.terrainEpoch === terrainFrameB.currentEpoch,
  'one persistent runtime advances from the prior to current Hill epoch'
);
assert(
  result.after.runtimeIdentity.fluidEpoch > result.before.runtimeIdentity.fluidEpoch,
  'fluid epoch continues advancing after the terrain remap'
);
assert(result.after.feedback.terrainEpoch === terrainFrameB.currentEpoch, 'feedback advances to current Hill epoch');
assert(result.after.representation.terrainEpoch === terrainFrameB.currentEpoch, 'representation advances to current Hill epoch');
assert(result.after.feedback.lineageIds.includes(result.depositReceipt.lineageId), 'feedback retains original deposit lineage');
assert(result.after.representation.lineageIds.includes(result.depositReceipt.lineageId), 'representation retains original deposit lineage');
assert(
  result.after.feedback.conservationReceiptIds.includes(result.depositReceipt.transactionId) &&
    result.after.feedback.conservationReceiptIds.includes(result.remapReceipt.receiptId),
  'feedback carries the deposit-plus-remap receipt chain'
);
assert(
  result.after.representation.conservationReceiptIds.includes(result.depositReceipt.transactionId) &&
    result.after.representation.conservationReceiptIds.includes(result.remapReceipt.receiptId),
  'representation carries the deposit-plus-remap receipt chain'
);
assert(result.staleEpochRejection.rejected, 'skipped Hill epoch fails loud');
assert(
  result.staleEpochRejection.runtimeTerrainEpochAfter === terrainFrameB.currentEpoch,
  'skipped epoch rejection does not mutate authoritative runtime terrain'
);

if (process.env.WATERSHED_PHASE_MORPH_RECEIPT === '1') {
  console.log(JSON.stringify({
    schema: result.schema,
    package: {
      requestedVersion: result.package.requested.packageVersion,
      effectiveVersion: result.package.effective.packageVersion,
      effectiveArtifactRevision: result.package.effective.artifactRevision,
      effectiveRuntimeRevision: result.package.effective.runtimeRevision
    },
    terrain: {
      terrainId: terrainFrameB.terrainId,
      transformId: terrainFrameB.transformId,
      previousEpoch: terrainFrameA.currentEpoch,
      currentEpoch: terrainFrameB.currentEpoch,
      previousSampleChecksum: bufferA.sampleChecksum,
      currentSampleChecksum: bufferB.sampleChecksum,
      previousSupportChecksum: bufferA.witness.supportFrame.supportFrameChecksum,
      currentSupportChecksum: bufferB.witness.supportFrame.supportFrameChecksum,
      motionClass: terrainFrameB.motionClass,
      maximumBedDisplacement,
      maximumSupportSpeed,
      motionSubstepEnvelope: terrainFrameB.motionSubstepEnvelope
    },
    runtime: {
      terrainEpochBefore: result.before.runtimeIdentity.terrainEpoch,
      terrainEpochAfter: result.after.runtimeIdentity.terrainEpoch,
      fluidEpochBefore: result.before.runtimeIdentity.fluidEpoch,
      fluidEpochAfter: result.after.runtimeIdentity.fluidEpoch
    },
    depositReceipt: {
      transactionId: result.depositReceipt.transactionId,
      lineageId: result.depositReceipt.lineageId
    },
    remapReceipt: result.remapReceipt,
    feedback: {
      terrainEpoch: result.after.feedback.terrainEpoch,
      fluidEpoch: result.after.feedback.fluidEpoch,
      conservationReceiptIds: result.after.feedback.conservationReceiptIds,
      lineageIds: result.after.feedback.lineageIds
    },
    representation: {
      terrainEpoch: result.after.representation.terrainEpoch,
      fluidEpoch: result.after.representation.fluidEpoch,
      conservationReceiptIds: result.after.representation.conservationReceiptIds,
      lineageIds: result.after.representation.lineageIds
    },
    staleEpochRejection: result.staleEpochRejection
  }, null, 2));
}

console.log('watershed phase morph runtime contracts ok');
