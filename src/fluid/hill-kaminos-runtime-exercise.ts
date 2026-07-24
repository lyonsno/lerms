import {
  validateKaminosFluidOutputEvidence,
  type KaminosFluidOutputEvidence,
  type KaminosFluidPackageLoadSuccess
} from './kaminos-fluid-package-consumer.js';
import type {
  HillFluidPackageAdapterFrame,
  KaminosTerrainFluidFrame
} from '../terrain/hill-of-hills-fluid-package-adapter.js';

export const HILL_KAMINOS_RUNTIME_EXERCISE_SCHEMA =
  'lerms.hill-of-hills.kaminos-runtime-exercise.v1' as const;

export interface KaminosRuntimeIdentity {
  schema: string;
  route: string;
  method: string;
  producerRevision: string;
  terrainEpoch: number;
  fluidEpoch: number;
}

export interface KaminosExchangeReceipt {
  schema: 'kaminos.fluid.exchange-receipt.v1';
  transactionId: string;
  lineageId: string;
  sourceRepresentation: 'local';
  destinationRepresentation: 'macro';
  terrainEpoch: number;
  fluidEpoch: number;
  allocationGeneration: number;
  supportId: string;
  transformId: string;
  debitedVolume: number;
  creditedVolume: number;
  debitedMomentum: readonly number[];
  creditedMomentum: readonly number[];
  debitedMaterials: Readonly<Record<string, number>>;
  creditedMaterials: Readonly<Record<string, number>>;
  residual: {
    volume: number;
    momentum: readonly number[];
    materials: Readonly<Record<string, number>>;
  };
  tolerance: number;
  state: 'committed';
}

export interface KaminosFluidTerrainFeedbackFrame {
  schema: 'kaminos.fluid.terrain-feedback-frame.v1';
  route: {
    requested: string;
    effective: string;
  };
  producerRevision: string;
  fluidEpoch: number;
  terrainEpoch: number;
  grid: KaminosTerrainFluidFrame['grid'];
  fields: {
    depth: Float32Array;
    wetness: Float32Array;
    tangentMomentum: Float32Array;
  };
  dirtyRegions: readonly unknown[];
  conservationReceiptIds: readonly string[];
  lineageIds: readonly string[];
  complete: boolean;
  expectedSampleCount: number;
}

export interface KaminosFluidRepresentationFrame {
  schema: 'kaminos.fluid.representation-frame.v1';
  route: {
    requested: string;
    effective: string;
  };
  producerRevision: string;
  fluidEpoch: number;
  terrainEpoch: number;
  ownershipIdentity: 'macro-local-parcel-exclusive-v1';
  conservationReceiptIds: readonly string[];
  lineageIds: readonly string[];
  complete: boolean;
  expectedSampleCount: number;
  macro: {
    grid: KaminosTerrainFluidFrame['grid'];
    method: string;
    mappedDepth: Float32Array;
    mappedMomentumU: Float32Array;
    mappedMomentumV: Float32Array;
    materialMasses: Readonly<Record<string, Float32Array>>;
  };
  local: {
    sourceBuffer: unknown;
    count: number;
    supportScale: number;
  };
  parcels: {
    sourceBuffer: unknown;
    count: number;
  };
}

export interface KaminosMappedMacroRuntime {
  readonly identity: KaminosRuntimeIdentity;
  snapshot(): unknown;
  updateTerrain(options: unknown): KaminosTerrainRemapReceipt;
  depositLocal(options: unknown): KaminosExchangeReceipt;
  step(options: unknown): {
    schema: string;
    terrainEpoch: number;
    fluidEpoch: number;
    terrainRemapReceipt?: KaminosTerrainRemapReceipt;
  };
  feedback(options?: unknown): KaminosFluidTerrainFeedbackFrame;
  representation(options?: unknown): KaminosFluidRepresentationFrame;
  retainPortableMacroSource(options: unknown): KaminosPortableMacroSourceHandle;
}

export interface KaminosPortableMacroSourceHandle {
  readonly descriptor: Readonly<Record<string, unknown>>;
  readonly status: {
    state: 'retained' | 'released';
    readGeneration: number;
  };
  read(options?: unknown): Record<string, unknown>;
  release(): boolean;
}

