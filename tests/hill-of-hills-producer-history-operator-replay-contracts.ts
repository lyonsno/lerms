import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  HILL_PRODUCER_HISTORY_OPERATOR_REPLAY_SCHEMA,
  createHillProducerHistoryOperatorReplay,
  runHillProducerHistoryOperatorReplayCli
} from '../src/hill-of-hills-producer-history-operator-replay.js';

const liveReceiptPath = join(
  process.cwd(),
  'artifacts/lerm-horde-producer-history/receipt.json'
);
const liveReceipt = JSON.parse(readFileSync(liveReceiptPath, 'utf8'));
const replay = createHillProducerHistoryOperatorReplay(liveReceipt);

assert.equal(replay.schema, HILL_PRODUCER_HISTORY_OPERATOR_REPLAY_SCHEMA);
assert.equal(replay.receipt.evidenceClass, 'live_producer_composition');
assert.match(replay.svg, /^<svg /);
assert.match(replay.svg, /no-history control/);
assert.match(replay.svg, /history admitted/);
assert.match(replay.svg, /after departure/);
assert.equal(replay.report.ok, true);
assert.equal(replay.report.panels.length, 3);
assert.equal(replay.report.panels[0].admittedEpisodeCount, 0);
assert.equal(replay.report.panels[1].admittedEpisodeCount, 1);
assert.equal(replay.report.panels[2].admittedEpisodeCount, 1);
assert.equal(
  replay.report.panels[1].trafficChecksum,
  replay.report.panels[2].trafficChecksum,
  'admitted traffic must remain present after producer departure'
);
assert.notEqual(
  replay.report.panels[0].topologyPossibilityChecksum,
  replay.report.panels[2].topologyPossibilityChecksum,
  'operator replay must reproduce the causal topology consequence'
);
assert.equal(replay.report.panels[2].stanceContactCount, 0);
assert.equal(replay.report.panels[2].supportedRootSampleCount, 14);
assert.equal(replay.report.panels[2].supportShockResetCount, 0);
assert.equal(replay.report.render.primaryOutputWritten, false);

assert.throws(
  () => createHillProducerHistoryOperatorReplay({
    ...liveReceipt,
    evidenceClass: 'synthetic_fixture'
  }),
  /requires live producer composition evidence/,
  'synthetic evidence cannot impersonate the live Horde receipt'
);
assert.throws(
  () => createHillProducerHistoryOperatorReplay({
    ...liveReceipt,
    staleStatus: 'stale'
  }),
  /rejects fallback, stale, or partial/,
  'stale evidence must fail before rendering'
);
assert.throws(
  () => createHillProducerHistoryOperatorReplay({
    ...liveReceipt,
    admission: {
      ...liveReceipt.admission,
      trafficChecksum: 'substituted-traffic'
    }
  }),
  /traffic checksum does not reproduce/,
  'receipt labels cannot override independently replayed traffic'
);

const cliDir = mkdtempSync(join(tmpdir(), 'hill-producer-history-replay-'));
const imagePath = join(cliDir, 'operator-strip.svg');
const reportPath = join(cliDir, 'operator-strip.json');
const successStatus = runHillProducerHistoryOperatorReplayCli([
  '--input',
  liveReceiptPath,
  '--image-out',
  imagePath,
  '--report-out',
  reportPath
]);
assert.equal(successStatus, 0);
assert.equal(existsSync(imagePath), true);
assert.equal(existsSync(reportPath), true);
const writtenImage = readFileSync(imagePath, 'utf8');
const writtenReport = JSON.parse(readFileSync(reportPath, 'utf8'));
assert.match(writtenImage, /^<svg /);
assert.ok(writtenImage.length > 10_000);
assert.equal(writtenReport.ok, true);
assert.equal(writtenReport.render.primaryOutputWritten, true);
assert.equal(writtenReport.input.path, liveReceiptPath);
assert.match(writtenReport.input.sha256, /^[a-f0-9]{64}$/);

const subprocessImagePath = join(cliDir, 'subprocess-strip.svg');
const subprocessReportPath = join(cliDir, 'subprocess-strip.json');
const replayModulePath = new URL(
  '../src/hill-of-hills-producer-history-operator-replay.js',
  import.meta.url
);
const subprocess = spawnSync(
  process.execPath,
  [
    replayModulePath.pathname.replace(/^\/private\/tmp\//, '/tmp/'),
    '--input',
    liveReceiptPath,
    '--image-out',
    subprocessImagePath,
    '--report-out',
    subprocessReportPath
  ],
  { encoding: 'utf8' }
);
assert.equal(subprocess.status, 0, 'the compiled operator replay CLI must execute');
assert.equal(
  existsSync(subprocessImagePath),
  true,
  'the compiled CLI must not exit zero without its requested primary image'
);
assert.equal(
  existsSync(subprocessReportPath),
  true,
  'the compiled CLI must not exit zero without its requested report'
);

const blankInputPath = join(cliDir, 'blank.json');
const staleImagePath = join(cliDir, 'stale.svg');
const failureReportPath = join(cliDir, 'failure.json');
writeFileSync(blankInputPath, '');
writeFileSync(staleImagePath, '<svg>stale</svg>');
const failureStatus = runHillProducerHistoryOperatorReplayCli([
  '--input',
  blankInputPath,
  '--image-out',
  staleImagePath,
  '--report-out',
  failureReportPath
]);
assert.equal(failureStatus, 1);
const failureReport = JSON.parse(readFileSync(failureReportPath, 'utf8'));
assert.equal(failureReport.ok, false);
assert.equal(failureReport.failurePhase, 'input-read');
assert.equal(failureReport.primaryOutputWritten, false);
assert.equal(
  failureReport.lastTrustworthyEvidence.preexistingImage.disposition,
  'stale-preexisting-not-evidence-for-this-run'
);
assert.equal(
  readFileSync(staleImagePath, 'utf8'),
  '<svg>stale</svg>',
  'failed replay must not mutate a pre-existing image into ambiguous partial output'
);

console.log('hill of hills producer history operator replay contracts ok');
