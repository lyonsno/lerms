import {
  LIVE_HAND_CAPTURE_RESULT_SCHEMA,
  LIVE_HAND_CAPTURE_WORKER_ROUTE,
} from './live-hand-capture-contract.js';

interface CaptureRequest {
  captureId: string;
  frame: VideoFrame;
  width: number;
  height: number;
  quality: number;
}

let canvas: OffscreenCanvas | null = null;
let context: OffscreenCanvasRenderingContext2D | null = null;

self.onmessage = async (event: MessageEvent<CaptureRequest>) => {
  const request = event.data;
  const startedAt = performance.now();
  try {
    if (!canvas || canvas.width !== request.width || canvas.height !== request.height) {
      canvas = new OffscreenCanvas(request.width, request.height);
      context = canvas.getContext('2d', { alpha: false });
    }
    if (!canvas || !context) throw new Error('capture worker 2D context is unavailable');
    try {
      context.save();
      try {
        context.setTransform(-1, 0, 0, 1, request.width, 0);
        context.drawImage(request.frame, 0, 0, request.width, request.height);
      } finally {
        context.restore();
      }
    } finally {
      request.frame.close();
    }
    const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: request.quality });
    self.postMessage({
      schema: LIVE_HAND_CAPTURE_RESULT_SCHEMA,
      routeIdentity: LIVE_HAND_CAPTURE_WORKER_ROUTE,
      captureId: request.captureId,
      blob,
      workerEncodeMs: performance.now() - startedAt,
      width: request.width,
      height: request.height,
    });
  } catch (error) {
    self.postMessage({
      schema: 'lerms.live-hand-capture-error.v0',
      routeIdentity: LIVE_HAND_CAPTURE_WORKER_ROUTE,
      captureId: request.captureId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
