export const HILL_PRIMARY_VIEWER_ACTOR_HOST_SCHEMA =
  'lerms.hill-of-hills.primary-viewer-actor-host.v0' as const;
export const HILL_PRIMARY_VIEWER_ACTOR_HOST_ROUTE =
  'lerms/hill-of-hills/primary-viewer-v0' as const;
export const HILL_PRIMARY_VIEWER_ACTOR_DRAW_ORDER =
  'after-terrain-before-route-markers-and-witness' as const;

export interface HillPrimaryViewerTerrainIdentity {
  frameId: string;
  sampleChecksum: string;
  topologyChecksum: string;
}

export interface HillPrimaryViewerActorAuthority {
  route: {
    requested: string;
    effective: string;
    fallbackStatus: 'none' | 'fallback';
    staleStatus: 'fresh' | 'stale';
  };
  lifecycle: {
    visible: boolean;
    phase: 'traversing' | 'departed';
  };
  terrain: HillPrimaryViewerTerrainIdentity;
}

export interface HillPrimaryViewerWorldPoint {
  x: number;
  y: number;
  z: number;
}

export interface HillPrimaryViewerProjectionPoint {
  x: number;
  y: number;
  depth: number;
}

export interface HillPrimaryViewerViewSnapshot {
  yaw: number;
  tilt: number;
  zoom: number;
  panX: number;
  panY: number;
}

export interface HillPrimaryViewerActorDrawFrame {
  schema: typeof HILL_PRIMARY_VIEWER_ACTOR_HOST_SCHEMA;
  route: {
    requested: typeof HILL_PRIMARY_VIEWER_ACTOR_HOST_ROUTE;
    effective: typeof HILL_PRIMARY_VIEWER_ACTOR_HOST_ROUTE;
    fallbackStatus: 'none';
    staleStatus: 'fresh';
  };
  drawOrder: typeof HILL_PRIMARY_VIEWER_ACTOR_DRAW_ORDER;
  time: {
    timestampMs: number;
  };
  viewport: {
    width: number;
    height: number;
    pixelRatio: number;
  };
  terrain: HillPrimaryViewerTerrainIdentity;
  view: HillPrimaryViewerViewSnapshot;
  actor: {
    layerId: string;
    requestedRoute: string;
    effectiveRoute: string;
  };
  surface: {
    context: CanvasRenderingContext2D;
  };
  project: (
    point: HillPrimaryViewerWorldPoint,
  ) => HillPrimaryViewerProjectionPoint;
}

export interface HillPrimaryViewerActorLayer {
  id: string;
  authority: () => HillPrimaryViewerActorAuthority;
  draw: (frame: HillPrimaryViewerActorDrawFrame) => void;
}

export interface HillPrimaryViewerActorLayerTarget {
  surface: {
    context: CanvasRenderingContext2D;
  };
  merge: () => void;
}

export interface HillPrimaryViewerActorFrameTarget {
  createLayerTarget: (actor: {
    layerId: string;
    requestedRoute: string;
    effectiveRoute: string;
  }) => HillPrimaryViewerActorLayerTarget;
  composite: () => void;
}

export interface HillPrimaryViewerActorHostDrawInput {
  timestampMs: number;
  viewport: {
    width: number;
    height: number;
    pixelRatio?: number;
  };
  terrain: HillPrimaryViewerTerrainIdentity;
  view: HillPrimaryViewerViewSnapshot;
  createFrameTarget: (frame: {
    timestampMs: number;
    viewport: {
      width: number;
      height: number;
      pixelRatio: number;
    };
    terrain: HillPrimaryViewerTerrainIdentity;
  }) => HillPrimaryViewerActorFrameTarget;
  project: (
    point: HillPrimaryViewerWorldPoint,
  ) => HillPrimaryViewerProjectionPoint;
}

export interface HillPrimaryViewerActorHostReceipt {
  schema: typeof HILL_PRIMARY_VIEWER_ACTOR_HOST_SCHEMA;
  route: {
    requested: typeof HILL_PRIMARY_VIEWER_ACTOR_HOST_ROUTE;
    effective: typeof HILL_PRIMARY_VIEWER_ACTOR_HOST_ROUTE;
    fallbackStatus: 'none';
    staleStatus: 'fresh';
  };
  drawOrder: typeof HILL_PRIMARY_VIEWER_ACTOR_DRAW_ORDER;
  terrain: HillPrimaryViewerTerrainIdentity;
  timestampMs: number;
  registeredLayerCount: number;
  visibleLayerCount: number;
  drawnLayerCount: number;
  effectiveActorRoutes: string[];
}

