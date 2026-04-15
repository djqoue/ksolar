import { NextRequest, NextResponse } from "next/server";
import { formatGoogleDate } from "@/lib/solar";
import type { GoogleSolarSummary } from "@/types/solar";

interface GoogleBuildingInsightsResponse {
  name?: string;
  center?: { latitude: number; longitude: number };
  boundingBox?: {
    sw?: { latitude?: number; longitude?: number };
    ne?: { latitude?: number; longitude?: number };
  };
  imageryDate?: { year?: number; month?: number; day?: number };
  postalCode?: string;
  regionCode?: string;
  imageryQuality?: "HIGH" | "MEDIUM" | "BASE";
  solarPotential?: {
    maxArrayPanelsCount?: number;
    maxArrayAreaMeters2?: number;
    maxSunshineHoursPerYear?: number;
    panelCapacityWatts?: number;
    panelHeightMeters?: number;
    panelWidthMeters?: number;
    wholeRoofStats?: {
      areaMeters2?: number;
      groundAreaMeters2?: number;
    };
    roofSegmentStats?: Array<{
      pitchDegrees?: number;
      azimuthDegrees?: number;
      center?: { latitude?: number; longitude?: number };
      boundingBox?: {
        sw?: { latitude?: number; longitude?: number };
        ne?: { latitude?: number; longitude?: number };
      };
      stats?: {
        areaMeters2?: number;
        groundAreaMeters2?: number;
        sunshineQuantiles?: number[];
      };
    }>;
    solarPanels?: Array<{
      center?: { latitude?: number; longitude?: number };
      orientation?: "LANDSCAPE" | "PORTRAIT";
      segmentIndex?: number;
      yearlyEnergyDcKwh?: number;
    }>;
    solarPanelConfigs?: Array<{
      panelsCount?: number;
      yearlyEnergyDcKwh?: number;
      roofSegmentSummaries?: Array<unknown>;
    }>;
  };
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
}

function normalizeBuildingInsightsResponse(
  payload: GoogleBuildingInsightsResponse,
): GoogleSolarSummary | null {
  if (!payload.center || !payload.solarPotential) {
    return null;
  }

  const recommendedConfig = payload.solarPotential.solarPanelConfigs?.[0];

  return {
    buildingId: payload.name || "unknown-building",
    center: payload.center,
    boundingBox:
      payload.boundingBox?.sw?.latitude !== undefined &&
      payload.boundingBox?.sw?.longitude !== undefined &&
      payload.boundingBox?.ne?.latitude !== undefined &&
      payload.boundingBox?.ne?.longitude !== undefined
        ? {
            sw: {
              latitude: payload.boundingBox.sw.latitude,
              longitude: payload.boundingBox.sw.longitude,
            },
            ne: {
              latitude: payload.boundingBox.ne.latitude,
              longitude: payload.boundingBox.ne.longitude,
            },
          }
        : undefined,
    imageryQuality: payload.imageryQuality || "BASE",
    imageryDate: formatGoogleDate(payload.imageryDate),
    regionCode: payload.regionCode,
    postalCode: payload.postalCode,
    maxArrayPanelsCount: payload.solarPotential.maxArrayPanelsCount || 0,
    maxArrayAreaMeters2: payload.solarPotential.maxArrayAreaMeters2 || 0,
    maxSunshineHoursPerYear: payload.solarPotential.maxSunshineHoursPerYear || 0,
    panelCapacityWatts: payload.solarPotential.panelCapacityWatts || 0,
    panelHeightMeters: payload.solarPotential.panelHeightMeters || 0,
    panelWidthMeters: payload.solarPotential.panelWidthMeters || 0,
    roofAreaMeters2: payload.solarPotential.wholeRoofStats?.areaMeters2,
    roofGroundAreaMeters2: payload.solarPotential.wholeRoofStats?.groundAreaMeters2,
    recommendedConfig: recommendedConfig
      ? {
          panelsCount: recommendedConfig.panelsCount || 0,
          yearlyEnergyDcKwh: recommendedConfig.yearlyEnergyDcKwh || 0,
          roofSegmentCount: recommendedConfig.roofSegmentSummaries?.length || 0,
        }
      : undefined,
    roofSegments:
      payload.solarPotential.roofSegmentStats?.map((segment, index) => ({
        segmentIndex: index,
        pitchDegrees: segment.pitchDegrees || 0,
        azimuthDegrees: segment.azimuthDegrees || 0,
        areaMeters2: segment.stats?.areaMeters2 || 0,
        groundAreaMeters2: segment.stats?.groundAreaMeters2 || 0,
        center:
          segment.center?.latitude !== undefined &&
          segment.center?.longitude !== undefined
            ? {
                latitude: segment.center.latitude,
                longitude: segment.center.longitude,
              }
            : undefined,
        boundingBox:
          segment.boundingBox?.sw?.latitude !== undefined &&
          segment.boundingBox?.sw?.longitude !== undefined &&
          segment.boundingBox?.ne?.latitude !== undefined &&
          segment.boundingBox?.ne?.longitude !== undefined
            ? {
                sw: {
                  latitude: segment.boundingBox.sw.latitude,
                  longitude: segment.boundingBox.sw.longitude,
                },
                ne: {
                  latitude: segment.boundingBox.ne.latitude,
                  longitude: segment.boundingBox.ne.longitude,
                },
              }
            : undefined,
        sunshineP90: segment.stats?.sunshineQuantiles?.[9],
      })) || [],
    solarPanels:
      payload.solarPotential.solarPanels?.flatMap((panel) => {
        if (
          panel.center?.latitude === undefined ||
          panel.center?.longitude === undefined
        ) {
          return [];
        }

        return [
          {
            center: {
              latitude: panel.center.latitude,
              longitude: panel.center.longitude,
            },
            orientation: panel.orientation || "PORTRAIT",
            segmentIndex: panel.segmentIndex || 0,
            yearlyEnergyDcKwh: panel.yearlyEnergyDcKwh || 0,
          },
        ];
      }) || [],
  };
}

