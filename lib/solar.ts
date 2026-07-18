import { SOLAR_DEFAULTS } from "@/lib/config/solar";
import type { RoofShape } from "@/types/quote";
import type { GoogleSolarSummary, SolarLatLng, SolarPanelFootprint } from "@/types/solar";

export interface SellablePanelProfile {
  areaM2: number;
  longSideM?: number;
  powerWp: number;
  shortSideM?: number;
  weightKg?: number | null;
}

function resolveSellablePanelProfile(profile?: Partial<SellablePanelProfile>): SellablePanelProfile {
  return {
    areaM2: profile?.areaM2 && profile.areaM2 > 0 ? profile.areaM2 : SOLAR_DEFAULTS.panelAreaM2,
    powerWp: profile?.powerWp && profile.powerWp > 0 ? profile.powerWp : SOLAR_DEFAULTS.panelPowerWp,
  };
}

export function centroidFromPath(path: Array<{ lat: number; lng: number }>): SolarLatLng | null {
  if (path.length === 0) {
    return null;
  }

  const totals = path.reduce(
    (sum, point) => ({
      lat: sum.lat + point.lat,
      lng: sum.lng + point.lng,
    }),
    { lat: 0, lng: 0 },
  );

  return {
    latitude: totals.lat / path.length,
    longitude: totals.lng / path.length,
  };
}

export function getSelectionReferencePoint(shapes: RoofShape[]): SolarLatLng | null {
  const geospatialShape = shapes.find((shape) => shape.path.length > 0);
  if (geospatialShape) {
    return centroidFromPath(geospatialShape.path);
  }

  return null;
}

export function formatGoogleDate(
  value?: { year?: number; month?: number; day?: number },
): string | undefined {
  if (!value?.year || !value?.month || !value?.day) {
    return undefined;
  }

  return `${value.year}-${String(value.month).padStart(2, "0")}-${String(value.day).padStart(2, "0")}`;
}

export function extractGeoTiffId(url?: string): string | null {
  if (!url) {
    return null;
  }

  try {
    const parsed = new URL(url);
    return parsed.searchParams.get("id");
  } catch {
    return null;
  }
}

