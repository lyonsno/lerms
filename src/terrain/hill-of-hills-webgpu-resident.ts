import {
  HILL_GPU_RETAINED_TRAFFIC_DECAY_RATE,
  HILL_GPU_RESIDENT_ROUTE,
  type HillGpuInitialization,
  type HillGpuProducerEventBatch,
  type HillGpuRouteIdentity,
} from './hill-of-hills-gpu-resident.js';

export const HILL_GPU_RESIDENT_COMPUTE_ENTRY_POINT =
  'advance_hill_state' as const;
export const HILL_GPU_RESIDENT_WORKGROUP_SIZE = 64 as const;

const GPU_COPY_DST = 0x0008;
const GPU_STORAGE = 0x0080;
const GPU_UNIFORM = 0x0040;
const GPU_BUFFER_ALIGNMENT = 4;
const PRODUCER_EVENT_FLOAT_STRIDE = 8;

export const HILL_GPU_RESIDENT_SHADER = /* wgsl */ `
struct HillParams {
  sample_count: u32,
  event_count: u32,
  delta_seconds: f32,
  compaction_scale: f32,
}

struct ProducerEvent {
  position: vec2<f32>,
  contact_weight: f32,
  radius: f32,
  duration_seconds: f32,
  sequence: f32,
  padding: vec2<f32>,
}

@group(0) @binding(0)
var<storage, read> base_positions: array<f32>;

@group(0) @binding(1)
var<storage, read> previous_retained_traffic: array<f32>;

@group(0) @binding(2)
var<storage, read_write> retained_traffic: array<f32>;

@group(0) @binding(3)
var<storage, read_write> current_height: array<f32>;

@group(0) @binding(4)
var<storage, read> producer_events: array<ProducerEvent>;

@group(0) @binding(5)
var<uniform> params: HillParams;

@compute @workgroup_size(64)
fn advance_hill_state(@builtin(global_invocation_id) invocation: vec3<u32>) {
  let index = invocation.x;
  if (index >= params.sample_count) {
    return;
  }

  let base_offset = index * 3u;
  let world_position = vec2<f32>(
    base_positions[base_offset],
    base_positions[base_offset + 2u],
  );
  var deposition = 0.0;
  for (var event_index = 0u; event_index < params.event_count; event_index += 1u) {
    let event = producer_events[event_index];
    let displacement = world_position - event.position;
    let normalized_distance =
      dot(displacement, displacement) /
      max(2.0 * event.radius * event.radius, 0.000001);
    deposition +=
      exp(-normalized_distance) *
      event.contact_weight *
      event.duration_seconds *
      12.0;
  }

  let decayed =
    previous_retained_traffic[index] *
    exp(-${HILL_GPU_RETAINED_TRAFFIC_DECAY_RATE} * params.delta_seconds);
  let admitted =
    1.0 - (1.0 - decayed) * exp(-deposition);
  let bounded = clamp(admitted, 0.0, 1.0);
  retained_traffic[index] = bounded;
  current_height[index] =
    base_positions[base_offset + 1u] -
    bounded * params.compaction_scale;
}
`;

export interface HillWebGpuBuffer {
  readonly label?: string;
  readonly size: number;
  readonly usage: number;
}

export interface HillWebGpuDevice {
  readonly queue: {
    writeBuffer(
      buffer: HillWebGpuBuffer,
      bufferOffset: number,
      data: ArrayBuffer | ArrayBufferView,
      dataOffset?: number,
      size?: number,
    ): void;
    submit(commands: readonly unknown[]): void;
  };
  readonly lost?: Promise<{ message?: string }>;
  readonly lossReason?: string | null;
  createBuffer(descriptor: {
    label?: string;
    size: number;
    usage: number;
  }): HillWebGpuBuffer;
  createShaderModule(descriptor: {
    label?: string;
    code: string;
  }): unknown;
  createComputePipeline(descriptor: {
    label?: string;
    layout: 'auto';
    compute: {
      module: unknown;
      entryPoint: string;
    };
  }): {
    getBindGroupLayout(index: number): unknown;
  };
  createBindGroup(descriptor: {
    label?: string;
    layout: unknown;
    entries: readonly {
      binding: number;
      resource: { buffer: HillWebGpuBuffer };
    }[];
  }): unknown;
  createCommandEncoder(descriptor?: {
    label?: string;
  }): {
    beginComputePass(descriptor?: {
      label?: string;
    }): {
      setPipeline(pipeline: unknown): void;
      setBindGroup(index: number, bindGroup: unknown): void;
      dispatchWorkgroups(count: number): void;
      end(): void;
    };
    finish(): unknown;
  };
}

