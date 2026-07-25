export interface LiveHandFastDeliveryItem {
  captureId: string;
}

export interface LiveHandFastDeliverySupersession<TItem extends LiveHandFastDeliveryItem> {
  reason: 'newer_fast_observation_before_post';
  superseded: TItem;
  replacement: TItem;
}

export interface LiveHandFastDeliverySnapshot {
  activeCaptureId: string | null;
  pendingCaptureId: string | null;
  enqueuedCount: number;
  completedCount: number;
  failedCount: number;
  supersededBeforePostCount: number;
  discardedPendingCount: number;
}

export interface LiveHandFastDeliveryLineage {
  captureId: string;
  replacementCaptureId: string;
  reason: 'newer_fast_observation_before_post';
}

export function coalesceFastDeliveryLineage(
  inherited: readonly LiveHandFastDeliveryLineage[],
  supersededCaptureId: string,
  replacementCaptureId: string,
): LiveHandFastDeliveryLineage[] {
  return [
    ...inherited.map(row => ({
      ...row,
      replacementCaptureId,
    })),
    {
      captureId: supersededCaptureId,
      replacementCaptureId,
      reason: 'newer_fast_observation_before_post' as const,
    },
  ];
}

export class LiveHandFastDeliveryMailbox<TItem extends LiveHandFastDeliveryItem> {
  private active: TItem | null = null;
  private pending: TItem | null = null;
  private enqueuedCount = 0;
  private completedCount = 0;
  private failedCount = 0;
  private supersededBeforePostCount = 0;
  private discardedPendingCount = 0;
  private idleWaiters: Array<() => void> = [];

  constructor(
    private readonly deliver: (item: TItem) => Promise<void>,
    private readonly onSuperseded: (
      supersession: LiveHandFastDeliverySupersession<TItem>,
    ) => void,
    private readonly onFailure: (item: TItem, error: unknown) => void,
  ) {}

  enqueue(item: TItem): void {
    this.enqueuedCount += 1;
    if (this.active === null) {
      this.start(item);
      return;
    }
    if (this.pending !== null) {
      const supersession = {
        reason: 'newer_fast_observation_before_post' as const,
        superseded: this.pending,
        replacement: item,
      };
      this.supersededBeforePostCount += 1;
      this.onSuperseded(supersession);
    }
    this.pending = item;
  }

  discardPending(): TItem | null {
    const discarded = this.pending;
    if (discarded !== null) {
      this.pending = null;
      this.discardedPendingCount += 1;
    }
    return discarded;
  }

  whenIdle(): Promise<void> {
    if (this.active === null && this.pending === null) return Promise.resolve();
    return new Promise(resolve => this.idleWaiters.push(resolve));
  }

  resetCounters(): void {
    if (this.active !== null || this.pending !== null) {
      throw new Error('fast delivery mailbox counters cannot reset while delivery is active');
    }
    this.enqueuedCount = 0;
    this.completedCount = 0;
    this.failedCount = 0;
    this.supersededBeforePostCount = 0;
    this.discardedPendingCount = 0;
  }

  snapshot(): LiveHandFastDeliverySnapshot {
    return {
      activeCaptureId: this.active?.captureId ?? null,
      pendingCaptureId: this.pending?.captureId ?? null,
      enqueuedCount: this.enqueuedCount,
      completedCount: this.completedCount,
      failedCount: this.failedCount,
      supersededBeforePostCount: this.supersededBeforePostCount,
      discardedPendingCount: this.discardedPendingCount,
    };
  }

  private start(item: TItem): void {
    this.active = item;
    void this.deliver(item)
      .then(() => {
        this.completedCount += 1;
      })
      .catch(error => {
        this.failedCount += 1;
        this.onFailure(item, error);
      })
      .finally(() => {
        const next = this.pending;
        this.pending = null;
        this.active = null;
        if (next !== null) {
          this.start(next);
          return;
        }
        const waiters = this.idleWaiters.splice(0);
        for (const resolve of waiters) resolve();
      });
  }
}
