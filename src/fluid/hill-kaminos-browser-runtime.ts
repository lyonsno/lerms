import packageJson from '../../package.json';
import packageLock from '../../package-lock.json';
import {
  KAMINOS_FLUID_WEBGPU_PIN,
  createInstalledKaminosPackageEvidence,
  createKaminosFluidPackageRequest,
  loadPinnedKaminosFluidPackage,
  validateKaminosFluidOutputEvidence,
  type KaminosFluidOutputEvidence,
  type KaminosFluidPackageDescriptor,
  type KaminosInstalledPackageEvidence
} from './kaminos-fluid-package-consumer.js';
import {
  type KaminosExchangeReceipt,
  type KaminosFluidRepresentationFrame,
  type KaminosFluidTerrainFeedbackFrame,
  type KaminosMappedMacroRuntime,
  type KaminosRuntimeIdentity
} from './hill-kaminos-runtime-exercise.js';
import { installedKaminosFluidPackageModule } from './kaminos-fluid-webgpu-installed.js';
import {
  createHillFluidPackageAdapterFrame,
  createKaminosTerrainFluidFrame,
  type HillFluidPackageAdapterFrame,
  type KaminosTerrainFluidFrame
} from '../terrain/hill-of-hills-fluid-package-adapter.js';
import type { HillOfHillsTerrainBuffer } from '../terrain/hill-of-hills.js';

export const HILL_KAMINOS_BROWSER_WITNESS_SCHEMA =
  'lerms.hill-of-hills.kaminos-browser-witness.v1' as const;

export interface HillKaminosBrowserRuntime {
  advance(timestampMs: number): void;
  readonly feedback: KaminosFluidTerrainFeedbackFrame;
  readonly representation: KaminosFluidRepresentationFrame;
  readonly witness: HillKaminosBrowserWitness;
}

export interface HillKaminosBrowserWitness {
  schema: typeof HILL_KAMINOS_BROWSER_WITNESS_SCHEMA;
  status: 'active';
  package: {
    requested: typeof KAMINOS_FLUID_WEBGPU_PIN;
    effective: KaminosFluidPackageDescriptor;
    install: KaminosInstalledPackageEvidence;
  };
  terrain: {
    adapterFrameId: string;
    sourceFrameId: string;
    requestedSourceId: string;
    effectiveSourceId: string;
    currentEpoch: number;
    supportFrameChecksum: string;
    sampleChecksum: string;
    sampleCount: number;
    worldMetersPerUnit: number;
    motionClass: KaminosTerrainFluidFrame['motionClass'];
  };
  runtime: KaminosRuntimeIdentity;
  receipt: KaminosExchangeReceipt;
  output: {
    feedbackSchema: string;
    representationSchema: string;
    feedbackRequestedRoute: string;
    feedbackEffectiveRoute: string;
    representationRequestedRoute: string;
    representationEffectiveRoute: string;
    ownershipIdentity: string;
    primaryOutputWritten: true;
    partial: false;
    blank: boolean;
  };
  outwardWave: {
    initialReachedCellCount: number;
    reachedCellCount: number;
    maximumRadiusCells: number;
    maximumDepth: number;
  };
  dynamicFrameDelta: number;
  stepCount: number;
  conservationReceiptIds: readonly string[];
  falseClosureRejections: readonly [];
}

