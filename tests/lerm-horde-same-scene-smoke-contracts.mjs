import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const paths = {
  html: resolve(root, 'smoke.html'),
  viewer: resolve(root, 'src/lerm-horde-same-scene-smoke.ts'),
  renderer: resolve(root, 'src/lerm-horde-3d-carrier-renderer.ts'),
  adapter: resolve(root, 'src/lerm-horde-full-hill-renderer.ts'),
  witness: resolve(root, 'tests/lerm-horde-same-scene-browser-witness.mjs'),
  historicalSvg: resolve(
    root,
    'public/smoke/horde-same-scene-0482274/replay.svg',
  ),
};

for (const [label, path] of Object.entries(paths)) {
  assert.ok(existsSync(path), `${label} must exist`);
}

const html = readFileSync(paths.html, 'utf8');
const viewer = readFileSync(paths.viewer, 'utf8');
const renderer = readFileSync(paths.renderer, 'utf8');
const adapter = readFileSync(paths.adapter, 'utf8');
const witness = readFileSync(paths.witness, 'utf8');

assert.match(
  html,
  /class="stage"\s+data-smoke-viewport/,
  'the full-Hill stage must be the smoke viewport',
);
assert.doesNotMatch(
  html,
  /<svg\b/,
  'the active full-Hill route must not seat an SVG presentation layer',
);
assert.doesNotMatch(
  viewer,
  /replay\.svg|mountSvg|ACCEPTED_SAME_SCENE_ASSET_ROOT/,
  'the active route must not fetch or mount the historical SVG replay',
);
assert.match(
  viewer,
  /createExactCarrierRenderer\(stage\)/,
  'the viewer must initialize the shared terrain and body renderer',
);
assert.match(
  viewer,
  /__lermHordeFullHillReport/,
  'the viewer must publish the full-Hill completion receipt',
);
assert.match(
  renderer,
  /createHillTerrainGeometry\(firstTerrain\)/,
  'the renderer must create actual Three geometry from the Hill buffer',
);
assert.match(
  renderer,
  /updateHillTerrainGeometry\(terrainGeometry, terrainBuffer\)/,
  'the renderer must update the live terrain for every canonical frame',
);
assert.match(
  renderer,
  /depthTest: true[\s\S]*depthWrite: true/,
  'terrain and body must participate in native depth',
);
assert.match(
  renderer,
  /getParameter\(renderer\.getContext\(\)\.DEPTH_BITS\)/,
  'the renderer must measure its effective depth-buffer capacity',
);
assert.match(
  adapter,
  /createHillHordeSameScenePrefixReplay\(admission, motion\)/,
  'the adapter must consume the canonical replay constructor',
);
assert.match(
  adapter,
  /createHillOfHillsTerrainBuffer\(terrain\)/,
  'the adapter must consume Hill source buffers rather than SVG pixels',
);

for (const requiredEvidence of [
  'oneRendererVerified',
  'nativeDepthVerified',
  'fullHillGeometryVerified',
  'carrierCanvasNonblank',
  'carrierCanvasMotionPixels',
  'terrainChangedAcrossPrefixes',
  'departureBodyAbsent',
  'departureHistoryRetained',
  'carrierReceiptComplete',
  'oneOperatorPlay',
  'requestedRenderer',
  'effectiveRenderer',
  'terrainSampleCount',
  'terrainTriangleCount',
  'depthBits',
  'primaryOutputWritten',
]) {
  assert.match(
    witness,
    new RegExp(requiredEvidence),
    `the browser witness must report ${requiredEvidence}`,
  );
}
for (const falseClosureProbe of [
  "querySelectorAll('.stage canvas').length",
  "querySelectorAll('.stage svg')",
  'readPixels',
  'redBodySamples === 0',
  'hillHistoryRetained === true',
]) {
  assert.match(
    witness,
    new RegExp(falseClosureProbe.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    `the browser witness must probe ${falseClosureProbe}`,
  );
}

console.log('Lerm Horde full-Hill one-renderer smoke contracts ok');
