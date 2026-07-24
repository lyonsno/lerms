import * as THREE from 'three';
import {
  KAMINOS_FINGER_FLUID_LIVE_INLET_CONTRACT,
  KAMINOS_FINGER_FLUID_LIVE_INLET_RELEASE_CONTRACT,
  createWebGPUFingerFluidSolver,
  type FingerFluidSolver,
} from 'kaminos/finger-fluid-webgpu-core.js';
import {
  LIVE_HAND_ROUTE,
  MANO_DISPLAY_ORIENTATION,
  assertLiveRuntimeHealth,
  normalizeLiveManoFrame,
  normalizeManoSurface,
  summarizeLiveHandLatency,
  type LiveHandLatencySample,
  type NormalizedManoFrame,
  type NormalizedManoSurface,
  type RuntimeRouteTruth,
} from './live-hand-contract.js';
import {
  LIVE_HAND_CAPTURE_REPLY_DEADLINE_MS,
  LIVE_HAND_CAPTURE_WORKER_ROUTE,
  isCaptureRunCurrent,
  normalizeCaptureWorkerResult,
  type LiveHandCaptureWorkerResult,
} from './live-hand-capture-contract.js';
import {
  LIVE_HAND_FLUID_PIXEL_RATIO_CAP,
  advanceFluidSimulationClock,
  decideLiveHandFrameWork,
  initializeFluidSimulationClock,
  planLiveFluidSimulationCatchUp,
  shouldKeepHandPresentationPriority,
  type LiveHandFrameWorkReason,
} from './live-hand-frame-budget.js';
import {
  KAMINOS_FLUID_REVISION,
  LIVE_FINGER_FLUID_ADAPTER_CONTRACT,
  LIVE_FLUID_CAMERA,
  createLiveFingerFluidEmitterPacket,
  isLiveFingerFluidPacketFresh,
  normalizeLiveFingerFluidEconomics,
  resolveLiveFingerFluidRouteEconomics,
  type LiveFingerFluidEconomics,
  type LiveFingerFluidEconomicsOptions,
  type LiveFingerFluidPacket,
} from './live-finger-fluid.js';

const params = new URLSearchParams(window.location.search);
const runtimeUrl = params.get('runtime_url') || 'http://127.0.0.1:8766';
const fixtureMode = params.get('fixture') === '1';
const fluidAssayMode = params.get('fluid_assay') === '1';
const captureIntervalMs = 50;
const maxFrameAgeMs = 750;
const LIVE_FLUID_ENVELOPE_ASSAY_ROUTE = 'lerms.live-fluid-envelope.synthetic-assay.v0' as const;

function resolveRequestedParticleCount(value: string | null, fallback: number): number {
  if (value === null || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new RangeError(`fluid_particles must be a positive safe integer, received ${value}`);
  }
  return parsed;
}

const LERMS_LIVE_FLUID_PARTICLE_COUNT = resolveRequestedParticleCount(params.get('fluid_particles'), 2_400);

function requiredElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`missing #${id}`);
  return element as T;
}

const canvas = requiredElement<HTMLCanvasElement>('hand-canvas');
const fluidCanvas = requiredElement<HTMLCanvasElement>('fluid-canvas');
const video = requiredElement<HTMLVideoElement>('camera');
const toggle = requiredElement<HTMLButtonElement>('hand-toggle');
const status = requiredElement<HTMLDivElement>('status');
const routeTruth = requiredElement<HTMLDivElement>('route-truth');
const fluxControl = requiredElement<HTMLInputElement>('fluid-flux');
const activeBudgetControl = requiredElement<HTMLInputElement>('fluid-active-budget');
const opticalDensityControl = requiredElement<HTMLInputElement>('fluid-optical-density');
const reconstructionRadiusControl = requiredElement<HTMLInputElement>('fluid-reconstruction-radius');
const lifetimeControl = requiredElement<HTMLInputElement>('fluid-lifetime');
const densityValueElements = {
  flux: requiredElement<HTMLSpanElement>('fluid-flux-value'),
  activeBudget: requiredElement<HTMLSpanElement>('fluid-active-budget-value'),
  opticalDensity: requiredElement<HTMLSpanElement>('fluid-optical-density-value'),
  reconstructionRadius: requiredElement<HTMLSpanElement>('fluid-reconstruction-radius-value'),
  lifetime: requiredElement<HTMLSpanElement>('fluid-lifetime-value'),
};

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.setClearColor(0x000000, 0);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.18;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x040809, 0.055);
const camera = new THREE.PerspectiveCamera(32, 1, 0.01, 30);
camera.position.set(0, 0.05, 5.1);

scene.add(new THREE.HemisphereLight(0x9adfe4, 0x091112, 1.35));
const key = new THREE.DirectionalLight(0x9be9ef, 5.2);
key.position.set(-2.8, 3.4, 4.2);
scene.add(key);
const fill = new THREE.DirectionalLight(0xffad73, 2.4);
fill.position.set(3.1, -1.8, 2.2);
scene.add(fill);
const rim = new THREE.DirectionalLight(0x75ffc1, 3.6);
rim.position.set(0.5, 1.1, -3.5);
scene.add(rim);

const handGeometry = new THREE.BufferGeometry();
const handMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x4e91a6,
  roughness: 0.36,
  metalness: 0.12,
  clearcoat: 0.48,
  clearcoatRoughness: 0.34,
  side: THREE.DoubleSide,
});
const handMesh = new THREE.Mesh(handGeometry, handMaterial);
handMesh.visible = false;
scene.add(handMesh);

