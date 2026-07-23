export type HillPreviewRgb = readonly [number, number, number];

export interface HillTerrainCellColorPatch {
  u0: number;
  v0: number;
  u1: number;
  v1: number;
  color: HillPreviewRgb;
}

export interface HillNeutralGeometryShadeInput {
  height: number;
  heightRange: {
    min: number;
    max: number;
  };
  normal: readonly [number, number, number];
}

const MATERIAL_INTERPOLATION_CONTRAST_THRESHOLD = 0.11;

export function hillTerrainCellColorPatches(
  corners: readonly [HillPreviewRgb, HillPreviewRgb, HillPreviewRgb, HillPreviewRgb]
): readonly HillTerrainCellColorPatch[] {
  const subdivisions =
    hillTerrainCellColorContrast(corners) >= MATERIAL_INTERPOLATION_CONTRAST_THRESHOLD ? 2 : 1;
  const patches: HillTerrainCellColorPatch[] = [];

  for (let vi = 0; vi < subdivisions; vi += 1) {
    const v0 = vi / subdivisions;
    const v1 = (vi + 1) / subdivisions;
    for (let ui = 0; ui < subdivisions; ui += 1) {
      const u0 = ui / subdivisions;
      const u1 = (ui + 1) / subdivisions;
      patches.push({
        u0,
        v0,
        u1,
        v1,
        color: bilinearHillPreviewColor(corners, (u0 + u1) * 0.5, (v0 + v1) * 0.5)
      });
    }
  }

  return patches;
}

export function bilinearHillPreviewColor(
  corners: readonly [HillPreviewRgb, HillPreviewRgb, HillPreviewRgb, HillPreviewRgb],
  u: number,
  v: number
): HillPreviewRgb {
  return [
    bilinear(corners[0][0], corners[1][0], corners[2][0], corners[3][0], u, v),
    bilinear(corners[0][1], corners[1][1], corners[2][1], corners[3][1], u, v),
    bilinear(corners[0][2], corners[1][2], corners[2][2], corners[3][2], u, v)
  ];
}

export function neutralHillGeometryColor(input: HillNeutralGeometryShadeInput): HillPreviewRgb {
  const heightMix = clamp(
    (input.height - input.heightRange.min) / Math.max(0.001, input.heightRange.max - input.heightRange.min),
    0,
    1
  );
  const sideLight = input.normal[0] * -0.32 + input.normal[1] * 0.72 + input.normal[2] * -0.2;
  const light = clamp(0.58 + sideLight * 0.34 + heightMix * 0.18, 0.34, 1.16);
  const base: HillPreviewRgb = [126, 139, 128];
  const lift = 10 + heightMix * 22;
  return [
    Math.round(clamp(base[0] * light + lift, 0, 245)),
    Math.round(clamp(base[1] * light + lift, 0, 245)),
    Math.round(clamp(base[2] * light + lift, 0, 245))
  ];
}

export function bilinearHillPreviewPoint(
  corners: readonly [
    { x: number; y: number },
    { x: number; y: number },
    { x: number; y: number },
    { x: number; y: number }
  ],
  u: number,
  v: number
): { x: number; y: number } {
  return {
    x: bilinear(corners[0].x, corners[1].x, corners[2].x, corners[3].x, u, v),
    y: bilinear(corners[0].y, corners[1].y, corners[2].y, corners[3].y, u, v)
  };
}

function hillTerrainCellColorContrast(
  corners: readonly [HillPreviewRgb, HillPreviewRgb, HillPreviewRgb, HillPreviewRgb]
): number {
  let strongest = 0;
  for (let a = 0; a < corners.length; a += 1) {
    for (let b = a + 1; b < corners.length; b += 1) {
      strongest = Math.max(
        strongest,
        Math.hypot(
          corners[a][0] - corners[b][0],
          corners[a][1] - corners[b][1],
          corners[a][2] - corners[b][2]
        ) / 441.6729559300637
      );
    }
  }
  return strongest;
}

function bilinear(a: number, b: number, c: number, d: number, u: number, v: number): number {
  const top = a * (1 - u) + b * u;
  const bottom = d * (1 - u) + c * u;
  return top * (1 - v) + bottom * v;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
