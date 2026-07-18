# KSolar Calculation Reference

Runtime source of truth: `lib/calc/*` and `lib/config/*`. Policy baseline: **Thailand, verified 2026-07-18**.

## 1. Roof evidence and capacity intent

The selected panel drives every downstream capacity value:

- `panelAreaM2 = dimLongMm * dimShortMm / 1,000,000`
- `panelPowerWp = selectedPanel.peakPowerW`
- manual `usableAreaM2 = suppliedUsableAreaM2 || grossAreaM2 * usableAreaFactor`
- manual `roofFitPanelCount = floor(usableAreaM2 / panelAreaM2)`
- `roofFitSystemWp = roofFitPanelCount * panelPowerWp`

The default manual usable-area factor is 70%. This area division is a screening estimate; it does not model exact roof edges, setbacks, access paths, or obstacles.

Google never replaces the formal panel count with an area-normalized module count. When one returned building is quote-eligible—HIGH or MEDIUM imagery, building center inside the selection, at least 80% of Google panel footprints fully contained, selected/Google roof-area agreement of at least 65%, and exactly one selected roof—it may calibrate the annual specific yield. Its selection-scoped module normalization remains a labelled upper-bound reference. BASE, UNKNOWN, multi-roof, and failed-match results remain reference-only.

### Standard packages

Customer-facing targets are 5, 10, 15, and 20 kW:

- `requiredPanelCount = ceil(targetKW * 1,000 / panelPowerWp)`
- `quotedSystemSizeWp = requiredPanelCount * panelPowerWp`

The installed DC value can be slightly above the target because partial modules are impossible. One phase allows 5/10 kW; three phase allows 5/10/15/20 kW. An unavailable explicit choice is disabled with a reason; it is not silently changed to another package. The legacy 3 kW tier is read only for old saved quotes.

### Roof maximum

- `potentialPanelCount = roofFitPanelCount`
- `potentialSystemWp = potentialPanelCount * panelPowerWp`

Roof maximum is an uncapped technical assessment. It returns `quoteReady = false`, produces no committed BOM or price, and cannot be persisted as a formal quote. Capacity above the largest committed phase package requires engineering review of phase, inverter architecture, protection, structure, and interconnection.

## 2. Electrical compatibility

A standard quote must resolve an inverter that matches phase and operating mode and passes:

- supported DC/AC ratio: `0.75 <= arrayDcWp / inverterAcWp <= 1.35`
- preferred DC/AC range: 0.90–1.25; values outside this range generate a warning
- string Vmp within the inverter MPPT voltage window
- cold string Voc below maximum inverter input voltage, using a 1.05 safety factor
- MPPT count and maximum string-input count

Automatic selection chooses the lowest-cost compatible catalog inverter, then the option closest to a 1.05 DC/AC ratio. If none passes, the quote is not viable.

## 3. Generation

Manual/default model:

- `dailyGenerationKWh = systemSizeKWp * 4.0 * (1 - 0.15)`
- `annualGenerationKWh = dailyGenerationKWh * 365`

For a quote-eligible single-building Google match, KSolar derives a roof-specific Google DC yield from fully contained reference panels and applies it to the quoted KSolar capacity:

- `googleSpecificYieldDc = containedGooglePanelAnnualDcKWh / containedGooglePanelKWp`
- `annualGenerationKWh = quotedKWp * googleSpecificYieldDc * (1 - 0.15)`

This remains a sales estimate. It is not an AC simulation with equipment clipping, temperature series, soiling schedule, or guaranteed performance.

## 4. Thailand tariff and export value

Current policy inputs:

- base retail-rate assumption: 4.18 THB/kWh
- Ft: 0.1623 THB/kWh, valid 2026-05-01 through 2026-08-31
- residential net-billing export rate: 2.20 THB/kWh
- published residential approved-export limit used by the model: 5 kW AC

Formulas:

