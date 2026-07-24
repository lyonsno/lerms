import {
  LIVE_HAND_LANDMARKER_DROP_SCHEMA,
  LIVE_HAND_LANDMARKER_ERROR_SCHEMA,
  LIVE_HAND_LANDMARKER_READY_SCHEMA,
  LIVE_HAND_LANDMARKER_RESULT_SCHEMA,
  LIVE_HAND_LANDMARKER_WORKER_ROUTE,
} from './live-hand-landmarker-contract.js';

const TASKS_VISION_VERSION = '0.10.20';
const TASKS_VISION_MODULE_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${TASKS_VISION_VERSION}/vision_bundle.mjs`;
const DEFAULT_WASM_BASE = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${TASKS_VISION_VERSION}/wasm`;
const DEFAULT_MODEL_ASSET_PATH = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task';

interface WorkerConfig {
  wasmBase?: string;
  modelAssetPath?: string;
  delegate?: 'CPU' | 'GPU';
  minHandDetectionConfidence?: number;
  minHandPresenceConfidence?: number;
  minTrackingConfidence?: number;
}

interface DetectRequest {
  type: 'detect-frame';
  captureId: string;
  captureTimestampMs: number;
  width: number;
  height: number;
  frame: VideoFrame;
  config?: WorkerConfig;
}

interface VisionModule {
  FilesetResolver: {
    forVisionTasks(base: string): Promise<unknown>;
  };
  HandLandmarker: {
    createFromOptions(fileset: unknown, options: Record<string, unknown>): Promise<HandLandmarker>;
  };
}

interface HandLandmarker {
  detectForVideo(source: CanvasImageSource, timestampMs: number): {
    landmarks?: Array<Array<{ x: number; y: number; z: number }>>;
    worldLandmarks?: Array<Array<{ x: number; y: number; z: number }>>;
    handednesses?: Array<Array<{ categoryName?: string; score?: number }>>;
  };
}

let tasksVision: VisionModule | null = null;
let handLandmarker: HandLandmarker | null = null;
let initPromise: Promise<HandLandmarker> | null = null;
let canvas: OffscreenCanvas | null = null;
let context: OffscreenCanvasRenderingContext2D | null = null;
const initializationEvidence = {
  tasksVisionModuleLoaded: false,
  wasmLoaded: false,
  modelLoaded: false,
};

function postFailure(
  failurePhase: string,
  error: unknown,
  captureId: string | null,
): void {
  self.postMessage({
    schema: LIVE_HAND_LANDMARKER_ERROR_SCHEMA,
    routeIdentity: LIVE_HAND_LANDMARKER_WORKER_ROUTE,
    captureId,
    failurePhase,
    error: error instanceof Error ? error.message : String(error),
    primaryOutputWritten: false,
    lastTrustworthyEvidence: { ...initializationEvidence },
  });
}

async function loadTasksVision(): Promise<VisionModule> {
  if (tasksVision) return tasksVision;
  tasksVision = await import(/* @vite-ignore */ TASKS_VISION_MODULE_URL) as unknown as VisionModule;
  initializationEvidence.tasksVisionModuleLoaded = true;
  return tasksVision;
}

async function ensureHandLandmarker(config: WorkerConfig = {}): Promise<HandLandmarker> {
  if (handLandmarker) return handLandmarker;
  if (!initPromise) {
    initPromise = (async () => {
      const module = await loadTasksVision();
      const wasmBase = config.wasmBase || DEFAULT_WASM_BASE;
      const fileset = await module.FilesetResolver.forVisionTasks(wasmBase);
      initializationEvidence.wasmLoaded = true;
      handLandmarker = await module.HandLandmarker.createFromOptions(fileset, {
        baseOptions: {
          modelAssetPath: config.modelAssetPath || DEFAULT_MODEL_ASSET_PATH,
          delegate: config.delegate || 'CPU',
        },
        runningMode: 'VIDEO',
        numHands: 1,
        minHandDetectionConfidence: config.minHandDetectionConfidence ?? 0.45,
        minHandPresenceConfidence: config.minHandPresenceConfidence ?? 0.45,
        minTrackingConfidence: config.minTrackingConfidence ?? 0.45,
      });
      initializationEvidence.modelLoaded = true;
      self.postMessage({
        schema: LIVE_HAND_LANDMARKER_READY_SCHEMA,
        routeIdentity: LIVE_HAND_LANDMARKER_WORKER_ROUTE,
        tasksVisionVersion: TASKS_VISION_VERSION,
        modelAssetPath: config.modelAssetPath || DEFAULT_MODEL_ASSET_PATH,
        wasmBase,
        delegate: config.delegate || 'CPU',
        mirroredInput: true,
      });
      return handLandmarker;
    })().catch(error => {
      initPromise = null;
      throw error;
    });
  }
  return initPromise;
}

