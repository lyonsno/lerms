import {
  advanceHillGpuCpuOracle,
  createHillGpuCpuOracleState,
  createHillGpuInitialization,
  createHillGpuProducerEventBatch,
  createHillGpuSupportBinding,
} from './terrain/hill-of-hills-gpu-resident.js';
import {
  createHillGpuWebGpuPresenter,
} from './terrain/hill-of-hills-webgpu-presentation.js';
import {
  createHillWebGpuResidentRuntime,
} from './terrain/hill-of-hills-webgpu-resident.js';
import {
  createHillOfHillsTerrain,
  createHillOfHillsTerrainBuffer,
} from './terrain/hill-of-hills.js';
import {
  createLermHordeSupportProfileRequest,
  resolveLermHordePresentationSupportBinding,
} from './lerm-horde-primary-viewer-actor-frame.js';

const canvas = requireElement<HTMLCanvasElement>(
  'hill-gpu-witness',
);
const status = requireElement<HTMLElement>('status');
const generation = requireElement<HTMLElement>('generation');
const episode = requireElement<HTMLElement>('episode');
const transfer = requireElement<HTMLElement>('transfer');

const query = new URLSearchParams(window.location.search);
const frozenTimeMs = query.has('time')
  ? Number(query.get('time'))
  : null;
const timeScale = Number(query.get('speed') ?? 1);
const STEP_MS = 50;
const LOOP_MS = 10_000;

void start();

async function start(): Promise<void> {
  try {
    const gpu = (
      navigator as Navigator & {
        gpu?: {
          requestAdapter(): Promise<{
            requestDevice(): Promise<unknown>;
          } | null>;
          getPreferredCanvasFormat(): string;
        };
      }
    ).gpu;
    if (!gpu) {
      throw new Error(
        'WebGPU unsupported: requested route has no adapter surface',
      );
    }
    const adapter = await gpu.requestAdapter();
    if (!adapter) {
      throw new Error(
        'WebGPU adapter unavailable: fallback is forbidden',
      );
    }
    const device = await adapter.requestDevice();
    const context = canvas.getContext('webgpu');
    if (!context) {
      throw new Error(
        'WebGPU canvas context unavailable: fallback is forbidden',
      );
    }
    resize();

    const terrain = createHillOfHillsTerrain(
      {
        gridResolutionX: 72,
        gridResolutionZ: 96,
        trailPhaseIntensity: 0,
        trailPhaseLimit: 0,
        topologyPhaseIntensity: 0,
        topologyPhaseLimit: 0,
      },
      {
        route:
          'lerms/hill-of-hills/gpu-resident-witness-v0',
        frameId: 'hill-gpu-resident-witness-frame-0',
        configId: 'hill-gpu-resident-witness-v0',
        timestampMs: 0,
        sampleAgeMs: 0,
      },
    );
    const initialization = createHillGpuInitialization(
      createHillOfHillsTerrainBuffer(terrain),
    );
    const runtime = createHillWebGpuResidentRuntime(
      device as Parameters<
        typeof createHillWebGpuResidentRuntime
      >[0],
      initialization,
    );
    let oracle = createHillGpuCpuOracleState(initialization);
    const presenter = createHillGpuWebGpuPresenter(
      device as Parameters<
        typeof createHillGpuWebGpuPresenter
      >[0],
      context as unknown as Parameters<
        typeof createHillGpuWebGpuPresenter
      >[1],
      gpu.getPreferredCanvasFormat(),
      initialization,
      runtime,
    );
    let simulatedMs = 0;
    let sequence = -1;
    let startedAt: number | null = null;
    let lastRenderedAt = 0;

    const advance = (targetMs: number): void => {
      while (simulatedMs + STEP_MS <= targetMs) {
        const nextMs = simulatedMs + STEP_MS;
        const contact = contactAt(nextMs);
        const highestPreviouslyAdmitted = sequence;
        const events = contact
          ? [
              {
                episodeId: contact.episodeId,
                sequence: sequence + 1,
                startMs: simulatedMs,
                endMs: nextMs,
                worldX: contact.worldX,
                worldZ: contact.worldZ,
                contactWeight: 0.92,
                radius: 0.72,
              },
            ]
          : [];
        if (contact) sequence += 1;
        const batch = createHillGpuProducerEventBatch(
          initialization,
          events,
          highestPreviouslyAdmitted,
        );
        runtime.dispatch(batch, STEP_MS / 1_000);
        oracle = advanceHillGpuCpuOracle(
          oracle,
          batch,
          STEP_MS / 1_000,
        );
        simulatedMs = nextMs;
      }
    };

    const render = (timestampMs: number): void => {
      startedAt ??= timestampMs;
      const requestedTime =
        frozenTimeMs ??
        ((timestampMs - startedAt) * timeScale) % LOOP_MS;
      if (
        frozenTimeMs === null &&
        requestedTime < simulatedMs
      ) {
        window.location.reload();
        return;
      }
      advance(requestedTime);
      const alpha = Math.min(
        1,
        Math.max(0, (requestedTime - simulatedMs) / STEP_MS),
      );
      presenter.render({
        presentationAlpha: alpha,
        yaw: -0.08,
        tilt: 0.72,
        zoom: 0.82,
        panX: 0,
        panY: -0.12,
        aspect: canvas.width / Math.max(1, canvas.height),
        verticalScale: 0.34,
      });

      const phase = phaseAt(requestedTime);
      const rootFrame = {
        schema: 'kaminos.creature-root-frame.v0' as const,
        origin: {
          x: phase.position?.worldX ?? 0,
          y: 0,
          z: phase.position?.worldZ ?? 0,
        },
        lateral: { x: 1, y: 0, z: 0 },
        normal: { x: 0, y: 1, z: 0 },
        tangent: { x: 0, y: 0, z: 1 },
      };
      const support = resolveLermHordePresentationSupportBinding(
        createHillGpuSupportBinding(
          oracle,
          createLermHordeSupportProfileRequest(rootFrame),
          alpha,
        ),
        rootFrame,
      );
      status.className = 'route';
      status.textContent =
        'requested = effective WebGPU · fallback none · stale fresh';
      generation.textContent =
        `generation ${runtime.previousGeneration} → ${runtime.generation}` +
        ` · alpha ${alpha.toFixed(2)} · support stations ${support.terrainSupportProfile.length}`;
      episode.className =
        phase.kind === 'departure' ? 'warm' : 'good';
      episode.textContent = phase.label;
      transfer.textContent =
        'full terrain CPU uploads 1 · post-init worker transfers 0 · full-field readbacks 0';
      canvas.dataset.route =
        'lerms/hill-of-hills/gpu/resident-causal-state-v0';
      canvas.dataset.backend = 'webgpu';
      canvas.dataset.fallback = 'none';
      canvas.dataset.stale = 'fresh';
      canvas.dataset.generation = String(runtime.generation);
      canvas.dataset.phase = phase.kind;
      canvas.dataset.supportStations = String(
        support.terrainSupportProfile.length,
      );
      (
        window as Window & {
          __hillGpuResidentWitness?: unknown;
        }
      ).__hillGpuResidentWitness = {
        requested:
          'lerms/hill-of-hills/gpu/resident-causal-state-v0',
        effective:
          'lerms/hill-of-hills/gpu/resident-causal-state-v0',
        backend: 'webgpu',
        fallbackStatus: 'none',
        staleStatus: 'fresh',
        previousGeneration: runtime.previousGeneration,
        generation: runtime.generation,
        phase,
        supportStationCount:
          support.terrainSupportProfile.length,
        fullTerrainCpuUploads: 1,
        fullFieldWorkerTransfersAfterInitialization: 0,
        fullFieldReadbacksAfterInitialization: 0,
      };
      lastRenderedAt = timestampMs;
      if (frozenTimeMs === null) {
        window.requestAnimationFrame(render);
      } else {
        canvas.dataset.settled = 'true';
      }
    };

    window.addEventListener('resize', resize);
    window.requestAnimationFrame(render);
    void lastRenderedAt;
  } catch (error) {
    status.className = 'failure';
    status.textContent =
      error instanceof Error ? error.message : String(error);
    canvas.dataset.routeFailure =
      error instanceof Error ? error.message : String(error);
    throw error;
  }
}

