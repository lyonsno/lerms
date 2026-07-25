#!/usr/bin/env node

import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { inflateSync } from 'node:zlib';

const EXPECTED_ROUTE = 'lerms/hill-of-hills/horde-same-scene-prefix-replay';
const EXPECTED_PRESENTER =
  '0482274d0612b55969ad6c71f8f5c79c8721ce77';
const EXPECTED_VERIFIER =
  'f916a9309ef4ab3f35d3a94d4e6084a3cdd2f474';
const EXPECTED_VERIFIER_BLOB =
  'ae5aec5b6978a6f9d192d0a37aa7a254408201d7';
const EXPECTED_RECEIPT_SHA256 =
  'c5e087987ebe5e092d7b83d56f3c514c97629413d3e81e5989955b0acf323663';
const EXPECTED_MANIFEST_SHA256 =
  'c8a25168cbbf9d45f7f2b225ab630e088f14a5b97f8b5cb561af7258e335c341';
const EXPECTED_SVG_SHA256 =
  'f657e3365833e5e0465a208ea367ce6c40a429125528f82f25fa71dda39e626c';
const CHROME =
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const options = parseArgs(process.argv.slice(2));
const report = {
  schema: 'lerms.horde-same-scene-browser-witness.v0',
  requestedUrl: options.url,
  effectiveUrl: null,
  viewport: { width: options.width, height: options.height },
  phase: 'launch',
  failurePhase: null,
  ok: false,
  smokeStatus: null,
  requestedRoute: null,
  effectiveRoute: null,
  presenterRevision: null,
  verifierRevision: null,
  verifierModuleBlob: null,
  acceptedReceiptSha256: null,
  manifestSha256: null,
  svgSha256: null,
  sourceStatus: null,
  playbackAdvanced: false,
  pauseHeld: false,
  departureBodyAbsent: false,
  activePanelIsolated: false,
  motionBodyVisible: false,
  layoutContained: false,
  headerHeightAcceptable: false,
  primaryOutputWritten: false,
  screenshot: options.screenshot,
};