export interface KaminosTerrainRemapReceipt {
  schema: 'kaminos.fluid.terrain-remap-receipt.v1';
  receiptId: string;
  mode: 'ordinary_morph' | 'phase_morph';
  state: 'committed';
  terrainId: string;
  sourceId: string;
  transformId: string;
  previousTerrainEpoch: number;
  terrainEpoch: number;
  fluidEpoch: number;
  predecessorReceiptIds: readonly string[];
  lineageIds: readonly string[];
  displacedVolume: number;
  supportWork: number;
  maximumBedDisplacement: number;
  maximumSupportSpeed: number;
  deltaSeconds: number;
  motionSubstepEnvelope: number;
  residual: {
    volume: number;
    momentum: readonly number[];
    materials: Readonly<Record<string, number>>;
  };
  tolerance: number;
}

export interface HillKaminosRuntimeExerciseResult {
  schema: typeof HILL_KAMINOS_RUNTIME_EXERCISE_SCHEMA;
  ok: true;
  package: {
    requested: KaminosFluidPackageLoadSuccess['requested'];
    effective: KaminosFluidPackageLoadSuccess['effective'];
  };
  terrainFrame: KaminosTerrainFluidFrame;
  runtimeIdentity: KaminosRuntimeIdentity;
  receipt: KaminosExchangeReceipt;
  macroStepReceipts: readonly {
    schema: string;
    terrainEpoch: number;
    fluidEpoch: number;
  }[];
  feedback: KaminosFluidTerrainFeedbackFrame;
  representation: KaminosFluidRepresentationFrame;
  outwardWave: {
    depositCell: {
      x: number;
      y: number;
    };
    initialReachedCellCount: number;
    reachedCellCount: number;
    maximumRadiusCells: number;
    maximumDepth: number;
  };
  outputEvidence: KaminosFluidOutputEvidence;
  rejections: readonly [];
}

export interface HillKaminosPhaseMorphExerciseResult {
  schema: 'lerms.hill-of-hills.kaminos-phase-morph-exercise.v1';
  ok: true;
  package: {
    requested: KaminosFluidPackageLoadSuccess['requested'];
    effective: KaminosFluidPackageLoadSuccess['effective'];
  };
  terrainFrames: {
    previous: KaminosTerrainFluidFrame;
    current: KaminosTerrainFluidFrame;
  };
  depositReceipt: KaminosExchangeReceipt;
  before: {
    runtimeIdentity: KaminosRuntimeIdentity;
    feedback: KaminosFluidTerrainFeedbackFrame;
    representation: KaminosFluidRepresentationFrame;
    outwardWave: HillKaminosRuntimeExerciseResult['outwardWave'];
  };
  remapReceipt: KaminosTerrainRemapReceipt;
  after: {
    runtimeIdentity: KaminosRuntimeIdentity;
    feedback: KaminosFluidTerrainFeedbackFrame;
    representation: KaminosFluidRepresentationFrame;
    outwardWave: HillKaminosRuntimeExerciseResult['outwardWave'];
  };
  staleEpochRejection: {
    rejected: true;
    error: string;
    requestedTerrainEpoch: number;
    runtimeTerrainEpochBefore: number;
    runtimeTerrainEpochAfter: number;
    runtimeFluidEpochBefore: number;
    runtimeFluidEpochAfter: number;
  };
  rejections: readonly [];
}

