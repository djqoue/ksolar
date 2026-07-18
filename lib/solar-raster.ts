"use client";

import { fromArrayBuffer } from "geotiff";
import {
  convertUtmBoundsToLatLng,
  getUtmCrsFromEpsg,
  looksLikeLatLngBounds,
} from "@/lib/geo/utm";
import type { RoofShape } from "@/types/quote";
import type {
  GoogleSolarDataLayerPaths,
  SolarAnnualFluxOverlay,
  SolarDataLayerAnalysis,
  SolarMonthlyFluxSummary,
  SolarHourlyShadeSummary,
  SolarRasterBounds,
} from "@/types/solar";

type NumericRaster = ArrayLike<number>;

export interface RasterStack {
  bands: NumericRaster[];
  bounds: SolarRasterBounds;
  width: number;
  height: number;
  noDataValues: Array<number | null>;
}

const rasterCache = new Map<string, Promise<RasterStack>>();
const MAX_RASTER_CACHE_ENTRIES = 24;
const GOOGLE_SOLAR_NODATA = -9999;
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getFluxColor(normalized: number) {
  const ratio = clamp(normalized, 0, 1);
  const r = Math.round(30 + ratio * 225);
  const g = Math.round(92 + ratio * 135);
  const b = Math.round(140 - ratio * 110);

  return { r, g, b };
}

export function isValidSolarRasterValue(
  value: number,
  noDataValue: number | null = null,
) {
  return (
    Number.isFinite(value) &&
    value !== GOOGLE_SOLAR_NODATA &&
    (noDataValue === null || value !== noDataValue)
  );
}

