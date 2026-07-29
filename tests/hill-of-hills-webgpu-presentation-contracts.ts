import assert from 'node:assert/strict';

import {
  HILL_GPU_PRESENTATION_SHADER,
  assertHillGpuPresentationReceipt,
  createHillGpuGridIndices,
  createHillGpuPresentationBufferSelection,
  createHillGpuPresentationReceipt,
} from '../src/terrain/hill-of-hills-webgpu-presentation.js';

const indices = createHillGpuGridIndices(12, 16);
assert.equal(indices.length, (12 - 1) * (16 - 1) * 6);
assert.equal(Math.max(...indices), 12 * 16 - 1);
assert.deepEqual(Array.from(indices.slice(0, 6)), [
  0,
  12,
  1,
  1,
  12,
  13,
]);

assert.deepEqual(
  createHillGpuPresentationBufferSelection(0),
  {
    previousIndex: 0,
    currentIndex: 0,
  },
);
assert.deepEqual(
  createHillGpuPresentationBufferSelection(1),
  {
    previousIndex: 0,
    currentIndex: 1,
  },
);
assert.deepEqual(
  createHillGpuPresentationBufferSelection(2),
  {
    previousIndex: 1,
    currentIndex: 0,
  },
);

for (const token of [
  '@vertex',
  '@fragment',
  'previous_height',
  'current_height',
  'presentation_alpha',
]) {
  assert.ok(
    HILL_GPU_PRESENTATION_SHADER.includes(token),
    `presentation shader owns ${token}`,
  );
}

const receipt = createHillGpuPresentationReceipt({
  generation: 2,
  presentationAlpha: 0.35,
  indexCount: indices.length,
  renderedPixelCount: 12_345,
});
assertHillGpuPresentationReceipt(receipt);
assert.equal(receipt.ok, true);
assert.equal(receipt.route.backend, 'webgpu');
assert.equal(receipt.route.requested, receipt.route.effective);
assert.equal(receipt.route.fallbackStatus, 'none');
assert.equal(receipt.route.staleStatus, 'fresh');
assert.equal(receipt.generation.previous, 1);
assert.equal(receipt.generation.current, 2);
assert.equal(receipt.presentationAlpha, 0.35);
assert.equal(receipt.indexCount, indices.length);
assert.equal(receipt.renderedPixelCount, 12_345);

assert.throws(
  () =>
    assertHillGpuPresentationReceipt({
      ...receipt,
      route: {
        ...receipt.route,
        effective: 'lerms/hill-of-hills/cpu-fallback-v0',
        fallbackStatus: 'fallback',
      },
    }),
  /fallback|effective/i,
);
assert.throws(
  () =>
    assertHillGpuPresentationReceipt({
      ...receipt,
      renderedPixelCount: 0,
    }),
  /blank|pixel/i,
);
assert.throws(
  () =>
    assertHillGpuPresentationReceipt({
      ...receipt,
      route: {
        ...receipt.route,
        staleStatus: 'stale',
      },
    }),
  /stale|fresh/i,
);

console.log('hill of hills WebGPU presentation contracts ok');
