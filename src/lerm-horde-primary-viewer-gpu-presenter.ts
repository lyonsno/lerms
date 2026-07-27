import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

import type { LermHordePrimaryViewerActorFrame } from './lerm-horde-primary-viewer-actor-frame.js';
import type { HillPrimaryViewerActorDrawFrame } from './terrain/hill-primary-viewer-actor-host.js';

export const LERM_HORDE_INDEXED_GPU_PRESENTER_ROUTE =
  'lerms/lerm-horde/indexed-textured-axial-gpu-v0' as const;
export const LERM_HORDE_SPECIES_REGISTRATION_SHA256 =
  'cb519913ad863441e88555b3d9fbd588ffef03650475de07c29ee1c71f500ff6' as const;
export const LERM_HORDE_SPECIES_VERTEX_COUNT = 148_118 as const;
export const LERM_HORDE_SPECIES_FACE_COUNT = 188_385 as const;

const INSTANCE_SCALE = 1.14;
const LOCAL_TO_ROOT = new THREE.Vector3(
  -0.00005459785461425781,
  0.2068822681903839,
  -0.00026826560497283936,
);
const TAIL_Z = 0.47;
const HEAD_Z = -0.47;
const AXIAL_SPAN = TAIL_Z - HEAD_Z;

export interface LermHordeIndexedGpuPresenterIdentity {
  route: typeof LERM_HORDE_INDEXED_GPU_PRESENTER_ROUTE;
  vertexCount: typeof LERM_HORDE_SPECIES_VERTEX_COUNT;
  faceCount: typeof LERM_HORDE_SPECIES_FACE_COUNT;
  indexed: true;
  textured: true;
  deformer: 'axial-parallel-transport-wave-v1';
  terrainSupportStationCount: 7;
}

export interface LermHordeIndexedGpuPresenter {
  readonly identity: LermHordeIndexedGpuPresenterIdentity;
  readonly lastPresentation:
    | LermHordeIndexedGpuPresentationReceipt
    | null;
  present(
    frame: HillPrimaryViewerActorDrawFrame,
    actorFrame: LermHordePrimaryViewerActorFrame,
  ): void;
}

export const LERM_HORDE_INDEXED_GPU_PRESENTER_IDENTITY: LermHordeIndexedGpuPresenterIdentity =
  {
    route: LERM_HORDE_INDEXED_GPU_PRESENTER_ROUTE,
    vertexCount: LERM_HORDE_SPECIES_VERTEX_COUNT,
    faceCount: LERM_HORDE_SPECIES_FACE_COUNT,
    indexed: true,
    textured: true,
    deformer: 'axial-parallel-transport-wave-v1',
    terrainSupportStationCount: 7,
  };

export interface LermHordeIndexedGpuPresentationReceipt {
  identity: LermHordeIndexedGpuPresenterIdentity;
  drawCount: number;
  terrainFrameId: string;
  sourceDistance: number;
  phase: number;
  rootScreen: {
    x: number;
    y: number;
    depth: number;
  };
  cpuSubmitMilliseconds: number;
}

