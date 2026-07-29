import {
  LERM_HORDE_PRESENTATION_SUPPORT_BINDING_SCHEMA,
  type LermHordePresentationSupportBinding,
  type LermHordePresentationSupportGeneration,
  type LermHordeSupportProfileRequest,
} from '../lerm-horde-primary-viewer-actor-frame.js';
import type { HillOfHillsTerrainBuffer } from './hill-of-hills.js';

export const HILL_GPU_RESIDENT_ROUTE =
  'lerms/hill-of-hills/gpu-resident-causal-state-v0' as const;
export const HILL_GPU_PRODUCER_EVENT_SCHEMA =
  'lerms.hill-gpu-producer-events.v0' as const;
export const HILL_GPU_RESIDENT_RECEIPT_SCHEMA =
  'lerms.hill-gpu-resident-receipt.v0' as const;
export const HILL_GPU_SUPPORT_ROUTE =
  'lerms/hill-of-hills/cpu-oracle-support-v0' as const;
export const HILL_GPU_RETAINED_TRAFFIC_DECAY_RATE = 0.08 as const;
export const HILL_GPU_MIN_GAUSSIAN_DENOMINATOR = 0.000001 as const;

export interface HillGpuRouteIdentity {
  requested: typeof HILL_GPU_RESIDENT_ROUTE;
  effective: string;
  backend: 'webgpu';
  fallbackStatus: 'none' | 'fallback';
  staleStatus: 'fresh' | 'stale';
}

export interface HillGpuInitialization {
  route: HillGpuRouteIdentity;
  generation: 0;
  addressingKey: string;
  sampleCount: number;
  gridResolution: {
    x: number;
    z: number;
  };
  domain: {
    width: number;
    length: number;
  };
  source: {
    route: string;
    frameId: string;
    topologyChecksum: string;
    supportFrameChecksum: string;
    producerTrafficFieldChecksum: string;
  };
  upload: {
    fullTerrainUploadOrdinal: 1;
    fullTerrainBytes: number;
  };
  channels: {
    retainedTraffic: {
      causal: true;
      interpolation: 'authoritative-current';
    };
    height: {
      interpolation: 'linear-compatible-addressing';
    };
    normal: {
      interpolation: 'derived';
    };
    topologyMembership: {
      interpolation: 'snap-current';
    };
  };
  basePositions: Float32Array;
  baseNormals: Float32Array;
  baseColors: Float32Array;
  topologyMembership: Uint8Array;
  materialCategory: Uint8Array;
}

export interface HillGpuProducerEvent {
  episodeId: string;
  sequence: number;
  startMs: number;
  endMs: number;
  worldX: number;
  worldZ: number;
  contactWeight: number;
  radius: number;
}

export interface HillGpuProducerEventBatch {
  schema: typeof HILL_GPU_PRODUCER_EVENT_SCHEMA;
  addressingKey: string;
  events: readonly HillGpuProducerEvent[];
  highestAdmittedEventSequence: number;
  compactPayloadBytes: number;
}

export interface HillGpuCpuOracleState {
  initialization: HillGpuInitialization;
  previousGeneration: number;
  generation: number;
  highestAdmittedEventSequence: number;
  previousTraffic: Float32Array;
  currentTraffic: Float32Array;
  previousHeights: Float32Array;
  currentHeights: Float32Array;
  identity: {
    frameId: string;
    trafficChecksum: string;
    heightChecksum: string;
  };
}

export interface HillGpuPresentationPlan {
  previousGeneration: number;
  currentGeneration: number;
  presentationAlpha: number;
  fields: {
    interpolated: readonly [
      'height',
      'continuous-material-weights',
    ];
    derived: readonly ['normal'];
    snapped: readonly [
      'retained-traffic',
      'topology-membership',
      'material-category',
      'event-identity',
      'shock-state',
    ];
  };
}

