import {
  createHillOfHillsTerrain,
  defaultHillOfHillsParams,
  type HillOfHillsTerrain,
  type HillOfHillsTerrainParams,
  type HillOfHillsTerrainSample
} from './terrain/hill-of-hills.js';

const canvas = document.getElementById('lerms-canvas') as HTMLCanvasElement | null;

if (!canvas) {
  throw new Error('missing lerms canvas');
}

const context = canvas.getContext('2d');

if (!context) {
  throw new Error('2d canvas unavailable');
}

const appCanvas = canvas;
const ctx = context;
let params: HillOfHillsTerrainParams = {
  ...defaultHillOfHillsParams,
  gridResolutionX: 116,
  gridResolutionZ: 148
};
let terrain = createHillOfHillsTerrain(params);

interface ControlSpec {
  key: keyof HillOfHillsTerrainParams;
  label: string;
  min: number;
  max: number;
  step: number;
}

const controlSpecs: readonly ControlSpec[] = [
  { key: 'channelRadius', label: 'Channel radius', min: 3, max: 8, step: 0.1 },
  { key: 'channelCurvature', label: 'Curvature', min: 0.35, max: 2.7, step: 0.05 },
  { key: 'wallHeight', label: 'Wall height', min: 0.4, max: 5.2, step: 0.1 },
  { key: 'floorWidth', label: 'Floor width', min: 1.2, max: 6.2, step: 0.1 },
  { key: 'hillRadius', label: 'Hill radius', min: 0.5, max: 3.2, step: 0.05 },
  { key: 'hillHeight', label: 'Hill height', min: 0, max: 2.4, step: 0.05 },
  { key: 'hillVariance', label: 'Hill variance', min: 0, max: 1.35, step: 0.05 },
  { key: 'valleyRadius', label: 'Valley radius', min: 0.5, max: 3.2, step: 0.05 },
  { key: 'valleyHeight', label: 'Valley height', min: 0, max: 2.2, step: 0.05 },
  { key: 'valleyVariance', label: 'Valley variance', min: 0, max: 1.35, step: 0.05 },
  { key: 'distanceScale', label: 'Distance scale', min: 0.45, max: 2.4, step: 0.05 },
  { key: 'textureDamping', label: 'Texture damping', min: 0, max: 1, step: 0.05 },
  { key: 'detailDamping', label: 'Detail damping', min: 0, max: 1, step: 0.05 }
];

const controls = createControls();
const witnessPanel = createWitnessPanel();

document.body.append(controls.element, witnessPanel);