let stream: MediaStream | null = null;
let running = false;
let captureRunGeneration = 0;
let captureInFlightGeneration: number | null = null;
let captureTimer: number | null = null;
let capturePostAbortController: AbortController | null = null;
let stateAbortController: AbortController | null = null;
let lastStateSequence = 0;
let frameSequence = 0;
let lastLiveAt = 0;
let runtimeRoute: RuntimeRouteTruth | null = null;
let targetPositions: Float32Array | null = null;
let currentPositions: Float32Array | null = null;
let topologySignature = '';
let handPresentationPending = false;
let fluidSolver: FingerFluidSolver | null = null;
let fluidInitialization: Promise<FingerFluidSolver> | null = null;
let fluidError: string | null = null;
let latestFluidPacket: LiveFingerFluidPacket | null = null;
let latestFluidFrame: NormalizedManoFrame | null = null;
let densityBenchAuthority: 'none' | 'fixture_density_bench_not_live_hand' = 'none';
let fluidAssayRunning = false;
let fluidAssayReceipt: Record<string, unknown> | null = null;
let fluidAssayDiagnostics: Record<string, unknown> | null = null;
let fluidStepCount = 0;
let fluidSubmitCount = 0;
let fluidCompletedSubmitCount = 0;
let fluidSubmittedSimulationAdvanceMs = 0;
let fluidCompletedSimulationAdvanceMs = 0;
let fluidClockStartedAt = 0;
let fluidGpuBusy = false;
let fluidGpuCompletionGeneration = 0;
let fluidGpuCompletionError: string | null = null;
let latestLiveInletReceipt: ReturnType<FingerFluidSolver['setLiveInletPacket']> | null = null;
let liveFluidEconomics: LiveFingerFluidEconomics = normalizeLiveFingerFluidEconomics({
  requestedParticleCount: LERMS_LIVE_FLUID_PARTICLE_COUNT,
});
let lastAnimationFrameAt = 0;
let fluidSimulationClockAt = 0;
let lastFluidWallSubmitAt = 0;
let captureWorker: Worker | null = null;
let captureWorkerError: string | null = null;
const animationFrameIntervalsMs: number[] = [];
const fluidSubmitIntervalsMs: number[] = [];
const combinedCpuSubmitMs: number[] = [];
const handRenderCpuMs: number[] = [];
const fluidStepCpuMs: number[] = [];
const fluidRenderCpuMs: number[] = [];
const fluidGpuQueueDrainMs: number[] = [];
const fluidFrameDecisionCounts: Record<LiveHandFrameWorkReason, number> = {
  fluid_due: 0,
  hitch_recovery: 0,
  gpu_backpressure: 0,
  cadence_wait: 0,
};
const captureAcquireMs: number[] = [];
const captureWorkerEncodeMs: number[] = [];
const pendingCaptureWorkerResults = new Map<string, {
  resolve: (result: LiveHandCaptureWorkerResult) => void;
  reject: (error: Error) => void;
  timeoutId: number;
}>();
interface RuntimeLatencySample extends LiveHandLatencySample {
  schema: 'hand-state.viewer-latency-sample.v0';
  benchmarkSessionId: string;
  requestedRoute: string;
  model: string;
  deviceRoute: string;
  dtypeRoute: string;
  captureTimestampMs: number;
  viewerReceiveTimestampMs: number;
  captureAcquireMs: number;
  workerEncodeMs: number;
  captureRoute: typeof LIVE_HAND_CAPTURE_WORKER_ROUTE;
  clientEncodeMs: number;
  nativePostMs: number;
  captureToSidecarPublishMs: number;
  publishToViewerReceiveMs: number;
  captureToViewerReceiveMs: number;
  viewerReceiveToWebglRenderReturnMs?: number;
  handRenderCpuMs?: number;
  interactionFrameIntervalMs?: number;
  interactionFrameFluidDecision?: LiveHandFrameWorkReason;
  renderCompletionAuthority: 'webgl_render_call_complete_not_compositor_presented';
}

let benchmarkSessionId = '';
let pendingLatencySample: RuntimeLatencySample | null = null;
let benchmarkDroppedBeforeRender = 0;
let lastBenchmarkError: string | null = null;
const captureMetricsByFrame = new Map<string, {
  capturedAtMs: number;
  captureAcquireMs: number;
  workerEncodeMs: number;
  clientEncodeMs: number;
  nativePostMs: number;
}>();
const latencySamples: RuntimeLatencySample[] = [];
const unflushedLatencySamples: RuntimeLatencySample[] = [];
let latencyFlushTimer: number | null = null;

function setStatus(message: string, state: 'idle' | 'live' | 'error' = 'idle'): void {
  status.textContent = message;
  status.dataset.state = state;
}

function readFiniteInput(input: HTMLInputElement, fallback: number): number {
  const value = Number(input.value);
  return Number.isFinite(value) ? value : fallback;
}

function readFluidEconomicsControls(): Required<LiveFingerFluidEconomicsOptions> {
  return {
    requestedParticleCount: LERMS_LIVE_FLUID_PARTICLE_COUNT,
    requestedActiveParticleBudget: readFiniteInput(activeBudgetControl, 720),
    sourceFluxParticlesPerSecond: readFiniteInput(fluxControl, 360),
    opticalDensityScale: readFiniteInput(opticalDensityControl, 2.2),
    reconstructionRadiusScale: readFiniteInput(reconstructionRadiusControl, 1.6),
    lifetimeSeconds: readFiniteInput(lifetimeControl, 6),
  };
}

function syncFluidEconomicsControls(economics: LiveFingerFluidEconomics): void {
  fluxControl.value = String(economics.sourceFluxParticlesPerSecond);
  activeBudgetControl.value = String(economics.requestedActiveParticleBudget);
  opticalDensityControl.value = String(economics.opticalDensityScale);
  reconstructionRadiusControl.value = String(economics.reconstructionRadiusScale);
  lifetimeControl.value = String(economics.lifetimeSeconds);
  densityValueElements.flux.textContent = economics.sourceFluxParticlesPerSecond.toFixed(0);
  densityValueElements.activeBudget.textContent = economics.effectiveActiveParticleBudget.toFixed(0);
  densityValueElements.opticalDensity.textContent = economics.opticalDensityScale.toFixed(1);
  densityValueElements.reconstructionRadius.textContent = economics.reconstructionRadiusScale.toFixed(1);
  densityValueElements.lifetime.textContent = economics.lifetimeSeconds.toFixed(1);
}

const routeFluidResolution = resolveLiveFingerFluidRouteEconomics(params, readFluidEconomicsControls());
const queryFluidEconomics = routeFluidResolution.economics;
const routeConfigError = routeFluidResolution.error;

function updateFluidEconomicsFromControls(): void {
  liveFluidEconomics = normalizeLiveFingerFluidEconomics(readFluidEconomicsControls());
  syncFluidEconomicsControls(liveFluidEconomics);
  if (latestFluidFrame && fluidSolver?.available) {
    publishFluidPacketForFrame(latestFluidFrame);
  }
  setRouteTruth();
}

function fluidDebugNumber(source: Record<string, unknown> | null, key: string): number | null {
  const value = source?.[key];
  return Number.isFinite(value) ? Number(value) : null;
}

function setRouteTruth(frame?: NormalizedManoFrame): void {
  if (fluidAssayMode) {
    const fluidState = fluidSolver?.available ? fluidSolver.getDebugState() : null;
    const effectiveParticleCount = typeof fluidState?.baseParticleCount === 'number'
      ? fluidState.baseParticleCount
      : null;
    routeTruth.textContent = `${LIVE_FLUID_ENVELOPE_ASSAY_ROUTE} | synthetic assay, not live hand authority | fluid ${effectiveParticleCount ?? 'unverified'}p effective / ${LERMS_LIVE_FLUID_PARTICLE_COUNT}p requested`;
    return;
  }
  if (!runtimeRoute) {
    routeTruth.textContent = 'route unverified';
    return;
  }
  const route = frame?.effectiveRoute || 'awaiting live effective route';
  const topology = frame ? `${frame.vertexCount}v / ${frame.faceCount}f` : 'awaiting MANO topology';
  const fluidState = fluidSolver?.available ? fluidSolver.getDebugState() : null;
  const effectiveParticleCount = typeof fluidState?.baseParticleCount === 'number'
    ? fluidState.baseParticleCount
    : null;
  const liveInlets = fluidState?.liveInlets && typeof fluidState.liveInlets === 'object'
    ? fluidState.liveInlets as Record<string, unknown>
    : null;
  const activeParticleCount = fluidDebugNumber(fluidState?.diagnostics as Record<string, unknown> | null, 'activeParticleCount');
  const dormantParticleCount = fluidDebugNumber(fluidState?.diagnostics as Record<string, unknown> | null, 'dormantParticleCount');
  const effectiveReleaseRate = Number.isFinite(latestLiveInletReceipt?.expectedParticleReleaseRate)
    ? Number(latestLiveInletReceipt?.expectedParticleReleaseRate)
    : fluidDebugNumber(liveInlets, 'expectedParticleReleaseRate');
  const fluid = fluidSolver?.available
    ? ` | fluid ${effectiveParticleCount ?? 'unverified'}p effective / ${liveFluidEconomics.requestedParticleCount}p requested | flux ${liveFluidEconomics.sourceFluxParticlesPerSecond.toFixed(0)} -> ${effectiveReleaseRate?.toFixed(0) ?? 'unverified'}pps | active ${activeParticleCount ?? liveInlets?.initialActiveParticleCount ?? 'diag-pending'} / dormant ${dormantParticleCount ?? liveInlets?.initialDormantParticleCount ?? 'diag-pending'} @ ${KAMINOS_FLUID_REVISION.slice(0, 8)}`
    : fluidError ? ' | fluid error' : ' | fluid pending';
  routeTruth.textContent = `${route} | ${runtimeRoute.burstMode} ${runtimeRoute.chunkSegments || 0}x @ ${runtimeRoute.chunkYieldMs}ms | ${topology}${fluid}`;
}

