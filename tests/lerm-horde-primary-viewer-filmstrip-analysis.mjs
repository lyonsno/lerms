import assert from 'node:assert/strict';

const EXPECTED_COMPOSITION =
  'lerms/lerm-horde/primary-viewer-live-composition-v0';
const EXPECTED_VIEWER =
  'lerms/hill-of-hills/primary-viewer-v0';
const EXPECTED_PRESENTATION =
  'lerms/lerm-horde/indexed-textured-axial-gpu-v0';
const EXPECTED_RUNTIME =
  'lerms/lerm-horde/primary-viewer-live-worker-v0';

export function validateActorFilmstripFrames(
  frames,
  { expectedFrameCount } = {},
) {
  assert.ok(
    Array.isArray(frames) && frames.length >= 2,
    'actor filmstrip requires at least two complete frames',
  );
  if (expectedFrameCount !== undefined) {
    assert.equal(
      frames.length,
      expectedFrameCount,
      'partial filmstrip did not capture the requested frame count',
    );
  }
  for (let index = 0; index < frames.length; index += 1) {
    const frame = frames[index];
    validateActorFilmstripFrame(
      frame,
      index,
      index === 0 ? undefined : frames[index - 1],
    );
  }
}

export function validateActorFilmstripFrame(
  frame,
  index,
  previous,
) {
  assert.equal(frame.index, index, 'filmstrip frame index is partial');
  assert.equal(
    frame.status,
    'live',
    'filmstrip worker status is not live',
  );
  assert.ok(
    frame.error === '' || frame.error === 'none',
    'filmstrip worker reported an error',
  );
  assert.equal(
    frame.lifecyclePhase,
    'traversing',
    'cross-loop or departed state entered the traversal filmstrip',
  );
  assert.equal(
    frame.lifecycleVisible,
    true,
    'visible actor disappeared before declared departure',
  );
  assert.deepEqual(
    {
      composition: frame.route?.composition,
      viewer: frame.route?.viewer,
      presentation: frame.route?.presentation,
      runtime: frame.route?.runtime,
      runtimeBackend: frame.route?.runtimeBackend,
      fallbackStatus: frame.route?.fallbackStatus,
    },
    {
      composition: EXPECTED_COMPOSITION,
      viewer: EXPECTED_VIEWER,
      presentation: EXPECTED_PRESENTATION,
      runtime: EXPECTED_RUNTIME,
      runtimeBackend: 'dedicated-worker',
      fallbackStatus: 'none',
    },
    'filmstrip frame route is substituted or fallback',
  );
  assert.ok(
    frame.route.staleStatus === 'fresh' ||
      frame.route.staleStatus === 'retained-complete-frame',
    'filmstrip frame stale state is partial or unaccounted',
  );
  assert.ok(
    Number.isInteger(frame.publication?.generation) &&
      frame.publication.generation >= 0 &&
      frame.publication.generation === frame.tickCount &&
      Number.isFinite(frame.publication.sourceElapsedMs) &&
      frame.publication.sourceElapsedMs ===
        frame.runtimeElapsedMs &&
      Number.isFinite(frame.publication.hostPublishedAtMs) &&
      Number.isFinite(frame.publication.presentationAgeMs) &&
      frame.publication.presentationAgeMs >= 0 &&
      frame.publication.completeness ===
        'atomic-terrain-actor',
    'filmstrip frame has partial or mixed atomic publication',
  );
  assert.equal(
    frame.route.staleStatus === 'fresh'
      ? frame.publication.presentationAgeMs === 0
      : frame.publication.presentationAgeMs > 0,
    true,
    'filmstrip frame freshness does not match publication age',
  );
  assertTerrainIdentity(frame.terrain, 'terrain');
  assertTerrainIdentity(frame.hostTerrain, 'hostTerrain');
  assert.equal(
    frame.terrainFrameId,
    frame.terrain.frameId,
    'filmstrip frame telemetry substituted terrain frame identity',
  );
  assert.deepEqual(
    {
      frameId: frame.terrain.frameId,
      sampleChecksum: frame.terrain.sampleChecksum,
      topologyChecksum: frame.terrain.topologyChecksum,
    },
    frame.hostTerrain,
    'filmstrip frame Hill identity or checksum does not match the canonical host',
  );
  assertChecksum(
    frame.terrain.trafficChecksum,
    'terrain traffic checksum',
  );
    for (const [name, value] of [
      ['captureStartedAtMs', frame.captureStartedAtMs],
      ['captureCompletedAtMs', frame.captureCompletedAtMs],
      ['runtimeElapsedMs', frame.runtimeElapsedMs],
      ['tickCount', frame.tickCount],
      ['drawCount', frame.drawCount],
      ['sourceDistance', frame.sourceDistance],
      ['phase', frame.phase],
      ['rootCropSpeciesPixels', frame.rootCropSpeciesPixels],
    ]) {
      assert.ok(Number.isFinite(value), `filmstrip frame has partial ${name}`);
    }
    assert.ok(
      frame.captureCompletedAtMs >= frame.captureStartedAtMs,
      'filmstrip capture timing is nonmonotonic',
    );
    assertVector(frame.rootWorld, 'rootWorld');
    assertScreenPoint(frame.rootScreen, 'rootScreen');
    assert.equal(
      frame.supportProfile?.length,
      7,
      'filmstrip frame has partial supportProfile',
    );
    assert.ok(
      frame.supportProfile.every(
        (sample, station) =>
          Number.isFinite(sample.t) &&
          Number.isFinite(sample.localOffset) &&
          Math.abs(sample.t - station / 6) < 1e-6,
      ),
      'filmstrip frame has malformed supportProfile',
    );
    assertBounds(frame.speciesBounds, 'speciesBounds');
    assert.match(
      frame.screenshotSha256,
      /^[a-f0-9]{64}$/,
      'filmstrip frame has partial or blank screenshot identity',
    );
    assert.match(
      frame.observationToken,
      /^.+:\d+:\d+:\d+$/,
      'filmstrip frame has partial same-observation identity',
    );
    if (!previous) return;
    assert.ok(
      frame.captureStartedAtMs > previous.captureStartedAtMs &&
        frame.runtimeElapsedMs >= previous.runtimeElapsedMs &&
        frame.tickCount >= previous.tickCount &&
        frame.sourceDistance >= previous.sourceDistance,
      'filmstrip telemetry is nonmonotonic',
    );
    assert.ok(
      frame.drawCount > previous.drawCount,
      'duplicate filmstrip host presentation identity',
    );
    assert.notEqual(
      frame.observationToken,
      previous.observationToken,
      'duplicate filmstrip observation under advancing host presentation',
    );
    if (frame.terrainFrameId === previous.terrainFrameId) {
      assert.deepEqual(
        frame.terrain,
        previous.terrain,
        'same-frame Hill identity or checksum changed, including traffic',
      );
      assert.deepEqual(
        frame.hostTerrain,
        previous.hostTerrain,
        'same-frame canonical-host Hill identity or checksum changed',
      );
    }
    if (frame.runtimeElapsedMs > previous.runtimeElapsedMs) {
      assert.notEqual(
        frame.screenshotSha256,
        previous.screenshotSha256,
        'duplicate filmstrip image under advancing telemetry',
      );
    } else {
      assert.equal(
        frame.tickCount,
        previous.tickCount,
        'retained worker frame changed tick without advancing runtime',
      );
      assert.equal(
        frame.sourceDistance,
        previous.sourceDistance,
        'retained worker frame changed actor pose without advancing runtime',
      );
      assert.equal(
        frame.terrainFrameId,
        previous.terrainFrameId,
        'retained worker frame crossed Hill identity without advancing runtime',
      );
      assert.equal(
        frame.route.staleStatus,
        'retained-complete-frame',
        'retained worker frame was laundered as fresh',
      );
      assert.equal(
        frame.publication.generation,
        previous.publication.generation,
        'retained worker frame changed publication generation',
      );
      assert.equal(
        frame.publication.sourceElapsedMs,
        previous.publication.sourceElapsedMs,
        'retained worker frame changed publication source time',
      );
      assert.equal(
        frame.publication.hostPublishedAtMs,
        previous.publication.hostPublishedAtMs,
        'retained worker frame changed publication host identity',
      );
      assert.deepEqual(
        frame.terrain,
        previous.terrain,
        'retained worker frame changed full Hill identity',
      );
      assert.deepEqual(
        frame.hostTerrain,
        previous.hostTerrain,
        'retained worker frame changed canonical-host Hill identity',
      );
    }
}

