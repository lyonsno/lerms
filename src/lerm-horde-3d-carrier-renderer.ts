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
import type { LermHordeProducerHistoryCompositionReceipt } from './lerm-horde-producer-history-composition.js';
import {
  FULL_HILL_RENDERER_ID,
  createHillTerrainGeometry,
  updateHillTerrainGeometry,
} from './lerm-horde-full-hill-renderer.js';
import {
  LERM_HORDE_REVIEWED_LIVE_HILL_REVISION,
} from './lerm-horde-live-body-motion.js';
import {
  LERM_HORDE_LIVE_RUNTIME_ROUTE,
  createLermHordeLiveRuntime,
  type LermHordeLiveRailSample,
  type LermHordeLiveRuntime,
  type LermHordeLiveRuntimeReceipt,
  type LermHordeLiveRuntimeState,
} from './lerm-horde-live-runtime-composition.js';

const SOURCE_ROOT = '/vendor/kaminos-6217fff8/artifacts';
const BODY_PATH = `${SOURCE_ROOT}/motion-ready-719024/creature.glb`;
const REGISTRATION_PATH = `${SOURCE_ROOT}/lirm-719024-fitted-proxy-rig-mechanism-witness-v1/registration.json`;
const FIT_REPORT_PATH = `${SOURCE_ROOT}/lirm-719024-fitted-proxy-rig-proof-v0/fit-diagonal/report.json`;
const ADMISSION_PATH = `${SOURCE_ROOT}/lirm-719024-smooth-fitted-phase-motion-witness-v0/visual-admission.json`;
const RAIL_MODULE_PATH =
  '/vendor/kaminos-ced6db3d/motion-ready-719024-core.js';
const RAIL_HISTORY_PATH =
  '/vendor/lerms-c0ba891/artifacts/lerm-horde-producer-history/receipt.json';
const VIEW_EXTENT = 9.2;

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

type RailSample = LermHordeLiveRailSample;

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
  railRootPosition: [number, number, number];
  hillSupportRootPosition: [number, number, number];
  supportHeightDelta: number;
  railId: string;
  rootFrameSource:
    'f6458e5.liveHillRoot+ced6db3d.railFrame';
  rootFrame: CreatureRootFrame;
}

export interface ExactCarrierRenderer {
  readonly state: LermHordeLiveRuntimeState;
  durationMs: number;
  completionElapsedMs: number;
  advanceTo(elapsedMs: number): LermHordeLiveRuntimeState;
  reset(): LermHordeLiveRuntimeState;
  resize(): void;
  createReceipt(operatorPlayCount: number): ExactCarrierLiveRuntimeReceipt;
  bodyVertexCount: number;
  terrainSampleCount: number;
  terrainTriangleCount: number;
  depthBits: number;
  rendererId: typeof FULL_HILL_RENDERER_ID;
  effectiveEvaluatorRoute: typeof EXACT_3D_CARRIER_EVALUATOR_ROUTE;
  railModuleSha256: typeof EXACT_3D_CARRIER_RAIL_MODULE_SHA256;
  railHistorySha256: typeof EXACT_3D_CARRIER_RAIL_HISTORY_SHA256;
  effectiveRailId: typeof EXACT_3D_CARRIER_RAIL_ID;
}

export interface ExactCarrierLiveRuntimeReceipt {
  schema: 'lerms.horde-live-runtime-renderer.v0';
  status: {
    ok: true;
    phase: 'complete';
    fallbackStatus: 'none';
    staleStatus: 'fresh';
    failurePhase: null;
  };
  renderer: {
    requested: typeof FULL_HILL_RENDERER_ID;
    effective: typeof FULL_HILL_RENDERER_ID;
    canvasCount: 1;
    sceneCount: 1;
    cameraCount: 1;
    depthBufferCount: 1;
    depthBits: number;
    visibleSvgCount: 0;
    terrainTextureSubstitution: false;
  };
  carrier: {
    identity: '719024';
    bodySha256: typeof EXACT_3D_CARRIER_BODY_SHA256;
    railRevision: typeof EXACT_3D_CARRIER_RAIL_REVISION;
    railModuleSha256: typeof EXACT_3D_CARRIER_RAIL_MODULE_SHA256;
    railHistorySha256: typeof EXACT_3D_CARRIER_RAIL_HISTORY_SHA256;
    railId: typeof EXACT_3D_CARRIER_RAIL_ID;
    departed: true;
  };
  playback: {
    initialState: 'paused';
    operatorPlayCount: 1;
    autoplayObserved: false;
  };
  runtime: LermHordeLiveRuntimeReceipt;
}

