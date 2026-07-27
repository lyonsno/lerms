import type {
  HillPrimaryViewerActorFrameTarget,
  HillPrimaryViewerActorHostDrawInput,
} from './hill-primary-viewer-actor-host.js';

export const HILL_PRIMARY_VIEWER_RETAINED_ACTOR_TARGET_ROUTE =
  'lerms/hill-of-hills/retained-actor-targets-v0' as const;

interface CanvasTarget {
  width: number;
  height: number;
  getContext(
    contextId: '2d',
  ): CanvasRenderingContext2D | null;
}

export interface HillPrimaryViewerRetainedActorTargetOptions {
  createCanvas: () => CanvasTarget;
  compositeContext: CanvasRenderingContext2D;
}

export interface HillPrimaryViewerRetainedActorTargetStats {
  route: typeof HILL_PRIMARY_VIEWER_RETAINED_ACTOR_TARGET_ROUTE;
  frameCanvasCount: 1;
  layerCanvasCount: number;
  frameGeneration: number;
}

export interface HillPrimaryViewerRetainedActorTargetFactory {
  createFrameTarget: HillPrimaryViewerActorHostDrawInput['createFrameTarget'];
  stats: () => HillPrimaryViewerRetainedActorTargetStats;
}

export function createHillPrimaryViewerRetainedActorTargetFactory(
  options: HillPrimaryViewerRetainedActorTargetOptions,
): HillPrimaryViewerRetainedActorTargetFactory {
  requireRetainedTarget(
    typeof options?.createCanvas === 'function' &&
      options.compositeContext !== undefined,
    'retained actor targets require a canvas factory and canonical composite context',
  );
  const frame = createRetainedCanvas(options.createCanvas, 'frame');
  const layers = new Map<string, ReturnType<typeof createRetainedCanvas>>();
  let frameGeneration = 0;

  return {
    createFrameTarget(frameInput) {
      validateFrameInput(frameInput);
      frameGeneration += 1;
      const { width, height, pixelRatio } = frameInput.viewport;
      const backingWidth = Math.max(1, Math.floor(width * pixelRatio));
      const backingHeight = Math.max(1, Math.floor(height * pixelRatio));
      prepareCanvas(
        frame,
        backingWidth,
        backingHeight,
        pixelRatio,
      );
      const admittedLayers = new Set<string>();
      let compositeCount = 0;

      return {
        createLayerTarget(actor) {
          requireRetainedTarget(
            typeof actor?.layerId === 'string' &&
              actor.layerId.length > 0 &&
              !admittedLayers.has(actor.layerId),
            'retained actor frame requires one complete target per named layer',
          );
          admittedLayers.add(actor.layerId);
          let layer = layers.get(actor.layerId);
          if (!layer) {
            layer = createRetainedCanvas(
              options.createCanvas,
              `layer ${actor.layerId}`,
            );
            layers.set(actor.layerId, layer);
          }
          prepareCanvas(
            layer,
            backingWidth,
            backingHeight,
            pixelRatio,
          );
          let mergeCount = 0;
          return {
            surface: {
              context: layer.context,
            },
            merge() {
              requireRetainedTarget(
                mergeCount === 0 && compositeCount === 0,
                `retained actor layer ${actor.layerId} cannot merge twice or after publication`,
              );
              mergeCount += 1;
              frame.context.drawImage(
                layer.canvas as CanvasImageSource,
                0,
                0,
                backingWidth,
                backingHeight,
                0,
                0,
                width,
                height,
              );
            },
          };
        },
        composite() {
          requireRetainedTarget(
            compositeCount === 0,
            'retained actor frame cannot publish twice',
          );
          compositeCount += 1;
          options.compositeContext.drawImage(
            frame.canvas as CanvasImageSource,
            0,
            0,
            backingWidth,
            backingHeight,
            0,
            0,
            width,
            height,
          );
        },
      } satisfies HillPrimaryViewerActorFrameTarget;
    },
    stats() {
      return {
        route: HILL_PRIMARY_VIEWER_RETAINED_ACTOR_TARGET_ROUTE,
        frameCanvasCount: 1,
        layerCanvasCount: layers.size,
        frameGeneration,
      };
    },
  };
}

function createRetainedCanvas(
  createCanvas: () => CanvasTarget,
  label: string,
): {
  canvas: CanvasTarget;
  context: CanvasRenderingContext2D;
} {
  const canvas = createCanvas();
  const context = canvas?.getContext('2d');
  requireRetainedTarget(
    context !== null && context !== undefined,
    `retained actor ${label} canvas is unavailable`,
  );
  return { canvas, context };
}

function prepareCanvas(
  target: ReturnType<typeof createRetainedCanvas>,
  width: number,
  height: number,
  pixelRatio: number,
): void {
  if (
    target.canvas.width !== width ||
    target.canvas.height !== height
  ) {
    target.canvas.width = width;
    target.canvas.height = height;
  }
  target.context.setTransform(1, 0, 0, 1, 0, 0);
  target.context.clearRect(0, 0, width, height);
  target.context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
}

function validateFrameInput(
  frame: Parameters<
    HillPrimaryViewerActorHostDrawInput['createFrameTarget']
  >[0],
): void {
  requireRetainedTarget(
    Number.isFinite(frame?.timestampMs) &&
      frame.timestampMs >= 0 &&
      Number.isFinite(frame.viewport?.width) &&
      frame.viewport.width > 0 &&
      Number.isFinite(frame.viewport?.height) &&
      frame.viewport.height > 0 &&
      Number.isFinite(frame.viewport?.pixelRatio) &&
      frame.viewport.pixelRatio > 0,
    'retained actor frame identity is incomplete',
  );
}

function requireRetainedTarget(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) throw new Error(message);
}
