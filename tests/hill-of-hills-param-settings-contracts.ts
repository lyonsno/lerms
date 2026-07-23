import { defaultHillOfHillsParams } from '../src/terrain/hill-of-hills.js';
import {
  HILL_OF_HILLS_PARAM_SETTINGS_STORAGE_KEY,
  loadHillOfHillsParamSettings,
  saveHillOfHillsParamSettings,
  sanitizeHillOfHillsParamSettings,
  type HillOfHillsParamSettingsStorage
} from '../src/terrain/hill-of-hills-param-settings.js';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function memoryStorage(initial: Record<string, string> = {}): HillOfHillsParamSettingsStorage {
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

const defaults = {
  ...defaultHillOfHillsParams,
  ditchPhaseIntensity: 0.18,
  ditchPhaseLimit: 1,
  topologyPhaseIntensity: 0.42,
  topologyPhaseHeightScale: 1,
  topologyPhaseBasinBias: 1,
  topologyPhaseValleyBias: 1,
  topologyPhaseHillBias: 1,
  topologyPhaseRidgeBias: 1,
  topologyPhaseSaddleBias: 1,
  topologyPhaseOverlap: 0.32,
  topologyPhaseDetailScale: 1
};

const sanitized = sanitizeHillOfHillsParamSettings(
  {
    hillCount: 28,
    valleyCount: 31,
    topologyPhaseIntensity: 0.68,
    topologyDynamicsMode: 'persistent_pressure',
    topologyPossibilityMode: 'reauthored',
    topologyPhaseDurationMs: 4400,
    topologyPhaseHeightScale: 0.35,
    topologyPhaseBasinBias: 1.55,
    topologyPhaseValleyBias: 0.4,
    topologyPhaseHillBias: 0.2,
    topologyPhaseRidgeBias: 1.8,
    topologyPhaseSaddleBias: 0,
    topologyPhaseOverlap: 0.44,
    topologyPhaseDetailScale: 1.7,
    topologyEventClasses: {
      valley_deepen: {
        enabled: true,
        appetite: 1.65,
        force: 1.3,
        gesture: 'surge',
        phaseOffset: 0.25,
        spread: 0.62
      },
      ridge_shear: {
        enabled: false,
        appetite: 0.15,
        force: 1.85,
        gesture: 'rupture',
        phaseOffset: 0.75,
        spread: 1.7
      }
    },
    yaw: 0.91,
    tilt: 0.35,
    cameraZoom: 1.6,
    panX: -0.2
  },
  defaults
);

assert(sanitized.hillCount === 28, 'terrain param settings apply hill count');
assert(sanitized.valleyCount === 31, 'terrain param settings apply valley count');
assert(sanitized.topologyPhaseIntensity === 0.68, 'terrain param settings apply topology intensity');
assert(
  (sanitized as typeof sanitized & { topologyDynamicsMode?: string }).topologyDynamicsMode === 'persistent_pressure',
  'terrain param settings persist the topology dynamics route'
);
assert(sanitized.topologyPossibilityMode === 'reauthored', 'terrain param settings persist the topology possibility posture');
assert(sanitized.topologyPhaseDurationMs === 4400, 'terrain param settings persist topology cadence');
assert(sanitized.topologyPhaseHeightScale === 0.35, 'terrain param settings persist topology height scale');
assert(sanitized.topologyPhaseBasinBias === 1.55, 'terrain param settings persist basin kind bias');
assert(sanitized.topologyPhaseValleyBias === 0.4, 'terrain param settings persist valley kind bias');
assert(sanitized.topologyPhaseHillBias === 0.2, 'terrain param settings persist hill kind bias');
assert(sanitized.topologyPhaseRidgeBias === 1.8, 'terrain param settings persist ridge kind bias');
assert(sanitized.topologyPhaseSaddleBias === 0, 'terrain param settings persist saddle kind bias');
assert(sanitized.topologyPhaseOverlap === 0.44, 'terrain param settings persist topology overlap');
assert(sanitized.topologyPhaseDetailScale === 1.7, 'terrain param settings persist topology detail scale');
assert(sanitized.topologyEventClasses.valley_deepen.gesture === 'surge', 'terrain param settings persist valley gesture preset');
assert(sanitized.topologyEventClasses.valley_deepen.appetite === 1.65, 'terrain param settings persist valley appetite');
assert(sanitized.topologyEventClasses.valley_deepen.force === 1.3, 'terrain param settings persist valley force');
assert(sanitized.topologyEventClasses.valley_deepen.phaseOffset === 0.25, 'terrain param settings persist valley phase offset');
assert(sanitized.topologyEventClasses.valley_deepen.spread === 0.62, 'terrain param settings persist valley support spread');
assert(sanitized.topologyEventClasses.ridge_shear.enabled === false, 'terrain param settings persist event-class enabled flags');
assert(sanitized.topologyEventClasses.ridge_shear.gesture === 'rupture', 'terrain param settings persist ridge gesture preset');
assert(!('yaw' in sanitized), 'terrain param settings ignore camera yaw');
assert(!('tilt' in sanitized), 'terrain param settings ignore camera tilt');
assert(!('cameraZoom' in sanitized), 'terrain param settings ignore camera zoom');
assert(!('panX' in sanitized), 'terrain param settings ignore camera pan');
assert(sanitized.floorWidth === defaults.floorWidth, 'partial terrain settings retain default floor width');

const phaseRecomposed = sanitizeHillOfHillsParamSettings(
  {
    topologyPossibilityMode: 'phase_recomposed'
  },
  defaults
);
assert(
  phaseRecomposed.topologyPossibilityMode === 'phase_recomposed',
  'terrain param settings accept the evolved-world topology possibility posture'
);

const clamped = sanitizeHillOfHillsParamSettings(
  {
    hillCount: 999,
    valleyCount: -4,
    topologyPhaseIntensity: 4,
    topologyDynamicsMode: 'instant_teleportation',
    topologyPossibilityMode: 'wishful_thinking',
    topologyPhaseDurationMs: 40,
    topologyPhaseHeightScale: 7,
    topologyPhaseBasinBias: -3,
    topologyPhaseValleyBias: 9,
    topologyPhaseHillBias: 9,
    topologyPhaseRidgeBias: -4,
    topologyPhaseSaddleBias: Number.NaN,
    topologyPhaseOverlap: 3,
    topologyPhaseDetailScale: -2,
    topologyEventClasses: {
      hill_swell: {
        enabled: 'maybe',
        appetite: 9,
        force: -1,
        gesture: 'nonsense',
        phaseOffset: 4,
        spread: -2
      }
    }
  },
  defaults
);
assert(clamped.hillCount === 36, 'persisted hill count clamps to visible control max');
assert(clamped.valleyCount === 4, 'persisted valley count clamps to visible control min');
assert(clamped.topologyPhaseIntensity === 1, 'persisted topology intensity clamps to one');
assert(
  (clamped as typeof clamped & { topologyDynamicsMode?: string }).topologyDynamicsMode === defaults.topologyDynamicsMode,
  'invalid topology dynamics route falls back to the supplied default'
);
assert(
  clamped.topologyPossibilityMode === defaults.topologyPossibilityMode,
  'invalid topology possibility posture falls back to the supplied default'
);
assert(clamped.topologyPhaseDurationMs === 800, 'persisted topology cadence clamps to visible control min');
assert(clamped.topologyPhaseHeightScale === 2, 'persisted topology height scale clamps to visible control max');
assert(clamped.topologyPhaseBasinBias === 0, 'persisted basin bias clamps to min');
assert(clamped.topologyPhaseValleyBias === 2, 'persisted valley bias clamps to max');
assert(clamped.topologyPhaseHillBias === 2, 'persisted hill bias clamps to max');
assert(clamped.topologyPhaseRidgeBias === 0, 'persisted ridge bias clamps to min');
assert(clamped.topologyPhaseSaddleBias === defaults.topologyPhaseSaddleBias, 'invalid saddle bias falls back');
assert(clamped.topologyPhaseOverlap === 0.5, 'persisted topology overlap clamps to max');
assert(clamped.topologyPhaseDetailScale === 0, 'persisted topology detail scale clamps to min');
assert(clamped.topologyEventClasses.hill_swell.enabled === defaults.topologyEventClasses.hill_swell.enabled, 'invalid event enabled flag falls back');
assert(clamped.topologyEventClasses.hill_swell.gesture === defaults.topologyEventClasses.hill_swell.gesture, 'invalid event gesture falls back');
assert(clamped.topologyEventClasses.hill_swell.appetite === 2, 'persisted event appetite clamps to max');
assert(clamped.topologyEventClasses.hill_swell.force === 0, 'persisted event force clamps to min');
assert(clamped.topologyEventClasses.hill_swell.phaseOffset === 1, 'persisted event phase offset clamps to max');
assert(clamped.topologyEventClasses.hill_swell.spread === 0.25, 'persisted event spread clamps to min');

const storage = memoryStorage();
saveHillOfHillsParamSettings(storage, { ...defaults, ...sanitized });
const rawSaved = storage.getItem(HILL_OF_HILLS_PARAM_SETTINGS_STORAGE_KEY);
assert(typeof rawSaved === 'string' && rawSaved.includes('"topologyPhaseHeightScale"'), 'save writes terrain settings payload');
assert(rawSaved.includes('"topologyPhaseOverlap"'), 'save writes topology overlap');
assert(rawSaved.includes('"topologyPhaseDetailScale"'), 'save writes topology detail scale');
assert(rawSaved.includes('"topologyEventClasses"'), 'save writes topology event-class settings');
assert(rawSaved.includes('"topologyDynamicsMode":"persistent_pressure"'), 'save writes the topology dynamics route');
assert(rawSaved.includes('"topologyPossibilityMode":"reauthored"'), 'save writes the topology possibility posture');
assert(rawSaved.includes('"surge"') && rawSaved.includes('"rupture"'), 'save writes topology gesture presets');
assert(!rawSaved.includes('yaw') && !rawSaved.includes('camera'), 'save excludes camera settings');
const loaded = loadHillOfHillsParamSettings(storage, defaults);
assert(loaded.topologyPhaseHeightScale === 0.35, 'load round-trips topology height scale');
assert(
  (loaded as typeof loaded & { topologyDynamicsMode?: string }).topologyDynamicsMode === 'persistent_pressure',
  'load round-trips the topology dynamics route'
);
assert(loaded.topologyPossibilityMode === 'reauthored', 'load round-trips the topology possibility posture');
assert(loaded.topologyPhaseDurationMs === 4400, 'load round-trips topology cadence');
assert(loaded.topologyPhaseOverlap === 0.44, 'load round-trips topology overlap');
assert(loaded.topologyPhaseDetailScale === 1.7, 'load round-trips topology detail scale');
assert(loaded.topologyEventClasses.valley_deepen.gesture === 'surge', 'load round-trips topology gesture preset');
assert(loaded.topologyEventClasses.valley_deepen.force === 1.3, 'load round-trips topology event force');
assert(loaded.topologyEventClasses.ridge_shear.enabled === false, 'load round-trips disabled topology event class');
assert(loaded.hillCount === 28, 'load round-trips terrain count');

const brokenStorage = memoryStorage({
  [HILL_OF_HILLS_PARAM_SETTINGS_STORAGE_KEY]: '{"topologyPhaseIntensity":'
});
const broken = loadHillOfHillsParamSettings(brokenStorage, defaults);
assert(broken.topologyPhaseIntensity === defaults.topologyPhaseIntensity, 'broken persisted JSON falls back to defaults');

console.log('hill of hills param settings contracts ok');
