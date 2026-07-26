export const HILL_KAMINOS_OPTICAL_COMPOSITOR_ROUTE =
  'lerms/hill-of-hills/c7-portable-macro-optical-compositor-v0' as const;
export const KAMINOS_PORTABLE_MACRO_OPTICAL_RENDERER_ROUTE =
  'kaminos/finger-fluid/portable-macro-screen-space-optics-v0' as const;
export const KAMINOS_PORTABLE_MACRO_OPTICAL_SHADER_ROUTE =
  'wgsl-portable-macro-fresnel-refraction-absorption-v0' as const;
export const HILL_OPTICAL_ATTACHMENT_CADENCE =
  'display_cadenced_same_frame' as const;
export const KAMINOS_C7_REVISION =
  'c7b3fdc1f761db3ab45eae5f25a72cb95f4c2d35' as const;

interface HillOpticalAttachment {
  attachmentId: string;
  frameId: string;
  authority: 'host_live_frame';
  width: number;
  height: number;
  format: string;
  colorSpace?: string;
  encoding?: string;
  mapping?: string;
}

export interface HillKaminosOpticalHostFrame {
  frameId: string;
  width: number;
  height: number;
  camera: {
    view: readonly number[];
    viewProjection: readonly number[];
    inverseViewProjection: readonly number[];
    positionWorld: readonly [number, number, number];
    nearMeters: number;
    farMeters: number;
  };
  sceneColor: HillOpticalAttachment;
  sceneDepth: HillOpticalAttachment;
  environment: HillOpticalAttachment;
  target: HillOpticalAttachment;
}

export function createHillKaminosOpticalHostFrame(input: {
  frameId: string;
  width: number;
  height: number;
  view: readonly number[];
  viewProjection: readonly number[];
  inverseViewProjection: readonly number[];
  positionWorld: readonly [number, number, number];
  nearMeters: number;
  farMeters: number;
}): HillKaminosOpticalHostFrame {
  if (!input.frameId || !Number.isSafeInteger(input.width) || !Number.isSafeInteger(input.height)
    || input.width <= 0 || input.height <= 0) {
    throw new Error('Hill optical host frame identity or extent is invalid');
  }
  for (const [label, matrix] of [
    ['view', input.view],
    ['viewProjection', input.viewProjection],
    ['inverseViewProjection', input.inverseViewProjection],
  ] as const) {
    if (matrix.length !== 16 || matrix.some(value => !Number.isFinite(value))) {
      throw new Error(`Hill optical ${label} matrix is invalid`);
    }
  }
  const attachment = (
    kind: string,
    format: string,
    extra: Partial<HillOpticalAttachment> = {},
  ): HillOpticalAttachment => ({
    attachmentId: `${input.frameId}:${kind}`,
    frameId: input.frameId,
    authority: 'host_live_frame',
    width: input.width,
    height: input.height,
    format,
    ...extra,
  });
  return {
    frameId: input.frameId,
    width: input.width,
    height: input.height,
    camera: {
      view: [...input.view],
      viewProjection: [...input.viewProjection],
      inverseViewProjection: [...input.inverseViewProjection],
      positionWorld: [...input.positionWorld],
      nearMeters: input.nearMeters,
      farMeters: input.farMeters,
    },
    sceneColor: attachment('scene-color', 'rgba16float', { colorSpace: 'linear_hdr' }),
    sceneDepth: attachment('scene-depth', 'r32float', { encoding: 'linear_view_depth_meters' }),
    environment: attachment('environment', 'rgba16float', {
      width: 256,
      height: 128,
      mapping: 'equirectangular_world_radiance',
    }),
    target: attachment('target', 'bgra8unorm'),
  };
}

