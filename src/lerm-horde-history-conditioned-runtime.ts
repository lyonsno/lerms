import type {
  LermHordeProducerHistoryCompositionReceipt,
} from './lerm-horde-producer-history-composition.js';
import {
  createLermHordeLiveRuntime,
  LermHordeLiveRailSample,
  type LermHordeLiveRuntime,
  LermHordeLiveRuntimeState,
} from './lerm-horde-live-runtime-composition.js';
import {
  chooseLermHordeHistoryConditionedContinuation,
  type LermHordeHistoryConditionedDecision,
} from './lerm-horde-history-conditioned-decision.js';
import {
  createHillOfHillsLayerTileCache,
  sampleHillOfHillsTerrain,
  type HillOfHillsTerrain,
} from './terrain/hill-of-hills.js';

export const LERM_HORDE_HISTORY_RUNTIME_SCHEMA =
  'lerms.horde-history-conditioned-runtime.v0' as const;
export const LERM_HORDE_HISTORY_RUNTIME_ROUTE =
  'lerms/lerm-horde/history-conditioned-two-episode-runtime-v0' as const;
export const LERM_HORDE_EPISODE_SETTLE_MS = 500 as const;
export const LERM_HORDE_EPISODE_RESEED_MS = 350 as const;
export const LERM_HORDE_EPISODE_FINAL_DEPARTURE_MS = 400 as const;

export interface LermHordeHistoryConditionedRuntimeState
  extends LermHordeLiveRuntimeState {
  episodeController: LermHordeHistoryEpisodeControllerState;
}

export interface LermHordeHistoryEpisodeControllerState {
  schema: typeof LERM_HORDE_HISTORY_RUNTIME_SCHEMA;
  route: typeof LERM_HORDE_HISTORY_RUNTIME_ROUTE;
  stage: 'traversing' | 'settling' | 'reseeding' | 'complete';
  activeEpisodeIndex: 0 | 1 | null;
  activeActorInstanceId:
    | 'lerm-episode-a'
    | 'lerm-episode-b'
    | null;
  actorPrivateStateSource: 'fresh' | null;
  previousActorPrivateStateCarried: false;
  decisions: readonly LermHordeHistoryConditionedDecision[];
}

export interface LermHordeHistoryConditionedRuntimeReceipt {
  ok: true;
  schema: typeof LERM_HORDE_HISTORY_RUNTIME_SCHEMA;
  phase: 'complete';
  route: {
    requested: typeof LERM_HORDE_HISTORY_RUNTIME_ROUTE;
    effective: typeof LERM_HORDE_HISTORY_RUNTIME_ROUTE;
    hill: string;
    policy: string;
    fallbackStatus: 'none';
    staleStatus: 'fresh';
    failurePhase: null;
  };
  clock: {
    mode: 'incremental-two-episode-live-time';
    elapsedMs: number;
    traversalDurationMs: number;
    settleDurationMs: typeof LERM_HORDE_EPISODE_SETTLE_MS;
    reseedDurationMs: typeof LERM_HORDE_EPISODE_RESEED_MS;
    precomputedFrameCount: 0;
    replayConstructorCalls: 0;
  };
  episodes: readonly [
    {
      episodeIndex: 0;
      actorInstanceId: 'lerm-episode-a';
      privateStateSource: 'fresh';
      decision: LermHordeHistoryConditionedDecision;
    },
    {
      episodeIndex: 1;
      actorInstanceId: 'lerm-episode-b';
      privateStateSource: 'fresh';
      decision: LermHordeHistoryConditionedDecision;
    },
  ];
  hill: {
    firstDecisionTrafficChecksum: string;
    secondDecisionTrafficChecksum: string;
    finalTrafficChecksum: string;
    finalTopologyChecksum: string;
  };
  assertions: {
    samePolicy: true;
    sameCandidates: true;
    freshSecondActor: true;
    retainedHillChangedDecision: true;
    bothTraversalsLive: true;
    bothSettlesVisible: true;
    noReplay: true;
    noFallback: true;
  };
}

export interface LermHordeHistoryConditionedRuntime {
  readonly state: LermHordeHistoryConditionedRuntimeState;
  readonly completionElapsedMs: number;
  advanceTo(
    elapsedMs: number,
  ): LermHordeHistoryConditionedRuntimeState;
  createReceipt(): LermHordeHistoryConditionedRuntimeReceipt;
}

