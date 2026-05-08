# KSolar Calculation Workflow

## Goal

This document explains the runtime calculation path end to end so the MVP can be debugged without guessing which layer produced a number.

## Input flow

1. `components/Map.tsx`
   - captures user roof polygons / rectangles
   - outputs `MapSelectionSummary`
2. `components/system-selector.tsx`
   - captures topology, pricing preset, panel, inverter, and battery selections
3. `components/finance-selector.tsx`
   - captures subsidy / tax / installment selections
4. `components/dashboard-shell.tsx`
   - requests Google Solar
   - merges user inputs into `QuoteScenarioInput`
5. `lib/calc.ts`
   - orchestrates the full quote calculation

## Runtime decision layers

### Layer 1: Spatial truth

- Primary modules:
  - `lib/calc/roof.ts`
  - `lib/solar.ts`
  - `lib/solar-raster.ts`
- Responsibilities:
  - convert usable area into roof-fit panel count
  - normalize Google Solar layouts into KSolar sellable modules
  - clip Google raster layers to the selected roof polygon

Outputs:

- roof-fit panel count
- roof-fit kWp
- roof-potential generation
- Google cross-check and data-layer summaries

### Layer 2: Sellable package truth

- Primary modules:
  - `lib/calc/sizing.ts`
  - `lib/calc/bom.ts`
  - `lib/config/bom-catalog.ts`
  - `lib/config/panel-catalog.ts`
  - `lib/config/inverter-catalog.ts`
  - `lib/config/battery-catalog.ts`

Responsibilities:

- map roof-fit panel count into a standard package family
- keep BOM quantities aligned with the selected tier template
- override equipment model and unit price from the selected catalogs

Outputs:

- recommended tier family
- quoted package panel count
- quoted package kWp
- BOM line items and category totals

### Layer 3: Commercial truth

- Primary modules:
  - `lib/calc/generation.ts`
  - `lib/calc/tariff.ts`
  - `lib/calc/pricing.ts`
  - `lib/calc/finance.ts`

Responsibilities:

- turn quoted package kWp into annual generation
- convert generation into Thailand bill savings
- generate suggested sell price from hardware cost + market guardrails
- apply finance products and calculate payback / IRR

Outputs:

- annual generation
- annual savings
- suggested sell price
- net customer price
- payback / IRR

## Guardrails

- Excel is not in the runtime chain.
- Google Solar does not replace BOM or Thailand ROI logic.
- BOM tier family and real kWp are intentionally separate concepts.
- UI components should render state, not bury calculation rules.

## Best places to debug

- Wrong roof-fit size:
  - `lib/calc/roof.ts`
  - `lib/solar.ts`
- Wrong Google overlay or shadow summary:
  - `lib/solar-raster.ts`
  - `app/api/solar/*`
- Wrong package or BOM:
  - `lib/calc/sizing.ts`
  - `lib/calc/bom.ts`
- Wrong price or ROI:
  - `lib/calc/pricing.ts`
  - `lib/calc/finance.ts`
- Wrong explanation text:
  - `lib/calc/explain.ts`
