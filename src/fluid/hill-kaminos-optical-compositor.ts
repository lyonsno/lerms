import {
  createFingerFluidPortableMacroOpticalRenderPlan,
  createWebGPUFingerFluidPortableMacroOpticalRenderer,
} from 'kaminos/finger-fluid-portable-macro-optical-renderer.js';
import {
  HILL_KAMINOS_OPTICAL_COMPOSITOR_ROUTE,
  HILL_OPTICAL_ATTACHMENT_CADENCE,
  KAMINOS_HILL_COMPOSED_REVISION,
  createHillKaminosOpticalHostFrame,
} from './hill-kaminos-optical-compositor-contract.js';
import type { HillPortableMacroOpticalProviderMount } from './hill-kaminos-portable-optical-provider.js';

type Gpu = any;

export interface HillOpticalCameraFrame {
  view: readonly number[];
  viewProjection: readonly number[];
  inverseViewProjection: readonly number[];
  positionWorld: readonly [number, number, number];
  nearMeters: number;
  farMeters: number;
}

export interface HillKaminosOpticalRenderResult {
  schema: 'lerms.hill-of-hills.full-fluid-optical-compositor-encoding.v0';
  status: 'submitted';
  route: {
    requested: typeof HILL_KAMINOS_OPTICAL_COMPOSITOR_ROUTE;
    effective: typeof HILL_KAMINOS_OPTICAL_COMPOSITOR_ROUTE;
    fallback: null;
  };
  kaminosRevision: typeof KAMINOS_HILL_COMPOSED_REVISION;
  frameId: string;
  timing: {
    cadence: typeof HILL_OPTICAL_ATTACHMENT_CADENCE;
    displayFrameGeneration: number;
    cameraGeneration: number;
    sceneColorGeneration: number;
    sceneDepthGeneration: number;
    opticalSubmissionGeneration: number;
    retainedFrame: false;
  };
  rendererRoute: string;
  shaderRoute: string;
  source: {
    providerRevision: string;
    terrainEpoch: number;
    fluidEpoch: number;
    fallbackStatus: string;
  };
  output: {
    wetSampleCount: number;
    drawableWetTriangleCount: number;
    encoded: true;
    submitted: true;
    observedPixelCount: null;
    blank: false;
    partial: false;
    projectedIndexedVertexCount: number;
    projectedInsideClipCount: number;
    projectedNdcBounds: {
      minimum: [number, number, number];
      maximum: [number, number, number];
    };
  };
}

const ENVIRONMENT_SHADER = `
struct Output { @builtin(position) position: vec4<f32>, @location(0) uv: vec2<f32> };
@vertex fn vs(@builtin(vertex_index) index: u32) -> Output {
  var positions = array<vec2<f32>, 3>(vec2(-1.0,-1.0), vec2(3.0,-1.0), vec2(-1.0,3.0));
  var output: Output;
  output.position = vec4(positions[index], 0.0, 1.0);
  output.uv = vec2((output.position.x + 1.0) * 0.5, 1.0 - (output.position.y + 1.0) * 0.5);
  return output;
}
@fragment fn fs(input: Output) -> @location(0) vec4<f32> {
  let sky = mix(vec3(0.16, 0.32, 0.42), vec3(1.35, 1.65, 1.48), pow(1.0 - input.uv.y, 1.4));
  let sun = exp(-pow(distance(input.uv, vec2(0.72, 0.34)) * 18.0, 2.0));
  return vec4(sky + vec3(6.0, 4.4, 2.2) * sun, 1.0);
}`;

const DEPTH_SHADER = `
struct Camera { viewProjection: mat4x4<f32>, view: mat4x4<f32> };
@group(0) @binding(0) var<uniform> camera: Camera;
struct Output { @builtin(position) position: vec4<f32>, @location(0) viewDepth: f32 };
@vertex fn vs(@location(0) position: vec3<f32>) -> Output {
  var output: Output;
  output.position = camera.viewProjection * vec4(position, 1.0);
  output.viewDepth = max(0.0, -(camera.view * vec4(position, 1.0)).z);
  return output;
}
@fragment fn fs(input: Output) -> @location(0) f32 { return input.viewDepth; }`;