export function executeHillKaminosRuntimeExercise(
  loaded: KaminosFluidPackageLoadSuccess,
  adapterFrame: HillFluidPackageAdapterFrame,
  terrainFrame: KaminosTerrainFluidFrame,
  options: {
    transactionId: string;
    lineageId: string;
    allocationGeneration: number;
    depositVolume: number;
    depositMomentum: readonly [number, number, number];
    materialMasses: Readonly<Record<string, number>>;
    stepCount: number;
    deltaSeconds: number;
    depositCell?: {
      x: number;
      y: number;
    };
  }
): HillKaminosRuntimeExerciseResult {
  requireNonempty(options.transactionId, 'transaction id');
  requireNonempty(options.lineageId, 'lineage id');
  requireNonnegativeInteger(options.allocationGeneration, 'allocation generation');
  requirePositive(options.depositVolume, 'deposit volume');
  requirePositiveInteger(options.stepCount, 'step count');
  requirePositive(options.deltaSeconds, 'step delta');
  assertCanonicalTerrainMatchesAdapter(adapterFrame, terrainFrame);

  const runtime = loaded.runtimeFactory({
    terrainFrame,
    producerRevision: loaded.effective.runtimeRevision,
    fluidEpoch: 0,
    depth: new Float64Array(terrainFrame.expectedSampleCount)
  }) as KaminosMappedMacroRuntime;
  assertRuntime(runtime);
  assertRuntimeIdentity(runtime.identity, loaded, terrainFrame);

  const depositCell = options.depositCell ?? {
    x: Math.floor(terrainFrame.grid.width / 2),
    y: Math.floor(terrainFrame.grid.height / 2)
  };
  assertDepositCell(depositCell, terrainFrame);
  const receipt = runtime.depositLocal({
    transactionId: options.transactionId,
    lineageId: options.lineageId,
    allocationGeneration: options.allocationGeneration,
    supportId: terrainFrame.terrainId,
    transformId: terrainFrame.transformId,
    fluidEpoch: runtime.identity.fluidEpoch + 1,
    deposits: [{
      x: depositCell.x,
      y: depositCell.y,
      volume: options.depositVolume,
      momentum: options.depositMomentum
    }],
    debitedMaterials: options.materialMasses,
    creditedMaterials: options.materialMasses,
    tolerance: 1e-9
  });
  assertCommittedReceipt(receipt, options, terrainFrame);

  const initialRepresentation = runtime.representation({
    requestedRoute: loaded.requested.representationRoute,
    effectiveRoute: loaded.requested.representationRoute
  });
  const initialReachedCellCount = countReachedCells(initialRepresentation.macro.mappedDepth);
  const macroStepReceipts = [];
  for (let index = 0; index < options.stepCount; index += 1) {
    macroStepReceipts.push(runtime.step({
      terrainFrame,
      deltaSeconds: options.deltaSeconds
    }));
  }

  const feedback = runtime.feedback({
    requestedRoute: loaded.requested.outputRoute,
    effectiveRoute: loaded.requested.outputRoute
  });
  const representation = runtime.representation({
    requestedRoute: loaded.requested.representationRoute,
    effectiveRoute: loaded.requested.representationRoute
  });
  const outwardWave = summarizeOutwardWave(
    representation.macro.mappedDepth,
    terrainFrame.grid.width,
    depositCell,
    initialReachedCellCount
  );
  if (outwardWave.reachedCellCount <= initialReachedCellCount || outwardWave.maximumRadiusCells <= 0) {
    throw new Error('Kaminos runtime produced no attributable outward macro wave');
  }
  if (!feedback.conservationReceiptIds.includes(receipt.transactionId)) {
    throw new Error('Kaminos terrain feedback omitted the committed local-to-macro transaction');
  }

  const runtimeIdentity = runtime.identity;
  assertRuntimeIdentity(runtimeIdentity, loaded, terrainFrame);
  const outputEvidence: KaminosFluidOutputEvidence = {
    packageIdentity: loaded.effective,
    runtime: {
      requestedRoute: loaded.requested.runtimeRoute,
      effectiveRoute: runtimeIdentity.route,
      requestedRevision: loaded.requested.runtimeRevision,
      effectiveRevision: runtimeIdentity.producerRevision
    },
    representation: {
      requestedRoute: loaded.requested.representationRoute,
      effectiveRoute: representation.route.effective
    },
    terrain: {
      frameId: adapterFrame.frameId,
      currentEpoch: terrainFrame.currentEpoch,
      supportFrameChecksum: adapterFrame.terrain.supportFrameChecksum,
      metersPerWorldUnit: terrainFrame.worldMetersPerUnit
    },
    output: {
      requestedRoute: loaded.requested.outputRoute,
      effectiveRoute: feedback.route.effective,
      primaryOutputWritten: true,
      partial: !feedback.complete || !representation.complete,
      blank: outwardWave.reachedCellCount === 0,
      dynamicFrameDelta: runtimeIdentity.fluidEpoch - receipt.fluidEpoch
    }
  };
  const rejections = validateKaminosFluidOutputEvidence(
    {
      schema: 'lerms.kaminos-fluid-package-request.v0',
      executionMode: 'live_hill',
      requestedAtMs: adapterFrame.source.timestampMs,
      requested: loaded.requested
    },
    adapterFrame,
    outputEvidence
  );
  if (rejections.length > 0) {
    throw new Error(`Kaminos runtime exercise output evidence rejected: ${rejections.join(', ')}`);
  }

  return {
    schema: HILL_KAMINOS_RUNTIME_EXERCISE_SCHEMA,
    ok: true,
    package: {
      requested: loaded.requested,
      effective: loaded.effective
    },
    terrainFrame,
    runtimeIdentity,
    receipt,
    macroStepReceipts,
    feedback,
    representation,
    outwardWave,
    outputEvidence,
    rejections: []
  };
}

