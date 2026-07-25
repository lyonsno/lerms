export const FULL_FLUID_HILL_SMOKE_SCHEMA = 'lerms.full-fluid-hill-smoke.v0' as const;
export const FULL_FLUID_HILL_SMOKE_FAILURE_SCHEMA = 'lerms.full-fluid-hill-smoke-failure.v0' as const;

const MATCHED_MODE = 'matched_particle_hybrid_ab' as const;
const PARTICLE_ONLY_MODE = 'particle_only' as const;
const HYBRID_MODE = 'hybrid_analytic_carrier' as const;
const GPU_COUNT_AUTHORITY = 'gpu_diagnostics_readback' as const;

const REQUIRED_FALSE_CLOSURE_PROBES = Object.freeze([
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
] as const);

export interface FullFluidHillSmokeExpectedIdentity {
  lermsRevision: string;
  kaminosRevision: string;
  hillSupportRevision: string;
  hillSupportArtifactSha256: string;
  liveHandRoute: string;
  handAuthority: string;
  hillSupportRoute: string;
  macroRendererRoute: string;
  carrierRoute: string;
  particleRendererRoute: string;
  ownershipRoute: string;
}

interface FullFluidHillSmokeRouteIdentity extends FullFluidHillSmokeExpectedIdentity {
  mode: typeof MATCHED_MODE;
  juice: number;
}

interface FullFluidHillSmokeEffectiveIdentity extends FullFluidHillSmokeRouteIdentity {
  fallbackRoute: null;
  defaultSubstitution: false;
}

interface Distribution {
  sampleCount: number;
  p50: number;
  p95: number;
  p99: number;
}

interface Capture {
  mode: typeof PARTICLE_ONLY_MODE | typeof HYBRID_MODE;
  sourcePacketId: string;
  sourceGeneration: number;
  terrainEpoch: number;
  supportEpoch: number;
  topologyEpoch: number;
  remapEpoch: number;
  supportStale: false;
  supportFallbackRoute: null;
  handStale: false;
  handFallbackRoute: null;
  frame: {
    frameId: string;
    cameraId: string;
    sceneColorFrameId: string;
    sceneDepthFrameId: string;
    targetFrameId: string;
    width: number;
    height: number;
  };
  population: {
    allocatedCount: number;
    activeCount: number;
    dormantCount: number;
    countAuthority: typeof GPU_COUNT_AUTHORITY;
  };
  transition: {
    count: number;
    exclusiveOwnership: true;
    transferredVolume: number;
    introducedVolume: number;
    volumeResidual: number;
    volumeTolerance: number;
    momentumResidual: number;
    momentumTolerance: number;
  };
  carrier: {
    activeSegments: number;
    drawCount: number;
    suppressionRoute: string | null;
  };
  macro: {
    drawCount: number;
    wetTriangleCount: number;
  };
  output: {
    primaryOutputWritten: true;
    partial: false;
    blank: false;
    observedPixelCount: number;
    liquidPixelCount: number;
    imageSha256: string;
  };
  timing: {
    totalFrameMs: Distribution;
    simulationMs: Distribution;
    particleRenderMs: Distribution;
    carrierRenderMs: Distribution;
    macroRenderMs: Distribution;
  };
}

export interface FullFluidHillSmokeReport {
  schema: typeof FULL_FLUID_HILL_SMOKE_SCHEMA;
  ok: true;
  authority: 'live_observed_primary_output';
  requested: FullFluidHillSmokeRouteIdentity;
  effective: FullFluidHillSmokeEffectiveIdentity;
  comparison: {
    sameState: true;
    particleOnly: Capture & { mode: typeof PARTICLE_ONLY_MODE };
    hybrid: Capture & { mode: typeof HYBRID_MODE };
    visualDelta: {
      changedPixels: number;
      changedRatio: number;
      meanAbsoluteChannelDelta: number;
    };
  };
  falseClosureProbes: string[];
}

export interface FullFluidHillSmokeFailureReport {
  schema: typeof FULL_FLUID_HILL_SMOKE_FAILURE_SCHEMA;
  ok: false;
  primaryOutputWritten: false;
  failurePhase: string;
  lastTrustworthyEvidence: string;
  requested: unknown;
  error: string;
  reportPath: string;
}

