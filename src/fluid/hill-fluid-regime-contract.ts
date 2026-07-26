export const HILL_FLUID_REGIME_ROUTE =
  'lerms/hill-of-hills/conservative-fluid-regime-v0' as const;

export type HillFluidRegimeMode = 'impulse' | 'sustained' | 'waterline';

export interface HillFluidRegimeRequest {
  requestId: string;
  requested: {
    mode: HillFluidRegimeMode;
    sustainedFlowLitersPerSecond: number;
    waterlineMeters: number | null;
  };
  effective: {
    mode: HillFluidRegimeMode;
    sustainedFlowLitersPerSecond: number;
    waterlineMeters: number | null;
  };
  authority: 'operator_live_control';
  defaultSubstitution: false;
  fallback: null;
}

export interface HillFluidDeposit {
  x: number;
  y: number;
  volume: number;
  momentum: readonly [0, 0, 0];
}

export interface HillFluidDepositPlan {
  route: typeof HILL_FLUID_REGIME_ROUTE;
  requestId: string;
  mode: HillFluidRegimeMode;
  deposits: readonly HillFluidDeposit[];
  requestedVolumeM3: number;
  effectiveVolumeM3: number;
  connectedCellCount: number | null;
  sourceCell: {
    x: number;
    y: number;
  };
}

interface HillFluidGrid {
  width: number;
  height: number;
  spacing: readonly [number, number];
}

export function createHillFluidRegimeRequest(input: {
  requestId: string;
  mode: HillFluidRegimeMode;
  sustainedFlowLitersPerSecond: number;
  waterlineMeters: number | null;
  authority: 'operator_live_control';
}): HillFluidRegimeRequest {
  if (!input.requestId || input.authority !== 'operator_live_control') {
    throw new Error('Hill fluid regime requires explicit live operator authority');
  }
  if (!['impulse', 'sustained', 'waterline'].includes(input.mode)) {
    throw new Error(`unsupported Hill fluid regime: ${String(input.mode)}`);
  }
  requireNonNegativeFinite(input.sustainedFlowLitersPerSecond, 'sustained flow');
  if (input.waterlineMeters !== null && !Number.isFinite(input.waterlineMeters)) {
    throw new Error('Hill fluid waterline must be finite or null');
  }
  if (input.mode === 'impulse'
    && (input.sustainedFlowLitersPerSecond !== 0 || input.waterlineMeters !== null)) {
    throw new Error('impulse regime cannot carry sustained-flow or waterline axes');
  }
  if (input.mode === 'sustained'
    && (input.sustainedFlowLitersPerSecond <= 0 || input.waterlineMeters !== null)) {
    throw new Error('sustained regime requires positive flow and no waterline');
  }
  if (input.mode === 'waterline'
    && (input.sustainedFlowLitersPerSecond !== 0 || input.waterlineMeters === null)) {
    throw new Error('waterline regime requires one explicit elevation and no sustained flow');
  }
  const values = {
    mode: input.mode,
    sustainedFlowLitersPerSecond: input.sustainedFlowLitersPerSecond,
    waterlineMeters: input.waterlineMeters,
  };
  return {
    requestId: input.requestId,
    requested: { ...values },
    effective: { ...values },
    authority: input.authority,
    defaultSubstitution: false,
    fallback: null,
  };
}

export function createImpulseDepositPlan(input: {
  request: HillFluidRegimeRequest;
  grid: HillFluidGrid;
  sourceCell: { x: number; y: number };
}): HillFluidDepositPlan {
  requireMode(input.request, 'impulse');
  const grid = validateGrid(input.grid);
  validateSourceCell(input.sourceCell, grid);
  const cellArea = grid.spacing[0] * grid.spacing[1];
  const deposits = sourceCross(input.sourceCell, grid).map(({ x, y, weight }) => ({
    x,
    y,
    volume: cellArea * weight,
    momentum: [0, 0, 0] as const,
  }));
  const volume = sumDepositVolume(deposits);
  return createPlan(input.request, input.sourceCell, deposits, volume, null);
}

