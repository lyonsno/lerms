import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createServer } from 'node:net';
import {
  createLaunchReceipt,
  resolveBrowserExecutable,
  writeFailureReceipt
} from './wet-border-browser-launch.mjs';

const options = parseArguments(process.argv.slice(2));
const profileDirectory = await mkdtemp(join(tmpdir(), 'wet-border-portable-optics-'));
const outputDirectory = resolve(options.outputDirectory);
await mkdir(outputDirectory, { recursive: true });
let resolution;
let chrome;
let launchReceipt;
try {
  resolution = await resolveBrowserExecutable({
    explicit: options.chrome,
    candidates: options.browserCandidates
  });
  const debugPort = await getFreePort();
  launchReceipt = createLaunchReceipt({
    resolution,
    requestedUrl: options.url,
    profileDirectory,
    debugPort
  });
  chrome = spawn(resolution.effective, [
    '--headless=new',
    '--disable-background-networking',
    '--disable-default-apps',
    '--disable-extensions',
    '--disable-sync',
    '--hide-scrollbars',
    '--no-first-run',
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${profileDirectory}`,
    `--window-size=${options.width},${options.height}`,
    options.url
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
} catch (error) {
  const failurePath = await writeFailureReceipt(outputDirectory, {
    phase: 'resolve_or_launch',
    error: String(error),
    requestedExecutable: options.chrome ?? null,
    effectiveExecutable: resolution?.effective ?? null
  });
  console.error(JSON.stringify({ ok: false, failurePath }));
  process.exitCode = 1;
}

if (!chrome) process.exit();

let chromeStderr = '';
chrome.stderr.setEncoding('utf8');
chrome.stderr.on('data', (chunk) => {
  chromeStderr = `${chromeStderr}${chunk}`.slice(-16_000);
});

try {
  const target = await waitForTarget(launchReceipt.requestedDebugPort, options.url, options.launchTimeoutMs);
  const cdp = await createCdpClient(target.webSocketDebuggerUrl);
  const browserEvents = [];
  cdp.onEvent((event) => {
    if (event.method === 'Runtime.exceptionThrown') {
      browserEvents.push({
        type: 'exception',
        text: event.params.exceptionDetails?.text ?? 'unknown exception'
      });
    }
    if (
      event.method === 'Runtime.consoleAPICalled' &&
      ['error', 'warning'].includes(event.params.type)
    ) {
      browserEvents.push({
        type: `console-${event.params.type}`,
        text: event.params.args
          .map((argument) => argument.value ?? argument.description ?? '')
          .join(' ')
      });
    }
  });
  await cdp.command('Runtime.enable');
  await cdp.command('Page.enable');

  const pre = await waitForDebugState(
    cdp,
    (state) => (
      state.status === 'active' &&
      state.sequenceStage === 'pre_remap' &&
      state.stepCount >= options.preStep
    ),
    options.timeoutMs,
    'pre-remap'
  );
  const preScreenshot = await captureScreenshot(cdp);
  const prePath = join(outputDirectory, `${options.runId}-pre-remap.png`);
  await writeFile(prePath, preScreenshot);

  const post = await waitForDebugState(
    cdp,
    (state) => (
      state.status === 'active' &&
      state.sequenceStage === 'post_remap' &&
      state.stepCount >= options.postStep
    ),
    options.timeoutMs,
    'post-remap'
  );
  const postScreenshot = await captureScreenshot(cdp);
  const postPath = join(outputDirectory, `${options.runId}-post-remap.png`);
  await writeFile(postPath, postScreenshot);
  let cameraAttachmentProbe = null;
  let cameraMotionPath = null;
  let cameraMotionBytes = null;
  if (options.url.includes('watershedOptics=1')) {
    cameraAttachmentProbe = await exerciseOpticalCameraAttachment(cdp);
    const cameraMotionScreenshot = await captureScreenshot(cdp);
    cameraMotionPath = join(outputDirectory, `${options.runId}-camera-motion.png`);
    cameraMotionBytes = cameraMotionScreenshot.length;
    await writeFile(cameraMotionPath, cameraMotionScreenshot);
  }
  let opticalOnlyPath = null;
  let opticalOnlyBytes = null;
  let opticalObservedPixelCount = null;
  if (options.url.includes('watershedOptics=1')) {
    await cdp.command('Runtime.evaluate', {
      expression: `(() => {
        document.body.style.background = '#000';
        for (const element of document.body.children) {
          if (element.id !== 'hill-fluid-optical-canvas') element.style.visibility = 'hidden';
        }
      })()`,
      returnByValue: true
    });
    const opticalOnlyScreenshot = await captureScreenshot(cdp);
    opticalOnlyPath = join(outputDirectory, `${options.runId}-optical-only.png`);
    opticalOnlyBytes = opticalOnlyScreenshot.length;
    opticalObservedPixelCount = await countNonBlackPixels(cdp, opticalOnlyScreenshot);
    await writeFile(opticalOnlyPath, opticalOnlyScreenshot);
  }

  const receipt = {
    schema: 'lerms.hill-of-hills.portable-macro-optical-browser-receipt.v1',
    status: 'candidate_unverified',
    runId: options.runId,
    launch: {
      ...launchReceipt,
      effectiveDebugPort: launchReceipt.requestedDebugPort,
      status: 'complete'
    },
    url: options.url,
    viewport: {
      width: options.width,
      height: options.height
    },
    pre,
    post,
    browserEvents,
    screenshots: {
      pre: prePath,
      post: postPath,
      cameraMotion: cameraMotionPath,
      opticalOnly: opticalOnlyPath,
      preBytes: preScreenshot.length,
      postBytes: postScreenshot.length,
      cameraMotionBytes,
      opticalOnlyBytes
    },
    cameraAttachmentProbe,
    opticalObservation: opticalOnlyPath ? {
      authority: 'browser_screenshot_pixel_readback',
      observedPixelCount: opticalObservedPixelCount,
      blank: opticalObservedPixelCount === 0
    } : null
  };
  const reportPath = join(outputDirectory, `${options.runId}-receipt.json`);
  await writeFile(reportPath, `${JSON.stringify(receipt, null, 2)}\n`);
  try {
    assertReceipt(receipt);
    receipt.status = 'complete';
    await writeFile(reportPath, `${JSON.stringify(receipt, null, 2)}\n`);
  } catch (error) {
    receipt.status = 'failed';
    receipt.failurePhase = 'assert-receipt';
    receipt.error = error instanceof Error ? error.message : String(error);
    await writeFile(reportPath, `${JSON.stringify(receipt, null, 2)}\n`);
    throw error;
  }
  console.log(JSON.stringify({
    ok: true,
    reportPath,
    prePath,
    postPath,
    cameraMotionPath,
    opticalOnlyPath,
    preStep: pre.stepCount,
    postStep: post.stepCount,
    sourceHandleId: post.portableOpticalProvider.source.handleId,
    providerRevision: post.portableOpticalProvider.provider.revision,
    browserEventCount: browserEvents.length
  }));
  cdp.close();
} finally {
  chrome.kill('SIGTERM');
  await Promise.race([
    new Promise((resolveExit) => chrome.once('exit', resolveExit)),
    new Promise((resolveTimeout) => setTimeout(resolveTimeout, 2_000))
  ]);
  if (chrome.exitCode === null) {
    chrome.kill('SIGKILL');
  }
  if (chrome.exitCode && chrome.exitCode !== 0 && !chrome.killed) {
    process.stderr.write(chromeStderr);
  }
  await writeFailureReceipt(outputDirectory, {
    phase: 'cleanup',
    status: 'cleanup_complete',
    launchId: launchReceipt.launchId,
    effectiveExecutable: resolution.effective,
    pid: chrome.pid
  }, 'browser-cleanup-receipt.json');
}

function parseArguments(argumentsList) {
  const values = new Map();
  for (let index = 0; index < argumentsList.length; index += 2) {
    values.set(argumentsList[index], argumentsList[index + 1]);
  }
  const url = values.get('--url');
  const outputDirectory = values.get('--output-directory');
  const runId = values.get('--run-id');
  if (!url || !outputDirectory || !runId) {
    throw new Error('witness requires --url, --output-directory, and --run-id');
  }
  return {
    url,
    outputDirectory,
    runId,
    debugPort: Number(values.get('--debug-port') ?? 9553),
    width: Number(values.get('--width') ?? 1496),
    height: Number(values.get('--height') ?? 998),
    preStep: Number(values.get('--pre-step') ?? 12),
    postStep: Number(values.get('--post-step') ?? 84),
    timeoutMs: Number(values.get('--timeout-ms') ?? 30_000)
    ,launchTimeoutMs: Number(values.get('--launch-timeout-ms') ?? 10_000)
    ,chrome: values.get('--chrome') ?? null
    ,browserCandidates: (values.get('--browser-candidates') ?? '').split(',').filter(Boolean)
  };
}

async function getFreePort() {
  const server = createServer();
  await new Promise((resolveListen, rejectListen) => {
    server.once('error', rejectListen);
    server.listen(0, '127.0.0.1', resolveListen);
  });
  const port = server.address().port;
  await new Promise((resolveClose) => server.close(resolveClose));
  return port;
}

async function waitForTarget(port, expectedUrl, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`);
      const targets = await response.json();
      const target = targets.find((candidate) => (
        candidate.type === 'page' &&
        candidate.url.startsWith(expectedUrl.split('?')[0])
      ));
      if (target) {
        return target;
      }
    } catch {
      // Chrome has not opened its debugging socket yet.
    }
    await delay(100);
  }
  throw new Error(`Chrome target did not appear on port ${port}`);
}

