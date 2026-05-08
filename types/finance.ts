export type FinanceProductType = "loan" | "installment" | "subsidy" | "tax_credit";

export interface FinanceProduct {
  id: string;
  name: string;
  type: FinanceProductType;
  enabledByDefault: boolean;
  annualRatePercent?: number;
  termMonths?: number;
  loanToValueRatio?: number;
  subsidyTHB?: number;
  maxSubsidyTHB?: number;
  taxBenefitRatePercent?: number;
  notes?: string;
}

export interface FinanceSelectionSummary {
  appliedProducts: FinanceProduct[];
  totalSubsidyTHB: number;
  taxDeductionBaseTHB: number;
  taxCreditTHB: number;
  cashPriceAfterSubsidyTHB: number;
  financeAdjustedPriceTHB: number;
  downPaymentTHB: number;
  financedPrincipalTHB: number;
  monthlyPaymentTHB?: number;
  annualLoanPaymentTHB: number;
  totalInterestTHB: number;
  affordabilityNote?: string;
}