export async function createExactCarrierRenderer(
  stage: HTMLElement,
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

  const producerReceipt =
    railHistory as unknown as LermHordeProducerHistoryCompositionReceipt;
  const reviewedRail = rehydrateReviewedRail(railHistory);
  const createRuntime = (): LermHordeLiveRuntime =>
    createLermHordeLiveRuntime({
      producerReceipt,
      railSampler: (sourceDistance) =>
        railCore.sampleCreatureScaleLocomotionRail(
          reviewedRail,
          sourceDistance,
        ),
      hillRevision: LERM_HORDE_REVIEWED_LIVE_HILL_REVISION,
    });
  let runtime = createRuntime();
  const firstTerrain = runtime.state.terrainBuffer;

  const canvas = document.createElement('canvas');
  canvas.className = 'stage__renderer';
  canvas.dataset.exactCarrier = '719024';
  canvas.dataset.rendererId = FULL_HILL_RENDERER_ID;
  canvas.dataset.fullHill = 'true';
  canvas.setAttribute(
    'aria-label',
    'Full Hill of Hills and exact 719024 carrier in one 3D renderer',
  );
  stage.prepend(canvas);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: false,
    antialias: true,
    preserveDrawingBuffer: true,
  });
  renderer.setClearColor(0x06100d, 1);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x06100d);
  scene.fog = new THREE.Fog(0x06100d, 20, 34);
  const camera = new THREE.OrthographicCamera(
    -VIEW_EXTENT,
    VIEW_EXTENT,
    VIEW_EXTENT,
    -VIEW_EXTENT,
    0.1,
    80,
  );
  camera.position.set(12, 10, -15);
  camera.lookAt(0, 0.4, 0);

  const terrainGeometry = createHillTerrainGeometry(firstTerrain);
  const terrainMaterial = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.82,
    metalness: 0,
    side: THREE.DoubleSide,
    depthTest: true,
    depthWrite: true,
  });
  const terrainMesh = new THREE.Mesh(terrainGeometry, terrainMaterial);
  terrainMesh.name = 'full-hill-terrain';
  terrainMesh.frustumCulled = false;
  terrainMesh.renderOrder = 0;
  scene.add(terrainMesh);

  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: 0xd82938,
    roughness: 0.62,
    metalness: 0.02,
    side: THREE.DoubleSide,
    depthTest: true,
    depthWrite: true,
  });
  const bodyMesh = new THREE.Mesh(geometry, bodyMaterial);
  bodyMesh.name = 'exact-719024-carrier';
  bodyMesh.frustumCulled = false;
  bodyMesh.renderOrder = 1;
  scene.add(bodyMesh);
  scene.add(new THREE.HemisphereLight(0xfff0c2, 0x183228, 2.1));
  const key = new THREE.DirectionalLight(0xffd88e, 3.2);
  key.position.set(-4, 8, 14);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x78b7ff, 2.1);
  rim.position.set(8, -2, 8);
  scene.add(rim);

  let lastTickCount = -1;
  const renderState = (state: LermHordeLiveRuntimeState): void => {
    const terrainBuffer = state.terrainBuffer;
    updateHillTerrainGeometry(terrainGeometry, terrainBuffer);
    if (state.body) {
      const rootFrame = liveBodyRootFrame(state.body);
      const positions = evaluateSmoothFittedPhase(
        binding,
        state.body.progress,
        rootFrame,
        0.18,
      );
      const attribute = geometry.getAttribute('position') as THREE.BufferAttribute;
      attribute.copyArray(positions);
      attribute.needsUpdate = true;
      if (lastTickCount !== state.tickCount) {
        geometry.computeVertexNormals();
      }
      bodyMesh.visible = true;
    } else {
      bodyMesh.visible = false;
    }
    canvas.dataset.elapsedMs = state.elapsedMs.toFixed(3);
    canvas.dataset.frameIndex = String(state.tickCount);
    canvas.dataset.frameKind = state.phase;
    canvas.dataset.runtimeRoute = LERM_HORDE_LIVE_RUNTIME_ROUTE;
    canvas.dataset.admittedIntervalCount = String(
      state.admittedIntervalCount,
    );
    canvas.dataset.sourceDistance =
      state.body?.sourceDistance.toFixed(9) ?? '';
    canvas.dataset.progress = state.body?.progress.toFixed(9) ?? '1';
    canvas.dataset.terrainSampleChecksum = terrainBuffer.sampleChecksum;
    canvas.dataset.terrainTopologyChecksum = terrainBuffer.topologyChecksum;
    canvas.dataset.trafficChecksum =
      terrainBuffer.witness.producerTrafficFieldChecksum;
    renderer.render(scene, camera);
    lastTickCount = state.tickCount;
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
  const depthBits = renderer
    .getContext()
    .getParameter(renderer.getContext().DEPTH_BITS) as number;
  const terrainTriangleCount =
    (firstTerrain.gridResolution.x - 1) *
    (firstTerrain.gridResolution.z - 1) *
    2;

  const createReceipt = (
    operatorPlayCount: number,
  ): ExactCarrierLiveRuntimeReceipt => {
    const canvasCount = stage.querySelectorAll('canvas').length;
    const visibleSvgCount = [...stage.querySelectorAll('svg')].filter(
      (svg) =>
        !svg.hasAttribute('hidden') && getComputedStyle(svg).display !== 'none',
    ).length;
    if (
      canvasCount !== 1 ||
      visibleSvgCount !== 0 ||
      operatorPlayCount !== 1 ||
      runtime.state.phase !== 'departed'
    ) {
      throw new Error(
        'live runtime completion cannot close with split presentation, autoplay, or a visible body',
      );
    }
    return {
      schema: 'lerms.horde-live-runtime-renderer.v0',
      status: {
        ok: true,
        phase: 'complete',
        fallbackStatus: 'none',
        staleStatus: 'fresh',
        failurePhase: null,
      },
      renderer: {
        requested: FULL_HILL_RENDERER_ID,
        effective: FULL_HILL_RENDERER_ID,
        canvasCount,
        sceneCount: 1,
        cameraCount: 1,
        depthBufferCount: 1,
        depthBits,
        visibleSvgCount,
        terrainTextureSubstitution: false,
      },
      carrier: {
        identity: '719024',
        bodySha256: EXACT_3D_CARRIER_BODY_SHA256,
        railRevision: EXACT_3D_CARRIER_RAIL_REVISION,
        railModuleSha256: EXACT_3D_CARRIER_RAIL_MODULE_SHA256,
        railHistorySha256: EXACT_3D_CARRIER_RAIL_HISTORY_SHA256,
        railId: EXACT_3D_CARRIER_RAIL_ID,
        departed: true,
      },
      playback: {
        initialState: 'paused',
        operatorPlayCount,
        autoplayObserved: false,
      },
      runtime: runtime.createReceipt(),
    };
  };

  stage.dataset.carrierAssetSha256 = bodySha256;
  stage.dataset.carrierRegistrationSha256 = registrationSha256;
  stage.dataset.railModuleSha256 = railModuleSha256;
  stage.dataset.railHistorySha256 = railHistorySha256;
  stage.dataset.effectiveRailId = EXACT_3D_CARRIER_RAIL_ID;
  stage.dataset.terrainSampleCount = String(firstTerrain.sampleCount);
  stage.dataset.terrainTriangleCount = String(terrainTriangleCount);

  renderState(runtime.state);
  const durationMs = producerReceipt.historySummary.lastTimestampMs;
  const completionElapsedMs = durationMs + 900;
  return {
    get state() {
      return runtime.state;
    },
    durationMs,
    completionElapsedMs,
    advanceTo(elapsedMs) {
      const state = runtime.advanceTo(elapsedMs);
      renderState(state);
      return state;
    },
    reset() {
      runtime = createRuntime();
      lastTickCount = -1;
      renderState(runtime.state);
      return runtime.state;
    },
    resize,
    createReceipt,
    bodyVertexCount: binding.vertexCount,
    terrainSampleCount: firstTerrain.sampleCount,
    terrainTriangleCount,
    depthBits,
    rendererId: FULL_HILL_RENDERER_ID,
    effectiveEvaluatorRoute: EXACT_3D_CARRIER_EVALUATOR_ROUTE,
    railModuleSha256: EXACT_3D_CARRIER_RAIL_MODULE_SHA256,
    railHistorySha256: EXACT_3D_CARRIER_RAIL_HISTORY_SHA256,
    effectiveRailId: EXACT_3D_CARRIER_RAIL_ID,
  };
}

