import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
const main = readFileSync('src/main.ts', 'utf8');
const routePath = 'src/schnoz-3d-smoke.ts';

assert.equal(
  packageJson.scripts['test:schnoz-3d'],
  'node tests/schnoz-3d-smoke-route-contracts.mjs',
);
assert.ok(packageJson.dependencies?.three, '3D schnoz route uses Three.js as a real dependency');
assert.ok(existsSync(routePath), '3D schnoz route module exists');

const route = existsSync(routePath) ? readFileSync(routePath, 'utf8') : '';

assert.match(main, /schnoz_3d/);
assert.match(main, /schnoz_sim'\) === '3d'|schnoz_sim"\) === "3d"/);
assert.match(main, /initSchnoz3dSmoke/);

assert.match(route, /from 'three'/);
assert.match(route, /WebGLRenderer/);
assert.match(route, /SphereGeometry/);
assert.match(route, /PlaneGeometry/);
assert.match(route, /buildSchnozSimulationSnapshot/);
assert.match(route, /motionAdapter/);
assert.match(route, /__lermsSchnoz3dSmokeState/);
assert.match(route, /lerms\.schnoz-3d-smoke-state\.v0/);
assert.match(route, /proxy_schnoz_sphere/);
assert.match(route, /ground-plane/);
assert.match(route, /sourceTruthUpgrade/);
assert.match(route, /requestAnimationFrame/);

console.log('schnoz 3D smoke route contracts passed');
