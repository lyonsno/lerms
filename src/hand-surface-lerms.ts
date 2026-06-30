export type Vec2 = { x: number; y: number };
export type Vec3 = { x: number; y: number; z: number };
export type DowngradeCode =
  | 'hand_backend_not_live_wilor'
  | 'stale_hand_packet'
  | 'missing_hand_surface_frame'
  | 'screen_space_attachment_rejected'
  | 'moge_requested_unavailable'
  | 'moge_stale'
  | 'blank_or_hidden_webcam'
  | 'synthetic_webcam_frame'
  | 'missing_kaminos_hand_event'
  | 'missing_hand_mesh';

export type WitnessAuthority =
  | 'live_hand_surface'
  | 'live_hand_surface_scene_grounding_downgraded'
  | 'synthetic_fixture'
  | 'invalid';

export type WilorHandPacket = {
  schema?: string;
  source_backend?: string;
  timestamp?: number;
  timestamp_ms?: number;
  frame_id?: string | number;
  handedness?: string;
  confidence?: number;
  landmarks_2d?: Vec2[];
  landmarks_3d?: Vec3[];
  world_landmarks?: Vec3[];
  mano?: ManoSurface | null;
  dense_mano?: ManoSurface | null;
  palm_normal_proxy?: Vec3;
  hand_frame_basis?: {
    source?: string;
    x_axis?: Vec3;
    y_axis?: Vec3;
    z_axis?: Vec3;
  };
  debug?: {
    evidence_route?: string;
    model_route?: string;
    device_route?: string;
  };
};

export type ManoSurface = {
  schema?: string;
  coordinate_space?: string;
  vertices?: Vec3[] | number[][];
  faces?: number[][];
};

export type KaminosHandEventCache = {
  schema?: 'kaminos.hand-control-sidecar-event-cache.v0' | string;
  status?: string;
  sequence?: number;
  stored_at_ms?: number;
  age_ms?: number | null;
  event?: WilorHandPacket | null;
  effective_endpoint?: string;
};

export type WebcamTruth = {
  source: 'live_webcam' | 'synthetic_fixture' | 'missing';
  visible: boolean;
  blank: boolean;
  frameId: string;
  width: number;
  height: number;
};

export type MogeTruthInput = {
  requested: boolean;
  effectiveRoute?: string | null;
  ageMs?: number | null;
  maxFreshnessMs?: number;
};

export type LermAnchor = {
  id: string;
  face?: number[];
  meshFaceIndex?: number;
  barycentric?: number[];
  behaviorHint?: 'cling' | 'slide' | 'finger_walk' | 'curious';
  screen?: Vec2;
};

export type ComposeHandSurfaceOptions = {
  requestedRoute: string;
  nowMs: number;
  maxFreshnessMs: number;
  webcam: WebcamTruth;
  attachmentMode: 'hand_surface' | 'hand_mesh' | 'screen_space';
  lermAnchors: LermAnchor[];
  moge: MogeTruthInput;
  requestedEndpoint?: string;
  effectiveEndpoint?: string;
};

export type HandSurfaceReport = {
  schema: 'lerms.hand-surface-lerm-witness.v0';
  authority: WitnessAuthority;
  routeTruth: {
    requestedRoute: string;
    effectiveRoute: string;
    backendIdentity: string;
    modelRoute: string;
    deviceRoute: string;
    fallback: boolean;
    endpoint: {
      requested: string | null;
      effective: string | null;
      fallback: boolean;
    };
    kaminosCache: {
      schema: string | null;
      status: string | null;
      sequence: number | null;
      storedAtMs: number | null;
      ageMs: number | null;
      eventPresent: boolean;
    };
  };
  freshness: {
    nowMs: number;
    packetTimestampMs: number | null;
    ageMs: number | null;
    maxFreshnessMs: number;
    status: 'fresh' | 'stale' | 'unknown';
  };
  webcam: {
    status: 'visible_live' | 'visible_synthetic_fixture' | 'blank_or_hidden' | 'missing';
    source: WebcamTruth['source'];
    frameId: string;
    dimensions: { width: number; height: number };
  };
  surfaceFrame: {
    status: 'valid' | 'invalid';
    handedness: string;
    confidence: number | null;
    landmarks2d: Vec2[];
    worldLandmarks: Vec3[];
    faces: number[][];
    mesh: {
      status: 'valid' | 'missing';
      coordinateSpace: string | null;
      vertices: Vec3[];
      faces: number[][];
      projected2d: Vec2[];
    };
    basis: {
      source: string;
      xAxis: Vec3;
      yAxis: Vec3;
      zAxis: Vec3;
    } | null;
    palmNormal: Vec3 | null;
  };
  attachments: Array<{
    id: string;
    mode: 'hand_surface' | 'screen_space_rejected';
    face: number[] | null;
    meshFaceIndex: number | null;
    barycentric: number[] | null;
    screen: Vec2;
    depth: number;
    surfaceSource: 'mano_mesh' | 'landmark_proxy' | 'missing_mesh' | 'screen_space';
    behavior: 'cling' | 'slide' | 'finger_walk' | 'curious' | 'rejected';
    reason: string;
  }>;
  moge: {
    requested: boolean;
    status: 'not_requested' | 'fresh_effective' | 'requested_unavailable' | 'stale';
    effectiveRoute: string | null;
    ageMs: number | null;
  };
  downgrades: Array<{ code: DowngradeCode; detail: string }>;
};

