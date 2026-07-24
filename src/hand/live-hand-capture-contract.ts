export const LIVE_HAND_CAPTURE_WORKER_ROUTE = 'transferable-videoframe-offscreen-jpeg-v0' as const;
export const LIVE_HAND_CAPTURE_RESULT_SCHEMA = 'lerms.live-hand-capture-result.v0' as const;
export const LIVE_HAND_CAPTURE_REPLY_DEADLINE_MS = 750 as const;

export interface LiveHandCaptureWorkerResult {
  schema: typeof LIVE_HAND_CAPTURE_RESULT_SCHEMA;
  routeIdentity: typeof LIVE_HAND_CAPTURE_WORKER_ROUTE;
  captureId: string;
  blob: Blob;
  workerEncodeMs: number;
  width: number;
  height: number;
}

export function isCaptureRunCurrent(
  requestRunGeneration: number,
  activeRunGeneration: number,
  running: boolean,
): boolean {
  return running && requestRunGeneration === activeRunGeneration;
}

function finiteNonNegative(value: unknown, label: string): number {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) throw new Error(`${label} must be finite and non-negative`);
  return number;
}

export function normalizeCaptureWorkerResult(
  value: unknown,
  expectedCaptureId: string,
): LiveHandCaptureWorkerResult {
  if (!value || typeof value !== 'object') throw new Error('capture worker result is missing');
  const result = value as Record<string, unknown>;
  if (result.schema !== LIVE_HAND_CAPTURE_RESULT_SCHEMA) throw new Error('capture worker result schema is invalid');
  if (result.routeIdentity !== LIVE_HAND_CAPTURE_WORKER_ROUTE) throw new Error('capture worker route is invalid');
  if (result.captureId !== expectedCaptureId) throw new Error('capture worker result does not match its request');
  if (!(result.blob instanceof Blob) || result.blob.type !== 'image/jpeg' || result.blob.size === 0) {
    throw new Error('capture worker must return a nonblank JPEG');
  }
  const width = finiteNonNegative(result.width, 'capture width');
  const height = finiteNonNegative(result.height, 'capture height');
  if (width < 1 || height < 1) throw new Error('capture dimensions must be positive');
  return {
    schema: LIVE_HAND_CAPTURE_RESULT_SCHEMA,
    routeIdentity: LIVE_HAND_CAPTURE_WORKER_ROUTE,
    captureId: expectedCaptureId,
    blob: result.blob,
    workerEncodeMs: finiteNonNegative(result.workerEncodeMs, 'worker encode duration'),
    width,
    height,
  };
}
