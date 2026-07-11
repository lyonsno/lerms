import { defaultHillOfHillsParams, HILL_OF_HILLS_TOPOLOGY_EVENT_KINDS } from '../src/terrain/hill-of-hills.js';
import {
  applyHillDiagnosticParamPreset,
  applyHillDiagnosticPreviewPreset,
  hillDiagnosticPresetFromSearch
} from '../src/terrain/hill-of-hills-diagnostic-presets.js';
import { defaultHillPreviewSettings } from '../src/terrain/hill-of-hills-preview-settings.js';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

assert(
  hillDiagnosticPresetFromSearch('?hillPreset=continuity-hills') === 'continuity-hills',
  'query parser accepts continuity-hills preset'
);
assert(hillDiagnosticPresetFromSearch('?hillPreset=nonsense') === undefined, 'query parser rejects unknown presets');
assert(hillDiagnosticPresetFromSearch('?foo=bar') === undefined, 'query parser ignores unrelated query state');

const paramPreset = applyHillDiagnosticParamPreset({
  ...defaultHillOfHillsParams,
  ditchPhaseIntensity: 0.9,
  ditchPhaseLimit: 6,
  trailPhaseIntensity: 0.9,
  trailPhaseLimit: 6,
  topologyPhaseIntensity: 0,
  topologyPhaseLimit: 0,
  topologyPhaseHillBias: 0,
  topologyPhaseValleyBias: 1.6,
  topologyPhaseRidgeBias: 1.4,
  topologyPhaseSaddleBias: 1.2,
  topologyPhaseBasinBias: 1,
  topologyEventClasses: {
    ...defaultHillOfHillsParams.topologyEventClasses,
    valley_deepen: {
      ...defaultHillOfHillsParams.topologyEventClasses.valley_deepen,
      enabled: true,
      appetite: 2
    }
  }
}, 'continuity-hills');

assert(paramPreset.ditchPhaseIntensity === 0, 'continuity preset hard-disables ditch intensity');
assert(paramPreset.ditchPhaseLimit === 0, 'continuity preset hard-disables ditch supports');
assert(paramPreset.trailPhaseIntensity === 0, 'continuity preset disables trail intensity for clean diagnosis');
assert(paramPreset.trailPhaseLimit === 0, 'continuity preset disables trail supports for clean diagnosis');
assert(paramPreset.topologyPhaseIntensity > 0, 'continuity preset enables topology motion');
assert(paramPreset.topologyPhaseLimit >= 3, 'continuity preset keeps enough hill supports to show broad phase motion');
assert(paramPreset.topologyPhaseHillBias > 0, 'continuity preset enables hill topology bias');
assert(paramPreset.topologyPhaseValleyBias === 0, 'continuity preset suppresses valley topology bias');
assert(paramPreset.topologyPhaseRidgeBias === 0, 'continuity preset suppresses ridge topology bias');
assert(paramPreset.topologyPhaseSaddleBias === 0, 'continuity preset suppresses saddle topology bias');
assert(paramPreset.topologyPhaseBasinBias === 0, 'continuity preset suppresses basin topology bias');

for (const eventKind of HILL_OF_HILLS_TOPOLOGY_EVENT_KINDS) {
  const eventConfig = paramPreset.topologyEventClasses[eventKind];
  if (eventKind === 'hill_swell' || eventKind === 'hill_slump') {
    assert(eventConfig.enabled, `continuity preset keeps ${eventKind} enabled`);
    assert(eventConfig.appetite > 0, `continuity preset gives ${eventKind} nonzero appetite`);
    continue;
  }
  assert(!eventConfig.enabled, `continuity preset disables ${eventKind}`);
  assert(eventConfig.appetite === 0, `continuity preset zeros ${eventKind} appetite`);
}

const previewPreset = applyHillDiagnosticPreviewPreset(
  {
    ...defaultHillPreviewSettings(),
    growthSkin: {
      density: 2.5,
      opacity: 1.6
    },
    overlays: {
      topologyLineStrength: 1,
      topographicContourStrength: 1,
      topographicContourSpacing: 0.25,
      pressureField: 'erosion',
      pressureOverlayStrength: 1
    }
  },
  'continuity-hills'
);

assert(previewPreset.layers.base, 'continuity preset keeps base layer visible');
assert(previewPreset.layers.growthSkin, 'continuity preset keeps growth skin visible');
assert(previewPreset.layers.surfaceDetails, 'continuity preset keeps semantic surface details visible');
assert(previewPreset.layers.topologyOverlays, 'continuity preset keeps topology overlays visible');
assert(previewPreset.growthSkin.density < 2.5, 'continuity preset lowers growth skin density');
assert(previewPreset.growthSkin.opacity < 1.6, 'continuity preset lowers growth skin opacity');
assert(previewPreset.overlays.topologyLineStrength < 1, 'continuity preset lowers topology line clutter');
assert(previewPreset.overlays.topographicContourStrength > 0, 'continuity preset keeps topographic contour evidence');
assert(previewPreset.overlays.pressureField === 'none', 'continuity preset disables pressure overlay confounders');
assert(previewPreset.overlays.pressureOverlayStrength === 0, 'continuity preset zeros pressure overlay strength');

console.log('hill of hills diagnostic preset contracts ok');
