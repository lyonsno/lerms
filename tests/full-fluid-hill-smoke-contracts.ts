import {
  FULL_FLUID_HILL_SMOKE_SCHEMA,
  createFullFluidHillSmokeFailureReport,
  validateFullFluidHillSmokeReport,
  type FullFluidHillSmokeExpectedIdentity,
} from '../src/fluid/full-fluid-hill-smoke-contract.js';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertThrows(fn: () => void, expectedMessage: RegExp): void {
  try {
    fn();
  } catch (error) {
    assert(error instanceof Error, 'expected an Error');
    assert(
      expectedMessage.test(error.message),
      `expected "${error.message}" to match ${expectedMessage}`,
    );
    return;
  }
  throw new Error(`expected function to throw ${expectedMessage}`);
}

const sha40 = (character: string) => character.repeat(40);
const sha64 = (character: string) => character.repeat(64);

const expected: FullFluidHillSmokeExpectedIdentity = {
  lermsRevision: sha40('a'),
  kaminosRevision: sha40('b'),
  hillSupportRevision: sha40('c'),
  hillSupportArtifactSha256: sha64('d'),
  liveHandRoute: 'lerms/live-hand/native-v0',
  handAuthority: 'native_wilor_mini_mlx_detector_sidecar_live',
  hillSupportRoute: 'lerms/hill-of-hills/analytic-impact-support-v1',
  macroRendererRoute: 'kaminos/finger-fluid/portable-macro-screen-space-optics-v0',
  carrierRoute: 'kaminos.finger-fluid.analytic-ballistic-carrier.v0',
  particleRendererRoute: 'webgpu-screen-space-liquid-surface-v0',
  ownershipRoute: 'exclusive-material-interval-carrier-to-particles-v0',
};

const timing = (p50: number, p95: number, p99: number) => ({
  sampleCount: 120,
  p50,
  p95,
  p99,
});

const frame = {
  frameId: 'hill-frame-81',
  cameraId: 'hill-camera-live',
  sceneColorFrameId: 'hill-frame-81',
  sceneDepthFrameId: 'hill-frame-81',
  targetFrameId: 'hill-frame-81',
  width: 1420,
  height: 1120,
};

const population = {
  allocatedCount: 2400,
  activeCount: 481,
  dormantCount: 1919,
  countAuthority: 'gpu_diagnostics_readback',
};

const baseCapture = {
  sourcePacketId: 'finger-packet-81',
  sourceGeneration: 8,
  terrainEpoch: 1,
  supportEpoch: 1,
  topologyEpoch: 1,
  remapEpoch: 1,
  supportStale: false,
  supportFallbackRoute: null,
  handStale: false,
  handFallbackRoute: null,
  frame,
  population,
  transition: {
    count: 5,
    exclusiveOwnership: true,
    transferredVolume: 0.025,
    introducedVolume: 0.025,
    volumeResidual: 0,
    volumeTolerance: 1e-9,
    momentumResidual: 2e-10,
    momentumTolerance: 1e-8,
  },
  output: {
    primaryOutputWritten: true,
    partial: false,
    blank: false,
    observedPixelCount: 1_590_400,
    liquidPixelCount: 34_000,
    imageSha256: sha64('e'),
  },
  timing: {
    totalFrameMs: timing(8.1, 11.4, 13.2),
    simulationMs: timing(1.1, 1.8, 2.1),
    particleRenderMs: timing(1.4, 2.2, 2.8),
    carrierRenderMs: timing(0.2, 0.4, 0.5),
    macroRenderMs: timing(0.7, 1.1, 1.4),
  },
};

const report = {
  schema: FULL_FLUID_HILL_SMOKE_SCHEMA,
  ok: true,
  authority: 'live_observed_primary_output',
  requested: {
    ...expected,
    mode: 'matched_particle_hybrid_ab',
    juice: 80,
  },
  effective: {
    ...expected,
    mode: 'matched_particle_hybrid_ab',
    juice: 80,
    fallbackRoute: null,
    defaultSubstitution: false,
  },
  comparison: {
    sameState: true,
    particleOnly: {
      ...baseCapture,
      mode: 'particle_only',
      carrier: {
        activeSegments: 0,
        drawCount: 0,
        suppressionRoute: null,
      },
      macro: {
        drawCount: 1,
        wetTriangleCount: 9034,
      },
    },
    hybrid: {
      ...baseCapture,
      mode: 'hybrid_analytic_carrier',
      carrier: {
        activeSegments: 79,
        drawCount: 1,
        suppressionRoute: 'matching-source-pre-impact-age-exclusive-visibility-v0',
      },
      macro: {
        drawCount: 1,
        wetTriangleCount: 9034,
      },
    },
    visualDelta: {
      changedPixels: 5833,
      changedRatio: 0.003668,
      meanAbsoluteChannelDelta: 0.210253,
    },
  },
  falseClosureProbes: [
    'wrong_renderer_rejected',
    'fallback_route_rejected',
    'stale_support_rejected',
    'default_substitution_rejected',
    'inferred_population_rejected',
    'blank_output_rejected',
    'partial_output_rejected',
    'mixed_frame_attachments_rejected',
    'duplicate_material_ownership_rejected',
    'conservation_failure_rejected',
    'pre_output_failure_reported',
  ],
};

