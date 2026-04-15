# KSolar Calculation Formulas

## Roof sizing

- `usableAreaM2 = grossAreaM2 * 0.70`
- `panelCount = floor(usableAreaM2 / 3.1)`
- `theoreticalWp = panelCount * 650`
- Standard packages are selected conservatively by phase:
  - `1P`: `3kW`, `5kW`, `10kW`
  - `3P`: `5kW`, `10kW`, `15kW`, `20kW`
- If the roof cannot fit the smallest standard package, the quote is flagged as not viable.

## Generation

- `dailyGenerationKWh = (systemSizeWp / 1000) * 4.0 * (1 - 0.15)`
- `annualGenerationKWh = dailyGenerationKWh * 365`

## Net-billing value

- `retailRateTHBPerKWh = 4.18 + FT`
- `annualSelfUseKWh = annualGenerationKWh * selfConsumptionRatio`
- `annualExportKWh = annualGenerationKWh - annualSelfUseKWh`
- `annualSavingsTHB = annualSelfUseKWh * retailRateTHBPerKWh + annualExportKWh * exportRateTHBPerKWh`

## BOM and pricing

- BOM is drawn from code-defined templates in `lib/config/bom-catalog.ts`
- `hardwareCostTHB = sum(all BOM line item subtotals)`
- `marginPriceTHB = hardwareCostTHB * (1 + pricingPreset.marginRatio)`
- If market benchmark exists, a benchmark-anchored target price is interpolated from the configured price range.
- `suggestedSellPriceTHB = max(marginPriceTHB, benchmarkAnchoredPriceTHB)`

## Finance and ROI

- Subsidy products reduce capex directly.
- Tax deduction products are modelled as one-time project cost reduction capped by configured maximum benefit.
- `financeAdjustedPriceTHB = suggestedSellPriceTHB - subsidyTHB - taxCreditTHB`
- Loan and installment products calculate monthly affordability only and do not distort the base project ROI.
- `paybackYears = financeAdjustedPriceTHB / annualSavingsTHB`
- Project IRR uses:
  - 25-year project life
  - `0.5%` annual production degradation
  - `2%` annual tariff escalation
  - `1%` annual O&M cost on net customer price

