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
  const annualGenerationKWh = Math.max(0, finiteOrZero(input.annualGenerationKWh));
  const ftRateTHBPerKWh = finiteOrZero(input.ftRateTHBPerKWh);
  const selfConsumptionRatio = Math.min(1, Math.max(0, finiteOrZero(input.selfConsumptionRatio)));
  const exportRateTHBPerKWh = Math.max(0, finiteOrZero(input.exportRateTHBPerKWh));
  const retailRateTHBPerKWh = Math.max(0, SOLAR_DEFAULTS.baseRateTHBPerKWh + ftRateTHBPerKWh);
  const annualSelfUseKWh = annualGenerationKWh * selfConsumptionRatio;
  const annualExportKWh = annualGenerationKWh - annualSelfUseKWh;
  const annualSelfUseSavingsTHB = annualSelfUseKWh * retailRateTHBPerKWh;
  const annualExportRevenueTHB = annualExportKWh * exportRateTHBPerKWh;
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

function finiteOrZero(value: number) {
  return Number.isFinite(value) ? value : 0;
}
