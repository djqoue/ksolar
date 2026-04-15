import { buildBomScenario } from "@/lib/calc/bom";
import { buildCalculationExplanation } from "@/lib/calc/explain";
import { calculateFinanceSelection, calculateProjectReturns } from "@/lib/calc/finance";
import { calculateGeneration } from "@/lib/calc/generation";
import { buildSuggestedPrice } from "@/lib/calc/pricing";
import { calculateRoofPotential } from "@/lib/calc/roof";
import { recommendCapacityTier } from "@/lib/calc/sizing";
import { calculateTariffValue } from "@/lib/calc/tariff";
import type { QuoteScenarioInput, QuoteScenarioResult } from "@/types/quote";

const GOOGLE_SELECTION_MISMATCH_WARNING =
  "Google Solar is not matched to the selected roof. Redraw the roof or re-center the map before trusting the quote.";

export function calculateQuoteScenario(input: QuoteScenarioInput): QuoteScenarioResult {
  const roof = calculateRoofPotential(input.map);
  const effectivePanelCount =
    input.googleMatchedRoof && input.googleSellablePanelCount !== null && input.googleSellablePanelCount !== undefined
      ? Math.min(roof.panelCount, input.googleSellablePanelCount)
      : roof.panelCount;
  const tierRecommendation = recommendCapacityTier(input.topology.phase, effectivePanelCount);
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
      panelCount: effectivePanelCount,
      systemSizeWp:
        input.googleMatchedRoof && input.googleSellableFitWp
          ? input.googleSellableFitWp
          : roof.theoreticalWp,
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

  const generation = calculateGeneration(tierRecommendation.tier.nominalWp);
  const tariff = calculateTariffValue({
    annualGenerationKWh: generation.annualGenerationKWh,
    ftRateTHBPerKWh: input.ftRateTHBPerKWh,
    selfConsumptionRatio: input.selfConsumptionRatio,
    exportRateTHBPerKWh: input.exportRateTHBPerKWh,
  });
  const bom = buildBomScenario(input.topology, tierRecommendation.tier);

  if (!bom) {
    return {
      isViable: false,
      warnings: ["No BOM template matches the selected phase, mode, and battery combination."],
      recommendedTier: tierRecommendation.tier,
      usableAreaM2: roof.usableAreaM2,
      panelCount: effectivePanelCount,
      systemSizeWp: tierRecommendation.tier.nominalWp,
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
    panelCount: effectivePanelCount,
    systemSizeWp: tierRecommendation.tier.nominalWp,
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
      panelCount: roof.panelCount,
      systemSizeWp: tierRecommendation.tier.nominalWp,
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