export const HAND_SURFACE_FACES: number[][] = [
  [0, 5, 9], [0, 9, 13], [0, 13, 17], [5, 9, 13], [9, 13, 17],
  [0, 1, 5], [1, 2, 5], [2, 3, 5], [3, 4, 5],
  [5, 6, 10], [5, 9, 10], [6, 7, 11], [6, 10, 11], [7, 8, 12], [7, 11, 12],
  [9, 10, 14], [9, 13, 14], [10, 11, 15], [10, 14, 15], [11, 12, 16], [11, 15, 16],
  [13, 14, 18], [13, 17, 18], [14, 15, 19], [14, 18, 19], [15, 16, 20], [15, 19, 20],
];

const fallbackVec3: Vec3 = Object.freeze({ x: 0, y: 0, z: 1 });

export function createFixtureWilorHandPacket(overrides: Partial<{
  effectiveRoute: string;
  sourceBackend: string;
  timestampMs: number;
  palmNormal: Vec3;
  landmarks2d: Vec2[];
  worldLandmarks: Vec3[];
  mano?: ManoSurface | null;
}> = {}): WilorHandPacket {
  const landmarks2d = overrides.landmarks2d ?? [
    { x: 0.51, y: 0.66 },
    { x: 0.475, y: 0.63 },
    { x: 0.446, y: 0.592 },
    { x: 0.429, y: 0.552 },
    { x: 0.475, y: 0.515 },
    { x: 0.458, y: 0.515 },
    { x: 0.44, y: 0.455 },
    { x: 0.43, y: 0.395 },
    { x: 0.489, y: 0.497 },
    { x: 0.512, y: 0.505 },
    { x: 0.512, y: 0.435 },
    { x: 0.513, y: 0.37 },
    { x: 0.515, y: 0.328 },
    { x: 0.565, y: 0.522 },
    { x: 0.582, y: 0.455 },
    { x: 0.594, y: 0.395 },
    { x: 0.602, y: 0.352 },
    { x: 0.612, y: 0.55 },
    { x: 0.641, y: 0.496 },
    { x: 0.662, y: 0.452 },
    { x: 0.678, y: 0.42 },
  ];
  const worldLandmarks = overrides.worldLandmarks ?? [
    { x: 0, y: 0, z: 0 },
    { x: -0.045, y: 0.03, z: -0.012 },
    { x: -0.08, y: 0.075, z: -0.018 },
    { x: -0.108, y: 0.118, z: -0.016 },
    { x: -0.066, y: 0.148, z: -0.034 },
    { x: -0.062, y: 0.145, z: -0.01 },
    { x: -0.07, y: 0.22, z: -0.032 },
    { x: -0.079, y: 0.292, z: -0.05 },
    { x: -0.05, y: 0.164, z: -0.044 },
    { x: 0, y: 0.158, z: -0.012 },
    { x: 0.004, y: 0.242, z: -0.03 },
    { x: 0.006, y: 0.321, z: -0.048 },
    { x: 0.008, y: 0.375, z: -0.06 },
    { x: 0.056, y: 0.145, z: -0.01 },
    { x: 0.07, y: 0.224, z: -0.028 },
    { x: 0.086, y: 0.294, z: -0.042 },
    { x: 0.098, y: 0.344, z: -0.054 },
    { x: 0.106, y: 0.122, z: -0.008 },
    { x: 0.132, y: 0.19, z: -0.024 },
    { x: 0.154, y: 0.245, z: -0.038 },
    { x: 0.171, y: 0.286, z: -0.05 },
  ];
  const palmNormal = overrides.palmNormal ?? { x: 0.051, y: -0.19, z: 0.98 };
  const effectiveRoute = overrides.effectiveRoute ?? 'wilor_mini_mps_saved_image_replay';
  return {
    schema: 'perceptasia.hand-control.v0',
    source_backend: overrides.sourceBackend ?? effectiveRoute,
    timestamp: overrides.timestampMs ?? 1000,
    frame_id: 'fixture-hand-frame-001',
    handedness: 'Right',
    confidence: 0.93,
    landmarks_2d: landmarks2d,
    landmarks_3d: worldLandmarks,
    world_landmarks: worldLandmarks,
    mano: overrides.mano ?? null,
    dense_mano: overrides.mano ?? null,
    palm_normal_proxy: palmNormal,
    hand_frame_basis: {
      source: effectiveRoute,
      x_axis: { x: -0.999, y: 0.041, z: -0.009 },
      y_axis: { x: 0.038, y: 0.962, z: 0.27 },
      z_axis: palmNormal,
    },
    debug: {
      evidence_route: effectiveRoute,
      model_route: 'WiLoR-mini fork lyonsno/codex/mps-layout-smoke-0522',
      device_route: effectiveRoute.includes('mlx') ? 'mlx' : 'mps',
    },
  };
}

