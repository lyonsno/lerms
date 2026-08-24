export type LiveHandSourceMode = 'pure_wilor' | 'hybrid_mano';

export const PURE_WILOR_ANCHOR_INTERVAL_MS = 50;
// The hybrid anchor interval must keep worst-case anchor capture-age inside
// the runtime's 650ms fast-authority budget under measured GPU contention:
// WiLoR service p95 ~416ms + interval + ~100ms busy-tick quantization (anchor
// submission stays paired to a MediaPipe-admitted frame, so it fires on fast
// ticks). 100ms bounds that sum at ~616ms; 200ms breached the budget in the
// 2026-08-23 witness (stale-anchor fallback on 86/174 ingests). The corrected
// publish-completed sidecar scheduler self-paces at 1/service-time, so faster
// arrivals can no longer starve correction publication.
export const HYBRID_MANO_ANCHOR_INTERVAL_MS = 100;

export function resolveLiveHandAnchorIntervalMs(mode: LiveHandSourceMode): number {
  return mode === 'hybrid_mano' ? HYBRID_MANO_ANCHOR_INTERVAL_MS : PURE_WILOR_ANCHOR_INTERVAL_MS;
}

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
