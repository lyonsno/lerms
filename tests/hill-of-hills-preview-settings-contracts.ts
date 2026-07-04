import {
  HILL_OF_HILLS_PREVIEW_SETTINGS_STORAGE_KEY,
  defaultHillPreviewSettings,
  loadHillPreviewSettings,
  saveHillPreviewSettings,
  sanitizeHillPreviewSettings,
  type HillPreviewSettingsStorage
} from '../src/terrain/hill-of-hills-preview-settings.js';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function memoryStorage(initial: Record<string, string> = {}): HillPreviewSettingsStorage {
  const state = new Map(Object.entries(initial));
  return {
    getItem(key: string) {
      return state.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      state.set(key, value);
    }
  };
}

const defaults = defaultHillPreviewSettings();
assert(defaults.layers.base, 'base layer defaults on');
assert(defaults.layers.transitions, 'transition layer defaults on');
assert(defaults.layers.edgeDissolves, 'edge dissolve layer defaults on');
assert(defaults.layers.surfaceDetails, 'surface detail layer defaults on');
assert(defaults.layers.topologyOverlays, 'topology overlay layer defaults on');
assert(defaults.layers.growthSkin, 'growth skin layer defaults on');
assert(defaults.layers.routeMarkers, 'route marker layer defaults on');
assert(defaults.growthSkin.density === 1, 'growth skin density defaults to 1');
assert(defaults.growthSkin.opacity === 1, 'growth skin opacity defaults to 1');
assert(defaults.overlays.topologyLineStrength === 0.35, 'topology proof lines default to a subordinate overlay strength');
assert(defaults.overlays.topographicContourStrength === 0.55, 'topographic contours default on as the aesthetic height-line layer');
assert(defaults.overlays.topographicContourSpacing === 0.6, 'topographic contour spacing defaults to a readable hill-scale interval');

const partial = sanitizeHillPreviewSettings({
  layers: {
    transitions: false,
    growthSkin: false
  },
  growthSkin: {
    density: 1.8,
    opacity: 0.35
  },
  overlays: {
    topologyLineStrength: 0.72,
    topographicContourStrength: 0.2,
    topographicContourSpacing: 0.9
  }
});
assert(partial.layers.base, 'partial persisted payload keeps unspecified layer defaults');
assert(!partial.layers.transitions, 'partial persisted payload applies transition toggle');
assert(!partial.layers.growthSkin, 'partial persisted payload applies growth skin toggle');
assert(partial.layers.routeMarkers, 'partial persisted payload keeps route markers by default');
assert(partial.growthSkin.density === 1.8, 'partial persisted payload applies density');
assert(partial.growthSkin.opacity === 0.35, 'partial persisted payload applies opacity');
assert(partial.overlays.topologyLineStrength === 0.72, 'partial persisted payload applies topology line strength');
assert(partial.overlays.topographicContourStrength === 0.2, 'partial persisted payload applies topographic contour strength');
assert(partial.overlays.topographicContourSpacing === 0.9, 'partial persisted payload applies topographic contour spacing');

const clamped = sanitizeHillPreviewSettings({
  layers: {
    base: 'nope',
    topologyOverlays: 0
  },
  growthSkin: {
    density: 9,
    opacity: -2
  },
  overlays: {
    topologyLineStrength: 9,
    topographicContourStrength: -4,
    topographicContourSpacing: 3
  },
  unrelatedFutureKey: true
});
assert(clamped.layers.base, 'invalid layer values fall back to defaults');
assert(clamped.layers.topologyOverlays, 'numeric layer values do not masquerade as booleans');
assert(clamped.growthSkin.density === 2.5, 'density clamps to max bound');
assert(clamped.growthSkin.opacity === 0.05, 'opacity clamps to min bound');
assert(clamped.overlays.topologyLineStrength === 1, 'topology line strength clamps to max bound');
assert(clamped.overlays.topographicContourStrength === 0, 'topographic contour strength clamps to min bound');
assert(clamped.overlays.topographicContourSpacing === 1.2, 'topographic contour spacing clamps to max bound');

const storage = memoryStorage();
const saved = {
  ...defaults,
  layers: {
    ...defaults.layers,
    transitions: false,
    growthSkin: false
  },
  growthSkin: {
    density: 0.55,
    opacity: 1.45
  },
  overlays: {
    topologyLineStrength: 0.12,
    topographicContourStrength: 0.82,
    topographicContourSpacing: 0.4
  }
};
saveHillPreviewSettings(storage, saved);
const rawSaved = storage.getItem(HILL_OF_HILLS_PREVIEW_SETTINGS_STORAGE_KEY);
assert(typeof rawSaved === 'string' && rawSaved.includes('"growthSkin"'), 'save writes the storage key payload');
const loaded = loadHillPreviewSettings(storage);
assert(!loaded.layers.transitions, 'load round-trips transition toggle');
assert(!loaded.layers.growthSkin, 'load round-trips growth skin toggle');
assert(loaded.growthSkin.density === 0.55, 'load round-trips density');
assert(loaded.growthSkin.opacity === 1.45, 'load round-trips opacity');
assert(loaded.overlays.topologyLineStrength === 0.12, 'load round-trips topology line strength');
assert(loaded.overlays.topographicContourStrength === 0.82, 'load round-trips topographic contour strength');
assert(loaded.overlays.topographicContourSpacing === 0.4, 'load round-trips topographic contour spacing');

const brokenStorage = memoryStorage({
  [HILL_OF_HILLS_PREVIEW_SETTINGS_STORAGE_KEY]: '{"layers":'
});
const broken = loadHillPreviewSettings(brokenStorage);
assert(JSON.stringify(broken) === JSON.stringify(defaults), 'broken persisted JSON falls back to defaults');

console.log('hill of hills preview settings contracts ok');