export function createFixtureKaminosHandEventCache(overrides: Partial<{
  event: WilorHandPacket | null;
  status: string;
  sequence: number;
  storedAtMs: number;
  ageMs: number | null;
  effectiveEndpoint: string;
}> = {}): KaminosHandEventCache {
  return {
    schema: 'kaminos.hand-control-sidecar-event-cache.v0',
    status: overrides.status ?? (overrides.event === null ? 'empty' : 'stored'),
    sequence: overrides.sequence ?? 1,
    stored_at_ms: overrides.storedAtMs ?? 1000,
    age_ms: overrides.ageMs ?? 0,
    effective_endpoint: overrides.effectiveEndpoint,
    event: overrides.event === undefined ? createFixtureWilorHandPacket() : overrides.event,
  };
}

export function composeHandSurfaceLerms(packet: WilorHandPacket | KaminosHandEventCache, options: ComposeHandSurfaceOptions): HandSurfaceReport {
  const downgrades: HandSurfaceReport['downgrades'] = [];
  const envelope = normalizeHandPacketEnvelope(packet, options);
  const handPacket = envelope.packet;
  if (envelope.missingKaminosEvent) {
    downgrades.push({
      code: 'missing_kaminos_hand_event',
      detail: `Kaminos event cache status ${envelope.cache.status ?? 'unknown'} did not include an event`,
    });
  }

  const effectiveRoute = handPacket.debug?.evidence_route ?? handPacket.source_backend ?? 'unknown';
  const backendIdentity = handPacket.source_backend ?? 'unknown';
  const modelRoute = handPacket.debug?.model_route ?? 'unknown';
  const deviceRoute = handPacket.debug?.device_route ?? 'unknown';
  const timestampMs = finite(handPacket.timestamp_ms) ?? finite(handPacket.timestamp) ?? null;
  const ageMs = envelope.cache.ageMs ?? (timestampMs === null ? null : Math.max(0, options.nowMs - timestampMs));
  const freshnessStatus = ageMs === null ? 'unknown' : ageMs <= options.maxFreshnessMs ? 'fresh' : 'stale';
  const isLiveWilor = /^native_wilor_mini_.*sidecar_live$/.test(effectiveRoute)
    && /^native_wilor_mini_.*sidecar_live$/.test(backendIdentity);

  if (!isLiveWilor) {
    downgrades.push({
      code: 'hand_backend_not_live_wilor',
      detail: `effective route ${effectiveRoute} from backend ${backendIdentity} is not live WiLoR sidecar authority`,
    });
  }
  if (freshnessStatus !== 'fresh') {
    downgrades.push({
      code: 'stale_hand_packet',
      detail: ageMs === null ? 'packet timestamp missing' : `packet age ${ageMs}ms exceeds ${options.maxFreshnessMs}ms`,
    });
  }

  const landmarks2d = validVec2List(handPacket.landmarks_2d);
  const worldLandmarks = validVec3List(handPacket.world_landmarks ?? handPacket.landmarks_3d);
  const surfaceValid = landmarks2d.length >= 21 && worldLandmarks.length >= 21;
  const mesh = normalizeManoSurface(handPacket.mano ?? handPacket.dense_mano);
  const meshRequested = options.attachmentMode === 'hand_mesh';
  if (!surfaceValid) {
    downgrades.push({
      code: 'missing_hand_surface_frame',
      detail: `need 21 2d and world landmarks, got ${landmarks2d.length} 2d and ${worldLandmarks.length} world`,
    });
  }
  if (meshRequested && mesh.status !== 'valid') {
    downgrades.push({
      code: 'missing_hand_mesh',
      detail: `hand_mesh attachment requires MANO vertices and faces, got ${mesh.vertices.length} vertices and ${mesh.faces.length} faces`,
    });
  }

  const webcamStatus = webcamTruthStatus(options.webcam);
  if (webcamStatus === 'blank_or_hidden' || webcamStatus === 'missing') {
    downgrades.push({
      code: 'blank_or_hidden_webcam',
      detail: `webcam status ${webcamStatus}`,
    });
  } else if (webcamStatus === 'visible_synthetic_fixture') {
    downgrades.push({
      code: 'synthetic_webcam_frame',
      detail: 'visual ground truth is a synthetic fixture, not the operator webcam',
    });
  }

  const palmNormal = validVec3(handPacket.palm_normal_proxy) ?? validVec3(handPacket.hand_frame_basis?.z_axis);
  const basis = surfaceValid
    ? {
        source: handPacket.hand_frame_basis?.source ?? effectiveRoute,
        xAxis: validVec3(handPacket.hand_frame_basis?.x_axis) ?? { x: 1, y: 0, z: 0 },
        yAxis: validVec3(handPacket.hand_frame_basis?.y_axis) ?? { x: 0, y: 1, z: 0 },
        zAxis: palmNormal ?? fallbackVec3,
      }
    : null;

  const attachments = options.lermAnchors.map((anchor, index) => {
    if (options.attachmentMode === 'screen_space') {
      downgrades.push({
        code: 'screen_space_attachment_rejected',
        detail: `anchor ${anchor.id} used screen-space coordinates`,
      });
      return {
        id: anchor.id,
        mode: 'screen_space_rejected' as const,
        face: null,
        meshFaceIndex: null,
        barycentric: null,
        screen: anchor.screen ?? { x: 0.5, y: 0.5 },
        depth: 0,
        surfaceSource: 'screen_space' as const,
        behavior: 'rejected' as const,
        reason: 'screen-space stickers do not satisfy hand-surface attachment',
      };
    }

    if (meshRequested) {
      const meshFaceIndex = anchor.meshFaceIndex ?? index % Math.max(1, mesh.faces.length);
      const face = mesh.faces[meshFaceIndex] ?? null;
      const barycentric = anchor.barycentric ?? [0.33, 0.34, 0.33];
      const screen = mesh.status === 'valid' && face
        ? roundVec2(barycentricPoint2(mesh.projected2d, face, barycentric))
        : { x: 0, y: 0 };
      const world = mesh.status === 'valid' && face
        ? barycentricPoint3(mesh.vertices, face, barycentric)
        : { x: 0, y: 0, z: 0 };
      return {
        id: anchor.id,
        mode: 'hand_surface' as const,
        face,
        meshFaceIndex: face ? meshFaceIndex : null,
        barycentric,
        screen,
        depth: roundForReport(world.z),
        surfaceSource: mesh.status === 'valid' && face ? 'mano_mesh' as const : 'missing_mesh' as const,
        behavior: chooseBehavior(anchor, palmNormal),
        reason: mesh.status === 'valid' && face ? 'anchored to MANO mesh triangle' : 'MANO mesh missing or invalid',
      };
    }

    const face = anchor.face ?? HAND_SURFACE_FACES[index % HAND_SURFACE_FACES.length];
    const barycentric = anchor.barycentric ?? [0.33, 0.34, 0.33];
    const screen = surfaceValid
      ? barycentricPoint2(landmarks2d, face, barycentric)
      : { x: 0, y: 0 };
    const world = surfaceValid
      ? barycentricPoint3(worldLandmarks, face, barycentric)
      : { x: 0, y: 0, z: 0 };
    return {
      id: anchor.id,
      mode: 'hand_surface' as const,
      face,
      meshFaceIndex: null,
      barycentric,
      screen,
      depth: world.z,
      surfaceSource: 'landmark_proxy' as const,
      behavior: chooseBehavior(anchor, palmNormal),
      reason: surfaceValid ? 'anchored to interpolated hand surface face' : 'surface frame invalid',
    };
  });

  const moge = evaluateMoge(options.moge);
  if (moge.status === 'requested_unavailable') {
    downgrades.push({ code: 'moge_requested_unavailable', detail: 'MoGe was requested but no effective fresh route was supplied' });
  } else if (moge.status === 'stale') {
    downgrades.push({ code: 'moge_stale', detail: `MoGe age ${moge.ageMs}ms exceeds ${options.moge.maxFreshnessMs ?? 1000}ms` });
  }

  const invalid = !surfaceValid
    || (meshRequested && mesh.status !== 'valid')
    || webcamStatus === 'blank_or_hidden'
    || webcamStatus === 'missing'
    || options.attachmentMode === 'screen_space';
  let authority: WitnessAuthority = 'synthetic_fixture';
  if (invalid) {
    authority = 'invalid';
  } else if (isLiveWilor && freshnessStatus === 'fresh' && webcamStatus === 'visible_live') {
    authority = moge.status === 'requested_unavailable' || moge.status === 'stale'
      ? 'live_hand_surface_scene_grounding_downgraded'
      : 'live_hand_surface';
  }

  return {
    schema: 'lerms.hand-surface-lerm-witness.v0',
    authority,
    routeTruth: {
      requestedRoute: options.requestedRoute,
      effectiveRoute,
      backendIdentity,
      modelRoute,
      deviceRoute,
      fallback: !isLiveWilor || effectiveRoute !== options.requestedRoute,
      endpoint: {
        requested: envelope.endpoint.requested,
        effective: envelope.endpoint.effective,
        fallback: envelope.endpoint.requested !== envelope.endpoint.effective,
      },
      kaminosCache: {
        schema: envelope.cache.schema,
        status: envelope.cache.status,
        sequence: envelope.cache.sequence,
        storedAtMs: envelope.cache.storedAtMs,
        ageMs: envelope.cache.ageMs,
        eventPresent: !envelope.missingKaminosEvent,
      },
    },
    freshness: {
      nowMs: options.nowMs,
      packetTimestampMs: timestampMs,
      ageMs,
      maxFreshnessMs: options.maxFreshnessMs,
      status: freshnessStatus,
    },
    webcam: {
      status: webcamStatus,
      source: options.webcam.source,
      frameId: options.webcam.frameId,
      dimensions: { width: options.webcam.width, height: options.webcam.height },
    },
    surfaceFrame: {
      status: surfaceValid ? 'valid' : 'invalid',
      handedness: handPacket.handedness ?? 'unknown',
      confidence: finite(handPacket.confidence),
      landmarks2d,
      worldLandmarks,
      faces: surfaceValid ? HAND_SURFACE_FACES.map((face) => [...face]) : [],
      mesh,
      basis,
      palmNormal: palmNormal ?? null,
    },
    attachments,
    moge,
    downgrades: dedupeDowngrades(downgrades),
  };
}