export interface CreateLermHordeHistoryConditionedRuntimeOptions {
  producerReceipt: LermHordeProducerHistoryCompositionReceipt;
  railSampler(sourceDistance: number): LermHordeLiveRailSample;
  hillRevision: string;
}

export function createLermHordeHistoryConditionedRuntime(
  options: CreateLermHordeHistoryConditionedRuntimeOptions,
): LermHordeHistoryConditionedRuntime {
  validateOptions(options);
  const traversalMs =
    options.producerReceipt.historySummary.lastTimestampMs;
  const episodeASettleEndMs =
    traversalMs + LERM_HORDE_EPISODE_SETTLE_MS;
  const episodeBStartMs =
    episodeASettleEndMs + LERM_HORDE_EPISODE_RESEED_MS;
  const episodeBEndMs = episodeBStartMs + traversalMs;
  const finalSettleEndMs =
    episodeBEndMs + LERM_HORDE_EPISODE_SETTLE_MS;
  const completionElapsedMs =
    finalSettleEndMs + LERM_HORDE_EPISODE_FINAL_DEPARTURE_MS;
  const cache = createHillOfHillsLayerTileCache();
  const bootstrap = createLermHordeLiveRuntime({
    ...baseOptions(options),
    terrainCache: cache,
    episodeIdPrefix: 'lerm-episode-a',
  });
  const decisionA =
    chooseLermHordeHistoryConditionedContinuation(
      bootstrap.state.terrain,
      0,
    );
  const first = decisionA.selected.lateralOffset === 0
    ? bootstrap
    : createLermHordeLiveRuntime({
        ...baseOptions(options),
        railSampler: translatedRailSampler(
          options.railSampler,
          decisionA.selected.lateralOffset,
          bootstrap.state.terrain,
        ),
        terrainCache: cache,
        initialTerrain: bootstrap.state.terrain,
        episodeIdPrefix: 'lerm-episode-a',
      });

  let second: LermHordeLiveRuntime | undefined;
  let decisionB: LermHordeHistoryConditionedDecision | undefined;
  let currentElapsedMs = 0;
  let publicationTickCount = 0;
  let currentState = mapState(
    first.state,
    0,
    'traversing',
    0,
    [decisionA],
    0,
    [],
  );
  let firstTerminalState: LermHordeLiveRuntimeState | undefined;
  const observedPositiveSettles = new Set<0 | 1>();
  const traversedEpisodes = new Set<0 | 1>();

  const ensureFirstTerminal = (
    reseedElapsedMs: number,
  ): LermHordeLiveRuntimeState => {
    const relative = Math.max(
      traversalMs,
      Math.min(
        traversalMs + LERM_HORDE_EPISODE_RESEED_MS,
        traversalMs + reseedElapsedMs,
      ),
    );
    firstTerminalState = first.advanceTo(relative);
    return firstTerminalState;
  };

  const ensureSecond = (): LermHordeLiveRuntime => {
    if (second) return second;
    const retained = ensureFirstTerminal(
      LERM_HORDE_EPISODE_RESEED_MS,
    );
    decisionB =
      chooseLermHordeHistoryConditionedContinuation(
        retained.terrain,
        1,
      );
    second = createLermHordeLiveRuntime({
      ...baseOptions(options),
      railSampler: translatedRailSampler(
        options.railSampler,
        decisionB.selected.lateralOffset,
        retained.terrain,
      ),
      terrainCache: cache,
      initialTerrain: retained.terrain,
      sourceTimeOffsetMs: episodeBStartMs,
      episodeIdPrefix: 'lerm-episode-b',
    });
    return second;
  };

  return {
    get state() {
      return currentState;
    },
    completionElapsedMs,
    advanceTo(elapsedMs) {
      if (
        !Number.isFinite(elapsedMs) ||
        elapsedMs < currentElapsedMs ||
        elapsedMs > completionElapsedMs
      ) {
        throw new Error(
          'history-conditioned elapsed time must be monotonic and within completion',
        );
      }
      currentElapsedMs = elapsedMs;
      publicationTickCount += 1;
      if (elapsedMs < traversalMs) {
        const base = first.advanceTo(elapsedMs);
        if (base.body?.progress && base.body.progress > 0) {
          traversedEpisodes.add(0);
        }
        currentState = mapState(
          base,
          elapsedMs,
          'traversing',
          0,
          [decisionA],
          publicationTickCount,
          [],
        );
        return currentState;
      }
      if (elapsedMs <= episodeASettleEndMs) {
        const base = first.advanceTo(traversalMs);
        traversedEpisodes.add(0);
        if (elapsedMs > traversalMs && base.body !== null) {
          observedPositiveSettles.add(0);
        }
        currentState = mapState(
          base,
          elapsedMs,
          'settling',
          0,
          [decisionA],
          publicationTickCount,
          [],
        );
        return currentState;
      }
      if (elapsedMs < episodeBStartMs) {
        const base = ensureFirstTerminal(
          elapsedMs - episodeASettleEndMs,
        );
        currentState = mapState(
          base,
          elapsedMs,
          'reseeding',
          null,
          [decisionA],
          publicationTickCount,
          [],
        );
        return currentState;
      }

      const next = ensureSecond();
      const decisions = [decisionA, decisionB!] as const;
      const firstTerminal = firstTerminalState!;
      const priorEpisodeIds = firstTerminal.admittedEpisodeIds;
      const priorIntervalCount =
        firstTerminal.admittedIntervalCount;
      const relative = elapsedMs - episodeBStartMs;
      if (elapsedMs < episodeBEndMs) {
        const base = next.advanceTo(relative);
        if (base.body?.progress && base.body.progress > 0) {
          traversedEpisodes.add(1);
        }
        currentState = mapState(
          base,
          elapsedMs,
          'traversing',
          1,
          decisions,
          publicationTickCount,
          priorEpisodeIds,
          priorIntervalCount,
        );
        return currentState;
      }
      if (elapsedMs <= finalSettleEndMs) {
        const base = next.advanceTo(traversalMs);
        traversedEpisodes.add(1);
        if (elapsedMs > episodeBEndMs && base.body !== null) {
          observedPositiveSettles.add(1);
        }
        currentState = mapState(
          base,
          elapsedMs,
          'settling',
          1,
          decisions,
          publicationTickCount,
          priorEpisodeIds,
          priorIntervalCount,
        );
        return currentState;
      }
      const base = next.advanceTo(
        traversalMs +
          Math.min(
            LERM_HORDE_EPISODE_FINAL_DEPARTURE_MS,
            elapsedMs - finalSettleEndMs,
          ),
      );
      currentState = mapState(
        base,
        elapsedMs,
        'complete',
        null,
        decisions,
        publicationTickCount,
        priorEpisodeIds,
        priorIntervalCount,
      );
      return currentState;
    },
    createReceipt() {
      if (
        currentState.episodeController.stage !== 'complete' ||
        !decisionB ||
        currentState.body !== null ||
        observedPositiveSettles.size !== 2 ||
        traversedEpisodes.size !== 2
      ) {
        throw new Error(
          'history-conditioned receipt requires two live traversals, two positive visible settle observations, and final departure',
        );
      }
      const samePolicy =
        decisionA.policy.route === decisionB.policy.route &&
        decisionA.policy.revision === decisionB.policy.revision;
      const sameCandidates =
        decisionA.policy.candidateSetChecksum ===
        decisionB.policy.candidateSetChecksum;
      const retainedHillChangedDecision =
        decisionA.selected.id !== decisionB.selected.id &&
        decisionA.hill.producerTrafficFieldChecksum !==
          decisionB.hill.producerTrafficFieldChecksum &&
        exposure(decisionB, decisionA.selected.id) >
          exposure(decisionA, decisionA.selected.id);
      if (
        !samePolicy ||
        !sameCandidates ||
        !retainedHillChangedDecision
      ) {
        throw new Error(
          'history-conditioned receipt lost policy, candidate, or retained-Hill causality',
        );
      }
      return {
        ok: true,
        schema: LERM_HORDE_HISTORY_RUNTIME_SCHEMA,
        phase: 'complete',
        route: {
          requested: LERM_HORDE_HISTORY_RUNTIME_ROUTE,
          effective: LERM_HORDE_HISTORY_RUNTIME_ROUTE,
          hill: currentState.terrain.source.route,
          policy: decisionA.policy.route,
          fallbackStatus: 'none',
          staleStatus: 'fresh',
          failurePhase: null,
        },
        clock: {
          mode: 'incremental-two-episode-live-time',
          elapsedMs: currentState.elapsedMs,
          traversalDurationMs: traversalMs,
          settleDurationMs: LERM_HORDE_EPISODE_SETTLE_MS,
          reseedDurationMs: LERM_HORDE_EPISODE_RESEED_MS,
          precomputedFrameCount: 0,
          replayConstructorCalls: 0,
        },
        episodes: [
          {
            episodeIndex: 0,
            actorInstanceId: 'lerm-episode-a',
            privateStateSource: 'fresh',
            decision: decisionA,
          },
          {
            episodeIndex: 1,
            actorInstanceId: 'lerm-episode-b',
            privateStateSource: 'fresh',
            decision: decisionB,
          },
        ],
        hill: {
          firstDecisionTrafficChecksum:
            decisionA.hill.producerTrafficFieldChecksum,
          secondDecisionTrafficChecksum:
            decisionB.hill.producerTrafficFieldChecksum,
          finalTrafficChecksum:
            currentState.terrain.witness
              .producerTrafficFieldChecksum,
          finalTopologyChecksum:
            currentState.terrain.witness.topologyChecksum,
        },
        assertions: {
          samePolicy: true,
          sameCandidates: true,
          freshSecondActor: true,
          retainedHillChangedDecision: true,
          bothTraversalsLive: true,
          bothSettlesVisible: true,
          noReplay: true,
          noFallback: true,
        },
      };
    },
  };
}

