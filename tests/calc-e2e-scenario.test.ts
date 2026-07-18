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
    expect(result.bom?.hardwareCostTHB).toBe(68404);
    expect(result.annualGenerationKWh).toBeGreaterThan(12000);
    expect(result.finance.financeAdjustedPriceTHB).toBe(result.suggestedSellPriceTHB);
    expect(result.finance.taxBenefitConfirmed).toBe(false);
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

  it("uses Google Solar calibrated yield for quoted generation when annual DC energy is available", () => {
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
      googleSellableFitWp: 10400,
      googleSellablePanelCount: 16,
      googleAnnualGenerationKWh: 16000,
    });

    expect(result.isViable).toBe(true);
    expect(result.generationModel).toBe("google-solar-calibrated");
    expect(result.roofPotentialAnnualGenerationKWh).toBeCloseTo(13600, 1);
    expect(result.annualGenerationKWh).toBeCloseTo(13600, 1);
    expect(result.generationSpecificYieldKWhPerKWp).toBeCloseTo(1307.69, 2);
  });

  it("recalculates module count and installed kWp from the selected panel spec", () => {
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
    expect(result.recommendedTier?.panelCount).toBe(19);
    expect(result.quotedSystemSizeWp).toBe(10450);
    expect(result.bom?.lineItems.find((item) => item.id === "pv-module")?.quantity).toBe(19);
    expect(result.annualGenerationKWh).toBeGreaterThan(12900);
    expect(result.annualGenerationKWh).toBeLessThan(13050);
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

  it("keeps an unavailable explicit 1P package from silently falling back", () => {
    const result = calculateQuoteScenario({
      map: {
        ...createEmptyMapSelection(),
        grossAreaM2: 300,
        usableAreaM2: 210,
      },
      topology: { phase: "1P", mode: "ongrid", batteryMode: "none" },
      pricingPresetId: "standard",
      capacityIntent: { mode: "standard", targetKW: 15 },
      selectedFinanceIds: [],
      ftRateTHBPerKWh: 0.1623,
      selfConsumptionRatio: 0.6,
      exportRateTHBPerKWh: 2.2,
    });

    expect(result.isViable).toBe(false);
    expect(result.quoteReady).toBe(false);
    expect(result.recommendedTier).toBeNull();
    expect(result.warnings.join(" ")).toContain("not a grid-export limit");
  });

  it("returns roof maximum as technical potential without inventing a package quote", () => {
    const result = calculateQuoteScenario({
      map: {
        ...createEmptyMapSelection(),
        grossAreaM2: 1_200,
        usableAreaM2: 840,
      },
      topology: { phase: "3P", mode: "ongrid", batteryMode: "none" },
      pricingPresetId: "standard",
      capacityIntent: { mode: "roof-potential" },
      selectedFinanceIds: [],
      ftRateTHBPerKWh: 0.1623,
      selfConsumptionRatio: 0.6,
      exportRateTHBPerKWh: 2.2,
    });

    expect(result.isViable).toBe(true);
    expect(result.quoteReady).toBe(false);
    expect(result.quoteReadiness).toBe("engineering-review");
    expect(result.engineeringReviewRequired).toBe(true);
    expect(result.roofFitSystemWp).toBeGreaterThan(20_000);
    expect(result.annualGenerationKWh).toBe(result.roofPotentialAnnualGenerationKWh);
    expect(result.suggestedSellPriceTHB).toBe(0);
    expect(result.bom).toBeNull();
  });

  it("falls back when a hand-selected inverter is electrically incompatible", () => {
    const result = calculateQuoteScenario({
      map: {
        ...createEmptyMapSelection(),
        grossAreaM2: 180,
        usableAreaM2: 126,
      },
      topology: { phase: "1P", mode: "ongrid", batteryMode: "none" },
      pricingPresetId: "standard",
      capacityIntent: { mode: "standard", targetKW: 10 },
      selectedInverterId: "growatt-sun-5k-g05p1-eu",
      selectedFinanceIds: [],
      ftRateTHBPerKWh: 0.1623,
      selfConsumptionRatio: 0.6,
      exportRateTHBPerKWh: 2.2,
    });

    expect(result.isViable).toBe(true);
    expect(result.electricalCompatibility?.inverterId).toBe(
      "growatt-sun-10k-g02p1-eu",
    );
    expect(result.warnings.join(" ")).toContain("Automatic BOM selection");
  });

  it("carries bill and export approval constraints through the quote result", () => {
    const result = calculateQuoteScenario({
      map: {
        ...createEmptyMapSelection(),
        grossAreaM2: 180,
        usableAreaM2: 126,
      },
      topology: { phase: "1P", mode: "ongrid", batteryMode: "none" },
      pricingPresetId: "standard",
      capacityIntent: { mode: "standard", targetKW: 10 },
      selectedFinanceIds: [],
      ftRateTHBPerKWh: 0.1623,
      selfConsumptionRatio: 0.6,
      exportRateTHBPerKWh: 2.2,
      monthlyElectricityBillTHB: 1_000,
      gridExportApproved: false,
    });

    expect(result.annualExportKWh).toBe(0);
    expect(result.annualCurtailmentKWh).toBeGreaterThan(0);
    expect(result.annualSelfUseSavingsTHB).toBe(12_000);
    expect(result.savingsCappedByBill).toBe(true);
  });
});