export interface HillPrimaryViewerActorHost {
  register: (layer: HillPrimaryViewerActorLayer) => void;
  unregister: (layerId: string) => boolean;
  draw: (
    input: HillPrimaryViewerActorHostDrawInput,
  ) => HillPrimaryViewerActorHostReceipt;
}

export function createHillPrimaryViewerActorHost(): HillPrimaryViewerActorHost {
  const layers = new Map<string, HillPrimaryViewerActorLayer>();

  return {
    register(layer) {
      requireHost(
        typeof layer?.id === 'string' && layer.id.length > 0,
        'primary-viewer actor layer requires an id',
      );
      requireHost(
        !layers.has(layer.id),
        `primary-viewer actor layer ${layer.id} is already registered`,
      );
      requireHost(
        typeof layer.authority === 'function' &&
          typeof layer.draw === 'function',
        `primary-viewer actor layer ${layer.id} is incomplete`,
      );
      layers.set(layer.id, layer);
    },
    unregister(layerId) {
      return layers.delete(layerId);
    },
    draw(input) {
      validateHostInput(input);
      const snapshots = Array.from(layers.values(), (layer) => {
        const authority = snapshotActorAuthority(layer.authority());
        validateActorAuthority(authority, input.terrain, layer.id);
        return { layer, authority };
      });
      const visibleSnapshots = snapshots.filter(
        ({ authority }) => authority.lifecycle.visible,
      );
      const viewport = {
        width: input.viewport.width,
        height: input.viewport.height,
        pixelRatio: input.viewport.pixelRatio ?? 1,
      };

      if (visibleSnapshots.length > 0) {
        const frameTarget = input.createFrameTarget({
          timestampMs: input.timestampMs,
          viewport,
          terrain: { ...input.terrain },
        });
        validateFrameTarget(frameTarget);

        const renderedTargets = visibleSnapshots.map(
          ({ layer, authority }) => {
            const actor = {
              layerId: layer.id,
              requestedRoute: authority.route.requested,
              effectiveRoute: authority.route.effective,
            };
            const layerTarget = frameTarget.createLayerTarget(actor);
            validateLayerTarget(layerTarget, layer.id);

            layer.draw({
              schema: HILL_PRIMARY_VIEWER_ACTOR_HOST_SCHEMA,
              route: officialHostRoute(),
              drawOrder: HILL_PRIMARY_VIEWER_ACTOR_DRAW_ORDER,
              time: {
                timestampMs: input.timestampMs,
              },
              viewport,
              terrain: { ...input.terrain },
              view: { ...input.view },
              actor,
              surface: layerTarget.surface,
              project: input.project,
            });
            return layerTarget;
          },
        );

        for (const target of renderedTargets) target.merge();
        frameTarget.composite();
      }

      return {
        schema: HILL_PRIMARY_VIEWER_ACTOR_HOST_SCHEMA,
        route: officialHostRoute(),
        drawOrder: HILL_PRIMARY_VIEWER_ACTOR_DRAW_ORDER,
        terrain: { ...input.terrain },
        timestampMs: input.timestampMs,
        registeredLayerCount: layers.size,
        visibleLayerCount: visibleSnapshots.length,
        drawnLayerCount: visibleSnapshots.length,
        effectiveActorRoutes: snapshots.map(
          ({ authority }) => authority.route.effective,
        ),
      };
    },
  };
}

export const hillPrimaryViewerActorHost =
  createHillPrimaryViewerActorHost();

function officialHostRoute(): HillPrimaryViewerActorHostReceipt['route'] {
  return {
    requested: HILL_PRIMARY_VIEWER_ACTOR_HOST_ROUTE,
    effective: HILL_PRIMARY_VIEWER_ACTOR_HOST_ROUTE,
    fallbackStatus: 'none',
    staleStatus: 'fresh',
  };
}

