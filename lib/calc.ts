import { buildBomScenario } from "@/lib/calc/bom";
import { buildCalculationExplanation } from "@/lib/calc/explain";
import { calculateFinanceSelection, calculateProjectReturns } from "@/lib/calc/finance";
import { calculateGeneration } from "@/lib/calc/generation";
import { buildSuggestedPrice } from "@/lib/calc/pricing";
import { calculateRoofPotential } from "@/lib/calc/roof";
import { findSelectableTier, recommendCapacityTier } from "@/lib/calc/sizing";
import { calculateTariffValue } from "@/lib/calc/tariff";
import { findBattery } from "@/lib/config/battery-catalog";
import { findInverter } from "@/lib/config/inverter-catalog";
import { DEFAULT_PANEL_ID, findPanel, getPanelAreaM2 } from "@/lib/config/panel-catalog";
import { SOLAR_DEFAULTS } from "@/lib/config/solar";
import type { QuoteScenarioInput, QuoteScenarioResult } from "@/types/quote";

const GOOGLE_SELECTION_MISMATCH_WARNING =
  "Google Solar is not matched to the selected roof. Redraw the roof or re-center the map before trusting the quote.";
const PACKAGE_CAP_WARNING =
  "Current package is capped below the estimated roof fit. Review whether the customer site should use a larger package or switch phase.";

