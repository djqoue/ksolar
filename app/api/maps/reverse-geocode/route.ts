import { NextResponse } from "next/server";
import { buildGoogleApiErrorPayload } from "@/lib/google-api-errors";
import { resolveAppLocale } from "@/lib/i18n";
import { requireAuthenticatedApiUser } from "@/lib/server/api-auth";

const GOOGLE_GEOCODING_ENDPOINT = "https://maps.googleapis.com/maps/api/geocode/json";

export async function GET(request: Request) {
  const authError = await requireAuthenticatedApiUser();

  if (authError) {
    return authError;
  }

  const { searchParams } = new URL(request.url);
  const latitudeParam = searchParams.get("lat");
  const longitudeParam = searchParams.get("lng");
  const locale = resolveAppLocale(searchParams.get("locale"));

  if (!latitudeParam?.trim() || !longitudeParam?.trim()) {
    return NextResponse.json({ formattedAddress: null, error: "Invalid coordinates." }, { status: 400 });
  }

  const latitude = Number(latitudeParam);
  const longitude = Number(longitudeParam);

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return NextResponse.json({ formattedAddress: null, error: "Invalid coordinates." }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ formattedAddress: null, error: "Google Maps key is not configured." });
  }

  const url = new URL(GOOGLE_GEOCODING_ENDPOINT);
  url.searchParams.set("latlng", `${latitude},${longitude}`);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("language", getGoogleLanguage(locale));
  url.searchParams.set("region", "th");

  try {
    const response = await fetch(url, { cache: "no-store" });
    const payload = (await response.json()) as {
      status?: string;
      results?: Array<{ formatted_address?: string }>;
      error_message?: string;
    };

    if (!response.ok || (payload.status && !["OK", "ZERO_RESULTS"].includes(payload.status))) {
      return NextResponse.json({
        formattedAddress: null,
        ...buildGoogleApiErrorPayload({
          fallbackMessage: "Google reverse geocoding failed.",
          httpStatus: response.status,
          providerStatus: payload.status || response.statusText,
          message: payload.error_message,
        }),
      });
    }

    return NextResponse.json({
      formattedAddress: payload.results?.find((item) => item.formatted_address)?.formatted_address ?? null,
    });
  } catch (error) {
    return NextResponse.json({
      formattedAddress: null,
      error: error instanceof Error ? error.message : "Reverse geocoding failed.",
    });
  }
}

function getGoogleLanguage(locale: ReturnType<typeof resolveAppLocale>) {
  if (locale === "zh") {
    return "zh-CN";
  }

  return locale;
}
