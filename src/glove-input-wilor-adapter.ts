import {
  GLOVE_INPUT_FRAME_SCHEMA,
  GLOVE_INPUT_LIVE_REQUESTED_ROUTE,
  type FingerInput,
  type FingerName,
  type GloveInputFrame,
  type GloveInputSource,
  type ScreenPoint
} from './glove-well-command.ts';

export const WILOR_GLOVE_INPUT_PACKET_SCHEMA = 'perceptasia.wilor-mini-glove-input-packet.v0' as const;
export const GLOVE_INPUT_WILOR_LIVE_EFFECTIVE_ROUTE = 'native_wilor_mini_mlx_detector_sidecar_live' as const;
export const GLOVE_INPUT_WILOR_ADAPTER_CONFIG_ID = 'lerms-glove-input-wilor-mini-mlx-adapter-v0' as const;
export const HAND_STATE_FRAME_SCHEMA = 'hand-state.frame.v0' as const;
export const HAND_STATE_RUNTIME_STATE_SCHEMA = 'hand-state.runtime-state.v0' as const;
export const HAND_STATE_RUNTIME_ADAPTER_CONFIG_ID = 'lerms-glove-input-hand-state-runtime-adapter-v0' as const;

export interface WilorMiniGloveInputPacket {
  schema?: typeof WILOR_GLOVE_INPUT_PACKET_SCHEMA | string;
  frameId: string;
  timestampMs: number;
  source: {
    requestedRoute: string;
    effectiveRoute: string;
    backend: string;
    model?: string;
    configId: string;
    fallbackReason?: string | null;
  };
  timing: {
    cameraFrameAgeMs: number;
    modelLatencyMs?: number;
    publishAgeMs?: number;
    roundTripMs?: number;
  };
  coordinateFrame: {
    space: 'screen_normalized' | 'image_pixels';
    origin: 'top_left';
    handedness: 'operator_unmirrored' | string;
    imageSize?: {
      width: number;
      height: number;
    };
  };
  hand: {
    handedness: 'right' | 'left' | 'unknown';
    confidence: number;
    palmCenter?: WilorLandmarkPoint;
    landmarks: WilorLandmarkInput;
  };
  gestures?: {
    pinkyHoldMs?: number;
  };
}

export interface WilorLandmarkPoint {
  x: number;
  y: number;
  z?: number;
}

export interface WilorLandmarkRow extends WilorLandmarkPoint {
  id?: string;
  name?: string;
  index?: number;
}

export type WilorLandmarkInput = Record<string, WilorLandmarkPoint> | readonly WilorLandmarkRow[];

export type HandStateInputAuthority = GloveInputSource['authority'];

export interface HandStateRuntimeStateEnvelope {
  schema?: typeof HAND_STATE_RUNTIME_STATE_SCHEMA | string;
  runtimeOwner: string;
  stateDir?: string;
  status: string;
  fetchedAtMs: number;
  maxAgeMs: number;
  handInputSourceAuthority: HandStateInputAuthority | string;
  handInputFreshness: string;
  handInputRequestedRoute: string;
  handInputEffectiveRoute: string;
  handInputConfigId: string;
  handInputFallbackReason?: string | null;
  frame: HandStateFrame;
  clientProjectImports?: readonly string[];
}

