import assert from 'node:assert/strict';
import {
  EXACT_3D_CARRIER_BODY_SHA256,
  EXACT_3D_CARRIER_PLAYBACK_REVISION,
  EXACT_3D_CARRIER_PRESENTATION_REVISION,
  EXACT_3D_CARRIER_RAIL_HISTORY_SHA256,
  EXACT_3D_CARRIER_RAIL_ID,
  EXACT_3D_CARRIER_RAIL_MODULE_SHA256,
  EXACT_3D_CARRIER_RAIL_REVISION,
  EXACT_3D_CARRIER_REGISTRATION_SHA256,
  validateExact3dCarrierReceipt,
} from '../src/lerm-horde-3d-carrier-contract.ts';

const exactReceipt = {
  schema: 'lerms.horde-3d-carrier-history.v0',
  status: {
    ok: true,
    phase: 'complete',
    fallbackStatus: 'none',
    staleStatus: 'fresh',
    failurePhase: null,
  },
  identity: {
    bodySha256: EXACT_3D_CARRIER_BODY_SHA256,
    registrationSha256: EXACT_3D_CARRIER_REGISTRATION_SHA256,
    railRevision: EXACT_3D_CARRIER_RAIL_REVISION,
    railModuleSha256: EXACT_3D_CARRIER_RAIL_MODULE_SHA256,
    railHistorySha256: EXACT_3D_CARRIER_RAIL_HISTORY_SHA256,
    effectiveRailId: EXACT_3D_CARRIER_RAIL_ID,
    presentationRevision: EXACT_3D_CARRIER_PRESENTATION_REVISION,
    playbackRevision: EXACT_3D_CARRIER_PLAYBACK_REVISION,
    requestedHillRoute: 'lerms/hill-of-hills/horde-same-scene-prefix-replay',
    effectiveHillRoute: 'lerms/hill-of-hills/horde-same-scene-prefix-replay',
    hillPresenterRevision: '0482274d0612b55969ad6c71f8f5c79c8721ce77',
  },
  playback: {
    initialState: 'paused',
    operatorPlayCount: 1,
    autoplayObserved: false,
  },
  composition: {
    carrierIdentity: '719024',
    speciesAuthority: 'non-lerm-engineering-carrier',
    rootTransformPath: 'evaluator-world-positions',
    hiddenGlyphFallback: false,
    supportRootLiftApplications: 0,
    contactCorrectionApplications: 0,
  },
  samples: Array.from({ length: 15 }, (_, index) => ({
    index,
    sourceDistance: index * 0.25,
    progress: index / 14,
    rootTransformApplications: 1,
    bodyVisible: true,
    rootFrameSource: 'ced6db3d.sampleCreatureScaleLocomotionRail',
    rootFrameOrigin: [-1.25, 0.6, -1.5 + index * (3 / 14)],
    rootFrameLateral: [-1, 0, 0],
    rootFrameNormal: [0, 1, 0],
    rootFrameTangent: [0, 0, -1],
  })),
  departure: {
    bodyVisible: false,
    hillHistoryRetained: true,
  },
};

assert.doesNotThrow(() => validateExact3dCarrierReceipt(exactReceipt));

for (const [label, mutation] of [
  ['body hash', (receipt) => (receipt.identity.bodySha256 = '0'.repeat(64))],
  ['rail identity', (receipt) => (receipt.identity.railRevision = 'wrong')],
  ['rail module', (receipt) => (receipt.identity.railModuleSha256 = '0'.repeat(64))],
  ['rail history', (receipt) => (receipt.identity.railHistorySha256 = '0'.repeat(64))],
  ['effective rail', (receipt) => (receipt.identity.effectiveRailId = 'fallback')],
  ['effective Hill route', (receipt) => (receipt.identity.effectiveHillRoute = 'fallback')],
  ['autoplay', (receipt) => (receipt.playback.autoplayObserved = true)],
  ['hidden glyph fallback', (receipt) => (receipt.composition.hiddenGlyphFallback = true)],
  ['double transform', (receipt) => (receipt.samples[5].rootTransformApplications = 2)],
  ['screen frame', (receipt) => (receipt.samples[5].rootFrameSource = 'svg-screen-projection')],
  ['left-handed frame', (receipt) => (receipt.samples[5].rootFrameTangent = [0, 0, 1])],
  ['reversed progress', (receipt) => (receipt.samples[8].sourceDistance = 0.1)],
]) {
  const candidate = structuredClone(exactReceipt);
  mutation(candidate);
  assert.throws(
    () => validateExact3dCarrierReceipt(candidate),
    undefined,
    `${label} must fail the 3D carrier receipt`,
  );
}

console.log('lerm horde 3D carrier contracts: ok');