export function analyzeActorFilmstrip(
  frames,
  { requestedCadenceMs = 500 } = {},
) {
  const adjacentTransitions = [];
  const suspicions = [];
  for (let index = 1; index < frames.length; index += 1) {
    const from = frames[index - 1];
    const to = frames[index];
    const captureCadenceMs =
      to.captureStartedAtMs - from.captureStartedAtMs;
    const runtimeDeltaMs = to.runtimeElapsedMs - from.runtimeElapsedMs;
    const worldRootDelta = distance3(from.rootWorld, to.rootWorld);
    const screenRootDelta = distance2(from.rootScreen, to.rootScreen);
    const sourceDistanceDelta = to.sourceDistance - from.sourceDistance;
    const phaseDelta = positivePhaseDelta(from.phase, to.phase);
    const supportProfileMaxDelta = Math.max(
      ...to.supportProfile.map((sample, station) =>
        Math.abs(
          sample.localOffset -
            from.supportProfile[station].localOffset,
        ),
      ),
    );
    const pixelRetention =
      from.rootCropSpeciesPixels > 0
        ? to.rootCropSpeciesPixels / from.rootCropSpeciesPixels
        : 1;
    const silhouetteAreaRatio =
      from.rootCropSpeciesPixels > 0
        ? to.rootCropSpeciesPixels / from.rootCropSpeciesPixels
        : 1;
    const transition = {
      fromIndex: from.index,
      toIndex: to.index,
      captureCadenceMs,
      captureDurationMs:
        to.captureCompletedAtMs - to.captureStartedAtMs,
      runtimeDeltaMs,
      tickDelta: to.tickCount - from.tickCount,
      worldRootDelta,
      screenRootDelta,
      sourceDistanceDelta,
      phaseDelta,
      supportProfileMaxDelta,
      pixelRetention,
      silhouetteAreaRatio,
    };
    adjacentTransitions.push(transition);

    if (runtimeDeltaMs === 0 && transition.tickDelta === 0) {
      suspicions.push(
        suspicion(
          'retained-frame-hold',
          transition,
          0.35,
          `worker retained tick ${to.tickCount} across ${captureCadenceMs.toFixed(1)} ms of host presentation`,
        ),
      );
    }
    if (
      to.lifecycleVisible &&
      to.rootCropSpeciesPixels <
        Math.max(12, from.rootCropSpeciesPixels * 0.15)
    ) {
      suspicions.push(
        suspicion(
          'actor-pixel-dropout',
          transition,
          1 - Math.min(1, pixelRetention),
          `visible actor pixels collapsed from ${from.rootCropSpeciesPixels} to ${to.rootCropSpeciesPixels}`,
        ),
      );
    }
    if (
      Math.max(
        silhouetteAreaRatio,
        1 / Math.max(silhouetteAreaRatio, 1e-8),
      ) > 1.6 &&
      worldRootDelta < 0.35
    ) {
      suspicions.push(
        suspicion(
          'actor-silhouette-jump',
          transition,
          Math.min(
            1,
            Math.abs(Math.log2(silhouetteAreaRatio)),
          ),
          `root-local actor silhouette changed ${(silhouetteAreaRatio * 100).toFixed(1)}% across adjacent frames`,
        ),
      );
    }
    if (
      supportProfileMaxDelta > 0.18 &&
      worldRootDelta < 0.65
    ) {
      suspicions.push(
        suspicion(
          'support-profile-jump',
          transition,
          Math.min(1, supportProfileMaxDelta),
          `support profile stepped ${supportProfileMaxDelta.toFixed(3)} world units`,
        ),
      );
    }
    if (
      screenRootDelta > 90 &&
      worldRootDelta < 0.35
    ) {
      suspicions.push(
        suspicion(
          'presentation-screen-jump',
          transition,
          Math.min(1, screenRootDelta / 180),
          `screen root jumped ${screenRootDelta.toFixed(1)} px for ${worldRootDelta.toFixed(3)} world movement`,
        ),
      );
    }
    if (
      worldRootDelta > 0.9 &&
      runtimeDeltaMs < 180
    ) {
      suspicions.push(
        suspicion(
          'source-root-jump',
          transition,
          Math.min(1, worldRootDelta / 1.8),
          `world root stepped ${worldRootDelta.toFixed(3)} in ${runtimeDeltaMs.toFixed(1)} runtime ms`,
        ),
      );
    }
    if (captureCadenceMs > requestedCadenceMs * 1.75) {
      suspicions.push(
        suspicion(
          'capture-cadence-overrun',
          transition,
          Math.min(
            1,
            captureCadenceMs / requestedCadenceMs - 1,
          ),
          `capture cadence stretched to ${captureCadenceMs.toFixed(1)} ms from requested ${requestedCadenceMs} ms`,
        ),
      );
    }
  }
  return {
    adjacentTransitions,
    suspicions,
    rankedTransitions: [...adjacentTransitions].sort(
      (left, right) =>
        transitionSeverity(right) - transitionSeverity(left),
    ),
  };
}