async function createCdpClient(webSocketUrl) {
  const socket = new WebSocket(webSocketUrl);
  const pending = new Map();
  const listeners = new Set();
  let nextId = 1;
  await new Promise((resolveOpen, rejectOpen) => {
    socket.addEventListener('open', resolveOpen, { once: true });
    socket.addEventListener('error', rejectOpen, { once: true });
  });
  socket.addEventListener('message', (message) => {
    const payload = JSON.parse(message.data);
    if (payload.id) {
      const request = pending.get(payload.id);
      if (!request) {
        return;
      }
      pending.delete(payload.id);
      if (payload.error) {
        request.reject(new Error(payload.error.message));
      } else {
        request.resolve(payload.result);
      }
      return;
    }
    for (const listener of listeners) {
      listener(payload);
    }
  });
  return {
    command(method, params = {}) {
      const id = nextId;
      nextId += 1;
      return new Promise((resolveCommand, rejectCommand) => {
        pending.set(id, {
          resolve: resolveCommand,
          reject: rejectCommand
        });
        socket.send(JSON.stringify({
          id,
          method,
          params
        }));
      });
    },
    onEvent(listener) {
      listeners.add(listener);
    },
    close() {
      socket.close();
    }
  };
}

async function waitForDebugState(cdp, predicate, timeoutMs, label) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const result = await cdp.command('Runtime.evaluate', {
      expression: 'window.__lermsHillKaminosDebugState ?? null',
      returnByValue: true
    });
    const state = result.result?.value;
    if (state && predicate(state)) {
      return state;
    }
    await delay(80);
  }
  throw new Error(`browser did not reach ${label} state`);
}

