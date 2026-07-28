import packageJson from '../../package.json' with { type: 'json' };
import packageLock from '../../package-lock.json' with { type: 'json' };
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
  type KaminosRuntimeIdentity,
  type KaminosTerrainRemapReceipt
} from './hill-kaminos-runtime-exercise.js';
import { installedKaminosFluidPackageModule } from './kaminos-fluid-webgpu-installed.js';
import {
  createHillFluidPackageAdapterFrame,
  createKaminosTerrainFluidFrame,
  type HillFluidPackageAdapterFrame,
  type KaminosTerrainFluidFrame
} from '../terrain/hill-of-hills-fluid-package-adapter.js';
import {
  PORTABLE_MACRO_SUPPORT_GEOMETRY_CAPABILITY,
  createHillPortableMacroOpticalGeometryAdapterFrame,
  type HillPortableMacroOpticalGeometryAdapterFrame
} from '../terrain/hill-of-hills-portable-optical-geometry-adapter.js';
import {
  createHillPortableMacroOpticalProviderMount,
  createKaminosPortableMacroProviderInstallEvidence,
  retainHillPortableMacroSource,
  type HillPortableMacroOpticalProviderMount,
  type HillPortableMacroOpticalProviderMountWitness
} from './hill-kaminos-portable-optical-provider.js';
import type { HillOfHillsTerrainBuffer } from '../terrain/hill-of-hills.js';
import {
  findHillMovingSupportFirstImpact,
  type HillMovingSupportFirstImpactResult
} from '../terrain/hill-of-hills-first-impact.js';
import {
  HILL_FLUID_REGIME_ROUTE,
  assertHillFluidRegimeWitness,
  createConnectedWaterlineDepositPlan,
  createImpulseDepositPlan,
  createSustainedDepositPlan,
  type HillFluidDepositPlan,
  type HillFluidRegimeRequest,
  type HillFluidRegimeWitness
} from './hill-fluid-regime-contract.js';

export const HILL_KAMINOS_BROWSER_WITNESS_SCHEMA =
  'lerms.hill-of-hills.kaminos-browser-witness.v2' as const;

export interface HillKaminosBrowserRuntime {
  advance(timestampMs: number): void;
  remapTerrain(
    terrainBuffer: HillOfHillsTerrainBuffer,
    options: {
      producerRevision: string;
      deltaSeconds: number;
      maximumBedDisplacement: number;
      maximumSupportSpeed: number;
    }
  ): KaminosTerrainRemapReceipt;
  readonly feedback: KaminosFluidTerrainFeedbackFrame;
  readonly representation: KaminosFluidRepresentationFrame;
  readonly portableOpticalGeometry: HillPortableMacroOpticalGeometryAdapterFrame;
  readonly portableOpticalProvider: HillPortableMacroOpticalProviderMount;
  readonly movingParticleSupport: HillKaminosMovingParticleSupport;
  firstSupportImpact(options: {
    queryId: string;
    start: readonly [number, number, number];
    end: readonly [number, number, number];
  }): HillMovingSupportFirstImpactResult;
  releasePortableMacroSource(): boolean;
  readonly regime: HillFluidRegimeWitness;
  readonly witness: HillKaminosBrowserWitness;
}

export interface HillKaminosMovingParticleSupport {
  terrainFrame: KaminosTerrainFluidFrame;
  identity: {
    sourceId: string;
    terrainId: string;
    terrainEpoch: number;
    supportEpoch: number;
    remapEpoch: number;
    stale: false;
    fallbackRoute: null;
  };
}