export interface HillGpuResidentReceipt {
  schema: typeof HILL_GPU_RESIDENT_RECEIPT_SCHEMA;
  ok: boolean;
  route: HillGpuRouteIdentity;
  state: {
    previousGeneration: number;
    generation: number;
    highestAdmittedEventSequence: number;
    addressingKey: string;
    trafficChecksum: string;
    heightChecksum: string;
  };
  transfer: {
    fullTerrainCpuUploads: number;
    fullFieldWorkerTransfersAfterInitialization: number;
    fullFieldReadbacksAfterInitialization: number;
  };
  ingress: {
    droppedProducerEvents: number;
  };
  query: {
    compactQueryCount: number;
    compactQueryBytes: number;
    delayedQueryCount: number;
    decisionStabilityEnvelope: number;
  };
  support: {
    bindingCount: number;
    compactPayloadBytes: number;
  };
  timing: {
    mapLatencyMs: number;
    queueLatencyMs: number;
    generationAgeMs: number;
    mainThreadWaitMs: number;
    simulationDebtMs: number;
  };
  presentation: {
    previousGeneration: number;
    currentGeneration: number;
    presentationAlpha: number;
    renderedPixelCount: number;
  };
  failure: {
    phase:
      | null
      | 'adapter'
      | 'device-request'
      | 'device-loss'
      | 'shader'
      | 'queue'
      | 'presentation';
    message: string | null;
  };
}

export function createHillGpuInitialization(
  terrain: HillOfHillsTerrainBuffer,
): HillGpuInitialization {
  requireHillGpu(
    terrain.sampleCount > 0 &&
      terrain.positions.length === terrain.sampleCount * 3 &&
      terrain.normals.length === terrain.sampleCount * 3 &&
      terrain.colors.length === terrain.sampleCount * 3,
    'canonical terrain buffer is incomplete',
  );
  const addressingKey = [
    terrain.gridResolution.x,
    terrain.gridResolution.z,
    terrain.params.length,
    terrain.params.width,
  ].join(':');
  const fullTerrainBytes = [
    terrain.positions,
    terrain.normals,
    terrain.colors,
    terrain.metrics,
    terrain.regionCodes,
    terrain.materialCodes,
    terrain.surfaceDetailCodes,
    terrain.materialEdgeCodes,
    terrain.surfaceAnchorCodes,
  ].reduce((total, channel) => total + channel.byteLength, 0);
  return {
    route: {
      requested: HILL_GPU_RESIDENT_ROUTE,
      effective: HILL_GPU_RESIDENT_ROUTE,
      backend: 'webgpu',
      fallbackStatus: 'none',
      staleStatus: 'fresh',
    },
    generation: 0,
    addressingKey,
    sampleCount: terrain.sampleCount,
    gridResolution: {
      x: terrain.gridResolution.x,
      z: terrain.gridResolution.z,
    },
    domain: {
      width: terrain.params.width,
      length: terrain.params.length,
    },
    source: {
      route: terrain.source.route,
      frameId: terrain.source.frameId,
      topologyChecksum: terrain.topologyChecksum,
      supportFrameChecksum:
        terrain.witness.supportFrame.supportFrameChecksum,
      producerTrafficFieldChecksum:
        terrain.witness.producerTrafficFieldChecksum,
    },
    upload: {
      fullTerrainUploadOrdinal: 1,
      fullTerrainBytes,
    },
    channels: {
      retainedTraffic: {
        causal: true,
        interpolation: 'authoritative-current',
      },
      height: {
        interpolation: 'linear-compatible-addressing',
      },
      normal: {
        interpolation: 'derived',
      },
      topologyMembership: {
        interpolation: 'snap-current',
      },
    },
    basePositions: terrain.positions.slice(),
    baseNormals: terrain.normals.slice(),
    baseColors: terrain.colors.slice(),
    topologyMembership: terrain.regionCodes.slice(),
    materialCategory: terrain.materialCodes.slice(),
  };
}

export function createHillGpuCpuOracleState(
  initialization: HillGpuInitialization,
): HillGpuCpuOracleState {
  validateInitialization(initialization);
  const baseHeights = extractHeights(initialization.basePositions);
  const traffic = new Float32Array(initialization.sampleCount);
  return {
    initialization,
    previousGeneration: 0,
    generation: 0,
    highestAdmittedEventSequence: -1,
    previousTraffic: traffic.slice(),
    currentTraffic: traffic,
    previousHeights: baseHeights.slice(),
    currentHeights: baseHeights,
    identity: {
      frameId: generationFrameId(initialization, 0),
      trafficChecksum: checksumFloat32(traffic),
      heightChecksum: checksumFloat32(baseHeights),
    },
  };
}

