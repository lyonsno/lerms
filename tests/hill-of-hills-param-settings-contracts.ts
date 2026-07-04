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
  topologyPhaseHillBias: 1,
  topologyPhaseSaddleBias: 1
};

const sanitized = sanitizeHillOfHillsParamSettings(
  {
    hillCount: 28,
    valleyCount: 31,
    topologyPhaseIntensity: 0.68,
    topologyPhaseDurationMs: 4400,
    topologyPhaseHeightScale: 0.35,
    topologyPhaseBasinBias: 1.55,
    topologyPhaseHillBias: 0.2,
    topologyPhaseSaddleBias: 0,
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
assert(sanitized.topologyPhaseDurationMs === 4400, 'terrain param settings persist topology cadence');
assert(sanitized.topologyPhaseHeightScale === 0.35, 'terrain param settings persist topology height scale');
assert(sanitized.topologyPhaseBasinBias === 1.55, 'terrain param settings persist basin kind bias');
assert(sanitized.topologyPhaseHillBias === 0.2, 'terrain param settings persist hill kind bias');
assert(sanitized.topologyPhaseSaddleBias === 0, 'terrain param settings persist saddle kind bias');
assert(!('yaw' in sanitized), 'terrain param settings ignore camera yaw');
assert(!('tilt' in sanitized), 'terrain param settings ignore camera tilt');
assert(!('cameraZoom' in sanitized), 'terrain param settings ignore camera zoom');
assert(!('panX' in sanitized), 'terrain param settings ignore camera pan');
assert(sanitized.floorWidth === defaults.floorWidth, 'partial terrain settings retain default floor width');

const clamped = sanitizeHillOfHillsParamSettings(
  {
    hillCount: 999,
    valleyCount: -4,
    topologyPhaseIntensity: 4,
    topologyPhaseDurationMs: 40,
    topologyPhaseHeightScale: 7,
    topologyPhaseBasinBias: -3,
    topologyPhaseHillBias: 9,
    topologyPhaseSaddleBias: Number.NaN
  },
  defaults
);
assert(clamped.hillCount === 36, 'persisted hill count clamps to visible control max');
assert(clamped.valleyCount === 4, 'persisted valley count clamps to visible control min');
assert(clamped.topologyPhaseIntensity === 1, 'persisted topology intensity clamps to one');
assert(clamped.topologyPhaseDurationMs === 800, 'persisted topology cadence clamps to visible control min');
assert(clamped.topologyPhaseHeightScale === 2, 'persisted topology height scale clamps to visible control max');
assert(clamped.topologyPhaseBasinBias === 0, 'persisted basin bias clamps to min');
assert(clamped.topologyPhaseHillBias === 2, 'persisted hill bias clamps to max');
assert(clamped.topologyPhaseSaddleBias === defaults.topologyPhaseSaddleBias, 'invalid saddle bias falls back');

const storage = memoryStorage();
saveHillOfHillsParamSettings(storage, { ...defaults, ...sanitized });
const rawSaved = storage.getItem(HILL_OF_HILLS_PARAM_SETTINGS_STORAGE_KEY);
assert(typeof rawSaved === 'string' && rawSaved.includes('"topologyPhaseHeightScale"'), 'save writes terrain settings payload');
assert(!rawSaved.includes('yaw') && !rawSaved.includes('camera'), 'save excludes camera settings');
const loaded = loadHillOfHillsParamSettings(storage, defaults);
assert(loaded.topologyPhaseHeightScale === 0.35, 'load round-trips topology height scale');
assert(loaded.topologyPhaseDurationMs === 4400, 'load round-trips topology cadence');
assert(loaded.hillCount === 28, 'load round-trips terrain count');

const brokenStorage = memoryStorage({
  [HILL_OF_HILLS_PARAM_SETTINGS_STORAGE_KEY]: '{"topologyPhaseIntensity":'
});
const broken = loadHillOfHillsParamSettings(brokenStorage, defaults);
assert(broken.topologyPhaseIntensity === defaults.topologyPhaseIntensity, 'broken persisted JSON falls back to defaults');

console.log('hill of hills param settings contracts ok');
