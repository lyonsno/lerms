// Browser port of the admitted smooth fitted phase evaluator at Kaminos
// 6217fff858c0b12e330499baf28127f9122826f7. Contact deformation is excluded.

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface FittedRegistration {
  schema: 'kaminos.lirm-fitted-proxy-rig-registration.v0';
  sourceCandidateId: string;
  donorSha256: string;
  stationCount: number;
  manualControlCount: number;
  stations: Array<{
    t: number;
    position: Vec3;
  }>;
}

export interface CreatureRootFrame {
  schema: 'kaminos.creature-root-frame.v0';
  origin: Vec3;
  lateral: Vec3;
  normal: Vec3;
  tangent: Vec3;
}

interface CurveFrame {
  center: Vec3;
  tangent: Vec3;
  lateral: Vec3;
  normal: Vec3;
}

interface SmoothCurve {
  samples: Vec3[];
  frames: CurveFrame[];
  arcCoordinates: Float64Array;
}

export interface SmoothFittedBinding {
  schema: 'kaminos.lirm-smooth-fitted-proxy-rig-binding.v0';
  registration: FittedRegistration;
  vertexCount: number;
  sampleCount: number;
  parameterization: 'monotonic-axial-z';
  arcCoordinates: Float64Array;
  localCoordinates: Float64Array;
}

const PHASE_SEQUENCE = [
  'rest',
  'c-bend',
  'rest',
  's-bend',
  'rest',
  'asymmetric',
  'rest',
] as const;

export function normalizeExact719024Positions(
  positions: Float32Array,
  center: Vec3,
  scale: number,
): void {
  requireFitted(
    positions.length > 0 &&
      positions.length % 3 === 0 &&
      [center.x, center.y, center.z, scale].every(Number.isFinite) &&
      scale > 0,
    '719024 normalization inputs are incomplete',
  );
  for (let index = 0; index < positions.length; index += 3) {
    positions[index] = (positions[index] - center.x) * scale;
    positions[index + 1] = (positions[index + 1] - center.y) * scale;
    positions[index + 2] = (positions[index + 2] - center.z) * scale;
  }
}

export function createSmoothFittedBinding(
  positions: Float32Array,
  registration: FittedRegistration,
  sampleCount = 192,
): SmoothFittedBinding {
  validateRegistration(registration);
  requireFitted(
    positions.length > 0 && positions.length % 3 === 0,
    'smooth fitted binding requires packed positions',
  );
  const restCurve = createSmoothCurve(
    registration.stations.map(({ position }) => position),
    sampleCount,
  );
  const vertexCount = positions.length / 3;
  const arcCoordinates = new Float64Array(vertexCount);
  const localCoordinates = new Float64Array(vertexCount * 3);
  for (let vertex = 0; vertex < vertexCount; vertex += 1) {
    const point = vectorAt(positions, vertex);
    const arc = monotonicAxialArc(restCurve, point.z);
    const frame = evaluateCurveFrame(restCurve, arc);
    const residual = sub(point, frame.center);
    arcCoordinates[vertex] = arc;
    localCoordinates[vertex * 3] = dot(residual, frame.lateral);
    localCoordinates[vertex * 3 + 1] = dot(residual, frame.normal);
    localCoordinates[vertex * 3 + 2] = dot(residual, frame.tangent);
  }
  return {
    schema: 'kaminos.lirm-smooth-fitted-proxy-rig-binding.v0',
    registration,
    vertexCount,
    sampleCount,
    parameterization: 'monotonic-axial-z',
    arcCoordinates,
    localCoordinates,
  };
}

