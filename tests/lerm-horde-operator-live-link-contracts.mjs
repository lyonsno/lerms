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

console.log('Lerm Horde operator-live link contracts passed');
