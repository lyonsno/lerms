export const EXACT_3D_CARRIER_BODY_SHA256 =
  '8fed20d958ef48797c14ad1d3846a50eae05d43e6ae67f8805060b02f1abde8e' as const;
export const EXACT_3D_CARRIER_REGISTRATION_SHA256 =
  'a63fa02ffa7a144234eef3b9902ac9d349fd413d93a19c87ee1464b0b61ca7f9' as const;
export const EXACT_3D_CARRIER_RAIL_REVISION =
  'ced6db3d2ed3325ae86f781ab9d7d565dc6d5f58' as const;
export const EXACT_3D_CARRIER_RAIL_MODULE_SHA256 =
  'ffce984721d00468856e70bd0805961a852d8690bcd402d1dc5ae96ad1ec88f0' as const;
export const EXACT_3D_CARRIER_RAIL_HISTORY_SHA256 =
  'c56627554f5cacb8f151361419bfe70177e2d86490193e30b2f148a11b430b2e' as const;
export const EXACT_3D_CARRIER_RAIL_ID =
  'lerm-horde-719024-control-crossing-v0-left-longitudinal-short-rail' as const;
export const EXACT_3D_CARRIER_PRESENTATION_REVISION =
  '6217fff858c0b12e330499baf28127f9122826f7' as const;
export const EXACT_3D_CARRIER_PLAYBACK_REVISION =
  'fbe2e851130bd142b64727a494809141b9954cef' as const;
export const EXACT_3D_CARRIER_HILL_ROUTE =
  'lerms/hill-of-hills/horde-same-scene-prefix-replay' as const;
export const EXACT_3D_CARRIER_HILL_PRESENTER_REVISION =
  '0482274d0612b55969ad6c71f8f5c79c8721ce77' as const;
export const EXACT_3D_CARRIER_EVALUATOR_ROUTE =
  'kaminos/fitted-proxy-rig/arbitrary-phase-plus-semantic-probes-v0' as const;

export interface Exact3dCarrierReceipt {
  schema: 'lerms.horde-3d-carrier-history.v0';
  status: {
    ok: boolean;
    phase: string;
    fallbackStatus: string;
    staleStatus: string;
    failurePhase: string | null;
  };
  identity: {
    bodySha256: string;
    registrationSha256: string;
    railRevision: string;
    railModuleSha256: string;
    railHistorySha256: string;
    effectiveRailId: string;
    presentationRevision: string;
    playbackRevision: string;
    requestedHillRoute: string;
    effectiveHillRoute: string;
    hillPresenterRevision: string;
    effectiveEvaluatorRoute?: string;
  };
  playback: {
    initialState: string;
    operatorPlayCount: number;
    autoplayObserved: boolean;
  };
  composition: {
    carrierIdentity: string;
    speciesAuthority: string;
    rootTransformPath: string;
    hiddenGlyphFallback: boolean;
    supportRootLiftApplications: number;
    contactCorrectionApplications: number;
  };
  samples: Array<{
    index: number;
    sourceDistance: number;
    progress: number;
    rootTransformApplications: number;
    bodyVisible: boolean;
    rootFrameSource: string;
    rootFrameOrigin: [number, number, number];
    rootFrameLateral: [number, number, number];
    rootFrameNormal: [number, number, number];
    rootFrameTangent: [number, number, number];
  }>;
  departure: {
    bodyVisible: boolean;
    hillHistoryRetained: boolean;
  };
}

