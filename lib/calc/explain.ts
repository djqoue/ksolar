import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils";
import type { BomScenario } from "@/types/bom";
import type { FinanceSelectionSummary } from "@/types/finance";
import type { CalculationExplanation } from "@/types/quote";

export function buildCalculationExplanation(input: {
  grossAreaM2: number;
  usableAreaM2: number;
  panelCount: number;
  systemSizeWp: number;
  quotedSystemSizeWp: number;
  annualGenerationKWh: number;
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
      description: "Map area is derated first, then converted into standard panel count and conservative package size.",
      metrics: {
        "Gross area (m²)": formatNumber(input.grossAreaM2, 1),
        "Usable area (m²)": formatNumber(input.usableAreaM2, 1),
        "Supported panels": input.panelCount,
        "System size": `${formatNumber(input.systemSizeWp / 1000, 2)} kWp`,
        "Quoted package size": `${formatNumber(input.quotedSystemSizeWp / 1000, 2)} kWp`,
      },
    },
    {
      key: "generation",
      title: "Generation and tariff logic",
      description: "Annual energy is driven by 4.0 sun-hours, 15% system loss, and net-billing savings from self-use plus export.",
      metrics: {
        "Annual generation": `${formatNumber(input.annualGenerationKWh)} kWh`,
        "Retail rate": `${formatNumber(input.retailRateTHBPerKWh, 2)} THB/kWh`,
        "Self-use ratio": formatPercent(input.selfConsumptionRatio * 100),
        "Export rate": `${formatNumber(input.exportRateTHBPerKWh, 2)} THB/kWh`,
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
        "Tax deduction": formatCurrency(input.finance.taxCreditTHB),
        "Net customer price": formatCurrency(input.finance.financeAdjustedPriceTHB),
        "Monthly payment": input.finance.monthlyPaymentTHB
          ? formatCurrency(input.finance.monthlyPaymentTHB)
          : "N/A",
        Payback: input.paybackYears ? `${formatNumber(input.paybackYears, 1)} years` : "N/A",
        IRR: input.irrPercent ? formatPercent(input.irrPercent, 1) : "N/A",
      },
    },
  ];
}