export function createHillGpuProducerEventBatch(
  initialization: HillGpuInitialization,
  events: readonly HillGpuProducerEvent[],
  highestPreviouslyAdmittedEventSequence = -1,
): HillGpuProducerEventBatch {
  validateInitialization(initialization);
  requireHillGpu(
    Number.isInteger(highestPreviouslyAdmittedEventSequence) &&
      highestPreviouslyAdmittedEventSequence >= -1,
    'previous producer event sequence must be an integer',
  );
  let highest = highestPreviouslyAdmittedEventSequence;
  let lastSequence = highestPreviouslyAdmittedEventSequence;
  const compactEvents = events.map((event) => {
    validateProducerEvent(event);
    requireHillGpu(
      event.sequence > lastSequence,
      'producer events must be strictly sequence ordered',
    );
    lastSequence = event.sequence;
    highest = event.sequence;
    return { ...event };
  });
  const compact = {
    schema: HILL_GPU_PRODUCER_EVENT_SCHEMA,
    addressingKey: initialization.addressingKey,
    events: compactEvents,
    highestAdmittedEventSequence: highest,
  } as const;
  return {
    ...compact,
    compactPayloadBytes: byteLength(compact),
  };
}

export function advanceHillGpuCpuOracle(
  state: HillGpuCpuOracleState,
  batch: HillGpuProducerEventBatch,
  deltaSeconds: number,
): HillGpuCpuOracleState {
  validateState(state);
  requireHillGpu(
    batch.schema === HILL_GPU_PRODUCER_EVENT_SCHEMA &&
      batch.addressingKey ===
        state.initialization.addressingKey,
    'producer batch uses incompatible GPU addressing',
  );
  requireHillGpu(
    Number.isFinite(deltaSeconds) && deltaSeconds > 0,
    'GPU oracle delta must be finite and positive',
  );
  requireHillGpu(
    batch.highestAdmittedEventSequence >=
      state.highestAdmittedEventSequence,
    'producer batch regressed the admitted event sequence',
  );
  if (batch.events.length > 0) {
    requireHillGpu(
      batch.events[0].sequence >
        state.highestAdmittedEventSequence,
      'producer batch replays an already admitted event sequence',
    );
  }

  const nextTraffic = new Float32Array(
    state.initialization.sampleCount,
  );
  const nextHeights = new Float32Array(
    state.initialization.sampleCount,
  );
  const retainedDecay = Math.exp(
    -HILL_GPU_RETAINED_TRAFFIC_DECAY_RATE * deltaSeconds,
  );
  for (
    let index = 0;
    index < state.initialization.sampleCount;
    index += 1
  ) {
    const offset = index * 3;
    const worldX =
      state.initialization.basePositions[offset];
    const worldZ =
      state.initialization.basePositions[offset + 2];
    let deposition = 0;
    for (const event of batch.events) {
      const dx = worldX - event.worldX;
      const dz = worldZ - event.worldZ;
      const normalizedDistance =
        (dx * dx + dz * dz) /
        Math.max(
          2 * event.radius * event.radius,
          HILL_GPU_MIN_GAUSSIAN_DENOMINATOR,
        );
      const contactDurationSeconds =
        (event.endMs - event.startMs) / 1_000;
      deposition +=
        Math.exp(-normalizedDistance) *
        event.contactWeight *
        contactDurationSeconds *
        12;
    }
    const retained =
      state.currentTraffic[index] * retainedDecay;
    const admitted =
      1 - (1 - retained) * Math.exp(-deposition);
    nextTraffic[index] = clamp(admitted, 0, 1);
    nextHeights[index] =
      state.initialization.basePositions[offset + 1] -
      nextTraffic[index] * 0.18;
  }

  const generation = state.generation + 1;
  return {
    initialization: state.initialization,
    previousGeneration: state.generation,
    generation,
    highestAdmittedEventSequence:
      batch.highestAdmittedEventSequence,
    previousTraffic: state.currentTraffic.slice(),
    currentTraffic: nextTraffic,
    previousHeights: state.currentHeights.slice(),
    currentHeights: nextHeights,
    identity: {
      frameId: generationFrameId(
        state.initialization,
        generation,
      ),
      trafficChecksum: checksumFloat32(nextTraffic),
      heightChecksum: checksumFloat32(nextHeights),
    },
  };
}

export function createHillGpuPresentationPlan(
  state: HillGpuCpuOracleState,
  presentationAlpha: number,
): HillGpuPresentationPlan {
  validateState(state);
  requireUnitInterval(
    presentationAlpha,
    'presentation alpha',
  );
  return {
    previousGeneration: state.previousGeneration,
    currentGeneration: state.generation,
    presentationAlpha,
    fields: {
      interpolated: [
        'height',
        'continuous-material-weights',
      ],
      derived: ['normal'],
      snapped: [
        'retained-traffic',
        'topology-membership',
        'material-category',
        'event-identity',
        'shock-state',
      ],
    },
  };
}