export interface HandStateFrame {
  schema?: typeof HAND_STATE_FRAME_SCHEMA | string;
  producer?: {
    owner?: string;
    package?: string;
    version?: string;
    sessionId?: string | null;
    processId?: number | null;
    stateDir?: string | null;
  };
  source: {
    requestedRoute: string;
    effectiveRoute: string;
    backend: string;
    model?: string | null;
    detector?: string | null;
    deviceRoute?: string | null;
    dtypeRoute?: string | null;
    configId: string;
    fallbackReason?: string | null;
    rawSchema?: string | null;
    evidenceRoute?: string | null;
    rawEventSequence?: number | string | null;
    rawEventPath?: string | null;
  };
  authority: {
    sourceAuthority: HandStateInputAuthority | string;
    freshness: string;
    fallbackReason?: string | null;
    noLiveReason?: string | null;
    authorityNote?: string;
    promotes?: {
      liveGloveWellAuthority?: boolean;
      kaminosAcceptance?: boolean;
      firstVerticalTruth?: boolean;
      visualSmokeSuccess?: boolean;
    };
  };
  frame: {
    frameId: string;
    captureTimestampMs: number;
    ingestTimestampMs?: number | null;
    sourceVideoSize?: { width: number; height: number } | null;
    encodedSize?: { width: number; height: number } | null;
    frameAgeAtInferenceMs?: number | null;
  };
  timing: {
    cameraFrameAgeMs?: number | null;
    modelLatencyMs?: number | null;
    sidecarLoopLatencyMs?: number | null;
    publishAgeMs?: number | null;
    stateStreamAgeMs?: number | null;
    roundTripMs?: number | null;
  };
  coordinateFrame: {
    space: 'screen_normalized' | 'image_pixels' | string;
    origin: 'top_left' | string;
    handedness: 'operator_unmirrored' | string;
    depthPolicy: 'non_load_bearing' | string;
  };
  hand: {
    handedness: 'right' | 'left' | 'unknown' | string;
    confidence: number;
    palmCenter?: WilorLandmarkPoint | null;
    bbox?: unknown;
    landmarks: WilorLandmarkInput;
    keypoints3d?: unknown;
    palmBasis?: unknown;
    palmNormal?: unknown;
    openness?: unknown;
    pinch?: unknown;
    fist?: unknown;
    spread?: unknown;
  };
  mano?: unknown;
  diagnostics?: {
    noHand?: boolean;
    staleSkip?: boolean;
    hiddenFallback?: boolean;
    validationWarnings?: readonly string[];
    [key: string]: unknown;
  };
}

interface ResolvedLandmark {
  id: string;
  point: ScreenPoint;
  traceIds: string[];
}

type LandmarkLookup = Map<string, ResolvedLandmark>;

const LANDMARK_ALIASES: Record<string, readonly string[]> = {
  wrist: ['wrist', '0'],
  thumb_tip: ['thumb_tip', 'thumb-tip', 'thumbTip', 'THUMB_TIP', '4'],
  thumb_ip: ['thumb_ip', 'thumb-ip', 'thumbIp', 'THUMB_IP', '3'],
  index_mcp: ['index_mcp', 'index-mcp', 'indexMcp', 'INDEX_MCP', '5'],
  index_tip: ['index_tip', 'index-tip', 'indexTip', 'INDEX_TIP', '8'],
  middle_mcp: ['middle_mcp', 'middle-mcp', 'middleMcp', 'MIDDLE_MCP', '9'],
  middle_tip: ['middle_tip', 'middle-tip', 'middleTip', 'MIDDLE_TIP', '12'],
  ring_mcp: ['ring_mcp', 'ring-mcp', 'ringMcp', 'RING_MCP', '13'],
  ring_tip: ['ring_tip', 'ring-tip', 'ringTip', 'RING_TIP', '16'],
  pinky_mcp: ['pinky_mcp', 'pinky-mcp', 'pinkyMcp', 'PINKY_MCP', '17'],
  pinky_tip: ['pinky_tip', 'pinky-tip', 'pinkyTip', 'PINKY_TIP', '20']
};

