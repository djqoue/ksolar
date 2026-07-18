import { describe, expect, it } from "vitest";
import {
  calculateFinanceSelection,
  calculateProjectReturns,
  calculateThaiPersonalIncomeTax,
} from "@/lib/calc/finance";

describe("finance calculations", () => {
  it("does not treat the residential tax deduction as automatic cash back", () => {
    const withoutTaxInput = calculateFinanceSelection(250_000, [
      "personal-income-tax-deduction",
    ]);
    const withTaxableIncome = calculateFinanceSelection(
      250_000,
      ["personal-income-tax-deduction"],
      { taxableIncomeTHB: 900_000, calculationDate: "2026-07-18" },
    );

    expect(withoutTaxInput.taxDeductionBaseTHB).toBe(200_000);
    expect(withoutTaxInput.taxCreditTHB).toBe(0);
    expect(withoutTaxInput.taxBenefitConfirmed).toBe(false);
    expect(withoutTaxInput.financeAdjustedPriceTHB).toBe(250_000);
    expect(withoutTaxInput.policyWarnings[0]).toContain("not a cash rebate");

    expect(withTaxableIncome.taxCreditTHB).toBe(37_500);
    expect(withTaxableIncome.taxBenefitConfirmed).toBe(true);
    expect(withTaxableIncome.financeAdjustedPriceTHB).toBe(212_500);
  });

  it("models the published GSB staged rates instead of applying the teaser rate for seven years", () => {
    const finance = calculateFinanceSelection(
      400_000,
      ["gsb-solar-for-life-clean-7y"],
      { calculationDate: "2026-07-18" },
    );

    expect(finance.financedPrincipalTHB).toBe(320_000);
    expect(finance.downPaymentTHB).toBe(80_000);
    expect(finance.paymentSchedule).toHaveLength(84);
    expect(finance.paymentSchedule[0]?.annualRatePercent).toBe(3.5);
    expect(finance.paymentSchedule[24]?.annualRatePercent).toBe(5);
    expect(finance.paymentSchedule[60]?.annualRatePercent).toBe(6.045);
    expect(finance.totalInterestTHB).toBeGreaterThan(0);
    expect(finance.highestMonthlyPaymentTHB).toBeGreaterThan(0);
    expect(finance.totalDebtServiceTHB).toBeCloseTo(
      finance.financedPrincipalTHB + finance.totalInterestTHB,
      5,
    );
  });

  it("flags an official product after its published validity window", () => {
    const finance = calculateFinanceSelection(
      180_000,
      ["kbank-sme-solar-5y"],
      { calculationDate: "2027-01-01" },
    );

    expect(finance.policyWarnings[0]).toContain("outside its published validity window");
  });

  it("models KBank's published eight-year MLR-minus-0.80 option", () => {
    const finance = calculateFinanceSelection(
      600_000,
      ["kbank-sme-solar-8y"],
      { calculationDate: "2026-07-18" },
    );

    expect(finance.financedPrincipalTHB).toBe(600_000);
    expect(finance.paymentSchedule).toHaveLength(96);
    expect(finance.paymentSchedule[0]?.annualRatePercent).toBe(5.72);
    expect(finance.paymentSchedule[95]?.remainingPrincipalTHB).toBeCloseTo(0, 5);
  });

  it("calculates progressive Thai personal income tax", () => {
    expect(calculateThaiPersonalIncomeTax(150_000)).toBe(0);
    expect(calculateThaiPersonalIncomeTax(500_000)).toBe(27_500);
    expect(calculateThaiPersonalIncomeTax(1_000_000)).toBe(115_000);
  });

  it("returns NPV and discounted payback separately from simple payback", () => {
    const returns = calculateProjectReturns({
      upfrontCostTHB: 180_000,
      annualSavingsTHB: 36_000,
      discountRatePercent: 7,
    });

    expect(returns.paybackYears).toBeGreaterThan(5);
    expect(returns.discountedPaybackYears).toBeGreaterThan(returns.paybackYears || 0);
    expect(returns.irrPercent).toBeGreaterThan(0);
    expect(returns.npvTHB).toBeGreaterThan(0);
    expect(returns.lifetimeNetSavingsTHB).toBeGreaterThan(returns.npvTHB);
    expect(returns.annualCashFlowsTHB).toHaveLength(26);
  });
});
