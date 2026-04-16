import { describe, expect, it } from "vitest";
import {
  buildSolarSelectionMatchSummary,
  buildSolarCrossCheckSummary,
  getGoogleSolarSellableFit,
  getGoogleSolarNormalizedEquivalent,
  getGoogleSolarRecommendedKw,
} from "@/lib/solar";
import type { GoogleSolarSummary } from "@/types/solar";

const baseSummary: GoogleSolarSummary = {
  buildingId: "test-building",
  center: { latitude: 13.7563, longitude: 100.5018 },
  imageryQuality: "BASE",
  imageryDate: "2025-01-11",
  regionCode: "TH",
  postalCode: "10200",
  maxArrayPanelsCount: 20,
  maxArrayAreaMeters2: 42,
  maxSunshineHoursPerYear: 1670,
  panelCapacityWatts: 400,
  panelHeightMeters: 1.8,
  panelWidthMeters: 1,
  roofAreaMeters2: 58,
  roofGroundAreaMeters2: 56,
  availableConfigs: [
    {
      index: 0,
      panelsCount: 10,
      yearlyEnergyDcKwh: 6200,
      roofSegmentCount: 2,
      roofSegmentSummaries: [],
    },
  ],
  maxConfig: {
    index: 0,
    panelsCount: 10,
    yearlyEnergyDcKwh: 6200,
    roofSegmentCount: 2,
    roofSegmentSummaries: [],
  },
  recommendedConfig: {
    index: 0,
    panelsCount: 10,
    yearlyEnergyDcKwh: 6200,
    roofSegmentCount: 2,
    roofSegmentSummaries: [],
  },
  financialAnalyses: [],
  roofSegments: [],
  solarPanels: [],
};

