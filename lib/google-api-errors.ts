export type GoogleApiErrorCode =
  | "quota_exceeded"
  | "billing_required"
  | "api_key_invalid"
  | "not_found"
  | "request_denied"
  | "unknown";

interface GoogleApiErrorInput {
  httpStatus?: number;
  providerStatus?: string | number | null;
  message?: string | null;
}

export interface GoogleApiErrorPayload {
  error: string;
  status?: string | number | null;
  code: GoogleApiErrorCode;
  quotaExceeded: boolean;
}

export function classifyGoogleApiError({
  httpStatus,
  providerStatus,
  message,
}: GoogleApiErrorInput): GoogleApiErrorCode {
  const statusText = String(providerStatus ?? "").toUpperCase();
  const messageText = String(message ?? "").toLowerCase();

  if (
    httpStatus === 429 ||
    statusText === "RESOURCE_EXHAUSTED" ||
    statusText === "OVER_QUERY_LIMIT" ||
    statusText === "DAILY_LIMIT_EXCEEDED" ||
    messageText.includes("quota") ||
    messageText.includes("daily limit") ||
    messageText.includes("rate limit")
  ) {
    return "quota_exceeded";
  }

  if (
    statusText === "BILLING_NOT_ENABLED" ||
    messageText.includes("billing") ||
    messageText.includes("billing account")
  ) {
    return "billing_required";
  }

  if (
    httpStatus === 401 ||
    statusText === "API_KEY_INVALID" ||
    (statusText === "INVALID_ARGUMENT" && messageText.includes("api key")) ||
    messageText.includes("api key not valid") ||
    messageText.includes("referer not allowed")
  ) {
    return "api_key_invalid";
  }

  if (httpStatus === 404 || statusText === "NOT_FOUND" || statusText === "ZERO_RESULTS") {
    return "not_found";
  }

  if (httpStatus === 403 || statusText === "REQUEST_DENIED" || statusText === "PERMISSION_DENIED") {
    return "request_denied";
  }

  return "unknown";
}

export function buildGoogleApiErrorPayload({
  fallbackMessage,
  httpStatus,
  providerStatus,
  message,
}: GoogleApiErrorInput & { fallbackMessage: string }): GoogleApiErrorPayload {
  const error = message || fallbackMessage;
  const code = classifyGoogleApiError({ httpStatus, providerStatus, message: error });

  return {
    error,
    status: providerStatus,
    code,
    quotaExceeded: code === "quota_exceeded",
  };
}
