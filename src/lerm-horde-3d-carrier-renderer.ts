import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

import {
  EXACT_3D_CARRIER_BODY_SHA256,
  EXACT_3D_CARRIER_EVALUATOR_ROUTE,
  EXACT_3D_CARRIER_RAIL_HISTORY_SHA256,
  EXACT_3D_CARRIER_RAIL_ID,
  EXACT_3D_CARRIER_RAIL_MODULE_SHA256,
  EXACT_3D_CARRIER_RAIL_REVISION,
  EXACT_3D_CARRIER_REGISTRATION_SHA256,
} from './lerm-horde-3d-carrier-contract.js';
import {
  createSmoothFittedBinding,
  evaluateSmoothFittedPhase,
  normalizeExact719024Positions,
  type CreatureRootFrame,
  type FittedRegistration,
  type SmoothFittedBinding,
} from './kaminos-719024-fitted-body.js';

const SOURCE_ROOT = '/vendor/kaminos-6217fff8/artifacts';
const BODY_PATH = `${SOURCE_ROOT}/motion-ready-719024/creature.glb`;
const REGISTRATION_PATH = `${SOURCE_ROOT}/lirm-719024-fitted-proxy-rig-mechanism-witness-v1/registration.json`;
const FIT_REPORT_PATH = `${SOURCE_ROOT}/lirm-719024-fitted-proxy-rig-proof-v0/fit-diagonal/report.json`;
const ADMISSION_PATH = `${SOURCE_ROOT}/lirm-719024-smooth-fitted-phase-motion-witness-v0/visual-admission.json`;
const RAIL_MODULE_PATH =
  '/vendor/kaminos-ced6db3d/motion-ready-719024-core.js';
const RAIL_HISTORY_PATH =
  '/vendor/lerms-c0ba891/artifacts/lerm-horde-producer-history/receipt.json';
const VIEW_EXTENT = 4.8;

interface ProducerHistoryReceipt {
  ok: boolean;
  phase: string;
  producer: {
    revision: string;
    moduleSha256: string;
    railId: string;
    railSchema: string;
  };
  history: {
    producer: {
      revision: string;
      railId: string;
      railSchema: string;
    };
    samples: Array<{
      sequence: number;
      root: {
        worldPosition: [number, number, number];
        sourceDistance: number;
        routeProgress: number;
        tangent: [number, number, number];
        locomotionFrame: {
          forward: [number, number, number];
          right: [number, number, number];
          up: [number, number, number];
        };
        support: {
          schema: string;
          disposition: string;
          rootLift: number;
          minimumComplianceMargin: number;
        };
      };
    }>;
  };
}

interface RailSample {
  schema: string;
  railId: string;
  sourceDistance: number;
  progress: number;
  position: [number, number, number];
  tangent: [number, number, number];
  locomotionFrame: {
    forward: [number, number, number];
    right: [number, number, number];
    up: [number, number, number];
  };
}

interface RailCoreModule {
  sampleCreatureScaleLocomotionRail(
    rail: unknown,
    sourceDistance: number,
  ): RailSample;
}

export interface CarrierRootSample {
  frameIndex: number;
  sourceDistance: number;
  progress: number;
  rootWorld: [number, number, number];
  railId: string;
  rootFrameSource: 'ced6db3d.sampleCreatureScaleLocomotionRail';
  rootFrame: CreatureRootFrame;
}

export interface ExactCarrierRenderer {
  samples: readonly CarrierRootSample[];
  renderFrame(frameIndex: number): void;
  resize(): void;
  bodyVertexCount: number;
  effectiveEvaluatorRoute: typeof EXACT_3D_CARRIER_EVALUATOR_ROUTE;
  railModuleSha256: typeof EXACT_3D_CARRIER_RAIL_MODULE_SHA256;
  railHistorySha256: typeof EXACT_3D_CARRIER_RAIL_HISTORY_SHA256;
  effectiveRailId: typeof EXACT_3D_CARRIER_RAIL_ID;
}