export function evaluateSmoothFittedPhase(
  binding: SmoothFittedBinding,
  phase: number,
  rootFrame: CreatureRootFrame,
  amplitude = 0.18,
): Float32Array {
  requireFitted(
    binding.schema === 'kaminos.lirm-smooth-fitted-proxy-rig-binding.v0',
    'smooth fitted phase requires an admitted binding',
  );
  validateRootFrame(rootFrame);
  const stationPositions = cycleStationPositions(
    binding.registration,
    phase,
    amplitude,
  );
  const curve = createSmoothCurve(stationPositions, binding.sampleCount);
  const output = new Float32Array(binding.vertexCount * 3);
  for (let vertex = 0; vertex < binding.vertexCount; vertex += 1) {
    const frame = evaluateCurveFrame(curve, binding.arcCoordinates[vertex]);
    const local = {
      x: binding.localCoordinates[vertex * 3],
      y: binding.localCoordinates[vertex * 3 + 1],
      z: binding.localCoordinates[vertex * 3 + 2],
    };
    const body = add(
      add(
        add(frame.center, mul(frame.lateral, local.x)),
        mul(frame.normal, local.y),
      ),
      mul(frame.tangent, local.z),
    );
    const world = transformRootPoint(rootFrame, body);
    output[vertex * 3] = world.x;
    output[vertex * 3 + 1] = world.y;
    output[vertex * 3 + 2] = world.z;
  }
  return output;
}

export function validateRootFrame(
  rootFrame: CreatureRootFrame,
): CreatureRootFrame {
  requireFitted(
    rootFrame?.schema === 'kaminos.creature-root-frame.v0',
    'smooth fitted phase requires a creature root frame',
  );
  for (const [name, vector] of Object.entries({
    origin: rootFrame.origin,
    lateral: rootFrame.lateral,
    normal: rootFrame.normal,
    tangent: rootFrame.tangent,
  })) {
    requireFitted(
      [vector?.x, vector?.y, vector?.z].every(Number.isFinite),
      `creature root frame ${name} must be finite`,
    );
  }
  for (const axis of [
    rootFrame.lateral,
    rootFrame.normal,
    rootFrame.tangent,
  ]) {
    requireFitted(
      Math.abs(length(axis) - 1) <= 1e-6,
      'creature root frame axes must be unit length',
    );
  }
  requireFitted(
    Math.abs(dot(rootFrame.lateral, rootFrame.normal)) <= 1e-6 &&
      Math.abs(dot(rootFrame.lateral, rootFrame.tangent)) <= 1e-6 &&
      Math.abs(dot(rootFrame.normal, rootFrame.tangent)) <= 1e-6 &&
      dot(cross(rootFrame.lateral, rootFrame.normal), rootFrame.tangent) >=
        1 - 1e-6,
    'creature root frame axes must be right-handed and orthonormal',
  );
  return rootFrame;
}

function validateRegistration(registration: FittedRegistration): void {
  requireFitted(
    registration?.schema ===
      'kaminos.lirm-fitted-proxy-rig-registration.v0' &&
      registration.manualControlCount === 0 &&
      registration.stationCount === registration.stations?.length &&
      registration.stationCount >= 3 &&
      registration.stations.every(({ position }) =>
        [position.x, position.y, position.z].every(Number.isFinite),
      ),
    'smooth fitted binding requires the exact automatic registration',
  );
}

function cycleStationPositions(
  registration: FittedRegistration,
  phaseInput: number,
  amplitude: number,
): Vec3[] {
  requireFitted(
    Number.isFinite(phaseInput) &&
      Number.isFinite(amplitude) &&
      amplitude >= 0 &&
      amplitude <= 0.45,
    'smooth fitted cycle phase or amplitude is invalid',
  );
  const phase = ((phaseInput % 1) + 1) % 1;
  const raw = phase * (PHASE_SEQUENCE.length - 1);
  const nearest = Math.round(raw);
  const position = Math.abs(raw - nearest) < 1e-12 ? nearest : raw;
  const segment = Math.min(
    PHASE_SEQUENCE.length - 2,
    Math.floor(position),
  );
  const mix = smoothstep(position - segment);
  const from = stationPose(registration, PHASE_SEQUENCE[segment], amplitude);
  const to = stationPose(registration, PHASE_SEQUENCE[segment + 1], amplitude);
  if (mix === 0) return from;
  if (mix === 1) return to;
  const rest = registration.stations.map(({ position: point }) => point);
  return preserveStationLengths(
    rest,
    from.map((point, index) => lerp(point, to[index], mix)),
  );
}

