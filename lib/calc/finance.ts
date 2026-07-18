import { FINANCE_PRODUCTS } from "@/lib/config/finance-products";
import { SOLAR_DEFAULTS } from "@/lib/config/solar";
import type { FinanceProduct, FinanceSelectionSummary } from "@/types/finance";

function isFinancingProduct(product: FinanceProduct) {
  return product.type === "loan" || product.type === "installment";
}

/**
 * Loans and installment plans are one mutually-exclusive payment choice.
 * Subsidies and tax credits remain independently selectable.
 */
export function normalizeFinanceProductIds(selectedFinanceIds: string[]) {
  const selectedIds = new Set(selectedFinanceIds);
  const selectedFinancingProduct = FINANCE_PRODUCTS.find(
    (product) => isFinancingProduct(product) && selectedIds.has(product.id),
  );

  return FINANCE_PRODUCTS.filter(
    (product) =>
      selectedIds.has(product.id) &&
      (!isFinancingProduct(product) || product.id === selectedFinancingProduct?.id),
  ).map((product) => product.id);
}

function amortizedMonthlyPayment(principal: number, annualRatePercent: number, termMonths: number) {
  const monthlyRate = annualRatePercent / 100 / 12;

  if (monthlyRate === 0) {
    return principal / termMonths;
  }

  return (
    (principal * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
    (Math.pow(1 + monthlyRate, termMonths) - 1)
  );
}

function internalRateOfReturn(cashFlows: number[]) {
  let rate = 0.12;

  for (let iteration = 0; iteration < 80; iteration += 1) {
    let npv = 0;
    let derivative = 0;

    for (let index = 0; index < cashFlows.length; index += 1) {
      const factor = Math.pow(1 + rate, index);
      npv += cashFlows[index]! / factor;
      if (index > 0) {
        derivative -= (index * cashFlows[index]!) / (factor * (1 + rate));
      }
    }

    if (Math.abs(derivative) < 1e-9) {
      break;
    }

    const nextRate = rate - npv / derivative;
    if (!Number.isFinite(nextRate)) {
      return null;
    }

    if (Math.abs(nextRate - rate) < 1e-7) {
      return nextRate;
    }

    rate = nextRate;
  }

  return Number.isFinite(rate) ? rate : null;
}

export function calculateFinanceSelection(
  suggestedSellPriceTHB: number,
  selectedFinanceIds: string[],
): FinanceSelectionSummary {
  const normalizedFinanceIds = normalizeFinanceProductIds(selectedFinanceIds);
  const appliedProducts = FINANCE_PRODUCTS.filter((product) => normalizedFinanceIds.includes(product.id));

  const totalSubsidyTHB = appliedProducts
    .filter((product) => product.type === "subsidy")
    .reduce((sum, product) => sum + Math.min(product.subsidyTHB || 0, product.maxSubsidyTHB || product.subsidyTHB || 0), 0);

  const taxCreditTHB = appliedProducts
    .filter((product) => product.type === "tax_credit")
    .reduce((sum, product) => {
      const deductionBaseTHB = Math.min(suggestedSellPriceTHB, product.maxSubsidyTHB || 0);
      return sum + deductionBaseTHB * ((product.taxBenefitRatePercent || 0) / 100);
    }, 0);

  const taxDeductionBaseTHB = appliedProducts
    .filter((product) => product.type === "tax_credit")
    .reduce((sum, product) => sum + Math.min(suggestedSellPriceTHB, product.maxSubsidyTHB || 0), 0);

  const cashPriceAfterSubsidyTHB = Math.max(0, suggestedSellPriceTHB - totalSubsidyTHB);
  const financeAdjustedPriceTHB = Math.max(0, cashPriceAfterSubsidyTHB - taxCreditTHB);
  const financeProduct = appliedProducts.find(
    (product) => product.type === "loan" || product.type === "installment",
  );

  if (!financeProduct || !financeProduct.termMonths) {
    return {
      appliedProducts,
      totalSubsidyTHB,
      taxDeductionBaseTHB,
      taxCreditTHB,
      cashPriceAfterSubsidyTHB,
      financeAdjustedPriceTHB,
      downPaymentTHB: cashPriceAfterSubsidyTHB,
      financedPrincipalTHB: 0,
      annualLoanPaymentTHB: 0,
      totalInterestTHB: 0,
    };
  }

  const loanToValueRatio = Math.min(1, Math.max(0, financeProduct.loanToValueRatio ?? 1));
  const financedPrincipalTHB = cashPriceAfterSubsidyTHB * loanToValueRatio;
  const downPaymentTHB = Math.max(0, cashPriceAfterSubsidyTHB - financedPrincipalTHB);
  const monthlyPaymentTHB = amortizedMonthlyPayment(
    financedPrincipalTHB,
    financeProduct.annualRatePercent || 0,
    financeProduct.termMonths,
  );
  const totalInterestTHB = monthlyPaymentTHB * financeProduct.termMonths - financedPrincipalTHB;

  return {
    appliedProducts,
    totalSubsidyTHB,
    taxDeductionBaseTHB,
    taxCreditTHB,
    cashPriceAfterSubsidyTHB,
    financeAdjustedPriceTHB,
    downPaymentTHB,
    financedPrincipalTHB,
    monthlyPaymentTHB,
    annualLoanPaymentTHB: monthlyPaymentTHB * 12,
    totalInterestTHB: Math.max(0, totalInterestTHB),
    affordabilityNote:
      financeProduct.loanToValueRatio === 1
        ? "Modeled as up to 100% project financing. Bank approval, collateral value, fees, and customer credit profile are not guaranteed."
        : undefined,
  };
}

export function calculateProjectReturns(input: {
  upfrontCostTHB: number;
  annualSavingsTHB: number;
}) {
  const paybackYears =
    input.annualSavingsTHB > 0 ? input.upfrontCostTHB / input.annualSavingsTHB : null;

  const annualOMTHB = input.upfrontCostTHB * SOLAR_DEFAULTS.annualOMRatio;
  const cashFlows = [-input.upfrontCostTHB];

  for (let year = 1; year <= SOLAR_DEFAULTS.projectLifeYears; year += 1) {
    const generationFactor = Math.pow(1 - SOLAR_DEFAULTS.degradationRatio, year - 1);
    const tariffFactor = Math.pow(1 + SOLAR_DEFAULTS.tariffEscalationRatio, year - 1);
    const netCashFlow = input.annualSavingsTHB * generationFactor * tariffFactor - annualOMTHB;
    cashFlows.push(netCashFlow);
  }

  const irr = internalRateOfReturn(cashFlows);

  return {
    paybackYears,
    irrPercent: irr === null ? null : irr * 100,
  };
}
