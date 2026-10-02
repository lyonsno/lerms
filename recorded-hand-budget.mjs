import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createWriteStream, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import net from 'node:net';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const args = new Map();
for (let i = 2; i < process.argv.length; i += 2) args.set(process.argv[i], process.argv[i+1]);
const out = resolve(args.get('--output'));
mkdirSync(out, { recursive: true });
const report = { schema: 'lerms.recorded-hand-budget.v0', status: 'running',
  receiver: args.get('--receiver') ?? null, primaryOutputWritten: false,
  inputAuthority: 'retained_camera_replayed_by_chromium_fake_capture_not_live_operator',
  workloadAuthority: 'fixed_five_finger_Juice80_fixture_not_live_emission_law',
  failurePhase: 'input_validation', cases: [] };
const reportPath = `${out}/report.json`;
const save = () => writeFileSync(reportPath, JSON.stringify(report, null, 2));
const sha = data => createHash('sha256').update(data).digest('hex');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
save();
let vite;
let runtime;
let browser;
let runtimeUrl;
let processes = [];
async function port() {
  const server = net.createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const value = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return value;
}
function start(command, argv, cwd, name) {
  const process = spawn(command, argv, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
  process.stdout.pipe(createWriteStream(`${out}/${name}.stdout.log`));
  process.stderr.pipe(createWriteStream(`${out}/${name}.stderr.log`));
  const completion = new Promise(resolve => process.once('exit', (code, signal) => resolve({code, signal})));
  processes.push({ process, completion });
  return process;
}
async function awaitHttp(url, process) {
  for (;;) {
    if (process.exitCode !== null || process.signalCode) throw new Error(`service_exited:${url}`);
    try { const response = await fetch(url); if(response.ok) return; } catch {}
    await delay(100);
  }
}
async function stopRuntime() {
  if (runtimeUrl) await fetch(`${runtimeUrl}/sidecar/stop`, { method: 'POST' }).catch(() => {});
  if (runtime) { runtime.kill('SIGTERM'); await processes.find(p => p.process === runtime).completion; }
  runtime = null; runtimeUrl = null;
}

// Constant fluid work isolates route compute from differences in inferred emission.
const pinInjection = `
let recordedBudgetPacket = null;
const recordedBudgetPublish = publishFluidPacketForFrame;
const recordedBudgetDeactivate = deactivateFluidInlets;
publishFluidPacketForFrame = function(frame) {
  if (!recordedBudgetPacket) return recordedBudgetPublish(frame);
  latestFluidFrame = frame;
  latestFluidPacket = recordedBudgetPacket;
  densityBenchAuthority = 'fixture_density_bench_not_live_hand';
  latestLiveInletReceipt = fluidSolver.setLiveInletPacket(recordedBudgetPacket);
};
deactivateFluidInlets = function(reason, preserveSurface = false) {
  recordedBudgetDeactivate(reason, preserveSurface);
  if (recordedBudgetPacket) {
    latestFluidPacket = recordedBudgetPacket;
    densityBenchAuthority = 'fixture_density_bench_not_live_hand';
    latestLiveInletReceipt = fluidSolver.setLiveInletPacket(recordedBudgetPacket);
  }
};
window.__recordedBudgetPin = async function() {
  await applyDensityBenchFixture('five-finger');
  recordedBudgetPacket = structuredClone(latestFluidPacket);
  return collectLiveHandDebugState();
};
window.__recordedBudgetStart = start;
`;

try {
  const browserPath = args.get('--browser');
  assert(browserPath.includes('/ms-playwright/') || browserPath.includes('Chrome for Testing'));
  const cameraPath = resolve(args.get('--camera'));
  const trace = JSON.parse(readFileSync(args.get('--trace')));
  assert.equal(trace.sourceAuthority, 'recorded_replay_not_live');
  const durationMs = trace.sourceReport.captureStoppedAtMs - trace.sourceReport.captureStartedAtMs;
  report.input = { cameraPath, cameraSha256: sha(readFileSync(cameraPath)),
    sourceSessionId: trace.sourceReport.sessionId, sourceRawSha256: trace.sourceHashes['raw-camera.webm'],
    cycleDurationMs: durationMs, cycles: 2,
    cycleRationale: 'one complete source cycle includes cold inference; second full cycle measures the warmed route' };
  report.browserExecutable = browserPath;
  report.injectionSha256 = sha(pinInjection);
  report.failurePhase = 'vite_start'; save();
  const vitePort = await port();
  const base = `http://127.0.0.1:${vitePort}`;
  vite = start(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(vitePort), '--strictPort'], process.cwd(), 'vite');
  await awaitHttp(base, vite);
  for (const [name, mode, chunks] of [['pure-mono', 'pure_wilor', 0], ['pure-chunk7', 'pure_wilor', 7], ['hybrid-chunk7', 'hybrid_mano', 7]]) {
    const stateDir = `${out}/${name}/runtime-state`;
    mkdirSync(stateDir, { recursive: true });
    const current = { name, requestedMode: mode, chunkSegments: chunks,
      stateDir, status: 'running', errors: [], phase: 'runtime_start' };
    report.cases.push(current); save();
    const runtimePort = await port();
    runtimeUrl = `http://127.0.0.1:${runtimePort}`;
    runtime = start(args.get('--runtime-python'), ['-m', 'handstate_runtime', 'serve',
      '--host', '127.0.0.1', '--port', String(runtimePort), '--state-dir', stateDir,
      '--wilor-python', args.get('--wilor-python'), '--wilor-mlx-root', args.get('--wilor-root'),
      '--mano-path', args.get('--mano'), '--chunk-segments', String(chunks)],
      args.get('--runtime-root'), name);
    await awaitHttp(`${runtimeUrl}/health`, runtime);
    current.phase = 'browser_start'; save();
    browser = await chromium.launch({ executablePath: browserPath, headless: true, args: [
      '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream',
      `--use-file-for-fake-video-capture=${cameraPath}`,
      '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    ] });
    const context = await browser.newContext({ viewport: { width: 1140, height: 680 }, deviceScaleFactor: 2,
      permissions: ['camera'] });
    const page = await context.newPage();
    page.on('pageerror', error => current.errors.push(String(error)));
    await page.route('**/src/hand/live-hand.ts', async route => {
      const response = await route.fetch();
      const body = await response.text();
      assert(body.includes('function publishFluidPacketForFrame('));
      current.servedModuleSha256 = sha(body);
      await route.fulfill({ response, body: `${body}\n${pinInjection}` });
    });
    await page.goto(`${base}/live-hand.html?hand_route=${mode}&runtime_url=${encodeURIComponent(runtimeUrl)}`);
    current.phase = 'start_hand'; save();
    await page.evaluate(() => window.__recordedBudgetStart());
    assert.equal(await page.evaluate(() => window.__lermsLiveHandDebugState().running), true);
    const pinned = await page.evaluate(() => window.__recordedBudgetPin());
    assert.equal(pinned.fluid.requestedParticleCount, 2400);
    assert.equal(pinned.fluid.latestPacketActiveEmitterCount, 5);
    assert.equal(pinned.fluid.economics.sourceFluxParticlesPerSecond, 960);
    assert.equal(pinned.fluid.economics.requestedActiveParticleBudget, 1440);
    assert.equal(pinned.fluid.solver.solver_backend, 'webgpu_compute');
    current.effectiveFluidProfile = pinned.fluid;
    current.browserVersion = browser.version();
    current.phase = 'two_complete_camera_cycles'; current.measurementStartedAtMs = Date.now(); save();
    await page.waitForTimeout(durationMs);
    current.firstCycle = await page.evaluate(() => window.__lermsLiveHandDebugState()); save();
    await page.waitForTimeout(durationMs);
    current.twoCycles = await page.evaluate(() => window.__lermsLiveHandDebugState());
    current.measurementStoppedAtMs = Date.now();
    await page.screenshot({ path: `${out}/${name}/final-view.png` });
    current.runtimeHealth = await (await fetch(`${runtimeUrl}/health`)).json();
    assert(current.twoCycles.benchmark?.sampleCount > 0, 'no_measured_hand_frames');
    assert.equal(current.twoCycles.benchmark.effectiveRoute, mode === 'hybrid_mano'
      ? 'hand-state-runtime/hybrid-wilor-anchor-browser-fast-mano-v6'
      : 'native_wilor_mini_mlx_detector_sidecar_live', 'wrong_effective_hand_route');
    assert.equal(current.twoCycles.fluid.latestPacketActiveEmitterCount, 5);
    assert.equal(current.twoCycles.fluid.solver.solver_backend, 'webgpu_compute');
    current.phase = 'stop_and_flush'; save();
    await page.getByRole('button', { name: 'Stop Hand', exact: true }).click();
    await page.getByRole('button', { name: 'Start Hand', exact: true }).waitFor();
    current.final = await page.evaluate(() => window.__lermsLiveHandDebugState());
    current.status = 'captured'; current.phase = null; save();
    await browser.close(); browser = null;
    await stopRuntime();
  }
  report.status = 'captured'; report.primaryOutputWritten = true; report.failurePhase = null;
} catch (error) {
  report.status = 'failed'; report.error = String(error); process.exitCode = 1;
  const current = report.cases.at(-1);
  if (current?.status === 'running') {
    current.status = 'failed';
    report.failurePhase = `${current.name}:${current.phase}`;
  }
} finally {
  await browser?.close();
  await stopRuntime();
  vite?.kill('SIGTERM');
  report.ownedProcessExits = await Promise.all(processes.map(p => p.completion));
  save();
}
