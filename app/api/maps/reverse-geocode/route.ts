import { NextResponse } from "next/server";
import { resolveAppLocale } from "@/lib/i18n";

const GOOGLE_GEOCODING_ENDPOINT = "https://maps.googleapis.com/maps/api/geocode/json";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const latitude = Number(searchParams.get("lat"));
  const longitude = Number(searchParams.get("lng"));
  const locale = resolveAppLocale(searchParams.get("locale"));

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return NextResponse.json({ formattedAddress: null, error: "Invalid coordinates." }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

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

    if (!response.ok || payload.status === "REQUEST_DENIED") {
      return NextResponse.json({
        formattedAddress: null,
        error: payload.error_message || "Google reverse geocoding failed.",
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
