import assert from 'node:assert/strict';

import {
  HILL_OF_HILLS_PRODUCER_CONTACT_HISTORY_SCHEMA,
  admitHillOfHillsProducerContactHistory,
  createEmptyHillOfHillsProducerTrafficField,
  sampleHillOfHillsProducerTrafficField,
  validateHillOfHillsProducerContactHistory,
  type HillOfHillsProducerContactHistory
} from '../src/terrain/hill-of-hills-producer-contact-history.js';
import {
  createHillOfHillsLayerTileCache,
  createHillOfHillsTerrain,
  createHillOfHillsTerrainWithCache
} from '../src/terrain/hill-of-hills.js';
import {
  HILL_OF_HILLS_TRAVERSAL_AFFORDANCE_SCHEMA,
  sampleHillOfHillsTraversalAffordance
} from '../src/terrain/hill-of-hills-traversal-affordance.js';

const patchIds = ['front-left', 'front-right', 'rear-left', 'rear-right'] as const;

function historyAt(xOffset: number, episodeId = `episode-${xOffset}`): HillOfHillsProducerContactHistory {
  return {
    schema: HILL_OF_HILLS_PRODUCER_CONTACT_HISTORY_SCHEMA,
    episodeId,
    producer: {
      repository: 'kaminos',
      revision: 'ced6db3d',
      route: 'motion-ready-719024/contact-locomotion',
      creatureId: 'motion-ready-719024',
      bodyRevision: 'molten-body-719024',
      motionRevision: 'ced6db3d',
      routeId: 'hill-route-a',
      railSchema: 'kaminos.creature-scale-locomotion-rail.v0',
      railId: 'hill-route-a-creature-rail',
      supportSchema: 'kaminos.axial-terrain-support-envelope.v0',
      contactAtlasSchema: 'kaminos.creature-contact-atlas.v0',
      contactAtlasCastId: 'motion-ready-719024',
      contactSampleSchema: 'kaminos.crawler-contact-samples.v0',
      locomotionStateSchema: 'kaminos.crawler-contact-locomotion-state.v0'
    },
    hill: {
      sourceId: 'hill-source-a',
      sampleChecksum: 'sample-a',
      topologyChecksum: 'topology-a'
    },
    coordinateSpace: {
      axes: 'x-y-z',
      up: 'y',
      units: 'world'
    },
    patchIds,
    samples: [0, 100, 200, 300].map((timestampMs, sampleIndex) => ({
      sequence: sampleIndex,
      timestampMs,
      root: {
        worldPosition: [xOffset, 0.5, -2 + sampleIndex * 1.2],
        sourceDistance: sampleIndex * 1.2,
        routeProgress: sampleIndex / 3,
        tangent: [0, 0, 1],
        locomotionFrame: {
          forward: [0, 0, 1],
          right: [1, 0, 0],
          up: [0, 1, 0]
        },
        attention: {
          direction: [0, 0, 1],
          authority: 'rail-forward'
        },
        support: {
          schema: 'kaminos.axial-terrain-support-envelope.v0',
          disposition: 'local-support',
          rootLift: 0.04,
          minimumComplianceMargin: 0.22,
          provenance: {
            hillSourceId: 'hill-source-a',
            revision: 'hill-a',
            freshnessMs: 0
          }
        }
      },
      locomotion: {
        schema: 'kaminos.crawler-contact-locomotion-state.v0',
        atlasCastId: 'motion-ready-719024',
        traction: 0.9,
        coupling: 1
      },
      contacts: {
        schema: 'kaminos.crawler-contact-samples.v0',
        atlasCastId: 'motion-ready-719024',
        patches: patchIds.map((id, patchIndex) => ({
          id,
          state: patchIndex % 2 === sampleIndex % 2 ? 'stance' : 'swing',
          terrainPosition: [
            xOffset + (id.endsWith('left') ? -0.24 : 0.24),
            0,
            -2 + sampleIndex * 1.2 + (id.startsWith('front') ? 0.3 : -0.3)
          ],
          worldPosition: [
            xOffset + (id.endsWith('left') ? -0.24 : 0.24),
            patchIndex % 2 === sampleIndex % 2 ? 0.01 : 0.12,
            -2 + sampleIndex * 1.2 + (id.startsWith('front') ? 0.3 : -0.3)
          ],
          terrainNormal: [0, 1, 0],
          terrainDistance: patchIndex % 2 === sampleIndex % 2 ? 0.01 : 0.12,
          inBounds: true,
          slip: patchIndex % 2 === sampleIndex % 2 ? 0.008 : 0
        }))
      }
    }))
  };
}

