import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  SCHNOZ_MOTION_ADAPTER_SCHEMA,
  adaptMushfingerClipletToSchnozMotion,
  buildSchnozMotionAdapterInput,
  type MushfingerClipletPlaybackSampleEnvelope,
} from '../src/schnoz-motion-adapter.ts';
import { buildSchnozSimulationSnapshot } from '../src/schnoz-lerm-simulation-core.ts';

function mushfingerEnvelope({
  labelGuess,
  compression,
  effort,
  sourceFrame,
  interpolation,
}: {
  labelGuess: string;
  compression: number;
  effort: number;
  sourceFrame: number;
  interpolation: number;
}): MushfingerClipletPlaybackSampleEnvelope {
  return {
    schema: 'kaminos.generated-motion-cliplet-playback-sample-envelope.v0',
    playback: {
      schema: 'kaminos.generated-motion-cliplet-playback-sample.v0',
      playbackId: 'panel_a_man_stops_short_startles_and_sprints_in__temporal_v0_7_loop_playback_v0',
      sourceClipId: 'panel_a_man_stops_short_startles_and_sprints_in__temporal_v0',
      mode: 'loop',
      t: 0.12,
      wrappedTime: 0.12,
      localTime: 0.12,
      interpolation,
      segmentId: 'panel_a_man_stops_short_startles_and_sprints_in__temporal_v0_cliplet_007',
      segmentIndex: 0,
      labelGuess,
      sourceTime: 4.93333,
      sourceFrame,
      sourceRange: {
        startSourceFrame: 148,
        endSourceFrame: 171,
        sourceStartTime: 4.93333,
        sourceEndTime: 5.7,
      },
    },
    motionSample: {
      root: [0.05, 0.04, 0.35],
      attention: [0.18, 0.08, 0.66],
      effort,
      phase: labelGuess,
      temporalSample: {
        sourceFrame,
        time: 4.93333,
        phaseLabel: labelGuess,
        root: [0.05, 0.04, 0.35],
        chestRoot: [0.02, 0.78 - compression * 0.12, 0.06],
        handSpan: 0.54 + effort * 0.06,
        stanceWidth: 0.32,
        bboxVolume: 1.1 + compression * 0.52,
        bowCompression: compression,
      },
    },
    source: {
      route: 'motion-server:http://127.0.0.1:8098/generate',
      model: 'kimodo',
      status: 'live-generated',
    },
  };
}

const brakeInput = buildSchnozMotionAdapterInput({
  gameplayState: 'hit_reacting',
  carryingGoinId: undefined,
  targetGoinId: undefined,
  hitStunMs: 180,
  mushfingerPlaybackSample: mushfingerEnvelope({
    labelGuess: 'brake / compress',
    compression: 0.92,
    effort: 0.96,
    sourceFrame: 148,
    interpolation: 0.25,
  }),
});

const brake = adaptMushfingerClipletToSchnozMotion(brakeInput);
assert.equal(brake.schema, SCHNOZ_MOTION_ADAPTER_SCHEMA);
assert.equal(brake.sourceAuthority, 'mushfinger_cliplet_playback_sample');
assert.equal(brake.source.schema, 'kaminos.generated-motion-cliplet-playback-sample.v0');
assert.equal(brake.source.clipletLabel, 'brake / compress');
assert.equal(brake.source.sourceFrame, 148);
assert.equal(brake.source.sourceRoute, 'motion-server:http://127.0.0.1:8098/generate');
assert.equal(brake.source.sourceModel, 'kimodo');
assert.equal(brake.source.sourceStatus, 'live-generated');
assert.ok(brake.channels.hitCompression > 0.75, 'brake/compress drives visible hit compression');
assert.ok(brake.channels.bodySquash < 0.82, 'compression squashes the schnoz sphere');
assert.ok(brake.channels.bodyStretch > 1.08, 'effort stretches the schnoz sphere');
assert.ok(brake.channels.eventAccent > 0.75, 'hit reaction carries event accent');
assert.ok(brake.channels.faceCueLead > 0.2, 'source effort reaches face cue');
assert.ok(brake.authorityBoundary.mushfingerOwns.includes('sourceFrame'));
assert.ok(brake.authorityBoundary.lermsOwns.includes('gameplayState'));

const carrier = adaptMushfingerClipletToSchnozMotion(buildSchnozMotionAdapterInput({
  gameplayState: 'fleeing_with_goin',
  carryingGoinId: 'goin-hoard-001',
  targetGoinId: undefined,
  mushfingerPlaybackSample: mushfingerEnvelope({
    labelGuess: 'escape / sprint',
    compression: 0.22,
    effort: 0.78,
    sourceFrame: 172,
    interpolation: 0.62,
  }),
}));
assert.ok(carrier.channels.carrierTetherAccent > 0.45, 'carrier state keeps goin tether visible');
assert.ok(carrier.channels.footfallPulse > 0.25, 'playback interpolation drives footfall pulse');
assert.ok(carrier.channels.rootOffset[0] !== 0 || carrier.channels.rootOffset[2] !== 0, 'source root motion reaches proxy root offset');

const reroute = adaptMushfingerClipletToSchnozMotion(buildSchnozMotionAdapterInput({
  gameplayState: 'rerouting_to_goin',
  carryingGoinId: undefined,
  targetGoinId: 'goin-dropped-001',
  mushfingerPlaybackSample: mushfingerEnvelope({
    labelGuess: 'recover / chase',
    compression: 0.18,
    effort: 0.54,
    sourceFrame: 176,
    interpolation: 0.8,
  }),
}));
assert.ok(reroute.channels.rerouteTargetPull > 0.6, 'target goin desire survives source adaptation');
assert.equal(reroute.gameplay.state, 'rerouting_to_goin');
assert.equal(reroute.gameplay.targetGoinId, 'goin-dropped-001');

const snapshot = buildSchnozSimulationSnapshot();
assert.equal(snapshot.timeline[3].lerms[0].motionAdapter?.schema, SCHNOZ_MOTION_ADAPTER_SCHEMA);
assert.equal(snapshot.timeline[3].lerms[0].motionAdapter?.source.clipletLabel, 'brake / compress');
assert.ok(snapshot.timeline.some((frame) => frame.lerms.some((lerm) => lerm.motionAdapter?.channels.rerouteTargetPull)));

const main = readFileSync('src/main.ts', 'utf8');
assert.match(main, /motionAdapter/);
assert.match(main, /channels\.bodySquash/);
assert.match(main, /channels\.carrierTetherAccent/);

console.log('schnoz motion adapter contracts passed');
