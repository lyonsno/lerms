export const BROWSER_SMOKE_LIVE_BACKEND = 'native_wilor_mini_mlx_detector_sidecar_live' as const;

export type BrowserSmokeAuthority = 'live_simulation' | 'stale_hold' | 'fallback' | 'synthetic_fixture' | 'invalid';
export type BrowserSmokePhase = 'waiting' | 'priming' | 'aiming' | 'released';
export type BrowserSmokeStatusCode =
  | 'waiting'
  | 'tracking'
  | 'no_new_packet'
  | 'empty'
  | 'stale'
  | 'fallback'
  | 'synthetic'
  | 'replay'
  | 'invalid';

export interface BrowserSmokePoint {
  x: number;
  y: number;
}

export interface BrowserSmokeCacheSnapshot {
  schema: string;
  status: string;
  sequence: number;
  stored_at_ms: number | null;
  age_ms: number | null;
  event: BrowserSmokeHandEvent | null;
}

export interface BrowserSmokeHandEvent {
  schema?: string;
  source_backend?: string;
  effective_route?: string;
  timestamp?: number;
  frame_id?: string;
  handedness?: string;
  confidence?: number;
  video_size?: {
    width: number;
    height: number;
  };
  palm_center?: BrowserSmokePoint;
  landmarks_2d?: BrowserSmokePoint[];
  native_frame_timing?: {
    model_latency_ms?: number;
  };
  webcam_frame?: {
    visible?: boolean;
    synthetic?: boolean;
    width?: number;
    height?: number;
    frame_ref?: string;
  };
  debug?: {
    evidence_route?: string;
    model_route?: string;
    device_route?: string;
    telemetry?: {
      model_latency_ms?: number;
      frame_age_ms?: number;
    } | null;
  };
}

export interface BrowserSmokeAim {
  active: boolean;
  origin: BrowserSmokePoint;
  direction: BrowserSmokePoint;
  arcSamples: Array<BrowserSmokePoint & { t: number }>;
}

export interface BrowserSmokeGoin {
  id: string;
  state: 'held' | 'rolling' | 'settled';
  position: BrowserSmokePoint;
  velocity: BrowserSmokePoint;
  desireRadius: number;
}

export interface BrowserSmokeHandSkeletonSegment {
  from: number;
  to: number;
  start: BrowserSmokePoint;
  end: BrowserSmokePoint;
  group: 'palm' | 'thumb' | 'index' | 'middle' | 'ring' | 'pinky';
}

export interface BrowserSmokeHandSkeletonDebugPoint {
  id: 'wrist' | 'palm_center' | 'thumb_tip' | 'index_tip' | 'pinky_base' | 'pinky_tip';
  label: string;
  point: BrowserSmokePoint;
  landmarkIndex: number | null;
  role: 'context' | 'load_bearing';
}

export interface BrowserSmokeHandSkeleton {
  schema: 'lerms.glove-well-hand-skeleton-overlay.v0';
  visible: boolean;
  landmarkCount: number;
  landmarks: BrowserSmokePoint[];
  segments: BrowserSmokeHandSkeletonSegment[];
  debugPoints: BrowserSmokeHandSkeletonDebugPoint[];
  aimVector: {
    origin: BrowserSmokePoint;
    direction: BrowserSmokePoint;
  } | null;
}

export interface BrowserSmokeState {
  schema: 'lerms.glove-well-browser-smoke-state.v0';
  authority: BrowserSmokeAuthority;
  statusCode: BrowserSmokeStatusCode;
  phase: BrowserSmokePhase;
  source: {
    endpoint: string;
    sequence: number | null;
    frameId: string | null;
    effectiveRoute: string | null;
    backend: string | null;
    modelRoute: string | null;
    ageMs: number | null;
    cameraAgeMs: number | null;
    webcamSynthetic: boolean | null;
  };
  hand: {
    palmCenter: BrowserSmokePoint | null;
    thumbTip: BrowserSmokePoint | null;
    indexTip: BrowserSmokePoint | null;
    pinkyTip: BrowserSmokePoint | null;
    pinkyBase: BrowserSmokePoint | null;
    pinchDistance: number | null;
    pinchActive: boolean;
  };
  aim: BrowserSmokeAim;
  handSkeleton: BrowserSmokeHandSkeleton;
  goin: BrowserSmokeGoin;
  goins: BrowserSmokeGoin[];
  releaseCount: number;
  downgrades: string[];
  lastError: string | null;
}

export interface GloveWellHostPacketCapture {
  state: 'idle' | 'starting' | 'running' | 'complete' | 'failed';
  reportPath: string | null;
  filmstripPath: string | null;
  outDir?: string | null;
  error?: string | null;
}

export interface GloveWellKaminosWorkbenchBinding {
  schema: 'lerms.glove-well-kaminos-workbench-binding.v0';
  kaminos: {
    branchRef: 'cc/minion-lerms-crucible-descriptors-0706@19ad190';
    cartridgeId: 'lerms-terrarium';
    chamberId: 'lerms-underhill';
    crucibleId: 'glove-emitter';
    offerId: 'glove-emitter-native-host-smoke-offer';
    offerAuthority: 'gap_report_route';
    offerFreshness: 'waiting';
    outputClass: 'gap_report';
    operatorRouteQuery: string;
    sourceRef: 'worlds/lerms-terrarium/world.json#crucibles.glove-emitter.smokeOffers.glove-emitter-native-host-smoke-offer';
  };
  firstUse: {
    firstMove: 'choose_crucible';
    armature: 'native-host';
    handle: 'source-route';
    firing: 'glove-well-native-host-source-packet';
    receipt: 'glove-receipt';
  };
  sourceBridge: {
    producerDiaulos: 'greedy-glove-fucker';
    packetSchema: 'lerms.glove-well-host-packet.v0';
    packetRoute: 'lerms/glove-well/host-packet';
    hostSurfaceSchema: 'lerms.glove-well-host-surface.v0';
    sourceTruthAuthority: 'lerms.gloveWellBrowserSmokeState';
    livePacketEndpoint: string | null;
    requestedSourceUrl: string | null;
  };
  receipt: {
    expectedSchema: 'kaminos.forge-host.smoke-receipt.v0';
    requiredOfferId: 'glove-emitter-native-host-smoke-offer';
    currentOutputClass: 'gap_report';
    graduationMode: 'extract_shared_runtime';
    visualAcceptance: 'not_claimed_by_source_packet';
  };
  downgrades: Array<
    | 'kaminos_offer_authority_gap_report_route'
    | 'native_kaminos_host_not_verified'
    | 'forge_host_receipt_not_source_truth'
  >;
}