export function executeHillKaminosPhaseMorphExercise(
  loaded: KaminosFluidPackageLoadSuccess,
  previousAdapterFrame: HillFluidPackageAdapterFrame,
  previousTerrainFrame: KaminosTerrainFluidFrame,
  currentAdapterFrame: HillFluidPackageAdapterFrame,
  currentTerrainFrame: KaminosTerrainFluidFrame,
  options: {
    transactionId: string;
    lineageId: string;
    allocationGeneration: number;
    depositVolume: number;
    depositMomentum: readonly [number, number, number];
    materialMasses: Readonly<Record<string, number>>;
    preRemapStepCount: number;
    postRemapStepCount: number;
    fluidDeltaSeconds: number;
    terrainDeltaSeconds: number;
    depositCell?: {
      x: number;
      y: number;
    };
  }
): HillKaminosPhaseMorphExerciseResult {
  assertCanonicalTerrainMatchesAdapter(previousAdapterFrame, previousTerrainFrame);
  assertCanonicalTerrainMatchesAdapter(currentAdapterFrame, currentTerrainFrame);
  if (
    currentTerrainFrame.priorEpoch !== previousTerrainFrame.currentEpoch ||
    currentTerrainFrame.currentEpoch !== previousTerrainFrame.currentEpoch + 1
  ) {
    throw new Error('Hill phase-morph exercise requires exactly sequential terrain epochs');
  }
  if (currentTerrainFrame.motionClass !== 'phase_morph') {
    throw new Error(`Hill phase-morph exercise received ${currentTerrainFrame.motionClass}`);
  }
  requirePositive(options.terrainDeltaSeconds, 'terrain delta');
  requirePositive(options.fluidDeltaSeconds, 'fluid delta');
  requireNonnegativeInteger(options.preRemapStepCount, 'pre-remap step count');
  requireNonnegativeInteger(options.postRemapStepCount, 'post-remap step count');

  const runtime = loaded.runtimeFactory({
    terrainFrame: previousTerrainFrame,
    producerRevision: loaded.effective.runtimeRevision,
    fluidEpoch: 0,
    depth: new Float64Array(previousTerrainFrame.expectedSampleCount)
  }) as KaminosMappedMacroRuntime;
  assertRuntime(runtime);
  assertRuntimeIdentity(runtime.identity, loaded, previousTerrainFrame);

  const depositCell = options.depositCell ?? {
    x: Math.floor(previousTerrainFrame.grid.width / 2),
    y: Math.floor(previousTerrainFrame.grid.height / 2)
  };
  assertDepositCell(depositCell, previousTerrainFrame);
  const depositReceipt = runtime.depositLocal({
    transactionId: options.transactionId,
    lineageId: options.lineageId,
    allocationGeneration: options.allocationGeneration,
    supportId: previousTerrainFrame.terrainId,
    transformId: previousTerrainFrame.transformId,
    fluidEpoch: runtime.identity.fluidEpoch + 1,
    deposits: [{
      x: depositCell.x,
      y: depositCell.y,
      volume: options.depositVolume,
      momentum: options.depositMomentum
    }],
    debitedMaterials: options.materialMasses,
    creditedMaterials: options.materialMasses,
    tolerance: 1e-9
  });
  assertCommittedReceipt(depositReceipt, options, previousTerrainFrame);

  for (let index = 0; index < options.preRemapStepCount; index += 1) {
    runtime.step({
      terrainFrame: previousTerrainFrame,
      deltaSeconds: options.fluidDeltaSeconds
    });
  }
  const beforeIdentity = runtime.identity;
  const beforeFeedback = runtime.feedback({
    requestedRoute: loaded.requested.outputRoute,
    effectiveRoute: loaded.requested.outputRoute
  });
  const beforeRepresentation = runtime.representation({
    requestedRoute: loaded.requested.representationRoute,
    effectiveRoute: loaded.requested.representationRoute
  });
  const beforeWave = summarizeOutwardWave(
    beforeRepresentation.macro.mappedDepth,
    previousTerrainFrame.grid.width,
    depositCell,
    1
  );

  const observedMotion = summarizeTerrainMotion(
    previousTerrainFrame,
    currentTerrainFrame
  );
  const remapReceipt = runtime.updateTerrain({
    terrainFrame: currentTerrainFrame,
    deltaSeconds: options.terrainDeltaSeconds,
    maximumBedDisplacement: observedMotion.maximumBedDisplacement,
    maximumSupportSpeed: observedMotion.maximumSupportSpeed,
    fluidDensityKgM3: 997,
    tolerance: 1e-9
  });
  assertCommittedRemapReceipt(
    remapReceipt,
    previousTerrainFrame,
    currentTerrainFrame,
    beforeIdentity,
    depositReceipt
  );

  const runtimeTerrainEpochBeforeStaleProbe = runtime.identity.terrainEpoch;
  const runtimeFluidEpochBeforeStaleProbe = runtime.identity.fluidEpoch;
  const skippedTerrainFrame: KaminosTerrainFluidFrame = {
    ...currentTerrainFrame,
    priorEpoch: currentTerrainFrame.currentEpoch,
    currentEpoch: currentTerrainFrame.currentEpoch + 2
  };
  let staleError: unknown;
  try {
    runtime.updateTerrain({
      terrainFrame: skippedTerrainFrame,
      deltaSeconds: options.terrainDeltaSeconds,
      maximumBedDisplacement: observedMotion.maximumBedDisplacement,
      maximumSupportSpeed: observedMotion.maximumSupportSpeed,
      fluidDensityKgM3: 997
    });
  } catch (error) {
    staleError = error;
  }
  if (!(staleError instanceof Error)) {
    throw new Error('Kaminos runtime accepted a skipped Hill terrain epoch');
  }
  const staleEpochRejection: HillKaminosPhaseMorphExerciseResult['staleEpochRejection'] = {
    rejected: true,
    error: staleError.message,
    requestedTerrainEpoch: skippedTerrainFrame.currentEpoch,
    runtimeTerrainEpochBefore: runtimeTerrainEpochBeforeStaleProbe,
    runtimeTerrainEpochAfter: runtime.identity.terrainEpoch,
    runtimeFluidEpochBefore: runtimeFluidEpochBeforeStaleProbe,
    runtimeFluidEpochAfter: runtime.identity.fluidEpoch
  };
  if (
    staleEpochRejection.runtimeTerrainEpochAfter !== runtimeTerrainEpochBeforeStaleProbe ||
    staleEpochRejection.runtimeFluidEpochAfter !== runtimeFluidEpochBeforeStaleProbe
  ) {
    throw new Error('skipped Hill epoch rejection mutated persistent runtime identity');
  }

  for (let index = 0; index < options.postRemapStepCount; index += 1) {
    runtime.step({
      terrainFrame: currentTerrainFrame,
      deltaSeconds: options.fluidDeltaSeconds
    });
  }
  const afterIdentity = runtime.identity;
  const afterFeedback = runtime.feedback({
    requestedRoute: loaded.requested.outputRoute,
    effectiveRoute: loaded.requested.outputRoute
  });
  const afterRepresentation = runtime.representation({
    requestedRoute: loaded.requested.representationRoute,
    effectiveRoute: loaded.requested.representationRoute
  });
  const afterWave = summarizeOutwardWave(
    afterRepresentation.macro.mappedDepth,
    currentTerrainFrame.grid.width,
    depositCell,
    beforeWave.initialReachedCellCount
  );
  if (
    afterFeedback.terrainEpoch !== currentTerrainFrame.currentEpoch ||
    afterRepresentation.terrainEpoch !== currentTerrainFrame.currentEpoch
  ) {
    throw new Error('phase-morph outputs lost the current Hill terrain epoch');
  }
  if (
    !afterFeedback.lineageIds.includes(depositReceipt.lineageId) ||
    !afterRepresentation.lineageIds.includes(depositReceipt.lineageId)
  ) {
    throw new Error('phase-morph outputs lost the original deposit lineage');
  }

  return {
    schema: 'lerms.hill-of-hills.kaminos-phase-morph-exercise.v1',
    ok: true,
    package: {
      requested: loaded.requested,
      effective: loaded.effective
    },
    terrainFrames: {
      previous: previousTerrainFrame,
      current: currentTerrainFrame
    },
    depositReceipt,
    before: {
      runtimeIdentity: beforeIdentity,
      feedback: beforeFeedback,
      representation: beforeRepresentation,
      outwardWave: beforeWave
    },
    remapReceipt,
    after: {
      runtimeIdentity: afterIdentity,
      feedback: afterFeedback,
      representation: afterRepresentation,
      outwardWave: afterWave
    },
    staleEpochRejection,
    rejections: []
  };
}

