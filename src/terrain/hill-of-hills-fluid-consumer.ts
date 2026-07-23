import type { SourceTruth, Vec3 } from '../contracts/first-vertical.js';
import type { HillOfHillsTerrainBuffer, HillOfHillsTerrainBufferMetricChannel } from './hill-of-hills.js';

export const TERRAIN_FLUID_FRAME_SCHEMA = 'lerms.hill-of-hills.terrain-fluid-frame.v0' as const;
export const FLUID_TERRAIN_FEEDBACK_FRAME_SCHEMA = 'lerms.hill-of-hills.fluid-terrain-feedback-frame.v0' as const;
export const FLUID_TERRAIN_WITNESS_SCHEMA = 'lerms.hill-of-hills.fluid-terrain-witness.v0' as const;

export interface KaminosFluidRuntimeIdentity {
  repo: string;
  branch: string;
  commit: string;
  packageName: string;
  solverIdentity: string;
  solverRoute: string;
  representationRoute: string;
  rendererRoute: string;
  sourcePath: string;
  producerDiaulos: string;
}

export interface TerrainFluidFrameOptions {
  frameId: string;
  requestedRuntime: KaminosFluidRuntimeIdentity;
  effectiveRuntime?: Partial<KaminosFluidRuntimeIdentity>;
  requestedRepresentationRoute: string;
  effectiveRepresentationRoute?: string;
  requestedOutputRoute: string;
  effectiveOutputRoute?: string;
  generatedAtMs?: number;
  terrainEpochOverride?: number;
}

export interface TerrainFluidFrame {
  schema: typeof TERRAIN_FLUID_FRAME_SCHEMA;
  frameId: string;
  source: SourceTruth;
  generatedAtMs: number;
  terrain: {
    sourceFrameId: string;
    sourceRoute: string;
    sourceConfigId?: string;
    terrainEpoch: number;
    topologyEpoch: number;
    supportFrameChecksum: string;
    sampleChecksum: string;
    topologyChecksum: string;
    proxyMaterialChecksum: string;
    gridResolution: { x: number; z: number };
    sampleCount: number;
    heightRange: { min: number; max: number };
    heightChannel: 'height';
    wetnessChannel: 'wetness';
    routePressureChannel: 'routePressure';
    surfaceVelocityChannel: 'surfaceVelocityY';
  };
  runtime: {
    requested: KaminosFluidRuntimeIdentity;
    effective: KaminosFluidRuntimeIdentity;
  };
  representation: {
    requestedRoute: string;
    effectiveRoute: string;
  };
  output: {
    requestedRoute: string;
    effectiveRoute: string;
  };
  falseClosureGuards: readonly string[];
  terrainBuffer: HillOfHillsTerrainBuffer;
}

export interface ConservativeTerrainFluidStepOptions {
  sourceWorld: Vec3;
  sourceRate: number;
  dtSeconds: number;
  damping?: number;
  dynamicFrameIndex?: number;
}

export interface FluidTerrainFeedbackFrame {
  schema: typeof FLUID_TERRAIN_FEEDBACK_FRAME_SCHEMA;
  ok: true;
  frameId: string;
  sourceFrameId: string;
  runtime: {
    requested: KaminosFluidRuntimeIdentity;
    effective: KaminosFluidRuntimeIdentity;
  };
  representation: {
    requestedRoute: string;
    effectiveRoute: string;
  };
  output: {
    requestedRoute: string;
    effectiveRoute: string;
    primaryOutputWritten: true;
    partial: false;
    blank: false;
  };
  terrain: TerrainFluidFrame['terrain'];
  fluid: {
    waterDepth: Float32Array;
    wetness: Float32Array;
    momentumX: Float32Array;
    momentumZ: Float32Array;
    totalMass: number;
    maxDepth: number;
    wetSampleCount: number;
  };
  conservation: {
    inputMass: number;
    totalMass: number;
    retainedMassRatio: number;
    solverContract: 'terrain-heightfield-conservative-water-v0';
  };
  feedback: {
    dirtySampleCount: number;
    wetnessMean: number;
    erosionPressureMean: number;
    erosionPressureMax: number;
  };
  witness: FluidTerrainWitness;
}

export interface FluidTerrainFailureReport {
  schema: typeof FLUID_TERRAIN_FEEDBACK_FRAME_SCHEMA;
  ok: false;
  frameId: string;
  sourceFrameId: string;
  failurePhase: string;
  error: string;
  primaryOutputWritten: false;
  runtime: {
    requested: KaminosFluidRuntimeIdentity;
    effective: KaminosFluidRuntimeIdentity;
  };
  representation: {
    requestedRoute: string;
    effectiveRoute: string;
  };
  output: {
    requestedRoute: string;
    effectiveRoute: string;
    primaryOutputWritten: false;
    partial: true;
    blank: true;
  };
  terrain: TerrainFluidFrame['terrain'];
  witness: FluidTerrainWitness;
}

