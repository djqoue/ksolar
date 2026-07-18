import { describe, expect, it } from "vitest";
import { calculateMaxLayout } from "@/lib/calc/max-layout";

const panel = {
  areaM2: 2.830116,
  lengthM: 2.172,
  powerWp: 650,
  weightKg: 34.9,
  widthM: 1.303,
};

describe("calculateMaxLayout", () => {
  it("uses Google Solar max array area when the roof is matched", () => {
    const result = calculateMaxLayout({
      googleMatchedRoof: true,
      googleReference: {
        maxArrayAreaM2: 274.89767,
        maxConfigPanelCount: 140,
        maxConfigYearlyEnergyKWh: 82000,
        panelCapacityWp: 400,
      },
      manualUsableAreaM2: 700,
      panel,
      selectedRoofAreaM2: 1000,
    });

    expect(result.source).toBe("google-solar");
    expect(result.panelCount).toBe(97);
    expect(result.capacityWp).toBe(63050);
    expect(result.annualGenerationKWh).toBeCloseTo(78474.73, 1);
    expect(result.totalWeightKg).toBeCloseTo(4208.86, 1);
    expect(result.loadKgPerM2).toBeCloseTo(15.33, 2);
    expect(result.structuralLoadStatus).toBe("review");
  });

  it("falls back to manual usable roof area when Google is not matched", () => {
    const result = calculateMaxLayout({
      googleMatchedRoof: false,
      googleReference: {
        maxArrayAreaM2: 274.89767,
      },
      manualUsableAreaM2: 70,
      panel,
      selectedRoofAreaM2: 100,
    });

    expect(result.source).toBe("manual-roof");
    expect(result.panelCount).toBe(24);
    expect(result.capacityWp).toBe(15600);
    expect(result.annualGenerationKWh).toBeCloseTo(19359.6, 1);
  });
});
