import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  LERM_HORDE_PRODUCER_HISTORY_RECEIPT_SCHEMA,
  composeLermHordeProducerHistory,
  type LermHordeProducerModule
} from '../src/lerm-horde-producer-history-composition.js';
import { runLermHordeProducerHistoryWitnessCli } from '../src/lerm-horde-producer-history-witness.js';

const producerModule: LermHordeProducerModule = {
  validateAxialCrawlerRegistration: (registration) => registration,
  sampleHillTerrainSurface: (_source, _x, _z) => ({ height: 0 }),
  createAxialTerrainRouteTransitionEvaluator: () => () => ({
    admissible: true,
    additionalCost: 0,
    evidence: { schema: 'test.transition-evidence.v0' }
  }),
  compileCreatureScaleLocomotionRail: () => ({
    schema: 'kaminos.creature-scale-locomotion-rail.v0',
    id: 'fixture-rail',
    length: 6
  }),
  sampleCreatureScaleLocomotionRail: (_rail, distance) => ({
    schema: 'kaminos.creature-scale-locomotion-rail-sample.v0',
    railId: 'fixture-rail',
    sourceDistance: distance,
    progress: distance / 6,
    position: [-2 + distance * 2 / 3, 0.5, -3 + distance],
    tangent: [0, 0, 1],
    locomotionFrame: {
      forward: [0, 0, 1],
      right: [1, 0, 0],
      up: [0, 1, 0]
    },
    attention: {
      direction: [0, 0, 1],
      authority: 'locomotion-forward-default'
    },
    support: {
      schema: 'kaminos.axial-terrain-support-envelope.v0',
      plannerDisposition: 'local-support',
      rootLift: 0.04,
      compliance: {
        minimumNormalizedMargin: 0.22
      }
    }
  })
};

const receipt = await composeLermHordeProducerHistory({
  producerModule,
  registration: { schema: 'kaminos.axial-crawler-registration.v0' },
  lermsRevision: 'lerms-test-revision',
  producerBranch: 'cc/mushfinger-motion-ready-719024-0720',
  producerRevision: 'ced6db3d',
  producerModuleSha256: 'producer-module-test-sha'
});

assert.equal(receipt.ok, true);
assert.equal(receipt.schema, LERM_HORDE_PRODUCER_HISTORY_RECEIPT_SCHEMA);
assert.equal(receipt.phase, 'complete');
assert.equal(receipt.history.producer.revision, 'ced6db3d');
assert.equal(receipt.history.producer.creatureId, 'motion-ready-719024');
assert.equal(receipt.history.producer.railId, 'fixture-rail');
assert.equal(receipt.history.samples.length, 15);
assert.equal(receipt.history.samples[0].root.sourceDistance, 0);
assert.equal(receipt.history.samples.at(-1)!.root.routeProgress, 1);
assert.ok(
  receipt.history.samples.every((sample, index, samples) =>
    index === 0 ||
    (
      sample.timestampMs > samples[index - 1].timestampMs &&
      sample.root.sourceDistance > samples[index - 1].root.sourceDistance &&
      sample.root.routeProgress > samples[index - 1].root.routeProgress
    )
  ),
  'live rail history must remain strictly monotonic'
);
assert.ok(
  receipt.history.samples.every((sample) =>
    sample.contacts === undefined && sample.locomotion === undefined
  ),
  'the first composition must omit absent contact instead of inventing it'
);
assert.deepEqual(receipt.assertions, {
  strictMonotonicHistory: true,
  exactPriorHillTarget: true,
  absentContactLawful: true,
  historyAdmittedOnce: true,
  persistedAfterDeparture: true,
  changedTopologyPossibility: true,
  identicalReplayIdempotent: true,
  sourceIdentityPreserved: true,
  zeroShockResets: true
});
assert.equal(receipt.hordeSemanticOverlay.speciesIdentity, 'producer-control-non-lerm');
assert.equal(receipt.hordeSemanticOverlay.contactInference, 'none');
assert.equal(receipt.admission.admittedEpisodeCount, 1);
assert.equal(receipt.admission.supportShockResetCount, 0);
assert.notEqual(
  receipt.admission.postDepartureTopologyPossibilityChecksum,
  receipt.admission.noHistoryTopologyPossibilityChecksum
);
assert.equal(
  receipt.persistence.producerTrafficChecksumAtAdmission,
  receipt.persistence.producerTrafficChecksumAfterDeparture
);

await assert.rejects(
  () => composeLermHordeProducerHistory({
    producerModule,
    registration: {},
    lermsRevision: 'lerms-test-revision',
    producerBranch: 'cc/mushfinger-motion-ready-719024-0720',
    producerRevision: 'wrong-revision',
    producerModuleSha256: 'producer-module-test-sha'
  }),
  /producer revision must be immutable ced6db3d/,
  'a stale or substituted producer revision must fail before composition'
);

const failureDir = mkdtempSync(join(tmpdir(), 'lerm-horde-producer-history-failure-'));
const failureReportPath = join(failureDir, 'receipt.json');
const failureStatus = await runLermHordeProducerHistoryWitnessCli([
  '--out',
  failureReportPath,
  '--lerms-repo-root',
  process.cwd()
]);
assert.equal(failureStatus, 1);
const failureReport = JSON.parse(readFileSync(failureReportPath, 'utf8'));
assert.equal(failureReport.ok, false);
assert.equal(failureReport.phase, 'failed');
assert.equal(failureReport.failurePhase, 'input-validation');
assert.equal(failureReport.partialStatus, 'failed-before-complete-receipt');
assert.match(failureReport.error, /producer-repo-root/);

console.log('lerm horde producer history composition contracts ok');