export function renderHandSurfaceWitnessSvg(report: HandSurfaceReport, size: { width: number; height: number }): string {
  const width = Math.max(320, Math.floor(size.width));
  const height = Math.max(220, Math.floor(size.height));
  const frameWidth = Math.floor(width / 2);
  const panelWidth = width - frameWidth;
  const meshMode = report.surfaceFrame.mesh.status === 'valid'
    && report.attachments.some((attachment) => attachment.surfaceSource === 'mano_mesh');
  const points = report.surfaceFrame.landmarks2d
    .map((point) => `${scaleX(point.x, frameWidth).toFixed(1)},${scaleY(point.y, height).toFixed(1)}`)
    .join(' ');
  const handFaces = meshMode
    ? report.surfaceFrame.mesh.faces.slice(0, 90).map((face) => {
        const polygon = face
          .map((index) => report.surfaceFrame.mesh.projected2d[index])
          .filter(Boolean)
          .map((point) => `${scaleX(point.x, frameWidth).toFixed(1)},${scaleY(point.y, height).toFixed(1)}`)
          .join(' ');
        return `<polygon class="mesh-ghost-face" points="${polygon}" />`;
      }).join('')
    : report.surfaceFrame.faces.slice(0, 10).map((face) => {
        const polygon = face
          .map((index) => report.surfaceFrame.landmarks2d[index])
          .filter(Boolean)
          .map((point) => `${scaleX(point.x, frameWidth).toFixed(1)},${scaleY(point.y, height).toFixed(1)}`)
          .join(' ');
        return `<polygon class="hand-surface-face" points="${polygon}" />`;
      }).join('');
  const lerms = report.attachments.map((attachment) => {
    const x = scaleX(attachment.screen.x, frameWidth);
    const y = scaleY(attachment.screen.y, height);
    const color = attachment.id.includes('yellow') ? '#f5d75f' : '#e95048';
    const behavior = escapeXml(attachment.behavior);
    return [
      `<g id="${escapeXml(attachment.id)}" class="surface-lerm" transform="translate(${x.toFixed(1)} ${y.toFixed(1)})">`,
      `<ellipse cx="0" cy="0" rx="13" ry="7" fill="${color}" stroke="#24120d" stroke-width="2" />`,
      '<circle cx="7" cy="-2" r="2" fill="#120c08" />',
      `<path d="M -10 4 C -4 13 6 13 12 5" fill="none" stroke="#120c08" stroke-width="2" />`,
      `<title>${escapeXml(attachment.id)} ${behavior} depth ${attachment.depth.toFixed(3)}</title>`,
      '</g>',
    ].join('');
  }).join('');
  const downgradeText = report.downgrades.length
    ? report.downgrades.map((entry) => `${entry.code}: ${entry.detail}`)
    : ['no downgrades'];
  const lines = [
    `authority: ${report.authority}`,
    `requested: ${report.routeTruth.requestedRoute}`,
    `effective: ${report.routeTruth.effectiveRoute}`,
    `endpoint: ${report.routeTruth.endpoint.effective ?? 'none'}`,
    `backend: ${report.routeTruth.backendIdentity}`,
    `freshness: ${report.freshness.status} age=${report.freshness.ageMs ?? 'unknown'}ms`,
    `webcam: ${report.webcam.status} frame=${report.webcam.frameId}`,
    `surface: ${report.surfaceFrame.status} landmarks=${report.surfaceFrame.landmarks2d.length}`,
    `mesh: ${report.surfaceFrame.mesh.status} vertices=${report.surfaceFrame.mesh.vertices.length} faces=${report.surfaceFrame.mesh.faces.length}`,
    `moge: ${report.moge.status}`,
    ...downgradeText.slice(0, 8),
  ].map((line) => truncateReceiptLine(line, 44));
  const textRows = lines.map((line, index) => {
    const y = 34 + index * 21;
    return `<text x="${frameWidth + 18}" y="${y}" class="receipt-line">${escapeXml(line)}</text>`;
  }).join('');

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="LERMS hand surface witness">`,
    '<defs>',
    '<linearGradient id="webcam-ground-truth" x1="0" y1="0" x2="1" y2="1">',
    '<stop offset="0%" stop-color="#314a62" />',
    '<stop offset="48%" stop-color="#b98b74" />',
    '<stop offset="100%" stop-color="#161a20" />',
    '</linearGradient>',
    '<linearGradient id="underhill-ghost-shell" x1="0" y1="0" x2="1" y2="1">',
    '<stop offset="0%" stop-color="#080b0b" />',
    '<stop offset="55%" stop-color="#141915" />',
    '<stop offset="100%" stop-color="#070807" />',
    '</linearGradient>',
    '<style>',
    '.receipt-line{font:14px ui-monospace,SFMono-Regular,Menlo,monospace;fill:#dce8dc}.hand-surface-face{fill:rgba(101,226,191,0.20);stroke:rgba(235,255,240,0.62);stroke-width:1.4}.mesh-ghost-face{fill:rgba(90,231,207,0.08);stroke:rgba(138,246,227,0.22);stroke-width:.8}.surface-lerm{filter:drop-shadow(0 3px 3px rgba(0,0,0,.42))}.label{font:700 13px ui-monospace,SFMono-Regular,Menlo,monospace;fill:#f2fff6}',
    '</style>',
    '</defs>',
    meshMode
      ? `<rect id="underhill-ghost-shell-frame" x="0" y="0" width="${frameWidth}" height="${height}" fill="url(#underhill-ghost-shell)" />`
      : `<rect id="webcam-ground-truth-frame" x="0" y="0" width="${frameWidth}" height="${height}" fill="url(#webcam-ground-truth)" />`,
    `<rect x="0" y="0" width="${frameWidth}" height="${height}" fill="rgba(0,0,0,0.10)" />`,
    meshMode
      ? `<g id="underhill-kiln-stub"><rect x="${frameWidth * 0.07}" y="${height * 0.18}" width="${frameWidth * 0.2}" height="${height * 0.34}" fill="#161210" stroke="rgba(240,198,142,.42)" /><rect x="${frameWidth * 0.1}" y="${height * 0.27}" width="${frameWidth * 0.14}" height="${height * 0.2}" fill="rgba(255,106,50,.54)" /></g>`
      : `<path d="M ${frameWidth * 0.17} ${height * 0.88} C ${frameWidth * 0.28} ${height * 0.42}, ${frameWidth * 0.49} ${height * 0.29}, ${frameWidth * 0.76} ${height * 0.47} C ${frameWidth * 0.86} ${height * 0.57}, ${frameWidth * 0.77} ${height * 0.78}, ${frameWidth * 0.58} ${height * 0.84} C ${frameWidth * 0.43} ${height * 0.91}, ${frameWidth * 0.27} ${height * 0.94}, ${frameWidth * 0.17} ${height * 0.88} Z" fill="rgba(222,171,136,0.68)" stroke="rgba(255,227,200,0.64)" stroke-width="3" />`,
    `<g id="${meshMode ? 'mano-mesh-ghost-frame' : 'hand-surface-frame'}">${handFaces}${meshMode ? '' : `<polyline points="${points}" fill="none" stroke="rgba(220,255,238,0.36)" stroke-width="1" />`}</g>`,
    lerms,
    `<rect x="${frameWidth}" y="0" width="${panelWidth}" height="${height}" fill="#111817" />`,
    `<text x="${frameWidth + 18}" y="18" class="label">LERMS hand-surface witness</text>`,
    textRows,
    '</svg>',
  ].join('');
}

function finite(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function validVec2List(value: unknown): Vec2[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    const candidate = entry as Partial<Vec2>;
    return finite(candidate.x) !== null && finite(candidate.y) !== null
      ? [{ x: candidate.x as number, y: candidate.y as number }]
      : [];
  });
}

function validVec3List(value: unknown): Vec3[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const candidate = validVec3(entry);
    return candidate ? [candidate] : [];
  });
}

function validVec3(value: unknown): Vec3 | null {
  if (Array.isArray(value)) {
    const x = finite(value[0]);
    const y = finite(value[1]);
    const z = finite(value[2]);
    return x !== null && y !== null && z !== null ? { x, y, z } : null;
  }
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<Vec3>;
  return finite(candidate.x) !== null && finite(candidate.y) !== null && finite(candidate.z) !== null
    ? { x: candidate.x as number, y: candidate.y as number, z: candidate.z as number }
    : null;
}

function normalizeManoSurface(value: unknown): HandSurfaceReport['surfaceFrame']['mesh'] {
  if (!value || typeof value !== 'object') {
    return { status: 'missing', coordinateSpace: null, vertices: [], faces: [], projected2d: [] };
  }
  const candidate = value as ManoSurface;
  const vertices = validVec3List(candidate.vertices);
  const faces = validFaceList(candidate.faces, vertices.length);
  const coordinateSpace = typeof candidate.coordinate_space === 'string' ? candidate.coordinate_space : null;
  if (!vertices.length || !faces.length) {
    return { status: 'missing', coordinateSpace, vertices, faces, projected2d: [] };
  }
  return {
    status: 'valid',
    coordinateSpace,
    vertices,
    faces,
    projected2d: projectMeshVertices(vertices),
  };
}

function validFaceList(value: unknown, vertexCount: number): number[][] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!Array.isArray(entry) || entry.length < 3) return [];
    const face = entry.slice(0, 3).map((item) => Number.isInteger(item) ? item as number : -1);
    return face.every((index) => index >= 0 && index < vertexCount) ? [face] : [];
  });
}

function projectMeshVertices(vertices: Vec3[]): Vec2[] {
  const xs = vertices.map((vertex) => vertex.x);
  const ys = vertices.map((vertex) => vertex.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = Math.max(1e-6, maxX - minX);
  const spanY = Math.max(1e-6, maxY - minY);
  return vertices.map((vertex) => ({
    x: roundForReport((vertex.x - minX) / spanX),
    y: roundForReport((vertex.y - minY) / spanY),
  }));
}

function webcamTruthStatus(webcam: WebcamTruth): HandSurfaceReport['webcam']['status'] {
  if (webcam.source === 'missing') return 'missing';
  if (!webcam.visible || webcam.blank || webcam.width <= 1 || webcam.height <= 1) return 'blank_or_hidden';
  return webcam.source === 'live_webcam' ? 'visible_live' : 'visible_synthetic_fixture';
}

function evaluateMoge(moge: MogeTruthInput): HandSurfaceReport['moge'] {
  if (!moge.requested) {
    return { requested: false, status: 'not_requested', effectiveRoute: null, ageMs: null };
  }
  if (!moge.effectiveRoute || moge.ageMs === null || moge.ageMs === undefined) {
    return { requested: true, status: 'requested_unavailable', effectiveRoute: moge.effectiveRoute ?? null, ageMs: null };
  }
  const maxFreshnessMs = moge.maxFreshnessMs ?? 1000;
  return {
    requested: true,
    status: moge.ageMs <= maxFreshnessMs ? 'fresh_effective' : 'stale',
    effectiveRoute: moge.effectiveRoute,
    ageMs: moge.ageMs,
  };
}

function normalizeHandPacketEnvelope(packet: WilorHandPacket | KaminosHandEventCache, options: ComposeHandSurfaceOptions): {
  packet: WilorHandPacket;
  endpoint: {
    requested: string | null;
    effective: string | null;
  };
  cache: {
    schema: string | null;
    status: string | null;
    sequence: number | null;
    storedAtMs: number | null;
    ageMs: number | null;
  };
  missingKaminosEvent: boolean;
} {
  const maybeCache = packet as KaminosHandEventCache;
  const isKaminosCache = maybeCache.schema === 'kaminos.hand-control-sidecar-event-cache.v0'
    || Object.prototype.hasOwnProperty.call(maybeCache, 'event')
    || Object.prototype.hasOwnProperty.call(maybeCache, 'age_ms');
  if (!isKaminosCache) {
    return {
      packet: packet as WilorHandPacket,
      endpoint: {
        requested: options.requestedEndpoint ?? null,
        effective: options.effectiveEndpoint ?? options.requestedEndpoint ?? null,
      },
      cache: {
        schema: null,
        status: null,
        sequence: null,
        storedAtMs: null,
        ageMs: null,
      },
      missingKaminosEvent: false,
    };
  }

  const event = maybeCache.event && typeof maybeCache.event === 'object' ? maybeCache.event : null;
  return {
    packet: event ?? {},
    endpoint: {
      requested: options.requestedEndpoint ?? null,
      effective: options.effectiveEndpoint ?? maybeCache.effective_endpoint ?? options.requestedEndpoint ?? null,
    },
    cache: {
      schema: typeof maybeCache.schema === 'string' ? maybeCache.schema : null,
      status: typeof maybeCache.status === 'string' ? maybeCache.status : null,
      sequence: finite(maybeCache.sequence),
      storedAtMs: finite(maybeCache.stored_at_ms),
      ageMs: finite(maybeCache.age_ms),
    },
    missingKaminosEvent: event === null,
  };
}

function chooseBehavior(anchor: LermAnchor, palmNormal: Vec3 | null): HandSurfaceReport['attachments'][number]['behavior'] {
  if (anchor.behaviorHint === 'finger_walk' || anchor.behaviorHint === 'curious') return anchor.behaviorHint;
  if ((palmNormal?.z ?? 1) < -0.15) return 'slide';
  return anchor.behaviorHint ?? 'cling';
}

function barycentricPoint2(points: Vec2[], face: number[], barycentric: number[]): Vec2 {
  return face.reduce<Vec2>((acc, pointIndex, faceIndex) => {
    const weight = barycentric[faceIndex] ?? 0;
    const point = points[pointIndex] ?? { x: 0, y: 0 };
    return { x: acc.x + point.x * weight, y: acc.y + point.y * weight };
  }, { x: 0, y: 0 });
}

function barycentricPoint3(points: Vec3[], face: number[], barycentric: number[]): Vec3 {
  return face.reduce<Vec3>((acc, pointIndex, faceIndex) => {
    const weight = barycentric[faceIndex] ?? 0;
    const point = points[pointIndex] ?? { x: 0, y: 0, z: 0 };
    return {
      x: acc.x + point.x * weight,
      y: acc.y + point.y * weight,
      z: acc.z + point.z * weight,
    };
  }, { x: 0, y: 0, z: 0 });
}

function roundVec2(point: Vec2): Vec2 {
  return { x: roundForReport(point.x), y: roundForReport(point.y) };
}

function roundForReport(value: number): number {
  return Number(value.toFixed(6));
}

function dedupeDowngrades(downgrades: HandSurfaceReport['downgrades']): HandSurfaceReport['downgrades'] {
  const seen = new Set<string>();
  return downgrades.filter((entry) => {
    const key = `${entry.code}:${entry.detail}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function scaleX(x: number, width: number): number {
  return Math.max(0, Math.min(width, x * width));
}

function scaleY(y: number, height: number): number {
  return Math.max(0, Math.min(height, y * height));
}

function escapeXml(value: string): string {
  return value.replace(/[<>&"']/g, (char) => {
    switch (char) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '"': return '&quot;';
      case "'": return '&apos;';
      default: return char;
    }
  });
}

function truncateReceiptLine(value: string, maxLength: number): string {
  return value.length <= maxLength ? value : `${value.slice(0, Math.max(0, maxLength - 3))}...`;
}
