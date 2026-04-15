export type FinanceProductType = "loan" | "installment" | "subsidy" | "tax_credit";

export interface FinanceProduct {
  id: string;
  name: string;
  type: FinanceProductType;
  enabledByDefault: boolean;
  annualRatePercent?: number;
  termMonths?: number;
  subsidyTHB?: number;
  maxSubsidyTHB?: number;
  notes?: string;
}

export interface FinanceSelectionSummary {
  appliedProducts: FinanceProduct[];
  totalSubsidyTHB: number;
  taxCreditTHB: number;
  financeAdjustedPriceTHB: number;
  monthlyPaymentTHB?: number;
  totalInterestTHB: number;
}

