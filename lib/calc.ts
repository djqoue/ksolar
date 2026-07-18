import { buildBomScenario } from "@/lib/calc/bom";
import { derivePanelRowCounts } from "@/lib/calc/bom-quantities";
import {
  checkElectricalCompatibility,
  selectCompatibleInverter,
} from "@/lib/calc/electrical-compatibility";
import { buildCalculationExplanation } from "@/lib/calc/explain";
import { calculateFinanceSelection, calculateProjectReturns } from "@/lib/calc/finance";
import { calculateGeneration } from "@/lib/calc/generation";
import { buildSuggestedPrice } from "@/lib/calc/pricing";
import { calculateRoofPotential } from "@/lib/calc/roof";
import {
  capacityIntentFromTierId,
  findSelectableTier,
  recommendCapacityTier,
  resolveCapacityIntent,
} from "@/lib/calc/sizing";
import { calculateTariffValue } from "@/lib/calc/tariff";
import { findBattery } from "@/lib/config/battery-catalog";
import { filterResidentialInverters } from "@/lib/config/inverter-catalog";
import { DEFAULT_PANEL_ID, findPanel, getPanelAreaM2 } from "@/lib/config/panel-catalog";
import { SOLAR_DEFAULTS } from "@/lib/config/solar";
import type { FinanceSelectionSummary } from "@/types/finance";
import type { CapacityTier } from "@/types/bom";
import type { QuoteScenarioInput, QuoteScenarioResult } from "@/types/quote";

const GOOGLE_SELECTION_MISMATCH_WARNING =
  "Google Solar is not matched to the selected roof. Redraw the roof or re-center the map before trusting the quote.";
const PACKAGE_CAP_WARNING =
  "Current package is capped below the estimated roof fit. Review whether the customer site should use a larger package or switch phase.";
const INCOMPATIBLE_INVERTER_WARNING =
  "Selected inverter is unavailable or incompatible with the current phase and mode. Automatic BOM selection was used instead.";
const NO_COMPATIBLE_INVERTER_WARNING =
  "No catalog inverter passes the phase, mode, DC/AC ratio, MPPT voltage, and string-input checks for this array.";
const ROOF_POTENTIAL_NOTICE =
  "Roof potential is a technical capacity assessment, not a committed package price. Select 5, 10, 15, or 20 kW to create a formal quote.";
const ENGINEERING_REVIEW_NOTICE =
  "Roof potential exceeds the committed BOM range for the selected phase. Engineering must confirm phase, inverter architecture, protection, structure, and interconnection before pricing.";

function createEmptyFinanceSelection(): FinanceSelectionSummary {
  return {
    appliedProducts: [],
    totalSubsidyTHB: 0,
    taxDeductionBaseTHB: 0,
    taxCreditTHB: 0,
    taxBenefitConfirmed: false,
    cashPriceAfterSubsidyTHB: 0,
    financeAdjustedPriceTHB: 0,
    downPaymentTHB: 0,
    financedPrincipalTHB: 0,
    totalFeesTHB: 0,
    annualLoanPaymentTHB: 0,
    totalInterestTHB: 0,
    totalDebtServiceTHB: 0,
    paymentSchedule: [],
    policyWarnings: [],
  };
}

function getGoogleSpecificYieldDcKWhPerKWp(input: {
  googleAnnualGenerationKWh?: number | null;
  googleMatchedRoof?: boolean;
  roofFitSystemWp: number;
}) {
  if (
    !input.googleMatchedRoof ||
    !input.googleAnnualGenerationKWh ||
    input.googleAnnualGenerationKWh <= 0 ||
    input.roofFitSystemWp <= 0
  ) {
    return null;
  }

  return input.googleAnnualGenerationKWh / (input.roofFitSystemWp / 1000);
}

