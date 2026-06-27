import * as THREE from 'three';

import type {
  SchnozRenderGoin,
  SchnozRenderLerm,
  SchnozSimulationSnapshot,
  SchnozTimelineFrame,
} from './schnoz-lerm-simulation-core.ts';
import type { Vec3 } from './contracts/first-vertical.ts';

// main.ts calls buildSchnozSimulationSnapshot before entering this route; this
// module owns the Three.js ground-plane display for that shared snapshot.
const SCHNOZ_3D_SNAPSHOT_SOURCE = 'buildSchnozSimulationSnapshot';

type Schnoz3dSmokeOptions = {
  snapshot: SchnozSimulationSnapshot;
  host: HTMLElement;
  witnessPanel: HTMLElement;
  hiddenCanvas: HTMLCanvasElement;
};

type SceneActors = {
  lerms: THREE.Group;
  goins: THREE.Group;
  effects: THREE.Group;
  hoard: THREE.Group;
};

export function initSchnoz3dSmoke({
  snapshot,
  host,
  witnessPanel,
  hiddenCanvas,
}: Schnoz3dSmokeOptions): void {
  hiddenCanvas.style.display = 'none';

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setClearColor(0x071116, 1);
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.domElement.id = 'lerms-schnoz-3d-canvas';
  renderer.domElement.dataset.route = 'schnoz-3d-ground-plane';
  Object.assign(renderer.domElement.style, {
    position: 'fixed',
    inset: '0',
    width: '100vw',
    height: '100vh',
    display: 'block',
  });
  host.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x071116, 5.5, 15);

  const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 80);
  camera.position.set(0.1, 4.2, 6.4);
  camera.lookAt(0, 0.25, 0);

  const actors: SceneActors = {
    lerms: new THREE.Group(),
    goins: new THREE.Group(),
    effects: new THREE.Group(),
    hoard: new THREE.Group(),
  };

  scene.add(makeGroundPlane());
  scene.add(makePathRails());
  scene.add(actors.hoard);
  scene.add(actors.goins);
  scene.add(actors.lerms);
  scene.add(actors.effects);
  scene.add(new THREE.HemisphereLight(0xb8f6ff, 0x16301d, 2.2));

  const key = new THREE.DirectionalLight(0xffe2aa, 2.1);
  key.position.set(-2.4, 5.2, 3.8);
  scene.add(key);

  buildHoard(actors.hoard);

  const resize = (): void => {
    const width = Math.max(1, window.innerWidth);
    const height = Math.max(1, window.innerHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  resize();
  window.addEventListener('resize', resize);

  const animate = (timestampMs: number): void => {
    const cycleMs = 4200;
    const framePosition = ((timestampMs % cycleMs) / cycleMs) * snapshot.timeline.length;
    const frameIndex = Math.floor(framePosition) % snapshot.timeline.length;
    const nextFrameIndex = (frameIndex + 1) % snapshot.timeline.length;
    const frameBlend = framePosition - Math.floor(framePosition);
    const frame = snapshot.timeline[frameIndex];
    const nextFrame = snapshot.timeline[nextFrameIndex];
    renderFrame3d(actors, frame, nextFrame, frameBlend, timestampMs);
    camera.position.x = Math.sin(timestampMs * 0.00022) * 0.32;
    camera.lookAt(0, 0.32, 0);
    renderer.render(scene, camera);

    const liveState = {
      schema: 'lerms.schnoz-3d-smoke-state.v0',
      route: 'browser/?schnoz_3d=1',
      alternateRoute: 'browser/?schnoz_sim=3d',
      display: 'three.js ground-plane schnoz spheres',
      snapshotSource: SCHNOZ_3D_SNAPSHOT_SOURCE,
      frameIndex,
      frameLabel: frame.label,
      events: frame.events,
      proxyBody: snapshot.proxyBody,
      sourceTruthUpgrade: snapshot.sourceTruthUpgrade,
      motionAdapter: frame.lerms[0]?.motionAdapter || null,
      actors: frame.lerms.map((lerm) => ({
        id: lerm.id,
        state: lerm.state,
        motionAdapterSchema: lerm.motionAdapter?.schema || null,
        sourceCliplet: lerm.motionAdapter?.source.clipletLabel || null,
      })),
    };
    (window as unknown as { __lermsSchnoz3dSmokeState?: typeof liveState }).__lermsSchnoz3dSmokeState = liveState;

    witnessPanel.textContent = [
      'Schnoz lerm 3D smoke',
      'route: browser/?schnoz_3d=1',
      'display: Three.js ground-plane',
      `source-truth: ${snapshot.sourceTruthUpgrade.accepted ? 'accepted' : 'blocked'} (${snapshot.sourceTruthUpgrade.effectiveAuthority})`,
      `frame: ${frameIndex} ${frame.label} / ${frame.events.join(', ')}`,
      `adapter: ${frame.lerms[0]?.motionAdapter?.schema || 'missing'} / ${frame.lerms[0]?.motionAdapter?.source.clipletLabel || 'no cliplet'}`,
      'body: proxy_schnoz_sphere / final red-lerm visual claim: false',
    ].join('\n');

    window.requestAnimationFrame(animate);
  };

  window.requestAnimationFrame(animate);
}

function renderFrame3d(
  actors: SceneActors,
  frame: SchnozTimelineFrame,
  nextFrame: SchnozTimelineFrame,
  blend: number,
  timestampMs: number,
): void {
  actors.lerms.clear();
  actors.goins.clear();
  actors.effects.clear();

  for (const goin of frame.goins) {
    const next = nextFrame.goins.find((candidate) => candidate.id === goin.id);
    actors.goins.add(makeGoinMesh(goin, next, blend, timestampMs));
  }

  for (const lerm of frame.lerms) {
    const next = nextFrame.lerms.find((candidate) => candidate.id === lerm.id);
    actors.lerms.add(makeSchnozLermMesh(lerm, next, blend));
  }

  if (frame.hitFlash) {
    const point = worldToGround(frame.hitFlash.world);
    const hit = new THREE.Mesh(
      new THREE.SphereGeometry(frame.hitFlash.radius * 0.55, 16, 10),
      new THREE.MeshBasicMaterial({ color: 0x65d9ff, transparent: true, opacity: 0.42 })
    );
    hit.position.set(point.x, 0.55, point.z);
    hit.scale.setScalar(1 + Math.sin(timestampMs * 0.02) * 0.18);
    actors.effects.add(hit);
  }

  if (frame.reroute) {
    const from = worldToGround(frame.reroute.from);
    const to = worldToGround(frame.reroute.to);
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(from.x, 0.12, from.z),
      new THREE.Vector3((from.x + to.x) * 0.5, 0.55, (from.z + to.z) * 0.5),
      new THREE.Vector3(to.x, 0.12, to.z),
    ]);
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(curve.getPoints(24)),
      new THREE.LineBasicMaterial({ color: 0xbe77ff, transparent: true, opacity: 0.9 })
    );
    actors.effects.add(line);
  }
}

