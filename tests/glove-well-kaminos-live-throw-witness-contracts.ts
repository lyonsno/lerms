import {
  existsSync,
  mkdtempSync,
  readFileSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';

import {
  buildGloveWellKaminosLiveThrowWitnessReport,
  GLOVE_WELL_KAMINOS_LIVE_THROW_WITNESS_ROUTE,
  GLOVE_WELL_KAMINOS_LIVE_THROW_WITNESS_SCHEMA,
  type KaminosHandControlSidecarEventCache
} from '../src/glove-well-kaminos-live-throw-witness.ts';

const LIVE_BACKEND = 'native_wilor_mini_mlx_detector_sidecar_live';

function cache(sequence: number, kind: 'prime' | 'aim' | 'release'): KaminosHandControlSidecarEventCache {
  const pinched = kind !== 'release';
  const timestamp = 70_000 + sequence * 120;
  return {
    schema: 'kaminos.hand-control-sidecar-event-cache.v0',
    status: 'stored',
    sequence,
    stored_at_ms: timestamp + 8,
    age_ms: 58,
    event: {
      schema: 'perceptasia.hand-control.v0',
      source_backend: LIVE_BACKEND,
      timestamp,
      frame_id: `kaminos-live-${kind}-${sequence}`,
      handedness: 'Right',
      confidence: 0.96,
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
      landmarks_3d: [],
      world_landmarks: [],
      pinch_distance: pinched ? 0.028 : 0.142,
      openness: kind === 'release' ? 0.92 : 0.55,
      fist_score: 0.1,
      spread: 0.32,
      native_frame_timing: {
        capture_timestamp_ms: timestamp - 52,
        capture_epoch_ms: timestamp - 52,
        sidecar_received_epoch_ms: timestamp + 4,
        model_latency_ms: 61
      },
      webcam_frame: {
        visible: true,
        synthetic: false,
        width: 1280,
        height: 720,
        frame_ref: `webcam-live-${sequence}`
      },
      debug: {
        evidence_route: LIVE_BACKEND,
        model_route: 'wilor-mlx HandPosePipeline.from_pretrained',
        device_route: 'mlx',
        telemetry: {
          model_latency_ms: 61,
          frame_age_ms: 58,
          include_vertices: false
        }
      }
    }
  };
}

const caches = [cache(11, 'prime'), cache(12, 'aim'), cache(13, 'release')];
const report = buildGloveWellKaminosLiveThrowWitnessReport({
  outputPath: '/tmp/lerms-glove-well-kaminos-live-throw-test.json',
  frameId: 'glove-well-kaminos-live-throw-test',
  timestampMs: 70_000,
  eventCaches: caches,
  sidecarEventUrl: 'http://127.0.0.1:8096/hand-control-sidecar-event',
  kaminosBranch: 'cc/palm-hand-surface-compositor-0629',
  kaminosCommit: 'a7ccdd4'
});

assert.equal(report.ok, true);
assert.equal(report.schema, GLOVE_WELL_KAMINOS_LIVE_THROW_WITNESS_SCHEMA);
assert.equal(report.route, GLOVE_WELL_KAMINOS_LIVE_THROW_WITNESS_ROUTE);
assert.equal(report.transport.schema, 'lerms.kaminos-hand-control-event-cache-transport.v0');
assert.equal(report.transport.sidecarEventUrl, 'http://127.0.0.1:8096/hand-control-sidecar-event');
assert.equal(report.transport.kaminosBranch, 'cc/palm-hand-surface-compositor-0629');
assert.equal(report.transport.kaminosCommit, 'a7ccdd4');
assert.deepEqual(report.transport.sequenceRange, { first: 11, last: 13 });
assert.deepEqual(report.transport.cacheSequences, [11, 12, 13]);
assert.deepEqual(report.transport.packetFrameIds, ['kaminos-live-prime-11', 'kaminos-live-aim-12', 'kaminos-live-release-13']);
assert.equal(report.transport.maxCacheAgeMs, 58);
assert.equal(report.transport.webcamSyntheticCount, 0);
assert.equal(report.transport.fallbackCount, 0);
assert.equal(report.transport.eventSchema, 'perceptasia.hand-control.v0');
assert.equal(report.sourceTruth.effectiveAuthority, 'synthetic_fixture');
assert.equal(report.sourceTruth.inputAuthority, 'live_simulation');
assert.equal(report.sourceTruth.transportAuthority, 'synthetic_fixture');
assert.equal(report.sourceTruth.transportMode, 'fixture_event_cache');
assert.equal(report.liveThrow.commandPhaseTrace, 'priming>aiming>released');
assert.equal(report.liveThrow.releaseSourceFrameId, 'kaminos-live-release-13');
assert.equal(report.liveThrow.throwPhysics.sourceTruth.effectiveAuthority, 'live_simulation');
assert.equal(report.liveThrow.previewBenchPayload.payload.throwPhysics?.fixtureInputDowngrade, false);
assert.equal(report.liveThrow.previewBenchPayload.payload.downgrades.includes('kaminos_event_cache_fixture_not_live_fetch'), true);
assert.equal(report.whatRemainsFake.sidecarProcessManager, true);
assert.equal(report.whatRemainsFake.fullVerticalSuccess, true);

assert.throws(
  () =>
    buildGloveWellKaminosLiveThrowWitnessReport({
      outputPath: '/tmp/lerms-glove-well-kaminos-live-throw-empty-test.json',
      frameId: 'glove-well-kaminos-live-throw-empty-test',
      timestampMs: 70_000,
      eventCaches: [{ schema: 'kaminos.hand-control-sidecar-event-cache.v0', status: 'empty', sequence: 13, stored_at_ms: null, age_ms: null, event: null }]
    }),
  /stored event/
);

assert.throws(
  () =>
    buildGloveWellKaminosLiveThrowWitnessReport({
      outputPath: '/tmp/lerms-glove-well-kaminos-live-throw-stale-test.json',
      frameId: 'glove-well-kaminos-live-throw-stale-test',
      timestampMs: 70_000,
      eventCaches: [{ ...caches[0], age_ms: 260 }, caches[1], caches[2]]
    }),
  /stale Kaminos hand-control event cache/
);

assert.throws(
  () =>
    buildGloveWellKaminosLiveThrowWitnessReport({
      outputPath: '/tmp/lerms-glove-well-kaminos-live-throw-fallback-test.json',
      frameId: 'glove-well-kaminos-live-throw-fallback-test',
      timestampMs: 70_000,
      eventCaches: [
        {
          ...caches[0],
          event: {
            ...caches[0].event!,
            source_backend: 'wilor_mini_saved_fixture_replay',
            debug: { ...caches[0].event!.debug, evidence_route: 'wilor_mini_saved_fixture_replay' }
          }
        },
        caches[1],
        caches[2]
      ]
    }),
  /non-live Kaminos hand-control route/
);

assert.throws(
  () =>
    buildGloveWellKaminosLiveThrowWitnessReport({
      outputPath: '/tmp/lerms-glove-well-kaminos-live-throw-synthetic-test.json',
      frameId: 'glove-well-kaminos-live-throw-synthetic-test',
      timestampMs: 70_000,
      eventCaches: [{ ...caches[0], event: { ...caches[0].event!, webcam_frame: { ...caches[0].event!.webcam_frame!, synthetic: true } } }, caches[1], caches[2]]
    }),
  /synthetic webcam frame/
);

assert.throws(
  () =>
    buildGloveWellKaminosLiveThrowWitnessReport({
      outputPath: '/tmp/lerms-glove-well-kaminos-live-throw-landmarks-test.json',
      frameId: 'glove-well-kaminos-live-throw-landmarks-test',
      timestampMs: 70_000,
      eventCaches: [{ ...caches[0], event: { ...caches[0].event!, landmarks_2d: [] } }, caches[1], caches[2]]
    }),
  /21 landmarks/
);

assert.throws(
  () =>
    buildGloveWellKaminosLiveThrowWitnessReport({
      outputPath: '/tmp/lerms-glove-well-kaminos-live-throw-replay-test.json',
      frameId: 'glove-well-kaminos-live-throw-replay-test',
      timestampMs: 70_000,
      eventCaches: [caches[0], caches[2], caches[1]]
    }),
  /monotonic/
);

const tmp = mkdtempSync(join(tmpdir(), 'lerms-glove-well-kaminos-live-throw-'));
const cachePath = join(tmp, 'event-caches.json');
const reportPath = join(tmp, 'kaminos-live-throw.json');
writeFileSync(cachePath, JSON.stringify(caches, null, 2));
const cliRun = spawnSync(
  process.execPath,
  [
    '--experimental-strip-types',
    'src/glove-well-kaminos-live-throw-witness.ts',
    '--report',
    reportPath,
    '--event-cache',
    cachePath,
    '--sidecar-event-url',
    'http://127.0.0.1:8096/hand-control-sidecar-event',
    '--frame-id',
    'glove-well-kaminos-live-throw-cli',
    '--timestamp-ms',
    '71000',
    '--kaminos-branch',
    'cc/palm-hand-surface-compositor-0629',
    '--kaminos-commit',
    'a7ccdd4'
  ],
  { cwd: process.cwd(), encoding: 'utf8' }
);

assert.equal(cliRun.status, 0, cliRun.stderr || cliRun.stdout);
assert.equal(existsSync(reportPath), true);
const cliReport = JSON.parse(readFileSync(reportPath, 'utf8'));
assert.equal(cliReport.ok, true);
assert.equal(cliReport.transport.eventCachePath, cachePath);
assert.equal(cliReport.transport.sequenceRange.last, 13);
assert.equal(cliReport.sourceTruth.transportMode, 'fixture_event_cache');
assert.equal(cliReport.sourceTruth.effectiveAuthority, 'synthetic_fixture');
assert.equal(cliReport.liveThrow.releaseSourceFrameId, 'kaminos-live-release-13');

const staleCachePath = join(tmp, 'stale-event-caches.json');
const staleReportPath = join(tmp, 'stale-kaminos-live-throw.json');
writeFileSync(staleCachePath, JSON.stringify([{ ...caches[0], age_ms: 300 }, caches[1], caches[2]], null, 2));
const staleRun = spawnSync(
  process.execPath,
  [
    '--experimental-strip-types',
    'src/glove-well-kaminos-live-throw-witness.ts',
    '--report',
    staleReportPath,
    '--event-cache',
    staleCachePath,
    '--timestamp-ms',
    '71000'
  ],
  { cwd: process.cwd(), encoding: 'utf8' }
);
assert.notEqual(staleRun.status, 0, 'stale cache cannot quietly claim live throw evidence');
const staleCliReport = JSON.parse(readFileSync(staleReportPath, 'utf8'));
assert.equal(staleCliReport.ok, false);
assert.equal(staleCliReport.failureKind, 'kaminos-live-throw-invalid');
assert.equal(staleCliReport.lastTrustworthyEvidence.eventCachePath, staleCachePath);

console.log('glove well Kaminos live throw witness contracts passed');
