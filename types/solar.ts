export interface SolarLatLng {
  latitude: number;
  longitude: number;
}

export interface SolarLatLngBox {
  sw: SolarLatLng;
  ne: SolarLatLng;
}

export type SolarImageryQuality = "HIGH" | "MEDIUM" | "BASE" | "UNKNOWN";

export interface GoogleSolarPanelConfigSummary {
  index: number;
  panelsCount: number;
  yearlyEnergyDcKwh: number;
  roofSegmentCount: number;
  roofSegmentSummaries: Array<{
    segmentIndex: number;
    pitchDegrees: number;
    azimuthDegrees: number;
    panelsCount: number;
    yearlyEnergyDcKwh: number;
  }>;
}

export interface GoogleSolarFinancialAnalysisSummary {
  index: number;
  panelConfigIndex: number | null;
  defaultBill: boolean;
  averageKwhPerMonth: number | null;
  monthlyBillAmount: number | null;
  monthlyBillCurrencyCode?: string;
  yearlyAcKwh?: number | null;
  remainingLifetimeBillAmount?: number | null;
  solarPercentage?: number | null;
  percentageExportedToGrid?: number | null;
  paybackYears?: number | null;
}

export interface GoogleSolarSummary {
  buildingId: string;
  center: SolarLatLng;
  boundingBox?: SolarLatLngBox;
  imageryQuality: SolarImageryQuality;
  imageryDate?: string;
  imageryProcessedDate?: string;
  regionCode?: string;
  postalCode?: string;
  maxArrayPanelsCount: number;
  maxArrayAreaMeters2: number;
  maxSunshineHoursPerYear: number;
  panelCapacityWatts: number;
  panelHeightMeters: number;
  panelWidthMeters: number;
  carbonOffsetFactorKgPerMwh?: number;
  roofAreaMeters2?: number;
  roofGroundAreaMeters2?: number;
  wholeRoofSunshineQuantiles?: number[];
  buildingRoofAreaMeters2?: number;
  buildingGroundAreaMeters2?: number;
  buildingSunshineQuantiles?: number[];
  availableConfigs: GoogleSolarPanelConfigSummary[];
  maxConfig?: GoogleSolarPanelConfigSummary;
  billMatchedConfig?: GoogleSolarPanelConfigSummary;
  recommendedConfig?: GoogleSolarPanelConfigSummary;
  configSelectionMethod?: "financial-analysis" | "max-panels";
  financialAnalyses: GoogleSolarFinancialAnalysisSummary[];
  roofSegments: Array<{
    segmentIndex: number;
    pitchDegrees: number;
    azimuthDegrees: number;
    areaMeters2: number;
    groundAreaMeters2: number;
    center?: SolarLatLng;
    boundingBox?: SolarLatLngBox;
    planeHeightAtCenterMeters?: number;
    sunshineQuantiles?: number[];
    sunshineP90?: number;
  }>;
  solarPanels: Array<{
    center: SolarLatLng;
    orientation: "LANDSCAPE" | "PORTRAIT";
    segmentIndex: number;
    yearlyEnergyDcKwh: number;
  }>;
}

export interface GoogleSolarDataLayerPaths {
  center: SolarLatLng;
  radiusMeters: number;
  imageryQuality: SolarImageryQuality;
  imageryDate?: string;
  imageryProcessedDate?: string;
  dsmPath?: string;
  rgbPath?: string;
  maskPath?: string;
  annualFluxPath?: string;
  monthlyFluxPath?: string;
  hourlyShadePaths: string[];
}

export interface SolarRasterBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface SolarAnnualFluxOverlay {
  dataUrl: string;
  bounds: SolarRasterBounds;
  minFlux: number | null;
  maxFlux: number | null;
  meanFlux: number | null;
  roofPixelCount: number;
  maskSource: "selected-roof" | "google-building";
}

export interface SolarMonthlyFluxSummary {
  monthlyFluxMeans: number[];
}

export interface SolarHourlyShadeSummary {
  monthlySunAccessRatio: number[];
  monthlySunnyObservationCount: number[];
  monthlyValidObservationCount: number[];
  metricDefinition: "fraction-of-valid-selected-roof-pixel-day-hours-with-direct-sun";
}

export interface SolarDataLayerAnalysis {
  annualFluxOverlay: SolarAnnualFluxOverlay | null;
  monthlyFlux: SolarMonthlyFluxSummary | null;
  hourlyShade: SolarHourlyShadeSummary | null;
}

export interface SolarPanelFootprint {
  id: string;
  center: SolarLatLng;
  segmentIndex: number;
  orientation: "LANDSCAPE" | "PORTRAIT";
  yearlyEnergyDcKwh: number;
  azimuthDegrees: number;
  path: Array<{ lat: number; lng: number }>;
}