export function createSustainedDepositPlan(input: {
  request: HillFluidRegimeRequest;
  grid: HillFluidGrid;
  sourceCell: { x: number; y: number };
  elapsedWallSeconds: number;
}): HillFluidDepositPlan {
  requireMode(input.request, 'sustained');
  const grid = validateGrid(input.grid);
  validateSourceCell(input.sourceCell, grid);
  requirePositiveFinite(input.elapsedWallSeconds, 'sustained elapsed wall seconds');
  const requestedVolumeM3 =
    input.request.requested.sustainedFlowLitersPerSecond *
    input.elapsedWallSeconds /
    1_000;
  const cross = sourceCross(input.sourceCell, grid);
  const totalWeight = cross.reduce((sum, deposit) => sum + deposit.weight, 0);
  const deposits = cross.map(({ x, y, weight }) => ({
    x,
    y,
    volume: requestedVolumeM3 * weight / totalWeight,
    momentum: [0, 0, 0] as const,
  }));
  return createPlan(
    input.request,
    input.sourceCell,
    deposits,
    requestedVolumeM3,
    null,
  );
}

export function createConnectedWaterlineDepositPlan(input: {
  request: HillFluidRegimeRequest;
  grid: HillFluidGrid;
  bedHeight: ArrayLike<number>;
  currentDepth: ArrayLike<number>;
  sourceCell: { x: number; y: number };
}): HillFluidDepositPlan {
  requireMode(input.request, 'waterline');
  const grid = validateGrid(input.grid);
  validateSourceCell(input.sourceCell, grid);
  const count = grid.width * grid.height;
  if (input.bedHeight.length !== count || input.currentDepth.length !== count) {
    throw new Error('waterline terrain and depth arrays must cover the exact Hill grid');
  }
  const waterline = input.request.requested.waterlineMeters;
  if (waterline === null) throw new Error('waterline request lost its requested elevation');
  for (let index = 0; index < count; index += 1) {
    if (!Number.isFinite(input.bedHeight[index])) {
      throw new Error(`waterline bed height ${index} is invalid`);
    }
    requireNonNegativeFinite(input.currentDepth[index], `waterline current depth ${index}`);
  }

  const sourceIndex = input.sourceCell.y * grid.width + input.sourceCell.x;
  if (input.bedHeight[sourceIndex] > waterline) {
    throw new Error('waterline is below the source cell and reaches no basin');
  }
  const connected = new Uint8Array(count);
  const queue = [sourceIndex];
  connected[sourceIndex] = 1;
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const index = queue[cursor];
    const x = index % grid.width;
    const y = Math.floor(index / grid.width);
    for (const [nextX, nextY] of [
      [x - 1, y],
      [x + 1, y],
      [x, y - 1],
      [x, y + 1],
    ] as const) {
      if (nextX < 0 || nextX >= grid.width || nextY < 0 || nextY >= grid.height) continue;
      const nextIndex = nextY * grid.width + nextX;
      if (connected[nextIndex] || input.bedHeight[nextIndex] > waterline) continue;
      connected[nextIndex] = 1;
      queue.push(nextIndex);
    }
  }

  const cellArea = grid.spacing[0] * grid.spacing[1];
  const deposits: HillFluidDeposit[] = [];
  for (const index of queue) {
    const targetDepth = Math.max(0, waterline - input.bedHeight[index]);
    const deficitDepth = targetDepth - input.currentDepth[index];
    if (deficitDepth <= 1e-10) continue;
    deposits.push({
      x: index % grid.width,
      y: Math.floor(index / grid.width),
      volume: deficitDepth * cellArea,
      momentum: [0, 0, 0],
    });
  }
  if (deposits.length === 0) {
    throw new Error('waterline request produced no positive connected volume deficit');
  }
  const volume = sumDepositVolume(deposits);
  return createPlan(input.request, input.sourceCell, deposits, volume, queue.length);
}

