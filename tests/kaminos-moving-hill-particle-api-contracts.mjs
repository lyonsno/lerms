import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as fingerFluidCore from 'kaminos/finger-fluid-webgpu-core.js';

const BIG_PAPA_MOVING_HILL_REVISION =
  '355572977cdfdb7c27958994ede61ec967ac4623';
const BIG_PAPA_ARCHIVE =
  `https://github.com/lyonsno/kaminos/archive/${BIG_PAPA_MOVING_HILL_REVISION}.tar.gz`;
const packageJson = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
);
const packageLock = JSON.parse(
  readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'),
);
const viteConfig = readFileSync(
  new URL('../vite.config.ts', import.meta.url),
  'utf8',
);
const installedCorePath = fileURLToPath(
  import.meta.resolve('kaminos/finger-fluid-webgpu-core.js'),
);
const hdrAssetPath = resolve(
  dirname(installedCorePath),
  'assets/hdr/studio_small_09_1k.hdr',
);
const hdrAsset = readFileSync(hdrAssetPath);

assert.equal(
  packageJson.dependencies.kaminos,
  BIG_PAPA_ARCHIVE,
  'root Kaminos dependency must request Big Papa moving-Hill source exactly',
);
assert.equal(
  packageLock.packages[''].dependencies.kaminos,
  BIG_PAPA_ARCHIVE,
  'lockfile root request must preserve the exact Big Papa source',
);
assert.equal(
  packageLock.packages['node_modules/kaminos'].resolved,
  BIG_PAPA_ARCHIVE,
  'installed Kaminos package must resolve from the exact Big Papa source',
);
assert.equal(
  fingerFluidCore.KAMINOS_FINGER_FLUID_MOVING_HILL_SUPPORT_CONTACT_ROUTE,
  'lerms/hill-of-hills/gpu-moving-support-contact-v0',
  'installed solver must expose the canonical moving-Hill support route',
);
assert.equal(
  typeof fingerFluidCore.createFingerFluidMovingHillSupportContactProvider,
  'function',
  'installed solver must expose the reviewed moving-Hill provider factory',
);
assert.equal(
  typeof fingerFluidCore.validateFingerFluidMovingHillSupportContactProvider,
  'function',
  'installed solver must expose the reviewed provider validator',
);
assert.equal(
  typeof fingerFluidCore.createFingerFluidSupportContactIdentity,
  'function',
  'installed solver must expose support identity without host readback',
);
assert.equal(
  createHash('sha256').update(hdrAsset).digest('hex'),
  'e7cfda5f4e98e623db12b8bfd0184e048488e4855d9c83e2751fb44a32e80c45',
  'consumer must route the exact HDR bytes admitted by the pinned renderer',
);
assert.match(
  viteConfig,
  /configureServer[\s\S]*\/assets\/hdr\/studio_small_09_1k\.hdr/,
  'Vite dev server must route the pinned renderer HDR asset at its requested URL',
);
assert.match(
  viteConfig,
  /emitFile\([\s\S]*assets\/hdr\/studio_small_09_1k\.hdr/,
  'production build must emit the same pinned renderer HDR asset URL',
);

console.log('Kaminos moving-Hill particle API contracts passed');
