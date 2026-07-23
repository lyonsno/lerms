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
assert(
  hillDiagnosticPresetFromSearch('?hillPreset=whole-field-topology') === 'whole-field-topology',
  'query parser accepts whole-field-topology preset'
);
assert(
  hillDiagnosticPresetFromSearch('?hillPreset=topology-contention') === 'topology-contention',
  'query parser accepts topology-contention preset'
);
assert(
  hillDiagnosticPresetFromSearch('?hillPreset=phase-point-recomposition') === 'phase-point-recomposition',
  'query parser accepts phase-point-recomposition preset'
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
assert(paramPreset.topologyDynamicsMode === 'persistent_pressure', 'continuity preset exercises the persistent topology route');
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

const wholeFieldPreset = applyHillDiagnosticParamPreset(
  {
    ...defaultHillOfHillsParams,
    topologyPossibilityMode: 'inherited',
    topologyPhaseDriftIntensity: 0
  },
  'whole-field-topology'
);
assert(wholeFieldPreset.topologyDynamicsMode === 'persistent_pressure', 'whole-field preset exercises persistent world memory');
assert(wholeFieldPreset.topologyPossibilityMode === 'reauthored', 'whole-field preset enables proposal-authored topology');
assert(wholeFieldPreset.topologyPhaseDriftIntensity > 0.5, 'whole-field preset gives the coherent proposal field material authority');
assert(wholeFieldPreset.topologyPhaseLimit >= 4, 'whole-field preset exposes several simultaneous topology proposals');

const contentionPreset = applyHillDiagnosticParamPreset(
  {
    ...defaultHillOfHillsParams,
    topologyPossibilityMode: 'inherited',
    topologyPhaseDriftIntensity: 0
  },
  'topology-contention'
);
assert(contentionPreset.topologyDynamicsMode === 'persistent_pressure', 'contention preset exercises persistent world memory');
assert(contentionPreset.topologyPossibilityMode === 'reauthored', 'contention preset uses whole-field proposal authorship');
assert(contentionPreset.topologyPhaseIntensity === 1, 'contention preset preserves the accepted topology intensity');
assert(contentionPreset.topologyPhaseLimit === 8, 'contention preset admits the accepted eight simultaneous supports');
assert(contentionPreset.topologyPhaseRadius === 2.8, 'contention preset preserves the accepted broad support radius');
assert(contentionPreset.topologyPhaseDurationMs === 5200, 'contention preset preserves the accepted episode duration');
assert(contentionPreset.topologyEventClasses.hill_swell.enabled, 'contention preset enables hill swell');
assert(contentionPreset.topologyEventClasses.hill_slump.enabled, 'contention preset enables hill slump');
assert(contentionPreset.topologyEventClasses.valley_deepen.enabled, 'contention preset enables valley deepening');
assert(contentionPreset.topologyEventClasses.ridge_lift.enabled, 'contention preset enables ridge lifting');
assert(!contentionPreset.topologyEventClasses.basin_bloom.enabled, 'contention preset keeps basin bloom disabled');
assert(!contentionPreset.topologyEventClasses.saddle_pinch.enabled, 'contention preset keeps saddle pinching disabled');

const phasePointPreset = applyHillDiagnosticParamPreset(
  {
    ...defaultHillOfHillsParams,
    topologyDynamicsMode: 'direct_synthesis',
    topologyPossibilityMode: 'inherited',
    topologyPhaseDriftIntensity: 0
  },
  'phase-point-recomposition'
);
assert(phasePointPreset.topologyDynamicsMode === 'persistent_pressure', 'phase-point preset exercises persistent world memory');
assert(
  phasePointPreset.topologyPossibilityMode === 'phase_recomposed',
  'phase-point preset authors possibility from the evolved world'
);
assert(phasePointPreset.topologyPhaseIntensity === 1, 'phase-point preset preserves the contention comparison intensity');
assert(phasePointPreset.topologyPhaseLimit === 8, 'phase-point preset preserves the contention comparison support count');
assert(phasePointPreset.topologyPhaseRadius === 2.8, 'phase-point preset preserves the contention comparison support radius');
assert(phasePointPreset.topologyPhaseDurationMs === 5200, 'phase-point preset preserves the contention comparison cadence');

console.log('hill of hills diagnostic preset contracts ok');
