import { THAILAND_ENERGY_POLICY } from "@/lib/config/thailand-energy-policy";
import type { FinanceProduct } from "@/types/finance";

/**
 * Only publicly verifiable products belong here. Product availability and
 * approval always remain subject to the provider's final underwriting.
 */
export const FINANCE_PRODUCTS: FinanceProduct[] = [
  {
    id: "gsb-solar-for-life-clean-7y",
    name: "GSB Solar for Life · Clean Loan",
    type: "loan",
    enabledByDefault: false,
    customerSegments: ["residential"],
    status: "confirmed",
    termMonths: 84,
    loanToValueRatio: 0.8,
    maximumLoanTHB: 500_000,
    rateSchedule: [
      {
        startMonth: 1,
        endMonth: 24,
        annualRatePercent: 3.5,
        rateType: "fixed",
      },
      {
        startMonth: 25,
        endMonth: 60,
        annualRatePercent: 5,
        rateType: "fixed",
      },
      {
        startMonth: 61,
        endMonth: 84,
        annualRatePercent: 6.045,
        rateType: "floating-reference",
        referenceRateName: "GSB MRR",
        referenceRateAsOf: "2026-03-02",
      },
    ],
    validFrom: "2026-03-02",
    validTo: "2027-03-31",
    lastVerifiedAt: "2026-07-18",
    officialSourceUrl: "https://www.gsb.or.th/promotions/gsbsolar4life/",
    eligibility:
      "Individual borrower; clean-loan limit up to THB 500,000. The published general-customer schedule assumes 20% down payment.",
    collateral: "No collateral for this clean-loan model; guarantor/insurance conditions may apply.",
    notes:
      "Years 1-2: 3.50%; years 3-5: 5.00%; year 6 onward uses the floating GSB MRR benchmark (6.045% as of 2 Mar 2026).",
  },
  {
    id: "kbank-sme-solar-5y",
    name: "KBank SME Solar Rooftop · up to 5 years",
    type: "loan",
    enabledByDefault: false,
    customerSegments: ["sme"],
    status: "confirmed",
    termMonths: 60,
    loanToValueRatio: 1,
    rateSchedule: [
      {
        startMonth: 1,
        endMonth: 60,
        annualRatePercent: 5.52,
        rateType: "floating-reference",
        referenceRateName: "KBank MLR 6.52% minus 1.00%",
        referenceRateAsOf: "2026-03-02",
      },
    ],
    validTo: "2026-12-31",
    lastVerifiedAt: "2026-07-18",
    officialSourceUrl:
      "https://www.kasikornbank.com/th/business/sme/loan/special-loan/pages/k-energy-saving-guarantee-program-solar-rooftop.aspx",
    eligibility:
      "Thai legal entity or registered commercial individual, normally operating for at least three years; equipment and project assessment must meet bank rules.",
    collateral: "Collateral and final credit conditions are determined by KBank.",
    notes:
      "Published as MLR−1.00% for tenor up to 5 years. The model uses KBank MLR 6.52% effective 2 Mar 2026, so the reference rate is 5.52% and can change.",
  },
  {
    id: "kbank-sme-solar-8y",
    name: "KBank SME Solar Rooftop · up to 8 years",
    type: "loan",
    enabledByDefault: false,
    customerSegments: ["sme"],
    status: "confirmed",
    termMonths: 96,
    loanToValueRatio: 1,
    rateSchedule: [
      {
        startMonth: 1,
        endMonth: 96,
        annualRatePercent: 5.72,
        rateType: "floating-reference",
        referenceRateName: "KBank MLR 6.52% minus 0.80%",
        referenceRateAsOf: "2026-03-02",
      },
    ],
    validTo: "2026-12-31",
    lastVerifiedAt: "2026-07-18",
    officialSourceUrl:
      "https://www.kasikornbank.com/th/business/sme/loan/special-loan/pages/k-energy-saving-guarantee-program-solar-rooftop.aspx",
    eligibility:
      "Thai legal entity or registered commercial individual, normally operating for at least three years; equipment and project assessment must meet bank rules.",
    collateral: "Collateral and final credit conditions are determined by KBank.",
    notes:
      "Published as MLR−0.80% for tenor above 5 and up to 8 years. The model uses KBank MLR 6.52% effective 2 Mar 2026, so the reference rate is 5.72% and can change.",
  },
  {
    id: "personal-income-tax-deduction",
    name: "Thailand residential Solar Rooftop tax deduction",
    type: "tax_deduction",
    enabledByDefault: false,
    customerSegments: ["residential"],
    status: "confirmed",
    maxSubsidyTHB: THAILAND_ENERGY_POLICY.residentialTaxDeduction.maximumDeductionTHB,
    validFrom: THAILAND_ENERGY_POLICY.residentialTaxDeduction.validFrom,
    validTo: THAILAND_ENERGY_POLICY.residentialTaxDeduction.validTo,
    lastVerifiedAt: THAILAND_ENERGY_POLICY.lastVerifiedAt,
    officialSourceUrl: THAILAND_ENERGY_POLICY.residentialTaxDeduction.sourceUrl,
    eligibility:
      "Individual taxpayer; qualifying grid-connected residential rooftop; full e-Tax invoice from a VAT-registered supplier; no duplicate incentive claim.",
    notes:
      "This is a deduction from taxable income, not a THB 200,000 rebate. KSolar calculates a benefit only when taxable income or an explicit marginal tax rate is provided.",
  },
];