export async function createExactCarrierRenderer(
  stage: HTMLElement,
  viewport: SVGSVGElement,
  panelGroups: readonly SVGGElement[],
): Promise<ExactCarrierRenderer> {
  const [
    bodyResponse,
    registrationResponse,
    fitResponse,
    admissionResponse,
    railModuleResponse,
    railHistoryResponse,
  ] = await Promise.all(
    [
      BODY_PATH,
      REGISTRATION_PATH,
      FIT_REPORT_PATH,
      ADMISSION_PATH,
      RAIL_MODULE_PATH,
      RAIL_HISTORY_PATH,
    ].map((path) => fetch(path, { cache: 'no-store' })),
  );
  for (const response of [
    bodyResponse,
    registrationResponse,
    fitResponse,
    admissionResponse,
    railModuleResponse,
    railHistoryResponse,
  ]) {
    if (!response.ok) {
      throw new Error(
        `exact 719024 carrier artifact unavailable: ${response.url} ${response.status}`,
      );
    }
  }

  const [
    bodyBytes,
    registrationBytes,
    fitReport,
    admission,
    railModuleBytes,
    railHistoryBytes,
  ] =
    await Promise.all([
      bodyResponse.arrayBuffer(),
      registrationResponse.arrayBuffer(),
      fitResponse.json(),
      admissionResponse.json(),
      railModuleResponse.arrayBuffer(),
      railHistoryResponse.arrayBuffer(),
    ]);
  const [
    bodySha256,
    registrationSha256,
    railModuleSha256,
    railHistorySha256,
  ] = await Promise.all([
    sha256(bodyBytes),
    sha256(registrationBytes),
    sha256(railModuleBytes),
    sha256(railHistoryBytes),
  ]);
  if (bodySha256 !== EXACT_3D_CARRIER_BODY_SHA256) {
    throw new Error('exact 719024 GLB hash mismatch');
  }
  if (registrationSha256 !== EXACT_3D_CARRIER_REGISTRATION_SHA256) {
    throw new Error('exact 719024 fitted registration hash mismatch');
  }
  if (railModuleSha256 !== EXACT_3D_CARRIER_RAIL_MODULE_SHA256) {
    throw new Error('exact ced6db3d rail sampler module hash mismatch');
  }
  if (railHistorySha256 !== EXACT_3D_CARRIER_RAIL_HISTORY_SHA256) {
    throw new Error('exact reviewed rail history hash mismatch');
  }

  const registration = JSON.parse(
    new TextDecoder().decode(registrationBytes),
  ) as FittedRegistration;
  const railHistory = JSON.parse(
    new TextDecoder().decode(railHistoryBytes),
  ) as ProducerHistoryReceipt;
  const railCore = await importVerifiedRailCore(railModuleBytes);
  verifyProducerArtifacts(registration, fitReport, admission);
  verifyRailHistory(railHistory);
  const geometry = await loadExactGeometry(bodyBytes);
  const sourceBounds = fitReport.donor.sourceBounds;
  const normalization = fitReport.donor.normalization;
  normalizeExact719024Positions(
    geometry.getAttribute('position').array as Float32Array,
    sourceBounds.center,
    normalization.scale,
  );
  geometry.getAttribute('position').needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  const binding = createSmoothFittedBinding(
    geometry.getAttribute('position').array as Float32Array,
    registration,
  );

  const canvas = document.createElement('canvas');
  canvas.className = 'stage__carrier';
  canvas.dataset.exactCarrier = '719024';
  canvas.setAttribute('aria-hidden', 'true');
  stage.append(canvas);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    preserveDrawingBuffer: true,
  });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(
    -VIEW_EXTENT,
    VIEW_EXTENT,
    VIEW_EXTENT,
    -VIEW_EXTENT,
    0.1,
    60,
  );
  camera.position.set(8, 7, -8);
  camera.lookAt(0, 0, 0);
  const material = new THREE.MeshStandardMaterial({
    color: 0xd82938,
    roughness: 0.62,
    metalness: 0.02,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  scene.add(mesh);
  scene.add(new THREE.HemisphereLight(0xfff0c2, 0x183228, 2.1));
  const key = new THREE.DirectionalLight(0xffd88e, 3.2);
  key.position.set(-4, 8, 14);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x78b7ff, 2.1);
  rim.position.set(8, -2, 8);
  scene.add(rim);

  const actorGroups = panelGroups
    .map((panel) =>
      panel.querySelector<SVGGElement>('[data-visible-lerm-body="true"]'),
    )
    .filter((group): group is SVGGElement => group !== null);
  if (actorGroups.length !== 15) {
    throw new Error(
      `exact carrier requires 15 accepted actor roots, received ${actorGroups.length}`,
    );
  }
  const samples = createRootSamples(actorGroups, railHistory, railCore);
  actorGroups.forEach((group) => {
    group.dataset.hiddenByExactCarrier = 'true';
    group.style.opacity = '0';
  });

  let lastFrameIndex = -1;
  const renderFrame = (frameIndex: number): void => {
    if (frameIndex < 1 || frameIndex > 15) {
      mesh.visible = false;
      renderer.render(scene, camera);
      lastFrameIndex = frameIndex;
      return;
    }
    const sample = samples[frameIndex - 1];
    const rootFrame = sample.rootFrame;
    const positions = evaluateSmoothFittedPhase(
      binding,
      sample.progress,
      rootFrame,
      0.18,
    );
    const attribute = geometry.getAttribute('position') as THREE.BufferAttribute;
    attribute.copyArray(positions);
    attribute.needsUpdate = true;
    if (lastFrameIndex !== frameIndex) {
      geometry.computeVertexNormals();
      geometry.computeBoundingSphere();
    }
    mesh.visible = true;
    renderer.render(scene, camera);
    lastFrameIndex = frameIndex;
  };

  const resize = (): void => {
    const width = Math.max(1, Math.round(stage.clientWidth));
    const height = Math.max(1, Math.round(stage.clientHeight));
    renderer.setSize(width, height, false);
    const aspect = width / height;
    if (aspect >= 1) {
      camera.left = -VIEW_EXTENT * aspect;
      camera.right = VIEW_EXTENT * aspect;
      camera.top = VIEW_EXTENT;
      camera.bottom = -VIEW_EXTENT;
    } else {
      camera.left = -VIEW_EXTENT;
      camera.right = VIEW_EXTENT;
      camera.top = VIEW_EXTENT / aspect;
      camera.bottom = -VIEW_EXTENT / aspect;
    }
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
  };
  resize();
  new ResizeObserver(resize).observe(stage);
  viewport.dataset.carrierAssetSha256 = bodySha256;
  viewport.dataset.carrierRegistrationSha256 = registrationSha256;
  viewport.dataset.railModuleSha256 = railModuleSha256;
  viewport.dataset.railHistorySha256 = railHistorySha256;
  viewport.dataset.effectiveRailId = EXACT_3D_CARRIER_RAIL_ID;

  return {
    samples,
    renderFrame,
    resize,
    bodyVertexCount: binding.vertexCount,
    effectiveEvaluatorRoute: EXACT_3D_CARRIER_EVALUATOR_ROUTE,
    railModuleSha256: EXACT_3D_CARRIER_RAIL_MODULE_SHA256,
    railHistorySha256: EXACT_3D_CARRIER_RAIL_HISTORY_SHA256,
    effectiveRailId: EXACT_3D_CARRIER_RAIL_ID,
  };
}