export async function createHillKaminosBrowserRuntime(
  terrainBuffer: HillOfHillsTerrainBuffer,
  options: {
    producerRevision: string;
  }
): Promise<HillKaminosBrowserRuntime> {
  const request = createKaminosFluidPackageRequest(KAMINOS_FLUID_WEBGPU_PIN, {
    executionMode: 'live_hill',
    requestedAtMs: terrainBuffer.source.timestampMs
  });
  const installEvidence = createInstalledKaminosPackageEvidence(
    request,
    packageJson,
    packageLock,
    {
      freshness: 'fresh',
      verifiedAtMs: Date.now()
    }
  );
  const loaded = await loadPinnedKaminosFluidPackage(
    request,
    async () => installedKaminosFluidPackageModule,
    installEvidence
  );
  if (loaded.ok === false) {
    throw new Error(`Kaminos package load failed before Hill output: ${loaded.error}`);
  }

  const adapterFrame = createHillFluidPackageAdapterFrame(terrainBuffer, {
    frameId: `hill-kaminos-browser:${terrainBuffer.sampleChecksum}`,
    generatedAtMs: terrainBuffer.source.timestampMs,
    freshnessBudgetMs: Math.max(1, terrainBuffer.source.sampleAgeMs),
    priorTerrainEpoch: terrainBuffer.witness.terrainEpoch,
    physicalScale: {
      metersPerWorldUnit: 1,
      secondsPerSimulationSecond: 1,
      gravityMetersPerSecondSquared: 9.80665
    }
  });
  const terrainFrame = createKaminosTerrainFluidFrame(adapterFrame, {
    producerRevision: options.producerRevision,
    requestedRoute: 'lerms/hill-of-hills/terrain-fluid-frame',
    requestedSourceId: terrainBuffer.source.frameId
  });
  const runtime = loaded.runtimeFactory({
    terrainFrame,
    producerRevision: loaded.effective.runtimeRevision,
    fluidEpoch: 0,
    depth: new Float64Array(terrainFrame.expectedSampleCount)
  }) as KaminosMappedMacroRuntime;
  assertRuntime(runtime, terrainFrame);

  const center = {
    x: Math.floor(terrainFrame.grid.width / 2),
    y: Math.floor(terrainFrame.grid.height / 2)
  };
  const deposits = depositCross(center, terrainFrame);
  const depositVolume = deposits.reduce((sum, deposit) => sum + deposit.volume, 0);
  const receipt = runtime.depositLocal({
    transactionId: `hill-local-to-macro:${terrainFrame.currentEpoch}:${terrainBuffer.sampleChecksum}`,
    lineageId: `hill-local-pbf:${terrainBuffer.source.frameId}`,
    allocationGeneration: 1,
    supportId: terrainFrame.terrainId,
    transformId: terrainFrame.transformId,
    fluidEpoch: runtime.identity.fluidEpoch + 1,
    deposits,
    debitedMaterials: {
      fingerJuiceKg: depositVolume * 997
    },
    creditedMaterials: {
      fingerJuiceKg: depositVolume * 997
    },
    tolerance: 1e-9
  });
  const initialRepresentation = runtime.representation({
    requestedRoute: loaded.requested.representationRoute,
    effectiveRoute: loaded.requested.representationRoute
  });
  let feedback = runtime.feedback({
    requestedRoute: loaded.requested.outputRoute,
    effectiveRoute: loaded.requested.outputRoute
  });
  let representation = initialRepresentation;
  const initialReachedCellCount = countReachedCells(initialRepresentation.macro.mappedDepth);
  let stepCount = 0;
  let lastStepAtMs = 0;

  const controller: HillKaminosBrowserRuntime = {
    advance(timestampMs: number): void {
      if (lastStepAtMs !== 0 && timestampMs - lastStepAtMs < 72) {
        return;
      }
      lastStepAtMs = timestampMs;
      runtime.step({
        terrainFrame,
        deltaSeconds: 0.012
      });
      stepCount += 1;
      feedback = runtime.feedback({
        requestedRoute: loaded.requested.outputRoute,
        effectiveRoute: loaded.requested.outputRoute
      });
      representation = runtime.representation({
        requestedRoute: loaded.requested.representationRoute,
        effectiveRoute: loaded.requested.representationRoute
      });
      assertOutputEvidence(
        request,
        loaded.effective,
        adapterFrame,
        terrainFrame,
        runtime.identity,
        receipt,
        feedback,
        representation
      );
    },
    get feedback(): KaminosFluidTerrainFeedbackFrame {
      return feedback;
    },
    get representation(): KaminosFluidRepresentationFrame {
      return representation;
    },
    get witness(): HillKaminosBrowserWitness {
      const outwardWave = summarizeWave(
        representation.macro.mappedDepth,
        terrainFrame.grid.width,
        center,
        initialReachedCellCount
      );
      return {
        schema: HILL_KAMINOS_BROWSER_WITNESS_SCHEMA,
        status: 'active',
        package: {
          requested: KAMINOS_FLUID_WEBGPU_PIN,
          effective: loaded.effective,
          install: installEvidence
        },
        terrain: {
          adapterFrameId: adapterFrame.frameId,
          sourceFrameId: adapterFrame.terrain.sourceFrameId,
          requestedSourceId: terrainFrame.source.requested,
          effectiveSourceId: terrainFrame.source.effective,
          currentEpoch: terrainFrame.currentEpoch,
          supportFrameChecksum: adapterFrame.terrain.supportFrameChecksum,
          sampleChecksum: adapterFrame.terrain.sampleChecksum,
          sampleCount: terrainFrame.actualSampleCount,
          worldMetersPerUnit: terrainFrame.worldMetersPerUnit,
          motionClass: terrainFrame.motionClass
        },
        runtime: runtime.identity,
        receipt,
        output: {
          feedbackSchema: feedback.schema,
          representationSchema: representation.schema,
          feedbackRequestedRoute: feedback.route.requested,
          feedbackEffectiveRoute: feedback.route.effective,
          representationRequestedRoute: representation.route.requested,
          representationEffectiveRoute: representation.route.effective,
          ownershipIdentity: representation.ownershipIdentity,
          primaryOutputWritten: true,
          partial: false,
          blank: outwardWave.reachedCellCount === 0
        },
        outwardWave,
        dynamicFrameDelta: runtime.identity.fluidEpoch - receipt.fluidEpoch,
        stepCount,
        conservationReceiptIds: feedback.conservationReceiptIds,
        falseClosureRejections: []
      };
    }
  };
  return controller;
}

