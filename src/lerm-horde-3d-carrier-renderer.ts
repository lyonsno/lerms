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
  FULL_HILL_ONE_RENDERER_SCHEMA,
  FULL_HILL_RENDERER_ID,
  FULL_HILL_SOURCE_AUTHORITY,
  FULL_HILL_SOURCE_BACKEND,
  FULL_HILL_SOURCE_CONFIG,
  FULL_HILL_SOURCE_ROUTE,
  createFullHillOneRendererSource,
  createHillTerrainGeometry,
  updateHillTerrainGeometry,
  validateFullHillOneRendererReceipt,
  type FullHillOneRendererReceipt,
  type FullHillOneRendererSource,
} from './lerm-horde-full-hill-renderer.js';
import {
  HILL_OF_HILLS_TERRAIN_BUFFER_SCHEMA,
  type HillOfHillsTerrainBuffer,
} from './terrain/hill-of-hills.js';

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
  railRootPosition: [number, number, number];
  hillSupportRootPosition: [number, number, number];
  supportHeightDelta: number;
  railId: string;
  rootFrameSource:
    'f6458e5.liveHillRoot+ced6db3d.railFrame';
  rootFrame: CreatureRootFrame;
}

export interface ExactCarrierRenderer {
  frames: FullHillOneRendererSource['replay']['frames'];
  samples: readonly CarrierRootSample[];
  renderFrame(frameIndex: number): void;
  resize(): void;
  createReceipt(operatorPlayCount: number): FullHillOneRendererReceipt;
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

  const fullHillSource = createFullHillOneRendererSource(
    railHistory as unknown as LermHordeProducerHistoryCompositionReceipt,
  );
  const acceptedRoots = fullHillSource.replay.frames
    .filter((frame) => frame.kind === 'actor-prefix')
    .map((frame) => {
      if (!frame.actor) {
        throw new Error(`full-Hill actor frame ${frame.index} is missing its root`);
      }
      return frame.actor.rootWorld;
    });
  const samples = createRootSamples(acceptedRoots, railHistory, railCore);
  const firstTerrain = fullHillSource.buffers[0];
  if (!firstTerrain) throw new Error('full-Hill replay has no terrain buffer');

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

