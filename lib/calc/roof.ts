import { SOLAR_DEFAULTS } from "@/lib/config/solar";
import type { MapSelectionSummary } from "@/types/quote";

export interface RoofPotential {
  grossAreaM2: number;
  usableAreaM2: number;
  panelCount: number;
  theoreticalWp: number;
}

export function calculateRoofPotential(map: MapSelectionSummary): RoofPotential {
  const usableAreaM2 = map.usableAreaM2 || map.grossAreaM2 * (map.usableAreaFactor || SOLAR_DEFAULTS.usableAreaFactor);
  const panelCount = Math.max(0, Math.floor(usableAreaM2 / SOLAR_DEFAULTS.panelAreaM2));
  const theoreticalWp = panelCount * SOLAR_DEFAULTS.panelPowerWp;

  return {
    grossAreaM2: map.grossAreaM2,
    usableAreaM2,
    panelCount,
    theoreticalWp,
  };
}