export interface HillPortableMacroOpticalGeometryWitness {
  schema: HillPortableMacroOpticalGeometryAdapterFrame['schema'];
  frameId: string;
  descriptorIdentity: string;
  conversion: HillPortableMacroOpticalGeometryAdapterFrame['conversion'];
  providerBinding: HillPortableMacroOpticalGeometryAdapterFrame['providerBinding'];
  source: HillPortableMacroOpticalGeometryAdapterFrame['source'];
  terrain: HillPortableMacroOpticalGeometryAdapterFrame['terrain'];
  epochs: HillPortableMacroOpticalGeometryAdapterFrame['epochs'];
  motion: HillPortableMacroOpticalGeometryAdapterFrame['motion'];
  supportGeometry: HillPortableMacroOpticalGeometryAdapterFrame['supportGeometry'];
  macroState: HillPortableMacroOpticalGeometryAdapterFrame['macroState'];
  ownership: HillPortableMacroOpticalGeometryAdapterFrame['ownership'];
  conservationReceiptIds: readonly string[];
  lineageIds: readonly string[];
  sourceHandles: Readonly<Record<string, {
    handleId: string;
    owner: string;
    access: 'read_only';
    lifetime: 'frame_scoped';
    elementType: string;
    length: number;
    sampleCount: number;
    componentsPerSample: number;
  }>>;
}