export interface GloveWellHostPacketOptions {
  sourceUrl?: string | null;
  generatedAtMs?: number | null;
  capture?: GloveWellHostPacketCapture | null;
}

export interface GloveWellHostPacket {
  schema: 'lerms.glove-well-host-packet.v0';
  route: 'lerms/glove-well/host-packet';
  hostCandidate: {
    kind: 'kaminos_native_host_candidate';
    hostId: 'glove-well';
    hostLabel: 'Glove Well';
    requestedAdapter: 'glove-well';
  };
  workbenchBinding: GloveWellKaminosWorkbenchBinding;
  source: {
    producerDiaulos: 'greedy-glove-fucker';
    authority: BrowserSmokeAuthority;
    sourceTruthAuthority: 'lerms.gloveWellBrowserSmokeState';
    endpoint: string;
    sourceUrl: string | null;
    sequence: number | null;
    frameId: string | null;
    backend: string | null;
    effectiveRoute: string | null;
    modelRoute: string | null;
    webcamSynthetic: boolean | null;
    generatedAtMs: number | null;
  };
  freshness: {
    status: 'fresh' | 'stale' | 'fallback' | 'synthetic_fixture' | 'invalid' | 'waiting';
    ageMs: number | null;
    cameraAgeMs: number | null;
    budgetMs: number;
  };
  coordinateFrame: {
    space: 'operator_visible_webcam_mirrored_screen_normalized';
    origin: 'top_left';
    xRange: readonly [0, 1];
    yRange: readonly [0, 1];
    depthLoadBearing: false;
  };
  gloveWell: {
    phase: BrowserSmokePhase;
    statusCode: BrowserSmokeStatusCode;
    releaseCount: number;
    aim: BrowserSmokeAim;
    hand: BrowserSmokeState['hand'];
  };
  handSkeleton: BrowserSmokeHandSkeleton;
  goins: BrowserSmokeGoin[];
  lermDesireHints: Array<{
    schema: 'lerms.glove-well-host-desire-hint.v0';
    lermId: string;
    targetGoinId: string;
    target: BrowserSmokePoint;
    pull: number;
    radius: number;
    reason: 'rolling_goin_lure' | 'held_goin_attention';
  }>;
  surface: GloveWellHostSurface;
  capture: {
    state: GloveWellHostPacketCapture['state'];
    reportPath: string | null;
    filmstripPath: string | null;
    outDir: string | null;
    error: string | null;
  };
  downgrades: string[];
  rejectedDebugSurfaces: Array<{
    surface: string;
    label: string;
    acceptanceSurface: false;
    reason: string;
  }>;
  custody: {
    greedyOwns: string[];
    kaminosOwns: string[];
    palmDaddyOwns: string[];
  };
}

export type GloveWellHostSurfacePrimitiveRole =
  | 'wealth_source'
  | 'well_to_hand_pull'
  | 'hand_skeleton_bone'
  | 'hand_debug_point'
  | 'aim_arc_sample'
  | 'held_goin'
  | 'rolling_goin'
  | 'settled_goin'
  | 'lerm_desire_marker'
  | 'lerm_desire_link'
  | 'source_badge'
  | 'capture_status';

export interface GloveWellHostSurfaceLayer {
  id: 'glove-well' | 'hand-tracking' | 'goins' | 'lerm-desire' | 'source-truth' | 'capture';
  label: string;
  sourceOwned: boolean;
}

export interface GloveWellHostSurfacePrimitive {
  id: string;
  layerId: GloveWellHostSurfaceLayer['id'];
  kind: 'disk' | 'ellipse' | 'line' | 'point' | 'badge';
  role: GloveWellHostSurfacePrimitiveRole;
  sourceRef: string;
  color: string;
  center?: BrowserSmokePoint;
  start?: BrowserSmokePoint;
  end?: BrowserSmokePoint;
  radius?: number;
  radiusX?: number;
  radiusY?: number;
  text?: string;
  alpha?: number;
}

export interface GloveWellHostSurface {
  schema: 'lerms.glove-well-host-surface.v0';
  surfaceId: 'glove-well-native-smoke';
  hostRouteExpectation: 'kaminos/glove-well-host';
  coordinateFrame: GloveWellHostPacket['coordinateFrame'];
  layers: GloveWellHostSurfaceLayer[];
  primitives: GloveWellHostSurfacePrimitive[];
  statusBadges: Array<{
    id: 'authority' | 'freshness' | 'phase' | 'route' | 'capture';
    label: string;
    value: string;
    authorityBearing: boolean;
  }>;
  controls: Array<{
    id: 'capture-filmstrip' | 'open-live-hand' | 'stop-live-hand';
    label: string;
    sourceOwned: boolean;
    reason: string;
  }>;
  witnessExpectations: {
    expectedHostId: 'glove-well';
    expectedPacketSchema: 'lerms.glove-well-host-packet.v0';
    expectedPacketRoute: 'lerms/glove-well/host-packet';
    requiredDowngrades: string[];
    requiredPrimitiveRoles: GloveWellHostSurfacePrimitiveRole[];
    requiredSourceRows: string[];
  };
}

