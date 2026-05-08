import { SOLAR_DEFAULTS } from "@/lib/config/solar";
import type { MapSelectionSummary } from "@/types/quote";

export interface RoofPotential {
  grossAreaM2: number;
  usableAreaM2: number;
  panelCount: number;
  theoreticalWp: number;
}

export interface RoofCalculationProfile {
  panelAreaM2?: number;
  panelPowerWp?: number;
}

export function calculateRoofPotential(
  map: MapSelectionSummary,
  profile: RoofCalculationProfile = {},
): RoofPotential {
  const panelAreaM2 = profile.panelAreaM2 || SOLAR_DEFAULTS.panelAreaM2;
  const panelPowerWp = profile.panelPowerWp || SOLAR_DEFAULTS.panelPowerWp;
  const usableAreaM2 = map.usableAreaM2 || map.grossAreaM2 * (map.usableAreaFactor || SOLAR_DEFAULTS.usableAreaFactor);
  const panelCount = panelAreaM2 > 0 ? Math.max(0, Math.floor(usableAreaM2 / panelAreaM2)) : 0;
  const theoreticalWp = panelCount * panelPowerWp;

  return {
    grossAreaM2: map.grossAreaM2,
    usableAreaM2,
    panelCount,
    theoreticalWp,
  };
}
