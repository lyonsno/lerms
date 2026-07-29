import assert from 'node:assert/strict';

import {
  createHillGpuInitialization,
  createHillGpuProducerEventBatch,
} from '../src/terrain/hill-of-hills-gpu-resident.js';
import {
  HILL_GPU_RESIDENT_COMPUTE_ENTRY_POINT,
  HILL_GPU_RESIDENT_SHADER,
  createHillWebGpuResidentRuntime,
} from '../src/terrain/hill-of-hills-webgpu-resident.js';
import {
  createHillOfHillsTerrain,
  createHillOfHillsTerrainBuffer,
} from '../src/terrain/hill-of-hills.js';

function runContracts(): void {
const terrain = createHillOfHillsTerrain(
  {
    gridResolutionX: 12,
    gridResolutionZ: 16,
    trailPhaseIntensity: 0,
    trailPhaseLimit: 0,
    topologyPhaseIntensity: 0,
    topologyPhaseLimit: 0,
  },
  {
    route: 'lerms/hill-of-hills/webgpu-runtime-fixture-v0',
    frameId: 'hill-webgpu-runtime-frame-0',
    configId: 'hill-webgpu-runtime-fixture-v0',
    timestampMs: 0,
    sampleAgeMs: 0,
  },
);
const initialization = createHillGpuInitialization(
  createHillOfHillsTerrainBuffer(terrain),
);
const device = new RecordingGpuDevice();
const runtime = createHillWebGpuResidentRuntime(
  device,
  initialization,
);

assert.equal(runtime.route.backend, 'webgpu');
assert.equal(runtime.route.requested, runtime.route.effective);
assert.equal(runtime.route.fallbackStatus, 'none');
assert.equal(runtime.route.staleStatus, 'fresh');
assert.equal(runtime.generation, 0);
assert.equal(runtime.previousGeneration, 0);
assert.equal(runtime.fullTerrainCpuUploads, 1);
assert.equal(runtime.fullFieldReadbacksAfterInitialization, 0);
assert.equal(runtime.fullFieldWorkerTransfersAfterInitialization, 0);
assert.equal(
  device.shaderModules[0].code,
  HILL_GPU_RESIDENT_SHADER,
);
assert.equal(
  device.computePipelines[0].compute.entryPoint,
  HILL_GPU_RESIDENT_COMPUTE_ENTRY_POINT,
);
assert.ok(
  HILL_GPU_RESIDENT_SHADER.includes('@compute'),
  'resident route contains a real compute stage',
);
assert.ok(
  HILL_GPU_RESIDENT_SHADER.includes('retained_traffic'),
  'retained traffic is shader-owned state',
);
assert.ok(
  HILL_GPU_RESIDENT_SHADER.includes('current_height'),
  'visible height is a causal shader output',
);

const initializationWrites = device.queue.writes.slice();
assert.equal(
  initializationWrites.filter(
    ({ byteLength }) =>
      byteLength === initialization.basePositions.byteLength,
  ).length,
  1,
  'canonical positions cross the boundary exactly once',
);

const batch = createHillGpuProducerEventBatch(
  initialization,
  [
    {
      episodeId: 'episode-a',
      sequence: 0,
      startMs: 0,
      endMs: 25,
      worldX: -1.25,
      worldZ: -0.8,
      contactWeight: 0.9,
      radius: 1.1,
    },
  ],
);
const afterA = runtime.dispatch(batch, 0.025);
assert.equal(afterA.previousGeneration, 0);
assert.equal(afterA.generation, 1);
assert.equal(afterA.highestAdmittedEventSequence, 0);
assert.equal(afterA.fullTerrainCpuUploads, 1);
assert.equal(afterA.fullFieldReadbacksAfterInitialization, 0);
assert.equal(
  afterA.fullFieldWorkerTransfersAfterInitialization,
  0,
);
assert.equal(device.queue.submissions.length, 1);
assert.equal(device.dispatches[0], Math.ceil(initialization.sampleCount / 64));
assert.equal(
  device.queue.writes
    .slice(initializationWrites.length)
    .some(
      ({ byteLength }) =>
        byteLength === initialization.basePositions.byteLength,
    ),
  false,
  'dispatch never republishes the full terrain field',
);
assert.ok(
  device.queue.writes
    .slice(initializationWrites.length)
    .some(({ byteLength }) => byteLength < initialization.upload.fullTerrainBytes),
  'dispatch ingress remains compact',
);
assert.equal(
  device.buffers.some((buffer) => buffer.mapAsyncCalls > 0),
  false,
  'resident update performs no CPU readback',
);

const empty = createHillGpuProducerEventBatch(
  initialization,
  [],
  0,
);
const afterDeparture = afterA.dispatch(empty, 0.025);
assert.equal(afterDeparture.previousGeneration, 1);
assert.equal(afterDeparture.generation, 2);
assert.equal(afterDeparture.highestAdmittedEventSequence, 0);
assert.equal(device.queue.submissions.length, 2);

device.lose('device vanished');
assert.throws(
  () => afterDeparture.dispatch(empty, 0.025),
  /device-loss|device vanished/i,
);
assert.equal(afterDeparture.route.staleStatus, 'stale');
assert.equal(afterDeparture.failure.phase, 'device-loss');

console.log('hill of hills WebGPU resident runtime contracts ok');
}

