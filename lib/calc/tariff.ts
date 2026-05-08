import { SOLAR_DEFAULTS } from "@/lib/config/solar";

export interface TariffValueResult {
  retailRateTHBPerKWh: number;
  annualSelfUseKWh: number;
  annualExportKWh: number;
  annualSelfUseSavingsTHB: number;
  annualExportRevenueTHB: number;
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
  const annualSelfUseSavingsTHB = annualSelfUseKWh * retailRateTHBPerKWh;
  const annualExportRevenueTHB = annualExportKWh * input.exportRateTHBPerKWh;
  const annualSavingsTHB = annualSelfUseSavingsTHB + annualExportRevenueTHB;

  return {
    retailRateTHBPerKWh,
    annualSelfUseKWh,
    annualExportKWh,
    annualSelfUseSavingsTHB,
    annualExportRevenueTHB,
    annualSavingsTHB,
  };
}