function validateHostInput(
  input: HillPrimaryViewerActorHostDrawInput,
): void {
  requireHost(
    Number.isFinite(input?.timestampMs) && input.timestampMs >= 0,
    'primary-viewer actor host requires a finite nonnegative timestamp',
  );
  requireHost(
    Number.isFinite(input.viewport?.width) &&
      input.viewport.width > 0 &&
      Number.isFinite(input.viewport?.height) &&
      input.viewport.height > 0 &&
      (input.viewport.pixelRatio === undefined ||
        (Number.isFinite(input.viewport.pixelRatio) &&
          input.viewport.pixelRatio > 0)),
    'primary-viewer actor host requires a finite viewport',
  );
  requireTerrainIdentity(input.terrain, 'primary-viewer current Hill terrain');
  for (const [key, value] of Object.entries(input.view ?? {})) {
    requireHost(
      Number.isFinite(value),
      `primary-viewer actor host view ${key} is not finite`,
    );
  }
  requireHost(
    typeof input.project === 'function',
    'primary-viewer actor host requires the current Hill projection',
  );
  requireHost(
    typeof input.createFrameTarget === 'function',
    'primary-viewer actor host requires a Hill-owned isolated frame target',
  );
}

function validateActorAuthority(
  authority: HillPrimaryViewerActorAuthority,
  terrain: HillPrimaryViewerTerrainIdentity,
  layerId: string,
): void {
  requireHost(
    typeof authority?.route?.requested === 'string' &&
      authority.route.requested.length > 0,
    `primary-viewer actor layer ${layerId} route is missing`,
  );
  requireHost(
    authority.route.fallbackStatus === 'none',
    `primary-viewer actor layer ${layerId} attempted fallback authority`,
  );
  requireHost(
    authority.route.staleStatus === 'fresh',
    `primary-viewer actor layer ${layerId} is stale`,
  );
  requireHost(
    authority.route.requested === authority.route.effective,
    `primary-viewer actor layer ${layerId} requested/effective route mismatch`,
  );
  requireHost(
    typeof authority.lifecycle?.visible === 'boolean',
    `primary-viewer actor layer ${layerId} lifecycle visibility is incomplete`,
  );
  requireHost(
    authority.lifecycle.phase === 'traversing' ||
      authority.lifecycle.phase === 'departed',
    `primary-viewer actor layer ${layerId} lifecycle phase is invalid`,
  );
  requireHost(
    authority.lifecycle.visible ===
      (authority.lifecycle.phase === 'traversing'),
    `primary-viewer actor layer ${layerId} lifecycle phase/visibility mismatch`,
  );
  requireTerrainIdentity(
    authority.terrain,
    `primary-viewer actor layer ${layerId} terrain`,
  );
  requireHost(
    authority.terrain.frameId === terrain.frameId &&
      authority.terrain.sampleChecksum === terrain.sampleChecksum &&
      authority.terrain.topologyChecksum === terrain.topologyChecksum,
    `primary-viewer actor layer ${layerId} does not match current Hill terrain`,
  );
}

function snapshotActorAuthority(
  authority: HillPrimaryViewerActorAuthority,
): HillPrimaryViewerActorAuthority {
  return {
    route: { ...authority?.route },
    lifecycle: { ...authority?.lifecycle },
    terrain: { ...authority?.terrain },
  } as HillPrimaryViewerActorAuthority;
}

function validateFrameTarget(
  target: HillPrimaryViewerActorFrameTarget,
): void {
  requireHost(
    typeof target?.createLayerTarget === 'function' &&
      typeof target.composite === 'function',
    'primary-viewer actor host received an incomplete isolated frame target',
  );
}

function validateLayerTarget(
  target: HillPrimaryViewerActorLayerTarget,
  layerId: string,
): void {
  requireHost(
    target?.surface?.context !== undefined &&
      typeof target.merge === 'function',
    `primary-viewer actor layer ${layerId} received an incomplete isolated layer target`,
  );
}

function requireTerrainIdentity(
  terrain: HillPrimaryViewerTerrainIdentity,
  label: string,
): void {
  requireHost(
    typeof terrain?.frameId === 'string' &&
      terrain.frameId.length > 0 &&
      typeof terrain.sampleChecksum === 'string' &&
      terrain.sampleChecksum.length > 0 &&
      typeof terrain.topologyChecksum === 'string' &&
      terrain.topologyChecksum.length > 0,
    `${label} identity is incomplete`,
  );
}

function requireHost(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) throw new Error(message);
}