async function captureScreenshot(cdp) {
  const result = await cdp.command('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: false,
    fromSurface: true
  });
  return Buffer.from(result.data, 'base64');
}

async function countNonBlackPixels(cdp, png) {
  const dataUrl = `data:image/png;base64,${png.toString('base64')}`;
  const result = await cdp.command('Runtime.evaluate', {
    expression: `(async () => {
      const image = new Image();
      image.src = ${JSON.stringify(dataUrl)};
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      context.drawImage(image, 0, 0);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      let observed = 0;
      for (let index = 0; index < pixels.length; index += 4) {
        if (pixels[index] > 8 || pixels[index + 1] > 8 || pixels[index + 2] > 8) observed += 1;
      }
      return observed;
    })()`,
    awaitPromise: true,
    returnByValue: true
  });
  const observed = result.result?.value;
  if (!Number.isSafeInteger(observed) || observed < 0) {
    throw new Error('optical screenshot pixel readback returned invalid evidence');
  }
  return observed;
}

async function exerciseOpticalCameraAttachment(cdp) {
  const result = await cdp.command('Runtime.evaluate', {
    expression: `(async () => {
      const yawRow = [...document.querySelectorAll('.view-controls label')]
        .find((row) => row.querySelector('span')?.textContent === 'Camera yaw');
      const input = yawRow?.querySelector('input[type="range"]');
      if (!input) throw new Error('camera attachment probe could not find the yaw control');
      const samples = [];
      for (const yaw of [-0.32, 0.28, -0.18, 0.36]) {
        input.value = String(yaw);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const state = window.__lermsHillKaminosDebugState;
        samples.push({
          requestedYaw: yaw,
          displayFrameGeneration: state.displayFrameGeneration,
          opticalAttachmentAgeFrames: state.opticalAttachmentAgeFrames,
          timing: state.opticalCompositor?.timing ?? null
        });
      }
      return {
        authority: 'live_camera_input_and_runtime_generation_witness',
        sampleCount: samples.length,
        samples,
        maxOpticalAttachmentAgeFrames: Math.max(
          ...samples.map((sample) => sample.opticalAttachmentAgeFrames ?? Number.POSITIVE_INFINITY)
        )
      };
    })()`,
    awaitPromise: true,
    returnByValue: true
  });
  const probe = result.result?.value;
  if (!probe || !Array.isArray(probe.samples)) {
    throw new Error('camera attachment probe returned no generation evidence');
  }
  return probe;
}

