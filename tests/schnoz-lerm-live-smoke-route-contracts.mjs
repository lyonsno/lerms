import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const main = readFileSync('src/main.ts', 'utf8');
const core = readFileSync('src/schnoz-lerm-simulation-core.ts', 'utf8');
const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));

assert.equal(
  packageJson.scripts['test:schnoz-live'],
  'node tests/schnoz-lerm-live-smoke-route-contracts.mjs',
);

assert.match(main, /schnoz_sim/);
assert.match(main, /buildSchnozSimulationSnapshot/);
assert.match(main, /renderSchnozSmoke/);
assert.match(main, /__lermsSchnozSmokeState/);
assert.match(main, /lerms\.schnoz-live-smoke-state\.v0/);
assert.match(main, /sourceTruthUpgrade/);
assert.match(main, /motionEvidence/);
assert.match(main, /terrainControlsEnabled/);
assert.match(main, /if \(terrainControlsEnabled\)/);

assert.match(core, /export type SchnozMotionEvidence/);
assert.match(core, /buildSchnozSimulationSnapshot/);
assert.match(core, /rootMetrics\.travelXZ/);
assert.match(core, /torsoFrame\.chestRootHorizontalLean\.range/);
assert.match(core, /limbEnvelope\.handSpan\.range/);
assert.match(core, /expansionCompression\.bboxVolume\.range/);
assert.match(core, /Mushfinger-style source evidence sockets are preserved separately/);

console.log('schnoz lerm live smoke route tests passed');
