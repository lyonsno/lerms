export const LIVE_HAND_FLUID_FRAME_INTERVAL_MS = 1000 / 30;
export const LIVE_HAND_FLUID_MAX_DEFERRAL_MS = 100;
export const LIVE_HAND_FLUID_PIXEL_RATIO_CAP = 1;
export const LIVE_HAND_HITCH_RECOVERY_THRESHOLD_MS = 75;

export type LiveHandFrameWorkReason =
  | 'fluid_due'
  | 'fluid_liveness'
  | 'hand_state_priority'
  | 'hitch_recovery'
  | 'cadence_wait';

export interface LiveHandFrameWorkDecision {
  runFluid: boolean;
  reason: LiveHandFrameWorkReason;
  animationFrameIntervalMs: number;
  fluidAgeMs: number;
}

export function initializeFluidDeferralClock(lastFluidSubmitAtMs: number, nowMs: number): number {
  return lastFluidSubmitAtMs > 0 ? lastFluidSubmitAtMs : nowMs;
}

export function decideLiveHandFrameWork({
  nowMs,
  previousFrameAtMs,
  lastFluidSubmitAtMs,
  handStatePending,
}: {
  nowMs: number;
  previousFrameAtMs: number;
  lastFluidSubmitAtMs: number;
  handStatePending: boolean;
}): LiveHandFrameWorkDecision {
  const animationFrameIntervalMs = previousFrameAtMs > 0 ? Math.max(0, nowMs - previousFrameAtMs) : 0;
  const fluidAgeMs = lastFluidSubmitAtMs > 0 ? Math.max(0, nowMs - lastFluidSubmitAtMs) : 0;
  if (animationFrameIntervalMs >= LIVE_HAND_HITCH_RECOVERY_THRESHOLD_MS) {
    return { runFluid: false, reason: 'hitch_recovery', animationFrameIntervalMs, fluidAgeMs };
  }
  if (handStatePending && fluidAgeMs < LIVE_HAND_FLUID_MAX_DEFERRAL_MS) {
    return { runFluid: false, reason: 'hand_state_priority', animationFrameIntervalMs, fluidAgeMs };
  }
  if (handStatePending) {
    return { runFluid: true, reason: 'fluid_liveness', animationFrameIntervalMs, fluidAgeMs };
  }
  if (fluidAgeMs < LIVE_HAND_FLUID_FRAME_INTERVAL_MS) {
    return { runFluid: false, reason: 'cadence_wait', animationFrameIntervalMs, fluidAgeMs };
  }
  return { runFluid: true, reason: 'fluid_due', animationFrameIntervalMs, fluidAgeMs };
}

export function shouldKeepHandPresentationPriority({
  handStatePending,
  interpolationUnsettled,
}: {
  handStatePending: boolean;
  interpolationUnsettled: boolean;
}): boolean {
  return handStatePending && interpolationUnsettled;
}
