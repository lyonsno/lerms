import {
  HILL_OF_HILLS_TOPOLOGY_EVENT_KINDS,
  type HillOfHillsTerrainParams,
  type HillOfHillsTopologyEventClassConfig,
  type HillOfHillsTopologyEventClassConfigMap,
  type HillOfHillsTopologyPhaseKind
} from './hill-of-hills.js';
import type { HillPreviewSettings } from './hill-of-hills-preview-settings.js';

export const HILL_OF_HILLS_DIAGNOSTIC_PRESET_QUERY_KEY = 'hillPreset' as const;
export const HILL_OF_HILLS_DIAGNOSTIC_PRESETS = ['continuity-hills'] as const;

export type HillOfHillsDiagnosticPreset = (typeof HILL_OF_HILLS_DIAGNOSTIC_PRESETS)[number];

export function hillDiagnosticPresetFromSearch(search: string): HillOfHillsDiagnosticPreset | undefined {
  const query = search.startsWith('?') ? search.slice(1) : search;
  const params = new URLSearchParams(query);
  const preset = params.get(HILL_OF_HILLS_DIAGNOSTIC_PRESET_QUERY_KEY);
  return isHillDiagnosticPreset(preset) ? preset : undefined;
}

export function applyHillDiagnosticParamPreset(
  params: HillOfHillsTerrainParams,
  preset: HillOfHillsDiagnosticPreset | undefined
): HillOfHillsTerrainParams {
  if (preset !== 'continuity-hills') {
    return params;
  }

  return {
    ...params,
    ditchPhaseIntensity: 0,
    ditchPhaseLimit: 0,
    trailPhaseIntensity: 0,
    trailPhaseLimit: 0,
    topologyDynamicsMode: 'persistent_pressure',
    topologyPhaseIntensity: 0.58,
    topologyPhaseLimit: 4,
    topologyPhaseRadius: 1.55,
    topologyPhaseHeightScale: 0.82,
    topologyPhaseBasinBias: 0,
    topologyPhaseValleyBias: 0,
    topologyPhaseHillBias: 1.45,
    topologyPhaseRidgeBias: 0,
    topologyPhaseSaddleBias: 0,
    topologyPhaseOverlap: 0.28,
    topologyPhaseDetailScale: 0.75,
    topologyPhaseDurationMs: 2600,
    topologyEventClasses: continuityHillEventClasses(params.topologyEventClasses)
  };
}

export function applyHillDiagnosticPreviewPreset(
  settings: HillPreviewSettings,
  preset: HillOfHillsDiagnosticPreset | undefined
): HillPreviewSettings {
  if (preset !== 'continuity-hills') {
    return settings;
  }

  return {
    ...settings,
    layers: {
      ...settings.layers,
      base: true,
      transitions: true,
      edgeDissolves: true,
      surfaceDetails: true,
      topologyOverlays: true,
      growthSkin: true,
      routeMarkers: true
    },
    growthSkin: {
      density: 0.72,
      opacity: 0.72
    },
    overlays: {
      topologyLineStrength: 0.18,
      topographicContourStrength: 0.38,
      topographicContourSpacing: 0.72,
      pressureField: 'none',
      pressureOverlayStrength: 0
    }
  };
}

function continuityHillEventClasses(source: HillOfHillsTopologyEventClassConfigMap): HillOfHillsTopologyEventClassConfigMap {
  const next = {} as HillOfHillsTopologyEventClassConfigMap;

  for (const kind of HILL_OF_HILLS_TOPOLOGY_EVENT_KINDS) {
    const eventClass = source[kind];
    next[kind] = isHillContinuityEvent(kind)
      ? hillContinuityEventClass(eventClass, kind)
      : disabledContinuityEventClass(eventClass);
  }

  return next;
}

function hillContinuityEventClass(
  eventClass: HillOfHillsTopologyEventClassConfig,
  kind: HillOfHillsTopologyPhaseKind
): HillOfHillsTopologyEventClassConfig {
  return {
    ...eventClass,
    enabled: true,
    appetite: kind === 'hill_swell' ? 1.15 : 0.88,
    force: kind === 'hill_swell' ? 0.92 : 0.72,
    gesture: kind === 'hill_swell' ? 'breath' : 'creep',
    phaseOffset: kind === 'hill_swell' ? 0.04 : 0.38,
    spread: kind === 'hill_swell' ? 1.18 : 1.1
  };
}

function disabledContinuityEventClass(eventClass: HillOfHillsTopologyEventClassConfig): HillOfHillsTopologyEventClassConfig {
  return {
    ...eventClass,
    enabled: false,
    appetite: 0,
    force: 0
  };
}

function isHillContinuityEvent(kind: HillOfHillsTopologyPhaseKind): boolean {
  return kind === 'hill_swell';
}

function isHillDiagnosticPreset(value: unknown): value is HillOfHillsDiagnosticPreset {
  return typeof value === 'string' && (HILL_OF_HILLS_DIAGNOSTIC_PRESETS as readonly string[]).includes(value);
}