- `retailRate = max(0, 4.18 + Ft)`
- `selfUseKWh = annualGenerationKWh * selfConsumptionRatio`
- `surplusKWh = annualGenerationKWh - selfUseKWh`
- if export is not approved: `exportKWh = 0`
- if approved: `exportKWh = min(surplusKWh, approvedExportLimitKWac * 4.0 * 365)`
- `curtailmentKWh = surplusKWh - exportKWh`
- `selfUseSavings = min(selfUseKWh * retailRate, monthlyBillTHB * 12)` when a bill is provided
- `exportRevenue = exportKWh * exportRate`
- `annualSavings = selfUseSavings + exportRevenue`

The annual export cap is an energy proxy, not an interval power-flow simulation. The 5 kW AC approval limit is not used as a DC package-size limit. Old saved inputs with no approval field retain a legacy assumed-export mode; the current UI defaults to not approved.

## 5. BOM and price

The selected package panel count is the BOM panel quantity. Mounting quantities are derived from panel dimensions, balanced row counts, and the validated string count; catalog panel, inverter, and battery models supply unit costs.

- `hardwareCostTHB = sum(quantity * unitCostTHB)`
- `marginPrice = round(hardwareCostTHB * (1 + presetMargin))`
- `benchmarkPrice = selected percentile of the matching market range`
- `suggestedSellPrice = max(marginPrice, benchmarkPrice)`

The BOM is a quotation BOM, not an issued-for-construction design. Cable routing, roof-specific anchors, protection coordination, structural reinforcement, and utility work require site engineering.

## 6. Finance and tax

Only one loan/installment product may be selected; tax support remains independently selectable.

### Residential tax deduction

The published residential Solar Rooftop policy is a taxable-income deduction of up to 200,000 THB, valid 2026-03-03 through 2028-12-31. It is not a 200,000 THB cash rebate.

- `taxDeductionBase = min(suggestedSellPrice, 200,000)`
- `taxBenefit = ThaiPIT(taxableIncome) - ThaiPIT(taxableIncome - taxDeductionBase)`

KSolar applies no tax benefit until taxable income or an explicit marginal rate is supplied.

### Published loan scenarios

- GSB Solar for Life clean loan: 84 months, 80% LTV, maximum 500,000 THB; 3.50% for months 1–24, 5.00% for months 25–60, then the configured floating GSB MRR reference (6.045% as of 2026-03-02).
- KBank SME Solar Rooftop: up to 100% LTV in the model; 60 months at floating MLR−1.00% (5.52% with the 2026-03-02 reference), or 96 months at floating MLR−0.80% (5.72% with the same reference).

At each rate change, the monthly annuity is recalculated on the remaining principal and remaining term. Approval, current reference rate, collateral, insurance, and fees remain provider decisions.

## 7. Project returns

- initial cash flow: `-financeAdjustedPriceTHB`
- project life: 25 years
- annual generation degradation: 0.5%
- tariff escalation: 2.0%
- annual O&M: 1.0% of adjusted upfront cost
- default discount rate: 7.0%
- yearly net cash flow: `year1Savings * degradationFactor * tariffFactor - annualOM - optionalReplacementCost`

The engine reports simple payback, discounted payback, IRR, NPV, and lifetime net savings from the annual cash-flow series. These are unlevered project-return estimates: loan payments, interest, and fees are shown as affordability outputs but are not included in project IRR/NPV.

## 8. Policy inclusions and exclusions

`lib/config/thailand-energy-policy.ts` also records 7% VAT through 2026-09-30, the PEA 2,000 THB pre-VAT grid-inspection fee, the ten-year net-billing contract reference, and official source URLs. VAT and the inspection fee are **not automatically added** by the current quotation formula.

Before production use after any validity date, update the policy source, verification date, affected tests, and customer-facing disclosure. Final tax eligibility, bank approval, grid connection, export permission, and engineering acceptance are outside the calculator's authority.
