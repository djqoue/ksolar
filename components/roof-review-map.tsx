"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Circle as GoogleMapCircle, GoogleMap, GroundOverlay, Polygon as GoogleMapPolygon, useJsApiLoader } from "@react-google-maps/api";
import { CheckCircle2, MapPinned, PenSquare, TriangleAlert } from "lucide-react";
import { useAppCopy } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RUNTIME_FALLBACKS } from "@/lib/config/runtime-fallbacks";
import { GOOGLE_MAP_LIBRARIES } from "@/lib/maps";
import { buildSolarDataLayerAnalysis } from "@/lib/solar-raster";
import { formatNumber } from "@/lib/utils";
import type { SolarSelectionMatchSummary } from "@/lib/solar";
import type { MapSelectionSummary } from "@/types/quote";
import type { GoogleSolarDataLayerPaths, SolarDataLayerAnalysis, GoogleSolarSummary, SolarLatLng } from "@/types/solar";

interface RoofReviewMapProps {
  selection: MapSelectionSummary;
  solarInsights?: GoogleSolarSummary | null;
  solarDataLayers?: GoogleSolarDataLayerPaths | null;
  selectionMatch?: SolarSelectionMatchSummary | null;
  fallbackCenter?: SolarLatLng | null;
  onEditRoof: () => void;
}

function boundsToPath(bounds?: GoogleSolarSummary["boundingBox"]) {
  if (!bounds) {
    return [];
  }

  return [
    { lat: bounds.ne.latitude, lng: bounds.sw.longitude },
    { lat: bounds.ne.latitude, lng: bounds.ne.longitude },
    { lat: bounds.sw.latitude, lng: bounds.ne.longitude },
    { lat: bounds.sw.latitude, lng: bounds.sw.longitude },
  ];
}

function selectionHasGeoShapes(selection: MapSelectionSummary) {
  return selection.shapes.some((shape) => shape.path.length > 0);
}

