import { describe, expect, it } from "vitest";
import { calculateQuoteScenario } from "@/lib/calc";
import { calculateFinanceSelection, normalizeFinanceProductIds } from "@/lib/calc/finance";
import { createEmptyMapSelection } from "@/lib/maps";
import type { QuoteScenarioInput } from "@/types/quote";

describe("selection guards", () => {
  it("keeps one loan or installment while preserving multiple incentives", () => {
    const conflictingIds = [
      "comsys-0-percent-6m",
      "bangkok-bank-poonphol-green-pea",
      "personal-income-tax-deduction",
      "unconfirmed-direct-subsidy-placeholder",
    ];

    expect(normalizeFinanceProductIds(conflictingIds)).toEqual([
      "bangkok-bank-poonphol-green-pea",
      "personal-income-tax-deduction",
      "unconfirmed-direct-subsidy-placeholder",
    ]);

    const guarded = calculateFinanceSelection(250000, conflictingIds);
    const canonical = calculateFinanceSelection(250000, [
      "bangkok-bank-poonphol-green-pea",
      "personal-income-tax-deduction",
      "unconfirmed-direct-subsidy-placeholder",
    ]);

    expect(guarded.appliedProducts.map((product) => product.id)).toEqual(
      canonical.appliedProducts.map((product) => product.id),
    );
    expect(guarded.monthlyPaymentTHB).toBe(canonical.monthlyPaymentTHB);
    expect(guarded.taxCreditTHB).toBe(canonical.taxCreditTHB);
  });

  it("falls back to the automatic BOM inverter when a manual choice conflicts with topology", () => {
    const automatic = calculateQuoteScenario(createScenarioInput());
    const guarded = calculateQuoteScenario({
      ...createScenarioInput(),
      selectedInverterId: "growatt-sun-5k-g05p1-eu",
    });

    expect(guarded.isViable).toBe(true);
    expect(guarded.warnings).toContain(
      "Selected inverter is unavailable or incompatible with the current phase and mode. Automatic BOM selection was used instead.",
    );
    expect(guarded.bom?.lineItems.filter((item) => item.category === "inverter")).toEqual(
      automatic.bom?.lineItems.filter((item) => item.category === "inverter"),
    );
  });

  it("still applies a compatible manual inverter override", () => {
    const result = calculateQuoteScenario({
      ...createScenarioInput(),
      selectedInverterId: "growatt-sun-10k-g06p3-eu",
    });

    expect(result.isViable).toBe(true);
    expect(result.warnings.some((warning) => warning.includes("incompatible"))).toBe(false);
    expect(
      result.bom?.lineItems.some(
        (item) => item.category === "inverter" && item.model === "Growatt SUN-10K-G06P3-EU-BM2-P1",
      ),
    ).toBe(true);
  });
});

function createScenarioInput(): QuoteScenarioInput {
  return {
    map: {
      ...createEmptyMapSelection(),
      grossAreaM2: 180,
      usableAreaM2: 126,
    },
    topology: { phase: "3P", mode: "ongrid", batteryMode: "none" },
    pricingPresetId: "standard",
    selectedTierId: "10kW",
    selectedFinanceIds: [],
    ftRateTHBPerKWh: 0,
    selfConsumptionRatio: 0.6,
    exportRateTHBPerKWh: 2.2,
  };
}