const grid = {
  xCount: 17,
  zCount: 21,
  xMin: -4,
  xMax: 4,
  zMin: -5,
  zMax: 5
} as const;

const leftHistory = historyAt(-1.25, 'left-crossing');
const validated = validateHillOfHillsProducerContactHistory(leftHistory);
assert.equal(validated.samples.length, 4);
assert.deepEqual(validated.patchIds, patchIds);

const empty = createEmptyHillOfHillsProducerTrafficField(grid);
const legacyAdditiveEmpty = createEmptyHillOfHillsProducerTrafficField(
  grid,
  'unbound',
  'additive_v0'
);
assert.equal(empty.range.max, 0, 'no-history control starts with no traffic');
assert.notEqual(
  empty.checksum,
  legacyAdditiveEmpty.checksum,
  'traffic identity distinguishes the active deposition law even before contact arrives'
);

const left = admitHillOfHillsProducerContactHistory(empty, leftHistory);
const leftRepeat = admitHillOfHillsProducerContactHistory(left, leftHistory);
assert.equal(left.admittedEpisodeCount, 1);
assert.equal(left.stanceContactCount, 6);
assert.ok(left.range.max > 0);
assert.equal(leftRepeat.checksum, left.checksum, 'the same producer episode cannot be counted twice');
assert.deepEqual(leftRepeat.values, left.values);
assert.ok(
  sampleHillOfHillsProducerTrafficField(left, -1.25, -0.8) >
    sampleHillOfHillsProducerTrafficField(left, 1.25, -0.8),
  'traffic remains spatially attached to the producer contact route'
);

const right = admitHillOfHillsProducerContactHistory(
  createEmptyHillOfHillsProducerTrafficField(grid),
  historyAt(1.25, 'right-crossing')
);
assert.notEqual(left.checksum, right.checksum, 'different producer routes create different persistent traffic fields');
assert.ok(
  sampleHillOfHillsProducerTrafficField(right, 1.25, -0.8) >
    sampleHillOfHillsProducerTrafficField(right, -1.25, -0.8)
);

let boundedRepeat = createEmptyHillOfHillsProducerTrafficField(grid);
const repeatedPeakDeltas: number[] = [];
for (let pass = 0; pass < 64; pass += 1) {
  const priorPeak = boundedRepeat.range.max;
  boundedRepeat = admitHillOfHillsProducerContactHistory(
    boundedRepeat,
    historyAt(-1.25, `bounded-repeat-${pass}`)
  );
  repeatedPeakDeltas.push(boundedRepeat.range.max - priorPeak);
}
assert.ok(
  boundedRepeat.values.every((value) => value >= 0 && value <= 1),
  'persistent producer memory remains a bounded environmental state under repeated exposure'
);
assert.ok(
  repeatedPeakDeltas.at(-1)! < repeatedPeakDeltas[0] * 0.25,
  'repeated exposure has diminishing marginal effect instead of freezing the first successful route through unbounded accumulation'
);
assert.equal(boundedRepeat.depositionLaw, 'bounded_exponential_v1');

const railOnlyHistory = structuredClone(leftHistory) as any;
railOnlyHistory.episodeId = 'rail-only-crossing';
delete railOnlyHistory.producer.contactAtlasSchema;
delete railOnlyHistory.producer.contactAtlasCastId;
delete railOnlyHistory.producer.contactSampleSchema;
delete railOnlyHistory.producer.locomotionStateSchema;
delete railOnlyHistory.patchIds;
for (const sample of railOnlyHistory.samples) {
  delete sample.locomotion;
  delete sample.contacts;
}
const railOnly = admitHillOfHillsProducerContactHistory(
  createEmptyHillOfHillsProducerTrafficField(grid),
  railOnlyHistory
);
assert.equal(railOnly.admittedEpisodeCount, 1);
assert.equal(railOnly.stanceContactCount, 0);
assert.equal(railOnly.supportedRootSampleCount, 3);
assert.ok(railOnly.range.max > 0, 'admitted root/support rail history produces traffic without invented patch data');

const missingPatch = structuredClone(leftHistory);
missingPatch.samples[1].contacts!.patches.pop();
assert.throws(
  () => validateHillOfHillsProducerContactHistory(missingPatch),
  /complete patch set/,
  'partial contact snapshots fail loud instead of masquerading as evidence'
);

