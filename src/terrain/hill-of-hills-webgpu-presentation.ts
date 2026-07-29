import {
  HILL_GPU_RESIDENT_ROUTE,
  type HillGpuInitialization,
} from './hill-of-hills-gpu-resident.js';
import type {
  HillWebGpuBuffer,
  HillWebGpuDevice,
  HillWebGpuResidentRuntime,
} from './hill-of-hills-webgpu-resident.js';

export const HILL_GPU_PRESENTATION_ROUTE =
  'lerms/hill-of-hills/gpu-resident-presentation-v0' as const;
export const HILL_GPU_PRESENTATION_VERTEX_ENTRY_POINT =
  'hill_vertex' as const;
export const HILL_GPU_PRESENTATION_FRAGMENT_ENTRY_POINT =
  'hill_fragment' as const;

const GPU_COPY_DST = 0x0008;
const GPU_INDEX = 0x0010;
const GPU_STORAGE = 0x0080;
const GPU_UNIFORM = 0x0040;

export const HILL_GPU_PRESENTATION_SHADER = /* wgsl */ `
struct Presentation {
  presentation_alpha: f32,
  yaw: f32,
  tilt: f32,
  zoom: f32,
  pan_x: f32,
  pan_y: f32,
  aspect: f32,
  vertical_scale: f32,
}

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) color: vec3<f32>,
  @location(1) traffic: f32,
}

@group(0) @binding(0)
var<storage, read> base_positions: array<f32>;

@group(0) @binding(1)
var<storage, read> previous_height: array<f32>;

@group(0) @binding(2)
var<storage, read> current_height: array<f32>;

@group(0) @binding(3)
var<storage, read> retained_traffic: array<f32>;

@group(0) @binding(4)
var<storage, read> base_colors: array<f32>;

@group(0) @binding(5)
var<uniform> presentation: Presentation;

@vertex
fn hill_vertex(@builtin(vertex_index) index: u32) -> VertexOutput {
  let offset = index * 3u;
  let x = base_positions[offset];
  let z = base_positions[offset + 2u];
  let height = mix(
    previous_height[index],
    current_height[index],
    presentation.presentation_alpha,
  );
  let cos_yaw = cos(presentation.yaw);
  let sin_yaw = sin(presentation.yaw);
  let rotated_x = x * cos_yaw - z * sin_yaw;
  let rotated_z = x * sin_yaw + z * cos_yaw;
  let tilt_sin = sin(presentation.tilt);
  let tilt_cos = cos(presentation.tilt);
  let screen_y =
    height * tilt_sin * presentation.vertical_scale -
    rotated_z * tilt_cos;
  let depth =
    height * tilt_cos + rotated_z * tilt_sin;
  let horizontal_scale = 0.13 * presentation.zoom;
  let vertical_scale = 0.075 * presentation.zoom;

  var output: VertexOutput;
  output.position = vec4<f32>(
    rotated_x * horizontal_scale +
      presentation.pan_x,
    screen_y * vertical_scale + presentation.pan_y,
    clamp(0.5 + depth * 0.015, 0.0, 1.0),
    1.0,
  );
  output.color = vec3<f32>(
    base_colors[offset],
    base_colors[offset + 1u],
    base_colors[offset + 2u],
  ) / 255.0;
  output.traffic = retained_traffic[index];
  return output;
}

@fragment
fn hill_fragment(input: VertexOutput) -> @location(0) vec4<f32> {
  let trail = vec3<f32>(0.24, 0.10, 0.035);
  let traffic = clamp(input.traffic * 1.8, 0.0, 0.90);
  let color = mix(input.color, trail, traffic);
  return vec4<f32>(color, 1.0);
}
`;

export interface HillGpuPresentationReceipt {
  schema: 'lerms.hill-gpu-presentation-receipt.v0';
  ok: boolean;
  route: {
    requested: typeof HILL_GPU_PRESENTATION_ROUTE;
    effective: string;
    backend: 'webgpu';
    fallbackStatus: 'none' | 'fallback';
    staleStatus: 'fresh' | 'stale';
  };
  generation: {
    previous: number;
    current: number;
  };
  presentationAlpha: number;
  indexCount: number;
  renderedPixelCount: number;
}

export interface HillGpuPresentationView {
  presentationAlpha: number;
  yaw: number;
  tilt: number;
  zoom: number;
  panX: number;
  panY: number;
  aspect: number;
  verticalScale: number;
}

export interface HillGpuWebGpuPresenter {
  readonly route: typeof HILL_GPU_PRESENTATION_ROUTE;
  readonly indexCount: number;
  readonly initializationUploadOrdinal: 1;
  render(view: HillGpuPresentationView): {
    previousGeneration: number;
    currentGeneration: number;
    presentationAlpha: number;
    submittedIndexCount: number;
  };
}

interface HillGpuTextureView {}

interface HillGpuCanvasContext {
  configure(descriptor: {
    device: HillPresentationDevice;
    format: string;
    alphaMode: 'opaque';
  }): void;
  getCurrentTexture(): {
    createView(): HillGpuTextureView;
  };
}