export interface HillFluidRegimeWitness {
  schema: 'lerms.hill-of-hills.fluid-regime-witness.v0';
  status: 'live';
  route: {
    requested: typeof HILL_FLUID_REGIME_ROUTE;
    effective: typeof HILL_FLUID_REGIME_ROUTE;
    fallback: null;
  };
  request: HillFluidRegimeRequest;
  runtime: {
    authority: 'live_runtime';
    stale: false;
    terrainEpoch: number;
    fluidEpoch: number;
    simulationSeconds: number;
    wallSeconds: number;
  };
  inventory: {
    requestedDepositedLiters: number;
    effectiveDepositedLiters: number;
    currentConservedLiters: number;
    inferredFromWetArea: false;
    wetCellCount: number;
    maximumDepthMeters: number;
  };
  basin: {
    requestedWaterlineMeters: number | null;
    initializedConnectedCellCount: number | null;
  };
  conservation: {
    transactionCount: number;
    receiptIds: readonly string[];
    maximumVolumeResidualM3: number;
    complete: true;
  };
  output: {
    primaryOutputWritten: true;
    blank: false;
    partial: false;
  };
}

export function assertHillFluidRegimeWitness(
  value: unknown,
): asserts value is HillFluidRegimeWitness {
  const witness = value as Partial<HillFluidRegimeWitness>;
  if (witness.schema !== 'lerms.hill-of-hills.fluid-regime-witness.v0'
    || witness.status !== 'live'
    || witness.route?.requested !== HILL_FLUID_REGIME_ROUTE
    || witness.route.effective !== witness.route.requested
    || witness.route.fallback !== null) {
    throw new Error('Hill fluid regime witness substituted its requested route');
  }
  const request = witness.request;
  if (!request
    || request.defaultSubstitution !== false
    || request.fallback !== null
    || request.authority !== 'operator_live_control'
    || request.requested.mode !== request.effective.mode
    || request.requested.sustainedFlowLitersPerSecond !==
      request.effective.sustainedFlowLitersPerSecond
    || request.requested.waterlineMeters !== request.effective.waterlineMeters) {
    throw new Error('Hill fluid regime request was stale, defaulted, or substituted');
  }
  const runtime = witness.runtime;
  if (!runtime
    || runtime.authority !== 'live_runtime'
    || runtime.stale !== false
    || !Number.isSafeInteger(runtime.terrainEpoch)
    || !Number.isSafeInteger(runtime.fluidEpoch)
    || runtime.simulationSeconds < 0
    || runtime.wallSeconds < 0) {
    throw new Error('Hill fluid regime runtime authority is missing or stale');
  }
  const inventory = witness.inventory;
  if (!inventory
    || inventory.inferredFromWetArea !== false
    || !allNonNegativeFinite([
      inventory.requestedDepositedLiters,
      inventory.effectiveDepositedLiters,
      inventory.currentConservedLiters,
      inventory.wetCellCount,
      inventory.maximumDepthMeters,
    ])
    || Math.abs(
      inventory.requestedDepositedLiters - inventory.effectiveDepositedLiters
    ) > 1e-6) {
    throw new Error('Hill fluid inventory is inferred, invalid, or request-substituted');
  }
  const conservation = witness.conservation;
  if (!conservation
    || conservation.complete !== true
    || conservation.transactionCount <= 0
    || conservation.receiptIds.length === 0
    || conservation.receiptIds.length > conservation.transactionCount
    || !Number.isFinite(conservation.maximumVolumeResidualM3)
    || Math.abs(conservation.maximumVolumeResidualM3) > 1e-9) {
    throw new Error('Hill fluid regime lacks a complete conservative receipt chain');
  }
  const basin = witness.basin;
  if (!basin
    || (
      request.requested.mode === 'waterline' &&
      (
        basin.requestedWaterlineMeters !== request.requested.waterlineMeters ||
        !Number.isSafeInteger(basin.initializedConnectedCellCount) ||
        (basin.initializedConnectedCellCount ?? 0) <= 0
      )
    )
    || (
      request.requested.mode !== 'waterline' &&
      (
        basin.requestedWaterlineMeters !== null ||
        basin.initializedConnectedCellCount !== null
      )
    )) {
    throw new Error('Hill fluid basin connectivity evidence is missing or regime-substituted');
  }
  const output = witness.output;
  if (!output
    || output.primaryOutputWritten !== true
    || output.blank
    || output.partial) {
    throw new Error('Hill fluid regime primary output is blank, partial, or missing');
  }
}

