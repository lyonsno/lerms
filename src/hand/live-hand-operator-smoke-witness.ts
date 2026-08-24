import { LIVE_HAND_PRESENTATION_CAPTURE_ROUTE } from './live-hand-presentation-capture.js';

export const LIVE_HAND_OPERATOR_SMOKE_WITNESS_SCHEMA = 'lerms.operator-smoke-witness.v1' as const;
export const LIVE_HAND_OPERATOR_SMOKE_RAW_CAPTURE_ROUTE = 'browser-mediarecorder-parallel-camera-track-v0' as const;

export interface LiveHandOperatorSmokeStart {
  presentationStream: MediaStream;
  cameraStream: MediaStream;
  sessionId: string;
  requestedRoute: string;
  initialMotionPhase: string;
  presentationFrameCount: () => number;
}

export interface LiveHandOperatorSmokeWitnessDependencies {
  fetch: typeof globalThis.fetch;
  now: () => number;
  createRecorder: (stream: MediaStream, options: MediaRecorderOptions) => MediaRecorder;
  isTypeSupported: (mimeType: string) => boolean;
}

interface ActiveCapture {
  role: 'presentation' | 'raw_camera';
  recorder: MediaRecorder;
  chunks: Blob[];
  chunkCount: number;
  stopped: Promise<void>;
  resolveStopped: () => void;
  rejectStopped: (error: Error) => void;
}

interface ActiveRecording {
  sessionId: string;
  requestedRoute: string;
  mimeType: string;
  captures: {
    presentation: ActiveCapture;
    rawCamera: ActiveCapture;
  };
  captureStartedAtMs: number;
  phaseTimeline: Array<{ phase: string; atMs: number }>;
  presentationFrameCount: () => number;
}

const MIME_CANDIDATES = [
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/webm',
  'video/mp4',
] as const;

