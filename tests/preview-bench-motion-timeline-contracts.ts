import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  PREVIEW_BENCH_ACTOR_MOTION_TIMELINE_ROUTE,
  PREVIEW_BENCH_ACTOR_MOTION_TIMELINE_SCHEMA,
  buildPreviewBenchActorMotionTimeline,
} from '../src/preview-bench-motion-timeline.ts';

const timeline = buildPreviewBenchActorMotionTimeline();

assert.equal(timeline.schema, PREVIEW_BENCH_ACTOR_MOTION_TIMELINE_SCHEMA);
assert.equal(timeline.route, PREVIEW_BENCH_ACTOR_MOTION_TIMELINE_ROUTE);
assert.equal(timeline.acceptanceSurface.kind, 'kaminos_preview_bench_timeline');
assert.equal(timeline.acceptanceSurface.routeQuery, 'world_chamber=lerms-underhill&posture=inspect&bench=terrain-preview');
assert.equal(timeline.basePayload.schema, 'lerms.preview-bench-actor-motion-payload.v0');
assert.equal(timeline.proxyBody.identity, 'proxy_schnoz_sphere');
assert.equal(timeline.proxyBody.claimsFinalRedLermBody, false);

assert.ok(timeline.timeline.length >= 6);
assert.equal(timeline.timeline[0].timeMs, 0);
assert.ok(timeline.durationMs >= 1200);
for (let index = 1; index < timeline.timeline.length; index += 1) {
  assert.ok(timeline.timeline[index].timeMs > timeline.timeline[index - 1].timeMs);
}

const labels = timeline.timeline.map((frame) => frame.label);
assert.deepEqual(labels, ['approach', 'steal', 'flee', 'hit', 'drop', 'reroute']);
const events = new Set(timeline.timeline.flatMap((frame) => frame.events));
assert.ok(events.has('goin-stolen'));
assert.ok(events.has('juice-hit-carrier'));
assert.ok(events.has('loose-goin-reroute'));

const states = new Set(timeline.timeline.flatMap((frame) => frame.actorMotion.map((actor) => actor.state)));
assert.ok(states.has('approaching_hoard'));
assert.ok(states.has('stealing_goin'));
assert.ok(states.has('fleeing_with_goin'));
assert.ok(states.has('hit_reacting'));
assert.ok(states.has('tumbling'));
assert.ok(states.has('rerouting_to_goin'));

const carrierPositions = timeline.timeline
  .flatMap((frame) => frame.actorMotion)
  .filter((actor) => actor.actorId === 'schnoz-approach')
  .map((actor) => actor.world.join(','));
assert.ok(new Set(carrierPositions).size >= 2, 'timeline should move at least one stable actor across frames');

const hitFrame = timeline.timeline.find((frame) => frame.label === 'hit');
assert.ok(hitFrame?.hitFlash);
assert.ok(hitFrame.actorMotion.some((actor) => actor.state === 'hit_reacting'));
const rerouteFrame = timeline.timeline.find((frame) => frame.label === 'reroute');
assert.ok(rerouteFrame?.reroute);
assert.ok(rerouteFrame.actorMotion.some((actor) => actor.targetGoinId === 'goin-dropped-001'));

const everyActor = timeline.timeline.flatMap((frame) => frame.actorMotion);
assert.ok(everyActor.every((actor) => actor.motionAdapter.schema === 'lerms.schnoz-motion-adapter.v0'));
assert.ok(everyActor.every((actor) => actor.selectedCliplet.sourceModel === 'kimodo'));
assert.ok(everyActor.every((actor) => actor.selectedCliplet.sourceStatus === 'archived-live-generated-witness'));

assert.equal(timeline.playback.schema, 'lerms.preview-bench-actor-motion-playback.v0');
assert.equal(timeline.playback.loop, true);
assert.equal(timeline.playback.interpolation, 'linear-between-frames');
assert.equal(timeline.playback.minimumMovementActors, 1);
assert.ok(timeline.witnessState.requiresMotionWitness);
assert.equal(timeline.witnessState.staticActorPayloadAcceptedAsLoop, false);
assert.ok(timeline.downgrades.includes('proxy_body_visual_only'));
assert.ok(timeline.downgrades.includes('timevarying_payload_not_live_socket_stream'));
assert.ok(timeline.custody.lermsOwns.includes('timelineBehaviorTruth'));
assert.ok(timeline.custody.gutterglassOwns.includes('Preview Bench playback and camera witness mechanics'));

const tmp = mkdtempSync(join(tmpdir(), 'lerms-preview-bench-timeline-'));
const outPath = join(tmp, 'timeline.json');
const run = spawnSync(
  process.execPath,
  [
    '--experimental-strip-types',
    'src/preview-bench-motion-timeline.ts',
    '--out',
    outPath,
  ],
  { cwd: process.cwd(), encoding: 'utf8' },
);

assert.equal(run.status, 0, run.stderr || run.stdout);
const report = JSON.parse(readFileSync(outPath, 'utf8'));
assert.equal(report.ok, true);
assert.equal(report.schema, 'lerms.preview-bench-actor-motion-timeline-report.v0');
assert.equal(report.route, PREVIEW_BENCH_ACTOR_MOTION_TIMELINE_ROUTE);
assert.equal(report.timeline.schema, PREVIEW_BENCH_ACTOR_MOTION_TIMELINE_SCHEMA);
assert.equal(report.timeline.timeline.length, timeline.timeline.length);
assert.equal(report.timeline.witnessState.requiresMotionWitness, true);

console.log('preview bench motion timeline contracts passed');