function isPointInsidePath(
  latitude: number,
  longitude: number,
  path: Array<{ lat: number; lng: number }>,
) {
  if (path.length < 3) {
    return false;
  }

  let inside = false;

  for (let i = 0, j = path.length - 1; i < path.length; j = i++) {
    const xi = path[i].lng;
    const yi = path[i].lat;
    const xj = path[j].lng;
    const yj = path[j].lat;

    const intersects =
      yi > latitude !== yj > latitude &&
      longitude <
        ((xj - xi) * (latitude - yi)) / ((yj - yi) || Number.EPSILON) + xi;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

function getPixelCenter(
  raster: Pick<RasterStack, "bounds" | "width" | "height">,
  row: number,
  column: number,
) {
  const latSpan = raster.bounds.north - raster.bounds.south;
  const lngSpan = raster.bounds.east - raster.bounds.west;

  return {
    latitude: raster.bounds.north - ((row + 0.5) / raster.height) * latSpan,
    longitude: raster.bounds.west + ((column + 0.5) / raster.width) * lngSpan,
  };
}

function getRasterIndexAtPoint(
  raster: Pick<RasterStack, "bounds" | "width" | "height">,
  point: { latitude: number; longitude: number },
) {
  const latSpan = raster.bounds.north - raster.bounds.south;
  const lngSpan = raster.bounds.east - raster.bounds.west;
  if (latSpan <= 0 || lngSpan <= 0) {
    return null;
  }

  if (
    point.latitude > raster.bounds.north ||
    point.latitude < raster.bounds.south ||
    point.longitude < raster.bounds.west ||
    point.longitude > raster.bounds.east
  ) {
    return null;
  }

  const row = Math.floor(
    ((raster.bounds.north - point.latitude) / latSpan) * raster.height,
  );
  const column = Math.floor(
    ((point.longitude - raster.bounds.west) / lngSpan) * raster.width,
  );

  if (row < 0 || row >= raster.height || column < 0 || column >= raster.width) {
    return null;
  }

  return row * raster.width + column;
}

export function buildAlignedEffectiveMask(
  target: Pick<RasterStack, "bounds" | "width" | "height">,
  buildingMask: RasterStack,
  selectionShapes: RoofShape[],
) {
  const rawMaskBand = buildingMask.bands[0];
  if (!rawMaskBand) {
    return null;
  }

  const effectiveMask = new Uint8Array(target.width * target.height);
  const geospatialShapes = selectionShapes.filter((shape) => shape.path.length > 0);
  const hasSelection = geospatialShapes.length > 0;
  let includedPixelCount = 0;

  for (let row = 0; row < target.height; row += 1) {
    for (let column = 0; column < target.width; column += 1) {
      const index = row * target.width + column;
      const point = getPixelCenter(target, row, column);
      const maskIndex = getRasterIndexAtPoint(buildingMask, point);
      const inBuildingMask =
        maskIndex !== null && Number(rawMaskBand[maskIndex]) > 0;

      if (!inBuildingMask) {
        continue;
      }

      if (
        hasSelection &&
        !geospatialShapes.some((shape) =>
          isPointInsidePath(point.latitude, point.longitude, shape.path),
        )
      ) {
        continue;
      }

      effectiveMask[index] = 1;
      includedPixelCount += 1;
    }
  }

  if (includedPixelCount === 0) {
    return null;
  }

  return {
    band: effectiveMask,
    source: hasSelection ? ("selected-roof" as const) : ("google-building" as const),
  };
}

async function fetchRasterStack(url: string): Promise<RasterStack> {
  const existing = rasterCache.get(url);
  if (existing) {
    return existing;
  }

  const promise = (async () => {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Failed to fetch raster: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const tiff = await fromArrayBuffer(arrayBuffer);
    const imageCount = await tiff.getImageCount();
    const firstImage = await tiff.getImage(0);
    const [west, south, east, north] = firstImage.getBoundingBox();
    const rawBounds: SolarRasterBounds = { west, south, east, north };
    const projectedCrs = firstImage.getGeoKeys?.()?.ProjectedCSTypeGeoKey;
    const utmCrs = getUtmCrsFromEpsg(projectedCrs);
    const bounds = looksLikeLatLngBounds(rawBounds)
      ? rawBounds
      : utmCrs
        ? convertUtmBoundsToLatLng(rawBounds, utmCrs)
        : null;
    if (!bounds) {
      throw new Error(
        `Unsupported Solar GeoTIFF coordinate reference system${projectedCrs ? `: EPSG ${projectedCrs}` : ""}.`,
      );
    }

    const width = firstImage.getWidth();
    const height = firstImage.getHeight();
    const bands: NumericRaster[] = [];
    const noDataValues: Array<number | null> = [];

    if (imageCount > 1) {
      for (let index = 0; index < imageCount; index += 1) {
        const image = await tiff.getImage(index);
        const rasters = await image.readRasters({ interleave: false });
        if (Array.isArray(rasters) && rasters[0]) {
          bands.push(rasters[0]);
          noDataValues.push(image.getGDALNoData());
        }
      }
    } else {
      const rasters = await firstImage.readRasters({ interleave: false });
      if (Array.isArray(rasters)) {
        bands.push(...rasters);
        for (let index = 0; index < rasters.length; index += 1) {
          noDataValues.push(firstImage.getGDALNoData());
        }
      } else {
        bands.push(rasters);
        noDataValues.push(firstImage.getGDALNoData());
      }
    }

    return {
      bands,
      bounds,
      width,
      height,
      noDataValues,
    };
  })();

  if (rasterCache.size >= MAX_RASTER_CACHE_ENTRIES) {
    const oldestKey = rasterCache.keys().next().value as string | undefined;
    if (oldestKey) {
      rasterCache.delete(oldestKey);
    }
  }

  rasterCache.set(url, promise);
  void promise.catch(() => {
    if (rasterCache.get(url) === promise) {
      rasterCache.delete(url);
    }
  });
  return promise;
}

function buildAnnualFluxOverlay(
  width: number,
  height: number,
  annualFluxBand: NumericRaster,
  maskBand: NumericRaster,
  bounds: SolarRasterBounds,
  maskSource: SolarAnnualFluxOverlay["maskSource"],
  noDataValue: number | null,
): SolarAnnualFluxOverlay | null {
  const pixelCount = Math.min(annualFluxBand.length, maskBand.length);
  if (pixelCount === 0) {
    return null;
  }

  let minFlux = Number.POSITIVE_INFINITY;
  let maxFlux = Number.NEGATIVE_INFINITY;
  let totalFlux = 0;
  let roofPixelCount = 0;

  for (let index = 0; index < pixelCount; index += 1) {
    if (Number(maskBand[index]) <= 0) {
      continue;
    }

    const value = Number(annualFluxBand[index]);
    if (!isValidSolarRasterValue(value, noDataValue)) {
      continue;
    }

    minFlux = Math.min(minFlux, value);
    maxFlux = Math.max(maxFlux, value);
    totalFlux += value;
    roofPixelCount += 1;
  }

  if (roofPixelCount === 0 || !Number.isFinite(minFlux) || !Number.isFinite(maxFlux)) {
    return null;
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");

  if (!context) {
    return null;
  }

  const imageData = context.createImageData(width, height);
  const fluxRange = Math.max(maxFlux - minFlux, 1);

  for (let index = 0; index < pixelCount; index += 1) {
    const dataIndex = index * 4;
    if (Number(maskBand[index]) <= 0) {
      imageData.data[dataIndex + 3] = 0;
      continue;
    }

    const value = Number(annualFluxBand[index]);
    if (!isValidSolarRasterValue(value, noDataValue)) {
      imageData.data[dataIndex + 3] = 0;
      continue;
    }

    const normalized = (value - minFlux) / fluxRange;
    const color = getFluxColor(normalized);
    imageData.data[dataIndex] = color.r;
    imageData.data[dataIndex + 1] = color.g;
    imageData.data[dataIndex + 2] = color.b;
    imageData.data[dataIndex + 3] = 176;
  }

  context.putImageData(imageData, 0, 0);

  return {
    dataUrl: canvas.toDataURL("image/png"),
    bounds,
    minFlux,
    maxFlux,
    meanFlux: totalFlux / roofPixelCount,
    roofPixelCount,
    maskSource,
  };
}

function computeMaskedBandMeans(
  bands: NumericRaster[],
  maskBand: NumericRaster,
  noDataValues: Array<number | null>,
): number[] | null {
  const means = bands.map((band, bandIndex) => {
    const pixelCount = Math.min(band.length, maskBand.length);
    let total = 0;
    let count = 0;

    for (let index = 0; index < pixelCount; index += 1) {
      if (Number(maskBand[index]) <= 0) {
        continue;
      }

      const value = Number(band[index]);
      if (!isValidSolarRasterValue(value, noDataValues[bandIndex] ?? null)) {
        continue;
      }

      total += value;
      count += 1;
    }

    return count > 0 ? total / count : null;
  });

  return means.every((value): value is number => value !== null) ? means : null;
}

async function buildMonthlyFluxSummary(
  monthlyFluxPath: string,
  maskPath: string,
  selectionShapes: RoofShape[],
): Promise<SolarMonthlyFluxSummary | null> {
  const [monthlyFlux, mask] = await Promise.all([
    fetchRasterStack(monthlyFluxPath),
    fetchRasterStack(maskPath),
  ]);

  if (monthlyFlux.bands.length === 0 || mask.bands.length === 0) {
    return null;
  }

  if (monthlyFlux.bands.length < 12) {
    return null;
  }

  const alignedMask = buildAlignedEffectiveMask(monthlyFlux, mask, selectionShapes);
  if (!alignedMask) {
    return null;
  }

  const monthlyFluxMeans = computeMaskedBandMeans(
    monthlyFlux.bands.slice(0, 12),
    alignedMask.band,
    monthlyFlux.noDataValues.slice(0, 12),
  );
  if (!monthlyFluxMeans) {
    return null;
  }

  return {
    monthlyFluxMeans,
  };
}

export function decodeHourlyShadeDay(
  value: number,
  dayIndex: number,
  noDataValue: number | null = null,
): boolean | null {
  if (
    !Number.isInteger(dayIndex) ||
    dayIndex < 0 ||
    dayIndex > 30 ||
    !isValidSolarRasterValue(value, noDataValue) ||
    value < 0
  ) {
    return null;
  }

  const encoded = Math.trunc(value) >>> 0;
  if ((encoded & 0x80000000) !== 0) {
    return null;
  }

  return (encoded & (1 << dayIndex)) !== 0;
}

function countSetBits(value: number) {
  let remaining = value >>> 0;
  let count = 0;

  while (remaining !== 0) {
    remaining = (remaining & (remaining - 1)) >>> 0;
    count += 1;
  }

  return count;
}

export function computeHourlySunAccessForMonth(
  bands: NumericRaster[],
  maskBand: NumericRaster,
  daysInMonth: number,
  noDataValues: Array<number | null> = [],
) {
  if (
    bands.length < 24 ||
    !Number.isInteger(daysInMonth) ||
    daysInMonth < 1 ||
    daysInMonth > 31
  ) {
    return null;
  }

  const validDayMask =
    daysInMonth === 31 ? 0x7fffffff : ((2 ** daysInMonth - 1) >>> 0);
  let sunnyObservationCount = 0;
  let validObservationCount = 0;

  for (let hour = 0; hour < 24; hour += 1) {
    const band = bands[hour];
    const pixelCount = Math.min(band.length, maskBand.length);
    const noDataValue = noDataValues[hour] ?? null;

    for (let index = 0; index < pixelCount; index += 1) {
      if (Number(maskBand[index]) <= 0) {
        continue;
      }

      const value = Number(band[index]);
      if (!isValidSolarRasterValue(value, noDataValue) || value < 0) {
        continue;
      }

      const encoded = Math.trunc(value) >>> 0;
      if ((encoded & 0x80000000) !== 0) {
        continue;
      }

      sunnyObservationCount += countSetBits(encoded & validDayMask);
      validObservationCount += daysInMonth;
    }
  }

  if (validObservationCount === 0) {
    return null;
  }

  return {
    ratio: sunnyObservationCount / validObservationCount,
    sunnyObservationCount,
    validObservationCount,
  };
}

async function buildHourlyShadeSummary(
  hourlyShadePaths: string[],
  maskPath: string,
  selectionShapes: RoofShape[],
): Promise<SolarHourlyShadeSummary | null> {
  if (hourlyShadePaths.length !== 12) {
    return null;
  }

  const mask = await fetchRasterStack(maskPath);
  if (mask.bands.length === 0) {
    return null;
  }

  const monthlyComputations = await Promise.all(
    hourlyShadePaths.map(async (path, monthIndex) => {
      const hourlyShade = await fetchRasterStack(path);
      if (hourlyShade.bands.length < 24) {
        return null;
      }

      const alignedMask = buildAlignedEffectiveMask(hourlyShade, mask, selectionShapes);
      if (!alignedMask) {
        return null;
      }

      return computeHourlySunAccessForMonth(
        hourlyShade.bands.slice(0, 24),
        alignedMask.band,
        DAYS_IN_MONTH[monthIndex],
        hourlyShade.noDataValues.slice(0, 24),
      );
    }),
  );

  if (monthlyComputations.some((value) => value === null)) {
    return null;
  }

  const validComputations = monthlyComputations.filter(
    (value): value is NonNullable<typeof value> => value !== null,
  );

  return {
    monthlySunAccessRatio: validComputations.map((value) => value.ratio),
    monthlySunnyObservationCount: validComputations.map(
      (value) => value.sunnyObservationCount,
    ),
    monthlyValidObservationCount: validComputations.map(
      (value) => value.validObservationCount,
    ),
    metricDefinition:
      "fraction-of-valid-selected-roof-pixel-day-hours-with-direct-sun",
  };
}

export async function buildSolarDataLayerAnalysis(
  dataLayers: GoogleSolarDataLayerPaths,
  selectionShapes: RoofShape[],
): Promise<SolarDataLayerAnalysis> {
  if (!dataLayers.maskPath) {
    return {
      annualFluxOverlay: null,
      monthlyFlux: null,
      hourlyShade: null,
    };
  }

  const [mask, annualFlux, monthlyFlux, hourlyShade] = await Promise.all([
    fetchRasterStack(dataLayers.maskPath),
    dataLayers.annualFluxPath
      ? fetchRasterStack(dataLayers.annualFluxPath)
      : Promise.resolve(null),
    dataLayers.monthlyFluxPath
      ? buildMonthlyFluxSummary(
          dataLayers.monthlyFluxPath,
          dataLayers.maskPath,
          selectionShapes,
        )
      : Promise.resolve(null),
    dataLayers.hourlyShadePaths.length > 0
      ? buildHourlyShadeSummary(
          dataLayers.hourlyShadePaths,
          dataLayers.maskPath,
          selectionShapes,
        )
      : Promise.resolve(null),
  ]);

  const overlayMask = annualFlux
    ? buildAlignedEffectiveMask(annualFlux, mask, selectionShapes)
    : null;

  return {
    annualFluxOverlay:
      annualFlux?.bands[0] && overlayMask
        ? buildAnnualFluxOverlay(
            annualFlux.width,
            annualFlux.height,
            annualFlux.bands[0],
            overlayMask.band,
            annualFlux.bounds,
            overlayMask.source,
            annualFlux.noDataValues[0] ?? null,
          )
        : null,
    monthlyFlux,
    hourlyShade,
  };
}
