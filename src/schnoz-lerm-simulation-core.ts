import {
  CARRIER_DROP_EVENT_SCHEMA,
  FIRST_VERTICAL_INTERFACE_SCHEMA,
  GOIN_STATE_SCHEMA,
  JUICE_HIT_EVENT_SCHEMA,
  LERM_STATE_SCHEMA,
  SOURCE_TRUTH_SCHEMA,
  TERRAIN_SAMPLE_SCHEMA,
  summarizeFirstVerticalFrame,
  type CarrierDropEvent,
  type FirstVerticalFrame,
  type GoinState,
  type JuiceHitEvent,
  type LermState,
  type SourceTruth,
  type TerrainSample,
  type Vec3,
} from './contracts/first-vertical.ts';
import {
  evaluateFirstVerticalSourceTruthUpgrade,
  type FirstVerticalSourceTruthUpgradeEvaluation,
} from './contracts/first-vertical-source-truth-upgrade.ts';

export const SCHNOZ_SIM_ROUTE = 'lerms/schnoz-lerm-simulation/witness-file' as const;
export const SCHNOZ_SIM_CONFIG_ID = 'schnoz-sim-steal-drop-reroute-v0' as const;
export const SCHNOZ_PROXY_BODY_IDENTITY = 'proxy_schnoz_sphere' as const;

export type SchnozTimelineFrame = {
  index: number;
  label: string;
  timeMs: number;
  events: string[];
  lerms: SchnozRenderLerm[];
  goins: SchnozRenderGoin[];
  hitFlash?: { world: Vec3; radius: number };
  reroute?: { from: Vec3; to: Vec3 };
  motionEvidence: SchnozMotionEvidence;
};

export type SchnozRenderLerm = {
  id: string;
  world: Vec3;
  heading: Vec3;
  state: LermState['state'];
  carryingGoinId?: string;
  targetGoinId?: string;
  hitStunMs?: number;
};

export type SchnozRenderGoin = {
  id: string;
  world: Vec3;
  state: GoinState['state'];
};

export type SchnozMotionEvidence = {
  schema: 'lerms.schnoz-motion-evidence.v0';
  sourceFrame: number;
  sourceTimeMs: number;
  clipletLabel: string;
  sourcePhaseLabel: string;
  featureEvidenceSockets: readonly string[];
  adaptedPoseFields: readonly string[];
  sourceEvidenceNote: string;
};

export type SchnozSimulationSnapshot = {
  proxyBody: {
    identity: typeof SCHNOZ_PROXY_BODY_IDENTITY;
    visualConceptStatus: 'blocked_waiting_for_wake_and_bake';
    claimsFinalRedLermBody: false;
    orientationCue: 'schnoz_nub';
    allowedBecause: readonly string[];
  };
  frame: FirstVerticalFrame;
  summary: ReturnType<typeof summarizeFirstVerticalFrame>;
  sourceTruthUpgrade: FirstVerticalSourceTruthUpgradeEvaluation;
  timeline: SchnozTimelineFrame[];
};

export function buildSchnozSimulationSnapshot(): SchnozSimulationSnapshot {
  const timeline = buildSchnozTimeline();
  const frame = buildFirstVerticalFrameFromSchnozSimulation(timeline);
  return {
    proxyBody: {
      identity: SCHNOZ_PROXY_BODY_IDENTITY,
      visualConceptStatus: 'blocked_waiting_for_wake_and_bake',
      claimsFinalRedLermBody: false,
      orientationCue: 'schnoz_nub',
      allowedBecause: [
        'simulation-spine-before-final-body',
        'source-truth-can-be-live-with-proxy-visuals',
        'wake-and-bake-owns-final-asset-conditioning',
      ],
    },
    frame,
    summary: summarizeFirstVerticalFrame(frame),
    sourceTruthUpgrade: evaluateFirstVerticalSourceTruthUpgrade(frame),
    timeline,
  };
}

