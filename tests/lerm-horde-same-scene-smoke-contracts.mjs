import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const smokeHtmlPath = resolve(root, 'smoke.html');
const smokeModulePath = resolve(root, 'src/lerm-horde-same-scene-smoke.ts');
const smokeContractPath = resolve(
  root,
  'src/lerm-horde-same-scene-smoke-contract.ts',
);
const browserWitnessPath = resolve(
  root,
  'tests/lerm-horde-same-scene-browser-witness.mjs',
);
const replayPath = resolve(
  root,
  'public/smoke/horde-same-scene-0482274/replay.svg',
);
const manifestPath = resolve(
  root,
  'public/smoke/horde-same-scene-0482274/manifest.json',
);

assert.ok(
  existsSync(smokeHtmlPath),
  'the exact same-scene timed smoke route must exist',
);
assert.ok(
  existsSync(smokeModulePath) && existsSync(smokeContractPath),
  'the timed smoke viewer and source verifier must exist',
);
assert.ok(
  existsSync(browserWitnessPath),
  'the timed smoke route must have a reusable browser witness',
);
assert.ok(
  existsSync(replayPath) && existsSync(manifestPath),
  'the exact accepted replay assets must be mounted in the smoke route',
);

const smokeHtml = readFileSync(smokeHtmlPath, 'utf8');
const smokeModule = readFileSync(smokeModulePath, 'utf8');
const smokeContract = readFileSync(smokeContractPath, 'utf8');
const browserWitness = readFileSync(browserWitnessPath, 'utf8');
const replay = readFileSync(replayPath);
const replayText = replay.toString('utf8');
const manifestText = readFileSync(manifestPath, 'utf8');
const manifest = JSON.parse(manifestText);

assert.match(
  smokeHtml,
  /src\/lerm-horde-same-scene-smoke\.ts/,
  'smoke.html must load the exact same-scene viewer',
);
assert.match(
  smokeModule,
  /requestAnimationFrame/,
  'the viewer must advance accepted frames over time',
);
assert.match(
  smokeModule,
  /data-smoke-status/,
  'the viewer must expose requested/effective source status',
);
assert.match(
  smokeContract,
  /0482274d0612b55969ad6c71f8f5c79c8721ce77/,
  'the source verifier must pin the accepted presenter revision',
);
assert.match(
  smokeContract,
  /f916a9309ef4ab3f35d3a94d4e6084a3cdd2f474/,
  'the source verifier must pin the reviewed Horde verifier',
);
for (const requiredBrowserCheck of [
  'smokeStatus',
  'carrierStatus',
  'carrierReceiptComplete',
  'initialPauseHeld',
  'oneOperatorPlay',
  'exactCarrierVisible',
  'hiddenGlyphAbsent',
  'carrierCanvasNonblank',
  'carrierCanvasMotionPixels',
  'railFrameVerified',
  'requestedRoute',
  'effectiveRoute',
  'playbackAdvanced',
  'pauseHeld',
  'departureBodyAbsent',
  'activePanelIsolated',
  'motionBodyVisible',
  'layoutContained',
  'headerHeightAcceptable',
  'primaryOutputWritten',
]) {
  assert.match(
    browserWitness,
    new RegExp(requiredBrowserCheck),
    `the browser witness must report ${requiredBrowserCheck}`,
  );
}
for (const exactCarrierIdentity of [
  'carrierBodySha256',
  'carrierRegistrationSha256',
  'carrierRailRevision',
  'carrierRailModuleSha256',
  'carrierRailHistorySha256',
  'effectiveRailId',
  'carrierPresentationRevision',
  'carrierPlaybackRevision',
  'effectiveEvaluatorRoute',
]) {
  assert.match(
    browserWitness,
    new RegExp(exactCarrierIdentity),
    `the browser witness must preserve exact ${exactCarrierIdentity} identity`,
  );
}
for (const exactIdentityField of [
  'presenterRevision',
  'verifierRevision',
  'verifierModuleBlob',
  'acceptedReceiptSha256',
  'manifestSha256',
  'svgSha256',
  'sourceStatus',
]) {
  assert.match(
    browserWitness,
    new RegExp(exactIdentityField),
    `the browser witness must preserve exact ${exactIdentityField} identity`,
  );
}

assert.equal(
  createHash('sha256').update(replay).digest('hex'),
  'f657e3365833e5e0465a208ea367ce6c40a429125528f82f25fa71dda39e626c',
  'the smoke route must mount the exact accepted replay SVG bytes',
);
assert.equal(
  createHash('sha256').update(manifestText).digest('hex'),
  'c8a25168cbbf9d45f7f2b225ab630e088f14a5b97f8b5cb561af7258e335c341',
  'the smoke route must mount the exact public-safe accepted manifest bytes',
);
assert.equal(
  manifest.acceptedReceiptSha256,
  'c5e087987ebe5e092d7b83d56f3c514c97629413d3e81e5989955b0acf323663',
  'the public manifest must retain the accepted source receipt identity',
);
assert.equal(
  manifest.identity.presenterRevision,
  '0482274d0612b55969ad6c71f8f5c79c8721ce77',
  'the mounted manifest must name the accepted presenter',
);
assert.equal(
  manifest.identity.verifierRevision,
  'f916a9309ef4ab3f35d3a94d4e6084a3cdd2f474',
  'the mounted manifest must name the reviewed verifier',
);
assert.equal(manifest.frames.length, 18);
assert.equal(
  manifest.frames.filter(({ kind }) => kind === 'actor-prefix').length,
  15,
);
assert.equal(manifest.frames.at(-2)?.kind, 'actor-departed');
assert.equal(manifest.frames.at(-1)?.kind, 'after-departure');
assert.equal(
  manifest.frames.at(-2)?.trafficChecksum,
  manifest.frames.at(-1)?.trafficChecksum,
  'pressure must persist across both departure states',
);

const { verifyAcceptedSameSceneSmokeSource } = await import(
  '../src/lerm-horde-same-scene-smoke-contract.ts'
);
const verified = await verifyAcceptedSameSceneSmokeSource(
  manifestText,
  replayText,
);
assert.equal(verified.frames.length, 18);
assert.equal(verified.sourceStatus, 'exact-accepted-replay');
await assert.rejects(
  () =>
    verifyAcceptedSameSceneSmokeSource(
      manifestText.replace(
        '0482274d0612b55969ad6c71f8f5c79c8721ce77',
        '0000000000000000000000000000000000000000',
      ),
      replayText,
    ),
  /manifest bytes are missing or substituted/,
  'a substituted presenter manifest must fail before playback',
);
await assert.rejects(
  () =>
    verifyAcceptedSameSceneSmokeSource(
      manifestText,
      replayText.replace('data-visible-lerm-body="true"', ''),
    ),
  /SVG bytes are missing or substituted/,
  'a partial moving-body SVG must fail before playback',
);
await assert.rejects(
  () =>
    verifyAcceptedSameSceneSmokeSource(
      manifestText.replace(
        '"effective": "lerms/hill-of-hills/horde-same-scene-prefix-replay"',
        '"effective": "lerms/fallback/replay"',
      ),
      replayText,
    ),
  /manifest bytes are missing or substituted/,
  'a fallback effective route must fail before playback',
);

console.log('Lerm Horde exact same-scene timed smoke contracts ok');
