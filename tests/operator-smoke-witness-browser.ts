import { LiveHandOperatorSmokeWitness } from '../src/hand/live-hand-operator-smoke-witness.js';

const params = new URLSearchParams(location.search);
const runtimeUrl = params.get('runtime_url') ?? 'http://127.0.0.1:8876';
function requiredElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`visual witness page is missing ${selector}`);
  return element;
}

const canvas = requiredElement<HTMLCanvasElement>('#source');
const result = requiredElement<HTMLPreElement>('#result');
const context = (() => {
  const value = canvas.getContext('2d');
  if (!value) throw new Error('2D canvas unavailable');
  return value;
})();
const stream = canvas.captureStream(30);
const sessionId = `synthetic-moving-witness-${Date.now()}`;
const witness = new LiveHandOperatorSmokeWitness(runtimeUrl);
const anchorPosts: Promise<void>[] = [];

function postAnchor(frame: number): Promise<void> {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('anchor JPEG encode failed')), 'image/jpeg', 0.9);
  }).then(async blob => {
    const response = await fetch(`${runtimeUrl}/native-frame`, {
      method: 'POST',
      headers: {
        'Content-Type': 'image/jpeg',
        'X-Capture-Id': `${sessionId}-anchor-${frame}`,
        'X-Capture-Epoch-Ms': String(Date.now()),
        'X-Frame-Width': String(canvas.width),
        'X-Frame-Height': String(canvas.height),
      },
      body: blob,
    });
    if (!response.ok) throw new Error(`anchor ${frame} returned ${response.status}`);
  });
}

function drawFrame(frame: number): void {
  const phase = frame / 120;
  context.fillStyle = '#081012';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#eaf3ef';
  context.font = '28px monospace';
  context.fillText(`FRAME ${String(frame).padStart(4, '0')}`, 24, 42);
  context.fillStyle = '#63d8bf';
  context.fillRect(24, 62, 592 * phase, 12);

  const palmX = 320 + Math.sin(frame * 0.055) * 130;
  const palmY = 300 + Math.cos(frame * 0.041) * 48;
  context.save();
  context.translate(palmX, palmY);
  context.rotate(Math.sin(frame * 0.035) * 0.45);
  context.lineCap = 'round';
  context.lineWidth = 24;
  context.strokeStyle = '#f1b96f';
  context.beginPath();
  context.moveTo(0, 55);
  context.lineTo(0, 0);
  context.stroke();
  const lengths = [112, 142, 154, 136, 105];
  for (let finger = 0; finger < 5; finger += 1) {
    const rootX = (finger - 2) * 30;
    const bend = Math.sin(frame * 0.09 + finger * 0.7) * 0.5;
    context.save();
    context.translate(rootX, 0);
    context.rotate((finger - 2) * 0.08 + bend * 0.35);
    context.strokeStyle = ['#ef6767', '#f1b96f', '#63d8bf', '#73a9f2', '#d68af0'][finger];
    context.beginPath();
    context.moveTo(0, 0);
    context.quadraticCurveTo(bend * 45, -lengths[finger] * 0.55, bend * 70, -lengths[finger]);
    context.stroke();
    context.restore();
  }
  context.restore();
}

async function run(): Promise<void> {
  drawFrame(0);
  await witness.start({
    stream,
    sessionId,
    requestedRoute: 'synthetic-moving-camera-witness-not-hand-authority',
    initialMotionPhase: 'natural_use',
  });
  let frame = 0;
  await new Promise<void>(resolve => {
    const timer = window.setInterval(() => {
      frame += 1;
      drawFrame(frame);
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
  stream.getTracks().forEach(track => track.stop());
  result.textContent = JSON.stringify(receipt, null, 2);
  document.body.dataset.complete = 'true';
  document.body.dataset.sessionId = sessionId;
}

run().catch(error => {
  stream.getTracks().forEach(track => track.stop());
  result.textContent = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  document.body.dataset.failed = 'true';
});