function suspicion(kind, transition, severity, message) {
  return {
    kind,
    severity,
    fromIndex: transition.fromIndex,
    toIndex: transition.toIndex,
    message,
  };
}

function transitionSeverity(transition) {
  return Math.max(
    Math.min(1, transition.screenRootDelta / 180),
    Math.min(1, transition.supportProfileMaxDelta),
    Math.max(0, 1 - transition.pixelRetention),
    Math.min(1, transition.worldRootDelta / 1.8),
    transition.runtimeDeltaMs === 0 ? 0.35 : 0,
  );
}

function positivePhaseDelta(from, to) {
  const tau = Math.PI * 2;
  return ((to - from) % tau + tau) % tau;
}

function distance2(left, right) {
  return Math.hypot(right.x - left.x, right.y - left.y);
}

function distance3(left, right) {
  return Math.hypot(
    right.x - left.x,
    right.y - left.y,
    right.z - left.z,
  );
}

function assertVector(value, name) {
  assert.ok(
    value &&
      Number.isFinite(value.x) &&
      Number.isFinite(value.y) &&
      Number.isFinite(value.z),
    `filmstrip frame has partial ${name}`,
  );
}

function assertScreenPoint(value, name) {
  assert.ok(
    value &&
      Number.isFinite(value.x) &&
      Number.isFinite(value.y) &&
      Number.isFinite(value.depth),
    `filmstrip frame has partial ${name}`,
  );
}

function assertBounds(value, name) {
  assert.ok(
    value &&
      Number.isFinite(value.minX) &&
      Number.isFinite(value.minY) &&
      Number.isFinite(value.maxX) &&
      Number.isFinite(value.maxY) &&
      Number.isFinite(value.width) &&
      Number.isFinite(value.height) &&
      value.width > 0 &&
      value.height > 0,
    `filmstrip frame has partial ${name}`,
  );
}

function assertTerrainIdentity(value, name) {
  assert.ok(
    value && typeof value.frameId === 'string' && value.frameId.length > 0,
    `filmstrip frame has partial ${name} frame identity`,
  );
  assertChecksum(value.sampleChecksum, `${name} sample checksum`);
  assertChecksum(
    value.topologyChecksum,
    `${name} topology checksum`,
  );
}

function assertChecksum(value, name) {
  assert.ok(
    typeof value === 'string' && value.length > 0,
    `filmstrip frame has partial ${name}`,
  );
}
