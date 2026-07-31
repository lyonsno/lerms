export const LIVE_HAND_OPERATOR_SMOKE_WITNESS_SCHEMA = 'lerms.operator-smoke-witness.v0' as const;
export const LIVE_HAND_OPERATOR_SMOKE_CAPTURE_ROUTE = 'browser-mediarecorder-parallel-camera-track-v0' as const;

export interface LiveHandOperatorSmokeStart {
  stream: MediaStream;
  sessionId: string;
  requestedRoute: string;
  initialMotionPhase: string;
}

export interface LiveHandOperatorSmokeWitnessDependencies {
  fetch: typeof globalThis.fetch;
  now: () => number;
  createRecorder: (stream: MediaStream, options: MediaRecorderOptions) => MediaRecorder;
  isTypeSupported: (mimeType: string) => boolean;
}

interface ActiveRecording {
  sessionId: string;
  requestedRoute: string;
  mimeType: string;
  recorder: MediaRecorder;
  chunks: Blob[];
  chunkCount: number;
  captureStartedAtMs: number;
  phaseTimeline: Array<{ phase: string; atMs: number }>;
  stopped: Promise<void>;
  resolveStopped: () => void;
  rejectStopped: (error: Error) => void;
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
      state: this.active ? this.active.recorder.state : 'inactive',
      sessionId: this.active?.sessionId ?? null,
      mimeType: this.active?.mimeType ?? null,
      chunkCount: this.active?.chunkCount ?? 0,
      captureStartedAtMs: this.active?.captureStartedAtMs ?? null,
      lastReceipt: this.lastReceipt,
      lastError: this.lastError,
    };
  }

  async start(options: LiveHandOperatorSmokeStart): Promise<Record<string, unknown>> {
    if (this.active) throw new Error(`operator smoke ${this.active.sessionId} is already recording`);
    const mimeType = MIME_CANDIDATES.find(candidate => this.dependencies.isTypeSupported(candidate));
    if (!mimeType) throw new Error('no supported MediaRecorder video format for operator smoke witness');
    const captureStartedAtMs = this.dependencies.now();
    const started = await this.fetchJson('/operator-smoke/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        schema: 'lerms.operator-smoke-start.v0',
        sessionId: options.sessionId,
        requestedRoute: options.requestedRoute,
        captureRoute: LIVE_HAND_OPERATOR_SMOKE_CAPTURE_ROUTE,
        recorderMimeType: mimeType,
        captureStartedAtMs,
      }),
    });

    let resolveStopped = () => {};
    let rejectStopped = (_error: Error) => {};
    const stopped = new Promise<void>((resolve, reject) => {
      resolveStopped = resolve;
      rejectStopped = reject;
    });
    let recorder: MediaRecorder;
    try {
      recorder = this.dependencies.createRecorder(options.stream, { mimeType });
    } catch (error) {
      await this.interruptReservation(
        options.sessionId,
        `recorder_construction_failed: ${errorMessage(error)}`,
        'media_recorder_construction',
        { mediaRecorderChunkCount: 0, recorderState: 'unavailable' },
      );
      throw error;
    }
    const active: ActiveRecording = {
      sessionId: options.sessionId,
      requestedRoute: options.requestedRoute,
      mimeType,
      recorder,
      chunks: [],
      chunkCount: 0,
      captureStartedAtMs,
      phaseTimeline: [{ phase: options.initialMotionPhase, atMs: captureStartedAtMs }],
      stopped,
      resolveStopped,
      rejectStopped,
    };
    recorder.ondataavailable = event => {
      if (event.data.size <= 0) return;
      active.chunks.push(event.data);
      active.chunkCount += 1;
    };
    recorder.onerror = event => {
      const mediaError = 'error' in event && event.error instanceof Error
        ? event.error
        : new Error('MediaRecorder failed');
      active.rejectStopped(mediaError);
    };
    recorder.onstop = () => active.resolveStopped();
    this.active = active;
    this.lastError = null;
    try {
      recorder.start(1000);
    } catch (error) {
      this.active = null;
      await this.interruptReservation(
        options.sessionId,
        `recorder_start_failed: ${errorMessage(error)}`,
        'media_recorder_start',
        { mediaRecorderChunkCount: 0, recorderState: recorder.state },
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
      if (active.recorder.state !== 'inactive') {
        active.recorder.requestData();
        active.recorder.stop();
      }
      await active.stopped;
      const rawCapture = new Blob(active.chunks, { type: active.mimeType });
      if (rawCapture.size <= 0) {
        failurePhase = 'media_recorder_empty';
        throw new Error('operator smoke raw camera recording is empty');
      }
      failurePhase = 'raw_capture_upload';
      await this.fetchJson('/operator-smoke/raw-capture', {
        method: 'POST',
        headers: {
          'Content-Type': active.mimeType,
          'X-Operator-Smoke-Session-Id': active.sessionId,
          'X-Capture-Started-At-Ms': String(active.captureStartedAtMs),
          'X-Capture-Stopped-At-Ms': String(captureStoppedAtMs),
          'X-Media-Recorder-Chunk-Count': String(active.chunkCount),
        },
        body: rawCapture,
      });
      failurePhase = 'runtime_operator_smoke_finalize';
      const receipt = await this.fetchJson('/operator-smoke/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schema: 'lerms.operator-smoke-stop.v0',
          sessionId: active.sessionId,
          captureStoppedAtMs,
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
          mediaRecorderChunkCount: active.chunkCount,
          recorderState: active.recorder.state,
          captureStartedAtMs: active.captureStartedAtMs,
          captureStoppedAtMs,
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
      schema: 'lerms.operator-smoke-interrupted.v0',
      sessionId: active.sessionId,
      reason,
      failurePhase: 'viewer_beforeunload',
      interruptedAtMs: this.dependencies.now(),
      lastTrustworthyEvidence: {
        mediaRecorderChunkCount: active.chunkCount,
        recorderState: active.recorder.state,
        captureStartedAtMs: active.captureStartedAtMs,
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
          schema: 'lerms.operator-smoke-interrupted.v0',
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