export interface BuildBrowserSmokeStateOptions {
  previous: BrowserSmokeState | null;
  cache: BrowserSmokeCacheSnapshot | null;
  nowMs: number;
  endpoint?: string;
  maxCacheAgeMs?: number;
}

const DEFAULT_ENDPOINT = '/kaminos-hand-control-sidecar-event';

export function buildInitialGloveWellBrowserSmokeState(endpoint = DEFAULT_ENDPOINT): BrowserSmokeState {
  const goin: BrowserSmokeGoin = {
    id: 'primed-goin-001',
    state: 'held',
    position: { x: 0.5, y: 0.5 },
    velocity: { x: 0, y: 0 },
    desireRadius: 0
  };
  return {
    schema: 'lerms.glove-well-browser-smoke-state.v0',
    authority: 'stale_hold',
    statusCode: 'waiting',
    phase: 'waiting',
    source: {
      endpoint,
      sequence: null,
      frameId: null,
      effectiveRoute: null,
      backend: null,
      modelRoute: null,
      ageMs: null,
      cameraAgeMs: null,
      webcamSynthetic: null
    },
    hand: {
      palmCenter: null,
      thumbTip: null,
      indexTip: null,
      pinkyTip: null,
      pinkyBase: null,
      pinchDistance: null,
      pinchActive: false
    },
    aim: {
      active: false,
      origin: { x: 0.5, y: 0.5 },
      direction: { x: 0.7, y: -0.45 },
      arcSamples: buildArcSamples({ x: 0.5, y: 0.5 }, normalize({ x: 0.7, y: -0.45 }))
    },
    handSkeleton: buildEmptyHandSkeleton(),
    goin,
    goins: [goin],
    releaseCount: 0,
    downgrades: ['waiting_for_kaminos_event_cache'],
    lastError: null
  };
}

export function buildGloveWellHostPacket(state: BrowserSmokeState, options: GloveWellHostPacketOptions = {}): GloveWellHostPacket {
  const capture = normalizeHostPacketCapture(options.capture ?? null);
  const goins = worldGoins(state).map((goin) => cloneGoin(goin));
  const downgrades = uniqueStrings([
    ...state.downgrades,
    'local_browser_smoke_not_native_kaminos_host',
    'visual_capture_not_source_truth',
    ...(capture.state === 'complete' ? [] : ['browser_smoke_capture_not_complete'])
  ]);
  const lermDesireHints = buildHostPacketDesireHints(goins);
  const coordinateFrame = {
    space: 'operator_visible_webcam_mirrored_screen_normalized' as const,
    origin: 'top_left' as const,
    xRange: [0, 1] as const,
    yRange: [0, 1] as const,
    depthLoadBearing: false as const
  };
  const sourceUrl = options.sourceUrl ?? null;
  const workbenchBinding = buildGloveWellKaminosWorkbenchBinding({
    endpoint: state.source.endpoint,
    sourceUrl
  });

  return {
    schema: 'lerms.glove-well-host-packet.v0',
    route: 'lerms/glove-well/host-packet',
    hostCandidate: {
      kind: 'kaminos_native_host_candidate',
      hostId: 'glove-well',
      hostLabel: 'Glove Well',
      requestedAdapter: 'glove-well'
    },
    workbenchBinding,
    source: {
      producerDiaulos: 'greedy-glove-fucker',
      authority: state.authority,
      sourceTruthAuthority: 'lerms.gloveWellBrowserSmokeState',
      endpoint: state.source.endpoint,
      sourceUrl,
      sequence: state.source.sequence,
      frameId: state.source.frameId,
      backend: state.source.backend,
      effectiveRoute: state.source.effectiveRoute,
      modelRoute: state.source.modelRoute,
      webcamSynthetic: state.source.webcamSynthetic,
      generatedAtMs: finite(options.generatedAtMs) ?? null
    },
    freshness: {
      status: hostPacketFreshnessStatus(state),
      ageMs: state.source.ageMs,
      cameraAgeMs: state.source.cameraAgeMs,
      budgetMs: 180
    },
    coordinateFrame,
    gloveWell: {
      phase: state.phase,
      statusCode: state.statusCode,
      releaseCount: state.releaseCount,
      aim: cloneAim(state.aim),
      hand: cloneHand(state.hand)
    },
    handSkeleton: cloneHandSkeleton(state.handSkeleton),
    goins,
    lermDesireHints,
    surface: buildGloveWellHostSurface({ state, goins, lermDesireHints, capture, downgrades, coordinateFrame }),
    capture,
    downgrades,
    rejectedDebugSurfaces: [
      {
        surface: 'local_lerms_browser_smoke',
        label: 'Local LERMS browser smoke',
        acceptanceSurface: false,
        reason: 'useful operator/debug surface, but not the native Kaminos Glove Well host acceptance surface'
      },
      {
        surface: 'preview_bench_smoke_offer_card',
        label: 'Preview Bench smoke-offer card',
        acceptanceSurface: false,
        reason: 'useful evidence card, but it does not replace the operator scene where live goin throwing inhabits Underhill'
      }
    ],
    custody: {
      greedyOwns: ['gloveWellCommandTruth', 'goinObjecthoodTruth', 'goinThrowRollDesireLaw', 'sourceOwnedHostPacket'],
      kaminosOwns: ['native host display', 'camera witness mechanics', 'host-surface adapter validation'],
      palmDaddyOwns: ['firstVerticalSourceTruthAcceptance']
    }
  };
}

