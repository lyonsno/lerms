import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/hand/live-hand-landmarker.worker.ts', import.meta.url), 'utf8');
const liveHandSource = readFileSync(new URL('../src/hand/live-hand.ts', import.meta.url), 'utf8');
const liveHandHtml = readFileSync(new URL('../live-hand.html', import.meta.url), 'utf8');

assert.match(source, /tasks-vision@\$\{TASKS_VISION_VERSION\}/, 'MediaPipe Tasks Vision is version-pinned');
assert.match(source, /context\.setTransform\(-1, 0, 0, 1, request\.width, 0\)/, 'MediaPipe receives the same mirrored pixels as WiLoR');
assert.match(source, /captureId: request\.captureId[\s\S]*captureTimestampMs: request\.captureTimestampMs/, 'worker output preserves shared capture identity');
assert.match(source, /failurePhase[\s\S]*primaryOutputWritten: false[\s\S]*lastTrustworthyEvidence/, 'worker failure reports survive pre-output failure');
assert.match(source, /no_complete_hand_detected[\s\S]*primaryOutputWritten: false/, 'no-hand frames cannot masquerade as fast-path output');
assert.doesNotMatch(source, /setInterval/, 'worker inference is caller-cadenced rather than self-throttled');
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
assert.match(liveHandHtml, /id="hand-route-mode"[\s\S]*value="pure_wilor"[\s\S]*value="hybrid_mano"/, 'operator can switch the matched pure/hybrid route');

console.log('live hand landmarker worker contracts ok');
