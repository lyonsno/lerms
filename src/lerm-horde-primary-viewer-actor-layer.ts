import {
  LERM_HORDE_PRIMARY_VIEWER_ACTOR_FRAME_ROUTE,
  LERM_HORDE_PRIMARY_VIEWER_ACTOR_FRAME_SCHEMA,
  type LermHordePrimaryViewerActorFrame,
} from './lerm-horde-primary-viewer-actor-frame.js';
import {
  HILL_PRIMARY_VIEWER_ACTOR_DRAW_ORDER,
  HILL_PRIMARY_VIEWER_ACTOR_HOST_ROUTE,
  HILL_PRIMARY_VIEWER_ACTOR_HOST_SCHEMA,
  type HillPrimaryViewerActorAuthority,
  type HillPrimaryViewerActorDrawFrame,
  type HillPrimaryViewerActorLayer,
} from './terrain/hill-primary-viewer-actor-host.js';

export const LERM_HORDE_PRIMARY_VIEWER_ACTOR_LAYER_ID =
  'lerm-horde-exact-719024-live' as const;

export interface LermHordePrimaryViewerActorLayerSource {
  currentActorFrame: () => LermHordePrimaryViewerActorFrame;
  presentIndexedBody: (
    frame: HillPrimaryViewerActorDrawFrame,
    actorFrame: LermHordePrimaryViewerActorFrame,
  ) => void;
}

export function createLermHordePrimaryViewerActorLayer(
  source: LermHordePrimaryViewerActorLayerSource,
): HillPrimaryViewerActorLayer {
  requireLayer(
    typeof source?.currentActorFrame === 'function' &&
      typeof source.presentIndexedBody === 'function',
    'primary-viewer actor layer requires a live indexed GPU body source',
  );

  return {
    id: LERM_HORDE_PRIMARY_VIEWER_ACTOR_LAYER_ID,
    authority() {
      return authorityFor(source.currentActorFrame());
    },
    draw(frame) {
      const actorFrame = source.currentActorFrame();
      validateDrawFrame(frame, actorFrame);
      requireLayer(
        actorFrame.lifecycle.visible && actorFrame.pose !== null,
        'primary-viewer actor layer cannot draw a departed actor',
      );
      source.presentIndexedBody(frame, actorFrame);
    },
  };
}

function authorityFor(
  actorFrame: LermHordePrimaryViewerActorFrame,
): HillPrimaryViewerActorAuthority {
  validateActorFrame(actorFrame);
  return {
    route: { ...actorFrame.route },
    lifecycle: {
      visible: actorFrame.lifecycle.visible,
      phase: actorFrame.lifecycle.phase,
    },
    terrain: {
      frameId: actorFrame.terrain.frameId,
      sampleChecksum: actorFrame.terrain.sampleChecksum,
      topologyChecksum: actorFrame.terrain.topologyChecksum,
    },
  };
}

function validateActorFrame(
  actorFrame: LermHordePrimaryViewerActorFrame,
): void {
  requireLayer(
    actorFrame?.schema === LERM_HORDE_PRIMARY_VIEWER_ACTOR_FRAME_SCHEMA &&
      actorFrame.route?.requested ===
        LERM_HORDE_PRIMARY_VIEWER_ACTOR_FRAME_ROUTE &&
      actorFrame.route.effective ===
        LERM_HORDE_PRIMARY_VIEWER_ACTOR_FRAME_ROUTE &&
      actorFrame.route.fallbackStatus === 'none' &&
      actorFrame.route.staleStatus === 'fresh',
    'primary-viewer actor layer requires the exact fresh Horde actor route',
  );
  requireLayer(
    (actorFrame.lifecycle?.phase === 'traversing' &&
      actorFrame.lifecycle.visible === true &&
      actorFrame.pose !== null) ||
      (actorFrame.lifecycle?.phase === 'departed' &&
        actorFrame.lifecycle.visible === false &&
        actorFrame.pose === null),
    'primary-viewer actor layer received an incoherent actor lifecycle',
  );
}

function validateDrawFrame(
  frame: HillPrimaryViewerActorDrawFrame,
  actorFrame: LermHordePrimaryViewerActorFrame,
): void {
  validateActorFrame(actorFrame);
  requireLayer(
    frame?.schema === HILL_PRIMARY_VIEWER_ACTOR_HOST_SCHEMA &&
      frame.route?.requested === HILL_PRIMARY_VIEWER_ACTOR_HOST_ROUTE &&
      frame.route.effective === HILL_PRIMARY_VIEWER_ACTOR_HOST_ROUTE &&
      frame.route.fallbackStatus === 'none' &&
      frame.route.staleStatus === 'fresh' &&
      frame.drawOrder === HILL_PRIMARY_VIEWER_ACTOR_DRAW_ORDER,
    'primary-viewer actor layer requires the official fresh Hill host route',
  );
  requireLayer(
    frame.actor?.layerId ===
      LERM_HORDE_PRIMARY_VIEWER_ACTOR_LAYER_ID &&
      frame.actor.requestedRoute === actorFrame.route.requested &&
      frame.actor.effectiveRoute === actorFrame.route.effective,
    'primary-viewer actor layer host identity does not match the Horde actor',
  );
  requireLayer(
    frame.terrain?.frameId === actorFrame.terrain.frameId &&
      frame.terrain.sampleChecksum ===
        actorFrame.terrain.sampleChecksum &&
      frame.terrain.topologyChecksum ===
        actorFrame.terrain.topologyChecksum,
    'primary-viewer actor layer requires the current Hill terrain',
  );
  requireLayer(
    typeof frame.project === 'function' &&
      frame.surface?.context !== undefined,
    'primary-viewer actor layer requires Hill projection and an isolated surface',
  );
}

function requireLayer(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) throw new Error(message);
}