function fail(message: string): never {
  throw new Error(`Invalid full-fluid Hill smoke report: ${message}`);
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${label} is missing or malformed`);
  return value as Record<string, unknown>;
}

function requiredString(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim() === '') fail(`${label} is missing`);
  return value;
}

function finite(value: unknown, label: string, minimum = 0): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum) {
    fail(`${label} must be finite and at least ${minimum}`);
  }
  return value;
}

function safeInteger(value: unknown, label: string, minimum = 0): number {
  const number = finite(value, label, minimum);
  if (!Number.isSafeInteger(number)) fail(`${label} must be a safe integer`);
  return number;
}

function exactSha(value: unknown, length: 40 | 64, label: string): string {
  const string = requiredString(value, label);
  if (!new RegExp(`^[a-f0-9]{${length}}$`).test(string)) fail(`${label} must be an exact ${length}-hex digest`);
  return string;
}

function validateExpectedIdentity(expected: FullFluidHillSmokeExpectedIdentity): void {
  exactSha(expected.lermsRevision, 40, 'expected LERMS revision');
  exactSha(expected.kaminosRevision, 40, 'expected Kaminos revision');
  exactSha(expected.hillSupportRevision, 40, 'expected Hill support revision');
  exactSha(expected.hillSupportArtifactSha256, 64, 'expected Hill support artifact SHA-256');
  for (const [key, value] of Object.entries(expected)) {
    if (!key.endsWith('Revision') && key !== 'hillSupportArtifactSha256') {
      requiredString(value, `expected ${key}`);
    }
  }
}

function validateIdentity(
  value: unknown,
  expected: FullFluidHillSmokeExpectedIdentity,
  label: 'requested' | 'effective',
): Record<string, unknown> {
  const identity = record(value, `${label} identity`);
  for (const [key, expectedValue] of Object.entries(expected)) {
    const actual = identity[key];
    if (actual !== expectedValue) {
      const readable = key === 'kaminosRevision' ? 'Kaminos revision' : key;
      fail(`${label} ${readable} does not match the expected source identity`);
    }
  }
  if (identity.mode !== MATCHED_MODE) fail(`${label} comparison mode is unsupported or defaulted`);
  const juice = finite(identity.juice, `${label} Juice`, 0);
  if (juice > 100) fail(`${label} Juice exceeds the product control range`);
  return identity;
}

function validateFrame(value: unknown, label: string): Capture['frame'] {
  const frame = record(value, `${label} frame`);
  const frameId = requiredString(frame.frameId, `${label} frame id`);
  requiredString(frame.cameraId, `${label} camera id`);
  for (const attachment of ['sceneColorFrameId', 'sceneDepthFrameId', 'targetFrameId'] as const) {
    if (frame[attachment] !== frameId) fail(`${label} frame attachments do not share the primary frame`);
  }
  safeInteger(frame.width, `${label} width`, 1);
  safeInteger(frame.height, `${label} height`, 1);
  return frame as unknown as Capture['frame'];
}

function validatePopulation(value: unknown, label: string): void {
  const population = record(value, `${label} population`);
  if (population.countAuthority !== GPU_COUNT_AUTHORITY) {
    fail(`${label} GPU population counts are missing or inferred from allocation`);
  }
  const allocated = safeInteger(population.allocatedCount, `${label} allocated population`);
  const active = safeInteger(population.activeCount, `${label} active population`);
  const dormant = safeInteger(population.dormantCount, `${label} dormant population`);
  if (active + dormant !== allocated) fail(`${label} population accounting does not close`);
}

function validateTransition(value: unknown, label: string): void {
  const transition = record(value, `${label} transition`);
  safeInteger(transition.count, `${label} transition count`);
  if (transition.exclusiveOwnership !== true) fail(`${label} exclusive ownership is not proven`);
  const transferredVolume = finite(transition.transferredVolume, `${label} transferred volume`);
  const introducedVolume = finite(transition.introducedVolume, `${label} introduced volume`);
  const volumeResidual = finite(transition.volumeResidual, `${label} volume residual`);
  const volumeTolerance = finite(transition.volumeTolerance, `${label} volume tolerance`);
  const momentumResidual = finite(transition.momentumResidual, `${label} momentum residual`);
  const momentumTolerance = finite(transition.momentumTolerance, `${label} momentum tolerance`);
  if (
    Math.abs(transferredVolume - introducedVolume) > volumeTolerance
    || volumeResidual > volumeTolerance
  ) {
    fail(`${label} volume conservation exceeds tolerance`);
  }
  if (momentumResidual > momentumTolerance) fail(`${label} momentum conservation exceeds tolerance`);
}

function validateOutput(value: unknown, label: string): void {
  const output = record(value, `${label} output`);
  if (output.primaryOutputWritten !== true) fail(`${label} primary output is missing`);
  if (output.partial !== false) fail(`${label} output is partial`);
  if (output.blank !== false) fail(`${label} output is blank`);
  const observedPixels = safeInteger(output.observedPixelCount, `${label} observed pixels`, 1);
  const liquidPixels = safeInteger(output.liquidPixelCount, `${label} liquid pixels`, 1);
  if (liquidPixels > observedPixels) fail(`${label} liquid pixel count exceeds observed output`);
  exactSha(output.imageSha256, 64, `${label} image SHA-256`);
}

function validateDistribution(value: unknown, label: string): void {
  const distribution = record(value, `${label} timing`);
  safeInteger(distribution.sampleCount, `${label} timing sample count`, 1);
  const p50 = finite(distribution.p50, `${label} timing p50`);
  const p95 = finite(distribution.p95, `${label} timing p95`);
  const p99 = finite(distribution.p99, `${label} timing p99`);
  if (p50 > p95 || p95 > p99) fail(`${label} timing percentiles are not monotonic`);
}

function validateCapture(
  value: unknown,
  expectedMode: typeof PARTICLE_ONLY_MODE | typeof HYBRID_MODE,
): Capture {
  const capture = record(value, `${expectedMode} capture`);
  if (capture.mode !== expectedMode) fail(`${expectedMode} capture mode was substituted`);
  requiredString(capture.sourcePacketId, `${expectedMode} source packet id`);
  safeInteger(capture.sourceGeneration, `${expectedMode} source generation`, 1);
  for (const epoch of ['terrainEpoch', 'supportEpoch', 'topologyEpoch', 'remapEpoch'] as const) {
    safeInteger(capture[epoch], `${expectedMode} ${epoch}`);
  }
  if (capture.supportStale !== false) fail(`${expectedMode} uses stale support`);
  if (capture.supportFallbackRoute !== null) fail(`${expectedMode} uses a support fallback route`);
  if (capture.handStale !== false) fail(`${expectedMode} uses stale hand authority`);
  if (capture.handFallbackRoute !== null) fail(`${expectedMode} uses a hand fallback route`);
  validateFrame(capture.frame, expectedMode);
  validatePopulation(capture.population, expectedMode);
  validateTransition(capture.transition, expectedMode);
  validateOutput(capture.output, expectedMode);

  const carrier = record(capture.carrier, `${expectedMode} carrier`);
  const activeSegments = safeInteger(carrier.activeSegments, `${expectedMode} carrier segments`);
  const carrierDraws = safeInteger(carrier.drawCount, `${expectedMode} carrier draws`);
  if (expectedMode === PARTICLE_ONLY_MODE) {
    if (activeSegments !== 0 || carrierDraws !== 0 || carrier.suppressionRoute !== null) {
      fail('particle-only control contains analytic carrier contamination');
    }
  } else {
    if (activeSegments < 1 || carrierDraws < 1) fail('hybrid carrier output is blank');
    requiredString(carrier.suppressionRoute, 'hybrid carrier suppression route');
  }

  const macro = record(capture.macro, `${expectedMode} macro renderer`);
  safeInteger(macro.drawCount, `${expectedMode} macro draw count`, 1);
  safeInteger(macro.wetTriangleCount, `${expectedMode} macro wet triangle count`, 1);

  const timing = record(capture.timing, `${expectedMode} timing`);
  for (const key of [
    'totalFrameMs',
    'simulationMs',
    'particleRenderMs',
    'carrierRenderMs',
    'macroRenderMs',
  ] as const) {
    validateDistribution(timing[key], `${expectedMode} ${key}`);
  }
  return capture as unknown as Capture;
}

function stableCaptureState(capture: Capture): string {
  return JSON.stringify({
    sourcePacketId: capture.sourcePacketId,
    sourceGeneration: capture.sourceGeneration,
    terrainEpoch: capture.terrainEpoch,
    supportEpoch: capture.supportEpoch,
    topologyEpoch: capture.topologyEpoch,
    remapEpoch: capture.remapEpoch,
    frame: capture.frame,
    allocatedCount: capture.population.allocatedCount,
    macro: capture.macro,
  });
}

export function validateFullFluidHillSmokeReport(
  value: unknown,
  expected: FullFluidHillSmokeExpectedIdentity,
): FullFluidHillSmokeReport {
  validateExpectedIdentity(expected);
  const report = record(value, 'report');
  if (report.schema !== FULL_FLUID_HILL_SMOKE_SCHEMA) fail('schema is missing or unsupported');
  if (report.ok !== true || report.authority !== 'live_observed_primary_output') {
    fail('success authority requires live observed primary output');
  }
  const requested = validateIdentity(report.requested, expected, 'requested');
  const effective = validateIdentity(report.effective, expected, 'effective');
  if (requested.juice !== effective.juice) fail('requested Juice was silently substituted');
  if (effective.fallbackRoute !== null) fail('effective route contains a fallback');
  if (effective.defaultSubstitution !== false) fail('effective route contains default substitution');

  const comparison = record(report.comparison, 'comparison');
  if (comparison.sameState !== true) fail('particle-only and hybrid captures are not same-state');
  const particleOnly = validateCapture(comparison.particleOnly, PARTICLE_ONLY_MODE);
  const hybrid = validateCapture(comparison.hybrid, HYBRID_MODE);
  if (stableCaptureState(particleOnly) !== stableCaptureState(hybrid)) {
    fail('particle-only and hybrid captures do not share exact source, Hill, frame, allocation, and macro state');
  }

  const visualDelta = record(comparison.visualDelta, 'comparison visual delta');
  safeInteger(visualDelta.changedPixels, 'changed pixels', 1);
  const changedRatio = finite(visualDelta.changedRatio, 'changed ratio', Number.MIN_VALUE);
  if (changedRatio > 1) fail('changed ratio exceeds the observed frame');
  finite(visualDelta.meanAbsoluteChannelDelta, 'mean absolute channel delta', Number.MIN_VALUE);

  if (!Array.isArray(report.falseClosureProbes)) fail('false-closure probes are missing');
  const probes = new Set(report.falseClosureProbes);
  const missingProbes = REQUIRED_FALSE_CLOSURE_PROBES.filter(probe => !probes.has(probe));
  if (missingProbes.length > 0) fail(`false-closure probes are incomplete: ${missingProbes.join(', ')}`);

  return report as unknown as FullFluidHillSmokeReport;
}

export function createFullFluidHillSmokeFailureReport({
  failurePhase,
  lastTrustworthyEvidence,
  requested,
  error,
  reportPath,
}: {
  failurePhase: string;
  lastTrustworthyEvidence: string;
  requested: unknown;
  error: unknown;
  reportPath: string;
}): FullFluidHillSmokeFailureReport {
  const phase = requiredString(failurePhase, 'failure phase');
  const lastEvidence = requiredString(lastTrustworthyEvidence, 'last trustworthy evidence');
  const path = requiredString(reportPath, 'report path');
  if (!requested || typeof requested !== 'object') fail('failure report requested identity is missing');
  const message = error instanceof Error ? error.message : String(error);
  requiredString(message, 'failure error');
  return {
    schema: FULL_FLUID_HILL_SMOKE_FAILURE_SCHEMA,
    ok: false,
    primaryOutputWritten: false,
    failurePhase: phase,
    lastTrustworthyEvidence: lastEvidence,
    requested,
    error: message,
    reportPath: path,
  };
}