async function loadExactGeometry(
  bodyBytes: ArrayBuffer,
): Promise<THREE.BufferGeometry> {
  const gltf = await new GLTFLoader().parseAsync(bodyBytes, `${SOURCE_ROOT}/`);
  gltf.scene.updateMatrixWorld(true);
  const geometries: THREE.BufferGeometry[] = [];
  gltf.scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const source = object.geometry.clone();
    source.applyMatrix4(object.matrixWorld);
    const position = source.getAttribute('position');
    if (!position) return;
    const exact = new THREE.BufferGeometry();
    exact.setAttribute('position', position.clone());
    if (source.index) exact.setIndex(source.index.clone());
    geometries.push(source.index ? exact.toNonIndexed() : exact);
  });
  if (geometries.length === 0) {
    throw new Error('exact 719024 GLB produced no triangle geometry');
  }
  const merged = mergeGeometries(geometries, false);
  geometries.forEach((geometry) => geometry.dispose());
  if (!merged) throw new Error('exact 719024 geometry merge failed');
  return merged;
}

function verifyProducerArtifacts(
  registration: FittedRegistration,
  fitReport: any,
  admission: any,
): void {
  if (
    registration.schema !==
      'kaminos.lirm-fitted-proxy-rig-registration.v0' ||
    registration.manualControlCount !== 0 ||
    registration.stationCount !== 13 ||
    registration.donorSha256 !== `sha256:${EXACT_3D_CARRIER_BODY_SHA256}` ||
    fitReport?.status !== 'assay-passed-inspected' ||
    fitReport?.donor?.sha256 !==
      `sha256:${EXACT_3D_CARRIER_BODY_SHA256}` ||
    fitReport?.donor?.normalization?.kind !==
      'bbox-center-diagonal-scale' ||
    admission?.schema !==
      'kaminos.lirm-smooth-fitted-phase-visual-admission.v0' ||
    admission?.status !== 'satisfies' ||
    admission?.happy !== true ||
    admission?.identity?.actualRenderedSourceHash !==
      EXACT_3D_CARRIER_BODY_SHA256 ||
    admission?.identity?.registrationHash !==
      EXACT_3D_CARRIER_REGISTRATION_SHA256 ||
    admission?.identity?.effectiveEvaluatorRoute !==
      EXACT_3D_CARRIER_EVALUATOR_ROUTE
  ) {
    throw new Error(
      'exact 719024 fitted-body admission or normalization is incompatible',
    );
  }
}

