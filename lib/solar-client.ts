import type { GoogleSolarDataLayerPaths, GoogleSolarSummary, SolarLatLng } from "@/types/solar";

export async function requestSolarInsights(requestPoint: SolarLatLng) {
  const response = await fetch(
    `/api/solar/building-insights?latitude=${requestPoint.latitude}&longitude=${requestPoint.longitude}&requiredQuality=MEDIUM`,
  );

  const payload = (await response.json()) as GoogleSolarSummary & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error || "Google Solar request failed.");
  }

  return payload;
}

export async function requestSolarDataLayers(requestPoint: SolarLatLng) {
  const response = await fetch(
    `/api/solar/data-layers?latitude=${requestPoint.latitude}&longitude=${requestPoint.longitude}&radiusMeters=70&requiredQuality=MEDIUM`,
  );

  const payload = (await response.json()) as GoogleSolarDataLayerPaths & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error || "Google Solar data layers request failed.");
  }

  return payload;
}
