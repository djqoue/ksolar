"use client";

import { fromArrayBuffer } from "geotiff";
import type {
  GoogleSolarDataLayerPaths,
  SolarAnnualFluxOverlay,
  SolarDataLayerAnalysis,
  SolarMonthlyFluxSummary,
  SolarHourlyShadeSummary,
  SolarRasterBounds,
} from "@/types/solar";

type NumericRaster = ArrayLike<number>;

interface RasterStack {
  bands: NumericRaster[];
  bounds: SolarRasterBounds;
  width: number;
  height: number;
}

const rasterCache = new Map<string, Promise<RasterStack>>();

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

function normalizeShadeValue(value: number, maxValue: number) {
  if (maxValue <= 1) {
    return clamp(value, 0, 1);
  }

  if (maxValue <= 100) {
    return clamp(value / 100, 0, 1);
  }

  return clamp(value / 255, 0, 1);
}

async function fetchRasterStack(url: string): Promise<RasterStack> {
  const existing = rasterCache.get(url);
  if (existing) {
    return existing;
  }

  const promise = (async () => {
    const response = await fetch(url, { cache: "force-cache" });
    if (!response.ok) {
      throw new Error(`Failed to fetch raster: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const tiff = await fromArrayBuffer(arrayBuffer);
    const imageCount = await tiff.getImageCount();
    const firstImage = await tiff.getImage(0);
    const [west, south, east, north] = firstImage.getBoundingBox();
    const bounds: SolarRasterBounds = { west, south, east, north };
    const width = firstImage.getWidth();
    const height = firstImage.getHeight();
    const bands: NumericRaster[] = [];

    if (imageCount > 1) {
      for (let index = 0; index < imageCount; index += 1) {
        const image = await tiff.getImage(index);
        const rasters = await image.readRasters({ interleave: false });
        if (Array.isArray(rasters) && rasters[0]) {
          bands.push(rasters[0]);
        }
      }
    } else {
      const rasters = await firstImage.readRasters({ interleave: false });
      if (Array.isArray(rasters)) {
        bands.push(...rasters);
      } else {
        bands.push(rasters);
      }
    }

    return {
      bands,
      bounds,
      width,
      height,
    };
  })();

  rasterCache.set(url, promise);
  return promise;
}

function buildAnnualFluxOverlay(
  width: number,
  height: number,
  annualFluxBand: NumericRaster,
  maskBand: NumericRaster,
  bounds: SolarRasterBounds,
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
    if (!Number.isFinite(value)) {
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

    const normalized = (Number(annualFluxBand[index]) - minFlux) / fluxRange;
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
  };
}

function computeMaskedBandMeans(
  bands: NumericRaster[],
  maskBand: NumericRaster,
): number[] {
  return bands.map((band) => {
    const pixelCount = Math.min(band.length, maskBand.length);
    let total = 0;
    let count = 0;

    for (let index = 0; index < pixelCount; index += 1) {
      if (Number(maskBand[index]) <= 0) {
        continue;
      }

      const value = Number(band[index]);
      if (!Number.isFinite(value)) {
        continue;
      }

      total += value;
      count += 1;
    }

    return count > 0 ? total / count : 0;
  });
}

async function buildMonthlyFluxSummary(
  monthlyFluxPath: string,
  maskPath: string,
): Promise<SolarMonthlyFluxSummary | null> {
  const [monthlyFlux, mask] = await Promise.all([
    fetchRasterStack(monthlyFluxPath),
    fetchRasterStack(maskPath),
  ]);

  if (monthlyFlux.bands.length === 0 || mask.bands.length === 0) {
    return null;
  }

  return {
    monthlyFluxMeans: computeMaskedBandMeans(
      monthlyFlux.bands.slice(0, 12),
      mask.bands[0],
    ),
  };
}

async function buildHourlyShadeSummary(
  hourlyShadePaths: string[],
  maskPath: string,
): Promise<SolarHourlyShadeSummary | null> {
  if (hourlyShadePaths.length === 0) {
    return null;
  }

  const mask = await fetchRasterStack(maskPath);
  if (mask.bands.length === 0) {
    return null;
  }

  const monthlySunAccessRatio = await Promise.all(
    hourlyShadePaths.slice(0, 12).map(async (path) => {
      const hourlyShade = await fetchRasterStack(path);
      if (hourlyShade.bands.length === 0) {
        return 0;
      }

      const bandMeans = computeMaskedBandMeans(hourlyShade.bands, mask.bands[0]);
      const maxValue = Math.max(...bandMeans, 1);
      const normalized = bandMeans.map((value) => normalizeShadeValue(value, maxValue));
      const daylightBandMeans = normalized.filter((value) => value > 0);

      if (daylightBandMeans.length === 0) {
        return 0;
      }

      const strongestHours = [...daylightBandMeans]
        .sort((left, right) => right - left)
        .slice(0, Math.min(6, daylightBandMeans.length));

      return strongestHours.reduce((sum, value) => sum + value, 0) / strongestHours.length;
    }),
  );

  return {
    monthlySunAccessRatio,
  };
}

export async function buildSolarDataLayerAnalysis(
  dataLayers: GoogleSolarDataLayerPaths,
): Promise<SolarDataLayerAnalysis> {
  if (!dataLayers.annualFluxPath || !dataLayers.maskPath) {
    return {
      annualFluxOverlay: null,
      monthlyFlux: null,
      hourlyShade: null,
    };
  }

  const [annualFlux, mask, monthlyFlux, hourlyShade] = await Promise.all([
    fetchRasterStack(dataLayers.annualFluxPath),
    fetchRasterStack(dataLayers.maskPath),
    dataLayers.monthlyFluxPath
      ? buildMonthlyFluxSummary(dataLayers.monthlyFluxPath, dataLayers.maskPath)
      : Promise.resolve(null),
    dataLayers.hourlyShadePaths.length > 0
      ? buildHourlyShadeSummary(dataLayers.hourlyShadePaths, dataLayers.maskPath)
      : Promise.resolve(null),
  ]);

  return {
    annualFluxOverlay:
      annualFlux.bands[0] && mask.bands[0]
        ? buildAnnualFluxOverlay(
            annualFlux.width,
            annualFlux.height,
            annualFlux.bands[0],
            mask.bands[0],
            annualFlux.bounds,
          )
        : null,
    monthlyFlux,
    hourlyShade,
  };
}
