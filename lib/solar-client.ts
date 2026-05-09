import type { GoogleSolarDataLayerPaths, GoogleSolarSummary, SolarLatLng } from "@/types/solar";
import type { GoogleApiErrorCode } from "@/lib/google-api-errors";

const SOLAR_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

interface SolarApiErrorResponse {
  error?: string;
  status?: string | number | null;
  code?: GoogleApiErrorCode;
  quotaExceeded?: boolean;
}

interface CachedSolarPayload<T> {
  savedAt: number;
  value: T;
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

function buildSolarCacheKey(kind: "insights" | "data-layers", requestPoint: SolarLatLng) {
  return `ksolar:google-solar:${kind}:${requestPoint.latitude.toFixed(5)}:${requestPoint.longitude.toFixed(5)}`;
}

function readSolarCache<T>(key: string, allowExpired = false): T | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return null;
    }

    const cached = JSON.parse(raw) as CachedSolarPayload<T>;
    if (!allowExpired && Date.now() - cached.savedAt > SOLAR_CACHE_TTL_MS) {
      return null;
    }

    return cached.value;
  } catch {
    return null;
  }
}

function writeSolarCache<T>(key: string, value: T) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      key,
      JSON.stringify({
        savedAt: Date.now(),
        value,
      } satisfies CachedSolarPayload<T>),
    );
  } catch {
    // Cache is best-effort only; quota protection should never block quoting.
  }
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
  const cacheKey = buildSolarCacheKey("insights", requestPoint);
  const cached = readSolarCache<GoogleSolarSummary>(cacheKey);
  if (cached) {
    return cached;
  }

  const response = await fetch(
    `/api/solar/building-insights?latitude=${requestPoint.latitude}&longitude=${requestPoint.longitude}&requiredQuality=MEDIUM`,
  );

  const payload = await readJson<GoogleSolarSummary>(response);

  if (!response.ok) {
    const staleCached = readSolarCache<GoogleSolarSummary>(cacheKey, true);
    if (payload.quotaExceeded && staleCached) {
      return staleCached;
    }

    throwSolarApiError(response, payload);
  }

  writeSolarCache(cacheKey, payload);

  return payload;
}

export async function requestSolarDataLayers(requestPoint: SolarLatLng) {
  const cacheKey = buildSolarCacheKey("data-layers", requestPoint);
  const cached = readSolarCache<GoogleSolarDataLayerPaths>(cacheKey);
  if (cached) {
    return cached;
  }

  const response = await fetch(
    `/api/solar/data-layers?latitude=${requestPoint.latitude}&longitude=${requestPoint.longitude}&radiusMeters=70&requiredQuality=MEDIUM`,
  );

  const payload = await readJson<GoogleSolarDataLayerPaths>(response);

  if (!response.ok) {
    const staleCached = readSolarCache<GoogleSolarDataLayerPaths>(cacheKey, true);
    if (payload.quotaExceeded && staleCached) {
      return staleCached;
    }

    throwSolarApiError(response, payload);
  }

  writeSolarCache(cacheKey, payload);

  return payload;
}