const stale = structuredClone(leftHistory);
stale.samples[2].timestampMs = stale.samples[1].timestampMs;
assert.throws(
  () => validateHillOfHillsProducerContactHistory(stale),
  /strictly increasing/,
  'stale or repeated sample time cannot become causal history'
);

const fallback = structuredClone(leftHistory);
fallback.producer.route = 'fallback';
assert.throws(
  () => validateHillOfHillsProducerContactHistory(fallback),
  /producer route/,
  'fallback producer identity cannot silently replace the admitted route'
);

const terrainParams = {
  seed: 414,
  width: 8,
  length: 10,
  gridResolutionX: 24,
  gridResolutionZ: 32,
  topologyDynamicsMode: 'persistent_pressure' as const,
  topologyPossibilityMode: 'phase_recomposed' as const,
  topologyPhaseDurationMs: 600,
  topologyPhaseIntensity: 0.92,
  topologyPhaseDriftIntensity: 1,
  topologyPhaseLimit: 4,
  topologyPhaseTimeMs: 0
};

function historyForPriorHill(
  xOffset: number,
  episodeId: string,
  prior: ReturnType<typeof createHillOfHillsTerrainWithCache>
): HillOfHillsProducerContactHistory {
  const history = historyAt(xOffset, episodeId);
  history.hill = {
    sourceId: prior.source.frameId,
    sampleChecksum: prior.witness.sampleChecksum,
    topologyChecksum: prior.witness.topologyChecksum
  };
  for (const sample of history.samples) {
    sample.root.support.provenance.hillSourceId = prior.source.frameId;
  }
  return history;
}

function terrainAfterCrossing(xOffset: number, episodeId: string) {
  const cache = createHillOfHillsLayerTileCache();
  const before = createHillOfHillsTerrainWithCache(cache, terrainParams);
  const history = historyForPriorHill(xOffset, episodeId, before);
  const admitted = createHillOfHillsTerrainWithCache(
    cache,
    { ...terrainParams, topologyPhaseTimeMs: 120 },
    { producerContactHistory: history }
  );
  const afterDeparture = createHillOfHillsTerrainWithCache(
    cache,
    { ...terrainParams, topologyPhaseTimeMs: 900 }
  );
  return { before, admitted, afterDeparture, history };
}

const leftCrossing = terrainAfterCrossing(-1.25, 'hill-left-crossing');
const rightCrossing = terrainAfterCrossing(1.25, 'hill-right-crossing');
const noHistoryCache = createHillOfHillsLayerTileCache();
createHillOfHillsTerrainWithCache(noHistoryCache, terrainParams);
const noHistoryAtDeparture = createHillOfHillsTerrainWithCache(
  noHistoryCache,
  { ...terrainParams, topologyPhaseTimeMs: 900 }
);
assert.equal(leftCrossing.before.witness.producerTrafficAdmittedEpisodeCount, 0);
assert.equal(leftCrossing.before.witness.producerTrafficFieldRange.max, 0);
assert.equal(leftCrossing.admitted.witness.producerTrafficAdmittedEpisodeCount, 1);
assert.ok(leftCrossing.admitted.witness.producerTrafficFieldRange.max > 0);
assert.equal(
  leftCrossing.afterDeparture.witness.producerTrafficFieldChecksum,
  leftCrossing.admitted.witness.producerTrafficFieldChecksum,
  'producer traffic persists after the creature leaves the Hill'
);
assert.equal(leftCrossing.afterDeparture.witness.producerTrafficAdmittedEpisodeCount, 1);
assert.notEqual(
  leftCrossing.afterDeparture.witness.topologyPossibilityChecksum,
  rightCrossing.afterDeparture.witness.topologyPossibilityChecksum,
  'different physical contact routes yield different next-epoch topology possibility'
);
assert.equal(
  leftCrossing.afterDeparture.witness.supportFrame.shockClassCounts.shock_reset ?? 0,
  0,
  'contact-history admission does not reset or teleport the support surface'
);

