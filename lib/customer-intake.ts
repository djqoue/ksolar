import { composeInternationalPhone, normalizeEmail, validateEmail, validatePhone } from "@/lib/auth/validation";
import type { AppLocale } from "@/lib/i18n";

export type EducationBackground =
  | "unknown"
  | "primary"
  | "secondary"
  | "vocational"
  | "bachelor"
  | "master_plus"
  | "other";

export type LargeApplianceType = "aircon" | "refrigerator" | "bathtub" | "plant_grow" | "ev";

export type ApplianceQuantityMap = Record<LargeApplianceType, string>;

export interface CustomerIntake {
  displayName: string;
  age: string;
  phone: string;
  email: string;
  lineId: string;
  addressText: string;
  latitude: string;
  longitude: string;
  monthlyElectricityBillTHB: string;
  annualElectricitySpendTHB: string;
  annualIncomeTHB: string;
  educationBackground: EducationBackground;
  largeAppliances: LargeApplianceType[];
  applianceQuantities: ApplianceQuantityMap;
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
  latitude: "",
  longitude: "",
  monthlyElectricityBillTHB: "",
  annualElectricitySpendTHB: "",
  annualIncomeTHB: "",
  educationBackground: "unknown",
  largeAppliances: [],
  applianceQuantities: {
    aircon: "1",
    refrigerator: "1",
    bathtub: "1",
    plant_grow: "1",
    ev: "1",
  },
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
  ratedPowerW: number;
  estimatedHoursPerDay: number;
}> = [
  { id: "aircon", label: "空调", crmLabel: "Air conditioner", type: "aircon", inverterLoad: true, ratedPowerW: 1200, estimatedHoursPerDay: 8 },
  { id: "refrigerator", label: "冰箱", crmLabel: "Refrigerator", type: "refrigerator", inverterLoad: false, ratedPowerW: 150, estimatedHoursPerDay: 10 },
  { id: "bathtub", label: "浴缸/热水", crmLabel: "Bathtub / hot water", type: "hot_water", inverterLoad: true, ratedPowerW: 2500, estimatedHoursPerDay: 1.2 },
  { id: "plant_grow", label: "植物/园艺照明", crmLabel: "Plant / grow lighting", type: "grow_light", inverterLoad: true, ratedPowerW: 600, estimatedHoursPerDay: 8 },
  { id: "ev", label: "新能源汽车", crmLabel: "Electric vehicle", type: "ev", inverterLoad: true, ratedPowerW: 3300, estimatedHoursPerDay: 3 },
];