export interface HillWebGpuResidentRuntime {
  readonly route: HillGpuRouteIdentity;
  readonly initialization: HillGpuInitialization;
  readonly buffers: {
    readonly basePositions: HillWebGpuBuffer;
    readonly retainedTraffic: readonly [
      HillWebGpuBuffer,
      HillWebGpuBuffer,
    ];
    readonly heights: readonly [
      HillWebGpuBuffer,
      HillWebGpuBuffer,
    ];
    producerEvents: HillWebGpuBuffer;
    readonly parameters: HillWebGpuBuffer;
  };
  previousGeneration: number;
  generation: number;
  highestAdmittedEventSequence: number;
  readonly fullTerrainCpuUploads: 1;
  readonly fullFieldWorkerTransfersAfterInitialization: 0;
  readonly fullFieldReadbacksAfterInitialization: 0;
  failure: {
    phase: null | 'device-loss' | 'queue';
    message: string | null;
  };
  dispatch(
    batch: HillGpuProducerEventBatch,
    deltaSeconds: number,
  ): HillWebGpuResidentRuntime;
}

export function createHillWebGpuResidentRuntime(
  device: HillWebGpuDevice,
  initialization: HillGpuInitialization,
): HillWebGpuResidentRuntime {
  requireWebGpu(
    initialization.route.requested ===
      HILL_GPU_RESIDENT_ROUTE &&
      initialization.route.effective ===
        HILL_GPU_RESIDENT_ROUTE &&
      initialization.route.fallbackStatus === 'none' &&
      initialization.route.staleStatus === 'fresh',
    'WebGPU runtime requires authoritative fresh initialization',
  );

  const basePositions = createBuffer(
    device,
    'hill/base-positions',
    initialization.basePositions.byteLength,
    GPU_STORAGE | GPU_COPY_DST,
  );
  const trafficByteLength =
    initialization.sampleCount * Float32Array.BYTES_PER_ELEMENT;
  const retainedTraffic = [
    createBuffer(
      device,
      'hill/retained-traffic-a',
      trafficByteLength,
      GPU_STORAGE | GPU_COPY_DST,
    ),
    createBuffer(
      device,
      'hill/retained-traffic-b',
      trafficByteLength,
      GPU_STORAGE | GPU_COPY_DST,
    ),
  ] as const;
  const heights = [
    createBuffer(
      device,
      'hill/height-a',
      trafficByteLength,
      GPU_STORAGE | GPU_COPY_DST,
    ),
    createBuffer(
      device,
      'hill/height-b',
      trafficByteLength,
      GPU_STORAGE | GPU_COPY_DST,
    ),
  ] as const;
  let producerEvents = createBuffer(
    device,
    'hill/producer-events',
    PRODUCER_EVENT_FLOAT_STRIDE *
      Float32Array.BYTES_PER_ELEMENT,
    GPU_STORAGE | GPU_COPY_DST,
  );
  const parameters = createBuffer(
    device,
    'hill/advance-parameters',
    4 * Uint32Array.BYTES_PER_ELEMENT,
    GPU_UNIFORM | GPU_COPY_DST,
  );
  const zeroTraffic = new Float32Array(
    initialization.sampleCount,
  );
  const baseHeights = extractBaseHeights(initialization);

  device.queue.writeBuffer(
    basePositions,
    0,
    initialization.basePositions,
  );
  device.queue.writeBuffer(
    retainedTraffic[0],
    0,
    zeroTraffic,
  );
  device.queue.writeBuffer(
    retainedTraffic[1],
    0,
    zeroTraffic,
  );
  device.queue.writeBuffer(heights[0], 0, baseHeights);
  device.queue.writeBuffer(heights[1], 0, baseHeights);

  const shaderModule = device.createShaderModule({
    label: 'Hill GPU resident causal-state compute',
    code: HILL_GPU_RESIDENT_SHADER,
  });
  const pipeline = device.createComputePipeline({
    label: 'Hill GPU resident causal-state pipeline',
    layout: 'auto',
    compute: {
      module: shaderModule,
      entryPoint: HILL_GPU_RESIDENT_COMPUTE_ENTRY_POINT,
    },
  });

  const route: HillGpuRouteIdentity = {
    requested: HILL_GPU_RESIDENT_ROUTE,
    effective: HILL_GPU_RESIDENT_ROUTE,
    backend: 'webgpu',
    fallbackStatus: 'none',
    staleStatus: 'fresh',
  };
  const runtime: HillWebGpuResidentRuntime = {
    route,
    initialization,
    buffers: {
      basePositions,
      retainedTraffic,
      heights,
      producerEvents,
      parameters,
    },
    previousGeneration: 0,
    generation: 0,
    highestAdmittedEventSequence: -1,
    fullTerrainCpuUploads: 1,
    fullFieldWorkerTransfersAfterInitialization: 0,
    fullFieldReadbacksAfterInitialization: 0,
    failure: {
      phase: null,
      message: null,
    },
    dispatch(
      batch: HillGpuProducerEventBatch,
      deltaSeconds: number,
    ): HillWebGpuResidentRuntime {
      const deviceLossReason = device.lossReason;
      if (deviceLossReason) {
        markDeviceLoss(runtime, deviceLossReason);
        throw new Error(
          `Hill WebGPU device-loss: ${deviceLossReason}`,
        );
      }
      requireWebGpu(
        runtime.failure.phase === null,
        `Hill WebGPU ${String(
          runtime.failure.phase,
        )}: ${String(runtime.failure.message)}`,
      );
      validateDispatch(
        runtime,
        batch,
        deltaSeconds,
      );
      const eventPayload = packProducerEvents(batch);
      if (eventPayload.byteLength > producerEvents.size) {
        producerEvents = createBuffer(
          device,
          `hill/producer-events-${batch.events.length}`,
          eventPayload.byteLength,
          GPU_STORAGE | GPU_COPY_DST,
        );
        runtime.buffers.producerEvents = producerEvents;
      }
      const parameterPayload = packParameters(
        initialization.sampleCount,
        batch.events.length,
        deltaSeconds,
      );
      device.queue.writeBuffer(
        producerEvents,
        0,
        eventPayload,
      );
      device.queue.writeBuffer(
        parameters,
        0,
        parameterPayload,
      );

      const sourceIndex = runtime.generation % 2;
      const targetIndex = 1 - sourceIndex;
      const bindGroup = device.createBindGroup({
        label: `Hill GPU generation ${runtime.generation + 1}`,
        layout: pipeline.getBindGroupLayout(0),
        entries: [
          {
            binding: 0,
            resource: { buffer: basePositions },
          },
          {
            binding: 1,
            resource: {
              buffer: retainedTraffic[sourceIndex],
            },
          },
          {
            binding: 2,
            resource: {
              buffer: retainedTraffic[targetIndex],
            },
          },
          {
            binding: 3,
            resource: { buffer: heights[targetIndex] },
          },
          {
            binding: 4,
            resource: { buffer: producerEvents },
          },
          {
            binding: 5,
            resource: { buffer: parameters },
          },
        ],
      });
      try {
        const encoder = device.createCommandEncoder({
          label: `Hill GPU generation ${runtime.generation + 1}`,
        });
        const pass = encoder.beginComputePass({
          label: 'Hill causal-state advance',
        });
        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bindGroup);
        pass.dispatchWorkgroups(
          Math.ceil(
            initialization.sampleCount /
              HILL_GPU_RESIDENT_WORKGROUP_SIZE,
          ),
        );
        pass.end();
        device.queue.submit([encoder.finish()]);
      } catch (error) {
        runtime.route.staleStatus = 'stale';
        runtime.failure = {
          phase: 'queue',
          message:
            error instanceof Error
              ? error.message
              : String(error),
        };
        throw error;
      }
      runtime.previousGeneration = runtime.generation;
      runtime.generation += 1;
      runtime.highestAdmittedEventSequence =
        batch.highestAdmittedEventSequence;
      return runtime;
    },
  };

  if (device.lost) {
    void device.lost.then((info) => {
      markDeviceLoss(
        runtime,
        info.message || 'WebGPU device lost',
      );
    });
  }

  return runtime;
}