export interface FluidTerrainWitness {
  schema: typeof FLUID_TERRAIN_WITNESS_SCHEMA;
  frameId: string;
  dynamicFrameIndex: number;
  identityComplete: boolean;
  dynamic: boolean;
  terrainCurrent: boolean;
  requestedEffectiveRuntimeMatch: boolean;
  requestedEffectiveRepresentationMatch: boolean;
  requestedEffectiveOutputMatch: boolean;
  primaryOutputWritten: boolean;
  partial: boolean;
  blank: boolean;
  falseClosureRejections: readonly string[];
}

export type FluidTerrainResult = FluidTerrainFeedbackFrame | FluidTerrainFailureReport;

const FALSE_CLOSURE_GUARDS = [
  'reject-stale-terrain-epoch',
  'reject-default-runtime-substitution',
  'reject-representation-substitution',
  'reject-output-route-substitution',
  'reject-blank-output',
  'reject-partial-output',
  'report-pre-output-failure'
] as const;

export function createTerrainFluidFrame(terrainBuffer: HillOfHillsTerrainBuffer, options: TerrainFluidFrameOptions): TerrainFluidFrame {
  const effectiveRuntime: KaminosFluidRuntimeIdentity = {
    ...options.requestedRuntime,
    ...options.effectiveRuntime
  };
  const source: SourceTruth = {
    ...terrainBuffer.source,
    route: 'lerms/hill-of-hills/terrain-fluid-frame',
    frameId: options.frameId,
    timestampMs: options.generatedAtMs ?? terrainBuffer.source.timestampMs,
    sampleAgeMs: terrainBuffer.source.sampleAgeMs,
    configId: terrainBuffer.source.configId ?? 'hill-of-hills-terrain-fluid-frame-v0'
  };

  return {
    schema: TERRAIN_FLUID_FRAME_SCHEMA,
    frameId: options.frameId,
    source,
    generatedAtMs: source.timestampMs,
    terrain: {
      sourceFrameId: terrainBuffer.source.frameId,
      sourceRoute: terrainBuffer.source.route,
      sourceConfigId: terrainBuffer.source.configId,
      terrainEpoch: options.terrainEpochOverride ?? terrainBuffer.witness.terrainEpoch,
      topologyEpoch: terrainBuffer.witness.supportFrame.topologyEpoch,
      supportFrameChecksum: terrainBuffer.witness.supportFrame.supportFrameChecksum,
      sampleChecksum: terrainBuffer.sampleChecksum,
      topologyChecksum: terrainBuffer.topologyChecksum,
      proxyMaterialChecksum: terrainBuffer.proxyMaterialChecksum,
      gridResolution: terrainBuffer.gridResolution,
      sampleCount: terrainBuffer.sampleCount,
      heightRange: terrainBuffer.heightRange,
      heightChannel: 'height',
      wetnessChannel: 'wetness',
      routePressureChannel: 'routePressure',
      surfaceVelocityChannel: 'surfaceVelocityY'
    },
    runtime: {
      requested: options.requestedRuntime,
      effective: effectiveRuntime
    },
    representation: {
      requestedRoute: options.requestedRepresentationRoute,
      effectiveRoute: options.effectiveRepresentationRoute ?? options.requestedRepresentationRoute
    },
    output: {
      requestedRoute: options.requestedOutputRoute,
      effectiveRoute: options.effectiveOutputRoute ?? options.requestedOutputRoute
    },
    falseClosureGuards: FALSE_CLOSURE_GUARDS,
    terrainBuffer
  };
}

