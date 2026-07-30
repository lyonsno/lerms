import {
  LERM_HORDE_PRIMARY_VIEWER_ACTOR_FRAME_ROUTE,
  LERM_HORDE_PRIMARY_VIEWER_ACTOR_FRAME_SCHEMA,
  resolveLermHordePresentationSupportBinding,
  type LermHordePresentationSupportBinding,
  type LermHordePrimaryViewerActorFrame,
} from '../lerm-horde-primary-viewer-actor-frame.js';
import {
  HILL_GPU_RESIDENT_ROUTE,
  type HillGpuCpuOracleState,
} from './hill-of-hills-gpu-resident.js';

export const HILL_GPU_CANONICAL_VIEWER_SCHEMA =
  'lerms.hill-gpu-canonical-viewer.v0' as const;
export const HILL_GPU_CANONICAL_VIEWER_ROUTE =
  'lerms/hill-of-hills/primary-viewer-gpu-resident-v0' as const;
export const HILL_GPU_PRESENTED_FRAME_IDENTITY_SCHEMA =
  'lerms.hill-gpu-presented-frame-identity.v0' as const;

export interface HillGpuPresentedGenerationIdentity {
  generation: number;
  frameId: string;
  supportFrameChecksum: string;
  producerTrafficFieldChecksum: string;
}

export interface HillGpuPresentedFrameIdentity {
  schema: typeof HILL_GPU_PRESENTED_FRAME_IDENTITY_SCHEMA;
  route: {
    requested: typeof HILL_GPU_RESIDENT_ROUTE;
    effective: typeof HILL_GPU_RESIDENT_ROUTE;
    backend: 'webgpu';
    fallbackStatus: 'none';
    staleStatus: 'fresh';
  };
  generation: {
    previous: number;
    current: number;
    highestAdmittedEventSequence: number;
    queueSubmissionOrdinal: number;
  };
  previous: HillGpuPresentedGenerationIdentity;
  current: HillGpuPresentedGenerationIdentity;
  frameId: string;
  topologyChecksum: string;
  supportFrameChecksum: string;
  producerTrafficFieldChecksum: string;
  heightChecksum: string;
  addressingKey: string;
  terrainLength: number;
  presentationAlpha: number;
}

export interface HillGpuCanonicalViewerReceipt {
  schema: typeof HILL_GPU_CANONICAL_VIEWER_SCHEMA;
  ok: true;
  route: {
    requested: typeof HILL_GPU_CANONICAL_VIEWER_ROUTE;
    effective: typeof HILL_GPU_CANONICAL_VIEWER_ROUTE;
    terrain: typeof HILL_GPU_RESIDENT_ROUTE;
    actor: typeof LERM_HORDE_PRIMARY_VIEWER_ACTOR_FRAME_ROUTE;
    backend: 'webgpu';
    fallbackStatus: 'none';
    staleStatus: 'fresh';
  };
  presentation: HillGpuPresentedFrameIdentity;
  actor: {
    frameId: string;
    elapsedMs: number;
    tickCount: number;
    supportBindingFrameId: string;
  };
  transfer: {
    fullTerrainCpuUploads: 1;
    fullFieldWorkerTransfersAfterInitialization: 0;
    fullFieldReadbacksAfterInitialization: 0;
  };
  composition: {
    visibleCanvasCount: 1;
    offscreenActorSurfaceCount: number;
    actorImportKind: 'external-image-copy';
  };
  visualEvidence: {
    source: 'browser-capture';
    artifactPath: string;
    sha256: string;
    width: number;
    height: number;
    terrainPixelCount: number;
    actorPixelCount: number;
    sampledAtMs: number;
  };
}

