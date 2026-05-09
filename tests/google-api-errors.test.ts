import { describe, expect, it } from "vitest";
import { buildGoogleApiErrorPayload, classifyGoogleApiError } from "@/lib/google-api-errors";

describe("google api error classification", () => {
  it("detects daily quota and resource exhausted errors", () => {
    expect(
      classifyGoogleApiError({
        httpStatus: 429,
        providerStatus: "RESOURCE_EXHAUSTED",
        message: "Quota exceeded for quota metric",
      }),
    ).toBe("quota_exceeded");
  });

  it("detects billing configuration errors separately from quota", () => {
    expect(
      classifyGoogleApiError({
        httpStatus: 403,
        providerStatus: "PERMISSION_DENIED",
        message: "This API project is not linked to a billing account.",
      }),
    ).toBe("billing_required");
  });

  it("returns a frontend-safe payload with quotaExceeded flag", () => {
    expect(
      buildGoogleApiErrorPayload({
        fallbackMessage: "Google Solar failed.",
        httpStatus: 429,
        providerStatus: "RESOURCE_EXHAUSTED",
        message: "Daily Limit Exceeded",
      }),
    ).toMatchObject({
      code: "quota_exceeded",
      quotaExceeded: true,
      error: "Daily Limit Exceeded",
    });
  });
});