export function runConservativeTerrainFluidStep(
  frame: TerrainFluidFrame,
  options: ConservativeTerrainFluidStepOptions
): FluidTerrainFeedbackFrame {
  const rejections = validateFrameIdentity(frame);
  if (rejections.length > 0) {
    throw new Error(`terrain-fluid identity rejected: ${rejections.join(', ')}`);
  }

  const sampleCount = frame.terrainBuffer.sampleCount;
  const waterDepth = new Float32Array(sampleCount);
  const wetness = new Float32Array(sampleCount);
  const momentumX = new Float32Array(sampleCount);
  const momentumZ = new Float32Array(sampleCount);
  const metrics = frame.terrainBuffer.metrics;
  const channels = frame.terrainBuffer.channelLayout.metrics;
  const metricStride = channels.length;
  const heightOffset = metricOffset(channels, 'height');
  const routeOffset = metricOffset(channels, 'routePressure');
  const flowOffset = metricOffset(channels, 'flowAccumulation');
  const velocityOffset = metricOffset(channels, 'surfaceVelocityY');

  let totalMass = 0;
  let maxDepth = 0;
  let wetSampleCount = 0;
  let wetnessSum = 0;
  let erosionSum = 0;
  let erosionMax = 0;
  const inputMass = Math.max(0, options.sourceRate) * Math.max(0, options.dtSeconds);
  const damping = clamp(options.damping ?? 0.985, 0, 1);

  for (let index = 0; index < sampleCount; index += 1) {
    const vectorOffset = index * 3;
    const metricBase = index * metricStride;
    const dx = frame.terrainBuffer.positions[vectorOffset] - options.sourceWorld[0];
    const dz = frame.terrainBuffer.positions[vectorOffset + 2] - options.sourceWorld[2];
    const distance = Math.hypot(dx, dz);
    const routePressure = metrics[metricBase + routeOffset];
    const flow = metrics[metricBase + flowOffset];
    const height = metrics[metricBase + heightOffset];
    const supportVelocityY = metrics[metricBase + velocityOffset];
    const sourceKernel = Math.exp(-distance * 1.35);
    const downhill = clamp((options.sourceWorld[1] - height) * 0.18, 0, 1.6);
    const depth = inputMass * sourceKernel * (0.35 + routePressure * 0.45 + flow * 0.2 + downhill * 0.3) * damping;
    const directionScale = distance > 0.0001 ? 1 / distance : 0;
    const momentumScale = depth * (0.6 + Math.abs(supportVelocityY) * 0.2);

    waterDepth[index] = depth;
    wetness[index] = clamp(depth * 8, 0, 1);
    momentumX[index] = dx * directionScale * momentumScale;
    momentumZ[index] = dz * directionScale * momentumScale;
    totalMass += depth;
    maxDepth = Math.max(maxDepth, depth);
    if (depth > 0.000001) {
      wetSampleCount += 1;
      wetnessSum += wetness[index];
      const erosion = Math.hypot(momentumX[index], momentumZ[index]) * (1 + routePressure);
      erosionSum += erosion;
      erosionMax = Math.max(erosionMax, erosion);
    }
  }

  const witness = createWitness(frame, {
    dynamicFrameIndex: options.dynamicFrameIndex ?? 1,
    primaryOutputWritten: true,
    partial: false,
    blank: maxDepth <= 0,
    dynamic: maxDepth > 0 && wetSampleCount > 0,
    rejections: []
  });

  return {
    schema: FLUID_TERRAIN_FEEDBACK_FRAME_SCHEMA,
    ok: true,
    frameId: `${frame.frameId}:feedback`,
    sourceFrameId: frame.frameId,
    runtime: frame.runtime,
    representation: frame.representation,
    output: {
      requestedRoute: frame.output.requestedRoute,
      effectiveRoute: frame.output.effectiveRoute,
      primaryOutputWritten: true,
      partial: false,
      blank: false
    },
    terrain: frame.terrain,
    fluid: {
      waterDepth,
      wetness,
      momentumX,
      momentumZ,
      totalMass,
      maxDepth,
      wetSampleCount
    },
    conservation: {
      inputMass,
      totalMass,
      retainedMassRatio: inputMass > 0 ? totalMass / inputMass : 1,
      solverContract: 'terrain-heightfield-conservative-water-v0'
    },
    feedback: {
      dirtySampleCount: wetSampleCount,
      wetnessMean: wetSampleCount > 0 ? wetnessSum / wetSampleCount : 0,
      erosionPressureMean: wetSampleCount > 0 ? erosionSum / wetSampleCount : 0,
      erosionPressureMax: erosionMax
    },
    witness
  };
}

export function createFluidTerrainFailureReport(frame: TerrainFluidFrame, failurePhase: string, error: string): FluidTerrainFailureReport {
  const rejections = validateFrameIdentity(frame);
  const witness = createWitness(frame, {
    dynamicFrameIndex: 0,
    primaryOutputWritten: false,
    partial: true,
    blank: true,
    dynamic: false,
    rejections: rejections.length > 0 ? rejections : ['pre-output-failure']
  });

  return {
    schema: FLUID_TERRAIN_FEEDBACK_FRAME_SCHEMA,
    ok: false,
    frameId: `${frame.frameId}:failure`,
    sourceFrameId: frame.frameId,
    failurePhase,
    error,
    primaryOutputWritten: false,
    runtime: frame.runtime,
    representation: frame.representation,
    output: {
      requestedRoute: frame.output.requestedRoute,
      effectiveRoute: frame.output.effectiveRoute,
      primaryOutputWritten: false,
      partial: true,
      blank: true
    },
    terrain: frame.terrain,
    witness
  };
}

