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
  depositLocal(options: unknown): KaminosExchangeReceipt;
  step(options: unknown): {
    schema: string;
    terrainEpoch: number;
    fluidEpoch: number;
  };
  feedback(options?: unknown): KaminosFluidTerrainFeedbackFrame;
  representation(options?: unknown): KaminosFluidRepresentationFrame;
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
    typeof runtime.depositLocal !== 'function' ||
    typeof runtime.step !== 'function' ||
    typeof runtime.feedback !== 'function' ||
    typeof runtime.representation !== 'function'
  ) {
    throw new Error('installed Kaminos package returned an incomplete runtime');
  }
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
