export const LIVE_HAND_FLUID_FRAME_INTERVAL_MS = 1000 / 60;
export const LIVE_HAND_FLUID_MAX_CATCH_UP_MS = 50;
export const LIVE_HAND_FLUID_PIXEL_RATIO_CAP = 1;
export const LIVE_HAND_HITCH_RECOVERY_THRESHOLD_MS = 75;

export type LiveHandFrameWorkReason =
  | 'fluid_due'
  | 'hitch_recovery'
  | 'gpu_backpressure'
  | 'cadence_wait';

export interface LiveHandFrameWorkDecision {
  runFluid: boolean;
  reason: LiveHandFrameWorkReason;
  animationFrameIntervalMs: number;
  fluidAgeMs: number;
  rebaseFluidClock: boolean;
}

export interface LiveFluidSimulationCatchUpPlan {
  stepCount: number;
  stepSeconds: number;
  simulationAdvanceMs: number;
}

export function initializeFluidSimulationClock(simulationClockAtMs: number, nowMs: number): number {
  return simulationClockAtMs > 0 ? simulationClockAtMs : nowMs;
}

export function advanceFluidSimulationClock(simulationClockAtMs: number, simulationAdvanceMs: number): number {
  return simulationClockAtMs + simulationAdvanceMs;
}

export function planLiveFluidSimulationCatchUp(elapsedMs: number): LiveFluidSimulationCatchUpPlan {
  const boundedElapsedMs = Math.max(
    LIVE_HAND_FLUID_FRAME_INTERVAL_MS,
    Math.min(LIVE_HAND_FLUID_MAX_CATCH_UP_MS, Number.isFinite(elapsedMs) ? elapsedMs : 0),
  );
  const maximumStepCount = Math.floor(
    (LIVE_HAND_FLUID_MAX_CATCH_UP_MS + 1e-6) / LIVE_HAND_FLUID_FRAME_INTERVAL_MS,
  );
  const stepCount = Math.max(
    1,
    Math.min(
      maximumStepCount,
      Math.floor((boundedElapsedMs + 1e-6) / LIVE_HAND_FLUID_FRAME_INTERVAL_MS),
    ),
  );
  return {
    stepCount,
    stepSeconds: LIVE_HAND_FLUID_FRAME_INTERVAL_MS / 1000,
    simulationAdvanceMs: stepCount * LIVE_HAND_FLUID_FRAME_INTERVAL_MS,
  };
}

export function decideLiveHandFrameWork({
  nowMs,
  previousFrameAtMs,
  fluidSimulationClockAtMs,
  handStatePending,
  fluidGpuBusy = false,
}: {
  nowMs: number;
  previousFrameAtMs: number;
  fluidSimulationClockAtMs: number;
  handStatePending: boolean;
  fluidGpuBusy?: boolean;
}): LiveHandFrameWorkDecision {
  const animationFrameIntervalMs = previousFrameAtMs > 0 ? Math.max(0, nowMs - previousFrameAtMs) : 0;
  const fluidAgeMs = fluidSimulationClockAtMs > 0 ? Math.max(0, nowMs - fluidSimulationClockAtMs) : 0;
  if (animationFrameIntervalMs >= LIVE_HAND_HITCH_RECOVERY_THRESHOLD_MS) {
    return { runFluid: false, reason: 'hitch_recovery', animationFrameIntervalMs, fluidAgeMs, rebaseFluidClock: true };
  }
  if (fluidGpuBusy) {
    return { runFluid: false, reason: 'gpu_backpressure', animationFrameIntervalMs, fluidAgeMs, rebaseFluidClock: false };
  }
  void handStatePending;
  if (fluidAgeMs < LIVE_HAND_FLUID_FRAME_INTERVAL_MS) {
    return { runFluid: false, reason: 'cadence_wait', animationFrameIntervalMs, fluidAgeMs, rebaseFluidClock: false };
  }
  return { runFluid: true, reason: 'fluid_due', animationFrameIntervalMs, fluidAgeMs, rebaseFluidClock: false };
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
