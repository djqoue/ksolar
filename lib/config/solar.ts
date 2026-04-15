import type { CapacityTier, SystemTopology } from "@/types/bom";

export const SOLAR_DEFAULTS = {
  panelPowerWp: 650,
  panelAreaM2: 3.1,
  usableAreaFactor: 0.7,
  sunlightHours: 4.0,
  systemLossRatio: 0.15,
  baseRateTHBPerKWh: 4.18,
  defaultFtRateTHBPerKWh: 0,
  defaultExportRateTHBPerKWh: 2.2,
  defaultSelfConsumptionRatio: 0.6,
  projectLifeYears: 25,
  degradationRatio: 0.005,
  tariffEscalationRatio: 0.02,
  annualOMRatio: 0.01,
} as const;

export const CAPACITY_TIERS: CapacityTier[] = [
  { id: "3kW", nominalWp: 3250, panelCount: 5, panelPowerWp: 650 },
  { id: "5kW", nominalWp: 5200, panelCount: 8, panelPowerWp: 650 },
  { id: "10kW", nominalWp: 10400, panelCount: 16, panelPowerWp: 650 },
  { id: "15kW", nominalWp: 15600, panelCount: 24, panelPowerWp: 650 },
  { id: "20kW", nominalWp: 20150, panelCount: 31, panelPowerWp: 650 },
];

export const DEFAULT_TOPOLOGY: SystemTopology = {
  phase: "1P",
  mode: "ongrid",
  batteryMode: "none",
};

