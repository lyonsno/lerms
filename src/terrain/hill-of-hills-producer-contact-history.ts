export const HILL_OF_HILLS_PRODUCER_CONTACT_HISTORY_SCHEMA =
  'lerms.hill-of-hills.producer-contact-history.v0' as const;
export const HILL_OF_HILLS_PRODUCER_TRAFFIC_FIELD_SCHEMA =
  'lerms.hill-of-hills.producer-traffic-field.v0' as const;

export type HillOfHillsContactState = 'stance' | 'release' | 'swing';
export type HillOfHillsVec3 = readonly [number, number, number];

export interface HillOfHillsProducerContactPatch {
  id: string;
  state: HillOfHillsContactState;
  terrainPosition: HillOfHillsVec3;
  worldPosition: HillOfHillsVec3;
  terrainNormal: HillOfHillsVec3;
  terrainDistance: number;
  inBounds: boolean;
  slip: number;
}

export interface HillOfHillsProducerContactHistorySample {
  sequence: number;
  timestampMs: number;
  root: {
    worldPosition: HillOfHillsVec3;
    sourceDistance: number;
    routeProgress: number;
    tangent: HillOfHillsVec3;
    locomotionFrame: {
      forward: HillOfHillsVec3;
      right: HillOfHillsVec3;
      up: HillOfHillsVec3;
    };
    attention: {
      direction: HillOfHillsVec3;
      authority: string;
    };
    support: {
      schema: 'kaminos.axial-terrain-support-envelope.v0';
      disposition: 'local-support' | 'reroute-required';
      rootLift: number;
      minimumComplianceMargin: number;
      provenance: {
        hillSourceId: string;
        revision: string;
        freshnessMs: number;
      };
    };
  };
  locomotion?: {
    schema: 'kaminos.crawler-contact-locomotion-state.v0';
    atlasCastId: string;
    traction: number;
    coupling: number;
  };
  contacts?: {
    schema: 'kaminos.crawler-contact-samples.v0';
    atlasCastId: string;
    patches: HillOfHillsProducerContactPatch[];
  };
}

export interface HillOfHillsProducerContactHistory {
  schema: typeof HILL_OF_HILLS_PRODUCER_CONTACT_HISTORY_SCHEMA;
  episodeId: string;
  producer: {
    repository: 'kaminos';
    revision: string;
    route: string;
    creatureId: string;
    bodyRevision: string;
    motionRevision: string;
    routeId: string;
    railSchema: 'kaminos.creature-scale-locomotion-rail.v0';
    railId: string;
    supportSchema: 'kaminos.axial-terrain-support-envelope.v0';
    contactAtlasSchema?: 'kaminos.creature-contact-atlas.v0';
    contactAtlasCastId?: string;
    contactSampleSchema?: 'kaminos.crawler-contact-samples.v0';
    locomotionStateSchema?: 'kaminos.crawler-contact-locomotion-state.v0';
  };
  hill: {
    sourceId: string;
    sampleChecksum: string;
    topologyChecksum: string;
  };
  coordinateSpace: {
    axes: 'x-y-z';
    up: 'y';
    units: 'world';
  };
  patchIds?: readonly string[];
  samples: HillOfHillsProducerContactHistorySample[];
}

export interface HillOfHillsProducerTrafficGrid {
  xCount: number;
  zCount: number;
  xMin: number;
  xMax: number;
  zMin: number;
  zMax: number;
}

export interface HillOfHillsProducerTrafficField extends HillOfHillsProducerTrafficGrid {
  schema: typeof HILL_OF_HILLS_PRODUCER_TRAFFIC_FIELD_SCHEMA;
  values: readonly number[];
  admittedHistoryChecksums: readonly string[];
  admittedEpisodeIds: readonly string[];
  admittedEpisodeCount: number;
  stanceContactCount: number;
  supportedRootSampleCount: number;
  exposureSeconds: number;
  checksum: string;
  range: {
    min: number;
    max: number;
  };
}

const REQUIRED_CRAWLER_PATCH_IDS = [
  'front-left',
  'front-right',
  'rear-left',
  'rear-right'
] as const;
const DEFAULT_CONTACT_RADIUS = 0.55;

