export interface LiveHandCaptureMetrics {
  capturedAtMs: number;
  captureAcquireMs: number;
  workerEncodeMs: number;
  clientEncodeMs: number;
  nativePostMs: number;
}

export interface LiveHandLatencyReceipt<TFrame> {
  frameId: string;
  frame: TFrame;
  viewerReceiveTimestampMs: number;
  captureMetrics: LiveHandCaptureMetrics;
}

export interface LiveHandLatencyReceiptJoinState {
  pendingCaptureCount: number;
  pendingFrameCount: number;
  completedCount: number;
  discardedCaptureCount: number;
  discardedFrameCount: number;
}

export class LiveHandLatencyReceiptJoiner<TFrame> {
  private readonly captureMetricsByFrame = new Map<string, LiveHandCaptureMetrics>();
  private readonly receivedFrames = new Map<string, {
    frame: TFrame;
    viewerReceiveTimestampMs: number;
  }>();
  private readonly completedFrameIds = new Set<string>();
  private discardedCaptureCount = 0;
  private discardedFrameCount = 0;

  reset(): void {
    this.captureMetricsByFrame.clear();
    this.receivedFrames.clear();
    this.completedFrameIds.clear();
    this.discardedCaptureCount = 0;
    this.discardedFrameCount = 0;
  }

  registerCapture(
    frameId: string,
    captureMetrics: LiveHandCaptureMetrics,
  ): LiveHandLatencyReceipt<TFrame> | null {
    if (this.completedFrameIds.has(frameId)) return null;
    const receivedFrame = this.receivedFrames.get(frameId);
    if (receivedFrame) {
      this.receivedFrames.delete(frameId);
      this.completedFrameIds.add(frameId);
      return {
        frameId,
        frame: receivedFrame.frame,
        viewerReceiveTimestampMs: receivedFrame.viewerReceiveTimestampMs,
        captureMetrics,
      };
    }
    this.captureMetricsByFrame.set(frameId, captureMetrics);
    return null;
  }

  registerFrame(
    frameId: string,
    frame: TFrame,
    viewerReceiveTimestampMs: number,
  ): LiveHandLatencyReceipt<TFrame> | null {
    if (this.completedFrameIds.has(frameId)) return null;
    const captureMetrics = this.captureMetricsByFrame.get(frameId);
    if (!captureMetrics) {
      if (!this.receivedFrames.has(frameId)) {
        this.receivedFrames.set(frameId, { frame, viewerReceiveTimestampMs });
      }
      return null;
    }
    this.captureMetricsByFrame.delete(frameId);
    this.completedFrameIds.add(frameId);
    return { frameId, frame, viewerReceiveTimestampMs, captureMetrics };
  }

  prune(nowMs: number, maxAgeMs: number): void {
    for (const [frameId, captureMetrics] of this.captureMetricsByFrame) {
      if (nowMs - captureMetrics.capturedAtMs > maxAgeMs) {
        this.captureMetricsByFrame.delete(frameId);
        this.discardedCaptureCount += 1;
      }
    }
    for (const [frameId, receivedFrame] of this.receivedFrames) {
      if (nowMs - receivedFrame.viewerReceiveTimestampMs > maxAgeMs) {
        this.receivedFrames.delete(frameId);
        this.discardedFrameCount += 1;
      }
    }
  }

  snapshot(): LiveHandLatencyReceiptJoinState {
    return {
      pendingCaptureCount: this.captureMetricsByFrame.size,
      pendingFrameCount: this.receivedFrames.size,
      completedCount: this.completedFrameIds.size,
      discardedCaptureCount: this.discardedCaptureCount,
      discardedFrameCount: this.discardedFrameCount,
    };
  }
}
