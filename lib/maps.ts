import type { Libraries } from "@react-google-maps/api";
import { SOLAR_DEFAULTS } from "@/lib/config/solar";
import { getSelectionReferencePoint } from "@/lib/solar";
import type { MapSelectionSummary, RoofShape } from "@/types/quote";
import type { SolarLatLng } from "@/types/solar";

export const GOOGLE_MAP_LIBRARIES: Libraries = ["geometry"];

export const DEFAULT_MAP_CENTER = {
  lat: 13.7563,
  lng: 100.5018,
};

export function resolveRestoredMapCenter(
  shapes: RoofShape[],
  persistedCenter?: SolarLatLng | null,
  customerFocusPoint?: SolarLatLng | null,
): SolarLatLng {
  return (
    getSelectionReferencePoint(shapes) ??
    persistedCenter ??
    customerFocusPoint ?? {
      latitude: DEFAULT_MAP_CENTER.lat,
      longitude: DEFAULT_MAP_CENTER.lng,
    }
  );
}

export function createEmptyMapSelection(): MapSelectionSummary {
  return {
    shapes: [],
    grossAreaM2: 0,
    usableAreaFactor: SOLAR_DEFAULTS.usableAreaFactor,
    usableAreaM2: 0,
  };
}
