import type { FinanceProduct } from "@/types/finance";

export const FINANCE_PRODUCTS: FinanceProduct[] = [
  {
    id: "krungsri-home-solar-loan",
    name: "Krungsri Home Solar Loan",
    type: "loan",
    enabledByDefault: false,
    annualRatePercent: 5.9,
    termMonths: 60,
    notes: "Reference household solar loan for monthly affordability checks.",
  },
  {
    id: "bangkok-bank-green-loan",
    name: "Bangkok Bank Green Loan",
    type: "loan",
    enabledByDefault: false,
    annualRatePercent: 5.2,
    termMonths: 48,
    notes: "Green loan benchmark for customers preferring shorter tenor.",
  },
  {
    id: "comsys-0-percent-6m",
    name: "Comsys 0% 6 Months",
    type: "installment",
    enabledByDefault: false,
    annualRatePercent: 0,
    termMonths: 6,
    notes: "Short-term instalment benchmark for low-friction sales closes.",
  },
  {
    id: "saimai-10m-installment",
    name: "Saimai 10-Month Installment",
    type: "installment",
    enabledByDefault: false,
    annualRatePercent: 10,
    termMonths: 10,
    notes: "Reference instalment plan based on competitor field offers.",
  },
  {
    id: "personal-income-tax-deduction",
    name: "Personal Income Tax Deduction",
    type: "tax_credit",
    enabledByDefault: true,
    maxSubsidyTHB: 200000,
    notes: "Modelled as a one-time tax benefit capped at THB 200,000.",
  },
  {
    id: "dede-subsidy",
    name: "DEDE Subsidy",
    type: "subsidy",
    enabledByDefault: false,
    subsidyTHB: 25000,
    maxSubsidyTHB: 30000,
    notes: "Modelled as a direct capex reduction for eligible household systems.",
  },
];

