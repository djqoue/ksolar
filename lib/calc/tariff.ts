import { SOLAR_DEFAULTS } from "@/lib/config/solar";
import { THAILAND_ENERGY_POLICY } from "@/lib/config/thailand-energy-policy";

export interface TariffValueResult {
  retailRateTHBPerKWh: number;
  annualSelfUseKWh: number;
  annualExportKWh: number;
  annualCurtailmentKWh: number;
  annualSelfUseSavingsTHB: number;
  annualExportRevenueTHB: number;
  annualSavingsTHB: number;
  savingsCappedByBill: boolean;
  exportRevenueMode: "legacy-assumed" | "approved-proxy" | "not-approved";
}

export function calculateTariffValue(input: {
  annualGenerationKWh: number;
  ftRateTHBPerKWh: number;
  selfConsumptionRatio: number;
  exportRateTHBPerKWh: number;
  monthlyElectricityBillTHB?: number | null;
  gridExportApproved?: boolean;
  approvedExportLimitKwAc?: number | null;
}): TariffValueResult {
  const annualGenerationKWh = Math.max(0, finiteOrZero(input.annualGenerationKWh));
  const ftRateTHBPerKWh = finiteOrZero(input.ftRateTHBPerKWh);
  const selfConsumptionRatio = Math.min(1, Math.max(0, finiteOrZero(input.selfConsumptionRatio)));
  const exportRateTHBPerKWh = Math.max(0, finiteOrZero(input.exportRateTHBPerKWh));
  const retailRateTHBPerKWh = Math.max(0, SOLAR_DEFAULTS.baseRateTHBPerKWh + ftRateTHBPerKWh);
  const annualSelfUseKWh = annualGenerationKWh * selfConsumptionRatio;
  const annualSurplusKWh = annualGenerationKWh - annualSelfUseKWh;
  const gridExportApproved = input.gridExportApproved;
  const exportRevenueMode =
    gridExportApproved === undefined
      ? "legacy-assumed"
      : gridExportApproved
        ? "approved-proxy"
        : "not-approved";
  const approvedExportLimitKwAc = Math.max(
    0,
    finiteOrZero(
      input.approvedExportLimitKwAc ??
        THAILAND_ENERGY_POLICY.residentialNetBilling.approvedExportLimitKwAc,
    ),
  );
  const annualExportProxyLimitKWh =
    approvedExportLimitKwAc * SOLAR_DEFAULTS.sunlightHours * 365;
  const annualExportKWh =
    exportRevenueMode === "not-approved"
      ? 0
      : exportRevenueMode === "approved-proxy"
        ? Math.min(annualSurplusKWh, annualExportProxyLimitKWh)
        : annualSurplusKWh;
  const annualCurtailmentKWh = Math.max(0, annualSurplusKWh - annualExportKWh);
  const uncappedAnnualSelfUseSavingsTHB = annualSelfUseKWh * retailRateTHBPerKWh;
  const annualBillTHB =
    input.monthlyElectricityBillTHB !== null &&
    input.monthlyElectricityBillTHB !== undefined &&
    Number.isFinite(input.monthlyElectricityBillTHB) &&
    input.monthlyElectricityBillTHB > 0
      ? input.monthlyElectricityBillTHB * 12
      : null;
  const annualSelfUseSavingsTHB =
    annualBillTHB === null
      ? uncappedAnnualSelfUseSavingsTHB
      : Math.min(uncappedAnnualSelfUseSavingsTHB, annualBillTHB);
  const savingsCappedByBill =
    annualBillTHB !== null && annualSelfUseSavingsTHB < uncappedAnnualSelfUseSavingsTHB;
  const annualExportRevenueTHB = annualExportKWh * exportRateTHBPerKWh;
  const annualSavingsTHB = annualSelfUseSavingsTHB + annualExportRevenueTHB;

  return {
    retailRateTHBPerKWh,
    annualSelfUseKWh,
    annualExportKWh,
    annualCurtailmentKWh,
    annualSelfUseSavingsTHB,
    annualExportRevenueTHB,
    annualSavingsTHB,
    savingsCappedByBill,
    exportRevenueMode,
  };
}

function finiteOrZero(value: number) {
  return Number.isFinite(value) ? value : 0;
}