export function validateHillOfHillsProducerContactHistory(
  input: HillOfHillsProducerContactHistory
): HillOfHillsProducerContactHistory {
  if (input?.schema !== HILL_OF_HILLS_PRODUCER_CONTACT_HISTORY_SCHEMA) {
    throw new Error(`contact history schema must be ${HILL_OF_HILLS_PRODUCER_CONTACT_HISTORY_SCHEMA}`);
  }
  if (!input.episodeId?.trim()) throw new Error('contact history episode id is required');
  if (
    input.producer?.repository !== 'kaminos' ||
    !input.producer.revision?.trim() ||
    !input.producer.creatureId?.trim() ||
    !input.producer.bodyRevision?.trim() ||
    !input.producer.motionRevision?.trim() ||
    !input.producer.routeId?.trim() ||
    !input.producer.railId?.trim()
  ) {
    throw new Error('contact history requires identified Kaminos producer provenance');
  }
  if (!input.producer.route?.trim() || input.producer.route === 'fallback') {
    throw new Error('contact history producer route must identify the live producer path');
  }
  if (
    input.producer.railSchema !== 'kaminos.creature-scale-locomotion-rail.v0' ||
    input.producer.supportSchema !== 'kaminos.axial-terrain-support-envelope.v0'
  ) {
    throw new Error('contact history producer schemas do not match the admitted rail/support path');
  }
  if (
    !input.hill?.sourceId?.trim() ||
    !input.hill.sampleChecksum?.trim() ||
    !input.hill.topologyChecksum?.trim()
  ) {
    throw new Error('contact history requires the exact Hill source and terrain checksums');
  }
  if (
    input.coordinateSpace?.axes !== 'x-y-z' ||
    input.coordinateSpace.up !== 'y' ||
    input.coordinateSpace.units !== 'world'
  ) {
    throw new Error('contact history coordinate space must be world x-y-z with y up');
  }
  const producerDeclaresContact =
    input.producer.contactAtlasSchema !== undefined ||
    input.producer.contactAtlasCastId !== undefined ||
    input.producer.contactSampleSchema !== undefined ||
    input.producer.locomotionStateSchema !== undefined ||
    input.patchIds !== undefined;
  if (producerDeclaresContact) {
    if (
      input.producer.contactAtlasSchema !== 'kaminos.creature-contact-atlas.v0' ||
      input.producer.contactSampleSchema !== 'kaminos.crawler-contact-samples.v0' ||
      input.producer.locomotionStateSchema !== 'kaminos.crawler-contact-locomotion-state.v0' ||
      !input.producer.contactAtlasCastId?.trim()
    ) {
      throw new Error('contact history optional contact identity must be complete when supplied');
    }
    if (
      input.patchIds?.length !== REQUIRED_CRAWLER_PATCH_IDS.length ||
      input.patchIds.some((id, index) => id !== REQUIRED_CRAWLER_PATCH_IDS[index])
    ) {
      throw new Error('contact history patch ids must match the complete ordered crawler atlas');
    }
  }
  if (!Array.isArray(input.samples) || input.samples.length < 2) {
    throw new Error('contact history requires at least two time samples');
  }

  let previousTimestamp = -Infinity;
  let previousRouteDistance = -Infinity;
  for (let sampleIndex = 0; sampleIndex < input.samples.length; sampleIndex += 1) {
    const sample = input.samples[sampleIndex];
    if (sample.sequence !== sampleIndex) {
      throw new Error(`contact history sample ${sampleIndex} sequence must be contiguous`);
    }
    if (!Number.isFinite(sample.timestampMs) || sample.timestampMs <= previousTimestamp) {
      throw new Error('contact history timestamps must be finite and strictly increasing');
    }
    previousTimestamp = sample.timestampMs;
    requireVec3(sample.root?.worldPosition, `contact history sample ${sampleIndex} root`);
    if (
      !Number.isFinite(sample.root.sourceDistance) ||
      sample.root.sourceDistance < previousRouteDistance ||
      !Number.isFinite(sample.root.routeProgress) ||
      sample.root.routeProgress < 0 ||
      sample.root.routeProgress > 1
    ) {
      throw new Error('contact history route distance must be monotonic and progress must remain in [0, 1]');
    }
    previousRouteDistance = sample.root.sourceDistance;
    requireVec3(sample.root.tangent, `contact history sample ${sampleIndex} tangent`);
    requireVec3(sample.root.locomotionFrame?.forward, `contact history sample ${sampleIndex} frame forward`);
    requireVec3(sample.root.locomotionFrame?.right, `contact history sample ${sampleIndex} frame right`);
    requireVec3(sample.root.locomotionFrame?.up, `contact history sample ${sampleIndex} frame up`);
    requireVec3(sample.root.attention?.direction, `contact history sample ${sampleIndex} attention direction`);
    if (!sample.root.attention.authority?.trim()) {
      throw new Error(`contact history sample ${sampleIndex} attention authority is required`);
    }
    if (
      sample.root.support?.schema !== input.producer.supportSchema ||
      (sample.root.support.disposition !== 'local-support' &&
        sample.root.support.disposition !== 'reroute-required') ||
      !Number.isFinite(sample.root.support.rootLift) ||
      !Number.isFinite(sample.root.support.minimumComplianceMargin) ||
      sample.root.support.provenance?.hillSourceId !== input.hill.sourceId ||
      !sample.root.support.provenance.revision?.trim() ||
      !Number.isFinite(sample.root.support.provenance.freshnessMs) ||
      sample.root.support.provenance.freshnessMs < 0
    ) {
      throw new Error(`contact history sample ${sampleIndex} support identity mismatch`);
    }
    const sampleDeclaresContact = sample.locomotion !== undefined || sample.contacts !== undefined;
    if (!sampleDeclaresContact) continue;
    if (!sample.locomotion || !sample.contacts) {
      throw new Error(`contact history sample ${sampleIndex} optional contact payload must be complete`);
    }
    if (
      !producerDeclaresContact ||
      sample.locomotion?.schema !== input.producer.locomotionStateSchema ||
      sample.contacts?.schema !== input.producer.contactSampleSchema ||
      sample.locomotion.atlasCastId !== input.producer.contactAtlasCastId ||
      sample.contacts.atlasCastId !== input.producer.contactAtlasCastId
    ) {
      throw new Error(`contact history sample ${sampleIndex} optional contact identity mismatch`);
    }
    if (
      !Number.isFinite(sample.locomotion.traction) ||
      sample.locomotion.traction < 0 ||
      sample.locomotion.traction > 1 ||
      !Number.isFinite(sample.locomotion.coupling) ||
      sample.locomotion.coupling < 0 ||
      sample.locomotion.coupling > 1
    ) {
      throw new Error(`contact history sample ${sampleIndex} locomotion weights must remain in [0, 1]`);
    }
    const patchIds = sample.contacts.patches.map((patch) => patch.id);
    if (
      patchIds.length !== input.patchIds!.length ||
      patchIds.some((id, index) => id !== input.patchIds![index]) ||
      new Set(patchIds).size !== patchIds.length
    ) {
      throw new Error(`contact history sample ${sampleIndex} must contain the complete patch set`);
    }
    for (const patch of sample.contacts.patches) {
      if (patch.state !== 'stance' && patch.state !== 'release' && patch.state !== 'swing') {
        throw new Error(`contact history patch ${patch.id} has an invalid state`);
      }
      requireVec3(patch.terrainPosition, `${patch.id} terrain position`);
      requireVec3(patch.worldPosition, `${patch.id} world position`);
      requireVec3(patch.terrainNormal, `${patch.id} terrain normal`);
      if (!Number.isFinite(patch.terrainDistance) || !Number.isFinite(patch.slip)) {
        throw new Error(`contact history patch ${patch.id} has non-finite contact evidence`);
      }
    }
  }
  return input;
}

