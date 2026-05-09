import { describe, expect, it } from "vitest";
import {
  getCustomerIntakeCompletion,
  initialCustomerIntake,
  normalizeCustomerPhone,
  validateCustomerIntake,
} from "@/lib/customer-intake";

describe("customer intake", () => {
  it("requires name, address, and at least one contact method", () => {
    const completion = getCustomerIntakeCompletion(initialCustomerIntake);

    expect(completion.ready).toBe(false);
    expect(completion.missing).toEqual(["客户姓名", "住址", "至少一种联系方式"]);
  });

  it("allows phone, email, or LINE as the required contact method", () => {
    const completion = getCustomerIntakeCompletion({
      ...initialCustomerIntake,
      displayName: "Somchai",
      addressText: "Bangkok",
      lineId: "somchai.line",
    });

    expect(completion.ready).toBe(true);
  });

  it("normalizes Thai phone numbers for CRM storage", () => {
    expect(normalizeCustomerPhone("0610208968")).toBe("+66610208968");
    expect(normalizeCustomerPhone("+660610208968")).toBe("+66610208968");
  });

  it("rejects invalid optional email before saving", () => {
    const validation = validateCustomerIntake({
      ...initialCustomerIntake,
      displayName: "Somchai",
      addressText: "Bangkok",
      email: "not-an-email",
    });

    expect(validation.ready).toBe(false);
    expect(validation.message).toBe("邮箱格式不正确，请检查 @ 和域名。");
  });
});
