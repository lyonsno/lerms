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
import {
  adaptMushfingerClipletToSchnozMotion,
  buildSchnozMotionAdapterInput,
  type MushfingerClipletPlaybackSampleEnvelope,
  type SchnozMotionAdapterOutput,
} from './schnoz-motion-adapter.ts';

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
  motionAdapter?: SchnozMotionAdapterOutput;
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
      lerm('red-lerm-001', [-2.6, 0.4, 0], [1, 0, 0.1], 'approaching_hoard'),
      lerm('red-lerm-002', [-2.1, 0.34, -0.3], [1, 0, 0.2], 'approaching_hoard'),
      lerm('red-lerm-003', [-2.35, 0.36, 0.34], [1, 0, -0.1], 'approaching_hoard'),
      lerm('red-lerm-004', [-1.85, 0.42, 0.58], [1, 0, -0.25], 'approaching_hoard'),
      lerm('red-lerm-005', [-1.65, 0.38, -0.52], [1, 0, 0.12], 'approaching_hoard'),
      lerm('red-lerm-006', [-2.75, 0.32, -0.65], [1, 0, 0.22], 'approaching_hoard'),
    ], [
      goin('goin-hoard-001', [1.95, 0.58, 0.05], 'hoarded'),
      goin('goin-loose-001', [1.7, 0.5, -0.22], 'hoarded'),
    ], evidence(0, 0, 'approach / commit', 'uphill approach')),
    frame(1, 'steal', 240, ['goin-stolen'], [
      lerm('red-lerm-001', [0.95, 0.58, 0.02], [1, 0, 0], 'stealing_goin', 'goin-hoard-001'),
      lerm('red-lerm-002', [-1.5, 0.43, -0.1], [1, 0, 0.05], 'approaching_hoard'),
      lerm('red-lerm-003', [-1.92, 0.41, 0.28], [1, 0, -0.12], 'approaching_hoard'),
      lerm('red-lerm-004', [-1.45, 0.46, 0.45], [1, 0, -0.22], 'approaching_hoard'),
      lerm('red-lerm-005', [-1.28, 0.42, -0.46], [1, 0, 0.12], 'approaching_hoard'),
      lerm('red-lerm-006', [-2.18, 0.35, -0.56], [1, 0, 0.18], 'approaching_hoard'),
    ], [
      goin('goin-hoard-001', [1.05, 0.61, 0.03], 'carried'),
      goin('goin-loose-001', [1.7, 0.5, -0.22], 'hoarded'),
    ], evidence(1, 240, 'reach / steal', 'grab lunge')),
    frame(2, 'flee', 480, ['carrier-fleeing'], [
      lerm('red-lerm-001', [0.25, 0.55, -0.15], [-1, 0, -0.2], 'fleeing_with_goin', 'goin-hoard-001'),
      lerm('red-lerm-002', [-0.95, 0.45, -0.18], [1, 0, 0], 'approaching_hoard'),
      lerm('red-lerm-003', [0.35, 0.56, 0.38], [-1, 0, 0.2], 'fleeing_with_goin', 'goin-loose-001'),
      lerm('red-lerm-004', [-0.88, 0.5, 0.28], [1, 0, -0.2], 'approaching_hoard'),
      lerm('red-lerm-005', [-0.72, 0.49, -0.38], [1, 0, 0.08], 'approaching_hoard'),
      lerm('red-lerm-006', [-1.56, 0.39, -0.42], [1, 0, 0.14], 'approaching_hoard'),
    ], [
      goin('goin-hoard-001', [0.12, 0.58, -0.15], 'carried'),
      goin('goin-loose-001', [1.7, 0.5, -0.22], 'hoarded'),
    ], evidence(2, 480, 'turn / flee', 'panic carry')),
    frame(3, 'hit', 720, ['juice-hit-carrier'], [
      lerm('red-lerm-001', [-0.15, 0.56, -0.2], [-1, 0, -0.1], 'hit_reacting', undefined, undefined, 180),
      lerm('red-lerm-002', [-0.75, 0.45, -0.18], [1, 0, 0], 'approaching_hoard'),
      lerm('red-lerm-003', [0.22, 0.56, 0.37], [-1, 0, 0.2], 'fleeing_with_goin', 'goin-loose-001'),
      lerm('red-lerm-004', [-0.38, 0.54, 0.18], [-1, 0, -0.2], 'hit_reacting', undefined, undefined, 120),
      lerm('red-lerm-005', [-0.42, 0.54, -0.32], [-1, 0, -0.18], 'hit_reacting', undefined, undefined, 140),
      lerm('red-lerm-006', [-1.05, 0.42, -0.28], [1, 0, 0.08], 'approaching_hoard'),
    ], [
      goin('goin-hoard-001', [-0.04, 0.57, -0.18], 'dropped'),
      goin('goin-loose-001', [1.7, 0.5, -0.22], 'hoarded'),
    ], evidence(3, 720, 'brake / compress', 'hit reaction'), { world: [-0.15, 0.72, -0.2], radius: 0.38 }),
    frame(4, 'drop', 960, ['drop-started'], [
      lerm('red-lerm-001', [-0.55, 0.62, -0.3], [-1, 0, -0.3], 'tumbling', undefined, undefined, 260),
      lerm('red-lerm-002', [-1.25, 0.44, -0.18], [1, 0, -0.05], 'approaching_hoard'),
      lerm('red-lerm-003', [0.1, 0.55, 0.42], [-1, 0, 0.1], 'fleeing_with_goin', 'goin-loose-001'),
      lerm('red-lerm-004', [-0.5, 0.58, 0.12], [-1, 0, -0.2], 'tumbling', undefined, undefined, 220),
      lerm('red-lerm-005', [-0.64, 0.62, -0.35], [-1, 0, -0.3], 'tumbling', undefined, undefined, 260),
      lerm('red-lerm-006', [-1.22, 0.44, -0.18], [1, 0, -0.05], 'approaching_hoard'),
    ], [
      goin('goin-hoard-001', [-0.55, 0.42, -0.42], 'rolling'),
      goin('goin-loose-001', [1.7, 0.5, -0.22], 'hoarded'),
    ], evidence(4, 960, 'drop / recover', 'tumble drop')),
    frame(5, 'reroute', 1200, ['loose-goin-reroute'], [
      lerm('red-lerm-001', [-1.35, 0.42, -0.12], [1, 0, -0.2], 'rerouting_to_goin', undefined, 'goin-dropped-001'),
      lerm('red-lerm-002', [0.75, 0.55, 0.24], [-1, 0, 0], 'carrying_goin', 'goin-carried-001'),
      lerm('red-lerm-003', [0.35, 0.56, 0.38], [-1, 0, 0.2], 'fleeing_with_goin', 'goin-flee-001'),
      lerm('red-lerm-004', [-0.22, 0.6, -0.25], [-1, 0, -0.2], 'hit_reacting', undefined, undefined, 220),
      lerm('red-lerm-005', [-0.64, 0.62, -0.35], [-1, 0, -0.3], 'tumbling', undefined, undefined, 260),
      lerm('red-lerm-006', [-1.95, 0.4, 0.2], [1, 0, -0.05], 'approaching_hoard'),
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
        ? 'red-lerm-002'
        : item.id === 'goin-flee-001'
          ? 'red-lerm-003'
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
    targetId: 'red-lerm-001',
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
    lermId: 'red-lerm-001',
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
  const adaptedLerms = lerms.map((item) => ({
    ...item,
    motionAdapter: adaptMushfingerClipletToSchnozMotion(buildSchnozMotionAdapterInput({
      gameplayState: item.state,
      carryingGoinId: item.carryingGoinId,
      targetGoinId: item.targetGoinId,
      hitStunMs: item.hitStunMs,
      mushfingerPlaybackSample: mushfingerPlaybackSampleForFrame(index, motionEvidence),
    })),
  }));
  return { index, label, timeMs, events, lerms: adaptedLerms, goins, hitFlash, reroute, motionEvidence };
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

function mushfingerPlaybackSampleForFrame(
  index: number,
  motionEvidence: SchnozMotionEvidence,
): MushfingerClipletPlaybackSampleEnvelope {
  const compression = compressionForLabel(motionEvidence.clipletLabel);
  const effort = effortForLabel(motionEvidence.clipletLabel);
  const sourceFrame = 148 + index * 5;
  const interpolation = (index % 6) / 5;
  return {
    schema: 'kaminos.generated-motion-cliplet-playback-sample-envelope.v0',
    playback: {
      schema: 'kaminos.generated-motion-cliplet-playback-sample.v0',
      playbackId: 'lerms_schnoz_proxy_mushfinger_playback_v0',
      sourceClipId: 'panel_a_man_stops_short_startles_and_sprints_in__temporal_v0',
      mode: 'loop',
      t: Number((index * 0.12).toFixed(5)),
      wrappedTime: Number((index * 0.12).toFixed(5)),
      localTime: Number((index * 0.12).toFixed(5)),
      interpolation,
      segmentId: `lerms_schnoz_proxy_cliplet_${String(index).padStart(3, '0')}`,
      segmentIndex: index,
      labelGuess: motionEvidence.clipletLabel,
      sourceTime: Number((4.93333 + index * 0.12).toFixed(5)),
      sourceFrame,
      sourceRange: {
        startSourceFrame: sourceFrame,
        endSourceFrame: sourceFrame + 7,
        sourceStartTime: Number((4.93333 + index * 0.12).toFixed(5)),
        sourceEndTime: Number((5.05333 + index * 0.12).toFixed(5)),
      },
    },
    motionSample: {
      root: [0.03 * index, 0.02 + compression * 0.03, 0.22 + index * 0.08],
      attention: [0.08 * (index + 1), 0.05, 0.48 + index * 0.1],
      effort,
      phase: motionEvidence.sourcePhaseLabel,
      temporalSample: {
        sourceFrame,
        time: Number((4.93333 + index * 0.12).toFixed(5)),
        phaseLabel: motionEvidence.sourcePhaseLabel,
        root: [0.03 * index, 0.02 + compression * 0.03, 0.22 + index * 0.08],
        chestRoot: [index % 2 === 0 ? 0.04 : -0.04, 0.78 - compression * 0.12, 0.06],
        handSpan: 0.5 + effort * 0.08,
        stanceWidth: 0.32 + effort * 0.03,
        bboxVolume: 1.08 + compression * 0.52,
        bowCompression: compression,
      },
    },
    source: {
      route: 'motion-server:http://127.0.0.1:8098/generate',
      model: 'kimodo',
      status: 'archived-live-generated-witness',
    },
  };
}

function compressionForLabel(label: string): number {
  if (label.includes('brake') || label.includes('compress')) return 0.92;
  if (label.includes('drop')) return 0.62;
  if (label.includes('turn') || label.includes('flee')) return 0.32;
  if (label.includes('recover')) return 0.22;
  return 0.14;
}

function effortForLabel(label: string): number {
  if (label.includes('flee') || label.includes('chase')) return 0.82;
  if (label.includes('brake') || label.includes('compress')) return 0.96;
  if (label.includes('steal') || label.includes('reach')) return 0.74;
  if (label.includes('drop')) return 0.68;
  return 0.48;
}
