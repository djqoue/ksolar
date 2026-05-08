# Google Solar Utilization Roadmap

## Current Utilization

KSolar currently uses Google Solar for about half of the available data layer, but only part of the contractor workflow.

Implemented:

- `buildingInsights`
- `dataLayers`
- `geoTiff:get`
- roof match detection
- Google panel layout comparison
- Google-to-KSolar panel normalization
- annual flux overlay
- monthly flux summary
- hourly shade summary
- raster clipping against the user-drawn roof polygon
- map layer controls for selected roof, Google roof outline, Google panel array, and annual flux heatmap
- annual flux fallback to the Google building mask when the user-drawn roof has no raster overlap
- approximate rectangular panel footprints based on Google panel centers and KSolar panel dimensions

Not yet fully implemented:

- KSolar-owned custom panel placement optimizer
- roof-segment-level package allocation
- obstruction-aware panel exclusion
- editable panel layout
- inverter string / MPPT checks
- proposal-grade engineering export

## Part 1: Functionality Test Scope

This is the first thing to validate before spending more time polishing UI.

### Goal

Confirm that Google Solar and KSolar calculations agree enough to support a field quote.

### Test cases

- small townhouse roof
- large detached house roof
- roof with two visible slopes
- roof with trees or water tanks
- roof where Google Solar is unavailable
- roof where Google Solar selects the neighboring building
- manual area fallback

### What to record

- address
- selected roof screenshot
- Google imagery quality
- Google raw panel wattage
- Google max array area
- Google panel count
- KSolar selected panel
- KSolar roof-fit kWp
- KSolar quoted package kWp
- annual generation
- warning status
- tester confidence score from 1 to 5

### Pass rule

The function is acceptable for v1.0 if:

- correct roof match is clearly visible
- wrong roof match is clearly warned
- Google and KSolar capacity differences are explained
- selected panel wattage affects all relevant capacity values
- quote is not silently generated from stale or mismatched Google data

## Part 2: UI Layout Test Scope

UI testing should start only after the function test confirms the numbers are understandable.

### Goal

Make the workflow feel simple enough for salespeople to use on site.

### Test cases

- desktop browser
- iPhone-sized screen
- Android-sized screen
- Chinese UI
- English UI
- Thai UI

### What to record

- where the tester paused
- whether Step 3 map and estimate felt connected
- whether the biggest number was the right number
- whether BOM was readable
- whether ROI was understandable within 30 seconds
- screenshot of crowded or broken layout

### Pass rule

The UI is acceptable for v1.0 if:

- user can finish a quote without guidance
- map is large enough to draw accurately
- Step 3 shows map and Google Solar result together
- Step 4 separates proposal, ROI, and BOM cleanly
- mobile layout does not hide the map

## v1.1 Engineering Upgrade

After v1.0 field testing, the next Google Solar upgrade should be:

- create a simple automatic panel placement engine using selected panel dimensions
- place panels only inside the clipped roof mask
- prefer high-flux pixels
- avoid low-sun-access areas
- group placements by roof segment where possible
- allow sales or engineering users to remove individual panels from the suggested layout

The first version can be heuristic:

- use selected panel footprint
- approximate portrait layout
- fill high-flux eligible area
- output panel count, kWp, and expected generation

This does not need to be final engineering CAD. It only needs to create a more believable sales design than a raw Google panel point display.

## v1.2 Engineering Upgrade

After the basic placement engine:

- add portrait / landscape toggle
- add setback factor per roof type
- add obstruction exclusion drawing
- add manual panel removal
- add inverter MPPT and string checks
- add engineer review flag

## Principle

Google Solar should decide spatial potential and solar resource.

KSolar should decide:

- selected panel spec
- sellable package tier
- BOM
- pricing
- Thailand ROI
- customer-facing proposal
