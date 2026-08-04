const RUN_CONTEXTS = new Set([
  'contended-diagnostic',
  'quiet-baseline',
]);

export function summarizeCanonicalPerformanceSamples({
  samples,
  requestedWindowMs,
  runContext,
  expected,
}) {
  if (!RUN_CONTEXTS.has(runContext)) {
    throw new Error(`invalid run context ${runContext}`);
  }
  if (!Number.isFinite(requestedWindowMs) || requestedWindowMs <= 0) {
    throw new Error(
      `invalid requested performance window ${requestedWindowMs}`,
    );
  }

  const normalized = Array.isArray(samples) ? samples : [];
  const timestamps = normalized
    .map((entry) => entry.timestampMs)
    .filter(Number.isFinite);
  const intervals = [];
  for (let index = 1; index < timestamps.length; index += 1) {
    intervals.push(timestamps[index] - timestamps[index - 1]);
  }
  const actualWindowMs =
    timestamps.length >= 2
      ? timestamps[timestamps.length - 1] - timestamps[0]
      : 0;
  const primarySignalPresent = normalized.length >= 2;
  const windowComplete =
    primarySignalPresent &&
    actualWindowMs >= requestedWindowMs * 0.95;

  const routeVerified =
    primarySignalPresent &&
    normalized.every(
      (entry) =>
        entry.viewer === expected.viewer &&
        entry.terrain === expected.terrain &&
        entry.actor === expected.actor &&
        entry.backend === expected.backend,
    );
  const noFallbackOrStaleState =
    primarySignalPresent &&
    normalized.every(
      (entry) =>
        entry.fallbackStatus === 'none' &&
        entry.staleStatus === 'fresh',
    );
  const oneVisibleCanvasVerified =
    primarySignalPresent &&
    normalized.every((entry) => entry.visibleCanvasCount === 1);
  const compactTransportVerified =
    primarySignalPresent &&
    normalized.every(
      (entry) =>
        entry.fullTerrainCpuUploads === 1 &&
        entry.fullFieldWorkerTransfersAfterInitialization === 0 &&
        entry.fullFieldReadbacksAfterInitialization === 0,
    );

  const generations = normalized.map((entry) => entry.generation);
  const queueOrdinals = normalized.map(
    (entry) => entry.queueSubmissionOrdinal,
  );
  const generationMonotonic = monotonic(generations);
  const queueSubmissionMonotonic = monotonic(queueOrdinals);
  const firstGeneration = generations.at(0) ?? null;
  const lastGeneration = generations.at(-1) ?? null;
  const generationDelta =
    Number.isFinite(firstGeneration) && Number.isFinite(lastGeneration)
      ? lastGeneration - firstGeneration
      : 0;
  const generationAdvanced = generationDelta > 0;

  const generationHoldAges = [];
  let observedGeneration = null;
  let observedGenerationAt = null;
  for (const entry of normalized) {
    if (entry.generation !== observedGeneration) {
      observedGeneration = entry.generation;
      observedGenerationAt = entry.timestampMs;
    }
    generationHoldAges.push(
      Number.isFinite(observedGenerationAt)
        ? entry.timestampMs - observedGenerationAt
        : 0,
    );
  }

  const sourceElapsedValues = normalized
    .map((entry) => entry.sourceElapsedMs)
    .filter(Number.isFinite);
  const firstSourceElapsedMs = sourceElapsedValues.at(0) ?? null;
  const lastSourceElapsedMs = sourceElapsedValues.at(-1) ?? null;
  const sourceElapsedDeltaMs =
    Number.isFinite(firstSourceElapsedMs) &&
    Number.isFinite(lastSourceElapsedMs)
      ? lastSourceElapsedMs - firstSourceElapsedMs
      : 0;

  const presentationAges = normalized
    .map((entry) => entry.timestampMs - entry.hostTimestampMs)
    .filter(Number.isFinite);
  const lifecyclePhases = Array.from(
    new Set(
      normalized
        .map((entry) => entry.lifecyclePhase)
        .filter((value) => typeof value === 'string'),
    ),
  );

  const reasons = [];
  if (!primarySignalPresent) reasons.push('no browser frame samples');
  if (!windowComplete) {
    reasons.push(
      `observed window ${round(actualWindowMs)}ms did not cover requested window ${requestedWindowMs}ms`,
    );
  }
  if (!routeVerified) reasons.push('route identity was substituted or partial');
  if (!noFallbackOrStaleState) {
    reasons.push('fallback or stale state entered the observation window');
  }
  if (!oneVisibleCanvasVerified) {
    reasons.push('visible canvas count diverged from one');
  }
  if (!compactTransportVerified) {
    reasons.push('full-field transfer or readback contract diverged');
  }
  if (!generationMonotonic) {
    reasons.push('GPU generation regressed during the observation window');
  }
  if (!queueSubmissionMonotonic) {
    reasons.push('queue submission ordinal regressed during the observation window');
  }
  if (!generationAdvanced) {
    reasons.push('GPU generation did not advance during the observation window');
  }

  const complete = reasons.length === 0;
  const acceptanceEligible =
    complete && runContext === 'quiet-baseline';

  return {
    schema: 'lerms.hill-gpu-canonical-performance-summary.v0',
    runContext,
    contamination: {
      status:
        runContext === 'quiet-baseline'
          ? 'operator-declared-quiet'
          : 'declared-contended',
      acceptanceEligible,
    },
    requestedWindowMs,
    actualWindowMs: round(actualWindowMs),
    primarySignalPresent,
    windowComplete,
    routeVerified,
    noFallbackOrStaleState,
    oneVisibleCanvasVerified,
    compactTransportVerified,
    generationMonotonic,
    queueSubmissionMonotonic,
    generationAdvanced,
    complete,
    acceptanceEligible,
    reasons,
    framePacing: {
      frameCount: normalized.length,
      intervalCount: intervals.length,
      meanIntervalMs: round(mean(intervals)),
      medianIntervalMs: round(percentile(intervals, 0.5)),
      p95IntervalMs: round(percentile(intervals, 0.95)),
      p99IntervalMs: round(percentile(intervals, 0.99)),
      maxIntervalMs: round(max(intervals)),
      approximateFps:
        actualWindowMs > 0
          ? round(((normalized.length - 1) * 1000) / actualWindowMs)
          : 0,
      over25Ms: intervals.filter((value) => value > 25).length,
      over50Ms: intervals.filter((value) => value > 50).length,
      over100Ms: intervals.filter((value) => value > 100).length,
    },
    gpuCadence: {
      firstGeneration,
      lastGeneration,
      generationDelta,
      distinctGenerations: new Set(generations).size,
      generationsPerSecond:
        actualWindowMs > 0
          ? round((generationDelta * 1000) / actualWindowMs)
          : 0,
      firstQueueSubmissionOrdinal: queueOrdinals.at(0) ?? null,
      lastQueueSubmissionOrdinal: queueOrdinals.at(-1) ?? null,
      generationHoldAge: {
        meanMs: round(mean(generationHoldAges)),
        p95Ms: round(percentile(generationHoldAges, 0.95)),
        maxMs: round(max(generationHoldAges)),
      },
    },
    sourceCadence: {
      firstSourceElapsedMs,
      lastSourceElapsedMs,
      sourceElapsedDeltaMs: round(sourceElapsedDeltaMs),
      sourceMsPerWallSecond:
        actualWindowMs > 0
          ? round((sourceElapsedDeltaMs * 1000) / actualWindowMs)
          : 0,
    },
    hostCompositionAge: {
      meanMs: round(mean(presentationAges)),
      p95Ms: round(percentile(presentationAges, 0.95)),
      maxMs: round(max(presentationAges)),
    },
    lifecyclePhases,
  };
}

function monotonic(values) {
  return (
    values.length >= 2 &&
    values.every(
      (value, index) =>
        Number.isFinite(value) &&
        (index === 0 || value >= values[index - 1]),
    )
  );
}

function mean(values) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function max(values) {
  return values.length === 0 ? 0 : Math.max(...values);
}

function percentile(values, quantile) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const position = (sorted.length - 1) * quantile;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sorted[lower];
  const weight = position - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

function round(value) {
  return Number.isFinite(value) ? Number(value.toFixed(3)) : 0;
}
