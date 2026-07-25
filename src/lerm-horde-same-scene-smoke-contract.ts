export const ACCEPTED_SAME_SCENE_PRESENTER_REVISION =
  '0482274d0612b55969ad6c71f8f5c79c8721ce77' as const;
export const ACCEPTED_SAME_SCENE_VERIFIER_REVISION =
  'f916a9309ef4ab3f35d3a94d4e6084a3cdd2f474' as const;
export const ACCEPTED_SAME_SCENE_VERIFIER_BLOB =
  'ae5aec5b6978a6f9d192d0a37aa7a254408201d7' as const;
export const ACCEPTED_SAME_SCENE_SVG_SHA256 =
  'f657e3365833e5e0465a208ea367ce6c40a429125528f82f25fa71dda39e626c' as const;
export const ACCEPTED_SAME_SCENE_MANIFEST_SHA256 =
  'c8a25168cbbf9d45f7f2b225ab630e088f14a5b97f8b5cb561af7258e335c341' as const;
export const ACCEPTED_SAME_SCENE_SOURCE_RECEIPT_SHA256 =
  'c5e087987ebe5e092d7b83d56f3c514c97629413d3e81e5989955b0acf323663' as const;
export const ACCEPTED_SAME_SCENE_ROUTE =
  'lerms/hill-of-hills/horde-same-scene-prefix-replay' as const;
export const ACCEPTED_SAME_SCENE_ASSET_ROOT =
  '/smoke/horde-same-scene-0482274' as const;

export interface SameSceneSmokeFrame {
  index: number;
  kind:
    | 'no-history-control'
    | 'actor-prefix'
    | 'actor-departed'
    | 'after-departure';
  timestampMs: number;
  prefixSampleCount: number;
  trafficExposureSeconds: number;
  trafficChecksum: string;
  topologyPossibilityChecksum: string;
}

export interface VerifiedSameSceneSmokeSource {
  frames: readonly SameSceneSmokeFrame[];
  svgText: string;
  requestedRoute: typeof ACCEPTED_SAME_SCENE_ROUTE;
  effectiveRoute: typeof ACCEPTED_SAME_SCENE_ROUTE;
  presenterRevision: typeof ACCEPTED_SAME_SCENE_PRESENTER_REVISION;
  verifierRevision: typeof ACCEPTED_SAME_SCENE_VERIFIER_REVISION;
  verifierModuleBlob: typeof ACCEPTED_SAME_SCENE_VERIFIER_BLOB;
  acceptedReceiptSha256: typeof ACCEPTED_SAME_SCENE_SOURCE_RECEIPT_SHA256;
  manifestSha256: typeof ACCEPTED_SAME_SCENE_MANIFEST_SHA256;
  svgSha256: typeof ACCEPTED_SAME_SCENE_SVG_SHA256;
  sourceStatus: 'exact-accepted-replay';
}