function createRootSamples(
  actorGroups: readonly SVGGElement[],
  receipt: ProducerHistoryReceipt,
  railCore: RailCoreModule,
): CarrierRootSample[] {
  const rail = rehydrateReviewedRail(receipt);
  return actorGroups.map((group, index) => {
    const acceptedRootWorld = (group.dataset.rootWorld ?? '')
      .split(',')
      .map(Number) as [number, number, number];
    const reviewed = receipt.history.samples[index];
    if (!reviewed || reviewed.sequence !== index) {
      throw new Error(`reviewed rail history sample ${index} is missing`);
    }
    const sampled = railCore.sampleCreatureScaleLocomotionRail(
      rail,
      reviewed.root.sourceDistance,
    );
    if (
      sampled.schema !==
        'kaminos.creature-scale-locomotion-rail-sample.v0' ||
      sampled.railId !== EXACT_3D_CARRIER_RAIL_ID ||
      !vec3Equal(sampled.position, reviewed.root.worldPosition) ||
      !vec3Equal(
        sampled.locomotionFrame.forward,
        reviewed.root.locomotionFrame.forward,
      ) ||
      !vec3Equal(
        sampled.locomotionFrame.right,
        reviewed.root.locomotionFrame.right,
      ) ||
      !vec3Equal(
        sampled.locomotionFrame.up,
        reviewed.root.locomotionFrame.up,
      )
    ) {
      throw new Error(`effective ced6db3d rail sample ${index} is substituted`);
    }
    if (
      acceptedRootWorld.length !== 3 ||
      !acceptedRootWorld.every(Number.isFinite) ||
      Math.abs(acceptedRootWorld[0] - sampled.position[0]) > 1e-9 ||
      Math.abs(acceptedRootWorld[2] - sampled.position[2]) > 1e-9
    ) {
      throw new Error(
        `accepted Hill actor root ${index} does not project the exact rail route`,
      );
    }
    const rootFrame = railSampleRootFrame(sampled);
    return {
      frameIndex: index + 1,
      sourceDistance: sampled.sourceDistance,
      progress: sampled.progress,
      rootWorld: sampled.position,
      railId: sampled.railId,
      rootFrameSource: 'ced6db3d.sampleCreatureScaleLocomotionRail',
      rootFrame,
    };
  });
}

