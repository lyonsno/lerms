import {
  HILL_FLUID_REGIME_ROUTE,
  assertHillFluidRegimeWitness,
  createConnectedWaterlineDepositPlan,
  createHillFluidRegimeRequest,
  createImpulseDepositPlan,
  createSustainedDepositPlan,
} from '../src/fluid/hill-fluid-regime-contract.js';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const impulseRequest = createHillFluidRegimeRequest({
  requestId: 'regime-impulse-1',
  mode: 'impulse',
  sustainedFlowLitersPerSecond: 0,
  waterlineMeters: null,
  authority: 'operator_live_control',
});
assert(impulseRequest.requested.mode === 'impulse', 'impulse request preserves requested mode');
assert(impulseRequest.effective.mode === 'impulse', 'impulse mode cannot be replaced by a default');
assert(impulseRequest.defaultSubstitution === false, 'explicit impulse request is not defaulted');

const impulse = createImpulseDepositPlan({
  request: impulseRequest,
  grid: {
    width: 72,
    height: 96,
    spacing: [11.5 / 71, 16 / 95],
  },
  sourceCell: { x: 36, y: 48 },
});
assert(impulse.deposits.length === 5, 'impulse uses the source cross');
assert(
  Math.abs(impulse.effectiveVolumeM3 - 0.06056041512231282) < 1e-12,
  'impulse preserves the measured 60.56-liter product inventory',
);

const sustainedRequest = createHillFluidRegimeRequest({
  requestId: 'regime-sustained-1',
  mode: 'sustained',
  sustainedFlowLitersPerSecond: 30,
  waterlineMeters: null,
  authority: 'operator_live_control',
});
const sustained = createSustainedDepositPlan({
  request: sustainedRequest,
  grid: {
    width: 72,
    height: 96,
    spacing: [11.5 / 71, 16 / 95],
  },
  sourceCell: { x: 36, y: 48 },
  elapsedWallSeconds: 0.1,
});
assert(
  Math.abs(sustained.requestedVolumeM3 - 0.003) < 1e-12 &&
    sustained.effectiveVolumeM3 === sustained.requestedVolumeM3,
  'sustained mode converts requested wall-clock liters per second without substitution',
);
assert(
  Math.abs(sustained.deposits.reduce((sum, deposit) => sum + deposit.volume, 0) - 0.003) < 1e-12,
  'sustained cross deposits conserve the requested interval volume',
);

const waterlineRequest = createHillFluidRegimeRequest({
  requestId: 'regime-waterline-1',
  mode: 'waterline',
  sustainedFlowLitersPerSecond: 0,
  waterlineMeters: 1,
  authority: 'operator_live_control',
});
const waterline = createConnectedWaterlineDepositPlan({
  request: waterlineRequest,
  grid: {
    width: 4,
    height: 3,
    spacing: [1, 1],
  },
  bedHeight: Float64Array.from([
    0, 0.5, 2, 0,
    0, 0.2, 2, 0.1,
    0, 0.6, 2, 0,
  ]),
  currentDepth: new Float64Array(12),
  sourceCell: { x: 0, y: 1 },
});
assert(waterline.connectedCellCount === 6, 'waterline reaches only source-connected sublevel cells');
assert(waterline.deposits.every(deposit => deposit.x < 2), 'waterline cannot jump a spill barrier');
assert(
  Math.abs(waterline.effectiveVolumeM3 - 4.7) < 1e-12,
  'waterline deposits the exact connected free-surface deficit',
);

for (const invalid of [
  {
    requestId: 'bad-default-substitution',
    mode: 'sustained',
    sustainedFlowLitersPerSecond: 0,
    waterlineMeters: null,
    authority: 'operator_live_control',
  },
  {
    requestId: 'bad-mixed-axes',
    mode: 'waterline',
    sustainedFlowLitersPerSecond: 4,
    waterlineMeters: 1,
    authority: 'operator_live_control',
  },
] as const) {
  let rejected = false;
  try {
    createHillFluidRegimeRequest(invalid);
  } catch {
    rejected = true;
  }
  assert(rejected, 'unsupported or mixed regime axes fail loud');
}

const witness = {
  schema: 'lerms.hill-of-hills.fluid-regime-witness.v0',
  status: 'live' as const,
  route: {
    requested: HILL_FLUID_REGIME_ROUTE,
    effective: HILL_FLUID_REGIME_ROUTE,
    fallback: null,
  },
  request: sustainedRequest,
  runtime: {
    authority: 'live_runtime' as const,
    stale: false,
    terrainEpoch: 1,
    fluidEpoch: 24,
    simulationSeconds: 0.24,
    wallSeconds: 1.2,
  },
  inventory: {
    requestedDepositedLiters: 36,
    effectiveDepositedLiters: 36,
    currentConservedLiters: 36,
    inferredFromWetArea: false,
    wetCellCount: 42,
    maximumDepthMeters: 0.18,
  },
  basin: {
    requestedWaterlineMeters: null,
    initializedConnectedCellCount: null,
  },
  conservation: {
    transactionCount: 12,
    receiptIds: ['sustained:1', 'sustained:2'],
    maximumVolumeResidualM3: 0,
    complete: true,
  },
  output: {
    primaryOutputWritten: true,
    blank: false,
    partial: false,
  },
};
assertHillFluidRegimeWitness(witness);

for (const invalid of [
  {
    ...witness,
    request: {
      ...witness.request,
      effective: { ...witness.request.effective, sustainedFlowLitersPerSecond: 12 },
    },
  },
  {
    ...witness,
    inventory: { ...witness.inventory, inferredFromWetArea: true },
  },
  {
    ...witness,
    conservation: { ...witness.conservation, maximumVolumeResidualM3: 0.02 },
  },
  {
    ...witness,
    output: { ...witness.output, primaryOutputWritten: false, blank: true },
  },
  {
    ...witness,
    route: {
      ...witness.route,
      effective: 'lerms/hill-of-hills/conservative-fluid-regime-v0',
      fallback: 'cached-demo',
    },
  },
  {
    ...witness,
    runtime: { ...witness.runtime, stale: true },
  },
]) {
  let rejected = false;
  try {
    assertHillFluidRegimeWitness(invalid);
  } catch {
    rejected = true;
  }
  assert(
    rejected,
    'default substitution, inferred inventory, residual, blank, fallback, and stale probes fail',
  );
}

console.log('Hill fluid regime contracts passed');