export function adaptWilorMiniPacketToGloveInputFrame(packet: WilorMiniGloveInputPacket): GloveInputFrame {
  assertPacket(packet);
  const landmarks = resolveLandmarks(packet);
  const wrist = requireLandmark(landmarks, 'wrist');
  const palmCenter = packet.hand.palmCenter ? normalizePacketPoint(packet, packet.hand.palmCenter) : averagePoints([
    requireLandmark(landmarks, 'index_mcp').point,
    requireLandmark(landmarks, 'middle_mcp').point,
    requireLandmark(landmarks, 'ring_mcp').point,
    requireLandmark(landmarks, 'pinky_mcp').point
  ]);
  const fingers = buildFingers(landmarks, wrist.point);
  const pinch = buildPinchGesture(fingers.thumb, fingers.index);
  const pinkyAim = buildPinkyAimGesture(packet, fingers.pinky);
  const extensionScores = Object.values(fingers).map((finger) => finger.extensionScore);

  return {
    schema: GLOVE_INPUT_FRAME_SCHEMA,
    frameId: packet.frameId,
    timestampMs: packet.timestampMs,
    source: buildSource(packet),
    timing: {
      cameraFrameAgeMs: packet.timing.cameraFrameAgeMs,
      modelLatencyMs: packet.timing.modelLatencyMs,
      publishAgeMs: packet.timing.publishAgeMs,
      roundTripMs: packet.timing.roundTripMs
    },
    coordinateFrame: {
      space: 'screen_normalized',
      origin: 'top_left',
      handedness: 'operator_unmirrored',
      depthPolicy: 'non_load_bearing'
    },
    hand: {
      handedness: packet.hand.handedness,
      confidence: packet.hand.confidence,
      palmCenter,
      wrist: wrist.point
    },
    fingers,
    gestures: {
      pinch,
      pinkyAim,
      fist: {
        active: extensionScores.every((score) => score < 0.36),
        strength: round3(clamp(1 - average(extensionScores), 0, 1))
      },
      openPalm: {
        active: extensionScores.filter((score) => score > 0.56).length >= 3,
        strength: round3(clamp(average(extensionScores), 0, 1))
      }
    }
  };
}

export function adaptHandStateRuntimeStateToGloveInputFrame(envelope: HandStateRuntimeStateEnvelope): GloveInputFrame {
  assertRuntimeStateEnvelope(envelope);
  const frame = envelope.frame;
  const source = buildRuntimeSource(envelope);
  const packet = runtimeFrameToWilorShapedPacket(envelope, source);
  const landmarks = resolveLandmarks(packet);
  const wrist = requireLandmark(landmarks, 'wrist');
  const palmCenter = frame.hand.palmCenter ? normalizePacketPoint(packet, frame.hand.palmCenter) : averagePoints([
    requireLandmark(landmarks, 'index_mcp').point,
    requireLandmark(landmarks, 'middle_mcp').point,
    requireLandmark(landmarks, 'ring_mcp').point,
    requireLandmark(landmarks, 'pinky_mcp').point
  ]);
  const fingers = buildFingers(landmarks, wrist.point);
  const pinch = buildPinchGesture(fingers.thumb, fingers.index);
  const pinkyAim = buildPinkyAimGesture(packet, fingers.pinky);
  const extensionScores = Object.values(fingers).map((finger) => finger.extensionScore);

  return {
    schema: GLOVE_INPUT_FRAME_SCHEMA,
    frameId: frame.frame.frameId,
    timestampMs: frame.frame.captureTimestampMs,
    source,
    timing: {
      cameraFrameAgeMs: packet.timing.cameraFrameAgeMs,
      modelLatencyMs: packet.timing.modelLatencyMs,
      publishAgeMs: packet.timing.publishAgeMs,
      roundTripMs: packet.timing.roundTripMs
    },
    coordinateFrame: {
      space: 'screen_normalized',
      origin: 'top_left',
      handedness: 'operator_unmirrored',
      depthPolicy: 'non_load_bearing'
    },
    hand: {
      handedness: normalizeRuntimeHandedness(frame.hand.handedness),
      confidence: frame.hand.confidence,
      palmCenter,
      wrist: wrist.point
    },
    fingers,
    gestures: {
      pinch,
      pinkyAim,
      fist: {
        active: extensionScores.every((score) => score < 0.36),
        strength: round3(clamp(1 - average(extensionScores), 0, 1))
      },
      openPalm: {
        active: extensionScores.filter((score) => score > 0.56).length >= 3,
        strength: round3(clamp(average(extensionScores), 0, 1))
      }
    }
  };
}