export async function createHillKaminosOpticalCompositor(
  canvas: HTMLCanvasElement,
  backgroundCanvas: HTMLCanvasElement,
) {
  const gpu = (navigator as Navigator & { gpu?: Gpu }).gpu;
  if (!gpu) throw new Error('WebGPU unavailable for Hill optical compositor');
  const adapter = await gpu.requestAdapter({ powerPreference: 'high-performance' });
  if (!adapter) throw new Error('WebGPU adapter unavailable for Hill optical compositor');
  const device = await adapter.requestDevice();
  const context = canvas.getContext('webgpu') as Gpu;
  if (!context) throw new Error('WebGPU canvas context unavailable for Hill optical compositor');
  const format = gpu.getPreferredCanvasFormat();
  if (format !== 'bgra8unorm') throw new Error(`Hill optical compositor requires bgra8unorm, received ${format}`);

  const textureUsage = (globalThis as Gpu).GPUTextureUsage;
  const bufferUsage = (globalThis as Gpu).GPUBufferUsage;
  const shaderStage = (globalThis as Gpu).GPUShaderStage;
  context.configure({
    device,
    format,
    alphaMode: 'premultiplied',
    usage: textureUsage.RENDER_ATTACHMENT | textureUsage.COPY_SRC,
  });
  const opticalRenderer = createWebGPUFingerFluidPortableMacroOpticalRenderer({ device, colorFormat: format });

  const fullscreenPipeline = (code: string, targetFormat: string) => {
    const module = device.createShaderModule({ code });
    return device.createRenderPipeline({
      layout: 'auto',
      vertex: { module, entryPoint: 'vs' },
      fragment: { module, entryPoint: 'fs', targets: [{ format: targetFormat }] },
      primitive: { topology: 'triangle-list' },
    });
  };
  const environmentPipeline = fullscreenPipeline(ENVIRONMENT_SHADER, 'rgba16float');
  const depthModule = device.createShaderModule({ code: DEPTH_SHADER });
  const depthPipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: {
      module: depthModule,
      entryPoint: 'vs',
      buffers: [{ arrayStride: 12, attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x3' }] }],
    },
    fragment: { module: depthModule, entryPoint: 'fs', targets: [{ format: 'r32float' }] },
    primitive: { topology: 'triangle-list', cullMode: 'none' },
    depthStencil: { format: 'depth24plus', depthWriteEnabled: true, depthCompare: 'less' },
  });
  const cameraBuffer = device.createBuffer({
    size: 32 * Float32Array.BYTES_PER_ELEMENT,
    usage: bufferUsage.UNIFORM | bufferUsage.COPY_DST,
  });
  const depthBindGroup = device.createBindGroup({
    layout: depthPipeline.getBindGroupLayout(0),
    entries: [{ binding: 0, resource: { buffer: cameraBuffer } }],
  });

  const environmentTexture = device.createTexture({
    size: [256, 128],
    format: 'rgba16float',
    usage: textureUsage.RENDER_ATTACHMENT | textureUsage.TEXTURE_BINDING,
  });
  {
    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [{
        view: environmentTexture.createView(),
        clearValue: { r: 0, g: 0, b: 0, a: 1 },
        loadOp: 'clear',
        storeOp: 'store',
      }],
    });
    pass.setPipeline(environmentPipeline);
    pass.draw(3);
    pass.end();
    device.queue.submit([encoder.finish()]);
  }

  let width = 0;
  let height = 0;
  let sceneColorTexture: Gpu;
  let sceneDepthTexture: Gpu;
  let depthTestTexture: Gpu;
  let terrainVertexBuffer: Gpu;
  let terrainIndexBuffer: Gpu;
  let terrainVertexCapacity = 0;
  let terrainIndexCapacity = 0;
  const resize = (nextWidth: number, nextHeight: number) => {
    if (width === nextWidth && height === nextHeight) return;
    width = nextWidth;
    height = nextHeight;
    for (const texture of [sceneColorTexture, sceneDepthTexture, depthTestTexture]) texture?.destroy();
    sceneColorTexture = device.createTexture({
      size: [width, height],
      format: 'rgba16float',
      usage: textureUsage.COPY_DST | textureUsage.RENDER_ATTACHMENT | textureUsage.TEXTURE_BINDING,
    });
    sceneDepthTexture = device.createTexture({
      size: [width, height],
      format: 'r32float',
      usage: textureUsage.RENDER_ATTACHMENT | textureUsage.TEXTURE_BINDING,
    });
    depthTestTexture = device.createTexture({
      size: [width, height],
      format: 'depth24plus',
      usage: textureUsage.RENDER_ATTACHMENT,
    });
  };

  function ensureTerrainBuffers(vertices: Float32Array, indices: Uint32Array) {
    if (vertices.byteLength > terrainVertexCapacity) {
      terrainVertexBuffer?.destroy();
      terrainVertexCapacity = Math.max(256, vertices.byteLength);
      terrainVertexBuffer = device.createBuffer({
        size: terrainVertexCapacity,
        usage: bufferUsage.VERTEX | bufferUsage.COPY_DST,
      });
    }
    if (indices.byteLength > terrainIndexCapacity) {
      terrainIndexBuffer?.destroy();
      terrainIndexCapacity = Math.max(256, indices.byteLength);
      terrainIndexBuffer = device.createBuffer({
        size: terrainIndexCapacity,
        usage: bufferUsage.INDEX | bufferUsage.COPY_DST,
      });
    }
    device.queue.writeBuffer(terrainVertexBuffer, 0, vertices);
    device.queue.writeBuffer(terrainIndexBuffer, 0, indices);
  }

  function render(options: {
    frameSequence: number;
    camera: HillOpticalCameraFrame;
    providerMount: HillPortableMacroOpticalProviderMount;
    terrainPositions: Float32Array;
    terrainIndices: Uint32Array;
    depthOcclusionEnabled?: boolean;
  }): HillKaminosOpticalRenderResult {
    const pixelWidth = backgroundCanvas.width;
    const pixelHeight = backgroundCanvas.height;
    resize(pixelWidth, pixelHeight);
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
    canvas.style.width = backgroundCanvas.style.width;
    canvas.style.height = backgroundCanvas.style.height;
    device.queue.copyExternalImageToTexture(
      { source: backgroundCanvas },
      { texture: sceneColorTexture, colorSpace: 'srgb' },
      [pixelWidth, pixelHeight],
    );
    ensureTerrainBuffers(options.terrainPositions, options.terrainIndices);
    const cameraData = new Float32Array(32);
    cameraData.set(options.camera.viewProjection, 0);
    cameraData.set(options.camera.view, 16);
    device.queue.writeBuffer(cameraBuffer, 0, cameraData);

    const frameId = `lerms-hill-optical-${options.frameSequence}`;
    const hostFrame = createHillKaminosOpticalHostFrame({
      frameId,
      width: pixelWidth,
      height: pixelHeight,
      ...options.camera,
    });
    const snapshot = options.providerMount.provider.createUploadSnapshot() as Gpu;
    const witness = options.providerMount.witness;
    if (snapshot.geometryIdentity !== witness.support.geometryIdentity
      || snapshot.terrainId !== witness.terrain.terrainId
      || snapshot.sourceHandleId !== witness.source.handleId
      || snapshot.terrainEpoch !== witness.epochs.terrain
      || snapshot.fluidEpoch !== witness.epochs.fluid
      || witness.provider.revision !== KAMINOS_HILL_COMPOSED_REVISION
      || witness.source.fallbackStatus !== 'none') {
      throw new Error('Hill optical source snapshot differs from the mounted pinned provider witness');
    }
    const plan = createFingerFluidPortableMacroOpticalRenderPlan({
      snapshot,
      expectedIdentity: {
        geometryIdentity: snapshot.geometryIdentity,
        terrainId: snapshot.terrainId,
        sourceHandleId: snapshot.sourceHandleId,
        producerRevision: snapshot.producerRevision,
        terrainEpoch: snapshot.terrainEpoch,
        fluidEpoch: snapshot.fluidEpoch,
        source: snapshot.source,
      },
      hostFrame,
    });
    const projectedMinimum: [number, number, number] = [Infinity, Infinity, Infinity];
    const projectedMaximum: [number, number, number] = [-Infinity, -Infinity, -Infinity];
    let projectedInsideClipCount = 0;
    for (const index of plan.indices as Uint32Array) {
      const offset = index * plan.vertexStrideFloats;
      const x = plan.vertices[offset];
      const y = plan.vertices[offset + 1];
      const z = plan.vertices[offset + 2];
      const matrix = options.camera.viewProjection;
      const clipX = matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12];
      const clipY = matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13];
      const clipZ = matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14];
      const clipW = matrix[3] * x + matrix[7] * y + matrix[11] * z + matrix[15];
      const ndc = [clipX / clipW, clipY / clipW, clipZ / clipW];
      for (let axis = 0; axis < 3; axis += 1) {
        projectedMinimum[axis] = Math.min(projectedMinimum[axis], ndc[axis]);
        projectedMaximum[axis] = Math.max(projectedMaximum[axis], ndc[axis]);
      }
      if (ndc[0] >= -1 && ndc[0] <= 1 && ndc[1] >= -1 && ndc[1] <= 1 && ndc[2] >= 0 && ndc[2] <= 1) {
        projectedInsideClipCount += 1;
      }
    }

    const encoder = device.createCommandEncoder();
    let pass = encoder.beginRenderPass({
      colorAttachments: [{
        view: sceneDepthTexture.createView(),
        clearValue: { r: 0, g: 0, b: 0, a: 0 },
        loadOp: 'clear',
        storeOp: 'store',
      }],
      depthStencilAttachment: {
        view: depthTestTexture.createView(),
        depthClearValue: 1,
        depthLoadOp: 'clear',
        depthStoreOp: 'discard',
      },
    });
    if (options.depthOcclusionEnabled !== false) {
      pass.setPipeline(depthPipeline);
      pass.setBindGroup(0, depthBindGroup);
      pass.setVertexBuffer(0, terrainVertexBuffer);
      pass.setIndexBuffer(terrainIndexBuffer, 'uint32');
      pass.drawIndexed(options.terrainIndices.length);
    }
    pass.end();
    const targetTexture = context.getCurrentTexture();
    pass = encoder.beginRenderPass({
      colorAttachments: [{
        view: targetTexture.createView(),
        clearValue: { r: 0, g: 0, b: 0, a: 0 },
        loadOp: 'clear',
        storeOp: 'store',
      }],
    });
    pass.end();
    const attachment = (identity: object, view: unknown) => ({ ...identity, view });
    const evidence = opticalRenderer.render({
      plan,
      commandEncoder: encoder,
      target: attachment(hostFrame.target, targetTexture.createView()),
      sceneColor: attachment(hostFrame.sceneColor, sceneColorTexture.createView()),
      sceneDepth: attachment(hostFrame.sceneDepth, sceneDepthTexture.createView()),
      environment: attachment(hostFrame.environment, environmentTexture.createView()),
    });
    device.queue.submit([encoder.finish()]);
    return {
      schema: 'lerms.hill-of-hills.full-fluid-optical-compositor-encoding.v0',
      status: 'submitted',
      route: {
        requested: HILL_KAMINOS_OPTICAL_COMPOSITOR_ROUTE,
        effective: HILL_KAMINOS_OPTICAL_COMPOSITOR_ROUTE,
        fallback: null,
      },
      kaminosRevision: KAMINOS_HILL_COMPOSED_REVISION,
      frameId,
      timing: {
        cadence: HILL_OPTICAL_ATTACHMENT_CADENCE,
        displayFrameGeneration: options.frameSequence,
        cameraGeneration: options.frameSequence,
        sceneColorGeneration: options.frameSequence,
        sceneDepthGeneration: options.frameSequence,
        opticalSubmissionGeneration: options.frameSequence,
        retainedFrame: false,
      },
      rendererRoute: evidence.effectiveRoute,
      shaderRoute: evidence.shaderRoute,
      source: {
        providerRevision: witness.provider.revision,
        terrainEpoch: witness.epochs.terrain,
        fluidEpoch: witness.epochs.fluid,
        fallbackStatus: witness.source.fallbackStatus,
      },
      output: {
        wetSampleCount: plan.wetSampleCount,
        drawableWetTriangleCount: plan.drawableWetTriangleCount,
        encoded: true,
        submitted: true,
        observedPixelCount: null,
        blank: false,
        partial: false,
        projectedIndexedVertexCount: plan.indices.length,
        projectedInsideClipCount,
        projectedNdcBounds: {
          minimum: projectedMinimum,
          maximum: projectedMaximum,
        },
      },
    };
  }

  return { render };
}