function baseOptions(
  options: CreateLermHordeHistoryConditionedRuntimeOptions,
): CreateLermHordeHistoryConditionedRuntimeOptions {
  return {
    producerReceipt: options.producerReceipt,
    railSampler: options.railSampler,
    hillRevision: options.hillRevision,
  };
}

function translatedRailSampler(
  sampler: (sourceDistance: number) => LermHordeLiveRailSample,
  lateralOffset: number,
  supportHill: HillOfHillsTerrain,
): (sourceDistance: number) => LermHordeLiveRailSample {
  return (sourceDistance) => {
    const sample = sampler(sourceDistance);
    const x = sample.position[0] + lateralOffset;
    const z = sample.position[2];
    const support = sampleHillOfHillsTerrain(supportHill, x, z);
    return {
      ...sample,
      position: [
        x,
        support.height + sample.support.rootLift,
        z,
      ],
    };
  };
}

function mapState(
  base: LermHordeLiveRuntimeState,
  elapsedMs: number,
  stage: LermHordeHistoryEpisodeControllerState['stage'],
  activeEpisodeIndex: 0 | 1 | null,
  decisions: readonly LermHordeHistoryConditionedDecision[],
  publicationTickCount: number,
  priorEpisodeIds: readonly string[],
  priorIntervalCount = 0,
): LermHordeHistoryConditionedRuntimeState {
  const activeActorInstanceId =
    activeEpisodeIndex === 0
      ? 'lerm-episode-a'
      : activeEpisodeIndex === 1
        ? 'lerm-episode-b'
        : null;
  return {
    ...base,
    elapsedMs,
    tickCount: publicationTickCount,
    admittedIntervalCount:
      priorIntervalCount + base.admittedIntervalCount,
    admittedEpisodeIds: [
      ...priorEpisodeIds,
      ...base.admittedEpisodeIds,
    ],
    body: base.body
      ? {
          ...base.body,
          elapsedMs,
        }
      : null,
    episodeController: {
      schema: LERM_HORDE_HISTORY_RUNTIME_SCHEMA,
      route: LERM_HORDE_HISTORY_RUNTIME_ROUTE,
      stage,
      activeEpisodeIndex,
      activeActorInstanceId,
      actorPrivateStateSource:
        activeEpisodeIndex === null ? null : 'fresh',
      previousActorPrivateStateCarried: false,
      decisions,
    },
  };
}

function exposure(
  decision: LermHordeHistoryConditionedDecision,
  candidateId: string,
): number {
  const candidate = decision.candidates.find(
    ({ id }) => id === candidateId,
  );
  if (!candidate) {
    throw new Error(
      `history-conditioned decision omitted ${candidateId}`,
    );
  }
  return candidate.affordance.memory.localExposure;
}

function validateOptions(
  options: CreateLermHordeHistoryConditionedRuntimeOptions,
): void {
  if (
    options?.producerReceipt?.ok !== true ||
    typeof options.railSampler !== 'function' ||
    !/^[0-9a-f]{40}$/.test(options.hillRevision)
  ) {
    throw new Error(
      'history-conditioned runtime requires exact producer receipt, rail sampler, and Hill revision',
    );
  }
}