export function createHillGpuSupportBinding(
  state: HillGpuCpuOracleState,
  request: LermHordeSupportProfileRequest,
  presentationAlpha: number,
): LermHordePresentationSupportBinding {
  validateState(state);
  validateSupportRequest(request);
  requireUnitInterval(
    presentationAlpha,
    'support presentation alpha',
  );
  const previous = createSupportGeneration(
    state,
    request,
    'previous',
  );
  const current = createSupportGeneration(
    state,
    request,
    'current',
  );
  const compact = {
    schema: LERM_HORDE_PRESENTATION_SUPPORT_BINDING_SCHEMA,
    route: {
      requested: HILL_GPU_SUPPORT_ROUTE,
      effective: HILL_GPU_SUPPORT_ROUTE,
      backend: 'cpu-oracle',
      fallbackStatus: 'none',
      staleStatus: 'fresh',
    },
    request,
    presentationAlpha,
    previous,
    current,
  } as const;
  return {
    ...compact,
    timing: {
      compactPayloadBytes: byteLength(compact),
      mapLatencyMs: 0,
      queueLatencyMs: 0,
      generationAgeMs: 0,
      mainThreadWaitMs: 0,
      synchronousAtPresentationFrequency: false,
    },
  };
}

export function createHillGpuResidentReceipt(input: {
  state: HillGpuCpuOracleState;
  presentation: HillGpuPresentationPlan;
  renderedPixelCount: number;
  compactQueryCount: number;
  compactQueryBytes: number;
  supportBindingCount: number;
  supportBindingBytes: number;
  mapLatencyMs: number;
  queueLatencyMs: number;
  generationAgeMs: number;
  mainThreadWaitMs: number;
  simulationDebtMs: number;
  droppedProducerEvents: number;
  delayedQueryCount: number;
  decisionStabilityEnvelope: number;
  failure?: HillGpuResidentReceipt['failure'];
}): HillGpuResidentReceipt {
  validateState(input.state);
  const receipt: HillGpuResidentReceipt = {
    schema: HILL_GPU_RESIDENT_RECEIPT_SCHEMA,
    ok: input.failure?.phase == null,
    route: { ...input.state.initialization.route },
    state: {
      previousGeneration: input.state.previousGeneration,
      generation: input.state.generation,
      highestAdmittedEventSequence:
        input.state.highestAdmittedEventSequence,
      addressingKey:
        input.state.initialization.addressingKey,
      trafficChecksum: input.state.identity.trafficChecksum,
      heightChecksum: input.state.identity.heightChecksum,
    },
    transfer: {
      fullTerrainCpuUploads:
        input.state.initialization.upload
          .fullTerrainUploadOrdinal,
      fullFieldWorkerTransfersAfterInitialization: 0,
      fullFieldReadbacksAfterInitialization: 0,
    },
    ingress: {
      droppedProducerEvents: input.droppedProducerEvents,
    },
    query: {
      compactQueryCount: input.compactQueryCount,
      compactQueryBytes: input.compactQueryBytes,
      delayedQueryCount: input.delayedQueryCount,
      decisionStabilityEnvelope:
        input.decisionStabilityEnvelope,
    },
    support: {
      bindingCount: input.supportBindingCount,
      compactPayloadBytes: input.supportBindingBytes,
    },
    timing: {
      mapLatencyMs: input.mapLatencyMs,
      queueLatencyMs: input.queueLatencyMs,
      generationAgeMs: input.generationAgeMs,
      mainThreadWaitMs: input.mainThreadWaitMs,
      simulationDebtMs: input.simulationDebtMs,
    },
    presentation: {
      previousGeneration:
        input.presentation.previousGeneration,
      currentGeneration:
        input.presentation.currentGeneration,
      presentationAlpha:
        input.presentation.presentationAlpha,
      renderedPixelCount: input.renderedPixelCount,
    },
    failure: input.failure ?? {
      phase: null,
      message: null,
    },
  };
  receipt.ok = receipt.failure.phase === null;
  return receipt;
}