export function buildGloveWellBrowserSmokeState({
  previous,
  cache,
  nowMs,
  endpoint = DEFAULT_ENDPOINT,
  maxCacheAgeMs = 180
}: BuildBrowserSmokeStateOptions): BrowserSmokeState {
  const prior = previous ?? buildInitialGloveWellBrowserSmokeState(endpoint);
  const advancedGoins = advanceGoins(worldGoins(prior), nowMs);
  const activeGoin = pickActiveGoin(advancedGoins, prior.goin);

  if (!cache) {
    return degraded(prior, advancedGoins, endpoint, 'stale_hold', 'empty', ['kaminos_event_cache_missing'], 'missing Kaminos cache snapshot');
  }

  if (cache.status !== 'stored' || !cache.event) {
    if (cache.status === 'empty' && prior.source.sequence !== null && cache.sequence === prior.source.sequence) {
      return {
        ...prior,
        statusCode: prior.statusCode === 'tracking' ? 'no_new_packet' : prior.statusCode,
        source: {
          ...prior.source,
          endpoint,
          sequence: cache.sequence
        },
        goin: activeGoin,
        goins: advancedGoins,
        downgrades: prior.statusCode === 'tracking' ? ['kaminos_event_cache_no_new_packet'] : prior.downgrades,
        lastError: prior.statusCode === 'tracking' ? 'waiting for a newer Kaminos hand-control packet' : prior.lastError
      };
    }
    return degraded(withSequence(prior, cache, endpoint), advancedGoins, endpoint, 'stale_hold', 'empty', ['kaminos_event_cache_empty'], 'Kaminos event cache is empty');
  }

  if (prior.source.sequence !== null && cache.sequence <= prior.source.sequence && prior.statusCode !== 'empty') {
    return degraded(withSequence(prior, cache, endpoint), advancedGoins, endpoint, 'stale_hold', 'replay', ['kaminos_event_cache_non_monotonic'], 'Kaminos event cache sequence did not advance');
  }

  if (cache.age_ms === null || cache.age_ms > maxCacheAgeMs) {
    return degraded(withSequence(prior, cache, endpoint), advancedGoins, endpoint, 'stale_hold', 'stale', ['kaminos_event_cache_stale'], 'Kaminos event cache is stale');
  }

  const event = cache.event;
  const effectiveRoute = event.debug?.evidence_route ?? event.effective_route ?? event.source_backend ?? null;
  const backend = event.source_backend ?? null;
  const sourceBase = {
    endpoint,
    sequence: cache.sequence,
    frameId: event.frame_id ?? null,
    effectiveRoute,
    backend,
    modelRoute: event.debug?.model_route ?? null,
    ageMs: cache.age_ms,
    cameraAgeMs: finite(event.debug?.telemetry?.frame_age_ms) ?? cache.age_ms,
    webcamSynthetic: event.webcam_frame?.synthetic ?? null
  };

  if (event.schema !== 'perceptasia.hand-control.v0') {
    return degraded({ ...prior, source: sourceBase }, advancedGoins, endpoint, 'invalid', 'invalid', ['kaminos_event_cache_wrong_schema'], 'Kaminos event schema is not perceptasia.hand-control.v0');
  }

  if (backend !== BROWSER_SMOKE_LIVE_BACKEND || effectiveRoute !== BROWSER_SMOKE_LIVE_BACKEND) {
    return degraded({ ...prior, source: sourceBase }, advancedGoins, endpoint, 'fallback', 'fallback', ['kaminos_event_cache_non_live_route'], 'Kaminos event is not from the live WiLoR-MLX route');
  }

  if (event.webcam_frame?.visible !== true || event.webcam_frame.synthetic !== false) {
    return degraded({ ...prior, source: sourceBase }, advancedGoins, endpoint, 'synthetic_fixture', 'synthetic', ['kaminos_event_cache_synthetic_webcam'], 'Kaminos event webcam frame is synthetic or not visible');
  }

  const sourceLandmarks = event.landmarks_2d ?? [];
  if (sourceLandmarks.length < 21) {
    return degraded({ ...prior, source: sourceBase }, advancedGoins, endpoint, 'invalid', 'invalid', ['kaminos_event_cache_missing_landmarks'], 'Kaminos event has fewer than 21 landmarks');
  }

  const landmarks = sourceLandmarks.map((point) => mirrorOperatorX(point));
  const wrist = landmarks[0];
  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];
  const pinkyBase = landmarks[17];
  const pinkyTip = landmarks[20];
  const palmCenter = mirrorOperatorX(event.palm_center ?? average([sourceLandmarks[5], sourceLandmarks[9], sourceLandmarks[13], sourceLandmarks[17]]));
  const pinchDistance = distance(thumbTip, indexTip);
  const pinchActive = pinchDistance <= 0.07;
  const pinkyDirection = normalize(subtract(pinkyTip, pinkyBase));
  const pinkyLength = distance(pinkyTip, pinkyBase);
  const referenceLength = Math.max(0.08, distance(wrist, landmarks[9]));
  const pinkyActive = pinkyLength / referenceLength >= 0.7;
  const skeletonBase = buildHandSkeleton({
    landmarks,
    palmCenter,
    aimVector: null
  });

  let phase: BrowserSmokePhase = 'waiting';
  let aim = prior.aim;
  let handSkeleton = skeletonBase;
  let goin = activeGoin;
  let goins = advancedGoins;
  let releaseCount = prior.releaseCount;

  if (pinchActive && (prior.phase === 'priming' || prior.phase === 'aiming') && pinkyActive) {
    phase = 'aiming';
    aim = {
      active: true,
      origin: pinkyTip,
      direction: pinkyDirection,
      arcSamples: buildArcSamples(pinkyTip, pinkyDirection)
    };
    handSkeleton = buildHandSkeleton({
      landmarks,
      palmCenter,
      aimVector: {
        origin: aim.origin,
        direction: aim.direction
      }
    });
    goin = buildHeldGoin(palmCenter, releaseCount + 1);
    goins = [...advancedGoins.filter((candidate) => candidate.state !== 'held'), goin];
  } else if (pinchActive) {
    phase = 'priming';
    goin = buildHeldGoin(palmCenter, releaseCount + 1);
    goins = [...advancedGoins.filter((candidate) => candidate.state !== 'held'), goin];
  } else if (!pinchActive && (prior.phase === 'aiming' || prior.phase === 'released')) {
    phase = 'released';
    releaseCount = prior.phase === 'released' ? prior.releaseCount : prior.releaseCount + 1;
    if (prior.phase === 'released') {
      goin = pickRollingGoin(advancedGoins, activeGoin);
      goins = advancedGoins;
    } else {
      goin = {
        id: `launched-goin-${String(releaseCount).padStart(3, '0')}`,
        state: 'rolling',
        position: aim.origin,
        velocity: {
          x: round3(aim.direction.x * 0.022),
          y: round3(aim.direction.y * 0.022)
        },
        desireRadius: 0.18
      };
      goins = [...advancedGoins.filter((candidate) => candidate.state !== 'held'), goin];
    }
  } else {
    phase = 'waiting';
  }

  return {
    schema: 'lerms.glove-well-browser-smoke-state.v0',
    authority: 'live_simulation',
    statusCode: 'tracking',
    phase,
    source: sourceBase,
    hand: {
      palmCenter,
      thumbTip,
      indexTip,
      pinkyTip,
      pinkyBase,
      pinchDistance: round3(pinchDistance),
      pinchActive
    },
    aim,
    handSkeleton,
    goin,
    goins,
    releaseCount,
    downgrades: [],
    lastError: null
  };
}

