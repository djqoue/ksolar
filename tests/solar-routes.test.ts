import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/server/api-auth", () => ({
  requireAuthenticatedApiUser: vi.fn(async () => null),
}));

vi.mock("@/lib/config/runtime-fallbacks", () => ({
  RUNTIME_FALLBACKS: { googleSolarApiKey: null },
}));

import { GET as getBuildingInsights } from "@/app/api/solar/building-insights/route";
import { GET as getDataLayers } from "@/app/api/solar/data-layers/route";

beforeEach(() => {
  process.env.GOOGLE_SOLAR_API_KEY = "test-server-key";
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.GOOGLE_SOLAR_API_KEY;
});

describe("Google Solar server routes", () => {
  it("requests the best available imagery in one BASE-minimum building call", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      new Response(
        JSON.stringify({
          name: "buildings/test-place-id",
          center: { latitude: 13.7563, longitude: 100.5018 },
          imageryQuality: "BASE",
          imageryDate: { year: 2026, month: 2, day: 3 },
          imageryProcessedDate: { year: 2026, month: 3, day: 4 },
          solarPotential: {
            maxArrayPanelsCount: 10,
            maxArrayAreaMeters2: 20,
            panelCapacityWatts: 400,
            panelHeightMeters: 2,
            panelWidthMeters: 1,
            wholeRoofStats: {
              areaMeters2: 40,
              groundAreaMeters2: 38,
              sunshineQuantiles: [1, 2, 3],
            },
            buildingStats: {
              areaMeters2: 45,
              groundAreaMeters2: 42,
              sunshineQuantiles: [4, 5, 6],
            },
            roofSegmentStats: [
              {
                pitchDegrees: 10,
                azimuthDegrees: 180,
                planeHeightAtCenterMeters: 12,
                stats: {
                  areaMeters2: 40,
                  groundAreaMeters2: 38,
                  sunshineQuantiles: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
                },
              },
            ],
            solarPanelConfigs: [
              { panelsCount: 4, yearlyEnergyDcKwh: 2000 },
              { panelsCount: 10, yearlyEnergyDcKwh: 5000 },
            ],
            financialAnalyses: [
              { monthlyBill: { units: "1000" }, panelConfigIndex: 0 },
              {
                monthlyBill: { units: "2000" },
                defaultBill: true,
                averageKwhPerMonth: 350,
                panelConfigIndex: 1,
              },
            ],
          },
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await getBuildingInsights(
      new NextRequest(
        "http://localhost/api/solar/building-insights?latitude=13.7563&longitude=100.5018",
      ),
    );
    const payload = await response.json();
    const providerUrl = new URL(String(fetchMock.mock.calls[0]?.[0]));

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(providerUrl.searchParams.get("requiredQuality")).toBe("BASE");
    expect(providerUrl.searchParams.get("exactQualityRequired")).toBe("false");
    expect(payload.imageryProcessedDate).toBe("2026-03-04");
    expect(payload.buildingGroundAreaMeters2).toBe(42);
    expect(payload.wholeRoofSunshineQuantiles).toEqual([1, 2, 3]);
    expect(payload.roofSegments[0].planeHeightAtCenterMeters).toBe(12);
    expect(payload.financialAnalyses[1].defaultBill).toBe(true);
    expect(payload.financialAnalyses[1].averageKwhPerMonth).toBe(350);
    expect(payload.billMatchedConfig.index).toBe(1);
  });

  it("requests data layers once and preserves the provider's actual quality", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      new Response(
        JSON.stringify({
          imageryQuality: "HIGH",
          imageryDate: { year: 2025, month: 5, day: 6 },
          imageryProcessedDate: { year: 2025, month: 6, day: 7 },
          maskUrl: "https://solar.googleapis.com/v1/geoTiff:get?id=mask-id",
          annualFluxUrl: "https://solar.googleapis.com/v1/geoTiff:get?id=annual-id",
          hourlyShadeUrls: [],
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await getDataLayers(
      new NextRequest(
        "http://localhost/api/solar/data-layers?latitude=13.7563&longitude=100.5018",
      ),
    );
    const payload = await response.json();
    const providerUrl = new URL(String(fetchMock.mock.calls[0]?.[0]));

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(providerUrl.searchParams.get("requiredQuality")).toBe("BASE");
    expect(providerUrl.searchParams.get("exactQualityRequired")).toBe("false");
    expect(payload.imageryQuality).toBe("HIGH");
    expect(payload.imageryProcessedDate).toBe("2025-06-07");
    expect(payload.maskPath).toContain("mask-id");
  });
});