function defaultDependencies(): LiveHandOperatorSmokeWitnessDependencies {
  return {
    fetch: globalThis.fetch.bind(globalThis),
    now: () => Date.now(),
    createRecorder: (stream, options) => new MediaRecorder(stream, options),
    isTypeSupported: mimeType => MediaRecorder.isTypeSupported(mimeType),
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Render the runtime's availability admissibility verdict from a smoke stop
 * receipt. Returns null when the run is admissible; otherwise a loud message
 * that must reach the operator instead of a clean-stop status. A receipt that
 * carries no verdict at all is treated as inadmissible — absence of the gate
 * must not read as a pass.
 */
export function formatAdmissibilityVerdict(receipt: Record<string, unknown>): string | null {
  const admissible = receipt.geometryComparisonAdmissible;
  if (admissible === true) return null;
  const verdict = receipt.admissibility as { reasons?: unknown } | undefined;
  const reasons = Array.isArray(verdict?.reasons) && verdict.reasons.length > 0
    ? verdict.reasons.map(String).join('; ')
    : 'runtime stop receipt carried no availability verdict';
  return `SMOKE INADMISSIBLE FOR GEOMETRY JUDGMENT: ${reasons}`;
}

export class LiveHandOperatorSmokeWitness {
  private readonly dependencies: LiveHandOperatorSmokeWitnessDependencies;
  private active: ActiveRecording | null = null;
  private lastReceipt: Record<string, unknown> | null = null;
  private lastError: string | null = null;

  constructor(
    private readonly runtimeUrl: string,
    dependencies: Partial<LiveHandOperatorSmokeWitnessDependencies> = {},
  ) {
    this.dependencies = { ...defaultDependencies(), ...dependencies };
  }

  snapshot(): Record<string, unknown> {
    return {
      schema: LIVE_HAND_OPERATOR_SMOKE_WITNESS_SCHEMA,
      state: this.active ? 'recording' : 'inactive',
      sessionId: this.active?.sessionId ?? null,
      mimeType: this.active?.mimeType ?? null,
      primaryCaptureRoute: LIVE_HAND_PRESENTATION_CAPTURE_ROUTE,
      rawCaptureRoute: LIVE_HAND_OPERATOR_SMOKE_RAW_CAPTURE_ROUTE,
      presentationChunkCount: this.active?.captures.presentation.chunkCount ?? 0,
      rawCameraChunkCount: this.active?.captures.rawCamera.chunkCount ?? 0,
      captureStartedAtMs: this.active?.captureStartedAtMs ?? null,
      lastReceipt: this.lastReceipt,
      lastError: this.lastError,
    };
  }

  async start(options: LiveHandOperatorSmokeStart): Promise<Record<string, unknown>> {
    if (this.active) throw new Error(`operator smoke ${this.active.sessionId} is already recording`);
    if (options.presentationStream === options.cameraStream) {
      throw new Error('operator smoke presentation and raw camera streams must be independently identifiable');
    }
    const mimeType = MIME_CANDIDATES.find(candidate => this.dependencies.isTypeSupported(candidate));
    if (!mimeType) throw new Error('no supported MediaRecorder video format for operator smoke witness');
    const captureStartedAtMs = this.dependencies.now();
    const started = await this.fetchJson('/operator-smoke/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        schema: 'lerms.operator-smoke-start.v1',
        sessionId: options.sessionId,
        requestedRoute: options.requestedRoute,
        captureRoute: LIVE_HAND_PRESENTATION_CAPTURE_ROUTE,
        rawCaptureRoute: LIVE_HAND_OPERATOR_SMOKE_RAW_CAPTURE_ROUTE,
        recorderMimeType: mimeType,
        rawRecorderMimeType: mimeType,
        captureStartedAtMs,
      }),
    });

    let presentation: ActiveCapture;
    let rawCamera: ActiveCapture;
    try {
      presentation = this.createCapture('presentation', options.presentationStream, mimeType);
      rawCamera = this.createCapture('raw_camera', options.cameraStream, mimeType);
    } catch (error) {
      await this.interruptReservation(
        options.sessionId,
        `recorder_construction_failed: ${errorMessage(error)}`,
        'media_recorder_construction',
        { presentationRecorderState: 'unavailable', rawCameraRecorderState: 'unavailable' },
      );
      throw error;
    }
    const active: ActiveRecording = {
      sessionId: options.sessionId,
      requestedRoute: options.requestedRoute,
      mimeType,
      captures: { presentation, rawCamera },
      captureStartedAtMs,
      phaseTimeline: [{ phase: options.initialMotionPhase, atMs: captureStartedAtMs }],
      presentationFrameCount: options.presentationFrameCount,
    };
    this.active = active;
    this.lastError = null;
    try {
      presentation.recorder.start(1000);
      rawCamera.recorder.start(1000);
    } catch (error) {
      this.active = null;
      for (const capture of [presentation, rawCamera]) {
        if (capture.recorder.state !== 'inactive') capture.recorder.stop();
      }
      await this.interruptReservation(
        options.sessionId,
        `recorder_start_failed: ${errorMessage(error)}`,
        'media_recorder_start',
        this.captureEvidence(active),
      );
      throw error;
    }
    this.lastReceipt = started;
    return started;
  }

  recordMotionPhase(phase: string): void {
    if (!this.active) return;
    const previous = this.active.phaseTimeline.at(-1);
    if (previous?.phase === phase) return;
    this.active.phaseTimeline.push({ phase, atMs: this.dependencies.now() });
  }

  async stop(): Promise<Record<string, unknown>> {
    const active = this.active;
    if (!active) throw new Error('operator smoke witness is not recording');
    const captureStoppedAtMs = this.dependencies.now();
    let failurePhase = 'media_recorder_stop';
    try {
      const [presentationBlob, rawCameraBlob] = await Promise.all([
        this.stopCapture(active.captures.presentation),
        this.stopCapture(active.captures.rawCamera),
      ]);
      if (presentationBlob.size <= 0) {
        failurePhase = 'presentation_media_recorder_empty';
        throw new Error('operator smoke rendered hand presentation recording is empty');
      }
      if (rawCameraBlob.size <= 0) {
        failurePhase = 'raw_camera_media_recorder_empty';
        throw new Error('operator smoke raw camera recording is empty');
      }
      failurePhase = 'presentation_capture_upload';
      await this.uploadCapture(
        '/operator-smoke/presentation-capture',
        active,
        active.captures.presentation,
        presentationBlob,
        captureStoppedAtMs,
      );
      failurePhase = 'raw_capture_upload';
      await this.uploadCapture(
        '/operator-smoke/raw-capture',
        active,
        active.captures.rawCamera,
        rawCameraBlob,
        captureStoppedAtMs,
      );
      failurePhase = 'runtime_operator_smoke_finalize';
      const receipt = await this.fetchJson('/operator-smoke/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schema: 'lerms.operator-smoke-stop.v1',
          sessionId: active.sessionId,
          captureStoppedAtMs,
          presentationFrameCount: active.presentationFrameCount(),
          operatorMotionPhases: active.phaseTimeline,
        }),
      });
      this.lastReceipt = receipt;
      this.lastError = null;
      return receipt;
    } catch (error) {
      this.lastError = errorMessage(error);
      await this.interruptReservation(
        active.sessionId,
        `stop_failed: ${this.lastError}`,
        failurePhase,
        {
          ...this.captureEvidence(active),
          captureStartedAtMs: active.captureStartedAtMs,
          captureStoppedAtMs,
          presentationFrameCount: active.presentationFrameCount(),
        },
      );
      throw error;
    } finally {
      this.active = null;
    }
  }

  markInterrupted(reason: string): void {
    const active = this.active;
    if (!active) return;
    const body = JSON.stringify({
      schema: 'lerms.operator-smoke-interrupted.v1',
      sessionId: active.sessionId,
      reason,
      failurePhase: 'viewer_beforeunload',
      interruptedAtMs: this.dependencies.now(),
      lastTrustworthyEvidence: {
        ...this.captureEvidence(active),
        captureStartedAtMs: active.captureStartedAtMs,
        presentationFrameCount: active.presentationFrameCount(),
      },
    });
    void this.dependencies.fetch(`${this.runtimeUrl}/operator-smoke/interrupted`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
      credentials: 'omit',
    });
    this.active = null;
  }

  private createCapture(
    role: ActiveCapture['role'],
    stream: MediaStream,
    mimeType: string,
  ): ActiveCapture {
    let resolveStopped = () => {};
    let rejectStopped = (_error: Error) => {};
    const stopped = new Promise<void>((resolve, reject) => {
      resolveStopped = resolve;
      rejectStopped = reject;
    });
    const recorder = this.dependencies.createRecorder(stream, { mimeType });
    const capture: ActiveCapture = {
      role,
      recorder,
      chunks: [],
      chunkCount: 0,
      stopped,
      resolveStopped,
      rejectStopped,
    };
    recorder.ondataavailable = event => {
      if (event.data.size <= 0) return;
      capture.chunks.push(event.data);
      capture.chunkCount += 1;
    };
    recorder.onerror = event => {
      const mediaError = 'error' in event && event.error instanceof Error
        ? event.error
        : new Error(`${role} MediaRecorder failed`);
      capture.rejectStopped(mediaError);
    };
    recorder.onstop = () => capture.resolveStopped();
    return capture;
  }

  private async stopCapture(capture: ActiveCapture): Promise<Blob> {
    if (capture.recorder.state !== 'inactive') {
      capture.recorder.requestData();
      capture.recorder.stop();
    }
    await capture.stopped;
    return new Blob(capture.chunks, { type: capture.recorder.mimeType });
  }

  private async uploadCapture(
    path: string,
    active: ActiveRecording,
    capture: ActiveCapture,
    blob: Blob,
    captureStoppedAtMs: number,
  ): Promise<void> {
    await this.fetchJson(path, {
      method: 'POST',
      headers: {
        'Content-Type': active.mimeType,
        'X-Operator-Smoke-Session-Id': active.sessionId,
        'X-Capture-Started-At-Ms': String(active.captureStartedAtMs),
        'X-Capture-Stopped-At-Ms': String(captureStoppedAtMs),
        'X-Media-Recorder-Chunk-Count': String(capture.chunkCount),
        'X-Presentation-Frame-Count': String(active.presentationFrameCount()),
      },
      body: blob,
    });
  }

  private captureEvidence(active: ActiveRecording): Record<string, unknown> {
    return {
      presentationMediaRecorderChunkCount: active.captures.presentation.chunkCount,
      presentationRecorderState: active.captures.presentation.recorder.state,
      rawCameraMediaRecorderChunkCount: active.captures.rawCamera.chunkCount,
      rawCameraRecorderState: active.captures.rawCamera.recorder.state,
    };
  }

  private async interruptReservation(
    sessionId: string,
    reason: string,
    failurePhase: string,
    lastTrustworthyEvidence: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.fetchJson('/operator-smoke/interrupted', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schema: 'lerms.operator-smoke-interrupted.v1',
          sessionId,
          reason,
          failurePhase,
          interruptedAtMs: this.dependencies.now(),
          lastTrustworthyEvidence,
        }),
      });
    } catch {
      // The original capture failure remains the actionable error.
    }
  }

  private async fetchJson(path: string, init: RequestInit): Promise<Record<string, unknown>> {
    const response = await this.dependencies.fetch(`${this.runtimeUrl}${path}`, {
      cache: 'no-store',
      credentials: 'omit',
      ...init,
    });
    const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
    if (!response.ok) {
      throw new Error(typeof payload.error === 'string' ? payload.error : `${path} returned ${response.status}`);
    }
    return payload;
  }
}