export const CUSTOMER_INTAKE_COPY = {
  en: {
    title: "Customer snapshot",
    description: "Capture only what sales needs now. Scoring details can be completed later in CRM.",
    ready: "Ready to quote",
    missingPrefix: "Add",
    requiredFields: {
      displayName: "customer name",
      addressText: "home address",
      contact: "one contact method",
      age: "age",
      phone: "phone",
      email: "email",
    },
    fields: {
      displayName: "Customer name *",
      addressText: "Address *",
      phone: "Phone",
      email: "Email",
      lineId: "LINE",
      age: "Age",
      monthlyElectricityBillTHB: "Monthly bill (THB)",
      annualElectricitySpendTHB: "Annual electricity spend (THB)",
      annualIncomeTHB: "Annual income (THB)",
      educationBackground: "Education background",
      largeAppliances: "Major appliances",
      applianceQuantity: "Qty",
      notes: "Notes",
    },
    placeholders: {
      displayName: "e.g. Somchai / Youwen",
      addressText: "Customer home address or project site",
      phone: "+66812345678 / 0812345678",
      email: "customer@email.com",
      lineId: "Line ID",
      optional: "Optional",
      monthlyBill: "e.g. 4500",
      notes: "Example: price-sensitive, planning to buy an EV, someone stays home during daytime.",
    },
    optionalTitle: "Optional: load profile and scoring signals",
    optionalDescription: "Used later for customer scoring, ROI calibration, machine learning, and AI follow-up. It does not block the quick quote.",
    annualSpendHint: "Enter monthly bill to estimate automatically",
    requiredRule: "Required: customer name + address + one of phone/email/LINE. Saving creates a CRM customer ID.",
    autoSaveRule: "Continue will save this customer automatically and open the roof map.",
    save: "Save to CRM",
    saving: "Saving...",
    useLocation: "Use current location",
    locating: "Finding location...",
    locationCaptured: "Location captured and added to the address field.",
    locationNoBrowser: "This browser cannot read location. Please type the address.",
    locationBlocked: "Location access is blocked. Allow location in the browser or type the address.",
    locationTimeout: "Location lookup timed out. Try again outdoors or type the address.",
    locationFailed: "Could not get location. You can still enter the address manually.",
    validation: {
      missing: (fields: string[]) => `Add: ${fields.join(", ")}.`,
      age: "Age should be between 1 and 120.",
      phone: "Use an international phone format, for example +66812345678.",
      email: "Enter a valid email address.",
      fallback: "Customer details are not ready yet.",
      supabaseMissing: "Supabase is not configured yet, so the customer cannot be saved.",
      loginRequired: "Sign in with a sales account before saving customer details.",
      saveSuccess: (id: string) => `Customer saved to CRM. Customer ID: ${id}`,
      saveFailed: "Could not save this customer yet. Please try again.",
    },
    educationOptions: {
      unknown: "Skip for now",
      primary: "Primary school or below",
      secondary: "Secondary school",
      vocational: "Vocational / diploma",
      bachelor: "Bachelor's degree",
      master_plus: "Master's degree or above",
      other: "Other",
    },
    applianceOptions: {
      aircon: "Air conditioner",
      refrigerator: "Refrigerator",
      bathtub: "Bath / hot water",
      plant_grow: "Plants / grow lights",
      ev: "EV",
    },
  },
  zh: {
    title: "客户快照",
    description: "先填销售现场最需要的信息。其他评分因子可以跳过，后续在 CRM 补全。",
    ready: "可以继续报价",
    missingPrefix: "请补齐",
    requiredFields: {
      displayName: "客户姓名",
      addressText: "住址",
      contact: "至少一种联系方式",
      age: "年龄",
      phone: "电话",
      email: "邮箱",
    },
    fields: {
      displayName: "客户姓名 *",
      addressText: "住址 *",
      phone: "电话",
      email: "邮箱",
      lineId: "LINE",
      age: "年龄",
      monthlyElectricityBillTHB: "月电费 THB",
      annualElectricitySpendTHB: "年电费支出 THB",
      annualIncomeTHB: "年收入 THB",
      educationBackground: "受教育背景",
      largeAppliances: "大型用电器",
      applianceQuantity: "数量",
      notes: "备注",
    },
    placeholders: {
      displayName: "例如 Somchai / Youwen",
      addressText: "客户住宅地址或项目地点",
      phone: "+66812345678 / 0812345678",
      email: "customer@email.com",
      lineId: "Line ID",
      optional: "可跳过",
      monthlyBill: "例如 4500",
      notes: "例如客户对电费敏感、准备买 EV、白天家里有人等",
    },
    optionalTitle: "选填：用电画像和客户评分因子",
    optionalDescription: "用于后续客户评级、ROI 校准、机器学习和 AI 跟进，不影响当前快速报价。",
    annualSpendHint: "填月电费后自动估算",
    requiredRule: "必填规则：客户姓名 + 住址 + 电话/邮箱/LINE 任意一种。保存后 CRM 会生成客户 ID。",
    autoSaveRule: "点击继续会自动保存客户资料，然后进入屋顶地图。",
    save: "保存到 CRM",
    saving: "保存中...",
    useLocation: "使用当前位置",
    locating: "定位中...",
    locationCaptured: "已读取当前位置，并写入地址栏。",
    locationNoBrowser: "当前浏览器不支持定位，请手动输入地址。",
    locationBlocked: "定位权限被浏览器拦截了。可以允许定位，或直接输入地址。",
    locationTimeout: "定位超时了。建议走到室外再试，或先手动输入地址。",
    locationFailed: "暂时无法获取定位，仍可手动填写地址。",
    validation: {
      missing: (fields: string[]) => `请先填写：${fields.join("、")}。`,
      age: "年龄需要在 1-120 之间。",
      phone: "手机号格式不正确。可输入泰国本地号码 0812345678，系统会自动转成 +66812345678。",
      email: "邮箱格式不正确，请检查 @ 和域名。",
      fallback: "客户资料还不完整。",
      supabaseMissing: "Supabase 尚未配置，暂时无法保存客户资料。",
      loginRequired: "请先登录销售账号，再保存客户资料。",
      saveSuccess: (id: string) => `客户资料已保存到 CRM。客户 ID: ${id}`,
      saveFailed: "保存客户资料失败，请稍后重试。",
    },
    educationOptions: {
      unknown: "暂不填写",
      primary: "小学或以下",
      secondary: "中学",
      vocational: "职业/专科",
      bachelor: "本科",
      master_plus: "硕士及以上",
      other: "其他",
    },
    applianceOptions: {
      aircon: "空调",
      refrigerator: "冰箱",
      bathtub: "浴缸/热水",
      plant_grow: "植物/园艺照明",
      ev: "新能源汽车",
    },
  },
  th: {
    title: "ข้อมูลลูกค้าเบื้องต้น",
    description: "เก็บเฉพาะข้อมูลสำคัญสำหรับเสนอราคาหน้างาน ส่วนข้อมูลวิเคราะห์เพิ่มเติมค่อยเติมใน CRM ได้",
    ready: "พร้อมไปขั้นตอนต่อไป",
    missingPrefix: "กรุณาเพิ่ม",
    requiredFields: {
      displayName: "ชื่อลูกค้า",
      addressText: "ที่อยู่",
      contact: "ช่องทางติดต่ออย่างน้อยหนึ่งช่องทาง",
      age: "อายุ",
      phone: "เบอร์โทร",
      email: "อีเมล",
    },
    fields: {
      displayName: "ชื่อลูกค้า *",
      addressText: "ที่อยู่ *",
      phone: "เบอร์โทร",
      email: "อีเมล",
      lineId: "LINE",
      age: "อายุ",
      monthlyElectricityBillTHB: "ค่าไฟต่อเดือน (THB)",
      annualElectricitySpendTHB: "ค่าไฟต่อปี (THB)",
      annualIncomeTHB: "รายได้ต่อปี (THB)",
      educationBackground: "ระดับการศึกษา",
      largeAppliances: "เครื่องใช้ไฟฟ้าหลัก",
      applianceQuantity: "จำนวน",
      notes: "หมายเหตุ",
    },
    placeholders: {
      displayName: "เช่น Somchai / Youwen",
      addressText: "ที่อยู่บ้านลูกค้าหรือสถานที่ติดตั้ง",
      phone: "+66812345678 / 0812345678",
      email: "customer@email.com",
      lineId: "Line ID",
      optional: "ข้ามได้",
      monthlyBill: "เช่น 4500",
      notes: "เช่น ลูกค้ากังวลค่าไฟ กำลังจะซื้อ EV หรือมีคนอยู่บ้านตอนกลางวัน",
    },
    optionalTitle: "ไม่บังคับ: พฤติกรรมใช้ไฟและปัจจัยประเมินลูกค้า",
    optionalDescription: "ใช้ภายหลังสำหรับให้คะแนนลูกค้า ปรับ ROI ทำ machine learning และให้ AI ช่วยติดตาม ไม่บล็อกการเสนอราคาเร็ว",
    annualSpendHint: "กรอกค่าไฟรายเดือน ระบบจะประเมินรายปีให้",
    requiredRule: "ข้อมูลที่ต้องมี: ชื่อลูกค้า + ที่อยู่ + เบอร์โทร/อีเมล/LINE อย่างน้อยหนึ่งช่องทาง เมื่อบันทึกแล้ว CRM จะสร้างรหัสลูกค้า",
    autoSaveRule: "เมื่อกดไปต่อ ระบบจะบันทึกลูกค้าอัตโนมัติแล้วเปิดแผนที่หลังคา",
    save: "บันทึกเข้า CRM",
    saving: "กำลังบันทึก...",
    useLocation: "ใช้ตำแหน่งปัจจุบัน",
    locating: "กำลังค้นหาตำแหน่ง...",
    locationCaptured: "ดึงตำแหน่งปัจจุบันและใส่ในช่องที่อยู่แล้ว",
    locationNoBrowser: "เบราว์เซอร์นี้ไม่รองรับการระบุตำแหน่ง กรุณากรอกที่อยู่เอง",
    locationBlocked: "ระบบถูกบล็อกการเข้าถึงตำแหน่ง กรุณาอนุญาตในเบราว์เซอร์หรือกรอกที่อยู่เอง",
    locationTimeout: "ค้นหาตำแหน่งไม่ทันเวลา ลองใหม่ในพื้นที่เปิดหรือกรอกที่อยู่เอง",
    locationFailed: "ยังอ่านตำแหน่งไม่ได้ สามารถกรอกที่อยู่เองก่อนได้",
    validation: {
      missing: (fields: string[]) => `กรุณาเพิ่ม: ${fields.join(", ")}`,
      age: "อายุควรอยู่ระหว่าง 1-120 ปี",
      phone: "รูปแบบเบอร์โทรไม่ถูกต้อง เช่น เบอร์ไทย 0812345678 ระบบจะแปลงเป็น +66812345678",
      email: "รูปแบบอีเมลไม่ถูกต้อง กรุณาตรวจสอบ @ และโดเมน",
      fallback: "ข้อมูลลูกค้ายังไม่พร้อม",
      supabaseMissing: "ยังไม่ได้ตั้งค่า Supabase จึงยังบันทึกข้อมูลลูกค้าไม่ได้",
      loginRequired: "กรุณาเข้าสู่ระบบฝ่ายขายก่อนบันทึกข้อมูลลูกค้า",
      saveSuccess: (id: string) => `บันทึกลูกค้าเข้า CRM แล้ว รหัสลูกค้า: ${id}`,
      saveFailed: "ยังบันทึกข้อมูลลูกค้าไม่ได้ กรุณาลองใหม่อีกครั้ง",
    },
    educationOptions: {
      unknown: "ข้ามตอนนี้",
      primary: "ประถมหรือต่ำกว่า",
      secondary: "มัธยม",
      vocational: "อาชีวะ / อนุปริญญา",
      bachelor: "ปริญญาตรี",
      master_plus: "ปริญญาโทขึ้นไป",
      other: "อื่น ๆ",
    },
    applianceOptions: {
      aircon: "แอร์",
      refrigerator: "ตู้เย็น",
      bathtub: "อ่างอาบน้ำ / น้ำร้อน",
      plant_grow: "ต้นไม้ / ไฟปลูกพืช",
      ev: "รถ EV",
    },
  },
} as const;

