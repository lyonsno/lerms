import {
  HILL_OF_HILLS_TOPOLOGY_EVENT_KINDS,
  HILL_OF_HILLS_TOPOLOGY_GESTURE_PRESETS,
  type HillOfHillsTerrainParams,
  type HillOfHillsTopologyEventClassConfig,
  type HillOfHillsTopologyEventClassConfigMap,
  type HillOfHillsTopologyDynamicsMode,
  type HillOfHillsTopologyPossibilityMode,
  type HillOfHillsTopologyGesturePreset
} from './hill-of-hills.js';

export const HILL_OF_HILLS_PARAM_SETTINGS_STORAGE_KEY = 'lerms.hill-of-hills.terrain-params.v0' as const;

export interface HillOfHillsParamSettingsStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const HILL_OF_HILLS_PERSISTED_PARAM_RANGES = {
  channelRadius: { min: 3, max: 8 },
  channelCurvature: { min: 0.35, max: 2.7 },
  wallHeight: { min: 0.4, max: 5.2 },
  floorWidth: { min: 1.2, max: 6.2 },
  hillRadius: { min: 0.5, max: 3.2 },
  hillCount: { min: 4, max: 36 },
  hillHeight: { min: 0, max: 2.4 },
  hillVariance: { min: 0, max: 1.35 },
  valleyRadius: { min: 0.5, max: 3.2 },
  valleyCount: { min: 4, max: 34 },
  valleyHeight: { min: 0, max: 2.2 },
  valleyVariance: { min: 0, max: 1.35 },
  worldScale: { min: 0.65, max: 1.65 },
  distanceScale: { min: 0.45, max: 2.4 },
  featureSpacing: { min: 0.45, max: 2.1 },
  textureScale: { min: 0.4, max: 3 },
  textureDamping: { min: 0, max: 1 },
  detailDamping: { min: 0, max: 1 },
  ditchPhaseIntensity: { min: 0, max: 1 },
  ditchPhaseLimit: { min: 0, max: 8 },
  ditchPhaseRadius: { min: 0.5, max: 2.4 },
  ditchPhaseTimeMs: { min: 0, max: 2400 },
  ditchPhaseDurationMs: { min: 800, max: 5200 },
  trailPhaseIntensity: { min: 0, max: 1 },
  trailPhaseLimit: { min: 0, max: 6 },
  trailPhaseRadius: { min: 0.5, max: 2.8 },
  trailPhaseTimeMs: { min: 0, max: 2600 },
  trailPhaseDurationMs: { min: 800, max: 5200 },
  topologyPhaseIntensity: { min: 0, max: 1 },
  topologyPhaseLimit: { min: 0, max: 8 },
  topologyPhaseRadius: { min: 0.5, max: 2.8 },
  topologyPhaseHeightScale: { min: 0, max: 2 },
  topologyPhaseBasinBias: { min: 0, max: 2 },
  topologyPhaseValleyBias: { min: 0, max: 2 },
  topologyPhaseHillBias: { min: 0, max: 2 },
  topologyPhaseRidgeBias: { min: 0, max: 2 },
  topologyPhaseSaddleBias: { min: 0, max: 2 },
  topologyPhaseOverlap: { min: 0, max: 0.5 },
  topologyPhaseDetailScale: { min: 0, max: 2 },
  topologyPhaseDriftIntensity: { min: 0, max: 1 },
  topologyPhaseTimeMs: { min: 0, max: 2600 },
  topologyPhaseDurationMs: { min: 800, max: 5200 }
} as const satisfies Partial<Record<keyof HillOfHillsTerrainParams, { min: number; max: number }>>;

export type HillOfHillsPersistedParamKey = keyof typeof HILL_OF_HILLS_PERSISTED_PARAM_RANGES;

export type HillOfHillsPersistedParamSettings = Pick<HillOfHillsTerrainParams, HillOfHillsPersistedParamKey> & {
  topologyDynamicsMode: HillOfHillsTopologyDynamicsMode;
  topologyPossibilityMode: HillOfHillsTopologyPossibilityMode;
  topologyEventClasses: HillOfHillsTopologyEventClassConfigMap;
};

export const HILL_OF_HILLS_PERSISTED_PARAM_KEYS = Object.keys(HILL_OF_HILLS_PERSISTED_PARAM_RANGES) as HillOfHillsPersistedParamKey[];

