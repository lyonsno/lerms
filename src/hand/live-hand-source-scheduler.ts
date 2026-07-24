export type LiveHandSourceMode = 'pure_wilor' | 'hybrid_mano';

export interface LiveHandSourceFramePlanInput {
  mode: LiveHandSourceMode;
  nowMs: number;
  lastAnchorCaptureAtMs: number | null;
  anchorIntervalMs: number;
  fastPathAvailable: boolean;
  fastPathInFlight: boolean;
  anchorInFlight: boolean;
}

export interface LiveHandSourceFramePlan {
  submitFastPath: boolean;
  submitAnchor: boolean;
  reason: 'pure_anchor' | 'hybrid_anchor' | 'hybrid_fast' | 'anchor_wait' | 'fast_path_wait';
}

export function planLiveHandSourceFrame(input: LiveHandSourceFramePlanInput): LiveHandSourceFramePlan {
  const anchorDue = input.lastAnchorCaptureAtMs === null
    || input.nowMs - input.lastAnchorCaptureAtMs >= input.anchorIntervalMs;
  if (input.mode === 'pure_wilor') {
    const submitAnchor = anchorDue && !input.anchorInFlight;
    return {
      submitFastPath: false,
      submitAnchor,
      reason: submitAnchor ? 'pure_anchor' : 'anchor_wait',
    };
  }
  if (!input.fastPathAvailable || input.fastPathInFlight) {
    return {
      submitFastPath: false,
      submitAnchor: false,
      reason: 'fast_path_wait',
    };
  }
  const submitAnchor = anchorDue && !input.anchorInFlight;
  return {
    submitFastPath: true,
    submitAnchor,
    reason: submitAnchor ? 'hybrid_anchor' : 'hybrid_fast',
  };
}