async function runtimeFetch(path: string, init: RequestInit = {}): Promise<Record<string, unknown>> {
  const response = await fetch(`${runtimeUrl}${path}`, { cache: 'no-store', ...init });
  const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) throw new Error(typeof payload.error === 'string' ? payload.error : `${path} returned ${response.status}`);
  return payload;
}

function updateSurface(surface: NormalizedManoSurface): void {
  targetPositions = surface.positions;
  if (!currentPositions || currentPositions.length !== targetPositions.length) currentPositions = targetPositions.slice();
  const position = handGeometry.getAttribute('position') as THREE.BufferAttribute | undefined;
  if (!position || position.array.length !== currentPositions.length) {
    handGeometry.setAttribute('position', new THREE.BufferAttribute(currentPositions, 3));
  }
  const nextTopologySignature = `${surface.faceCount}:${surface.indices[0]}:${surface.indices.at(-1)}`;
  if (topologySignature !== nextTopologySignature) {
    handGeometry.setIndex(new THREE.BufferAttribute(surface.indices, 1));
    topologySignature = nextTopologySignature;
  }
  handMesh.visible = true;
  lastLiveAt = performance.now();
}

function publishFluidPacketForFrame(frame: NormalizedManoFrame): void {
  if (!fluidSolver?.available) return;
  densityBenchAuthority = 'none';
  latestFluidFrame = frame;
  latestFluidPacket = createLiveFingerFluidEmitterPacket({
    eventSequence: frame.eventSequence,
    frameId: frame.frameId,
    captureTimestampMs: frame.captureTimestampMs,
    effectiveRoute: frame.effectiveRoute,
    confidence: frame.confidence,
    handedness: frame.handedness,
    keypoints3d: frame.keypoints3d,
    manoTransform: frame.manoTransform,
    viewport: { width: window.innerWidth, height: window.innerHeight },
  }, liveFluidEconomics);
  latestLiveInletReceipt = fluidSolver.setLiveInletPacket(latestFluidPacket);
}

async function applyDensityBenchFixture(fingerCase: 'one-finger' | 'five-finger'): Promise<void> {
  const solver = await ensureFluidSolver();
  updateFluidEconomicsFromControls();
  densityBenchAuthority = 'fixture_density_bench_not_live_hand';
  const activeCount = fingerCase === 'five-finger' ? 5 : 1;
  const spacing = 0.22;
  const originY = 0.82;
  const emitters = Array.from({ length: 5 }, (_, index) => {
    const active = index < activeCount;
    const x = (index - 2) * spacing;
    return {
      id: ['thumb', 'index', 'middle', 'ring', 'pinky'][index],
      origin_world: [x, originY, -0.86] as const,
      aim_world: [0, -0.12, -0.9928] as const,
      extension: active ? 1 : 0,
      emission_state: active ? 'jet' as const : 'off' as const,
      chemistry: index === 1 ? 'knockback' : index === 2 ? 'pooling' : 'weird',
      radius: (index === 2 ? 0.052 : 0.044) * liveFluidEconomics.reconstructionRadiusScale,
      strength: 1.15 * liveFluidEconomics.opticalDensityScale,
      source_flux_particles_per_second: active
        ? liveFluidEconomics.sourceFluxParticlesPerSecond / activeCount
        : 0,
      optical_density_scale: liveFluidEconomics.opticalDensityScale,
      reconstruction_radius_scale: liveFluidEconomics.reconstructionRadiusScale,
      lifetime_seconds: liveFluidEconomics.lifetimeSeconds,
      active,
    };
  });
  latestFluidPacket = {
    packet_id: `lerms-density-bench-${fingerCase}-${Date.now()}`,
    route_identity: 'lerms_density_bench_fixture_not_live_hand',
    adapter_contract: LIVE_FINGER_FLUID_ADAPTER_CONTRACT,
    source_route: 'lerms_density_bench_fixture_not_live_hand',
    source_frame_id: `density-bench-${fingerCase}`,
    timestamp_ms: Date.now(),
    sample_age_ms: 0,
    simulation_authority: 'live_simulation',
    authority: {
      simulation_safe: true,
      stale: false,
      reason: 'fixture_density_bench_not_live_hand',
    },
    economics: liveFluidEconomics,
    emitters,
  };
  latestLiveInletReceipt = solver.setLiveInletPacket(latestFluidPacket);
  setRouteTruth();
}

function updateHandSurface(frame: NormalizedManoFrame): void {
  updateSurface(frame);
  handPresentationPending = true;
  if (!fluidAssayMode) publishFluidPacketForFrame(frame);
  setRouteTruth(frame);
}

function deactivateFluidInlets(reason: string): void {
  latestFluidPacket = null;
  latestFluidFrame = null;
  latestLiveInletReceipt = fluidSolver?.setLiveInletPacket({
    packet_id: `lerms-hand-fluid-invalid-${Date.now()}`,
    route_identity: LIVE_HAND_ROUTE,
    adapter_contract: LIVE_FINGER_FLUID_ADAPTER_CONTRACT,
    source_route: LIVE_HAND_ROUTE,
    simulation_authority: 'invalid',
    authority: { simulation_safe: false, stale: true, reason },
    economics: liveFluidEconomics,
    emitters: [],
  }) ?? null;
  setRouteTruth();
}

async function ensureFluidSolver(): Promise<FingerFluidSolver> {
  if (fluidSolver) return fluidSolver;
  if (!fluidInitialization) {
    fluidInitialization = createWebGPUFingerFluidSolver({
      canvas: fluidCanvas,
      particleCount: LERMS_LIVE_FLUID_PARTICLE_COUNT,
      truthScene: 'live_hand_inlets',
      rendererMode: 'screen_space_refraction',
      colorMode: 'chemistry',
      transparentBackground: false,
    }).then(solver => {
      if (!solver.available) throw new Error(solver.reason || 'Kaminos WebGPU fluid unavailable');
      fluidSolver = solver;
      fluidError = null;
      solver.render({
        width: window.innerWidth,
        height: window.innerHeight,
        pixelRatio: Math.min(window.devicePixelRatio || 1, LIVE_HAND_FLUID_PIXEL_RATIO_CAP),
        ...LIVE_FLUID_CAMERA,
      });
      setRouteTruth();
      return solver;
    }).catch(error => {
      fluidInitialization = null;
      fluidError = error instanceof Error ? error.message : String(error);
      throw error;
    });
  }
  return fluidInitialization;
}

