# KSolar v1 Release Candidate

Baseline date: **2026-07-18**. This release prepares the Thai rooftop-solar sales flow for production verification at `ksolar.top`.

## Delivered

### Workflow and interaction

- The guided four-step flow keeps the primary action and system status visible and preserves the selected address, map center, and drawn roof when users move back from Step 3.
- Capacity choice is explicit: 5/10/15/20 kW targets or roof maximum.
- Unavailable choices are disabled with the phase, roof-fit, or electrical reason instead of silently changing the user's request.
- Roof maximum is visibly technical-only, has no committed price/BOM, and cannot be saved as a formal quote.
- Interaction review follows Apple HIG principles for hierarchy, direct manipulation, feedback, context preservation, reversal, and accessible touch targets.

### Quote engine

- Selected module wattage and dimensions now drive capacity, generation, layout comparisons, and BOM quantities consistently.
- Standard targets round up to whole modules; 1P allows 5/10 kW and 3P allows 5/10/15/20 kW.
- Inverters are validated for phase, mode, DC/AC ratio, MPPT voltage, cold Voc, MPPT count, and string inputs.
- Panel, mounting, row, and string quantities are derived from the resolved package instead of fixed legacy counts.
- Quote readiness distinguishes ready, technical-potential-only, engineering-review, and not-viable results.

### Thailand tariff, finance, and returns

- Central policy baseline records Ft 0.1623 THB/kWh, 2.20 THB/kWh residential export value, a 5 kW AC approved-export reference, 7% VAT validity, grid-inspection reference, and official sources.
- Self-use savings are capped by the supplied annual electricity bill; export revenue is zero unless approval is selected, with curtailed surplus shown separately.
- The residential 200,000 THB support is correctly treated as a taxable-income deduction, not a cash rebate. No tax saving is applied without tax information.
- Published GSB residential and KBank SME 5-year/8-year scenarios use term/rate schedules and provider-specific LTV/loan caps.
- Returns now include simple and discounted payback, IRR, NPV, and lifetime net savings over a 25-year cash-flow model.

### Google Solar precision and safety

- Google Solar calls use the authenticated server proxy and request the best available quality in one call.
- HIGH/MEDIUM results must pass strict single-building roof-selection overlap and area checks before they can calibrate annual yield; formal panel count remains on the KSolar roof rule.
- BASE/UNKNOWN results are reference-only; wrong-roof, partial-match, and stale results cannot silently drive panel count, yield, BOM, or price.
- Complete panel footprints inside the selected polygon provide a conservative selection-scoped reference.
- Annual/monthly/hourly rasters now use spatial mask alignment, no-data filtering, and correct hourly day-bit decoding.
- Solar data is not persisted in browser local storage.

## Known boundaries

- Manual roof fit is area-based screening and does not geometrically place modules around edges, setbacks, access paths, or obstacles.
- Google/KSolar panel overlays are not final CAD, structural approval, electrical single-line design, or a generation guarantee.
- The quotation BOM still requires site confirmation for roof-specific mounting, cable routes, protection, structure, and utility work.
- Bank approval, current floating rates, collateral, insurance, tax eligibility, grid approval, and actual export limits remain external decisions.
- VAT and the published PEA grid-inspection fee are recorded but are not automatically added to the current quote price.
- Thailand policy assumptions must be re-verified when their stated validity windows expire.

## Production release gate

Run locally or in CI:

```bash
npm run lint
npm run test
npm run build
```

Do not release until all of the following pass in production:

- `https://ksolar.top/api/health` returns HTTP 200 with Supabase Auth and database checks both `ok`.
- Production login, customer save, formal quote save, reload, and authorization boundaries are verified with non-admin sales accounts.
- Address/roof state survives Step 2 -> Step 3 -> Step 2 navigation without re-entry or silent reset.
- 1P/3P capacity availability, roof maximum, incompatible inverter, no-Google, BASE, wrong-roof, and monthly-bill/export scenarios are smoke-tested.
- Google browser/server key restrictions, Supabase service-role secrecy, Vercel environment variables, DNS, TLS, and production migrations are confirmed.
- Desktop, iPhone-size, and Android-size flows remain readable, operable, and free of blocked map controls.
