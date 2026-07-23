declare module 'kaminos/finger-fluid-webgpu-core.js' {
  export const KAMINOS_FINGER_FLUID_DEFAULT_PARTICLE_COUNT: number;
  export const KAMINOS_FINGER_FLUID_LIVE_INLET_CONTRACT: string;

  export function normalizeFingerFluidLiveInletPacket(packet: unknown): {
    sourceRoute: string;
    activeInletCount: number;
  };

  export interface FingerFluidSolver {
    available: boolean;
    reason?: string;
    step(dt?: number): void;
    render(options?: Record<string, unknown>): void;
    setLiveInletPacket(packet: unknown): {
      contract: string;
      packetId: string;
      sourceRoute: string;
      activeInletCount: number;
      firstActivation: boolean;
    };
    getDebugState(): Record<string, unknown>;
    destroy(): void;
  }

  export function createWebGPUFingerFluidSolver(options: Record<string, unknown>): Promise<FingerFluidSolver>;
}