export function assertHillGpuResidentReceipt(
  receipt: HillGpuResidentReceipt,
): asserts receipt is HillGpuResidentReceipt {
  requireHillGpu(
    receipt?.schema === HILL_GPU_RESIDENT_RECEIPT_SCHEMA,
    'GPU resident receipt schema is unsupported',
  );
  requireHillGpu(
    receipt.route.requested === HILL_GPU_RESIDENT_ROUTE &&
      receipt.route.effective === HILL_GPU_RESIDENT_ROUTE &&
      receipt.route.backend === 'webgpu' &&
      receipt.route.fallbackStatus === 'none',
    'GPU resident receipt effective route cannot use fallback',
  );
  requireHillGpu(
    receipt.route.staleStatus === 'fresh',
    'GPU resident receipt must be fresh, not stale',
  );
  requireHillGpu(
    receipt.failure.phase === null &&
      receipt.failure.message === null,
    `GPU resident receipt reports failure phase ${String(
      receipt.failure.phase,
    )}`,
  );
  requireHillGpu(
    receipt.ok,
    'GPU resident receipt cannot close with ok=false',
  );
  requireHillGpu(
    receipt.transfer.fullTerrainCpuUploads === 1,
    'GPU terrain requires exactly one full initialization upload',
  );
  requireHillGpu(
    receipt.transfer
      .fullFieldWorkerTransfersAfterInitialization === 0,
    'GPU terrain cannot transfer full fields after initialization',
  );
  requireHillGpu(
    receipt.transfer
      .fullFieldReadbacksAfterInitialization === 0,
    'GPU terrain cannot read back full fields after initialization',
  );
  requireHillGpu(
    Number.isInteger(
      receipt.presentation.renderedPixelCount,
    ) && receipt.presentation.renderedPixelCount > 0,
    'GPU presentation is blank: rendered pixel count must be positive',
  );
  requireHillGpu(
    receipt.presentation.previousGeneration ===
      receipt.state.previousGeneration &&
      receipt.presentation.currentGeneration ===
        receipt.state.generation,
    'GPU presentation generations do not match resident state',
  );
  requireUnitInterval(
    receipt.presentation.presentationAlpha,
    'receipt presentation alpha',
  );
  for (const [name, value] of Object.entries({
    ...receipt.ingress,
    ...receipt.query,
    ...receipt.support,
    ...receipt.timing,
  })) {
    requireHillGpu(
      typeof value === 'number' &&
        Number.isFinite(value) &&
        value >= 0,
      `GPU receipt ${name} must be finite and nonnegative`,
    );
  }
}

function createSupportGeneration(
  state: HillGpuCpuOracleState,
  request: LermHordeSupportProfileRequest,
  generationKind: 'previous' | 'current',
): LermHordePresentationSupportGeneration {
  const generation =
    generationKind === 'previous'
      ? state.previousGeneration
      : state.generation;
  const heights =
    generationKind === 'previous'
      ? state.previousHeights
      : state.currentHeights;
  const traffic =
    generationKind === 'previous'
      ? state.previousTraffic
      : state.currentTraffic;
  return {
    generation,
    identity: {
      route: HILL_GPU_RESIDENT_ROUTE,
      frameId: generationFrameId(
        state.initialization,
        generation,
      ),
      topologyChecksum:
        state.initialization.source.topologyChecksum,
      supportFrameChecksum: checksumFloat32(heights),
      producerTrafficFieldChecksum:
        checksumFloat32(traffic),
      addressingKey:
        state.initialization.addressingKey,
      terrainLength: state.initialization.domain.length,
    },
    rootHeight: sampleHeight(
      state.initialization,
      heights,
      request.rootWorld.x,
      request.rootWorld.z,
    ),
    stations: request.stations.map(
      ({ t, worldX, worldZ }) => ({
        t,
        height: sampleHeight(
          state.initialization,
          heights,
          worldX,
          worldZ,
        ),
      }),
    ),
  };
}

function sampleHeight(
  initialization: HillGpuInitialization,
  heights: Float32Array,
  worldX: number,
  worldZ: number,
): number {
  const bounds = positionBounds(initialization);
  const x =
    clamp(
      (worldX - bounds.minX) /
        Math.max(1e-9, bounds.maxX - bounds.minX),
      0,
      1,
    ) *
    (initialization.gridResolution.x - 1);
  const z =
    clamp(
      (worldZ - bounds.minZ) /
        Math.max(1e-9, bounds.maxZ - bounds.minZ),
      0,
      1,
    ) *
    (initialization.gridResolution.z - 1);
  const x0 = Math.floor(x);
  const z0 = Math.floor(z);
  const x1 = Math.min(
    initialization.gridResolution.x - 1,
    x0 + 1,
  );
  const z1 = Math.min(
    initialization.gridResolution.z - 1,
    z0 + 1,
  );
  const tx = x - x0;
  const tz = z - z0;
  const row = initialization.gridResolution.x;
  const upper = mix(
    heights[z0 * row + x0],
    heights[z0 * row + x1],
    tx,
  );
  const lower = mix(
    heights[z1 * row + x0],
    heights[z1 * row + x1],
    tx,
  );
  return mix(upper, lower, tz);
}

