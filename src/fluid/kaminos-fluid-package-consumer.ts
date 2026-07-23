export const KAMINOS_FLUID_PACKAGE_REQUEST_SCHEMA = 'lerms.kaminos-fluid-package-request.v0' as const;
export const KAMINOS_FLUID_PACKAGE_LOAD_REPORT_SCHEMA = 'lerms.kaminos-fluid-package-load-report.v0' as const;
export const KAMINOS_INSTALLED_PACKAGE_EVIDENCE_SCHEMA = 'lerms.kaminos-installed-package-evidence.v0' as const;

export type KaminosFluidPackageExecutionMode = 'live_hill' | 'contract_test';
export type KaminosFluidPackageSourceAuthority = 'live_runtime' | 'synthetic_fixture' | 'fallback' | 'default' | 'invalid';
export type KaminosFluidPackageFallbackStatus = 'none' | 'fallback' | 'default';
export type KaminosFluidPackageCacheStatus = 'fresh' | 'stale' | 'unknown';

export interface KaminosFluidPackagePin {
  packageName: string;
  packageVersion: string;
  importSpecifier: string;
  integrity: string;
  artifactRevision: string;
  runtimeRevision: string;
  cacheKey: string;
  descriptorSchema: string;
  descriptorExport: string;
  runtimeFactoryExport: string;
  runtimeRoute: string;
  representationRoute: string;
  outputRoute: string;
}

export interface KaminosFluidPackageRequest {
  schema: typeof KAMINOS_FLUID_PACKAGE_REQUEST_SCHEMA;
  executionMode: KaminosFluidPackageExecutionMode;
  requestedAtMs: number;
  requested: Readonly<KaminosFluidPackagePin>;
}

export interface KaminosFluidPackageDescriptor {
  schema: string;
  sourceAuthority: KaminosFluidPackageSourceAuthority;
  fallbackStatus: KaminosFluidPackageFallbackStatus;
  cacheStatus: KaminosFluidPackageCacheStatus;
  packageName: string;
  packageVersion: string;
  integrity: string;
  artifactRevision: string;
  runtimeRevision: string;
  cacheKey: string;
  runtimeRoute: string;
  representationRoutes: readonly string[];
  outputRoutes: readonly string[];
}

export interface KaminosInstalledPackageEvidence {
  schema: typeof KAMINOS_INSTALLED_PACKAGE_EVIDENCE_SCHEMA;
  source: 'package.json+package-lock.json';
  packageName: string;
  dependencySpecifier: string;
  packageVersion: string;
  integrity: string;
  resolved: string;
  lockfileVersion: number;
}

export interface PackageJsonEvidenceInput {
  dependencies?: Record<string, string>;
}

export interface PackageLockEvidenceInput {
  lockfileVersion?: number;
  packages?: Record<string, {
    version?: string;
    integrity?: string;
    resolved?: string;
    dependencies?: Record<string, string>;
  }>;
}

export interface KaminosFluidPackageLoadSuccess {
  schema: typeof KAMINOS_FLUID_PACKAGE_LOAD_REPORT_SCHEMA;
  ok: true;
  requested: Readonly<KaminosFluidPackagePin>;
  effective: KaminosFluidPackageDescriptor;
  runtimeFactory: (...args: never[]) => unknown;
  module: Record<string, unknown>;
  rejections: readonly [];
}

export interface KaminosFluidPackageLoadFailure {
  schema: typeof KAMINOS_FLUID_PACKAGE_LOAD_REPORT_SCHEMA;
  ok: false;
  failurePhase: 'package-installation' | 'package-import' | 'package-contract' | 'package-identity';
  reason: string;
  error: string;
  requested: Readonly<KaminosFluidPackagePin>;
  effective: KaminosFluidPackageDescriptor | null;
  primaryOutputWritten: false;
  partial: true;
  blank: true;
  rejections: readonly string[];
}

export type KaminosFluidPackageLoadResult = KaminosFluidPackageLoadSuccess | KaminosFluidPackageLoadFailure;
export type KaminosFluidPackageImporter = (specifier: string) => Promise<unknown>;