function buildSource(packet: WilorMiniGloveInputPacket): GloveInputSource {
  const fellBack = packet.source.effectiveRoute !== GLOVE_INPUT_WILOR_LIVE_EFFECTIVE_ROUTE || Boolean(packet.source.fallbackReason);
  if (fellBack && !packet.source.fallbackReason) {
    throw new Error('fallback WiLoR glove input must include fallbackReason');
  }

  return {
    schema: 'lerms.source-truth.v0',
    authority: fellBack ? 'fallback' : 'live_simulation',
    route: GLOVE_INPUT_LIVE_REQUESTED_ROUTE,
    frameId: packet.frameId,
    timestampMs: packet.timestampMs,
    sampleAgeMs: Math.max(0, packet.timing.cameraFrameAgeMs),
    backend: packet.source.backend,
    model: packet.source.model,
    configId: GLOVE_INPUT_WILOR_ADAPTER_CONFIG_ID,
    producerConfigId: packet.source.configId,
    requestedRoute: packet.source.requestedRoute,
    effectiveRoute: packet.source.effectiveRoute,
    fallbackReason: packet.source.fallbackReason ?? null
  };
}

function buildRuntimeSource(envelope: HandStateRuntimeStateEnvelope): GloveInputSource {
  const frame = envelope.frame;
  const authority = normalizeRuntimeAuthority(envelope.handInputSourceAuthority);
  const sampleAgeMs = finite(frame.timing.stateStreamAgeMs) ?? finite(frame.timing.cameraFrameAgeMs) ?? finite(frame.frame.frameAgeAtInferenceMs) ?? 0;

  return {
    schema: 'lerms.source-truth.v0',
    authority,
    route: envelope.handInputRequestedRoute,
    frameId: frame.frame.frameId,
    timestampMs: frame.frame.captureTimestampMs,
    sampleAgeMs: Math.max(0, sampleAgeMs),
    backend: frame.source.backend,
    model: frame.source.model ?? undefined,
    configId: HAND_STATE_RUNTIME_ADAPTER_CONFIG_ID,
    producerConfigId: envelope.handInputConfigId,
    requestedRoute: envelope.handInputRequestedRoute,
    effectiveRoute: envelope.handInputEffectiveRoute,
    fallbackReason: envelope.handInputFallbackReason ?? frame.authority.fallbackReason ?? frame.source.fallbackReason ?? null
  };
}

function runtimeFrameToWilorShapedPacket(
  envelope: HandStateRuntimeStateEnvelope,
  source: GloveInputSource
): WilorMiniGloveInputPacket {
  const frame = envelope.frame;
  return {
    schema: WILOR_GLOVE_INPUT_PACKET_SCHEMA,
    frameId: frame.frame.frameId,
    timestampMs: frame.frame.captureTimestampMs,
    source: {
      requestedRoute: envelope.handInputRequestedRoute,
      effectiveRoute: envelope.handInputEffectiveRoute,
      backend: frame.source.backend,
      model: frame.source.model ?? undefined,
      configId: envelope.handInputConfigId,
      fallbackReason: source.fallbackReason
    },
    timing: {
      cameraFrameAgeMs: finite(frame.timing.cameraFrameAgeMs) ?? finite(frame.frame.frameAgeAtInferenceMs) ?? 0,
      modelLatencyMs: finite(frame.timing.modelLatencyMs) ?? undefined,
      publishAgeMs: finite(frame.timing.publishAgeMs) ?? undefined,
      roundTripMs: finite(frame.timing.roundTripMs) ?? undefined
    },
    coordinateFrame: {
      space: frame.coordinateFrame.space === 'image_pixels' ? 'image_pixels' : 'screen_normalized',
      origin: 'top_left',
      handedness: 'operator_unmirrored',
      imageSize: imageSizeFromRuntimeFrame(frame)
    },
    hand: {
      handedness: normalizeRuntimeHandedness(frame.hand.handedness),
      confidence: frame.hand.confidence,
      palmCenter: frame.hand.palmCenter ?? undefined,
      landmarks: frame.hand.landmarks
    }
  };
}

