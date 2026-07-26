import * as THREE from 'three';

import {
  HILL_OF_HILLS_TERRAIN_BUFFER_SCHEMA,
  type HillOfHillsTerrainBuffer,
} from './terrain/hill-of-hills.js';

export const FULL_HILL_RENDERER_ID =
  'three-webgl-full-hill-v0' as const;

export function validateHillTerrainBuffer(
  buffer: HillOfHillsTerrainBuffer,
): void {
  const sampleCount =
    buffer?.gridResolution?.x * buffer?.gridResolution?.z;
  if (
    buffer?.schema !== HILL_OF_HILLS_TERRAIN_BUFFER_SCHEMA ||
    buffer.witness.fallbackStatus !== 'none' ||
    buffer.sampleCount !== sampleCount ||
    buffer.positions.length !== sampleCount * 3 ||
    buffer.normals.length !== sampleCount * 3 ||
    buffer.colors.length !== sampleCount * 3 ||
    buffer.gridResolution.x < 2 ||
    buffer.gridResolution.z < 2
  ) {
    throw new Error('Hill terrain buffer is fallback, partial, or malformed');
  }
}

export function createHillTerrainGridIndices(
  buffer: HillOfHillsTerrainBuffer,
): Uint16Array | Uint32Array {
  validateHillTerrainBuffer(buffer);
  const columns = buffer.gridResolution.x;
  const rows = buffer.gridResolution.z;
  const IndexArray =
    buffer.sampleCount <= 65_535 ? Uint16Array : Uint32Array;
  const indices = new IndexArray((columns - 1) * (rows - 1) * 6);
  let offset = 0;
  for (let z = 0; z < rows - 1; z += 1) {
    for (let x = 0; x < columns - 1; x += 1) {
      const northWest = z * columns + x;
      const southWest = (z + 1) * columns + x;
      const northEast = northWest + 1;
      const southEast = southWest + 1;
      indices[offset] = northWest;
      indices[offset + 1] = southWest;
      indices[offset + 2] = northEast;
      indices[offset + 3] = northEast;
      indices[offset + 4] = southWest;
      indices[offset + 5] = southEast;
      offset += 6;
    }
  }
  return indices;
}

export function createHillTerrainGeometry(
  buffer: HillOfHillsTerrainBuffer,
): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  geometry.setIndex(
    new THREE.BufferAttribute(createHillTerrainGridIndices(buffer), 1),
  );
  geometry.setAttribute(
    'position',
    new THREE.BufferAttribute(buffer.positions.slice(), 3),
  );
  geometry.setAttribute(
    'normal',
    new THREE.BufferAttribute(buffer.normals.slice(), 3),
  );
  geometry.setAttribute(
    'color',
    new THREE.BufferAttribute(normalizeTerrainColors(buffer.colors), 3),
  );
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  geometry.userData.hillTerrainBufferSchema = buffer.schema;
  geometry.userData.sampleChecksum = buffer.sampleChecksum;
  geometry.userData.topologyChecksum = buffer.topologyChecksum;
  return geometry;
}

export function updateHillTerrainGeometry(
  geometry: THREE.BufferGeometry,
  buffer: HillOfHillsTerrainBuffer,
): void {
  validateHillTerrainBuffer(buffer);
  const position = requiredAttribute(geometry, 'position');
  const normal = requiredAttribute(geometry, 'normal');
  const color = requiredAttribute(geometry, 'color');
  if (
    position.count !== buffer.sampleCount ||
    normal.count !== buffer.sampleCount ||
    color.count !== buffer.sampleCount
  ) {
    throw new Error('full-Hill geometry cannot accept a partial or changed grid');
  }
  position.copyArray(buffer.positions);
  normal.copyArray(buffer.normals);
  color.copyArray(normalizeTerrainColors(buffer.colors));
  position.needsUpdate = true;
  normal.needsUpdate = true;
  color.needsUpdate = true;
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  geometry.userData.sampleChecksum = buffer.sampleChecksum;
  geometry.userData.topologyChecksum = buffer.topologyChecksum;
}

function requiredAttribute(
  geometry: THREE.BufferGeometry,
  name: 'position' | 'normal' | 'color',
): THREE.BufferAttribute {
  const attribute = geometry.getAttribute(name);
  if (!(attribute instanceof THREE.BufferAttribute)) {
    throw new Error(`full-Hill geometry is missing ${name}`);
  }
  return attribute;
}

function normalizeTerrainColors(colors: Float32Array): Float32Array {
  const normalized = new Float32Array(colors.length);
  for (let index = 0; index < colors.length; index += 1) {
    const value = colors[index];
    if (!Number.isFinite(value) || value < 0 || value > 255) {
      throw new Error(`Hill terrain color channel ${index} is outside 8-bit range`);
    }
    normalized[index] = value / 255;
  }
  return normalized;
}
