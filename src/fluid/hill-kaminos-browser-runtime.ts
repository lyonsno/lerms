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
import type { HillOfHillsTerrainBuffer } from '../terrain/hill-of-hills.js';

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
  readonly witness: HillKaminosBrowserWitness;
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
  conservationReceiptIds: readonly string[];
  portableOpticalGeometry: HillPortableMacroOpticalGeometryWitness;
  falseClosureRejections: readonly [];
}

export async function createHillKaminosBrowserRuntime(
  terrainBuffer: HillOfHillsTerrainBuffer,
  options: {
    producerRevision: string;
    motionSubstepEnvelopeSeconds?: number;
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
  let previousSampleChecksum: string | null = null;
  let remapReceipt: KaminosTerrainRemapReceipt | null = null;
  let remapCount = 0;
  let portableOpticalGeometry = createPortableOpticalGeometryFrame(
    adapterFrame,
    terrainFrame,
    representation,
    remapReceipt
  );

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
      portableOpticalGeometry = createPortableOpticalGeometryFrame(
        adapterFrame,
        terrainFrame,
        representation,
        remapReceipt
      );
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
        conservationReceiptIds: feedback.conservationReceiptIds,
        portableOpticalGeometry: summarizePortableOpticalGeometry(portableOpticalGeometry),
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
