export const LIVE_HAND_PRESENTATION_CAPTURE_ROUTE = 'browser-direct-hand-webgl-canvas-mediarecorder-v0' as const;

export class LiveHandPresentationCapture {
  private stream: MediaStream | null = null;
  private track: CanvasCaptureMediaStreamTrack | null = null;
  private capturedFrameCount = 0;
  private lastError: string | null = null;

  constructor(private readonly handCanvas: HTMLCanvasElement) {}

  start(): MediaStream {
    if (this.stream) throw new Error('rendered hand witness is already active');
    if (typeof this.handCanvas.captureStream !== 'function') {
      throw new Error('rendered hand witness requires canvas.captureStream');
    }
    const stream = this.handCanvas.captureStream(0);
    const track = stream.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack | undefined;
    if (!track || typeof track.requestFrame !== 'function') {
      stream.getTracks().forEach(candidate => candidate.stop());
      throw new Error('rendered hand witness requires manual CanvasCaptureMediaStreamTrack frames');
    }
    this.stream = stream;
    this.track = track;
    this.capturedFrameCount = 0;
    this.lastError = null;
    return stream;
  }

  capturePresentedFrame(): void {
    const track = this.track;
    if (!track) return;
    if (this.handCanvas.width <= 0 || this.handCanvas.height <= 0) {
      this.lastError = 'rendered hand witness source canvas has no pixels';
      throw new Error(this.lastError);
    }
    try {
      track.requestFrame();
      this.capturedFrameCount += 1;
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : String(error);
      throw error;
    }
  }

  snapshot(): Record<string, unknown> {
    return {
      captureRoute: LIVE_HAND_PRESENTATION_CAPTURE_ROUTE,
      state: this.track ? 'capturing' : 'inactive',
      capturedFrameCount: this.capturedFrameCount,
      width: this.handCanvas.width,
      height: this.handCanvas.height,
      lastError: this.lastError,
    };
  }

  stop(): void {
    this.stream?.getTracks().forEach(track => track.stop());
    this.stream = null;
    this.track = null;
  }
}
