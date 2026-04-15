import { describe, expect, it } from "vitest";
import { calculateFinanceSelection, calculateProjectReturns } from "@/lib/calc/finance";

describe("finance calculations", () => {
  it("reduces capex when subsidy and tax credit are applied", () => {
    const finance = calculateFinanceSelection(250000, [
      "dede-subsidy",
      "personal-income-tax-deduction",
    ]);

    expect(finance.totalSubsidyTHB).toBe(25000);
    expect(finance.taxCreditTHB).toBe(200000);
    expect(finance.financeAdjustedPriceTHB).toBe(25000);
  });

  it("keeps project ROI separate from loan affordability", () => {
    const finance = calculateFinanceSelection(180000, ["krungsri-home-solar-loan"]);
    const returns = calculateProjectReturns({
      upfrontCostTHB: finance.financeAdjustedPriceTHB,
      annualSavingsTHB: 36000,
    });

    expect(finance.monthlyPaymentTHB).toBeGreaterThan(0);
    expect(finance.totalInterestTHB).toBeGreaterThan(0);
    expect(returns.paybackYears).toBeCloseTo(5, 1);
    expect(returns.irrPercent).toBeGreaterThan(0);
  });
});

