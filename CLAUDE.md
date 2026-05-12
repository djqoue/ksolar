# KSolar — Memory Notes

## Project
- **Name**: KSolar — Thailand residential solar quote MVP
- **Stack**: Next.js 15 + React 19 + TypeScript (strict) + Tailwind + Radix UI
- **Path**: `E:\迁移资料夹\KS\CS资料\Claude\Thailand Solar\Code\ksolar`
- **Run dev**: `D:\nodejs\npm.cmd run dev`
- **Type-check**: `./node_modules/.bin/tsc.cmd --noEmit` (must exit 0)

## Git Remotes
- `origin` → `https://github.com/SUderoot/ksolar2.git` (SUderoot has full write access)
- `djqoue` → `https://github.com/djqoue/ksolar.git` (now has write access — verified 2026-04-26)
- Git identity: `SUderoot` / `xiaoniel@126.com`
- **Default branch**: `main`

## Architecture Highlights

### Catalog Files (`lib/config/`)
- `panel-catalog.ts` — 80 panels (78 iSolarBP CNY-priced + 2 Thailand THB-priced)
  - `DEFAULT_PANEL_ID = "trina-solar-tsm-neg20c-20-650w"`
  - Slug rule: dots → dashes (e.g. `tsm-neg20c-20-650w`)
  - `getPanelAreaM2(panel)` — returns panel physical area for roof calc
- `inverter-catalog.ts` — Two segments:
  - `KSOLAR_RESIDENTIAL` (30 units, 3–50kW) — THB market prices, source `"ksolar-bom"`
  - `ISOLAR_COMMERCIAL` (19 units, 30–320kW) — Sungrow, CNY→THB, source `"isolar-bp"`
  - `filterResidentialInverters(phase, mode)` is the UI filter
- `battery-catalog.ts` — 7 batteries (Genixgreen + Pylontech, BYD, Alpha ESS, East Lux)
  - `DEFAULT_BATTERY_ID = "genixgreen-es-box12"`
- `currency.ts` — `cnyToThb(cny)`, rate `CNY_TO_THB = 5.10`
- `solar.ts` — `CAPACITY_TIERS` are `3kW / 5kW / 10kW / 15kW / 20kW`, `panelPowerWp: 650`

### BOM (`lib/calc/bom.ts`, `lib/config/bom-catalog.ts`, `lib/calc/bom-quantities.ts`)
- `buildBomScenario(topology, tier, overrides?, panelCount?)` — matches template by `tierId + phase + mode + batteryMode`
- `EquipmentOverrides { panel?, inverter?, battery? }` — each is `{ model, unitCostTHB }`; quantities from template preserved
- Battery override skips `id.includes("cable")` items
- Sentinel `"auto"` on inverter/battery = use template default
- BOM 7 categories: panel / inverter / battery / mounting / electrical / labor / other
- When `panelCount` is passed, mounting + DC electrical quantities are **formula-derived** via `calcBomQuantities(panelCount)`
  - `MAX_PANELS_PER_ROW = 11`, `RAIL_LENGTH_MM = 2400`, `DEFAULT_PANEL_WIDTH_MM = 1134`
  - rows = `ceil(panelCount / 11)`; rails/splices from geometry; mid-clamp = `rows × (panelsPerRow-1) × 2`
  - strings = `min(2, ceil(panelCount/8))`; DC items scale with string count
  - Items with formula quantity = 0 (e.g. mc4-branch for single-string) are dropped
  - Formulas reproduce all 5 hardcoded tier values exactly (validated in `tests/calc-bom.test.ts`)
- `lib/calc.ts` passes `quotedTier.panelCount` → formula always active in production

### Calc entry (`lib/calc.ts`)
- `calculateQuoteScenario(input)` — main entry
- Panel area/power now resolved from selected panel (not hardcoded 650W) and passed to `calculateRoofPotential`
- `findSelectableTier(phase, panelCount, selectedTierId)` — allows manual tier selection below roof max
- Output now includes: `annualSelfUseKWh`, `annualExportKWh`, `annualSelfUseSavingsTHB`, `annualExportRevenueTHB`

### Finance (`lib/calc/finance.ts`)
- New fields: `taxDeductionBaseTHB`, `cashPriceAfterSubsidyTHB`, `downPaymentTHB`, `financedPrincipalTHB`, `annualLoanPaymentTHB`
- Tax credit now calculated as `deductionBase × taxBenefitRatePercent` (estimated value, not direct rebate)
- `loanToValueRatio` on finance products controls down payment split

### Auth & CRM (new in v1)
- **Supabase**: `lib/supabase/browser.ts` + `server.ts`; middleware in `middleware.ts` guards `/` and `/crm`
- Auth: `app/(auth)/login/` — phone + password, Thai country codes (`lib/auth/`)
- CRM: `app/(sales)/crm/` + `lib/repositories/crm-repository.ts`
- Customer intake: `components/customer-intake-card.tsx` + `lib/customer-intake.ts`; skippable via `ALLOW_SKIP_INTAKE` env flag
- DB migrations: `supabase/migrations/` (3 files, 202605xx)

### UI
- `components/dashboard-shell.tsx` — guided step workflow (roof → system → quote)
- `components/system-selector.tsx` — panel/inverter/battery dropdowns
- `MFG_ORDER = ["Trina Solar", "LONGi", "JA Solar", "Tongwei", "Sungrow Solar", "GCL", "Powitt Solar", "Unknown"]`
- Language switcher: `components/language-switcher.tsx` (TH/EN)
- PWA: `app/manifest.ts` + `public/icons/` — installable on mobile via browser menu

### Map (`components/Map.tsx`, `components/roof-review-map.tsx`)
- Drawing tools: rectangle, polygon, pan, undo, clear
- Google Solar layers: roof outline, panel array, annual flux heatmap
- Server-side proxy for Solar raster data (`app/api/solar/`)

## Conventions
- All prices in catalog files use `cnyToThb()` for CNY-sourced data; Thailand-direct prices use literal THB integers with `priceCNY: null`
- TypeScript strict mode — must pass `tsc --noEmit` with exit 0 before commit
- Commit messages: `feat: ...` / `fix: ...` style, terse, no Co-Authored-By unless requested
- Never use `--no-verify`, never amend, always create new commits
