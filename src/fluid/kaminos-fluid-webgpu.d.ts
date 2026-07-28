declare module '@kaminos/fluid-webgpu' {
  export const KAMINOS_FLUID_PACKAGE_DESCRIPTOR: unknown;
  export function createKaminosFluidRuntime(options: unknown): unknown;
}

declare module 'kaminos/finger-fluid-webgpu-core.js' {
  export const KAMINOS_FINGER_FLUID_MOVING_HILL_SUPPORT_CONTACT_ROUTE: string;
  export const KAMINOS_FINGER_FLUID_PORTABLE_MACRO_PROVIDER_SCHEMA: string;
  export const KAMINOS_FINGER_FLUID_PORTABLE_MACRO_PROVIDER_ROUTE: string;
  export interface FingerFluidMovingHillSupportContactProvider {
    readonly device: object;
    readonly queue: object;
    readonly route: string;
    readonly owner: string;
    readonly sourceId: string;
    readonly terrainId: string;
    readonly terrainEpoch: number;
    readonly supportEpoch: number;
    readonly remapEpoch: number;
    readonly stale: false;
    readonly fallbackRoute: null;
    readonly execution: string;
    readonly visibilityAuthority: string;
    readonly hostReadbackVisibility: false;
    update(options: { terrainFrame: unknown; identity: unknown }): FingerFluidMovingHillSupportContactProvider;
    release(): void;
  }
  export interface FingerFluidSolver {
    getParticleOwnershipDescriptor(): unknown;
    requestDiagnostics(): Promise<unknown>;
  }
  export function createFingerFluidMovingHillSupportContactProvider(options: {
    device: object;
    terrainFrame: unknown;
    identity: unknown;
  }): FingerFluidMovingHillSupportContactProvider;
  export function createFingerFluidPortableMacroGeometryProvider(options: unknown): unknown;
}
