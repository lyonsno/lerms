import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import * as actorApi from '../src/lerm-horde-primary-viewer-actor-frame.js';
import * as decisionApi from '../src/lerm-horde-history-conditioned-decision.js';
import type {
  LermHordeProducerHistoryCompositionReceipt,
} from '../src/lerm-horde-producer-history-composition.js';
import {
  createLermHordeLiveRuntime,
  type LermHordeLiveRailSample,
} from '../src/lerm-horde-live-runtime-composition.js';

interface FutureDecisionReceipt {
  query: {
    schema: string;
    route: {
      effective: string;
      fallbackStatus: string;
      staleStatus: string;
    };
    generation: {
      sealed: boolean;
      complete: boolean;
      highestAdmittedEventSequence: number;
    };
    timing: {
      compactPayloadBytes: number;
      mapLatencyMs: number;
      queueLatencyMs: number;
      generationAgeMs: number;
      mainThreadWaitMs: number;
    };
  };
  selected: {
    decisionMargin: number;
    nondeterminismEnvelope: number;
    decisionStable: boolean;
  };
}

const producerReceipt = JSON.parse(
  readFileSync(
    resolve('artifacts/lerm-horde-producer-history/receipt.json'),
    'utf8',
  ),
) as LermHordeProducerHistoryCompositionReceipt;
const runtime = createLermHordeLiveRuntime({
  producerReceipt,
  railSampler: createReceiptRailSampler(producerReceipt),
  hillRevision: 'f6458e5bd74d9305c4149e6a2ee3844bf4613150',
});
const before = runtime.state.terrain;
const decision = decisionApi.chooseLermHordeHistoryConditionedContinuation(
  before,
  0,
  {
    highestAdmittedEventSequence: -1,
  },
) as unknown as FutureDecisionReceipt;

assert.equal(
  decision.query.schema,
  'lerms.horde-gpu-route-choice-query.v0',
  'the policy must expose the compact query receipt it actually consumed',
);
assert.equal(decision.query.route.fallbackStatus, 'none');
assert.equal(decision.query.route.staleStatus, 'fresh');
assert.equal(decision.query.generation.sealed, true);
assert.equal(decision.query.generation.complete, true);
assert.equal(
  decision.query.generation.highestAdmittedEventSequence,
  -1,
  'the initial sealed Hill has admitted no Episode A event yet',
);
assert.ok(decision.query.timing.compactPayloadBytes > 0);
assert.equal(decision.query.timing.mapLatencyMs, 0);
assert.equal(decision.query.timing.queueLatencyMs, 0);
assert.equal(decision.query.timing.generationAgeMs, 0);
assert.equal(decision.query.timing.mainThreadWaitMs, 0);
assert.equal(decision.selected.decisionMargin, 0);
assert.equal(decision.selected.nondeterminismEnvelope, 0);
assert.equal(
  decision.selected.decisionStable,
  true,
  'an exact CPU-oracle tie remains deterministic through stable candidate order',
);

runtime.advanceTo(producerReceipt.historySummary.lastTimestampMs + 900);
const after = runtime.state.terrain;
const nextDecision =
  decisionApi.chooseLermHordeHistoryConditionedContinuation(
    after,
    1,
    {
      highestAdmittedEventSequence:
        producerReceipt.history.samples.length - 1,
    },
  ) as unknown as FutureDecisionReceipt;
assert.ok(nextDecision.selected.decisionMargin > 0);
assert.equal(nextDecision.selected.decisionStable, true);
assert.equal(
  nextDecision.query.generation.highestAdmittedEventSequence,
  producerReceipt.history.samples.length - 1,
);

type FutureDecisionApi = {
  evaluateLermHordeGpuRouteChoiceQuery(
    query: unknown,
    expectedHighestAdmittedEventSequence: number,
  ): {
    decisionStable: boolean;
  };
  createLermHordeCpuRouteChoiceQuery(
    terrain: unknown,
    episodeIndex: 0 | 1,
    options: {
      nondeterminismEnvelope?: number;
      highestAdmittedEventSequence: number;
    },
  ): unknown;
};
const futureDecisionApi =
  decisionApi as unknown as FutureDecisionApi;
