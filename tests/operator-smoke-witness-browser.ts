import { LiveHandOperatorSmokeWitness } from '../src/hand/live-hand-operator-smoke-witness.js';
import { LiveHandPresentationCapture } from '../src/hand/live-hand-presentation-capture.js';

const params = new URLSearchParams(location.search);
const runtimeUrl = params.get('runtime_url') ?? 'http://127.0.0.1:8876';
function requiredElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`visual witness page is missing ${selector}`);
  return element;
}

function requiredContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext('2d');
  if (!context) throw new Error(`2D canvas unavailable for #${canvas.id}`);
  return context;
}

const cameraCanvas = requiredElement<HTMLCanvasElement>('#camera-source');
const fluidCanvas = requiredElement<HTMLCanvasElement>('#fluid-source');
const handCanvas = requiredElement<HTMLCanvasElement>('#hand-source');
const result = requiredElement<HTMLPreElement>('#result');
const cameraContext = requiredContext(cameraCanvas);
const fluidContext = requiredContext(fluidCanvas);
const handContext = requiredContext(handCanvas);
const cameraStream = cameraCanvas.captureStream(30);
const presentation = new LiveHandPresentationCapture(handCanvas);
const presentationStream = presentation.start();
const sessionId = `synthetic-moving-witness-${Date.now()}`;
const witness = new LiveHandOperatorSmokeWitness(runtimeUrl);
const anchorPosts: Promise<void>[] = [];

function postAnchor(frame: number): Promise<void> {
  return new Promise<Blob>((resolve, reject) => {
    cameraCanvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('anchor JPEG encode failed')), 'image/jpeg', 0.9);
  }).then(async blob => {
    const response = await fetch(`${runtimeUrl}/native-frame`, {
      method: 'POST',
      headers: {
        'Content-Type': 'image/jpeg',
        'X-Capture-Id': `${sessionId}-anchor-${frame}`,
        'X-Capture-Epoch-Ms': String(Date.now()),
        'X-Frame-Width': String(cameraCanvas.width),
        'X-Frame-Height': String(cameraCanvas.height),
      },
      body: blob,
    });
    if (!response.ok) throw new Error(`anchor ${frame} returned ${response.status}`);
  });
}

function drawFrame(frame: number): void {
  const phase = frame / 120;
  cameraContext.fillStyle = '#11171a';
  cameraContext.fillRect(0, 0, cameraCanvas.width, cameraCanvas.height);
  cameraContext.fillStyle = '#d7dfdb';
  cameraContext.font = '24px monospace';
  cameraContext.fillText(`RAW CAMERA ${String(frame).padStart(4, '0')}`, 24, 38);
  cameraContext.fillStyle = '#6f7b78';
  cameraContext.fillRect(24, 56, 592 * phase, 10);

  fluidContext.fillStyle = '#081012';
  fluidContext.fillRect(0, 0, fluidCanvas.width, fluidCanvas.height);
  fluidContext.fillStyle = '#1c6b78';
  for (let drop = 0; drop < 12; drop += 1) {
    const x = (frame * 7 + drop * 61) % fluidCanvas.width;
    const y = 370 + Math.sin(frame * 0.08 + drop) * 70;
    fluidContext.beginPath();
    fluidContext.arc(x, y, 5 + (drop % 3), 0, Math.PI * 2);
    fluidContext.fill();
  }

  handContext.clearRect(0, 0, handCanvas.width, handCanvas.height);
  handContext.fillStyle = '#eaf3ef';
  handContext.font = '28px monospace';
  handContext.fillText(`RENDERED HAND ${String(frame).padStart(4, '0')}`, 24, 42);
  const palmX = 320 + Math.sin(frame * 0.055) * 130;
  const palmY = 300 + Math.cos(frame * 0.041) * 48;
  handContext.save();
  handContext.translate(palmX, palmY);
  handContext.rotate(Math.sin(frame * 0.035) * 0.45);
  handContext.lineCap = 'round';
  handContext.lineWidth = 24;
  handContext.strokeStyle = '#f1b96f';
  handContext.beginPath();
  handContext.moveTo(0, 55);
  handContext.lineTo(0, 0);
  handContext.stroke();
  const lengths = [112, 142, 154, 136, 105];
  for (let finger = 0; finger < 5; finger += 1) {
    const rootX = (finger - 2) * 30;
    const bend = Math.sin(frame * 0.09 + finger * 0.7) * 0.5;
    handContext.save();
    handContext.translate(rootX, 0);
    handContext.rotate((finger - 2) * 0.08 + bend * 0.35);
    handContext.strokeStyle = ['#ef6767', '#f1b96f', '#63d8bf', '#73a9f2', '#d68af0'][finger];
    handContext.beginPath();
    handContext.moveTo(0, 0);
    handContext.quadraticCurveTo(bend * 45, -lengths[finger] * 0.55, bend * 70, -lengths[finger]);
    handContext.stroke();
    handContext.restore();
  }
  handContext.restore();
}

async function run(): Promise<void> {
  drawFrame(0);
  await witness.start({
    presentationStream,
    cameraStream,
    sessionId,
    requestedRoute: 'synthetic-moving-rendered-hand-presentation-not-hand-authority',
    initialMotionPhase: 'natural_use',
    presentationFrameCount: () => Number(presentation.snapshot().capturedFrameCount),
  });
  presentation.capturePresentedFrame();
  let frame = 0;
  await new Promise<void>(resolve => {
    const timer = window.setInterval(() => {
      frame += 1;
      drawFrame(frame);
      presentation.capturePresentedFrame();
      if (frame === 45) witness.recordMotionPhase('standard_stress_probe');
      if (frame === 80) witness.recordMotionPhase('extended_defect_probe');
      if (frame % 20 === 0) anchorPosts.push(postAnchor(frame));
      if (frame >= 120) {
        window.clearInterval(timer);
        resolve();
      }
    }, 33);
  });
  await Promise.all(anchorPosts);
  const receipt = await witness.stop();
  presentation.stop();
  cameraStream.getTracks().forEach(track => track.stop());
  result.textContent = JSON.stringify(receipt, null, 2);
  document.body.dataset.complete = 'true';
  document.body.dataset.sessionId = sessionId;
}

run().catch(error => {
  presentation.stop();
  cameraStream.getTracks().forEach(track => track.stop());
  result.textContent = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  document.body.dataset.failed = 'true';
});
