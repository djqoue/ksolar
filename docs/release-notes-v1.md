# KSolar MVP v1 Field-Test Release Notes

## Purpose

This release turns KSolar from a calculation prototype into a field-testable sales workflow for Thai residential rooftop solar quotes.

The product direction is intentionally simple:

- The salesperson should see a guided next-step workflow, not a technical control room.
- Google Solar should provide roof and solar-resource confidence signals.
- KSolar should remain the source of truth for sellable equipment, BOM, pricing, and Thailand ROI logic.
- Advanced engineering detail should be visible for review, but not forced onto first-time users.

## Major Changes

### Sales workflow and UI

- Reworked the page into a guided workflow with clearer step progression.
- Simplified the main quoting path so the most important numbers are easier to find.
- Updated the visual direction toward a cleaner energy-tech style with stronger hero cards, card hierarchy, and mobile spacing.
- Added PWA manifest and app icons so the app can be installed more cleanly on mobile devices.

### Mobile map usability

- Fixed mobile layout issues where the map could collapse or become hidden.
- Increased map presence in the roof-selection and roof-review steps.
- Simplified drawing controls into the operational tools sales users actually need: rectangle, polygon, pan, undo, and clear.
- Disabled overlapping Google map controls where they conflicted with KSolar controls.

### Google Solar integration

- Uses Google Solar `buildingInsights` for building-level potential, imagery quality, roof segments, sunshine hours, panel configurations, and max array area.
- Uses Google Solar `dataLayers` and `geoTiff:get` through a server-side proxy so raster data is not fetched directly from the browser.
- Adds map layer controls for selected roof, Google roof outline, Google panel array, and annual flux heatmap.
- Converts Google panel center points into approximate rectangular panel footprints for a more intuitive array-design view.
- Adds raster fallback behavior: if the user-drawn polygon does not overlap Google raster pixels, KSolar can fall back to the Google building mask and clearly treats that as a validation signal, not final CAD.

### Quote sizing and package control

- Separates roof maximum potential from the quoted customer package.
- Adds a quick package selector so a salesperson can quote a smaller standard system even when the roof can physically fit more capacity.
- Keeps package sizing tied to KSolar BOM tiers instead of silently inventing arbitrary system sizes.
- Updates tests so a roof that supports a larger capacity can still be quoted at a smaller selected tier.

### Thailand finance and ROI

- Improves finance output from simple checkbox effects into a clearer customer-facing structure:
  - total investment
  - subsidy/tax benefit estimate
  - down payment
  - financed principal
  - monthly payment
  - annual savings
  - export revenue estimate
  - payback period
- Treats Thailand tax deduction benefits as estimated tax value, not a direct cash rebate.
- Keeps bank-loan assumptions explicit in code configuration so they can be updated after policy and product validation.

### BOM and proposal presentation

- Cleans up BOM summary hierarchy so sales users can separate customer-facing price from internal cost structure.
- Keeps BOM details available but secondary to price, ROI, and payback.
- Maintains code-side equipment catalogs and package templates as the source of truth.

## Validation Commands

Run these before each deployment or handoff:

```bash
npm run lint
npm run test
npm run build
```

## Known Limits For Field Testing

- Google Solar's native model still reports its own raw panel assumptions, commonly 400W. KSolar converts capacity comparison into the selected KSolar panel spec, but Google raw values are still shown as technical reference.
- The panel rectangles are an approximate visualization based on Google panel placements, not final engineering CAD.
- Current array design is not yet user-editable on the map. Manual panel add/remove, setback rules, and obstruction exclusion are future engineering-design features.
- Google Solar coverage and imagery quality vary by location. Some Thai roofs may return base-quality imagery or no data.
- Finance numbers are estimates for sales qualification. Final bank approval, interest rate, down payment, tax eligibility, and subsidy eligibility must be confirmed by the provider.
- Drawing on mobile still has inherent friction because polygon tapping competes with map pan/zoom gestures; rectangle-first flow is recommended for fast field testing.

## Handoff Guidance

For v1 testing, the team should judge whether the tool answers three field-sales questions quickly:

- Can this roof likely support solar?
- Which standard KSolar package should we quote?
- What are the customer-facing investment, monthly payment, savings, and payback?

If a tester questions a number, use the calculation breakdown, Google Solar card, and BOM breakdown to locate whether the issue comes from roof geometry, Google Solar source data, KSolar package selection, pricing, or finance assumptions.