export function RoofReviewMap({
  selection,
  solarInsights,
  solarDataLayers,
  selectionMatch,
  fallbackCenter,
  onEditRoof,
}: RoofReviewMapProps) {
  const copy = useAppCopy();
  const googleMapsApiKey =
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || RUNTIME_FALLBACKS.googleMapsApiKey;
  const mapRef = useRef<google.maps.Map | null>(null);
  const hasGeoSelection = selectionHasGeoShapes(selection);
  const [dataLayerAnalysis, setDataLayerAnalysis] = useState<SolarDataLayerAnalysis | null>(null);
  const [isAnalyzingLayers, setIsAnalyzingLayers] = useState(false);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey,
    libraries: GOOGLE_MAP_LIBRARIES,
  });

  useEffect(() => {
    let isCancelled = false;

    if (!solarDataLayers) {
      setDataLayerAnalysis(null);
      return;
    }

    setIsAnalyzingLayers(true);
    buildSolarDataLayerAnalysis(solarDataLayers)
      .then((analysis) => {
        if (!isCancelled) {
          setDataLayerAnalysis(analysis);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setDataLayerAnalysis(null);
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsAnalyzingLayers(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [solarDataLayers]);

  const bestFluxMonth = useMemo(() => {
    const monthly = dataLayerAnalysis?.monthlyFlux?.monthlyFluxMeans;
    if (!monthly || monthly.length === 0) {
      return null;
    }

    let index = 0;
    let value = monthly[0] || 0;

    monthly.forEach((entry, entryIndex) => {
      if (entry > value) {
        value = entry;
        index = entryIndex;
      }
    });

    return { index, value };
  }, [dataLayerAnalysis?.monthlyFlux?.monthlyFluxMeans]);

  const lowestFluxMonth = useMemo(() => {
    const monthly = dataLayerAnalysis?.monthlyFlux?.monthlyFluxMeans;
    if (!monthly || monthly.length === 0) {
      return null;
    }

    let index = 0;
    let value = monthly[0] || 0;

    monthly.forEach((entry, entryIndex) => {
      if (entry < value) {
        value = entry;
        index = entryIndex;
      }
    });

    return { index, value };
  }, [dataLayerAnalysis?.monthlyFlux?.monthlyFluxMeans]);

  const initialCenter = useMemo(() => {
    if (solarInsights?.center) {
      return { lat: solarInsights.center.latitude, lng: solarInsights.center.longitude };
    }

    const firstPoint = selection.shapes.find((shape) => shape.path.length > 0)?.path[0];
    if (firstPoint) {
      return firstPoint;
    }

    if (fallbackCenter) {
      return { lat: fallbackCenter.latitude, lng: fallbackCenter.longitude };
    }

    return { lat: 13.7563, lng: 100.5018 };
  }, [fallbackCenter, selection.shapes, solarInsights?.center]);

  useEffect(() => {
    if (!mapRef.current || typeof google === "undefined") {
      return;
    }

    const bounds = new google.maps.LatLngBounds();
    let hasBounds = false;

    selection.shapes.forEach((shape) => {
      shape.path.forEach((point) => {
        bounds.extend(point);
        hasBounds = true;
      });
    });

    if (solarInsights?.boundingBox) {
      bounds.extend({
        lat: solarInsights.boundingBox.sw.latitude,
        lng: solarInsights.boundingBox.sw.longitude,
      });
      bounds.extend({
        lat: solarInsights.boundingBox.ne.latitude,
        lng: solarInsights.boundingBox.ne.longitude,
      });
      hasBounds = true;
    } else if (solarInsights?.center) {
      bounds.extend({
        lat: solarInsights.center.latitude,
        lng: solarInsights.center.longitude,
      });
      hasBounds = true;
    }

    if (hasBounds) {
      mapRef.current.fitBounds(bounds, 48);
      return;
    }

    mapRef.current.setCenter(initialCenter);
    mapRef.current.setZoom(19);
  }, [initialCenter, selection.shapes, solarInsights]);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border/60">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>{copy.solar.reviewMapTitle}</CardTitle>
            <CardDescription>{copy.solar.reviewMapDescription}</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={onEditRoof}>
            <PenSquare data-icon="inline-start" />
            {copy.solar.editRoof}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border/70 bg-muted/30 px-4 py-3 text-sm">
            <div className="metric-label">{copy.map.grossArea}</div>
            <div className="mt-1 text-base font-semibold text-slate-900">{formatNumber(selection.grossAreaM2, 1)} m²</div>
          </div>
          <div className="rounded-xl border border-border/70 bg-muted/30 px-4 py-3 text-sm">
            <div className="metric-label">{copy.map.usableArea}</div>
            <div className="mt-1 text-base font-semibold text-slate-900">{formatNumber(selection.usableAreaM2, 1)} m²</div>
          </div>
          <div className="rounded-xl border border-border/70 bg-muted/30 px-4 py-3 text-sm">
            <div className="metric-label">{copy.solar.roofSelectionCount}</div>
            <div className="mt-1 text-base font-semibold text-slate-900">{formatNumber(selection.shapes.length)}</div>
          </div>
        </div>

        {solarDataLayers ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-border/70 bg-muted/30 px-4 py-3 text-sm">
              <div className="metric-label">{copy.solar.annualFluxMean}</div>
              <div className="mt-1 text-base font-semibold text-slate-900">
                {dataLayerAnalysis?.annualFluxOverlay?.meanFlux !== null &&
                dataLayerAnalysis?.annualFluxOverlay?.meanFlux !== undefined
                  ? `${formatNumber(dataLayerAnalysis.annualFluxOverlay.meanFlux, 0)} kWh/kW/yr`
                  : isAnalyzingLayers
                    ? copy.solar.loading
                    : "N/A"}
              </div>
            </div>
            <div className="rounded-xl border border-border/70 bg-muted/30 px-4 py-3 text-sm">
              <div className="metric-label">{copy.solar.bestFluxMonth}</div>
              <div className="mt-1 text-base font-semibold text-slate-900">
                {bestFluxMonth ? copy.solar.monthName(bestFluxMonth.index) : isAnalyzingLayers ? copy.solar.loading : "N/A"}
              </div>
            </div>
            <div className="rounded-xl border border-border/70 bg-muted/30 px-4 py-3 text-sm">
              <div className="metric-label">{copy.solar.lowestFluxMonth}</div>
              <div className="mt-1 text-base font-semibold text-slate-900">
                {lowestFluxMonth ? copy.solar.monthName(lowestFluxMonth.index) : isAnalyzingLayers ? copy.solar.loading : "N/A"}
              </div>
            </div>
            <div className="rounded-xl border border-border/70 bg-muted/30 px-4 py-3 text-sm">
              <div className="metric-label">{copy.solar.sunAccess}</div>
              <div className="mt-1 text-base font-semibold text-slate-900">
                {dataLayerAnalysis?.hourlyShade?.monthlySunAccessRatio.length
                  ? `${formatNumber(
                      (dataLayerAnalysis.hourlyShade.monthlySunAccessRatio.reduce((sum, value) => sum + value, 0) /
                        dataLayerAnalysis.hourlyShade.monthlySunAccessRatio.length) *
                        100,
                      0,
                    )}%`
                  : isAnalyzingLayers
                    ? copy.solar.loading
                    : "N/A"}
              </div>
            </div>
          </div>
        ) : null}

        {!hasGeoSelection ? (
          <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
            {copy.solar.reviewMapNoSelection}
          </div>
        ) : null}

        {selectionMatch?.status === "inside-selection" ? (
          <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
            <div>{copy.solar.reviewMapMatched}</div>
          </div>
        ) : null}

        {selectionMatch?.status === "partial-selection" ? (
          <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <div>
              <div className="font-medium">{copy.solar.reviewMapPartial}</div>
              {selectionMatch.overlapRatio !== null ? (
                <div className="mt-1 text-amber-900/80">
                  {copy.solar.overlapInsideSelection}: {formatNumber(selectionMatch.overlapRatio * 100, 0)}%
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {selectionMatch?.status === "outside-selection" ? (
          <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <div>
              <div className="font-medium">{copy.solar.reviewMapUnmatched}</div>
              {selectionMatch.distanceToNearestShapeMeters !== null ? (
                <div className="mt-1 text-amber-900/80">
                  {copy.solar.distanceFromSelection}: {formatNumber(selectionMatch.distanceToNearestShapeMeters, 1)} m
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="relative h-[320px] overflow-hidden rounded-[1.1rem] border border-border/70 sm:h-[420px]">
          <div className="pointer-events-none absolute inset-x-3 top-3 z-10 flex flex-wrap gap-2">
            <div className="rounded-full bg-background/92 px-3 py-1.5 text-[11px] font-medium text-foreground shadow-sm">
              <MapPinned className="mr-1 inline size-3.5" />
              {copy.solar.selectedRoofOverlay}
            </div>
            {solarInsights ? (
              <div className="rounded-full bg-background/92 px-3 py-1.5 text-[11px] font-medium text-foreground shadow-sm">
                {copy.solar.mapOverlayTitle}
              </div>
            ) : null}
          </div>

          {isLoaded ? (
            <GoogleMap
              mapContainerClassName="h-full w-full"
              center={initialCenter}
              zoom={19}
              onLoad={(map) => {
                mapRef.current = map;
                map.setMapTypeId("satellite");
              }}
              options={{
                draggable: true,
                fullscreenControl: false,
                streetViewControl: false,
                mapTypeControl: true,
                clickableIcons: false,
                keyboardShortcuts: false,
              }}
            >
              {dataLayerAnalysis?.annualFluxOverlay ? (
                <GroundOverlay
                  key={dataLayerAnalysis.annualFluxOverlay.dataUrl}
                  url={dataLayerAnalysis.annualFluxOverlay.dataUrl}
                  bounds={{
                    north: dataLayerAnalysis.annualFluxOverlay.bounds.north,
                    south: dataLayerAnalysis.annualFluxOverlay.bounds.south,
                    east: dataLayerAnalysis.annualFluxOverlay.bounds.east,
                    west: dataLayerAnalysis.annualFluxOverlay.bounds.west,
                  }}
                  options={{
                    clickable: false,
                    opacity: 0.72,
                  }}
                />
              ) : null}

              {selection.shapes
                .filter((shape) => shape.path.length > 0)
                .map((shape) => (
                  <GoogleMapPolygon
                    key={shape.id}
                    path={shape.path}
                    options={{
                      clickable: false,
                      editable: false,
                      fillColor: "#f97316",
                      fillOpacity: 0.18,
                      strokeColor: "#f97316",
                      strokeOpacity: 0.95,
                      strokeWeight: 2,
                      zIndex: 4,
                    }}
                  />
                ))}

              {solarInsights?.boundingBox ? (
                <GoogleMapPolygon
                  path={boundsToPath(solarInsights.boundingBox)}
                  options={{
                    clickable: false,
                    fillOpacity: 0,
                    strokeColor:
                      selectionMatch?.status === "inside-selection"
                        ? "#14b8a6"
                        : "#f59e0b",
                    strokeOpacity: 0.9,
                    strokeWeight: 2,
                    zIndex: 2,
                  }}
                />
              ) : null}

              {solarInsights?.roofSegments.map((segment) =>
                segment.center ? (
                  <GoogleMapCircle
                    key={`review-segment-${segment.segmentIndex}`}
                    center={{ lat: segment.center.latitude, lng: segment.center.longitude }}
                    radius={1.5}
                    options={{
                      clickable: false,
                      fillColor: "#111827",
                      fillOpacity: 0.8,
                      strokeOpacity: 0,
                      zIndex: 3,
                    }}
                  />
                ) : null,
              )}

              {solarInsights?.solarPanels.slice(0, 180).map((panel, index) => (
                <GoogleMapCircle
                  key={`review-panel-${panel.segmentIndex}-${index}`}
                  center={{ lat: panel.center.latitude, lng: panel.center.longitude }}
                  radius={panel.orientation === "LANDSCAPE" ? 0.95 : 0.8}
                  options={{
                    clickable: false,
                    fillColor: "#14b8a6",
                    fillOpacity: 0.78,
                    strokeColor: "#f8fafc",
                    strokeOpacity: 0.55,
                    strokeWeight: 1,
                    zIndex: 5,
                  }}
                />
              ))}

              {solarInsights?.center ? (
                <GoogleMapCircle
                  center={{ lat: solarInsights.center.latitude, lng: solarInsights.center.longitude }}
                  radius={2.5}
                  options={{
                    clickable: false,
                    fillColor:
                      selectionMatch?.status === "inside-selection"
                        ? "#111827"
                        : "#f59e0b",
                    fillOpacity: 0.9,
                    strokeColor: "#ffffff",
                    strokeOpacity: 0.9,
                    strokeWeight: 2,
                    zIndex: 6,
                  }}
                />
              ) : null}
            </GoogleMap>
          ) : (
            <div className="flex h-full items-center justify-center bg-muted/20 text-sm text-muted-foreground">
              {copy.map.loadingMaps}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