export interface HillFluidAdapterEvidence {
  frameId: string;
  terrain: {
    currentEpoch: number;
    supportFrameChecksum: string;
  };
  physicalScale: {
    metersPerWorldUnit: number;
  };
}

export interface KaminosFluidOutputEvidence {
  packageIdentity: KaminosFluidPackageDescriptor;
  runtime: {
    requestedRoute: string;
    effectiveRoute: string;
    requestedRevision: string;
    effectiveRevision: string;
  };
  representation: {
    requestedRoute: string;
    effectiveRoute: string;
  };
  terrain: {
    frameId: string;
    currentEpoch: number;
    supportFrameChecksum: string;
    metersPerWorldUnit: number;
  };
  output: {
    requestedRoute: string;
    effectiveRoute: string;
    primaryOutputWritten: boolean;
    partial: boolean;
    blank: boolean;
    dynamicFrameDelta: number;
  };
}

export function createKaminosFluidPackageRequest(
  pin: KaminosFluidPackagePin,
  options: {
    executionMode: KaminosFluidPackageExecutionMode;
    requestedAtMs: number;
  }
): KaminosFluidPackageRequest {
  if (!isExactPackageVersion(pin.packageVersion)) {
    throw new Error(`Kaminos fluid consumer requires an exact package version, received ${JSON.stringify(pin.packageVersion)}`);
  }
  requireNonempty(pin.packageName, 'package name');
  requireNonempty(pin.importSpecifier, 'import specifier');
  requireNonempty(pin.integrity, 'package integrity');
  requireRevision(pin.artifactRevision, 'artifact revision');
  requireRevision(pin.runtimeRevision, 'runtime revision');
  requireNonempty(pin.cacheKey, 'cache key');
  requireNonempty(pin.descriptorSchema, 'descriptor schema');
  requireNonempty(pin.descriptorExport, 'descriptor export');
  requireNonempty(pin.runtimeFactoryExport, 'runtime factory export');
  requireNonempty(pin.runtimeRoute, 'runtime route');
  requireNonempty(pin.representationRoute, 'representation route');
  requireNonempty(pin.outputRoute, 'output route');
  requireFinite(options.requestedAtMs, 'requestedAtMs');

  return {
    schema: KAMINOS_FLUID_PACKAGE_REQUEST_SCHEMA,
    executionMode: options.executionMode,
    requestedAtMs: options.requestedAtMs,
    requested: Object.freeze({ ...pin })
  };
}

export function validateKaminosFluidPackageDescriptor(
  request: KaminosFluidPackageRequest,
  descriptor: KaminosFluidPackageDescriptor
): string[] {
  const expected = request.requested;
  const rejections: string[] = [];

  rejectUnless(descriptor.schema === expected.descriptorSchema, 'reject-package-descriptor-schema', rejections);
  rejectUnless(descriptor.packageName === expected.packageName, 'reject-substituted-package', rejections);
  rejectUnless(descriptor.packageVersion === expected.packageVersion, 'reject-substituted-package-version', rejections);
  rejectUnless(descriptor.integrity === expected.integrity, 'reject-package-integrity-mismatch', rejections);
  rejectUnless(descriptor.artifactRevision === expected.artifactRevision, 'reject-artifact-revision-mismatch', rejections);
  rejectUnless(descriptor.runtimeRevision === expected.runtimeRevision, 'reject-runtime-revision-mismatch', rejections);
  rejectUnless(descriptor.cacheKey === expected.cacheKey, 'reject-package-cache-key-mismatch', rejections);
  rejectUnless(descriptor.runtimeRoute === expected.runtimeRoute, 'reject-runtime-route-mismatch', rejections);
  rejectUnless(descriptor.representationRoutes.includes(expected.representationRoute), 'reject-missing-representation-route', rejections);
  rejectUnless(descriptor.outputRoutes.includes(expected.outputRoute), 'reject-missing-output-route', rejections);

  if (descriptor.cacheStatus === 'stale') {
    rejections.push('reject-stale-cached-package');
  } else if (descriptor.cacheStatus !== 'fresh') {
    rejections.push('reject-unverified-package-cache');
  }
  if (descriptor.fallbackStatus === 'fallback') {
    rejections.push('reject-fallback-package-route');
  } else if (descriptor.fallbackStatus === 'default') {
    rejections.push('reject-default-package-route');
  }
  if (request.executionMode === 'live_hill' && descriptor.sourceAuthority !== 'live_runtime') {
    rejections.push('reject-non-live-package-authority');
  }
  if (descriptor.sourceAuthority === 'fallback' || descriptor.sourceAuthority === 'default' || descriptor.sourceAuthority === 'invalid') {
    rejections.push('reject-invalid-package-authority');
  }

  return unique(rejections);
}