interface HillPresentationDevice extends HillWebGpuDevice {
  createRenderPipeline(descriptor: {
    label?: string;
    layout: 'auto';
    vertex: {
      module: unknown;
      entryPoint: string;
    };
    fragment: {
      module: unknown;
      entryPoint: string;
      targets: readonly { format: string }[];
    };
    primitive: {
      topology: 'triangle-list';
      cullMode: 'none';
    };
  }): {
    getBindGroupLayout(index: number): unknown;
  };
  createCommandEncoder(descriptor?: {
    label?: string;
  }): ReturnType<HillWebGpuDevice['createCommandEncoder']> & {
    beginRenderPass(descriptor: {
      label?: string;
      colorAttachments: readonly {
        view: HillGpuTextureView;
        clearValue: {
          r: number;
          g: number;
          b: number;
          a: number;
        };
        loadOp: 'clear';
        storeOp: 'store';
      }[];
    }): {
      setPipeline(pipeline: unknown): void;
      setBindGroup(index: number, bindGroup: unknown): void;
      setIndexBuffer(
        buffer: HillWebGpuBuffer,
        format: 'uint32',
      ): void;
      drawIndexed(indexCount: number): void;
      end(): void;
    };
  };
}

export function createHillGpuGridIndices(
  resolutionX: number,
  resolutionZ: number,
): Uint32Array {
  requirePresentation(
    Number.isInteger(resolutionX) &&
      Number.isInteger(resolutionZ) &&
      resolutionX >= 2 &&
      resolutionZ >= 2,
    'GPU terrain grid requires at least two samples per axis',
  );
  const indices = new Uint32Array(
    (resolutionX - 1) * (resolutionZ - 1) * 6,
  );
  let cursor = 0;
  for (let z = 0; z < resolutionZ - 1; z += 1) {
    for (let x = 0; x < resolutionX - 1; x += 1) {
      const a = z * resolutionX + x;
      const b = a + 1;
      const d = (z + 1) * resolutionX + x;
      const c = d + 1;
      indices[cursor++] = a;
      indices[cursor++] = d;
      indices[cursor++] = b;
      indices[cursor++] = b;
      indices[cursor++] = d;
      indices[cursor++] = c;
    }
  }
  return indices;
}

export function createHillGpuPresentationBufferSelection(
  generation: number,
): {
  previousIndex: 0 | 1;
  currentIndex: 0 | 1;
} {
  requirePresentation(
    Number.isInteger(generation) && generation >= 0,
    'GPU presentation generation must be nonnegative',
  );
  if (generation === 0) {
    return {
      previousIndex: 0,
      currentIndex: 0,
    };
  }
  const currentIndex = (generation % 2) as 0 | 1;
  return {
    previousIndex: (1 - currentIndex) as 0 | 1,
    currentIndex,
  };
}

export function createHillGpuWebGpuPresenter(
  device: HillPresentationDevice,
  context: HillGpuCanvasContext,
  format: string,
  initialization: HillGpuInitialization,
  runtime: HillWebGpuResidentRuntime,
): HillGpuWebGpuPresenter {
  requirePresentation(
    initialization.route.effective ===
      HILL_GPU_RESIDENT_ROUTE &&
      runtime.initialization.addressingKey ===
        initialization.addressingKey,
    'GPU presenter requires the resident state addressing identity',
  );
  context.configure({
    device,
    format,
    alphaMode: 'opaque',
  });
  const indices = createHillGpuGridIndices(
    initialization.gridResolution.x,
    initialization.gridResolution.z,
  );
  const indexBuffer = device.createBuffer({
    label: 'Hill presentation grid indices',
    size: indices.byteLength,
    usage: GPU_INDEX | GPU_COPY_DST,
  });
  const colorBuffer = device.createBuffer({
    label: 'Hill presentation base colors',
    size: initialization.baseColors.byteLength,
    usage: GPU_STORAGE | GPU_COPY_DST,
  });
  const viewBuffer = device.createBuffer({
    label: 'Hill presentation view',
    size: 8 * Float32Array.BYTES_PER_ELEMENT,
    usage: GPU_UNIFORM | GPU_COPY_DST,
  });
  device.queue.writeBuffer(indexBuffer, 0, indices);
  device.queue.writeBuffer(
    colorBuffer,
    0,
    initialization.baseColors,
  );
  const shader = device.createShaderModule({
    label: 'Hill GPU direct presentation',
    code: HILL_GPU_PRESENTATION_SHADER,
  });
  const pipeline = device.createRenderPipeline({
    label: 'Hill GPU direct terrain pipeline',
    layout: 'auto',
    vertex: {
      module: shader,
      entryPoint: HILL_GPU_PRESENTATION_VERTEX_ENTRY_POINT,
    },
    fragment: {
      module: shader,
      entryPoint: HILL_GPU_PRESENTATION_FRAGMENT_ENTRY_POINT,
      targets: [{ format }],
    },
    primitive: {
      topology: 'triangle-list',
      cullMode: 'none',
    },
  });

  return {
    route: HILL_GPU_PRESENTATION_ROUTE,
    indexCount: indices.length,
    initializationUploadOrdinal: 1,
    render(view) {
      validateView(view);
      const selection =
        createHillGpuPresentationBufferSelection(
          runtime.generation,
        );
      const bindGroup = device.createBindGroup({
        label: `Hill presentation generation ${runtime.generation}`,
        layout: pipeline.getBindGroupLayout(0),
        entries: [
          {
            binding: 0,
            resource: {
              buffer: runtime.buffers.basePositions,
            },
          },
          {
            binding: 1,
            resource: {
              buffer:
                runtime.buffers.heights[
                  selection.previousIndex
                ],
            },
          },
          {
            binding: 2,
            resource: {
              buffer:
                runtime.buffers.heights[
                  selection.currentIndex
                ],
            },
          },
          {
            binding: 3,
            resource: {
              buffer:
                runtime.buffers.retainedTraffic[
                  selection.currentIndex
                ],
            },
          },
          {
            binding: 4,
            resource: { buffer: colorBuffer },
          },
          {
            binding: 5,
            resource: { buffer: viewBuffer },
          },
        ],
      });
      device.queue.writeBuffer(
        viewBuffer,
        0,
        new Float32Array([
          view.presentationAlpha,
          view.yaw,
          view.tilt,
          view.zoom,
          view.panX,
          view.panY,
          view.aspect,
          view.verticalScale,
        ]),
      );
      const encoder = device.createCommandEncoder({
        label: `Hill presentation generation ${runtime.generation}`,
      });
      const pass = encoder.beginRenderPass({
        label: 'Hill direct GPU terrain presentation',
        colorAttachments: [
          {
            view: context
              .getCurrentTexture()
              .createView(),
            clearValue: {
              r: 0.023,
              g: 0.055,
              b: 0.047,
              a: 1,
            },
            loadOp: 'clear',
            storeOp: 'store',
          },
        ],
      });
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, bindGroup);
      pass.setIndexBuffer(indexBuffer, 'uint32');
      pass.drawIndexed(indices.length);
      pass.end();
      device.queue.submit([encoder.finish()]);
      return {
        previousGeneration: Math.max(
          0,
          runtime.generation - 1,
        ),
        currentGeneration: runtime.generation,
        presentationAlpha: view.presentationAlpha,
        submittedIndexCount: indices.length,
      };
    },
  };
}