interface RecordedBuffer {
  label?: string;
  size: number;
  usage: number;
  mapAsyncCalls: number;
}

class RecordingGpuDevice {
  readonly buffers: RecordedBuffer[] = [];
  readonly shaderModules: Array<{ label?: string; code: string }> = [];
  readonly computePipelines: Array<{
    label?: string;
    layout: 'auto';
    compute: {
      module: { label?: string; code: string };
      entryPoint: string;
    };
    getBindGroupLayout(index: number): { index: number };
  }> = [];
  readonly bindGroups: Array<{
    label?: string;
    layout: { index: number };
    entries: readonly {
      binding: number;
      resource: { buffer: RecordedBuffer };
    }[];
  }> = [];
  readonly dispatches: number[] = [];
  private lostReason: string | null = null;

  readonly queue = {
    writes: [] as Array<{
      buffer: RecordedBuffer;
      byteLength: number;
    }>,
    submissions: [] as unknown[][],
    writeBuffer: (
      buffer: RecordedBuffer,
      _bufferOffset: number,
      data: ArrayBuffer | ArrayBufferView,
      dataOffset?: number,
      size?: number,
    ): void => {
      const available =
        data instanceof ArrayBuffer
          ? data.byteLength
          : data.byteLength;
      this.queue.writes.push({
        buffer,
        byteLength: size ?? available - (dataOffset ?? 0),
      });
    },
    submit: (commands: unknown[]): void => {
      this.queue.submissions.push(commands);
    },
  };

  createBuffer(descriptor: {
    label?: string;
    size: number;
    usage: number;
  }): RecordedBuffer {
    const buffer = {
      ...descriptor,
      mapAsyncCalls: 0,
    };
    this.buffers.push(buffer);
    return buffer;
  }

  createShaderModule(descriptor: {
    label?: string;
    code: string;
  }): { label?: string; code: string } {
    const module = { ...descriptor };
    this.shaderModules.push(module);
    return module;
  }

  createComputePipeline(descriptor: {
    label?: string;
    layout: 'auto';
    compute: {
      module: { label?: string; code: string };
      entryPoint: string;
    };
  }): (typeof this.computePipelines)[number] {
    const pipeline = {
      ...descriptor,
      getBindGroupLayout: (index: number) => ({ index }),
    };
    this.computePipelines.push(pipeline);
    return pipeline;
  }

  createBindGroup(descriptor: {
    label?: string;
    layout: { index: number };
    entries: readonly {
      binding: number;
      resource: { buffer: RecordedBuffer };
    }[];
  }): (typeof this.bindGroups)[number] {
    const bindGroup = { ...descriptor };
    this.bindGroups.push(bindGroup);
    return bindGroup;
  }

  createCommandEncoder(): {
    beginComputePass(): {
      setPipeline(pipeline: unknown): void;
      setBindGroup(index: number, bindGroup: unknown): void;
      dispatchWorkgroups(count: number): void;
      end(): void;
    };
    finish(): unknown;
  } {
    return {
      beginComputePass: () => ({
        setPipeline: () => undefined,
        setBindGroup: () => undefined,
        dispatchWorkgroups: (count) => {
          this.dispatches.push(count);
        },
        end: () => undefined,
      }),
      finish: () => ({ command: 'compute' }),
    };
  }

  get lossReason(): string | null {
    return this.lostReason;
  }

  lose(reason: string): void {
    this.lostReason = reason;
  }
}

runContracts();