function updateInterpolatedSurface(): boolean {
  if (!targetPositions || !currentPositions) return false;
  let maxDelta = 0;
  for (let index = 0; index < targetPositions.length; index += 1) {
    const delta = targetPositions[index] - currentPositions[index];
    currentPositions[index] += delta * 0.72;
    maxDelta = Math.max(maxDelta, Math.abs(delta));
  }
  const position = handGeometry.getAttribute('position') as THREE.BufferAttribute | undefined;
  if (position) position.needsUpdate = true;
  if (maxDelta > 0.0002) {
    handGeometry.computeVertexNormals();
    handGeometry.computeBoundingSphere();
  }
  return maxDelta > 0.0002;
}

function resetBenchmark(): void {
  benchmarkSessionId = globalThis.crypto?.randomUUID?.() || `lerms-hand-${Date.now()}`;
  pendingLatencySample = null;
  benchmarkDroppedBeforeRender = 0;
  lastBenchmarkError = null;
  captureMetricsByFrame.clear();
  latencySamples.length = 0;
  unflushedLatencySamples.length = 0;
  captureAcquireMs.length = 0;
  captureWorkerEncodeMs.length = 0;
  if (latencyFlushTimer !== null) window.clearTimeout(latencyFlushTimer);
  latencyFlushTimer = null;
}

function resetFluidEnvelopeMetrics(): void {
  fluidStepCount = 0;
  fluidSubmitCount = 0;
  fluidCompletedSubmitCount = 0;
  fluidSubmittedSimulationAdvanceMs = 0;
  fluidCompletedSimulationAdvanceMs = 0;
  fluidClockStartedAt = 0;
  fluidGpuBusy = false;
  fluidGpuCompletionGeneration += 1;
  fluidGpuCompletionError = null;
  lastAnimationFrameAt = 0;
  fluidSimulationClockAt = 0;
  lastFluidWallSubmitAt = 0;
  animationFrameIntervalsMs.length = 0;
  fluidSubmitIntervalsMs.length = 0;
  combinedCpuSubmitMs.length = 0;
  handRenderCpuMs.length = 0;
  fluidStepCpuMs.length = 0;
  fluidRenderCpuMs.length = 0;
  fluidGpuQueueDrainMs.length = 0;
  for (const reason of Object.keys(fluidFrameDecisionCounts) as LiveHandFrameWorkReason[]) {
    fluidFrameDecisionCounts[reason] = 0;
  }
}

function createFluidEnvelopeAssayPacket({
  emitterCount,
  radius,
  strength,
}: {
  emitterCount: 1 | 5;
  radius: number;
  strength: number;
}): LiveFingerFluidPacket {
  if (emitterCount !== 1 && emitterCount !== 5) {
    throw new RangeError(`fluid envelope emitter count must be 1 or 5, received ${emitterCount}`);
  }
  if (!Number.isFinite(radius) || radius <= 0) {
    throw new RangeError(`fluid envelope radius must be finite and positive, received ${radius}`);
  }
  if (!Number.isFinite(strength) || strength <= 0) {
    throw new RangeError(`fluid envelope strength must be finite and positive, received ${strength}`);
  }
  const xPositions = emitterCount === 1 ? [0] : [-0.48, -0.24, 0, 0.24, 0.48];
  const timestampMs = Date.now();
  return {
    packet_id: `lerms-fluid-envelope-${emitterCount}-${timestampMs}`,
    route_identity: LIVE_FLUID_ENVELOPE_ASSAY_ROUTE,
    adapter_contract: LIVE_FINGER_FLUID_ADAPTER_CONTRACT,
    source_route: LIVE_FLUID_ENVELOPE_ASSAY_ROUTE,
    source_frame_id: `synthetic-assay-${timestampMs}`,
    timestamp_ms: timestampMs,
    sample_age_ms: 0,
    simulation_authority: 'live_simulation',
    authority: { simulation_safe: true, stale: false, reason: null },
    economics: liveFluidEconomics,
    emitters: xPositions.map((x, index) => ({
      id: `assay-${index}`,
      origin_world: [x, 0.72, -0.8] as const,
      aim_world: [0, -0.18, -0.983666] as const,
      extension: 1,
      emission_state: 'jet' as const,
      chemistry: index === 0 ? 'knockback' : index === 1 ? 'pooling' : 'weird',
      radius: radius * liveFluidEconomics.reconstructionRadiusScale,
      strength: strength * liveFluidEconomics.opticalDensityScale,
      source_flux_particles_per_second: liveFluidEconomics.sourceFluxParticlesPerSecond / emitterCount,
      optical_density_scale: liveFluidEconomics.opticalDensityScale,
      reconstruction_radius_scale: liveFluidEconomics.reconstructionRadiusScale,
      lifetime_seconds: liveFluidEconomics.lifetimeSeconds,
      active: true,
    })),
  };
}

async function flushLatencySamples(): Promise<void> {
  if (latencyFlushTimer !== null) window.clearTimeout(latencyFlushTimer);
  latencyFlushTimer = null;
  if (!unflushedLatencySamples.length) return;
  const batch = unflushedLatencySamples.splice(0);
  try {
    await runtimeFetch('/viewer-latency-samples', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ schema: 'hand-state.viewer-latency-batch.v0', samples: batch }),
    });
  } catch (error) {
    unflushedLatencySamples.unshift(...batch);
    lastBenchmarkError = error instanceof Error ? error.message : String(error);
    if (running && latencyFlushTimer === null) latencyFlushTimer = window.setTimeout(() => void flushLatencySamples(), 1000);
  }
}

function scheduleLatencyFlush(): void {
  if (latencyFlushTimer === null) latencyFlushTimer = window.setTimeout(() => void flushLatencySamples(), 1000);
}

function rejectCaptureWorkerResults(error: Error): void {
  for (const pending of pendingCaptureWorkerResults.values()) {
    window.clearTimeout(pending.timeoutId);
    pending.reject(error);
  }
  pendingCaptureWorkerResults.clear();
}

function disposeCaptureWorker(error: Error): void {
  rejectCaptureWorkerResults(error);
  captureWorker?.terminate();
  captureWorker = null;
}

function failCaptureWorker(worker: Worker, error: Error): void {
  if (captureWorker !== worker) return;
  captureWorkerError = error.message;
  disposeCaptureWorker(error);
  deactivateFluidInlets('capture_worker_failed');
  setStatus(error.message, 'error');
}

function ensureCaptureWorker(): Worker {
  if (captureWorker) return captureWorker;
  if (typeof VideoFrame !== 'function' || typeof Worker !== 'function') {
    throw new Error(`${LIVE_HAND_CAPTURE_WORKER_ROUTE} is unavailable in this browser`);
  }
  const worker = new Worker(new URL('./live-hand-capture.worker.ts', import.meta.url), { type: 'module' });
  worker.addEventListener('message', event => {
    const value = event.data as Record<string, unknown>;
    const captureId = typeof value?.captureId === 'string' ? value.captureId : '';
    const pending = pendingCaptureWorkerResults.get(captureId);
    if (!pending) return;
    if (value.schema === 'lerms.live-hand-capture-error.v0') {
      const route = value.routeIdentity === LIVE_HAND_CAPTURE_WORKER_ROUTE
        ? LIVE_HAND_CAPTURE_WORKER_ROUTE
        : 'unverified capture route';
      failCaptureWorker(worker, new Error(`${route}: ${typeof value.error === 'string' ? value.error : 'capture worker failed'}`));
      return;
    }
    try {
      const result = normalizeCaptureWorkerResult(value, captureId);
      pendingCaptureWorkerResults.delete(captureId);
      window.clearTimeout(pending.timeoutId);
      pending.resolve(result);
    } catch (error) {
      failCaptureWorker(worker, error instanceof Error ? error : new Error(String(error)));
    }
  });
  worker.addEventListener('error', event => {
    failCaptureWorker(worker, new Error(event.message || 'capture worker crashed'));
  });
  worker.addEventListener('messageerror', () => {
    failCaptureWorker(worker, new Error(`${LIVE_HAND_CAPTURE_WORKER_ROUTE} returned an unreadable message`));
  });
  captureWorker = worker;
  return worker;
}

