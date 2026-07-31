import {
  LiveHandOperatorSmokeWitness,
  LIVE_HAND_OPERATOR_SMOKE_RAW_CAPTURE_ROUTE,
} from '../src/hand/live-hand-operator-smoke-witness.js';
import {
  LiveHandPresentationCapture,
  LIVE_HAND_PRESENTATION_CAPTURE_ROUTE,
} from '../src/hand/live-hand-presentation-capture.js';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

class FakeRecorder {
  state: RecordingState = 'inactive';
  mimeType = 'video/webm;codecs=vp8';
  ondataavailable: ((event: BlobEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onstop: (() => void) | null = null;

  constructor(private readonly events: string[], private readonly output: Blob) {}

  start(timeslice?: number): void {
    this.events.push(`recorder:start:${timeslice}`);
    this.state = 'recording';
  }

  requestData(): void {
    this.events.push('recorder:request-data');
    this.ondataavailable?.({ data: this.output } as BlobEvent);
  }

  stop(): void {
    this.events.push('recorder:stop');
    this.state = 'inactive';
    this.onstop?.();
  }

  pause(): void {}
  resume(): void {}
  addEventListener(): void {}
  removeEventListener(): void {}
  dispatchEvent(): boolean { return true; }
  stream = {} as MediaStream;
  videoBitsPerSecond = 0;
  audioBitsPerSecond = 0;
  audioBitrateMode = 'variable' as BitrateMode;
}

function response(payload: Record<string, unknown>, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => payload,
  } as Response;
}

const events: string[] = [];
const calls: Array<{ path: string; init: RequestInit }> = [];
const recorderStreamIds: string[] = [];
let now = 1000;
const fetchMock: typeof fetch = async (input, init = {}) => {
  const path = String(input).replace('http://runtime', '');
  events.push(`fetch:${path}`);
  calls.push({ path, init });
  if (path === '/operator-smoke/start') return response({ sessionId: 'run-1', status: 'recording' });
  if (path === '/operator-smoke/presentation-capture') return response({ byteCount: 21 });
  if (path === '/operator-smoke/raw-capture') return response({ byteCount: 12 });
  if (path === '/operator-smoke/stop') return response({ sessionId: 'run-1', status: 'complete' });
  if (path === '/operator-smoke/interrupted') return response({ status: 'interrupted' });
  return response({ error: 'not_found' }, false, 404);
};
const witness = new LiveHandOperatorSmokeWitness('http://runtime', {
  fetch: fetchMock,
  now: () => now,
  isTypeSupported: mime => mime === 'video/webm;codecs=vp8',
  createRecorder: (stream) => {
    recorderStreamIds.push(stream.id);
    return new FakeRecorder(
      events,
      new Blob([stream.id === 'presentation' ? 'rendered-hand-presentation' : 'raw-camera']),
    ) as unknown as MediaRecorder;
  },
});

const presentationStream = { id: 'presentation' } as MediaStream;
const cameraStream = { id: 'camera' } as MediaStream;
await witness.start({
  presentationStream,
  cameraStream,
  sessionId: 'run-1',
  requestedRoute: 'hybrid-route',
  initialMotionPhase: 'natural_use',
  presentationFrameCount: () => 37,
});
assert(events[0] === 'fetch:/operator-smoke/start', 'runtime disk/retention admission precedes recorder start');
const startCall = calls.find(call => call.path === '/operator-smoke/start');
const startBody = JSON.parse(String(startCall?.init.body));
assert(
  startBody.captureRoute === LIVE_HAND_PRESENTATION_CAPTURE_ROUTE,
  'the primary visual witness route records rendered hand presentation pixels directly',
);
assert(startBody.rawCaptureRoute === LIVE_HAND_OPERATOR_SMOKE_RAW_CAPTURE_ROUTE, 'raw camera remains separately identified');
assert(recorderStreamIds.join(',') === 'presentation,camera', 'recorders bind the rendered presentation and raw camera as distinct sources');
assert(events[1] === 'recorder:start:1000' && events[2] === 'recorder:start:1000', 'both recorders begin at an uncapped rolling timeslice');
now = 1300;
witness.recordMotionPhase('extended_defect_probe');
now = 2000;
const stopped = await witness.stop();
assert(stopped.status === 'complete', 'stop returns runtime evidence closure receipt');
assert(events.indexOf('recorder:stop') < events.indexOf('fetch:/operator-smoke/presentation-capture'), 'recorders finalize before upload');
assert(events.indexOf('fetch:/operator-smoke/presentation-capture') < events.indexOf('fetch:/operator-smoke/raw-capture'), 'rendered hand primary persists before raw supporting input');
assert(events.indexOf('fetch:/operator-smoke/raw-capture') < events.indexOf('fetch:/operator-smoke/stop'), 'raw corpus persists before closure');
const presentationUpload = calls.find(call => call.path === '/operator-smoke/presentation-capture');
const rawUpload = calls.find(call => call.path === '/operator-smoke/raw-capture');
assert(presentationUpload?.init.body instanceof Blob && presentationUpload.init.body.size > 0, 'complete rendered hand presentation is uploaded without frame sampling');
assert(rawUpload?.init.body instanceof Blob && rawUpload.init.body.size > 0, 'complete raw camera recording remains synchronized supporting evidence');
assert(await (presentationUpload?.init.body as Blob).text() === 'rendered-hand-presentation', 'primary upload contains the rendered-hand stream');
assert(await (rawUpload?.init.body as Blob).text() === 'raw-camera', 'supporting upload contains the raw-camera stream');
const finalization = calls.find(call => call.path === '/operator-smoke/stop');
const finalBody = JSON.parse(String(finalization?.init.body));
assert(finalBody.operatorMotionPhases.length === 2, 'phase changes align the dense recording with operator probes');
assert(finalBody.presentationFrameCount === 37, 'closure reports the exact manually captured hand-presentation frame count');

const interruptedEvents: string[] = [];
const interruptedCalls: Array<{ path: string; init: RequestInit }> = [];
const interrupted = new LiveHandOperatorSmokeWitness('http://runtime', {
  fetch: async (input, init = {}) => {
    const path = String(input).replace('http://runtime', '');
    interruptedEvents.push(path);
    interruptedCalls.push({ path, init });
    calls.push({ path: String(input), init });
    return response({ status: 'ok' });
  },
  now: () => 3000,
  isTypeSupported: mime => mime === 'video/webm',
  createRecorder: () => new FakeRecorder(interruptedEvents, new Blob([])) as unknown as MediaRecorder,
});
await interrupted.start({
  presentationStream: { id: 'empty-presentation' } as MediaStream,
  cameraStream: { id: 'empty-camera' } as MediaStream,
  sessionId: 'run-empty',
  requestedRoute: 'hybrid-route',
  initialMotionPhase: 'natural_use',
  presentationFrameCount: () => 0,
});
let rejectedEmpty = false;
try {
  await interrupted.stop();
} catch (error) {
  rejectedEmpty = error instanceof Error && error.message.includes('empty');
}
assert(rejectedEmpty, 'empty MediaRecorder output fails witness closure');
assert(interruptedEvents.includes('/operator-smoke/interrupted'), 'pre-output failure is durably reported');
assert(!interruptedEvents.includes('/operator-smoke/raw-capture'), 'empty output cannot masquerade as raw evidence');
assert(!interruptedEvents.includes('/operator-smoke/presentation-capture'), 'empty output cannot masquerade as rendered-hand evidence');
const emptyInterruption = interruptedCalls.find(call => call.path === '/operator-smoke/interrupted');
const emptyInterruptionBody = JSON.parse(String(emptyInterruption?.init.body));
assert(emptyInterruptionBody.failurePhase === 'presentation_media_recorder_empty', 'empty primary recorder identity survives browser handoff');
assert(emptyInterruptionBody.lastTrustworthyEvidence.presentationMediaRecorderChunkCount === 0, 'empty primary recorder evidence carries the observed chunk count');

const presentationEvents: string[] = [];
const manualTrack = {
  requestFrame: () => presentationEvents.push('request-frame'),
  stop: () => presentationEvents.push('track-stop'),
} as unknown as CanvasCaptureMediaStreamTrack;
const handSource = {
  width: 640,
  height: 480,
  captureStream: () => ({
    getVideoTracks: () => [manualTrack],
    getTracks: () => [manualTrack],
  }),
} as unknown as HTMLCanvasElement;
const presentation = new LiveHandPresentationCapture(handSource);
presentation.start();
presentation.capturePresentedFrame();
presentation.capturePresentedFrame();
assert(presentationEvents.join(',') === 'request-frame,request-frame', 'each rendered hand frame is requested directly from its WebGL canvas');
assert(presentation.snapshot().capturedFrameCount === 2, 'the direct hand witness reports exact captured-frame cadence');
presentation.stop();
assert(presentationEvents.at(-1) === 'track-stop', 'the direct hand presentation track stops explicitly');

console.log('live hand operator smoke witness contracts ok');
