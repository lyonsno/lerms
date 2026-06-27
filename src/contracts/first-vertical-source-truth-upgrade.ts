import {
  assertFirstVerticalFrame,
  type FirstVerticalFrame,
  type SimulationAuthority,
  type SourceTruth
} from './first-vertical.ts';

export const FIRST_VERTICAL_SOURCE_TRUTH_UPGRADE_SCHEMA = 'lerms.first-vertical-source-truth-upgrade.v0' as const;

export type FirstVerticalSourceTruthUpgradeBlocker =
  | 'invalid-frame'
  | 'source-authority-not-live'
  | 'non-live-evidence-source'
  | 'stale-frame-source'
  | 'stale-evidence-source'
  | 'missing-terrain-evidence'
  | 'missing-lerm-evidence'
  | 'missing-goin-evidence'
  | 'missing-juice-hit-evidence'
  | 'missing-carrier-drop-evidence'
  | 'missing-hit-to-drop-chain'
  | `intentionally-empty-${string}`;

export interface FirstVerticalSourceTruthUpgradePredicates {
  frameSourceLive: boolean;
  evidenceSourcesLive: boolean;
  frameFresh: boolean;
  evidenceFresh: boolean;
  hasTerrain: boolean;
  hasLerm: boolean;
  hasGoin: boolean;
  hasJuiceHit: boolean;
  hasCarrierDrop: boolean;
  hasHitToDropChain: boolean;
}

export interface FirstVerticalSourceTruthUpgradeEvaluation {
  schema: typeof FIRST_VERTICAL_SOURCE_TRUTH_UPGRADE_SCHEMA;
  accepted: boolean;
  requestedAuthority: SimulationAuthority;
  effectiveAuthority: SimulationAuthority;
  maxSampleAgeMs: number;
  blockers: FirstVerticalSourceTruthUpgradeBlocker[];
  predicates: FirstVerticalSourceTruthUpgradePredicates;
}

export interface EvaluateFirstVerticalSourceTruthUpgradeOptions {
  maxSampleAgeMs?: number;
  intentionallyEmpty?: Record<string, boolean>;
}

const DEFAULT_MAX_SAMPLE_AGE_MS = 500;

export function evaluateFirstVerticalSourceTruthUpgrade(
  frame: FirstVerticalFrame,
  {
    maxSampleAgeMs = DEFAULT_MAX_SAMPLE_AGE_MS,
    intentionallyEmpty = {}
  }: EvaluateFirstVerticalSourceTruthUpgradeOptions = {}
): FirstVerticalSourceTruthUpgradeEvaluation {
  const blockers: FirstVerticalSourceTruthUpgradeBlocker[] = [];

  try {
    assertFirstVerticalFrame(frame);
  } catch {
    blockers.push('invalid-frame');
  }

  const evidenceSources = collectEvidenceSources(frame);
  const frameFresh = frame.source.sampleAgeMs <= maxSampleAgeMs;
  const evidenceFresh = evidenceSources.every((source) => source.sampleAgeMs <= maxSampleAgeMs);
  const frameSourceLive = frame.source.authority === 'live_simulation';
  const evidenceSourcesLive = evidenceSources.every((source) => source.authority === 'live_simulation');
  const predicates: FirstVerticalSourceTruthUpgradePredicates = {
    frameSourceLive,
    evidenceSourcesLive,
    frameFresh,
    evidenceFresh,
    hasTerrain: frame.terrainSamples.length > 0,
    hasLerm: frame.lerms.length > 0,
    hasGoin: frame.goins.length > 0,
    hasJuiceHit: frame.juiceHits.length > 0,
    hasCarrierDrop: frame.carrierDropEvents.length > 0,
    hasHitToDropChain: hasHitToDropChain(frame)
  };

  if (!frameSourceLive) blockers.push('source-authority-not-live');
  if (!evidenceSourcesLive) blockers.push('non-live-evidence-source');
  if (!frameFresh) blockers.push('stale-frame-source');
  if (!evidenceFresh) blockers.push('stale-evidence-source');
  if (!predicates.hasTerrain) blockers.push('missing-terrain-evidence');
  if (!predicates.hasLerm) blockers.push('missing-lerm-evidence');
  if (!predicates.hasGoin) blockers.push('missing-goin-evidence');
  if (!predicates.hasJuiceHit) blockers.push('missing-juice-hit-evidence');
  if (!predicates.hasCarrierDrop) blockers.push('missing-carrier-drop-evidence');
  if (!predicates.hasHitToDropChain) blockers.push('missing-hit-to-drop-chain');

  for (const [key, isEmpty] of Object.entries(intentionallyEmpty)) {
    if (isEmpty) {
      blockers.push(`intentionally-empty-${key}`);
    }
  }

  const requestedAuthority = frame.source.authority;
  const effectiveAuthority = blockers.length === 0 ? 'live_simulation' : downgradeAuthority(frame, evidenceSources, blockers);

  return {
    schema: FIRST_VERTICAL_SOURCE_TRUTH_UPGRADE_SCHEMA,
    accepted: effectiveAuthority === 'live_simulation' && blockers.length === 0,
    requestedAuthority,
    effectiveAuthority,
    maxSampleAgeMs,
    blockers: unique(blockers),
    predicates
  };
}

function collectEvidenceSources(frame: FirstVerticalFrame): SourceTruth[] {
  return [
    ...frame.terrainSamples.map((sample) => sample.source),
    ...frame.lerms.map((lerm) => lerm.source),
    ...frame.goins.map((goin) => goin.source),
    ...frame.juiceHits.map((hit) => hit.source),
    ...frame.carrierDropEvents.map((drop) => drop.source)
  ];
}

function hasHitToDropChain(frame: FirstVerticalFrame): boolean {
  return frame.carrierDropEvents.some((drop) => {
    if (drop.cause !== 'juice_hit' || !drop.triggeringHitId) {
      return false;
    }

    const hit = frame.juiceHits.find((candidate) => candidate.id === drop.triggeringHitId);
    if (!hit || hit.targetKind !== 'lerm' || hit.targetId !== drop.lermId) {
      return false;
    }

    const goin = frame.goins.find((candidate) => candidate.id === drop.goinId);
    return goin?.state === 'dropped' || goin?.state === 'rolling';
  });
}

function downgradeAuthority(
  frame: FirstVerticalFrame,
  evidenceSources: readonly SourceTruth[],
  blockers: readonly FirstVerticalSourceTruthUpgradeBlocker[]
): SimulationAuthority {
  const authorities = [frame.source.authority, ...evidenceSources.map((source) => source.authority)];

  if (blockers.includes('invalid-frame') || authorities.includes('invalid')) return 'invalid';
  if (authorities.includes('fallback')) return 'fallback';
  if (
    blockers.includes('stale-frame-source') ||
    blockers.includes('stale-evidence-source') ||
    authorities.includes('stale_hold')
  ) {
    return 'stale_hold';
  }
  if (authorities.includes('visual_only')) return 'visual_only';
  return 'synthetic_fixture';
}

function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}
