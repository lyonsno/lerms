import {
  HILL_KAMINOS_PHASE_MORPH_RECIPE,
  createHillKaminosPhaseMorphRecipeBuffer
} from '../src/fluid/hill-kaminos-phase-morph-recipe.js';
import { createHillKaminosBrowserRuntime } from '../src/fluid/hill-kaminos-browser-runtime.js';
import {
  HILL_PORTABLE_MACRO_DEBUG_OPTICAL_ROUTE,
  HILL_PORTABLE_MACRO_HOST_ROUTE,
  KAMINOS_PORTABLE_MACRO_PROVIDER_PIN,
  assertHillPortableMacroOpticalProviderMountWitness
} from '../src/fluid/hill-kaminos-portable-optical-provider.js';
import { createHillOfHillsLayerTileCache } from '../src/terrain/hill-of-hills.js';
import {
  HILL_MOVING_SUPPORT_FIRST_IMPACT_CONTRACT,
  assertHillMovingSupportFirstImpact
} from '../src/terrain/hill-of-hills-first-impact.js';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function assertThrows(action: () => unknown, includes: string, message: string): Error {
  let error: unknown;
  try {
    action();
  } catch (caught) {
    error = caught;
  }
  assert(error instanceof Error, message);
  assert(error.message.includes(includes), `${message}: ${error.message}`);
  return error;
}

const cache = createHillOfHillsLayerTileCache();
const previousBuffer = createHillKaminosPhaseMorphRecipeBuffer(cache, 'previous');
const currentBuffer = createHillKaminosPhaseMorphRecipeBuffer(cache, 'current');
const runtime = await createHillKaminosBrowserRuntime(previousBuffer, {
  producerRevision: HILL_KAMINOS_PHASE_MORPH_RECIPE.producerRevision,
  motionSubstepEnvelopeSeconds: HILL_KAMINOS_PHASE_MORPH_RECIPE.motionSubstepEnvelopeSeconds
});

for (let step = 0; step < 4; step += 1) {
  runtime.advance(1000 + step * 80);
}
const before = runtime.witness.portableOpticalProvider;
assert(before.status === 'active', 'canonical provider is active before the Hill remap');
assert(before.sequenceStage === 'pre_remap', 'provider records the pre-remap stage');
assert(
  before.package.requested.version === '0.3.0' &&
    before.package.effective.version === '0.3.0' &&
    before.package.effective.artifactRevision === '@kaminos/fluid-webgpu@0.3.0',
  'provider records exact requested/effective package identity'
);
assert(
  before.source.route.requested === 'kaminos/fluid/portable-macro-source' &&
    before.source.route.effective === before.source.route.requested &&
    before.source.capability === 'kaminos.fluid.portable-macro-source.v1',
  'provider records exact retained-source route and capability'
);
assert(
  before.provider.revision === KAMINOS_PORTABLE_MACRO_PROVIDER_PIN.revision &&
    before.provider.route.requested === 'kaminos/finger-fluid/portable-macro-geometry-provider' &&
    before.provider.route.effective === before.provider.route.requested,
  'provider records exact requested/effective canonical provider identity'
);
assert(
  before.host.route.requested === HILL_PORTABLE_MACRO_HOST_ROUTE &&
    before.host.route.effective === HILL_PORTABLE_MACRO_HOST_ROUTE,
  'provider records the exact LERMS host route'
);
assert(
  before.optical.route.requested === HILL_PORTABLE_MACRO_DEBUG_OPTICAL_ROUTE &&
    before.optical.route.effective === HILL_PORTABLE_MACRO_DEBUG_OPTICAL_ROUTE &&
    before.optical.closure === 'debug_composition_only',
  'provider records the exact debug optical route without claiming beauty closure'
);
assert(
  before.support.mapping === 'explicit-world-position-buffer-v1' &&
    before.support.positionSource === 'terrain-fluid-frame.fields.worldPosition' &&
    before.support.worldPositionCount === previousBuffer.sampleCount * 3,
  'canonical source publishes complete explicit Hill world positions'
);
assert(before.output.primaryOutputWritten, 'provider reaches primary output');
assert(!before.output.partial && !before.output.blank, 'provider output is complete and nonblank');
assertHillPortableMacroOpticalProviderMountWitness(before);

const retainedHandleId = before.source.handleId;
runtime.remapTerrain(currentBuffer, {
  producerRevision: HILL_KAMINOS_PHASE_MORPH_RECIPE.producerRevision,
  deltaSeconds: HILL_KAMINOS_PHASE_MORPH_RECIPE.sourceIntervalSeconds,
  maximumBedDisplacement: HILL_KAMINOS_PHASE_MORPH_RECIPE.maximumBedDisplacement,
  maximumSupportSpeed: HILL_KAMINOS_PHASE_MORPH_RECIPE.maximumSupportSpeed
});
runtime.advance(2000);

