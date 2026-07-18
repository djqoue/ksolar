import { NextResponse } from "next/server";
import { buildGoogleApiErrorPayload } from "@/lib/google-api-errors";
import { resolveAppLocale } from "@/lib/i18n";
import { requireAuthenticatedApiUser } from "@/lib/server/api-auth";

const GOOGLE_GEOCODING_ENDPOINT = "https://maps.googleapis.com/maps/api/geocode/json";

interface GoogleGeocodePayload {
  status?: string;
  results?: Array<{
    formatted_address?: string;
    geometry?: {
      location?: {
        lat?: number;
        lng?: number;
      };
    };
  }>;
  error_message?: string;
}

export async function GET(request: Request) {
  const authError = await requireAuthenticatedApiUser();

  if (authError) {
    return authError;
  }

  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address")?.trim();
  const locale = resolveAppLocale(searchParams.get("locale"));

  if (!address) {
    return NextResponse.json({ result: null, error: "Address is required." }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ result: null, error: "Google Maps key is not configured." });
  }

  const url = new URL(GOOGLE_GEOCODING_ENDPOINT);
  url.searchParams.set("address", address);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("language", getGoogleLanguage(locale));
  url.searchParams.set("region", "th");

  try {
    const response = await fetch(url, { cache: "no-store" });
    const payload = (await response.json()) as GoogleGeocodePayload;

    if (!response.ok || (payload.status && !["OK", "ZERO_RESULTS"].includes(payload.status))) {
      return NextResponse.json({
        result: null,
        ...buildGoogleApiErrorPayload({
          fallbackMessage: "Google geocoding failed.",
          httpStatus: response.status,
          providerStatus: payload.status || response.statusText,
          message: payload.error_message,
        }),
      });
    }

    const firstResult = payload.results?.find((item) => {
      const location = item.geometry?.location;
      return Number.isFinite(location?.lat) && Number.isFinite(location?.lng);
    });

    if (!firstResult?.geometry?.location) {
      return NextResponse.json({ result: null });
    }

    return NextResponse.json({
      result: {
        formattedAddress: firstResult.formatted_address || address,
        latitude: firstResult.geometry.location.lat,
        longitude: firstResult.geometry.location.lng,
      },
    });
  } catch (error) {
    return NextResponse.json({
      result: null,
      error: error instanceof Error ? error.message : "Geocoding failed.",
    });
  }
}

function getGoogleLanguage(locale: ReturnType<typeof resolveAppLocale>) {
  if (locale === "zh") {
    return "zh-CN";
  }

  return locale;
}