function positionBounds(
  initialization: HillGpuInitialization,
): {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
} {
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;
  for (
    let index = 0;
    index < initialization.sampleCount;
    index += 1
  ) {
    const offset = index * 3;
    const x = initialization.basePositions[offset];
    const z = initialization.basePositions[offset + 2];
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minZ = Math.min(minZ, z);
    maxZ = Math.max(maxZ, z);
  }
  return { minX, maxX, minZ, maxZ };
}

function validateInitialization(
  initialization: HillGpuInitialization,
): void {
  requireHillGpu(
    initialization?.route.requested ===
      HILL_GPU_RESIDENT_ROUTE &&
      initialization.route.effective ===
        HILL_GPU_RESIDENT_ROUTE &&
      initialization.route.fallbackStatus === 'none' &&
      initialization.route.staleStatus === 'fresh',
    'GPU initialization route is not authoritative and fresh',
  );
  requireHillGpu(
    initialization.sampleCount > 0 &&
      initialization.gridResolution.x *
        initialization.gridResolution.z ===
        initialization.sampleCount &&
      initialization.basePositions.length ===
        initialization.sampleCount * 3,
    'GPU initialization addressing is incomplete',
  );
}

function validateState(state: HillGpuCpuOracleState): void {
  validateInitialization(state.initialization);
  requireHillGpu(
    Number.isInteger(state.previousGeneration) &&
      Number.isInteger(state.generation) &&
      state.previousGeneration <= state.generation &&
      state.currentTraffic.length ===
        state.initialization.sampleCount &&
      state.previousTraffic.length ===
        state.initialization.sampleCount &&
      state.currentHeights.length ===
        state.initialization.sampleCount &&
      state.previousHeights.length ===
        state.initialization.sampleCount,
    'GPU resident state generations or channels are incomplete',
  );
}

function validateProducerEvent(event: HillGpuProducerEvent): void {
  requireHillGpu(
    event.episodeId.length > 0 &&
      Number.isInteger(event.sequence) &&
      event.sequence >= 0 &&
      Number.isFinite(event.startMs) &&
      Number.isFinite(event.endMs) &&
      event.endMs > event.startMs &&
      Number.isFinite(event.worldX) &&
      Number.isFinite(event.worldZ) &&
      Number.isFinite(event.contactWeight) &&
      event.contactWeight >= 0 &&
      event.contactWeight <= 1 &&
      Number.isFinite(event.radius) &&
      event.radius > 0,
    'producer event requires finite ordered contact data',
  );
}

function validateSupportRequest(
  request: LermHordeSupportProfileRequest,
): void {
  requireHillGpu(
    request?.schema ===
      'lerms.horde-support-profile-request.v0' &&
      Number.isFinite(request.rootWorld.x) &&
      Number.isFinite(request.rootWorld.z) &&
      request.stations.length === 7 &&
      request.stations.every(
        (station, index) =>
          Number.isFinite(station.worldX) &&
          Number.isFinite(station.worldZ) &&
          Math.abs(station.t - index / 6) < 1e-9,
      ),
    'GPU support request requires exactly seven ordered stations',
  );
}

function extractHeights(
  positions: Float32Array,
): Float32Array {
  const heights = new Float32Array(positions.length / 3);
  for (let index = 0; index < heights.length; index += 1) {
    heights[index] = positions[index * 3 + 1];
  }
  return heights;
}

function generationFrameId(
  initialization: HillGpuInitialization,
  generation: number,
): string {
  return `${initialization.source.frameId}:gpu-${generation}`;
}

function checksumFloat32(values: Float32Array): string {
  const bytes = new Uint8Array(
    values.buffer,
    values.byteOffset,
    values.byteLength,
  );
  let hash = 0x811c9dc5;
  for (const value of bytes) {
    hash ^= value;
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function byteLength(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}

function mix(from: number, to: number, alpha: number): number {
  return from + (to - from) * alpha;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function requireUnitInterval(
  value: number,
  label: string,
): void {
  requireHillGpu(
    Number.isFinite(value) && value >= 0 && value <= 1,
    `${label} must be between zero and one`,
  );
}

function requireHillGpu(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) throw new Error(message);
}
