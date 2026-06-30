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

assert.ok(timeline.timeline.length >= 8);
assert.equal(timeline.timeline[0].timeMs, 0);
assert.ok(timeline.durationMs >= 8000);
for (let index = 1; index < timeline.timeline.length; index += 1) {
  assert.ok(timeline.timeline[index].timeMs > timeline.timeline[index - 1].timeMs);
}

const labels = timeline.timeline.map((frame) => frame.label);
assert.deepEqual(labels, ['approach', 'steal', 'flee', 'hit', 'drop', 'notice', 'contest', 'award']);
const stableActorIds = ['red-lerm-001', 'red-lerm-002', 'red-lerm-003', 'red-lerm-004', 'red-lerm-005', 'red-lerm-006'];
assert.deepEqual(timeline.witnessState.actorIds, stableActorIds);
assert.equal(timeline.continuity.schema, 'lerms.preview-bench-actor-continuity.v0');
assert.equal(timeline.continuity.stableActorIdentities, true);
assert.deepEqual(timeline.continuity.actorIds, stableActorIds);
assert.equal(timeline.continuity.framesWithCompleteActorSet, timeline.timeline.length);
for (const frame of timeline.timeline) {
  assert.deepEqual(frame.actorMotion.map((actor) => actor.actorId), stableActorIds);
}
const events = new Set(timeline.timeline.flatMap((frame) => frame.events));
assert.ok(events.has('goin-stolen'));
assert.ok(events.has('juice-hit-carrier'));
assert.ok(events.has('loose-goin-reroute'));
assert.ok(events.has('loose-goin-contested'));
assert.ok(events.has('possession-awarded'));

const hitBeat = timeline.timeline.find((frame) => frame.label === 'hit');
const dropBeat = timeline.timeline.find((frame) => frame.label === 'drop');
const noticeBeat = timeline.timeline.find((frame) => frame.label === 'notice');
const contestBeat = timeline.timeline.find((frame) => frame.label === 'contest');
const awardBeat = timeline.timeline.find((frame) => frame.label === 'award');
assert.ok(hitBeat && dropBeat && noticeBeat && contestBeat && awardBeat);
assert.ok(dropBeat.timeMs - hitBeat.timeMs >= 600, 'hit and drop beats should be temporally separated');
assert.ok(noticeBeat.timeMs - dropBeat.timeMs >= 1000, 'drop and notice beats should be slow enough to read');
assert.ok(contestBeat.timeMs - noticeBeat.timeMs >= 1000, 'notice and contest beats should be slow enough to read');
assert.ok(awardBeat.timeMs - contestBeat.timeMs >= 1000, 'contest and award beats should be slow enough to read');

const states = new Set(timeline.timeline.flatMap((frame) => frame.actorMotion.map((actor) => actor.state)));
assert.ok(states.has('approaching_hoard'));
assert.ok(states.has('stealing_goin'));
assert.ok(states.has('fleeing_with_goin'));
assert.ok(states.has('hit_reacting'));
assert.ok(states.has('tumbling'));
assert.ok(states.has('rerouting_to_goin'));
assert.ok(states.has('carrying_goin'));

assert.equal(timeline.behaviorLedger.schema, 'lerms.preview-bench-contested-goin-behavior.v0');
assert.equal(timeline.behaviorLedger.slowReadable, true);
assert.equal(timeline.behaviorLedger.minimumBeatSpacingMs, 1000);
assert.equal(timeline.behaviorLedger.contestedGoinId, 'goin-dropped-001');
assert.deepEqual(timeline.behaviorLedger.claimants.map((claimant) => claimant.actorId), ['red-lerm-001', 'red-lerm-006']);
assert.equal(timeline.behaviorLedger.decision.winnerActorId, 'red-lerm-001');
assert.deepEqual(timeline.behaviorLedger.decision.loserActorIds, ['red-lerm-006']);
assert.match(timeline.behaviorLedger.decision.reason, /nearest/);
assert.ok(timeline.behaviorLedger.beats.some((beat) => beat.event === 'claim_contested' && beat.timeMs === contestBeat.timeMs));
assert.ok(timeline.behaviorLedger.beats.some((beat) => beat.event === 'loser_rerouted' && beat.actorId === 'red-lerm-006'));
assert.equal(timeline.behaviorLedger.actorActivities.find((activity) => activity.actorId === 'red-lerm-001')?.intent, 'claiming_loose_goin');
assert.equal(timeline.behaviorLedger.actorActivities.find((activity) => activity.actorId === 'red-lerm-006')?.intent, 'rerouting_after_loss');
assert.equal(timeline.behaviorLedger.goinClaim.winnerActorId, 'red-lerm-001');

