import { NextRequest, NextResponse } from "next/server";
import { RUNTIME_FALLBACKS } from "@/lib/config/runtime-fallbacks";
import { buildGoogleApiErrorPayload } from "@/lib/google-api-errors";

export async function GET(request: NextRequest) {
  const apiKey = process.env.GOOGLE_SOLAR_API_KEY || RUNTIME_FALLBACKS.googleSolarApiKey;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GOOGLE_SOLAR_API_KEY is not configured." },
      { status: 500 },
    );
  }

  const id = request.nextUrl.searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "GeoTIFF id is required." },
      { status: 400 },
    );
  }

  const url = new URL("https://solar.googleapis.com/v1/geoTiff:get");
  url.searchParams.set("id", id);
  url.searchParams.set("key", apiKey);

  const response = await fetch(url.toString(), {
    headers: {
      Accept: "image/tiff,image/geotiff,*/*",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    let message: string | undefined;
    let providerStatus: string | number | null = response.statusText;

    try {
      const payload = (await response.clone().json()) as {
        error?: { message?: string; status?: string };
      };
      message = payload.error?.message;
      providerStatus = payload.error?.status || response.statusText;
    } catch {
      message = undefined;
    }

    return NextResponse.json(
      buildGoogleApiErrorPayload({
        fallbackMessage: "Failed to fetch GeoTIFF from Google Solar.",
        httpStatus: response.status,
        providerStatus,
        message,
      }),
      { status: response.status },
    );
  }

  const arrayBuffer = await response.arrayBuffer();

  return new NextResponse(arrayBuffer, {
    headers: {
      "Content-Type": response.headers.get("Content-Type") || "image/tiff",
      "Cache-Control": "no-store",
    },
  });
}
