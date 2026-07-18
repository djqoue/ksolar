import { describe, expect, it } from "vitest";
import {
  buildCustomerIntakeRpcParams,
  getCustomerIntakeCompletion,
  initialCustomerIntake,
  initialCustomerIntakeSaveState,
  parseCustomerIntakeFormData,
  normalizeCustomerPhone,
  resetCustomerIntakeSaveStateForEdit,
  validateCustomerIntake,
} from "@/lib/customer-intake";

describe("customer intake", () => {
  it("requires name, address, and at least one contact method", () => {
    const completion = getCustomerIntakeCompletion(initialCustomerIntake);

    expect(completion.ready).toBe(false);
    expect(completion.missing).toEqual([
      "客户姓名",
      "住址",
      "至少一种联系方式",
      "同意保存联系方式和精确位置",
    ]);
  });

  it("allows phone, email, or LINE as the required contact method", () => {
    const completion = getCustomerIntakeCompletion({
      ...initialCustomerIntake,
      displayName: "Somchai",
      addressText: "Bangkok",
      lineId: "somchai.line",
      consentToContact: true,
    });

    expect(completion.ready).toBe(true);
  });

  it("requires explicit consent before contact details or precise location can be saved", () => {
    const completion = getCustomerIntakeCompletion({
      ...initialCustomerIntake,
      displayName: "Somchai",
      addressText: "Bangkok",
      lineId: "somchai.line",
    });

    expect(completion.ready).toBe(false);
    expect(completion.missing).toEqual(["同意保存联系方式和精确位置"]);
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
      consentToContact: true,
    });

    expect(validation.ready).toBe(false);
    expect(validation.message).toBe("邮箱格式不正确，请检查 @ 和域名。");
  });

  it("keeps appliance quantities with the customer intake payload", () => {
    const formData = new FormData();
    formData.set("displayName", "Somchai");
    formData.set("addressText", "Bangkok");
    formData.set("lineId", "somchai.line");
    formData.set("consentToContact", "on");
    formData.append("largeAppliances", "aircon");
    formData.set("applianceQuantity.aircon", "4");

    const parsed = parseCustomerIntakeFormData(formData);

    expect(parsed.largeAppliances).toEqual(["aircon"]);
    expect(parsed.applianceQuantities.aircon).toBe("4");
    expect(parsed.applianceQuantities.ev).toBe("1");
    expect(parsed.consentToContact).toBe(true);
  });

  it("builds one normalized atomic-save payload and carries an existing customer ID", () => {
    const params = buildCustomerIntakeRpcParams(
      {
        ...initialCustomerIntake,
        displayName: "  Somchai  ",
        addressText: "  Bangkok  ",
        phone: "0812345678",
        email: " CUSTOMER@EXAMPLE.COM ",
        consentToContact: true,
        largeAppliances: ["aircon"],
        applianceQuantities: { ...initialCustomerIntake.applianceQuantities, aircon: "3" },
      },
      "5f3531ee-a940-452f-9265-099c8437075b",
    );

    expect(params).toMatchObject({
      p_customer_id: "5f3531ee-a940-452f-9265-099c8437075b",
      p_display_name: "Somchai",
      p_address_text: "Bangkok",
      p_primary_phone: "+66812345678",
      p_primary_email: "customer@example.com",
      p_consent_to_contact: true,
    });
    expect(params.p_appliances).toEqual([
      expect.objectContaining({ appliance_type: "aircon", quantity: 3 }),
    ]);
  });

  it("clears the save result after an edit without forgetting the saved customer", () => {
    expect(
      resetCustomerIntakeSaveStateForEdit({
        status: "success",
        message: "saved",
        customerId: "5f3531ee-a940-452f-9265-099c8437075b",
      }),
    ).toEqual({
      ...initialCustomerIntakeSaveState,
      customerId: "5f3531ee-a940-452f-9265-099c8437075b",
    });
  });
});