export function createEmptyHillOfHillsProducerTrafficField(
  grid: HillOfHillsProducerTrafficGrid
): HillOfHillsProducerTrafficField {
  validateGrid(grid);
  const field: HillOfHillsProducerTrafficField = {
    schema: HILL_OF_HILLS_PRODUCER_TRAFFIC_FIELD_SCHEMA,
    ...grid,
    values: new Array(grid.xCount * grid.zCount).fill(0),
    admittedHistoryChecksums: [],
    admittedEpisodeIds: [],
    admittedEpisodeCount: 0,
    stanceContactCount: 0,
    supportedRootSampleCount: 0,
    exposureSeconds: 0,
    checksum: 'empty',
    range: { min: 0, max: 0 }
  };
  return {
    ...field,
    checksum: trafficFieldChecksum(field)
  };
}

export function admitHillOfHillsProducerContactHistory(
  previous: HillOfHillsProducerTrafficField,
  historyInput: HillOfHillsProducerContactHistory,
  contactRadius = DEFAULT_CONTACT_RADIUS
): HillOfHillsProducerTrafficField {
  validateTrafficField(previous);
  const history = validateHillOfHillsProducerContactHistory(historyInput);
  const historyChecksum = producerContactHistoryChecksum(history);
  if (previous.admittedHistoryChecksums.includes(historyChecksum)) return previous;
  if (previous.admittedEpisodeIds.includes(history.episodeId)) {
    throw new Error(`contact history episode ${history.episodeId} was already admitted with different evidence`);
  }
  if (!Number.isFinite(contactRadius) || contactRadius <= 0) {
    throw new Error('producer contact radius must be finite and positive');
  }

  const values = Array.from(previous.values);
  let stanceContactCount = 0;
  let supportedRootSampleCount = 0;
  let exposureSeconds = 0;
  for (let sampleIndex = 0; sampleIndex < history.samples.length - 1; sampleIndex += 1) {
    const sample = history.samples[sampleIndex];
    const durationSeconds = (history.samples[sampleIndex + 1].timestampMs - sample.timestampMs) / 1000;
    if (sample.root.support.disposition === 'local-support') {
      const complianceConfidence = clamp01(0.5 + sample.root.support.minimumComplianceMargin);
      const rootExposure = durationSeconds * complianceConfidence * (sample.contacts ? 0.35 : 1);
      supportedRootSampleCount += 1;
      exposureSeconds += rootExposure;
      depositContact(
        values,
        previous,
        sample.root.worldPosition[0],
        sample.root.worldPosition[2],
        contactRadius * (sample.contacts ? 0.8 : 1),
        rootExposure
      );
    }
    if (!sample.contacts || !sample.locomotion) continue;
    for (const patch of sample.contacts.patches) {
      if (patch.state !== 'stance' || !patch.inBounds) continue;
      const slipConfidence = clamp01(1 - Math.abs(patch.slip) / 0.12);
      const contactExposure =
        durationSeconds *
        clamp01(sample.locomotion.traction) *
        clamp01(sample.locomotion.coupling) *
        slipConfidence;
      stanceContactCount += 1;
      exposureSeconds += contactExposure;
      if (contactExposure <= 0) continue;
      depositContact(values, previous, patch.terrainPosition[0], patch.terrainPosition[2], contactRadius, contactExposure);
    }
  }

  const nextWithoutChecksum: HillOfHillsProducerTrafficField = {
    ...previous,
    values,
    admittedHistoryChecksums: [...previous.admittedHistoryChecksums, historyChecksum],
    admittedEpisodeIds: [...previous.admittedEpisodeIds, history.episodeId],
    admittedEpisodeCount: previous.admittedEpisodeCount + 1,
    stanceContactCount: previous.stanceContactCount + stanceContactCount,
    supportedRootSampleCount: previous.supportedRootSampleCount + supportedRootSampleCount,
    exposureSeconds: previous.exposureSeconds + exposureSeconds,
    checksum: '',
    range: numericRange(values)
  };
  return {
    ...nextWithoutChecksum,
    checksum: trafficFieldChecksum(nextWithoutChecksum)
  };
}