function stationPose(
  registration: FittedRegistration,
  preset: (typeof PHASE_SEQUENCE)[number],
  amplitude: number,
): Vec3[] {
  const rest = registration.stations.map(({ position }) => position);
  if (preset === 'rest') return rest.map((point) => ({ ...point }));
  const base = segmentFrame(rest[0], rest.at(-1)!);
  const maximumAngle = amplitude * 2;
  const segments = rest.slice(0, -1).map((point, index) => {
    const source = sub(rest[index + 1], point);
    const t =
      (registration.stations[index].t + registration.stations[index + 1].t) *
      0.5;
    const angles = proceduralAngles(preset, t, maximumAngle);
    const yawed = rotateAround(source, base.normal, angles.yaw);
    return rotateAround(yawed, base.lateral, angles.pitch);
  });
  const output = new Array<Vec3>(rest.length);
  const middle = Math.floor((rest.length - 1) / 2);
  output[middle] = { ...rest[middle] };
  for (let index = middle + 1; index < output.length; index += 1) {
    output[index] = add(output[index - 1], segments[index - 1]);
  }
  for (let index = middle - 1; index >= 0; index -= 1) {
    output[index] = sub(output[index + 1], segments[index]);
  }
  return preserveStationLengths(rest, output);
}

function proceduralAngles(
  preset: Exclude<(typeof PHASE_SEQUENCE)[number], 'rest'>,
  t: number,
  maximumAngle: number,
): { yaw: number; pitch: number } {
  if (preset === 'c-bend') {
    return { yaw: maximumAngle * (t * 2 - 1), pitch: 0 };
  }
  if (preset === 's-bend') {
    return { yaw: maximumAngle * Math.sin(Math.PI * 2 * t), pitch: 0 };
  }
  return {
    yaw:
      maximumAngle *
      (0.68 * Math.sin(Math.PI * 2 * (t - 0.11)) + 0.24 * (t * 2 - 1)),
    pitch: maximumAngle * 0.24 * Math.sin(Math.PI * t),
  };
}

function preserveStationLengths(rest: Vec3[], target: Vec3[]): Vec3[] {
  const output = target.map((point) => ({ ...point }));
  const middle = Math.floor((output.length - 1) / 2);
  for (let index = middle - 1; index >= 0; index -= 1) {
    const restLength = length(sub(rest[index], rest[index + 1]));
    let direction = sub(target[index], output[index + 1]);
    if (length(direction) < 1e-9) {
      direction = sub(rest[index], rest[index + 1]);
    }
    output[index] = add(
      output[index + 1],
      mul(normalize(direction), restLength),
    );
  }
  for (let index = middle + 1; index < output.length; index += 1) {
    const restLength = length(sub(rest[index], rest[index - 1]));
    let direction = sub(target[index], output[index - 1]);
    if (length(direction) < 1e-9) {
      direction = sub(rest[index], rest[index - 1]);
    }
    output[index] = add(
      output[index - 1],
      mul(normalize(direction), restLength),
    );
  }
  return output;
}

