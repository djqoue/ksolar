"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Circle as GoogleMapCircle,
  GoogleMap,
  Polygon as GoogleMapPolygon,
  useJsApiLoader,
} from "@react-google-maps/api";
import {
  TerraDraw,
  TerraDrawPolygonMode,
  TerraDrawRectangleMode,
  TerraDrawSelectMode,
  type GeoJSONStoreFeatures,
  type IdStrategy,
} from "terra-draw";
import { TerraDrawGoogleMapsAdapter } from "terra-draw-google-maps-adapter";
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

const roofShapeIdStrategy: IdStrategy<string | number> = {
  getId: () =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `roof-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
  isValidId: (id) => typeof id === "string" && id.length > 0,
};

function isRoofFeature(feature: GeoJSONStoreFeatures) {
  return (
    feature.geometry.type === "Polygon" &&
    !feature.properties.currentlyDrawing &&
    (feature.properties.mode === "polygon" || feature.properties.mode === "rectangle")
  );
}

function featureToRoofShape(feature: GeoJSONStoreFeatures): RoofShape | null {
  if (!isRoofFeature(feature) || feature.geometry.type !== "Polygon") {
    return null;
  }

  const mode = feature.properties.mode;
  const coordinates = feature.geometry.coordinates[0] as Array<[number, number]>;
  const unclosedCoordinates =
    coordinates.length > 1 &&
    coordinates[0][0] === coordinates[coordinates.length - 1][0] &&
    coordinates[0][1] === coordinates[coordinates.length - 1][1]
      ? coordinates.slice(0, -1)
      : coordinates;
  const path = unclosedCoordinates.map(([lng, lat]) => ({ lat, lng }));

  if (path.length < 3) {
    return null;
  }

  return {
    id: String(feature.id),
    kind: mode as Extract<ShapeKind, "polygon" | "rectangle">,
    path,
    areaM2: google.maps.geometry.spherical.computeArea(path),
  };
}

function buildSelection(features: GeoJSONStoreFeatures[]): MapSelectionSummary {
  const shapes = features
    .map(featureToRoofShape)
    .filter((shape): shape is RoofShape => Boolean(shape));

  const grossAreaM2 = shapes.reduce((sum, shape) => sum + shape.areaM2, 0);

  return {
    shapes,
    grossAreaM2,
    usableAreaFactor: SOLAR_DEFAULTS.usableAreaFactor,
    usableAreaM2: grossAreaM2 * SOLAR_DEFAULTS.usableAreaFactor,
  };
}

function roofShapeToFeature(shape: RoofShape): GeoJSONStoreFeatures | null {
  if ((shape.kind !== "polygon" && shape.kind !== "rectangle") || shape.path.length < 3) {
    return null;
  }

  const coordinates: Array<[number, number]> = shape.path.map((point) => [point.lng, point.lat]);
  coordinates.push([...coordinates[0]] as [number, number]);

  return {
    id: shape.id,
    type: "Feature",
    properties: { mode: shape.kind },
    geometry: {
      type: "Polygon",
      coordinates: [coordinates],
    },
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
  const accessibilityLabels =
    locale === "zh"
      ? {
          manualAlternative: "无法使用地图？手动输入屋顶面积",
          manualHint: "手动面积是地图手势和绘图工具的键盘替代方式。输入后仍可继续报价。",
          selectedShapes: "已选屋顶区域",
          removeShape: "删除",
          clearConfirm: "确定清空全部屋顶区域吗？此操作无法撤销。",
          manualReplaceConfirm: "改用手动面积会清除已绘制的屋顶。确定继续吗？",
        }
      : locale === "th"
        ? {
            manualAlternative: "ใช้แผนที่ไม่ได้? กรอกพื้นที่หลังคาเอง",
            manualHint: "การกรอกพื้นที่เองเป็นทางเลือกแทนท่าทางบนแผนที่และใช้ได้ด้วยแป้นพิมพ์",
            selectedShapes: "พื้นที่หลังคาที่เลือก",
            removeShape: "ลบ",
            clearConfirm: "ล้างพื้นที่หลังคาทั้งหมดหรือไม่? การดำเนินการนี้ย้อนกลับไม่ได้",
            manualReplaceConfirm: "การใช้พื้นที่ที่กรอกเองจะลบหลังคาที่วาดไว้ ต้องการดำเนินการต่อหรือไม่",
          }
        : {
            manualAlternative: "Can't use the map? Enter roof area manually",
            manualHint: "Manual area is a keyboard-accessible alternative to map gestures and drawing tools.",
            selectedShapes: "Selected roof areas",
            removeShape: "Remove",
            clearConfirm: "Clear all roof areas? This can't be undone.",
            manualReplaceConfirm: "Entering a manual area will clear the drawn roof. Continue?",
          };
  const googleMapsApiKey =
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || RUNTIME_FALLBACKS.googleMapsApiKey;
  const mapRef = useRef<google.maps.Map | null>(null);
  const terraDrawRef = useRef<TerraDraw | null>(null);
  const lastFocusRequestIdRef = useRef(0);
  const initialManualShape = value.shapes.find((shape) => shape.kind === "manual");
  const [manualArea, setManualArea] = useState(
    initialManualShape?.areaM2 ? String(initialManualShape.areaM2) : "",
  );
  const [searchValue, setSearchValue] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState(DEFAULT_MAP_CENTER);
  const [loadTimedOut, setLoadTimedOut] = useState(false);
  const [drawMode, setDrawMode] = useState<ShapeKind | null>(null);
  const [drawReady, setDrawReady] = useState(false);
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
    const draw = terraDrawRef.current;
    if (!draw?.enabled || !drawReady) {
      return;
    }

    draw.setMode(drawMode === "polygon" || drawMode === "rectangle" ? drawMode : "select");
  }, [drawMode, drawReady]);

  useEffect(
    () => () => {
      terraDrawRef.current?.stop();
      terraDrawRef.current = null;
    },
    [],
  );

  const summary = value.grossAreaM2 > 0 ? value : createEmptyMapSelection();
  const panelOverlay = useMemo(() => {
    const panels = buildGoogleSolarPanelFootprints(solarInsights).slice(0, 220);
    const inside = panels.filter((panel) => isSolarPointInsideSelection(panel.center, summary.shapes));
    const outside = panels.filter((panel) => !isSolarPointInsideSelection(panel.center, summary.shapes));

    return { inside, outside };
  }, [solarInsights, summary.shapes]);

  const initializeDrawing = useCallback((map: google.maps.Map) => {
    if (terraDrawRef.current || typeof google === "undefined" || !map.getProjection()) {
      return;
    }

    const draw = new TerraDraw({
      adapter: new TerraDrawGoogleMapsAdapter({
        coordinatePrecision: 9,
        isolatedData: true,
        lib: google.maps,
        map,
      }),
      idStrategy: roofShapeIdStrategy,
      modes: [
        new TerraDrawSelectMode({
          flags: {
            polygon: {
              feature: {
                draggable: true,
                coordinates: {
                  deletable: true,
                  draggable: true,
                  midpoints: true,
                },
              },
            },
            rectangle: {
              feature: {
                draggable: true,
                coordinates: {
                  draggable: true,
                  midpoints: true,
                },
              },
            },
          },
        }),
        new TerraDrawPolygonMode({
          editable: true,
          styles: {
            fillColor: "#0f766e",
            fillOpacity: 0.18,
            outlineColor: "#0f766e",
            outlineWidth: 2,
          },
        }),
        new TerraDrawRectangleMode({
          styles: {
            fillColor: "#f97316",
            fillOpacity: 0.14,
            outlineColor: "#f97316",
            outlineWidth: 2,
          },
        }),
      ],
    });

    draw.start();

    const restoredFeatures = value.shapes
      .map(roofShapeToFeature)
      .filter((feature): feature is GeoJSONStoreFeatures => Boolean(feature));
    if (restoredFeatures.length > 0) {
      draw.addFeatures(restoredFeatures);
    }

    const syncShapes = () => {
      onChange(buildSelection(draw.getSnapshot()));
    };

    draw.on("change", syncShapes);
    draw.on("finish", () => {
      syncShapes();
      draw.setMode("select");
      setDrawMode(null);
      setLocationStatus(copy.map.step3Body);
    });
    draw.setMode(drawMode === "polygon" || drawMode === "rectangle" ? drawMode : "select");

    terraDrawRef.current = draw;
    setDrawReady(true);
  }, [copy.map.step3Body, drawMode, onChange, value.shapes]);

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

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      mapRef.current.panTo(nextCenter);
      mapRef.current.setZoom(19);
      setIsFlyoverActive(false);
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

  const clearAll = () => {
    if (summary.shapes.length > 0 && !window.confirm(accessibilityLabels.clearConfirm)) {
      return;
    }

    terraDrawRef.current?.clear();
    setManualArea("");
    onChange(createEmptyMapSelection());
  };

  const removeLast = () => {
    const draw = terraDrawRef.current;
    const features = draw?.getSnapshot().filter(isRoofFeature) ?? [];
    const last = features[features.length - 1];
    if (!last) {
      if (summary.shapes.some((shape) => shape.kind === "manual")) {
        setManualArea("");
        onChange(createEmptyMapSelection());
      }
      return;
    }
    draw?.removeFeatures([last.id]);
  };

  const removeShape = (shape: RoofShape) => {
    if (shape.kind === "manual") {
      setManualArea("");
      onChange(createEmptyMapSelection());
      return;
    }

    const draw = terraDrawRef.current;
    if (draw?.hasFeature(shape.id)) {
      draw.removeFeatures([shape.id]);
    }
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

    if (lastFocusRequestIdRef.current === focusRequestId) {
      return;
    }

    lastFocusRequestIdRef.current = focusRequestId;

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
    const draw = terraDrawRef.current;
    const drawnFeatures = draw?.enabled ? draw.getSnapshot().filter(isRoofFeature) : [];
    const storedDrawnShapes = value.shapes.filter(
      (shape) => shape.kind === "polygon" || shape.kind === "rectangle",
    );
    const storedGrossAreaM2 = storedDrawnShapes.reduce((sum, shape) => sum + shape.areaM2, 0);
    const storedUsableAreaFactor =
      Number.isFinite(value.usableAreaFactor) && value.usableAreaFactor > 0
        ? value.usableAreaFactor
        : SOLAR_DEFAULTS.usableAreaFactor;
    const preservedDrawnSelection: MapSelectionSummary | null =
      drawnFeatures.length > 0
        ? buildSelection(drawnFeatures)
        : storedDrawnShapes.length > 0
          ? {
              shapes: storedDrawnShapes,
              grossAreaM2: storedGrossAreaM2,
              usableAreaFactor: storedUsableAreaFactor,
              usableAreaM2: storedGrossAreaM2 * storedUsableAreaFactor,
            }
          : null;

    if (!nextValue.trim()) {
      setManualArea("");
      onChange(preservedDrawnSelection ?? createEmptyMapSelection());
      return;
    }

    const grossAreaM2 = Number(nextValue);
    const hasDrawnRoof = preservedDrawnSelection !== null;

    if (!Number.isFinite(grossAreaM2) || grossAreaM2 <= 0) {
      setManualArea(nextValue);
      onChange(preservedDrawnSelection ?? createEmptyMapSelection());
      return;
    }

    if (hasDrawnRoof && !window.confirm(accessibilityLabels.manualReplaceConfirm)) {
      return;
    }

    setManualArea(nextValue);

    if (drawnFeatures.length > 0) {
      draw?.clear();
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
            <label htmlFor="manual-roof-area-unavailable" className="mb-2 block text-sm font-medium">{copy.map.manualRoofArea}</label>
            <Input
              id="manual-roof-area-unavailable"
              inputMode="decimal"
              min="0"
              step="0.1"
              type="number"
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
            <label htmlFor="manual-roof-area-loading" className="mb-2 block text-left text-sm font-medium">{copy.map.manualRoofArea}</label>
            <Input
              id="manual-roof-area-loading"
              inputMode="decimal"
              min="0"
              step="0.1"
              type="number"
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
        height: "calc(100dvh - 64px)",
        minHeight: "480px",
      }
    : undefined;

  return (
    <Card
      className={
        immersive
          ? "map-stage relative h-[calc(100dvh-64px)] min-h-[480px] overflow-hidden rounded-none border-0 bg-slate-950 shadow-none sm:min-h-[620px]"
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
                aria-label={copy.map.searchPlaceholder}
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
              <p
                aria-live="polite"
                role="status"
                className={immersive ? "line-clamp-2 text-xs leading-5 text-slate-600 sm:text-sm" : "text-sm text-muted-foreground"}
              >
                {locationStatus}
              </p>
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
              aria-pressed={drawMode === "rectangle"}
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
              aria-pressed={drawMode === "polygon"}
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
              aria-pressed={drawMode === null}
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
          <details className="mt-2 rounded-xl border border-border/70 bg-background/90 px-3 py-2 text-sm">
            <summary className="min-h-11 cursor-pointer content-center font-medium text-slate-900">
              {accessibilityLabels.manualAlternative}
            </summary>
            <div className="grid gap-3 pb-2 pt-2">
              <div>
                <label htmlFor="manual-roof-area" className="mb-2 block font-medium">
                  {copy.map.manualRoofArea}
                </label>
                <Input
                  id="manual-roof-area"
                  aria-describedby="manual-roof-area-hint"
                  inputMode="decimal"
                  min="0"
                  step="0.1"
                  type="number"
                  placeholder="e.g. 120"
                  value={manualArea}
                  onChange={(event) => handleManualAreaChange(event.target.value)}
                />
                <p id="manual-roof-area-hint" className="mt-2 text-xs leading-5 text-muted-foreground">
                  {accessibilityLabels.manualHint}
                </p>
              </div>
              {summary.shapes.length > 0 ? (
                <div aria-label={accessibilityLabels.selectedShapes} className="grid gap-2">
                  <div className="font-medium">{accessibilityLabels.selectedShapes}</div>
                  <ul className="grid gap-2">
                    {summary.shapes.map((shape, index) => (
                      <li key={shape.id} className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-border/70 px-3">
                        <span>
                          {index + 1}. {formatNumber(shape.areaM2, 1)} m²
                        </span>
                        <Button
                          aria-label={`${accessibilityLabels.removeShape} ${index + 1}`}
                          size="sm"
                          variant="ghost"
                          onClick={() => removeShape(shape)}
                        >
                          {accessibilityLabels.removeShape}
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </details>
        </div>
        <div
          className={
            immersive
              ? "map-stage absolute inset-0 z-0 h-[calc(100dvh-64px)] min-h-[480px] overflow-hidden bg-slate-950 sm:min-h-[620px]"
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
                ? "absolute inset-0 h-[calc(100dvh-64px)] min-h-[480px] w-full sm:min-h-[620px]"
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
            onIdle={() => {
              if (mapRef.current) {
                initializeDrawing(mapRef.current);
              }
            }}
            onUnmount={() => {
              terraDrawRef.current?.stop();
              terraDrawRef.current = null;
              mapRef.current = null;
            }}
            options={{
              mapTypeControl: false,
              fullscreenControl: false,
              streetViewControl: false,
              tilt: 0,
              gestureHandling: drawMode ? "none" : "greedy",
              draggable: !drawMode,
              disableDoubleClickZoom: Boolean(drawMode),
              keyboardShortcuts: true,
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

          </GoogleMap>
        </div>
      </CardContent>
    </Card>
  );
}