function assertCanonicalTerrainMatchesAdapter(
  adapterFrame: HillFluidPackageAdapterFrame,
  terrainFrame: KaminosTerrainFluidFrame
): void {
  if (terrainFrame.currentEpoch !== adapterFrame.terrain.currentEpoch) {
    throw new Error('canonical Kaminos terrain frame substituted the current Hill epoch');
  }
  if (terrainFrame.expectedSampleCount !== adapterFrame.terrain.sampleCount) {
    throw new Error('canonical Kaminos terrain frame is partial');
  }
  if (terrainFrame.worldMetersPerUnit !== adapterFrame.physicalScale.metersPerWorldUnit) {
    throw new Error('canonical Kaminos terrain frame substituted Hill physical scale');
  }
}

function assertRuntime(
  runtime: KaminosMappedMacroRuntime
): asserts runtime is KaminosMappedMacroRuntime {
  if (
    !runtime ||
    typeof runtime !== 'object' ||
    typeof runtime.updateTerrain !== 'function' ||
    typeof runtime.depositLocal !== 'function' ||
    typeof runtime.step !== 'function' ||
    typeof runtime.feedback !== 'function' ||
    typeof runtime.representation !== 'function'
  ) {
    throw new Error('installed Kaminos package returned an incomplete runtime');
  }
}

