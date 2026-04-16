import type { BomScenario, CapacityTier, SystemTopology } from "@/types/bom";
import type { FinanceSelectionSummary } from "@/types/finance";

export type ShapeKind = "polygon" | "rectangle" | "manual";

export interface LatLngPoint {
  lat: number;
  lng: number;
}

export interface RoofShape {
  id: string;
  kind: ShapeKind;
  path: LatLngPoint[];
  areaM2: number;
}

export interface MapSelectionSummary {
  shapes: RoofShape[];
  grossAreaM2: number;
  usableAreaFactor: number;
  usableAreaM2: number;
}

export interface PricingPreset {
  id: "economic" | "standard" | "premium";
  label: string;
  marginRatio: number;
  benchmarkPercentile: number;
  description: string;
}

export interface CalculationExplanation {
  key: string;
  title: string;
  description: string;
  metrics: Record<string, string | number>;
}

export interface QuoteScenarioInput {
  map: MapSelectionSummary;
  topology: SystemTopology;
  pricingPresetId: PricingPreset["id"];
  selectedFinanceIds: string[];
  ftRateTHBPerKWh: number;
  selfConsumptionRatio: number;
  exportRateTHBPerKWh: number;
  googleMatchedRoof?: boolean;
  googleSellableFitWp?: number | null;
  googleSellablePanelCount?: number | null;
}

export interface QuoteScenarioResult {
  isViable: boolean;
  warnings: string[];
  recommendedTier: CapacityTier | null;
  usableAreaM2: number;
  panelCount: number;
  roofFitPanelCount: number;
  roofFitSystemWp: number;
  quotedSystemSizeWp: number;
  systemSizeWp: number;
  annualGenerationKWh: number;
  annualSavingsTHB: number;
  hardwareCostTHB: number;
  suggestedSellPriceTHB: number;
  finance: FinanceSelectionSummary;
  paybackYears: number | null;
  irrPercent: number | null;
  benchmarkLowTHB?: number;
  benchmarkHighTHB?: number;
  bom: BomScenario | null;
  explanation: CalculationExplanation[];
}