async function runWitness() {
  let browser;
  let chrome;
  let profileDir;

  try {
  const port = await freePort();
  profileDir = mkdtempSync(`${tmpdir()}/lerms-same-scene-chrome-`);
  chrome = spawn(
    CHROME,
    [
      '--headless=new',
      '--disable-background-networking',
      '--disable-breakpad',
      '--disable-component-update',
      '--disable-default-apps',
      '--disable-extensions',
      '--disable-features=Translate',
      '--disable-sync',
      '--hide-scrollbars',
      '--metrics-recording-only',
      '--no-first-run',
      '--no-default-browser-check',
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${profileDir}`,
      'about:blank',
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] },
  );

  const target = await waitForPageTarget(port, chrome);
  browser = await CdpConnection.open(target.webSocketDebuggerUrl);
  await browser.command('Page.enable');
  await browser.command('Runtime.enable');
  await browser.command('Emulation.setDeviceMetricsOverride', {
    width: options.width,
    height: options.height,
    deviceScaleFactor: 1,
    mobile: options.width <= 700,
  });
  report.phase = 'navigate';
  await browser.command('Page.navigate', { url: options.url });
  await waitFor(
    async () => {
      const status = await browser.evaluate(
        'document.documentElement.dataset.smokeStatus',
      );
      return status === 'verified' || status === 'failed';
    },
    12_000,
    'smoke source verification',
  );

  report.phase = 'source-identity';
  const identity = await browser.evaluate(`(() => ({
    effectiveUrl: location.href,
    smokeStatus: document.documentElement.dataset.smokeStatus ?? null,
    requestedRoute: document.documentElement.dataset.requestedRoute ?? null,
    effectiveRoute: document.documentElement.dataset.effectiveRoute ?? null,
    presenterRevision:
      document.documentElement.dataset.presenterRevision ?? null,
    verifierRevision:
      document.documentElement.dataset.verifierRevision ?? null,
    verifierModuleBlob:
      document.documentElement.dataset.verifierModuleBlob ?? null,
    acceptedReceiptSha256:
      document.documentElement.dataset.acceptedReceiptSha256 ?? null,
    manifestSha256:
      document.documentElement.dataset.manifestSha256 ?? null,
    svgSha256: document.documentElement.dataset.svgSha256 ?? null,
    sourceStatus: document.documentElement.dataset.sourceStatus ?? null,
    error: document.querySelector('[data-smoke-error]')?.textContent ?? null,
  }))()`);
  Object.assign(report, identity);
  assert.equal(
    report.smokeStatus,
    'verified',
    `smoke source did not verify: ${identity.error ?? 'no error surfaced'}`,
  );
  assert.equal(report.requestedRoute, EXPECTED_ROUTE);
  assert.equal(report.effectiveRoute, EXPECTED_ROUTE);
  assert.equal(report.presenterRevision, EXPECTED_PRESENTER);
  assert.equal(report.verifierRevision, EXPECTED_VERIFIER);
  assert.equal(report.verifierModuleBlob, EXPECTED_VERIFIER_BLOB);
  assert.equal(report.acceptedReceiptSha256, EXPECTED_RECEIPT_SHA256);
  assert.equal(report.manifestSha256, EXPECTED_MANIFEST_SHA256);
  assert.equal(report.svgSha256, EXPECTED_SVG_SHA256);
  assert.equal(report.sourceStatus, 'exact-accepted-replay');

  report.phase = 'playback';
  const initialFrame = await browser.evaluate(
    `document.querySelector('[data-smoke-viewport]')?.dataset.frameIndex`,
  );
  await delay(1_100);
  const advancedFrame = await browser.evaluate(
    `document.querySelector('[data-smoke-viewport]')?.dataset.frameIndex`,
  );
  report.playbackAdvanced = advancedFrame !== initialFrame;
  assert.ok(report.playbackAdvanced, 'timed replay did not advance');

  report.phase = 'controls';
  await browser.evaluate(
    `document.querySelector('[data-play-toggle]')?.click()`,
  );
  const pausedFrame = await browser.evaluate(
    `document.querySelector('[data-smoke-viewport]')?.dataset.frameIndex`,
  );
  await delay(800);
  const heldFrame = await browser.evaluate(
    `document.querySelector('[data-smoke-viewport]')?.dataset.frameIndex`,
  );
  report.pauseHeld = pausedFrame === heldFrame;
  assert.ok(report.pauseHeld, 'pause control did not hold the current frame');

  await browser.evaluate(
    `document.querySelector('[data-frame-index="17"]')?.click()`,
  );
  await delay(200);
  const departure = await browser.evaluate(`(() => {
    const viewport = document.querySelector('[data-smoke-viewport]');
    const panel = viewport?.querySelector('[data-panel="17"]');
    return {
      frameIndex: viewport?.dataset.frameIndex,
      frameKind: viewport?.dataset.frameKind,
      prefixSampleCount: viewport?.dataset.prefixSampleCount,
      bodyAbsent: Boolean(panel) &&
        !panel.querySelector('[data-visible-lerm-body="true"]'),
      visiblePanelCount: [...(viewport?.querySelectorAll('[data-panel]') ?? [])]
        .filter((candidate) => getComputedStyle(candidate).display !== 'none')
        .length,
    };
  })()`);
  report.departureBodyAbsent =
    departure.frameIndex === '17' &&
    departure.frameKind === 'after-departure' &&
    departure.prefixSampleCount === '15' &&
    departure.bodyAbsent === true;
  assert.ok(
    report.departureBodyAbsent,
    'later Hill frame did not preserve the accepted body-absent state',
  );
  report.activePanelIsolated = departure.visiblePanelCount === 1;
  assert.ok(
    report.activePanelIsolated,
    'inactive replay panels can bleed into the active viewport',
  );

  await browser.evaluate(
    `document.querySelector('[data-frame-index="8"]')?.click()`,
  );
  await delay(200);
  const moving = await browser.evaluate(`(() => {
    const viewport = document.querySelector('[data-smoke-viewport]');
    const panel = viewport?.querySelector('[data-panel="8"]');
    return {
      frameIndex: viewport?.dataset.frameIndex,
      frameKind: viewport?.dataset.frameKind,
      prefixSampleCount: viewport?.dataset.prefixSampleCount,
      bodyVisible: Boolean(
        panel?.querySelector('[data-visible-lerm-body="true"]'),
      ),
    };
  })()`);
  report.motionBodyVisible =
    moving.frameIndex === '8' &&
    moving.frameKind === 'actor-prefix' &&
    moving.prefixSampleCount === '8' &&
    moving.bodyVisible === true;
  assert.ok(
    report.motionBodyVisible,
    'mid-traversal capture does not contain the accepted moving Lerm body',
  );

  report.phase = 'layout';
  const layout = await browser.evaluate(`(() => {
    const selectors = [
      '.smoke-header',
      '.stage',
      '.transport',
      '.smoke-footer',
    ];
    const rects = selectors.map((selector) => {
      const rect = document.querySelector(selector)?.getBoundingClientRect();
      return rect && {
        selector,
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
      };
    });
    const contained = rects.every((rect) =>
      rect &&
      rect.left >= -0.5 &&
      rect.top >= -0.5 &&
      rect.right <= innerWidth + 0.5 &&
      rect.bottom <= innerHeight + 0.5 &&
      rect.width > 0 &&
      rect.height > 0
    );
    const ordered = rects.every((rect, index) =>
      index === 0 || rect.top >= rects[index - 1].bottom - 0.5
    );
    const noPageOverflow =
      document.documentElement.scrollWidth <= innerWidth &&
      document.documentElement.scrollHeight <= innerHeight;
    const unclippedControls = [
      ...document.querySelectorAll('button, .source-state, .smoke-footer strong'),
    ].every((element) =>
      element.scrollWidth <= element.clientWidth + 1 &&
      element.scrollHeight <= element.clientHeight + 1
    );
    return { rects, contained, ordered, noPageOverflow, unclippedControls };
  })()`);
  report.layout = layout;
  report.headerHeightAcceptable =
    layout.rects[0].height <= (options.width <= 700 ? 120 : 100);
  report.layoutContained =
    layout.contained &&
    layout.ordered &&
    layout.noPageOverflow &&
    layout.unclippedControls &&
    report.headerHeightAcceptable;
  assert.ok(report.layoutContained, 'smoke layout is clipped or overlapping');

  report.phase = 'primary-output';
  const capture = await browser.command('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
    captureBeyondViewport: false,
  });
  const png = Buffer.from(capture.data, 'base64');
  writeFileSync(options.screenshot, png);
  const pixelEvidence = inspectPng(png);
  report.pixelEvidence = pixelEvidence;
  report.primaryOutputWritten =
    statSync(options.screenshot).size === png.length &&
    pixelEvidence.sampledColors >= 32 &&
    pixelEvidence.luminanceRange >= 24;
  assert.ok(
    report.primaryOutputWritten,
    'browser screenshot is missing, blank, or partial',
  );

  report.phase = 'complete';
  report.ok = true;
  } catch (error) {
    report.failurePhase = report.phase;
    report.error = error instanceof Error ? error.message : String(error);
    process.exitCode = 1;
  } finally {
    try {
      browser?.close();
    } catch {}
    if (chrome && chrome.exitCode === null) {
      chrome.kill('SIGTERM');
      await Promise.race([
        new Promise((resolveExit) => chrome.once('exit', resolveExit)),
        delay(1_500),
      ]);
    }
    if (profileDir) {
      try {
        rmSync(profileDir, {
          recursive: true,
          force: true,
          maxRetries: 5,
          retryDelay: 100,
        });
      } catch (error) {
        report.cleanupError =
          error instanceof Error ? error.message : String(error);
      }
    }
    writeFileSync(options.report, `${JSON.stringify(report, null, 2)}\n`);
  }

  if (report.ok) {
    console.log(
      `Lerm Horde browser witness passed: ${options.report} / ${options.screenshot}`,
    );
  } else {
    console.error(
      `Lerm Horde browser witness failed during ${report.failurePhase}: ${report.error}`,
    );
  }
}

function parseArgs(args) {
  const values = new Map();
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    if (!key?.startsWith('--') || value === undefined) {
      throw new Error(`invalid browser witness argument ${key ?? ''}`);
    }
    values.set(key.slice(2), value);
  }
  const viewport = values.get('viewport') ?? '1440x900';
  const match = /^(\d+)x(\d+)$/.exec(viewport);
  if (!match) throw new Error(`invalid --viewport ${viewport}`);
  const label = values.get('label') ?? 'desktop';
  return {
    url: values.get('url') ?? 'http://127.0.0.1:4198/smoke.html',
    width: Number(match[1]),
    height: Number(match[2]),
    report: resolve(
      values.get('report') ??
        `${tmpdir()}/lerms-same-scene-smoke-${label}.json`,
    ),
    screenshot: resolve(
      values.get('screenshot') ??
        `${tmpdir()}/lerms-same-scene-smoke-${label}.png`,
    ),
  };
}

class CdpConnection {
  static async open(url) {
    const socket = new WebSocket(url);
    await new Promise((resolveOpen, rejectOpen) => {
      socket.addEventListener('open', resolveOpen, { once: true });
      socket.addEventListener('error', rejectOpen, { once: true });
    });
    return new CdpConnection(socket);
  }

  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
    socket.addEventListener('message', ({ data }) => {
      const message = JSON.parse(String(data));
      if (!message.id) return;
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) {
        pending.reject(
          new Error(`${message.error.message} (${message.error.code})`),
        );
      } else {
        pending.resolve(message.result);
      }
    });
  }

  command(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolveCommand, rejectCommand) => {
      this.pending.set(id, {
        resolve: resolveCommand,
        reject: rejectCommand,
      });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const response = await this.command('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (response.exceptionDetails) {
      throw new Error(
        response.exceptionDetails.exception?.description ??
          response.exceptionDetails.text,
      );
    }
    return response.result.value;
  }

  close() {
    this.socket.close();
  }
}

async function freePort() {
  const server = createServer();
  await new Promise((resolveListen, rejectListen) => {
    server.once('error', rejectListen);
    server.listen(0, '127.0.0.1', resolveListen);
  });
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  await new Promise((resolveClose) => server.close(resolveClose));
  return address.port;
}

async function waitForPageTarget(port, process) {
  let stderr = '';
  process.stderr.on('data', (chunk) => {
    stderr += String(chunk);
  });
  const startedAt = Date.now();
  while (Date.now() - startedAt < 10_000) {
    if (process.exitCode !== null) {
      throw new Error(`Chrome exited before CDP target: ${stderr.trim()}`);
    }
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`);
      const targets = await response.json();
      const page = targets.find(
        (target) => target.type === 'page' && target.webSocketDebuggerUrl,
      );
      if (page) return page;
    } catch {}
    await delay(100);
  }
  throw new Error(`Chrome CDP page target timed out: ${stderr.trim()}`);
}