export function calculateQuoteScenario(input: QuoteScenarioInput): QuoteScenarioResult {
  const selectedPanel = findPanel(input.selectedPanelId || DEFAULT_PANEL_ID);
  const selectedPanelOverride = input.selectedPanelId ? selectedPanel : undefined;
  const selectedPanelPowerWp = selectedPanel?.peakPowerW || SOLAR_DEFAULTS.panelPowerWp;
  const selectedPanelAreaM2 = getPanelAreaM2(selectedPanel) || SOLAR_DEFAULTS.panelAreaM2;
  const roof = calculateRoofPotential(input.map, {
    panelAreaM2: selectedPanelAreaM2,
    panelPowerWp: selectedPanelPowerWp,
  });
  const roofFitPanelCount =
    input.googleMatchedRoof && input.googleSellablePanelCount !== null && input.googleSellablePanelCount !== undefined
      ? input.googleSellablePanelCount
      : roof.panelCount;
  const roofFitSystemWp =
    input.googleMatchedRoof && input.googleSellableFitWp !== null && input.googleSellableFitWp !== undefined
      ? input.googleSellableFitWp
      : roofFitPanelCount * selectedPanelPowerWp;
  const roofPotentialGeneration = calculateGeneration(roofFitSystemWp);
  const roofPotentialAnnualGenerationKWh =
    input.googleMatchedRoof && input.googleAnnualGenerationKWh !== null && input.googleAnnualGenerationKWh !== undefined
      ? input.googleAnnualGenerationKWh
      : roofPotentialGeneration.annualGenerationKWh;
  const tierRecommendation = recommendCapacityTier(input.topology.phase, roofFitPanelCount);
  const selectedTier = findSelectableTier(
    input.topology.phase,
    roofFitPanelCount,
    input.selectedTierId,
  );
  const quotedTier = selectedTier || tierRecommendation.tier;
  const warnings = [...tierRecommendation.warnings];

  if (input.googleMatchedRoof === false) {
    warnings.push(GOOGLE_SELECTION_MISMATCH_WARNING);
  }

  if (!quotedTier) {
    return {
      isViable: false,
      warnings,
      recommendedTier: null,
      usableAreaM2: roof.usableAreaM2,
      panelCount: roofFitPanelCount,
      roofFitPanelCount,
      roofFitSystemWp,
      roofPotentialAnnualGenerationKWh,
      quotedSystemSizeWp: 0,
      systemSizeWp: roofFitSystemWp || roof.theoreticalWp,
      annualGenerationKWh: 0,
      annualSelfUseKWh: 0,
      annualExportKWh: 0,
      annualSelfUseSavingsTHB: 0,
      annualExportRevenueTHB: 0,
      annualSavingsTHB: 0,
      hardwareCostTHB: 0,
      suggestedSellPriceTHB: 0,
      finance: {
        appliedProducts: [],
        totalSubsidyTHB: 0,
        taxDeductionBaseTHB: 0,
        taxCreditTHB: 0,
        cashPriceAfterSubsidyTHB: 0,
        financeAdjustedPriceTHB: 0,
        downPaymentTHB: 0,
        financedPrincipalTHB: 0,
        annualLoanPaymentTHB: 0,
        totalInterestTHB: 0,
      },
      paybackYears: null,
      irrPercent: null,
      bom: null,
      explanation: [],
    };
  }

  const quotedSystemSizeWp = quotedTier.panelCount * selectedPanelPowerWp;

  if (!selectedTier && roofFitSystemWp > quotedSystemSizeWp + selectedPanelPowerWp / 2) {
    warnings.push(PACKAGE_CAP_WARNING);
  }

  const generation = calculateGeneration(quotedSystemSizeWp);
  const tariff = calculateTariffValue({
    annualGenerationKWh: generation.annualGenerationKWh,
    ftRateTHBPerKWh: input.ftRateTHBPerKWh,
    selfConsumptionRatio: input.selfConsumptionRatio,
    exportRateTHBPerKWh: input.exportRateTHBPerKWh,
  });
  // Resolve equipment overrides from catalog selections
  const selectedInverter =
    input.selectedInverterId && input.selectedInverterId !== "auto"
      ? findInverter(input.selectedInverterId)
      : undefined;
  const selectedBattery =
    input.selectedBatteryId && input.selectedBatteryId !== "auto"
      ? findBattery(input.selectedBatteryId)
      : undefined;

  const equipmentOverrides = {
    panel:
      selectedPanelOverride?.unitCostTHB != null
        ? {
            model: `${selectedPanelOverride.manufacturer} ${selectedPanelOverride.model} (${selectedPanelOverride.peakPowerW}W)`,
            unitCostTHB: selectedPanelOverride.unitCostTHB,
          }
        : undefined,
    inverter:
      selectedInverter?.unitCostTHB != null
        ? {
            model: `${selectedInverter.manufacturer} ${selectedInverter.model}`,
            unitCostTHB: selectedInverter.unitCostTHB,
          }
        : undefined,
    battery:
      selectedBattery
        ? {
            model: `${selectedBattery.manufacturer} ${selectedBattery.model} (${selectedBattery.capacityKWh}kWh)`,
            unitCostTHB: selectedBattery.unitCostTHB,
          }
        : undefined,
  };

  const bom = buildBomScenario(input.topology, quotedTier, equipmentOverrides);

  if (!bom) {
    return {
      isViable: false,
      warnings: ["No BOM template matches the selected phase, mode, and battery combination."],
      recommendedTier: quotedTier,
      usableAreaM2: roof.usableAreaM2,
      panelCount: roofFitPanelCount,
      roofFitPanelCount,
      roofFitSystemWp,
      roofPotentialAnnualGenerationKWh,
      quotedSystemSizeWp,
      systemSizeWp: roofFitSystemWp,
      annualGenerationKWh: generation.annualGenerationKWh,
      annualSelfUseKWh: tariff.annualSelfUseKWh,
      annualExportKWh: tariff.annualExportKWh,
      annualSelfUseSavingsTHB: tariff.annualSelfUseSavingsTHB,
      annualExportRevenueTHB: tariff.annualExportRevenueTHB,
      annualSavingsTHB: tariff.annualSavingsTHB,
      hardwareCostTHB: 0,
      suggestedSellPriceTHB: 0,
      finance: {
        appliedProducts: [],
        totalSubsidyTHB: 0,
        taxDeductionBaseTHB: 0,
        taxCreditTHB: 0,
        cashPriceAfterSubsidyTHB: 0,
        financeAdjustedPriceTHB: 0,
        downPaymentTHB: 0,
        financedPrincipalTHB: 0,
        annualLoanPaymentTHB: 0,
        totalInterestTHB: 0,
      },
      paybackYears: null,
      irrPercent: null,
      bom: null,
      explanation: [],
    };
  }

  const pricing = buildSuggestedPrice({
    hardwareCostTHB: bom.hardwareCostTHB,
    pricingPresetId: input.pricingPresetId,
    tierId: quotedTier.id,
    topology: input.topology,
  });
  const finance = calculateFinanceSelection(pricing.suggestedSellPriceTHB, input.selectedFinanceIds);
  const returns = calculateProjectReturns({
    upfrontCostTHB: finance.financeAdjustedPriceTHB,
    annualSavingsTHB: tariff.annualSavingsTHB,
  });

  return {
    isViable: true,
    warnings,
    recommendedTier: quotedTier,
    usableAreaM2: roof.usableAreaM2,
    panelCount: roofFitPanelCount,
    roofFitPanelCount,
    roofFitSystemWp,
    roofPotentialAnnualGenerationKWh,
    quotedSystemSizeWp,
    systemSizeWp: roofFitSystemWp,
    annualGenerationKWh: generation.annualGenerationKWh,
    annualSelfUseKWh: tariff.annualSelfUseKWh,
    annualExportKWh: tariff.annualExportKWh,
    annualSelfUseSavingsTHB: tariff.annualSelfUseSavingsTHB,
    annualExportRevenueTHB: tariff.annualExportRevenueTHB,
    annualSavingsTHB: tariff.annualSavingsTHB,
    hardwareCostTHB: bom.hardwareCostTHB,
    suggestedSellPriceTHB: pricing.suggestedSellPriceTHB,
    finance,
    paybackYears: returns.paybackYears,
    irrPercent: returns.irrPercent,
    benchmarkLowTHB: pricing.benchmarkLowTHB,
    benchmarkHighTHB: pricing.benchmarkHighTHB,
    bom,
    explanation: buildCalculationExplanation({
      grossAreaM2: roof.grossAreaM2,
      usableAreaM2: roof.usableAreaM2,
      panelAreaM2: selectedPanelAreaM2,
      panelPowerWp: selectedPanelPowerWp,
      panelCount: roofFitPanelCount,
      quotedPanelCount: quotedTier.panelCount,
      systemSizeWp: roofFitSystemWp,
      roofPotentialAnnualGenerationKWh,
      quotedSystemSizeWp,
      annualGenerationKWh: generation.annualGenerationKWh,
      annualSelfUseSavingsTHB: tariff.annualSelfUseSavingsTHB,
      annualExportRevenueTHB: tariff.annualExportRevenueTHB,
      annualSavingsTHB: tariff.annualSavingsTHB,
      selfConsumptionRatio: input.selfConsumptionRatio,
      retailRateTHBPerKWh: tariff.retailRateTHBPerKWh,
      exportRateTHBPerKWh: input.exportRateTHBPerKWh,
      bom,
      suggestedSellPriceTHB: pricing.suggestedSellPriceTHB,
      finance,
      paybackYears: returns.paybackYears,
      irrPercent: returns.irrPercent,
    }),
  };
}
