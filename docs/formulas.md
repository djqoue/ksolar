# KSolar Calculation Formulas

## Source of truth

- Runtime logic does not read Excel.
- All defaults and price references live in code under `lib/config/*`.
- The selected panel spec is now a first-class calculation input:
  - `panelPowerWp = selectedPanel.peakPowerW`
  - `panelAreaM2 = selectedPanel.dimLong * selectedPanel.dimShort / 1_000_000`
- If no panel is selected, the engine falls back to `SOLAR_DEFAULTS`.

## 1. Roof potential

Roof potential is the engineering ceiling before package and electrical constraints.

- `usableAreaM2 = map.usableAreaM2 || grossAreaM2 * usableAreaFactor`
- `roofFitPanelCount = floor(usableAreaM2 / selectedPanelAreaM2)`
- `roofFitSystemWp = roofFitPanelCount * selectedPanelPowerWp`

If Google Solar is matched to the drawn roof, the roof-fit stage is overridden by Google-aligned values:

- `roofFitPanelCount = googleSellablePanelCount`
- `roofFitSystemWp = googleSellableFitWp`

## 2. Standard package selection

The quote does not directly use the roof-fit number as the sellable package. It first maps the roof-fit panel count into a standard BOM family.

- `1P` allowed families: `3kW`, `5kW`, `10kW`
- `3P` allowed families: `5kW`, `10kW`, `15kW`, `20kW`
- `recommendedTier = largest allowed tier where tier.panelCount <= roofFitPanelCount`

If no tier fits, the roof is flagged as not viable.

Important distinction:

- `recommendedTier.id` is the BOM family label.
- `quotedSystemSizeWp = recommendedTier.panelCount * selectedPanelPowerWp`

This means the same `10kW` family can become `8.8 kWp`, `9.6 kWp`, or `10.4 kWp` depending on the selected module wattage.

## 3. Generation

There are two generation outputs:

- Roof potential generation:
  - `roofPotentialAnnualGenerationKWh = calculateGeneration(roofFitSystemWp)`
  - or Google-re-scaled annual yield when a matched Google roof is available
- Quoted package generation:
  - `quotedAnnualGenerationKWh = calculateGeneration(quotedSystemSizeWp)`

Generation formula:

- `dailyGenerationKWh = (systemSizeWp / 1000) * sunlightHours * (1 - systemLossRatio)`
- `annualGenerationKWh = dailyGenerationKWh * 365`

Current defaults:

- `sunlightHours = 4.0`
- `systemLossRatio = 0.15`

## 4. Tariff and net-billing

- `retailRateTHBPerKWh = 4.18 + FT`
- `annualSelfUseKWh = annualGenerationKWh * selfConsumptionRatio`
- `annualExportKWh = annualGenerationKWh - annualSelfUseKWh`
- `annualSavingsTHB = annualSelfUseKWh * retailRateTHBPerKWh + annualExportKWh * exportRateTHBPerKWh`

## 5. Google Solar normalization

Google Solar is used as the spatial engine, but it does not use KSolar sellable modules by default.

Raw Google layout:

- `googleRawKw = googlePanelsCount * googlePanelCapacityWatts / 1000`

Same-layout normalization:

- `googleLayoutAreaM2 = googlePanelsCount * googlePanelHeightMeters * googlePanelWidthMeters`
- `normalizedEquivalentPanelCount = floor(googleLayoutAreaM2 / selectedPanelAreaM2)`
- `normalizedEquivalentKw = normalizedEquivalentPanelCount * selectedPanelPowerWp / 1000`

Roof-wide sellable fit:

- `sellableFitPanelCount = floor(googleMaxArrayAreaMeters2 / selectedPanelAreaM2)`
- `sellableFitKw = sellableFitPanelCount * selectedPanelPowerWp / 1000`

Google annual yield re-scaling:

- `googleSellableAnnualGenerationKWh = googleYearlyEnergyDcKwh * (sellableFitKw / googleRawKw)`

## 6. Google data layers

Google `buildingInsights` is not enough on its own for contractor-grade review. The app also supports `dataLayers`:

- building mask
- annual flux
- monthly flux
- hourly shade

For raster analysis, KSolar does not use the full Google building mask blindly. It computes:

- `effectiveMask = buildingMask ∩ userDrawnRoofPolygon`

All annual flux, monthly flux, and shade summaries are computed only on this clipped mask so the review map follows the user's selected roof rather than the full detected building.

## 7. BOM and pricing

- BOM templates come from `lib/config/bom-catalog.ts`
- Equipment catalogs come from:
  - `lib/config/panel-catalog.ts`
  - `lib/config/inverter-catalog.ts`
  - `lib/config/battery-catalog.ts`

Override rule:

- BOM quantity still comes from the selected tier template.
- Panel / inverter / battery model and unit cost can be overridden by catalog selection.

Pricing:

- `hardwareCostTHB = sum(all BOM line items)`
- `marginPriceTHB = hardwareCostTHB * (1 + pricingPreset.marginRatio)`
- `benchmarkAnchoredPriceTHB = interpolated from market benchmark range`
- `suggestedSellPriceTHB = max(marginPriceTHB, benchmarkAnchoredPriceTHB)`

## 8. Finance and ROI

- `cashPriceAfterSubsidyTHB = suggestedSellPriceTHB - directSubsidyTHB`
- Thailand residential solar tax support is modelled as an income-tax deduction, not an immediate cash discount.
- `taxDeductionBaseTHB = min(suggestedSellPriceTHB, 200,000)`
- `estimatedTaxBenefitTHB = taxDeductionBaseTHB * assumedMarginalTaxRate`
- Current default assumed marginal tax rate: `20%`
- `financeAdjustedPriceTHB = cashPriceAfterSubsidyTHB - estimatedTaxBenefitTHB`
- `financedPrincipalTHB = cashPriceAfterSubsidyTHB * loanToValueRatio`
- `downPaymentTHB = cashPriceAfterSubsidyTHB - financedPrincipalTHB`
- `monthlyPaymentTHB = amortized payment on financedPrincipalTHB`
- Loans and installments affect affordability outputs, not the base project IRR logic.
- `paybackYears = financeAdjustedPriceTHB / annualSavingsTHB`

Monthly customer-facing view:

- `monthlySelfUseSavingsTHB = annualSelfUseSavingsTHB / 12`
- `monthlyExportRevenueTHB = annualExportRevenueTHB / 12`
- `monthlyBenefitTHB = monthlySelfUseSavingsTHB + monthlyExportRevenueTHB`
- `netMonthlyCashflowTHB = monthlyBenefitTHB - monthlyPaymentTHB`

Important sales note:

- `0 THB down payment` must never be promised as guaranteed.
- Bangkok Bank residential green financing is modelled as up to 100% of project purpose, but final lending depends on collateral valuation, fees, floating rate, credit approval, and bank conditions.
- Krungsri SME Solar Rooftop is not a default residential product; it is only a business customer reference.

IRR assumptions:

- `projectLifeYears = 25`
- `degradationRatio = 0.5%`
- `tariffEscalationRatio = 2%`
- `annualOMRatio = 1%`

## 9. Explanation chain shown in UI

The UI breakdown intentionally exposes intermediate values so sales and ops can audit the result:

- selected panel footprint and wattage
- gross area and usable area
- roof-fit supported panel count
- roof-fit kWp
- quoted package panel count and quoted kWp
- annual generation and savings
- BOM category totals
- finance adjustments and ROI