function encodeCameraFrame(
  captureId: string,
  frame: VideoFrame,
  width: number,
  height: number,
): Promise<LiveHandCaptureWorkerResult> {
  const worker = ensureCaptureWorker();
  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      if (!pendingCaptureWorkerResults.has(captureId)) return;
      failCaptureWorker(worker, new Error(
        `${LIVE_HAND_CAPTURE_WORKER_ROUTE} missed the ${LIVE_HAND_CAPTURE_REPLY_DEADLINE_MS}ms live-frame deadline`,
      ));
    }, LIVE_HAND_CAPTURE_REPLY_DEADLINE_MS);
    pendingCaptureWorkerResults.set(captureId, { resolve, reject, timeoutId });
    try {
      worker.postMessage({ captureId, frame, width, height, quality: 0.78 }, [frame]);
    } catch (error) {
      pendingCaptureWorkerResults.delete(captureId);
      window.clearTimeout(timeoutId);
      frame.close();
      reject(error instanceof Error ? error : new Error(String(error)));
    }
  });
}

async function captureFrame(runGeneration: number): Promise<void> {
  if (
    !isCaptureRunCurrent(runGeneration, captureRunGeneration, running)
    || captureWorkerError
    || captureInFlightGeneration !== null
    || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA
  ) return;
  captureInFlightGeneration = runGeneration;
  try {
    const sourceWidth = Math.max(video.videoWidth || 640, 1);
    const width = Math.min(sourceWidth, 640);
    const height = Math.round(width * Math.max(video.videoHeight || 480, 1) / sourceWidth);
    const capturedAtMs = Date.now();
    const captureId = `run-${runGeneration}-${capturedAtMs}-${frameSequence += 1}`;
    const clientEncodeStartedAt = performance.now();
    const captureAcquireStartedAt = performance.now();
    const frame = new VideoFrame(video, { timestamp: capturedAtMs * 1000 });
    const acquisitionMs = performance.now() - captureAcquireStartedAt;
    const encoded = await encodeCameraFrame(captureId, frame, width, height);
    if (!isCaptureRunCurrent(runGeneration, captureRunGeneration, running)) return;
    const clientEncodeMs = performance.now() - clientEncodeStartedAt;
    captureAcquireMs.push(acquisitionMs);
    captureWorkerEncodeMs.push(encoded.workerEncodeMs);
    const postStartedAt = performance.now();
    const postController = new AbortController();
    capturePostAbortController = postController;
    await runtimeFetch('/native-frame', {
      method: 'POST',
      signal: postController.signal,
      headers: {
        'Content-Type': 'image/jpeg',
        'X-Capture-Id': captureId,
        'X-Capture-Epoch-Ms': String(capturedAtMs),
        'X-Frame-Width': String(width),
        'X-Frame-Height': String(height),
      },
      body: encoded.blob,
    });
    if (!isCaptureRunCurrent(runGeneration, captureRunGeneration, running)) return;
    captureMetricsByFrame.set(captureId, {
      capturedAtMs,
      captureAcquireMs: acquisitionMs,
      workerEncodeMs: encoded.workerEncodeMs,
      clientEncodeMs,
      nativePostMs: performance.now() - postStartedAt,
    });
    for (const [frameId, metrics] of captureMetricsByFrame) {
      if (capturedAtMs - metrics.capturedAtMs > 10_000) captureMetricsByFrame.delete(frameId);
    }
  } catch (error) {
    if (
      isCaptureRunCurrent(runGeneration, captureRunGeneration, running)
      && !(error instanceof DOMException && error.name === 'AbortError')
    ) setStatus(error instanceof Error ? error.message : String(error), 'error');
  } finally {
    if (captureInFlightGeneration === runGeneration) captureInFlightGeneration = null;
    capturePostAbortController = null;
  }
}

function applyState(state: Record<string, unknown>): void {
  if (captureWorkerError) {
    deactivateFluidInlets('capture_worker_failed');
    setStatus(captureWorkerError, 'error');
    return;
  }
  try {
    const frame = normalizeLiveManoFrame(state);
    updateHandSurface(frame);
    const captureMetrics = captureMetricsByFrame.get(frame.frameId);
    if (captureMetrics && !latencySamples.some(sample => sample.frameId === frame.frameId)) {
      if (pendingLatencySample) benchmarkDroppedBeforeRender += 1;
      const viewerReceiveTimestampMs = Date.now();
      const captureToViewerReceiveMs = Math.max(0, viewerReceiveTimestampMs - frame.captureTimestampMs);
      pendingLatencySample = {
        schema: 'hand-state.viewer-latency-sample.v0',
        benchmarkSessionId,
        frameId: frame.frameId,
        runtimeOwner: 'hand-state-runtime',
        sourceAuthority: 'live_simulation',
        requestedRoute: frame.requestedRoute,
        effectiveRoute: frame.effectiveRoute,
        model: frame.model,
        deviceRoute: frame.deviceRoute,
        dtypeRoute: frame.dtypeRoute,
        manoVertexCount: frame.vertexCount,
        manoFaceCount: frame.faceCount,
        captureTimestampMs: frame.captureTimestampMs,
        viewerReceiveTimestampMs,
        captureAcquireMs: captureMetrics.captureAcquireMs,
        workerEncodeMs: captureMetrics.workerEncodeMs,
        captureRoute: LIVE_HAND_CAPTURE_WORKER_ROUTE,
        clientEncodeMs: captureMetrics.clientEncodeMs,
        nativePostMs: captureMetrics.nativePostMs,
        modelLatencyMs: frame.modelLatencyMs,
        captureToSidecarPublishMs: frame.captureToSidecarPublishMs,
        publishToViewerReceiveMs: Math.max(0, captureToViewerReceiveMs - frame.captureToSidecarPublishMs),
        captureToViewerReceiveMs,
        captureToWebglRenderReturnMs: -1,
        renderCompletionAuthority: 'webgl_render_call_complete_not_compositor_presented',
      };
      captureMetricsByFrame.delete(frame.frameId);
    }
    const tail = latencySamples.length ? summarizeLiveHandLatency(latencySamples) : null;
    const receipt = tail ? ` | webgl-return p50 ${tail.captureToWebglRenderReturnMs.p50.toFixed(0)} p95 ${tail.captureToWebglRenderReturnMs.p95.toFixed(0)}ms` : '';
    setStatus(`live MANO | model ${frame.modelLatencyMs.toFixed(0)}ms${receipt}`, 'live');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('fresh live authority') || message.includes('MANO surface')) {
      deactivateFluidInlets('invalid_or_stale_hand_state');
      setStatus(`waiting for live MANO | ${message}`);
      return;
    }
    setStatus(message, 'error');
  }
}