describe("google solar helpers", () => {
  it("converts the recommended panel layout into kWp", () => {
    expect(getGoogleSolarRecommendedKw(baseSummary)).toBe(4);
  });

  it("prefers the max roof-fit config instead of the smallest Google config", () => {
    expect(
      getGoogleSolarRecommendedKw({
        ...baseSummary,
        availableConfigs: [
          {
            index: 0,
            panelsCount: 4,
            yearlyEnergyDcKwh: 2400,
            roofSegmentCount: 1,
            roofSegmentSummaries: [],
          },
          {
            index: 1,
            panelsCount: 18,
            yearlyEnergyDcKwh: 11000,
            roofSegmentCount: 2,
            roofSegmentSummaries: [],
          },
        ],
        recommendedConfig: {
          index: 0,
          panelsCount: 4,
          yearlyEnergyDcKwh: 2400,
          roofSegmentCount: 1,
          roofSegmentSummaries: [],
        },
        maxConfig: {
          index: 1,
          panelsCount: 18,
          yearlyEnergyDcKwh: 11000,
          roofSegmentCount: 2,
          roofSegmentSummaries: [],
        },
      }),
    ).toBe(7.2);
  });

  it("normalizes Google panel layout into KSolar-equivalent capacity before comparison", () => {
    const normalized = getGoogleSolarNormalizedEquivalent(baseSummary);

    expect(normalized.layoutAreaM2).toBe(18);
    expect(normalized.equivalentPanelCount).toBe(5);
    expect(normalized.equivalentKw).toBe(3.25);
  });

  it("recalculates roof-fit using the sellable KSolar module spec", () => {
    const sellable = getGoogleSolarSellableFit(baseSummary);

    expect(sellable.layoutAreaM2).toBe(42);
    expect(sellable.equivalentPanelCount).toBe(13);
    expect(sellable.equivalentKw).toBe(8.45);
  });

  it("flags under-sizing when Google roof-fit re-run with sellable modules exceeds the current quote", () => {
    const summary = buildSolarCrossCheckSummary(baseSummary, 3000);

    expect(summary.googleRawKw).toBe(4);
    expect(summary.sellableFitKw).toBe(8.45);
    expect(summary.normalizedEquivalentKw).toBe(3.25);
    expect(summary.status).toBe("check-under-sizing");
    expect(summary.deltaKw).toBeCloseTo(5.45, 5);
    expect(summary.actionSummary).toContain("support more capacity");
  });

  it("still flags under-sizing when the sellable roof-fit stays above the current quote", () => {
    const summary = buildSolarCrossCheckSummary(baseSummary, 4000);

    expect(summary.status).toBe("check-under-sizing");
    expect(summary.deltaKw).toBeCloseTo(4.45, 5);
    expect(summary.confidenceSummary).toContain("directional guidance");
  });

  it("marks Google Solar as matched when the nearest building center is inside the selected roof", () => {
    const match = buildSolarSelectionMatchSummary(
      [
        {
          id: "roof-1",
          kind: "polygon",
          areaM2: 40,
          path: [
            { lat: 13.7560, lng: 100.5015 },
            { lat: 13.7560, lng: 100.5021 },
            { lat: 13.7566, lng: 100.5021 },
            { lat: 13.7566, lng: 100.5015 },
          ],
        },
      ],
      {
        ...baseSummary,
        solarPanels: [
          { center: { latitude: 13.7562, longitude: 100.5017 }, orientation: "PORTRAIT", segmentIndex: 0, yearlyEnergyDcKwh: 100 },
          { center: { latitude: 13.7563, longitude: 100.5018 }, orientation: "PORTRAIT", segmentIndex: 0, yearlyEnergyDcKwh: 100 },
          { center: { latitude: 13.7564, longitude: 100.5019 }, orientation: "PORTRAIT", segmentIndex: 0, yearlyEnergyDcKwh: 100 },
        ],
      },
    );

    expect(match.status).toBe("inside-selection");
    expect(match.isInsideSelection).toBe(true);
    expect(match.overlapRatio).toBe(1);
  });

  it("marks Google Solar as partial when only part of the panel layout overlaps the selected roof", () => {
    const match = buildSolarSelectionMatchSummary(
      [
        {
          id: "roof-1",
          kind: "polygon",
          areaM2: 40,
          path: [
            { lat: 13.7560, lng: 100.5015 },
            { lat: 13.7560, lng: 100.5021 },
            { lat: 13.7566, lng: 100.5021 },
            { lat: 13.7566, lng: 100.5015 },
          ],
        },
      ],
      {
        ...baseSummary,
        solarPanels: [
          { center: { latitude: 13.7562, longitude: 100.5017 }, orientation: "PORTRAIT", segmentIndex: 0, yearlyEnergyDcKwh: 100 },
          { center: { latitude: 13.7563, longitude: 100.5018 }, orientation: "PORTRAIT", segmentIndex: 0, yearlyEnergyDcKwh: 100 },
          { center: { latitude: 13.7568, longitude: 100.5024 }, orientation: "PORTRAIT", segmentIndex: 0, yearlyEnergyDcKwh: 100 },
          { center: { latitude: 13.7569, longitude: 100.5025 }, orientation: "PORTRAIT", segmentIndex: 0, yearlyEnergyDcKwh: 100 },
        ],
      },
    );

    expect(match.status).toBe("partial-selection");
    expect(match.overlapRatio).toBe(0.5);
    expect(match.matchedPoints).toBe(2);
    expect(match.totalPoints).toBe(4);
  });

  it("marks Google Solar as outside the selected roof when the nearest building is elsewhere", () => {
    const match = buildSolarSelectionMatchSummary(
      [
        {
          id: "roof-2",
          kind: "polygon",
          areaM2: 40,
          path: [
            { lat: 13.7540, lng: 100.4980 },
            { lat: 13.7540, lng: 100.4985 },
            { lat: 13.7545, lng: 100.4985 },
            { lat: 13.7545, lng: 100.4980 },
          ],
        },
      ],
      {
        ...baseSummary,
        solarPanels: [
          { center: { latitude: 13.7562, longitude: 100.5017 }, orientation: "PORTRAIT", segmentIndex: 0, yearlyEnergyDcKwh: 100 },
          { center: { latitude: 13.7563, longitude: 100.5018 }, orientation: "PORTRAIT", segmentIndex: 0, yearlyEnergyDcKwh: 100 },
        ],
      },
    );

    expect(match.status).toBe("outside-selection");
    expect(match.isInsideSelection).toBe(false);
    expect(match.distanceToNearestShapeMeters).toBeGreaterThan(100);
  });
});
