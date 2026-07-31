import { LiveHandOperatorSmokeWitness } from '../src/hand/live-hand-operator-smoke-witness.js';

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
let now = 1000;
const fetchMock: typeof fetch = async (input, init = {}) => {
  const path = String(input).replace('http://runtime', '');
  events.push(`fetch:${path}`);
  calls.push({ path, init });
  if (path === '/operator-smoke/start') return response({ sessionId: 'run-1', status: 'recording' });
  if (path === '/operator-smoke/raw-capture') return response({ byteCount: 12 });
  if (path === '/operator-smoke/stop') return response({ sessionId: 'run-1', status: 'complete' });
  if (path === '/operator-smoke/interrupted') return response({ status: 'interrupted' });
  return response({ error: 'not_found' }, false, 404);
};
const witness = new LiveHandOperatorSmokeWitness('http://runtime', {
  fetch: fetchMock,
  now: () => now,
  isTypeSupported: mime => mime === 'video/webm;codecs=vp8',
  createRecorder: () => new FakeRecorder(events, new Blob(['moving-frames'])) as unknown as MediaRecorder,
});

await witness.start({
  stream: {} as MediaStream,
  sessionId: 'run-1',
  requestedRoute: 'hybrid-route',
  initialMotionPhase: 'natural_use',
});
assert(events[0] === 'fetch:/operator-smoke/start', 'runtime disk/retention admission precedes recorder start');
assert(events[1] === 'recorder:start:1000', 'recorder begins at an uncapped rolling timeslice');
now = 1300;
witness.recordMotionPhase('extended_defect_probe');
now = 2000;
const stopped = await witness.stop();
assert(stopped.status === 'complete', 'stop returns runtime evidence closure receipt');
assert(events.indexOf('recorder:stop') < events.indexOf('fetch:/operator-smoke/raw-capture'), 'recorder finalizes before upload');
assert(events.indexOf('fetch:/operator-smoke/raw-capture') < events.indexOf('fetch:/operator-smoke/stop'), 'raw corpus persists before closure');
const upload = calls.find(call => call.path === '/operator-smoke/raw-capture');
assert(upload?.init.body instanceof Blob && upload.init.body.size === 13, 'complete nonempty recording is uploaded without frame sampling');
const finalization = calls.find(call => call.path === '/operator-smoke/stop');
const finalBody = JSON.parse(String(finalization?.init.body));
assert(finalBody.operatorMotionPhases.length === 2, 'phase changes align the dense recording with operator probes');

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
  stream: {} as MediaStream,
  sessionId: 'run-empty',
  requestedRoute: 'hybrid-route',
  initialMotionPhase: 'natural_use',
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
const emptyInterruption = interruptedCalls.find(call => call.path === '/operator-smoke/interrupted');
const emptyInterruptionBody = JSON.parse(String(emptyInterruption?.init.body));
assert(emptyInterruptionBody.failurePhase === 'media_recorder_empty', 'empty recorder identity survives browser handoff');
assert(emptyInterruptionBody.lastTrustworthyEvidence.mediaRecorderChunkCount === 0, 'empty recorder evidence carries the observed chunk count');

console.log('live hand operator smoke witness contracts ok');
