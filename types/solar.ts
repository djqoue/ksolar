export interface SolarLatLng {
  latitude: number;
  longitude: number;
}

export interface SolarLatLngBox {
  sw: SolarLatLng;
  ne: SolarLatLng;
}

export interface GoogleSolarSummary {
  buildingId: string;
  center: SolarLatLng;
  boundingBox?: SolarLatLngBox;
  imageryQuality: "HIGH" | "MEDIUM" | "BASE";
  imageryDate?: string;
  regionCode?: string;
  postalCode?: string;
  maxArrayPanelsCount: number;
  maxArrayAreaMeters2: number;
  maxSunshineHoursPerYear: number;
  panelCapacityWatts: number;
  panelHeightMeters: number;
  panelWidthMeters: number;
  roofAreaMeters2?: number;
  roofGroundAreaMeters2?: number;
  recommendedConfig?: {
    panelsCount: number;
    yearlyEnergyDcKwh: number;
    roofSegmentCount: number;
  };
  roofSegments: Array<{
    segmentIndex: number;
    pitchDegrees: number;
    azimuthDegrees: number;
    areaMeters2: number;
    groundAreaMeters2: number;
    center?: SolarLatLng;
    boundingBox?: SolarLatLngBox;
    sunshineP90?: number;
  }>;
  solarPanels: Array<{
    center: SolarLatLng;
    orientation: "LANDSCAPE" | "PORTRAIT";
    segmentIndex: number;
    yearlyEnergyDcKwh: number;
  }>;
}