function railSampleRootFrame(sample: RailSample): CreatureRootFrame {
  const [originX, originY, originZ] = sample.position;
  const [rightX, rightY, rightZ] = sample.locomotionFrame.right;
  const [upX, upY, upZ] = sample.locomotionFrame.up;
  const [forwardX, forwardY, forwardZ] = sample.locomotionFrame.forward;
  return {
    schema: 'kaminos.creature-root-frame.v0',
    origin: { x: originX, y: originY, z: originZ },
    lateral: { x: rightX, y: rightY, z: rightZ },
    normal: { x: upX, y: upY, z: upZ },
    // The fitted cast advances along local -Z; negate rail forward once.
    tangent: { x: -forwardX, y: -forwardY, z: -forwardZ },
  };
}

function rehydrateReviewedRail(receipt: ProducerHistoryReceipt): unknown {
  const samples = receipt.history.samples.map(({ root }) => ({
    sourceDistance: root.sourceDistance,
    position: root.worldPosition,
    tangent: root.tangent,
    curvature: 0,
    support: {
      schema: root.support.schema,
      clearance: 0,
      scale: 1,
      corridorRadius: 0,
      supportSampleSpacing: 1,
      terrainCellWidth: 1,
      rootLift: root.support.rootLift,
      profile: [],
      samples: [],
      compliance: {
        exceeded: root.support.disposition === 'reroute-required',
        outOfBounds: false,
        maxEnvelopeLift: root.support.rootLift,
        rootLiftAboveClearance: root.support.rootLift,
        maxSuspensionLift: 0,
        measuredPitchRadians: 0,
        measuredBendRadians: 0,
        maxPitchRadians: Math.PI,
        maxBendRadiansPerStation: Math.PI,
        margins: {
          reviewed: root.support.minimumComplianceMargin,
        },
        minimumNormalizedMargin: root.support.minimumComplianceMargin,
      },
      plannerDisposition: root.support.disposition,
    },
  }));
  return {
    schema: 'kaminos.creature-scale-locomotion-rail.v0',
    id: EXACT_3D_CARRIER_RAIL_ID,
    length: samples.at(-1)?.sourceDistance ?? 0,
    samples,
  };
}

function verifyRailHistory(receipt: ProducerHistoryReceipt): void {
  if (
    receipt.ok !== true ||
    receipt.phase !== 'complete' ||
    receipt.producer.revision !== EXACT_3D_CARRIER_RAIL_REVISION ||
    receipt.producer.moduleSha256 !== EXACT_3D_CARRIER_RAIL_MODULE_SHA256 ||
    receipt.producer.railId !== EXACT_3D_CARRIER_RAIL_ID ||
    receipt.producer.railSchema !==
      'kaminos.creature-scale-locomotion-rail.v0' ||
    receipt.history.producer.revision !== EXACT_3D_CARRIER_RAIL_REVISION ||
    receipt.history.producer.railId !== EXACT_3D_CARRIER_RAIL_ID ||
    receipt.history.samples.length !== 15
  ) {
    throw new Error('reviewed ced6db3d rail history identity is incompatible');
  }
}

async function importVerifiedRailCore(
  bytes: ArrayBuffer,
): Promise<RailCoreModule> {
  const url = URL.createObjectURL(
    new Blob([bytes], { type: 'text/javascript' }),
  );
  try {
    const module = (await import(/* @vite-ignore */ url)) as RailCoreModule;
    if (typeof module.sampleCreatureScaleLocomotionRail !== 'function') {
      throw new Error('verified ced6db3d module is missing its rail sampler');
    }
    return module;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function vec3Equal(
  left: readonly number[],
  right: readonly number[],
  tolerance = 1e-9,
): boolean {
  return (
    left.length === 3 &&
    right.length === 3 &&
    left.every(
      (value, index) =>
        Number.isFinite(value) &&
        Number.isFinite(right[index]) &&
        Math.abs(value - right[index]) <= tolerance,
    )
  );
}

async function sha256(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
}
