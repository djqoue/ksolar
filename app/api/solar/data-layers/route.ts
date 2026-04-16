import { NextRequest, NextResponse } from "next/server";
import { RUNTIME_FALLBACKS } from "@/lib/config/runtime-fallbacks";
import { extractGeoTiffId, formatGoogleDate } from "@/lib/solar";
import type { GoogleSolarDataLayerPaths } from "@/types/solar";

interface GoogleDataLayersResponse {
  imageryDate?: { year?: number; month?: number; day?: number };
  imageryProcessedDate?: { year?: number; month?: number; day?: number };
  imageryQuality?: "HIGH" | "MEDIUM" | "BASE";
  dsmUrl?: string;
  rgbUrl?: string;
  maskUrl?: string;
  annualFluxUrl?: string;
  monthlyFluxUrl?: string;
  hourlyShadeUrls?: string[];
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
}

function toProxyPath(id: string | null) {
  return id ? `/api/solar/geotiff?id=${encodeURIComponent(id)}` : undefined;
}

function normalizeDataLayersResponse(
  payload: GoogleDataLayersResponse,
  latitude: number,
  longitude: number,
  radiusMeters: number,
): GoogleSolarDataLayerPaths {
  return {
    center: {
      latitude,
      longitude,
    },
    radiusMeters,
    imageryQuality: payload.imageryQuality || "BASE",
    imageryDate: formatGoogleDate(payload.imageryDate),
    imageryProcessedDate: formatGoogleDate(payload.imageryProcessedDate),
    dsmPath: toProxyPath(extractGeoTiffId(payload.dsmUrl)),
    rgbPath: toProxyPath(extractGeoTiffId(payload.rgbUrl)),
    maskPath: toProxyPath(extractGeoTiffId(payload.maskUrl)),
    annualFluxPath: toProxyPath(extractGeoTiffId(payload.annualFluxUrl)),
    monthlyFluxPath: toProxyPath(extractGeoTiffId(payload.monthlyFluxUrl)),
    hourlyShadePaths:
      payload.hourlyShadeUrls?.flatMap((url) => {
        const id = extractGeoTiffId(url);
        return id ? [`/api/solar/geotiff?id=${encodeURIComponent(id)}`] : [];
      }) || [],
  };
}

export async function GET(request: NextRequest) {
  const apiKey = process.env.GOOGLE_SOLAR_API_KEY || RUNTIME_FALLBACKS.googleSolarApiKey;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GOOGLE_SOLAR_API_KEY is not configured." },
      { status: 500 },
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const latitude = Number(searchParams.get("latitude"));
  const longitude = Number(searchParams.get("longitude"));
  const radiusMeters = Number(searchParams.get("radiusMeters") || "70");
  const requiredQuality = searchParams.get("requiredQuality") || "MEDIUM";

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return NextResponse.json(
      { error: "Both latitude and longitude are required." },
      { status: 400 },
    );
  }

  const qualityCandidates =
    requiredQuality === "BASE" ? ["BASE"] : [requiredQuality, "BASE"];

  let response: Response | null = null;
  let payload: GoogleDataLayersResponse | null = null;

  for (const candidateQuality of qualityCandidates) {
    const url = new URL("https://solar.googleapis.com/v1/dataLayers:get");
    url.searchParams.set("location.latitude", String(latitude));
    url.searchParams.set("location.longitude", String(longitude));
    url.searchParams.set("radiusMeters", String(radiusMeters));
    url.searchParams.set("view", "FULL_LAYERS");
    url.searchParams.set("requiredQuality", candidateQuality);
    url.searchParams.set("key", apiKey);

    response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });

    payload = (await response.json()) as GoogleDataLayersResponse;

    if (response.ok) {
      break;
    }

    if (response.status !== 404 || candidateQuality === "BASE") {
      break;
    }
  }

  if (!response || !payload) {
    return NextResponse.json(
      { error: "Google Solar dataLayers request did not return a response." },
      { status: 502 },
    );
  }

  if (!response.ok) {
    return NextResponse.json(
      {
        error: payload.error?.message || "Google Solar dataLayers request failed.",
        status: payload.error?.status || response.statusText,
      },
      { status: response.status },
    );
  }

  return NextResponse.json(
    normalizeDataLayersResponse(payload, latitude, longitude, radiusMeters),
  );
}
