import * as THREE from 'three';
import {
  KAMINOS_FINGER_FLUID_LIVE_INLET_CONTRACT,
  KAMINOS_FINGER_FLUID_LIVE_INLET_RELEASE_CONTRACT,
  createWebGPUFingerFluidSolver,
  type FingerFluidSolver,
} from 'kaminos/finger-fluid-webgpu-core.js';
import {
  LIVE_HAND_HYBRID_ROUTE,
  LIVE_HAND_ROUTE,
  MANO_DISPLAY_ORIENTATION,
  assertLiveRuntimeHealth,
  normalizeLiveManoFrame,
  normalizeManoSurface,
  summarizeLiveHandLatency,
  type LiveHandLatencySample,
  type NormalizedManoFrame,
  type NormalizedManoSurface,
  type RuntimeHealthTruth,
} from './live-hand-contract.js';
import {
  LIVE_HAND_CAPTURE_REPLY_DEADLINE_MS,
  LIVE_HAND_CAPTURE_WORKER_ROUTE,
  isCaptureRunCurrent,
  normalizeCaptureWorkerResult,
  type LiveHandCaptureWorkerResult,
} from './live-hand-capture-contract.js';
import {
  LIVE_HAND_LANDMARKER_DROP_SCHEMA,
  LIVE_HAND_LANDMARKER_ERROR_SCHEMA,
  LIVE_HAND_LANDMARKER_READY_SCHEMA,
  LIVE_HAND_LANDMARKER_RESULT_SCHEMA,
  LIVE_HAND_LANDMARKER_WORKER_ROUTE,
  createFastLandmarkPayload,
  normalizeLandmarkerWorkerError,
  normalizeLandmarkerWorkerResult,
  type LiveHandLandmarkerWorkerResult,
} from './live-hand-landmarker-contract.js';
import {
  planLiveHandSourceFrame,
  resolveLiveHandAnchorIntervalMs,
  type LiveHandSourceMode,
} from './live-hand-source-scheduler.js';
import {
  LiveHandLatencyReceiptJoiner,
  type LiveHandLatencyReceipt,
} from './live-hand-latency-receipt.js';
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
  createPinnedKaminosLiveInletRuntimeAuthority,
  createLiveFingerFluidEmitterPacket,
  isLiveFingerFluidPacketFresh,
  normalizeLiveFingerFluidEconomics,
  resolveLiveFingerFluidJuiceBudget,
  resolveLiveFingerFluidRouteEconomics,
  type LiveFingerFluidEconomics,
  type LiveFingerFluidEconomicsOptions,
  type LiveFingerFluidJuiceBudget,
  type LiveFingerFluidPacket,
} from './live-finger-fluid.js';

const params = new URLSearchParams(window.location.search);
const runtimeUrl = params.get('runtime_url') || 'http://127.0.0.1:8766';
const fixtureKind = params.get('fixture');
const fixtureMode = fixtureKind === '1' || fixtureKind === 'articulated';
const articulatedFixtureMode = fixtureKind === 'articulated';
const fluidAssayMode = params.get('fluid_assay') === '1';
const maxFrameAgeMs = 750;
const LIVE_FLUID_ENVELOPE_ASSAY_ROUTE = 'lerms.live-fluid-envelope.synthetic-assay.v0' as const;
const ARTICULATED_FIXTURE_SCHEMA = 'lerms.articulated-mano-dense-fixture.v1' as const;
const ARTICULATED_FIXTURE_ROUTE = 'hand-state-runtime/deterministic-articulated-replay-not-camera-v1' as const;

interface ArticulatedFixtureFrame {
  frameIndex: number;
  vertices: unknown[];
  keypoints3d: unknown[];
  diagnostics: {
    jointStepLimitRad: number;
    maxJointStepAppliedRad: number;
  };
}

