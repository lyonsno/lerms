import * as THREE from 'three';
import {
  KAMINOS_FINGER_FLUID_DEFAULT_PARTICLE_COUNT,
  KAMINOS_FINGER_FLUID_LIVE_INLET_CONTRACT,
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
  KAMINOS_FLUID_REVISION,
  LIVE_FINGER_FLUID_ADAPTER_CONTRACT,
  LIVE_FLUID_CAMERA,
  createLiveFingerFluidEmitterPacket,
  isLiveFingerFluidPacketFresh,
  type LiveFingerFluidPacket,
} from './live-finger-fluid.js';

const params = new URLSearchParams(window.location.search);
const runtimeUrl = params.get('runtime_url') || 'http://127.0.0.1:8766';
const fixtureMode = params.get('fixture') === '1';
const captureIntervalMs = 50;
const maxFrameAgeMs = 750;

function requiredElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`missing #${id}`);
  return element as T;
}

const canvas = requiredElement<HTMLCanvasElement>('hand-canvas');
const fluidCanvas = requiredElement<HTMLCanvasElement>('fluid-canvas');
const video = requiredElement<HTMLVideoElement>('camera');
const captureCanvas = requiredElement<HTMLCanvasElement>('capture-canvas');
const captureContextValue = captureCanvas.getContext('2d', { alpha: false });
if (!captureContextValue) throw new Error('camera capture context is unavailable');
const captureContext: CanvasRenderingContext2D = captureContextValue;
const toggle = requiredElement<HTMLButtonElement>('hand-toggle');
const status = requiredElement<HTMLDivElement>('status');
const routeTruth = requiredElement<HTMLDivElement>('route-truth');

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
let captureInFlight = false;
let captureTimer: number | null = null;
let stateAbortController: AbortController | null = null;
let lastStateSequence = 0;
let frameSequence = 0;
let lastLiveAt = 0;
let runtimeRoute: RuntimeRouteTruth | null = null;
let targetPositions: Float32Array | null = null;
let currentPositions: Float32Array | null = null;
let topologySignature = '';
let fluidSolver: FingerFluidSolver | null = null;
let fluidInitialization: Promise<FingerFluidSolver> | null = null;
let fluidError: string | null = null;
let latestFluidPacket: LiveFingerFluidPacket | null = null;
let fluidStepCount = 0;
let combinedLastFrameAt = 0;
const combinedFrameIntervalsMs: number[] = [];
const combinedCpuSubmitMs: number[] = [];
interface RuntimeLatencySample extends LiveHandLatencySample {
  schema: 'hand-state.viewer-latency-sample.v0';
  benchmarkSessionId: string;
  requestedRoute: string;
  model: string;
  deviceRoute: string;
  dtypeRoute: string;
  captureTimestampMs: number;
  viewerReceiveTimestampMs: number;
  clientEncodeMs: number;
  nativePostMs: number;
  captureToSidecarPublishMs: number;
  publishToViewerReceiveMs: number;
  captureToViewerReceiveMs: number;
}

let benchmarkSessionId = '';
let pendingLatencySample: RuntimeLatencySample | null = null;
let benchmarkDroppedBeforeRender = 0;
let lastBenchmarkError: string | null = null;
const captureMetricsByFrame = new Map<string, { capturedAtMs: number; clientEncodeMs: number; nativePostMs: number }>();
const latencySamples: RuntimeLatencySample[] = [];
const unflushedLatencySamples: RuntimeLatencySample[] = [];
let latencyFlushTimer: number | null = null;

function setStatus(message: string, state: 'idle' | 'live' | 'error' = 'idle'): void {
  status.textContent = message;
  status.dataset.state = state;
}

function setRouteTruth(frame?: NormalizedManoFrame): void {
  if (!runtimeRoute) {
    routeTruth.textContent = 'route unverified';
    return;
  }
  const route = frame?.effectiveRoute || 'awaiting live effective route';
  const topology = frame ? `${frame.vertexCount}v / ${frame.faceCount}f` : 'awaiting MANO topology';
  const fluid = fluidSolver?.available
    ? ` | fluid ${KAMINOS_FINGER_FLUID_DEFAULT_PARTICLE_COUNT}p @ ${KAMINOS_FLUID_REVISION.slice(0, 8)}`
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

function updateHandSurface(frame: NormalizedManoFrame): void {
  updateSurface(frame);
  if (fluidSolver?.available) {
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
    });
    fluidSolver.setLiveInletPacket(latestFluidPacket);
  }
  setRouteTruth(frame);
}