const ambiguous = futureDecisionApi.createLermHordeCpuRouteChoiceQuery(
  after,
  1,
  {
    nondeterminismEnvelope:
      nextDecision.selected.decisionMargin + 0.001,
    highestAdmittedEventSequence:
      producerReceipt.history.samples.length - 1,
  },
);
assert.equal(
  futureDecisionApi.evaluateLermHordeGpuRouteChoiceQuery(
    ambiguous,
    producerReceipt.history.samples.length - 1,
  )
    .decisionStable,
  false,
  'a candidate margin inside the measured envelope cannot close causality',
);
assert.throws(
  () =>
    futureDecisionApi.evaluateLermHordeGpuRouteChoiceQuery({
      ...(ambiguous as Record<string, unknown>),
      route: {
        requested: 'gpu-query',
        effective: 'cpu-fallback',
        fallbackStatus: 'fallback',
        staleStatus: 'fresh',
      },
    }, producerReceipt.history.samples.length - 1),
  /fallback|effective route/i,
);
assert.throws(
  () =>
    futureDecisionApi.evaluateLermHordeGpuRouteChoiceQuery({
      ...(ambiguous as Record<string, unknown>),
      generation: {
        ...(
          ambiguous as {
            generation: Record<string, unknown>;
          }
        ).generation,
        complete: false,
      },
    }, producerReceipt.history.samples.length - 1),
  /complete/i,
);

const exactTieQuery =
  futureDecisionApi.createLermHordeCpuRouteChoiceQuery(
    before,
    0,
    {
      highestAdmittedEventSequence: -1,
    },
  ) as Record<string, unknown>;
const candidateDrift = structuredClone(exactTieQuery) as {
  candidates: Record<string, unknown>[];
};
candidateDrift.candidates[0].stableOrder = 1;
candidateDrift.candidates[0].lateralOffset = 2.5;
candidateDrift.candidates[1].stableOrder = 0;
candidateDrift.candidates[1].lateralOffset = 0;
assert.throws(
  () =>
    futureDecisionApi.evaluateLermHordeGpuRouteChoiceQuery(
      candidateDrift,
      -1,
    ),
  /candidate|policy|field/i,
  'producer fields cannot redefine the canonical exact-tie order',
);

for (const [label, mutate] of [
  [
    'negative exposure',
    (candidate: Record<string, unknown>) => {
      candidate.localExposure = -1;
    },
  ],
  [
    'off-policy world position',
    (candidate: Record<string, unknown>) => {
      candidate.requestedWorldPosition = [999, 0, 999];
    },
  ],
  [
    'unlawful traversal',
    (candidate: Record<string, unknown>) => {
      candidate.shock = 'shock_reset';
      candidate.directionalPermeability = 0;
    },
  ],
] as const) {
  const malformed = structuredClone(exactTieQuery) as {
    candidates: Record<string, unknown>[];
  };
  mutate(malformed.candidates[1]);
  assert.throws(
    () =>
      futureDecisionApi.evaluateLermHordeGpuRouteChoiceQuery(
        malformed,
        -1,
      ),
    /candidate|exposure|position|lawful|traversal/i,
    `${label} must fail before route selection`,
  );
}

assert.equal(
  'affordance' in (
    exactTieQuery as {
      candidates: Record<string, unknown>[];
    }
  ).candidates[0],
  false,
  'the GPU-facing candidate ABI cannot embed the CPU traversal-affordance object',
);