export interface HillKaminosOpticalCompositorWitness {
  schema: 'lerms.hill-of-hills.full-fluid-optical-compositor.v0';
  status: 'observed';
  route: {
    requested: typeof HILL_KAMINOS_OPTICAL_COMPOSITOR_ROUTE;
    effective: typeof HILL_KAMINOS_OPTICAL_COMPOSITOR_ROUTE;
    fallback: null;
  };
  kaminosRevision: typeof KAMINOS_C7_REVISION;
  rendererRoute: typeof KAMINOS_PORTABLE_MACRO_OPTICAL_RENDERER_ROUTE;
  shaderRoute: typeof KAMINOS_PORTABLE_MACRO_OPTICAL_SHADER_ROUTE;
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
  attachments: {
    sceneColor: HillOpticalAttachment;
    sceneDepth: HillOpticalAttachment;
    environment: HillOpticalAttachment;
    target: HillOpticalAttachment;
  };
  source: {
    providerRevision: typeof KAMINOS_C7_REVISION;
    terrainEpoch: number;
    fluidEpoch: number;
    fallbackStatus: 'none';
  };
  output: {
    wetSampleCount: number;
    drawableWetTriangleCount: number;
    encoded: true;
    submitted: true;
    observedPixelCount: number;
    blank: false;
    partial: false;
  };
}

export function assertHillKaminosOpticalCompositorWitness(
  value: unknown,
): asserts value is HillKaminosOpticalCompositorWitness {
  const witness = value as Partial<HillKaminosOpticalCompositorWitness>;
  if (witness.schema !== 'lerms.hill-of-hills.full-fluid-optical-compositor.v0'
    || witness.status !== 'observed'
    || witness.route?.requested !== HILL_KAMINOS_OPTICAL_COMPOSITOR_ROUTE
    || witness.route.effective !== witness.route.requested
    || witness.route.fallback !== null
    || witness.kaminosRevision !== KAMINOS_C7_REVISION
    || witness.rendererRoute !== KAMINOS_PORTABLE_MACRO_OPTICAL_RENDERER_ROUTE
    || witness.shaderRoute !== KAMINOS_PORTABLE_MACRO_OPTICAL_SHADER_ROUTE
    || witness.source?.providerRevision !== KAMINOS_C7_REVISION
    || witness.source.fallbackStatus !== 'none') {
    throw new Error('Hill optical compositor route or source identity is fallback or substituted');
  }
  const attachments = witness.attachments;
  if (!witness.frameId || !attachments || Object.values(attachments).some(
    attachment => attachment.frameId !== witness.frameId || attachment.authority !== 'host_live_frame',
  )) {
    throw new Error('Hill optical compositor attachments are stale or mixed-frame');
  }
  const timing = witness.timing;
  if (!timing
    || timing.cadence !== HILL_OPTICAL_ATTACHMENT_CADENCE
    || !Number.isSafeInteger(timing.displayFrameGeneration)
    || timing.displayFrameGeneration <= 0
    || timing.cameraGeneration !== timing.displayFrameGeneration
    || timing.sceneColorGeneration !== timing.displayFrameGeneration
    || timing.sceneDepthGeneration !== timing.displayFrameGeneration
    || timing.opticalSubmissionGeneration !== timing.displayFrameGeneration
    || timing.retainedFrame !== false) {
    throw new Error('Hill optical compositor retained or mixed a stale display-frame attachment');
  }
  const output = witness.output;
  if (!output?.encoded || !output.submitted || output.blank || output.partial
    || output.wetSampleCount <= 0 || output.drawableWetTriangleCount <= 0
    || output.observedPixelCount <= 0) {
    throw new Error('Hill optical compositor output is blank, partial, or unobserved');
  }
}

export function createHillKaminosOpticalFailureReport(input: {
  failurePhase: string;
  lastTrustworthyEvidence: string;
  reportPath: string;
}) {
  return {
    schema: 'lerms.hill-of-hills.full-fluid-optical-compositor-failure.v0' as const,
    status: 'failed_before_primary_output' as const,
    requestedRoute: HILL_KAMINOS_OPTICAL_COMPOSITOR_ROUTE,
    effectiveRoute: null,
    primaryOutputWritten: false as const,
    failurePhase: input.failurePhase,
    lastTrustworthyEvidence: input.lastTrustworthyEvidence,
    reportPath: input.reportPath,
  };
}