export async function GET(request: NextRequest) {
  const apiKey = process.env.GOOGLE_SOLAR_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GOOGLE_SOLAR_API_KEY is not configured." },
      { status: 500 },
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const latitude = searchParams.get("latitude");
  const longitude = searchParams.get("longitude");
  const requiredQuality = searchParams.get("requiredQuality") || "MEDIUM";

  if (!latitude || !longitude) {
    return NextResponse.json(
      { error: "Both latitude and longitude are required." },
      { status: 400 },
    );
  }

  const qualityCandidates =
    requiredQuality === "BASE" ? ["BASE"] : [requiredQuality, "BASE"];

  let response: Response | null = null;
  let payload: GoogleBuildingInsightsResponse | null = null;

  for (const candidateQuality of qualityCandidates) {
    const url = new URL("https://solar.googleapis.com/v1/buildingInsights:findClosest");
    url.searchParams.set("location.latitude", latitude);
    url.searchParams.set("location.longitude", longitude);
    url.searchParams.set("requiredQuality", candidateQuality);
    url.searchParams.set("key", apiKey);

    response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });

    payload = (await response.json()) as GoogleBuildingInsightsResponse;

    if (response.ok) {
      break;
    }

    if (response.status !== 404 || candidateQuality === "BASE") {
      break;
    }
  }

  if (!response || !payload) {
    return NextResponse.json(
      { error: "Google Solar API request did not return a response." },
      { status: 502 },
    );
  }

  if (!response.ok) {
    return NextResponse.json(
      {
        error:
          payload.error?.message ||
          "Google Solar API request failed.",
        status: payload.error?.status || response.statusText,
      },
      { status: response.status },
    );
  }

  const normalized = normalizeBuildingInsightsResponse(payload);
  if (!normalized) {
    return NextResponse.json(
      { error: "Solar API response did not include usable building insights." },
      { status: 502 },
    );
  }

  return NextResponse.json(normalized);
}