function buildHeldGoin(position: BrowserSmokePoint, ordinal: number): BrowserSmokeGoin {
  return {
    id: `primed-goin-${String(ordinal).padStart(3, '0')}`,
    state: 'held',
    position,
    velocity: { x: 0, y: 0 },
    desireRadius: 0
  };
}

function buildGloveWellKaminosWorkbenchBinding({
  endpoint,
  sourceUrl
}: {
  endpoint: string | null;
  sourceUrl: string | null;
}): GloveWellKaminosWorkbenchBinding {
  return {
    schema: 'lerms.glove-well-kaminos-workbench-binding.v0',
    kaminos: {
      branchRef: 'cc/minion-lerms-crucible-descriptors-0706@19ad190',
      cartridgeId: 'lerms-terrarium',
      chamberId: 'lerms-underhill',
      crucibleId: 'glove-emitter',
      offerId: 'glove-emitter-native-host-smoke-offer',
      offerAuthority: 'gap_report_route',
      offerFreshness: 'waiting',
      outputClass: 'gap_report',
      operatorRouteQuery:
        'kaminos_forge_host=live&world_chamber=lerms-underhill&world_cartridge=lerms-terrarium&world_crucible=glove-emitter&forge_host_smoke_offer=glove-emitter-native-host-smoke-offer',
      sourceRef: 'worlds/lerms-terrarium/world.json#crucibles.glove-emitter.smokeOffers.glove-emitter-native-host-smoke-offer'
    },
    firstUse: {
      firstMove: 'choose_crucible',
      armature: 'native-host',
      handle: 'source-route',
      firing: 'glove-well-native-host-source-packet',
      receipt: 'glove-receipt'
    },
    sourceBridge: {
      producerDiaulos: 'greedy-glove-fucker',
      packetSchema: 'lerms.glove-well-host-packet.v0',
      packetRoute: 'lerms/glove-well/host-packet',
      hostSurfaceSchema: 'lerms.glove-well-host-surface.v0',
      sourceTruthAuthority: 'lerms.gloveWellBrowserSmokeState',
      livePacketEndpoint: endpoint,
      requestedSourceUrl: sourceUrl
    },
    receipt: {
      expectedSchema: 'kaminos.forge-host.smoke-receipt.v0',
      requiredOfferId: 'glove-emitter-native-host-smoke-offer',
      currentOutputClass: 'gap_report',
      graduationMode: 'extract_shared_runtime',
      visualAcceptance: 'not_claimed_by_source_packet'
    },
    downgrades: [
      'kaminos_offer_authority_gap_report_route',
      'native_kaminos_host_not_verified',
      'forge_host_receipt_not_source_truth'
    ]
  };
}

function hostPacketFreshnessStatus(state: BrowserSmokeState): GloveWellHostPacket['freshness']['status'] {
  if (state.authority === 'live_simulation' && state.statusCode === 'tracking') return 'fresh';
  if (state.authority === 'fallback') return 'fallback';
  if (state.authority === 'synthetic_fixture') return 'synthetic_fixture';
  if (state.authority === 'invalid') return 'invalid';
  if (state.statusCode === 'waiting' || state.statusCode === 'empty') return 'waiting';
  return 'stale';
}

function normalizeHostPacketCapture(capture: GloveWellHostPacketCapture | null): GloveWellHostPacket['capture'] {
  return {
    state: capture?.state ?? 'idle',
    reportPath: capture?.reportPath ?? null,
    filmstripPath: capture?.filmstripPath ?? null,
    outDir: capture?.outDir ?? null,
    error: capture?.error ?? null
  };
}

function buildHostPacketDesireHints(goins: BrowserSmokeGoin[]): GloveWellHostPacket['lermDesireHints'] {
  const lure = goins.find((goin) => goin.state === 'rolling') ?? goins.find((goin) => goin.state === 'held');
  if (!lure) return [];
  const reason = lure.state === 'rolling' ? 'rolling_goin_lure' : 'held_goin_attention';
  const pull = lure.state === 'rolling' ? 0.84 : 0.26;
  return ['nearby-red-lerm-001', 'nearby-red-lerm-002', 'nearby-red-lerm-003'].map((lermId, index) => ({
    schema: 'lerms.glove-well-host-desire-hint.v0',
    lermId,
    targetGoinId: lure.id,
    target: { ...lure.position },
    pull: round3(Math.max(0.08, pull - index * 0.11)),
    radius: round3(Math.max(0.08, lure.desireRadius || 0.12)),
    reason
  }));
}