async function waitFor(predicate, timeoutMs, label) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await predicate()) return;
    await delay(100);
  }
  throw new Error(`${label} timed out after ${timeoutMs} ms`);
}

function delay(milliseconds) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));
}

function inspectPng(png) {
  assert.deepEqual(
    png.subarray(0, 8),
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    'primary output is not PNG',
  );
  let offset = 8;
  let width;
  let height;
  let bitDepth;
  let colorType;
  let interlace;
  const compressed = [];
  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.subarray(offset + 4, offset + 8).toString('ascii');
    const data = png.subarray(offset + 8, offset + 8 + length);
    offset += 12 + length;
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === 'IDAT') {
      compressed.push(data);
    } else if (type === 'IEND') {
      break;
    }
  }
  assert.equal(bitDepth, 8, 'unsupported screenshot PNG bit depth');
  assert.equal(interlace, 0, 'unsupported interlaced screenshot PNG');
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : null;
  assert.ok(channels, `unsupported screenshot PNG color type ${colorType}`);
  assert.equal(width, options.width);
  assert.equal(height, options.height);

  const raw = inflateSync(Buffer.concat(compressed));
  const stride = width * channels;
  const previous = Buffer.alloc(stride);
  const current = Buffer.alloc(stride);
  const colors = new Set();
  let minLuminance = 255;
  let maxLuminance = 0;
  let rawOffset = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = raw[rawOffset++];
    for (let x = 0; x < stride; x += 1) {
      const value = raw[rawOffset++];
      const left = x >= channels ? current[x - channels] : 0;
      const up = previous[x];
      const upperLeft = x >= channels ? previous[x - channels] : 0;
      current[x] = unfilter(filter, value, left, up, upperLeft);
    }
    if (y % 12 === 0) {
      for (let x = 0; x < width; x += 12) {
        const pixel = x * channels;
        const red = current[pixel];
        const green = current[pixel + 1];
        const blue = current[pixel + 2];
        colors.add(`${red},${green},${blue}`);
        const luminance = (red * 299 + green * 587 + blue * 114) / 1000;
        minLuminance = Math.min(minLuminance, luminance);
        maxLuminance = Math.max(maxLuminance, luminance);
      }
    }
    current.copy(previous);
  }
  return {
    width,
    height,
    sampledColors: colors.size,
    luminanceRange: Number((maxLuminance - minLuminance).toFixed(2)),
  };
}

function unfilter(filter, value, left, up, upperLeft) {
  if (filter === 0) return value;
  if (filter === 1) return (value + left) & 0xff;
  if (filter === 2) return (value + up) & 0xff;
  if (filter === 3) return (value + Math.floor((left + up) / 2)) & 0xff;
  if (filter === 4) return (value + paeth(left, up, upperLeft)) & 0xff;
  throw new Error(`unsupported screenshot PNG filter ${filter}`);
}

function paeth(left, up, upperLeft) {
  const prediction = left + up - upperLeft;
  const leftDistance = Math.abs(prediction - left);
  const upDistance = Math.abs(prediction - up);
  const upperLeftDistance = Math.abs(prediction - upperLeft);
  if (leftDistance <= upDistance && leftDistance <= upperLeftDistance) {
    return left;
  }
  return upDistance <= upperLeftDistance ? up : upperLeft;
}

await runWitness();
