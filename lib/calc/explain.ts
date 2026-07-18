import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils";
import type { BomScenario } from "@/types/bom";
import type { FinanceSelectionSummary } from "@/types/finance";
import type { GenerationModel } from "@/lib/calc/generation";
import type { CalculationExplanation } from "@/types/quote";

export function buildCalculationExplanation(input: {
  grossAreaM2: number;
  usableAreaM2: number;
  panelAreaM2: number;
  panelPowerWp: number;
  panelCount: number;
  quotedPanelCount: number;
  systemSizeWp: number;
  roofPotentialAnnualGenerationKWh: number;
  quotedSystemSizeWp: number;
  annualGenerationKWh: number;
  generationModel: GenerationModel;
  generationSpecificYieldKWhPerKWp: number;
  generationSystemLossRatio: number;
  annualSelfUseSavingsTHB: number;
  annualExportRevenueTHB: number;
  annualSavingsTHB: number;
  selfConsumptionRatio: number;
  retailRateTHBPerKWh: number;
  exportRateTHBPerKWh: number;
  bom: BomScenario | null;
  suggestedSellPriceTHB: number;
  finance: FinanceSelectionSummary;
  paybackYears: number | null;
  irrPercent: number | null;
}): CalculationExplanation[] {
  return [
    {
      key: "roof",
      title: "Roof-to-capacity logic",
      description:
        "Map area is derated first, then converted into roof-fit potential. The formal package is selected later from phase rules and BOM limits.",
      metrics: {
        "Gross area (m²)": formatNumber(input.grossAreaM2, 1),
        "Usable area (m²)": formatNumber(input.usableAreaM2, 1),
        "Selected panel footprint": `${formatNumber(input.panelAreaM2, 2)} m²`,
        "Selected panel power": `${formatNumber(input.panelPowerWp)} W`,
        "Roof-fit supported panels": input.panelCount,
        "Roof-fit size": `${formatNumber(input.systemSizeWp / 1000, 2)} kWp`,
        "Roof-potential generation": `${formatNumber(input.roofPotentialAnnualGenerationKWh)} kWh`,
        "Quoted package panels": input.quotedPanelCount,
        "Quoted package size": `${formatNumber(input.quotedSystemSizeWp / 1000, 2)} kWp`,
      },
    },
    {
      key: "generation",
      title: "Generation and tariff logic",
      description:
        "Roof potential is an engineering estimate. Formal annual energy and savings are based on the quoted package after phase and topology are confirmed.",
      metrics: {
        "Generation source":
          input.generationModel === "google-solar-calibrated"
            ? "Google Solar calibrated"
            : "Thailand default",
        "Specific yield": `${formatNumber(input.generationSpecificYieldKWhPerKWp, 0)} kWh/kWp/yr`,
        "System loss": formatPercent(input.generationSystemLossRatio * 100),
        "Quoted annual generation": `${formatNumber(input.annualGenerationKWh)} kWh`,
        "Retail rate": `${formatNumber(input.retailRateTHBPerKWh, 2)} THB/kWh`,
        "Self-use ratio": formatPercent(input.selfConsumptionRatio * 100),
        "Export rate": `${formatNumber(input.exportRateTHBPerKWh, 2)} THB/kWh`,
        "Self-use savings": formatCurrency(input.annualSelfUseSavingsTHB),
        "Export revenue": formatCurrency(input.annualExportRevenueTHB),
        "Annual bill savings": formatCurrency(input.annualSavingsTHB),
      },
    },
    {
      key: "bom",
      title: "BOM and price logic",
      description: "All system hardware is built from code-defined templates, then converted into a sell price using preset margin and market guardrails.",
      metrics: {
        "Hardware cost": formatCurrency(input.bom?.hardwareCostTHB || 0),
        "Panels": formatCurrency(input.bom?.categoryTotals.panel || 0),
        "Inverter": formatCurrency(input.bom?.categoryTotals.inverter || 0),
        "Battery": formatCurrency(input.bom?.categoryTotals.battery || 0),
        "Suggested sell price": formatCurrency(input.suggestedSellPriceTHB),
      },
    },
    {
      key: "finance",
      title: "Finance and ROI logic",
      description: "Subsidies and tax benefits reduce customer capex. Financing is surfaced separately so affordability does not distort base project ROI.",
      metrics: {
        "Applied subsidy": formatCurrency(input.finance.totalSubsidyTHB),
        "Tax deduction base": formatCurrency(input.finance.taxDeductionBaseTHB),
        "Estimated tax benefit": formatCurrency(input.finance.taxCreditTHB),
        "Effective customer cost": formatCurrency(input.finance.financeAdjustedPriceTHB),
        "Down payment estimate": formatCurrency(input.finance.downPaymentTHB),
        "Financed principal": formatCurrency(input.finance.financedPrincipalTHB),
        "Monthly payment": input.finance.monthlyPaymentTHB
          ? formatCurrency(input.finance.monthlyPaymentTHB)
          : "N/A",
        Payback: input.paybackYears ? `${formatNumber(input.paybackYears, 1)} years` : "N/A",
        IRR: input.irrPercent ? formatPercent(input.irrPercent, 1) : "N/A",
      },
    },
  ];
}
