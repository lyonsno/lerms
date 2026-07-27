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
  type HillPrimaryViewerProjectionPoint,
} from './terrain/hill-primary-viewer-actor-host.js';
import type { LermHordePrimaryViewerActorRasterizer } from './lerm-horde-primary-viewer-webgl-rasterizer.js';

export const LERM_HORDE_PRIMARY_VIEWER_ACTOR_LAYER_ID =
  'lerm-horde-exact-719024-live' as const;

export interface LermHordePrimaryViewerActorLayerSource {
  currentActorFrame: () => LermHordePrimaryViewerActorFrame;
  evaluateBodyPositions: (
    actorFrame: LermHordePrimaryViewerActorFrame,
  ) => Float32Array | null;
  rasterizer?: LermHordePrimaryViewerActorRasterizer;
}

interface ProjectedTriangle {
  points: readonly [
    HillPrimaryViewerProjectionPoint,
    HillPrimaryViewerProjectionPoint,
    HillPrimaryViewerProjectionPoint,
  ];
  depth: number;
  light: number;
}

export function createLermHordePrimaryViewerActorLayer(
  source: LermHordePrimaryViewerActorLayerSource,
): HillPrimaryViewerActorLayer {
  requireLayer(
    typeof source?.currentActorFrame === 'function' &&
      typeof source.evaluateBodyPositions === 'function',
    'primary-viewer actor layer requires a live fitted-body source',
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
      const positions = source.evaluateBodyPositions(actorFrame);
      requireLayer(
        positions instanceof Float32Array &&
          positions.length >= 9 &&
          positions.length % 9 === 0 &&
          positions.every(Number.isFinite),
        'primary-viewer visible actor requires finite fitted body positions',
      );
      if (source.rasterizer) {
        const raster = source.rasterizer.render(frame, positions);
        frame.surface.context.drawImage(
          raster,
          0,
          0,
          frame.viewport.width,
          frame.viewport.height,
        );
      } else {
        drawBodyTriangles(frame, positions);
      }
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

function drawBodyTriangles(
  frame: HillPrimaryViewerActorDrawFrame,
  positions: Float32Array,
): void {
  const triangles: ProjectedTriangle[] = [];
  for (let offset = 0; offset < positions.length; offset += 9) {
    const a = worldPointAt(positions, offset);
    const b = worldPointAt(positions, offset + 3);
    const c = worldPointAt(positions, offset + 6);
    const projectedA = frame.project(a);
    const projectedB = frame.project(b);
    const projectedC = frame.project(c);
    requireProjection(projectedA);
    requireProjection(projectedB);
    requireProjection(projectedC);
    triangles.push({
      points: [projectedA, projectedB, projectedC],
      depth:
        (projectedA.depth + projectedB.depth + projectedC.depth) / 3,
      light: triangleLight(a, b, c),
    });
  }
  triangles.sort((left, right) => right.depth - left.depth);

  const context = frame.surface.context;
  context.lineJoin = 'round';
  context.lineWidth = 0.55;
  context.strokeStyle = 'rgba(74, 5, 17, 0.58)';
  for (const triangle of triangles) {
    const [a, b, c] = triangle.points;
    context.beginPath();
    context.moveTo(a.x, a.y);
    context.lineTo(b.x, b.y);
    context.lineTo(c.x, c.y);
    context.closePath();
    const lightness = Math.round(39 + triangle.light * 15);
    context.fillStyle = `hsl(352 76% ${lightness}%)`;
    context.fill();
    context.stroke();
  }
}

function worldPointAt(
  positions: Float32Array,
  offset: number,
): { x: number; y: number; z: number } {
  return {
    x: positions[offset],
    y: positions[offset + 1],
    z: positions[offset + 2],
  };
}

function triangleLight(
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number },
  c: { x: number; y: number; z: number },
): number {
  const ab = {
    x: b.x - a.x,
    y: b.y - a.y,
    z: b.z - a.z,
  };
  const ac = {
    x: c.x - a.x,
    y: c.y - a.y,
    z: c.z - a.z,
  };
  const normal = {
    x: ab.y * ac.z - ab.z * ac.y,
    y: ab.z * ac.x - ab.x * ac.z,
    z: ab.x * ac.y - ab.y * ac.x,
  };
  const magnitude = Math.hypot(normal.x, normal.y, normal.z);
  if (magnitude <= 1e-12) return 0.35;
  const light = { x: -0.35, y: 0.82, z: -0.45 };
  return Math.max(
    0,
    Math.abs(
      (normal.x * light.x +
        normal.y * light.y +
        normal.z * light.z) /
        magnitude,
    ),
  );
}

function requireProjection(
  point: HillPrimaryViewerProjectionPoint,
): void {
  requireLayer(
    Number.isFinite(point?.x) &&
      Number.isFinite(point.y) &&
      Number.isFinite(point.depth),
    'primary-viewer Hill projection returned a non-finite actor point',
  );
}

function requireLayer(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) throw new Error(message);
}
