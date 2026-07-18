import type { GoogleSolarDataLayerPaths, GoogleSolarSummary, SolarLatLng } from "@/types/solar";
import type { GoogleApiErrorCode } from "@/lib/google-api-errors";

const inFlightInsightRequests = new Map<string, Promise<GoogleSolarSummary>>();
const inFlightDataLayerRequests = new Map<
  string,
  Promise<GoogleSolarDataLayerPaths>
>();

interface SolarApiErrorResponse {
  error?: string;
  status?: string | number | null;
  code?: GoogleApiErrorCode;
  quotaExceeded?: boolean;
}

export class SolarApiError extends Error {
  constructor(
    message: string,
    readonly code: GoogleApiErrorCode = "unknown",
    readonly httpStatus?: number,
    readonly providerStatus?: string | number | null,
    readonly quotaExceeded = false,
  ) {
    super(message);
    this.name = "SolarApiError";
  }
}

function buildSolarRequestKey(requestPoint: SolarLatLng) {
  return `${requestPoint.latitude.toFixed(6)}:${requestPoint.longitude.toFixed(6)}`;
}

async function readJson<T>(response: Response) {
  try {
    return (await response.json()) as T & SolarApiErrorResponse;
  } catch {
    return {} as T & SolarApiErrorResponse;
  }
}

function throwSolarApiError(response: Response, payload: SolarApiErrorResponse): never {
  throw new SolarApiError(
    payload.error || "Google Solar request failed.",
    payload.code || "unknown",
    response.status,
    payload.status,
    Boolean(payload.quotaExceeded),
  );
}

export async function requestSolarInsights(requestPoint: SolarLatLng) {
  const requestKey = buildSolarRequestKey(requestPoint);
  const existing = inFlightInsightRequests.get(requestKey);
  if (existing) {
    return existing;
  }

  const promise = (async () => {
    const response = await fetch(
      `/api/solar/building-insights?latitude=${requestPoint.latitude}&longitude=${requestPoint.longitude}&requiredQuality=BASE&exactQualityRequired=false`,
      { cache: "no-store" },
    );

    const payload = await readJson<GoogleSolarSummary>(response);

    if (!response.ok) {
      throwSolarApiError(response, payload);
    }

    return payload;
  })();

  inFlightInsightRequests.set(requestKey, promise);

  try {
    return await promise;
  } finally {
    if (inFlightInsightRequests.get(requestKey) === promise) {
      inFlightInsightRequests.delete(requestKey);
    }
  }
}

export async function requestSolarDataLayers(requestPoint: SolarLatLng) {
  const requestKey = buildSolarRequestKey(requestPoint);
  const existing = inFlightDataLayerRequests.get(requestKey);
  if (existing) {
    return existing;
  }

  const promise = (async () => {
    const response = await fetch(
      `/api/solar/data-layers?latitude=${requestPoint.latitude}&longitude=${requestPoint.longitude}&radiusMeters=70&requiredQuality=BASE&exactQualityRequired=false`,
      { cache: "no-store" },
    );

    const payload = await readJson<GoogleSolarDataLayerPaths>(response);

    if (!response.ok) {
      throwSolarApiError(response, payload);
    }

    return payload;
  })();

  inFlightDataLayerRequests.set(requestKey, promise);

  try {
    return await promise;
  } finally {
    if (inFlightDataLayerRequests.get(requestKey) === promise) {
      inFlightDataLayerRequests.delete(requestKey);
    }
  }
}
