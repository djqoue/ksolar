import { SOLAR_DEFAULTS } from "@/lib/config/solar";

export interface GenerationResult {
  annualGenerationKWh: number;
  dailyGenerationKWh: number;
}

export function calculateGeneration(systemSizeWp: number): GenerationResult {
  const dailyGenerationKWh =
    (systemSizeWp / 1000) *
    SOLAR_DEFAULTS.sunlightHours *
    (1 - SOLAR_DEFAULTS.systemLossRatio);

  return {
    dailyGenerationKWh,
    annualGenerationKWh: dailyGenerationKWh * 365,
  };
}

