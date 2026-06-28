import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  PREVIEW_BENCH_ACTOR_MOTION_PAYLOAD_ROUTE,
  PREVIEW_BENCH_ACTOR_MOTION_PAYLOAD_SCHEMA,
  buildPreviewBenchActorMotionPayload,
} from '../src/preview-bench-motion-payload.ts';

const payload = buildPreviewBenchActorMotionPayload();

assert.equal(payload.schema, PREVIEW_BENCH_ACTOR_MOTION_PAYLOAD_SCHEMA);
assert.equal(payload.route, PREVIEW_BENCH_ACTOR_MOTION_PAYLOAD_ROUTE);
assert.equal(payload.acceptanceSurface.kind, 'kaminos_preview_bench_payload');
assert.equal(payload.acceptanceSurface.worldChamberId, 'lerms-underhill');
assert.equal(payload.acceptanceSurface.posture, 'inspect');
assert.equal(payload.acceptanceSurface.bench, 'terrain-preview');
assert.equal(payload.acceptanceSurface.routeQuery, 'world_chamber=lerms-underhill&posture=inspect&bench=terrain-preview');
assert.ok(payload.rejectedSurfaces.some((surface) => surface.route === 'browser/?schnoz_3d=1'));
assert.ok(payload.rejectedSurfaces.every((surface) => surface.acceptanceSurface === false));

assert.equal(payload.frame.schema, 'lerms.first-vertical-frame.v0');
assert.equal(payload.frame.source.authority, 'live_simulation');
assert.equal(payload.sourceTruthUpgrade.schema, 'lerms.first-vertical-source-truth-upgrade.v0');
assert.equal(payload.sourceTruthUpgrade.accepted, true);
assert.equal(payload.sourceTruthUpgrade.effectiveAuthority, 'live_simulation');
assert.equal(payload.sourceTruthUpgrade.predicates.hasHitToDropChain, true);

assert.ok(payload.downgrades.includes('proxy_body_visual_only'));
assert.ok(payload.downgrades.includes('final_red_lerm_body_not_claimed'));
assert.ok(payload.downgrades.includes('kaminos_host_route_not_owned_by_lerms_payload'));
assert.ok(payload.downgrades.includes('gutterglass_camera_witness_custody_not_claimed'));
assert.ok(payload.downgrades.includes('minion_chamber_ontology_not_claimed'));

assert.equal(payload.proxyBody.identity, 'proxy_schnoz_sphere');
assert.equal(payload.proxyBody.claimsFinalRedLermBody, false);
assert.equal(payload.actorMotion.length, payload.frame.lerms.length);
assert.ok(payload.actorMotion.length >= 6);

const states = new Set(payload.actorMotion.map((actor) => actor.state));
assert.ok(states.has('rerouting_to_goin'));
assert.ok(states.has('hit_reacting'));
assert.ok(states.has('fleeing_with_goin'));

const hitActor = payload.actorMotion.find((actor) => actor.state === 'hit_reacting');
assert.ok(hitActor, 'payload should expose hit actor motion evidence');
assert.equal(hitActor.motionAdapter.schema, 'lerms.schnoz-motion-adapter.v0');
assert.equal(hitActor.selectedCliplet.schema, 'kaminos.generated-motion-cliplet-playback-sample.v0');
assert.equal(hitActor.selectedCliplet.sourceRoute, 'motion-server:http://127.0.0.1:8098/generate');
assert.equal(hitActor.selectedCliplet.sourceModel, 'kimodo');
assert.equal(hitActor.selectedCliplet.sourceStatus, 'archived-live-generated-witness');
assert.match(hitActor.selectedCliplet.clipletLabel, /brake|recover|chase|drop|flee|approach/);
assert.ok(hitActor.motionAdapter.authorityBoundary.mushfingerOwns.includes('clipletLabel'));
assert.ok(hitActor.motionAdapter.authorityBoundary.lermsOwns.includes('gameplayState'));

assert.equal(payload.witnessState.schema, 'lerms.preview-bench-actor-motion-state.v0');
assert.equal(payload.witnessState.chamberId, 'lerms-underhill');
assert.equal(payload.witnessState.bench, 'terrain-preview');
assert.equal(payload.witnessState.routeReady, true);
assert.equal(payload.witnessState.renderHostNeeded, 'gutterglass_or_minion_preview_bench');
assert.equal(payload.witnessState.actorCount, payload.actorMotion.length);
assert.equal(payload.witnessState.motionAdapterSchema, 'lerms.schnoz-motion-adapter.v0');
assert.equal(payload.witnessState.outputsVisualPreview, false);

assert.ok(payload.custody.lermsOwns.includes('lerms.first-vertical-frame.v0'));
assert.ok(payload.custody.mushfingerOwns.includes('kaminos.generated-motion-cliplet-playback.v0'));
assert.ok(payload.custody.gutterglassOwns.includes('camera_and_browser_witness_route'));
assert.ok(payload.custody.minionOwns.includes('lerms-underhill_chamber_ontology'));

const tmp = mkdtempSync(join(tmpdir(), 'lerms-preview-bench-motion-'));
const outPath = join(tmp, 'payload.json');
const run = spawnSync(
  process.execPath,
  [
    '--experimental-strip-types',
    'src/preview-bench-motion-payload.ts',
    '--out',
    outPath,
  ],
  { cwd: process.cwd(), encoding: 'utf8' },
);

assert.equal(run.status, 0, run.stderr || run.stdout);
const report = JSON.parse(readFileSync(outPath, 'utf8'));
assert.equal(report.ok, true);
assert.equal(report.payload.schema, PREVIEW_BENCH_ACTOR_MOTION_PAYLOAD_SCHEMA);
assert.equal(report.payload.acceptanceSurface.routeQuery, payload.acceptanceSurface.routeQuery);
assert.equal(report.payload.witnessState.routeReady, true);
assert.equal(report.payload.witnessState.outputsVisualPreview, false);
assert.equal(report.payload.actorMotion.length, payload.actorMotion.length);
assert.deepEqual(report.payload.downgrades, payload.downgrades);

console.log('preview bench motion payload contracts passed');
