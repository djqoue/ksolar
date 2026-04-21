/**
 * Battery catalog for KSolar residential systems.
 *
 * Source: Genixgreen ES-BOX series — prices from bom-catalog.ts estimates (THB).
 * Chemistry: LFP (Lithium Iron Phosphate) — standard for residential solar storage.
 *
 * Expand this file when new battery models are available.
 */

export interface BatterySpec {
  id: string;
  manufacturer: string;
  model: string;
  /** Usable capacity (kWh) */
  capacityKWh: number;
  /** THB price per unit */
  unitCostTHB: number;
  chemistry: "LFP" | "NMC";
  /** Cycle life at 80% depth of discharge */
  cycleLife: number;
  /** Nominal voltage (V) */
  nominalVoltageV: number | null;
  /** Continuous charge/discharge current (A) */
  continuousCurrentA: number | null;
  dimWidthMm: number | null;
  dimHeightMm: number | null;
  dimDepthMm: number | null;
  weightKg: number | null;
}

export const BATTERY_CATALOG: BatterySpec[] = [
  {
    id: "genixgreen-es-box12",
    manufacturer: "Genixgreen",
    model: "ES-BOX12",
    capacityKWh: 5.12,
    unitCostTHB: 21000,
    chemistry: "LFP",
    cycleLife: 6000,
    nominalVoltageV: 48,
    continuousCurrentA: 100,
    dimWidthMm: 600,
    dimHeightMm: 700,
    dimDepthMm: 200,
    weightKg: 55,
  },
  {
    id: "genixgreen-es-box12-plus",
    manufacturer: "Genixgreen",
    model: "ES-BOX12 Plus",
    capacityKWh: 10.24,
    unitCostTHB: 40000,
    chemistry: "LFP",
    cycleLife: 6000,
    nominalVoltageV: 48,
    continuousCurrentA: 100,
    dimWidthMm: 600,
    dimHeightMm: 1100,
    dimDepthMm: 200,
    weightKg: 100,
  },
  {
    id: "genixgreen-es-box36-max-plus",
    manufacturer: "Genixgreen",
    model: "ES-BOX36 MAX+",
    capacityKWh: 16,
    unitCostTHB: 50500,
    chemistry: "LFP",
    cycleLife: 6000,
    nominalVoltageV: 48,
    continuousCurrentA: 150,
    dimWidthMm: 600,
    dimHeightMm: 1400,
    dimDepthMm: 200,
    weightKg: 150,
  },
];

/**
 * Default battery ID used in BOM (matches 3kW/5kW tier default).
 * Override to "auto" in UI to let the BOM template pick per tier.
 */
export const DEFAULT_BATTERY_ID = "genixgreen-es-box12";

export function findBattery(id: string): BatterySpec | undefined {
  return BATTERY_CATALOG.find((b) => b.id === id);
}
