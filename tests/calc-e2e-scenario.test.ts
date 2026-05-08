import { describe, expect, it } from "vitest";
import { calculateQuoteScenario } from "@/lib/calc";
import { createEmptyMapSelection } from "@/lib/maps";

describe("calculateQuoteScenario", () => {
  it("creates a viable standard 1P quote from map area", () => {
    const result = calculateQuoteScenario({
      map: {
        ...createEmptyMapSelection(),
        grossAreaM2: 120,
        usableAreaM2: 84,
      },
      topology: { phase: "1P", mode: "ongrid", batteryMode: "none" },
      pricingPresetId: "standard",
      selectedFinanceIds: ["personal-income-tax-deduction"],
      ftRateTHBPerKWh: 0,
      selfConsumptionRatio: 0.6,
      exportRateTHBPerKWh: 2.2,
    });

    expect(result.isViable).toBe(true);
    expect(result.recommendedTier?.id).toBe("10kW");
    expect(result.roofFitSystemWp).toBe(18850);
    expect(result.roofPotentialAnnualGenerationKWh).toBeGreaterThan(result.annualGenerationKWh);
    expect(result.quotedSystemSizeWp).toBe(10400);
    expect(result.bom?.hardwareCostTHB).toBe(67316);
    expect(result.annualGenerationKWh).toBeGreaterThan(12000);
    expect(result.finance.financeAdjustedPriceTHB).toBeLessThan(result.suggestedSellPriceTHB);
    expect(result.explanation).toHaveLength(4);
  });

  it("flags non-viable roofs smaller than the minimum package", () => {
    const result = calculateQuoteScenario({
      map: {
        ...createEmptyMapSelection(),
        grossAreaM2: 10,
        usableAreaM2: 7,
      },
      topology: { phase: "1P", mode: "ongrid", batteryMode: "none" },
      pricingPresetId: "economic",
      selectedFinanceIds: [],
      ftRateTHBPerKWh: 0,
      selfConsumptionRatio: 0.6,
      exportRateTHBPerKWh: 2.2,
    });

    expect(result.isViable).toBe(false);
    expect(result.recommendedTier).toBeNull();
    expect(result.warnings[0]).toContain("below the smallest 1P standard package");
  });

  it("caps the quote by Google-matched roof fit when Solar data is available", () => {
    const result = calculateQuoteScenario({
      map: {
        ...createEmptyMapSelection(),
        grossAreaM2: 180,
        usableAreaM2: 126,
      },
      topology: { phase: "3P", mode: "ongrid", batteryMode: "none" },
      pricingPresetId: "standard",
      selectedFinanceIds: [],
      ftRateTHBPerKWh: 0,
      selfConsumptionRatio: 0.6,
      exportRateTHBPerKWh: 2.2,
      googleMatchedRoof: true,
      googleSellableFitWp: 5200,
      googleSellablePanelCount: 8,
    });

    expect(result.isViable).toBe(true);
    expect(result.recommendedTier?.id).toBe("5kW");
    expect(result.roofFitSystemWp).toBe(5200);
    expect(result.roofPotentialAnnualGenerationKWh).toBe(result.annualGenerationKWh);
    expect(result.quotedSystemSizeWp).toBe(5200);
    expect(result.systemSizeWp).toBe(5200);
    expect(result.panelCount).toBe(8);
  });

  it("keeps BOM tiering but recalculates the real kWp from the selected panel spec", () => {
    const result = calculateQuoteScenario({
      map: {
        ...createEmptyMapSelection(),
        grossAreaM2: 120,
        usableAreaM2: 84,
      },
      topology: { phase: "1P", mode: "ongrid", batteryMode: "none" },
      pricingPresetId: "standard",
      selectedFinanceIds: [],
      ftRateTHBPerKWh: 0,
      selfConsumptionRatio: 0.6,
      exportRateTHBPerKWh: 2.2,
      selectedPanelId: "longi-n-type-550w-th",
    });

    expect(result.isViable).toBe(true);
    expect(result.recommendedTier?.id).toBe("10kW");
    expect(result.roofFitPanelCount).toBe(32);
    expect(result.roofFitSystemWp).toBe(17600);
    expect(result.quotedSystemSizeWp).toBe(8800);
    expect(result.annualGenerationKWh).toBeGreaterThan(10900);
    expect(result.annualGenerationKWh).toBeLessThan(11000);
  });

  it("allows sales to quote a smaller tier than the roof maximum", () => {
    const maxResult = calculateQuoteScenario({
      map: {
        ...createEmptyMapSelection(),
        grossAreaM2: 220,
        usableAreaM2: 154,
      },
      topology: { phase: "3P", mode: "ongrid", batteryMode: "none" },
      pricingPresetId: "standard",
      selectedFinanceIds: [],
      ftRateTHBPerKWh: 0,
      selfConsumptionRatio: 0.6,
      exportRateTHBPerKWh: 2.2,
    });
    const selectedResult = calculateQuoteScenario({
      map: {
        ...createEmptyMapSelection(),
        grossAreaM2: 220,
        usableAreaM2: 154,
      },
      topology: { phase: "3P", mode: "ongrid", batteryMode: "none" },
      pricingPresetId: "standard",
      selectedTierId: "10kW",
      selectedFinanceIds: [],
      ftRateTHBPerKWh: 0,
      selfConsumptionRatio: 0.6,
      exportRateTHBPerKWh: 2.2,
    });

    expect(maxResult.recommendedTier?.id).toBe("20kW");
    expect(selectedResult.recommendedTier?.id).toBe("10kW");
    expect(selectedResult.quotedSystemSizeWp).toBeLessThan(maxResult.quotedSystemSizeWp);
    expect(selectedResult.suggestedSellPriceTHB).toBeLessThan(maxResult.suggestedSellPriceTHB);
    expect(selectedResult.paybackYears).not.toBe(maxResult.paybackYears);
  });
});