function assertRuntimeStateEnvelope(envelope: HandStateRuntimeStateEnvelope): void {
  if (envelope.schema !== HAND_STATE_RUNTIME_STATE_SCHEMA) {
    throw new Error(`hand-state runtime state schema must be ${HAND_STATE_RUNTIME_STATE_SCHEMA}`);
  }
  if (envelope.runtimeOwner !== 'hand-state-runtime') {
    throw new Error('hand-state runtime state runtimeOwner must be hand-state-runtime');
  }
  if (!envelope.handInputRequestedRoute || !envelope.handInputEffectiveRoute || !envelope.handInputConfigId) {
    throw new Error('hand-state runtime state requires requested route, effective route, and config id');
  }
  if (envelope.frame.schema !== HAND_STATE_FRAME_SCHEMA) {
    throw new Error(`hand-state frame schema must be ${HAND_STATE_FRAME_SCHEMA}`);
  }
  if (envelope.frame.producer?.owner !== undefined && envelope.frame.producer.owner !== 'hand-state-runtime') {
    throw new Error('hand-state frame producer owner must be hand-state-runtime');
  }
  if (envelope.frame.coordinateFrame.origin !== 'top_left') {
    throw new Error('hand-state frame coordinateFrame.origin must be top_left');
  }
  if (envelope.frame.coordinateFrame.handedness !== 'operator_unmirrored') {
    throw new Error('hand-state frame coordinateFrame.handedness must be operator_unmirrored');
  }
  if (envelope.frame.coordinateFrame.depthPolicy !== 'non_load_bearing') {
    throw new Error('hand-state frame coordinateFrame.depthPolicy must be non_load_bearing');
  }
  if (!Array.isArray(envelope.frame.hand.landmarks) && Object.keys(envelope.frame.hand.landmarks ?? {}).length === 0) {
    throw new Error('hand-state runtime state has no live hand landmarks');
  }
  if (Array.isArray(envelope.frame.hand.landmarks) && envelope.frame.hand.landmarks.length === 0) {
    throw new Error('hand-state runtime state has no live hand landmarks');
  }
  assertFinite(envelope.fetchedAtMs, 'fetchedAtMs');
  assertFinite(envelope.frame.frame.captureTimestampMs, 'frame.captureTimestampMs');
  if (envelope.frame.hand.confidence < 0.2) {
    throw new Error('hand-state runtime state hand confidence too low');
  }
  normalizeRuntimeAuthority(envelope.handInputSourceAuthority);
}

function normalizeRuntimeAuthority(authority: string): HandStateInputAuthority {
  if (
    authority === 'live_simulation' ||
    authority === 'synthetic_fixture' ||
    authority === 'visual_only' ||
    authority === 'stale_hold' ||
    authority === 'invalid' ||
    authority === 'fallback'
  ) {
    return authority;
  }
  throw new Error(`unsupported hand-state runtime authority ${authority}`);
}

function normalizeRuntimeHandedness(handedness: string): 'right' | 'left' | 'unknown' {
  if (handedness === 'right' || handedness === 'left') return handedness;
  return 'unknown';
}

function imageSizeFromRuntimeFrame(frame: HandStateFrame): { width: number; height: number } | undefined {
  const size = frame.frame.encodedSize ?? frame.frame.sourceVideoSize ?? undefined;
  if (!size || !Number.isFinite(size.width) || !Number.isFinite(size.height)) return undefined;
  return {
    width: size.width,
    height: size.height
  };
}

