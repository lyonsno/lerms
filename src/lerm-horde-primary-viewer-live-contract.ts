import type {
  LermHordePrimaryViewerActorFrame,
} from './lerm-horde-primary-viewer-actor-frame.js';
import type {
  LermHordeLiveRuntimeState,
} from './lerm-horde-live-runtime-composition.js';

export const LERM_HORDE_PRIMARY_VIEWER_TIME_SCALE = 0.2 as const;
export const LERM_HORDE_PRIMARY_VIEWER_ATOMIC_FRAME_SCHEMA =
  'lerms.horde-primary-viewer-atomic-frame.v0' as const;

export interface LermHordePrimaryViewerAtomicFrame {
  schema: typeof LERM_HORDE_PRIMARY_VIEWER_ATOMIC_FRAME_SCHEMA;
  generation: number;
  sourceElapsedMs: number;
  hostPublishedAtMs: number | null;
  completeness: 'atomic-terrain-actor';
  terrainBuffer: LermHordeLiveRuntimeState['terrainBuffer'];
  terrain: {
    frameId: string;
    sampleChecksum: string;
    topologyChecksum: string;
  };
  actor: LermHordePrimaryViewerActorFrame;
}