async function streamState(): Promise<void> {
  while (running) {
    const controller = new AbortController();
    stateAbortController = controller;
    try {
      const state = await runtimeFetch(`/state/next?after_sequence=${lastStateSequence}&timeout_ms=1000&max_age_ms=${maxFrameAgeMs}`, { signal: controller.signal });
      if (!running) return;
      if (Number.isFinite(state.eventSequence)) lastStateSequence = Number(state.eventSequence);
      applyState(state);
    } catch (error) {
      if (!running || (error instanceof DOMException && error.name === 'AbortError')) return;
      deactivateFluidInlets('hand_state_delivery_error');
      setStatus(error instanceof Error ? error.message : String(error), 'error');
      await new Promise(resolve => window.setTimeout(resolve, 100));
    } finally {
      if (stateAbortController === controller) stateAbortController = null;
    }
  }
}

async function start(): Promise<void> {
  if (running) return;
  if (routeConfigError) throw new Error(`invalid fluid route: ${routeConfigError}`);
  if (fixtureMode) throw new Error('recorded fixture mode is visual-only');
  if (fluidAssayMode) throw new Error('synthetic fluid envelope assay cannot start live hand capture');
  setStatus('initializing current Kaminos fluid');
  await ensureFluidSolver();
  captureWorkerError = null;
  ensureCaptureWorker();
  setStatus('verifying runtime');
  runtimeRoute = assertLiveRuntimeHealth(await runtimeFetch('/health'));
  setRouteTruth();
  setStatus('opening camera');
  stream = await navigator.mediaDevices.getUserMedia({
    video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
    audio: false,
  });
  video.srcObject = stream;
  await video.play();
  await runtimeFetch('/sidecar/start', { method: 'POST' });
  resetBenchmark();
  animationFrameIntervalsMs.length = 0;
  fluidSubmitIntervalsMs.length = 0;
  combinedCpuSubmitMs.length = 0;
  lastAnimationFrameAt = 0;
  fluidSimulationClockAt = 0;
  lastFluidWallSubmitAt = 0;
  handPresentationPending = false;
  fluidStepCount = 0;
  fluidSubmitCount = 0;
  fluidCompletedSubmitCount = 0;
  fluidSubmittedSimulationAdvanceMs = 0;
  fluidCompletedSimulationAdvanceMs = 0;
  fluidClockStartedAt = 0;
  fluidGpuBusy = false;
  fluidGpuCompletionGeneration += 1;
  fluidGpuCompletionError = null;
  handRenderCpuMs.length = 0;
  fluidStepCpuMs.length = 0;
  fluidRenderCpuMs.length = 0;
  fluidGpuQueueDrainMs.length = 0;
  for (const reason of Object.keys(fluidFrameDecisionCounts) as LiveHandFrameWorkReason[]) {
    fluidFrameDecisionCounts[reason] = 0;
  }
  lastStateSequence = 0;
  captureRunGeneration += 1;
  const runGeneration = captureRunGeneration;
  running = true;
  toggle.textContent = 'Stop Hand';
  toggle.dataset.running = 'true';
  captureTimer = window.setInterval(() => void captureFrame(runGeneration), captureIntervalMs);
  void streamState();
  await captureFrame(runGeneration);
}

async function stop(): Promise<void> {
  running = false;
  fluidGpuCompletionGeneration += 1;
  fluidGpuBusy = false;
  captureRunGeneration += 1;
  if (captureTimer !== null) window.clearInterval(captureTimer);
  captureTimer = null;
  capturePostAbortController?.abort();
  capturePostAbortController = null;
  disposeCaptureWorker(new Error('hand control stopped'));
  stateAbortController?.abort();
  stateAbortController = null;
  stream?.getTracks().forEach(track => track.stop());
  stream = null;
  video.srcObject = null;
  deactivateFluidInlets('hand_control_stopped');
  await flushLatencySamples();
  try {
    await runtimeFetch('/sidecar/stop', { method: 'POST' });
    setStatus('runtime stopped');
  } catch (error) {
    setStatus(error instanceof Error ? error.message : String(error), 'error');
  }
  toggle.textContent = 'Start Hand';
  toggle.dataset.running = 'false';
}

toggle.addEventListener('click', async () => {
  toggle.disabled = true;
  try {
    if (running) await stop();
    else await start();
  } catch (error) {
    setStatus(error instanceof Error ? error.message : String(error), 'error');
  } finally {
    toggle.disabled = false;
  }
});

for (const control of [
  fluxControl,
  activeBudgetControl,
  opticalDensityControl,
  reconstructionRadiusControl,
  lifetimeControl,
]) {
  control.addEventListener('input', updateFluidEconomicsFromControls);
}