export function calculateQuoteScenario(input: QuoteScenarioInput): QuoteScenarioResult {
  const defaultPanel = findPanel(DEFAULT_PANEL_ID);
  if (!defaultPanel) {
    throw new Error("Default panel catalog entry is missing.");
  }

  const requestedPanel = input.selectedPanelId ? findPanel(input.selectedPanelId) : undefined;
  const selectedPanel = requestedPanel || defaultPanel;
  const selectedPanelOverride = requestedPanel;
  const selectedPanelPowerWp = selectedPanel.peakPowerW || SOLAR_DEFAULTS.panelPowerWp;
  const selectedPanelAreaM2 = getPanelAreaM2(selectedPanel) || SOLAR_DEFAULTS.panelAreaM2;
  const warnings: string[] = [];

  if (input.selectedPanelId && !requestedPanel) {
    warnings.push("Selected panel is no longer in the catalog. The default panel was used.");
  }

  const roof = calculateRoofPotential(input.map, {
    panelAreaM2: selectedPanelAreaM2,
    panelPowerWp: selectedPanelPowerWp,
  });
  const roofFitPanelCount =
    input.googleMatchedRoof &&
    input.googleSellablePanelCount !== null &&
    input.googleSellablePanelCount !== undefined
      ? input.googleSellablePanelCount
      : roof.panelCount;
  const roofFitSystemWp =
    input.googleMatchedRoof &&
    input.googleSellableFitWp !== null &&
    input.googleSellableFitWp !== undefined
      ? input.googleSellableFitWp
      : roofFitPanelCount * selectedPanelPowerWp;
  const googleSpecificYieldDcKWhPerKWp = getGoogleSpecificYieldDcKWhPerKWp({
    googleAnnualGenerationKWh: input.googleAnnualGenerationKWh,
    googleMatchedRoof: input.googleMatchedRoof,
    roofFitSystemWp,
  });
  const roofPotentialGeneration = calculateGeneration(roofFitSystemWp, {
    googleSpecificYieldDcKWhPerKWp,
  });
  const roofPotentialAnnualGenerationKWh = roofPotentialGeneration.annualGenerationKWh;
  const tierRecommendation = recommendCapacityTier(
    input.topology.phase,
    roofFitPanelCount,
    selectedPanelPowerWp,
  );

  if (input.googleMatchedRoof === false) {
    warnings.push(GOOGLE_SELECTION_MISMATCH_WARNING);
  }

  if (input.capacityIntent?.mode === "roof-potential") {
    const potentialResolution = resolveCapacityIntent({
      intent: input.capacityIntent,
      phase: input.topology.phase,
      supportedPanelCount: roofFitPanelCount,
      panelPowerWp: selectedPanelPowerWp,
    });
    const potentialTariff = calculateTariffValue({
      annualGenerationKWh: roofPotentialAnnualGenerationKWh,
      ftRateTHBPerKWh: input.ftRateTHBPerKWh,
      selfConsumptionRatio: input.selfConsumptionRatio,
      exportRateTHBPerKWh: input.exportRateTHBPerKWh,
      monthlyElectricityBillTHB: input.monthlyElectricityBillTHB,
      gridExportApproved: input.gridExportApproved,
      approvedExportLimitKwAc: input.approvedExportLimitKwAc,
    });
    const finance = createEmptyFinanceSelection();

    warnings.push(ROOF_POTENTIAL_NOTICE);
    if (potentialResolution.engineeringReviewRequired) {
      warnings.push(ENGINEERING_REVIEW_NOTICE);
    }
    if (potentialResolution.unavailableReason) {
      warnings.push(potentialResolution.unavailableReason);
    }

    const explanation = buildCalculationExplanation({
      grossAreaM2: roof.grossAreaM2,
      usableAreaM2: roof.usableAreaM2,
      panelAreaM2: selectedPanelAreaM2,
      panelPowerWp: selectedPanelPowerWp,
      panelCount: roofFitPanelCount,
      quotedPanelCount: 0,
      systemSizeWp: roofFitSystemWp,
      roofPotentialAnnualGenerationKWh,
      quotedSystemSizeWp: 0,
      annualGenerationKWh: roofPotentialAnnualGenerationKWh,
      generationModel: roofPotentialGeneration.model,
      generationSpecificYieldKWhPerKWp: roofPotentialGeneration.specificYieldKWhPerKWp,
      generationSystemLossRatio: roofPotentialGeneration.systemLossRatio,
      annualSelfUseSavingsTHB: potentialTariff.annualSelfUseSavingsTHB,
      annualExportRevenueTHB: potentialTariff.annualExportRevenueTHB,
      annualSavingsTHB: potentialTariff.annualSavingsTHB,
      selfConsumptionRatio: input.selfConsumptionRatio,
      retailRateTHBPerKWh: potentialTariff.retailRateTHBPerKWh,
      exportRateTHBPerKWh: input.exportRateTHBPerKWh,
      bom: null,
      suggestedSellPriceTHB: 0,
      finance,
      paybackYears: null,
      irrPercent: null,
    }).slice(0, 2);

    return {
      isViable: potentialResolution.available,
      quoteReady: false,
      quoteReadiness: potentialResolution.available
        ? potentialResolution.engineeringReviewRequired
          ? "engineering-review"
          : "technical-potential-only"
        : "not-viable",
      capacityIntent: input.capacityIntent,
      engineeringReviewRequired: potentialResolution.engineeringReviewRequired,
      warnings,
      recommendedTier: tierRecommendation.tier,
      usableAreaM2: roof.usableAreaM2,
      panelCount: roofFitPanelCount,
      roofFitPanelCount,
      roofFitSystemWp,
      roofPotentialAnnualGenerationKWh,
      quotedSystemSizeWp: 0,
      systemSizeWp: roofFitSystemWp || roof.theoreticalWp,
      annualGenerationKWh: roofPotentialAnnualGenerationKWh,
      generationModel: roofPotentialGeneration.model,
      generationSpecificYieldKWhPerKWp: roofPotentialGeneration.specificYieldKWhPerKWp,
      generationSystemLossRatio: roofPotentialGeneration.systemLossRatio,
      annualSelfUseKWh: potentialTariff.annualSelfUseKWh,
      annualExportKWh: potentialTariff.annualExportKWh,
      annualSelfUseSavingsTHB: potentialTariff.annualSelfUseSavingsTHB,
      annualExportRevenueTHB: potentialTariff.annualExportRevenueTHB,
      annualSavingsTHB: potentialTariff.annualSavingsTHB,
      annualCurtailmentKWh: potentialTariff.annualCurtailmentKWh,
      savingsCappedByBill: potentialTariff.savingsCappedByBill,
      hardwareCostTHB: 0,
      suggestedSellPriceTHB: 0,
      finance,
      paybackYears: null,
      discountedPaybackYears: null,
      irrPercent: null,
      npvTHB: 0,
      lifetimeNetSavingsTHB: 0,
      bom: null,
      electricalCompatibility: null,
      explanation,
    };
  }

  const explicitCapacityResolution = input.capacityIntent
    ? resolveCapacityIntent({
        intent: input.capacityIntent,
        phase: input.topology.phase,
        supportedPanelCount: roofFitPanelCount,
        panelPowerWp: selectedPanelPowerWp,
      })
    : null;
  const legacySelectedTier = findSelectableTier(
    input.topology.phase,
    roofFitPanelCount,
    input.selectedTierId,
    selectedPanelPowerWp,
  );
  const quotedTier: CapacityTier | null = explicitCapacityResolution
    ? explicitCapacityResolution.available
      ? explicitCapacityResolution.tier
      : null
    : legacySelectedTier || tierRecommendation.tier;
  const resolvedCapacityIntent =
    input.capacityIntent ||
    capacityIntentFromTierId(legacySelectedTier?.id || tierRecommendation.tier?.id);

  warnings.push(...tierRecommendation.warnings);
  if (explicitCapacityResolution?.unavailableReason) {
    warnings.push(explicitCapacityResolution.unavailableReason);
  }

  if (!quotedTier) {
    return {
      isViable: false,
      quoteReady: false,
      quoteReadiness: "not-viable",
      capacityIntent: resolvedCapacityIntent,
      engineeringReviewRequired:
        explicitCapacityResolution?.engineeringReviewRequired || false,
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
      generationModel: roofPotentialGeneration.model,
      generationSpecificYieldKWhPerKWp: roofPotentialGeneration.specificYieldKWhPerKWp,
      generationSystemLossRatio: roofPotentialGeneration.systemLossRatio,
      annualSelfUseKWh: 0,
      annualExportKWh: 0,
      annualSelfUseSavingsTHB: 0,
      annualExportRevenueTHB: 0,
      annualSavingsTHB: 0,
      annualCurtailmentKWh: 0,
      savingsCappedByBill: false,
      hardwareCostTHB: 0,
      suggestedSellPriceTHB: 0,
      finance: createEmptyFinanceSelection(),
      paybackYears: null,
      discountedPaybackYears: null,
      irrPercent: null,
      npvTHB: 0,
      lifetimeNetSavingsTHB: 0,
      bom: null,
      electricalCompatibility: null,
      explanation: [],
    };
  }

  const quotedSystemSizeWp = quotedTier.panelCount * selectedPanelPowerWp;

  if (
    !legacySelectedTier &&
    !input.capacityIntent &&
    roofFitSystemWp > quotedSystemSizeWp + selectedPanelPowerWp / 2
  ) {
    warnings.push(PACKAGE_CAP_WARNING);
  }

  const generation = calculateGeneration(quotedSystemSizeWp, {
    googleSpecificYieldDcKWhPerKWp,
  });
  const tariff = calculateTariffValue({
    annualGenerationKWh: generation.annualGenerationKWh,
    ftRateTHBPerKWh: input.ftRateTHBPerKWh,
    selfConsumptionRatio: input.selfConsumptionRatio,
    exportRateTHBPerKWh: input.exportRateTHBPerKWh,
    monthlyElectricityBillTHB: input.monthlyElectricityBillTHB,
    gridExportApproved: input.gridExportApproved,
    approvedExportLimitKwAc: input.approvedExportLimitKwAc,
  });
  const inverterCandidates = filterResidentialInverters(
    input.topology.phase,
    input.topology.mode,
  );
  const requestedInverterId =
    input.selectedInverterId && input.selectedInverterId !== "auto"
      ? input.selectedInverterId
      : null;
  const requestedInverter = requestedInverterId
    ? inverterCandidates.find((inverter) => inverter.id === requestedInverterId)
    : undefined;
  const requestedCompatibility = requestedInverter
    ? checkElectricalCompatibility({
        panel: selectedPanel,
        inverter: requestedInverter,
        panelCount: quotedTier.panelCount,
        topology: input.topology,
      })
    : null;
  const automaticInverter = selectCompatibleInverter({
    panel: selectedPanel,
    candidates: inverterCandidates,
    panelCount: quotedTier.panelCount,
    topology: input.topology,
  });
  const inverterSelection =
    requestedInverter && requestedCompatibility?.compatible
      ? { inverter: requestedInverter, compatibility: requestedCompatibility }
      : automaticInverter;

  if (requestedInverterId && (!requestedInverter || !requestedCompatibility?.compatible)) {
    const reason = requestedCompatibility?.errors.join(" ");
    warnings.push(reason ? `${INCOMPATIBLE_INVERTER_WARNING} ${reason}` : INCOMPATIBLE_INVERTER_WARNING);
  }

  if (!inverterSelection) {
    warnings.push(NO_COMPATIBLE_INVERTER_WARNING);
    return {
      isViable: false,
      quoteReady: false,
      quoteReadiness: "not-viable",
      capacityIntent: resolvedCapacityIntent,
      engineeringReviewRequired: true,
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
      generationModel: generation.model,
      generationSpecificYieldKWhPerKWp: generation.specificYieldKWhPerKWp,
      generationSystemLossRatio: generation.systemLossRatio,
      annualSelfUseKWh: tariff.annualSelfUseKWh,
      annualExportKWh: tariff.annualExportKWh,
      annualSelfUseSavingsTHB: tariff.annualSelfUseSavingsTHB,
      annualExportRevenueTHB: tariff.annualExportRevenueTHB,
      annualSavingsTHB: tariff.annualSavingsTHB,
      annualCurtailmentKWh: tariff.annualCurtailmentKWh,
      savingsCappedByBill: tariff.savingsCappedByBill,
      hardwareCostTHB: 0,
      suggestedSellPriceTHB: 0,
      finance: createEmptyFinanceSelection(),
      paybackYears: null,
      discountedPaybackYears: null,
      irrPercent: null,
      npvTHB: 0,
      lifetimeNetSavingsTHB: 0,
      bom: null,
      electricalCompatibility: requestedCompatibility,
      explanation: [],
    };
  }

  warnings.push(...inverterSelection.compatibility.warnings);

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
      inverterSelection.inverter.unitCostTHB != null
        ? {
            model: `${inverterSelection.inverter.manufacturer} ${inverterSelection.inverter.model}`,
            unitCostTHB: inverterSelection.inverter.unitCostTHB,
          }
        : undefined,
    battery: selectedBattery
      ? {
          model: `${selectedBattery.manufacturer} ${selectedBattery.model} (${selectedBattery.capacityKWh}kWh)`,
          unitCostTHB: selectedBattery.unitCostTHB,
        }
      : undefined,
  };
  const rowPanelCounts = derivePanelRowCounts(quotedTier.panelCount);
  const bom = buildBomScenario(input.topology, quotedTier, equipmentOverrides, {
    panelCount: quotedTier.panelCount,
    panelWidthMm: selectedPanel.dimShort,
    rowPanelCounts,
    stringCount: inverterSelection.compatibility.stringCount,
  });

  if (!bom) {
    return {
      isViable: false,
      quoteReady: false,
      quoteReadiness: "not-viable",
      capacityIntent: resolvedCapacityIntent,
      engineeringReviewRequired: false,
      warnings: [
        ...warnings,
        "No BOM template matches the selected phase, mode, and battery combination.",
      ],
      recommendedTier: quotedTier,
      usableAreaM2: roof.usableAreaM2,
      panelCount: roofFitPanelCount,
      roofFitPanelCount,
      roofFitSystemWp,
      roofPotentialAnnualGenerationKWh,
      quotedSystemSizeWp,
      systemSizeWp: roofFitSystemWp,
      annualGenerationKWh: generation.annualGenerationKWh,
      generationModel: generation.model,
      generationSpecificYieldKWhPerKWp: generation.specificYieldKWhPerKWp,
      generationSystemLossRatio: generation.systemLossRatio,
      annualSelfUseKWh: tariff.annualSelfUseKWh,
      annualExportKWh: tariff.annualExportKWh,
      annualSelfUseSavingsTHB: tariff.annualSelfUseSavingsTHB,
      annualExportRevenueTHB: tariff.annualExportRevenueTHB,
      annualSavingsTHB: tariff.annualSavingsTHB,
      annualCurtailmentKWh: tariff.annualCurtailmentKWh,
      savingsCappedByBill: tariff.savingsCappedByBill,
      hardwareCostTHB: 0,
      suggestedSellPriceTHB: 0,
      finance: createEmptyFinanceSelection(),
      paybackYears: null,
      discountedPaybackYears: null,
      irrPercent: null,
      npvTHB: 0,
      lifetimeNetSavingsTHB: 0,
      bom: null,
      electricalCompatibility: inverterSelection.compatibility,
      explanation: [],
    };
  }

  const pricing = buildSuggestedPrice({
    hardwareCostTHB: bom.hardwareCostTHB,
    pricingPresetId: input.pricingPresetId,
    tierId: quotedTier.id,
    topology: input.topology,
  });
  const finance = calculateFinanceSelection(
    pricing.suggestedSellPriceTHB,
    input.selectedFinanceIds,
    { taxableIncomeTHB: input.taxableIncomeTHB },
  );
  const returns = calculateProjectReturns({
    upfrontCostTHB: finance.financeAdjustedPriceTHB,
    annualSavingsTHB: tariff.annualSavingsTHB,
  });

  return {
    isViable: true,
    quoteReady: true,
    quoteReadiness: "ready",
    capacityIntent: resolvedCapacityIntent,
    engineeringReviewRequired: false,
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
    generationModel: generation.model,
    generationSpecificYieldKWhPerKWp: generation.specificYieldKWhPerKWp,
    generationSystemLossRatio: generation.systemLossRatio,
    annualSelfUseKWh: tariff.annualSelfUseKWh,
    annualExportKWh: tariff.annualExportKWh,
    annualSelfUseSavingsTHB: tariff.annualSelfUseSavingsTHB,
    annualExportRevenueTHB: tariff.annualExportRevenueTHB,
    annualSavingsTHB: tariff.annualSavingsTHB,
    annualCurtailmentKWh: tariff.annualCurtailmentKWh,
    savingsCappedByBill: tariff.savingsCappedByBill,
    hardwareCostTHB: bom.hardwareCostTHB,
    suggestedSellPriceTHB: pricing.suggestedSellPriceTHB,
    finance,
    paybackYears: returns.paybackYears,
    discountedPaybackYears: returns.discountedPaybackYears,
    irrPercent: returns.irrPercent,
    npvTHB: returns.npvTHB,
    lifetimeNetSavingsTHB: returns.lifetimeNetSavingsTHB,
    benchmarkLowTHB: pricing.benchmarkLowTHB,
    benchmarkHighTHB: pricing.benchmarkHighTHB,
    bom,
    electricalCompatibility: inverterSelection.compatibility,
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
      generationModel: generation.model,
      generationSpecificYieldKWhPerKWp: generation.specificYieldKWhPerKWp,
      generationSystemLossRatio: generation.systemLossRatio,
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