function buildGloveWellHostSurface({
  state,
  goins,
  lermDesireHints,
  capture,
  downgrades,
  coordinateFrame
}: {
  state: BrowserSmokeState;
  goins: BrowserSmokeGoin[];
  lermDesireHints: GloveWellHostPacket['lermDesireHints'];
  capture: GloveWellHostPacket['capture'];
  downgrades: string[];
  coordinateFrame: GloveWellHostPacket['coordinateFrame'];
}): GloveWellHostSurface {
  const primitives: GloveWellHostSurfacePrimitive[] = [
    {
      id: 'glove-well-core',
      layerId: 'glove-well',
      kind: 'ellipse',
      role: 'wealth_source',
      sourceRef: 'gloveWell.phase',
      center: { x: 0.18, y: 0.65 },
      radiusX: 0.12,
      radiusY: 0.09,
      color: '#f4c64f'
    }
  ];

  if (state.hand.palmCenter && (state.phase === 'priming' || state.phase === 'aiming')) {
    primitives.push({
      id: 'glove-well-pull-to-hand',
      layerId: 'glove-well',
      kind: 'line',
      role: 'well_to_hand_pull',
      sourceRef: 'hand.palmCenter',
      start: { x: 0.18, y: 0.65 },
      end: { ...state.hand.palmCenter },
      color: '#ffe789',
      alpha: 0.55
    });
  }

  state.handSkeleton.segments.forEach((segment, index) => {
    primitives.push({
      id: `hand-bone-${String(index).padStart(2, '0')}-${segment.from}-${segment.to}`,
      layerId: 'hand-tracking',
      kind: 'line',
      role: 'hand_skeleton_bone',
      sourceRef: `handSkeleton.segments[${index}]`,
      start: { ...segment.start },
      end: { ...segment.end },
      color: segment.group === 'pinky' || segment.group === 'thumb' ? '#82e2be' : '#5ba88f',
      alpha: segment.group === 'palm' ? 0.45 : 0.72
    });
  });

  state.handSkeleton.debugPoints.forEach((debugPoint) => {
    primitives.push({
      id: `hand-debug-${debugPoint.id}`,
      layerId: 'hand-tracking',
      kind: 'point',
      role: 'hand_debug_point',
      sourceRef: `handSkeleton.debugPoints.${debugPoint.id}`,
      center: { ...debugPoint.point },
      radius: debugPoint.role === 'load_bearing' ? 0.012 : 0.008,
      text: debugPoint.label,
      color: debugPoint.role === 'load_bearing' ? '#ffe789' : '#dfe7ff'
    });
  });

  if (state.aim.active || state.phase === 'released') {
    state.aim.arcSamples.forEach((sample, index) => {
      primitives.push({
        id: `aim-arc-${String(index + 1).padStart(2, '0')}`,
        layerId: 'hand-tracking',
        kind: 'point',
        role: 'aim_arc_sample',
        sourceRef: `gloveWell.aim.arcSamples[${index}]`,
        center: { x: sample.x, y: sample.y },
        radius: 0.006 + index * 0.0006,
        color: '#dfe7ff',
        alpha: 0.5 + index * 0.06
      });
    });
  }

  goins.forEach((goin) => {
    primitives.push({
      id: `goin-${goin.id}`,
      layerId: 'goins',
      kind: 'ellipse',
      role: goin.state === 'held' ? 'held_goin' : goin.state === 'rolling' ? 'rolling_goin' : 'settled_goin',
      sourceRef: `goins.${goin.id}`,
      center: { ...goin.position },
      radiusX: goin.state === 'held' ? 0.018 : 0.026,
      radiusY: goin.state === 'held' ? 0.015 : 0.022,
      color: goin.state === 'held' ? '#ffe789' : '#f4c64f'
    });
  });

  lermDesireHints.forEach((hint, index) => {
    const origin = lermMarkerOrigin(index);
    primitives.push({
      id: `lerm-marker-${hint.lermId}`,
      layerId: 'lerm-desire',
      kind: 'disk',
      role: 'lerm_desire_marker',
      sourceRef: `lermDesireHints.${hint.lermId}`,
      center: origin,
      radius: 0.014,
      color: ['#ce4b4b', '#b43d5c', '#e06548'][index] ?? '#ce4b4b'
    });
    primitives.push({
      id: `lerm-desire-link-${hint.lermId}-${hint.targetGoinId}`,
      layerId: 'lerm-desire',
      kind: 'line',
      role: 'lerm_desire_link',
      sourceRef: `lermDesireHints.${hint.lermId}.target`,
      start: origin,
      end: { ...hint.target },
      color: '#ffe789',
      alpha: round3(hint.pull)
    });
  });

  primitives.push(
    {
      id: 'source-authority-badge',
      layerId: 'source-truth',
      kind: 'badge',
      role: 'source_badge',
      sourceRef: 'source.authority',
      center: { x: 0.035, y: 0.04 },
      text: `authority: ${state.authority}`,
      color: sourceBadgeColor(state.authority)
    },
    {
      id: 'source-freshness-badge',
      layerId: 'source-truth',
      kind: 'badge',
      role: 'source_badge',
      sourceRef: 'freshness.status',
      center: { x: 0.035, y: 0.075 },
      text: `freshness: ${hostPacketFreshnessStatus(state)}`,
      color: sourceBadgeColor(state.authority)
    },
    {
      id: 'capture-status-badge',
      layerId: 'capture',
      kind: 'badge',
      role: 'capture_status',
      sourceRef: 'capture.state',
      center: { x: 0.035, y: 0.11 },
      text: `capture: ${capture.state}`,
      color: capture.state === 'complete' ? '#82e2be' : '#d9a75e'
    }
  );

  return {
    schema: 'lerms.glove-well-host-surface.v0',
    surfaceId: 'glove-well-native-smoke',
    hostRouteExpectation: 'kaminos/glove-well-host',
    coordinateFrame,
    layers: [
      { id: 'glove-well', label: 'Glove Well', sourceOwned: true },
      { id: 'hand-tracking', label: 'Hand Tracking', sourceOwned: true },
      { id: 'goins', label: 'Goins', sourceOwned: true },
      { id: 'lerm-desire', label: 'Lerm Desire', sourceOwned: true },
      { id: 'source-truth', label: 'Source Truth', sourceOwned: true },
      { id: 'capture', label: 'Capture', sourceOwned: false }
    ],
    primitives,
    statusBadges: [
      { id: 'authority', label: 'Authority', value: state.authority, authorityBearing: true },
      { id: 'freshness', label: 'Freshness', value: hostPacketFreshnessStatus(state), authorityBearing: true },
      { id: 'phase', label: 'Phase', value: state.phase, authorityBearing: false },
      { id: 'route', label: 'Route', value: state.source.effectiveRoute ?? 'none', authorityBearing: true },
      { id: 'capture', label: 'Capture', value: capture.state, authorityBearing: false }
    ],
    controls: [
      {
        id: 'capture-filmstrip',
        label: 'Capture Filmstrip',
        sourceOwned: false,
        reason: 'Kaminos host should provide the operator control; Greedy only reports capture refs and source state'
      },
      {
        id: 'open-live-hand',
        label: 'Open Live Hand',
        sourceOwned: false,
        reason: 'Kaminos owns the live hand compositor route and camera permission surface'
      },
      {
        id: 'stop-live-hand',
        label: 'Stop Live Hand',
        sourceOwned: false,
        reason: 'Kaminos owns sidecar lifecycle controls'
      }
    ],
    witnessExpectations: {
      expectedHostId: 'glove-well',
      expectedPacketSchema: 'lerms.glove-well-host-packet.v0',
      expectedPacketRoute: 'lerms/glove-well/host-packet',
      requiredDowngrades: downgrades,
      requiredPrimitiveRoles: ['wealth_source', 'rolling_goin', 'hand_skeleton_bone', 'aim_arc_sample', 'lerm_desire_link'],
      requiredSourceRows: [
        'source.authority',
        'source.effectiveRoute',
        'freshness.status',
        'workbenchBinding.kaminos.offerId',
        'workbenchBinding.receipt.expectedSchema',
        'downgrades',
        'custody.greedyOwns',
        'custody.kaminosOwns'
      ]
    }
  };
}