function deactivateFluidInlets(reason: string): void {
  latestFluidPacket = null;
  fluidSolver?.setLiveInletPacket({
    packet_id: `lerms-hand-fluid-invalid-${Date.now()}`,
    route_identity: LIVE_HAND_ROUTE,
    adapter_contract: LIVE_FINGER_FLUID_ADAPTER_CONTRACT,
    source_route: LIVE_HAND_ROUTE,
    simulation_authority: 'invalid',
    authority: { simulation_safe: false, stale: true, reason },
    emitters: [],
  });
  setRouteTruth();
}

async function ensureFluidSolver(): Promise<FingerFluidSolver> {
  if (fluidSolver) return fluidSolver;
  if (!fluidInitialization) {
    fluidInitialization = createWebGPUFingerFluidSolver({
      canvas: fluidCanvas,
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
        pixelRatio: Math.min(window.devicePixelRatio || 1, 1.5),
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
  if (latencyFlushTimer !== null) window.clearTimeout(latencyFlushTimer);
  latencyFlushTimer = null;
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

async function captureFrame(): Promise<void> {
  if (!running || captureInFlight || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
  captureInFlight = true;
  try {
    const sourceWidth = Math.max(video.videoWidth || 640, 1);
    const width = Math.min(sourceWidth, 640);
    const height = Math.round(width * Math.max(video.videoHeight || 480, 1) / sourceWidth);
    const capturedAtMs = Date.now();
    const captureId = `${capturedAtMs}-${frameSequence += 1}`;
    const encodeStartedAt = performance.now();
    if (captureCanvas.width !== width || captureCanvas.height !== height) {
      captureCanvas.width = width;
      captureCanvas.height = height;
    }
    captureContext.save();
    captureContext.translate(width, 0);
    captureContext.scale(-1, 1);
    captureContext.drawImage(video, 0, 0, width, height);
    captureContext.restore();
    const blob = await new Promise<Blob | null>(resolve => captureCanvas.toBlob(resolve, 'image/jpeg', 0.78));
    if (!blob) throw new Error('camera frame encoding failed');
    const clientEncodeMs = performance.now() - encodeStartedAt;
    const postStartedAt = performance.now();
    await runtimeFetch('/native-frame', {
      method: 'POST',
      headers: {
        'Content-Type': 'image/jpeg',
        'X-Capture-Id': captureId,
        'X-Capture-Epoch-Ms': String(capturedAtMs),
        'X-Frame-Width': String(width),
        'X-Frame-Height': String(height),
      },
      body: blob,
    });
    captureMetricsByFrame.set(captureId, {
      capturedAtMs,
      clientEncodeMs,
      nativePostMs: performance.now() - postStartedAt,
    });
    for (const [frameId, metrics] of captureMetricsByFrame) {
      if (capturedAtMs - metrics.capturedAtMs > 10_000) captureMetricsByFrame.delete(frameId);
    }
  } catch (error) {
    setStatus(error instanceof Error ? error.message : String(error), 'error');
  } finally {
    captureInFlight = false;
  }
}

function applyState(state: Record<string, unknown>): void {
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
        clientEncodeMs: captureMetrics.clientEncodeMs,
        nativePostMs: captureMetrics.nativePostMs,
        modelLatencyMs: frame.modelLatencyMs,
        captureToSidecarPublishMs: frame.captureToSidecarPublishMs,
        publishToViewerReceiveMs: Math.max(0, captureToViewerReceiveMs - frame.captureToSidecarPublishMs),
        captureToViewerReceiveMs,
        captureToRenderCompleteMs: -1,
      };
      captureMetricsByFrame.delete(frame.frameId);
    }
    const tail = latencySamples.length ? summarizeLiveHandLatency(latencySamples) : null;
    const receipt = tail ? ` | e2e p50 ${tail.captureToRenderCompleteMs.p50.toFixed(0)} p95 ${tail.captureToRenderCompleteMs.p95.toFixed(0)}ms` : '';
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
  if (fixtureMode) throw new Error('recorded fixture mode is visual-only');
  setStatus('initializing current Kaminos fluid');
  await ensureFluidSolver();
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
  combinedFrameIntervalsMs.length = 0;
  combinedCpuSubmitMs.length = 0;
  combinedLastFrameAt = 0;
  fluidStepCount = 0;
  lastStateSequence = 0;
  running = true;
  toggle.textContent = 'Stop Hand';
  toggle.dataset.running = 'true';
  captureTimer = window.setInterval(() => void captureFrame(), captureIntervalMs);
  void streamState();
  await captureFrame();
}

async function stop(): Promise<void> {
  running = false;
  if (captureTimer !== null) window.clearInterval(captureTimer);
  captureTimer = null;
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
  if (!running && !fixtureMode) return;
  const cpuStartedAt = performance.now();
  updateInterpolatedSurface();
  if (handMesh.visible && now - lastLiveAt > 1200 && running) handMaterial.emissive.setHex(0x101c1c);
  else handMaterial.emissive.setHex(0x000000);
  if (running && fluidSolver?.available) {
    if (latestFluidPacket && !isLiveFingerFluidPacketFresh(latestFluidPacket)) {
      deactivateFluidInlets('hand_state_packet_expired');
    }
    const frameIntervalMs = combinedLastFrameAt > 0 ? now - combinedLastFrameAt : 0;
    combinedLastFrameAt = now;
    if (frameIntervalMs > 0) combinedFrameIntervalsMs.push(frameIntervalMs);
    fluidSolver.step(Math.min(1 / 30, Math.max(1 / 240, frameIntervalMs > 0 ? frameIntervalMs / 1000 : 1 / 60)));
    fluidSolver.render({
      width: window.innerWidth,
      height: window.innerHeight,
      pixelRatio: Math.min(window.devicePixelRatio || 1, 1.5),
      ...LIVE_FLUID_CAMERA,
    });
    fluidStepCount += 1;
  }
  renderer.render(scene, camera);
  if (running) combinedCpuSubmitMs.push(performance.now() - cpuStartedAt);
  if (pendingLatencySample) {
    const sample = pendingLatencySample;
    pendingLatencySample = null;
    sample.captureToRenderCompleteMs = Math.max(0, Date.now() - sample.captureTimestampMs);
    latencySamples.push(sample);
    unflushedLatencySamples.push(sample);
    scheduleLatencyFlush();
  }
}

window.addEventListener('resize', resize);
window.addEventListener('beforeunload', () => {
  stateAbortController?.abort();
  stream?.getTracks().forEach(track => track.stop());
  if (running) navigator.sendBeacon?.(`${runtimeUrl}/sidecar/stop`, new Blob([], { type: 'application/octet-stream' }));
  fluidSolver?.destroy();
});

Object.assign(window, {
  __lermsLiveHandDebugState: () => ({
    schema: 'lerms.live-hand-viewer.v0',
    runtimeOwner: 'hand-state-runtime',
    runtimeUrl,
    fixtureMode,
    running,
    meshVisible: handMesh.visible,
    vertexCount: handGeometry.getAttribute('position')?.count || 0,
    faceCount: handGeometry.index ? handGeometry.index.count / 3 : 0,
    effectiveRoute: fixtureMode
      ? 'recorded_wilor_mano_fixture'
      : latestFluidPacket?.source_route || null,
    runtimeRoute,
    eventSequence: lastStateSequence,
    deliveryMode: 'long_poll',
    orientationContract: MANO_DISPLAY_ORIENTATION,
    benchmarkDroppedBeforeRender,
    benchmarkError: lastBenchmarkError,
    benchmark: latencySamples.length ? summarizeLiveHandLatency(latencySamples) : null,
    fluid: fluidSolver?.available ? {
      pinnedRevision: KAMINOS_FLUID_REVISION,
      inletContract: KAMINOS_FINGER_FLUID_LIVE_INLET_CONTRACT,
      adapterContract: LIVE_FINGER_FLUID_ADAPTER_CONTRACT,
      defaultParticleCount: KAMINOS_FINGER_FLUID_DEFAULT_PARTICLE_COUNT,
      stepCount: fluidStepCount,
      activeEmitterCount: latestFluidPacket?.emitters.filter(emitter => emitter.active).length || 0,
      frameIntervalMs: distribution(combinedFrameIntervalsMs),
      cpuSubmitMs: distribution(combinedCpuSubmitMs),
      solver: fluidSolver.getDebugState(),
    } : { available: false, error: fluidError },
  }),
});

resize();
resetBenchmark();
if (fixtureMode) {
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
      routeTruth.textContent = `recorded_wilor_mano_fixture | 778v / 1538f | visual-only | current fluid ${KAMINOS_FINGER_FLUID_DEFAULT_PARTICLE_COUNT}p inactive`;
      setStatus('recorded WiLoR MANO surface', 'live');
      toggle.disabled = true;
    })
    .catch(error => setStatus(error instanceof Error ? error.message : String(error), 'error'));
}
requestAnimationFrame(animate);