export function sanitizeHillOfHillsParamSettings(input: unknown, defaults: HillOfHillsTerrainParams): HillOfHillsPersistedParamSettings {
  const source = isPlainObject(input) ? input : {};
  const sanitized = {} as HillOfHillsPersistedParamSettings;

  for (const key of HILL_OF_HILLS_PERSISTED_PARAM_KEYS) {
    const range = HILL_OF_HILLS_PERSISTED_PARAM_RANGES[key];
    sanitized[key] = numberOrDefault(source[key], defaults[key], range.min, range.max) as never;
  }
  sanitized.topologyDynamicsMode =
    source.topologyDynamicsMode === 'direct_synthesis' || source.topologyDynamicsMode === 'persistent_pressure'
      ? source.topologyDynamicsMode
      : defaults.topologyDynamicsMode;
  sanitized.topologyPossibilityMode =
    source.topologyPossibilityMode === 'inherited' ||
    source.topologyPossibilityMode === 'reauthored' ||
    source.topologyPossibilityMode === 'phase_recomposed'
      ? source.topologyPossibilityMode
      : defaults.topologyPossibilityMode;
  sanitized.topologyEventClasses = sanitizeTopologyEventClasses(source.topologyEventClasses, defaults.topologyEventClasses);

  return sanitized;
}

export function loadHillOfHillsParamSettings(
  storage: HillOfHillsParamSettingsStorage | undefined,
  defaults: HillOfHillsTerrainParams
): HillOfHillsPersistedParamSettings {
  if (!storage) {
    return sanitizeHillOfHillsParamSettings(undefined, defaults);
  }

  const persisted = storage.getItem(HILL_OF_HILLS_PARAM_SETTINGS_STORAGE_KEY);
  if (!persisted) {
    return sanitizeHillOfHillsParamSettings(undefined, defaults);
  }

  try {
    return sanitizeHillOfHillsParamSettings(JSON.parse(persisted), defaults);
  } catch {
    return sanitizeHillOfHillsParamSettings(undefined, defaults);
  }
}

export function saveHillOfHillsParamSettings(
  storage: HillOfHillsParamSettingsStorage | undefined,
  params: HillOfHillsTerrainParams
): void {
  if (!storage) {
    return;
  }

  storage.setItem(HILL_OF_HILLS_PARAM_SETTINGS_STORAGE_KEY, JSON.stringify(sanitizeHillOfHillsParamSettings(params, params)));
}

function numberOrDefault(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return round(clamp(fallback, min, max));
  }
  return round(clamp(value, min, max));
}

function sanitizeTopologyEventClasses(input: unknown, defaults: HillOfHillsTopologyEventClassConfigMap): HillOfHillsTopologyEventClassConfigMap {
  const source = isPlainObject(input) ? input : {};
  const sanitized = {} as HillOfHillsTopologyEventClassConfigMap;

  for (const kind of HILL_OF_HILLS_TOPOLOGY_EVENT_KINDS) {
    const fallback = defaults[kind];
    const candidate = isPlainObject(source[kind]) ? source[kind] : {};
    sanitized[kind] = sanitizeTopologyEventClass(candidate, fallback);
  }

  return sanitized;
}

function sanitizeTopologyEventClass(input: Record<string, unknown>, fallback: HillOfHillsTopologyEventClassConfig): HillOfHillsTopologyEventClassConfig {
  return {
    enabled: typeof input.enabled === 'boolean' ? input.enabled : fallback.enabled,
    appetite: numberOrDefault(input.appetite, fallback.appetite, 0, 2),
    force: numberOrDefault(input.force, fallback.force, 0, 2),
    gesture: isTopologyGesturePreset(input.gesture) ? input.gesture : fallback.gesture,
    phaseOffset: numberOrDefault(input.phaseOffset, fallback.phaseOffset, 0, 1),
    spread: numberOrDefault(input.spread, fallback.spread, 0.25, 2)
  };
}

function isTopologyGesturePreset(value: unknown): value is HillOfHillsTopologyGesturePreset {
  return typeof value === 'string' && (HILL_OF_HILLS_TOPOLOGY_GESTURE_PRESETS as readonly string[]).includes(value);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
