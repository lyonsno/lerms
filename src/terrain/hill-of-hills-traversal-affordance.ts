import type { SimulationAuthority, Vec3 } from '../contracts/first-vertical.js';
import {
  HILL_OF_HILLS_PRODUCER_TRAFFIC_FIELD_SCHEMA,
  sampleHillOfHillsProducerTrafficField
} from './hill-of-hills-producer-contact-history.js';
import {
  sampleHillOfHillsTerrain,
  type HillOfHillsTerrain
} from './hill-of-hills.js';

export const HILL_OF_HILLS_TRAVERSAL_AFFORDANCE_SCHEMA =
  'lerms.hill-of-hills.traversal-affordance.v0' as const;

export interface HillOfHillsTraversalAffordance {
  schema: typeof HILL_OF_HILLS_TRAVERSAL_AFFORDANCE_SCHEMA;
  source: {
    authority: SimulationAuthority;
    route: string;
    frameId: string;
    backend?: string;
    configId?: string;
    sampleChecksum: string;
    topologyChecksum: string;
    supportFrameChecksum: string;
    producerTrafficFieldChecksum: string;
  };
  query: {
    requestedWorldPosition: Vec3;
    sampledWorldPosition: Vec3;
    direction: Vec3;
  };
  support: {
    height: number;
    normal: Vec3;
    slope: number;
    heightDelta: number;
    surfaceSpeed: number;
    shock: string;
    stability: number;
  };
  terrain: {
    routePressure: number;
    flowDirection: Vec3;
    ridgeStrength: number;
    valleyStrength: number;
  };
  traversal: {
    signedGrade: number;
    uphillEffort: number;
    flowAlignment: number;
    directionalPermeability: number;
  };
  memory: {
    schema: typeof HILL_OF_HILLS_PRODUCER_TRAFFIC_FIELD_SCHEMA;
    depositionLaw: 'bounded_exponential_v1' | 'additive_v0';
    capacity: number | null;
    localExposure: number;
    affinity: number;
  };
}

export function sampleHillOfHillsTraversalAffordance(
  terrain: HillOfHillsTerrain,
  worldPosition: Vec3,
  direction: Vec3
): HillOfHillsTraversalAffordance {
  requireFiniteVec3(worldPosition, 'traversal affordance world position');
  requireFiniteVec3(direction, 'traversal affordance direction');
  const horizontalLength = Math.hypot(direction[0], direction[2]);
  if (horizontalLength <= Number.EPSILON) {
    throw new Error('traversal affordance direction requires a nonzero horizontal heading');
  }
  const normalizedDirection: Vec3 = [
    direction[0] / horizontalLength,
    0,
    direction[2] / horizontalLength
  ];
  const sample = sampleHillOfHillsTerrain(
    terrain,
    worldPosition[0],
    worldPosition[2]
  );
  const trafficField = terrain.phaseState.producerTrafficField;
  if (!trafficField) {
    throw new Error('traversal affordance requires current Hill producer-memory identity');
  }

  const normalY =
    Math.abs(sample.normal[1]) <= Number.EPSILON ? Number.EPSILON : sample.normal[1];
  const gradeX = -sample.normal[0] / normalY;
  const gradeZ = -sample.normal[2] / normalY;
  const signedGrade = clampSigned(
    gradeX * normalizedDirection[0] + gradeZ * normalizedDirection[2]
  );
  const uphillEffort = clamp01(Math.max(0, signedGrade));
  const surfaceSpeed = Math.hypot(...sample.support.surfaceVelocity);
  const stability =
    sample.support.shock === 'shock_reset'
      ? 0
      : (1 / (1 + Math.max(0, sample.slope))) *
        (1 / (1 + Math.max(0, surfaceSpeed)));
  const horizontalFlowLength = Math.hypot(
    sample.topology.flowDirection[0],
    sample.topology.flowDirection[2]
  );
  const flowAlignment =
    horizontalFlowLength <= Number.EPSILON
      ? 0
      : clampSigned(
          normalizedDirection[0] *
            (sample.topology.flowDirection[0] / horizontalFlowLength) +
            normalizedDirection[2] *
              (sample.topology.flowDirection[2] / horizontalFlowLength)
        );
  const localExposure = clamp01(
    sampleHillOfHillsProducerTrafficField(
      trafficField,
      worldPosition[0],
      worldPosition[2]
    )
  );

  return {
    schema: HILL_OF_HILLS_TRAVERSAL_AFFORDANCE_SCHEMA,
    source: {
      authority: terrain.source.authority,
      route: terrain.source.route,
      frameId: terrain.source.frameId,
      ...(terrain.source.backend ? { backend: terrain.source.backend } : {}),
      ...(terrain.source.configId ? { configId: terrain.source.configId } : {}),
      sampleChecksum: terrain.witness.sampleChecksum,
      topologyChecksum: terrain.witness.topologyChecksum,
      supportFrameChecksum: terrain.witness.supportFrame.supportFrameChecksum,
      producerTrafficFieldChecksum:
        terrain.witness.producerTrafficFieldChecksum
    },
    query: {
      requestedWorldPosition: [...worldPosition] as Vec3,
      sampledWorldPosition: sample.world,
      direction: normalizedDirection
    },
    support: {
      height: sample.height,
      normal: sample.normal,
      slope: sample.slope,
      heightDelta: sample.support.heightDelta,
      surfaceSpeed,
      shock: sample.support.shock,
      stability: clamp01(stability)
    },
    terrain: {
      routePressure: clamp01(sample.topology.routePressure),
      flowDirection: sample.topology.flowDirection,
      ridgeStrength: clamp01(sample.topology.ridgeStrength),
      valleyStrength: clamp01(sample.topology.valleyStrength)
    },
    traversal: {
      signedGrade,
      uphillEffort,
      flowAlignment,
      directionalPermeability: clamp01(stability * (1 - uphillEffort))
    },
    memory: {
      schema: HILL_OF_HILLS_PRODUCER_TRAFFIC_FIELD_SCHEMA,
      depositionLaw: trafficField.depositionLaw,
      capacity:
        trafficField.depositionLaw === 'bounded_exponential_v1' ? 1 : null,
      localExposure,
      affinity: localExposure
    }
  };
}

function requireFiniteVec3(value: Vec3, label: string): void {
  if (
    !Array.isArray(value) ||
    value.length !== 3 ||
    value.some((component) => !Number.isFinite(component))
  ) {
    throw new Error(`${label} must be a finite vec3`);
  }
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function clampSigned(value: number): number {
  return Math.max(-1, Math.min(1, value));
}