export async function createLermHordeIndexedGpuPresenter(
  bodyBytes: ArrayBuffer,
): Promise<LermHordeIndexedGpuPresenter> {
  const gltf = await new GLTFLoader().parseAsync(
    bodyBytes,
    '/vendor/kaminos-6217fff8/artifacts/',
  );
  gltf.scene.updateMatrixWorld(true);
  const sourceMeshes: THREE.Mesh[] = [];
  gltf.scene.traverse((object) => {
    if (object instanceof THREE.Mesh) sourceMeshes.push(object);
  });
  requirePresenter(
    sourceMeshes.length === 1,
    'terrain-glued species package requires exactly one mesh primitive',
  );
  const sourceMesh = sourceMeshes[0];
  const geometry = sourceMesh.geometry.clone();
  geometry.applyMatrix4(sourceMesh.matrixWorld);
  const position = geometry.getAttribute('position');
  const normal = geometry.getAttribute('normal');
  const uv = geometry.getAttribute('uv');
  const index = geometry.getIndex();
  requirePresenter(
    position?.count === LERM_HORDE_SPECIES_VERTEX_COUNT &&
      normal?.count === LERM_HORDE_SPECIES_VERTEX_COUNT &&
      uv?.count === LERM_HORDE_SPECIES_VERTEX_COUNT &&
      index?.count === LERM_HORDE_SPECIES_FACE_COUNT * 3,
    'terrain-glued species geometry is not the admitted indexed UV mesh',
  );
  requirePresenter(
    sourceMesh.material instanceof THREE.MeshStandardMaterial &&
      sourceMesh.material.map instanceof THREE.Texture &&
      sourceMesh.material.metalnessMap instanceof THREE.Texture,
    'terrain-glued species package is missing its embedded PBR maps',
  );

  const canvas = document.createElement('canvas');
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    premultipliedAlpha: true,
    preserveDrawingBuffer: false,
  });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const uniforms = {
    baseColorMap: { value: sourceMesh.material.map },
    metallicRoughnessMap: {
      value: sourceMesh.material.metalnessMap,
    },
    localToRoot: { value: LOCAL_TO_ROOT },
    instanceScale: { value: INSTANCE_SCALE },
    tailZ: { value: TAIL_Z },
    headZ: { value: HEAD_Z },
    axialSpan: { value: AXIAL_SPAN },
    waveAmplitude: { value: 0 },
    verticalAmplitude: { value: 0 },
    phase: { value: 0 },
    supportProfileCount: { value: 0 },
    supportProfile: {
      value: Array.from({ length: 7 }, () => new THREE.Vector2()),
    },
    rootOrigin: { value: new THREE.Vector3() },
    rootLateral: { value: new THREE.Vector3(1, 0, 0) },
    rootNormal: { value: new THREE.Vector3(0, 1, 0) },
    rootTangent: { value: new THREE.Vector3(0, 0, 1) },
    viewport: { value: new THREE.Vector2(1, 1) },
    viewYaw: { value: 0 },
    viewTilt: { value: 0.72 },
    viewZoom: { value: 1 },
    viewPan: { value: new THREE.Vector2() },
    terrainLength: { value: 15 },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    transparent: true,
    depthTest: true,
    depthWrite: true,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  const scene = new THREE.Scene();
  scene.add(mesh);
  const camera = new THREE.Camera();

  const identity = LERM_HORDE_INDEXED_GPU_PRESENTER_IDENTITY;
  let drawCount = 0;
  let lastPresentation:
    | LermHordeIndexedGpuPresentationReceipt
    | null = null;

  return {
    identity,
    get lastPresentation() {
      return lastPresentation;
    },
    present(frame, actorFrame) {
      const pose = actorFrame.pose;
      requirePresenter(
        pose !== null && actorFrame.lifecycle.visible,
        'indexed GPU presenter cannot draw a departed actor',
      );
      const profile = pose.squirm.terrainSupportProfile;
      requirePresenter(
        profile.length === identity.terrainSupportStationCount &&
          profile.every(
            (sample, index) =>
              Number.isFinite(sample.t) &&
              Number.isFinite(sample.localOffset) &&
              Math.abs(sample.t - index / (profile.length - 1)) < 1e-6,
          ),
        'indexed GPU presenter requires the exact seven-station current-Hill support profile',
      );

      const { width, height, pixelRatio } = frame.viewport;
      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(width, height, false);
      uniforms.viewport.value.set(width, height);
      uniforms.viewYaw.value = frame.view.yaw;
      uniforms.viewTilt.value = frame.view.tilt;
      uniforms.viewZoom.value = frame.view.zoom;
      uniforms.viewPan.value.set(frame.view.panX, frame.view.panY);
      uniforms.terrainLength.value = pose.projection.terrainLength;
      uniforms.waveAmplitude.value = pose.squirm.amplitude;
      uniforms.verticalAmplitude.value =
        pose.squirm.verticalAmplitude;
      uniforms.phase.value = pose.squirm.phase;
      uniforms.supportProfileCount.value = profile.length;
      for (let index = 0; index < 7; index += 1) {
        uniforms.supportProfile.value[index].set(
          profile[index].t,
          profile[index].localOffset,
        );
      }
      setVector(uniforms.rootOrigin.value, pose.rootFrame.origin);
      setVector(uniforms.rootLateral.value, pose.rootFrame.lateral);
      setVector(uniforms.rootNormal.value, pose.rootFrame.normal);
      setVector(uniforms.rootTangent.value, pose.rootFrame.tangent);

      const rootScreen = frame.project(pose.rootFrame.origin);
      const submitStart = performance.now();
      renderer.render(scene, camera);
      const cpuSubmitMilliseconds = performance.now() - submitStart;
      frame.surface.context.drawImage(canvas, 0, 0, width, height);
      drawCount += 1;
      lastPresentation = {
        identity,
        drawCount,
        terrainFrameId: actorFrame.terrain.frameId,
        sourceDistance: pose.sourceDistance,
        phase: pose.squirm.phase,
        rootScreen,
        cpuSubmitMilliseconds,
      };
    },
  };
}

function setVector(
  target: THREE.Vector3,
  source: { x: number; y: number; z: number },
): void {
  target.set(source.x, source.y, source.z);
}

function requirePresenter(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) throw new Error(message);
}