export function createHillGpuPresentedFrameIdentity(input: {
  state: HillGpuCpuOracleState;
  runtime: {
    requestedRoute: string;
    effectiveRoute: string;
    backend: string;
    fallbackStatus: string;
    staleStatus: string;
    previousGeneration: number;
    currentGeneration: number;
    highestAdmittedEventSequence: number;
    queueSubmissionOrdinal: number;
  };
  presentationAlpha: number;
}): HillGpuPresentedFrameIdentity {
  const { state, runtime } = input;
  requireCanonicalViewer(
    runtime.requestedRoute === HILL_GPU_RESIDENT_ROUTE &&
      runtime.effectiveRoute === HILL_GPU_RESIDENT_ROUTE &&
      runtime.backend === 'webgpu' &&
      runtime.fallbackStatus === 'none',
    'canonical Hill GPU presentation cannot use a fallback or different effective route',
  );
  requireCanonicalViewer(
    runtime.staleStatus === 'fresh',
    'canonical Hill GPU presentation must be fresh',
  );
  requireCanonicalViewer(
    runtime.previousGeneration === state.previousGeneration &&
      runtime.currentGeneration === state.generation &&
      runtime.highestAdmittedEventSequence ===
        state.highestAdmittedEventSequence,
    'canonical Hill GPU presentation generation does not match resident state',
  );
  requireCanonicalViewer(
    Number.isInteger(runtime.queueSubmissionOrdinal) &&
      runtime.queueSubmissionOrdinal >= 0,
    'canonical Hill GPU queue submission ordinal is invalid',
  );
  requireCanonicalViewer(
    Number.isFinite(input.presentationAlpha) &&
      input.presentationAlpha >= 0 &&
      input.presentationAlpha <= 1,
    'canonical Hill GPU presentation alpha must be between zero and one',
  );
  const previous = generationIdentity(
    state,
    'previous',
  );
  const current = generationIdentity(state, 'current');
  return {
    schema: HILL_GPU_PRESENTED_FRAME_IDENTITY_SCHEMA,
    route: {
      requested: HILL_GPU_RESIDENT_ROUTE,
      effective: HILL_GPU_RESIDENT_ROUTE,
      backend: 'webgpu',
      fallbackStatus: 'none',
      staleStatus: 'fresh',
    },
    generation: {
      previous: state.previousGeneration,
      current: state.generation,
      highestAdmittedEventSequence:
        state.highestAdmittedEventSequence,
      queueSubmissionOrdinal: runtime.queueSubmissionOrdinal,
    },
    previous,
    current,
    frameId: current.frameId,
    topologyChecksum:
      state.initialization.source.topologyChecksum,
    supportFrameChecksum: current.supportFrameChecksum,
    producerTrafficFieldChecksum:
      current.producerTrafficFieldChecksum,
    heightChecksum: current.supportFrameChecksum,
    addressingKey: state.initialization.addressingKey,
    terrainLength: state.initialization.domain.length,
    presentationAlpha: input.presentationAlpha,
  };
}

export function bindLermHordeActorFrameToHillGpuPresentation(
  actor: LermHordePrimaryViewerActorFrame,
  binding: LermHordePresentationSupportBinding,
  presentation: HillGpuPresentedFrameIdentity,
): LermHordePrimaryViewerActorFrame {
  requireCanonicalViewer(
    actor?.schema ===
      LERM_HORDE_PRIMARY_VIEWER_ACTOR_FRAME_SCHEMA &&
      actor.route?.requested ===
        LERM_HORDE_PRIMARY_VIEWER_ACTOR_FRAME_ROUTE &&
      actor.route.effective ===
        LERM_HORDE_PRIMARY_VIEWER_ACTOR_FRAME_ROUTE &&
      actor.route.fallbackStatus === 'none' &&
      actor.route.staleStatus === 'fresh',
    'canonical Hill GPU composition requires the exact fresh Horde actor frame',
  );
  requireCanonicalViewer(
    presentation?.schema ===
      HILL_GPU_PRESENTED_FRAME_IDENTITY_SCHEMA &&
      presentation.route.requested ===
        HILL_GPU_RESIDENT_ROUTE &&
      presentation.route.effective ===
        HILL_GPU_RESIDENT_ROUTE &&
      presentation.route.backend === 'webgpu' &&
      presentation.route.fallbackStatus === 'none' &&
      presentation.route.staleStatus === 'fresh',
    'canonical Hill GPU presented-frame identity is invalid',
  );
  requireCanonicalViewer(
    presentation.frameId === presentation.current.frameId &&
      presentation.supportFrameChecksum ===
        presentation.current.supportFrameChecksum &&
      presentation.producerTrafficFieldChecksum ===
        presentation.current
          .producerTrafficFieldChecksum &&
      presentation.heightChecksum ===
        presentation.current.supportFrameChecksum &&
      presentation.generation.previous ===
        presentation.previous.generation &&
      presentation.generation.current ===
        presentation.current.generation,
    'canonical Hill GPU presented-frame identity contradicts its generation payload',
  );
  requireCanonicalViewer(
    binding.route.fallbackStatus === 'none' &&
      binding.route.staleStatus === 'fresh' &&
      binding.previous.generation ===
        presentation.generation.previous &&
      binding.current.generation ===
        presentation.generation.current &&
      sameSupportIdentity(
        binding.previous.identity,
        presentation,
        presentation.previous,
      ) &&
      sameSupportIdentity(
        binding.current.identity,
        presentation,
        presentation.current,
      ),
    'Horde support binding does not match the independently presented Hill identity or generation',
  );
  if (actor.lifecycle.phase === 'departed') {
    requireCanonicalViewer(
      actor.lifecycle.visible === false && actor.pose === null,
      'departed Horde actor frame is incoherent',
    );
    return {
      ...actor,
      terrain: terrainIdentity(presentation),
    };
  }
  requireCanonicalViewer(
    actor.lifecycle.visible === true && actor.pose !== null,
    'traversing Horde actor frame requires a visible pose',
  );
  const pose = actor.pose;
  const resolved =
    resolveLermHordePresentationSupportBinding(
      binding,
      pose.rootFrame,
    );
  const rootFrame = {
    ...pose.rootFrame,
    origin: {
      ...pose.rootFrame.origin,
      y: resolved.rootHeight + pose.support.rootLift,
    },
  };
  const rebound =
    resolveLermHordePresentationSupportBinding(
      binding,
      rootFrame,
    );
  return {
    ...actor,
    pose: {
      ...pose,
      rootFrame,
      support: {
        ...pose.support,
        sampledHeight: rebound.rootHeight,
        renderedHillSourceId: presentation.frameId,
        presentationBinding: {
          route: { ...binding.route },
          previousGeneration:
            binding.previous.generation,
          currentGeneration: binding.current.generation,
          currentFrameId: presentation.frameId,
          presentationAlpha:
            presentation.presentationAlpha,
        },
      },
      squirm: {
        ...pose.squirm,
        terrainSupportProfile:
          rebound.terrainSupportProfile.map((sample) => ({
            ...sample,
          })),
      },
      projection: {
        terrainLength: presentation.terrainLength,
      },
    },
    terrain: terrainIdentity(presentation),
  };
}

