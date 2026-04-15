import type { Libraries } from "@react-google-maps/api";
import { SOLAR_DEFAULTS } from "@/lib/config/solar";
import type { MapSelectionSummary } from "@/types/quote";

export const GOOGLE_MAP_LIBRARIES: Libraries = ["drawing", "geometry"];

export const DEFAULT_MAP_CENTER = {
  lat: 13.7563,
  lng: 100.5018,
};

export function createEmptyMapSelection(): MapSelectionSummary {
  return {
    shapes: [],
    grossAreaM2: 0,
    usableAreaFactor: SOLAR_DEFAULTS.usableAreaFactor,
    usableAreaM2: 0,
  };
}