export function assertFluidTerrainWitness(result: FluidTerrainResult): asserts result is FluidTerrainFeedbackFrame {
  const witness = result.witness;
  if (witness.schema !== FLUID_TERRAIN_WITNESS_SCHEMA) {
    throw new Error(`fluid terrain witness schema mismatch: ${witness.schema}`);
  }
  if (!result.ok) {
    const failure = result as FluidTerrainFailureReport;
    throw new Error(`fluid terrain witness failed before primary output: ${failure.failurePhase}`);
  }
  if (!witness.identityComplete) {
    throw new Error(`fluid terrain witness identity incomplete: ${witness.falseClosureRejections.join(', ')}`);
  }
  if (!witness.primaryOutputWritten || witness.partial || witness.blank) {
    throw new Error('fluid terrain witness primary output is blank or partial');
  }
  if (!witness.dynamic) {
    throw new Error('fluid terrain witness is not dynamic');
  }
  if (witness.falseClosureRejections.length > 0) {
    throw new Error(`fluid terrain witness rejected false closure: ${witness.falseClosureRejections.join(', ')}`);
  }
}

function validateFrameIdentity(frame: TerrainFluidFrame): string[] {
  const rejections: string[] = [];
  if (frame.runtime.requested.commit !== frame.runtime.effective.commit || frame.runtime.requested.solverRoute !== frame.runtime.effective.solverRoute) {
    rejections.push('runtime-identity-mismatch');
  }
  if (frame.representation.requestedRoute !== frame.representation.effectiveRoute) {
    rejections.push('representation-route-mismatch');
  }
  if (frame.output.requestedRoute !== frame.output.effectiveRoute) {
    rejections.push('output-route-mismatch');
  }
  if (frame.terrain.terrainEpoch !== frame.terrainBuffer.witness.terrainEpoch) {
    rejections.push('stale-terrain-epoch');
  }
  if (frame.terrain.supportFrameChecksum !== frame.terrainBuffer.witness.supportFrame.supportFrameChecksum) {
    rejections.push('support-frame-checksum-mismatch');
  }
  return rejections;
}

function createWitness(
  frame: TerrainFluidFrame,
  options: {
    dynamicFrameIndex: number;
    primaryOutputWritten: boolean;
    partial: boolean;
    blank: boolean;
    dynamic: boolean;
    rejections: readonly string[];
  }
): FluidTerrainWitness {
  const runtimeMatch =
    frame.runtime.requested.commit === frame.runtime.effective.commit &&
    frame.runtime.requested.solverRoute === frame.runtime.effective.solverRoute;
  const representationMatch = frame.representation.requestedRoute === frame.representation.effectiveRoute;
  const outputMatch = frame.output.requestedRoute === frame.output.effectiveRoute;
  const terrainCurrent = frame.terrain.terrainEpoch === frame.terrainBuffer.witness.terrainEpoch;
  const identityComplete =
    runtimeMatch &&
    representationMatch &&
    outputMatch &&
    terrainCurrent &&
    options.primaryOutputWritten &&
    !options.partial &&
    !options.blank &&
    options.dynamic &&
    options.rejections.length === 0;

  return {
    schema: FLUID_TERRAIN_WITNESS_SCHEMA,
    frameId: frame.frameId,
    dynamicFrameIndex: options.dynamicFrameIndex,
    identityComplete,
    dynamic: options.dynamic,
    terrainCurrent,
    requestedEffectiveRuntimeMatch: runtimeMatch,
    requestedEffectiveRepresentationMatch: representationMatch,
    requestedEffectiveOutputMatch: outputMatch,
    primaryOutputWritten: options.primaryOutputWritten,
    partial: options.partial,
    blank: options.blank,
    falseClosureRejections: options.rejections
  };
}

function metricOffset(channels: readonly HillOfHillsTerrainBufferMetricChannel[], channel: HillOfHillsTerrainBufferMetricChannel): number {
  const offset = channels.indexOf(channel);
  if (offset < 0) {
    throw new Error(`terrain-fluid frame missing terrain metric channel: ${channel}`);
  }
  return offset;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
