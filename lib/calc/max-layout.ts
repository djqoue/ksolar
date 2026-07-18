import { calculateGeneration } from "@/lib/calc/generation";
import { SOLAR_DEFAULTS } from "@/lib/config/solar";

export type MaxLayoutSource = "google-solar" | "manual-roof";
export type StructuralLoadStatus = "ok" | "review" | "over-limit" | "unknown";

export interface MaxLayoutPanelProfile {
  areaM2: number;
  lengthM: number;
  powerWp: number;
  weightKg: number | null;
  widthM: number;
}

export interface MaxLayoutGoogleReference {
  maxArrayAreaM2?: number | null;
  maxConfigPanelCount?: number | null;
  maxConfigYearlyEnergyKWh?: number | null;
  panelCapacityWp?: number | null;
}

export interface MaxLayoutInput {
  googleMatchedRoof: boolean;
  googleReference?: MaxLayoutGoogleReference | null;
  manualUsableAreaM2: number;
  panel: MaxLayoutPanelProfile;
  selectedRoofAreaM2: number;
  mountingDeadLoadKgPerM2?: number;
  structuralReviewLoadKgPerM2?: number;
  structuralMaxIndicativeLoadKgPerM2?: number;
}

export interface MaxLayoutResult {
  annualGenerationKWh: number;
  arrayAreaM2: number;
  capacityWp: number;
  coveredAreaM2: number;
  loadKgPerM2: number | null;
  mountingWeightKg: number | null;
  panelCount: number;
  panelWeightKg: number | null;
  roofAverageLoadKgPerM2: number | null;
  source: MaxLayoutSource;
  specificYieldKWhPerKWp: number;
  structuralLoadStatus: StructuralLoadStatus;
  totalWeightKg: number | null;
}

function getGoogleSpecificYield(input: MaxLayoutInput) {
  const configPanels = input.googleReference?.maxConfigPanelCount || 0;
  const googlePanelCapacityWp = input.googleReference?.panelCapacityWp || 0;
  const googleAnnualGenerationKWh =
    input.googleReference?.maxConfigYearlyEnergyKWh || 0;
  const googleCapacityKw = (configPanels * googlePanelCapacityWp) / 1000;

  if (googleCapacityKw <= 0 || googleAnnualGenerationKWh <= 0) {
    return null;
  }

  return googleAnnualGenerationKWh / googleCapacityKw;
}

function classifyStructuralLoad(
  loadKgPerM2: number | null,
  reviewLoadKgPerM2: number,
  maxIndicativeLoadKgPerM2: number,
): StructuralLoadStatus {
  if (loadKgPerM2 === null || loadKgPerM2 <= 0) {
    return "unknown";
  }

  if (loadKgPerM2 > maxIndicativeLoadKgPerM2) {
    return "over-limit";
  }

  if (loadKgPerM2 > reviewLoadKgPerM2) {
    return "review";
  }

  return "ok";
}

export function calculateMaxLayout(input: MaxLayoutInput): MaxLayoutResult {
  const googleArea = input.googleReference?.maxArrayAreaM2 || 0;
  const source: MaxLayoutSource =
    input.googleMatchedRoof && googleArea > 0 ? "google-solar" : "manual-roof";
  const arrayAreaM2 =
    source === "google-solar" ? googleArea : Math.max(0, input.manualUsableAreaM2);
  const panelCount =
    input.panel.areaM2 > 0 ? Math.max(0, Math.floor(arrayAreaM2 / input.panel.areaM2)) : 0;
  const capacityWp = panelCount * input.panel.powerWp;
  const coveredAreaM2 = panelCount * input.panel.areaM2;
  const googleSpecificYield = source === "google-solar" ? getGoogleSpecificYield(input) : null;
  const generation = calculateGeneration(capacityWp, {
    googleSpecificYieldDcKWhPerKWp: googleSpecificYield,
  });
  const annualGenerationKWh = generation.annualGenerationKWh;
  const specificYieldKWhPerKWp = generation.specificYieldKWhPerKWp;

  const panelWeightKg =
    input.panel.weightKg && input.panel.weightKg > 0
      ? panelCount * input.panel.weightKg
      : null;
  const mountingDeadLoadKgPerM2 =
    input.mountingDeadLoadKgPerM2 ?? SOLAR_DEFAULTS.mountingDeadLoadKgPerM2;
  const mountingWeightKg =
    coveredAreaM2 > 0 ? coveredAreaM2 * mountingDeadLoadKgPerM2 : null;
  const totalWeightKg =
    panelWeightKg !== null && mountingWeightKg !== null
      ? panelWeightKg + mountingWeightKg
      : null;
  const loadKgPerM2 =
    totalWeightKg !== null && coveredAreaM2 > 0 ? totalWeightKg / coveredAreaM2 : null;
  const roofAverageLoadKgPerM2 =
    totalWeightKg !== null && input.selectedRoofAreaM2 > 0
      ? totalWeightKg / input.selectedRoofAreaM2
      : null;

  return {
    annualGenerationKWh,
    arrayAreaM2,
    capacityWp,
    coveredAreaM2,
    loadKgPerM2,
    mountingWeightKg,
    panelCount,
    panelWeightKg,
    roofAverageLoadKgPerM2,
    source,
    specificYieldKWhPerKWp,
    structuralLoadStatus: classifyStructuralLoad(
      loadKgPerM2,
      input.structuralReviewLoadKgPerM2 ?? SOLAR_DEFAULTS.structuralReviewLoadKgPerM2,
      input.structuralMaxIndicativeLoadKgPerM2 ??
        SOLAR_DEFAULTS.structuralMaxIndicativeLoadKgPerM2,
    ),
    totalWeightKg,
  };
}
