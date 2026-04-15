export type Phase = "1P" | "3P";
export type SystemMode = "ongrid" | "hybrid";
export type BatteryMode = "none" | "with_battery";
export type CapacityTierId = "3kW" | "5kW" | "10kW" | "15kW" | "20kW";
export type BomCategory =
  | "panel"
  | "inverter"
  | "battery"
  | "mounting"
  | "electrical"
  | "labor"
  | "other";

export interface SystemTopology {
  phase: Phase;
  mode: SystemMode;
  batteryMode: BatteryMode;
}

export interface CapacityTier {
  id: CapacityTierId;
  nominalWp: number;
  panelCount: number;
  panelPowerWp: number;
}

export interface BomLineItemTemplate {
  id: string;
  category: BomCategory;
  name: string;
  model: string;
  unit: string;
  unitCostTHB: number;
  quantity: number;
}

export interface BomScenarioTemplate {
  topology: SystemTopology;
  tierId: CapacityTier["id"];
  lineItems: BomLineItemTemplate[];
}

export interface BomLineItem extends BomLineItemTemplate {
  subtotalTHB: number;
}

export interface BomScenario {
  topology: SystemTopology;
  tier: CapacityTier;
  lineItems: BomLineItem[];
  categoryTotals: Record<BomCategory, number>;
  hardwareCostTHB: number;
}

