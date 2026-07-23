import { HILL_OF_HILLS_PRESSURE_FIELD_KINDS, type HillOfHillsPressureFieldKind } from './hill-of-hills.js';

export const HILL_OF_HILLS_PREVIEW_SETTINGS_STORAGE_KEY = 'lerms.hill-of-hills.preview-settings.v0' as const;

export type HillPreviewMode = 'material' | 'neutral_geometry';

export type HillPreviewLayerKey =
  | 'base'
  | 'transitions'
  | 'edgeDissolves'
  | 'surfaceDetails'
  | 'topologyOverlays'
  | 'growthSkin'
  | 'routeMarkers';

export type HillPreviewLayerSettings = Record<HillPreviewLayerKey, boolean>;

export interface HillPreviewGrowthSkinSettings {
  density: number;
  opacity: number;
}

export type HillPreviewPressureFieldSelection = HillOfHillsPressureFieldKind | 'none';

export interface HillPreviewOverlaySettings {
  topologyLineStrength: number;
  topographicContourStrength: number;
  topographicContourSpacing: number;
  pressureField: HillPreviewPressureFieldSelection;
  pressureOverlayStrength: number;
}

export interface HillPreviewSettings {
  mode: HillPreviewMode;
  layers: HillPreviewLayerSettings;
  growthSkin: HillPreviewGrowthSkinSettings;
  overlays: HillPreviewOverlaySettings;
}

export interface HillPreviewVisualIdentity {
  requestedMode: HillPreviewMode;
  effectiveMode: HillPreviewMode;
  effectiveLayers: readonly string[];
  pressureOverlay: {
    field: HillOfHillsPressureFieldKind;
    strength: number;
  } | null;
}

export interface HillPreviewSettingsStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const DEFAULT_LAYER_SETTINGS: HillPreviewLayerSettings = {
  base: true,
  transitions: true,
  edgeDissolves: true,
  surfaceDetails: true,
  topologyOverlays: true,
  growthSkin: true,
  routeMarkers: true
};

const DEFAULT_GROWTH_SKIN_SETTINGS: HillPreviewGrowthSkinSettings = {
  density: 1,
  opacity: 1
};

const DEFAULT_OVERLAY_SETTINGS: HillPreviewOverlaySettings = {
  topologyLineStrength: 0.35,
  topographicContourStrength: 0.55,
  topographicContourSpacing: 0.6,
  pressureField: 'none',
  pressureOverlayStrength: 0.45
};

const HILL_PREVIEW_LAYER_KEYS: readonly HillPreviewLayerKey[] = [
  'base',
  'growthSkin',
  'transitions',
  'edgeDissolves',
  'surfaceDetails',
  'topologyOverlays',
  'routeMarkers'
];

export const HILL_PREVIEW_GROWTH_SKIN_DENSITY_RANGE = {
  min: 0,
  max: 2.5
} as const;

export const HILL_PREVIEW_GROWTH_SKIN_OPACITY_RANGE = {
  min: 0.05,
  max: 1.6
} as const;

export const HILL_PREVIEW_TOPOLOGY_LINE_STRENGTH_RANGE = {
  min: 0,
  max: 1
} as const;

export const HILL_PREVIEW_TOPOGRAPHIC_CONTOUR_STRENGTH_RANGE = {
  min: 0,
  max: 1
} as const;

export const HILL_PREVIEW_TOPOGRAPHIC_CONTOUR_SPACING_RANGE = {
  min: 0.25,
  max: 1.2
} as const;

export const HILL_PREVIEW_PRESSURE_OVERLAY_STRENGTH_RANGE = {
  min: 0,
  max: 1
} as const;

export function defaultHillPreviewSettings(): HillPreviewSettings {
  return {
    mode: 'material',
    layers: { ...DEFAULT_LAYER_SETTINGS },
    growthSkin: { ...DEFAULT_GROWTH_SKIN_SETTINGS },
    overlays: { ...DEFAULT_OVERLAY_SETTINGS }
  };
}

export function hillPreviewBasePassEnabled(settings: HillPreviewSettings): boolean {
  return settings.mode === 'neutral_geometry' || settings.layers.base;
}

export function hillPreviewVisualIdentity(settings: HillPreviewSettings): HillPreviewVisualIdentity {
  const pressureOverlay =
    settings.mode === 'material' &&
    settings.overlays.pressureField !== 'none' &&
    settings.overlays.pressureOverlayStrength > 0
      ? {
          field: settings.overlays.pressureField,
          strength: settings.overlays.pressureOverlayStrength
        }
      : null;
  const effectiveLayers =
    settings.mode === 'neutral_geometry'
      ? ['neutral_geometry']
      : [
          ...HILL_PREVIEW_LAYER_KEYS.filter((key) => settings.layers[key]),
          ...(pressureOverlay ? [`pressure:${pressureOverlay.field}`] : [])
        ];

  return {
    requestedMode: settings.mode,
    effectiveMode: settings.mode,
    effectiveLayers,
    pressureOverlay
  };
}