interface ArticulatedFixture {
  schema: typeof ARTICULATED_FIXTURE_SCHEMA;
  sourceAuthority: 'deterministic_fixture_not_live_camera';
  effectiveRoute: typeof ARTICULATED_FIXTURE_ROUTE;
  geometryMode: 'native_mano_regeneration';
  frameRate: number;
  frameCount: number;
  vertexCount: 778;
  faceCount: 1538;
  faces: unknown[];
  frames: ArticulatedFixtureFrame[];
}

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
const routeModeControl = requiredElement<HTMLSelectElement>('hand-route-mode');
const status = requiredElement<HTMLDivElement>('status');
const routeTruth = requiredElement<HTMLDivElement>('route-truth');
const juiceBudgetControl = requiredElement<HTMLInputElement>('fluid-juice-budget');
const juiceBudgetValue = requiredElement<HTMLSpanElement>('fluid-juice-budget-value');
const juiceBudgetState = requiredElement<HTMLDivElement>('fluid-juice-budget-state');
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
let cameraFrameCallbackId: number | null = null;
let cameraFrameFallbackTimer: number | null = null;
let capturePostAbortController: AbortController | null = null;
let stateAbortController: AbortController | null = null;
let lastStateSequence = 0;
let frameSequence = 0;
let lastAnchorCaptureAtMs: number | null = null;
let lastLiveAt = 0;
let runtimeRoute: RuntimeHealthTruth | null = null;
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
let liveJuiceBudget: LiveFingerFluidJuiceBudget = resolveLiveFingerFluidJuiceBudget(80);
let juiceBudgetAuthority: 'macro_control' | 'custom_advanced_controls' | 'route_query' | 'assay_explicit_profile' = 'macro_control';
let liveFluidEconomics: LiveFingerFluidEconomics = normalizeLiveFingerFluidEconomics(liveJuiceBudget.economics);
let lastAnimationFrameAt = 0;
let fluidSimulationClockAt = 0;
let lastFluidWallSubmitAt = 0;
let captureWorker: Worker | null = null;
let captureWorkerError: string | null = null;
let landmarkerWorker: Worker | null = null;
let landmarkerWorkerReady = false;
let landmarkerWorkerError: string | null = null;
let landmarkerInitialization: Promise<void> | null = null;
let rejectLandmarkerInitialization: ((error: Error) => void) | null = null;
let landmarkerInFlightCaptureId: string | null = null;
let landmarkerFramesSubmitted = 0;
let landmarkerFramesDropped = 0;
let landmarkerFramesSuppressed = 0;
let latestLandmarkerFailure: Record<string, unknown> | null = null;
let latestFastIngestReceipt: Record<string, unknown> | null = null;
let articulatedFixture: ArticulatedFixture | null = null;
let articulatedFixtureStartedAt = 0;
let articulatedFixtureFrameIndex = -1;
let articulatedFixturePresentedFrameCount = 0;
let sourceMode: LiveHandSourceMode = params.get('hand_route') === 'hybrid_mano' ? 'hybrid_mano' : 'pure_wilor';
routeModeControl.value = sourceMode;
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
const landmarkerWorkerMs: number[] = [];
const fastPathPostMs: number[] = [];
const pendingFastCaptureMetrics = new Map<string, {
  capturedAtMs: number;
  captureAcquireMs: number;
}>();
const pendingCaptureWorkerResults = new Map<string, {
  resolve: (result: LiveHandCaptureWorkerResult) => void;
  reject: (error: Error) => void;
  timeoutId: number;
}>();
interface RuntimeLatencySample extends LiveHandLatencySample {
  schema: 'hand-state.viewer-latency-sample.v1';
  benchmarkSessionId: string;
  requestedRoute: string;
  model: string;
  deviceRoute: string;
  dtypeRoute: string;
  captureTimestampMs: number;
  viewerReceiveTimestampMs: number;
  captureAcquireMs: number;
  captureRoute: string;
  captureWorkerMs: number;
  producerPostMs: number;
  captureToSidecarPublishMs: number;
  publishToViewerReceiveMs: number;
  captureToViewerReceiveMs: number;
  requestedSourceMode: LiveHandSourceMode;
  fusionMode: string | null;
  geometryMode: string | null;
  anchorCaptureId: string | null;
  anchorAgeMs: number | null;
  fastPathAgeMs: number | null;
  fastPathLatencyMs: number | null;
  fitResidualMean: number | null;
  fitResidualMax: number | null;
  maxJointCorrectionRad: number | null;
  maxAnchorJointDeviationRad: number | null;
  jointStepIntervalMs: number | null;
  jointStepLimitRad: number | null;
  maxJointStepAppliedRad: number | null;
  fallbackState: null;
  viewerReceiveToWebglRenderReturnMs?: number;
  handRenderCpuMs?: number;
  interactionFrameIntervalMs?: number;
  interactionFrameFluidDecision?: LiveHandFrameWorkReason;
  fluidGpuBusyAtRender?: boolean;
  fluidGpuQueueDrainLatestMs?: number | null;
  renderCompletionAuthority: 'webgl_render_call_complete_not_compositor_presented';
}

let benchmarkSessionId = '';
let pendingLatencySample: RuntimeLatencySample | null = null;
let benchmarkDroppedBeforeRender = 0;
let benchmarkAcceptedFrameCount = 0;
let lastBenchmarkError: string | null = null;
const latencyReceiptJoiner = new LiveHandLatencyReceiptJoiner<NormalizedManoFrame>();
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
  densityValueElements.activeBudget.textContent = economics.requestedActiveParticleBudget.toFixed(0);
  densityValueElements.opticalDensity.textContent = economics.opticalDensityScale.toFixed(1);
  densityValueElements.reconstructionRadius.textContent = economics.reconstructionRadiusScale.toFixed(2);
  densityValueElements.lifetime.textContent = economics.lifetimeSeconds.toFixed(1);
}

function syncJuiceBudgetState(): void {
  juiceBudgetValue.textContent = juiceBudgetAuthority === 'macro_control'
    ? liveJuiceBudget.effectiveBudget.toFixed(0)
    : 'custom';
  const state = juiceBudgetAuthority === 'macro_control' ? liveJuiceBudget.zone : 'custom';
  juiceBudgetState.dataset.state = state;
  juiceBudgetState.textContent = state;
}

const routeFluidResolution = resolveLiveFingerFluidRouteEconomics(params, readFluidEconomicsControls());
const queryFluidEconomics = routeFluidResolution.economics;
const routeConfigError = routeFluidResolution.error;

function updateFluidEconomicsFromControls(): void {
  juiceBudgetAuthority = 'custom_advanced_controls';
  liveFluidEconomics = normalizeLiveFingerFluidEconomics(readFluidEconomicsControls());
  syncFluidEconomicsControls(liveFluidEconomics);
  syncJuiceBudgetState();
  if (latestFluidFrame && fluidSolver?.available) {
    publishFluidPacketForFrame(latestFluidFrame);
  }
  setRouteTruth();
}

