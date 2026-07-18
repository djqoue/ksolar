export type FinanceProductType =
  | "loan"
  | "installment"
  | "subsidy"
  | "tax_credit"
  | "tax_deduction";

export type FinanceCustomerSegment = "residential" | "sme" | "ppa";
export type FinanceProductStatus = "confirmed" | "reference" | "expired";

export interface FinanceRatePeriod {
  startMonth: number;
  endMonth: number;
  annualRatePercent: number;
  rateType: "fixed" | "floating-reference";
  referenceRateName?: string;
  referenceRateAsOf?: string;
}

export interface FinancePaymentScheduleEntry {
  month: number;
  annualRatePercent: number;
  paymentTHB: number;
  principalTHB: number;
  interestTHB: number;
  remainingPrincipalTHB: number;
}

export interface FinanceProduct {
  id: string;
  name: string;
  type: FinanceProductType;
  enabledByDefault: boolean;
  annualRatePercent?: number;
  rateSchedule?: FinanceRatePeriod[];
  termMonths?: number;
  loanToValueRatio?: number;
  minimumLoanTHB?: number;
  maximumLoanTHB?: number;
  fixedFeeTHB?: number;
  feeRatePercent?: number;
  subsidyTHB?: number;
  maxSubsidyTHB?: number;
  taxBenefitRatePercent?: number;
  customerSegments?: FinanceCustomerSegment[];
  status?: FinanceProductStatus;
  validFrom?: string;
  validTo?: string;
  lastVerifiedAt?: string;
  officialSourceUrl?: string;
  eligibility?: string;
  collateral?: string;
  notes?: string;
}

export interface FinanceCalculationOptions {
  /** Taxable income after other deductions. Gross income must not be used here. */
  taxableIncomeTHB?: number | null;
  /** Used only as an explicit estimate when taxable income is unavailable. */
  marginalTaxRatePercent?: number | null;
  calculationDate?: string;
}

export interface FinanceSelectionSummary {
  appliedProducts: FinanceProduct[];
  totalSubsidyTHB: number;
  taxDeductionBaseTHB: number;
  taxCreditTHB: number;
  taxBenefitConfirmed: boolean;
  cashPriceAfterSubsidyTHB: number;
  financeAdjustedPriceTHB: number;
  downPaymentTHB: number;
  financedPrincipalTHB: number;
  totalFeesTHB: number;
  monthlyPaymentTHB?: number;
  highestMonthlyPaymentTHB?: number;
  annualLoanPaymentTHB: number;
  totalInterestTHB: number;
  totalDebtServiceTHB: number;
  paymentSchedule: FinancePaymentScheduleEntry[];
  policyWarnings: string[];
  affordabilityNote?: string;
}

export interface ProjectReturnsSummary {
  paybackYears: number | null;
  discountedPaybackYears: number | null;
  irrPercent: number | null;
  npvTHB: number;
  lifetimeNetSavingsTHB: number;
  discountRatePercent: number;
  annualCashFlowsTHB: number[];
}
