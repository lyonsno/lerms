import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/hand/live-hand-landmarker.worker.ts', import.meta.url), 'utf8');
const liveHandSource = readFileSync(new URL('../src/hand/live-hand.ts', import.meta.url), 'utf8');
const liveHandHtml = readFileSync(new URL('../live-hand.html', import.meta.url), 'utf8');

assert.match(source, /tasks-vision@\$\{TASKS_VISION_VERSION\}/, 'MediaPipe Tasks Vision is version-pinned');
assert.match(
  source,
  /context\.setTransform\(1, 0, 0, 1, 0, 0\)/,
  'MediaPipe receives the same unmirrored pixels as the paired WiLoR anchor',
);
assert.doesNotMatch(
  source,
  /context\.setTransform\(-1, 0, 0, 1, request\.width, 0\)/,
  'the fast-path clone cannot be reflected relative to its paired WiLoR frame',
);
assert.match(
  source,
  /function normalizeUnmirroredHandedness[\s\S]*left[\s\S]*right/,
  'MediaPipe handedness is swapped when its input is not mirrored',
);
assert.match(
  source,
  /mirroredInput: false/,
  'worker evidence states that the model received the original camera orientation',
);
assert.match(
  source,
  /worldCoordinateBasis: LIVE_HAND_LANDMARKER_WORLD_BASIS/,
  'worker evidence names the MediaPipe world-coordinate basis that requires explicit depth conversion',
);
assert.match(source, /captureId: request\.captureId[\s\S]*captureTimestampMs: request\.captureTimestampMs/, 'worker output preserves shared capture identity');
assert.match(source, /failurePhase[\s\S]*primaryOutputWritten: false[\s\S]*lastTrustworthyEvidence/, 'worker failure reports survive pre-output failure');
assert.match(source, /no_complete_hand_detected[\s\S]*primaryOutputWritten: false/, 'no-hand frames cannot masquerade as fast-path output');
assert.doesNotMatch(source, /setInterval/, 'worker inference is caller-cadenced rather than self-throttled');
assert.doesNotMatch(
  source,
  /^\s*import\s/m,
  'the classic MediaPipe worker entry is self-contained so browser parsing reaches the dynamic Tasks Vision import',
);
assert.match(
  source,
  /^\(\(\) => \{/,
  'the classic worker keeps its lexical declarations out of importScripts global scope',
);
assert.match(
  liveHandSource,
  /new Worker\(new URL\('\.\/live-hand-landmarker\.worker\.ts', import\.meta\.url\)\);/,
  'MediaPipe runs in a classic worker because its WASM loader requires importScripts',
);
assert.doesNotMatch(
  liveHandSource,
  /new Worker\(new URL\('\.\/live-hand-landmarker\.worker\.ts', import\.meta\.url\),\s*\{\s*type:\s*['"]module['"]\s*\}\)/,
  'MediaPipe cannot initialize in a module worker where importScripts is forbidden',
);
assert.match(liveHandSource, /planLiveHandSourceFrame/, 'the live camera loop uses the tested source scheduler');
assert.match(liveHandSource, /requestVideoFrameCallback/, 'fast inference follows decoded camera frames');
assert.match(
  liveHandSource,
  /const anchorFrame = plan\.submitAnchor \? sourceFrame\.clone\(\) : null/,
  'a due WiLoR correction clones the exact frame admitted to MediaPipe',
);
assert.match(liveHandSource, /postAnchorFrame\(runGeneration, captureId, captureTimestampMs, anchorFrame/, 'the anchor clone keeps the shared capture id');
assert.match(liveHandSource, /postLandmarkerFrame\(captureId, captureTimestampMs, sourceFrame/, 'the MediaPipe frame keeps the shared capture id');
assert.match(liveHandSource, /runtimeFetch\('\/fast-landmarks'/, 'browser landmarks post to the runtime-owned fusion endpoint');
assert.match(liveHandSource, /manoRegeneratorAvailable[\s\S]*native_mano_regeneration/, 'hybrid start fails before camera output when native MANO regeneration is unavailable');
assert.match(
  liveHandSource,
  /anchorIntervalMs:\s*resolveLiveHandAnchorIntervalMs\(sourceMode\)/,
  'the live loop applies the tested route-specific anchor cadence',
);
assert.match(
  liveHandSource,
  /function deactivateFluidInlets[\s\S]*handMesh\.visible = false[\s\S]*handPresentationPending = false/,
  'invalid live authority immediately removes the previously visible hand',
);
assert.match(
  liveHandSource,
  /if \(frame\.effectiveRoute !== requestedRoute\) \{[\s\S]*deactivateFluidInlets\('unexpected_live_hand_route'\)/,
  'a mismatched effective route cannot leave prior hand or fluid authority active',
);
assert.match(
  liveHandSource,
  /catch \(error\) \{[\s\S]*deactivateFluidInlets\('invalid_or_stale_hand_state'\)[\s\S]*setStatus/,
  'every normalization or hybrid contract failure immediately invalidates prior presentation state',
);
assert.doesNotMatch(
  liveHandSource,
  /message\.includes\('fresh live authority'\)[\s\S]*message\.includes\('MANO surface'\)/,
  'consumer invalidation is not restricted to two selected error strings',
);
assert.match(liveHandHtml, /id="hand-route-mode"[\s\S]*value="pure_wilor"[\s\S]*value="hybrid_mano"/, 'operator can switch the matched pure/hybrid route');

console.log('live hand landmarker worker contracts ok');
