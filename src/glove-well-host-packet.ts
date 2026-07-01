import { writeFileSync } from 'node:fs';

import {
  BROWSER_SMOKE_LIVE_BACKEND,
  buildGloveWellBrowserSmokeState,
  buildGloveWellHostPacket,
  type BrowserSmokeCacheSnapshot,
  type GloveWellHostPacket,
  type GloveWellHostPacketCapture
} from './glove-well-browser-smoke-state.ts';

export const GLOVE_WELL_HOST_PACKET_SCHEMA = 'lerms.glove-well-host-packet.v0' as const;
export const GLOVE_WELL_HOST_PACKET_ROUTE = 'lerms/glove-well/host-packet' as const;

export interface BuildFixtureGloveWellHostPacketOptions {
  sourceUrl?: string | null;
  capture?: GloveWellHostPacketCapture | null;
}

export function buildFixtureGloveWellHostPacket(options: BuildFixtureGloveWellHostPacketOptions = {}): GloveWellHostPacket {
  let state = buildGloveWellBrowserSmokeState({ previous: null, cache: fixtureSnapshot(31, 'prime'), nowMs: 90_000 });
  state = buildGloveWellBrowserSmokeState({ previous: state, cache: fixtureSnapshot(32, 'aim'), nowMs: 90_120 });
  state = buildGloveWellBrowserSmokeState({ previous: state, cache: fixtureSnapshot(33, 'release'), nowMs: 90_240 });
  state = buildGloveWellBrowserSmokeState({ previous: state, cache: fixtureSnapshot(34, 'prime'), nowMs: 90_360 });
  return buildGloveWellHostPacket(state, {
    sourceUrl: options.sourceUrl ?? '/scratch/greedy-glove-well-host-packet-fixture.json',
    generatedAtMs: 90_500,
    capture: options.capture ?? {
      state: 'idle',
      reportPath: null,
      filmstripPath: null
    }
  });
}

export function runGloveWellHostPacketCli(argv = process.argv.slice(2)): number {
  const options = parseArgs(argv);
  if (options.help) {
    console.log(usage());
    return 0;
  }
  const reportPath = options.report ?? '/tmp/lerms-glove-well-host-packet-0701.json';
  const packet = buildFixtureGloveWellHostPacket({
    sourceUrl: options.sourceUrl,
    capture: {
      state: options.captureReport || options.captureFilmstrip ? 'complete' : 'idle',
      reportPath: options.captureReport ?? null,
      filmstripPath: options.captureFilmstrip ?? null
    }
  });
  writeFileSync(reportPath, `${JSON.stringify(packet, null, 2)}\n`);
  console.log(JSON.stringify({
    ok: true,
    schema: 'lerms.glove-well-host-packet-write.v0',
    reportPath,
    packetSchema: packet.schema,
    packetRoute: packet.route,
    sourceAuthority: packet.source.authority,
    downgrades: packet.downgrades
  }, null, 2));
  return 0;
}

function parseArgs(argv: string[]): {
  help: boolean;
  report: string | null;
  sourceUrl: string | null;
  captureReport: string | null;
  captureFilmstrip: string | null;
} {
  const options = {
    help: false,
    report: null as string | null,
    sourceUrl: null as string | null,
    captureReport: null as string | null,
    captureFilmstrip: null as string | null
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--report') {
      options.report = requiredValue(arg, next);
      index += 1;
    } else if (arg === '--source-url') {
      options.sourceUrl = requiredValue(arg, next);
      index += 1;
    } else if (arg === '--capture-report') {
      options.captureReport = requiredValue(arg, next);
      index += 1;
    } else if (arg === '--capture-filmstrip') {
      options.captureFilmstrip = requiredValue(arg, next);
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

function requiredValue(flag: string, value: string | undefined): string {
  if (!value || value.startsWith('--')) throw new Error(`missing value for ${flag}`);
  return value;
}

function usage(): string {
  return [
    'Usage: npm run witness:glove-well-host-packet -- [options]',
    '',
    'Options:',
    '  --report <path>              JSON packet path (default: /tmp/lerms-glove-well-host-packet-0701.json)',
    '  --source-url <url-or-path>    Source route/path a Kaminos host adapter should load',
    '  --capture-report <path>       Optional browser capture report path to reference',
    '  --capture-filmstrip <path>    Optional browser capture filmstrip path to reference'
  ].join('\n');
}

function fixtureSnapshot(sequence: number, kind: 'prime' | 'aim' | 'release'): BrowserSmokeCacheSnapshot {
  const pinched = kind !== 'release';
  const timestamp = 90_000 + sequence * 120;
  return {
    schema: 'kaminos.hand-control-sidecar-event-cache.v0',
    status: 'stored',
    sequence,
    stored_at_ms: timestamp + 8,
    age_ms: 54,
    event: {
      schema: 'perceptasia.hand-control.v0',
      source_backend: BROWSER_SMOKE_LIVE_BACKEND,
      timestamp,
      frame_id: `host-packet-${kind}-${sequence}`,
      handedness: 'Right',
      confidence: 0.95,
      video_size: { width: 1280, height: 720 },
      palm_center: { x: 0.43, y: 0.68 },
      landmarks_2d: [
        { x: 0.43, y: 0.86 },
        { x: 0.36, y: 0.75 },
        { x: 0.35, y: 0.71 },
        { x: 0.36, y: 0.67 },
        pinched ? { x: 0.412, y: 0.614 } : { x: 0.335, y: 0.642 },
        { x: 0.455, y: 0.72 },
        { x: 0.45, y: 0.68 },
        { x: 0.442, y: 0.64 },
        pinched ? { x: 0.435, y: 0.606 } : { x: 0.505, y: 0.582 },
        { x: 0.48, y: 0.73 },
        { x: 0.485, y: 0.69 },
        { x: 0.488, y: 0.655 },
        { x: 0.49, y: 0.62 },
        { x: 0.515, y: 0.735 },
        { x: 0.522, y: 0.705 },
        { x: 0.53, y: 0.675 },
        { x: 0.535, y: 0.65 },
        { x: 0.55, y: 0.74 },
        { x: 0.59, y: 0.69 },
        { x: 0.63, y: 0.64 },
        { x: 0.67, y: 0.595 }
      ],
      native_frame_timing: {
        model_latency_ms: 58
      },
      webcam_frame: {
        visible: true,
        synthetic: false,
        width: 1280,
        height: 720,
        frame_ref: `host-packet-webcam-${sequence}`
      },
      debug: {
        evidence_route: BROWSER_SMOKE_LIVE_BACKEND,
        model_route: 'wilor-mlx HandPosePipeline.from_pretrained',
        device_route: 'mlx',
        telemetry: {
          model_latency_ms: 58,
          frame_age_ms: 54
        }
      }
    }
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    process.exitCode = runGloveWellHostPacketCli();
  } catch (error) {
    console.error(JSON.stringify({
      ok: false,
      schema: 'lerms.glove-well-host-packet-write.v0',
      error: error instanceof Error ? error.message : String(error)
    }, null, 2));
    process.exitCode = 1;
  }
}
