import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

interface CaptureStatus {
  state: 'idle' | 'running' | 'complete' | 'failed';
  outDir: string | null;
  reportPath: string | null;
  filmstripPath: string | null;
  error: string | null;
  startedAtIso: string | null;
  completedAtIso: string | null;
  exitCode: number | null;
}

interface CaptureRequestBody {
  url?: unknown;
  outDir?: unknown;
  frameCount?: unknown;
  intervalMs?: unknown;
  settleMs?: unknown;
  viewport?: unknown;
}

let captureProcess: ChildProcessWithoutNullStreams | null = null;
let captureStatus: CaptureStatus = {
  state: 'idle',
  outDir: null,
  reportPath: null,
  filmstripPath: null,
  error: null,
  startedAtIso: null,
  completedAtIso: null,
  exitCode: null
};

export default defineConfig({
  plugins: [lermsGloveWellCapturePlugin()],
  server: {
    proxy: {
      '/kaminos-hand-control-sidecar-event': {
        target: 'http://127.0.0.1:8096',
        changeOrigin: false,
        rewrite: (path) => path.replace(/^\/kaminos-hand-control-sidecar-event/, '/hand-control-sidecar-event')
      }
    }
  }
});

function lermsGloveWellCapturePlugin() {
  return {
    name: 'lerms-glove-well-browser-smoke-capture',
    configureServer(server) {
      server.middlewares.use('/__lerms/glove-well-capture/start', (req, res) => {
        if (req.method !== 'POST') {
          sendJson(res, 405, { ok: false, error: 'capture start requires POST' });
          return;
        }
        void readJsonBody(req)
          .then((body) => startCapture(body))
          .then((status) => sendJson(res, 200, { ok: true, ...status }))
          .catch((error) => sendJson(res, 500, { ok: false, error: error instanceof Error ? error.message : String(error), ...captureStatus }));
      });

      server.middlewares.use('/__lerms/glove-well-capture/status', (_req, res) => {
        sendJson(res, 200, { ok: true, ...captureStatus });
      });
    }
  };
}

function startCapture(body: CaptureRequestBody): CaptureStatus {
  if (captureProcess) return captureStatus;

  const scriptPath = fileURLToPath(new URL('./scripts/glove-well-browser-smoke-capture.mjs', import.meta.url));
  const startedAtIso = new Date().toISOString();
  const safeStamp = startedAtIso.replace(/[:.]/g, '-');
  const url = stringOption(body.url, 'http://127.0.0.1:5176/?smoke=glove-well');
  const outDir = stringOption(body.outDir, `/tmp/lerms-glove-well-browser-smoke-capture-demo-${safeStamp}`);
  const frameCount = numberOption(body.frameCount, 24);
  const intervalMs = numberOption(body.intervalMs, 300);
  const settleMs = numberOption(body.settleMs, 600);
  const viewport = stringOption(body.viewport, '1440x960');
  const reportPath = `${outDir}/capture-report.json`;
  const filmstripPath = `${outDir}/filmstrip.html`;

  captureStatus = {
    state: 'running',
    outDir,
    reportPath,
    filmstripPath,
    error: null,
    startedAtIso,
    completedAtIso: null,
    exitCode: null
  };

  const args = [
    scriptPath,
    '--url',
    url,
    '--out-dir',
    outDir,
    '--frame-count',
    String(frameCount),
    '--interval-ms',
    String(intervalMs),
    '--settle-ms',
    String(settleMs),
    '--viewport',
    viewport
  ];

  captureProcess = spawn(process.execPath, args, {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let stderr = '';
  captureProcess.stderr.on('data', (chunk: Buffer) => {
    stderr += chunk.toString();
  });

  captureProcess.on('exit', (code) => {
    captureStatus = {
      ...captureStatus,
      state: code === 0 ? 'complete' : 'failed',
      completedAtIso: new Date().toISOString(),
      exitCode: code ?? null,
      error: code === 0 ? null : stderr.trim() || `capture witness exited ${code ?? 'without code'}`
    };
    captureProcess = null;
  });

  captureProcess.on('error', (error) => {
    captureStatus = {
      ...captureStatus,
      state: 'failed',
      completedAtIso: new Date().toISOString(),
      exitCode: null,
      error: error.message
    };
    captureProcess = null;
  });

  return captureStatus;
}

function readJsonBody(req: NodeJS.ReadableStream): Promise<CaptureRequestBody> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', (chunk: string) => {
      body += chunk;
    });
    req.on('end', () => {
      if (!body.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body) as CaptureRequestBody);
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res: NodeJS.WritableStream & { statusCode?: number; setHeader?: (name: string, value: string) => void }, statusCode: number, payload: unknown): void {
  res.statusCode = statusCode;
  res.setHeader?.('content-type', 'application/json');
  res.end(JSON.stringify(payload));
}

function stringOption(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function numberOption(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback;
}