function makeSchnozLermMesh(
  lerm: SchnozRenderLerm,
  next: SchnozRenderLerm | undefined,
  blend: number,
): THREE.Group {
  const channels = lerm.motionAdapter?.channels;
  const base = interpolateWorld(lerm.world, next?.world, blend);
  const world: Vec3 = channels
    ? [
        base[0] + channels.rootOffset[0],
        base[1] + channels.rootOffset[1],
        base[2] + channels.rootOffset[2],
      ]
    : base;
  const point = worldToGround(world);
  const group = new THREE.Group();
  group.name = `proxy_schnoz_sphere-${lerm.id}`;
  group.userData.motionAdapter = lerm.motionAdapter || null;
  group.position.set(point.x, 0.26 + world[1] * 0.14, point.z);

  const body = new THREE.Mesh(
    new THREE.SphereGeometry(0.23, 24, 16),
    new THREE.MeshStandardMaterial({
      color: lerm.state === 'hit_reacting' || lerm.state === 'tumbling' ? 0xd92751 : 0xde2d3a,
      roughness: 0.5,
      metalness: 0.03,
      emissive: 0x36070f,
      emissiveIntensity: 0.32 + (channels?.eventAccent ?? 0) * 0.22,
    })
  );
  body.scale.set(
    channels?.bodyStretch ?? 1,
    channels?.bodySquash ?? 1,
    channels?.envelopeRadius ?? 1,
  );
  body.rotation.z = channels?.bodyLean ?? 0;
  group.add(body);

  const heading = channels?.heading ?? lerm.heading;
  const headingSign = heading[0] >= 0 ? 1 : -1;
  const schnoz = new THREE.Mesh(
    new THREE.SphereGeometry(0.105, 16, 10),
    new THREE.MeshStandardMaterial({ color: 0xf98752, roughness: 0.46 })
  );
  schnoz.position.set(headingSign * (0.22 + (channels?.faceCueLead ?? 0.18) * 0.08), 0.025, 0);
  group.add(schnoz);

  const eye = new THREE.Mesh(
    new THREE.SphereGeometry(0.026 + (channels?.eventAccent ?? 0) * 0.006, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0x101617 })
  );
  eye.position.set(headingSign * 0.31, 0.09, -0.035);
  group.add(eye);

  if (lerm.carryingGoinId) {
    const tether = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018 + (channels?.carrierTetherAccent ?? 0.5) * 0.012, 0.018, 0.48, 8),
      new THREE.MeshBasicMaterial({ color: 0xf1de9e, transparent: true, opacity: 0.72 })
    );
    tether.rotation.z = Math.PI * 0.5;
    tether.position.set(headingSign * 0.32, -0.16, 0.02);
    group.add(tether);
  }

  if (lerm.targetGoinId || lerm.state === 'rerouting_to_goin') {
    const pull = new THREE.Mesh(
      new THREE.TorusGeometry(0.18 + (channels?.rerouteTargetPull ?? 0.6) * 0.06, 0.012, 8, 48),
      new THREE.MeshBasicMaterial({ color: 0xbe77ff, transparent: true, opacity: 0.84 })
    );
    pull.rotation.x = Math.PI * 0.5;
    pull.position.set(headingSign * 0.32, 0.02, 0);
    group.add(pull);
  }

  return group;
}

