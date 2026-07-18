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

  it("does not count residential export revenue before grid approval", () => {
    const result = calculateTariffValue({
      annualGenerationKWh: 10_000,
      ftRateTHBPerKWh: 0.1623,
      selfConsumptionRatio: 0.6,
      exportRateTHBPerKWh: 2.2,
      gridExportApproved: false,
    });

    expect(result.annualExportKWh).toBe(0);
    expect(result.annualCurtailmentKWh).toBe(4_000);
    expect(result.annualExportRevenueTHB).toBe(0);
    expect(result.exportRevenueMode).toBe("not-approved");
  });

  it("applies the approved 5kW AC export limit as a disclosed annual proxy", () => {
    const result = calculateTariffValue({
      annualGenerationKWh: 20_000,
      ftRateTHBPerKWh: 0.1623,
      selfConsumptionRatio: 0.25,
      exportRateTHBPerKWh: 2.2,
      gridExportApproved: true,
      approvedExportLimitKwAc: 5,
    });

    expect(result.annualExportKWh).toBe(7_300);
    expect(result.annualCurtailmentKWh).toBe(7_700);
    expect(result.exportRevenueMode).toBe("approved-proxy");
  });

  it("caps modeled self-use savings at the customer's recorded annual bill", () => {
    const result = calculateTariffValue({
      annualGenerationKWh: 20_000,
      ftRateTHBPerKWh: 0.1623,
      selfConsumptionRatio: 1,
      exportRateTHBPerKWh: 2.2,
      monthlyElectricityBillTHB: 2_000,
      gridExportApproved: false,
    });

    expect(result.annualSelfUseSavingsTHB).toBe(24_000);
    expect(result.savingsCappedByBill).toBe(true);
  });
});