  let lastFrameIndex = -1;
  const renderFrame = (frameIndex: number): void => {
    const frame = fullHillSource.replay.frames[frameIndex];
    const terrainBuffer = fullHillSource.buffers[frameIndex];
    if (!frame || !terrainBuffer) {
      throw new Error(`full-Hill frame ${frameIndex} is unavailable`);
    }
    updateHillTerrainGeometry(terrainGeometry, terrainBuffer);
    if (frame.kind === 'actor-prefix') {
      const sample = samples[frameIndex - 1];
      if (!sample || !frame.actor) {
        throw new Error(`full-Hill carrier sample ${frameIndex} is unavailable`);
      }
      const positions = evaluateSmoothFittedPhase(
        binding,
        sample.progress,
        sample.rootFrame,
        0.18,
      );
      const attribute = geometry.getAttribute('position') as THREE.BufferAttribute;
      attribute.copyArray(positions);
      attribute.needsUpdate = true;
      if (lastFrameIndex !== frameIndex) {
        geometry.computeVertexNormals();
        geometry.computeBoundingSphere();
      }
      bodyMesh.visible = true;
    } else {
      bodyMesh.visible = false;
    }
    canvas.dataset.frameIndex = String(frameIndex);
    canvas.dataset.frameKind = frame.kind;
    canvas.dataset.terrainSampleChecksum = terrainBuffer.sampleChecksum;
    canvas.dataset.terrainTopologyChecksum = terrainBuffer.topologyChecksum;
    canvas.dataset.trafficChecksum =
      terrainBuffer.witness.producerTrafficFieldChecksum;
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
  const depthBits = renderer
    .getContext()
    .getParameter(renderer.getContext().DEPTH_BITS) as number;
  const terrainTriangleCount =
    (firstTerrain.gridResolution.x - 1) *
    (firstTerrain.gridResolution.z - 1) *
    2;

  const createReceipt = (
    operatorPlayCount: number,
  ): FullHillOneRendererReceipt => {
    const canvasCount = stage.querySelectorAll('canvas').length;
    const visibleSvgCount = [...stage.querySelectorAll('svg')].filter(
      (svg) =>
        !svg.hasAttribute('hidden') && getComputedStyle(svg).display !== 'none',
    ).length;
    const hillHistoryRetained =
      fullHillSource.buffers[16]?.witness.producerTrafficFieldChecksum ===
      fullHillSource.buffers[17]?.witness.producerTrafficFieldChecksum;
    if (
      canvasCount !== 1 ||
      visibleSvgCount !== 0 ||
      operatorPlayCount !== 1 ||
      !hillHistoryRetained
    ) {
      throw new Error(
        'full-Hill completion cannot close with split presentation, autoplay, or lost history',
      );
    }
    const receipt: FullHillOneRendererReceipt = {
      schema: FULL_HILL_ONE_RENDERER_SCHEMA,
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
      terrain: {
        schema: HILL_OF_HILLS_TERRAIN_BUFFER_SCHEMA,
        gridResolution: { ...firstTerrain.gridResolution },
        sampleCount: firstTerrain.sampleCount,
        triangleCount: terrainTriangleCount,
        indexOrder: 'z-major-two-triangles-per-cell',
        frameCount: fullHillSource.buffers.length,
        frames: fullHillSource.replay.frames.map((frame, index) => {
          const buffer = fullHillSource.buffers[index];
          if (!buffer) throw new Error(`full-Hill buffer ${index} is missing`);
          requireFullHillSourceEnvelope(buffer);
          return {
            index,
            kind: frame.kind,
            timestampMs: frame.timestampMs,
            prefixSampleCount: frame.prefixSampleCount,
            frameId: buffer.source.frameId,
            source: {
              authority: buffer.source.authority,
              route: buffer.source.route,
              frameId: buffer.source.frameId,
              timestampMs: buffer.source.timestampMs,
              backend: buffer.source.backend,
              configId: buffer.source.configId,
              fallbackStatus: buffer.witness.fallbackStatus,
            },
            sampleChecksum: buffer.sampleChecksum,
            topologyChecksum: buffer.topologyChecksum,
            proxyMaterialChecksum: buffer.proxyMaterialChecksum,
            surfaceDetailChecksum: buffer.surfaceDetailChecksum,
            materialEdgeChecksum: buffer.materialEdgeChecksum,
            trafficChecksum: buffer.witness.producerTrafficFieldChecksum,
            producerTraffic: {
              fieldChecksum: buffer.witness.producerTrafficFieldChecksum,
              admittedEpisodeCount:
                buffer.witness.producerTrafficAdmittedEpisodeCount,
              exposureSeconds:
                buffer.witness.producerTrafficExposureSeconds,
            },
            topologyPossibilityChecksum:
              buffer.witness.topologyPossibilityChecksum,
            supportFrame: {
              supportClass: buffer.witness.supportFrame.supportClass,
              mappingMode: buffer.witness.supportFrame.mappingMode,
              supportEpoch: buffer.witness.supportFrame.supportEpoch,
              topologyEpoch: buffer.witness.supportFrame.topologyEpoch,
              checksum:
                buffer.witness.supportFrame.supportFrameChecksum,
            },
          };
        }),
      },
      carrier: {
        identity: '719024',
        bodySha256: EXACT_3D_CARRIER_BODY_SHA256,
        visiblePrefixFrameCount: samples.length,
        departed: true,
      },
      playback: {
        initialState: 'paused',
        operatorPlayCount,
        autoplayObserved: false,
      },
      departure: {
        bodyVisible: false,
        hillHistoryRetained,
        trafficChecksum:
          fullHillSource.buffers[17]?.witness.producerTrafficFieldChecksum ?? '',
      },
    };
    return validateFullHillOneRendererReceipt(receipt);
  };

  stage.dataset.carrierAssetSha256 = bodySha256;
  stage.dataset.carrierRegistrationSha256 = registrationSha256;
  stage.dataset.railModuleSha256 = railModuleSha256;
  stage.dataset.railHistorySha256 = railHistorySha256;
  stage.dataset.effectiveRailId = EXACT_3D_CARRIER_RAIL_ID;
  stage.dataset.terrainSampleCount = String(firstTerrain.sampleCount);
  stage.dataset.terrainTriangleCount = String(terrainTriangleCount);

  return {
    frames: fullHillSource.replay.frames,
    samples,
    renderFrame,
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
      railRootPosition: sampled.position,
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

type VerifiedFullHillBuffer = HillOfHillsTerrainBuffer & {
  source: HillOfHillsTerrainBuffer['source'] & {
    authority: typeof FULL_HILL_SOURCE_AUTHORITY;
    route: typeof FULL_HILL_SOURCE_ROUTE;
    backend: typeof FULL_HILL_SOURCE_BACKEND;
    configId: typeof FULL_HILL_SOURCE_CONFIG;
  };
  witness: HillOfHillsTerrainBuffer['witness'] & {
    fallbackStatus: 'none';
  };
};

function requireFullHillSourceEnvelope(
  buffer: HillOfHillsTerrainBuffer,
): asserts buffer is VerifiedFullHillBuffer {
  if (
    buffer.source.authority !== FULL_HILL_SOURCE_AUTHORITY ||
    buffer.source.route !== FULL_HILL_SOURCE_ROUTE ||
    buffer.source.backend !== FULL_HILL_SOURCE_BACKEND ||
    buffer.source.configId !== FULL_HILL_SOURCE_CONFIG ||
    buffer.witness.fallbackStatus !== 'none'
  ) {
    throw new Error(
      `full-Hill source envelope is substituted for frame ${buffer.source.frameId}`,
    );
  }
}

async function sha256(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
}