function createBuffer(
  device: HillWebGpuDevice,
  label: string,
  size: number,
  usage: number,
): HillWebGpuBuffer {
  return device.createBuffer({
    label,
    size: align(size, GPU_BUFFER_ALIGNMENT),
    usage,
  });
}

function packProducerEvents(
  batch: HillGpuProducerEventBatch,
): Float32Array {
  const payload = new Float32Array(
    Math.max(1, batch.events.length) *
      PRODUCER_EVENT_FLOAT_STRIDE,
  );
  batch.events.forEach((event, index) => {
    const offset = index * PRODUCER_EVENT_FLOAT_STRIDE;
    payload[offset] = event.worldX;
    payload[offset + 1] = event.worldZ;
    payload[offset + 2] = event.contactWeight;
    payload[offset + 3] = event.radius;
    payload[offset + 4] =
      (event.endMs - event.startMs) / 1_000;
    payload[offset + 5] = event.sequence;
  });
  return payload;
}

function packParameters(
  sampleCount: number,
  eventCount: number,
  deltaSeconds: number,
): ArrayBuffer {
  const payload = new ArrayBuffer(16);
  const unsigned = new Uint32Array(payload);
  const floats = new Float32Array(payload);
  unsigned[0] = sampleCount;
  unsigned[1] = eventCount;
  floats[2] = deltaSeconds;
  floats[3] = 0.18;
  return payload;
}

