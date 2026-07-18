import { describe, expect, it } from "vitest";
import {
  buildAlignedEffectiveMask,
  computeHourlySunAccessForMonth,
  decodeHourlyShadeDay,
  isValidSolarRasterValue,
  type RasterStack,
} from "@/lib/solar-raster";

function buildRaster(input: Partial<RasterStack> = {}): RasterStack {
  return {
    bands: [new Uint8Array([1])],
    bounds: { north: 1, south: 0, east: 1, west: 0 },
    width: 1,
    height: 1,
    noDataValues: [null],
    ...input,
  };
}

describe("Google Solar GeoTIFF helpers", () => {
  it("excludes the documented -9999 sentinel and GDAL nodata values", () => {
    expect(isValidSolarRasterValue(1200)).toBe(true);
    expect(isValidSolarRasterValue(0)).toBe(true);
    expect(isValidSolarRasterValue(-9999)).toBe(false);
    expect(isValidSolarRasterValue(65535, 65535)).toBe(false);
    expect(isValidSolarRasterValue(Number.NaN)).toBe(false);
  });

  it("decodes hourly shade values as day bitmaps", () => {
    const encoded = (1 << 0) | (1 << 21) | (1 << 30);

    expect(decodeHourlyShadeDay(encoded, 0)).toBe(true);
    expect(decodeHourlyShadeDay(encoded, 1)).toBe(false);
    expect(decodeHourlyShadeDay(encoded, 21)).toBe(true);
    expect(decodeHourlyShadeDay(encoded, 30)).toBe(true);
    expect(decodeHourlyShadeDay(-9999, 0)).toBeNull();
    expect(decodeHourlyShadeDay(0x80000000, 0)).toBeNull();
  });

  it("computes a monthly ratio from all valid pixel-day-hour observations", () => {
    const allFebruaryDays = 2 ** 28 - 1;
    const bands = Array.from({ length: 24 }, (_, hour) =>
      new Int32Array([hour < 12 ? allFebruaryDays : 0, -9999]),
    );

    const result = computeHourlySunAccessForMonth(
      bands,
      new Uint8Array([1, 1]),
      28,
    );

    expect(result).not.toBeNull();
    expect(result?.ratio).toBe(0.5);
    expect(result?.sunnyObservationCount).toBe(12 * 28);
    expect(result?.validObservationCount).toBe(24 * 28);
  });

  it("fails closed when no hourly observation is valid", () => {
    const bands = Array.from(
      { length: 24 },
      () => new Int32Array([-9999]),
    );

    expect(
      computeHourlySunAccessForMonth(bands, new Uint8Array([1]), 31),
    ).toBeNull();
  });

  it("aligns a lower-resolution target to the building mask by coordinates", () => {
    const target = buildRaster({
      bounds: { north: 2, south: 0, east: 2, west: 0 },
      width: 2,
      height: 2,
    });
    const rawMask = new Uint8Array(16);
    rawMask[5] = 1;
    const buildingMask = buildRaster({
      bands: [rawMask],
      bounds: { north: 2, south: 0, east: 2, west: 0 },
      width: 4,
      height: 4,
    });

    const aligned = buildAlignedEffectiveMask(target, buildingMask, []);

    expect(aligned?.source).toBe("google-building");
    expect(Array.from(aligned?.band ?? [])).toEqual([1, 0, 0, 0]);
  });

  it("fails closed when target and mask bounds do not overlap", () => {
    const target = buildRaster({
      bounds: { north: 3, south: 2, east: 3, west: 2 },
    });
    const buildingMask = buildRaster();

    expect(buildAlignedEffectiveMask(target, buildingMask, [])).toBeNull();
  });
});
