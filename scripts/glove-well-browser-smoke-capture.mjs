#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const SCHEMA = 'lerms.glove-well-browser-smoke-capture-witness.v0';
const CAPTURE_MODE = 'whole_browser_chrome_cdp_screenshot';
const DEFAULT_URL = 'http://127.0.0.1:5176/?smoke=glove-well';
const DEFAULT_VIEWPORT = { width: 1440, height: 960 };
const DEFAULT_FRAME_COUNT = 10;
const DEFAULT_INTERVAL_MS = 320;

export function buildCaptureReport({
  outDir,
  url,
  startedAtIso,
  completedAtIso,
  viewport,
  chrome,
  frameIntervalMs,
  frames
}) {
  return {
    ok: true,
    schema: SCHEMA,
    captureMode: CAPTURE_MODE,
    captureScope: [
      'lerms_browser_smoke_canvas',
      'embedded_kaminos_iframe_pixels',
      'operator_visible_status_panel'
    ],
    authorityNote:
      'visual witness of browser display and embedded camera/compositor pixels; source-truth acceptance still belongs to packet/report predicates',
    outputDir: outDir,
    url,
    startedAtIso,
    completedAtIso,
    viewport,
    chrome,
    frameIntervalMs,
    frameCount: frames.length,
    filmstripPath: join(outDir, 'filmstrip.html'),
    reportPath: join(outDir, 'capture-report.json'),
    frames
  };
}

export function buildFailureCaptureReport({
  outDir,
  url,
  startedAtIso,
  phase,
  error,
  frameCountRequested,
  frameIntervalMs,
  lastTrustworthyEvidence
}) {
  return {
    ok: false,
    schema: SCHEMA,
    captureMode: CAPTURE_MODE,
    phase,
    failureKind: 'browser-smoke-capture-invalid',
    error,
    outputDir: outDir,
    url,
    startedAtIso,
    frameCountRequested,
    frameIntervalMs,
    lastTrustworthyEvidence
  };
}