export function createHillGpuCanonicalViewerReceipt(input: {
  presentation: HillGpuPresentedFrameIdentity;
  actor: LermHordePrimaryViewerActorFrame;
  transfer: HillGpuCanonicalViewerReceipt['transfer'];
  composition: HillGpuCanonicalViewerReceipt['composition'];
  visualEvidence: HillGpuCanonicalViewerReceipt['visualEvidence'];
}): HillGpuCanonicalViewerReceipt {
  const receipt: HillGpuCanonicalViewerReceipt = {
    schema: HILL_GPU_CANONICAL_VIEWER_SCHEMA,
    ok: true,
    route: {
      requested: HILL_GPU_CANONICAL_VIEWER_ROUTE,
      effective: HILL_GPU_CANONICAL_VIEWER_ROUTE,
      terrain: HILL_GPU_RESIDENT_ROUTE,
      actor: LERM_HORDE_PRIMARY_VIEWER_ACTOR_FRAME_ROUTE,
      backend: 'webgpu',
      fallbackStatus: 'none',
      staleStatus: 'fresh',
    },
    presentation: structuredClone(input.presentation),
    actor: {
      frameId: input.actor.terrain.frameId,
      elapsedMs: input.actor.lifecycle.elapsedMs,
      tickCount: input.actor.lifecycle.tickCount,
      supportBindingFrameId:
        input.actor.pose?.support.presentationBinding
          ?.currentFrameId ?? input.actor.terrain.frameId,
    },
    transfer: { ...input.transfer },
    composition: { ...input.composition },
    visualEvidence: { ...input.visualEvidence },
  };
  assertHillGpuCanonicalViewerReceipt(receipt);
  return receipt;
}

