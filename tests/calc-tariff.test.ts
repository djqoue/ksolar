import { describe, expect, it } from "vitest";
import { calculateTariffValue } from "@/lib/calc/tariff";

describe("calculateTariffValue input boundaries", () => {
  it("clamps self consumption so exported energy cannot become negative", () => {
    const result = calculateTariffValue({
      annualGenerationKWh: 10_000,
      ftRateTHBPerKWh: 0.5,
      selfConsumptionRatio: 1.4,
      exportRateTHBPerKWh: 2.2,
    });

    expect(result.annualSelfUseKWh).toBe(10_000);
    expect(result.annualExportKWh).toBe(0);
    expect(result.annualExportRevenueTHB).toBe(0);
  });

  it("does not allow negative or non-finite inputs to create negative money", () => {
    const result = calculateTariffValue({
      annualGenerationKWh: Number.NaN,
      ftRateTHBPerKWh: -3,
      selfConsumptionRatio: -1,
      exportRateTHBPerKWh: -2,
    });

    expect(result.annualSelfUseKWh).toBe(0);
    expect(result.annualExportKWh).toBe(0);
    expect(result.annualSavingsTHB).toBe(0);
  });
});
