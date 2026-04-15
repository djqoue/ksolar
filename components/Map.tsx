"use client";

import { useEffect, useRef, useState } from "react";
import {
  Circle as GoogleMapCircle,
  DrawingManager,
  GoogleMap,
  Polygon as GoogleMapPolygon,
  useJsApiLoader,
} from "@react-google-maps/api";
import { LocateFixed, MapPin, RefreshCw, Search, Square, Trash2, Workflow } from "lucide-react";
import { useAppCopy } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DEFAULT_MAP_CENTER, GOOGLE_MAP_LIBRARIES, createEmptyMapSelection } from "@/lib/maps";
import { RUNTIME_FALLBACKS } from "@/lib/config/runtime-fallbacks";
import { formatNumber } from "@/lib/utils";
import { SOLAR_DEFAULTS } from "@/lib/config/solar";
import type { SolarSelectionMatchSummary } from "@/lib/solar";
import type { MapSelectionSummary, RoofShape, ShapeKind } from "@/types/quote";
import type { GoogleSolarSummary } from "@/types/solar";

interface OverlayRecord {
  id: string;
  kind: ShapeKind;
  overlay: google.maps.Polygon | google.maps.Rectangle;
}

interface MapProps {
  value: MapSelectionSummary;
  onChange: (value: MapSelectionSummary) => void;
  onCenterChange?: (value: { latitude: number; longitude: number }) => void;
  solarInsights?: GoogleSolarSummary | null;
  solarSelectionMatch?: SolarSelectionMatchSummary | null;
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

function rectangleToPath(rectangle: google.maps.Rectangle) {
  const bounds = rectangle.getBounds();
  if (!bounds) {
    return [];
  }

  const northEast = bounds.getNorthEast();
  const southWest = bounds.getSouthWest();

  return [
    { lat: northEast.lat(), lng: southWest.lng() },
    { lat: northEast.lat(), lng: northEast.lng() },
    { lat: southWest.lat(), lng: northEast.lng() },
    { lat: southWest.lat(), lng: southWest.lng() },
  ];
}

function polygonToPath(polygon: google.maps.Polygon) {
  return polygon
    .getPath()
    .getArray()
    .map((point) => ({ lat: point.lat(), lng: point.lng() }));
}

function buildSelection(overlays: OverlayRecord[]): MapSelectionSummary {
  const shapes: RoofShape[] = overlays.map(({ id, kind, overlay }) => {
    if (kind === "rectangle") {
      const path = rectangleToPath(overlay as google.maps.Rectangle);
      const areaM2 = google.maps.geometry.spherical.computeArea(path);

      return {
        id,
        kind,
        path,
        areaM2,
      };
    }

    const path = polygonToPath(overlay as google.maps.Polygon);
    const areaM2 = google.maps.geometry.spherical.computeArea(
      path.map((point) => new google.maps.LatLng(point.lat, point.lng)),
    );

    return {
      id,
      kind,
      path,
      areaM2,
    };
  });

  const grossAreaM2 = shapes.reduce((sum, shape) => sum + shape.areaM2, 0);

  return {
    shapes,
    grossAreaM2,
    usableAreaFactor: SOLAR_DEFAULTS.usableAreaFactor,
    usableAreaM2: grossAreaM2 * SOLAR_DEFAULTS.usableAreaFactor,
  };
}

export function Map({ value, onChange, onCenterChange, solarInsights, solarSelectionMatch }: MapProps) {
  const copy = useAppCopy();
  const googleMapsApiKey =
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || RUNTIME_FALLBACKS.googleMapsApiKey;
  const overlaysRef = useRef<OverlayRecord[]>([]);
  const mapRef = useRef<google.maps.Map | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const drawingManagerRef = useRef<google.maps.drawing.DrawingManager | null>(null);
  const [manualArea, setManualArea] = useState(value.grossAreaM2 ? String(value.grossAreaM2) : "");
  const [searchValue, setSearchValue] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState(DEFAULT_MAP_CENTER);
  const [loadTimedOut, setLoadTimedOut] = useState(false);
  const [drawMode, setDrawMode] = useState<ShapeKind | null>(null);
  const [drawingExperience, setDrawingExperience] = useState<"quick" | "advanced">("quick");

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey,
    libraries: GOOGLE_MAP_LIBRARIES,
  });

  useEffect(() => {
    if (isLoaded || loadError) {
      setLoadTimedOut(false);
      return;
    }

    const timeout = window.setTimeout(() => {
      setLoadTimedOut(true);
    }, 12000);

    return () => window.clearTimeout(timeout);
  }, [isLoaded, loadError]);

  useEffect(() => {
    if (!isLoaded || geocoderRef.current || typeof google === "undefined") {
      return;
    }

    geocoderRef.current = new google.maps.Geocoder();
  }, [isLoaded]);

  useEffect(() => {
    if (!drawingManagerRef.current || typeof google === "undefined") {
      return;
    }

    drawingManagerRef.current.setDrawingMode(
      drawMode ? google.maps.drawing.OverlayType[drawMode.toUpperCase() as "RECTANGLE" | "POLYGON"] : null,
    );
  }, [drawMode]);

  useEffect(() => {
    if (drawingExperience === "quick" && drawMode === "polygon") {
      setDrawMode(null);
    }
  }, [drawingExperience, drawMode]);

  const summary = value.grossAreaM2 > 0 ? value : createEmptyMapSelection();

  const syncShapes = () => {
    onChange(buildSelection(overlaysRef.current));
  };

  const applyMapCenter = (
    nextCenter: { lat: number; lng: number },
    statusMessage: string,
    zoom = 20,
  ) => {
    setMapCenter(nextCenter);
    onCenterChange?.({ latitude: nextCenter.lat, longitude: nextCenter.lng });

    if (mapRef.current) {
      mapRef.current.panTo(nextCenter);
      mapRef.current.setZoom(zoom);
    }

    setLocationStatus(statusMessage);
  };

  const attachOverlayListeners = (overlayRecord: OverlayRecord) => {
    if (overlayRecord.kind === "polygon") {
      const polygon = overlayRecord.overlay as google.maps.Polygon;
      const path = polygon.getPath();
      path.addListener("insert_at", syncShapes);
      path.addListener("set_at", syncShapes);
      path.addListener("remove_at", syncShapes);
      polygon.addListener("mouseup", syncShapes);
    } else {
      const rectangle = overlayRecord.overlay as google.maps.Rectangle;
      rectangle.addListener("bounds_changed", syncShapes);
    }
  };

  const handleOverlayComplete = (event: google.maps.drawing.OverlayCompleteEvent) => {
    const overlayRecord: OverlayRecord = {
      id: `${event.type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      kind: event.type as ShapeKind,
      overlay: event.overlay as google.maps.Polygon | google.maps.Rectangle,
    };

    const overlay = overlayRecord.overlay;
    if ("setEditable" in overlay) {
      overlay.setEditable(true);
    }
    overlaysRef.current.push(overlayRecord);
    attachOverlayListeners(overlayRecord);
    syncShapes();
    setDrawMode(null);
    setLocationStatus(
      event.type === "rectangle"
        ? copy.map.step3Body
        : copy.map.step3Body,
    );
  };

  const clearAll = () => {
    overlaysRef.current.forEach(({ overlay }) => overlay.setMap(null));
    overlaysRef.current = [];
    onChange(createEmptyMapSelection());
  };

  const removeLast = () => {
    const last = overlaysRef.current.pop();
    if (!last) {
      return;
    }
    last.overlay.setMap(null);
    syncShapes();
  };

  const geocodeSearchValue = async (query: string) => {
    const geocoder = geocoderRef.current;
    if (!geocoder) {
      setLocationStatus(copy.map.statusGeocoderNotReady);
      return;
    }

    setIsSearching(true);
    setLocationStatus(copy.map.statusSearching(query));

    try {
      const response = await geocoder.geocode({ address: query });
      const firstResult = response.results[0];
      const location = firstResult?.geometry?.location;

      if (!location) {
        setLocationStatus(copy.map.statusNoResult);
        return;
      }

      const nextCenter = {
        lat: location.lat(),
        lng: location.lng(),
      };

      setSearchValue(firstResult.formatted_address || query);
      applyMapCenter(nextCenter, copy.map.statusCentered(firstResult.formatted_address || query));
    } catch {
      setLocationStatus(copy.map.statusSearchFailed);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchClick = () => {
    const trimmedSearch = searchValue.trim();
    if (!trimmedSearch) {
      setLocationStatus(copy.map.statusNeedAddress);
      return;
    }

    void geocodeSearchValue(trimmedSearch);
  };

  const handleUseMyLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocationStatus(copy.map.statusNoGeolocation);
      return;
    }

    setIsLocating(true);
    setLocationStatus(copy.map.statusRequestingLocation);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        const nextCenter = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        applyMapCenter(nextCenter, copy.map.statusCurrentLocation);
      },
      (error) => {
        setIsLocating(false);

        if (error.code === error.PERMISSION_DENIED) {
          setLocationStatus(copy.map.statusLocationBlocked);
          return;
        }

        if (error.code === error.TIMEOUT) {
          setLocationStatus(copy.map.statusLocationTimeout);
          return;
        }

        setLocationStatus(copy.map.statusLocationFailed);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      },
    );
  };

  const handleUseCurrentMapCenter = () => {
    const currentCenter = mapRef.current?.getCenter();
    if (!currentCenter) {
      setLocationStatus(copy.map.statusMapCenterNotReady);
      return;
    }

    applyMapCenter(
      {
        lat: currentCenter.lat(),
        lng: currentCenter.lng(),
      },
      copy.map.statusMapCenterSynced,
      mapRef.current?.getZoom() || 20,
    );
  };

  const handleManualAreaChange = (nextValue: string) => {
    setManualArea(nextValue);
    const grossAreaM2 = Number(nextValue);

    if (!Number.isFinite(grossAreaM2) || grossAreaM2 < 0) {
      onChange(createEmptyMapSelection());
      return;
    }

    onChange({
      shapes: [
        {
          id: "manual-area",
          kind: "manual",
          areaM2: grossAreaM2,
          path: [],
        },
      ],
      grossAreaM2,
      usableAreaFactor: SOLAR_DEFAULTS.usableAreaFactor,
      usableAreaM2: grossAreaM2 * SOLAR_DEFAULTS.usableAreaFactor,
    });
  };

  if (!googleMapsApiKey || loadError) {
    return (
      <Card className="h-full border-dashed">
        <CardHeader>
          <CardTitle>{copy.map.demoModeTitle}</CardTitle>
          <CardDescription>
            {copy.map.demoModeDescription}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex h-[560px] flex-col gap-4">
          <div className="rounded-[1.25rem] border border-border/70 bg-muted/40 p-4">
            <label className="mb-2 block text-sm font-medium">{copy.map.manualRoofArea}</label>
            <Input
              inputMode="decimal"
              placeholder="e.g. 120"
              value={manualArea}
              onChange={(event) => handleManualAreaChange(event.target.value)}
            />
          </div>
          <div className="flex-1 rounded-[1.25rem] border border-border/70 bg-hero-grid p-5 text-sm text-muted-foreground">
            {copy.map.manualFallback}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isLoaded) {
    return (
      <Card className="h-full">
        <CardContent className="flex h-[560px] flex-col items-center justify-center gap-4 text-center">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <RefreshCw className="size-4 animate-spin" />
            {copy.map.loadingMaps}
          </div>
          {loadTimedOut ? (
            <div className="max-w-xl rounded-[1.25rem] border border-amber-300 bg-amber-50 p-4 text-left text-sm text-amber-900">
              <p className="font-medium">{copy.map.slowLoadTitle}</p>
              <p className="mt-2">{copy.map.slowLoadBody}</p>
              <div className="mt-3 grid gap-1 text-amber-900/90">
                <p>{copy.map.slowLoadChecksLabel}</p>
                <p>1. {copy.map.slowLoadCheck1}</p>
                <p>2. {copy.map.slowLoadCheck2}</p>
                <p>3. {copy.map.slowLoadCheck3}</p>
              </div>
              <p className="mt-3 text-amber-900/90">{copy.map.slowLoadFallback}</p>
            </div>
          ) : null}
          <div className="w-full max-w-md rounded-[1.25rem] border border-border/70 bg-muted/40 p-4">
            <label className="mb-2 block text-left text-sm font-medium">{copy.map.manualRoofArea}</label>
            <Input
              inputMode="decimal"
              placeholder="e.g. 120"
              value={manualArea}
              onChange={(event) => handleManualAreaChange(event.target.value)}
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full overflow-hidden">
      <CardHeader className="border-b border-border/70">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>{copy.map.title}</CardTitle>
            <CardDescription>{copy.map.description}</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={removeLast} disabled={summary.shapes.length === 0}>
              <Trash2 data-icon="inline-start" />
              {copy.map.undoLast}
            </Button>
            <Button variant="ghost" size="sm" onClick={clearAll} disabled={summary.shapes.length === 0}>
              {copy.map.clearAll}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 p-4 md:h-[680px] xl:h-[760px]">
        <div className="rounded-[1.15rem] border border-border/70 bg-muted/20 p-3.5 sm:p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="section-kicker text-primary">{copy.map.toolsTitle}</div>
              <p className="mt-1 text-sm text-muted-foreground">{copy.map.toolHint}</p>
            </div>
            <div className="hidden flex-wrap gap-2 sm:flex">
              <div className="rounded-full border border-border/70 bg-background px-3 py-1.5 text-[11px] font-medium text-slate-700">
                1. {copy.map.step1Title}
              </div>
              <div className="rounded-full border border-border/70 bg-background px-3 py-1.5 text-[11px] font-medium text-slate-700">
                2. {copy.map.step2Title}
              </div>
              <div className="rounded-full border border-border/70 bg-background px-3 py-1.5 text-[11px] font-medium text-slate-700">
                3. {copy.map.step3Title}
              </div>
            </div>
          </div>
        </div>
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto_auto]">
          <div className="grid gap-2">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
              <Input
                placeholder={copy.map.searchPlaceholder}
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleSearchClick();
                  }
                }}
              />
              <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={handleSearchClick} disabled={isSearching}>
                <Search data-icon="inline-start" />
                {isSearching ? copy.map.finding : copy.map.find}
              </Button>
              <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={handleUseMyLocation} disabled={isLocating}>
                <LocateFixed data-icon="inline-start" />
                {isLocating ? copy.map.locating : copy.map.useMyLocation}
              </Button>
              <Button variant="ghost" size="sm" className="w-full sm:w-auto" onClick={handleUseCurrentMapCenter}>
                <MapPin data-icon="inline-start" />
                {copy.map.useMapCenter}
              </Button>
            </div>
            {locationStatus ? (
              <p className="text-sm text-muted-foreground">{locationStatus}</p>
            ) : null}
            <p className="text-xs text-muted-foreground">
              {copy.map.directGeocodeHint}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 xl:contents">
            <div className="rounded-xl border border-border/70 bg-muted/30 px-4 py-2.5 text-sm">
              <div className="metric-label">{copy.map.grossArea}</div>
              <div className="metric-value mt-1">{formatNumber(summary.grossAreaM2, 1)} m²</div>
            </div>
            <div className="rounded-xl border border-border/70 bg-muted/30 px-4 py-2.5 text-sm">
              <div className="metric-label">{copy.map.usableArea}</div>
              <div className="metric-value mt-1">{formatNumber(summary.usableAreaM2, 1)} m²</div>
            </div>
          </div>
        </div>
        <div className="rounded-[1.1rem] border border-border/70 bg-muted/20 p-3.5 sm:p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Workflow className="size-4 text-primary" />
            {copy.map.toolsTitle}
          </div>
          <div className="mb-3 flex flex-wrap gap-2">
            <Button
              variant={drawingExperience === "quick" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setDrawingExperience("quick");
                setLocationStatus(copy.map.quickModeHint);
              }}
            >
              {copy.map.quickMode}
            </Button>
            <Button
              variant={drawingExperience === "advanced" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setDrawingExperience("advanced");
                setLocationStatus(copy.map.advancedModeHint);
              }}
            >
              {copy.map.advancedMode}
            </Button>
          </div>
          <div className="mb-3 text-sm text-muted-foreground">
            {drawingExperience === "quick" ? copy.map.quickModeHint : copy.map.advancedModeHint}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={drawMode === "rectangle" ? "default" : "outline"}
              size="sm"
              className="flex-1 sm:flex-none"
              onClick={() => {
                setDrawMode("rectangle");
                setLocationStatus(copy.map.step2Body);
              }}
            >
              <Square data-icon="inline-start" />
              {drawingExperience === "quick" ? copy.map.startRectangle : copy.map.rectangleTool}
            </Button>
            {drawingExperience === "advanced" ? (
              <Button
                variant={drawMode === "polygon" ? "default" : "outline"}
                size="sm"
                className="flex-1 sm:flex-none"
                onClick={() => {
                  setDrawMode("polygon");
                  setLocationStatus(copy.map.step2Body);
                }}
              >
                <MapPin data-icon="inline-start" />
                {copy.map.polygonTool}
              </Button>
            ) : null}
            <Button
              variant={drawMode === null ? "secondary" : "ghost"}
              size="sm"
              className="flex-1 sm:flex-none"
              onClick={() => setDrawMode(null)}
            >
              {copy.map.panTool}
            </Button>
            {drawMode ? (
              <Button variant="ghost" size="sm" className="w-full sm:w-auto" onClick={() => setDrawMode(null)}>
                {copy.map.doneDrawing}
              </Button>
            ) : null}
          </div>
        </div>
        <div className="relative min-h-[360px] flex-1 overflow-hidden rounded-[1.15rem] border border-border/70 sm:min-h-[420px] md:min-h-0">
          <div className="pointer-events-none absolute inset-x-3 top-3 z-10 flex flex-wrap items-center gap-2 sm:inset-x-4 sm:top-4">
            <div className="rounded-full bg-background/92 px-3 py-1.5 text-[11px] font-medium text-foreground shadow-sm">
              <MapPin className="mr-1 inline size-3.5" />
              {copy.map.satelliteEnabled}
            </div>
            <div className="hidden rounded-full bg-background/92 px-3 py-1.5 text-[11px] font-medium text-foreground shadow-sm sm:block">
              {summary.shapes.length > 0 ? copy.map.step3Body : drawingExperience === "quick" ? copy.map.quickModeHint : copy.map.advancedModeHint}
            </div>
            {solarInsights ? (
              <div className="rounded-full bg-background/92 px-3 py-1.5 text-[11px] font-medium text-foreground shadow-sm">
                {copy.solar.mapOverlayTitle}
              </div>
            ) : null}
          </div>
          {solarSelectionMatch?.status === "outside-selection" ? (
            <div className="absolute inset-x-3 bottom-3 z-10 rounded-xl border border-amber-300 bg-amber-50/95 px-4 py-3 text-sm text-amber-900 shadow-sm backdrop-blur sm:inset-x-4 sm:bottom-4">
              <div className="font-medium">{copy.solar.mapOverlayUnmatched}</div>
              {solarSelectionMatch.distanceToNearestShapeMeters !== null ? (
                <div className="mt-1 text-xs text-amber-900/80">
                  {copy.solar.distanceFromSelection}: {formatNumber(solarSelectionMatch.distanceToNearestShapeMeters, 1)} m
                </div>
              ) : null}
            </div>
          ) : null}
          {solarSelectionMatch?.status === "inside-selection" ? (
            <div className="absolute inset-x-3 bottom-3 z-10 rounded-xl border border-emerald-200 bg-emerald-50/95 px-4 py-3 text-sm text-emerald-900 shadow-sm backdrop-blur sm:inset-x-4 sm:bottom-4">
              {copy.solar.mapOverlayMatched}
            </div>
          ) : null}
          <GoogleMap
            mapContainerClassName="h-full w-full"
            center={mapCenter}
            zoom={18}
            onLoad={(map) => {
              mapRef.current = map;
              map.setMapTypeId("satellite");
            }}
            options={{
              mapTypeControl: true,
              fullscreenControl: false,
              streetViewControl: false,
              tilt: 0,
              }}
            >
              {solarInsights?.boundingBox ? (
                <GoogleMapPolygon
                  path={boundsToPath(solarInsights.boundingBox)}
                  options={{
                    clickable: false,
                    fillOpacity: 0,
                    strokeColor: solarSelectionMatch?.status === "outside-selection" ? "#f59e0b" : "#14b8a6",
                    strokeOpacity: 0.85,
                    strokeWeight: 2,
                    zIndex: 2,
                  }}
                />
              ) : null}

              {solarInsights?.roofSegments.map((segment) =>
                segment.center ? (
                  <GoogleMapCircle
                    key={`segment-${segment.segmentIndex}`}
                    center={{ lat: segment.center.latitude, lng: segment.center.longitude }}
                    radius={1.4}
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
                  key={`panel-${panel.segmentIndex}-${index}`}
                  center={{ lat: panel.center.latitude, lng: panel.center.longitude }}
                  radius={panel.orientation === "LANDSCAPE" ? 0.95 : 0.8}
                  options={{
                    clickable: false,
                    fillColor: "#14b8a6",
                    fillOpacity: 0.78,
                    strokeColor: "#f8fafc",
                    strokeOpacity: 0.55,
                    strokeWeight: 1,
                    zIndex: 4,
                  }}
                />
              ))}

              {solarInsights?.center ? (
                <GoogleMapCircle
                  center={{ lat: solarInsights.center.latitude, lng: solarInsights.center.longitude }}
                  radius={2.4}
                  options={{
                    clickable: false,
                    fillColor: solarSelectionMatch?.status === "outside-selection" ? "#f59e0b" : "#111827",
                    fillOpacity: 0.9,
                    strokeColor: "#ffffff",
                    strokeOpacity: 0.9,
                    strokeWeight: 2,
                    zIndex: 5,
                  }}
                />
              ) : null}

              <DrawingManager
                onLoad={(manager) => {
                  drawingManagerRef.current = manager;
              }}
              onOverlayComplete={handleOverlayComplete}
              options={{
                drawingControl: false,
                polygonOptions: {
                  fillColor: "#0f766e",
                  fillOpacity: 0.18,
                  strokeColor: "#0f766e",
                  strokeWeight: 2,
                  editable: true,
                },
                rectangleOptions: {
                  fillColor: "#f97316",
                  fillOpacity: 0.14,
                  strokeColor: "#f97316",
                  strokeWeight: 2,
                  editable: true,
                },
              }}
            />
          </GoogleMap>
        </div>
      </CardContent>
    </Card>
  );
}
