import {
  RED_LERM_BODY_MOTION_SCHEMA,
  type RedLermStateBucket
} from './red-lerm-body-motion.ts';
import { FIRST_VERTICAL_INTERFACE_SCHEMA, type SimulationAuthority } from './contracts/first-vertical.ts';

export const RED_LERM_BODY_CANDIDATE_SCHEMA = 'lerms.red-lerm-body-candidate.v0' as const;

export type RedLermBodyRepresentationKind =
  | 'fixture_baseline'
  | 'authored_procedural'
  | 'generated_mesh_planned'
  | 'generated_mesh_imported';

export type RedLermBodyPromotionStatus =
  | 'scene_local_reference'
  | 'candidate_for_scene_native'
  | 'planned_external_probe'
  | 'blocked_pending_artifact';

export type RedLermBodyGeneratorBackend = 'trellis' | 'pixall3d';

export interface RedLermBodyCandidateSourceTruth {
  representationKind: RedLermBodyRepresentationKind;
  authority: SimulationAuthority;
  bodySourceRoute: string;
  motionSourceRoute: string;
  assetRoute: string | null;
  promotionStatus: RedLermBodyPromotionStatus;
  sourceBoundaryNote: string;
}

export interface RedLermBodyGeneratorPlan {
  backend: RedLermBodyGeneratorBackend;
  substrate: 'gpu_greenroom';
  route: string;
  promptFrame: string;
  resolutionLadder: {
    seedProbe: 512;
    qualityProbe: 768;
    longProbe: 1024;
    confirmationStatus: 'operator_prior_pending_readme_confirmation';
  };
  acceptanceGate: readonly [
    'silhouette_at_game_distance',
    'mesh_can_accept_simple_rig_or_socket',
    'carry_socket_or_body_area_visible',
    'terrain_contact_not_floating',
    'source_truth_reported_as_generated_not_live'
  ];
}

export interface RedLermBodyAffordance {
  canRepresentAllRequiredBuckets: boolean;
  requiredBuckets: Record<RedLermStateBucket, boolean>;
  carrySocket: 'none' | 'implied' | 'explicit';
  terrainContact: 'weak' | 'adequate' | 'strong';
  hitTumbleAffordance: 'none' | 'visual_mark_only' | 'deformable_body';
  evidence: readonly string[];
}

export interface RedLermBodyEvaluation {
  silhouetteIdentity: number;
  motionAffordance: number;
  carrySocket: number;
  terrainContact: number;
  riggingCost: number;
  sourceTruth: number;
  promotionPath: number;
  timeToFirstBetterWitness: number;
  total: number;
}

export interface RedLermBodyCandidate {
  schema: typeof RED_LERM_BODY_CANDIDATE_SCHEMA;
  id: string;
  label: string;
  sourceTruth: RedLermBodyCandidateSourceTruth;
  affordance: RedLermBodyAffordance;
  evaluation: RedLermBodyEvaluation;
  generatorPlan?: RedLermBodyGeneratorPlan;
}

export const RED_LERM_REQUIRED_STATE_BUCKETS: readonly RedLermStateBucket[] = [
  'approach-uphill',
  'steal-goin',
  'carry-goin',
  'flee-with-goin',
  'hit-reaction',
  'tumble-flail',
  'drop-goin',
  'reroute-loose-goin'
];

export interface RedLermBodyBakeoff {
  candidateSchema: typeof RED_LERM_BODY_CANDIDATE_SCHEMA;
  motionContractIdentity: typeof RED_LERM_BODY_MOTION_SCHEMA;
  frameSchema: typeof FIRST_VERTICAL_INTERFACE_SCHEMA;
  requiredStateBuckets: readonly RedLermStateBucket[];
  selectedDefaultCandidateId: 'procedural-squash-thief-v0';
  comparisonBaselineCandidateId: 'sphere-nub-baseline-v0';
  candidates: readonly RedLermBodyCandidate[];
}

export function buildRedLermBodyBakeoff(): RedLermBodyBakeoff {
  return {
    candidateSchema: RED_LERM_BODY_CANDIDATE_SCHEMA,
    motionContractIdentity: RED_LERM_BODY_MOTION_SCHEMA,
    frameSchema: FIRST_VERTICAL_INTERFACE_SCHEMA,
    requiredStateBuckets: RED_LERM_REQUIRED_STATE_BUCKETS,
    selectedDefaultCandidateId: 'procedural-squash-thief-v0',
    comparisonBaselineCandidateId: 'sphere-nub-baseline-v0',
    candidates: [
      buildSphereNubBaseline(),
      buildProceduralSquashThief(),
      buildTrellisProbe(),
      buildPixallProbe()
    ]
  };
}

function buildSphereNubBaseline(): RedLermBodyCandidate {
  return {
    schema: RED_LERM_BODY_CANDIDATE_SCHEMA,
    id: 'sphere-nub-baseline-v0',
    label: 'current sphere-nub fixture baseline',
    sourceTruth: {
      representationKind: 'fixture_baseline',
      authority: 'synthetic_fixture',
      bodySourceRoute: 'lerms/red-lerm-body/baseline-sphere-nub-fixture',
      motionSourceRoute: 'lerms/red-lerm-body-motion/fixture',
      assetRoute: null,
      promotionStatus: 'scene_local_reference',
      sourceBoundaryNote: 'existing crude geometry control; not a generated or rigged body'
    },
    affordance: {
      canRepresentAllRequiredBuckets: true,
      requiredBuckets: allBuckets(true),
      carrySocket: 'implied',
      terrainContact: 'adequate',
      hitTumbleAffordance: 'visual_mark_only',
      evidence: [
        'already renders all fixture state buckets',
        'weak body identity beyond red color and nub silhouette',
        'carry is readable only as nearby goin placement'
      ]
    },
    evaluation: score({
      silhouetteIdentity: 2,
      motionAffordance: 4,
      carrySocket: 3,
      terrainContact: 5,
      riggingCost: 9,
      sourceTruth: 9,
      promotionPath: 3,
      timeToFirstBetterWitness: 10
    })
  };
}