function assertCommittedRemapReceipt(
  receipt: KaminosTerrainRemapReceipt,
  previousTerrainFrame: KaminosTerrainFluidFrame,
  currentTerrainFrame: KaminosTerrainFluidFrame,
  previousRuntimeIdentity: KaminosRuntimeIdentity,
  depositReceipt: KaminosExchangeReceipt
): void {
  if (
    receipt.schema !== 'kaminos.fluid.terrain-remap-receipt.v1' ||
    receipt.state !== 'committed' ||
    receipt.mode !== 'phase_morph'
  ) {
    throw new Error('Kaminos phase-morph update did not return a committed canonical receipt');
  }
  if (
    receipt.previousTerrainEpoch !== previousTerrainFrame.currentEpoch ||
    receipt.terrainEpoch !== currentTerrainFrame.currentEpoch ||
    receipt.fluidEpoch !== previousRuntimeIdentity.fluidEpoch
  ) {
    throw new Error('Kaminos phase-morph receipt substituted terrain or fluid epoch identity');
  }
  if (
    receipt.terrainId !== currentTerrainFrame.terrainId ||
    receipt.sourceId !== currentTerrainFrame.source.effective ||
    receipt.transformId !== currentTerrainFrame.transformId
  ) {
    throw new Error('Kaminos phase-morph receipt substituted Hill identity');
  }
  if (
    !receipt.predecessorReceiptIds.includes(depositReceipt.transactionId) ||
    !receipt.lineageIds.includes(depositReceipt.lineageId)
  ) {
    throw new Error('Kaminos phase-morph receipt lost deposit predecessor or lineage identity');
  }
  const residuals = [
    receipt.residual.volume,
    ...receipt.residual.momentum,
    ...Object.values(receipt.residual.materials)
  ];
  if (
    residuals.some((value) => !Number.isFinite(value) || Math.abs(value) > receipt.tolerance)
  ) {
    throw new Error('Kaminos phase-morph receipt carries a nonconservative residual');
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

function assertRuntimeIdentity(
  identity: KaminosRuntimeIdentity,
  loaded: KaminosFluidPackageLoadSuccess,
  terrainFrame: KaminosTerrainFluidFrame
): void {
  if (identity.route !== loaded.requested.runtimeRoute) {
    throw new Error(`installed Kaminos runtime route substituted ${identity.route}`);
  }
  if (identity.producerRevision !== loaded.requested.runtimeRevision) {
    throw new Error(`installed Kaminos runtime revision substituted ${identity.producerRevision}`);
  }
  if (identity.terrainEpoch !== terrainFrame.currentEpoch) {
    throw new Error(`installed Kaminos runtime terrain epoch is stale: ${identity.terrainEpoch}`);
  }
}

function assertDepositCell(
  cell: {
    x: number;
    y: number;
  },
  terrainFrame: KaminosTerrainFluidFrame
): void {
  if (
    !Number.isInteger(cell.x) ||
    !Number.isInteger(cell.y) ||
    cell.x < 0 ||
    cell.x >= terrainFrame.grid.width ||
    cell.y < 0 ||
    cell.y >= terrainFrame.grid.height
  ) {
    throw new Error('local-to-macro deposit cell is outside the Hill grid');
  }
}

function assertCommittedReceipt(
  receipt: KaminosExchangeReceipt,
  options: {
    transactionId: string;
    lineageId: string;
    allocationGeneration: number;
    depositVolume: number;
  },
  terrainFrame: KaminosTerrainFluidFrame
): void {
  if (receipt.schema !== 'kaminos.fluid.exchange-receipt.v1' || receipt.state !== 'committed') {
    throw new Error('Kaminos local-to-macro exchange did not return a committed canonical receipt');
  }
  if (receipt.transactionId !== options.transactionId || receipt.lineageId !== options.lineageId) {
    throw new Error('Kaminos local-to-macro exchange substituted transaction identity');
  }
  if (receipt.terrainEpoch !== terrainFrame.currentEpoch) {
    throw new Error('Kaminos local-to-macro exchange receipt carries a stale Hill epoch');
  }
  if (
    Math.abs(receipt.debitedVolume - options.depositVolume) > receipt.tolerance ||
    Math.abs(receipt.creditedVolume - options.depositVolume) > receipt.tolerance ||
    Math.abs(receipt.residual.volume) > receipt.tolerance
  ) {
    throw new Error('Kaminos local-to-macro exchange receipt does not conserve deposited volume');
  }
}

function summarizeOutwardWave(
  mappedDepth: Float32Array,
  width: number,
  depositCell: {
    x: number;
    y: number;
  },
  initialReachedCellCount: number
): HillKaminosRuntimeExerciseResult['outwardWave'] {
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
    const x = index % width;
    const y = Math.floor(index / width);
    maximumRadiusCells = Math.max(
      maximumRadiusCells,
      Math.hypot(x - depositCell.x, y - depositCell.y)
    );
  }
  return {
    depositCell,
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

function requireNonempty(value: string, label: string): void {
  if (value.trim().length === 0) {
    throw new Error(`Hill Kaminos runtime exercise requires ${label}`);
  }
}

function requirePositive(value: number, label: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`Hill Kaminos runtime exercise requires positive ${label}`);
  }
}

function requirePositiveInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`Hill Kaminos runtime exercise requires positive integer ${label}`);
  }
}

function requireNonnegativeInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`Hill Kaminos runtime exercise requires nonnegative integer ${label}`);
  }
}