export function buildSchnozTimeline(): SchnozTimelineFrame[] {
  return [
    frame(0, 'approach', 0, ['uphill-approach'], [
      lerm('schnoz-approach', [-2.6, 0.4, 0], [1, 0, 0.1], 'approaching_hoard'),
      lerm('schnoz-rerouter', [-2.1, 0.34, -0.3], [1, 0, 0.2], 'approaching_hoard'),
    ], [
      goin('goin-hoard-001', [1.95, 0.58, 0.05], 'hoarded'),
      goin('goin-loose-001', [1.7, 0.5, -0.22], 'hoarded'),
    ], evidence(0, 0, 'approach / commit', 'uphill approach')),
    frame(1, 'steal', 240, ['goin-stolen'], [
      lerm('schnoz-thief', [0.95, 0.58, 0.02], [1, 0, 0], 'stealing_goin', 'goin-hoard-001'),
      lerm('schnoz-approach', [-1.5, 0.43, -0.1], [1, 0, 0.05], 'approaching_hoard'),
    ], [
      goin('goin-hoard-001', [1.05, 0.61, 0.03], 'carried'),
      goin('goin-loose-001', [1.7, 0.5, -0.22], 'hoarded'),
    ], evidence(1, 240, 'reach / steal', 'grab lunge')),
    frame(2, 'flee', 480, ['carrier-fleeing'], [
      lerm('schnoz-fleeing', [0.25, 0.55, -0.15], [-1, 0, -0.2], 'fleeing_with_goin', 'goin-hoard-001'),
      lerm('schnoz-chaser', [-0.95, 0.45, -0.18], [1, 0, 0], 'approaching_hoard'),
    ], [
      goin('goin-hoard-001', [0.12, 0.58, -0.15], 'carried'),
      goin('goin-loose-001', [1.7, 0.5, -0.22], 'hoarded'),
    ], evidence(2, 480, 'turn / flee', 'panic carry')),
    frame(3, 'hit', 720, ['juice-hit-carrier'], [
      lerm('schnoz-hit-carrier', [-0.15, 0.56, -0.2], [-1, 0, -0.1], 'hit_reacting', undefined, undefined, 180),
      lerm('schnoz-chaser', [-0.75, 0.45, -0.18], [1, 0, 0], 'approaching_hoard'),
    ], [
      goin('goin-hoard-001', [-0.04, 0.57, -0.18], 'dropped'),
      goin('goin-loose-001', [1.7, 0.5, -0.22], 'hoarded'),
    ], evidence(3, 720, 'brake / compress', 'hit reaction'), { world: [-0.15, 0.72, -0.2], radius: 0.38 }),
    frame(4, 'drop', 960, ['drop-started'], [
      lerm('schnoz-tumbling', [-0.55, 0.62, -0.3], [-1, 0, -0.3], 'tumbling', undefined, undefined, 260),
      lerm('schnoz-rerouter', [-1.25, 0.44, -0.18], [1, 0, -0.05], 'approaching_hoard'),
    ], [
      goin('goin-hoard-001', [-0.55, 0.42, -0.42], 'rolling'),
      goin('goin-loose-001', [1.7, 0.5, -0.22], 'hoarded'),
    ], evidence(4, 960, 'drop / recover', 'tumble drop')),
    frame(5, 'reroute', 1200, ['loose-goin-reroute'], [
      lerm('schnoz-approach', [-1.95, 0.4, 0.2], [1, 0, -0.05], 'approaching_hoard'),
      lerm('schnoz-carrier', [0.75, 0.55, 0.24], [-1, 0, 0], 'carrying_goin', 'goin-carried-001'),
      lerm('schnoz-fleeing', [0.35, 0.56, 0.38], [-1, 0, 0.2], 'fleeing_with_goin', 'goin-flee-001'),
      lerm('schnoz-hit-carrier', [-0.22, 0.6, -0.25], [-1, 0, -0.2], 'hit_reacting', undefined, undefined, 220),
      lerm('schnoz-tumbling', [-0.64, 0.62, -0.35], [-1, 0, -0.3], 'tumbling', undefined, undefined, 260),
      lerm('schnoz-rerouter', [-1.35, 0.42, -0.12], [1, 0, -0.2], 'rerouting_to_goin', undefined, 'goin-dropped-001'),
    ], [
      goin('goin-carried-001', [0.85, 0.57, 0.25], 'carried'),
      goin('goin-flee-001', [0.22, 0.56, 0.37], 'carried'),
      goin('goin-dropped-001', [-0.88, 0.38, -0.54], 'rolling'),
    ], evidence(5, 1200, 'recover / chase', 'loose goin reroute'), { world: [-0.22, 0.74, -0.25], radius: 0.36 }, {
      from: [-1.35, 0.42, -0.12],
      to: [-0.88, 0.38, -0.54],
    }),
  ];
}

