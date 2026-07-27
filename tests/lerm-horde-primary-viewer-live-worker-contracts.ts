import assert from 'node:assert/strict';

import {
  LERM_HORDE_PRIMARY_VIEWER_WORKER_REQUEST_SCHEMA,
  LERM_HORDE_PRIMARY_VIEWER_WORKER_RESPONSE_SCHEMA,
  LERM_HORDE_PRIMARY_VIEWER_WORKER_ROUTE,
  createLermHordePrimaryViewerWorkerRuntime,
  type LermHordePrimaryViewerWorkerPort,
  type LermHordePrimaryViewerWorkerRequest,
  type LermHordePrimaryViewerWorkerResponse,
} from '../src/lerm-horde-primary-viewer-live-worker-client.js';
import {
  LERM_HORDE_PRIMARY_VIEWER_ATOMIC_FRAME_SCHEMA,
  type LermHordePrimaryViewerAtomicFrame,
} from '../src/lerm-horde-primary-viewer-live-composition.js';
import {
  LERM_HORDE_PRIMARY_VIEWER_ACTOR_FRAME_ROUTE,
  LERM_HORDE_PRIMARY_VIEWER_ACTOR_FRAME_SCHEMA,
  type LermHordePrimaryViewerActorFrame,
} from '../src/lerm-horde-primary-viewer-actor-frame.js';

class FakeWorkerPort implements LermHordePrimaryViewerWorkerPort {
  onmessage:
    | ((event: MessageEvent<LermHordePrimaryViewerWorkerResponse>) => void)
    | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  readonly requests: LermHordePrimaryViewerWorkerRequest[] = [];
  terminated = false;

  postMessage(request: LermHordePrimaryViewerWorkerRequest): void {
    this.requests.push(request);
  }

  respond(response: LermHordePrimaryViewerWorkerResponse): void {
    this.onmessage?.({ data: response } as MessageEvent<LermHordePrimaryViewerWorkerResponse>);
  }

  terminate(): void {
    this.terminated = true;
  }
}

let nowMs = 100;
const port = new FakeWorkerPort();
const runtimePromise = createLermHordePrimaryViewerWorkerRuntime(
  port,
  () => nowMs,
);
assert.deepEqual(port.requests, [
  {
    schema: LERM_HORDE_PRIMARY_VIEWER_WORKER_REQUEST_SCHEMA,
    route: LERM_HORDE_PRIMARY_VIEWER_WORKER_ROUTE,
    requestId: 1,
    command: 'initialize',
    sourceElapsedMs: 0,
  },
]);
port.respond(success(port.requests[0], frame(0, 0), 3_700));
const runtime = await runtimePromise;

const initial = runtime.advance(10_000);
assert.equal(initial.sourceElapsedMs, 0);
assert.equal(
  runtime.publication().hostPublishedAtMs,
  10_000,
  'the first host tick must publish the complete initial frame without waiting for another worker trip',
);

const whilePending = runtime.advance(11_000);
assert.equal(
  whilePending,
  initial,
  'the host must retain the last complete atomic frame while a worker request is pending',
);
assert.equal(port.requests.at(-1)?.sourceElapsedMs, 200);
assert.equal(runtime.inFlight, true);

runtime.advance(11_400);
assert.equal(
  port.requests.length,
  2,
  'new host targets coalesce while one worker request is in flight',
);
assert.equal(runtime.publication().presentationAgeMs, 1_400);

nowMs = 11_450;
port.respond(success(port.requests[1], frame(1, 200), 3_700));
assert.equal(runtime.frame.sourceElapsedMs, 200);
assert.equal(
  port.requests.at(-1)?.sourceElapsedMs,
  280,
  'the latest coalesced target dispatches immediately after the prior complete frame publishes',
);
assert.equal(runtime.publication().presentationAgeMs, 0);

const crossTick = frame(2, 280);
crossTick.actor.terrain.frameId = 'substituted-hill';
port.respond(success(port.requests[2], crossTick, 3_700));
assert.throws(
  () => runtime.advance(11_500),
  /atomic|cross.tick|same Hill/i,
  'a cross-tick actor/Hill response must fail loud instead of publishing a partial frame',
);
assert.equal(
  runtime.frame.sourceElapsedMs,
  200,
  'a rejected response cannot replace the last trustworthy complete frame',
);

const failurePort = new FakeWorkerPort();
const failedRuntimePromise = createLermHordePrimaryViewerWorkerRuntime(
  failurePort,
  () => nowMs,
);
failurePort.respond({
  schema: LERM_HORDE_PRIMARY_VIEWER_WORKER_RESPONSE_SCHEMA,
  route: workerRoute(),
  requestId: 1,
  command: 'initialize',
  ok: false,
  error: {
    phase: 'source-load',
    message: 'exact producer artifact unavailable',
  },
});
await assert.rejects(
  failedRuntimePromise,
  /source-load.*exact producer artifact unavailable/i,
  'worker initialization failure must reject without a synchronous fallback',
);

await assertRejectedAtomicMutation(
  'generation/tick mismatch',
  (candidate) => {
    candidate.generation += 1;
  },
);
await assertRejectedAtomicMutation(
  'traffic checksum substitution',
  (candidate) => {
    candidate.actor.terrain.trafficChecksum = 'substituted-traffic';
  },
);
await assertRejectedAtomicMutation(
  'support checksum substitution',
  (candidate) => {
    candidate.actor.terrain.supportFrameChecksum =
      'substituted-support';
  },
);
await assertRejectedGenerationRegression();

