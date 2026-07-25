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
  assertHillKaminosPhaseMorphRecipePair,
  createHillKaminosPhaseMorphRecipeBuffer
} from '../src/fluid/hill-kaminos-phase-morph-recipe.js';
import {
  createHillFluidPackageAdapterFrame,
  createKaminosTerrainFluidFrame
} from '../src/terrain/hill-of-hills-fluid-package-adapter.js';
import {
  createHillOfHillsLayerTileCache
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
assert(loaded.effective.packageVersion === '0.3.0', 'phase-morph exercise consumes exact package 0.3.0');

const cache = createHillOfHillsLayerTileCache();
const bufferA = createHillKaminosPhaseMorphRecipeBuffer(cache, 'previous');
const bufferB = createHillKaminosPhaseMorphRecipeBuffer(cache, 'current');
assertHillKaminosPhaseMorphRecipePair(bufferA, bufferB);
const adapterA = createHillFluidPackageAdapterFrame(bufferA, {
  frameId: 'hill-phase-morph-adapter-a',
  generatedAtMs: 100_000,
  freshnessBudgetMs: 250,
  priorTerrainEpoch: bufferA.witness.terrainEpoch,
  physicalScale: {
    metersPerWorldUnit: 1,
    secondsPerSimulationSecond: 1,
    gravityMetersPerSecondSquared: 9.80665
  }
});
const adapterB = createHillFluidPackageAdapterFrame(bufferB, {
  frameId: 'hill-phase-morph-adapter-b',
  generatedAtMs: 100_104,
  freshnessBudgetMs: 250,
  priorTerrainEpoch: bufferA.witness.terrainEpoch,
  physicalScale: adapterA.physicalScale
});
const terrainFrameA = createKaminosTerrainFluidFrame(adapterA, {
  producerRevision: HILL_KAMINOS_PHASE_MORPH_RECIPE.producerRevision,
  requestedRoute: 'lerms/hill-of-hills/terrain-fluid-frame',
  requestedSourceId: bufferA.source.frameId,
  motionSubstepEnvelopeSeconds: HILL_KAMINOS_PHASE_MORPH_RECIPE.motionSubstepEnvelopeSeconds
});
const terrainFrameB = createKaminosTerrainFluidFrame(adapterB, {
  producerRevision: HILL_KAMINOS_PHASE_MORPH_RECIPE.producerRevision,
  requestedRoute: 'lerms/hill-of-hills/terrain-fluid-frame',
  requestedSourceId: bufferB.source.frameId,
  motionSubstepEnvelopeSeconds: HILL_KAMINOS_PHASE_MORPH_RECIPE.motionSubstepEnvelopeSeconds
});

assert(bufferA.sampleChecksum === 'e8ea1f0c', 'previous sample checksum matches landed Hill recipe');
assert(bufferB.sampleChecksum === '1f7d3625', 'current sample checksum matches landed Hill recipe');
assert(bufferA.topologyChecksum === 'caebb5e2', 'previous topology checksum matches landed Hill recipe');
assert(bufferB.topologyChecksum === '8416fa5a', 'current topology checksum matches landed Hill recipe');
assert(
  bufferA.witness.supportFrame.supportFrameChecksum === '1abdd1f8',
  'previous support checksum matches landed Hill recipe'
);
assert(
  bufferB.witness.supportFrame.supportFrameChecksum === 'cef5f893',
  'current support checksum matches landed Hill recipe'
);
assert(bufferB.witness.dirtyRegionChecksum === 'f5b60f25', 'dirty-region checksum matches landed Hill recipe');
assert(bufferB.gridResolution.x === 72 && bufferB.gridResolution.z === 96, 'grid matches landed Hill recipe');
assert(bufferB.sampleCount === 6_912, 'sample count matches landed Hill recipe');
assert(terrainFrameA.terrainId === terrainFrameB.terrainId, 'terrain identity remains stable across Hill epochs');
assert(terrainFrameA.transformId === terrainFrameB.transformId, 'chart transform remains stable across Hill epochs');
assert(terrainFrameB.motionClass === 'phase_morph', 'next Hill frame preserves source phase-morph identity');
assert(terrainFrameB.priorEpoch === terrainFrameA.currentEpoch, 'next Hill frame names the exact prior epoch');
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
assert(
  maximumBedDisplacement === 0.021151423454284668,
  'maximum bed displacement matches landed Hill recipe'
);
assert(maximumSupportSpeed === 0.26246118545532227, 'maximum support speed matches landed Hill recipe');

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
    terrainDeltaSeconds: HILL_KAMINOS_PHASE_MORPH_RECIPE.sourceIntervalSeconds
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