async function detectFrame(request: DetectRequest): Promise<void> {
  const workerStartedAt = performance.now();
  let failurePhase = 'initialize_model';
  const frame = request.frame;
  let frameClosed = false;
  try {
    const landmarker = await ensureHandLandmarker(request.config);
    failurePhase = 'draw_mirrored_frame';
    if (!canvas || canvas.width !== request.width || canvas.height !== request.height) {
      canvas = new OffscreenCanvas(request.width, request.height);
      context = canvas.getContext('2d', { alpha: false });
    }
    if (!canvas || !context) throw new Error('landmarker worker 2D context is unavailable');
    context.save();
    try {
      context.setTransform(-1, 0, 0, 1, request.width, 0);
      context.drawImage(frame as unknown as CanvasImageSource, 0, 0, request.width, request.height);
    } finally {
      context.restore();
      frame.close();
      frameClosed = true;
    }

    failurePhase = 'detect_landmarks';
    const detectStartedAt = performance.now();
    const result = landmarker.detectForVideo(canvas, request.captureTimestampMs);
    const detectedAt = performance.now();
    const imageLandmarks = result.landmarks?.[0];
    const worldLandmarks = result.worldLandmarks?.[0];
    const handedness = result.handednesses?.[0]?.[0];
    if (!imageLandmarks || !worldLandmarks || !handedness) {
      self.postMessage({
        schema: LIVE_HAND_LANDMARKER_DROP_SCHEMA,
        routeIdentity: LIVE_HAND_LANDMARKER_WORKER_ROUTE,
        captureId: request.captureId,
        captureTimestampMs: request.captureTimestampMs,
        publishedAtMs: Date.now(),
        reason: 'no_complete_hand_detected',
        workerLandmarkerMs: detectedAt - detectStartedAt,
        workerProcessingMs: detectedAt - workerStartedAt,
        mirroredInput: true,
        primaryOutputWritten: false,
        lastTrustworthyEvidence: { ...initializationEvidence },
      });
      return;
    }
    self.postMessage({
      schema: LIVE_HAND_LANDMARKER_RESULT_SCHEMA,
      routeIdentity: LIVE_HAND_LANDMARKER_WORKER_ROUTE,
      captureId: request.captureId,
      captureTimestampMs: request.captureTimestampMs,
      publishedAtMs: Date.now(),
      handedness: handedness.categoryName || 'unknown',
      confidence: Number(handedness.score ?? 0),
      imageLandmarks,
      worldLandmarks,
      workerLandmarkerMs: detectedAt - detectStartedAt,
      workerProcessingMs: detectedAt - workerStartedAt,
      mirroredInput: true,
    });
  } catch (error) {
    if (!frameClosed) frame.close();
    postFailure(failurePhase, error, request.captureId);
  }
}

self.addEventListener('message', event => {
  const message = event.data as {
    type?: string;
    config?: WorkerConfig;
    frame?: VideoFrame;
  };
  if (message.type === 'init') {
    void ensureHandLandmarker(message.config).catch(error => postFailure('initialize_model', error, null));
    return;
  }
  if (message.type === 'detect-frame' && message.frame instanceof VideoFrame) {
    void detectFrame(message as DetectRequest);
    return;
  }
  postFailure('validate_request', new Error('landmarker worker received an invalid request'), null);
});
