# KSolar v1.0 Test Plan

## Purpose

Version 1.0 should be tested in two separate passes:

- Pass A: functional correctness
- Pass B: UI layout and usability

Do not mix the two during field testing. A quote can be mathematically correct while the UI is still awkward, and a clean UI can still hide a bad sizing assumption.

## Pass A: Functional Correctness

### A1. Map and roof selection

Acceptance criteria:

- Address search moves the map to the expected location.
- Satellite map loads on desktop and mobile.
- User can draw a polygon around the intended roof.
- Gross area updates after drawing.
- Usable area updates from the configured usable-area factor.
- Editing or redrawing the roof refreshes the selected roof state.

Fail conditions:

- The map picks a roof without user confirmation.
- The drawn roof does not update calculation inputs.
- Step 3 shows stale Google Solar analysis after roof redraw.

### A2. Google Solar match

Acceptance criteria:

- `buildingInsights` returns imagery quality, roof area, max array area, panel configs, and roof segments when available.
- Google building center / panel points are visibly compared with the user-drawn roof.
- The UI clearly marks matched, partial, outside, or manual-only status.
- If Google data is outside the selected roof, KSolar does not silently use it as the quote basis.

Fail conditions:

- Google Solar points sit outside the selected roof but the system says it is matched.
- Empty land or neighboring roofs are treated as a confirmed customer roof.

### A3. Google data layers

Acceptance criteria:

- `dataLayers` returns mask, annual flux, monthly flux, and hourly shade paths when available.
- GeoTIFF files are downloaded through the server proxy, not directly with the API key in the browser.
- Annual flux overlay appears on the review map.
- Raster statistics are clipped by `Google building mask intersection user-drawn roof polygon`.
- If the drawn roof has no raster-pixel overlap but the Google building is available, the heatmap falls back to the Google building mask and the UI should still warn that the user selection needs review.
- Selected roof, Google roof outline, Google panel array, and annual flux heatmap can be toggled independently on the review map.
- Monthly flux and shade summaries update after roof redraw.

Fail conditions:

- Flux overlay covers the entire Google building when the user drew only one roof section.
- Heatmap, panel array, or roof outline appears with no way to turn it off.
- Monthly or shade summaries keep old values after editing the roof.

### A4. Panel-specific sizing

Acceptance criteria:

- Changing the selected panel changes roof-fit panel count when dimensions differ.
- Changing the selected panel changes roof-fit kWp.
- Changing the selected panel changes quoted package kWp.
- Google Solar cross-check uses the selected panel wattage and footprint, not a hardcoded default.

Example checks:

- A 10kW BOM family with 16 x 650W panels displays `10.4 kWp`.
- The same 10kW BOM family with 16 x 550W panels displays `8.8 kWp`.

Fail conditions:

- BOM cost changes but roof-fit kWp remains locked to 650W assumptions.
- Google comparison text says 650W when another panel is selected.

### A5. BOM and pricing

Acceptance criteria:

- Phase, topology, battery mode, and tier select the correct BOM template.
- Panel, inverter, and battery catalog choices override model and unit cost.
- BOM quantities remain controlled by the selected standard tier.
- Suggested sell price uses BOM cost, pricing preset, and market benchmark guardrails.

Fail conditions:

- Selecting a battery does not add battery BOM category.
- Selecting a panel changes quantity unexpectedly without a tier change.

### A6. Thailand ROI

Acceptance criteria:

- Annual generation is based on quoted package kWp.
- Retail rate is `4.18 + FT`.
- Self-consumption and export ratios affect annual savings.
- Finance products reduce net customer price according to code config.
- Loan display separates down payment, financed principal, monthly payment, total interest, and net monthly cashflow.
- Tax benefit is shown as an estimated tax value, not as a guaranteed direct rebate.
- Loan monthly payment is shown separately from base project IRR.

Fail conditions:

- Roof potential generation is shown as the formal quoted generation.
- Loan interest changes the base project IRR without a clearly documented reason.

## Pass B: UI Layout And Usability

### B1. Workflow structure

Acceptance criteria:

- A sales user can understand the next required action without reading long instructions.
- Step 1 focuses on location and roof drawing.
- Step 2 focuses on system and equipment selection.
- Step 3 keeps the roof review map and Google Solar estimate together.
- Step 4 presents proposal, price, ROI, and BOM.

Fail conditions:

- The map is far away from the Google Solar result in Step 3.
- Key numbers are buried under long explanatory text.

### B2. Desktop layout

Acceptance criteria:

- Main map area is large enough for roof drawing.
- Right-side panels are scannable without text crowding.
- Tables and BOM sections do not overflow horizontally.
- Primary numbers use consistent hierarchy.

Test viewport:

- `1440 x 900`
- `1280 x 800`

### B3. Mobile layout

Acceptance criteria:

- Map remains visible and usable.
- Step cards stack vertically without clipping.
- Buttons and form controls are easy to tap.
- Long Chinese, English, and Thai text wraps cleanly.

Test viewport:

- `390 x 844`
- `430 x 932`

### B4. Multilingual display

Acceptance criteria:

- Language switch updates the whole page.
- Chinese, English, and Thai labels fit their containers.
- Key technical terms stay understandable to sales users.

Fail conditions:

- Thai text overflows buttons or cards.
- Mixed-language fallback appears in core workflow sections.

## Tester Feedback Format

Ask each tester to record:

- tester name
- device
- browser
- address tested
- roof type
- selected panel / inverter / battery
- expected capacity
- actual KSolar capacity
- Google Solar capacity
- whether the recommendation felt reasonable
- screenshot of any layout issue
- one sentence describing where they got stuck

## Release Gate

KSolar v1.0 is ready for broader internal testing when:

- `npm run test` passes
- `npm run lint` passes
- `npm run build` passes
- 3 desktop tests complete without blocker
- 3 mobile tests complete without blocker
- at least 5 real Thai roof addresses have been tested
- no known issue causes an obviously wrong quote without warning
