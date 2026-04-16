import { SOLAR_DEFAULTS } from "@/lib/config/solar";
import type { RoofShape } from "@/types/quote";
import type { GoogleSolarSummary, SolarLatLng } from "@/types/solar";

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
  matchedPoints: number;
  totalPoints: number;
}

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
      matchedPoints: 0,
      totalPoints: 0,
    };
  }

  const geospatialShapes = shapes.filter((shape) => shape.path.length > 0);
  if (geospatialShapes.length === 0) {
    return {
      status: "manual-only",
      distanceToNearestShapeMeters: null,
      isInsideSelection: null,
      overlapRatio: null,
      matchedPoints: 0,
      totalPoints: 0,
    };
  }

  const selectionContainsPoint = (point: SolarLatLng) =>
    geospatialShapes.some((shape) =>
      isPointInsidePath(point, shape.path),
    );

  const samplePoints =
    solarSummary?.solarPanels.length
      ? solarSummary.solarPanels.map((panel) => panel.center)
      : solarSummary?.roofSegments.length
        ? solarSummary.roofSegments
            .map((segment) => segment.center)
            .filter((center): center is SolarLatLng => Boolean(center))
        : [buildingCenter];

  const matchedPoints = samplePoints.filter((point) => selectionContainsPoint(point)).length;
  const totalPoints = samplePoints.length;
  const overlapRatio = totalPoints > 0 ? matchedPoints / totalPoints : null;
  const isInsideSelection = selectionContainsPoint(buildingCenter);

  const centroidDistances = geospatialShapes
    .map((shape) => getShapeCentroid(shape))
    .filter((centroid): centroid is SolarLatLng => centroid !== null)
    .map((centroid) => getDistanceMeters(buildingCenter, centroid));

  const distanceToNearestShapeMeters =
    centroidDistances.length > 0 ? Math.min(...centroidDistances) : null;

  let status: SolarSelectionMatchStatus = "outside-selection";

  if (overlapRatio !== null) {
    if (overlapRatio >= 0.8) {
      status = "inside-selection";
    } else if (overlapRatio >= 0.2 || isInsideSelection) {
      status = "partial-selection";
    }
  } else if (isInsideSelection) {
    status = "inside-selection";
  }

  return {
    status,
    distanceToNearestShapeMeters,
    isInsideSelection,
    overlapRatio,
    matchedPoints,
    totalPoints,
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
  if (!insights?.recommendedConfig || insights.panelCapacityWatts <= 0) {
    return null;
  }

  return (
    (insights.recommendedConfig.panelsCount * insights.panelCapacityWatts) / 1000
  );
}

export function getGoogleSolarNormalizedEquivalent(
  insights?: GoogleSolarSummary | null,
): {
  equivalentKw: number | null;
  equivalentPanelCount: number | null;
  layoutAreaM2: number | null;
} {
  if (!insights?.recommendedConfig) {
    return {
      equivalentKw: null,
      equivalentPanelCount: null,
      layoutAreaM2: null,
    };
  }

  const googlePanelAreaM2 = insights.panelHeightMeters * insights.panelWidthMeters;
  if (googlePanelAreaM2 <= 0 || SOLAR_DEFAULTS.panelAreaM2 <= 0) {
    return {
      equivalentKw: null,
      equivalentPanelCount: null,
      layoutAreaM2: null,
    };
  }

  const layoutAreaM2 = insights.recommendedConfig.panelsCount * googlePanelAreaM2;
  const equivalentPanelCount = Math.floor(layoutAreaM2 / SOLAR_DEFAULTS.panelAreaM2);

  return {
    equivalentKw:
      equivalentPanelCount > 0
        ? (equivalentPanelCount * SOLAR_DEFAULTS.panelPowerWp) / 1000
        : 0,
    equivalentPanelCount,
    layoutAreaM2,
  };
}

export function getGoogleSolarSellableFit(
  insights?: GoogleSolarSummary | null,
): {
  equivalentKw: number | null;
  equivalentPanelCount: number | null;
  layoutAreaM2: number | null;
} {
  if (!insights || insights.maxArrayAreaMeters2 <= 0) {
    return {
      equivalentKw: null,
      equivalentPanelCount: null,
      layoutAreaM2: null,
    };
  }

  const equivalentPanelCount = Math.floor(
    insights.maxArrayAreaMeters2 / SOLAR_DEFAULTS.panelAreaM2,
  );

  return {
    equivalentKw:
      equivalentPanelCount > 0
        ? (equivalentPanelCount * SOLAR_DEFAULTS.panelPowerWp) / 1000
        : 0,
    equivalentPanelCount,
    layoutAreaM2: insights.maxArrayAreaMeters2,
  };
}

export function getGoogleSolarSellableAnnualGeneration(
  insights?: GoogleSolarSummary | null,
): number | null {
  if (!insights?.recommendedConfig || insights.recommendedConfig.yearlyEnergyDcKwh <= 0) {
    return null;
  }

  const googleRawKw = getGoogleSolarRecommendedKw(insights);
  const sellableFit = getGoogleSolarSellableFit(insights);
  const targetKw = sellableFit.equivalentKw;

  if (!googleRawKw || !targetKw || googleRawKw <= 0 || targetKw <= 0) {
    return null;
  }

  return insights.recommendedConfig.yearlyEnergyDcKwh * (targetKw / googleRawKw);
}

export function buildSolarCrossCheckSummary(
  insights: GoogleSolarSummary,
  roofFitSystemWp: number,
): SolarCrossCheckSummary {
  const googleRawKw = getGoogleSolarRecommendedKw(insights);
  const sellableFit = getGoogleSolarSellableFit(insights);
  const normalizedEquivalent = getGoogleSolarNormalizedEquivalent(insights);
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
      ? "High-confidence roof imagery. Suitable as a strong technical cross-check for roof fit and orientation."
      : insights.imageryQuality === "MEDIUM"
        ? "Medium-confidence imagery. Good for directional validation, but still worth checking odd roof edges manually."
        : "Base-quality imagery only. Treat this as directional guidance, not a final engineering truth.";

  const usageSummary =
    "Use Google Solar for roof-fit, roof segments, and solar resource. Use the KSolar rule engine and your sellable module specs for panel count, BOM, pricing, and Thailand ROI.";

  const cautionSummary =
    insights.panelCapacityWatts > 0
      ? `Google Solar is modeling around ${insights.panelCapacityWatts}W panels, but the primary comparison here is re-run with your ${SOLAR_DEFAULTS.panelPowerWp}W sellable module. Treat Google's raw layout as a reference, not the sales baseline.`
      : "Capacity differences can come from panel wattage assumptions, layout spacing, or setbacks.";

  return {
    googleRecommendedKw,
    googleRawKw,
    sellableFitKw: sellableFit.equivalentKw,
    sellableFitPanelCount: sellableFit.equivalentPanelCount,
    normalizedEquivalentKw: normalizedEquivalent.equivalentKw,
    normalizedEquivalentPanelCount: normalizedEquivalent.equivalentPanelCount,
    googleLayoutAreaM2: sellableFit.layoutAreaM2 ?? normalizedEquivalent.layoutAreaM2,
    ksolarPanelPowerWp: SOLAR_DEFAULTS.panelPowerWp,
    manualKw,
    deltaKw,
    status,
    actionSummary,
    confidenceSummary,
    usageSummary,
    cautionSummary,
  };
}
