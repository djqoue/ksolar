import { FINANCE_PRODUCTS } from "@/lib/config/finance-products";
import { SOLAR_DEFAULTS } from "@/lib/config/solar";
import { isPolicyCurrent } from "@/lib/config/thailand-energy-policy";
import type {
  FinanceCalculationOptions,
  FinancePaymentScheduleEntry,
  FinanceProduct,
  FinanceSelectionSummary,
  ProjectReturnsSummary,
} from "@/types/finance";

function isFinancingProduct(product: FinanceProduct) {
  return product.type === "loan" || product.type === "installment";
}

function isTaxProduct(product: FinanceProduct) {
  return product.type === "tax_credit" || product.type === "tax_deduction";
}

/**
 * Loans and installment plans are one mutually-exclusive payment choice.
 * Subsidies and tax deductions remain independently selectable.
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

function amortizedMonthlyPayment(
  principal: number,
  annualRatePercent: number,
  termMonths: number,
) {
  if (principal <= 0 || termMonths <= 0) {
    return 0;
  }

  const monthlyRate = annualRatePercent / 100 / 12;

  if (monthlyRate === 0) {
    return principal / termMonths;
  }

  return (
    (principal * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
    (Math.pow(1 + monthlyRate, termMonths) - 1)
  );
}

function getRateForMonth(product: FinanceProduct, month: number) {
  const period = product.rateSchedule?.find(
    (candidate) => month >= candidate.startMonth && month <= candidate.endMonth,
  );

  return period?.annualRatePercent ?? product.annualRatePercent ?? 0;
}

function buildPaymentSchedule(
  principal: number,
  product: FinanceProduct,
): FinancePaymentScheduleEntry[] {
  const termMonths = product.termMonths || 0;
  if (principal <= 0 || termMonths <= 0) {
    return [];
  }

  const schedule: FinancePaymentScheduleEntry[] = [];
  let remainingPrincipalTHB = principal;
  let activeAnnualRatePercent: number | null = null;
  let currentPaymentTHB = 0;

  for (let month = 1; month <= termMonths; month += 1) {
    const annualRatePercent = getRateForMonth(product, month);
    if (activeAnnualRatePercent !== annualRatePercent) {
      activeAnnualRatePercent = annualRatePercent;
      currentPaymentTHB = amortizedMonthlyPayment(
        remainingPrincipalTHB,
        annualRatePercent,
        termMonths - month + 1,
      );
    }

    const monthlyRate = annualRatePercent / 100 / 12;
    const interestTHB = remainingPrincipalTHB * monthlyRate;
    const principalTHB = Math.min(
      remainingPrincipalTHB,
      Math.max(0, currentPaymentTHB - interestTHB),
    );
    const paymentTHB = principalTHB + interestTHB;
    remainingPrincipalTHB = Math.max(0, remainingPrincipalTHB - principalTHB);

    schedule.push({
      month,
      annualRatePercent,
      paymentTHB,
      principalTHB,
      interestTHB,
      remainingPrincipalTHB,
    });
  }

  return schedule;
}

const THAI_PERSONAL_INCOME_TAX_BRACKETS = [
  { upperTHB: 150_000, rate: 0 },
  { upperTHB: 300_000, rate: 0.05 },
  { upperTHB: 500_000, rate: 0.1 },
  { upperTHB: 750_000, rate: 0.15 },
  { upperTHB: 1_000_000, rate: 0.2 },
  { upperTHB: 2_000_000, rate: 0.25 },
  { upperTHB: 5_000_000, rate: 0.3 },
  { upperTHB: Number.POSITIVE_INFINITY, rate: 0.35 },
] as const;

export function calculateThaiPersonalIncomeTax(taxableIncomeTHB: number) {
  let previousUpperTHB = 0;
  let taxTHB = 0;
  const incomeTHB = Math.max(0, Number.isFinite(taxableIncomeTHB) ? taxableIncomeTHB : 0);

  for (const bracket of THAI_PERSONAL_INCOME_TAX_BRACKETS) {
    const taxableInBracketTHB = Math.max(
      0,
      Math.min(incomeTHB, bracket.upperTHB) - previousUpperTHB,
    );
    taxTHB += taxableInBracketTHB * bracket.rate;
    if (incomeTHB <= bracket.upperTHB) {
      break;
    }
    previousUpperTHB = bracket.upperTHB;
  }

  return taxTHB;
}

function calculateTaxBenefit(
  suggestedSellPriceTHB: number,
  products: FinanceProduct[],
  options: FinanceCalculationOptions,
) {
  const taxDeductionBaseTHB = products
    .filter(isTaxProduct)
    .reduce(
      (sum, product) =>
        sum + Math.min(suggestedSellPriceTHB, product.maxSubsidyTHB || 0),
      0,
    );

  if (taxDeductionBaseTHB <= 0) {
    return { taxDeductionBaseTHB: 0, taxCreditTHB: 0, taxBenefitConfirmed: false };
  }

  const taxableIncomeTHB = options.taxableIncomeTHB;
  if (
    taxableIncomeTHB !== null &&
    taxableIncomeTHB !== undefined &&
    Number.isFinite(taxableIncomeTHB) &&
    taxableIncomeTHB >= 0
  ) {
    const taxBeforeTHB = calculateThaiPersonalIncomeTax(taxableIncomeTHB);
    const taxAfterTHB = calculateThaiPersonalIncomeTax(
      Math.max(0, taxableIncomeTHB - taxDeductionBaseTHB),
    );
    return {
      taxDeductionBaseTHB,
      taxCreditTHB: Math.max(0, taxBeforeTHB - taxAfterTHB),
      taxBenefitConfirmed: true,
    };
  }

  const marginalTaxRatePercent = options.marginalTaxRatePercent;
  if (
    marginalTaxRatePercent !== null &&
    marginalTaxRatePercent !== undefined &&
    Number.isFinite(marginalTaxRatePercent) &&
    marginalTaxRatePercent >= 0 &&
    marginalTaxRatePercent <= 35
  ) {
    return {
      taxDeductionBaseTHB,
      taxCreditTHB: taxDeductionBaseTHB * (marginalTaxRatePercent / 100),
      taxBenefitConfirmed: true,
    };
  }

  return { taxDeductionBaseTHB, taxCreditTHB: 0, taxBenefitConfirmed: false };
}

export function calculateFinanceSelection(
  suggestedSellPriceTHB: number,
  selectedFinanceIds: string[],
  options: FinanceCalculationOptions = {},
): FinanceSelectionSummary {
  const normalizedFinanceIds = normalizeFinanceProductIds(selectedFinanceIds);
  const appliedProducts = FINANCE_PRODUCTS.filter((product) =>
    normalizedFinanceIds.includes(product.id),
  );
  const calculationDate = options.calculationDate || new Date().toISOString().slice(0, 10);
  const policyWarnings = appliedProducts.flatMap((product) => {
    if (product.status === "expired" || !isPolicyCurrent(product.validTo, calculationDate)) {
      return [`${product.name} is outside its published validity window and must be re-verified.`];
    }
    return [];
  });

  const totalSubsidyTHB = appliedProducts
    .filter((product) => product.type === "subsidy")
    .reduce(
      (sum, product) =>
        sum +
        Math.min(
          product.subsidyTHB || 0,
          product.maxSubsidyTHB || product.subsidyTHB || 0,
        ),
      0,
    );

  const tax = calculateTaxBenefit(suggestedSellPriceTHB, appliedProducts, options);
  if (tax.taxDeductionBaseTHB > 0 && !tax.taxBenefitConfirmed) {
    policyWarnings.push(
      "The THB 200,000 policy is a taxable-income deduction, not a cash rebate. No tax saving is included until taxable income or an explicit marginal rate is supplied.",
    );
  }

  const cashPriceAfterSubsidyTHB = Math.max(0, suggestedSellPriceTHB - totalSubsidyTHB);
  const financeAdjustedPriceTHB = Math.max(0, cashPriceAfterSubsidyTHB - tax.taxCreditTHB);
  const financeProduct = appliedProducts.find(isFinancingProduct);

  if (!financeProduct || !financeProduct.termMonths) {
    return {
      appliedProducts,
      totalSubsidyTHB,
      taxDeductionBaseTHB: tax.taxDeductionBaseTHB,
      taxCreditTHB: tax.taxCreditTHB,
      taxBenefitConfirmed: tax.taxBenefitConfirmed,
      cashPriceAfterSubsidyTHB,
      financeAdjustedPriceTHB,
      downPaymentTHB: cashPriceAfterSubsidyTHB,
      financedPrincipalTHB: 0,
      totalFeesTHB: 0,
      annualLoanPaymentTHB: 0,
      totalInterestTHB: 0,
      totalDebtServiceTHB: 0,
      paymentSchedule: [],
      policyWarnings,
    };
  }

  const loanToValueRatio = Math.min(1, Math.max(0, financeProduct.loanToValueRatio ?? 1));
  const rawPrincipalTHB = cashPriceAfterSubsidyTHB * loanToValueRatio;
  const financedPrincipalTHB = Math.max(
    0,
    Math.min(rawPrincipalTHB, financeProduct.maximumLoanTHB ?? rawPrincipalTHB),
  );
  const downPaymentTHB = Math.max(0, cashPriceAfterSubsidyTHB - financedPrincipalTHB);
  const totalFeesTHB =
    (financeProduct.fixedFeeTHB || 0) +
    financedPrincipalTHB * ((financeProduct.feeRatePercent || 0) / 100);
  const paymentSchedule = buildPaymentSchedule(financedPrincipalTHB, financeProduct);
  const totalDebtServiceTHB = paymentSchedule.reduce(
    (sum, entry) => sum + entry.paymentTHB,
    0,
  );
  const totalInterestTHB = paymentSchedule.reduce(
    (sum, entry) => sum + entry.interestTHB,
    0,
  );
  const firstYearSchedule = paymentSchedule.slice(0, 12);
  const annualLoanPaymentTHB = firstYearSchedule.reduce(
    (sum, entry) => sum + entry.paymentTHB,
    0,
  );
  const monthlyPaymentTHB = paymentSchedule[0]?.paymentTHB;
  const highestMonthlyPaymentTHB = paymentSchedule.reduce(
    (highest, entry) => Math.max(highest, entry.paymentTHB),
    0,
  );

  if (
    financeProduct.minimumLoanTHB &&
    financedPrincipalTHB < financeProduct.minimumLoanTHB
  ) {
    policyWarnings.push(
      `${financeProduct.name} has a published minimum loan of THB ${financeProduct.minimumLoanTHB.toLocaleString("en-US")}.`,
    );
  }

  return {
    appliedProducts,
    totalSubsidyTHB,
    taxDeductionBaseTHB: tax.taxDeductionBaseTHB,
    taxCreditTHB: tax.taxCreditTHB,
    taxBenefitConfirmed: tax.taxBenefitConfirmed,
    cashPriceAfterSubsidyTHB,
    financeAdjustedPriceTHB,
    downPaymentTHB,
    financedPrincipalTHB,
    totalFeesTHB,
    monthlyPaymentTHB,
    highestMonthlyPaymentTHB,
    annualLoanPaymentTHB,
    totalInterestTHB,
    totalDebtServiceTHB,
    paymentSchedule,
    policyWarnings,
    affordabilityNote:
      "Reference scenario only. Approval, collateral, insurance, fees, credit profile, and floating reference rates are determined by the provider.",
  };
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
    if (!Number.isFinite(nextRate) || nextRate <= -0.9999) {
      return null;
    }

    if (Math.abs(nextRate - rate) < 1e-7) {
      return nextRate;
    }

    rate = nextRate;
  }

  return Number.isFinite(rate) && rate > -0.9999 ? rate : null;
}

function findPaybackYears(cashFlows: number[], discountRate = 0) {
  let cumulativeTHB = 0;

  for (let year = 0; year < cashFlows.length; year += 1) {
    const cashFlowTHB = cashFlows[year]! / Math.pow(1 + discountRate, year);
    const previousCumulativeTHB = cumulativeTHB;
    cumulativeTHB += cashFlowTHB;

    if (year > 0 && cumulativeTHB >= 0) {
      const recoveredDuringYearTHB = cumulativeTHB - previousCumulativeTHB;
      const fraction =
        recoveredDuringYearTHB > 0
          ? Math.min(1, Math.max(0, -previousCumulativeTHB / recoveredDuringYearTHB))
          : 0;
      return year - 1 + fraction;
    }
  }

  return null;
}

export function calculateProjectReturns(input: {
  upfrontCostTHB: number;
  annualSavingsTHB: number;
  discountRatePercent?: number;
  annualOMTHB?: number;
  inverterReplacementYear?: number | null;
  inverterReplacementCostTHB?: number;
}): ProjectReturnsSummary {
  const discountRatePercent = input.discountRatePercent ?? 7;
  const discountRate = Math.max(0, discountRatePercent) / 100;
  const annualOMTHB =
    input.annualOMTHB ?? input.upfrontCostTHB * SOLAR_DEFAULTS.annualOMRatio;
  const cashFlows = [-Math.max(0, input.upfrontCostTHB)];

  for (let year = 1; year <= SOLAR_DEFAULTS.projectLifeYears; year += 1) {
    const generationFactor = Math.pow(1 - SOLAR_DEFAULTS.degradationRatio, year - 1);
    const tariffFactor = Math.pow(1 + SOLAR_DEFAULTS.tariffEscalationRatio, year - 1);
    const replacementCostTHB =
      input.inverterReplacementYear === year
        ? Math.max(0, input.inverterReplacementCostTHB || 0)
        : 0;
    const netCashFlowTHB =
      input.annualSavingsTHB * generationFactor * tariffFactor -
      annualOMTHB -
      replacementCostTHB;
    cashFlows.push(netCashFlowTHB);
  }

  const irr = internalRateOfReturn(cashFlows);
  const npvTHB = cashFlows.reduce(
    (sum, cashFlowTHB, year) => sum + cashFlowTHB / Math.pow(1 + discountRate, year),
    0,
  );

  return {
    paybackYears: findPaybackYears(cashFlows),
    discountedPaybackYears: findPaybackYears(cashFlows, discountRate),
    irrPercent: irr === null ? null : irr * 100,
    npvTHB,
    lifetimeNetSavingsTHB: cashFlows.reduce((sum, cashFlowTHB) => sum + cashFlowTHB, 0),
    discountRatePercent,
    annualCashFlowsTHB: cashFlows,
  };
}
