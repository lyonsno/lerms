import {
  HILL_KAMINOS_OPTICAL_COMPOSITOR_ROUTE,
  HILL_OPTICAL_ATTACHMENT_CADENCE,
  assertHillKaminosOpticalCompositorWitness,
  createHillKaminosOpticalFailureReport,
  createHillKaminosOpticalHostFrame,
} from '../src/fluid/hill-kaminos-optical-compositor-contract.js';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const identity = {
  frameId: 'hill-optical-frame-42',
  width: 1496,
  height: 998,
  view: Array.from({ length: 16 }, (_, index) => index % 5 === 0 ? 1 : 0),
  viewProjection: Array.from({ length: 16 }, (_, index) => index % 5 === 0 ? 1 : 0),
  inverseViewProjection: Array.from({ length: 16 }, (_, index) => index % 5 === 0 ? 1 : 0),
  positionWorld: [0, 12, 18] as const,
  nearMeters: 0.1,
  farMeters: 80,
};
const host = createHillKaminosOpticalHostFrame(identity);
assert(
  HILL_OPTICAL_ATTACHMENT_CADENCE === 'display_cadenced_same_frame',
  'Hill optics must not retain a lower-cadence camera attachment',
);
assert(host.sceneColor.frameId === identity.frameId, 'scene color is joined to the exact host frame');
assert(host.sceneColor.format === 'rgba16float' && host.sceneColor.colorSpace === 'linear_hdr', 'scene color is linear HDR');
assert(host.sceneDepth.format === 'r32float', 'scene depth uses the renderer contract format');
assert(host.sceneDepth.encoding === 'linear_view_depth_meters', 'scene depth is explicitly linear view depth');
assert(host.sceneDepth.authority === 'host_live_frame', 'scene depth cannot be a projection or fallback');
assert(host.environment.mapping === 'equirectangular_world_radiance', 'environment mapping is explicit');
assert(host.target.format === 'bgra8unorm', 'overlay target matches the WebGPU canvas format');

const witness = {
  schema: 'lerms.hill-of-hills.full-fluid-optical-compositor.v0',
  status: 'observed' as const,
  route: {
    requested: HILL_KAMINOS_OPTICAL_COMPOSITOR_ROUTE,
    effective: HILL_KAMINOS_OPTICAL_COMPOSITOR_ROUTE,
    fallback: null,
  },
  kaminosRevision: '355572977cdfdb7c27958994ede61ec967ac4623',
  rendererRoute: 'kaminos/finger-fluid/portable-macro-screen-space-optics-v0',
  shaderRoute: 'wgsl-portable-macro-fresnel-refraction-absorption-v0',
  frameId: identity.frameId,
  timing: {
    cadence: HILL_OPTICAL_ATTACHMENT_CADENCE,
    displayFrameGeneration: 42,
    cameraGeneration: 42,
    sceneColorGeneration: 42,
    sceneDepthGeneration: 42,
    opticalSubmissionGeneration: 42,
    retainedFrame: false as const,
  },
  attachments: {
    sceneColor: host.sceneColor,
    sceneDepth: host.sceneDepth,
    environment: host.environment,
    target: host.target,
  },
  source: {
    providerRevision: '355572977cdfdb7c27958994ede61ec967ac4623',
    terrainEpoch: 1,
    fluidEpoch: 87,
    fallbackStatus: 'none',
  },
  output: {
    wetSampleCount: 90,
    drawableWetTriangleCount: 132,
    encoded: true,
    submitted: true,
    observedPixelCount: 4120,
    blank: false,
    partial: false,
  },
};
assertHillKaminosOpticalCompositorWitness(witness);

for (const invalid of [
  { ...witness, route: { ...witness.route, effective: 'cyan-debug' } },
  { ...witness, attachments: { ...witness.attachments, sceneDepth: { ...host.sceneDepth, frameId: 'stale-frame' } } },
  { ...witness, timing: { ...witness.timing, opticalSubmissionGeneration: 41, retainedFrame: true } },
  { ...witness, output: { ...witness.output, observedPixelCount: 0, blank: true } },
]) {
  let rejected = false;
  try {
    assertHillKaminosOpticalCompositorWitness(invalid);
  } catch {
    rejected = true;
  }
  assert(rejected, 'fallback, stale or retained attachment, and blank output probes must fail');
}

const failure = createHillKaminosOpticalFailureReport({
  failurePhase: 'create-scene-depth',
  lastTrustworthyEvidence: 'same-frame-camera-validated',
  reportPath: '/tmp/hill-optical-failure.json',
});
assert(failure.primaryOutputWritten === false, 'pre-output failure cannot claim primary output');
assert(failure.failurePhase === 'create-scene-depth', 'failure report preserves exact phase');
assert(failure.reportPath.endsWith('.json'), 'failure report preserves a durable report target');

console.log('Hill Kaminos optical compositor contracts passed');