const validated = validateFullFluidHillSmokeReport(report, expected);
assert(validated.schema === FULL_FLUID_HILL_SMOKE_SCHEMA, 'accepts exact full-fluid Hill evidence');
assert(validated.comparison.hybrid.carrier.activeSegments === 79, 'preserves active carrier segments');
assert(validated.comparison.hybrid.population.activeCount === 481, 'preserves direct GPU active count');

function mutated(mutator: (value: any) => void): unknown {
  const value = structuredClone(report);
  mutator(value);
  return value;
}

assertThrows(
  () => validateFullFluidHillSmokeReport(
    mutated(value => { value.effective.kaminosRevision = sha40('f'); }),
    expected,
  ),
  /Kaminos revision/i,
);
assertThrows(
  () => validateFullFluidHillSmokeReport(
    mutated(value => { value.effective.fallbackRoute = 'fallback-particles'; }),
    expected,
  ),
  /fallback/i,
);
assertThrows(
  () => validateFullFluidHillSmokeReport(
    mutated(value => { value.effective.defaultSubstitution = true; }),
    expected,
  ),
  /default substitution/i,
);
assertThrows(
  () => validateFullFluidHillSmokeReport(
    mutated(value => { value.comparison.hybrid.supportStale = true; }),
    expected,
  ),
  /stale support/i,
);
assertThrows(
  () => validateFullFluidHillSmokeReport(
    mutated(value => { value.comparison.hybrid.handFallbackRoute = 'fixture-hand'; }),
    expected,
  ),
  /hand fallback/i,
);
assertThrows(
  () => validateFullFluidHillSmokeReport(
    mutated(value => {
      value.comparison.hybrid.population.countAuthority = 'inferred_from_allocation';
    }),
    expected,
  ),
  /GPU population/i,
);
assertThrows(
  () => validateFullFluidHillSmokeReport(
    mutated(value => { value.comparison.hybrid.population.activeCount = 2400; }),
    expected,
  ),
  /population accounting/i,
);
assertThrows(
  () => validateFullFluidHillSmokeReport(
    mutated(value => { value.comparison.hybrid.output.blank = true; }),
    expected,
  ),
  /blank/i,
);
assertThrows(
  () => validateFullFluidHillSmokeReport(
    mutated(value => { value.comparison.particleOnly.output.partial = true; }),
    expected,
  ),
  /partial/i,
);
assertThrows(
  () => validateFullFluidHillSmokeReport(
    mutated(value => {
      value.comparison.hybrid.frame.sceneDepthFrameId = 'stale-depth-frame';
    }),
    expected,
  ),
  /frame attachments/i,
);
assertThrows(
  () => validateFullFluidHillSmokeReport(
    mutated(value => { value.comparison.particleOnly.carrier.drawCount = 1; }),
    expected,
  ),
  /particle-only.*carrier/i,
);
assertThrows(
  () => validateFullFluidHillSmokeReport(
    mutated(value => { value.comparison.hybrid.transition.exclusiveOwnership = false; }),
    expected,
  ),
  /exclusive ownership/i,
);
assertThrows(
  () => validateFullFluidHillSmokeReport(
    mutated(value => { value.comparison.hybrid.transition.volumeResidual = 0.01; }),
    expected,
  ),
  /volume conservation/i,
);
assertThrows(
  () => validateFullFluidHillSmokeReport(
    mutated(value => { value.comparison.hybrid.timing.macroRenderMs.p95 = Number.NaN; }),
    expected,
  ),
  /timing/i,
);
assertThrows(
  () => validateFullFluidHillSmokeReport(
    mutated(value => { value.falseClosureProbes = ['blank_output_rejected']; }),
    expected,
  ),
  /false-closure probes/i,
);

const failure = createFullFluidHillSmokeFailureReport({
  failurePhase: 'renderer_submission',
  lastTrustworthyEvidence: 'exact_routes_admitted',
  requested: report.requested,
  error: new Error('device lost before output'),
  reportPath: '/tmp/full-fluid-hill-failure.json',
});
assert(failure.ok === false, 'pre-output failure report cannot look successful');
assert(failure.primaryOutputWritten === false, 'pre-output failure cannot claim primary output');
assert(failure.failurePhase === 'renderer_submission', 'failure report preserves failure phase');
assert(failure.lastTrustworthyEvidence === 'exact_routes_admitted', 'failure report preserves last evidence');
assert(failure.reportPath === '/tmp/full-fluid-hill-failure.json', 'failure report preserves durable path');

assertThrows(
  () => createFullFluidHillSmokeFailureReport({
    failurePhase: '',
    lastTrustworthyEvidence: '',
    requested: report.requested,
    error: new Error('missing phase'),
    reportPath: '',
  }),
  /failure phase|last trustworthy|report path/i,
);

console.log('full-fluid Hill smoke contracts passed');
