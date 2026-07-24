import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import {
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type {
  LermHordeProducerHistoryCompositionReceipt,
} from '../src/lerm-horde-producer-history-composition.js';
import {
  HILL_HORDE_LIVE_TRAVERSAL_ADMISSION_SCHEMA,
  composeHordeTraversalIntoLiveHill,
} from '../src/hill-horde-live-traversal-admission.js';
import {
  HILL_HORDE_LIVE_TRAVERSAL_WITNESS_SCHEMA,
  buildHillHordeLiveTraversalWitness,
  runHillHordeLiveTraversalWitnessCli,
} from '../src/hill-horde-live-traversal-admission-witness.js';

const fileSha256 = (path: string) =>
  createHash('sha256').update(readFileSync(path)).digest('hex');
const gitText = (args: readonly string[]) =>
  execFileSync('git', args, { encoding: 'utf8' }).trim();

const producerReceipt = JSON.parse(
  readFileSync('artifacts/lerm-horde-producer-history/receipt.json', 'utf8'),
) as LermHordeProducerHistoryCompositionReceipt;
const bodySourceRevision = gitText([
  'log',
  '-1',
  '--format=%H',
  '--',
  'src/red-lerm-body-candidates.ts',
]);
const bodySha256 = fileSha256('src/red-lerm-body-candidates.ts');
const hordeReport = {
  ok: true,
  schema: 'lerms.lerm-horde.stable-rail-visual-witness.v0',
  phase: 'complete',
  route: {
    requested: producerReceipt.history.producer.route,
    effective: producerReceipt.history.producer.route,
    fallbackStatus: 'none',
    staleStatus: 'fresh',
    partialStatus: 'complete-root-only',
  },
  receipt: {
    sourceRevision: producerReceipt.lerms.revision,
    sha256: fileSha256('artifacts/lerm-horde-producer-history/receipt.json'),
  },
  producer: {
    revision: producerReceipt.producer.revision,
    moduleSha256: producerReceipt.producer.moduleSha256,
  },
  visibleBody: {
    assetIdentity: 'lerms.red-lerm-body.procedural-squash-thief.v0',
    schemaIdentity: 'lerms.red-lerm-body-schema.v0',
    path: 'src/red-lerm-body-candidates.ts',
    sha256: bodySha256,
    gitBlob: gitText(['hash-object', 'src/red-lerm-body-candidates.ts']),
    sourceRevision: bodySourceRevision,
    dirtyInput: '',
    candidateId: 'procedural-squash-thief-v0',
    candidateSchema: 'lerms.red-lerm-body-candidate.v0',
    shapeSchema: 'lerms.red-lerm-procedural-shape.v0',
  },
  composition: {
    identity: {
      actorId: 'lerm-horde-red-rail-witness-0001',
      assetIdentity: 'lerms.red-lerm-body.procedural-squash-thief.v0',
    },
    sources: {
      body: {
        sha256: bodySha256,
        sourceRevision: bodySourceRevision,
      },
    },
    timeline: producerReceipt.history.samples.map((sample) => ({
      timestampMs: sample.timestampMs,
      bodyRootWorld: sample.root.worldPosition,
    })),
  },
  claimBoundary: {
    rootRailMotionTruth: true,
    liveCurrentHillTruth: false,
    liveContactTruth: false,
    bodyArticulationTruth: false,
  },
} as const;

const hillRevision = gitText(['rev-parse', 'HEAD']);
const receipt = composeHordeTraversalIntoLiveHill({
  hordeReport,
  producerReceipt,
  hordeRevision: hillRevision,
  hillRevision,
});

assert.equal(receipt.schema, HILL_HORDE_LIVE_TRAVERSAL_ADMISSION_SCHEMA);
assert.equal(receipt.ok, true);
assert.equal(receipt.phase, 'complete');
assert.equal(receipt.evidenceClass, 'live_current_hill_lerm_traversal');
assert.equal(receipt.source.horde.revision, hillRevision);
assert.equal(
  receipt.source.horde.visibleBody.assetIdentity,
  'lerms.red-lerm-body.procedural-squash-thief.v0',
);
assert.equal(
  receipt.source.horde.visibleBody.sourceRevision,
  hordeReport.visibleBody.sourceRevision,
);
assert.equal(
  receipt.source.rootRail.revision,
  producerReceipt.producer.revision,
);
assert.equal(receipt.hill.requested.authority, 'live_simulation');
assert.equal(receipt.hill.effective.authority, 'live_simulation');
assert.equal(receipt.hill.requested.route, receipt.hill.effective.route);
assert.equal(receipt.hill.targetRevision, hillRevision);
assert.equal(receipt.traversal.orderedRootCount, 15);
assert.equal(receipt.traversal.admittedHistory.samples.length, 15);
assert.deepEqual(
  receipt.traversal.admittedHistory.samples.map(({ root }) => [
    root.worldPosition[0],
    root.worldPosition[2],
  ]),
  producerReceipt.history.samples.map(({ root }) => [
    root.worldPosition[0],
    root.worldPosition[2],
  ]),
  'live Hill resampling preserves Horde root-plan x/z custody',
);
assert.deepEqual(
  receipt.traversal.admittedHistory.samples.map(({ root }) => [
    root.sourceDistance,
    root.routeProgress,
    root.tangent,
    root.locomotionFrame,
    root.attention,
  ]),
  producerReceipt.history.samples.map(({ root }) => [
    root.sourceDistance,
    root.routeProgress,
    root.tangent,
    root.locomotionFrame,
    root.attention,
  ]),
  'live Hill resampling preserves ordered producer rail semantics',
);
assert.ok(
  receipt.traversal.admittedHistory.samples.every(
    ({ root }) =>
      root.support.provenance.hillSourceId === receipt.hill.effective.priorFrameId &&
      root.support.provenance.revision === hillRevision &&
      root.support.provenance.freshnessMs === 0,
  ),
  'every support row is rebound to the exact live prior Hill witness',
);
assert.ok(
  receipt.traversal.admittedHistory.samples.every(
    (sample) => sample.contacts === undefined && sample.locomotion === undefined,
  ),
  'root-only traversal does not invent contact or locomotion evidence',
);
assert.equal(receipt.admission.admittedEpisodeCount, 1);
assert.equal(receipt.admission.stanceContactCount, 0);
assert.ok(receipt.admission.supportedRootCount > 0);
assert.equal(receipt.admission.supportShockResetCount, 0);
assert.notEqual(
  receipt.admission.postDepartureTopologyPossibilityChecksum,
  receipt.control.noHistoryTopologyPossibilityChecksum,
  'accepted Lerm traversal pressure changes later topology possibility',
);
assert.equal(
  receipt.persistence.trafficChecksumAtAdmission,
  receipt.persistence.trafficChecksumAfterDeparture,
  'Lerm traversal pressure persists after departure',
);
assert.deepEqual(receipt.assertions, {
  exactReviewedHordeTraversal: true,
  exactCurrentHillTarget: true,
  liveHillSupportResampled: true,
  rootPlanPreserved: true,
  visibleLermIdentityBound: true,
  historyAdmittedOnce: true,
  persistedAfterDeparture: true,
  changedTopologyPossibility: true,
  noHistoryControlDistinct: true,
  rootOnlyContactAbsencePreserved: true,
  zeroShockResets: true,
});
assert.deepEqual(receipt.claimBoundary, {
  rootRailMotionTruth: true,
  visibleLermIdentityTruth: true,
  liveCurrentHillTruth: true,
  topologyResponseTruth: true,
  liveContactTruth: false,
  bodyArticulationTruth: false,
  morphologyPortability: false,
});
assert.equal(receipt.fallbackStatus, 'none');
assert.equal(receipt.staleStatus, 'fresh');
assert.equal(receipt.partialStatus, 'complete-root-only');

const substitutedRoot = structuredClone(hordeReport);
(substitutedRoot.composition.timeline[7].bodyRootWorld as unknown as number[])[0] += 1;
assert.throws(
  () =>
    composeHordeTraversalIntoLiveHill({
      hordeReport: substitutedRoot,
      producerReceipt,
      hordeRevision: hillRevision,
      hillRevision,
    }),
  /Horde body timeline does not match the reviewed producer rail/,
);

const fallbackReport = structuredClone(hordeReport);
(fallbackReport.route as { fallbackStatus: string }).fallbackStatus = 'fallback';
assert.throws(
  () =>
    composeHordeTraversalIntoLiveHill({
      hordeReport: fallbackReport,
      producerReceipt,
      hordeRevision: hillRevision,
      hillRevision,
    }),
  /fresh complete non-fallback Horde traversal/,
);

const staleProducerReceipt = structuredClone(producerReceipt);
(staleProducerReceipt as { staleStatus: string }).staleStatus = 'stale';
assert.throws(
  () =>
    composeHordeTraversalIntoLiveHill({
      hordeReport,
      producerReceipt: staleProducerReceipt,
      hordeRevision: hillRevision,
      hillRevision,
    }),
  /fresh complete root-only producer receipt/,
);

const witness = buildHillHordeLiveTraversalWitness({
  hordeReport,
  producerReceipt,
  hordeRevision: hillRevision,
  hillRevision,
});
assert.equal(witness.report.schema, HILL_HORDE_LIVE_TRAVERSAL_WITNESS_SCHEMA);
assert.equal(witness.report.render.visibleLermMarkerCount, 6);
assert.equal(witness.report.render.retainedTrafficPanelCount, 2);
assert.match(witness.svg, /data-live-current-hill="true"/);
assert.match(witness.svg, /data-panel="no-history-control"/);
assert.match(witness.svg, /data-panel="live-lerm-admitted"/);
assert.match(witness.svg, /data-panel="after-departure"/);
assert.equal((witness.svg.match(/data-visible-lerm-root=/g) ?? []).length, 6);
assert.equal((witness.svg.match(/data-live-lerm-rail="true"/g) ?? []).length, 1);
assert.ok(witness.svg.length > 20_000);

const cliDir = mkdtempSync(join(tmpdir(), 'hill-horde-live-admission-'));
const hordeReportPath = join(cliDir, 'horde-report.json');
const producerReceiptPath = join(cliDir, 'producer-receipt.json');
const imageOut = join(cliDir, 'witness.svg');
const reportOut = join(cliDir, 'witness.json');
const cleanSourceIdentity = {
  head: hillRevision,
  dirty: '',
  hordeAncestor: () => true,
};
writeFileSync(hordeReportPath, `${JSON.stringify(hordeReport, null, 2)}\n`);
writeFileSync(producerReceiptPath, `${JSON.stringify(producerReceipt, null, 2)}\n`);
assert.equal(
  runHillHordeLiveTraversalWitnessCli([
    '--horde-report',
    hordeReportPath,
    '--producer-receipt',
    producerReceiptPath,
    '--horde-revision',
    hillRevision,
    '--hill-revision',
    hillRevision,
    '--image-out',
    imageOut,
    '--report-out',
    reportOut,
  ], {
    render: witness.svg
      ? (composition) =>
        buildHillHordeLiveTraversalWitness({
          hordeReport,
          producerReceipt,
          hordeRevision: hillRevision,
          hillRevision,
        }).svg
      : () => '',
    sourceIdentity: () => cleanSourceIdentity,
  }),
  0,
);
const cliReport = JSON.parse(readFileSync(reportOut, 'utf8'));
assert.equal(cliReport.ok, true);
assert.equal(cliReport.schema, HILL_HORDE_LIVE_TRAVERSAL_WITNESS_SCHEMA);
assert.equal(cliReport.inputs.requested.hordeReport, hordeReportPath);
assert.equal(cliReport.inputs.effective.hordeReport, hordeReportPath);
assert.equal(cliReport.composition.terrains, undefined);
assert.equal(
  cliReport.outputs.imageSha256,
  fileSha256(imageOut),
  'final report remains bound to the verified primary image',
);

const blankImageOut = join(cliDir, 'blank.svg');
const blankReportOut = join(cliDir, 'blank.json');
writeFileSync(blankImageOut, 'preserve-existing-image');
assert.equal(
  runHillHordeLiveTraversalWitnessCli(
    [
      '--horde-report',
      hordeReportPath,
      '--producer-receipt',
      producerReceiptPath,
      '--horde-revision',
      hillRevision,
      '--hill-revision',
      hillRevision,
      '--image-out',
      blankImageOut,
      '--report-out',
      blankReportOut,
    ],
    {
      render: () => '',
      sourceIdentity: () => cleanSourceIdentity,
    },
  ),
  1,
);
const blankFailure = JSON.parse(readFileSync(blankReportOut, 'utf8'));
assert.equal(blankFailure.ok, false);
assert.equal(blankFailure.failurePhase, 'render');
assert.equal(blankFailure.primaryOutputWritten, false);
assert.equal(readFileSync(blankImageOut, 'utf8'), 'preserve-existing-image');

const originalProducerBytes = readFileSync(producerReceiptPath);
assert.equal(
  runHillHordeLiveTraversalWitnessCli([
    '--horde-report',
    hordeReportPath,
    '--producer-receipt',
    producerReceiptPath,
    '--horde-revision',
    hillRevision,
    '--hill-revision',
    hillRevision,
    '--image-out',
    join(cliDir, 'collision.svg'),
    '--report-out',
    producerReceiptPath,
  ], {
    render: (composition) =>
      buildHillHordeLiveTraversalWitness({
        hordeReport,
        producerReceipt,
        hordeRevision: hillRevision,
        hillRevision,
      }).svg,
    sourceIdentity: () => cleanSourceIdentity,
  }),
  1,
);
assert.deepEqual(
  readFileSync(producerReceiptPath),
  originalProducerBytes,
  'invalid output collision must not overwrite a protected producer receipt',
);

const compiledCliFailure = join(cliDir, 'compiled-cli-failure.json');
const compiledCli = fileURLToPath(
  new URL('../src/hill-horde-live-traversal-admission-witness.js', import.meta.url),
);
const compiledCliRun = spawnSync(
  process.execPath,
  [compiledCli, '--report-out', compiledCliFailure],
  { encoding: 'utf8' },
);
assert.equal(compiledCliRun.status, 1);
const compiledCliReport = JSON.parse(readFileSync(compiledCliFailure, 'utf8'));
assert.equal(compiledCliReport.ok, false);
assert.equal(compiledCliReport.failurePhase, 'argument-parse');
assert.match(compiledCliRun.stderr, /missing required --horde-report/);

const tmpAliasCli = compiledCli.replace(/^\/private\/tmp\//, '/tmp/');
const aliasCliFailure = join(cliDir, 'alias-cli-failure.json');
const aliasCliRun = spawnSync(
  process.execPath,
  [tmpAliasCli, '--report-out', aliasCliFailure],
  { encoding: 'utf8' },
);
assert.equal(aliasCliRun.status, 1);
assert.equal(
  JSON.parse(readFileSync(aliasCliFailure, 'utf8')).failurePhase,
  'argument-parse',
  'the compiled witness must execute through the /tmp -> /private/tmp path alias',
);

console.log('Hill Horde live traversal admission contracts ok');
