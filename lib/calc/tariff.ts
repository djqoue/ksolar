import { SOLAR_DEFAULTS } from "@/lib/config/solar";

export interface TariffValueResult {
  retailRateTHBPerKWh: number;
  annualSelfUseKWh: number;
  annualExportKWh: number;
  annualSavingsTHB: number;
}

export function calculateTariffValue(input: {
  annualGenerationKWh: number;
  ftRateTHBPerKWh: number;
  selfConsumptionRatio: number;
  exportRateTHBPerKWh: number;
}): TariffValueResult {
  const retailRateTHBPerKWh = SOLAR_DEFAULTS.baseRateTHBPerKWh + input.ftRateTHBPerKWh;
  const annualSelfUseKWh = input.annualGenerationKWh * input.selfConsumptionRatio;
  const annualExportKWh = input.annualGenerationKWh - annualSelfUseKWh;
  const annualSavingsTHB =
    annualSelfUseKWh * retailRateTHBPerKWh +
    annualExportKWh * input.exportRateTHBPerKWh;

  return {
    retailRateTHBPerKWh,
    annualSelfUseKWh,
    annualExportKWh,
    annualSavingsTHB,
  };
}

