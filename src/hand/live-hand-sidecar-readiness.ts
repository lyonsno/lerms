import {
  assertLiveRuntimeSidecarStatus,
  type RuntimeSidecarStatusTruth,
} from './live-hand-contract.js';

export interface LiveHandSidecarReadinessDependencies {
  start: () => Promise<unknown>;
  status: () => Promise<unknown>;
  wait: () => Promise<void>;
  observe?: (truth: RuntimeSidecarStatusTruth) => void;
  observeWarming?: () => void;
}

function isReady(truth: RuntimeSidecarStatusTruth): boolean {
  return truth.running && truth.modelReady && truth.modelReadiness === 'ready';
}

export class LiveHandSidecarReadinessCoordinator {
  private inFlightWarmup: Promise<RuntimeSidecarStatusTruth> | null = null;

  constructor(private readonly dependencies: LiveHandSidecarReadinessDependencies) {}

  invalidate(): void {
    this.inFlightWarmup = null;
  }

  async ensureCurrentReady(): Promise<RuntimeSidecarStatusTruth> {
    const observedWarmup = this.inFlightWarmup;
    if (observedWarmup) await observedWarmup;
    let truth = this.observe(await this.dependencies.status());
    if (isReady(truth)) return truth;

    if (this.inFlightWarmup === observedWarmup) this.inFlightWarmup = null;
    await this.beginWarmup();
    truth = this.observe(await this.dependencies.status());
    if (!isReady(truth)) {
      throw new Error(`WiLoR sidecar is not currently model-ready: ${truth.modelReadiness}`);
    }
    return truth;
  }

  private beginWarmup(): Promise<RuntimeSidecarStatusTruth> {
    if (!this.inFlightWarmup) {
      const warmup = this.waitForReady();
      this.inFlightWarmup = warmup;
      void warmup.then(() => {
        if (this.inFlightWarmup === warmup) this.inFlightWarmup = null;
      }, () => {
        if (this.inFlightWarmup === warmup) this.inFlightWarmup = null;
      });
    }
    return this.inFlightWarmup;
  }

  private async waitForReady(): Promise<RuntimeSidecarStatusTruth> {
    let truth = this.observe(await this.dependencies.start());
    while (!isReady(truth)) {
      if (!truth.running || truth.modelReadiness === 'failed_before_ready') {
        throw new Error(`WiLoR sidecar ${truth.modelReadiness}${truth.stopReason ? `: ${truth.stopReason}` : ''}`);
      }
      if (truth.modelReadiness !== 'warming') {
        throw new Error(`WiLoR sidecar cannot become ready from ${truth.modelReadiness}`);
      }
      this.dependencies.observeWarming?.();
      await this.dependencies.wait();
      truth = this.observe(await this.dependencies.status());
    }
    return truth;
  }

  private observe(value: unknown): RuntimeSidecarStatusTruth {
    const truth = assertLiveRuntimeSidecarStatus(value);
    this.dependencies.observe?.(truth);
    return truth;
  }
}