for (const [label, malformed] of [
  [
    'empty query timing',
    {
      ...exactTieQuery,
      timing: {},
    },
  ],
  [
    'blank and mislabeled query route',
    {
      ...exactTieQuery,
      route: {
        requested: '',
        effective: '',
        backend: 'not-a-backend',
        fallbackStatus: 'none',
        staleStatus: 'fresh',
      },
    },
  ],
  [
    'forged query hill identity',
    {
      ...exactTieQuery,
      hill: {
        ...(
          exactTieQuery.hill as Record<string, unknown>
        ),
        frameId: 'forged-hill-frame',
      },
    },
  ],
  [
    'forged query generation identity',
    {
      ...exactTieQuery,
      generation: {
        ...(
          exactTieQuery.generation as Record<string, unknown>
        ),
        frameId: 'forged-generation-frame',
      },
    },
  ],
  [
    'episode A admission mismatch',
    {
      ...exactTieQuery,
      generation: {
        ...(
          exactTieQuery.generation as Record<string, unknown>
        ),
        highestAdmittedEventSequence: 14,
      },
    },
  ],
] as const) {
  assert.throws(
    () =>
      futureDecisionApi.evaluateLermHordeGpuRouteChoiceQuery(
        malformed,
        -1,
      ),
    /route|timing|frame|identity|admitted|sequence/i,
    label,
  );
}

type FutureActorApi = {
  createLermHordePrimaryViewerActorFrame(
    state: unknown,
    supportBinding?: unknown,
  ): {
    pose: {
      rootFrame: {
        origin: {
          x: number;
          y: number;
          z: number;
        };
      };
      support: {
        rootLift: number;
        sampledHeight: number;
        presentationBinding: {
          route: {
            effective: string;
            fallbackStatus: string;
            staleStatus: string;
          };
          previousGeneration: number;
          currentGeneration: number;
          currentFrameId: string;
          presentationAlpha: number;
        } | null;
      };
      squirm: {
        terrainSupportProfile: readonly {
          t: number;
          localOffset: number;
        }[];
      };
    } | null;
  };
  createLermHordeSupportProfileRequest(rootFrame: unknown): unknown;
  createLermHordeCpuPresentationSupportBinding(
    previousTerrain: unknown,
    currentTerrain: unknown,
    request: unknown,
    presentationAlpha: number,
  ): {
    route: {
      requested: string;
      effective: string;
      backend: string;
      fallbackStatus: string;
      staleStatus: string;
    };
    request: {
      rootWorld: {
        x: number;
        z: number;
      };
      stations: readonly {
        t: number;
        worldX: number;
        worldZ: number;
      }[];
    };
    presentationAlpha: number;
    previous: {
      generation: number;
      identity: {
        route: string;
        frameId: string;
        topologyChecksum: string;
        supportFrameChecksum: string;
        producerTrafficFieldChecksum: string;
        addressingKey: string;
      };
      stations: readonly { t: number; height: number }[];
    };
    current: {
      generation: number;
      identity: {
        route: string;
        frameId: string;
        topologyChecksum: string;
        supportFrameChecksum: string;
        producerTrafficFieldChecksum: string;
        addressingKey: string;
      };
      stations: readonly { t: number; height: number }[];
    };
    timing: {
      compactPayloadBytes: number;
      synchronousAtPresentationFrequency: boolean;
    };
  };
  resolveLermHordePresentationSupportBinding(
    binding: unknown,
    rootFrame: unknown,
  ): {
    rootHeight: number;
    terrainSupportProfile: readonly {
      t: number;
      localOffset: number;
    }[];
  };
};
const futureActorApi = actorApi as unknown as FutureActorApi;
const presentationRuntime = createLermHordeLiveRuntime({
  producerReceipt,
  railSampler: createReceiptRailSampler(producerReceipt),
  hillRevision: 'f6458e5bd74d9305c4149e6a2ee3844bf4613150',
});
const presentationBefore = presentationRuntime.state.terrain;
presentationRuntime.advanceTo(
  producerReceipt.historySummary.lastTimestampMs / 2,
);
const presentationState = presentationRuntime.state;
const presentationAfter = presentationState.terrain;
const legacyFrame = actorApi.createLermHordePrimaryViewerActorFrame(
  presentationState,
);
assert.ok(legacyFrame.pose);
const legacyPose = legacyFrame.pose;
assert.equal(
  legacyPose.support.presentationBinding,
  null,
  'the legacy full-terrain oracle path cannot impersonate a compact binding',
);
const request = futureActorApi.createLermHordeSupportProfileRequest(
  legacyPose.rootFrame,
);
const binding =
  futureActorApi.createLermHordeCpuPresentationSupportBinding(
    presentationBefore,
    presentationAfter,
    request,
    0.25,
  );