const VERTEX_SHADER = /* glsl */ `
uniform vec3 localToRoot;
uniform float instanceScale;
uniform float tailZ;
uniform float headZ;
uniform float axialSpan;
uniform float waveAmplitude;
uniform float verticalAmplitude;
uniform float phase;
uniform int supportProfileCount;
uniform vec2 supportProfile[7];
uniform vec3 rootOrigin;
uniform vec3 rootLateral;
uniform vec3 rootNormal;
uniform vec3 rootTangent;
uniform vec2 viewport;
uniform float viewYaw;
uniform float viewTilt;
uniform float viewZoom;
uniform vec2 viewPan;
uniform float terrainLength;

varying vec2 creatureUv;
varying vec3 creatureNormal;

float supportOffsetAt(float t) {
  if (supportProfileCount == 0) return 0.0;
  float nt = clamp(t, 0.0, 1.0);
  for (int index = 0; index < 6; index += 1) {
    if (index >= supportProfileCount - 1) break;
    vec2 start = supportProfile[index];
    vec2 end = supportProfile[index + 1];
    if (nt <= end.x || index == supportProfileCount - 2) {
      float mixT = clamp(
        (nt - start.x) / max(1e-8, end.x - start.x),
        0.0,
        1.0
      );
      return mix(start.y, end.y, mixT);
    }
  }
  return supportProfile[supportProfileCount - 1].y;
}

float axialEnvelope(float t) {
  return 0.3 + 0.7 * pow(max(0.0, sin(3.14159265358979 * t)), 0.72);
}

vec3 axialCenter(float t) {
  float nt = clamp(t, 0.0, 1.0);
  float waveAngle = phase - nt * 3.14159265358979 * 2.25;
  float envelope = axialEnvelope(nt);
  return vec3(
    waveAmplitude * envelope * sin(waveAngle),
    supportOffsetAt(nt) +
      verticalAmplitude * envelope *
      (0.5 + 0.5 * cos(waveAngle - 0.35)),
    mix(tailZ, headZ, nt)
  );
}

vec3 safeNormalize(vec3 value, vec3 fallback) {
  float magnitude = length(value);
  return magnitude <= 1e-8 ? fallback : value / magnitude;
}

void main() {
  float t = clamp((tailZ - position.z) / axialSpan, 0.0, 1.0);
  float restCenterZ = mix(tailZ, headZ, t);
  float signedAxialResidual = restCenterZ - position.z;
  vec3 before = axialCenter(clamp(t - 1e-4, 0.0, 1.0));
  vec3 after = axialCenter(clamp(t + 1e-4, 0.0, 1.0));
  vec3 tangentHeadward = safeNormalize(
    after - before,
    vec3(0.0, 0.0, -1.0)
  );
  vec3 right = safeNormalize(
    cross(tangentHeadward, vec3(0.0, 1.0, 0.0)),
    vec3(1.0, 0.0, 0.0)
  );
  vec3 up = safeNormalize(
    cross(right, tangentHeadward),
    vec3(0.0, 1.0, 0.0)
  );
  vec3 local = axialCenter(t) +
    right * position.x +
    up * position.y +
    tangentHeadward * signedAxialResidual;
  vec3 localNormal = safeNormalize(
    right * normal.x +
    up * normal.y -
    tangentHeadward * normal.z,
    vec3(0.0, 1.0, 0.0)
  );
  local = (local + localToRoot) * instanceScale;
  vec3 world = rootOrigin +
    rootLateral * local.x +
    rootNormal * local.y +
    rootTangent * local.z;
  creatureNormal = normalize(
    rootLateral * localNormal.x +
    rootNormal * localNormal.y +
    rootTangent * localNormal.z
  );
  creatureUv = uv;

  float yawCos = cos(viewYaw);
  float yawSin = sin(viewYaw);
  float rotatedX = world.x * yawCos - world.z * yawSin;
  float rotatedZ = world.x * yawSin + world.z * yawCos;
  float zn = (rotatedZ + terrainLength * 0.5) / terrainLength;
  float perspective = (0.42 + (1.0 - zn) * 0.5) * viewZoom;
  float scaleX = min(viewport.x / 16.0, viewport.y / 11.0) * perspective;
  float screenX = viewport.x * (0.5 + viewPan.x) + rotatedX * scaleX;
  float screenY = viewport.y * (0.9 + viewPan.y) -
    zn * viewport.y * 0.68 * viewTilt -
    world.y * 42.0 * perspective;
  float clipX = screenX / viewport.x * 2.0 - 1.0;
  float clipY = 1.0 - screenY / viewport.y * 2.0;
  float clipZ = clamp(zn * 2.0 - 1.0, -1.0, 1.0);
  gl_Position = vec4(clipX, clipY, clipZ, 1.0);
}
`;

const FRAGMENT_SHADER = /* glsl */ `
uniform sampler2D baseColorMap;
uniform sampler2D metallicRoughnessMap;

varying vec2 creatureUv;
varying vec3 creatureNormal;

void main() {
  vec4 base = texture2D(baseColorMap, creatureUv);
  vec3 mr = texture2D(metallicRoughnessMap, creatureUv).rgb;
  vec3 normal = normalize(creatureNormal);
  vec3 light = normalize(vec3(-0.35, 0.82, -0.45));
  float wrapped = clamp((dot(normal, light) + 0.38) / 1.38, 0.0, 1.0);
  float roughness = clamp(mr.g, 0.04, 1.0);
  float metallic = mr.b;
  vec3 ambient = base.rgb * (0.34 + 0.22 * max(normal.y, 0.0));
  vec3 diffuse = base.rgb * wrapped * vec3(1.12, 1.02, 0.86) *
    (1.0 - metallic * 0.45);
  vec3 sheen = mix(vec3(0.05), base.rgb * 0.24, metallic) *
    (1.0 - roughness);
  gl_FragColor = vec4(ambient + diffuse + sheen, base.a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;