function isPointInsidePath(
  point: { latitude: number; longitude: number },
  path: Array<{ lat: number; lng: number }>,
) {
  if (path.length < 3) {
    return false;
  }

  let inside = false;

  for (let i = 0, j = path.length - 1; i < path.length; j = i++) {
    const xi = path[i].lng;
    const yi = path[i].lat;
    const xj = path[j].lng;
    const yj = path[j].lat;

    const intersects =
      yi > point.latitude !== yj > point.latitude &&
      point.longitude <
        ((xj - xi) * (point.latitude - yi)) / ((yj - yi) || Number.EPSILON) + xi;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

export function isSolarPointInsideSelection(
  point: SolarLatLng,
  shapes: RoofShape[],
) {
  const geospatialShapes = shapes.filter((shape) => shape.path.length > 0);
  if (geospatialShapes.length === 0) {
    return false;
  }

  return geospatialShapes.some((shape) => isPointInsidePath(point, shape.path));
}

function getDistanceMeters(a: SolarLatLng, b: SolarLatLng) {
  const earthRadius = 6371000;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const deltaLat = toRadians(b.latitude - a.latitude);
  const deltaLng = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const haversine =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;

  return 2 * earthRadius * Math.asin(Math.sqrt(haversine));
}

function getShapeCentroid(shape: RoofShape): SolarLatLng | null {
  if (shape.path.length === 0) {
    return null;
  }

  const centroid = centroidFromPath(shape.path);
  if (!centroid) {
    return null;
  }

  return centroid;
}

export type SolarSelectionMatchStatus =
  | "inside-selection"
  | "partial-selection"
  | "outside-selection"
  | "manual-only"
  | "unavailable";

export interface SolarSelectionMatchSummary {
  status: SolarSelectionMatchStatus;
  distanceToNearestShapeMeters: number | null;
  isInsideSelection: boolean | null;
  overlapRatio: number | null;
  areaAgreementRatio: number | null;
  matchedPoints: number;
  totalPoints: number;
  fullyContainedPanels: number;
  quoteEligible: boolean;
  confidence: "quote-eligible" | "reference-only" | "unavailable";
  confidenceReasons: string[];
}

export const SOLAR_QUOTE_MIN_FULL_PANEL_RATIO = 0.8;
export const SOLAR_QUOTE_MIN_AREA_AGREEMENT_RATIO = 0.65;

export function buildSolarSelectionMatchSummary(
  shapes: RoofShape[],
  solarSummary?: GoogleSolarSummary | null,
): SolarSelectionMatchSummary {
  const buildingCenter = solarSummary?.center;

  if (!buildingCenter) {
    return {
      status: "unavailable",
      distanceToNearestShapeMeters: null,
      isInsideSelection: null,
      overlapRatio: null,
      areaAgreementRatio: null,
      matchedPoints: 0,
      totalPoints: 0,
      fullyContainedPanels: 0,
      quoteEligible: false,
      confidence: "unavailable",
      confidenceReasons: ["Google Solar building insights are unavailable."],
    };
  }

  const geospatialShapes = shapes.filter((shape) => shape.path.length > 0);
  if (geospatialShapes.length === 0) {
    return {
      status: "manual-only",
      distanceToNearestShapeMeters: null,
      isInsideSelection: null,
      overlapRatio: null,
      areaAgreementRatio: null,
      matchedPoints: 0,
      totalPoints: 0,
      fullyContainedPanels: 0,
      quoteEligible: false,
      confidence: "reference-only",
      confidenceReasons: ["No geospatial roof selection is available for verification."],
    };
  }

  const selectionContainsPoint = (point: SolarLatLng) =>
    isSolarPointInsideSelection(point, geospatialShapes);

  const panelFootprints = buildGoogleSolarPanelFootprints(solarSummary);
  const fullyContainedPanels = panelFootprints.filter((panel) =>
    panel.path.every((corner) =>
      selectionContainsPoint({ latitude: corner.lat, longitude: corner.lng }),
    ),
  ).length;
  const samplePoints =
    panelFootprints.length > 0
      ? []
      : solarSummary?.roofSegments.length
        ? solarSummary.roofSegments
            .map((segment) => segment.center)
            .filter((center): center is SolarLatLng => Boolean(center))
        : [buildingCenter];

  const matchedPoints =
    panelFootprints.length > 0
      ? fullyContainedPanels
      : samplePoints.filter((point) => selectionContainsPoint(point)).length;
  const totalPoints = panelFootprints.length > 0 ? panelFootprints.length : samplePoints.length;
  const overlapRatio = totalPoints > 0 ? matchedPoints / totalPoints : null;
  const isInsideSelection = selectionContainsPoint(buildingCenter);
  const selectedAreaMeters2 = geospatialShapes.reduce(
    (total, shape) => total + (shape.areaM2 > 0 ? shape.areaM2 : 0),
    0,
  );
  const modeledAreaMeters2 = solarSummary.roofAreaMeters2 ?? 0;
  const areaAgreementRatio =
    selectedAreaMeters2 > 0 && modeledAreaMeters2 > 0
      ? Math.min(selectedAreaMeters2, modeledAreaMeters2) /
        Math.max(selectedAreaMeters2, modeledAreaMeters2)
      : null;

  const centroidDistances = geospatialShapes
    .map((shape) => getShapeCentroid(shape))
    .filter((centroid): centroid is SolarLatLng => centroid !== null)
    .map((centroid) => getDistanceMeters(buildingCenter, centroid));

  const distanceToNearestShapeMeters =
    centroidDistances.length > 0 ? Math.min(...centroidDistances) : null;

  const hasQuoteQuality =
    solarSummary.imageryQuality === "HIGH" || solarSummary.imageryQuality === "MEDIUM";
  const hasFullPanelEvidence = panelFootprints.length > 0;
  const hasEnoughPanelOverlap =
    overlapRatio !== null && overlapRatio >= SOLAR_QUOTE_MIN_FULL_PANEL_RATIO;
  const hasEnoughAreaAgreement =
    areaAgreementRatio !== null &&
    areaAgreementRatio >= SOLAR_QUOTE_MIN_AREA_AGREEMENT_RATIO;
  const hasSingleBuildingSelection = geospatialShapes.length === 1;
  const quoteEligible =
    hasQuoteQuality &&
    hasFullPanelEvidence &&
    hasEnoughPanelOverlap &&
    hasEnoughAreaAgreement &&
    hasSingleBuildingSelection &&
    isInsideSelection;

  let status: SolarSelectionMatchStatus = "outside-selection";
  if (quoteEligible) {
    status = "inside-selection";
  } else if ((overlapRatio !== null && overlapRatio >= 0.2) || isInsideSelection) {
    status = "partial-selection";
  }

  const confidenceReasons: string[] = [];
  if (!hasQuoteQuality) {
    confidenceReasons.push(
      solarSummary.imageryQuality === "BASE"
        ? "BASE satellite imagery is reference-only and cannot drive a formal quote."
        : "Imagery quality is unknown and cannot drive a formal quote.",
    );
  }
  if (!hasFullPanelEvidence) {
    confidenceReasons.push("No complete Google panel footprints are available for selection verification.");
  } else if (!hasEnoughPanelOverlap) {
    confidenceReasons.push(
      `Only ${fullyContainedPanels} of ${panelFootprints.length} Google panel footprints are fully contained in the selected roof.`,
    );
  }
  if (!hasEnoughAreaAgreement) {
    confidenceReasons.push("Selected and Google-modeled roof areas do not meet the quote confidence threshold.");
  }
  if (!isInsideSelection) {
    confidenceReasons.push("The returned building center is outside the selected roof.");
  }
  if (!hasSingleBuildingSelection) {
    confidenceReasons.push(
      "Google Solar returned one nearby building, so a multi-roof selection remains manual until each building is analyzed separately.",
    );
  }

  return {
    status,
    distanceToNearestShapeMeters,
    isInsideSelection,
    overlapRatio,
    areaAgreementRatio,
    matchedPoints,
    totalPoints,
    fullyContainedPanels,
    quoteEligible,
    confidence: quoteEligible ? "quote-eligible" : "reference-only",
    confidenceReasons,
  };
}

export type SolarCrossCheckStatus =
  | "aligned"
  | "check-under-sizing"
  | "check-over-sizing"
  | "no-layout";

export interface SolarCrossCheckSummary {
  googleRecommendedKw: number | null;
  googleRawKw: number | null;
  sellableFitKw: number | null;
  sellableFitPanelCount: number | null;
  normalizedEquivalentKw: number | null;
  normalizedEquivalentPanelCount: number | null;
  googleLayoutAreaM2: number | null;
  ksolarPanelPowerWp: number;
  manualKw: number;
  deltaKw: number | null;
  status: SolarCrossCheckStatus;
  actionSummary: string;
  confidenceSummary: string;
  usageSummary: string;
  cautionSummary: string;
}

export function getGoogleSolarRecommendedKw(
  insights?: GoogleSolarSummary | null,
): number | null {
  const roofFitConfig = insights?.maxConfig ?? insights?.recommendedConfig;
  if (!roofFitConfig || !insights || insights.panelCapacityWatts <= 0) {
    return null;
  }

  return (roofFitConfig.panelsCount * insights.panelCapacityWatts) / 1000;
}

export function getGoogleSolarNormalizedEquivalent(
  insights?: GoogleSolarSummary | null,
  profile?: Partial<SellablePanelProfile>,
): {
  equivalentKw: number | null;
  equivalentPanelCount: number | null;
  layoutAreaM2: number | null;
} {
  const roofFitConfig = insights?.maxConfig ?? insights?.recommendedConfig;
  if (!insights || !roofFitConfig) {
    return {
      equivalentKw: null,
      equivalentPanelCount: null,
      layoutAreaM2: null,
    };
  }

  const sellablePanel = resolveSellablePanelProfile(profile);
  const googlePanelAreaM2 = insights.panelHeightMeters * insights.panelWidthMeters;
  if (googlePanelAreaM2 <= 0 || sellablePanel.areaM2 <= 0) {
    return {
      equivalentKw: null,
      equivalentPanelCount: null,
      layoutAreaM2: null,
    };
  }

  const layoutAreaM2 = roofFitConfig.panelsCount * googlePanelAreaM2;
  const equivalentPanelCount = Math.floor(layoutAreaM2 / sellablePanel.areaM2);

  return {
    equivalentKw:
      equivalentPanelCount > 0
        ? (equivalentPanelCount * sellablePanel.powerWp) / 1000
        : 0,
    equivalentPanelCount,
    layoutAreaM2,
  };
}

export function getGoogleSolarSellableFit(
  insights?: GoogleSolarSummary | null,
  profile?: Partial<SellablePanelProfile>,
): {
  equivalentKw: number | null;
  equivalentPanelCount: number | null;
  layoutAreaM2: number | null;
} {
  if (
    !insights ||
    insights.imageryQuality === "BASE" ||
    insights.imageryQuality === "UNKNOWN" ||
    insights.maxArrayAreaMeters2 <= 0
  ) {
    return {
      equivalentKw: null,
      equivalentPanelCount: null,
      layoutAreaM2: null,
    };
  }

  const sellablePanel = resolveSellablePanelProfile(profile);
  const equivalentPanelCount = Math.floor(
    insights.maxArrayAreaMeters2 / sellablePanel.areaM2,
  );

  return {
    equivalentKw:
      equivalentPanelCount > 0
        ? (equivalentPanelCount * sellablePanel.powerWp) / 1000
        : 0,
    equivalentPanelCount,
    layoutAreaM2: insights.maxArrayAreaMeters2,
  };
}

export function getGoogleSolarSellableAnnualGeneration(
  insights?: GoogleSolarSummary | null,
  profile?: Partial<SellablePanelProfile>,
): number | null {
  const roofFitConfig = insights?.maxConfig ?? insights?.recommendedConfig;
  if (!roofFitConfig || roofFitConfig.yearlyEnergyDcKwh <= 0 || !insights) {
    return null;
  }

  const googleRawKw = getGoogleSolarRecommendedKw(insights);
  const sellableFit = getGoogleSolarSellableFit(insights, profile);
  const targetKw = sellableFit.equivalentKw;

  if (!googleRawKw || !targetKw || googleRawKw <= 0 || targetKw <= 0) {
    return null;
  }

  return roofFitConfig.yearlyEnergyDcKwh * (targetKw / googleRawKw);
}

export function buildSolarCrossCheckSummary(
  insights: GoogleSolarSummary,
  roofFitSystemWp: number,
  profile?: Partial<SellablePanelProfile>,
): SolarCrossCheckSummary {
  const sellablePanel = resolveSellablePanelProfile(profile);
  const googleRawKw = getGoogleSolarRecommendedKw(insights);
  const sellableFit = getGoogleSolarSellableFit(insights, sellablePanel);
  const normalizedEquivalent = getGoogleSolarNormalizedEquivalent(insights, sellablePanel);
  const googleRecommendedKw =
    sellableFit.equivalentKw ?? normalizedEquivalent.equivalentKw ?? googleRawKw;
  const manualKw = roofFitSystemWp / 1000;
  const deltaKw =
    googleRecommendedKw === null ? null : googleRecommendedKw - manualKw;

  const status: SolarCrossCheckStatus =
    googleRecommendedKw === null
      ? "no-layout"
      : deltaKw === null || Math.abs(deltaKw) < 0.5
        ? "aligned"
        : deltaKw > 0
          ? "check-under-sizing"
          : "check-over-sizing";

  const actionSummary =
    status === "no-layout"
      ? "Google Solar found roof-level potential, but not a concrete panel layout recommendation for this point."
      : status === "aligned"
        ? "Google Solar and the current KSolar roof-fit estimate are broadly aligned. This is a good confidence check before selecting the formal package."
        : status === "check-under-sizing"
          ? "Google Solar suggests the roof may support more capacity than the current KSolar roof-fit estimate. Review whether the roof drawing or setbacks are too conservative."
          : "Google Solar suggests a smaller roof-fit than KSolar. Review roof selection, obstruction assumptions, and usable-area rules before finalizing.";

  const confidenceSummary =
    insights.imageryQuality === "HIGH"
      ? "High-quality aerial source imagery. Use it as a remote-screening reference; it is not survey or engineering-grade measurement."
      : insights.imageryQuality === "MEDIUM"
        ? "Medium-quality aerial imagery. Use it for directional validation and verify roof edges, obstacles, and setbacks on site."
        : insights.imageryQuality === "BASE"
          ? "Base-quality satellite imagery is reference-only and must not drive formal panel count, BOM, pricing, or yield."
          : "Imagery quality is unknown. Do not use this result to drive a formal quote.";

  const usageSummary =
    "Use Google Solar for roof-fit, roof segments, and solar resource. Use the KSolar rule engine and your sellable module specs for panel count, BOM, pricing, and Thailand ROI.";

  const cautionSummary =
    insights.panelCapacityWatts > 0
      ? `Google Solar is modeling around ${insights.panelCapacityWatts}W panels, but the primary comparison here is re-run with your ${sellablePanel.powerWp}W sellable module. Treat Google's raw layout as a reference, not the sales baseline.`
      : "Capacity differences can come from panel wattage assumptions, layout spacing, or setbacks.";

  return {
    googleRecommendedKw,
    googleRawKw,
    sellableFitKw: sellableFit.equivalentKw,
    sellableFitPanelCount: sellableFit.equivalentPanelCount,
    normalizedEquivalentKw: normalizedEquivalent.equivalentKw,
    normalizedEquivalentPanelCount: normalizedEquivalent.equivalentPanelCount,
    googleLayoutAreaM2: sellableFit.layoutAreaM2 ?? normalizedEquivalent.layoutAreaM2,
    ksolarPanelPowerWp: sellablePanel.powerWp,
    manualKw,
    deltaKw,
    status,
    actionSummary,
    confidenceSummary,
    usageSummary,
    cautionSummary,
  };
}

function offsetLatLngMeters(
  center: SolarLatLng,
  eastMeters: number,
  northMeters: number,
): SolarLatLng {
  const metersPerDegreeLat = 111_320;
  const metersPerDegreeLng =
    metersPerDegreeLat * Math.cos((center.latitude * Math.PI) / 180);

  return {
    latitude: center.latitude + northMeters / metersPerDegreeLat,
    longitude: center.longitude + eastMeters / (metersPerDegreeLng || metersPerDegreeLat),
  };
}

function panelCornersFromCenter(input: {
  center: SolarLatLng;
  azimuthDegrees: number;
  orientation: "LANDSCAPE" | "PORTRAIT";
  panelHeightMeters: number;
  panelWidthMeters: number;
}) {
  const azimuthRadians = (input.azimuthDegrees * Math.PI) / 180;
  const alongMeters =
    input.orientation === "LANDSCAPE" ? input.panelWidthMeters : input.panelHeightMeters;
  const acrossMeters =
    input.orientation === "LANDSCAPE" ? input.panelHeightMeters : input.panelWidthMeters;

  const alongEast = Math.sin(azimuthRadians);
  const alongNorth = Math.cos(azimuthRadians);
  const acrossEast = Math.sin(azimuthRadians + Math.PI / 2);
  const acrossNorth = Math.cos(azimuthRadians + Math.PI / 2);

  const corners = [
    { along: -alongMeters / 2, across: -acrossMeters / 2 },
    { along: alongMeters / 2, across: -acrossMeters / 2 },
    { along: alongMeters / 2, across: acrossMeters / 2 },
    { along: -alongMeters / 2, across: acrossMeters / 2 },
  ];

  return corners.map((corner) =>
    offsetLatLngMeters(
      input.center,
      corner.along * alongEast + corner.across * acrossEast,
      corner.along * alongNorth + corner.across * acrossNorth,
    ),
  );
}

export function buildGoogleSolarPanelFootprints(
  insights?: GoogleSolarSummary | null,
): SolarPanelFootprint[] {
  if (!insights || insights.panelHeightMeters <= 0 || insights.panelWidthMeters <= 0) {
    return [];
  }

  const segmentAzimuth = new Map(
    insights.roofSegments.map((segment) => [segment.segmentIndex, segment.azimuthDegrees]),
  );

  return insights.solarPanels.map((panel, index) => {
    const azimuthDegrees = segmentAzimuth.get(panel.segmentIndex) ?? 180;
    const corners = panelCornersFromCenter({
      center: panel.center,
      azimuthDegrees,
      orientation: panel.orientation,
      panelHeightMeters: insights.panelHeightMeters,
      panelWidthMeters: insights.panelWidthMeters,
    });

    return {
      id: `google-panel-${panel.segmentIndex}-${index}`,
      center: panel.center,
      segmentIndex: panel.segmentIndex,
      orientation: panel.orientation,
      yearlyEnergyDcKwh: panel.yearlyEnergyDcKwh,
      azimuthDegrees,
      path: corners.map((corner) => ({
        lat: corner.latitude,
        lng: corner.longitude,
      })),
    };
  });
}

export interface SolarSelectionPanelUpperBound {
  sourcePanelCount: number;
  sourcePanelAreaM2: number;
  sourceCapacityKw: number;
  sourceYearlyEnergyDcKwh: number;
  normalizedSellablePanelCount: number;
  normalizedSellableCapacityKw: number;
  quoteEligible: boolean;
  referenceOnly: boolean;
}

/**
 * A conservative, selection-scoped reference derived only from complete Google
 * panel footprints inside the user's roof polygon. The sellable-module values
 * remain area-normalized upper bounds, not a geometric layout.
 */
export function getGoogleSolarSelectionPanelUpperBound(
  insights: GoogleSolarSummary | null | undefined,
  shapes: RoofShape[],
  profile?: Partial<SellablePanelProfile>,
): SolarSelectionPanelUpperBound | null {
  if (
    !insights ||
    insights.panelCapacityWatts <= 0 ||
    insights.panelHeightMeters <= 0 ||
    insights.panelWidthMeters <= 0
  ) {
    return null;
  }

  const fullyContainedPanels = buildGoogleSolarPanelFootprints(insights).filter(
    (panel) =>
      panel.yearlyEnergyDcKwh > 0 &&
      panel.path.every((corner) =>
        isSolarPointInsideSelection(
          { latitude: corner.lat, longitude: corner.lng },
          shapes,
        ),
      ),
  );
  if (fullyContainedPanels.length === 0) {
    return null;
  }

  const sourcePanelAreaM2 =
    fullyContainedPanels.length *
    insights.panelHeightMeters *
    insights.panelWidthMeters;
  const sellablePanel = resolveSellablePanelProfile(profile);
  const normalizedSellablePanelCount = Math.floor(
    sourcePanelAreaM2 / sellablePanel.areaM2,
  );
  const selectionMatch = buildSolarSelectionMatchSummary(shapes, insights);

  return {
    sourcePanelCount: fullyContainedPanels.length,
    sourcePanelAreaM2,
    sourceCapacityKw:
      (fullyContainedPanels.length * insights.panelCapacityWatts) / 1000,
    sourceYearlyEnergyDcKwh: fullyContainedPanels.reduce(
      (total, panel) => total + panel.yearlyEnergyDcKwh,
      0,
    ),
    normalizedSellablePanelCount,
    normalizedSellableCapacityKw:
      (normalizedSellablePanelCount * sellablePanel.powerWp) / 1000,
    quoteEligible: selectionMatch.quoteEligible,
    referenceOnly: !selectionMatch.quoteEligible,
  };
}

export function buildSellableSolarPanelFootprints(
  insights?: GoogleSolarSummary | null,
  profile?: Partial<SellablePanelProfile>,
): SolarPanelFootprint[] {
  if (!insights) {
    return [];
  }

  const sellablePanel = resolveSellablePanelProfile(profile);
  const panelHeightMeters =
    profile?.longSideM && profile.longSideM > 0
      ? profile.longSideM
      : Math.sqrt(sellablePanel.areaM2 * 2);
  const panelWidthMeters =
    profile?.shortSideM && profile.shortSideM > 0
      ? profile.shortSideM
      : sellablePanel.areaM2 / panelHeightMeters;
  const maxPanelCount =
    insights.maxArrayAreaMeters2 > 0 && sellablePanel.areaM2 > 0
      ? Math.floor(insights.maxArrayAreaMeters2 / sellablePanel.areaM2)
      : 0;

  if (maxPanelCount <= 0 || panelHeightMeters <= 0 || panelWidthMeters <= 0) {
    return [];
  }

  const segmentAzimuth = new Map(
    insights.roofSegments.map((segment) => [segment.segmentIndex, segment.azimuthDegrees]),
  );
  const rankedPanels = [...insights.solarPanels]
    .sort((left, right) => right.yearlyEnergyDcKwh - left.yearlyEnergyDcKwh)
    .slice(0, maxPanelCount);

  return rankedPanels.map((panel, index) => {
    const azimuthDegrees = segmentAzimuth.get(panel.segmentIndex) ?? 180;
    const corners = panelCornersFromCenter({
      center: panel.center,
      azimuthDegrees,
      orientation: panel.orientation,
      panelHeightMeters,
      panelWidthMeters,
    });

    return {
      id: `sellable-panel-${panel.segmentIndex}-${index}`,
      center: panel.center,
      segmentIndex: panel.segmentIndex,
      orientation: panel.orientation,
      yearlyEnergyDcKwh: panel.yearlyEnergyDcKwh,
      azimuthDegrees,
      path: corners.map((corner) => ({
        lat: corner.latitude,
        lng: corner.longitude,
      })),
    };
  });
}