function makeGoinMesh(
  goin: SchnozRenderGoin,
  next: SchnozRenderGoin | undefined,
  blend: number,
  timestampMs: number,
): THREE.Object3D {
  const world = interpolateWorld(goin.world, next?.world, blend);
  const point = worldToGround(world);
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(goin.state === 'rolling' ? 0.16 : 0.13, 18, 12),
    new THREE.MeshStandardMaterial({ color: 0xefbe44, roughness: 0.38, metalness: 0.12 })
  );
  mesh.name = `goin-${goin.id}`;
  mesh.position.set(point.x, 0.14 + world[1] * 0.08, point.z);
  if (goin.state === 'rolling') mesh.rotation.z = timestampMs * 0.006;
  return mesh;
}

function makeGroundPlane(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'ground-plane';
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(7.5, 5.2, 1, 1),
    new THREE.MeshStandardMaterial({ color: 0x1b5537, roughness: 0.82 })
  );
  ground.rotation.x = -Math.PI / 2;
  group.add(ground);

  const grid = new THREE.GridHelper(7.5, 14, 0xf0d876, 0x2d8052);
  grid.position.y = 0.012;
  group.add(grid);
  return group;
}

function makePathRails(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'schnoz-ground-plane-path-rails';
  const material = new THREE.LineBasicMaterial({ color: 0x49a96f, transparent: true, opacity: 0.5 });
  for (let rail = -2; rail <= 2; rail += 1) {
    const points = [
      new THREE.Vector3(-3.2, 0.025, rail * 0.42 - 0.4),
      new THREE.Vector3(-0.6, 0.025, rail * 0.34 - 0.18),
      new THREE.Vector3(2.8, 0.025, rail * 0.25 + 0.18),
    ];
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material));
  }
  return group;
}

function buildHoard(group: THREE.Group): void {
  group.name = 'glove-wealth-hoard-source';
  const material = new THREE.MeshStandardMaterial({ color: 0xefbe44, roughness: 0.35, metalness: 0.18 });
  for (let index = 0; index < 10; index += 1) {
    const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.035, 18), material);
    coin.rotation.x = Math.PI * 0.5;
    coin.position.set(2.2 + (index % 4) * 0.12, 0.08 + Math.floor(index / 4) * 0.035, -0.28 + (index % 3) * 0.1);
    group.add(coin);
  }
}

function worldToGround(world: Vec3): { x: number; z: number } {
  return {
    x: world[0] * 1.1,
    z: world[2] * 1.4,
  };
}

function interpolateWorld(current: Vec3, next: Vec3 | undefined, blend: number): Vec3 {
  if (!next) return current;
  const eased = blend * blend * (3 - 2 * blend);
  return [
    current[0] + (next[0] - current[0]) * eased,
    current[1] + (next[1] - current[1]) * eased,
    current[2] + (next[2] - current[2]) * eased,
  ];
}
