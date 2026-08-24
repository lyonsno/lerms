export interface LiveHandFastDeliveryItem {
  captureId: string;
  anchorPairRequired?: boolean;
}

export interface LiveHandFastDeliverySupersession<TItem extends LiveHandFastDeliveryItem> {
  reason: 'newer_fast_observation_before_post';
  superseded: TItem;
  replacement: TItem;
}

export interface LiveHandFastDeliverySnapshot {
  activeCaptureId: string | null;
  pendingCaptureId: string | null;
  trailingCaptureId: string | null;
  pendingCount: number;
  protectedPendingCount: number;
  protectedOverflowCount: number;
  enqueuedCount: number;
  completedCount: number;
  failedCount: number;
  supersededBeforePostCount: number;
  discardedPendingCount: number;
}

// The protected queue exists to absorb transient delivery stalls without
// dropping anchor-paired observations. Beyond this depth, an item would be at
// least (cap x anchor interval) = ~800ms stale by the time it could deliver —
// past every downstream authority budget (650ms fast authority, 750ms
// presentation hold) — so the oldest is superseded loudly (recorded lineage +
// counter) instead of letting a stalled runtime grow the queue and the
// delivered-state staleness without bound.
export const MAX_PROTECTED_PENDING_DELIVERIES = 8;

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
  private protectedPending: TItem[] = [];
  private latestPending: TItem | null = null;
  private enqueuedCount = 0;
  private completedCount = 0;
  private failedCount = 0;
  private supersededBeforePostCount = 0;
  private protectedOverflowCount = 0;
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
    if (item.anchorPairRequired === true) {
      if (this.latestPending !== null) {
        this.recordSupersession(this.latestPending, item);
        this.latestPending = null;
      }
      if (this.protectedPending.length >= MAX_PROTECTED_PENDING_DELIVERIES) {
        const oldest = this.protectedPending.shift();
        if (oldest !== undefined) {
          this.protectedOverflowCount += 1;
          this.recordSupersession(oldest, item);
        }
      }
      this.protectedPending.push(item);
      return;
    }
    if (this.latestPending !== null) {
      this.recordSupersession(this.latestPending, item);
    }
    this.latestPending = item;
  }

  discardPending(): TItem | null {
    const discarded = this.protectedPending[0] ?? this.latestPending;
    this.discardedPendingCount += this.protectedPending.length + (this.latestPending ? 1 : 0);
    this.protectedPending.length = 0;
    this.latestPending = null;
    return discarded;
  }

  whenIdle(): Promise<void> {
    if (
      this.active === null
      && this.protectedPending.length === 0
      && this.latestPending === null
    ) return Promise.resolve();
    return new Promise(resolve => this.idleWaiters.push(resolve));
  }

  resetCounters(): void {
    if (
      this.active !== null
      || this.protectedPending.length > 0
      || this.latestPending !== null
    ) {
      throw new Error('fast delivery mailbox counters cannot reset while delivery is active');
    }
    this.enqueuedCount = 0;
    this.completedCount = 0;
    this.failedCount = 0;
    this.supersededBeforePostCount = 0;
    this.protectedOverflowCount = 0;
    this.discardedPendingCount = 0;
  }

  snapshot(): LiveHandFastDeliverySnapshot {
    const pending = this.protectedPending[0] ?? this.latestPending;
    const trailing = this.protectedPending[1]
      ?? (this.protectedPending.length > 0 ? this.latestPending : null);
    return {
      activeCaptureId: this.active?.captureId ?? null,
      pendingCaptureId: pending?.captureId ?? null,
      trailingCaptureId: trailing?.captureId ?? null,
      pendingCount: this.protectedPending.length + (this.latestPending ? 1 : 0),
      protectedPendingCount: this.protectedPending.length,
      protectedOverflowCount: this.protectedOverflowCount,
      enqueuedCount: this.enqueuedCount,
      completedCount: this.completedCount,
      failedCount: this.failedCount,
      supersededBeforePostCount: this.supersededBeforePostCount,
      discardedPendingCount: this.discardedPendingCount,
    };
  }

  private recordSupersession(superseded: TItem, replacement: TItem): void {
    this.supersededBeforePostCount += 1;
    this.onSuperseded({
      reason: 'newer_fast_observation_before_post',
      superseded,
      replacement,
    });
  }

  private takeNext(): TItem | null {
    const protectedItem = this.protectedPending.shift();
    if (protectedItem) return protectedItem;
    const latest = this.latestPending;
    this.latestPending = null;
    return latest;
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
        const next = this.takeNext();
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