function createSmoothCurve(
  stationPositions: Vec3[],
  sampleCount: number,
): SmoothCurve {
  requireFitted(
    stationPositions.length >= 3 &&
      Number.isInteger(sampleCount) &&
      sampleCount >= 32 &&
      sampleCount <= 4096,
    'smooth fitted curve inputs are invalid',
  );
  const samples = Array.from({ length: sampleCount }, (_, index) => {
    if (index === sampleCount - 1) {
      return { ...stationPositions.at(-1)! };
    }
    const progress =
      (index / (sampleCount - 1)) * (stationPositions.length - 1);
    const segment = Math.min(
      stationPositions.length - 2,
      Math.floor(progress),
    );
    return catmullRom(stationPositions, segment, progress - segment);
  });
  const cumulative = new Float64Array(sampleCount);
  for (let index = 1; index < sampleCount; index += 1) {
    cumulative[index] =
      cumulative[index - 1] + length(sub(samples[index], samples[index - 1]));
  }
  const total = cumulative.at(-1)!;
  requireFitted(total > 1e-8, 'smooth fitted curve collapsed');
  const arcCoordinates = Float64Array.from(
    cumulative,
    (value) => value / total,
  );
  arcCoordinates[0] = 0;
  arcCoordinates[arcCoordinates.length - 1] = 1;
  const tangents = samples.map((_, index) =>
    normalize(
      sub(
        samples[Math.min(samples.length - 1, index + 1)],
        samples[Math.max(0, index - 1)],
      ),
    ),
  );
  const frames = new Array<CurveFrame>(sampleCount);
  frames[0] = {
    center: samples[0],
    ...orthonormalFrame(
      tangents[0],
      segmentFrame(samples[0], samples[1]).lateral,
    ),
  };
  for (let index = 1; index < sampleCount; index += 1) {
    const transported = rotateByMinimalChange(
      frames[index - 1].lateral,
      frames[index - 1].tangent,
      tangents[index],
    );
    frames[index] = {
      center: samples[index],
      ...orthonormalFrame(tangents[index], transported),
    };
  }
  return { samples, frames, arcCoordinates };
}

function evaluateCurveFrame(curve: SmoothCurve, arc: number): CurveFrame {
  const target = clamp(arc, 0, 1);
  let low = 0;
  let high = curve.arcCoordinates.length - 1;
  while (high - low > 1) {
    const middle = (low + high) >> 1;
    if (curve.arcCoordinates[middle] <= target) low = middle;
    else high = middle;
  }
  const start = curve.arcCoordinates[low];
  const end = curve.arcCoordinates[high];
  const mix = clamp((target - start) / Math.max(end - start, 1e-12), 0, 1);
  const center = lerp(curve.samples[low], curve.samples[high], mix);
  const tangent = normalize(
    lerp(curve.frames[low].tangent, curve.frames[high].tangent, mix),
  );
  const lateral = normalize(
    lerp(curve.frames[low].lateral, curve.frames[high].lateral, mix),
  );
  return { center, ...orthonormalFrame(tangent, lateral) };
}

function monotonicAxialArc(curve: SmoothCurve, axial: number): number {
  for (let index = 1; index < curve.samples.length; index += 1) {
    requireFitted(
      curve.samples[index].z <= curve.samples[index - 1].z + 1e-8,
      'smooth fitted curve is not monotonic on registered axial Z',
    );
  }
  if (axial >= curve.samples[0].z) return 0;
  if (axial <= curve.samples.at(-1)!.z) return 1;
  let low = 0;
  let high = curve.samples.length - 1;
  while (high - low > 1) {
    const middle = (low + high) >> 1;
    if (curve.samples[middle].z >= axial) low = middle;
    else high = middle;
  }
  const start = curve.samples[low].z;
  const end = curve.samples[high].z;
  const mix = clamp((start - axial) / Math.max(start - end, 1e-12), 0, 1);
  return (
    curve.arcCoordinates[low] +
    (curve.arcCoordinates[high] - curve.arcCoordinates[low]) * mix
  );
}

function catmullRom(points: Vec3[], segment: number, mix: number): Vec3 {
  const p1 = points[segment];
  const p2 = points[segment + 1];
  const p0 = segment > 0 ? points[segment - 1] : add(p1, sub(p1, p2));
  const p3 =
    segment + 2 < points.length ? points[segment + 2] : add(p2, sub(p2, p1));
  const t0 = 0;
  const t1 = knot(p0, p1, t0);
  const t2 = knot(p1, p2, t1);
  const t3 = knot(p2, p3, t2);
  const t = t1 + (t2 - t1) * mix;
  const a1 = blend(p0, p1, t0, t1, t);
  const a2 = blend(p1, p2, t1, t2, t);
  const a3 = blend(p2, p3, t2, t3, t);
  const b1 = blend(a1, a2, t0, t2, t);
  const b2 = blend(a2, a3, t1, t3, t);
  return blend(b1, b2, t1, t2, t);
}

