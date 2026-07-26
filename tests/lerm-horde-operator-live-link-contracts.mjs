#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const controller = readFileSync(
  new URL('../src/lerm-horde-same-scene-smoke.ts', import.meta.url),
  'utf8',
);
const stylesheet = readFileSync(
  new URL('../src/lerm-horde-same-scene-smoke.css', import.meta.url),
  'utf8',
);
const browserWitness = readFileSync(
  new URL(
    './lerm-horde-live-runtime-browser-witness.mjs',
    import.meta.url,
  ),
  'utf8',
);

assert.match(
  controller,
  /presentation=operator-live/,
  'smoke controller has no explicit operator-live direct-link contract',
);
assert.match(
  controller,
  /requestedPresentation/,
  'operator-live route does not expose its requested presentation identity',
);
assert.match(
  controller,
  /effectivePresentation/,
  'operator-live route does not expose its effective presentation identity',
);
assert.match(
  controller,
  /operator-live-complete/,
  'operator-live route has no distinct non-receipt completion state',
);
assert.match(
  stylesheet,
  /data-presentation="operator-live".*\.transport/s,
  'operator-live route does not hide the manual transport controls',
);
assert.match(
  browserWitness,
  /operator-live.*operatorLoopCount/s,
  'browser witness does not exercise the self-running loop',
);
const operatorWitnessBody = browserWitness.slice(
  browserWitness.indexOf('async function runOperatorLiveView'),
  browserWitness.indexOf('async function currentState'),
);
assert.match(
  operatorWitnessBody,
  /report\.incrementalAdmissionVerified/,
  'operator-live witness does not make incremental Hill admission load-bearing',
);
assert.match(
  operatorWitnessBody,
  /report\.currentHillSupportVerified/,
  'operator-live witness does not make current-Hill support load-bearing',
);
assert.match(
  operatorWitnessBody,
  /report\.terrainChangedDuringRuntime/,
  'operator-live witness does not make terrain change load-bearing',
);
assert.match(
  controller,
  /effectivePresentation\s*=\s*'rejected'/,
  'unsupported presentation does not expose rejected effective identity',
);
assert.match(
  browserWitness,
  /rejected-presentation/,
  'browser witness has no first-class rejected-presentation exercise',
);
assert.match(
  operatorWitnessBody,
  /sampleScreenshotStates/,
  'operator-live witness does not bind screenshots to adjacent runtime state',
);
assert.match(
  operatorWitnessBody,
  /screenshot.*sha256/is,
  'operator-live witness does not record screenshot content identity',
);
assert.match(
  operatorWitnessBody,
  /sampleAScreenshot.*sampleBScreenshot.*notEqual/s,
  'operator-live witness does not reject identical A/B screenshots',
);
assert.match(
  controller,
  /__lermHordeOperatorLiveCapture/,
  'operator-live controller exposes no bounded witness capture handshake',
);
assert.match(
  operatorWitnessBody,
  /captureHoldCount/,
  'operator-live witness does not record capture hold exercise',
);

console.log('Lerm Horde operator-live link contracts passed');
