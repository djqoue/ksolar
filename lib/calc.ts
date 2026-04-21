import { buildBomScenario } from "@/lib/calc/bom";
import { buildCalculationExplanation } from "@/lib/calc/explain";
import { calculateFinanceSelection, calculateProjectReturns } from "@/lib/calc/finance";
import { calculateGeneration } from "@/lib/calc/generation";
import { buildSuggestedPrice } from "@/lib/calc/pricing";
import { calculateRoofPotential } from "@/lib/calc/roof";
import { recommendCapacityTier } from "@/lib/calc/sizing";
import { calculateTariffValue } from "@/lib/calc/tariff";
import { findBattery } from "@/lib/config/battery-catalog";
import { findInverter } from "@/lib/config/inverter-catalog";
import { findPanel } from "@/lib/config/panel-catalog";
import { SOLAR_DEFAULTS } from "@/lib/config/solar";
import type { QuoteScenarioInput, QuoteScenarioResult } from "@/types/quote";

const GOOGLE_SELECTION_MISMATCH_WARNING =
  "Google Solar is not matched to the selected roof. Redraw the roof or re-center the map before trusting the quote.";
const PACKAGE_CAP_WARNING =
  "Current package is capped below the estimated roof fit. Review whether the customer site should use a larger package or switch phase.";

export function calculateQuoteScenario(input: QuoteScenarioInput): QuoteScenarioResult {
  const roof = calculateRoofPotential(input.map);
  const roofFitPanelCount =
    input.googleMatchedRoof && input.googleSellablePanelCount !== null && input.googleSellablePanelCount !== undefined
      ? input.googleSellablePanelCount
      : roof.panelCount;
  const roofFitSystemWp =
    input.googleMatchedRoof && input.googleSellableFitWp !== null && input.googleSellableFitWp !== undefined
      ? input.googleSellableFitWp
      : roofFitPanelCount * SOLAR_DEFAULTS.panelPowerWp;
  const roofPotentialGeneration = calculateGeneration(roofFitSystemWp);
  const roofPotentialAnnualGenerationKWh =
    input.googleMatchedRoof && input.googleAnnualGenerationKWh !== null && input.googleAnnualGenerationKWh !== undefined
      ? input.googleAnnualGenerationKWh
      : roofPotentialGeneration.annualGenerationKWh;
  const tierRecommendation = recommendCapacityTier(input.topology.phase, roofFitPanelCount);
  const warnings = [...tierRecommendation.warnings];

  if (input.googleMatchedRoof === false) {
    warnings.push(GOOGLE_SELECTION_MISMATCH_WARNING);
  }

  if (!tierRecommendation.tier) {
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
      annualSavingsTHB: 0,
      hardwareCostTHB: 0,
      suggestedSellPriceTHB: 0,
      finance: {
        appliedProducts: [],
        totalSubsidyTHB: 0,
        taxCreditTHB: 0,
        financeAdjustedPriceTHB: 0,
        totalInterestTHB: 0,
      },
      paybackYears: null,
      irrPercent: null,
      bom: null,
      explanation: [],
    };
  }

  if (roofFitSystemWp > tierRecommendation.tier.nominalWp + SOLAR_DEFAULTS.panelPowerWp / 2) {
    warnings.push(PACKAGE_CAP_WARNING);
  }

  const generation = calculateGeneration(tierRecommendation.tier.nominalWp);
  const tariff = calculateTariffValue({
    annualGenerationKWh: generation.annualGenerationKWh,
    ftRateTHBPerKWh: input.ftRateTHBPerKWh,
    selfConsumptionRatio: input.selfConsumptionRatio,
    exportRateTHBPerKWh: input.exportRateTHBPerKWh,
  });
  // Resolve equipment overrides from catalog selections
  const selectedPanel = input.selectedPanelId ? findPanel(input.selectedPanelId) : undefined;
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
      selectedPanel?.unitCostTHB != null
        ? {
            model: `${selectedPanel.manufacturer} ${selectedPanel.model} (${selectedPanel.peakPowerW}W)`,
            unitCostTHB: selectedPanel.unitCostTHB,
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

  const bom = buildBomScenario(input.topology, tierRecommendation.tier, equipmentOverrides);

  if (!bom) {
    return {
      isViable: false,
      warnings: ["No BOM template matches the selected phase, mode, and battery combination."],
      recommendedTier: tierRecommendation.tier,
      usableAreaM2: roof.usableAreaM2,
      panelCount: roofFitPanelCount,
      roofFitPanelCount,
      roofFitSystemWp,
      roofPotentialAnnualGenerationKWh,
      quotedSystemSizeWp: tierRecommendation.tier.nominalWp,
      systemSizeWp: roofFitSystemWp,
      annualGenerationKWh: generation.annualGenerationKWh,
      annualSavingsTHB: tariff.annualSavingsTHB,
      hardwareCostTHB: 0,
      suggestedSellPriceTHB: 0,
      finance: {
        appliedProducts: [],
        totalSubsidyTHB: 0,
        taxCreditTHB: 0,
        financeAdjustedPriceTHB: 0,
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
    tierId: tierRecommendation.tier.id,
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
    recommendedTier: tierRecommendation.tier,
    usableAreaM2: roof.usableAreaM2,
    panelCount: roofFitPanelCount,
    roofFitPanelCount,
    roofFitSystemWp,
    roofPotentialAnnualGenerationKWh,
    quotedSystemSizeWp: tierRecommendation.tier.nominalWp,
    systemSizeWp: roofFitSystemWp,
    annualGenerationKWh: generation.annualGenerationKWh,
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
      panelCount: roofFitPanelCount,
      systemSizeWp: roofFitSystemWp,
      roofPotentialAnnualGenerationKWh,
      quotedSystemSizeWp: tierRecommendation.tier.nominalWp,
      annualGenerationKWh: generation.annualGenerationKWh,
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