export interface HillKaminosBrowserWitness {
  schema: typeof HILL_KAMINOS_BROWSER_WITNESS_SCHEMA;
  status: 'active';
  sequenceStage: 'pre_remap' | 'post_remap';
  package: {
    requested: typeof KAMINOS_FLUID_WEBGPU_PIN;
    effective: KaminosFluidPackageDescriptor;
    install: KaminosInstalledPackageEvidence;
  };
  terrain: {
    adapterFrameId: string;
    requestedRoute: string;
    effectiveRoute: string;
    producerId: string;
    producerRevision: string;
    terrainId: string;
    transformId: string;
    priorEpoch: number;
    sourceFrameId: string;
    sourceRoute: string;
    sourceConfigId?: string;
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
  remap: {
    status: 'pending' | 'committed';
    count: number;
    previousSampleChecksum: string | null;
    receipt: KaminosTerrainRemapReceipt | null;
  };
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
  regime: HillFluidRegimeWitness;
  conservationReceiptIds: readonly string[];
  portableOpticalGeometry: HillPortableMacroOpticalGeometryWitness;
  portableOpticalProvider: HillPortableMacroOpticalProviderMountWitness;
  firstImpact: HillMovingSupportFirstImpactResult;
  falseClosureRejections: readonly [];
}

export async function createHillKaminosBrowserRuntime(
  terrainBuffer: HillOfHillsTerrainBuffer,
  options: {
    producerRevision: string;
    motionSubstepEnvelopeSeconds?: number;
    regimeRequest: HillFluidRegimeRequest;
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
  const providerInstallEvidence = createKaminosPortableMacroProviderInstallEvidence(
    packageJson,
    packageLock
  );

  let adapterFrame = createHillFluidPackageAdapterFrame(terrainBuffer, {
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
  let terrainFrame = createKaminosTerrainFluidFrame(adapterFrame, {
    producerRevision: options.producerRevision,
    requestedRoute: 'lerms/hill-of-hills/terrain-fluid-frame',
    requestedSourceId: terrainBuffer.source.frameId,
    motionSubstepEnvelopeSeconds: options.motionSubstepEnvelopeSeconds
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
  const initialPlan = createInitialRegimePlan(
    options.regimeRequest,
    terrainFrame,
    center
  );
  const regimeReceipts: KaminosExchangeReceipt[] = [];
  let allocationGeneration = 0;
  let requestedDepositedVolumeM3 = 0;
  let effectiveDepositedVolumeM3 = 0;
  let maximumVolumeResidualM3 = 0;
  const commitDepositPlan = (plan: HillFluidDepositPlan): KaminosExchangeReceipt => {
    allocationGeneration += 1;
    const receipt = runtime.depositLocal({
      transactionId: [
        'hill-fluid-regime',
        options.regimeRequest.requestId,
        terrainFrame.currentEpoch,
        allocationGeneration
      ].join(':'),
      lineageId: `hill-fluid-regime:${options.regimeRequest.requestId}`,
      allocationGeneration,
      supportId: terrainFrame.terrainId,
      transformId: terrainFrame.transformId,
      fluidEpoch: runtime.identity.fluidEpoch + 1,
      deposits: plan.deposits,
      debitedMaterials: {
        fingerJuiceKg: plan.effectiveVolumeM3 * 997
      },
      creditedMaterials: {
        fingerJuiceKg: plan.effectiveVolumeM3 * 997
      },
      tolerance: 1e-9
    });
    requestedDepositedVolumeM3 += plan.requestedVolumeM3;
    effectiveDepositedVolumeM3 += receipt.creditedVolume;
    maximumVolumeResidualM3 = Math.max(
      maximumVolumeResidualM3,
      Math.abs(receipt.residual.volume)
    );
    regimeReceipts.push(receipt);
    return receipt;
  };
  const receipt = commitDepositPlan(initialPlan);
  const portableSourceHandle = retainHillPortableMacroSource(runtime, terrainFrame, {
    sourceHandleId: [
      'hill-portable-macro-source',
      terrainFrame.terrainId,
      terrainFrame.currentEpoch,
      terrainBuffer.witness.supportFrame.supportFrameChecksum
    ].join(':')
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
  let firstStepAtMs = 0;
  let wallSeconds = options.regimeRequest.requested.mode === 'sustained'
    ? 0.072
    : 0;
  let previousSampleChecksum: string | null = null;
  let remapReceipt: KaminosTerrainRemapReceipt | null = null;
  let remapCount = 0;
  let portableOpticalGeometry = createPortableOpticalGeometryFrame(
    adapterFrame,
    terrainFrame,
    representation,
    remapReceipt
  );
  let portableOpticalProvider = createHillPortableMacroOpticalProviderMount(
    loaded,
    portableSourceHandle,
    adapterFrame,
    terrainFrame,
    representation,
    remapReceipt,
    providerInstallEvidence
  );
  let firstImpact = createCenterFirstImpact(adapterFrame, terrainFrame, remapReceipt);

  const controller: HillKaminosBrowserRuntime = {
    advance(timestampMs: number): void {
      if (lastStepAtMs !== 0 && timestampMs - lastStepAtMs < 72) {
        return;
      }
      const elapsedWallSeconds = lastStepAtMs === 0
        ? 0
        : (timestampMs - lastStepAtMs) / 1_000;
      if (firstStepAtMs === 0) {
        firstStepAtMs = timestampMs;
      } else {
        wallSeconds = Math.max(
          wallSeconds,
          (timestampMs - firstStepAtMs) / 1_000 +
            (options.regimeRequest.requested.mode === 'sustained' ? 0.072 : 0)
        );
      }
      lastStepAtMs = timestampMs;
      if (
        options.regimeRequest.requested.mode === 'sustained' &&
        elapsedWallSeconds > 0
      ) {
        commitDepositPlan(createSustainedDepositPlan({
          request: options.regimeRequest,
          grid: terrainFrame.grid,
          sourceCell: center,
          elapsedWallSeconds
        }));
      }
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
      portableOpticalGeometry = createPortableOpticalGeometryFrame(
        adapterFrame,
        terrainFrame,
        representation,
        remapReceipt
      );
      portableOpticalProvider = createHillPortableMacroOpticalProviderMount(
        loaded,
        portableSourceHandle,
        adapterFrame,
        terrainFrame,
        representation,
        remapReceipt,
        providerInstallEvidence
      );
      firstImpact = createCenterFirstImpact(adapterFrame, terrainFrame, remapReceipt);
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
    remapTerrain(
      nextTerrainBuffer: HillOfHillsTerrainBuffer,
      remapOptions: {
        producerRevision: string;
        deltaSeconds: number;
        maximumBedDisplacement: number;
        maximumSupportSpeed: number;
      }
    ): KaminosTerrainRemapReceipt {
      const nextAdapterFrame = createHillFluidPackageAdapterFrame(nextTerrainBuffer, {
        frameId: `hill-kaminos-browser:${nextTerrainBuffer.sampleChecksum}`,
        generatedAtMs: nextTerrainBuffer.source.timestampMs,
        freshnessBudgetMs: Math.max(1, nextTerrainBuffer.source.sampleAgeMs),
        priorTerrainEpoch: terrainFrame.currentEpoch,
        physicalScale: adapterFrame.physicalScale
      });
      const nextTerrainFrame = createKaminosTerrainFluidFrame(nextAdapterFrame, {
        producerRevision: remapOptions.producerRevision,
        requestedRoute: terrainFrame.route.requested,
        requestedSourceId: nextTerrainBuffer.source.frameId,
        motionSubstepEnvelopeSeconds: remapOptions.deltaSeconds
      });
      const observedMotion = summarizeTerrainMotion(terrainFrame, nextTerrainFrame);
      assertMotionBound(
        observedMotion.maximumBedDisplacement,
        remapOptions.maximumBedDisplacement,
        'bed displacement'
      );
      assertMotionBound(
        observedMotion.maximumSupportSpeed,
        remapOptions.maximumSupportSpeed,
        'support speed'
      );

      const previousTerrainFrame = terrainFrame;
      const nextRemapReceipt = runtime.updateTerrain({
        terrainFrame: nextTerrainFrame,
        deltaSeconds: remapOptions.deltaSeconds,
        maximumBedDisplacement: remapOptions.maximumBedDisplacement,
        maximumSupportSpeed: remapOptions.maximumSupportSpeed,
        fluidDensityKgM3: 997,
        tolerance: 1e-9
      });
      assertRemapReceipt(
        nextRemapReceipt,
        previousTerrainFrame,
        nextTerrainFrame,
        receipt
      );

      previousSampleChecksum = adapterFrame.terrain.sampleChecksum;
      adapterFrame = nextAdapterFrame;
      terrainFrame = nextTerrainFrame;
      remapReceipt = nextRemapReceipt;
      remapCount += 1;
      feedback = runtime.feedback({
        requestedRoute: loaded.requested.outputRoute,
        effectiveRoute: loaded.requested.outputRoute
      });
      representation = runtime.representation({
        requestedRoute: loaded.requested.representationRoute,
        effectiveRoute: loaded.requested.representationRoute
      });
      portableOpticalGeometry = createPortableOpticalGeometryFrame(
        adapterFrame,
        terrainFrame,
        representation,
        remapReceipt
      );
      portableOpticalProvider = createHillPortableMacroOpticalProviderMount(
        loaded,
        portableSourceHandle,
        adapterFrame,
        terrainFrame,
        representation,
        remapReceipt,
        providerInstallEvidence
      );
      firstImpact = createCenterFirstImpact(adapterFrame, terrainFrame, remapReceipt);
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
      if (
        !feedback.conservationReceiptIds.includes(nextRemapReceipt.receiptId) ||
        !representation.conservationReceiptIds.includes(nextRemapReceipt.receiptId) ||
        !feedback.lineageIds.includes(receipt.lineageId) ||
        !representation.lineageIds.includes(receipt.lineageId)
      ) {
        throw new Error('live Hill remap output lost receipt or deposit lineage identity');
      }
      return nextRemapReceipt;
    },
    get feedback(): KaminosFluidTerrainFeedbackFrame {
      return feedback;
    },
    get representation(): KaminosFluidRepresentationFrame {
      return representation;
    },
    get portableOpticalGeometry(): HillPortableMacroOpticalGeometryAdapterFrame {
      return portableOpticalGeometry;
    },
    get portableOpticalProvider(): HillPortableMacroOpticalProviderMount {
      return portableOpticalProvider;
    },
    get movingParticleSupport(): HillKaminosMovingParticleSupport {
      return {
        terrainFrame,
        identity: {
          sourceId: terrainFrame.source.effective,
          terrainId: terrainFrame.terrainId,
          terrainEpoch: terrainFrame.currentEpoch,
          supportEpoch: adapterFrame.terrain.supportEpoch,
          remapEpoch: remapCount,
          stale: false,
          fallbackRoute: null
        }
      };
    },
    firstSupportImpact(impactOptions): HillMovingSupportFirstImpactResult {
      firstImpact = findHillMovingSupportFirstImpact(
        adapterFrame,
        terrainFrame,
        remapReceipt,
        impactOptions
      );
      return firstImpact;
    },
    releasePortableMacroSource(): boolean {
      return portableSourceHandle.release();
    },
    get regime(): HillFluidRegimeWitness {
      return createRegimeWitness(
        options.regimeRequest,
        runtime.identity,
        feedback,
        stepCount,
        wallSeconds,
        requestedDepositedVolumeM3,
        effectiveDepositedVolumeM3,
        regimeReceipts,
        maximumVolumeResidualM3,
        initialPlan.connectedCellCount
      );
    },
    get witness(): HillKaminosBrowserWitness {
      const outwardWave = summarizeWave(
        representation.macro.mappedDepth,
        terrainFrame.grid.width,
        center,
        initialReachedCellCount
      );
      const regime = createRegimeWitness(
        options.regimeRequest,
        runtime.identity,
        feedback,
        stepCount,
        wallSeconds,
        requestedDepositedVolumeM3,
        effectiveDepositedVolumeM3,
        regimeReceipts,
        maximumVolumeResidualM3,
        initialPlan.connectedCellCount
      );
      assertHillFluidRegimeWitness(regime);
      return {
        schema: HILL_KAMINOS_BROWSER_WITNESS_SCHEMA,
        status: 'active',
        sequenceStage: remapReceipt ? 'post_remap' : 'pre_remap',
        package: {
          requested: KAMINOS_FLUID_WEBGPU_PIN,
          effective: loaded.effective,
          install: installEvidence
        },
        terrain: {
          adapterFrameId: adapterFrame.frameId,
          requestedRoute: terrainFrame.route.requested,
          effectiveRoute: terrainFrame.route.effective,
          producerId: terrainFrame.producer.id,
          producerRevision: terrainFrame.producer.revision,
          terrainId: terrainFrame.terrainId,
          transformId: terrainFrame.transformId,
          priorEpoch: terrainFrame.priorEpoch,
          sourceFrameId: adapterFrame.terrain.sourceFrameId,
          sourceRoute: adapterFrame.terrain.sourceRoute,
          sourceConfigId: adapterFrame.terrain.sourceConfigId,
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
        remap: {
          status: remapReceipt ? 'committed' : 'pending',
          count: remapCount,
          previousSampleChecksum,
          receipt: remapReceipt
        },
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
        regime,
        conservationReceiptIds: feedback.conservationReceiptIds,
        portableOpticalGeometry: summarizePortableOpticalGeometry(portableOpticalGeometry),
        portableOpticalProvider: portableOpticalProvider.witness,
        firstImpact,
        falseClosureRejections: []
      };
    }
  };
  return controller;
}

function createPortableOpticalGeometryFrame(
  adapterFrame: HillFluidPackageAdapterFrame,
  terrainFrame: KaminosTerrainFluidFrame,
  representation: KaminosFluidRepresentationFrame,
  remapReceipt: KaminosTerrainRemapReceipt | null
): HillPortableMacroOpticalGeometryAdapterFrame {
  return createHillPortableMacroOpticalGeometryAdapterFrame(
    adapterFrame,
    terrainFrame,
    representation,
    remapReceipt,
    {
      frameId: [
        'hill-portable-optics',
        adapterFrame.terrain.sampleChecksum,
        representation.terrainEpoch,
        representation.fluidEpoch
      ].join(':'),
      requestedCapability: PORTABLE_MACRO_SUPPORT_GEOMETRY_CAPABILITY
    }
  );
}

function createCenterFirstImpact(
  adapterFrame: HillFluidPackageAdapterFrame,
  terrainFrame: KaminosTerrainFluidFrame,
  remapReceipt: KaminosTerrainRemapReceipt | null
): HillMovingSupportFirstImpactResult {
  const centerX = (terrainFrame.grid.width - 1) * 0.5;
  const centerZ = (terrainFrame.grid.height - 1) * 0.5;
  const worldX = terrainFrame.grid.origin[0] + centerX * terrainFrame.grid.spacing[0];
  const worldZ = terrainFrame.grid.origin[2] + centerZ * terrainFrame.grid.spacing[1];
  return findHillMovingSupportFirstImpact(
    adapterFrame,
    terrainFrame,
    remapReceipt,
    {
      queryId: `hill-center-impact:${terrainFrame.currentEpoch}`,
      start: [worldX, adapterFrame.terrain.heightRange.max + 1, worldZ],
      end: [worldX, adapterFrame.terrain.heightRange.min - 1, worldZ]
    }
  );
}

function summarizePortableOpticalGeometry(
  frame: HillPortableMacroOpticalGeometryAdapterFrame
): HillPortableMacroOpticalGeometryWitness {
  const handles = {
    bedHeight: frame.sourceHandles.bedHeight,
    jacobian: frame.sourceHandles.jacobian,
    gradient: frame.sourceHandles.gradient,
    tangentU: frame.sourceHandles.tangentU,
    tangentV: frame.sourceHandles.tangentV,
    normal: frame.sourceHandles.normal,
    supportVelocity: frame.sourceHandles.supportVelocity,
    valid: frame.sourceHandles.valid,
    mappedDepth: frame.sourceHandles.mappedDepth,
    mappedMomentumU: frame.sourceHandles.mappedMomentumU,
    mappedMomentumV: frame.sourceHandles.mappedMomentumV,
    ...Object.fromEntries(
      Object.entries(frame.sourceHandles.materialMasses).map(([name, handle]) => [
        `materialMasses.${name}`,
        handle
      ])
    )
  };
  return {
    schema: frame.schema,
    frameId: frame.frameId,
    descriptorIdentity: frame.descriptorIdentity,
    conversion: frame.conversion,
    providerBinding: frame.providerBinding,
    source: frame.source,
    terrain: frame.terrain,
    epochs: frame.epochs,
    motion: frame.motion,
    supportGeometry: frame.supportGeometry,
    macroState: frame.macroState,
    ownership: frame.ownership,
    conservationReceiptIds: frame.conservationReceiptIds,
    lineageIds: frame.lineageIds,
    sourceHandles: Object.freeze(Object.fromEntries(
      Object.entries(handles).map(([name, handle]) => [
        name,
        {
          handleId: handle.handleId,
          owner: handle.owner,
          access: handle.access,
          lifetime: handle.lifetime,
          elementType: handle.elementType,
          length: handle.length,
          sampleCount: handle.sampleCount,
          componentsPerSample: handle.componentsPerSample
        }
      ])
    ))
  };
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
    typeof runtime.representation !== 'function' ||
    typeof runtime.retainPortableMacroSource !== 'function'
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

function assertRemapReceipt(
  remapReceipt: KaminosTerrainRemapReceipt,
  previousTerrainFrame: KaminosTerrainFluidFrame,
  currentTerrainFrame: KaminosTerrainFluidFrame,
  depositReceipt: KaminosExchangeReceipt
): void {
  if (
    remapReceipt.schema !== 'kaminos.fluid.terrain-remap-receipt.v1' ||
    remapReceipt.state !== 'committed' ||
    remapReceipt.mode !== 'phase_morph' ||
    remapReceipt.previousTerrainEpoch !== previousTerrainFrame.currentEpoch ||
    remapReceipt.terrainEpoch !== currentTerrainFrame.currentEpoch ||
    remapReceipt.terrainId !== currentTerrainFrame.terrainId ||
    remapReceipt.transformId !== currentTerrainFrame.transformId ||
    !remapReceipt.predecessorReceiptIds.includes(depositReceipt.transactionId) ||
    !remapReceipt.lineageIds.includes(depositReceipt.lineageId)
  ) {
    throw new Error('live Hill terrain update substituted remap receipt identity');
  }
  const residuals = [
    remapReceipt.residual.volume,
    ...remapReceipt.residual.momentum,
    ...Object.values(remapReceipt.residual.materials)
  ];
  if (residuals.some((value) => !Number.isFinite(value) || Math.abs(value) > remapReceipt.tolerance)) {
    throw new Error('live Hill terrain update returned a nonconservative remap receipt');
  }
}

function summarizeTerrainMotion(
  previousTerrainFrame: KaminosTerrainFluidFrame,
  currentTerrainFrame: KaminosTerrainFluidFrame
): {
  maximumBedDisplacement: number;
  maximumSupportSpeed: number;
} {
  let maximumBedDisplacement = 0;
  let maximumSupportSpeed = 0;
  for (let index = 0; index < currentTerrainFrame.expectedSampleCount; index += 1) {
    maximumBedDisplacement = Math.max(
      maximumBedDisplacement,
      Math.abs(
        currentTerrainFrame.fields.bedHeight[index] -
          previousTerrainFrame.fields.bedHeight[index]
      )
    );
    const offset = index * 3;
    maximumSupportSpeed = Math.max(
      maximumSupportSpeed,
      Math.hypot(
        currentTerrainFrame.fields.supportVelocity[offset],
        currentTerrainFrame.fields.supportVelocity[offset + 1],
        currentTerrainFrame.fields.supportVelocity[offset + 2]
      )
    );
  }
  return {
    maximumBedDisplacement,
    maximumSupportSpeed
  };
}

function assertMotionBound(observed: number, maximum: number, label: string): void {
  if (!Number.isFinite(maximum) || maximum < 0 || observed > maximum + 1e-12) {
    throw new Error(`live Hill ${label} ${observed} exceeds source bound ${maximum}`);
  }
}

function createInitialRegimePlan(
  request: HillFluidRegimeRequest,
  terrainFrame: KaminosTerrainFluidFrame,
  center: { x: number; y: number }
): HillFluidDepositPlan {
  if (request.requested.mode === 'impulse') {
    return createImpulseDepositPlan({
      request,
      grid: terrainFrame.grid,
      sourceCell: center
    });
  }
  if (request.requested.mode === 'sustained') {
    return createSustainedDepositPlan({
      request,
      grid: terrainFrame.grid,
      sourceCell: center,
      elapsedWallSeconds: 0.072
    });
  }
  return createConnectedWaterlineDepositPlan({
    request,
    grid: terrainFrame.grid,
    bedHeight: terrainFrame.fields.bedHeight,
    currentDepth: new Float64Array(terrainFrame.expectedSampleCount),
    sourceCell: center
  });
}

function createRegimeWitness(
  request: HillFluidRegimeRequest,
  identity: KaminosRuntimeIdentity,
  feedback: KaminosFluidTerrainFeedbackFrame,
  stepCount: number,
  wallSeconds: number,
  requestedDepositedVolumeM3: number,
  effectiveDepositedVolumeM3: number,
  receipts: readonly KaminosExchangeReceipt[],
  maximumVolumeResidualM3: number,
  initializedConnectedCellCount: number | null
): HillFluidRegimeWitness {
  const cellArea = feedback.grid.spacing[0] * feedback.grid.spacing[1];
  let currentVolumeM3 = 0;
  let wetCellCount = 0;
  let maximumDepthMeters = 0;
  for (const depth of feedback.fields.depth) {
    currentVolumeM3 += depth * cellArea;
    if (depth > 1e-10) wetCellCount += 1;
    maximumDepthMeters = Math.max(maximumDepthMeters, depth);
  }
  const witness: HillFluidRegimeWitness = {
    schema: 'lerms.hill-of-hills.fluid-regime-witness.v0',
    status: 'live',
    route: {
      requested: HILL_FLUID_REGIME_ROUTE,
      effective: HILL_FLUID_REGIME_ROUTE,
      fallback: null
    },
    request,
    runtime: {
      authority: 'live_runtime',
      stale: false,
      terrainEpoch: identity.terrainEpoch,
      fluidEpoch: identity.fluidEpoch,
      simulationSeconds: stepCount * 0.012,
      wallSeconds
    },
    inventory: {
      requestedDepositedLiters: requestedDepositedVolumeM3 * 1_000,
      effectiveDepositedLiters: effectiveDepositedVolumeM3 * 1_000,
      currentConservedLiters: currentVolumeM3 * 1_000,
      inferredFromWetArea: false,
      wetCellCount,
      maximumDepthMeters
    },
    basin: {
      requestedWaterlineMeters: request.requested.waterlineMeters,
      initializedConnectedCellCount
    },
    conservation: {
      transactionCount: receipts.length,
      receiptIds: receipts.map(current => current.transactionId),
      maximumVolumeResidualM3,
      complete: true
    },
    output: {
      primaryOutputWritten: true,
      blank: false,
      partial: false
    }
  };
  return witness;
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