function lermMarkerOrigin(index: number): BrowserSmokePoint {
  return [
    { x: 0.68, y: 0.68 },
    { x: 0.76, y: 0.78 },
    { x: 0.6, y: 0.82 }
  ][index] ?? { x: 0.7, y: 0.74 };
}

function sourceBadgeColor(authority: BrowserSmokeAuthority): string {
  if (authority === 'live_simulation') return '#82e2be';
  if (authority === 'fallback') return '#d9a75e';
  if (authority === 'synthetic_fixture') return '#d8c46a';
  if (authority === 'invalid') return '#e36e6e';
  return '#a4b2c0';
}

function cloneGoin(goin: BrowserSmokeGoin): BrowserSmokeGoin {
  return {
    ...goin,
    position: { ...goin.position },
    velocity: { ...goin.velocity }
  };
}

function cloneAim(aim: BrowserSmokeAim): BrowserSmokeAim {
  return {
    active: aim.active,
    origin: { ...aim.origin },
    direction: { ...aim.direction },
    arcSamples: aim.arcSamples.map((sample) => ({ ...sample }))
  };
}

function cloneHand(hand: BrowserSmokeState['hand']): BrowserSmokeState['hand'] {
  return {
    palmCenter: hand.palmCenter ? { ...hand.palmCenter } : null,
    thumbTip: hand.thumbTip ? { ...hand.thumbTip } : null,
    indexTip: hand.indexTip ? { ...hand.indexTip } : null,
    pinkyTip: hand.pinkyTip ? { ...hand.pinkyTip } : null,
    pinkyBase: hand.pinkyBase ? { ...hand.pinkyBase } : null,
    pinchDistance: hand.pinchDistance,
    pinchActive: hand.pinchActive
  };
}

function cloneHandSkeleton(skeleton: BrowserSmokeHandSkeleton): BrowserSmokeHandSkeleton {
  return {
    schema: skeleton.schema,
    visible: skeleton.visible,
    landmarkCount: skeleton.landmarkCount,
    landmarks: skeleton.landmarks.map((point) => ({ ...point })),
    segments: skeleton.segments.map((segment) => ({
      ...segment,
      start: { ...segment.start },
      end: { ...segment.end }
    })),
    debugPoints: skeleton.debugPoints.map((point) => ({
      ...point,
      point: { ...point.point }
    })),
    aimVector: skeleton.aimVector
      ? {
          origin: { ...skeleton.aimVector.origin },
          direction: { ...skeleton.aimVector.direction }
        }
      : null
  };
}

function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function buildEmptyHandSkeleton(): BrowserSmokeHandSkeleton {
  return {
    schema: 'lerms.glove-well-hand-skeleton-overlay.v0',
    visible: false,
    landmarkCount: 0,
    landmarks: [],
    segments: [],
    debugPoints: [],
    aimVector: null
  };
}