export function getCustomerIntakeCopy(locale: AppLocale) {
  return CUSTOMER_INTAKE_COPY[locale];
}

export function getCustomerIntakeCompletion(value: CustomerIntake, locale: AppLocale = "zh"): CustomerIntakeCompletion {
  const copy = getCustomerIntakeCopy(locale);
  const missing: string[] = [];

  if (!value.displayName.trim()) {
    missing.push(copy.requiredFields.displayName);
  }

  if (!value.addressText.trim()) {
    missing.push(copy.requiredFields.addressText);
  }

  if (!hasAnyContact(value)) {
    missing.push(copy.requiredFields.contact);
  }

  return {
    ready: missing.length === 0,
    missing,
  };
}

export function validateCustomerIntake(
  value: CustomerIntake,
  locale: AppLocale = "zh",
): CustomerIntakeCompletion & { message?: string } {
  const copy = getCustomerIntakeCopy(locale);
  const completion = getCustomerIntakeCompletion(value, locale);

  if (!completion.ready) {
    return {
      ...completion,
      message: copy.validation.missing(completion.missing),
    };
  }

  const age = parseOptionalNumber(value.age);
  if (age !== null && (age < 1 || age > 120)) {
    return { ready: false, missing: [copy.requiredFields.age], message: copy.validation.age };
  }

  const phone = normalizeCustomerPhone(value.phone);
  if (phone) {
    const phoneValidation = validatePhone(phone);
    if (!phoneValidation.valid) {
      return { ready: false, missing: [copy.requiredFields.phone], message: copy.validation.phone };
    }
  }

  const email = normalizeEmail(value.email);
  if (email) {
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return { ready: false, missing: [copy.requiredFields.email], message: copy.validation.email };
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
    latitude: formValue(formData, "latitude"),
    longitude: formValue(formData, "longitude"),
    monthlyElectricityBillTHB: formValue(formData, "monthlyElectricityBillTHB"),
    annualElectricitySpendTHB: formValue(formData, "annualElectricitySpendTHB"),
    annualIncomeTHB: formValue(formData, "annualIncomeTHB"),
    educationBackground: parseEducationBackground(formValue(formData, "educationBackground")),
    largeAppliances: formData.getAll("largeAppliances").filter(isLargeApplianceType),
    applianceQuantities: parseApplianceQuantities(formData),
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
  const selectedAppliances = getSelectedApplianceDetails(value);

  return {
    age: parseOptionalNumber(value.age),
    educationBackground: value.educationBackground,
    annualIncomeTHB: parseOptionalNumber(value.annualIncomeTHB),
    monthlyElectricityBillTHB: parseOptionalNumber(value.monthlyElectricityBillTHB),
    annualElectricitySpendTHB: parseOptionalNumber(value.annualElectricitySpendTHB),
    largeAppliances: value.largeAppliances,
    applianceDetails: selectedAppliances.map(({ option, quantity }) => ({
      id: option.id,
      type: option.type,
      label: option.crmLabel,
      quantity,
      ratedPowerW: option.ratedPowerW,
      estimatedHoursPerDay: option.estimatedHoursPerDay,
      estimatedMonthlyKWh: estimateApplianceMonthlyKWh(option, quantity),
    })),
    estimatedApplianceMonthlyKWh: selectedAppliances.reduce(
      (sum, item) => sum + estimateApplianceMonthlyKWh(item.option, item.quantity),
      0,
    ),
  };
}

export function getSelectedApplianceDetails(value: CustomerIntake) {
  return LARGE_APPLIANCE_OPTIONS.filter((option) => value.largeAppliances.includes(option.id)).map((option) => ({
    option,
    quantity: getApplianceQuantity(value, option.id),
  }));
}

export function getApplianceQuantity(value: CustomerIntake, appliance: LargeApplianceType) {
  return normalizeApplianceQuantity(value.applianceQuantities[appliance] || "1");
}

export function normalizeApplianceQuantity(value: string) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }

  return Math.min(50, Math.floor(parsed));
}

export function estimateApplianceMonthlyKWh(
  option: (typeof LARGE_APPLIANCE_OPTIONS)[number],
  quantity: number,
) {
  return (option.ratedPowerW / 1000) * option.estimatedHoursPerDay * 30 * quantity;
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

function parseApplianceQuantities(formData: FormData): ApplianceQuantityMap {
  return LARGE_APPLIANCE_OPTIONS.reduce((quantities, option) => {
    quantities[option.id] = String(normalizeApplianceQuantity(formValue(formData, `applianceQuantity.${option.id}`) || "1"));
    return quantities;
  }, {} as ApplianceQuantityMap);
}
