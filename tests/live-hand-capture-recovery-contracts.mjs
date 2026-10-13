import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const file = new URL('../src/hand/live-hand.ts', import.meta.url);
const source = ts.createSourceFile(file.pathname, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
const names = new Set(['rejectCaptureWorkerResults', 'disposeCaptureWorker', 'failCaptureWorker',
  'ensureCaptureWorker', 'encodeCameraFrame', 'postAnchorFrame', 'scheduleCameraFrame', 'handleCameraFrame']);
const selected = source.statements.filter(node => ts.isFunctionDeclaration(node) && names.has(node.name?.text));
assert.equal(selected.length, names.size, 'exercise the actual capture functions');
const javascript = ts.transpileModule(selected.map(node => node.getText(source)).join('\n'), {
  compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS},
  transformers: {before: [context => root => ts.visitNode(root, function visit(node) {
    if (ts.isMetaProperty(node)) return ts.factory.createObjectLiteralExpression([
      ts.factory.createPropertyAssignment('url', ts.factory.createStringLiteral(file.href)),
    ]);
    return ts.visitEachChild(node, visit, context);
  })]},
}).outputText;

function harness(mode = 'hybrid_mano') {
  const timers = new Map(), workers = [], fast = [], posts = [];
  let timerId = 0;
  class Worker {
    listeners = new Map(); terminated = false; requests = [];
    constructor() {workers.push(this);}
    addEventListener(type, listener) {this.listeners.set(type, listener);}
    postMessage(value) {this.requests.push(value);}
    terminate() {this.terminated = true;}
    reply(value) {this.listeners.get('message')({data: value});}
  }
  class VideoFrame {
    closed = false;
    clone() {return new VideoFrame();}
    close() {this.closed = true;}
  }
  const state = {
    Worker, VideoFrame, URL, Error, DOMException, AbortController, performance, exports: {},
    HTMLMediaElement: {HAVE_CURRENT_DATA: 2},
    window: {setTimeout: callback => {timers.set(++timerId, callback); return timerId;},
      clearTimeout: id => timers.delete(id)},
    captureWorker: null, captureWorkerError: null, latestCaptureFailure: null, captureDeadlineMissCount: 0,
    pendingCaptureWorkerResults: new Map(), captureInFlightGeneration: null, capturePostAbortController: null,
    captureRunGeneration: 1, running: true, sourceMode: mode, landmarkerWorkerReady: true,
    landmarkerWorkerError: null, landmarkerInFlightCaptureId: null, lastAnchorCaptureAtMs: null,
    operatorMotionPhase: 'natural_use', frameSequence: 0, landmarkerFramesSuppressed: 0,
    cameraFrameCallbackId: null, cameraFrameFallbackTimer: null,
    video: {readyState: 4, videoWidth: 640, videoHeight: 480, requestVideoFrameCallback: () => 1},
    LIVE_HAND_CAPTURE_WORKER_ROUTE: 'transferable-videoframe-offscreen-jpeg-v0',
    LIVE_HAND_CAPTURE_REPLY_DEADLINE_MS: 750,
    captureAcquireMs: [], captureWorkerEncodeMs: [],
    isCaptureRunCurrent: (request, active, running) => running && request === active,
    resolveLiveHandAnchorIntervalMs: () => 100,
    planLiveHandSourceFrame: ({mode, anchorInFlight}) => ({submitFastPath: mode === 'hybrid_mano', submitAnchor: !anchorInFlight}),
    postLandmarkerFrame: (id, time, frame) => {fast.push(id); frame.close();},
    normalizeCaptureWorkerResult: (value, id) => {assert.equal(value.captureId, id); return value;},
    runtimeFetch: async (path, options) => {posts.push({path, options}); return {};},
    latencyReceiptJoiner: {prune() {}, registerCapture() {return null;}},
    armLatencySample() {}, deactivateFluidInlets() {}, setStatus() {}, setRouteTruth() {},
  };
  vm.createContext(state); vm.runInContext(javascript, state);
  return {state, workers, fast, posts, timers,
    expire() {const [id, callback] = timers.entries().next().value; timers.delete(id); callback();},
    tick() {state.handleCameraFrame(1);},
  };
}
const settle = () => new Promise(resolve => setImmediate(resolve));
for (const mode of ['hybrid_mano', 'pure_wilor']) {
  const h = harness(mode);
  h.tick(); assert.equal(h.workers.length, 1);
  const retired = h.workers[0];
  h.expire(); await settle();
  assert(retired.terminated, 'expired worker is stopped so queued old work cannot accumulate');
  assert.equal(h.state.captureInFlightGeneration, null, 'failed request releases its admission slot');
  h.tick();
  assert.equal(h.workers.length, 2, `${mode}: next camera frame must replace a timed-out encoder`);
  assert.equal(h.fast.length, mode === 'hybrid_mano' ? 2 : 0, 'hybrid fast delivery survives encoder timeout');
  assert.equal(h.state.captureDeadlineMissCount, 1);
  assert.equal(h.state.latestCaptureFailure.failurePhase, 'encode_deadline');
  assert.equal(h.state.latestCaptureFailure.primaryOutputWritten, false);
  const replacement = h.workers[1], request = replacement.requests[0];
  retired.reply({captureId: request.captureId, schema: 'lerms.live-hand-capture-error.v0', error: 'late old failure'});
  assert.equal(h.state.captureWorker, replacement, 'retired worker cannot poison new admission');
  replacement.reply({captureId: request.captureId, blob: 'new-jpeg', workerEncodeMs: 5});
  await settle();
  assert.equal(h.posts.length, 1, 'only the new capture reaches the runtime');
  assert.equal(h.posts[0].options.headers['X-Capture-Id'], request.captureId);
  assert.equal(h.state.captureWorkerError, null);
  assert.equal(h.state.latestCaptureFailure.failurePhase, 'encode_deadline', 'recovery retains the failure receipt');
  h.tick(); h.expire(); await settle();
  h.state.running = false; h.tick();
  assert.equal(h.workers.length, 2, 'Stop prevents recovery launch');
}
const fatal = harness(); fatal.tick();
fatal.workers[0].listeners.get('error')({message: 'worker crashed'}); await settle();
fatal.tick();
assert.equal(fatal.workers.length, 1, 'unclassified worker failure remains explicit and requires restart');
assert.equal(fatal.state.captureWorkerError, 'worker crashed');
console.log('capture timeout recovery contracts passed');
