# Google Solar Accuracy and Roadmap

KSolar uses Google Solar as remote-screening evidence. Google does not replace the user's roof selection, KSolar equipment rules, site survey, structural review, electrical design, or construction layout.

## Current implementation

- Authenticated server proxies for `buildingInsights:findClosest`, `dataLayers:get`, and GeoTIFF retrieval.
- One `requiredQuality=BASE&exactQualityRequired=false` request so Google can return the best available HIGH, MEDIUM, or BASE record without cascading billable quality retries.
- Building, imagery date/quality, roof segments, panel configurations, financial-analysis linkage, and panel-placement metadata are preserved separately.
- Strict selection matching requires exactly one selected roof, HIGH/MEDIUM imagery, building center inside it, at least 80% of Google panel footprints fully contained, and at least 65% selected/Google area agreement. Multi-roof selections stay manual until each building can be analyzed separately.
- BASE/UNKNOWN imagery is reference-only. It cannot supply formal roof fit, generation calibration, BOM, or price.
- Selection-scoped upper bounds count only Google panel footprints whose complete corners are inside the drawn polygon.
- Annual and monthly flux and hourly shade are clipped with a spatially aligned `building mask ∩ selected roof` mask.
- GeoTIFF `-9999` and declared no-data values are excluded. Hourly shade decodes the documented 31-day bit mask and rejects the invalid high bit.
- Browser requests use `no-store`; only duplicate in-flight requests and a bounded in-memory raster cache are reused. Solar responses are not persisted in `localStorage`.

## Google limits that affect accuracy

1. `findClosest` searches for a nearby modeled building; it does not guarantee that the returned building is the roof the user intended. Neighboring-roof mismatch must remain visible and must block Google-driven quotation values.
2. Thailand has limited-area BASE coverage, not nationwide coverage. No result is a normal, supported outcome.
3. `imageryQuality` describes Google's imagery/source processing tier. It is not a certified roof-measurement error bound. BASE imagery resolution must not be presented as coordinate accuracy.
4. `wholeRoofStats` covers roof segments assigned by Google's model and must not be described as guaranteed complete-building geometry. `buildingStats` and the user-drawn roof remain separate evidence.
5. Google panel configurations are based on Google's panel size and layout rules. KSolar's wattage/area normalization is an upper-bound comparison, not proof that a different module geometry can be placed in the same positions.
6. Panel rectangles reconstructed from centers, orientation, segment azimuth, and Google dimensions are visualization footprints, not CAD.
7. Building Insights and Data Layers can have different pixel resolutions. Raster masks must be geospatially aligned rather than joined by array index.
8. Google yearly energy is DC model output. KSolar applies its own 15% system-loss assumption before customer-facing savings.

Official references:

- [Building Insights `findClosest`](https://developers.google.com/maps/documentation/solar/reference/rest/v1/buildingInsights/findClosest)
- [Solar API data layers](https://developers.google.com/maps/documentation/solar/data-layers)
- [Solar API coverage](https://developers.google.com/maps/documentation/solar/coverage)
- [Solar API policies](https://developers.google.com/maps/documentation/solar/policies)

## Allowed use by confidence

| Result | KSolar use |
| --- | --- |
| HIGH/MEDIUM and strict single-building selection match passes | May calibrate annual specific yield and show a selection-scoped upper-bound reference; formal panel count still follows the KSolar/manual roof rule until geometric design and site verification. |
| HIGH/MEDIUM but match fails | Reference overlay and mismatch explanation only; manual roof result remains authoritative. |
| BASE or UNKNOWN | Reference visualization only; never formal panel count, yield, BOM, or price. |
| No Google result | Continue with clearly labelled manual-area screening. |

## What “roof maximum” means

The roof-maximum option is the largest complete-module capacity supported by the accepted screening evidence. It is intentionally separated from 5/10/15/20 kW packages and returns no committed BOM or customer price. It must be labelled **technical potential only** and escalated to engineering when it exceeds the committed phase/package range.

It does not prove:

- required fire/access setbacks or utility clearances;
- obstacle, drainage, maintenance-path, or edge-zone compliance;
- roof structure, waterproofing, anchor design, or wind loading;
- final portrait/landscape placement, strings, cable routes, protection, or export approval.

## Roadmap to a professional analysis report

1. Build a Thailand ground-truth set covering HIGH, MEDIUM, BASE, no-data, adjacent-building, multi-slope, and obstructed roofs; compare panel count, roof area, and annual yield with site measurements and commissioned-system data.
2. Add KSolar-owned geometric placement using selected module dimensions, roof polygons, setbacks, access paths, and explicit obstruction zones. Keep manual panel removal and engineer approval.
3. Use DSM/RGB evidence for obstacle and roof-plane review, while preserving source date, imagery quality, selection-match metrics, model assumptions, and warnings in every report.
4. Validate generation against a second professional model or measured production and document uncertainty bands rather than presenting one number as guaranteed output.
5. Require field confirmation of structure, electrical single-line design, inverter strings/MPPT, protection, interconnection, and export permission before issuing an engineering-grade report.

## Launch acceptance

- Wrong-building, partial-overlap, BASE, UNKNOWN, and unavailable cases never silently become formal quote inputs.
- Redrawing or changing the selected site invalidates stale Solar results.
- Annual/monthly/hourly layers stay clipped to the selected roof and ignore no-data pixels.
- Google source values, KSolar-normalized values, and formal package values remain visibly distinct.
- API keys remain server-side, authenticated routes reject unauthorized users, and Google attribution/policy requirements are retained.