function createPlan(
  request: HillFluidRegimeRequest,
  sourceCell: { x: number; y: number },
  deposits: readonly HillFluidDeposit[],
  requestedVolumeM3: number,
  connectedCellCount: number | null,
): HillFluidDepositPlan {
  const effectiveVolumeM3 = sumDepositVolume(deposits);
  if (Math.abs(requestedVolumeM3 - effectiveVolumeM3) > 1e-12) {
    throw new Error('Hill fluid deposit plan failed exact requested/effective volume identity');
  }
  return {
    route: HILL_FLUID_REGIME_ROUTE,
    requestId: request.requestId,
    mode: request.requested.mode,
    deposits,
    requestedVolumeM3,
    effectiveVolumeM3,
    connectedCellCount,
    sourceCell: { ...sourceCell },
  };
}

function sourceCross(
  sourceCell: { x: number; y: number },
  grid: HillFluidGrid,
): readonly { x: number; y: number; weight: number }[] {
  const candidates = [
    { x: sourceCell.x, y: sourceCell.y, weight: 0.7 },
    { x: sourceCell.x - 1, y: sourceCell.y, weight: 0.38 },
    { x: sourceCell.x + 1, y: sourceCell.y, weight: 0.38 },
    { x: sourceCell.x, y: sourceCell.y - 1, weight: 0.38 },
    { x: sourceCell.x, y: sourceCell.y + 1, weight: 0.38 },
  ];
  if (candidates.some(({ x, y }) => x < 0 || x >= grid.width || y < 0 || y >= grid.height)) {
    throw new Error('Hill fluid source cross reaches outside the terrain grid');
  }
  return candidates;
}

function sumDepositVolume(deposits: readonly HillFluidDeposit[]): number {
  const volume = deposits.reduce((sum, deposit) => sum + deposit.volume, 0);
  requirePositiveFinite(volume, 'deposit-plan volume');
  return volume;
}

function validateGrid(grid: HillFluidGrid): HillFluidGrid {
  if (!Number.isSafeInteger(grid.width) || grid.width <= 0
    || !Number.isSafeInteger(grid.height) || grid.height <= 0) {
    throw new Error('Hill fluid grid extent is invalid');
  }
  requirePositiveFinite(grid.spacing[0], 'Hill fluid grid X spacing');
  requirePositiveFinite(grid.spacing[1], 'Hill fluid grid Y spacing');
  return grid;
}

function validateSourceCell(
  sourceCell: { x: number; y: number },
  grid: HillFluidGrid,
): void {
  if (!Number.isSafeInteger(sourceCell.x) || !Number.isSafeInteger(sourceCell.y)
    || sourceCell.x < 0 || sourceCell.x >= grid.width
    || sourceCell.y < 0 || sourceCell.y >= grid.height) {
    throw new Error('Hill fluid source cell is outside the terrain grid');
  }
}

function requireMode(request: HillFluidRegimeRequest, mode: HillFluidRegimeMode): void {
  if (request.requested.mode !== mode || request.effective.mode !== mode) {
    throw new Error(`Hill fluid ${mode} planner received a substituted regime request`);
  }
}

function requirePositiveFinite(value: number, label: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be positive and finite`);
  }
}

function requireNonNegativeFinite(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be non-negative and finite`);
  }
}

function allNonNegativeFinite(values: readonly number[]): boolean {
  return values.every(value => Number.isFinite(value) && value >= 0);
}