export function writeCaptureFilmstrip({ report, filmstripPath }) {
  mkdirSync(dirname(filmstripPath), { recursive: true });
  const rows = report.frames
    .map((frame) => {
      const imageSrc = escapeHtml(relative(dirname(filmstripPath), frame.imagePath));
      const status = escapeHtml(frame.statusText || JSON.stringify(frame.status ?? {}, null, 2));
      return `<article class="frame">
        <img src="${imageSrc}" alt="Glove Well smoke frame ${frame.index + 1}">
        <pre>${status}</pre>
      </article>`;
    })
    .join('\n');
  writeFileSync(
    filmstripPath,
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Glove Well Browser Smoke Filmstrip</title>
    <style>
      body { margin: 0; background: #071111; color: #edf6e8; font: 13px/1.45 ui-monospace, SFMono-Regular, Menlo, monospace; }
      header { position: sticky; top: 0; z-index: 1; padding: 12px 16px; background: #06100d; border-bottom: 1px solid rgba(130, 226, 190, 0.28); }
      main { display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 12px; padding: 12px; }
      .frame { border: 1px solid rgba(244, 198, 79, 0.28); background: rgba(0, 0, 0, 0.2); }
      img { display: block; width: 100%; height: auto; background: #000; }
      pre { margin: 0; padding: 10px; white-space: pre-wrap; color: #d9f7e8; }
    </style>
  </head>
  <body>
    <header>
      <div>${SCHEMA}</div>
      <div>${CAPTURE_MODE}</div>
      <div>${escapeHtml(report.url)}</div>
      <div>${escapeHtml(report.captureScope.join(', '))}</div>
    </header>
    <main>
      ${rows}
    </main>
  </body>
</html>
`,
    'utf8'
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(helpText());
    return 0;
  }

  const startedAtIso = new Date().toISOString();
  mkdirSync(args.outDir, { recursive: true });
  try {
    const report = await captureSmoke(args, startedAtIso);
    const reportPath = args.report ?? report.reportPath;
    const filmstripPath = args.filmstrip ?? report.filmstripPath;
    const finalReport = {
      ...report,
      reportPath,
      filmstripPath
    };
    writeCaptureFilmstrip({ report: finalReport, filmstripPath });
    writeJson(reportPath, finalReport);
    process.stdout.write(`${JSON.stringify({ ok: true, reportPath, filmstripPath, frameCount: finalReport.frameCount }, null, 2)}\n`);
    return 0;
  } catch (error) {
    const failure = buildFailureCaptureReport({
      outDir: args.outDir,
      url: args.url,
      startedAtIso,
      phase: error?.phase ?? 'capturing-browser-smoke',
      error: messageFor(error),
      frameCountRequested: args.frameCount,
      frameIntervalMs: args.intervalMs,
      lastTrustworthyEvidence: {
        outDir: args.outDir,
        url: args.url,
        capturedFrameCount: error?.capturedFrameCount ?? countCapturedFrames(args.outDir)
      }
    });
    writeJson(args.report ?? join(args.outDir, 'capture-report.json'), failure);
    process.stderr.write(`${failure.error}\n`);
    return 1;
  }
}

async function captureSmoke(args, startedAtIso) {
  const chromeBin = args.chromeBin ?? findChromeBinary();
  if (!chromeBin) throw phasedError('launching-chrome', 'Chrome binary missing; pass --chrome-bin');
  const profileDir = join(args.outDir, 'chrome-profile');
  rmSync(profileDir, { recursive: true, force: true });
  mkdirSync(profileDir, { recursive: true });
  const chrome = spawn(chromeBin, [
    '--headless=new',
    '--remote-debugging-port=0',
    `--user-data-dir=${profileDir}`,
    `--window-size=${args.viewport.width},${args.viewport.height}`,
    '--hide-scrollbars',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-networking',
    'about:blank'
  ], {
    stdio: ['ignore', 'ignore', 'pipe']
  });

  let cdp;
  const frames = [];
  try {
    const wsUrl = await waitForDevtoolsUrl(chrome);
    cdp = await CdpClient.connect(wsUrl);
    const chromeVersion = await cdp.send('Browser.getVersion');
    const target = await cdp.send('Target.createTarget', { url: 'about:blank' });
    const attached = await cdp.send('Target.attachToTarget', { targetId: target.targetId, flatten: true });
    const sessionId = attached.sessionId;
    await cdp.send('Page.enable', {}, sessionId);
    await cdp.send('Runtime.enable', {}, sessionId);
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: args.viewport.width,
      height: args.viewport.height,
      deviceScaleFactor: 1,
      mobile: false
    }, sessionId);
    await cdp.send('Page.navigate', { url: args.url }, sessionId);
    await sleep(args.settleMs);

    for (let index = 0; index < args.frameCount; index += 1) {
      if (index > 0) await sleep(args.intervalMs);
      const elapsedMs = index === 0 ? 0 : index * args.intervalMs;
      const statusText = await readStatusText(cdp, sessionId);
      const screenshot = await cdp.send('Page.captureScreenshot', {
        format: 'png',
        fromSurface: true,
        captureBeyondViewport: false
      }, sessionId);
      const imagePath = join(args.outDir, `frame-${String(index + 1).padStart(3, '0')}.png`);
      writeFileSync(imagePath, Buffer.from(screenshot.data, 'base64'));
      frames.push({
        index,
        elapsedMs,
        imagePath,
        statusText,
        status: parseStatusText(statusText)
      });
    }

    return buildCaptureReport({
      outDir: args.outDir,
      url: args.url,
      startedAtIso,
      completedAtIso: new Date().toISOString(),
      viewport: args.viewport,
      chrome: {
        binary: chromeBin,
        version: chromeVersion.product ?? chromeVersion.userAgent ?? 'unknown'
      },
      frameIntervalMs: args.intervalMs,
      frames
    });
  } catch (error) {
    error.capturedFrameCount = frames.length;
    throw error;
  } finally {
    if (cdp) cdp.close();
    chrome.kill('SIGTERM');
    await sleep(100);
    if (!chrome.killed) chrome.kill('SIGKILL');
  }
}

class CdpClient {
  static async connect(wsUrl) {
    if (typeof WebSocket === 'undefined') {
      throw phasedError('connecting-chrome-devtools', 'global WebSocket is unavailable in this Node runtime');
    }
    const socket = new WebSocket(wsUrl);
    const client = new CdpClient(socket);
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(phasedError('connecting-chrome-devtools', 'timed out connecting to Chrome DevTools')), 5000);
      socket.addEventListener('open', () => {
        clearTimeout(timeout);
        resolve();
      }, { once: true });
      socket.addEventListener('error', () => {
        clearTimeout(timeout);
        reject(phasedError('connecting-chrome-devtools', 'Chrome DevTools websocket error'));
      }, { once: true });
    });
    return client;
  }

  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
    socket.addEventListener('message', (event) => this.handleMessage(event));
  }

  send(method, params = {}, sessionId = undefined) {
    const id = this.nextId;
    this.nextId += 1;
    const payload = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify(payload));
    });
  }

  handleMessage(event) {
    const message = JSON.parse(event.data);
    if (!message.id) return;
    const pending = this.pending.get(message.id);
    if (!pending) return;
    this.pending.delete(message.id);
    if (message.error) pending.reject(new Error(message.error.message ?? JSON.stringify(message.error)));
    else pending.resolve(message.result ?? {});
  }

  close() {
    this.socket.close();
  }
}

async function readStatusText(cdp, sessionId) {
  const result = await cdp.send('Runtime.evaluate', {
    expression: 'document.querySelector(".glove-well-smoke-status")?.textContent ?? ""',
    returnByValue: true
  }, sessionId);
  return String(result.result?.value ?? '');
}

function parseStatusText(text) {
  const status = {};
  for (const line of text.split('\n')) {
    const match = /^([^:]+):\s*(.*)$/.exec(line);
    if (match) status[match[1].trim()] = match[2].trim();
  }
  return status;
}

function waitForDevtoolsUrl(chrome) {
  return new Promise((resolve, reject) => {
    let buffer = '';
    const timeout = setTimeout(() => reject(phasedError('launching-chrome', 'timed out waiting for Chrome DevTools URL')), 8000);
    chrome.stderr.on('data', (chunk) => {
      buffer += chunk.toString();
      const match = /DevTools listening on (ws:\/\/[^\s]+)/.exec(buffer);
      if (match) {
        clearTimeout(timeout);
        resolve(match[1]);
      }
    });
    chrome.on('exit', (code) => {
      clearTimeout(timeout);
      reject(phasedError('launching-chrome', `Chrome exited before DevTools was ready with code ${code}`));
    });
  });
}

function parseArgs(argv) {
  const args = {
    help: false,
    url: DEFAULT_URL,
    outDir: join(tmpdir(), `lerms-glove-well-browser-smoke-capture-${Date.now()}`),
    report: null,
    filmstrip: null,
    frameCount: DEFAULT_FRAME_COUNT,
    intervalMs: DEFAULT_INTERVAL_MS,
    settleMs: 1200,
    viewport: DEFAULT_VIEWPORT,
    chromeBin: null
  };

  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (key === '--help' || key === '-h') {
      args.help = true;
      continue;
    }
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`missing value for ${key}`);
    if (key === '--url') args.url = value;
    else if (key === '--out-dir') args.outDir = resolve(value);
    else if (key === '--report') args.report = resolve(value);
    else if (key === '--filmstrip') args.filmstrip = resolve(value);
    else if (key === '--frame-count') args.frameCount = Number(value);
    else if (key === '--interval-ms') args.intervalMs = Number(value);
    else if (key === '--settle-ms') args.settleMs = Number(value);
    else if (key === '--viewport') args.viewport = parseViewport(value);
    else if (key === '--chrome-bin') args.chromeBin = value;
    else throw new Error(`unknown argument ${key}`);
    index += 1;
  }

  if (!Number.isInteger(args.frameCount) || args.frameCount <= 0) throw new Error('--frame-count must be a positive integer');
  if (!Number.isFinite(args.intervalMs) || args.intervalMs < 0) throw new Error('--interval-ms must be finite and non-negative');
  if (!Number.isFinite(args.settleMs) || args.settleMs < 0) throw new Error('--settle-ms must be finite and non-negative');
  return args;
}

function parseViewport(value) {
  const match = /^(\d+)x(\d+)$/.exec(value) ?? /^(\d+),(\d+)$/.exec(value);
  if (!match) throw new Error('--viewport must look like 1440x960');
  return {
    width: Number(match[1]),
    height: Number(match[2])
  };
}

function findChromeBinary() {
  const candidates = [
    process.env.CHROME_BIN,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser'
  ].filter(Boolean);
  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

function countCapturedFrames(outDir) {
  try {
    return Array.from({ length: 999 }, (_, index) => join(outDir, `frame-${String(index + 1).padStart(3, '0')}.png`))
      .filter((path) => existsSync(path)).length;
  } catch {
    return 0;
  }
}

function writeJson(path, payload) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(payload, null, 2)}\n`);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function messageFor(error) {
  return error instanceof Error ? error.message : String(error);
}

function phasedError(phase, message) {
  const error = new Error(message);
  error.phase = phase;
  return error;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function helpText() {
  return `Usage: npm run witness:glove-well-browser-smoke-capture -- [options]

Options:
  --url <url>              Browser smoke URL (default: ${DEFAULT_URL})
  --out-dir <path>         Output directory for frames, report, and filmstrip
  --report <path>          JSON report path (default: <out-dir>/capture-report.json)
  --filmstrip <path>       HTML filmstrip path (default: <out-dir>/filmstrip.html)
  --frame-count <n>        Number of frames to capture (default: ${DEFAULT_FRAME_COUNT})
  --interval-ms <n>        Delay between frames (default: ${DEFAULT_INTERVAL_MS})
  --settle-ms <n>          Initial page settle delay (default: 1200)
  --viewport <WxH>         Browser viewport (default: ${DEFAULT_VIEWPORT.width}x${DEFAULT_VIEWPORT.height})
  --chrome-bin <path>      Chrome/Chromium executable path
  --help                   Show this help
`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().then((code) => {
    process.exitCode = code;
  }).catch((error) => {
    process.stderr.write(`${messageFor(error)}\n`);
    process.exitCode = 1;
  });
}