const after = runtime.witness.portableOpticalProvider;
assert(after.sequenceStage === 'post_remap', 'provider records the post-remap stage');
assert(after.source.handleId === retainedHandleId, 'one source handle survives the Hill remap');
assert(
  after.source.readGeneration > before.source.readGeneration,
  'the retained source handle advances its read generation'
);
assert(
  after.epochs.terrain === currentBuffer.witness.terrainEpoch &&
    after.epochs.terrain === before.epochs.terrain + 1 &&
    after.epochs.fluid > before.epochs.fluid,
  'provider follows current terrain and fluid epochs'
);
assert(
  after.remap.status === 'committed' &&
    after.remap.previousTerrainEpoch === before.epochs.terrain &&
    after.remap.terrainEpoch === after.epochs.terrain,
  'provider preserves exact successor remap continuity'
);
assert(
  after.terrain.sampleChecksum === currentBuffer.sampleChecksum &&
    after.terrain.supportFrameChecksum === currentBuffer.witness.supportFrame.supportFrameChecksum,
  'provider preserves current Hill terrain and support identity'
);
assertHillPortableMacroOpticalProviderMountWitness(after);
const firstImpact = runtime.witness.firstImpact;
assert(firstImpact.status === 'hit', 'moving Hill publishes a first support intersection');
assert(
  firstImpact.route.requested === HILL_MOVING_SUPPORT_FIRST_IMPACT_CONTRACT.route &&
    firstImpact.route.effective === firstImpact.route.requested,
  'first-impact query records its exact requested/effective LERMS contract'
);
assert(
  firstImpact.epochs.terrain === after.epochs.terrain &&
    firstImpact.successor.status === 'remap_committed' &&
    firstImpact.successor.remapReceiptId === after.remap.receiptId,
  'first-impact identity preserves the current terrain epoch and remap continuity'
);
assert(
  firstImpact.terrain.transformId === after.terrain.transformId &&
    firstImpact.impact.normal.every(Number.isFinite),
  'first-impact identity preserves transform and finite support normal'
);
assertHillMovingSupportFirstImpact(firstImpact);
assertThrows(
  () => assertHillMovingSupportFirstImpact({
    ...firstImpact,
    epochs: {
      ...firstImpact.epochs,
      terrain: firstImpact.epochs.terrain + 1
    }
  }),
  'successor continuity',
  'first-impact rejects a stale successor receipt'
);

for (const [label, mutation, expected] of [
  [
    'package substitution',
    { package: { ...after.package, effective: { ...after.package.effective, version: '9.9.9' } } },
    'package'
  ],
  [
    'source fallback',
    {
      source: {
        ...after.source,
        route: { ...after.source.route, effective: 'fallback/portable-macro-source' }
      }
    },
    'source route'
  ],
  [
    'provider substitution',
    {
      provider: {
        ...after.provider,
        route: { ...after.provider.route, effective: 'fallback/portable-provider' }
      }
    },
    'provider route'
  ],
  [
    'host substitution',
    { host: { ...after.host, route: { ...after.host.route, effective: 'fallback/hill-host' } } },
    'host route'
  ],
  [
    'optical substitution',
    {
      optical: {
        ...after.optical,
        route: { ...after.optical.route, effective: 'fallback/optics' }
      }
    },
    'optical route'
  ],
  [
    'stale terrain epoch',
    { epochs: { ...after.epochs, terrain: after.epochs.terrain - 1 } },
    'terrain epoch'
  ],
  [
    'missing successor remap',
    { remap: { ...after.remap, status: 'pending', receiptId: null } },
    'remap'
  ],
  [
    'pre-output failure',
    { output: { ...after.output, primaryOutputWritten: false } },
    'primary output'
  ],
  [
    'partial output',
    { output: { ...after.output, partial: true } },
    'partial'
  ],
  [
    'blank output',
    { output: { ...after.output, blank: true } },
    'blank'
  ]
] as const) {
  const failure = assertThrows(
    () => assertHillPortableMacroOpticalProviderMountWitness({
      ...after,
      ...mutation
    } as typeof after),
    expected,
    `${label} fails before accepted optical output`
  );
  assert(
    (failure as Error & { report?: { schema?: string } }).report?.schema ===
      'lerms.hill-of-hills.portable-macro-optical-provider-failure.v1',
    `${label} publishes a structured mount failure report`
  );
}

assert(runtime.releasePortableMacroSource(), 'LERMS releases producer source custody explicitly');
assert(!runtime.releasePortableMacroSource(), 'producer release remains idempotent');
assertThrows(
  () => runtime.advance(2080),
  'released',
  'released source handles cannot publish later optical output'
);

console.log('watershed portable optical provider consumer contracts ok');
