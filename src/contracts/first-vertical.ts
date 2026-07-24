export const SOURCE_TRUTH_SCHEMA = 'lerms.source-truth.v0' as const;
export const TERRAIN_SAMPLE_SCHEMA = 'lerms.terrain-sample.v0' as const;
export const LERM_STATE_SCHEMA = 'lerms.lerm-state.v0' as const;
export const GOIN_STATE_SCHEMA = 'lerms.goin-state.v0' as const;
export const JUICE_HIT_EVENT_SCHEMA = 'lerms.juice-hit-event.v0' as const;
export const CARRIER_DROP_EVENT_SCHEMA = 'lerms.carrier-drop-event.v0' as const;
export const FIRST_VERTICAL_INTERFACE_SCHEMA = 'lerms.first-vertical-frame.v0' as const;
export const FIRST_VERTICAL_SUMMARY_SCHEMA = 'lerms.first-vertical-summary.v0' as const;

export type Vec3 = readonly [number, number, number];

export type SimulationAuthority =
  | 'live_simulation'
  | 'synthetic_fixture'
  | 'visual_only'
  | 'stale_hold'
  | 'invalid'
  | 'fallback';

export type FingerJuiceChemistry =
  | 'index_knockback'
  | 'middle_adhesive_gunk'
  | 'ring_fertilizer'
  | 'thumb_slick'
  | 'pinky_weirdness';

export type TerrainRegion =
  | 'crown'
  | 'approach'
  | 'slope'
  | 'basin'
  | 'gutter'
  | 'rim'
  | 'underhill_fixture';

export type LermSpecies = 'red' | 'blue' | 'yellow' | 'fixture';

export const LERM_STATE_KINDS = [
  'approaching_hoard',
  'stealing_goin',
  'carrying_goin',
  'fleeing_with_goin',
  'hit_reacting',
  'tumbling',
  'recovering',
  'rerouting_to_goin',
] as const;

export type LermStateKind = typeof LERM_STATE_KINDS[number];

export type GoinStateKind = 'hoarded' | 'carried' | 'dropped' | 'rolling' | 'settled' | 'recovered';

export type JuiceTargetKind = 'terrain' | 'lerm' | 'goin' | 'fluid';

export type DropCause = 'juice_hit' | 'terrain_collision' | 'lerm_tumble' | 'scripted_fixture';

export interface SourceTruth {
  schema: typeof SOURCE_TRUTH_SCHEMA;
  authority: SimulationAuthority;
  route: string;
  frameId: string;
  timestampMs: number;
  sampleAgeMs: number;
  backend?: string;
  configId?: string;
}

export interface TerrainSample {
  schema: typeof TERRAIN_SAMPLE_SCHEMA;
  id: string;
  source: SourceTruth;
  world: Vec3;
  normal: Vec3;
  height: number;
  slope: number;
  region: TerrainRegion;
}

export interface GoinState {
  schema: typeof GOIN_STATE_SCHEMA;
  id: string;
  source: SourceTruth;
  state: GoinStateKind;
  world: Vec3;
  velocity: Vec3;
  carrierLermId?: string;
  desireRadius: number;
  mass?: number;
}

export interface TerrainContact {
  terrainSampleId?: string;
  grounded: boolean;
  contactWorld?: Vec3;
}

export interface LermState {
  schema: typeof LERM_STATE_SCHEMA;
  id: string;
  source: SourceTruth;
  species: LermSpecies;
  state: LermStateKind;
  world: Vec3;
  heading: Vec3;
  terrainContact: TerrainContact;
  carryingGoinId?: string;
  targetGoinId?: string;
  speed?: number;
  hitStunMs?: number;
}

export interface JuiceHitEvent {
  schema: typeof JUICE_HIT_EVENT_SCHEMA;
  id: string;
  source: SourceTruth;
  chemistry: FingerJuiceChemistry;
  targetKind: JuiceTargetKind;
  targetId?: string;
  contactWorld: Vec3;
  impulse: Vec3;
  sourcePacketId: string;
  strength?: number;
}

export interface CarrierDropEvent {
  schema: typeof CARRIER_DROP_EVENT_SCHEMA;
  id: string;
  source: SourceTruth;
  cause: DropCause;
  lermId: string;
  goinId: string;
  world: Vec3;
  outgoingVelocity: Vec3;
  rerouteRadius: number;
  triggeringHitId?: string;
}