function validateDispatch(
  runtime: HillWebGpuResidentRuntime,
  batch: HillGpuProducerEventBatch,
  deltaSeconds: number,
): void {
  requireWebGpu(
    batch.addressingKey ===
      runtime.initialization.addressingKey,
    'WebGPU producer batch uses incompatible addressing',
  );
  requireWebGpu(
    Number.isFinite(deltaSeconds) && deltaSeconds > 0,
    'WebGPU delta must be finite and positive',
  );
  requireWebGpu(
    batch.highestAdmittedEventSequence >=
      runtime.highestAdmittedEventSequence,
    'WebGPU producer batch regressed admitted event sequence',
  );
  if (batch.events.length > 0) {
    requireWebGpu(
      batch.events[0].sequence >
        runtime.highestAdmittedEventSequence,
      'WebGPU producer batch replays an admitted event',
    );
  }
}

function markDeviceLoss(
  runtime: HillWebGpuResidentRuntime,
  message: string,
): void {
  runtime.route.staleStatus = 'stale';
  runtime.failure = {
    phase: 'device-loss',
    message,
  };
}

function extractBaseHeights(
  initialization: HillGpuInitialization,
): Float32Array {
  const heights = new Float32Array(
    initialization.sampleCount,
  );
  for (let index = 0; index < heights.length; index += 1) {
    heights[index] =
      initialization.basePositions[index * 3 + 1];
  }
  return heights;
}

function align(value: number, alignment: number): number {
  return Math.ceil(value / alignment) * alignment;
}

function requireWebGpu(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) throw new Error(message);
}