function resize(): void {
  const width = Math.max(window.innerWidth, 1);
  const height = Math.max(window.innerHeight, 1);
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function distribution(values: readonly number[]): { p50: number; p90: number; p95: number; p99: number; max: number } | null {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const at = (probability: number) => sorted[Math.max(0, Math.ceil(sorted.length * probability) - 1)];
  return { p50: at(0.5), p90: at(0.9), p95: at(0.95), p99: at(0.99), max: sorted.at(-1) as number };
}

function animate(now: number): void {
  requestAnimationFrame(animate);
  if (!running && !fixtureMode && !fluidAssayRunning) return;
  const densityBenchActive = densityBenchAuthority === 'fixture_density_bench_not_live_hand';
  const cpuStartedAt = performance.now();
  const handStatePending = handPresentationPending;
  if (fluidClockStartedAt <= 0) fluidClockStartedAt = now;
  fluidSimulationClockAt = initializeFluidSimulationClock(fluidSimulationClockAt, now);
  const frameDecision = decideLiveHandFrameWork({
    nowMs: now,
    previousFrameAtMs: lastAnimationFrameAt,
    fluidSimulationClockAtMs: fluidSimulationClockAt,
    handStatePending,
    fluidGpuBusy,
  });
  if (frameDecision.rebaseFluidClock) fluidSimulationClockAt = now;
  lastAnimationFrameAt = now;
  if (frameDecision.animationFrameIntervalMs > 0) {
    animationFrameIntervalsMs.push(frameDecision.animationFrameIntervalMs);
  }
  fluidFrameDecisionCounts[frameDecision.reason] += 1;
  const interpolationUnsettled = updateInterpolatedSurface();
  if (handMesh.visible && now - lastLiveAt > 1200 && running) handMaterial.emissive.setHex(0x101c1c);
  else handMaterial.emissive.setHex(0x000000);
  const handRenderStartedAt = performance.now();
  renderer.render(scene, camera);
  const handRenderDurationMs = performance.now() - handRenderStartedAt;
  handRenderCpuMs.push(handRenderDurationMs);
  handPresentationPending = shouldKeepHandPresentationPriority({
    handStatePending,
    interpolationUnsettled,
  });
  if (pendingLatencySample) {
    const sample = pendingLatencySample;
    pendingLatencySample = null;
    sample.captureToWebglRenderReturnMs = Math.max(0, Date.now() - sample.captureTimestampMs);
    sample.viewerReceiveToWebglRenderReturnMs = Math.max(0, Date.now() - sample.viewerReceiveTimestampMs);
    sample.handRenderCpuMs = handRenderDurationMs;
    sample.interactionFrameIntervalMs = frameDecision.animationFrameIntervalMs;
    sample.interactionFrameFluidDecision = frameDecision.reason;
    latencySamples.push(sample);
    unflushedLatencySamples.push(sample);
    scheduleLatencyFlush();
  }
  if ((running || densityBenchActive || fluidAssayRunning) && fluidSolver?.available && frameDecision.runFluid) {
    if (!fluidAssayRunning && !densityBenchActive && latestFluidPacket && !isLiveFingerFluidPacketFresh(latestFluidPacket)) {
      deactivateFluidInlets('hand_state_packet_expired');
    }
    const catchUp = planLiveFluidSimulationCatchUp(frameDecision.fluidAgeMs);
    const fluidStepStartedAt = performance.now();
    for (let step = 0; step < catchUp.stepCount; step += 1) {
      fluidSolver.step(catchUp.stepSeconds);
    }
    fluidStepCpuMs.push(performance.now() - fluidStepStartedAt);
    const fluidRenderStartedAt = performance.now();
    fluidSolver.render({
      width: window.innerWidth,
      height: window.innerHeight,
      pixelRatio: Math.min(window.devicePixelRatio || 1, LIVE_HAND_FLUID_PIXEL_RATIO_CAP),
      ...LIVE_FLUID_CAMERA,
    });
    fluidRenderCpuMs.push(performance.now() - fluidRenderStartedAt);
    if (lastFluidWallSubmitAt > 0) fluidSubmitIntervalsMs.push(Math.max(0, now - lastFluidWallSubmitAt));
    lastFluidWallSubmitAt = now;
    fluidSimulationClockAt = advanceFluidSimulationClock(
      fluidSimulationClockAt,
      catchUp.simulationAdvanceMs,
    );
    fluidStepCount += catchUp.stepCount;
    fluidSubmitCount += 1;
    fluidSubmittedSimulationAdvanceMs += catchUp.simulationAdvanceMs;
    const completionGeneration = fluidGpuCompletionGeneration;
    const submittedAt = performance.now();
    const completedSimulationAdvanceTarget = fluidSubmittedSimulationAdvanceMs;
    const completedSubmitCountTarget = fluidSubmitCount;
    fluidGpuBusy = true;
    void fluidSolver.getLiquidFireContactDescriptor().queue.onSubmittedWorkDone().then(() => {
      if (completionGeneration !== fluidGpuCompletionGeneration) return;
      fluidCompletedSimulationAdvanceMs = completedSimulationAdvanceTarget;
      fluidCompletedSubmitCount = completedSubmitCountTarget;
      fluidGpuQueueDrainMs.push(performance.now() - submittedAt);
      fluidGpuBusy = false;
    }).catch(error => {
      if (completionGeneration !== fluidGpuCompletionGeneration) return;
      fluidGpuCompletionError = error instanceof Error ? error.message : String(error);
      fluidGpuBusy = false;
    });
  }
  if (running || densityBenchActive || fluidAssayRunning) combinedCpuSubmitMs.push(performance.now() - cpuStartedAt);
}

window.addEventListener('resize', resize);
window.addEventListener('beforeunload', () => {
  running = false;
  fluidAssayRunning = false;
  fluidGpuCompletionGeneration += 1;
  fluidGpuBusy = false;
  captureRunGeneration += 1;
  capturePostAbortController?.abort();
  stateAbortController?.abort();
  stream?.getTracks().forEach(track => track.stop());
  navigator.sendBeacon?.(`${runtimeUrl}/sidecar/stop`, new Blob([], { type: 'application/octet-stream' }));
  disposeCaptureWorker(new Error('viewer closed'));
  fluidSolver?.destroy();
});

function collectLiveHandDebugState(): Record<string, unknown> {
  const solverState = fluidSolver?.available ? fluidSolver.getDebugState() : null;
  const solverDiagnostics = solverState?.diagnostics && typeof solverState.diagnostics === 'object'
    ? solverState.diagnostics as Record<string, unknown>
    : fluidAssayDiagnostics;
  const effectiveParticleCount = typeof solverState?.baseParticleCount === 'number'
    ? solverState.baseParticleCount
    : null;
  const activeParticleCount = typeof solverDiagnostics?.activeParticleCount === 'number'
    ? solverDiagnostics.activeParticleCount
    : null;
  const dormantParticleCount = typeof solverDiagnostics?.dormantParticleCount === 'number'
    ? solverDiagnostics.dormantParticleCount
    : null;
  return {
    schema: 'lerms.live-hand-viewer.v0',
    runtimeOwner: 'hand-state-runtime',
    runtimeUrl,
    fixtureMode,
    routeConfigError,
    fluidEvidenceMode: fluidAssayMode ? LIVE_FLUID_ENVELOPE_ASSAY_ROUTE : 'live_hand',
    running,
    meshVisible: handMesh.visible,
    vertexCount: handGeometry.getAttribute('position')?.count || 0,
    faceCount: handGeometry.index ? handGeometry.index.count / 3 : 0,
    effectiveRoute: fluidAssayMode
      ? LIVE_FLUID_ENVELOPE_ASSAY_ROUTE
      : fixtureMode
        ? 'recorded_wilor_mano_fixture'
        : latestFluidPacket?.source_route || null,
    runtimeRoute,
    densityBenchAuthority,
    eventSequence: lastStateSequence,
    deliveryMode: 'long_poll',
    orientationContract: MANO_DISPLAY_ORIENTATION,
    benchmarkDroppedBeforeRender,
    benchmarkError: lastBenchmarkError,
    benchmark: latencySamples.length ? summarizeLiveHandLatency(latencySamples) : null,
    capture: {
      route: LIVE_HAND_CAPTURE_WORKER_ROUTE,
      workerActive: Boolean(captureWorker),
      workerError: captureWorkerError,
      acquireMs: distribution(captureAcquireMs),
      workerEncodeMs: distribution(captureWorkerEncodeMs),
      replyDeadlineMs: LIVE_HAND_CAPTURE_REPLY_DEADLINE_MS,
      runGeneration: captureRunGeneration,
      inFlight: captureInFlightGeneration !== null,
    },
    fluid: fluidSolver?.available ? {
      pinnedRevision: KAMINOS_FLUID_REVISION,
      inletContract: KAMINOS_FINGER_FLUID_LIVE_INLET_CONTRACT,
      inletReleaseContract: KAMINOS_FINGER_FLUID_LIVE_INLET_RELEASE_CONTRACT,
      adapterContract: LIVE_FINGER_FLUID_ADAPTER_CONTRACT,
      economics: liveFluidEconomics,
      requestedParticleCount: liveFluidEconomics.requestedParticleCount,
      effectiveParticleCount,
      requestedActiveParticleBudget: liveFluidEconomics.requestedActiveParticleBudget,
      effectiveActiveParticleBudget: liveFluidEconomics.effectiveActiveParticleBudget,
      latestLiveInletReceipt,
      latestPacketEconomics: latestFluidPacket?.economics ?? null,
      latestPacketAuthority: latestFluidPacket?.authority ?? null,
      latestPacketSourceRoute: latestFluidPacket?.source_route ?? null,
      latestPacketActiveEmitterCount: latestFluidPacket?.emitters.filter(emitter => emitter.active).length ?? 0,
      activeParticleCount,
      dormantParticleCount,
      occupancyAuthority: solverDiagnostics ? 'explicit_gpu_diagnostics_checkpoint' : 'missing',
      assayRunning: fluidAssayRunning,
      assayReceipt: fluidAssayReceipt,
      submittedStepCount: fluidStepCount,
      submittedBatchCount: fluidSubmitCount,
      completedBatchCount: fluidCompletedSubmitCount,
      submittedSimulationAdvanceMs: fluidSubmittedSimulationAdvanceMs,
      completedSimulationAdvanceMs: fluidCompletedSimulationAdvanceMs,
      wallElapsedMs: fluidClockStartedAt > 0 ? Math.max(0, performance.now() - fluidClockStartedAt) : 0,
      submittedSimulationToWallTimeRatio: fluidClockStartedAt > 0
        ? fluidSubmittedSimulationAdvanceMs / Math.max(1, performance.now() - fluidClockStartedAt)
        : 0,
      completedSimulationToWallTimeRatio: fluidClockStartedAt > 0
        ? fluidCompletedSimulationAdvanceMs / Math.max(1, performance.now() - fluidClockStartedAt)
        : 0,
      submittedProgressAuthority: 'gpu_queue_submitted_not_completed',
      completedProgressAuthority: 'gpu_queue_on_submitted_work_done',
      gpuBatchPending: fluidGpuBusy,
      gpuCompletionError: fluidGpuCompletionError,
      gpuQueueDrainMs: distribution(fluidGpuQueueDrainMs),
      activeEmitterCount: fluidAssayRunning
        ? Number(fluidAssayReceipt?.activeInletCount || 0)
        : latestFluidPacket?.emitters.filter(emitter => emitter.active).length || 0,
      liveInlets: solverState?.liveInlets ?? null,
      animationFrameIntervalMs: distribution(animationFrameIntervalsMs),
      fluidSubmitIntervalMs: distribution(fluidSubmitIntervalsMs),
      cpuSubmitMs: distribution(combinedCpuSubmitMs),
      handRenderCpuMs: distribution(handRenderCpuMs),
      fluidStepCpuMs: distribution(fluidStepCpuMs),
      fluidRenderCpuMs: distribution(fluidRenderCpuMs),
      frameDecisionCounts: { ...fluidFrameDecisionCounts },
      pixelRatioCap: LIVE_HAND_FLUID_PIXEL_RATIO_CAP,
      solver: solverState,
    } : { available: false, error: fluidError },
  };
}

Object.assign(window, {
  __lermsLiveHandApplyDensityBench: applyDensityBenchFixture,
  __lermsLiveHandDebugState: collectLiveHandDebugState,
  __lermsLiveFluidEnvelopeAssay: {
    contract: LIVE_FLUID_ENVELOPE_ASSAY_ROUTE,
    async start({
      emitterCount = 1,
      radius = 0.044,
      strength = 1.15,
      requestedParticleCount = LERMS_LIVE_FLUID_PARTICLE_COUNT,
      requestedActiveParticleBudget = 720,
      sourceFluxParticlesPerSecond = 360,
      opticalDensityScale = 2.2,
      reconstructionRadiusScale = 1.6,
      lifetimeSeconds = 6,
    }: {
      emitterCount?: 1 | 5;
      radius?: number;
      strength?: number;
      requestedParticleCount?: number;
      requestedActiveParticleBudget?: number;
      sourceFluxParticlesPerSecond?: number;
      opticalDensityScale?: number;
      reconstructionRadiusScale?: number;
      lifetimeSeconds?: number;
    } = {}) {
      if (!fluidAssayMode) throw new Error('fluid envelope assay requires fluid_assay=1');
      if (requestedParticleCount !== LERMS_LIVE_FLUID_PARTICLE_COUNT) {
        throw new Error(`fluid envelope requested ${requestedParticleCount} particles but the effective solver was initialized with ${LERMS_LIVE_FLUID_PARTICLE_COUNT}`);
      }
      const solver = await ensureFluidSolver();
      resetFluidEnvelopeMetrics();
      fluidAssayDiagnostics = null;
      latestFluidPacket = null;
      latestFluidFrame = null;
      densityBenchAuthority = 'none';
      liveFluidEconomics = normalizeLiveFingerFluidEconomics({
        requestedParticleCount,
        requestedActiveParticleBudget,
        sourceFluxParticlesPerSecond,
        opticalDensityScale,
        reconstructionRadiusScale,
        lifetimeSeconds,
      });
      syncFluidEconomicsControls(liveFluidEconomics);
      const packet = createFluidEnvelopeAssayPacket({ emitterCount, radius, strength });
      latestFluidPacket = packet;
      latestLiveInletReceipt = solver.setLiveInletPacket(packet);
      fluidAssayReceipt = latestLiveInletReceipt;
      fluidAssayRunning = true;
      setRouteTruth();
      setStatus(`${emitterCount}-emitter synthetic fluid envelope assay`, 'live');
      return collectLiveHandDebugState();
    },
    async snapshot() {
      if (!fluidAssayMode || !fluidAssayRunning || !fluidSolver?.available) {
        throw new Error('fluid envelope assay is not running');
      }
      await fluidSolver.getLiquidFireContactDescriptor().queue.onSubmittedWorkDone();
      fluidAssayDiagnostics = await fluidSolver.requestDiagnostics();
      return collectLiveHandDebugState();
    },
    async stop() {
      fluidAssayRunning = false;
      fluidGpuCompletionGeneration += 1;
      fluidGpuBusy = false;
      fluidSolver?.setLiveInletPacket({
        packet_id: `lerms-fluid-envelope-stop-${Date.now()}`,
        route_identity: LIVE_FLUID_ENVELOPE_ASSAY_ROUTE,
        adapter_contract: LIVE_FINGER_FLUID_ADAPTER_CONTRACT,
        source_route: LIVE_FLUID_ENVELOPE_ASSAY_ROUTE,
        simulation_authority: 'invalid',
        authority: { simulation_safe: false, stale: true, reason: 'assay_stopped' },
        emitters: [],
      });
      setStatus('synthetic fluid envelope assay stopped');
      return collectLiveHandDebugState();
    },
  },
});

resize();
resetBenchmark();
updateFluidEconomicsFromControls();
if (queryFluidEconomics) {
  liveFluidEconomics = queryFluidEconomics;
  syncFluidEconomicsControls(queryFluidEconomics);
}
if (routeConfigError) {
  toggle.disabled = true;
  setStatus(`invalid fluid route: ${routeConfigError}`, 'error');
  routeTruth.textContent = `route rejected | ${routeConfigError}`;
} else if (fixtureMode) {
  const fixtureUrl = new URL('../../tests/fixtures/wilor-mano-surface.json', import.meta.url);
  fetch(fixtureUrl, { cache: 'no-store' })
    .then(response => {
      if (!response.ok) throw new Error(`recorded MANO fixture returned ${response.status}`);
      return response.json() as Promise<Record<string, unknown>>;
    })
    .then(async fixture => {
      if (fixture.schema !== 'hand-state.wilor-mano-surface-fixture.v0') throw new Error('recorded MANO fixture schema mismatch');
      await ensureFluidSolver();
      updateSurface(normalizeManoSurface(fixture.mano));
      routeTruth.textContent = `recorded_wilor_mano_fixture | 778v / 1538f | visual-only | current fluid ${liveFluidEconomics.requestedParticleCount}p requested, inactive`;
      setStatus('recorded WiLoR MANO surface', 'live');
      toggle.disabled = true;
    })
    .catch(error => setStatus(error instanceof Error ? error.message : String(error), 'error'));
}
requestAnimationFrame(animate);
