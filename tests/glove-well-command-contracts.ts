import {
  existsSync,
  mkdtempSync,
  readFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

import {
  buildFixtureGloveInputSequence,
  buildGloveWellCommandsFromInputSequence,
  buildGloveWellLaunchWitnessReport,
  GLOVE_INPUT_FRAME_SCHEMA,
  GLOVE_WELL_COMMAND_SCHEMA
} from '../src/glove-well-command.ts';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function assertThrows(fn: () => void, expectedMessage: string): void {
  try {
    fn();
  } catch (error) {
    assert(error instanceof Error, 'expected Error');
    assert(
      error.message.includes(expectedMessage),
      `expected "${error.message}" to include "${expectedMessage}"`
    );
    return;
  }
  throw new Error(`expected function to throw ${expectedMessage}`);
}

const fixtureFrames = buildFixtureGloveInputSequence({
  frameIdPrefix: 'fixture-glove-well',
  timestampMs: 9000
});

assert(fixtureFrames.length === 4, 'fixture sequence covers idle/prime/aim/release frames');
fixtureFrames.forEach((frame, index) => {
  assert(frame.schema === GLOVE_INPUT_FRAME_SCHEMA, `frame ${index} uses glove input schema`);
  assert(frame.source.schema === 'lerms.source-truth.v0', `frame ${index} carries source truth`);
  assert(frame.source.authority === 'synthetic_fixture', `frame ${index} is fixture authority`);
  assert(frame.source.route === 'lerms/glove-input/fixture-glove-well', `frame ${index} uses fixture route`);
  assert(frame.source.backend === 'fixture-glove-input-sequence', `frame ${index} names fixture backend`);
  assert(frame.source.configId === 'fixture-glove-well-command-v0', `frame ${index} names config`);
  assert(frame.coordinateFrame.space === 'screen_normalized', `frame ${index} uses screen normalized coordinates`);
  assert(frame.coordinateFrame.origin === 'top_left', `frame ${index} declares top-left origin`);
  assert(frame.coordinateFrame.handedness === 'operator_unmirrored', `frame ${index} declares mirroring`);
  assert(frame.coordinateFrame.depthPolicy === 'non_load_bearing', `frame ${index} forbids load-bearing depth`);
});

const commands = buildGloveWellCommandsFromInputSequence(fixtureFrames);
assert(commands.length === 4, 'one command per input frame');
assert(commands[0].schema === GLOVE_WELL_COMMAND_SCHEMA, 'command schema is versioned');
assert(commands[0].phase === 'idle', 'open fixture starts idle');
assert(commands[1].phase === 'priming', 'pinch primes Glove Well');
assert(commands[1].primedGoinId === 'primed-goin-001', 'priming names the primed goin');
assert(commands[1].charge01 > 0.25 && commands[1].charge01 < 1, 'priming charge is normalized');
assert(commands[2].phase === 'aiming', 'pinky hold while pinched aims');
assert(commands[2].aim?.arcSamples.length === 7, 'aim command emits dotted arc samples');
assert(commands[2].aim.direction.x > 0.4, 'aim uses pinky screen-plane x direction');
assert(commands[2].aim.direction.y < -0.1, 'aim uses pinky screen-plane y direction');
assert(commands[3].phase === 'released', 'pinch open after prime releases');
assert(commands[3].release?.trigger === 'pinch_opened_after_prime', 'release trigger records pinch opening');
assert(commands[3].release?.sourceFrameId === fixtureFrames[3].frameId, 'release traces to input frame');
assert(commands[3].release?.initialVelocity.x > 0, 'release velocity follows aim x');
assert(commands[3].release?.initialVelocity.y < 0, 'release velocity follows aim y');
assert(commands[3].source.authority === 'synthetic_fixture', 'fixture command authority stays fixture');

const depthNoisyAimFrame = {
  ...fixtureFrames[2],
  fingers: {
    ...fixtureFrames[2].fingers,
    pinky: {
      ...fixtureFrames[2].fingers.pinky,
      tip: { ...fixtureFrames[2].fingers.pinky.tip, z: 999 },
      direction: { ...fixtureFrames[2].fingers.pinky.direction, z: -999 }
    }
  }
};
const depthNoisyCommands = buildGloveWellCommandsFromInputSequence([
  fixtureFrames[0],
  fixtureFrames[1],
  depthNoisyAimFrame,
  fixtureFrames[3]
]);
assert(
  JSON.stringify(depthNoisyCommands[2].aim?.arcSamples) === JSON.stringify(commands[2].aim?.arcSamples),
  'depth-like fields do not affect screen-plane aim arc'
);
assert(
  JSON.stringify(depthNoisyCommands[3].release?.initialVelocity) === JSON.stringify(commands[3].release?.initialVelocity),
  'depth-like fields do not affect launch velocity'
);

const staleReleaseFrames = [
  fixtureFrames[0],
  fixtureFrames[1],
  fixtureFrames[2],
  {
    ...fixtureFrames[3],
    timing: {
      ...fixtureFrames[3].timing,
      cameraFrameAgeMs: 260
    }
  }
];
const staleReleaseCommands = buildGloveWellCommandsFromInputSequence(staleReleaseFrames);
assert(staleReleaseCommands[3].phase === 'cooldown', 'stale release frame cannot create release');
assert(staleReleaseCommands[3].source.authority === 'stale_hold', 'stale release downgrades command source');

assertThrows(
  () => buildGloveWellCommandsFromInputSequence([fixtureFrames[3]]),
  'release without prior priming'
);

assertThrows(
  () =>
    buildGloveWellCommandsFromInputSequence([
      {
        ...fixtureFrames[1],
        coordinateFrame: {
          ...fixtureFrames[1].coordinateFrame,
          handedness: 'mirrored_for_display' as never
        }
      }
    ]),
  'operator_unmirrored'
);

assertThrows(
  () =>
    buildGloveWellCommandsFromInputSequence([
      {
        ...fixtureFrames[1],
        source: {
          ...fixtureFrames[1].source,
          authority: 'fallback',
          route: 'lerms/glove-input/fixture-fallback',
          requestedRoute: 'perceptasia/wilor-mini-mlx-sidecar/live-glove-input',
          effectiveRoute: undefined,
          fallbackReason: undefined
        }
      }
    ]),
  'fallback source must include requestedRoute, effectiveRoute, and fallbackReason'
);

const witness = buildGloveWellLaunchWitnessReport({
  outputPath: '/tmp/lerms-glove-well-launch-contract-test.json',
  frameId: 'glove-well-launch-contract-test',
  timestampMs: 9000
});

assert(witness.ok === true, 'launch witness builds');
assert(witness.schema === 'lerms.glove-well-launch-witness.v0', 'launch witness schema is versioned');
assert(witness.inputFrames.length === 4, 'launch witness preserves input frames');
assert(witness.commands.at(-1)?.phase === 'released', 'launch witness includes release command');
assert(witness.frame.source.authority === 'synthetic_fixture', 'fixture input downgrades composed frame');
assert(witness.sourceTruthEvaluation.accepted === false, 'fixture launch cannot upgrade to live');
assert(
  witness.sourceTruthEvaluation.blockers.includes('source-authority-not-live'),
  'fixture command source blocks live upgrade'
);
assert(witness.summary.goinStateCounts.rolling === 1, 'launch witness emits rolling sacrificial goin');
assert(
  witness.launchEvidence.releaseEventId === witness.commands.at(-1)?.release?.eventId,
  'launch evidence uses witness command release id'
);
assert(
  witness.launchEvidence.sourceInputFrameId === witness.inputFrames.at(-1)?.frameId,
  'launch evidence traces to witness input frame'
);
assert(witness.rerouteHints.length >= 2, 'launched goin creates reroute hints');
assert(witness.whatRemainsFake.liveWilorSidecar === true, 'live sidecar remains fake');

const tmp = mkdtempSync(join(tmpdir(), 'lerms-glove-well-launch-'));
const cliReportPath = join(tmp, 'glove-well-launch.json');
const cliRun = spawnSync(
  process.execPath,
  [
    '--experimental-strip-types',
    'src/glove-well-command.ts',
    '--report',
    cliReportPath,
    '--frame-id',
    'glove-well-command-cli-test',
    '--timestamp-ms',
    '9100'
  ],
  { cwd: process.cwd(), encoding: 'utf8' }
);

assert(cliRun.status === 0, cliRun.stderr || cliRun.stdout);
assert(existsSync(cliReportPath), 'glove well witness CLI writes report path');
const cliReport = JSON.parse(readFileSync(cliReportPath, 'utf8'));
assert(cliReport.ok === true, 'glove well witness CLI report is ok');
assert(cliReport.outputPath === cliReportPath, 'glove well witness CLI records output path');
assert(cliReport.launchEvidence.sourceInputFrameId.endsWith('-release'), 'CLI launch traces release input frame');

console.log('glove well command contracts ok');