assert.equal(binding.route.fallbackStatus, 'none');
assert.equal(binding.route.staleStatus, 'fresh');
assert.equal(binding.presentationAlpha, 0.25);
assert.equal(binding.previous.stations.length, 7);
assert.equal(binding.current.stations.length, 7);
assert.notEqual(binding.previous.generation, binding.current.generation);
assert.ok(binding.timing.compactPayloadBytes > 0);
assert.equal(
  binding.timing.synchronousAtPresentationFrequency,
  false,
);
assert.equal(
  JSON.stringify(binding).includes('"samples"'),
  false,
  'a compact binding cannot smuggle the full terrain sample array',
);

const resolved =
  futureActorApi.resolveLermHordePresentationSupportBinding(
    binding,
    legacyPose.rootFrame,
  );
assert.equal(resolved.terrainSupportProfile.length, 7);
const presentationRootFrame = {
  ...legacyPose.rootFrame,
  origin: {
    ...legacyPose.rootFrame.origin,
    y: resolved.rootHeight + legacyPose.support.rootLift,
  },
};
const presentationResolved =
  futureActorApi.resolveLermHordePresentationSupportBinding(
    binding,
    presentationRootFrame,
  );
const boundFrame =
  futureActorApi.createLermHordePrimaryViewerActorFrame(
    presentationState,
    binding,
  );
assert.deepEqual(
  boundFrame.pose?.squirm.terrainSupportProfile,
  presentationResolved.terrainSupportProfile,
  'the actor frame must consume the same interpolated compact support profile',
);
assert.equal(
  boundFrame.pose?.rootFrame.origin.y,
  presentationRootFrame.origin.y,
  'interpolated root support must move the rendered actor root',
);
assert.equal(
  boundFrame.pose?.support.sampledHeight,
  resolved.rootHeight,
  'the actor frame must consume the matching interpolated root support sample',
);
assert.equal(
  boundFrame.pose?.support.presentationBinding?.route.effective,
  binding.route.effective,
);
assert.equal(
  boundFrame.pose?.support.presentationBinding?.previousGeneration,
  binding.previous.generation,
);
assert.equal(
  boundFrame.pose?.support.presentationBinding?.currentGeneration,
  binding.current.generation,
);
assert.equal(
  boundFrame.pose?.support.presentationBinding?.presentationAlpha,
  binding.presentationAlpha,
);
for (let index = 0; index < 7; index += 1) {
  const expectedHeight =
    binding.previous.stations[index].height * 0.75 +
    binding.current.stations[index].height * 0.25;
  assert.ok(
    Number.isFinite(
      resolved.terrainSupportProfile[index].localOffset,
    ),
  );
  assert.ok(
    Math.abs(
      resolved.terrainSupportProfile[index].t -
        binding.current.stations[index].t
    ) < 1e-9,
  );
  assert.ok(Number.isFinite(expectedHeight));
}

assert.throws(
  () =>
    futureActorApi.resolveLermHordePresentationSupportBinding(
      {
        ...binding,
        current: {
          ...binding.current,
          stations: binding.current.stations.slice(0, 6),
        },
      },
      legacyPose.rootFrame,
    ),
  /seven|7|station/i,
);
assert.throws(
  () =>
    futureActorApi.resolveLermHordePresentationSupportBinding(
      {
        ...binding,
        timing: {
          ...binding.timing,
          synchronousAtPresentationFrequency: true,
        },
      },
      legacyPose.rootFrame,
    ),
  /synchronous|presentation/i,
);
assert.throws(
  () =>
    futureActorApi.resolveLermHordePresentationSupportBinding(
      {
        ...binding,
        route: {
          ...binding.route,
          effective: 'cpu-fallback',
          fallbackStatus: 'fallback',
        },
      },
      legacyPose.rootFrame,
    ),
  /fallback|effective route/i,
);
assert.throws(
  () =>
    futureActorApi.resolveLermHordePresentationSupportBinding(
      {
        ...binding,
        route: {
          ...binding.route,
          staleStatus: 'stale',
        },
      },
      legacyPose.rootFrame,
    ),
  /fresh|stale/i,
);
assert.throws(
  () =>
    futureActorApi.resolveLermHordePresentationSupportBinding(
      {
        ...binding,
        current: {
          ...binding.current,
          identity: {
            ...binding.current.identity,
            addressingKey: 'incompatible-addressing',
          },
        },
      },
      legacyPose.rootFrame,
    ),
  /incompatible.*addressing/i,
);
assert.throws(
  () =>
    futureActorApi.resolveLermHordePresentationSupportBinding(
      {
        ...binding,
        current: {
          ...binding.current,
          identity: {
            ...binding.current.identity,
            frameId: '',
          },
        },
      },
      legacyPose.rootFrame,
    ),
  /nonblank identity/i,
);