function assertReceipt(receipt) {
  const before = receipt.pre.portableOpticalProvider;
  const after = receipt.post.portableOpticalProvider;
  if (
    receipt.browserEvents.length !== 0 ||
    receipt.screenshots.preBytes < 100_000 ||
    receipt.screenshots.postBytes < 100_000
  ) {
    throw new Error('browser witness is blank or emitted an exception');
  }
  if (
    receipt.url.includes('watershedOptics=1') &&
    (
      receipt.post.opticalCompositorStatus !== 'submitted-unobserved' ||
      receipt.post.opticalCompositor?.route?.effective !==
        'lerms/hill-of-hills/c7-portable-macro-optical-compositor-v0' ||
      receipt.post.opticalCompositor.route.fallback !== null ||
      receipt.post.opticalCompositor.timing?.cadence !== 'display_cadenced_same_frame' ||
      receipt.post.opticalCompositor.timing.displayFrameGeneration !==
        receipt.post.opticalCompositor.timing.cameraGeneration ||
      receipt.post.opticalCompositor.timing.displayFrameGeneration !==
        receipt.post.opticalCompositor.timing.sceneColorGeneration ||
      receipt.post.opticalCompositor.timing.displayFrameGeneration !==
        receipt.post.opticalCompositor.timing.sceneDepthGeneration ||
      receipt.post.opticalCompositor.timing.displayFrameGeneration !==
        receipt.post.opticalCompositor.timing.opticalSubmissionGeneration ||
      receipt.post.opticalCompositor.timing.retainedFrame !== false ||
      receipt.cameraAttachmentProbe?.authority !==
        'live_camera_input_and_runtime_generation_witness' ||
      receipt.cameraAttachmentProbe.sampleCount < 4 ||
      receipt.cameraAttachmentProbe.maxOpticalAttachmentAgeFrames !== 0 ||
      !receipt.cameraAttachmentProbe.samples.every((sample, index, samples) => (
        sample.opticalAttachmentAgeFrames === 0 &&
        sample.timing?.cadence === 'display_cadenced_same_frame' &&
        sample.timing.retainedFrame === false &&
        sample.timing.displayFrameGeneration === sample.displayFrameGeneration &&
        sample.timing.cameraGeneration === sample.displayFrameGeneration &&
        sample.timing.sceneColorGeneration === sample.displayFrameGeneration &&
        sample.timing.sceneDepthGeneration === sample.displayFrameGeneration &&
        sample.timing.opticalSubmissionGeneration === sample.displayFrameGeneration &&
        (index === 0 || sample.displayFrameGeneration > samples[index - 1].displayFrameGeneration)
      )) ||
      receipt.post.opticalCompositor.output.drawableWetTriangleCount <= 0 ||
      receipt.screenshots.cameraMotionBytes < 100_000 ||
      receipt.screenshots.opticalOnlyBytes < 10_000 ||
      receipt.opticalObservation?.authority !== 'browser_screenshot_pixel_readback' ||
      receipt.opticalObservation.observedPixelCount <= 0 ||
      receipt.opticalObservation.blank
    )
  ) {
    throw new Error('browser witness did not observe a nonblank exact-route optical target');
  }
  if (
    before.source.handleId !== after.source.handleId ||
    before.source.readGeneration >= after.source.readGeneration
  ) {
    throw new Error('browser witness did not preserve one advancing source handle');
  }
  if (
    after.provider.revision !== 'c7b3fdc1f761db3ab45eae5f25a72cb95f4c2d35' ||
    after.package.effective.version !== '0.3.0' ||
    after.sequenceStage !== 'post_remap' ||
    after.remap.status !== 'committed'
  ) {
    throw new Error('browser witness substituted package, provider, or remap identity');
  }
  if (
    !after.output.primaryOutputWritten ||
    after.output.partial ||
    after.output.blank ||
    after.optical.beautyClaim
  ) {
    throw new Error('browser witness reached a false optical closure');
  }
  if (
    receipt.post.firstImpact.status !== 'hit' ||
    receipt.post.firstImpact.epochs.terrain !== after.epochs.terrain ||
    receipt.post.firstImpact.successor.status !== 'remap_committed' ||
    receipt.post.firstImpact.successor.remapReceiptId !== after.remap.receiptId
  ) {
    throw new Error('browser witness lost moving-Hill first-impact successor identity');
  }
}

function delay(milliseconds) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));
}