assert.equal(timeline.goinCustody.schema, 'lerms.preview-bench-goin-custody.v0');
assert.equal(timeline.goinCustody.visibleGoinPlayback, true);
assert.deepEqual(timeline.goinCustody.primaryCustodyChain, [
  'goin-hoard-001:hoarded',
  'goin-hoard-001:carried_by:red-lerm-001',
  'goin-hoard-001:carried_by:red-lerm-001',
  'goin-hoard-001:dropped_by:red-lerm-001',
  'goin-hoard-001:rolling',
  'goin-dropped-001:reroute_target_for:red-lerm-001',
  'goin-dropped-001:reroute_target_for:red-lerm-001',
  'goin-dropped-001:carried_by:red-lerm-001',
]);
assert.ok(timeline.goinCustody.attachments.some((attachment) =>
  attachment.frameIndex === 1 &&
  attachment.goinId === 'goin-hoard-001' &&
  attachment.carrierActorId === 'red-lerm-001' &&
  attachment.visibleAttachment === true));
assert.ok(timeline.goinCustody.attachments.some((attachment) =>
  attachment.frameIndex === 2 &&
  attachment.goinId === 'goin-hoard-001' &&
  attachment.carrierActorId === 'red-lerm-001' &&
  attachment.visibleAttachment === true));
assert.ok(timeline.goinCustody.drops.some((drop) =>
  drop.frameIndex === 3 &&
  drop.goinId === 'goin-hoard-001' &&
  drop.droppedByActorId === 'red-lerm-001' &&
  drop.visibleDropMarker === true));
assert.ok(timeline.goinCustody.rerouteTargets.some((target) =>
  target.frameIndex === 5 &&
  target.goinId === 'goin-dropped-001' &&
  target.actorId === 'red-lerm-001' &&
  target.visibleTargetPull === true));
assert.ok(timeline.goinCustody.rerouteTargets.some((target) =>
  target.frameIndex === 6 &&
  target.goinId === 'goin-dropped-001' &&
  target.actorId === 'red-lerm-006' &&
  target.visibleTargetPull === true));
assert.ok(timeline.goinCustody.possessionEvents.some((event) =>
  event.frameIndex === 1 &&
  event.event === 'possession-gained' &&
  event.goinId === 'goin-hoard-001' &&
  event.actorId === 'red-lerm-001' &&
  event.visibleMarker === true));
assert.ok(timeline.goinCustody.possessionEvents.some((event) =>
  event.frameIndex === 3 &&
  event.event === 'possession-released' &&
  event.goinId === 'goin-hoard-001' &&
  event.actorId === 'red-lerm-001' &&
  event.visibleMarker === true));
assert.ok(timeline.goinCustody.possessionEvents.some((event) =>
  event.frameIndex === 5 &&
  event.event === 'loose-target-noticed' &&
  event.goinId === 'goin-dropped-001' &&
  event.actorId === 'red-lerm-001' &&
  event.visibleMarker === true));
assert.ok(timeline.goinCustody.possessionEvents.some((event) =>
  event.frameIndex === 6 &&
  event.event === 'loose-target-noticed' &&
  event.goinId === 'goin-dropped-001' &&
  event.actorId === 'red-lerm-006' &&
  event.visibleMarker === true));
assert.ok(timeline.goinCustody.possessionEvents.some((event) =>
  event.frameIndex === 7 &&
  event.event === 'possession-gained' &&
  event.goinId === 'goin-dropped-001' &&
  event.actorId === 'red-lerm-001' &&
  event.visibleMarker === true));

