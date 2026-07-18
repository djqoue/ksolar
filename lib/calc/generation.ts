import { SOLAR_DEFAULTS } from "@/lib/config/solar";

export type GenerationModel = "thailand-default" | "google-solar-calibrated";

export interface GenerationResult {
  annualGenerationKWh: number;
  dailyGenerationKWh: number;
  model: GenerationModel;
  specificYieldKWhPerKWp: number;
  systemLossRatio: number;
}

export interface GenerationOptions {
  /**
   * Google Solar returns yearly DC kWh that already reflects roof sun access,
   * pitch, azimuth, and shading. We still derate it for site/system losses
   * before using it in customer-facing bill savings.
   */
  googleSpecificYieldDcKWhPerKWp?: number | null;
  systemLossRatio?: number;
}

export function calculateGeneration(
  systemSizeWp: number,
  options: GenerationOptions = {},
): GenerationResult {
  const systemSizeKWp = systemSizeWp / 1000;
  const systemLossRatio = options.systemLossRatio ?? SOLAR_DEFAULTS.systemLossRatio;
  const googleSpecificYieldDcKWhPerKWp = options.googleSpecificYieldDcKWhPerKWp;

  if (systemSizeKWp > 0 && googleSpecificYieldDcKWhPerKWp && googleSpecificYieldDcKWhPerKWp > 0) {
    const annualGenerationKWh =
      systemSizeKWp * googleSpecificYieldDcKWhPerKWp * (1 - systemLossRatio);

    return {
      annualGenerationKWh,
      dailyGenerationKWh: annualGenerationKWh / 365,
      model: "google-solar-calibrated",
      specificYieldKWhPerKWp: annualGenerationKWh / systemSizeKWp,
      systemLossRatio,
    };
  }

  const dailyGenerationKWh =
    systemSizeKWp *
    SOLAR_DEFAULTS.sunlightHours *
    (1 - systemLossRatio);
  const annualGenerationKWh = dailyGenerationKWh * 365;

  return {
    dailyGenerationKWh,
    annualGenerationKWh,
    model: "thailand-default",
    specificYieldKWhPerKWp: systemSizeKWp > 0 ? annualGenerationKWh / systemSizeKWp : 0,
    systemLossRatio,
  };
}
