import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

import {
  buildCaptureReport,
  buildFailureCaptureReport,
  writeCaptureFilmstrip
} from '../scripts/glove-well-browser-smoke-capture.mjs';

const tmp = mkdtempSync(join(tmpdir(), 'lerms-glove-well-capture-contract-'));
const frameA = join(tmp, 'frame-001.png');
const frameB = join(tmp, 'frame-002.png');
writeFileSync(frameA, Buffer.from('fake-png-frame-a'));
writeFileSync(frameB, Buffer.from('fake-png-frame-b'));

const report = buildCaptureReport({
  outDir: tmp,
  url: 'http://127.0.0.1:5176/?smoke=glove-well',
  startedAtIso: '2026-06-30T20:40:00.000Z',
  completedAtIso: '2026-06-30T20:40:04.000Z',
  viewport: { width: 1440, height: 960 },
  chrome: {
    binary: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    version: 'Chrome fixture'
  },
  frameIntervalMs: 400,
  frames: [
    {
      index: 0,
      elapsedMs: 0,
      imagePath: frameA,
      statusText: 'Glove Well Live Smoke\nauthority: live_simulation\nstatus: tracking\nphase: aiming',
      status: {
        authority: 'live_simulation',
        status: 'tracking',
        phase: 'aiming',
        sequence: '41',
        frame: 'wilor-frame-41'
      }
    },
    {
      index: 1,
      elapsedMs: 400,
      imagePath: frameB,
      statusText: 'Glove Well Live Smoke\nauthority: live_simulation\nstatus: no_new_packet\nphase: released',
      status: {
        authority: 'live_simulation',
        status: 'no_new_packet',
        phase: 'released',
        sequence: '41',
        frame: 'wilor-frame-41'
      }
    }
  ]
});

assert.equal(report.ok, true);
assert.equal(report.schema, 'lerms.glove-well-browser-smoke-capture-witness.v0');
assert.equal(report.captureMode, 'whole_browser_chrome_cdp_screenshot');
assert.equal(report.frameCount, 2);
assert.equal(report.frames[0].status.authority, 'live_simulation');
assert.equal(report.frames[1].status.phase, 'released');
assert.equal(report.captureScope.includes('embedded_kaminos_iframe_pixels'), true);
assert.equal(report.authorityNote.includes('visual witness'), true);

const filmstripPath = join(tmp, 'filmstrip.html');
writeCaptureFilmstrip({ report, filmstripPath });
assert.equal(existsSync(filmstripPath), true);
const filmstrip = readFileSync(filmstripPath, 'utf8');
assert.match(filmstrip, /lerms\.glove-well-browser-smoke-capture-witness\.v0/);
assert.match(filmstrip, /frame-001\.png/);
assert.match(filmstrip, /frame-002\.png/);
assert.match(filmstrip, /whole_browser_chrome_cdp_screenshot/);
assert.match(filmstrip, /embedded_kaminos_iframe_pixels/);

const failure = buildFailureCaptureReport({
  outDir: tmp,
  url: 'http://127.0.0.1:5176/?smoke=glove-well',
  startedAtIso: '2026-06-30T20:40:00.000Z',
  phase: 'launching-chrome',
  error: 'Chrome binary missing',
  frameCountRequested: 6,
  frameIntervalMs: 400,
  lastTrustworthyEvidence: {
    outDir: tmp,
    url: 'http://127.0.0.1:5176/?smoke=glove-well',
    capturedFrameCount: 0
  }
});
assert.equal(failure.ok, false);
assert.equal(failure.failureKind, 'browser-smoke-capture-invalid');
assert.equal(failure.lastTrustworthyEvidence.capturedFrameCount, 0);

const cliHelp = spawnSync(process.execPath, ['scripts/glove-well-browser-smoke-capture.mjs', '--help'], {
  cwd: process.cwd(),
  encoding: 'utf8'
});
assert.equal(cliHelp.status, 0);
assert.match(cliHelp.stdout, /--url/);
assert.match(cliHelp.stdout, /--out-dir/);
assert.match(cliHelp.stdout, /--frame-count/);

const viteConfig = readFileSync('vite.config.ts', 'utf8');
assert.match(viteConfig, /__lerms\/glove-well-capture\/start/, 'dev server exposes a capture start endpoint for the browser demo');
assert.match(viteConfig, /glove-well-browser-smoke-capture\.mjs/, 'capture start endpoint launches the existing browser smoke capture witness');
assert.match(viteConfig, /child_process/, 'capture start endpoint runs the witness server-side instead of asking the operator to paste a terminal command');

const browserSmoke = readFileSync('src/glove-well-browser-smoke.ts', 'utf8');
assert.match(browserSmoke, /glove-well-capture-button/, 'browser smoke renders an operator capture control');
assert.match(browserSmoke, /__lerms\/glove-well-capture\/start/, 'browser capture control posts to the dev-server capture endpoint');
assert.match(browserSmoke, /capture:/, 'operator-visible status includes capture state');

console.log('glove well browser smoke capture contracts passed');