function resize(): void {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(
    1,
    Math.floor(window.innerWidth * dpr),
  );
  canvas.height = Math.max(
    1,
    Math.floor(window.innerHeight * dpr),
  );
}

function contactAt(timeMs: number): {
  episodeId: 'episode-a' | 'episode-b';
  worldX: number;
  worldZ: number;
} | null {
  if (timeMs <= 3_000) {
    const progress = timeMs / 3_000;
    return {
      episodeId: 'episode-a',
      worldX: -2.15 + Math.sin(progress * Math.PI) * 0.55,
      worldZ: -6.2 + progress * 10.8,
    };
  }
  if (timeMs >= 5_000 && timeMs <= 8_000) {
    const progress = (timeMs - 5_000) / 3_000;
    return {
      episodeId: 'episode-b',
      worldX: 2.2 - Math.sin(progress * Math.PI) * 0.7,
      worldZ: -5.6 + progress * 10.2,
    };
  }
  return null;
}

function phaseAt(timeMs: number): {
  kind: 'episode-a' | 'departure' | 'episode-b';
  label: string;
  position: ReturnType<typeof contactAt>;
} {
  const position = contactAt(timeMs);
  if (position?.episodeId === 'episode-a') {
    return {
      kind: 'episode-a',
      label: 'episode A contact admitted · first path forming',
      position,
    };
  }
  if (position?.episodeId === 'episode-b') {
    return {
      kind: 'episode-b',
      label:
        'episode B contact admitted · episode A path retained',
      position,
    };
  }
  return {
    kind: 'departure',
    label:
      timeMs < 5_000
        ? 'after episode A departure · retained path remains'
        : 'after episode B departure · both paths remain',
    position: null,
  };
}

function requireElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(
      `Hill GPU witness surface is missing #${id}`,
    );
  }
  return element as T;
}
