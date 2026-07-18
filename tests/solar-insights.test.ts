import { describe, expect, it } from "vitest";
import {
  buildSolarSelectionMatchSummary,
  buildSolarCrossCheckSummary,
  buildSellableSolarPanelFootprints,
  getGoogleSolarSelectionPanelUpperBound,
  getGoogleSolarSellableAnnualGeneration,
  getGoogleSolarSellableFit,
  getGoogleSolarNormalizedEquivalent,
  getGoogleSolarRecommendedKw,
} from "@/lib/solar";
import type { GoogleSolarSummary } from "@/types/solar";

const baseSummary: GoogleSolarSummary = {
  buildingId: "test-building",
  center: { latitude: 13.7563, longitude: 100.5018 },
  imageryQuality: "HIGH",
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

  it("re-runs Google roof-fit using the selected panel footprint and wattage", () => {
    const sellable = getGoogleSolarSellableFit(baseSummary, {
      areaM2: 2.583252,
      powerWp: 550,
    });

    expect(sellable.layoutAreaM2).toBe(42);
    expect(sellable.equivalentPanelCount).toBe(16);
    expect(sellable.equivalentKw).toBe(8.8);
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
    expect(summary.confidenceSummary).toContain("remote-screening reference");
  });

  it("tracks the selected panel wattage in the Google cross-check summary", () => {
    const summary = buildSolarCrossCheckSummary(baseSummary, 4000, {
      areaM2: 2.583252,
      powerWp: 550,
    });

    expect(summary.sellableFitKw).toBe(8.8);
    expect(summary.ksolarPanelPowerWp).toBe(550);
    expect(summary.cautionSummary).toContain("550W");
  });

  it("builds a sellable max-layout footprint from Google panel centers and selected module size", () => {
    const footprints = buildSellableSolarPanelFootprints(
      {
        ...baseSummary,
        maxArrayAreaMeters2: 5.4,
        roofSegments: [{ segmentIndex: 0, pitchDegrees: 10, azimuthDegrees: 180, areaMeters2: 20, groundAreaMeters2: 18 }],
        solarPanels: [
          { center: { latitude: 13.7562, longitude: 100.5017 }, orientation: "PORTRAIT", segmentIndex: 0, yearlyEnergyDcKwh: 100 },
          { center: { latitude: 13.7563, longitude: 100.5018 }, orientation: "PORTRAIT", segmentIndex: 0, yearlyEnergyDcKwh: 300 },
          { center: { latitude: 13.7564, longitude: 100.5019 }, orientation: "PORTRAIT", segmentIndex: 0, yearlyEnergyDcKwh: 200 },
        ],
      },
      {
        areaM2: 2.7,
        longSideM: 2.38,
        powerWp: 600,
        shortSideM: 1.13,
      },
    );

    expect(footprints).toHaveLength(2);
    expect(footprints[0].center).toEqual({ latitude: 13.7563, longitude: 100.5018 });
    expect(footprints[0].path).toHaveLength(4);
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

  it("keeps a multi-roof selection manual when Google returned only one building", () => {
    const match = buildSolarSelectionMatchSummary(
      [
        {
          id: "roof-a",
          kind: "polygon",
          areaM2: 20,
          path: [
            { lat: 13.7560, lng: 100.5015 },
            { lat: 13.7560, lng: 100.5021 },
            { lat: 13.7566, lng: 100.5021 },
            { lat: 13.7566, lng: 100.5015 },
          ],
        },
        {
          id: "roof-b",
          kind: "polygon",
          areaM2: 20,
          path: [
            { lat: 13.7570, lng: 100.5030 },
            { lat: 13.7570, lng: 100.5034 },
            { lat: 13.7574, lng: 100.5034 },
            { lat: 13.7574, lng: 100.5030 },
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

    expect(match.quoteEligible).toBe(false);
    expect(match.confidenceReasons.join(" ")).toContain("multi-roof");
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

  it("keeps BASE imagery reference-only even when all panel footprints are selected", () => {
    const shapes = [
      {
        id: "roof-base",
        kind: "polygon" as const,
        areaM2: 40,
        path: [
          { lat: 13.7560, lng: 100.5015 },
          { lat: 13.7560, lng: 100.5021 },
          { lat: 13.7566, lng: 100.5021 },
          { lat: 13.7566, lng: 100.5015 },
        ],
      },
    ];
    const baseImagery = {
      ...baseSummary,
      imageryQuality: "BASE" as const,
      solarPanels: [
        { center: { latitude: 13.7562, longitude: 100.5017 }, orientation: "PORTRAIT" as const, segmentIndex: 0, yearlyEnergyDcKwh: 100 },
        { center: { latitude: 13.7563, longitude: 100.5018 }, orientation: "PORTRAIT" as const, segmentIndex: 0, yearlyEnergyDcKwh: 100 },
      ],
      roofSegments: [
        { segmentIndex: 0, pitchDegrees: 10, azimuthDegrees: 180, areaMeters2: 58, groundAreaMeters2: 56 },
      ],
    };

    const match = buildSolarSelectionMatchSummary(shapes, baseImagery);

    expect(match.status).toBe("partial-selection");
    expect(match.quoteEligible).toBe(false);
    expect(match.confidence).toBe("reference-only");
    expect(match.confidenceReasons.join(" ")).toContain("BASE satellite imagery");
    expect(getGoogleSolarSellableFit(baseImagery).equivalentKw).toBeNull();
    expect(getGoogleSolarSellableAnnualGeneration(baseImagery)).toBeNull();
  });

  it("derives the selection upper bound only from complete valid panel footprints", () => {
    const shapes = [
      {
        id: "roof-selected",
        kind: "polygon" as const,
        areaM2: 58,
        path: [
          { lat: 13.7560, lng: 100.5015 },
          { lat: 13.7560, lng: 100.5021 },
          { lat: 13.7566, lng: 100.5021 },
          { lat: 13.7566, lng: 100.5015 },
        ],
      },
    ];
    const insights = {
      ...baseSummary,
      roofSegments: [
        { segmentIndex: 0, pitchDegrees: 10, azimuthDegrees: 180, areaMeters2: 58, groundAreaMeters2: 56 },
      ],
      solarPanels: [
        { center: { latitude: 13.7562, longitude: 100.5017 }, orientation: "PORTRAIT" as const, segmentIndex: 0, yearlyEnergyDcKwh: 100 },
        { center: { latitude: 13.7563, longitude: 100.5018 }, orientation: "PORTRAIT" as const, segmentIndex: 0, yearlyEnergyDcKwh: 200 },
        { center: { latitude: 13.7580, longitude: 100.5040 }, orientation: "PORTRAIT" as const, segmentIndex: 0, yearlyEnergyDcKwh: 300 },
      ],
    };

    const upperBound = getGoogleSolarSelectionPanelUpperBound(insights, shapes, {
      areaM2: 1.8,
      powerWp: 600,
    });

    expect(upperBound?.sourcePanelCount).toBe(2);
    expect(upperBound?.sourceYearlyEnergyDcKwh).toBe(300);
    expect(upperBound?.normalizedSellablePanelCount).toBe(2);
    expect(upperBound?.quoteEligible).toBe(false);
    expect(upperBound?.referenceOnly).toBe(true);
  });
});