function knot(previous: Vec3, next: Vec3, knotValue: number): number {
  return knotValue + Math.sqrt(Math.max(length(sub(next, previous)), 1e-12));
}

function blend(
  a: Vec3,
  b: Vec3,
  ta: number,
  tb: number,
  t: number,
): Vec3 {
  const span = Math.max(tb - ta, 1e-12);
  return add(mul(a, (tb - t) / span), mul(b, (t - ta) / span));
}

function orthonormalFrame(
  tangentInput: Vec3,
  lateralInput: Vec3,
): Omit<CurveFrame, 'center'> {
  const tangent = normalize(tangentInput);
  let lateral = sub(lateralInput, mul(tangent, dot(lateralInput, tangent)));
  if (length(lateral) < 1e-8) {
    lateral = segmentFrame(v3(), tangent).lateral;
  }
  lateral = normalize(lateral);
  return { tangent, lateral, normal: normalize(cross(tangent, lateral)) };
}

function segmentFrame(a: Vec3, b: Vec3): Omit<CurveFrame, 'center'> {
  const tangent = normalize(sub(b, a));
  const reference =
    Math.abs(dot(tangent, v3(0, 1, 0))) > 0.92
      ? v3(1, 0, 0)
      : v3(0, 1, 0);
  const lateral = normalize(cross(reference, tangent));
  return { tangent, lateral, normal: normalize(cross(tangent, lateral)) };
}

function rotateByMinimalChange(
  vector: Vec3,
  from: Vec3,
  to: Vec3,
): Vec3 {
  const cosine = clamp(dot(from, to), -1, 1);
  const axisVector = cross(from, to);
  const sine = length(axisVector);
  if (sine < 1e-10) {
    if (cosine > 0) return { ...vector };
    const fallback = segmentFrame(v3(), from).normal;
    return sub(mul(fallback, 2 * dot(fallback, vector)), vector);
  }
  const axis = mul(axisVector, 1 / sine);
  return add(
    add(mul(vector, cosine), mul(cross(axis, vector), sine)),
    mul(axis, dot(axis, vector) * (1 - cosine)),
  );
}

function rotateAround(vector: Vec3, axisInput: Vec3, angle: number): Vec3 {
  const axis = normalize(axisInput);
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return add(
    add(mul(vector, cosine), mul(cross(axis, vector), sine)),
    mul(axis, dot(axis, vector) * (1 - cosine)),
  );
}

function transformRootPoint(frame: CreatureRootFrame, point: Vec3): Vec3 {
  return add(
    add(
      add(frame.origin, mul(frame.lateral, point.x)),
      mul(frame.normal, point.y),
    ),
    mul(frame.tangent, point.z),
  );
}

function vectorAt(values: Float32Array, vertex: number): Vec3 {
  return v3(
    values[vertex * 3],
    values[vertex * 3 + 1],
    values[vertex * 3 + 2],
  );
}

function v3(x = 0, y = 0, z = 0): Vec3 {
  return { x, y, z };
}

function add(a: Vec3, b: Vec3): Vec3 {
  return v3(a.x + b.x, a.y + b.y, a.z + b.z);
}

function sub(a: Vec3, b: Vec3): Vec3 {
  return v3(a.x - b.x, a.y - b.y, a.z - b.z);
}

function mul(vector: Vec3, scalar: number): Vec3 {
  return v3(vector.x * scalar, vector.y * scalar, vector.z * scalar);
}

function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return v3(
    a.y * b.z - a.z * b.y,
    a.z * b.x - a.x * b.z,
    a.x * b.y - a.y * b.x,
  );
}

function length(vector: Vec3): number {
  return Math.hypot(vector.x, vector.y, vector.z);
}

function normalize(vector: Vec3): Vec3 {
  const magnitude = Math.max(length(vector), 1e-12);
  return mul(vector, 1 / magnitude);
}

function lerp(a: Vec3, b: Vec3, amount: number): Vec3 {
  return add(a, mul(sub(b, a), amount));
}

function smoothstep(value: number): number {
  const exact = clamp(value, 0, 1);
  return exact * exact * (3 - 2 * exact);
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function requireFitted(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
