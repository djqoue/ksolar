import { NextRequest, NextResponse } from "next/server";
import { RUNTIME_FALLBACKS } from "@/lib/config/runtime-fallbacks";
import { buildGoogleApiErrorPayload } from "@/lib/google-api-errors";
import { requireAuthenticatedApiUser } from "@/lib/server/api-auth";
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
  const authError = await requireAuthenticatedApiUser();

  if (authError) {
    return authError;
  }

  const apiKey = process.env.GOOGLE_SOLAR_API_KEY || RUNTIME_FALLBACKS.googleSolarApiKey;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GOOGLE_SOLAR_API_KEY is not configured." },
      { status: 500 },
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const latitudeParam = searchParams.get("latitude");
  const longitudeParam = searchParams.get("longitude");
  const radiusParam = searchParams.get("radiusMeters");
  const latitude = latitudeParam?.trim() ? Number(latitudeParam) : Number.NaN;
  const longitude = longitudeParam?.trim() ? Number(longitudeParam) : Number.NaN;
  const radiusMeters = radiusParam === null ? 70 : Number(radiusParam);
  const requiredQuality = searchParams.get("requiredQuality") || "MEDIUM";

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180 ||
    !Number.isFinite(radiusMeters) ||
    radiusMeters <= 0 ||
    radiusMeters > 100 ||
    !["HIGH", "MEDIUM", "BASE"].includes(requiredQuality)
  ) {
    return NextResponse.json(
      { error: "Valid latitude, longitude, radius, and imagery quality are required." },
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
    const apiError = buildGoogleApiErrorPayload({
      fallbackMessage: "Google Solar dataLayers request failed.",
      httpStatus: response.status,
      providerStatus: payload.error?.status || response.statusText,
      message: payload.error?.message,
    });

    return NextResponse.json(
      apiError,
      { status: response.status },
    );
  }

  return NextResponse.json(
    normalizeDataLayersResponse(payload, latitude, longitude, radiusMeters),
  );
}