export async function loadPinnedKaminosFluidPackage(
  request: KaminosFluidPackageRequest,
  importer: KaminosFluidPackageImporter = importInstalledPackage,
  installedEvidence?: KaminosInstalledPackageEvidence
): Promise<KaminosFluidPackageLoadResult> {
  if (request.executionMode === 'live_hill') {
    if (!installedEvidence) {
      return failure(request, {
        failurePhase: 'package-installation',
        reason: 'installed-package-evidence-missing',
        error: 'live Hill package load requires package.json and package-lock.json evidence',
        effective: null,
        rejections: ['reject-missing-installed-package-evidence']
      });
    }
    const installationRejections = validateInstalledKaminosPackageEvidence(request, installedEvidence);
    if (installationRejections.length > 0) {
      return failure(request, {
        failurePhase: 'package-installation',
        reason: 'installed-package-identity-rejected',
        error: installationRejections.join(', '),
        effective: null,
        rejections: installationRejections
      });
    }
  }

  let imported: unknown;
  try {
    imported = await importer(request.requested.importSpecifier);
  } catch (error) {
    return failure(request, {
      failurePhase: 'package-import',
      reason: 'package-unavailable',
      error: errorMessage(error),
      effective: null,
      rejections: ['package-unavailable']
    });
  }

  if (!isRecord(imported)) {
    return failure(request, {
      failurePhase: 'package-contract',
      reason: 'package-module-invalid',
      error: 'imported package module is not an object',
      effective: null,
      rejections: ['reject-invalid-package-module']
    });
  }

  const descriptorValue = imported[request.requested.descriptorExport];
  if (!isPackageDescriptor(descriptorValue)) {
    return failure(request, {
      failurePhase: 'package-contract',
      reason: 'package-descriptor-missing',
      error: `missing valid ${request.requested.descriptorExport} export`,
      effective: null,
      rejections: ['reject-missing-package-descriptor']
    });
  }

  const runtimeFactory = imported[request.requested.runtimeFactoryExport];
  if (typeof runtimeFactory !== 'function') {
    return failure(request, {
      failurePhase: 'package-contract',
      reason: 'runtime-factory-missing',
      error: `missing callable ${request.requested.runtimeFactoryExport} export`,
      effective: descriptorValue,
      rejections: ['reject-missing-runtime-factory']
    });
  }

  const rejections = validateKaminosFluidPackageDescriptor(request, descriptorValue);
  if (rejections.length > 0) {
    return failure(request, {
      failurePhase: 'package-identity',
      reason: 'package-identity-rejected',
      error: rejections.join(', '),
      effective: descriptorValue,
      rejections
    });
  }

  return {
    schema: KAMINOS_FLUID_PACKAGE_LOAD_REPORT_SCHEMA,
    ok: true,
    requested: request.requested,
    effective: descriptorValue,
    runtimeFactory: runtimeFactory as (...args: never[]) => unknown,
    module: imported,
    rejections: []
  };
}