const foreignPreviousRoute = structuredClone(binding);
foreignPreviousRoute.previous.identity.route =
  'foreign-hill-route';
assert.throws(
  () =>
    futureActorApi.createLermHordePrimaryViewerActorFrame(
      presentationState,
      foreignPreviousRoute,
    ),
  /route|identity|generation/i,
);

const forgedCurrentSupport = structuredClone(binding);
forgedCurrentSupport.current.identity.supportFrameChecksum =
  'forged-support-frame';
assert.throws(
  () =>
    futureActorApi.createLermHordePrimaryViewerActorFrame(
      presentationState,
      forgedCurrentSupport,
    ),
  /support|identity|rendered Hill/i,
);

const detachedStations = structuredClone(binding);
detachedStations.request.stations[0].worldX += 1000;
detachedStations.request.stations[0].worldZ -= 1000;
assert.throws(
  () =>
    futureActorApi.createLermHordePrimaryViewerActorFrame(
      presentationState,
      detachedStations,
    ),
  /station|actor|axis|request/i,
);

assert.throws(
  () =>
    futureActorApi.resolveLermHordePresentationSupportBinding(
      {
        ...binding,
        timing: {},
      },
      legacyPose.rootFrame,
    ),
  /timing|synchronous/i,
);
assert.throws(
  () =>
    futureActorApi.resolveLermHordePresentationSupportBinding(
      {
        ...binding,
        route: {
          requested: '',
          effective: '',
          backend: 'not-a-backend',
          fallbackStatus: 'none',
          staleStatus: 'fresh',
        },
      },
      legacyPose.rootFrame,
    ),
  /route|backend/i,
);

console.log('lerm horde GPU consumer binding contracts ok');

function createReceiptRailSampler(
  source: LermHordeProducerHistoryCompositionReceipt,
): (sourceDistance: number) => LermHordeLiveRailSample {
  const samples = source.history.samples;
  return (sourceDistance) => {
    const upperIndex = samples.findIndex(
      ({ root }) => root.sourceDistance >= sourceDistance,
    );
    const toIndex = upperIndex < 0 ? samples.length - 1 : upperIndex;
    const fromIndex = Math.max(0, toIndex - 1);
    const from = samples[fromIndex].root;
    const to = samples[toIndex].root;
    const span = Math.max(
      Number.EPSILON,
      to.sourceDistance - from.sourceDistance,
    );
    const mix = Math.max(
      0,
      Math.min(1, (sourceDistance - from.sourceDistance) / span),
    );
    return {
      schema: 'kaminos.creature-scale-locomotion-rail-sample.v0',
      railId: source.producer.railId,
      sourceDistance,
      progress:
        from.routeProgress +
        (to.routeProgress - from.routeProgress) * mix,
      position: from.worldPosition.map(
        (value, index) =>
          value + (to.worldPosition[index] - value) * mix,
      ) as [number, number, number],
      tangent: [...from.tangent],
      locomotionFrame: {
        forward: [...from.locomotionFrame.forward],
        right: [...from.locomotionFrame.right],
        up: [...from.locomotionFrame.up],
      },
      attention: {
        direction: [...from.attention.direction],
        authority: from.attention.authority,
      },
      support: {
        schema: from.support.schema,
        plannerDisposition: from.support.disposition,
        rootLift: from.support.rootLift,
        compliance: {
          minimumNormalizedMargin:
            from.support.minimumComplianceMargin,
        },
      },
    };
  };
}