function assertRuntime(
  runtime: KaminosMappedMacroRuntime,
  terrainFrame: KaminosTerrainFluidFrame
): void {
  if (
    !runtime ||
    typeof runtime.updateTerrain !== 'function' ||
    typeof runtime.step !== 'function' ||
    typeof runtime.depositLocal !== 'function' ||
    typeof runtime.feedback !== 'function' ||
    typeof runtime.representation !== 'function'
  ) {
    throw new Error('installed package returned an incomplete Hill runtime');
  }
  if (
    runtime.identity.route !== KAMINOS_FLUID_WEBGPU_PIN.runtimeRoute ||
    runtime.identity.producerRevision !== KAMINOS_FLUID_WEBGPU_PIN.runtimeRevision ||
    runtime.identity.terrainEpoch !== terrainFrame.currentEpoch
  ) {
    throw new Error('installed package substituted runtime route, revision, or Hill epoch');
  }
}

function depositCross(
  center: {
    x: number;
    y: number;
  },
  terrainFrame: KaminosTerrainFluidFrame
): {
  x: number;
  y: number;
  volume: number;
  momentum: readonly [0, 0, 0];
}[] {
  const cellArea = terrainFrame.grid.spacing[0] * terrainFrame.grid.spacing[1];
  const offsets: readonly (readonly [number, number])[] = [
    [0, 0],
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1]
  ];
  return offsets.map(([x, y]) => ({
    x: center.x + x,
    y: center.y + y,
    volume: cellArea * (x === 0 && y === 0 ? 0.7 : 0.38),
    momentum: [0, 0, 0]
  }));
}

function assertOutputEvidence(
  request: ReturnType<typeof createKaminosFluidPackageRequest>,
  packageIdentity: HillKaminosBrowserWitness['package']['effective'],
  adapterFrame: HillFluidPackageAdapterFrame,
  terrainFrame: KaminosTerrainFluidFrame,
  identity: KaminosRuntimeIdentity,
  receipt: KaminosExchangeReceipt,
  feedback: KaminosFluidTerrainFeedbackFrame,
  representation: KaminosFluidRepresentationFrame
): void {
  const reachedCellCount = countReachedCells(representation.macro.mappedDepth);
  const evidence: KaminosFluidOutputEvidence = {
    packageIdentity,
    runtime: {
      requestedRoute: request.requested.runtimeRoute,
      effectiveRoute: identity.route,
      requestedRevision: request.requested.runtimeRevision,
      effectiveRevision: identity.producerRevision
    },
    representation: {
      requestedRoute: request.requested.representationRoute,
      effectiveRoute: representation.route.effective
    },
    terrain: {
      frameId: adapterFrame.frameId,
      currentEpoch: terrainFrame.currentEpoch,
      supportFrameChecksum: adapterFrame.terrain.supportFrameChecksum,
      metersPerWorldUnit: terrainFrame.worldMetersPerUnit
    },
    output: {
      requestedRoute: request.requested.outputRoute,
      effectiveRoute: feedback.route.effective,
      primaryOutputWritten: true,
      partial: !feedback.complete || !representation.complete,
      blank: reachedCellCount === 0,
      dynamicFrameDelta: identity.fluidEpoch - receipt.fluidEpoch
    }
  };
  const rejections = validateKaminosFluidOutputEvidence(request, adapterFrame, evidence);
  if (rejections.length > 0) {
    throw new Error(`live Hill Kaminos output evidence rejected: ${rejections.join(', ')}`);
  }
  if (!feedback.conservationReceiptIds.includes(receipt.transactionId)) {
    throw new Error('live Hill feedback lost the local-to-macro transaction id');
  }
}

function summarizeWave(
  mappedDepth: Float32Array,
  width: number,
  center: {
    x: number;
    y: number;
  },
  initialReachedCellCount: number
): HillKaminosBrowserWitness['outwardWave'] {
  let reachedCellCount = 0;
  let maximumRadiusCells = 0;
  let maximumDepth = 0;
  for (let index = 0; index < mappedDepth.length; index += 1) {
    const depth = mappedDepth[index];
    maximumDepth = Math.max(maximumDepth, depth);
    if (depth <= 1e-10) {
      continue;
    }
    reachedCellCount += 1;
    maximumRadiusCells = Math.max(
      maximumRadiusCells,
      Math.hypot(index % width - center.x, Math.floor(index / width) - center.y)
    );
  }
  return {
    initialReachedCellCount,
    reachedCellCount,
    maximumRadiusCells,
    maximumDepth
  };
}

function countReachedCells(mappedDepth: Float32Array): number {
  let count = 0;
  for (const depth of mappedDepth) {
    if (depth > 1e-10) {
      count += 1;
    }
  }
  return count;
}