function liveBodyRootFrame(
  body: LermHordeLiveRuntimeState['body'] & {},
): CreatureRootFrame {
  const [originX, originY, originZ] = body.rootWorld;
  const [rightX, rightY, rightZ] = body.locomotionFrame.right;
  const [upX, upY, upZ] = body.locomotionFrame.up;
  const [forwardX, forwardY, forwardZ] =
    body.locomotionFrame.forward;
  return {
    schema: 'kaminos.creature-root-frame.v0',
    origin: { x: originX, y: originY, z: originZ },
    lateral: { x: rightX, y: rightY, z: rightZ },
    normal: { x: upX, y: upY, z: upZ },
    tangent: {
      x: -forwardX,
      y: -forwardY,
      z: -forwardZ,
    },
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
  acceptedRoots: readonly (readonly [number, number, number])[],
  receipt: ProducerHistoryReceipt,
  railCore: RailCoreModule,
): CarrierRootSample[] {
  const rail = rehydrateReviewedRail(receipt);
  return acceptedRoots.map((acceptedRoot, index) => {
    const acceptedRootWorld = [...acceptedRoot] as [number, number, number];
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
    const rootFrame = railSampleRootFrame(sampled, acceptedRootWorld);
    return {
      frameIndex: index + 1,
      sourceDistance: sampled.sourceDistance,
      progress: sampled.progress,
      rootWorld: acceptedRootWorld,
      railRootPosition: [...sampled.position],
      hillSupportRootPosition: acceptedRootWorld,
      supportHeightDelta: acceptedRootWorld[1] - sampled.position[1],
      railId: sampled.railId,
      rootFrameSource: 'f6458e5.liveHillRoot+ced6db3d.railFrame',
      rootFrame,
    };
  });
}

function railSampleRootFrame(
  sample: RailSample,
  acceptedHillRoot: [number, number, number],
): CreatureRootFrame {
  const [originX, , originZ] = sample.position;
  const originY = acceptedHillRoot[1];
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