function buildFingers(landmarks: LandmarkLookup, wrist: ScreenPoint): Record<FingerName, FingerInput> {
  const referenceLength = Math.max(0.08, distance(wrist, requireLandmark(landmarks, 'middle_mcp').point));

  return {
    thumb: buildFinger('thumb', requireLandmark(landmarks, 'thumb_ip'), requireLandmark(landmarks, 'thumb_tip'), referenceLength),
    index: buildFinger('index', requireLandmark(landmarks, 'index_mcp'), requireLandmark(landmarks, 'index_tip'), referenceLength),
    middle: buildFinger('middle', requireLandmark(landmarks, 'middle_mcp'), requireLandmark(landmarks, 'middle_tip'), referenceLength),
    ring: buildFinger('ring', requireLandmark(landmarks, 'ring_mcp'), requireLandmark(landmarks, 'ring_tip'), referenceLength),
    pinky: buildFinger('pinky', requireLandmark(landmarks, 'pinky_mcp'), requireLandmark(landmarks, 'pinky_tip'), referenceLength)
  };
}

function buildFinger(
  name: FingerName,
  base: ResolvedLandmark,
  tip: ResolvedLandmark,
  referenceLength: number
): FingerInput {
  const rawDirection = subtractPoint(tip.point, base.point);
  const extensionScore = round3(clamp(distance(base.point, tip.point) / (referenceLength * (name === 'thumb' ? 0.85 : 1.05)), 0, 1));

  return {
    confidence: 1,
    extended: extensionScore >= (name === 'thumb' ? 0.45 : 0.55),
    extensionScore,
    tip: copyPoint(tip.point),
    base: copyPoint(base.point),
    direction: normalizePoint(rawDirection),
    sourceLandmarkIds: [...new Set([...base.traceIds, ...tip.traceIds])]
  };
}

function buildPinchGesture(thumb: FingerInput, index: FingerInput): GloveInputFrame['gestures']['pinch'] {
  const distanceNorm = distance(thumb.tip, index.tip);
  const strength = round3(clamp(1 - distanceNorm / 0.11, 0, 1));

  return {
    active: distanceNorm <= 0.07 && strength >= 0.35,
    strength,
    distanceNorm: round3(distanceNorm),
    distancePx: undefined,
    pair: ['thumb', 'index']
  };
}

function buildPinkyAimGesture(
  packet: WilorMiniGloveInputPacket,
  pinky: FingerInput
): GloveInputFrame['gestures']['pinkyAim'] {
  const strength = round3(clamp((pinky.extensionScore - 0.35) / 0.65, 0, 1));

  return {
    active: pinky.extended && strength >= 0.45,
    holdMs: packet.gestures?.pinkyHoldMs ?? 0,
    strength,
    origin: copyPoint(pinky.tip),
    direction: copyPoint(pinky.direction)
  };
}

function resolveLandmarks(packet: WilorMiniGloveInputPacket): LandmarkLookup {
  const byAlias = new Map<string, ResolvedLandmark>();

  if (Array.isArray(packet.hand.landmarks)) {
    packet.hand.landmarks.forEach((row, ordinal) => {
      const keys = [row.id, row.name, row.index === undefined ? undefined : String(row.index), String(ordinal)].filter(
        (key): key is string => Boolean(key)
      );
      addLandmark(byAlias, keys, normalizePacketPoint(packet, row));
    });
  } else {
    Object.entries(packet.hand.landmarks).forEach(([key, point]) => {
      addLandmark(byAlias, [key], normalizePacketPoint(packet, point));
    });
  }

  const canonical = new Map<string, ResolvedLandmark>();
  Object.entries(LANDMARK_ALIASES).forEach(([id, aliases]) => {
    const resolved = aliases.map((alias) => byAlias.get(alias)).find((row): row is ResolvedLandmark => Boolean(row));
    if (resolved) {
      canonical.set(id, {
        id,
        point: copyPoint(resolved.point),
        traceIds: [...new Set([id, ...resolved.traceIds])]
      });
    }
  });

  return canonical;
}