export function loadHillPreviewSettings(storage: HillPreviewSettingsStorage | undefined): HillPreviewSettings {
  if (!storage) {
    return defaultHillPreviewSettings();
  }

  const persisted = storage.getItem(HILL_OF_HILLS_PREVIEW_SETTINGS_STORAGE_KEY);
  if (!persisted) {
    return defaultHillPreviewSettings();
  }

  try {
    return sanitizeHillPreviewSettings(JSON.parse(persisted));
  } catch {
    return defaultHillPreviewSettings();
  }
}

export function saveHillPreviewSettings(storage: HillPreviewSettingsStorage | undefined, settings: HillPreviewSettings): void {
  if (!storage) {
    return;
  }

  storage.setItem(HILL_OF_HILLS_PREVIEW_SETTINGS_STORAGE_KEY, JSON.stringify(sanitizeHillPreviewSettings(settings)));
}

export function sanitizeHillPreviewSettings(input: unknown): HillPreviewSettings {
  const defaults = defaultHillPreviewSettings();
  if (!isPlainObject(input)) {
    return defaults;
  }

  const layersInput = isPlainObject(input.layers) ? input.layers : {};
  const growthSkinInput = isPlainObject(input.growthSkin) ? input.growthSkin : {};
  const overlayInput = isPlainObject(input.overlays) ? input.overlays : {};

  return {
    mode: previewModeOrDefault(input.mode, defaults.mode),
    layers: {
      base: booleanOrDefault(layersInput.base, defaults.layers.base),
      transitions: booleanOrDefault(layersInput.transitions, defaults.layers.transitions),
      edgeDissolves: booleanOrDefault(layersInput.edgeDissolves, defaults.layers.edgeDissolves),
      surfaceDetails: booleanOrDefault(layersInput.surfaceDetails, defaults.layers.surfaceDetails),
      topologyOverlays: booleanOrDefault(layersInput.topologyOverlays, defaults.layers.topologyOverlays),
      growthSkin: booleanOrDefault(layersInput.growthSkin, defaults.layers.growthSkin),
      routeMarkers: booleanOrDefault(layersInput.routeMarkers, defaults.layers.routeMarkers)
    },
    growthSkin: {
      density: numberOrDefault(
        growthSkinInput.density,
        defaults.growthSkin.density,
        HILL_PREVIEW_GROWTH_SKIN_DENSITY_RANGE.min,
        HILL_PREVIEW_GROWTH_SKIN_DENSITY_RANGE.max
      ),
      opacity: numberOrDefault(
        growthSkinInput.opacity,
        defaults.growthSkin.opacity,
        HILL_PREVIEW_GROWTH_SKIN_OPACITY_RANGE.min,
        HILL_PREVIEW_GROWTH_SKIN_OPACITY_RANGE.max
      )
    },
    overlays: {
      topologyLineStrength: numberOrDefault(
        overlayInput.topologyLineStrength,
        defaults.overlays.topologyLineStrength,
        HILL_PREVIEW_TOPOLOGY_LINE_STRENGTH_RANGE.min,
        HILL_PREVIEW_TOPOLOGY_LINE_STRENGTH_RANGE.max
      ),
      topographicContourStrength: numberOrDefault(
        overlayInput.topographicContourStrength,
        defaults.overlays.topographicContourStrength,
        HILL_PREVIEW_TOPOGRAPHIC_CONTOUR_STRENGTH_RANGE.min,
        HILL_PREVIEW_TOPOGRAPHIC_CONTOUR_STRENGTH_RANGE.max
      ),
      topographicContourSpacing: numberOrDefault(
        overlayInput.topographicContourSpacing,
        defaults.overlays.topographicContourSpacing,
        HILL_PREVIEW_TOPOGRAPHIC_CONTOUR_SPACING_RANGE.min,
        HILL_PREVIEW_TOPOGRAPHIC_CONTOUR_SPACING_RANGE.max
      ),
      pressureField: pressureFieldOrDefault(overlayInput.pressureField, defaults.overlays.pressureField),
      pressureOverlayStrength: numberOrDefault(
        overlayInput.pressureOverlayStrength,
        defaults.overlays.pressureOverlayStrength,
        HILL_PREVIEW_PRESSURE_OVERLAY_STRENGTH_RANGE.min,
        HILL_PREVIEW_PRESSURE_OVERLAY_STRENGTH_RANGE.max
      )
    }
  };
}

function previewModeOrDefault(value: unknown, fallback: HillPreviewMode): HillPreviewMode {
  return value === 'material' || value === 'neutral_geometry' ? value : fallback;
}

function booleanOrDefault(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function numberOrDefault(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }
  return round(clamp(value, min, max));
}

function pressureFieldOrDefault(value: unknown, fallback: HillPreviewPressureFieldSelection): HillPreviewPressureFieldSelection {
  if (value === 'none') {
    return value;
  }
  if (typeof value === 'string' && (HILL_OF_HILLS_PRESSURE_FIELD_KINDS as readonly string[]).includes(value)) {
    return value as HillPreviewPressureFieldSelection;
  }
  return fallback;
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
