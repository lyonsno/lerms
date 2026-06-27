import type { LermStateKind, Vec3 } from './contracts/first-vertical.ts';

export const SCHNOZ_MOTION_ADAPTER_SCHEMA = 'lerms.schnoz-motion-adapter.v0' as const;
export const SCHNOZ_MOTION_ADAPTER_INPUT_SCHEMA = 'lerms.schnoz-motion-adapter-input.v0' as const;
export const SCHNOZ_MOTION_ADAPTER_ROUTE = 'lerms/schnoz-motion-adapter/v0' as const;

export type MushfingerClipletPlaybackSampleEnvelope = {
  schema: 'kaminos.generated-motion-cliplet-playback-sample-envelope.v0';
  playback: {
    schema: 'kaminos.generated-motion-cliplet-playback-sample.v0';
    playbackId: string;
    sourceClipId: string;
    mode: string;
    t: number;
    wrappedTime: number;
    localTime: number;
    interpolation: number;
    segmentId: string;
    segmentIndex: number;
    labelGuess: string;
    sourceTime: number;
    sourceFrame: number;
    sourceRange: {
      startSourceFrame: number;
      endSourceFrame: number;
      sourceStartTime: number;
      sourceEndTime: number;
    };
  };
  motionSample: {
    root?: Vec3;
    attention?: Vec3;
    effort?: number;
    phase?: string;
    temporalSample?: {
      sourceFrame: number;
      time: number;
      phaseLabel: string;
      root: Vec3;
      chestRoot?: Vec3;
      handSpan?: number;
      stanceWidth?: number;
      bboxVolume?: number;
      bowCompression?: number;
    };
  };
  source?: {
    route?: string;
    model?: string;
    status?: string;
  };
};

export type SchnozMotionAdapterInput = {
  schema: typeof SCHNOZ_MOTION_ADAPTER_INPUT_SCHEMA;
  route: typeof SCHNOZ_MOTION_ADAPTER_ROUTE;
  gameplayState: LermStateKind;
  carryingGoinId?: string;
  targetGoinId?: string;
  hitStunMs?: number;
  mushfingerPlaybackSample: MushfingerClipletPlaybackSampleEnvelope;
};

export type SchnozMotionAdapterOutput = {
  schema: typeof SCHNOZ_MOTION_ADAPTER_SCHEMA;
  route: typeof SCHNOZ_MOTION_ADAPTER_ROUTE;
  sourceAuthority: 'mushfinger_cliplet_playback_sample';
  source: {
    schema: 'kaminos.generated-motion-cliplet-playback-sample.v0';
    playbackId: string;
    sourceClipId: string;
    segmentId: string;
    clipletLabel: string;
    sourceFrame: number;
    sourceRange: MushfingerClipletPlaybackSampleEnvelope['playback']['sourceRange'];
    sourceRoute?: string;
    sourceModel?: string;
    sourceStatus?: string;
  };
  gameplay: {
    state: LermStateKind;
    carryingGoinId?: string;
    targetGoinId?: string;
    hitStunMs?: number;
  };
  channels: {
    rootOffset: Vec3;
    heading: Vec3;
    bodySquash: number;
    bodyStretch: number;
    bodyLean: number;
    faceCueLead: number;
    envelopeRadius: number;
    carrierTetherAccent: number;
    hitCompression: number;
    footfallPulse: number;
    eventAccent: number;
    rerouteTargetPull: number;
  };
  evidenceSockets: readonly string[];
  authorityBoundary: {
    mushfingerOwns: readonly string[];
    lermsOwns: readonly string[];
  };
};

export function buildSchnozMotionAdapterInput({
  gameplayState,
  carryingGoinId,
  targetGoinId,
  hitStunMs,
  mushfingerPlaybackSample,
}: Omit<SchnozMotionAdapterInput, 'schema' | 'route'>): SchnozMotionAdapterInput {
  return {
    schema: SCHNOZ_MOTION_ADAPTER_INPUT_SCHEMA,
    route: SCHNOZ_MOTION_ADAPTER_ROUTE,
    gameplayState,
    carryingGoinId,
    targetGoinId,
    hitStunMs,
    mushfingerPlaybackSample,
  };
}