const additiveCache = createHillOfHillsLayerTileCache();
const additiveParams = {
  ...terrainParams,
  producerTrafficDepositionLaw: 'additive_v0' as const
};
const additivePrior = createHillOfHillsTerrainWithCache(
  additiveCache,
  additiveParams
);
const additiveHistory = historyForPriorHill(
  -1.25,
  'additive-law-cache-crossing',
  additivePrior
);
createHillOfHillsTerrainWithCache(
  additiveCache,
  { ...additiveParams, topologyPhaseTimeMs: 120 },
  { producerContactHistory: additiveHistory }
);
const additiveMature = createHillOfHillsTerrainWithCache(
  additiveCache,
  { ...additiveParams, topologyPhaseTimeMs: 900 }
);
const switchedToBounded = createHillOfHillsTerrainWithCache(
  additiveCache,
  {
    ...terrainParams,
    producerTrafficDepositionLaw: 'bounded_exponential_v1',
    topologyPhaseTimeMs: 900
  }
);
const freshBoundedCache = createHillOfHillsLayerTileCache();
const freshBounded = createHillOfHillsTerrainWithCache(
  freshBoundedCache,
  {
    ...terrainParams,
    producerTrafficDepositionLaw: 'bounded_exponential_v1',
    topologyPhaseTimeMs: 900
  }
);
assert.notDeepEqual(
  additiveMature.witness.topologyDeformationRange,
  freshBounded.witness.topologyDeformationRange,
  'the additive control must actually carry different persistent dynamics before the law switch'
);
assert.deepEqual(
  {
    topologyChecksum: switchedToBounded.witness.topologyChecksum,
    topologyPossibilityChecksum:
      switchedToBounded.witness.topologyPossibilityChecksum,
    deformation: switchedToBounded.witness.topologyDeformationRange,
    velocity: switchedToBounded.witness.topologyVelocityRange,
    force: switchedToBounded.witness.topologyForceRange
  },
  {
    topologyChecksum: freshBounded.witness.topologyChecksum,
    topologyPossibilityChecksum:
      freshBounded.witness.topologyPossibilityChecksum,
    deformation: freshBounded.witness.topologyDeformationRange,
    velocity: freshBounded.witness.topologyVelocityRange,
    force: freshBounded.witness.topologyForceRange
  },
  'switching deposition law cannot inherit the previous law topology trajectory'
);

const inheritedAffordance = sampleHillOfHillsTraversalAffordance(
  leftCrossing.afterDeparture,
  [-1.25, 0, -0.8],
  [0, 0, 1]
);
const repeatedAffordance = sampleHillOfHillsTraversalAffordance(
  leftCrossing.afterDeparture,
  [-1.25, 0, -0.8],
  [0, 0, 1]
);
const noHistoryAffordance = sampleHillOfHillsTraversalAffordance(
  noHistoryAtDeparture,
  [-1.25, 0, -0.8],
  [0, 0, 1]
);
const inheritedSpatialControl = sampleHillOfHillsTraversalAffordance(
  leftCrossing.afterDeparture,
  [3.25, 0, 4.25],
  [0, 0, 1]
);
assert.equal(inheritedAffordance.schema, HILL_OF_HILLS_TRAVERSAL_AFFORDANCE_SCHEMA);
assert.deepEqual(inheritedAffordance, repeatedAffordance, 'local affordance sampling is deterministic');
assert.deepEqual(
  {
    depositionLaw: inheritedAffordance.memory.depositionLaw,
    capacity: inheritedAffordance.memory.capacity
  },
  {
    depositionLaw: 'bounded_exponential_v1',
    capacity: 1
  },
  'the consumer sees the bounded environmental-memory law rather than inferring it from values'
);
assert.equal(inheritedAffordance.source.frameId, leftCrossing.afterDeparture.source.frameId);
assert.equal(
  inheritedAffordance.source.sampleChecksum,
  leftCrossing.afterDeparture.witness.sampleChecksum
);
assert.equal(
  inheritedAffordance.source.topologyChecksum,
  leftCrossing.afterDeparture.witness.topologyChecksum
);
assert.equal(
  inheritedAffordance.source.supportFrameChecksum,
  leftCrossing.afterDeparture.witness.supportFrame.supportFrameChecksum
);
assert.equal(
  inheritedAffordance.source.producerTrafficFieldChecksum,
  leftCrossing.afterDeparture.witness.producerTrafficFieldChecksum
);
assert.ok(
  inheritedAffordance.memory.localExposure > noHistoryAffordance.memory.localExposure,
  'inherited embodied history changes the local environmental-memory component at the traversed branch'
);
assert.ok(
  inheritedAffordance.memory.localExposure > inheritedSpatialControl.memory.localExposure,
  'history-conditioned affordance remains spatially attached instead of becoming a global preference'
);
for (const value of [
  inheritedAffordance.support.stability,
  inheritedAffordance.traversal.uphillEffort,
  inheritedAffordance.traversal.directionalPermeability,
  inheritedAffordance.terrain.routePressure,
  inheritedAffordance.memory.affinity
]) {
  assert.ok(Number.isFinite(value) && value >= 0 && value <= 1);
}
assert.ok(
  inheritedAffordance.traversal.signedGrade >= -1 &&
    inheritedAffordance.traversal.signedGrade <= 1
);
assert.ok(
  inheritedAffordance.traversal.flowAlignment >= -1 &&
    inheritedAffordance.traversal.flowAlignment <= 1
);
assert.equal(
  'score' in inheritedAffordance,
  false,
  'Hill returns causal local quantities rather than choosing a route for Horde'
);
assert.throws(
  () =>
    sampleHillOfHillsTraversalAffordance(
      leftCrossing.afterDeparture,
      [-1.25, 0, -0.8],
      [0, 0, 0]
    ),
  /direction/,
  'a missing candidate direction cannot silently become a traversal affordance'
);

