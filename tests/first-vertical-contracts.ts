import {
  FIRST_VERTICAL_INTERFACE_SCHEMA,
  assertFirstVerticalFrame,
  summarizeFirstVerticalFrame,
  type CarrierDropEvent,
  type FirstVerticalFrame,
  type GoinState,
  type JuiceHitEvent,
  type LermState,
  type TerrainSample
} from '../src/contracts/first-vertical.js';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function assertThrows(fn: () => void, expectedMessage: string): void {
  try {
    fn();
  } catch (error) {
    assert(error instanceof Error, 'expected thrown error to be Error');
    assert(
      error.message.includes(expectedMessage),
      `expected "${error.message}" to include "${expectedMessage}"`
    );
    return;
  }
  throw new Error(`expected function to throw ${expectedMessage}`);
}

const source = {
  schema: 'lerms.source-truth.v0' as const,
  authority: 'synthetic_fixture' as const,
  route: 'contract-test',
  frameId: 'frame-001',
  timestampMs: 1234,
  sampleAgeMs: 0
};

const terrain: TerrainSample = {
  schema: 'lerms.terrain-sample.v0',
  id: 'terrain-crown',
  source,
  world: [0, 1.6, 0.2],
  normal: [0, 1, 0],
  height: 1.6,
  slope: 0.2,
  region: 'crown'
};

const goin: GoinState = {
  schema: 'lerms.goin-state.v0',
  id: 'goin-001',
  source,
  state: 'carried',
  world: [0.1, 1.65, 0.2],
  velocity: [0, 0, 0],
  carrierLermId: 'lerm-red-001',
  desireRadius: 0.8
};

const lerm: LermState = {
  schema: 'lerms.lerm-state.v0',
  id: 'lerm-red-001',
  source,
  species: 'red',
  state: 'fleeing_with_goin',
  world: [0.15, 1.64, 0.22],
  heading: [0, 0, -1],
  terrainContact: {
    terrainSampleId: terrain.id,
    grounded: true,
    contactWorld: [0.15, 1.6, 0.22]
  },
  carryingGoinId: goin.id
};

const hit: JuiceHitEvent = {
  schema: 'lerms.juice-hit-event.v0',
  id: 'hit-001',
  source,
  chemistry: 'index_knockback',
  targetKind: 'lerm',
  targetId: lerm.id,
  contactWorld: [0.16, 1.66, 0.24],
  impulse: [0.3, 0.2, -0.8],
  sourcePacketId: 'juice-packet-001'
};

const drop: CarrierDropEvent = {
  schema: 'lerms.carrier-drop-event.v0',
  id: 'drop-001',
  source,
  cause: 'juice_hit',
  lermId: lerm.id,
  goinId: goin.id,
  world: [0.17, 1.62, 0.18],
  outgoingVelocity: [0.1, 0, -0.45],
  rerouteRadius: 1.2,
  triggeringHitId: hit.id
};

const frame: FirstVerticalFrame = {
  schema: FIRST_VERTICAL_INTERFACE_SCHEMA,
  source,
  terrainSamples: [terrain],
  lerms: [lerm],
  goins: [goin],
  juiceHits: [hit],
  carrierDropEvents: [drop]
};

assertFirstVerticalFrame(frame);

const summary = summarizeFirstVerticalFrame(frame);
assert(summary.lermCount === 1, 'summarizes lerm count');
assert(summary.goinCount === 1, 'summarizes goin count');
assert(summary.carriedGoinCount === 1, 'summarizes carried goin count');
assert(summary.juiceHitCount === 1, 'summarizes juice hit count');
assert(summary.carrierDropCount === 1, 'summarizes carrier drop count');
assert(summary.lermStateCounts.fleeing_with_goin === 1, 'summarizes lerm state buckets');

assertThrows(
  () =>
    assertFirstVerticalFrame({
      ...frame,
      carrierDropEvents: [
        {
          ...drop,
          goinId: 'missing-goin'
        }
      ]
    }),
  'unknown goin'
);

assertThrows(
  () =>
    assertFirstVerticalFrame({
      ...frame,
      lerms: [
        {
          ...lerm,
          state: 'fleeing_with_goin',
          carryingGoinId: undefined
        }
      ]
    }),
  'carryingGoinId'
);

console.log('first vertical contracts ok');
