import type { BomScenario, CapacityTier, SystemTopology } from "@/types/bom";
import type { FinanceSelectionSummary } from "@/types/finance";
import type { GenerationModel } from "@/lib/calc/generation";

export type StandardCapacityKW = 5 | 10 | 15 | 20;

/**
 * One capacity decision shared by the quote UI and calculation engine.
 * `roof-potential` is an engineering assessment, not a residential package.
 */
export type CapacityIntent =
  | { mode: "standard"; targetKW: StandardCapacityKW }
  | { mode: "roof-potential" };

export type QuoteReadiness =
  | "ready"
  | "technical-potential-only"
  | "engineering-review"
  | "not-viable";

export interface ElectricalCompatibilitySummary {
  compatible: boolean;
  inverterId: string;
  inverterModel: string;
  dcAcRatio: number;
  stringCount: number;
  modulesPerString: number[];
  maxStringVocV: number;
  minStringVmpV: number;
  maxStringVmpV: number;
  warnings: string[];
  errors: string[];
}

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
  /** Preferred capacity API. `selectedTierId` remains for saved legacy quotes. */
  capacityIntent?: CapacityIntent | null;
  selectedTierId?: CapacityTier["id"] | null;
  selectedFinanceIds: string[];
  /** Taxable income after deductions; used only to calculate an eligible tax saving. */
  taxableIncomeTHB?: number | null;
  monthlyElectricityBillTHB?: number | null;
  /** undefined preserves legacy calculations; new quotes should require confirmation. */
  gridExportApproved?: boolean;
  approvedExportLimitKwAc?: number;
  ftRateTHBPerKWh: number;
  selfConsumptionRatio: number;
  exportRateTHBPerKWh: number;
  googleMatchedRoof?: boolean;
  googleSellableFitWp?: number | null;
  googleSellablePanelCount?: number | null;
  googleAnnualGenerationKWh?: number | null;
  /** Panel catalog ID from PANEL_CATALOG; undefined → use BOM default */
  selectedPanelId?: string;
  /** Inverter catalog ID from INVERTER_CATALOG; "auto" or undefined → use BOM default */
  selectedInverterId?: string;
  /** Battery catalog ID from BATTERY_CATALOG; "auto" or undefined → use BOM default */
  selectedBatteryId?: string;
}

export interface QuoteScenarioResult {
  isViable: boolean;
  quoteReady: boolean;
  quoteReadiness: QuoteReadiness;
  capacityIntent: CapacityIntent | null;
  engineeringReviewRequired: boolean;
  warnings: string[];
  recommendedTier: CapacityTier | null;
  usableAreaM2: number;
  panelCount: number;
  roofFitPanelCount: number;
  roofFitSystemWp: number;
  roofPotentialAnnualGenerationKWh: number;
  quotedSystemSizeWp: number;
  systemSizeWp: number;
  annualGenerationKWh: number;
  generationModel: GenerationModel;
  generationSpecificYieldKWhPerKWp: number;
  generationSystemLossRatio: number;
  annualSelfUseKWh: number;
  annualExportKWh: number;
  annualSelfUseSavingsTHB: number;
  annualExportRevenueTHB: number;
  annualSavingsTHB: number;
  annualCurtailmentKWh: number;
  savingsCappedByBill: boolean;
  hardwareCostTHB: number;
  suggestedSellPriceTHB: number;
  finance: FinanceSelectionSummary;
  paybackYears: number | null;
  discountedPaybackYears: number | null;
  irrPercent: number | null;
  npvTHB: number;
  lifetimeNetSavingsTHB: number;
  benchmarkLowTHB?: number;
  benchmarkHighTHB?: number;
  bom: BomScenario | null;
  electricalCompatibility: ElectricalCompatibilitySummary | null;
  explanation: CalculationExplanation[];
}
