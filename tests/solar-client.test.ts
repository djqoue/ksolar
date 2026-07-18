import { afterEach, describe, expect, it, vi } from "vitest";
import {
  requestSolarDataLayers,
  requestSolarInsights,
  SolarApiError,
} from "@/lib/solar-client";
import type { GoogleSolarDataLayerPaths, GoogleSolarSummary } from "@/types/solar";

const point = { latitude: 13.7563, longitude: 100.5018 };

const insightPayload = {
  buildingId: "buildings/test",
  center: point,
  imageryQuality: "BASE",
  maxArrayPanelsCount: 0,
  maxArrayAreaMeters2: 0,
  maxSunshineHoursPerYear: 0,
  panelCapacityWatts: 0,
  panelHeightMeters: 0,
  panelWidthMeters: 0,
  availableConfigs: [],
  financialAnalyses: [],
  roofSegments: [],
  solarPanels: [],
} satisfies GoogleSolarSummary;

const dataLayerPayload = {
  center: point,
  radiusMeters: 70,
  imageryQuality: "BASE",
  hourlyShadePaths: [],
} satisfies GoogleSolarDataLayerPaths;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Google Solar browser requests", () => {
  it("deduplicates only simultaneous insights requests", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      new Response(JSON.stringify(insightPayload), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const [first, second] = await Promise.all([
      requestSolarInsights(point),
      requestSolarInsights(point),
    ]);

    expect(first).toEqual(insightPayload);
    expect(second).toEqual(insightPayload);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("requiredQuality=BASE");
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("exactQualityRequired=false");

    await requestSolarInsights(point);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not persist expiring data-layer URLs between completed requests", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      new Response(JSON.stringify(dataLayerPayload), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await requestSolarDataLayers(point);
    await requestSolarDataLayers(point);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("requiredQuality=BASE");
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("exactQualityRequired=false");
  });

  it("never substitutes a previous response for a quota failure", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(insightPayload), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: "Rate limit reached",
            code: "quota_exceeded",
            quotaExceeded: true,
          }),
          { status: 429 },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    await requestSolarInsights(point);

    await expect(requestSolarInsights(point)).rejects.toBeInstanceOf(SolarApiError);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