const carrierPositions = timeline.timeline
  .flatMap((frame) => frame.actorMotion)
  .filter((actor) => actor.actorId === 'red-lerm-001')
  .map((actor) => actor.world.join(','));
assert.ok(new Set(carrierPositions).size >= 2, 'timeline should move at least one stable actor across frames');
const carrierStates = timeline.timeline
  .map((frame) => frame.actorMotion.find((actor) => actor.actorId === 'red-lerm-001')?.state);
assert.deepEqual(carrierStates, [
  'approaching_hoard',
  'stealing_goin',
  'fleeing_with_goin',
  'hit_reacting',
  'tumbling',
  'rerouting_to_goin',
  'rerouting_to_goin',
  'carrying_goin',
]);

const hitFrame = timeline.timeline.find((frame) => frame.label === 'hit');
assert.ok(hitFrame?.hitFlash);
assert.equal(hitFrame.actorMotion.find((actor) => actor.actorId === 'red-lerm-001')?.state, 'hit_reacting');
assert.deepEqual(hitFrame.actorMotion.find((actor) => actor.actorId === 'red-lerm-001')?.statusCue, {
  schema: 'lerms.preview-bench-actor-status-cue.v0',
  cue: 'hit',
  label: '!',
  visibleAboveActor: true,
});
assert.equal(hitFrame.goins.find((goin) => goin.id === 'goin-hoard-001')?.droppedByActorId, 'red-lerm-001');
assert.equal(hitFrame.goins.find((goin) => goin.id === 'goin-hoard-001')?.custodyRole, 'dropped_marker');
assert.ok(distanceXZ(
  hitFrame.actorMotion.find((actor) => actor.actorId === 'red-lerm-001')?.world,
  hitFrame.goins.find((goin) => goin.id === 'goin-hoard-001')?.world,
) >= 0.35, 'hit/drop marker should separate from carrier enough to read');
const rerouteFrame = timeline.timeline.find((frame) => frame.label === 'notice');
assert.ok(rerouteFrame?.reroute);
assert.equal(rerouteFrame.actorMotion.find((actor) => actor.actorId === 'red-lerm-001')?.targetGoinId, 'goin-dropped-001');
assert.deepEqual(rerouteFrame.actorMotion.find((actor) => actor.actorId === 'red-lerm-001')?.statusCue, {
  schema: 'lerms.preview-bench-actor-status-cue.v0',
  cue: 'noticing_loose_goin',
  label: '?',
  targetGoinId: 'goin-dropped-001',
  visibleAboveActor: true,
});
assert.equal(rerouteFrame.goins.find((goin) => goin.id === 'goin-dropped-001')?.custodyRole, 'reroute_target');
assert.deepEqual(rerouteFrame.goins.find((goin) => goin.id === 'goin-dropped-001')?.targetedByActorIds, ['red-lerm-001']);
assert.ok(distanceXZ(
  rerouteFrame.actorMotion.find((actor) => actor.actorId === 'red-lerm-001')?.world,
  rerouteFrame.goins.find((goin) => goin.id === 'goin-dropped-001')?.world,
) >= 0.65, 'reroute actor and loose goin should be separated enough to read intent');
const contestFrame = timeline.timeline.find((frame) => frame.label === 'contest');
assert.deepEqual(contestFrame?.goins.find((goin) => goin.id === 'goin-dropped-001')?.targetedByActorIds, ['red-lerm-001', 'red-lerm-006']);
assert.equal(contestFrame?.actorMotion.find((actor) => actor.actorId === 'red-lerm-006')?.targetGoinId, 'goin-dropped-001');
const awardFrame = timeline.timeline.find((frame) => frame.label === 'award');
assert.equal(awardFrame?.actorMotion.find((actor) => actor.actorId === 'red-lerm-001')?.carryingGoinId, 'goin-dropped-001');
assert.equal(awardFrame?.actorMotion.find((actor) => actor.actorId === 'red-lerm-006')?.targetGoinId, 'goin-hoard-001');

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

function distanceXZ(a: readonly number[] | undefined, b: readonly number[] | undefined): number {
  assert.ok(a && b);
  return Math.hypot(a[0] - b[0], a[2] - b[2]);
}