export interface FirstVerticalFrame {
  schema: typeof FIRST_VERTICAL_INTERFACE_SCHEMA;
  source: SourceTruth;
  terrainSamples: readonly TerrainSample[];
  lerms: readonly LermState[];
  goins: readonly GoinState[];
  juiceHits: readonly JuiceHitEvent[];
  carrierDropEvents: readonly CarrierDropEvent[];
}

export interface FirstVerticalSummary {
  schema: typeof FIRST_VERTICAL_SUMMARY_SCHEMA;
  frameId: string;
  authority: SimulationAuthority;
  lermCount: number;
  goinCount: number;
  carriedGoinCount: number;
  rollingGoinCount: number;
  juiceHitCount: number;
  carrierDropCount: number;
  lermStateCounts: Partial<Record<LermStateKind, number>>;
  goinStateCounts: Partial<Record<GoinStateKind, number>>;
}

export function assertFirstVerticalFrame(frame: FirstVerticalFrame): asserts frame is FirstVerticalFrame {
  requireSchema(frame.schema, FIRST_VERTICAL_INTERFACE_SCHEMA, 'first vertical frame');
  assertSourceTruth(frame.source, 'frame.source');

  const terrainIds = indexIds(frame.terrainSamples, 'terrain sample');
  const lermIds = indexIds(frame.lerms, 'lerm');
  const goinIds = indexIds(frame.goins, 'goin');
  const hitIds = indexIds(frame.juiceHits, 'juice hit');
  indexIds(frame.carrierDropEvents, 'carrier drop event');

  frame.terrainSamples.forEach((sample, index) => {
    const label = `terrainSamples[${index}]`;
    requireSchema(sample.schema, TERRAIN_SAMPLE_SCHEMA, label);
    assertSourceTruth(sample.source, `${label}.source`);
    assertVec3(sample.world, `${label}.world`);
    assertVec3(sample.normal, `${label}.normal`);
    assertFiniteNumber(sample.height, `${label}.height`);
    assertFiniteNumber(sample.slope, `${label}.slope`);
  });

  frame.goins.forEach((goin, index) => {
    const label = `goins[${index}]`;
    requireSchema(goin.schema, GOIN_STATE_SCHEMA, label);
    assertSourceTruth(goin.source, `${label}.source`);
    assertVec3(goin.world, `${label}.world`);
    assertVec3(goin.velocity, `${label}.velocity`);
    assertFiniteNumber(goin.desireRadius, `${label}.desireRadius`);
    if (goin.state === 'carried') {
      requireString(goin.carrierLermId, `${label}.carrierLermId`);
      if (!lermIds.has(goin.carrierLermId)) {
        throw new Error(`${label} references unknown carrier lerm "${goin.carrierLermId}"`);
      }
    }
  });

  frame.lerms.forEach((lerm, index) => {
    const label = `lerms[${index}]`;
    requireSchema(lerm.schema, LERM_STATE_SCHEMA, label);
    assertSourceTruth(lerm.source, `${label}.source`);
    if (!LERM_STATE_KINDS.includes(lerm.state)) {
      throw new Error(`${label}.state must be a known Lerm state; got ${lerm.state}`);
    }
    assertVec3(lerm.world, `${label}.world`);
    assertVec3(lerm.heading, `${label}.heading`);
    if (lerm.terrainContact.terrainSampleId && !terrainIds.has(lerm.terrainContact.terrainSampleId)) {
      throw new Error(`${label}.terrainContact references unknown terrain sample "${lerm.terrainContact.terrainSampleId}"`);
    }
    if (lerm.terrainContact.contactWorld) {
      assertVec3(lerm.terrainContact.contactWorld, `${label}.terrainContact.contactWorld`);
    }
    if (requiresCarriedGoin(lerm.state)) {
      requireString(lerm.carryingGoinId, `${label}.carryingGoinId`);
      if (!goinIds.has(lerm.carryingGoinId)) {
        throw new Error(`${label} references unknown goin "${lerm.carryingGoinId}"`);
      }
    }
    if (lerm.targetGoinId && !goinIds.has(lerm.targetGoinId)) {
      throw new Error(`${label}.targetGoinId references unknown goin "${lerm.targetGoinId}"`);
    }
  });

  frame.juiceHits.forEach((hit, index) => {
    const label = `juiceHits[${index}]`;
    requireSchema(hit.schema, JUICE_HIT_EVENT_SCHEMA, label);
    assertSourceTruth(hit.source, `${label}.source`);
    assertVec3(hit.contactWorld, `${label}.contactWorld`);
    assertVec3(hit.impulse, `${label}.impulse`);
    requireString(hit.sourcePacketId, `${label}.sourcePacketId`);
    if (hit.targetKind === 'lerm') {
      requireKnownOptionalId(hit.targetId, lermIds, `${label}.targetId`, 'lerm');
    }
    if (hit.targetKind === 'goin') {
      requireKnownOptionalId(hit.targetId, goinIds, `${label}.targetId`, 'goin');
    }
    if (hit.strength !== undefined) {
      assertFiniteNumber(hit.strength, `${label}.strength`);
    }
  });

  frame.carrierDropEvents.forEach((drop, index) => {
    const label = `carrierDropEvents[${index}]`;
    requireSchema(drop.schema, CARRIER_DROP_EVENT_SCHEMA, label);
    assertSourceTruth(drop.source, `${label}.source`);
    if (!lermIds.has(drop.lermId)) {
      throw new Error(`${label} references unknown lerm "${drop.lermId}"`);
    }
    if (!goinIds.has(drop.goinId)) {
      throw new Error(`${label} references unknown goin "${drop.goinId}"`);
    }
    if (drop.triggeringHitId && !hitIds.has(drop.triggeringHitId)) {
      throw new Error(`${label}.triggeringHitId references unknown juice hit "${drop.triggeringHitId}"`);
    }
    assertVec3(drop.world, `${label}.world`);
    assertVec3(drop.outgoingVelocity, `${label}.outgoingVelocity`);
    assertFiniteNumber(drop.rerouteRadius, `${label}.rerouteRadius`);
  });
}