function buildProceduralSquashThief(): RedLermBodyCandidate {
  return {
    schema: RED_LERM_BODY_CANDIDATE_SCHEMA,
    id: 'procedural-squash-thief-v0',
    label: 'authored procedural squash thief',
    sourceTruth: {
      representationKind: 'authored_procedural',
      authority: 'synthetic_fixture',
      bodySourceRoute: 'lerms/red-lerm-body/procedural-squash-thief-v0',
      motionSourceRoute: 'lerms/red-lerm-body-motion/fixture',
      assetRoute: null,
      promotionStatus: 'candidate_for_scene_native',
      sourceBoundaryNote: 'authored procedural candidate driven by fixture state buckets; not generated mesh output'
    },
    affordance: {
      canRepresentAllRequiredBuckets: true,
      requiredBuckets: allBuckets(true),
      carrySocket: 'explicit',
      terrainContact: 'strong',
      hitTumbleAffordance: 'deformable_body',
      evidence: [
        'squash, lean, face, feet, flail limbs, and explicit carry socket are controllable per state bucket',
        'can become a simple rig or procedural mesh without waiting for external generation',
        'default candidate until generated meshes beat it on state-spine readability'
      ]
    },
    evaluation: score({
      silhouetteIdentity: 6,
      motionAffordance: 8,
      carrySocket: 8,
      terrainContact: 8,
      riggingCost: 8,
      sourceTruth: 9,
      promotionPath: 7,
      timeToFirstBetterWitness: 8
    })
  };
}

function buildTrellisProbe(): RedLermBodyCandidate {
  return buildPlannedGeneratorProbe({
    id: 'trellis-red-lerm-greenroom-probe',
    label: 'TRELLIS red-lerm GPU greenroom probe',
    backend: 'trellis',
    route: 'gpu-greenroom/trellis/red-lerm-body-probe'
  });
}

function buildPixallProbe(): RedLermBodyCandidate {
  return buildPlannedGeneratorProbe({
    id: 'pixall3d-red-lerm-greenroom-probe',
    label: 'PixAll3D red-lerm GPU greenroom probe',
    backend: 'pixall3d',
    route: 'gpu-greenroom/pixall3d/red-lerm-body-probe'
  });
}

function buildPlannedGeneratorProbe({
  id,
  label,
  backend,
  route
}: {
  id: string;
  label: string;
  backend: RedLermBodyGeneratorBackend;
  route: string;
}): RedLermBodyCandidate {
  return {
    schema: RED_LERM_BODY_CANDIDATE_SCHEMA,
    id,
    label,
    sourceTruth: {
      representationKind: 'generated_mesh_planned',
      authority: 'visual_only',
      bodySourceRoute: route,
      motionSourceRoute: 'none-yet',
      assetRoute: null,
      promotionStatus: 'planned_external_probe',
      sourceBoundaryNote: 'planned generator candidate; no generated mesh has been run or imported yet'
    },
    affordance: {
      canRepresentAllRequiredBuckets: false,
      requiredBuckets: allBuckets(false),
      carrySocket: 'none',
      terrainContact: 'weak',
      hitTumbleAffordance: 'none',
      evidence: [
        'candidate exists as a greenroom plan only',
        'must produce an inspectable mesh or concept receipt before it can challenge the procedural default',
        'must not be presented as live, authored, fixture, or rigged motion'
      ]
    },
    evaluation: score({
      silhouetteIdentity: 5,
      motionAffordance: 0,
      carrySocket: 0,
      terrainContact: 0,
      riggingCost: 3,
      sourceTruth: 7,
      promotionPath: 5,
      timeToFirstBetterWitness: 3
    }),
    generatorPlan: {
      backend,
      substrate: 'gpu_greenroom',
      route,
      promptFrame: 'red lerm thief body, squat springy creature, explicit goin-carry socket, readable tumble/flail silhouette',
      resolutionLadder: {
        seedProbe: 512,
        qualityProbe: 768,
        longProbe: 1024,
        confirmationStatus: 'operator_prior_pending_readme_confirmation'
      },
      acceptanceGate: [
        'silhouette_at_game_distance',
        'mesh_can_accept_simple_rig_or_socket',
        'carry_socket_or_body_area_visible',
        'terrain_contact_not_floating',
        'source_truth_reported_as_generated_not_live'
      ]
    }
  };
}

function allBuckets(value: boolean): Record<RedLermStateBucket, boolean> {
  return RED_LERM_REQUIRED_STATE_BUCKETS.reduce<Record<RedLermStateBucket, boolean>>(
    (result, bucket) => {
      result[bucket] = value;
      return result;
    },
    {
      'approach-uphill': false,
      'steal-goin': false,
      'carry-goin': false,
      'flee-with-goin': false,
      'hit-reaction': false,
      'tumble-flail': false,
      'drop-goin': false,
      'reroute-loose-goin': false
    }
  );
}

function score(parts: Omit<RedLermBodyEvaluation, 'total'>): RedLermBodyEvaluation {
  return {
    ...parts,
    total:
      parts.silhouetteIdentity +
      parts.motionAffordance +
      parts.carrySocket +
      parts.terrainContact +
      parts.riggingCost +
      parts.sourceTruth +
      parts.promotionPath +
      parts.timeToFirstBetterWitness
  };
}