assert.throws(
  () => createHillOfHillsTerrain(terrainParams, { producerContactHistory: leftCrossing.history }),
  /requires createHillOfHillsTerrainWithCache/,
  'history cannot be admitted without the prior cached Hill witness'
);
const staleTargetCache = createHillOfHillsLayerTileCache();
createHillOfHillsTerrainWithCache(staleTargetCache, terrainParams, {
  route: 'hill-of-hills-terrain/other-observation'
});
assert.throws(
  () =>
    createHillOfHillsTerrainWithCache(
      staleTargetCache,
      { ...terrainParams, topologyPhaseTimeMs: 120 },
      { producerContactHistory: leftCrossing.history }
    ),
  /different or stale Hill witness/,
  'history from another Hill observation fails loud'
);

const crossLineageAdmissionCache = createHillOfHillsLayerTileCache();
const sourceABefore = createHillOfHillsTerrainWithCache(crossLineageAdmissionCache, terrainParams, {
  route: 'hill-of-hills/source-a',
  frameId: 'hill-a-frame-0',
  backend: 'deterministic-cpu-heightfield',
  configId: 'hill-a'
});
const sourceAHistory = historyForPriorHill(-1.25, 'source-a-crossing', sourceABefore);
assert.throws(
  () =>
    createHillOfHillsTerrainWithCache(
      crossLineageAdmissionCache,
      { ...terrainParams, topologyPhaseTimeMs: 120 },
      {
        route: 'hill-of-hills/source-b',
        frameId: 'hill-b-frame-0',
        backend: 'deterministic-cpu-heightfield',
        configId: 'hill-b',
        producerContactHistory: sourceAHistory
      }
    ),
  /current Hill source lineage/,
  'history targeting prior Hill A cannot be admitted while generating source B'
);

const sourceSwitchCache = createHillOfHillsLayerTileCache();
const sourceSwitchBefore = createHillOfHillsTerrainWithCache(sourceSwitchCache, terrainParams, {
  route: 'hill-of-hills/source-a',
  frameId: 'hill-a-frame-0',
  configId: 'hill-a'
});
const sourceSwitchHistory = historyForPriorHill(-1.25, 'source-switch-crossing', sourceSwitchBefore);
const sourceSwitchAdmitted = createHillOfHillsTerrainWithCache(
  sourceSwitchCache,
  { ...terrainParams, topologyPhaseTimeMs: 120 },
  {
    route: 'hill-of-hills/source-a',
    frameId: 'hill-a-frame-1',
    configId: 'hill-a',
    producerContactHistory: sourceSwitchHistory
  }
);
assert.equal(sourceSwitchAdmitted.witness.producerTrafficAdmittedEpisodeCount, 1);
const sourceBAfterSwitch = createHillOfHillsTerrainWithCache(
  sourceSwitchCache,
  { ...terrainParams, topologyPhaseTimeMs: 240 },
  {
    route: 'hill-of-hills/source-b',
    frameId: 'hill-b-frame-0',
    configId: 'hill-b'
  }
);
assert.equal(sourceBAfterSwitch.witness.producerTrafficAdmittedEpisodeCount, 0);
assert.equal(sourceBAfterSwitch.witness.producerTrafficFieldRange.max, 0);
assert.notEqual(
  sourceBAfterSwitch.witness.producerTrafficFieldChecksum,
  sourceSwitchAdmitted.witness.producerTrafficFieldChecksum,
  'a different current Hill lineage cannot inherit old-Hill traffic'
);

console.log('hill of hills producer contact history contracts ok');
