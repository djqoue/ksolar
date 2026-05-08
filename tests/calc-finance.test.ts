import { describe, expect, it } from "vitest";
import { calculateFinanceSelection, calculateProjectReturns } from "@/lib/calc/finance";

describe("finance calculations", () => {
  it("applies confirmed tax deduction while leaving unconfirmed direct subsidy at zero", () => {
    const finance = calculateFinanceSelection(250000, [
      "unconfirmed-direct-subsidy-placeholder",
      "personal-income-tax-deduction",
    ]);

    expect(finance.totalSubsidyTHB).toBe(0);
    expect(finance.taxDeductionBaseTHB).toBe(200000);
    expect(finance.taxCreditTHB).toBe(40000);
    expect(finance.financeAdjustedPriceTHB).toBe(210000);
  });

  it("keeps project ROI separate from loan affordability", () => {
    const finance = calculateFinanceSelection(180000, ["bangkok-bank-poonphol-green-pea"]);
    const returns = calculateProjectReturns({
      upfrontCostTHB: finance.financeAdjustedPriceTHB,
      annualSavingsTHB: 36000,
    });

    expect(finance.monthlyPaymentTHB).toBeGreaterThan(0);
    expect(finance.financedPrincipalTHB).toBe(180000);
    expect(finance.downPaymentTHB).toBe(0);
    expect(finance.totalInterestTHB).toBeGreaterThan(0);
    expect(returns.paybackYears).toBeCloseTo(5, 1);
    expect(returns.irrPercent).toBeGreaterThan(0);
  });
});