export function buildFirstVerticalFrameFromSchnozSimulation(timeline = buildSchnozTimeline()): FirstVerticalFrame {
  const timestampMs = 1200;
  const frameId = 'schnoz-lerm-live-sim-frame-001';
  const frameSource = source(frameId, `${SCHNOZ_SIM_ROUTE}/frame`, timestampMs);
  const terrain = terrainSamples(frameId, timestampMs);
  const terrainById = new Map(terrain.map((sample) => [sample.id, sample]));
  const final = timeline[timeline.length - 1];
  const sourceForPackets = source(frameId, `${SCHNOZ_SIM_ROUTE}/packets`, timestampMs);
  const lerms: LermState[] = final.lerms.map((item) => ({
    schema: LERM_STATE_SCHEMA,
    id: item.id,
    source: sourceForPackets,
    species: 'red',
    state: item.state,
    world: item.world,
    heading: item.heading,
    terrainContact: {
      terrainSampleId: terrainForWorld(item.world, terrainById),
      grounded: true,
      contactWorld: [item.world[0], item.world[1] - 0.16, item.world[2]],
    },
    carryingGoinId: item.carryingGoinId,
    targetGoinId: item.targetGoinId,
    speed: item.state === 'rerouting_to_goin' ? 0.84 : 0.46,
    hitStunMs: item.hitStunMs,
  }));
  const goins: GoinState[] = final.goins.map((item) => ({
    schema: GOIN_STATE_SCHEMA,
    id: item.id,
    source: sourceForPackets,
    state: item.state,
    world: item.world,
    velocity: item.state === 'rolling' ? [-0.42, -0.05, -0.7] : [0, 0, 0],
    carrierLermId:
      item.id === 'goin-carried-001'
        ? 'schnoz-carrier'
        : item.id === 'goin-flee-001'
          ? 'schnoz-fleeing'
          : undefined,
    desireRadius: item.state === 'rolling' ? 1.8 : 0.65,
    mass: 1,
  }));
  const hit: JuiceHitEvent = {
    schema: JUICE_HIT_EVENT_SCHEMA,
    id: 'schnoz-hit-001',
    source: sourceForPackets,
    chemistry: 'index_knockback',
    targetKind: 'lerm',
    targetId: 'schnoz-hit-carrier',
    contactWorld: [-0.22, 0.74, -0.25],
    impulse: [-0.65, 0.25, -0.4],
    sourcePacketId: 'proxy-index-juice-packet-001',
    strength: 0.82,
  };
  const drop: CarrierDropEvent = {
    schema: CARRIER_DROP_EVENT_SCHEMA,
    id: 'schnoz-drop-001',
    source: sourceForPackets,
    cause: 'juice_hit',
    lermId: 'schnoz-hit-carrier',
    goinId: 'goin-dropped-001',
    world: [-0.88, 0.38, -0.54],
    outgoingVelocity: [-0.42, -0.05, -0.7],
    rerouteRadius: 1.8,
    triggeringHitId: hit.id,
  };
  return {
    schema: FIRST_VERTICAL_INTERFACE_SCHEMA,
    source: frameSource,
    terrainSamples: terrain,
    lerms,
    goins,
    juiceHits: [hit],
    carrierDropEvents: [drop],
  };
}