export function createHillGpuPresentationReceipt(input: {
  generation: number;
  presentationAlpha: number;
  indexCount: number;
  renderedPixelCount: number;
}): HillGpuPresentationReceipt {
  return {
    schema: 'lerms.hill-gpu-presentation-receipt.v0',
    ok: input.renderedPixelCount > 0,
    route: {
      requested: HILL_GPU_PRESENTATION_ROUTE,
      effective: HILL_GPU_PRESENTATION_ROUTE,
      backend: 'webgpu',
      fallbackStatus: 'none',
      staleStatus: 'fresh',
    },
    generation: {
      previous: Math.max(0, input.generation - 1),
      current: input.generation,
    },
    presentationAlpha: input.presentationAlpha,
    indexCount: input.indexCount,
    renderedPixelCount: input.renderedPixelCount,
  };
}

export function assertHillGpuPresentationReceipt(
  receipt: HillGpuPresentationReceipt,
): void {
  requirePresentation(
    receipt?.schema ===
      'lerms.hill-gpu-presentation-receipt.v0',
    'GPU presentation receipt schema is unsupported',
  );
  requirePresentation(
    receipt.route.requested ===
      HILL_GPU_PRESENTATION_ROUTE &&
      receipt.route.effective ===
        HILL_GPU_PRESENTATION_ROUTE &&
      receipt.route.backend === 'webgpu' &&
      receipt.route.fallbackStatus === 'none',
    'GPU presentation effective route cannot use fallback',
  );
  requirePresentation(
    receipt.route.staleStatus === 'fresh',
    'GPU presentation must be fresh, not stale',
  );
  requirePresentation(
    receipt.renderedPixelCount > 0,
    'GPU presentation is blank: pixel evidence is zero',
  );
  requirePresentation(
    Number.isInteger(receipt.indexCount) &&
      receipt.indexCount > 0,
    'GPU presentation requires indexed terrain geometry',
  );
  requirePresentation(
    receipt.generation.previous <=
      receipt.generation.current,
    'GPU presentation generations regressed',
  );
  requirePresentation(
    Number.isFinite(receipt.presentationAlpha) &&
      receipt.presentationAlpha >= 0 &&
      receipt.presentationAlpha <= 1,
    'GPU presentation alpha must be between zero and one',
  );
  requirePresentation(
    receipt.ok,
    'GPU presentation receipt cannot close with ok=false',
  );
}

function validateView(view: HillGpuPresentationView): void {
  requirePresentation(
    Object.values(view).every(
      (value) =>
        typeof value === 'number' && Number.isFinite(value),
    ) &&
      view.presentationAlpha >= 0 &&
      view.presentationAlpha <= 1 &&
      view.zoom > 0 &&
      view.aspect > 0 &&
      view.verticalScale > 0,
    'GPU presentation view is malformed',
  );
}

function requirePresentation(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) throw new Error(message);
}