export function createInstalledKaminosPackageEvidence(
  request: KaminosFluidPackageRequest,
  packageJson: PackageJsonEvidenceInput,
  packageLock: PackageLockEvidenceInput
): KaminosInstalledPackageEvidence {
  const packageName = request.requested.packageName;
  const dependencySpecifier = packageJson.dependencies?.[packageName];
  if (!dependencySpecifier) {
    throw new Error(`requested Kaminos package ${packageName} is not declared in package.json dependencies`);
  }
  if (dependencySpecifier !== request.requested.packageVersion) {
    throw new Error(`package.json dependency for ${packageName} is not the exact requested version`);
  }

  const rootDependencySpecifier = packageLock.packages?.['']?.dependencies?.[packageName];
  if (rootDependencySpecifier !== dependencySpecifier) {
    throw new Error(`package-lock root dependency for ${packageName} does not match package.json`);
  }
  const lockEntry = packageLock.packages?.[`node_modules/${packageName}`];
  if (!lockEntry) {
    throw new Error(`requested Kaminos package ${packageName} is absent from package-lock.json`);
  }
  if (!Number.isInteger(packageLock.lockfileVersion) || (packageLock.lockfileVersion ?? 0) <= 0) {
    throw new Error('package-lock.json has no valid lockfileVersion');
  }
  if (lockEntry.version !== request.requested.packageVersion) {
    throw new Error(`installed Kaminos package ${packageName} version does not match the exact request`);
  }
  if (lockEntry.integrity !== request.requested.integrity) {
    throw new Error(`installed Kaminos package ${packageName} integrity does not match the exact request`);
  }
  if (!lockEntry.resolved) {
    throw new Error(`installed Kaminos package ${packageName} has no resolved artifact identity`);
  }

  return {
    schema: KAMINOS_INSTALLED_PACKAGE_EVIDENCE_SCHEMA,
    source: 'package.json+package-lock.json',
    packageName,
    dependencySpecifier,
    packageVersion: lockEntry.version,
    integrity: lockEntry.integrity,
    resolved: lockEntry.resolved,
    lockfileVersion: packageLock.lockfileVersion as number
  };
}

export function validateInstalledKaminosPackageEvidence(
  request: KaminosFluidPackageRequest,
  evidence: KaminosInstalledPackageEvidence
): string[] {
  const expected = request.requested;
  const rejections: string[] = [];
  rejectUnless(evidence.schema === KAMINOS_INSTALLED_PACKAGE_EVIDENCE_SCHEMA, 'reject-installed-evidence-schema', rejections);
  rejectUnless(evidence.source === 'package.json+package-lock.json', 'reject-installed-evidence-source', rejections);
  rejectUnless(evidence.packageName === expected.packageName, 'reject-installed-package-substitution', rejections);
  rejectUnless(evidence.dependencySpecifier === expected.packageVersion, 'reject-installed-dependency-specifier', rejections);
  rejectUnless(evidence.packageVersion === expected.packageVersion, 'reject-installed-package-version', rejections);
  rejectUnless(evidence.integrity === expected.integrity, 'reject-installed-package-integrity', rejections);
  rejectUnless(evidence.resolved.trim().length > 0, 'reject-installed-package-unresolved', rejections);
  rejectUnless(Number.isInteger(evidence.lockfileVersion) && evidence.lockfileVersion > 0, 'reject-installed-lockfile-version', rejections);
  return unique(rejections);
}

