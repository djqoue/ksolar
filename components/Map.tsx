"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Circle as GoogleMapCircle,
  DrawingManager,
  GoogleMap,
  Polygon as GoogleMapPolygon,
  useJsApiLoader,
} from "@react-google-maps/api";
import { LocateFixed, MapPin, Pentagon, RefreshCw, Search, Square, Trash2, Undo2 } from "lucide-react";
import { useAppCopy, useLocaleContext } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DEFAULT_MAP_CENTER, GOOGLE_MAP_LIBRARIES, createEmptyMapSelection } from "@/lib/maps";
import { RUNTIME_FALLBACKS } from "@/lib/config/runtime-fallbacks";
import { formatNumber } from "@/lib/utils";
import { SOLAR_DEFAULTS } from "@/lib/config/solar";
import { buildGoogleSolarPanelFootprints, isSolarPointInsideSelection, type SolarSelectionMatchSummary } from "@/lib/solar";
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
  focusPoint?: { latitude: number; longitude: number } | null;
  focusAddress?: string;
  focusRequestId?: number;
  immersive?: boolean;
}

interface GeocodeApiResponse {
  result?: {
    formattedAddress: string;
    latitude: number;
    longitude: number;
  } | null;
  error?: string;
  code?: string;
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

export function Map({
  value,
  onChange,
  onCenterChange,
  solarInsights,
  solarSelectionMatch,
  focusPoint,
  focusAddress,
  focusRequestId = 0,
  immersive = false,
}: MapProps) {
  const copy = useAppCopy();
  const { locale } = useLocaleContext();
  const toolLabels =
    locale === "zh"
      ? { rectangle: "矩形", polygon: "多边形", pan: "拖动", undo: "撤销", clear: "清空" }
      : locale === "th"
        ? { rectangle: "สี่เหลี่ยม", polygon: "หลายเหลี่ยม", pan: "เลื่อน", undo: "ย้อนกลับ", clear: "ล้าง" }
        : { rectangle: "Rectangle", polygon: "Polygon", pan: "Pan", undo: "Undo", clear: "Clear" };
  const googleMapsApiKey =
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || RUNTIME_FALLBACKS.googleMapsApiKey;
  const overlaysRef = useRef<OverlayRecord[]>([]);
  const mapRef = useRef<google.maps.Map | null>(null);
  const drawingManagerRef = useRef<google.maps.drawing.DrawingManager | null>(null);
  const [manualArea, setManualArea] = useState(value.grossAreaM2 ? String(value.grossAreaM2) : "");
  const [searchValue, setSearchValue] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState(DEFAULT_MAP_CENTER);
  const [loadTimedOut, setLoadTimedOut] = useState(false);
  const [drawMode, setDrawMode] = useState<ShapeKind | null>(null);
  const [isFlyoverActive, setIsFlyoverActive] = useState(false);

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
    if (!drawingManagerRef.current || typeof google === "undefined") {
      return;
    }

    drawingManagerRef.current.setDrawingMode(
      drawMode ? google.maps.drawing.OverlayType[drawMode.toUpperCase() as "RECTANGLE" | "POLYGON"] : null,
    );
  }, [drawMode]);

  const summary = value.grossAreaM2 > 0 ? value : createEmptyMapSelection();
  const panelOverlay = useMemo(() => {
    const panels = buildGoogleSolarPanelFootprints(solarInsights).slice(0, 220);
    const inside = panels.filter((panel) => isSolarPointInsideSelection(panel.center, summary.shapes));
    const outside = panels.filter((panel) => !isSolarPointInsideSelection(panel.center, summary.shapes));

    return { inside, outside };
  }, [solarInsights, summary.shapes]);

  const syncShapes = () => {
    onChange(buildSelection(overlaysRef.current));
  };

  const applyMapCenter = useCallback((
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
  }, [onCenterChange]);

  const flyToMapCenter = useCallback((nextCenter: { lat: number; lng: number }, statusMessage: string) => {
    setMapCenter(nextCenter);
    onCenterChange?.({ latitude: nextCenter.lat, longitude: nextCenter.lng });
    setLocationStatus(statusMessage);

    if (!mapRef.current) {
      return;
    }

    setIsFlyoverActive(true);
    mapRef.current.setZoom(6);
    mapRef.current.panTo(nextCenter);

    window.setTimeout(() => {
      mapRef.current?.setZoom(13);
    }, 240);
    window.setTimeout(() => {
      mapRef.current?.panTo(nextCenter);
      mapRef.current?.setZoom(19);
    }, 760);
    window.setTimeout(() => {
      setIsFlyoverActive(false);
    }, 1450);
  }, [onCenterChange]);

  const refreshMapSize = useCallback(() => {
    if (!mapRef.current || typeof google === "undefined") {
      return;
    }

    const currentCenter = mapRef.current.getCenter();
    google.maps.event.trigger(mapRef.current, "resize");
    if (currentCenter) {
      mapRef.current.setCenter(currentCenter);
    }
  }, []);

  useEffect(() => {
    if (!immersive || !isLoaded) {
      return;
    }

    const animationFrame = window.requestAnimationFrame(refreshMapSize);
    const shortDelay = window.setTimeout(refreshMapSize, 180);
    const longDelay = window.setTimeout(refreshMapSize, 720);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(shortDelay);
      window.clearTimeout(longDelay);
    };
  }, [immersive, isLoaded, refreshMapSize]);

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

  const geocodeSearchValue = useCallback(async (query: string, flyover = false) => {
    setIsSearching(true);
    setLocationStatus(copy.map.statusSearching(query));

    try {
      const params = new URLSearchParams({
        address: query,
        locale,
      });
      const response = await fetch(`/api/maps/geocode?${params.toString()}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as GeocodeApiResponse;
      const firstResult = payload.result;

      if (!response.ok || payload.error) {
        throw new Error(payload.error || payload.code || "Geocoding failed.");
      }

      if (!firstResult) {
        setLocationStatus(copy.map.statusNoResult);
        return;
      }

      const nextCenter = {
        lat: firstResult.latitude,
        lng: firstResult.longitude,
      };

      setSearchValue(firstResult.formattedAddress || query);
      if (flyover) {
        flyToMapCenter(nextCenter, copy.map.statusCentered(firstResult.formattedAddress || query));
      } else {
        applyMapCenter(nextCenter, copy.map.statusCentered(firstResult.formattedAddress || query));
      }
    } catch {
      setLocationStatus(copy.map.statusSearchFailed);
    } finally {
      setIsSearching(false);
    }
  }, [
    applyMapCenter,
    copy.map,
    flyToMapCenter,
    locale,
  ]);

  useEffect(() => {
    if (!isLoaded || !focusRequestId) {
      return;
    }

    if (focusPoint) {
      flyToMapCenter(
        { lat: focusPoint.latitude, lng: focusPoint.longitude },
        copy.map.statusCurrentLocation,
      );
      return;
    }

    const trimmedAddress = focusAddress?.trim();
    if (trimmedAddress) {
      setSearchValue(trimmedAddress);
      void geocodeSearchValue(trimmedAddress, true);
      return;
    }

    flyToMapCenter(DEFAULT_MAP_CENTER, copy.map.statusDefaultBangkok);
  }, [
    copy.map.statusCurrentLocation,
    copy.map.statusDefaultBangkok,
    flyToMapCenter,
    focusAddress,
    focusPoint,
    focusRequestId,
    geocodeSearchValue,
    isLoaded,
  ]);

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
    const mapUnavailableTitle =
      loadError
        ? locale === "zh"
          ? "Google 地图暂时不可用"
          : locale === "th"
            ? "Google Maps ใช้งานไม่ได้ชั่วคราว"
            : "Google Maps is temporarily unavailable"
        : copy.map.demoModeTitle;
    const mapUnavailableDescription =
      loadError
        ? locale === "zh"
          ? "可能是 Maps API 配额、billing、referrer 限制或 key 权限问题。你仍可先手动输入屋顶面积继续报价。"
          : locale === "th"
            ? "อาจเกิดจากโควตา Maps API, billing, referrer restriction หรือสิทธิ์ของ key ยังไม่ถูกต้อง ยังสามารถกรอกพื้นที่หลังคาเองเพื่อเสนอราคาได้"
            : "This may be Maps API quota, billing, referrer, or key permission related. You can still enter roof area manually and continue the quote."
        : copy.map.demoModeDescription;

    return (
      <Card className={immersive ? "map-stage rounded-none border-dashed" : "h-full border-dashed"}>
        <CardHeader>
          <CardTitle>{mapUnavailableTitle}</CardTitle>
          <CardDescription>
            {mapUnavailableDescription}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex min-h-[420px] flex-col gap-4 sm:h-[560px]">
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
        <CardContent className="flex min-h-[420px] flex-col items-center justify-center gap-4 text-center sm:h-[560px]">
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

  const toolButtonClass = immersive
    ? "min-h-12 shrink-0 px-3 text-xs leading-tight sm:min-h-11 sm:text-sm"
    : "min-h-11 flex-1 text-xs leading-tight sm:min-h-0 sm:flex-none sm:text-sm";
  const compactToolButtonClass = immersive
    ? "min-h-12 shrink-0 px-3 text-xs leading-tight sm:min-h-11 sm:text-sm"
    : "w-full sm:w-auto";
  const immersiveMapContainerStyle = immersive
    ? {
        position: "absolute" as const,
        inset: 0,
        width: "100%",
        height: "calc(100vh - 64px)",
        minHeight: "680px",
      }
    : undefined;

  return (
    <Card
      className={
        immersive
          ? "map-stage relative h-[calc(100vh-64px)] min-h-[680px] overflow-hidden rounded-none border-0 bg-slate-950 shadow-none sm:min-h-[720px]"
          : "h-full overflow-hidden"
      }
    >
      <CardContent
        className={
          immersive
            ? "relative h-full p-0"
            : "flex flex-col gap-3 p-2 sm:p-4 md:h-[calc(100vh-250px)] md:min-h-[620px] xl:min-h-[720px]"
        }
      >
        <div
          className={
            immersive
              ? "absolute inset-x-2 top-2 z-30 grid gap-2 rounded-[1.2rem] border border-white/25 bg-white/90 p-2 shadow-[0_22px_70px_rgba(15,23,42,0.24)] backdrop-blur-2xl sm:inset-x-4 sm:top-4 lg:grid-cols-[minmax(0,1fr)_auto]"
              : "order-1 grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto_auto_auto]"
          }
        >
          <div className="grid gap-2">
            <div
              className={
                immersive
                  ? "grid grid-cols-2 gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto]"
                  : "grid grid-cols-2 gap-2 xl:grid-cols-[minmax(0,1fr)_auto_auto_auto_auto_auto]"
              }
            >
              <Input
                className={immersive ? "col-span-2 h-11 rounded-xl bg-white/95 text-sm sm:col-span-1" : "col-span-2 xl:col-span-1"}
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
              <Button
                variant="outline"
                size="sm"
                className={immersive ? "min-h-11 px-3 text-xs sm:w-auto sm:text-sm" : "w-full sm:w-auto"}
                onClick={handleSearchClick}
                disabled={isSearching}
              >
                <Search data-icon="inline-start" />
                {isSearching ? copy.map.finding : copy.map.find}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={immersive ? "min-h-11 px-3 text-xs sm:w-auto sm:text-sm" : "w-full sm:w-auto"}
                onClick={handleUseMyLocation}
                disabled={isLocating}
              >
                <LocateFixed data-icon="inline-start" />
                {isLocating ? copy.map.locating : copy.map.useMyLocation}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={immersive ? "hidden min-h-11 px-3 text-xs sm:inline-flex sm:w-auto sm:text-sm" : "hidden w-full sm:inline-flex sm:w-auto"}
                onClick={handleUseCurrentMapCenter}
              >
                <MapPin data-icon="inline-start" />
                {copy.map.useMapCenter}
              </Button>
            </div>
            {locationStatus ? (
              <p className={immersive ? "line-clamp-2 text-xs leading-5 text-slate-600 sm:text-sm" : "text-sm text-muted-foreground"}>{locationStatus}</p>
            ) : null}
          </div>
          <div className={immersive ? "hidden gap-2 lg:flex" : "hidden grid-cols-2 gap-3 sm:grid xl:contents"}>
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
        <div
          className={
            immersive
              ? "absolute inset-x-2 bottom-[calc(env(safe-area-inset-bottom)+10rem)] z-30 rounded-[1.15rem] border border-white/25 bg-white/92 p-2 shadow-[0_18px_60px_rgba(15,23,42,0.24)] backdrop-blur-2xl sm:bottom-[calc(env(safe-area-inset-bottom)+7rem)] sm:left-4 sm:right-auto sm:max-w-[calc(100%-2rem)]"
              : "order-2 rounded-xl border border-border/70 bg-muted/20 p-2.5 sm:p-3"
          }
        >
          <div className={immersive ? "flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none]" : "flex flex-wrap gap-2"}>
            <Button
              variant={drawMode === "rectangle" ? "default" : "outline"}
              size="sm"
              className={toolButtonClass}
              onClick={() => {
                setDrawMode("rectangle");
                setLocationStatus(copy.map.step2Body);
              }}
            >
              <Square data-icon="inline-start" />
              {toolLabels.rectangle}
            </Button>
            <Button
              variant={drawMode === "polygon" ? "default" : "outline"}
              size="sm"
              className={toolButtonClass}
              onClick={() => {
                setDrawMode("polygon");
                setLocationStatus(copy.map.advancedModeHint);
              }}
            >
              <Pentagon data-icon="inline-start" />
              {toolLabels.polygon}
            </Button>
            <Button
              variant={drawMode === null ? "secondary" : "ghost"}
              size="sm"
              className={toolButtonClass}
              onClick={() => setDrawMode(null)}
            >
              {toolLabels.pan}
            </Button>
            {drawMode ? (
              <Button variant="ghost" size="sm" className={compactToolButtonClass} onClick={() => setDrawMode(null)}>
                {copy.map.doneDrawing}
              </Button>
            ) : null}
            <Button variant="outline" size="sm" className={toolButtonClass} onClick={removeLast} disabled={summary.shapes.length === 0}>
              <Undo2 data-icon="inline-start" />
              {toolLabels.undo}
            </Button>
            <Button variant="ghost" size="sm" className={toolButtonClass} onClick={clearAll} disabled={summary.shapes.length === 0}>
              <Trash2 data-icon="inline-start" />
              {toolLabels.clear}
            </Button>
          </div>
          {drawMode ? (
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              {drawMode === "polygon" ? copy.map.advancedModeHint : copy.map.step2Body}
            </p>
          ) : null}
        </div>
        <div
          className={
            immersive
              ? "map-stage absolute inset-0 z-0 h-[calc(100vh-64px)] min-h-[680px] overflow-hidden bg-slate-950 sm:min-h-[720px]"
              : "relative order-3 h-[52vh] min-h-[360px] max-h-[560px] flex-none overflow-hidden rounded-[1.15rem] border border-border/70 sm:h-[58vh] sm:min-h-[520px] md:h-auto md:min-h-0 md:flex-1"
          }
        >
          <div className={immersive ? "hidden" : "pointer-events-none absolute inset-x-3 top-3 z-10 flex flex-wrap items-center gap-2 sm:inset-x-4 sm:top-4"}>
            <div className="rounded-full bg-background/92 px-3 py-1.5 text-[11px] font-medium text-foreground shadow-sm">
              <MapPin className="mr-1 inline size-3.5" />
              {copy.map.satelliteEnabled}
            </div>
            <div className="hidden rounded-full bg-background/92 px-3 py-1.5 text-[11px] font-medium text-foreground shadow-sm sm:block">
              {summary.shapes.length > 0 ? copy.map.step3Body : copy.map.quickModeHint}
            </div>
            {solarInsights ? (
              <div className="rounded-full bg-background/92 px-3 py-1.5 text-[11px] font-medium text-foreground shadow-sm">
                {copy.solar.mapOverlayTitle}
              </div>
            ) : null}
          </div>
          {summary.shapes.length > 0 ? (
            <div className={immersive ? "hidden" : "pointer-events-none absolute inset-x-3 bottom-3 z-10 sm:left-4 sm:right-auto sm:max-w-[320px]"}>
              <div className="rounded-[1rem] border border-border/70 bg-background/95 px-4 py-3 shadow-sm backdrop-blur">
                <div className="section-kicker text-primary">{copy.map.selectionReady}</div>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <div>
                    <div className="metric-label">{copy.map.grossArea}</div>
                    <div className="mt-1 text-base font-semibold tracking-tight text-slate-900">
                      {formatNumber(summary.grossAreaM2, 1)} m²
                    </div>
                  </div>
                  <div>
                    <div className="metric-label">{copy.map.usableArea}</div>
                    <div className="mt-1 text-base font-semibold tracking-tight text-slate-900">
                      {formatNumber(summary.usableAreaM2, 1)} m²
                    </div>
                  </div>
                </div>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">{copy.map.selectionReadyHint}</p>
              </div>
            </div>
          ) : null}
          {solarSelectionMatch?.status === "outside-selection" || solarSelectionMatch?.status === "partial-selection" ? (
            <div
              className={
                immersive
                  ? "absolute inset-x-3 top-[9rem] z-10 rounded-xl border border-amber-300 bg-amber-50/95 px-4 py-3 text-sm text-amber-900 shadow-sm backdrop-blur sm:inset-x-4 sm:left-auto sm:max-w-[360px]"
                  : "absolute inset-x-3 bottom-32 z-10 rounded-xl border border-amber-300 bg-amber-50/95 px-4 py-3 text-sm text-amber-900 shadow-sm backdrop-blur sm:inset-x-4 sm:bottom-4 sm:left-auto sm:max-w-[360px]"
              }
            >
              <div className="font-medium">
                {solarSelectionMatch.status === "partial-selection" ? copy.solar.mapOverlayPartial : copy.solar.mapOverlayUnmatched}
              </div>
              {solarSelectionMatch.status === "partial-selection" && solarSelectionMatch.overlapRatio !== null ? (
                <div className="mt-1 text-xs text-amber-900/80">
                  {copy.solar.overlapInsideSelection}: {formatNumber(solarSelectionMatch.overlapRatio * 100, 0)}%
                </div>
              ) : null}
              {solarSelectionMatch.status === "outside-selection" && solarSelectionMatch.distanceToNearestShapeMeters !== null ? (
                <div className="mt-1 text-xs text-amber-900/80">
                  {copy.solar.distanceFromSelection}: {formatNumber(solarSelectionMatch.distanceToNearestShapeMeters, 1)} m
                </div>
              ) : null}
            </div>
          ) : null}
          {solarSelectionMatch?.status === "inside-selection" ? (
            <div
              className={
                immersive
                  ? "absolute inset-x-3 top-[9rem] z-10 rounded-xl border border-emerald-200 bg-emerald-50/95 px-4 py-3 text-sm text-emerald-900 shadow-sm backdrop-blur sm:inset-x-4 sm:left-auto sm:max-w-[360px]"
                  : "absolute inset-x-3 bottom-32 z-10 rounded-xl border border-emerald-200 bg-emerald-50/95 px-4 py-3 text-sm text-emerald-900 shadow-sm backdrop-blur sm:inset-x-4 sm:bottom-4 sm:left-auto sm:max-w-[360px]"
              }
            >
              {copy.solar.mapOverlayMatched}
            </div>
          ) : null}
          {isFlyoverActive ? (
            <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-[radial-gradient(circle_at_center,rgba(15,23,42,0.08),rgba(15,23,42,0.46))] backdrop-blur-[1px]">
              <div className="rounded-full border border-white/25 bg-slate-950/80 px-5 py-3 text-xs font-semibold uppercase tracking-[0.22em] text-white shadow-[0_20px_60px_rgba(15,23,42,0.35)]">
                {locale === "zh" ? "正在飞向客户屋顶" : locale === "th" ? "กำลังซูมไปยังไซต์ลูกค้า" : "Flying to site"}
              </div>
            </div>
          ) : null}
          <GoogleMap
            mapContainerClassName={
              immersive
                ? "absolute inset-0 h-[calc(100vh-64px)] min-h-[680px] w-full sm:min-h-[720px]"
                : "h-full w-full"
            }
            mapContainerStyle={immersiveMapContainerStyle}
            center={mapCenter}
            zoom={18}
            onLoad={(map) => {
              mapRef.current = map;
              map.setMapTypeId("satellite");
              window.setTimeout(refreshMapSize, 0);
            }}
            options={{
              mapTypeControl: false,
              fullscreenControl: false,
              streetViewControl: false,
              tilt: 0,
              gestureHandling: drawMode ? "none" : "greedy",
              draggable: !drawMode,
              disableDoubleClickZoom: Boolean(drawMode),
              }}
            >
              {solarInsights?.boundingBox ? (
                <GoogleMapPolygon
                  path={boundsToPath(solarInsights.boundingBox)}
                  options={{
                    clickable: false,
                    fillOpacity: 0,
                    strokeColor: solarSelectionMatch?.status === "inside-selection" ? "#14b8a6" : "#f59e0b",
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

              {panelOverlay.outside.map((panel) => (
                <GoogleMapPolygon
                  key={`panel-outside-${panel.id}`}
                  path={panel.path}
                  options={{
                    clickable: false,
                    fillColor: "#f59e0b",
                    fillOpacity: 0.18,
                    strokeColor: "#f59e0b",
                    strokeOpacity: 0.42,
                    strokeWeight: 1,
                    zIndex: 3,
                  }}
                />
              ))}

              {panelOverlay.inside.map((panel) => (
                <GoogleMapPolygon
                  key={`panel-inside-${panel.id}`}
                  path={panel.path}
                  options={{
                    clickable: false,
                    fillColor: "#14b8a6",
                    fillOpacity: 0.72,
                    strokeColor: "#f8fafc",
                    strokeOpacity: 0.72,
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
                    fillColor: solarSelectionMatch?.status === "inside-selection" ? "#111827" : "#f59e0b",
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