export function summarizeFirstVerticalFrame(frame: FirstVerticalFrame): FirstVerticalSummary {
  assertFirstVerticalFrame(frame);

  return {
    schema: FIRST_VERTICAL_SUMMARY_SCHEMA,
    frameId: frame.source.frameId,
    authority: frame.source.authority,
    lermCount: frame.lerms.length,
    goinCount: frame.goins.length,
    carriedGoinCount: frame.goins.filter((goin) => goin.state === 'carried').length,
    rollingGoinCount: frame.goins.filter((goin) => goin.state === 'rolling').length,
    juiceHitCount: frame.juiceHits.length,
    carrierDropCount: frame.carrierDropEvents.length,
    lermStateCounts: countBy(frame.lerms, (lerm) => lerm.state),
    goinStateCounts: countBy(frame.goins, (goin) => goin.state)
  };
}

function assertSourceTruth(source: SourceTruth, label: string): void {
  requireSchema(source.schema, SOURCE_TRUTH_SCHEMA, label);
  requireString(source.route, `${label}.route`);
  requireString(source.frameId, `${label}.frameId`);
  assertFiniteNumber(source.timestampMs, `${label}.timestampMs`);
  assertFiniteNumber(source.sampleAgeMs, `${label}.sampleAgeMs`);
}

function assertVec3(value: Vec3 | undefined, label: string): void {
  if (!Array.isArray(value) || value.length !== 3) {
    throw new Error(`${label} must be a Vec3`);
  }
  value.forEach((component, index) => assertFiniteNumber(component, `${label}[${index}]`));
}

function assertFiniteNumber(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be finite`);
  }
}

function requireSchema(actual: string, expected: string, label: string): void {
  if (actual !== expected) {
    throw new Error(`${label} schema must be ${expected}; got ${actual}`);
  }
}

function requireString(value: string | undefined, label: string): asserts value is string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${label} is required`);
  }
}

function indexIds(items: readonly { id: string }[], label: string): Set<string> {
  const ids = new Set<string>();
  items.forEach((item, index) => {
    requireString(item.id, `${label}[${index}].id`);
    if (ids.has(item.id)) {
      throw new Error(`duplicate ${label} id "${item.id}"`);
    }
    ids.add(item.id);
  });
  return ids;
}

function requireKnownOptionalId(value: string | undefined, ids: Set<string>, label: string, noun: string): void {
  requireString(value, label);
  if (!ids.has(value)) {
    throw new Error(`${label} references unknown ${noun} "${value}"`);
  }
}

function requiresCarriedGoin(state: LermStateKind): boolean {
  return state === 'stealing_goin' || state === 'carrying_goin' || state === 'fleeing_with_goin';
}

function countBy<T extends string, U>(items: readonly U[], keyFor: (item: U) => T): Partial<Record<T, number>> {
  const counts: Partial<Record<T, number>> = {};
  items.forEach((item) => {
    const key = keyFor(item);
    counts[key] = (counts[key] ?? 0) + 1;
  });
  return counts;
}
