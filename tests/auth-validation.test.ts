import { describe, expect, it } from "vitest";
import { composeInternationalPhone, validatePhone } from "@/lib/auth/validation";

describe("auth validation", () => {
  it("converts Thai local mobile numbers into international format", () => {
    expect(composeInternationalPhone("+66", "0812345678")).toBe("+66812345678");
  });

  it("does not duplicate the country code when users paste Thai numbers with 66", () => {
    expect(composeInternationalPhone("+66", "66812345678")).toBe("+66812345678");
  });

  it("keeps already-international numbers unchanged", () => {
    expect(composeInternationalPhone("+66", "+66812345678")).toBe("+66812345678");
  });

  it("rejects incomplete phone numbers before any auth request is sent", () => {
    expect(validatePhone(composeInternationalPhone("+66", "123")).valid).toBe(false);
  });
});