function addLandmark(landmarks: Map<string, ResolvedLandmark>, keys: readonly string[], point: ScreenPoint): void {
  const traceIds = [...new Set(keys)];
  for (const key of traceIds) {
    landmarks.set(key, {
      id: key,
      point,
      traceIds
    });
  }
}

function requireLandmark(landmarks: LandmarkLookup, id: string): ResolvedLandmark {
  const landmark = landmarks.get(id);
  if (!landmark) {
    throw new Error(`WiLoR glove input missing landmark ${id}`);
  }
  return landmark;
}

function normalizePacketPoint(packet: WilorMiniGloveInputPacket, point: WilorLandmarkPoint): ScreenPoint {
  assertFinite(point.x, 'landmark.x');
  assertFinite(point.y, 'landmark.y');

  if (packet.coordinateFrame.space === 'screen_normalized') {
    return {
      x: round3(point.x),
      y: round3(point.y)
    };
  }

  const size = packet.coordinateFrame.imageSize;
  if (!size || size.width <= 0 || size.height <= 0) {
    throw new Error('image_pixels WiLoR glove input requires coordinateFrame.imageSize');
  }

  return {
    x: round3(point.x / size.width),
    y: round3(point.y / size.height)
  };
}

function assertPacket(packet: WilorMiniGloveInputPacket): void {
  if (!packet.frameId) throw new Error('WiLoR glove input frameId is required');
  assertFinite(packet.timestampMs, 'timestampMs');
  assertFinite(packet.timing.cameraFrameAgeMs, 'timing.cameraFrameAgeMs');
  if (packet.timing.modelLatencyMs !== undefined) assertFinite(packet.timing.modelLatencyMs, 'timing.modelLatencyMs');
  if (packet.timing.publishAgeMs !== undefined) assertFinite(packet.timing.publishAgeMs, 'timing.publishAgeMs');
  if (packet.timing.roundTripMs !== undefined) assertFinite(packet.timing.roundTripMs, 'timing.roundTripMs');
  if (!packet.source.requestedRoute || !packet.source.effectiveRoute || !packet.source.backend || !packet.source.configId) {
    throw new Error('WiLoR glove input source requires requestedRoute, effectiveRoute, backend, and configId');
  }
  if (packet.coordinateFrame.origin !== 'top_left') {
    throw new Error('WiLoR glove input coordinateFrame.origin must be top_left');
  }
  if (packet.coordinateFrame.handedness !== 'operator_unmirrored') {
    throw new Error('WiLoR glove input coordinateFrame.handedness must be operator_unmirrored');
  }
  if (packet.hand.confidence < 0.2) {
    throw new Error('WiLoR glove input hand confidence too low');
  }
}

function averagePoints(points: readonly ScreenPoint[]): ScreenPoint {
  return {
    x: round3(average(points.map((point) => point.x))),
    y: round3(average(points.map((point) => point.y)))
  };
}

function average(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function copyPoint(point: ScreenPoint): ScreenPoint {
  return { x: point.x, y: point.y };
}

function subtractPoint(a: ScreenPoint, b: ScreenPoint): ScreenPoint {
  return {
    x: a.x - b.x,
    y: a.y - b.y
  };
}

function normalizePoint(point: ScreenPoint): ScreenPoint {
  const length = Math.hypot(point.x, point.y) || 1;
  return {
    x: round3(point.x / length),
    y: round3(point.y / length)
  };
}

function distance(a: ScreenPoint, b: ScreenPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function assertFinite(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be finite`);
  }
}

function finite(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
