import type {
  HillOfHillsTerrain,
} from './terrain/hill-of-hills.js';
import {
  sampleHillOfHillsTraversalAffordance,
  type HillOfHillsTraversalAffordance,
} from './terrain/hill-of-hills-traversal-affordance.js';

export const LERM_HORDE_HISTORY_DECISION_SCHEMA =
  'lerms.horde-history-conditioned-decision.v0' as const;
export const LERM_HORDE_HISTORY_DECISION_POLICY =
  'lerms/lerm-horde/seek-less-traversed-continuation-v0' as const;
export const LERM_HORDE_HISTORY_CANDIDATE_SET_CHECKSUM =
  'left-longitudinal@-1.25,-0.8>0,1|right-longitudinal@1.25,-0.8>0,1' as const;

export type LermHordeHistoryCandidateId =
  | 'left-longitudinal'
  | 'right-longitudinal';

export interface LermHordeHistoryCandidate {
  id: LermHordeHistoryCandidateId;
  stableOrder: 0 | 1;
  lateralOffset: 0 | 2.5;
  affordance: HillOfHillsTraversalAffordance;
  lawful: boolean;
}

export interface LermHordeHistoryConditionedDecision {
  schema: typeof LERM_HORDE_HISTORY_DECISION_SCHEMA;
  episodeIndex: 0 | 1;
  policy: {
    route: typeof LERM_HORDE_HISTORY_DECISION_POLICY;
    revision: 'seek-less-traversed-continuation-v0';
    motive: 'seek-less-traversed-continuation';
    unchangedAcrossEpisodes: true;
    candidateSetChecksum:
      typeof LERM_HORDE_HISTORY_CANDIDATE_SET_CHECKSUM;
  };
  hill: {
    route: string;
    frameId: string;
    sampleChecksum: string;
    topologyChecksum: string;
    supportFrameChecksum: string;
    producerTrafficFieldChecksum: string;
  };
  candidates: readonly [
    LermHordeHistoryCandidate,
    LermHordeHistoryCandidate,
  ];
  selected: {
    id: LermHordeHistoryCandidateId;
    stableOrder: 0 | 1;
    lateralOffset: 0 | 2.5;
    reason: 'minimum-local-retained-traffic';
    selectedExposure: number;
  };
}

export function chooseLermHordeHistoryConditionedContinuation(
  terrain: HillOfHillsTerrain,
  episodeIndex: number,
): LermHordeHistoryConditionedDecision {
  if (episodeIndex !== 0 && episodeIndex !== 1) {
    throw new Error(
      'history-conditioned episode index must be 0 or 1',
    );
  }
  const candidateSpecs = [
    {
      id: 'left-longitudinal',
      stableOrder: 0,
      lateralOffset: 0,
      worldPosition: [-1.25, 0, -0.8],
    },
    {
      id: 'right-longitudinal',
      stableOrder: 1,
      lateralOffset: 2.5,
      worldPosition: [1.25, 0, -0.8],
    },
  ] as const;
  const candidates = candidateSpecs.map((candidate) => {
    const affordance = sampleHillOfHillsTraversalAffordance(
      terrain,
      candidate.worldPosition,
      [0, 0, 1],
    );
    return {
      id: candidate.id,
      stableOrder: candidate.stableOrder,
      lateralOffset: candidate.lateralOffset,
      affordance,
      lawful:
        affordance.support.shock !== 'shock_reset' &&
        affordance.traversal.directionalPermeability > 0,
    };
  }) as [
    LermHordeHistoryCandidate,
    LermHordeHistoryCandidate,
  ];
  const selected = [...candidates]
    .filter(({ lawful }) => lawful)
    .sort(
      (left, right) =>
        left.affordance.memory.localExposure -
          right.affordance.memory.localExposure ||
        left.stableOrder - right.stableOrder,
    )[0];
  if (!selected) {
    throw new Error(
      'history-conditioned policy found no lawful continuation',
    );
  }
  const source = candidates[0].affordance.source;
  if (
    candidates.some(({ affordance }) =>
      affordance.source.route !== source.route ||
      affordance.source.frameId !== source.frameId ||
      affordance.source.sampleChecksum !== source.sampleChecksum ||
      affordance.source.topologyChecksum !== source.topologyChecksum ||
      affordance.source.supportFrameChecksum !==
        source.supportFrameChecksum ||
      affordance.source.producerTrafficFieldChecksum !==
        source.producerTrafficFieldChecksum
    )
  ) {
    throw new Error(
      'history-conditioned candidates crossed current Hill identity',
    );
  }
  return {
    schema: LERM_HORDE_HISTORY_DECISION_SCHEMA,
    episodeIndex,
    policy: {
      route: LERM_HORDE_HISTORY_DECISION_POLICY,
      revision: 'seek-less-traversed-continuation-v0',
      motive: 'seek-less-traversed-continuation',
      unchangedAcrossEpisodes: true,
      candidateSetChecksum:
        LERM_HORDE_HISTORY_CANDIDATE_SET_CHECKSUM,
    },
    hill: {
      route: source.route,
      frameId: source.frameId,
      sampleChecksum: source.sampleChecksum,
      topologyChecksum: source.topologyChecksum,
      supportFrameChecksum: source.supportFrameChecksum,
      producerTrafficFieldChecksum:
        source.producerTrafficFieldChecksum,
    },
    candidates,
    selected: {
      id: selected.id,
      stableOrder: selected.stableOrder,
      lateralOffset: selected.lateralOffset,
      reason: 'minimum-local-retained-traffic',
      selectedExposure:
        selected.affordance.memory.localExposure,
    },
  };
}