export function adaptMushfingerClipletToSchnozMotion(input: SchnozMotionAdapterInput): SchnozMotionAdapterOutput {
  if (input.schema !== SCHNOZ_MOTION_ADAPTER_INPUT_SCHEMA) {
    throw new Error(`Expected ${SCHNOZ_MOTION_ADAPTER_INPUT_SCHEMA}, got ${input.schema || 'missing schema'}`);
  }
  const envelope = input.mushfingerPlaybackSample;
  if (envelope.schema !== 'kaminos.generated-motion-cliplet-playback-sample-envelope.v0') {
    throw new Error(`Expected kaminos generated cliplet sample envelope, got ${envelope.schema || 'missing schema'}`);
  }
  if (envelope.playback.schema !== 'kaminos.generated-motion-cliplet-playback-sample.v0') {
    throw new Error(`Expected kaminos cliplet playback sample, got ${envelope.playback.schema || 'missing schema'}`);
  }

  const sample = envelope.motionSample;
  const temporal = sample.temporalSample;
  const root = temporal?.root ?? sample.root ?? [0, 0, 0];
  const attention = sample.attention ?? [root[0], root[1], root[2] + 1];
  const compression = clamp(Number(temporal?.bowCompression ?? 0), 0, 1);
  const effort = clamp(Number(sample.effort ?? (0.2 + compression * 0.68)), 0, 1.4);
  const interpolation = clamp(Number(envelope.playback.interpolation ?? 0), 0, 1);
  const label = envelope.playback.labelGuess;
  const state = input.gameplayState;
  const hitLike = state === 'hit_reacting' || state === 'tumbling' || label.includes('brake') || label.includes('compress');
  const carrierLike = !!input.carryingGoinId || state === 'carrying_goin' || state === 'fleeing_with_goin';
  const rerouteLike = !!input.targetGoinId || state === 'rerouting_to_goin';
  const footfall = Math.abs(Math.sin(interpolation * Math.PI * 2)) * clamp(0.35 + effort * 0.62, 0, 1.25);
  const heading = normalizeVec3([
    attention[0] - root[0],
    0,
    attention[2] - root[2],
  ], state === 'fleeing_with_goin' || label.includes('escape') ? [-1, 0, 0] : [1, 0, 0]);
  const hitCompression = hitLike ? clamp(0.32 + compression * 0.72 + Number(input.hitStunMs || 0) / 600, 0, 1.45) : compression * 0.24;
  const eventAccent = clamp(Math.max(hitCompression, carrierLike ? 0.34 + effort * 0.28 : 0, rerouteLike ? 0.62 : 0), 0, 1.35);

  return {
    schema: SCHNOZ_MOTION_ADAPTER_SCHEMA,
    route: SCHNOZ_MOTION_ADAPTER_ROUTE,
    sourceAuthority: 'mushfinger_cliplet_playback_sample',
    source: {
      schema: envelope.playback.schema,
      playbackId: envelope.playback.playbackId,
      sourceClipId: envelope.playback.sourceClipId,
      segmentId: envelope.playback.segmentId,
      clipletLabel: envelope.playback.labelGuess,
      sourceFrame: envelope.playback.sourceFrame,
      sourceRange: envelope.playback.sourceRange,
      sourceRoute: envelope.source?.route,
      sourceModel: envelope.source?.model,
      sourceStatus: envelope.source?.status,
    },
    gameplay: {
      state,
      carryingGoinId: input.carryingGoinId,
      targetGoinId: input.targetGoinId,
      hitStunMs: input.hitStunMs,
    },
    channels: {
      rootOffset: [
        clamp(root[2] * 0.22, -0.18, 0.18),
        clamp(root[1] * 0.08 + compression * 0.035, -0.08, 0.12),
        clamp(root[0] * 0.16, -0.1, 0.1),
      ],
      heading,
      bodySquash: clamp(1 - compression * 0.34 - hitCompression * 0.1, 0.54, 1.12),
      bodyStretch: clamp(1 + effort * 0.2 + footfall * 0.06 - compression * 0.06, 0.92, 1.42),
      bodyLean: clamp((temporal?.chestRoot?.[0] ?? 0) * 1.8 + heading[0] * effort * 0.08, -0.42, 0.42),
      faceCueLead: clamp(0.18 + effort * 0.34 + (rerouteLike ? 0.2 : 0), 0.12, 0.86),
      envelopeRadius: clamp(1 + effort * 0.08 + eventAccent * 0.08, 0.92, 1.28),
      carrierTetherAccent: carrierLike ? clamp(0.36 + effort * 0.42, 0.36, 1.05) : 0,
      hitCompression,
      footfallPulse: footfall,
      eventAccent,
      rerouteTargetPull: rerouteLike ? clamp(0.6 + effort * 0.28, 0.6, 1.0) : 0,
    },
    evidenceSockets: [
      'kaminos.generated-motion-cliplet-playback-sample-envelope.v0',
      'playback.sourceFrame',
      'playback.labelGuess',
      'motionSample.temporalSample.root',
      'motionSample.temporalSample.bowCompression',
      'motionSample.effort',
    ],
    authorityBoundary: {
      mushfingerOwns: [
        'sourceFrame',
        'sourceRange',
        'clipletLabel',
        'playbackTimeline',
        'sourceRoute',
        'sourceModel',
        'sourceStatus',
      ],
      lermsOwns: [
        'gameplayState',
        'goinCarryDropLaw',
        'rerouteDesire',
        'proxySchnozPoseChannels',
        'firstVerticalSourceTruth',
      ],
    },
  };
}

function normalizeVec3(value: Vec3, fallback: Vec3): Vec3 {
  const length = Math.hypot(value[0], value[1], value[2]);
  if (!Number.isFinite(length) || length < 1e-6) return fallback;
  return [value[0] / length, value[1] / length, value[2] / length];
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}