function applyJuiceBudgetFromControl(): void {
  liveJuiceBudget = resolveLiveFingerFluidJuiceBudget(readFiniteInput(juiceBudgetControl, Number.NaN));
  juiceBudgetAuthority = 'macro_control';
  liveFluidEconomics = normalizeLiveFingerFluidEconomics(liveJuiceBudget.economics);
  syncFluidEconomicsControls(liveFluidEconomics);
  syncJuiceBudgetState();
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
  const requested = sourceMode === 'hybrid_mano' ? LIVE_HAND_HYBRID_ROUTE : LIVE_HAND_ROUTE;
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
    ? ` | juice ${juiceBudgetAuthority === 'macro_control' ? `${liveJuiceBudget.effectiveBudget.toFixed(0)} ${liveJuiceBudget.zone}` : 'custom'} | fluid ${effectiveParticleCount ?? 'unverified'}p effective / ${liveFluidEconomics.requestedParticleCount}p requested | release req ${liveFluidEconomics.sourceFluxParticlesPerSecond.toFixed(0)} / derived ${effectiveReleaseRate?.toFixed(0) ?? 'unverified'}pps | active ${activeParticleCount ?? liveInlets?.initialActiveParticleCount ?? 'diag-pending'} / dormant ${dormantParticleCount ?? liveInlets?.initialDormantParticleCount ?? 'diag-pending'} | residence 1.65s @ ${KAMINOS_FLUID_REVISION.slice(0, 8)}`
    : fluidError ? ' | fluid error' : ' | fluid pending';
  const fast = sourceMode === 'hybrid_mano'
    ? ` | fast ${landmarkerWorkerReady ? LIVE_HAND_LANDMARKER_WORKER_ROUTE : landmarkerWorkerError ? 'failed' : 'initializing'} | submitted ${landmarkerFramesSubmitted} dropped ${landmarkerFramesDropped} busy ${landmarkerFramesSuppressed}`
    : '';
  routeTruth.textContent = `requested ${requested} | effective ${route} | ${runtimeRoute.burstMode} ${runtimeRoute.chunkSegments || 0}x @ ${runtimeRoute.chunkYieldMs}ms | ${topology}${fast}${fluid}`;
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
  handMesh.visible = false;
  handPresentationPending = false;
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

function presentArticulatedFixtureFrame(frameIndex: number): number {
  if (!articulatedFixture) throw new Error('articulated MANO fixture is not loaded');
  if (!Number.isSafeInteger(frameIndex)) throw new Error('articulated fixture frame index must be an integer');
  const normalizedIndex = (
    (frameIndex % articulatedFixture.frameCount) + articulatedFixture.frameCount
  ) % articulatedFixture.frameCount;
  const frame = articulatedFixture.frames[normalizedIndex];
  updateSurface(normalizeManoSurface({
    available: true,
    vertices: frame.vertices,
    faces: articulatedFixture.faces,
  }));
  articulatedFixtureFrameIndex = normalizedIndex;
  articulatedFixturePresentedFrameCount += 1;
  return normalizedIndex;
}

function resetBenchmark(): void {
  benchmarkSessionId = globalThis.crypto?.randomUUID?.() || `lerms-hand-${Date.now()}`;
  pendingLatencySample = null;
  benchmarkDroppedBeforeRender = 0;
  benchmarkAcceptedFrameCount = 0;
  lastBenchmarkError = null;
  latencyReceiptJoiner.reset();
  latencySamples.length = 0;
  unflushedLatencySamples.length = 0;
  captureAcquireMs.length = 0;
  captureWorkerEncodeMs.length = 0;
  landmarkerWorkerMs.length = 0;
  fastPathPostMs.length = 0;
  pendingFastCaptureMetrics.clear();
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
      body: JSON.stringify({ schema: 'hand-state.viewer-latency-batch.v1', samples: batch }),
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

function disposeLandmarkerWorker(): void {
  landmarkerWorker?.terminate();
  landmarkerWorker = null;
  landmarkerWorkerReady = false;
  landmarkerInitialization = null;
  rejectLandmarkerInitialization = null;
  landmarkerInFlightCaptureId = null;
  pendingFastCaptureMetrics.clear();
}

function failLandmarkerWorker(worker: Worker, error: Error, report: Record<string, unknown> | null = null): void {
  if (landmarkerWorker !== worker) return;
  landmarkerWorkerError = error.message;
  latestLandmarkerFailure = report;
  rejectLandmarkerInitialization?.(error);
  disposeLandmarkerWorker();
  deactivateFluidInlets('browser_landmarker_failed');
  setStatus(error.message, 'error');
}

async function handleLandmarkerResult(worker: Worker, value: unknown): Promise<void> {
  const expectedCaptureId = landmarkerInFlightCaptureId;
  if (!expectedCaptureId) {
    failLandmarkerWorker(worker, new Error(`${LIVE_HAND_LANDMARKER_WORKER_ROUTE} returned an unrequested result`));
    return;
  }
  try {
    const result = normalizeLandmarkerWorkerResult(value, expectedCaptureId);
    const payload = createFastLandmarkPayload(result);
    const postStartedAt = performance.now();
    const receipt = await runtimeFetch('/fast-landmarks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const postDurationMs = performance.now() - postStartedAt;
    latestFastIngestReceipt = receipt;
    landmarkerWorkerMs.push(result.workerLandmarkerMs);
    fastPathPostMs.push(postDurationMs);
    const captureMetrics = pendingFastCaptureMetrics.get(result.captureId);
    if (!captureMetrics) throw new Error(`missing fast capture metrics for ${result.captureId}`);
    const joinedReceipt = latencyReceiptJoiner.registerCapture(String(payload.frameId), {
      capturedAtMs: captureMetrics.capturedAtMs,
      captureAcquireMs: captureMetrics.captureAcquireMs,
      captureRoute: LIVE_HAND_LANDMARKER_WORKER_ROUTE,
      captureWorkerMs: result.workerProcessingMs,
      producerPostMs: postDurationMs,
    });
    if (joinedReceipt) armLatencySample(joinedReceipt);
    latencyReceiptJoiner.prune(Date.now(), 10_000);
  } catch (error) {
    failLandmarkerWorker(
      worker,
      error instanceof Error ? error : new Error(String(error)),
      value && typeof value === 'object' ? value as Record<string, unknown> : null,
    );
    return;
  } finally {
    pendingFastCaptureMetrics.delete(expectedCaptureId);
    if (landmarkerInFlightCaptureId === expectedCaptureId) landmarkerInFlightCaptureId = null;
  }
  setRouteTruth();
}

function ensureLandmarkerWorker(): Promise<void> {
  if (landmarkerWorkerReady && landmarkerWorker) return Promise.resolve();
  if (landmarkerInitialization) return landmarkerInitialization;
  if (typeof VideoFrame !== 'function' || typeof Worker !== 'function' || typeof OffscreenCanvas !== 'function') {
    return Promise.reject(new Error(`${LIVE_HAND_LANDMARKER_WORKER_ROUTE} is unavailable in this browser`));
  }
  const worker = new Worker(new URL('./live-hand-landmarker.worker.ts', import.meta.url));
  landmarkerWorker = worker;
  landmarkerInitialization = new Promise<void>((resolve, reject) => {
    rejectLandmarkerInitialization = reject;
    worker.addEventListener('message', event => {
      const value = event.data as Record<string, unknown>;
      if (value.schema === LIVE_HAND_LANDMARKER_READY_SCHEMA) {
        if (value.routeIdentity !== LIVE_HAND_LANDMARKER_WORKER_ROUTE || value.mirroredInput !== true) {
          failLandmarkerWorker(worker, new Error('landmarker worker initialization route is invalid'), value);
          return;
        }
        landmarkerWorkerReady = true;
        rejectLandmarkerInitialization = null;
        resolve();
        setRouteTruth();
        return;
      }
      if (value.schema === LIVE_HAND_LANDMARKER_ERROR_SCHEMA) {
        let normalized;
        try {
          normalized = normalizeLandmarkerWorkerError(value);
        } catch (error) {
          failLandmarkerWorker(worker, error instanceof Error ? error : new Error(String(error)), value);
          return;
        }
        failLandmarkerWorker(
          worker,
          new Error(`${normalized.failurePhase}: ${normalized.error}`),
          normalized as unknown as Record<string, unknown>,
        );
        return;
      }
      if (value.schema === LIVE_HAND_LANDMARKER_DROP_SCHEMA) {
        if (
          value.routeIdentity !== LIVE_HAND_LANDMARKER_WORKER_ROUTE
          || value.captureId !== landmarkerInFlightCaptureId
          || value.primaryOutputWritten !== false
        ) {
          failLandmarkerWorker(worker, new Error('landmarker worker drop receipt is invalid'), value);
          return;
        }
        const captureId = String(value.captureId);
        pendingFastCaptureMetrics.delete(captureId);
        landmarkerInFlightCaptureId = null;
        landmarkerFramesDropped += 1;
        latestLandmarkerFailure = value;
        deactivateFluidInlets('browser_fast_path_no_complete_hand');
        setStatus('hybrid fallback | browser fast path found no complete hand');
        setRouteTruth();
        return;
      }
      if (value.schema === LIVE_HAND_LANDMARKER_RESULT_SCHEMA) {
        void handleLandmarkerResult(worker, value);
        return;
      }
      failLandmarkerWorker(worker, new Error(`${LIVE_HAND_LANDMARKER_WORKER_ROUTE} returned an unknown message`), value);
    });
    worker.addEventListener('error', event => {
      failLandmarkerWorker(worker, new Error(event.message || 'landmarker worker crashed'));
    });
    worker.addEventListener('messageerror', () => {
      failLandmarkerWorker(worker, new Error(`${LIVE_HAND_LANDMARKER_WORKER_ROUTE} returned an unreadable message`));
    });
    worker.postMessage({ type: 'init' });
  });
  return landmarkerInitialization;
}

function postLandmarkerFrame(
  captureId: string,
  captureTimestampMs: number,
  frame: VideoFrame,
  width: number,
  height: number,
  captureAcquireMsValue: number,
): void {
  const worker = landmarkerWorker;
  if (!worker || !landmarkerWorkerReady || landmarkerInFlightCaptureId !== null) {
    frame.close();
    throw new Error(`${LIVE_HAND_LANDMARKER_WORKER_ROUTE} is not available for ${captureId}`);
  }
  landmarkerInFlightCaptureId = captureId;
  pendingFastCaptureMetrics.set(captureId, {
    capturedAtMs: captureTimestampMs,
    captureAcquireMs: captureAcquireMsValue,
  });
  landmarkerFramesSubmitted += 1;
  try {
    worker.postMessage({
      type: 'detect-frame',
      captureId,
      captureTimestampMs,
      width,
      height,
      frame,
    }, [frame]);
  } catch (error) {
    pendingFastCaptureMetrics.delete(captureId);
    landmarkerInFlightCaptureId = null;
    frame.close();
    failLandmarkerWorker(worker, error instanceof Error ? error : new Error(String(error)));
  }
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

async function postAnchorFrame(
  runGeneration: number,
  captureId: string,
  capturedAtMs: number,
  frame: VideoFrame,
  width: number,
  height: number,
  acquisitionMs: number,
): Promise<void> {
  if (
    !isCaptureRunCurrent(runGeneration, captureRunGeneration, running)
    || captureWorkerError
    || captureInFlightGeneration !== null
  ) {
    frame.close();
    return;
  }
  captureInFlightGeneration = runGeneration;
  try {
    const clientEncodeStartedAt = performance.now();
    const encoded = await encodeCameraFrame(captureId, frame, width, height);
    if (!isCaptureRunCurrent(runGeneration, captureRunGeneration, running)) return;
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
    if (sourceMode === 'pure_wilor') {
      const joinedReceipt = latencyReceiptJoiner.registerCapture(captureId, {
        capturedAtMs,
        captureAcquireMs: acquisitionMs,
        captureRoute: LIVE_HAND_CAPTURE_WORKER_ROUTE,
        captureWorkerMs: performance.now() - clientEncodeStartedAt,
        producerPostMs: performance.now() - postStartedAt,
      });
      if (joinedReceipt) armLatencySample(joinedReceipt);
    }
    latencyReceiptJoiner.prune(capturedAtMs, 10_000);
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

function scheduleCameraFrame(runGeneration: number): void {
  if (!isCaptureRunCurrent(runGeneration, captureRunGeneration, running)) return;
  if (typeof video.requestVideoFrameCallback === 'function') {
    cameraFrameCallbackId = video.requestVideoFrameCallback(() => {
      cameraFrameCallbackId = null;
      handleCameraFrame(runGeneration);
    });
    return;
  }
  cameraFrameFallbackTimer = window.setTimeout(() => {
    cameraFrameFallbackTimer = null;
    handleCameraFrame(runGeneration);
  }, 1000 / 60);
}

function handleCameraFrame(runGeneration: number): void {
  if (
    !isCaptureRunCurrent(runGeneration, captureRunGeneration, running)
    || captureWorkerError
    || landmarkerWorkerError
    || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA
  ) {
    scheduleCameraFrame(runGeneration);
    return;
  }
  try {
    const sourceWidth = Math.max(video.videoWidth || 640, 1);
    const width = Math.min(sourceWidth, 640);
    const height = Math.round(width * Math.max(video.videoHeight || 480, 1) / sourceWidth);
    const captureTimestampMs = Date.now();
    const captureId = `run-${runGeneration}-${captureTimestampMs}-${frameSequence += 1}`;
    const plan = planLiveHandSourceFrame({
      mode: sourceMode,
      nowMs: captureTimestampMs,
      lastAnchorCaptureAtMs,
      anchorIntervalMs: resolveLiveHandAnchorIntervalMs(sourceMode),
      fastPathAvailable: sourceMode === 'pure_wilor' || landmarkerWorkerReady,
      fastPathInFlight: landmarkerInFlightCaptureId !== null,
      anchorInFlight: captureInFlightGeneration !== null,
    });
    if (!plan.submitFastPath && !plan.submitAnchor) {
      if (sourceMode === 'hybrid_mano' && plan.reason === 'fast_path_wait') landmarkerFramesSuppressed += 1;
      return;
    }
    const captureAcquireStartedAt = performance.now();
    const sourceFrame = new VideoFrame(video, { timestamp: captureTimestampMs * 1000 });
    const acquisitionMs = performance.now() - captureAcquireStartedAt;
    if (sourceMode === 'hybrid_mano') {
      const anchorFrame = plan.submitAnchor ? sourceFrame.clone() : null;
      if (anchorFrame) {
        lastAnchorCaptureAtMs = captureTimestampMs;
        void postAnchorFrame(runGeneration, captureId, captureTimestampMs, anchorFrame, width, height, acquisitionMs);
      }
      postLandmarkerFrame(captureId, captureTimestampMs, sourceFrame, width, height, acquisitionMs);
    } else if (plan.submitAnchor) {
      lastAnchorCaptureAtMs = captureTimestampMs;
      void postAnchorFrame(runGeneration, captureId, captureTimestampMs, sourceFrame, width, height, acquisitionMs);
    } else {
      sourceFrame.close();
    }
  } catch (error) {
    setStatus(error instanceof Error ? error.message : String(error), 'error');
  } finally {
    scheduleCameraFrame(runGeneration);
  }
}

function armLatencySample(receipt: LiveHandLatencyReceipt<NormalizedManoFrame>): void {
  if (pendingLatencySample) benchmarkDroppedBeforeRender += 1;
  const { frame, captureMetrics, viewerReceiveTimestampMs } = receipt;
  const captureToViewerReceiveMs = Math.max(0, viewerReceiveTimestampMs - frame.captureTimestampMs);
  pendingLatencySample = {
    schema: 'hand-state.viewer-latency-sample.v1',
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
    captureRoute: captureMetrics.captureRoute,
    captureWorkerMs: captureMetrics.captureWorkerMs,
    producerPostMs: captureMetrics.producerPostMs,
    modelLatencyMs: frame.modelLatencyMs,
    captureToSidecarPublishMs: frame.captureToSidecarPublishMs,
    publishToViewerReceiveMs: Math.max(0, captureToViewerReceiveMs - frame.captureToSidecarPublishMs),
    captureToViewerReceiveMs,
    requestedSourceMode: sourceMode,
    fusionMode: frame.fusionMode,
    geometryMode: frame.geometryMode,
    anchorCaptureId: frame.anchorCaptureId,
    anchorAgeMs: frame.anchorAgeMs,
    fastPathAgeMs: frame.fastPathAgeMs,
    fastPathLatencyMs: frame.fastPathLatencyMs,
    fitResidualMean: frame.fitResidualMean,
    fitResidualMax: frame.fitResidualMax,
    maxJointCorrectionRad: frame.maxJointCorrectionRad,
    maxAnchorJointDeviationRad: frame.maxAnchorJointDeviationRad,
    jointStepIntervalMs: frame.jointStepIntervalMs,
    jointStepLimitRad: frame.jointStepLimitRad,
    maxJointStepAppliedRad: frame.maxJointStepAppliedRad,
    fallbackState: null,
    captureToWebglRenderReturnMs: -1,
    captureToRenderCompleteMs: -1,
    renderCompletionAuthority: 'webgl_render_call_complete_not_compositor_presented',
  };
}

function applyState(state: Record<string, unknown>): void {
  if (captureWorkerError) {
    deactivateFluidInlets('capture_worker_failed');
    setStatus(captureWorkerError, 'error');
    return;
  }
  try {
    const frame = normalizeLiveManoFrame(state);
    const requestedRoute = sourceMode === 'hybrid_mano' ? LIVE_HAND_HYBRID_ROUTE : LIVE_HAND_ROUTE;
    if (frame.effectiveRoute !== requestedRoute) {
      deactivateFluidInlets('unexpected_live_hand_route');
      setStatus(`waiting for ${requestedRoute} | observed ${frame.effectiveRoute}`);
      setRouteTruth(frame);
      return;
    }
    updateHandSurface(frame);
    benchmarkAcceptedFrameCount += 1;
    const joinedReceipt = latencyReceiptJoiner.registerFrame(frame.frameId, frame, Date.now());
    if (joinedReceipt) armLatencySample(joinedReceipt);
    const tail = latencySamples.length ? summarizeLiveHandLatency(latencySamples) : null;
    const receipt = tail ? ` | webgl-return p50 ${tail.captureToWebglRenderReturnMs.p50.toFixed(0)} p95 ${tail.captureToWebglRenderReturnMs.p95.toFixed(0)}ms` : '';
    setStatus(`live MANO | model ${frame.modelLatencyMs.toFixed(0)}ms${receipt}`, 'live');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    deactivateFluidInlets('invalid_or_stale_hand_state');
    setStatus(`waiting for live MANO | ${message}`, 'error');
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
  landmarkerWorkerError = null;
  latestLandmarkerFailure = null;
  latestFastIngestReceipt = null;
  ensureCaptureWorker();
  setStatus('verifying runtime');
  runtimeRoute = assertLiveRuntimeHealth(await runtimeFetch('/health'));
  if (sourceMode === 'hybrid_mano') {
    if (!runtimeRoute.manoRegeneratorAvailable || runtimeRoute.hybridGeometryMode !== 'native_mano_regeneration') {
      throw new Error('hybrid MANO route requires the runtime native MANO regenerator');
    }
    setStatus('initializing browser MediaPipe');
    await ensureLandmarkerWorker();
  }
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
  lastAnchorCaptureAtMs = null;
  landmarkerFramesSubmitted = 0;
  landmarkerFramesDropped = 0;
  landmarkerFramesSuppressed = 0;
  running = true;
  routeModeControl.disabled = true;
  toggle.textContent = 'Stop Hand';
  toggle.dataset.running = 'true';
  void streamState();
  scheduleCameraFrame(runGeneration);
}

async function stop(): Promise<void> {
  running = false;
  fluidGpuCompletionGeneration += 1;
  fluidGpuBusy = false;
  captureRunGeneration += 1;
  if (cameraFrameCallbackId !== null && typeof video.cancelVideoFrameCallback === 'function') {
    video.cancelVideoFrameCallback(cameraFrameCallbackId);
  }
  cameraFrameCallbackId = null;
  if (cameraFrameFallbackTimer !== null) window.clearTimeout(cameraFrameFallbackTimer);
  cameraFrameFallbackTimer = null;
  capturePostAbortController?.abort();
  capturePostAbortController = null;
  disposeCaptureWorker(new Error('hand control stopped'));
  disposeLandmarkerWorker();
  stateAbortController?.abort();
  stateAbortController = null;
  stream?.getTracks().forEach(track => track.stop());
  stream = null;
  video.srcObject = null;
  deactivateFluidInlets('hand_control_stopped');
  await flushLatencySamples();
  const receiptJoinState = latencyReceiptJoiner.snapshot();
  const missingEvidenceError = benchmarkAcceptedFrameCount > 0 && latencySamples.length === 0
    ? `telemetry failure: rendered ${benchmarkAcceptedFrameCount} live MANO frames but recorded 0 viewer latency samples`
    : receiptJoinState.discardedFrameCount > 0
      || receiptJoinState.discardedCaptureCount > 0
      || receiptJoinState.pendingFrameCount > 0
      || receiptJoinState.pendingCaptureCount > 0
      || benchmarkDroppedBeforeRender > 0
      || pendingLatencySample !== null
      ? `telemetry incomplete: ${receiptJoinState.pendingFrameCount} unmatched frames, ${receiptJoinState.pendingCaptureCount} unmatched captures, ${receiptJoinState.discardedFrameCount} discarded frames, ${receiptJoinState.discardedCaptureCount} discarded captures, ${benchmarkDroppedBeforeRender} superseded, ${pendingLatencySample ? 1 : 0} awaiting render`
      : null;
  if (missingEvidenceError) lastBenchmarkError = missingEvidenceError;
  const benchmarkFailure = missingEvidenceError
    || (unflushedLatencySamples.length > 0 ? lastBenchmarkError || 'telemetry failure: viewer latency samples remain unflushed' : null);
  try {
    await runtimeFetch('/sidecar/stop', { method: 'POST' });
    setStatus(benchmarkFailure || 'runtime stopped', benchmarkFailure ? 'error' : 'idle');
  } catch (error) {
    setStatus(error instanceof Error ? error.message : String(error), 'error');
  }
  toggle.textContent = 'Start Hand';
  toggle.dataset.running = 'false';
  routeModeControl.disabled = false;
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
juiceBudgetControl.addEventListener('input', applyJuiceBudgetFromControl);
routeModeControl.addEventListener('change', () => {
  if (running) {
    routeModeControl.value = sourceMode;
    return;
  }
  sourceMode = routeModeControl.value === 'hybrid_mano' ? 'hybrid_mano' : 'pure_wilor';
  setRouteTruth();
});

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
  if (articulatedFixtureMode && articulatedFixture && articulatedFixtureStartedAt > 0) {
    const elapsedFrame = Math.floor((now - articulatedFixtureStartedAt) * articulatedFixture.frameRate / 1000);
    const frameIndex = elapsedFrame % articulatedFixture.frameCount;
    if (frameIndex !== articulatedFixtureFrameIndex) {
      presentArticulatedFixtureFrame(frameIndex);
    }
  }
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
    sample.captureToRenderCompleteMs = sample.captureToWebglRenderReturnMs;
    sample.viewerReceiveToWebglRenderReturnMs = Math.max(0, Date.now() - sample.viewerReceiveTimestampMs);
    sample.handRenderCpuMs = handRenderDurationMs;
    sample.interactionFrameIntervalMs = frameDecision.animationFrameIntervalMs;
    sample.interactionFrameFluidDecision = frameDecision.reason;
    sample.fluidGpuBusyAtRender = fluidGpuBusy;
    sample.fluidGpuQueueDrainLatestMs = fluidGpuQueueDrainMs.at(-1) ?? null;
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
  disposeLandmarkerWorker();
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
  const runtimeEconomicsAuthority = createPinnedKaminosLiveInletRuntimeAuthority(liveFluidEconomics, {
    effectiveParticleCount,
    expectedPacketId: latestFluidPacket?.packet_id ?? null,
    expectedSourceRoute: latestFluidPacket?.source_route ?? null,
    packetAuthority: latestFluidPacket?.authority ?? null,
    packetEconomics: latestFluidPacket?.economics ?? null,
    receipt: latestLiveInletReceipt,
    liveInlets: solverState?.liveInlets && typeof solverState.liveInlets === 'object'
      ? solverState.liveInlets as Record<string, unknown>
      : null,
  });
  return {
    schema: 'lerms.live-hand-viewer.v0',
    runtimeOwner: 'hand-state-runtime',
    runtimeUrl,
    fixtureMode,
    fixtureKind,
    articulatedFixture: articulatedFixture ? {
      schema: articulatedFixture.schema,
      sourceAuthority: articulatedFixture.sourceAuthority,
      effectiveRoute: articulatedFixture.effectiveRoute,
      geometryMode: articulatedFixture.geometryMode,
      frameRate: articulatedFixture.frameRate,
      frameCount: articulatedFixture.frameCount,
      currentFrameIndex: articulatedFixtureFrameIndex,
      presentedFrameCount: articulatedFixturePresentedFrameCount,
      startedAt: articulatedFixtureStartedAt,
    } : null,
    routeConfigError,
    fluidEvidenceMode: fluidAssayMode ? LIVE_FLUID_ENVELOPE_ASSAY_ROUTE : 'live_hand',
    running,
    meshVisible: handMesh.visible,
    requestedHandRoute: sourceMode === 'hybrid_mano' ? LIVE_HAND_HYBRID_ROUTE : LIVE_HAND_ROUTE,
    vertexCount: handGeometry.getAttribute('position')?.count || 0,
    faceCount: handGeometry.index ? handGeometry.index.count / 3 : 0,
    effectiveRoute: fluidAssayMode
      ? LIVE_FLUID_ENVELOPE_ASSAY_ROUTE
      : articulatedFixtureMode
        ? articulatedFixture ? ARTICULATED_FIXTURE_ROUTE : null
        : fixtureMode
        ? 'recorded_wilor_mano_fixture'
        : latestFluidPacket?.source_route || null,
    runtimeRoute,
    densityBenchAuthority,
    eventSequence: lastStateSequence,
    deliveryMode: 'long_poll',
    orientationContract: MANO_DISPLAY_ORIENTATION,
    benchmarkDroppedBeforeRender,
    benchmarkAcceptedFrameCount,
    benchmarkError: lastBenchmarkError,
    benchmark: latencySamples.length ? summarizeLiveHandLatency(latencySamples) : null,
    benchmarkReceiptJoin: latencyReceiptJoiner.snapshot(),
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
    fastPath: {
      requested: sourceMode === 'hybrid_mano',
      route: LIVE_HAND_LANDMARKER_WORKER_ROUTE,
      workerActive: Boolean(landmarkerWorker),
      workerReady: landmarkerWorkerReady,
      workerError: landmarkerWorkerError,
      latestFailure: latestLandmarkerFailure,
      latestIngestReceipt: latestFastIngestReceipt,
      submittedFrameCount: landmarkerFramesSubmitted,
      droppedFrameCount: landmarkerFramesDropped,
      busySuppressedFrameCount: landmarkerFramesSuppressed,
      inFlightCaptureId: landmarkerInFlightCaptureId,
      workerLandmarkerMs: distribution(landmarkerWorkerMs),
      runtimePostMs: distribution(fastPathPostMs),
    },
    fluid: fluidSolver?.available ? {
      pinnedRevision: KAMINOS_FLUID_REVISION,
      inletContract: KAMINOS_FINGER_FLUID_LIVE_INLET_CONTRACT,
      inletReleaseContract: KAMINOS_FINGER_FLUID_LIVE_INLET_RELEASE_CONTRACT,
      adapterContract: LIVE_FINGER_FLUID_ADAPTER_CONTRACT,
      economics: liveFluidEconomics,
      juiceBudget: {
        authority: juiceBudgetAuthority,
        mapping: juiceBudgetAuthority === 'macro_control' ? liveJuiceBudget : null,
        lastMacroMapping: liveJuiceBudget,
      },
      runtimeEconomicsAuthority,
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
  __lermsArticulatedFixtureReplay: {
    snapshot: collectLiveHandDebugState,
    setFrame(frameIndex: number) {
      if (!articulatedFixtureMode) throw new Error('articulated fixture route is not active');
      articulatedFixtureStartedAt = 0;
      const selectedFrameIndex = presentArticulatedFixtureFrame(frameIndex);
      return {
        authority: 'deterministic_source_frame_selection_not_realtime_cadence',
        selectedFrameIndex,
        state: collectLiveHandDebugState(),
      };
    },
    resume() {
      if (!articulatedFixture) throw new Error('articulated MANO fixture is not loaded');
      articulatedFixtureStartedAt = performance.now()
        - articulatedFixtureFrameIndex * 1000 / articulatedFixture.frameRate;
      return collectLiveHandDebugState();
    },
  },
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
      juiceBudgetAuthority = 'assay_explicit_profile';
      syncFluidEconomicsControls(liveFluidEconomics);
      syncJuiceBudgetState();
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
      latestFluidPacket = null;
      latestLiveInletReceipt = null;
      fluidAssayDiagnostics = null;
      setStatus('synthetic fluid envelope assay stopped');
      return collectLiveHandDebugState();
    },
  },
});

resize();
resetBenchmark();
applyJuiceBudgetFromControl();
if (queryFluidEconomics) {
  liveFluidEconomics = queryFluidEconomics;
  juiceBudgetAuthority = 'route_query';
  syncFluidEconomicsControls(queryFluidEconomics);
  syncJuiceBudgetState();
}
if (routeConfigError) {
  toggle.disabled = true;
  setStatus(`invalid fluid route: ${routeConfigError}`, 'error');
  routeTruth.textContent = `route rejected | ${routeConfigError}`;
} else if (articulatedFixtureMode) {
  const fixtureUrl = new URL('../../tests/fixtures/articulated-mano-dense.json', import.meta.url);
  fetch(fixtureUrl, { cache: 'no-store' })
    .then(response => {
      if (!response.ok) throw new Error(`articulated MANO fixture returned ${response.status}`);
      return response.json() as Promise<ArticulatedFixture>;
    })
    .then(async fixture => {
      if (
        fixture.schema !== ARTICULATED_FIXTURE_SCHEMA
        || fixture.sourceAuthority !== 'deterministic_fixture_not_live_camera'
        || fixture.effectiveRoute !== ARTICULATED_FIXTURE_ROUTE
        || fixture.geometryMode !== 'native_mano_regeneration'
      ) {
        throw new Error('articulated MANO fixture route identity mismatch');
      }
      if (
        !Number.isFinite(fixture.frameRate)
        || fixture.frameRate <= 0
        || fixture.frameCount < 2
        || fixture.vertexCount !== 778
        || fixture.faceCount !== 1538
        || !Array.isArray(fixture.faces)
        || fixture.faces.length !== 1538
        || !Array.isArray(fixture.frames)
        || fixture.frames.length !== fixture.frameCount
      ) {
        throw new Error('articulated MANO fixture is partial or invalid');
      }
      for (const frame of fixture.frames) {
        if (
          !Array.isArray(frame.vertices)
          || frame.vertices.length !== 778
          || !Array.isArray(frame.keypoints3d)
          || frame.keypoints3d.length !== 21
          || !frame.diagnostics
          || frame.diagnostics.maxJointStepAppliedRad > frame.diagnostics.jointStepLimitRad + 1e-8
        ) {
          throw new Error('articulated MANO fixture contains an invalid frame');
        }
      }
      articulatedFixture = fixture;
      await applyDensityBenchFixture('five-finger');
      presentArticulatedFixtureFrame(0);
      articulatedFixtureStartedAt = performance.now();
      routeTruth.textContent = `${ARTICULATED_FIXTURE_ROUTE} | deterministic_fixture_not_live_camera | native MANO 778v / 1538f | five-finger Juice ${liveJuiceBudget.effectiveBudget.toFixed(0)}`;
      setStatus('dense articulated MANO replay under fixture fluid load', 'live');
      toggle.disabled = true;
      routeModeControl.disabled = true;
    })
    .catch(error => setStatus(error instanceof Error ? error.message : String(error), 'error'));
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
