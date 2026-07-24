import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const options = parseArguments(process.argv.slice(2));
const chromeExecutable =
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const profileDirectory = await mkdtemp(join(tmpdir(), 'wet-border-portable-optics-'));
const outputDirectory = resolve(options.outputDirectory);
await mkdir(outputDirectory, { recursive: true });

const chrome = spawn(chromeExecutable, [
  '--headless=new',
  '--disable-background-networking',
  '--disable-default-apps',
  '--disable-extensions',
  '--disable-sync',
  '--hide-scrollbars',
  '--no-first-run',
  `--remote-debugging-port=${options.debugPort}`,
  `--user-data-dir=${profileDirectory}`,
  `--window-size=${options.width},${options.height}`,
  options.url
], {
  stdio: ['ignore', 'ignore', 'pipe']
});

let chromeStderr = '';
chrome.stderr.setEncoding('utf8');
chrome.stderr.on('data', (chunk) => {
  chromeStderr = `${chromeStderr}${chunk}`.slice(-16_000);
});

try {
  const target = await waitForTarget(options.debugPort, options.url, 15_000);
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

  const receipt = {
    schema: 'lerms.hill-of-hills.portable-macro-optical-browser-receipt.v1',
    status: 'complete',
    runId: options.runId,
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
      preBytes: preScreenshot.length,
      postBytes: postScreenshot.length
    }
  };
  assertReceipt(receipt);
  const reportPath = join(outputDirectory, `${options.runId}-receipt.json`);
  await writeFile(reportPath, `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(JSON.stringify({
    ok: true,
    reportPath,
    prePath,
    postPath,
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
  };
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
    before.source.handleId !== after.source.handleId ||
    before.source.readGeneration >= after.source.readGeneration
  ) {
    throw new Error('browser witness did not preserve one advancing source handle');
  }
  if (
    after.provider.revision !== 'd26f12c6750e174fc4a618f1182010ec1300f8f5' ||
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