function evidence(sourceFrame: number, sourceTimeMs: number, clipletLabel: string, sourcePhaseLabel: string): SchnozMotionEvidence {
  return {
    schema: 'lerms.schnoz-motion-evidence.v0',
    sourceFrame,
    sourceTimeMs,
    clipletLabel,
    sourcePhaseLabel,
    featureEvidenceSockets: [
      'rootMetrics.travelXZ',
      'torsoFrame.chestRootHorizontalLean.range',
      'limbEnvelope.handSpan.range',
      'stanceContact.stanceWidth.range',
      'expansionCompression.bboxVolume.range',
      'eventSpikes.0.speed',
    ],
    adaptedPoseFields: [
      'lerm.rootOffset',
      'lerm.faceCueLead',
      'lerm.bodyLean',
      'lerm.scalePulse',
      'lerm.envelopeRadius',
      'lerm.eventAccent',
      'lerm.footfallPulse',
    ],
    sourceEvidenceNote:
      'Mushfinger-style source evidence sockets are preserved separately from LERMS-owned schnoz proxy gameplay state.',
  };
}

function source(frameId: string, route: string, timestampMs: number): SourceTruth {
  return {
    schema: SOURCE_TRUTH_SCHEMA,
    authority: 'live_simulation',
    route,
    frameId,
    timestampMs,
    sampleAgeMs: 16,
    backend: 'schnoz-sphere-deterministic-sim',
    configId: SCHNOZ_SIM_CONFIG_ID,
  };
}

function terrainSamples(frameId: string, timestampMs: number): TerrainSample[] {
  const terrainSource = source(frameId, `${SCHNOZ_SIM_ROUTE}/terrain`, timestampMs);
  return [
    terrain('terrain-approach-left', terrainSource, [-1.6, 0.34, -0.2], 0.34, 0.36, 'approach'),
    terrain('terrain-crown-right', terrainSource, [0.8, 0.58, 0.22], 0.58, 0.19, 'crown'),
    terrain('terrain-gutter-drop', terrainSource, [-0.85, 0.38, -0.54], 0.38, 0.44, 'gutter'),
  ];
}

function terrain(id: string, terrainSource: SourceTruth, world: Vec3, height: number, slope: number, region: TerrainSample['region']): TerrainSample {
  return {
    schema: TERRAIN_SAMPLE_SCHEMA,
    id,
    source: terrainSource,
    world,
    normal: [0, 1, 0],
    height,
    slope,
    region,
  };
}

function terrainForWorld(world: Vec3, terrainById: Map<string, TerrainSample>): string {
  if (world[0] > 0.1) return terrainById.get('terrain-crown-right')?.id ?? 'terrain-crown-right';
  if (world[0] < -0.7 && world[2] < -0.25) return terrainById.get('terrain-gutter-drop')?.id ?? 'terrain-gutter-drop';
  return terrainById.get('terrain-approach-left')?.id ?? 'terrain-approach-left';
}

function frame(
  index: number,
  label: string,
  timeMs: number,
  events: string[],
  lerms: SchnozRenderLerm[],
  goins: SchnozRenderGoin[],
  motionEvidence: SchnozMotionEvidence,
  hitFlash?: SchnozTimelineFrame['hitFlash'],
  reroute?: SchnozTimelineFrame['reroute'],
): SchnozTimelineFrame {
  return { index, label, timeMs, events, lerms, goins, hitFlash, reroute, motionEvidence };
}

function lerm(
  id: string,
  world: Vec3,
  heading: Vec3,
  state: LermState['state'],
  carryingGoinId?: string,
  targetGoinId?: string,
  hitStunMs?: number,
): SchnozRenderLerm {
  return { id, world, heading, state, carryingGoinId, targetGoinId, hitStunMs };
}

function goin(id: string, world: Vec3, state: GoinState['state']): SchnozRenderGoin {
  return { id, world, state };
}