export function sampleHillOfHillsProducerTrafficField(
  field: HillOfHillsProducerTrafficField,
  x: number,
  z: number
): number {
  validateTrafficField(field);
  const xT = clamp01((x - field.xMin) / Math.max(Number.EPSILON, field.xMax - field.xMin));
  const zT = clamp01((z - field.zMin) / Math.max(Number.EPSILON, field.zMax - field.zMin));
  const xCell = xT * (field.xCount - 1);
  const zCell = zT * (field.zCount - 1);
  const x0 = Math.floor(xCell);
  const z0 = Math.floor(zCell);
  const x1 = Math.min(field.xCount - 1, x0 + 1);
  const z1 = Math.min(field.zCount - 1, z0 + 1);
  const xBlend = xCell - x0;
  const zBlend = zCell - z0;
  const back = mix(field.values[z0 * field.xCount + x0], field.values[z0 * field.xCount + x1], xBlend);
  const forward = mix(field.values[z1 * field.xCount + x0], field.values[z1 * field.xCount + x1], xBlend);
  return mix(back, forward, zBlend);
}

export function producerContactHistoryChecksum(history: HillOfHillsProducerContactHistory): string {
  return checksum(
    JSON.stringify({
      schema: history.schema,
      episodeId: history.episodeId,
      producer: history.producer,
      hill: history.hill,
      coordinateSpace: history.coordinateSpace,
      patchIds: history.patchIds,
      samples: history.samples
    })
  );
}