runtime.terminate();
assert.equal(port.terminated, true);

async function assertRejectedAtomicMutation(
  label: string,
  mutate: (candidate: LermHordePrimaryViewerAtomicFrame) => void,
): Promise<void> {
  let localNowMs = 20_000;
  const mutationPort = new FakeWorkerPort();
  const runtimePromise =
    createLermHordePrimaryViewerWorkerRuntime(
      mutationPort,
      () => localNowMs,
    );
  mutationPort.respond(
    success(mutationPort.requests[0], frame(0, 0), 3_700),
  );
  const mutationRuntime = await runtimePromise;
  mutationRuntime.advance(20_000);
  mutationRuntime.advance(21_000);
  const candidate = frame(1, 200);
  mutate(candidate);
  localNowMs = 21_050;
  mutationPort.respond(
    success(mutationPort.requests[1], candidate, 3_700),
  );
  assert.throws(
    () => mutationRuntime.advance(21_100),
    /atomic|generation|checksum|same Hill/i,
    `${label} must fail loud at the next runtime boundary`,
  );
  assert.equal(
    mutationRuntime.frame.sourceElapsedMs,
    0,
    `${label} cannot replace the last trustworthy frame`,
  );
  mutationRuntime.terminate();
}

async function assertRejectedGenerationRegression(): Promise<void> {
  let localNowMs = 30_000;
  const regressionPort = new FakeWorkerPort();
  const runtimePromise =
    createLermHordePrimaryViewerWorkerRuntime(
      regressionPort,
      () => localNowMs,
    );
  regressionPort.respond(
    success(regressionPort.requests[0], frame(0, 0), 3_700),
  );
  const regressionRuntime = await runtimePromise;
  regressionRuntime.advance(30_000);
  regressionRuntime.advance(31_000);
  localNowMs = 31_050;
  regressionPort.respond(
    success(regressionPort.requests[1], frame(1, 200), 3_700),
  );
  assert.equal(regressionRuntime.frame.generation, 1);
  regressionRuntime.advance(32_000);
  const regressed = frame(0, 400);
  localNowMs = 32_050;
  regressionPort.respond(
    success(regressionPort.requests[2], regressed, 3_700),
  );
  assert.throws(
    () => regressionRuntime.advance(32_100),
    /atomic|generation|regress/i,
    'a newly published worker response cannot regress generation',
  );
  assert.equal(
    regressionRuntime.frame.generation,
    1,
    'generation regression cannot replace the last trustworthy frame',
  );
  regressionRuntime.terminate();
}

function success(
  request: LermHordePrimaryViewerWorkerRequest,
  atomicFrame: LermHordePrimaryViewerAtomicFrame,
  completionElapsedMs: number,
): LermHordePrimaryViewerWorkerResponse {
  return {
    schema: LERM_HORDE_PRIMARY_VIEWER_WORKER_RESPONSE_SCHEMA,
    route: workerRoute(),
    requestId: request.requestId,
    command: request.command,
    ok: true,
    workerDurationMs: 12,
    completionElapsedMs,
    frame: atomicFrame,
  };
}

function workerRoute() {
  return {
    requested: LERM_HORDE_PRIMARY_VIEWER_WORKER_ROUTE,
    effective: LERM_HORDE_PRIMARY_VIEWER_WORKER_ROUTE,
    fallbackStatus: 'none' as const,
  };
}

function frame(
  generation: number,
  elapsedMs: number,
): LermHordePrimaryViewerAtomicFrame {
  const frameId = `worker-hill-${elapsedMs}`;
  const sampleChecksum = `sample-${elapsedMs}`;
  const topologyChecksum = `topology-${elapsedMs}`;
  return {
    schema: LERM_HORDE_PRIMARY_VIEWER_ATOMIC_FRAME_SCHEMA,
    generation,
    sourceElapsedMs: elapsedMs,
    hostPublishedAtMs: null,
    completeness: 'atomic-terrain-actor',
    terrainBuffer: {
      source: { frameId },
      sampleChecksum,
      topologyChecksum,
      witness: {
        producerTrafficFieldChecksum: `traffic-${elapsedMs}`,
        supportFrame: {
          supportFrameChecksum: `support-${elapsedMs}`,
        },
      },
    } as LermHordePrimaryViewerAtomicFrame['terrainBuffer'],
    terrain: {
      frameId,
      sampleChecksum,
      topologyChecksum,
    },
    actor: {
      schema: LERM_HORDE_PRIMARY_VIEWER_ACTOR_FRAME_SCHEMA,
      route: {
        requested: LERM_HORDE_PRIMARY_VIEWER_ACTOR_FRAME_ROUTE,
        effective: LERM_HORDE_PRIMARY_VIEWER_ACTOR_FRAME_ROUTE,
        fallbackStatus: 'none',
        staleStatus: 'fresh',
      },
      lifecycle: {
        phase: elapsedMs >= 3_700 ? 'departed' : 'traversing',
        visible: elapsedMs < 3_700,
        elapsedMs,
        tickCount: generation,
      },
      pose: elapsedMs < 3_700 ? ({} as never) : null,
      terrain: {
        frameId,
        sampleChecksum,
        topologyChecksum,
        trafficChecksum: `traffic-${elapsedMs}`,
        supportFrameChecksum: `support-${elapsedMs}`,
      },
    } as LermHordePrimaryViewerActorFrame,
  };
}

console.log('Lerm Horde primary-viewer live worker contracts passed');