function buildHandSkeleton({
  landmarks,
  palmCenter,
  aimVector
}: {
  landmarks: BrowserSmokePoint[];
  palmCenter: BrowserSmokePoint;
  aimVector: BrowserSmokeHandSkeleton['aimVector'];
}): BrowserSmokeHandSkeleton {
  const segmentSpecs: Array<{ from: number; to: number; group: BrowserSmokeHandSkeletonSegment['group'] }> = [
    { from: 0, to: 5, group: 'palm' },
    { from: 5, to: 9, group: 'palm' },
    { from: 9, to: 13, group: 'palm' },
    { from: 13, to: 17, group: 'palm' },
    { from: 0, to: 17, group: 'palm' },
    { from: 0, to: 1, group: 'thumb' },
    { from: 1, to: 2, group: 'thumb' },
    { from: 2, to: 3, group: 'thumb' },
    { from: 3, to: 4, group: 'thumb' },
    { from: 5, to: 6, group: 'index' },
    { from: 6, to: 7, group: 'index' },
    { from: 7, to: 8, group: 'index' },
    { from: 9, to: 10, group: 'middle' },
    { from: 10, to: 11, group: 'middle' },
    { from: 11, to: 12, group: 'middle' },
    { from: 13, to: 14, group: 'ring' },
    { from: 14, to: 15, group: 'ring' },
    { from: 15, to: 16, group: 'ring' },
    { from: 17, to: 18, group: 'pinky' },
    { from: 18, to: 19, group: 'pinky' },
    { from: 19, to: 20, group: 'pinky' }
  ];

  const segments = segmentSpecs
    .filter((segment) => landmarks[segment.from] && landmarks[segment.to])
    .map((segment) => ({
      ...segment,
      start: landmarks[segment.from],
      end: landmarks[segment.to]
    }));

  return {
    schema: 'lerms.glove-well-hand-skeleton-overlay.v0',
    visible: true,
    landmarkCount: landmarks.length,
    landmarks: landmarks.map((point) => ({ x: round3(point.x), y: round3(point.y) })),
    segments,
    debugPoints: [
      { id: 'wrist', label: 'WR', point: landmarks[0], landmarkIndex: 0, role: 'context' },
      { id: 'palm_center', label: 'PALM', point: palmCenter, landmarkIndex: null, role: 'load_bearing' },
      { id: 'thumb_tip', label: 'TH', point: landmarks[4], landmarkIndex: 4, role: 'load_bearing' },
      { id: 'index_tip', label: 'IX', point: landmarks[8], landmarkIndex: 8, role: 'load_bearing' },
      { id: 'pinky_base', label: 'PB', point: landmarks[17], landmarkIndex: 17, role: 'load_bearing' },
      { id: 'pinky_tip', label: 'PK', point: landmarks[20], landmarkIndex: 20, role: 'load_bearing' }
    ],
    aimVector
  };
}

function degraded(
  prior: BrowserSmokeState,
  goins: BrowserSmokeGoin[],
  endpoint: string,
  authority: BrowserSmokeAuthority,
  statusCode: BrowserSmokeStatusCode,
  downgrades: string[],
  lastError: string
): BrowserSmokeState {
  return {
    ...prior,
    authority,
    statusCode,
    source: {
      ...prior.source,
      endpoint
    },
    goin: pickActiveGoin(goins, prior.goin),
    goins,
    downgrades,
    lastError
  };
}

function withSequence(prior: BrowserSmokeState, cache: BrowserSmokeCacheSnapshot, endpoint: string): BrowserSmokeState {
  return {
    ...prior,
    source: {
      ...prior.source,
      endpoint,
      sequence: cache.sequence,
      ageMs: cache.age_ms
    }
  };
}

function advanceGoin(goin: BrowserSmokeGoin, nowMs: number): BrowserSmokeGoin {
  void nowMs;
  if (goin.state !== 'rolling') return goin;
  const nextVelocity = {
    x: round3(goin.velocity.x * 0.985),
    y: round3(goin.velocity.y * 0.985 + 0.0009)
  };
  const nextPosition = {
    x: round3(clamp(goin.position.x + nextVelocity.x, 0.04, 0.96)),
    y: round3(clamp(goin.position.y + nextVelocity.y, 0.08, 0.9))
  };
  const speed = Math.hypot(nextVelocity.x, nextVelocity.y);
  return {
    ...goin,
    state: speed < 0.002 ? 'settled' : 'rolling',
    position: nextPosition,
    velocity: nextVelocity,
    desireRadius: round3(Math.max(0.08, goin.desireRadius * 0.995))
  };
}

function advanceGoins(goins: BrowserSmokeGoin[], nowMs: number): BrowserSmokeGoin[] {
  return goins.map((goin) => advanceGoin(goin, nowMs));
}

function worldGoins(state: BrowserSmokeState): BrowserSmokeGoin[] {
  const goins = state.goins?.length ? state.goins : [state.goin];
  const seen = new Set<string>();
  return goins.filter((goin) => {
    if (seen.has(goin.id)) return false;
    seen.add(goin.id);
    return true;
  });
}

function pickActiveGoin(goins: BrowserSmokeGoin[], fallback: BrowserSmokeGoin): BrowserSmokeGoin {
  return goins.find((goin) => goin.state === 'held') ?? pickRollingGoin(goins, fallback);
}

function pickRollingGoin(goins: BrowserSmokeGoin[], fallback: BrowserSmokeGoin): BrowserSmokeGoin {
  return goins.find((goin) => goin.state === 'rolling') ?? goins.at(-1) ?? fallback;
}

function buildArcSamples(origin: BrowserSmokePoint, direction: BrowserSmokePoint): Array<BrowserSmokePoint & { t: number }> {
  return Array.from({ length: 7 }, (_, index) => {
    const t = (index + 1) / 7;
    return {
      t: round3(t),
      x: round3(clamp(origin.x + direction.x * t * 0.34, 0.03, 0.97)),
      y: round3(clamp(origin.y + direction.y * t * 0.34 + t * t * 0.09, 0.04, 0.94))
    };
  });
}

function average(points: readonly BrowserSmokePoint[]): BrowserSmokePoint {
  return {
    x: round3(points.reduce((sum, point) => sum + point.x, 0) / points.length),
    y: round3(points.reduce((sum, point) => sum + point.y, 0) / points.length)
  };
}

function subtract(a: BrowserSmokePoint, b: BrowserSmokePoint): BrowserSmokePoint {
  return {
    x: a.x - b.x,
    y: a.y - b.y
  };
}

function mirrorOperatorX(point: BrowserSmokePoint): BrowserSmokePoint {
  return {
    x: round3(1 - point.x),
    y: round3(point.y)
  };
}

function normalize(point: BrowserSmokePoint): BrowserSmokePoint {
  const length = Math.hypot(point.x, point.y) || 1;
  return {
    x: round3(point.x / length),
    y: round3(point.y / length)
  };
}

function distance(a: BrowserSmokePoint, b: BrowserSmokePoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function finite(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}