function depositContact(
  values: number[],
  grid: HillOfHillsProducerTrafficGrid,
  x: number,
  z: number,
  radius: number,
  exposure: number
): void {
  const dx = (grid.xMax - grid.xMin) / (grid.xCount - 1);
  const dz = (grid.zMax - grid.zMin) / (grid.zCount - 1);
  const centerX = (x - grid.xMin) / dx;
  const centerZ = (z - grid.zMin) / dz;
  const radiusX = Math.max(1, Math.ceil((radius * 2) / dx));
  const radiusZ = Math.max(1, Math.ceil((radius * 2) / dz));
  const candidates: Array<{ index: number; weight: number }> = [];
  let weightSum = 0;
  for (
    let zi = Math.max(0, Math.floor(centerZ) - radiusZ);
    zi <= Math.min(grid.zCount - 1, Math.ceil(centerZ) + radiusZ);
    zi += 1
  ) {
    for (
      let xi = Math.max(0, Math.floor(centerX) - radiusX);
      xi <= Math.min(grid.xCount - 1, Math.ceil(centerX) + radiusX);
      xi += 1
    ) {
      const worldX = grid.xMin + xi * dx;
      const worldZ = grid.zMin + zi * dz;
      const distance = Math.hypot(worldX - x, worldZ - z);
      if (distance > radius * 2) continue;
      const weight = Math.exp(-0.5 * (distance / radius) ** 2);
      candidates.push({ index: zi * grid.xCount + xi, weight });
      weightSum += weight;
    }
  }
  for (const candidate of candidates) {
    values[candidate.index] += exposure * candidate.weight / Math.max(Number.EPSILON, weightSum);
  }
}

function validateGrid(grid: HillOfHillsProducerTrafficGrid): void {
  if (
    !Number.isInteger(grid.xCount) ||
    grid.xCount < 2 ||
    !Number.isInteger(grid.zCount) ||
    grid.zCount < 2 ||
    !Number.isFinite(grid.xMin) ||
    !Number.isFinite(grid.xMax) ||
    grid.xMax <= grid.xMin ||
    !Number.isFinite(grid.zMin) ||
    !Number.isFinite(grid.zMax) ||
    grid.zMax <= grid.zMin
  ) {
    throw new Error('producer traffic grid requires finite increasing bounds and at least two samples per axis');
  }
}

function validateTrafficField(field: HillOfHillsProducerTrafficField): void {
  if (field?.schema !== HILL_OF_HILLS_PRODUCER_TRAFFIC_FIELD_SCHEMA) {
    throw new Error(`producer traffic field schema must be ${HILL_OF_HILLS_PRODUCER_TRAFFIC_FIELD_SCHEMA}`);
  }
  validateGrid(field);
  if (field.values.length !== field.xCount * field.zCount || field.values.some((value) => !Number.isFinite(value) || value < 0)) {
    throw new Error('producer traffic field values must match its grid and remain finite and nonnegative');
  }
}

function requireVec3(value: HillOfHillsVec3, label: string): HillOfHillsVec3 {
  if (!Array.isArray(value) || value.length !== 3 || value.some((component) => !Number.isFinite(component))) {
    throw new Error(`${label} must be a finite vec3`);
  }
  return value;
}

function numericRange(values: readonly number[]): { min: number; max: number } {
  let min = Infinity;
  let max = -Infinity;
  for (const value of values) {
    min = Math.min(min, value);
    max = Math.max(max, value);
  }
  return values.length ? { min, max } : { min: 0, max: 0 };
}

function trafficFieldChecksum(field: HillOfHillsProducerTrafficField): string {
  return checksum(
    [
      field.xCount,
      field.zCount,
      field.xMin,
      field.xMax,
      field.zMin,
      field.zMax,
      field.admittedHistoryChecksums.join(','),
      ...field.values.map((value) => value.toFixed(8))
    ].join('|')
  );
}

function checksum(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function mix(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}
