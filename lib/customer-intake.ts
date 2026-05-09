import { composeInternationalPhone, normalizeEmail, validateEmail, validatePhone } from "@/lib/auth/validation";

export type EducationBackground =
  | "unknown"
  | "primary"
  | "secondary"
  | "vocational"
  | "bachelor"
  | "master_plus"
  | "other";

export type LargeApplianceType = "aircon" | "refrigerator" | "bathtub" | "plant_grow" | "ev";

export interface CustomerIntake {
  displayName: string;
  age: string;
  phone: string;
  email: string;
  lineId: string;
  addressText: string;
  monthlyElectricityBillTHB: string;
  annualElectricitySpendTHB: string;
  annualIncomeTHB: string;
  educationBackground: EducationBackground;
  largeAppliances: LargeApplianceType[];
  notes: string;
}

export interface CustomerIntakeCompletion {
  ready: boolean;
  missing: string[];
}

export interface CustomerIntakeSaveState {
  status: "idle" | "error" | "success";
  message: string;
  customerId?: string;
}

export const initialCustomerIntake: CustomerIntake = {
  displayName: "",
  age: "",
  phone: "",
  email: "",
  lineId: "",
  addressText: "",
  monthlyElectricityBillTHB: "",
  annualElectricitySpendTHB: "",
  annualIncomeTHB: "",
  educationBackground: "unknown",
  largeAppliances: [],
  notes: "",
};

export const initialCustomerIntakeSaveState: CustomerIntakeSaveState = {
  status: "idle",
  message: "",
};

export const EDUCATION_OPTIONS: Array<{ id: EducationBackground; label: string }> = [
  { id: "unknown", label: "暂不填写" },
  { id: "primary", label: "小学或以下" },
  { id: "secondary", label: "中学" },
  { id: "vocational", label: "职业/专科" },
  { id: "bachelor", label: "本科" },
  { id: "master_plus", label: "硕士及以上" },
  { id: "other", label: "其他" },
];

export const LARGE_APPLIANCE_OPTIONS: Array<{
  id: LargeApplianceType;
  label: string;
  crmLabel: string;
  type: string;
  inverterLoad: boolean;
}> = [
  { id: "aircon", label: "空调", crmLabel: "Air conditioner", type: "aircon", inverterLoad: true },
  { id: "refrigerator", label: "冰箱", crmLabel: "Refrigerator", type: "refrigerator", inverterLoad: false },
  { id: "bathtub", label: "浴缸/热水", crmLabel: "Bathtub / hot water", type: "hot_water", inverterLoad: true },
  { id: "plant_grow", label: "植物/园艺照明", crmLabel: "Plant / grow lighting", type: "grow_light", inverterLoad: true },
  { id: "ev", label: "新能源汽车", crmLabel: "Electric vehicle", type: "ev", inverterLoad: true },
];

export function getCustomerIntakeCompletion(value: CustomerIntake): CustomerIntakeCompletion {
  const missing: string[] = [];

  if (!value.displayName.trim()) {
    missing.push("客户姓名");
  }

  if (!value.addressText.trim()) {
    missing.push("住址");
  }

  if (!hasAnyContact(value)) {
    missing.push("至少一种联系方式");
  }

  return {
    ready: missing.length === 0,
    missing,
  };
}

export function validateCustomerIntake(value: CustomerIntake): CustomerIntakeCompletion & { message?: string } {
  const completion = getCustomerIntakeCompletion(value);

  if (!completion.ready) {
    return {
      ...completion,
      message: `请先填写：${completion.missing.join("、")}。`,
    };
  }

  const age = parseOptionalNumber(value.age);
  if (age !== null && (age < 1 || age > 120)) {
    return { ready: false, missing: ["年龄"], message: "年龄需要在 1-120 之间。" };
  }

  const phone = normalizeCustomerPhone(value.phone);
  if (phone) {
    const phoneValidation = validatePhone(phone);
    if (!phoneValidation.valid) {
      return { ready: false, missing: ["电话"], message: phoneValidation.message };
    }
  }

  const email = normalizeEmail(value.email);
  if (email) {
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return { ready: false, missing: ["邮箱"], message: emailValidation.message };
    }
  }

  return completion;
}

export function normalizeCustomerPhone(value: string) {
  return value.trim() ? composeInternationalPhone("+66", value) : "";
}

export function parseCustomerIntakeFormData(formData: FormData): CustomerIntake {
  return {
    displayName: formValue(formData, "displayName"),
    age: formValue(formData, "age"),
    phone: formValue(formData, "phone"),
    email: formValue(formData, "email"),
    lineId: formValue(formData, "lineId"),
    addressText: formValue(formData, "addressText"),
    monthlyElectricityBillTHB: formValue(formData, "monthlyElectricityBillTHB"),
    annualElectricitySpendTHB: formValue(formData, "annualElectricitySpendTHB"),
    annualIncomeTHB: formValue(formData, "annualIncomeTHB"),
    educationBackground: parseEducationBackground(formValue(formData, "educationBackground")),
    largeAppliances: formData.getAll("largeAppliances").filter(isLargeApplianceType),
    notes: formValue(formData, "notes"),
  };
}

export function parseOptionalNumber(value: string) {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function buildCustomerFactorPayload(value: CustomerIntake) {
  return {
    age: parseOptionalNumber(value.age),
    educationBackground: value.educationBackground,
    annualIncomeTHB: parseOptionalNumber(value.annualIncomeTHB),
    monthlyElectricityBillTHB: parseOptionalNumber(value.monthlyElectricityBillTHB),
    annualElectricitySpendTHB: parseOptionalNumber(value.annualElectricitySpendTHB),
    largeAppliances: value.largeAppliances,
  };
}

function hasAnyContact(value: CustomerIntake) {
  return Boolean(value.phone.trim() || value.email.trim() || value.lineId.trim());
}

function formValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function parseEducationBackground(value: string): EducationBackground {
  return EDUCATION_OPTIONS.some((option) => option.id === value) ? (value as EducationBackground) : "unknown";
}

function isLargeApplianceType(value: FormDataEntryValue): value is LargeApplianceType {
  return typeof value === "string" && LARGE_APPLIANCE_OPTIONS.some((option) => option.id === value);
}
