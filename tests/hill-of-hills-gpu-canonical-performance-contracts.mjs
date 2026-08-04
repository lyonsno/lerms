import assert from 'node:assert/strict';

import {
  summarizeCanonicalPerformanceSamples,
} from './hill-of-hills-gpu-canonical-performance-metrics.mjs';

const EXPECTED = {
  viewer: 'lerms/hill-of-hills/primary-viewer-gpu-resident-v0',
  terrain: 'lerms/hill-of-hills/gpu-resident-causal-state-v0',
  actor: 'lerms/lerm-horde/primary-viewer-actor-frame-v0',
  backend: 'webgpu',
};

function sample({
  timestampMs,
  generation,
  queueSubmissionOrdinal = generation,
  viewer = EXPECTED.viewer,
  terrain = EXPECTED.terrain,
  actor = EXPECTED.actor,
  backend = EXPECTED.backend,
  fallbackStatus = 'none',
  staleStatus = 'fresh',
  sourceElapsedMs = timestampMs,
  hostTimestampMs = timestampMs - 4,
  lifecyclePhase = 'traversing',
} = {}) {
  return {
    timestampMs,
    generation,
    queueSubmissionOrdinal,
    viewer,
    terrain,
    actor,
    backend,
    fallbackStatus,
    staleStatus,
    sourceElapsedMs,
    hostTimestampMs,
    lifecyclePhase,
    visibleCanvasCount: 1,
    fullTerrainCpuUploads: 1,
    fullFieldWorkerTransfersAfterInitialization: 0,
    fullFieldReadbacksAfterInitialization: 0,
  };
}

function regularSamples({
  count = 121,
  intervalMs = 1000 / 60,
  generationStride = 2,
} = {}) {
  return Array.from({ length: count }, (_, index) =>
    sample({
      timestampMs: index * intervalMs,
      generation: Math.floor(index / generationStride) + 1,
    }),
  );
}

{
  const summary = summarizeCanonicalPerformanceSamples({
    samples: regularSamples(),
    requestedWindowMs: 2_000,
    runContext: 'contended-diagnostic',
    expected: EXPECTED,
  });

  assert.equal(summary.complete, true);
  assert.equal(summary.routeVerified, true);
  assert.equal(summary.generationMonotonic, true);
  assert.equal(summary.queueSubmissionMonotonic, true);
  assert.equal(summary.compactTransportVerified, true);
  assert.equal(summary.acceptanceEligible, false);
  assert.equal(summary.contamination.status, 'declared-contended');
  assert.equal(summary.framePacing.frameCount, 121);
  assert.ok(summary.framePacing.p95IntervalMs < 17);
  assert.equal(summary.framePacing.over50Ms, 0);
  assert.equal(summary.gpuCadence.generationDelta, 60);
  assert.ok(summary.gpuCadence.generationHoldAge.maxMs < 17);
  assert.equal(summary.sourceCadence.sourceElapsedDeltaMs, 2_000);
  assert.equal(summary.sourceCadence.sourceMsPerWallSecond, 1_000);
  assert.deepEqual(summary.lifecyclePhases, ['traversing']);
}

{
  const summary = summarizeCanonicalPerformanceSamples({
    samples: regularSamples(),
    requestedWindowMs: 2_000,
    runContext: 'quiet-baseline',
    expected: EXPECTED,
  });

  assert.equal(summary.complete, true);
  assert.equal(summary.acceptanceEligible, true);
  assert.equal(summary.contamination.status, 'operator-declared-quiet');
}

{
  const substituted = regularSamples().map((entry) => ({
    ...entry,
    terrain: 'lerms/hill-of-hills/cpu-worker-v0',
  }));
  const summary = summarizeCanonicalPerformanceSamples({
    samples: substituted,
    requestedWindowMs: 2_000,
    runContext: 'quiet-baseline',
    expected: EXPECTED,
  });

  assert.equal(summary.complete, false);
  assert.equal(summary.routeVerified, false);
  assert.equal(summary.acceptanceEligible, false);
  assert.match(summary.reasons.join('\n'), /route identity/);
}

{
  const staleFallback = regularSamples().map((entry) => ({
    ...entry,
    fallbackStatus: 'cpu-worker',
    staleStatus: 'retained',
  }));
  const summary = summarizeCanonicalPerformanceSamples({
    samples: staleFallback,
    requestedWindowMs: 2_000,
    runContext: 'quiet-baseline',
    expected: EXPECTED,
  });

  assert.equal(summary.noFallbackOrStaleState, false);
  assert.equal(summary.acceptanceEligible, false);
}

{
  const partial = regularSamples({ count: 31 });
  const summary = summarizeCanonicalPerformanceSamples({
    samples: partial,
    requestedWindowMs: 2_000,
    runContext: 'quiet-baseline',
    expected: EXPECTED,
  });

  assert.equal(summary.windowComplete, false);
  assert.equal(summary.acceptanceEligible, false);
  assert.match(summary.reasons.join('\n'), /requested window/);
}

{
  const reversed = regularSamples();
  reversed[80] = {
    ...reversed[80],
    generation: 3,
    queueSubmissionOrdinal: 3,
  };
  const summary = summarizeCanonicalPerformanceSamples({
    samples: reversed,
    requestedWindowMs: 2_000,
    runContext: 'quiet-baseline',
    expected: EXPECTED,
  });

  assert.equal(summary.generationMonotonic, false);
  assert.equal(summary.queueSubmissionMonotonic, false);
  assert.equal(summary.acceptanceEligible, false);
}

{
  const summary = summarizeCanonicalPerformanceSamples({
    samples: [],
    requestedWindowMs: 2_000,
    runContext: 'quiet-baseline',
    expected: EXPECTED,
  });

  assert.equal(summary.complete, false);
  assert.equal(summary.primarySignalPresent, false);
  assert.equal(summary.acceptanceEligible, false);
  assert.match(summary.reasons.join('\n'), /no browser frame samples/);
}

assert.throws(
  () =>
    summarizeCanonicalPerformanceSamples({
      samples: regularSamples(),
      requestedWindowMs: 2_000,
      runContext: 'probably-quiet',
      expected: EXPECTED,
    }),
  /invalid run context/,
);

console.log('hill canonical GPU performance contracts passed');