export function validateExact3dCarrierReceipt(
  receipt: Exact3dCarrierReceipt,
): Exact3dCarrierReceipt {
  if (receipt.schema !== 'lerms.horde-3d-carrier-history.v0') {
    throw new Error('unexpected 3D carrier receipt schema');
  }
  requireCarrier(
    receipt.status.ok === true &&
      receipt.status.phase === 'complete' &&
      receipt.status.fallbackStatus === 'none' &&
      receipt.status.staleStatus === 'fresh' &&
      receipt.status.failurePhase === null,
    '3D carrier receipt is failed, stale, partial, or fallback',
  );
  requireCarrier(
    receipt.identity.bodySha256 === EXACT_3D_CARRIER_BODY_SHA256 &&
      receipt.identity.registrationSha256 ===
        EXACT_3D_CARRIER_REGISTRATION_SHA256 &&
      receipt.identity.railRevision === EXACT_3D_CARRIER_RAIL_REVISION &&
      receipt.identity.railModuleSha256 ===
        EXACT_3D_CARRIER_RAIL_MODULE_SHA256 &&
      receipt.identity.railHistorySha256 ===
        EXACT_3D_CARRIER_RAIL_HISTORY_SHA256 &&
      receipt.identity.effectiveRailId === EXACT_3D_CARRIER_RAIL_ID &&
      receipt.identity.presentationRevision ===
        EXACT_3D_CARRIER_PRESENTATION_REVISION &&
      receipt.identity.playbackRevision === EXACT_3D_CARRIER_PLAYBACK_REVISION,
    '3D carrier body, registration, rail, presentation, or playback identity changed',
  );
  requireCarrier(
    receipt.identity.requestedHillRoute === EXACT_3D_CARRIER_HILL_ROUTE &&
      receipt.identity.effectiveHillRoute === EXACT_3D_CARRIER_HILL_ROUTE &&
      receipt.identity.hillPresenterRevision ===
        EXACT_3D_CARRIER_HILL_PRESENTER_REVISION,
    '3D carrier requested or effective Hill identity changed',
  );
  if (receipt.identity.effectiveEvaluatorRoute !== undefined) {
    requireCarrier(
      receipt.identity.effectiveEvaluatorRoute ===
        EXACT_3D_CARRIER_EVALUATOR_ROUTE,
      '3D carrier fitted evaluator route changed',
    );
  }
  requireCarrier(
    receipt.playback.initialState === 'paused' &&
      receipt.playback.operatorPlayCount === 1 &&
      receipt.playback.autoplayObserved === false,
    '3D carrier playback did not remain paused until one operator Play',
  );
  requireCarrier(
    receipt.composition.carrierIdentity === '719024' &&
      receipt.composition.speciesAuthority ===
        'non-lerm-engineering-carrier' &&
      receipt.composition.rootTransformPath ===
        'evaluator-world-positions' &&
      receipt.composition.hiddenGlyphFallback === false &&
      receipt.composition.supportRootLiftApplications === 0 &&
      receipt.composition.contactCorrectionApplications === 0,
    '3D carrier composition used a hidden glyph, extra lift/correction, or false species authority',
  );
  requireCarrier(
    receipt.samples.length === 15,
    '3D carrier history is missing or partial',
  );
  receipt.samples.forEach((sample, index) => {
    requireCarrier(
      sample.index === index &&
        Number.isFinite(sample.sourceDistance) &&
        Number.isFinite(sample.progress) &&
        sample.progress >= 0 &&
        sample.progress <= 1 &&
        sample.rootTransformApplications === 1 &&
        sample.bodyVisible === true &&
        sample.rootFrameSource ===
          'ced6db3d.sampleCreatureScaleLocomotionRail' &&
        isFiniteVec3(sample.rootFrameOrigin) &&
        isOrthonormalRightHanded(
          sample.rootFrameLateral,
          sample.rootFrameNormal,
          sample.rootFrameTangent,
        ),
      `3D carrier sample ${index} is malformed, blank, not rail-derived, or not single-transform`,
    );
    if (index > 0) {
      const previous = receipt.samples[index - 1];
      requireCarrier(
        sample.sourceDistance > previous.sourceDistance &&
          sample.progress > previous.progress,
        `3D carrier source distance or progress reversed at sample ${index}`,
      );
    }
  });
  requireCarrier(
    receipt.samples[0]?.progress === 0 &&
      receipt.samples.at(-1)?.progress === 1 &&
      receipt.departure.bodyVisible === false &&
      receipt.departure.hillHistoryRetained === true,
    '3D carrier traversal endpoints or departed Hill history are incomplete',
  );
  return receipt;
}

function requireCarrier(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function isFiniteVec3(value: readonly number[]): value is [number, number, number] {
  return value.length === 3 && value.every(Number.isFinite);
}

function isOrthonormalRightHanded(
  lateral: readonly number[],
  normal: readonly number[],
  tangent: readonly number[],
): boolean {
  if (
    !isFiniteVec3(lateral) ||
    !isFiniteVec3(normal) ||
    !isFiniteVec3(tangent)
  ) {
    return false;
  }
  const dot = (left: readonly number[], right: readonly number[]) =>
    left[0] * right[0] + left[1] * right[1] + left[2] * right[2];
  const length = (vector: readonly number[]) => Math.sqrt(dot(vector, vector));
  const cross = [
    lateral[1] * normal[2] - lateral[2] * normal[1],
    lateral[2] * normal[0] - lateral[0] * normal[2],
    lateral[0] * normal[1] - lateral[1] * normal[0],
  ];
  return (
    Math.abs(length(lateral) - 1) <= 1e-6 &&
    Math.abs(length(normal) - 1) <= 1e-6 &&
    Math.abs(length(tangent) - 1) <= 1e-6 &&
    Math.abs(dot(lateral, normal)) <= 1e-6 &&
    Math.abs(dot(lateral, tangent)) <= 1e-6 &&
    Math.abs(dot(normal, tangent)) <= 1e-6 &&
    dot(cross, tangent) >= 1 - 1e-6
  );
}
