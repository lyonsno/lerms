import {
  type CarrierDropEvent,
  type FirstVerticalFrame,
  type GoinState,
  type JuiceHitEvent,
  type LermState,
  type SourceTruth,
  type TerrainSample
} from '../src/contracts/first-vertical.ts';
import {
  FIRST_VERTICAL_SOURCE_TRUTH_UPGRADE_SCHEMA,
  evaluateFirstVerticalSourceTruthUpgrade
} from '../src/contracts/first-vertical-source-truth-upgrade.ts';
import { buildFirstVerticalComposerWitnessReport } from '../src/contracts/first-vertical-composer-witness.ts';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const liveSource: SourceTruth = {
  schema: 'lerms.source-truth.v0',
  authority: 'live_simulation',
  route: 'source-truth-upgrade-test/live',
  frameId: 'live-frame',
  timestampMs: 3000,
  sampleAgeMs: 24,
  backend: 'live-test-backend',
  configId: 'live-config'
};

const terrain: TerrainSample = {
  schema: 'lerms.terrain-sample.v0',
  id: 'terrain-live-crown',
  source: liveSource,
  world: [0, 1.2, 0],
  normal: [0, 1, 0],
  height: 1.2,
  slope: 0.2,
  region: 'crown'
};

const lerm: LermState = {
  schema: 'lerms.lerm-state.v0',
  id: 'red-live-carrier',
  source: liveSource,
  species: 'red',
  state: 'fleeing_with_goin',
  world: [0.1, 1.2, 0],
  heading: [0, 0, -1],
  terrainContact: {
    terrainSampleId: terrain.id,
    grounded: true,
    contactWorld: [0.1, 1.2, 0]
  },
  carryingGoinId: 'goin-live-001'
};

const goin: GoinState = {
  schema: 'lerms.goin-state.v0',
  id: 'goin-live-001',
  source: liveSource,
  state: 'dropped',
  world: [0.12, 1.21, -0.1],
  velocity: [0, 0, -1.1],
  desireRadius: 1.4
};

const hit: JuiceHitEvent = {
  schema: 'lerms.juice-hit-event.v0',
  id: 'juice-live-001',
  source: liveSource,
  chemistry: 'index_knockback',
  targetKind: 'lerm',
  targetId: lerm.id,
  contactWorld: [0.1, 1.22, -0.02],
  impulse: [0, 0.2, -1.4],
  sourcePacketId: 'finger-juice-live-packet-001',
  strength: 0.85
};

const drop: CarrierDropEvent = {
  schema: 'lerms.carrier-drop-event.v0',
  id: 'drop-live-001',
  source: liveSource,
  cause: 'juice_hit',
  lermId: lerm.id,
  goinId: goin.id,
  world: goin.world,
  outgoingVelocity: goin.velocity,
  rerouteRadius: 1.7,
  triggeringHitId: hit.id
};

const liveFrame: FirstVerticalFrame = {
  schema: 'lerms.first-vertical-frame.v0',
  source: {
    ...liveSource,
    route: 'first-vertical-composer/live-test-frame'
  },
  terrainSamples: [terrain],
  lerms: [lerm],
  goins: [goin],
  juiceHits: [hit],
  carrierDropEvents: [drop]
};

const liveEvaluation = evaluateFirstVerticalSourceTruthUpgrade(liveFrame);
assert(liveEvaluation.schema === FIRST_VERTICAL_SOURCE_TRUTH_UPGRADE_SCHEMA, 'schema is versioned');
assert(liveEvaluation.effectiveAuthority === 'live_simulation', 'live coherent loop can upgrade');
assert(liveEvaluation.accepted === true, 'live coherent loop is accepted');
assert(liveEvaluation.blockers.length === 0, 'live coherent loop has no blockers');
assert(liveEvaluation.predicates.hasTerrain === true, 'terrain predicate recorded');
assert(liveEvaluation.predicates.hasCarrierDrop === true, 'carrier-drop predicate recorded');
assert(liveEvaluation.predicates.hasHitToDropChain === true, 'hit/drop chain predicate recorded');

const fixtureReport = buildFirstVerticalComposerWitnessReport({
  outputPath: '/tmp/lerms-fixture-report.json',
  frameId: 'fixture-report',
  timestampMs: 3000
});
const fixtureEvaluation = evaluateFirstVerticalSourceTruthUpgrade(fixtureReport.frame, {
  intentionallyEmpty: fixtureReport.intentionallyEmpty
});
assert(fixtureEvaluation.effectiveAuthority === 'synthetic_fixture', 'current composer witness stays fixture');
assert(fixtureEvaluation.accepted === false, 'current composer witness cannot upgrade');
assert(
  fixtureEvaluation.blockers.includes('source-authority-not-live'),
  'fixture authority blocks upgrade'
);
assert(
  fixtureEvaluation.blockers.includes('intentionally-empty-liveFingerJuicePackets'),
  'intentional live-finger-juice absence blocks upgrade'
);

const terrainOnlyEvaluation = evaluateFirstVerticalSourceTruthUpgrade({
  ...liveFrame,
  lerms: [],
  goins: [],
  juiceHits: [],
  carrierDropEvents: []
});
assert(terrainOnlyEvaluation.effectiveAuthority === 'synthetic_fixture', 'terrain-only stays downgraded');
assert(terrainOnlyEvaluation.blockers.includes('missing-lerm-evidence'), 'missing lerms block upgrade');
assert(terrainOnlyEvaluation.blockers.includes('missing-carrier-drop-evidence'), 'missing drop blocks upgrade');

const staleEvaluation = evaluateFirstVerticalSourceTruthUpgrade(
  {
    ...liveFrame,
    source: {
      ...liveFrame.source,
      sampleAgeMs: 1200
    }
  },
  { maxSampleAgeMs: 500 }
);
assert(staleEvaluation.effectiveAuthority === 'stale_hold', 'stale source downgrades to stale hold');
assert(staleEvaluation.blockers.includes('stale-frame-source'), 'stale frame source blocks upgrade');

const visualOnlyEvaluation = evaluateFirstVerticalSourceTruthUpgrade({
  ...liveFrame,
  juiceHits: [
    {
      ...hit,
      source: {
        ...hit.source,
        authority: 'visual_only'
      }
    }
  ]
});
assert(visualOnlyEvaluation.effectiveAuthority === 'visual_only', 'visual-only evidence downgrades frame');
assert(visualOnlyEvaluation.blockers.includes('non-live-evidence-source'), 'visual-only evidence blocks upgrade');

const brokenChainEvaluation = evaluateFirstVerticalSourceTruthUpgrade({
  ...liveFrame,
  carrierDropEvents: [
    {
      ...drop,
      triggeringHitId: undefined
    }
  ]
});
assert(brokenChainEvaluation.effectiveAuthority === 'synthetic_fixture', 'broken hit/drop chain stays downgraded');
assert(brokenChainEvaluation.blockers.includes('missing-hit-to-drop-chain'), 'broken chain blocks upgrade');

console.log('first vertical source-truth upgrade contracts ok');
