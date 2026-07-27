import assert from 'node:assert/strict';

export function validateActorFilmstripFrames(frames) {
  assert.ok(
    Array.isArray(frames) && frames.length >= 2,
    'actor filmstrip requires at least two complete frames',
  );
  for (let index = 0; index < frames.length; index += 1) {
    const frame = frames[index];
    assert.equal(frame.index, index, 'filmstrip frame index is partial');
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
    for (const [name, value] of [
      ['captureStartedAtMs', frame.captureStartedAtMs],
      ['captureCompletedAtMs', frame.captureCompletedAtMs],
      ['runtimeElapsedMs', frame.runtimeElapsedMs],
      ['tickCount', frame.tickCount],
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
      /^.+:\d+:\d+$/,
      'filmstrip frame has partial same-observation identity',
    );
    if (index === 0) continue;
    const previous = frames[index - 1];
    assert.ok(
      frame.captureStartedAtMs > previous.captureStartedAtMs &&
        frame.runtimeElapsedMs > previous.runtimeElapsedMs &&
        frame.tickCount > previous.tickCount &&
        frame.sourceDistance > previous.sourceDistance,
      'filmstrip telemetry is nonmonotonic',
    );
    assert.notEqual(
      frame.screenshotSha256,
      previous.screenshotSha256,
      'duplicate filmstrip image under advancing telemetry',
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