export async function verifyAcceptedSameSceneSmokeSource(
  manifestText: string,
  svgText: string,
): Promise<VerifiedSameSceneSmokeSource> {
  const manifestSha256 = await sha256(manifestText);
  const svgSha256 = await sha256(svgText);
  requireSmoke(
    manifestSha256 === ACCEPTED_SAME_SCENE_MANIFEST_SHA256,
    'accepted replay manifest bytes are missing or substituted',
  );
  requireSmoke(
    svgSha256 === ACCEPTED_SAME_SCENE_SVG_SHA256,
    'accepted replay SVG bytes are missing or substituted',
  );

  const manifest = parseRecord(manifestText);
  const route = record(manifest.route, 'manifest route');
  const identity = record(manifest.identity, 'manifest identity');
  const status = record(manifest.status, 'manifest status');
  const output = record(manifest.output, 'manifest output');
  const authority = record(manifest.authority, 'manifest authority');
  const frames = manifest.frames;

  requireSmoke(
    manifest.schema === 'lerms.horde-same-scene-smoke-manifest.v0' &&
      manifest.sourceClass === 'exact-accepted-replay' &&
      manifest.acceptedReceiptSha256 ===
        ACCEPTED_SAME_SCENE_SOURCE_RECEIPT_SHA256 &&
      manifest.acceptedSvgSha256 === ACCEPTED_SAME_SCENE_SVG_SHA256,
    'accepted replay manifest provenance is incompatible',
  );
  requireSmoke(
    status.ok === true &&
      status.phase === 'complete' &&
      status.fallbackStatus === 'none' &&
      status.staleStatus === 'fresh' &&
      status.failurePhase === null,
    'accepted replay source is fallback, stale, partial, or failed',
  );
  requireSmoke(
    route.requested === ACCEPTED_SAME_SCENE_ROUTE &&
      route.effective === ACCEPTED_SAME_SCENE_ROUTE,
    'accepted replay requested and effective routes do not match',
  );
  requireSmoke(
    identity.presenterRevision ===
      ACCEPTED_SAME_SCENE_PRESENTER_REVISION &&
      identity.verifierRevision ===
        ACCEPTED_SAME_SCENE_VERIFIER_REVISION &&
      identity.verifierModuleBlob === ACCEPTED_SAME_SCENE_VERIFIER_BLOB,
    'accepted presenter or reviewed verifier identity is missing',
  );
  requireSmoke(
    output.imageSha256 === ACCEPTED_SAME_SCENE_SVG_SHA256 &&
      output.width === 2160 &&
      output.height === 1080,
    'accepted replay output identity or dimensions changed',
  );
  requireSmoke(
    authority.machineContractAccepted === true &&
      authority.visualOutcomeAccepted === false &&
      Array.isArray(authority.pending) &&
      authority.pending.length === 1 &&
      authority.pending[0] === 'horde_visual_inspection',
    'accepted replay machine or visual authority boundary changed',
  );
  requireSmoke(
    Array.isArray(frames) && frames.length === 18,
    'accepted replay frame inventory is partial',
  );

  const parsedFrames = frames.map(parseFrame);
  requireSmoke(
    parsedFrames[0]?.kind === 'no-history-control',
    'accepted replay lost its no-history control',
  );
  const moving = parsedFrames.filter(({ kind }) => kind === 'actor-prefix');
  requireSmoke(
    moving.length === 15 &&
      moving.every(
        (frame, index) =>
          frame.prefixSampleCount === index + 1 &&
          frame.timestampMs === index * 174,
      ),
    'accepted replay moving prefix sequence is incomplete or reordered',
  );
  const immediateDeparture = parsedFrames.at(-2);
  const laterDeparture = parsedFrames.at(-1);
  requireSmoke(
    immediateDeparture?.kind === 'actor-departed' &&
      laterDeparture?.kind === 'after-departure' &&
      immediateDeparture.prefixSampleCount === 15 &&
      laterDeparture.prefixSampleCount === 15 &&
      immediateDeparture.trafficChecksum === laterDeparture.trafficChecksum,
    'accepted replay lost the body-departure pressure persistence sequence',
  );

  const panelCount = (svgText.match(/data-same-scene="true"/g) ?? []).length;
  const bodyCount = (svgText.match(/data-visible-lerm-body="true"/g) ?? [])
    .length;
  requireSmoke(
    panelCount === 18 && bodyCount === 15,
    'accepted replay SVG panel or moving-body inventory is partial',
  );

  return {
    frames: parsedFrames,
    svgText,
    requestedRoute: ACCEPTED_SAME_SCENE_ROUTE,
    effectiveRoute: ACCEPTED_SAME_SCENE_ROUTE,
    presenterRevision: ACCEPTED_SAME_SCENE_PRESENTER_REVISION,
    verifierRevision: ACCEPTED_SAME_SCENE_VERIFIER_REVISION,
    verifierModuleBlob: ACCEPTED_SAME_SCENE_VERIFIER_BLOB,
    acceptedReceiptSha256: ACCEPTED_SAME_SCENE_SOURCE_RECEIPT_SHA256,
    manifestSha256: ACCEPTED_SAME_SCENE_MANIFEST_SHA256,
    svgSha256: ACCEPTED_SAME_SCENE_SVG_SHA256,
    sourceStatus: 'exact-accepted-replay',
  };
}

function parseFrame(value: unknown, index: number): SameSceneSmokeFrame {
  const frame = record(value, `replay frame ${index}`);
  requireSmoke(
    frame.index === index &&
      typeof frame.timestampMs === 'number' &&
      typeof frame.prefixSampleCount === 'number' &&
      typeof frame.trafficExposureSeconds === 'number' &&
      typeof frame.trafficChecksum === 'string' &&
      typeof frame.topologyPossibilityChecksum === 'string' &&
      (frame.kind === 'no-history-control' ||
        frame.kind === 'actor-prefix' ||
        frame.kind === 'actor-departed' ||
        frame.kind === 'after-departure'),
    `replay frame ${index} is incomplete or incompatible`,
  );
  return {
    index,
    kind: frame.kind,
    timestampMs: frame.timestampMs,
    prefixSampleCount: frame.prefixSampleCount,
    trafficExposureSeconds: frame.trafficExposureSeconds,
    trafficChecksum: frame.trafficChecksum,
    topologyPossibilityChecksum: frame.topologyPossibilityChecksum,
  };
}

function parseRecord(text: string): Record<string, unknown> {
  try {
    return record(JSON.parse(text), 'accepted replay manifest');
  } catch (error) {
    throw new Error(
      `accepted replay manifest is not valid JSON: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

function record(value: unknown, label: string): Record<string, any> {
  requireSmoke(
    value !== null && typeof value === 'object' && !Array.isArray(value),
    `${label} is missing`,
  );
  return value as Record<string, any>;
}

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(text),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function requireSmoke(value: boolean, message: string): asserts value {
  if (!value) throw new Error(message);
}