function resize(): void {
  const dpr = window.devicePixelRatio || 1;
  appCanvas.width = Math.max(1, Math.floor(window.innerWidth * dpr));
  appCanvas.height = Math.max(1, Math.floor(window.innerHeight * dpr));
  appCanvas.style.width = '100vw';
  appCanvas.style.height = '100vh';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function render(timestampMs: number): void {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const motion = Math.sin(timestampMs * 0.00008) * 0.18;
  terrain = createHillOfHillsTerrain(
    {
      ...params,
      crownZ: defaultHillOfHillsParams.crownZ + motion
    },
    {
      timestampMs,
      frameId: `hill-of-hills-preview-${Math.floor(timestampMs)}`,
      sampleAgeMs: 0
    }
  );

  ctx.fillStyle = '#06100d';
  ctx.fillRect(0, 0, width, height);
  drawTerrain(terrain, width, height);
  drawRouteMarkers(width, height);
  drawWitness(terrain);

  window.requestAnimationFrame(render);
}

resize();
window.addEventListener('resize', resize);
window.requestAnimationFrame(render);

function drawTerrain(currentTerrain: HillOfHillsTerrain, width: number, height: number): void {
  const { gridResolutionX, gridResolutionZ } = currentTerrain.params;
  const samples = currentTerrain.samples;

  for (let zi = gridResolutionZ - 2; zi >= 0; zi -= 1) {
    for (let xi = 0; xi < gridResolutionX - 1; xi += 1) {
      const a = samples[zi * gridResolutionX + xi];
      const b = samples[zi * gridResolutionX + xi + 1];
      const c = samples[(zi + 1) * gridResolutionX + xi + 1];
      const d = samples[(zi + 1) * gridResolutionX + xi];
      const pa = project(a.world[0], a.world[1], a.world[2], currentTerrain, width, height);
      const pb = project(b.world[0], b.world[1], b.world[2], currentTerrain, width, height);
      const pc = project(c.world[0], c.world[1], c.world[2], currentTerrain, width, height);
      const pd = project(d.world[0], d.world[1], d.world[2], currentTerrain, width, height);
      const averageHeight = (a.height + b.height + c.height + d.height) * 0.25;
      const averageNormal: readonly [number, number, number] = [
        (a.normal[0] + b.normal[0] + c.normal[0] + d.normal[0]) * 0.25,
        (a.normal[1] + b.normal[1] + c.normal[1] + d.normal[1]) * 0.25,
        (a.normal[2] + b.normal[2] + c.normal[2] + d.normal[2]) * 0.25
      ];

      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
      ctx.lineTo(pc.x, pc.y);
      ctx.lineTo(pd.x, pd.y);
      ctx.closePath();
      ctx.fillStyle = colorForSample(a, averageHeight, averageNormal, currentTerrain.witness.heightRange);
      ctx.fill();
    }
  }

  drawTopologyOverlays(currentTerrain, width, height);

  ctx.strokeStyle = 'rgba(248, 233, 166, 0.1)';
  ctx.lineWidth = 1;
  for (let xi = 0; xi < gridResolutionX; xi += 8) {
    ctx.beginPath();
    for (let zi = 0; zi < gridResolutionZ; zi += 1) {
      const sample = samples[zi * gridResolutionX + xi];
      const point = project(sample.world[0], sample.world[1], sample.world[2], currentTerrain, width, height);
      if (zi === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    }
    ctx.stroke();
  }
}

function drawTopologyOverlays(currentTerrain: HillOfHillsTerrain, width: number, height: number): void {
  const { gridResolutionX, gridResolutionZ } = currentTerrain.params;
  const samples = currentTerrain.samples;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (let zi = 2; zi < gridResolutionZ - 2; zi += 4) {
    ctx.beginPath();
    let drawing = false;
    for (let xi = 1; xi < gridResolutionX - 1; xi += 1) {
      const sample = samples[zi * gridResolutionX + xi];
      if (sample.topology.ditchPotential < 0.62) {
        drawing = false;
        continue;
      }
      const point = project(sample.world[0], sample.world[1] + 0.035, sample.world[2], currentTerrain, width, height);
      if (!drawing) {
        ctx.moveTo(point.x, point.y);
        drawing = true;
      } else {
        ctx.lineTo(point.x, point.y);
      }
    }
    ctx.strokeStyle = 'rgba(30, 22, 54, 0.48)';
    ctx.lineWidth = 3.2;
    ctx.stroke();
  }

  for (let zi = 4; zi < gridResolutionZ - 4; zi += 7) {
    for (let xi = 4; xi < gridResolutionX - 4; xi += 7) {
      const sample = samples[zi * gridResolutionX + xi];
      if (sample.topology.growthPotential < 0.62) {
        continue;
      }
      const point = project(sample.world[0], sample.world[1] + 0.12, sample.world[2], currentTerrain, width, height);
      const radius = 1.8 + sample.topology.growthPotential * 3.2;
      ctx.fillStyle = `rgba(42, 111, 63, ${0.2 + sample.topology.growthPotential * 0.34})`;
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

function drawRouteMarkers(width: number, height: number): void {
  const crown = project(0, 1.8, terrain.params.crownZ, terrain, width, height);
  const start = project(0, 0.45, -terrain.params.length * 0.45, terrain, width, height);

  ctx.fillStyle = 'rgba(247, 205, 86, 0.95)';
  ctx.beginPath();
  ctx.arc(crown.x, crown.y - 6, 9, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(190, 86, 255, 0.88)';
  for (let i = -2; i <= 2; i += 1) {
    ctx.beginPath();
    ctx.arc(start.x + i * 16, start.y + Math.abs(i) * 3, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function project(
  x: number,
  y: number,
  z: number,
  currentTerrain: HillOfHillsTerrain,
  width: number,
  height: number
): { x: number; y: number } {
  const zn = (z + currentTerrain.params.length * 0.5) / currentTerrain.params.length;
  const perspective = 0.42 + (1 - zn) * 0.5;
  const scaleX = Math.min(width / 16, height / 11) * perspective;
  const screenX = width * 0.5 + x * scaleX;
  const screenY = height * 0.9 - zn * height * 0.68 - y * 42 * perspective;
  return { x: screenX, y: screenY };
}

function colorForSample(
  sample: HillOfHillsTerrainSample,
  heightValue: number,
  normal: readonly [number, number, number],
  range: { min: number; max: number }
): string {
  const t = (heightValue - range.min) / Math.max(0.001, range.max - range.min);
  const sideLight = normal[0] * -0.32 + normal[1] * 0.72 + normal[2] * -0.2;
  const wetShadow = sample.proxyMaterial.wetness * 0.16 + sample.topology.ditchPotential * 0.1;
  const growthLift = sample.proxyMaterial.growthTint * 0.14;
  const routeLift = sample.topology.routePressure * 0.1;
  const light = Math.max(0.36, Math.min(1.18, 0.6 + sideLight * 0.32 + t * 0.16 + routeLift + growthLift - wetShadow));
  const base = sample.proxyMaterial.color;
  const lift = 12 + t * 24 + sample.topology.routePressure * 14;
  const r = Math.round(Math.min(245, base[0] * light + lift));
  const g = Math.round(Math.min(245, base[1] * light + lift));
  const b = Math.round(Math.min(245, base[2] * light + lift));
  return `rgb(${r}, ${g}, ${b})`;
}

function drawWitness(currentTerrain: HillOfHillsTerrain): void {
  const witness = currentTerrain.witness;
  witnessPanel.textContent = [
    `Hill of Hills witness`,
    `${witness.sourceAuthority} / ${witness.route}`,
    `fallback: ${witness.fallbackStatus}`,
    `grid: ${witness.gridResolution.x} x ${witness.gridResolution.z} / samples: ${witness.sampleCount}`,
    `height: ${witness.heightRange.min.toFixed(2)} .. ${witness.heightRange.max.toFixed(2)}`,
    `checksum: ${witness.sampleChecksum}`,
    `topology: ${witness.topologyChecksum} / material: ${witness.proxyMaterialChecksum}`,
    `route ${witness.topologyRanges.routePressure.max.toFixed(2)} ditch ${witness.topologyRanges.ditchPotential.max.toFixed(2)} growth ${witness.topologyRanges.growthPotential.max.toFixed(2)}`,
    `floor ${witness.effectiveParams.floorWidth.toFixed(1)} radius ${witness.effectiveParams.channelRadius.toFixed(1)} wall ${witness.effectiveParams.wallHeight.toFixed(1)}`
  ].join('\n');
}

function createControls(): { element: HTMLElement } {
  const element = document.createElement('section');
  element.className = 'terrain-controls';

  for (const spec of controlSpecs) {
    const row = document.createElement('label');
    const name = document.createElement('span');
    const value = document.createElement('output');
    const input = document.createElement('input');

    name.textContent = spec.label;
    input.type = 'range';
    input.min = String(spec.min);
    input.max = String(spec.max);
    input.step = String(spec.step);
    input.value = String(params[spec.key]);
    value.value = Number(params[spec.key]).toFixed(2);
    input.addEventListener('input', () => {
      const nextValue = Number(input.value);
      params = {
        ...params,
        [spec.key]: nextValue
      };
      value.value = nextValue.toFixed(2);
    });

    row.append(name, input, value);
    element.append(row);
  }

  const style = document.createElement('style');
  style.textContent = `
    .terrain-controls {
      position: fixed;
      right: 16px;
      top: 16px;
      width: min(330px, calc(100vw - 32px));
      max-height: calc(100vh - 32px);
      overflow: auto;
      padding: 12px;
      box-sizing: border-box;
      border: 1px solid rgba(242, 223, 160, 0.24);
      background: rgba(5, 12, 10, 0.78);
      color: #f4e3b0;
      font: 12px/1.25 ui-monospace, SFMono-Regular, Menlo, monospace;
      backdrop-filter: blur(8px);
    }
    .terrain-controls label {
      display: grid;
      grid-template-columns: minmax(96px, 1fr) minmax(0, 1.3fr) 44px;
      gap: 8px;
      align-items: center;
      min-height: 26px;
    }
    .terrain-controls input {
      width: 100%;
      min-width: 0;
      accent-color: #d5b64f;
    }
    .terrain-controls output {
      color: #88e0ba;
      text-align: right;
    }
    .terrain-witness {
      position: fixed;
      left: 16px;
      top: 16px;
      max-width: min(390px, calc(100vw - 32px));
      white-space: pre-wrap;
      padding: 12px;
      border: 1px solid rgba(136, 224, 186, 0.25);
      background: rgba(3, 9, 8, 0.76);
      color: #d7f7e8;
      font: 12px/1.45 ui-monospace, SFMono-Regular, Menlo, monospace;
      backdrop-filter: blur(8px);
    }
    @media (max-width: 780px) {
      .terrain-controls {
        top: auto;
        bottom: 12px;
        right: 12px;
        width: calc(100vw - 24px);
        max-height: 38vh;
      }
      .terrain-witness {
        left: 12px;
        top: 12px;
        max-width: calc(100vw - 24px);
      }
    }
  `;
  document.head.append(style);

  return { element };
}

function createWitnessPanel(): HTMLElement {
  const element = document.createElement('pre');
  element.className = 'terrain-witness';
  return element;
}