export function assertHillGpuCanonicalViewerReceipt(
  receipt: HillGpuCanonicalViewerReceipt,
): void {
  requireCanonicalViewer(
    receipt?.schema === HILL_GPU_CANONICAL_VIEWER_SCHEMA &&
      receipt.ok === true,
    'canonical Hill GPU viewer receipt schema or status is invalid',
  );
  requireCanonicalViewer(
    receipt.route.requested ===
      HILL_GPU_CANONICAL_VIEWER_ROUTE &&
      receipt.route.effective ===
        HILL_GPU_CANONICAL_VIEWER_ROUTE &&
      receipt.route.terrain === HILL_GPU_RESIDENT_ROUTE &&
      receipt.route.actor ===
        LERM_HORDE_PRIMARY_VIEWER_ACTOR_FRAME_ROUTE &&
      receipt.route.backend === 'webgpu' &&
      receipt.route.fallbackStatus === 'none' &&
      receipt.route.staleStatus === 'fresh',
    'canonical Hill GPU viewer route is stale, substituted, or uses fallback',
  );
  requireCanonicalViewer(
    receipt.actor.frameId ===
      receipt.presentation.frameId &&
      receipt.actor.supportBindingFrameId ===
        receipt.presentation.frameId,
    'canonical Hill GPU actor, support, and presentation identities diverged',
  );
  requireCanonicalViewer(
    receipt.transfer.fullTerrainCpuUploads === 1 &&
      receipt.transfer
        .fullFieldWorkerTransfersAfterInitialization === 0,
    'canonical Hill GPU viewer transported a full terrain field after initialization',
  );
  requireCanonicalViewer(
    receipt.transfer
      .fullFieldReadbacksAfterInitialization === 0,
    'canonical Hill GPU viewer performed a forbidden full-field readback',
  );
  requireCanonicalViewer(
    receipt.composition.visibleCanvasCount === 1 &&
      receipt.composition.offscreenActorSurfaceCount >= 1 &&
      receipt.composition.actorImportKind ===
        'external-image-copy',
    'canonical Hill GPU viewer requires one visible canvas and an imported offscreen actor surface',
  );
  requireCanonicalViewer(
    receipt.visualEvidence.source ===
      'browser-capture' &&
      nonblank(receipt.visualEvidence.artifactPath) &&
      /^[0-9a-f]{64}$/u.test(
        receipt.visualEvidence.sha256,
      ),
    'canonical Hill GPU visual evidence requires a browser capture artifact and SHA-256 hash',
  );
  requireCanonicalViewer(
    Number.isInteger(receipt.visualEvidence.width) &&
      receipt.visualEvidence.width > 0 &&
      Number.isInteger(receipt.visualEvidence.height) &&
      receipt.visualEvidence.height > 0 &&
      Number.isInteger(
        receipt.visualEvidence.terrainPixelCount,
      ) &&
      receipt.visualEvidence.terrainPixelCount > 0,
    'canonical Hill GPU browser capture has blank terrain pixel evidence',
  );
  requireCanonicalViewer(
    Number.isInteger(
      receipt.visualEvidence.actorPixelCount,
    ) && receipt.visualEvidence.actorPixelCount > 0,
    'canonical Hill GPU browser capture has blank actor pixel evidence',
  );
  requireCanonicalViewer(
    Number.isFinite(receipt.visualEvidence.sampledAtMs) &&
      receipt.visualEvidence.sampledAtMs >= 0,
    'canonical Hill GPU browser capture timestamp is invalid',
  );
}

function generationIdentity(
  state: HillGpuCpuOracleState,
  kind: 'previous' | 'current',
): HillGpuPresentedGenerationIdentity {
  const generation =
    kind === 'previous'
      ? state.previousGeneration
      : state.generation;
  const heights =
    kind === 'previous'
      ? state.previousHeights
      : state.currentHeights;
  const traffic =
    kind === 'previous'
      ? state.previousTraffic
      : state.currentTraffic;
  return {
    generation,
    frameId: `${state.initialization.source.frameId}:gpu-${generation}`,
    supportFrameChecksum: checksumFloat32(heights),
    producerTrafficFieldChecksum:
      checksumFloat32(traffic),
  };
}

function sameSupportIdentity(
  identity: LermHordePresentationSupportBinding[
    'current'
  ]['identity'],
  presentation: HillGpuPresentedFrameIdentity,
  generation: HillGpuPresentedGenerationIdentity,
): boolean {
  return (
    identity.route === HILL_GPU_RESIDENT_ROUTE &&
    identity.frameId === generation.frameId &&
    identity.topologyChecksum ===
      presentation.topologyChecksum &&
    identity.supportFrameChecksum ===
      generation.supportFrameChecksum &&
    identity.producerTrafficFieldChecksum ===
      generation.producerTrafficFieldChecksum &&
    identity.addressingKey ===
      presentation.addressingKey &&
    identity.terrainLength ===
      presentation.terrainLength
  );
}

function terrainIdentity(
  presentation: HillGpuPresentedFrameIdentity,
): LermHordePrimaryViewerActorFrame['terrain'] {
  return {
    frameId: presentation.frameId,
    sampleChecksum: presentation.heightChecksum,
    topologyChecksum: presentation.topologyChecksum,
    trafficChecksum:
      presentation.producerTrafficFieldChecksum,
    supportFrameChecksum:
      presentation.supportFrameChecksum,
  };
}

function checksumFloat32(values: Float32Array): string {
  const bytes = new Uint8Array(
    values.buffer,
    values.byteOffset,
    values.byteLength,
  );
  let hash = 0x811c9dc5;
  for (const value of bytes) {
    hash ^= value;
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function nonblank(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function requireCanonicalViewer(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) throw new Error(message);
}