export function validateKaminosFluidOutputEvidence(
  request: KaminosFluidPackageRequest,
  adapterFrame: HillFluidAdapterEvidence,
  evidence: KaminosFluidOutputEvidence
): string[] {
  const expected = request.requested;
  const rejections = validateKaminosFluidPackageDescriptor(request, evidence.packageIdentity);

  rejectUnless(evidence.runtime.requestedRoute === expected.runtimeRoute, 'reject-requested-runtime-route-loss', rejections);
  rejectUnless(evidence.runtime.effectiveRoute === expected.runtimeRoute, 'reject-runtime-substitution', rejections);
  rejectUnless(evidence.runtime.requestedRevision === expected.runtimeRevision, 'reject-requested-runtime-revision-loss', rejections);
  rejectUnless(evidence.runtime.effectiveRevision === expected.runtimeRevision, 'reject-effective-runtime-revision-mismatch', rejections);
  rejectUnless(evidence.representation.requestedRoute === expected.representationRoute, 'reject-requested-representation-loss', rejections);
  rejectUnless(evidence.representation.effectiveRoute === expected.representationRoute, 'reject-representation-substitution', rejections);
  rejectUnless(evidence.terrain.frameId === adapterFrame.frameId, 'reject-terrain-frame-substitution', rejections);
  rejectUnless(evidence.terrain.currentEpoch === adapterFrame.terrain.currentEpoch, 'reject-stale-terrain-epoch', rejections);
  rejectUnless(evidence.terrain.supportFrameChecksum === adapterFrame.terrain.supportFrameChecksum, 'reject-support-frame-substitution', rejections);
  rejectUnless(
    nearlyEqual(evidence.terrain.metersPerWorldUnit, adapterFrame.physicalScale.metersPerWorldUnit),
    'reject-physical-scale-substitution',
    rejections
  );
  rejectUnless(evidence.output.requestedRoute === expected.outputRoute, 'reject-requested-output-route-loss', rejections);
  rejectUnless(evidence.output.effectiveRoute === expected.outputRoute, 'reject-output-substitution', rejections);
  rejectUnless(evidence.output.primaryOutputWritten, 'reject-pre-output-failure', rejections);
  rejectUnless(!evidence.output.partial, 'reject-partial-output', rejections);
  rejectUnless(!evidence.output.blank, 'reject-blank-output', rejections);
  rejectUnless(Number.isFinite(evidence.output.dynamicFrameDelta) && evidence.output.dynamicFrameDelta > 0, 'reject-motionless-output', rejections);

  return unique(rejections);
}

async function importInstalledPackage(specifier: string): Promise<unknown> {
  return import(/* @vite-ignore */ specifier);
}

function failure(
  request: KaminosFluidPackageRequest,
  details: Pick<KaminosFluidPackageLoadFailure, 'failurePhase' | 'reason' | 'error' | 'effective' | 'rejections'>
): KaminosFluidPackageLoadFailure {
  return {
    schema: KAMINOS_FLUID_PACKAGE_LOAD_REPORT_SCHEMA,
    ok: false,
    ...details,
    requested: request.requested,
    primaryOutputWritten: false,
    partial: true,
    blank: true
  };
}

function isExactPackageVersion(version: string): boolean {
  return /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(version);
}

function isPackageDescriptor(value: unknown): value is KaminosFluidPackageDescriptor {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.schema === 'string' &&
    isOneOf(value.sourceAuthority, ['live_runtime', 'synthetic_fixture', 'fallback', 'default', 'invalid']) &&
    isOneOf(value.fallbackStatus, ['none', 'fallback', 'default']) &&
    isOneOf(value.cacheStatus, ['fresh', 'stale', 'unknown']) &&
    typeof value.packageName === 'string' &&
    typeof value.packageVersion === 'string' &&
    typeof value.integrity === 'string' &&
    typeof value.artifactRevision === 'string' &&
    typeof value.runtimeRevision === 'string' &&
    typeof value.cacheKey === 'string' &&
    typeof value.runtimeRoute === 'string' &&
    Array.isArray(value.representationRoutes) &&
    value.representationRoutes.every((entry) => typeof entry === 'string') &&
    Array.isArray(value.outputRoutes) &&
    value.outputRoutes.every((entry) => typeof entry === 'string')
  );
}

function isOneOf<const TValue extends string>(value: unknown, choices: readonly TValue[]): value is TValue {
  return typeof value === 'string' && choices.includes(value as TValue);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function rejectUnless(condition: boolean, rejection: string, rejections: string[]): void {
  if (!condition) {
    rejections.push(rejection);
  }
}

function nearlyEqual(left: number, right: number): boolean {
  return Number.isFinite(left) && Number.isFinite(right) && Math.abs(left - right) <= 1e-9;
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function requireNonempty(value: string, label: string): void {
  if (value.trim().length === 0) {
    throw new Error(`Kaminos fluid consumer requires ${label}`);
  }
}

function requireRevision(value: string, label: string): void {
  if (!/^[0-9a-f]{40,64}$/.test(value)) {
    throw new Error(`Kaminos fluid consumer requires an exact ${label}`);
  }
}

function requireFinite(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new Error(`Kaminos fluid consumer requires finite ${label}`);
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
