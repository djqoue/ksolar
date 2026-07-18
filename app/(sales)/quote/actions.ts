"use server";

import { revalidatePath } from "next/cache";
import { calculateQuoteScenario } from "@/lib/calc";
import type { AppLocale } from "@/lib/i18n";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service";
import type {
  SaveQuoteErrorCode,
  SaveQuoteInput,
  SaveQuoteRpcParams,
  SaveQuoteState,
} from "@/types/quote-save";
import type { QuoteScenarioInput } from "@/types/quote";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_TITLE_LENGTH = 240;
const MAX_QUOTE_INPUT_BYTES = 1024 * 1024;
const MAX_QUOTE_RESULT_BYTES = 2 * 1024 * 1024;
const MAX_BOM_BYTES = 1024 * 1024;
const MAX_FINANCE_BYTES = 512 * 1024;
const MAX_TOTAL_JSON_BYTES = 3 * 1024 * 1024;

const SAVE_QUOTE_COPY = {
  en: {
    invalidInput: "The quote data is incomplete or invalid. Review the quote and try again.",
    notConfigured: "Supabase is not configured, so this quote cannot be saved.",
    unauthenticated: "Sign in with a sales account before saving this quote.",
    forbidden: "This sales account cannot save a quote for the selected customer.",
    conflict: "This quote changed while it was being saved. Refresh and try again.",
    saveFailed: "The quote could not be saved. Please try again.",
    saved: (quoteCode: string) => "Quote saved: " + quoteCode,
  },
  zh: {
    invalidInput: "报价数据不完整或格式不正确，请检查后重试。",
    notConfigured: "Supabase 尚未配置，暂时无法保存报价。",
    unauthenticated: "请先登录销售账号，再保存报价。",
    forbidden: "当前销售账号无权为所选客户保存报价。",
    conflict: "报价保存时发生版本冲突，请刷新后重试。",
    saveFailed: "报价保存失败，请稍后重试。",
    saved: (quoteCode: string) => "报价已保存：" + quoteCode,
  },
  th: {
    invalidInput: "ข้อมูลใบเสนอราคาไม่ครบหรือไม่ถูกต้อง กรุณาตรวจสอบแล้วลองอีกครั้ง",
    notConfigured: "ยังไม่ได้ตั้งค่า Supabase จึงไม่สามารถบันทึกใบเสนอราคาได้",
    unauthenticated: "กรุณาเข้าสู่ระบบด้วยบัญชีฝ่ายขายก่อนบันทึกใบเสนอราคา",
    forbidden: "บัญชีฝ่ายขายนี้ไม่มีสิทธิ์บันทึกใบเสนอราคาให้ลูกค้าที่เลือก",
    conflict: "ข้อมูลใบเสนอราคาเปลี่ยนระหว่างบันทึก กรุณารีเฟรชแล้วลองอีกครั้ง",
    saveFailed: "บันทึกใบเสนอราคาไม่สำเร็จ กรุณาลองอีกครั้ง",
    saved: (quoteCode: string) => "บันทึกใบเสนอราคาแล้ว: " + quoteCode,
  },
} satisfies Record<
  AppLocale,
  {
    invalidInput: string;
    notConfigured: string;
    unauthenticated: string;
    forbidden: string;
    conflict: string;
    saveFailed: string;
    saved: (quoteCode: string) => string;
  }
>;

class QuoteInputError extends Error {}

interface NormalizedJsonObject {
  value: Record<string, unknown>;
  bytes: number;
}

interface QuoteRpcRow {
  quote_project_id?: unknown;
  quote_version_id?: unknown;
  quote_code?: unknown;
}

interface DatabaseErrorLike {
  code?: string;
  message?: string;
}

export async function saveQuote(input: SaveQuoteInput): Promise<SaveQuoteState> {
  const locale = resolveLocale(input?.locale);
  const copy = SAVE_QUOTE_COPY[locale];
  let params: Omit<SaveQuoteRpcParams, "p_actor_user_id">;

  try {
    params = buildRpcParams(input);
  } catch (error) {
    if (!(error instanceof QuoteInputError)) {
      console.error("Quote input normalization failed", error);
    }

    return {
      status: "error",
      code: "invalid_input",
      message: copy.invalidInput,
    };
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return {
      status: "error",
      code: "not_configured",
      message: copy.notConfigured,
    };
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      status: "error",
      code: "unauthenticated",
      message: copy.unauthenticated,
    };
  }

  const serviceSupabase = createSupabaseServiceRoleClient();

  if (!serviceSupabase) {
    return {
      status: "error",
      code: "not_configured",
      message: copy.notConfigured,
    };
  }

  try {
    const serviceParams: SaveQuoteRpcParams = {
      ...params,
      p_actor_user_id: user.id,
    };
    const { data, error } = await serviceSupabase
      .rpc("save_quote_atomic", serviceParams)
      .single();

    if (error) {
      const code = mapDatabaseErrorCode(error);
      console.error("Atomic quote save failed", {
        code: error.code,
        message: error.message,
      });

      return {
        status: "error",
        code,
        message: messageForErrorCode(copy, code),
      };
    }

    const row = data as QuoteRpcRow | null;
    const quoteProjectId = typeof row?.quote_project_id === "string" ? row.quote_project_id : "";
    const quoteVersionId = typeof row?.quote_version_id === "string" ? row.quote_version_id : "";
    const quoteCode = typeof row?.quote_code === "string" ? row.quote_code : "";

    if (!UUID_PATTERN.test(quoteProjectId) || !UUID_PATTERN.test(quoteVersionId) || !quoteCode) {
      throw new Error("Quote RPC returned an invalid result.");
    }

    revalidatePath("/crm");

    return {
      status: "success",
      message: copy.saved(quoteCode),
      quoteProjectId,
      quoteVersionId,
      quoteCode,
    };
  } catch (error) {
    console.error("Atomic quote save failed", error);

    return {
      status: "error",
      code: "save_failed",
      message: copy.saveFailed,
    };
  }
}

function buildRpcParams(
  input: SaveQuoteInput,
): Omit<SaveQuoteRpcParams, "p_actor_user_id"> {
  if (!isRecord(input)) {
    throw new QuoteInputError("Quote input must be an object.");
  }

  const customerId = requireUuid(input.customerId, "customerId");
  const quoteProjectId = optionalUuid(input.quoteProjectId, "quoteProjectId");
  const quoteVersionId = optionalUuid(input.quoteVersionId, "quoteVersionId") ?? crypto.randomUUID();
  const siteId = optionalUuid(input.siteId, "siteId");
  const opportunityId = optionalUuid(input.opportunityId, "opportunityId");
  const title = typeof input.title === "string" ? input.title.trim() : "";

  if (title.length > MAX_TITLE_LENGTH) {
    throw new QuoteInputError("Quote title is too long.");
  }

  const quoteInput = normalizeJsonObject(input.input, "input", MAX_QUOTE_INPUT_BYTES);
  validateQuoteInput(quoteInput.value);

  let authoritativeResult;

  try {
    authoritativeResult = calculateQuoteScenario(
      quoteInput.value as unknown as QuoteScenarioInput,
    );
  } catch {
    throw new QuoteInputError("Quote calculation failed for the supplied input.");
  }

  const quoteResult = normalizeJsonObject(authoritativeResult, "result", MAX_QUOTE_RESULT_BYTES);
  validateQuoteResult(quoteResult.value);
  const bomSnapshot = normalizeJsonObject(
    authoritativeResult.bom ?? {},
    "bomSnapshot",
    MAX_BOM_BYTES,
  );
  const financeSnapshot = normalizeJsonObject(
    authoritativeResult.finance,
    "financeSnapshot",
    MAX_FINANCE_BYTES,
  );

  const totalBytes = quoteInput.bytes + quoteResult.bytes + bomSnapshot.bytes + financeSnapshot.bytes;

  if (totalBytes > MAX_TOTAL_JSON_BYTES) {
    throw new QuoteInputError("Quote snapshots are too large.");
  }

  return {
    p_quote_project_id: quoteProjectId,
    p_quote_version_id: quoteVersionId,
    p_customer_id: customerId,
    p_site_id: siteId,
    p_opportunity_id: opportunityId,
    p_title: title || null,
    p_quote_input: quoteInput.value,
    p_quote_result: quoteResult.value,
    p_bom_snapshot: bomSnapshot.value,
    p_finance_snapshot: financeSnapshot.value,
  };
}

function normalizeJsonObject(value: unknown, label: string, maxBytes: number): NormalizedJsonObject {
  let serialized: string;

  try {
    serialized = JSON.stringify(value);
  } catch {
    throw new QuoteInputError(label + " must be JSON serializable.");
  }

  if (!serialized) {
    throw new QuoteInputError(label + " is required.");
  }

  const bytes = new TextEncoder().encode(serialized).byteLength;

  if (bytes > maxBytes) {
    throw new QuoteInputError(label + " is too large.");
  }

  const normalized = JSON.parse(serialized) as unknown;

  if (!isRecord(normalized)) {
    throw new QuoteInputError(label + " must be a JSON object.");
  }

  return { value: normalized, bytes };
}

function validateQuoteInput(value: Record<string, unknown>) {
  if (
    !isRecord(value.map)
    || !isRecord(value.topology)
    || typeof value.pricingPresetId !== "string"
    || !Array.isArray(value.selectedFinanceIds)
  ) {
    throw new QuoteInputError("Quote input is missing its map, topology, pricing, or finance selection.");
  }

  if (value.capacityIntent !== undefined && value.capacityIntent !== null) {
    if (!isRecord(value.capacityIntent)) {
      throw new QuoteInputError("Quote capacity intent is invalid.");
    }

    if (value.capacityIntent.mode === "roof-potential") {
      throw new QuoteInputError(
        "Roof potential is a technical assessment and cannot be saved as a formal quote.",
      );
    }

    if (
      value.capacityIntent.mode !== "standard"
      || ![5, 10, 15, 20].includes(value.capacityIntent.targetKW as number)
    ) {
      throw new QuoteInputError("Standard quote capacity intent is invalid.");
    }
  }
}

function validateQuoteResult(value: Record<string, unknown>) {
  const isRoofPotential =
    isRecord(value.capacityIntent) && value.capacityIntent.mode === "roof-potential";

  if (
    value.isViable !== true
    || value.quoteReady !== true
    || value.quoteReadiness !== "ready"
    || isRoofPotential
    || !isRecord(value.recommendedTier)
    || typeof value.recommendedTier.id !== "string"
    || !Array.isArray(value.warnings)
    || !Array.isArray(value.explanation)
    || !isRecord(value.finance)
    || !isRecord(value.bom)
  ) {
    throw new QuoteInputError("Only a complete, quote-ready formal result can be saved.");
  }

  for (const field of [
    "quotedSystemSizeWp",
    "suggestedSellPriceTHB",
    "annualGenerationKWh",
    "hardwareCostTHB",
  ] as const) {
    const numberValue = value[field];

    if (typeof numberValue !== "number" || !Number.isFinite(numberValue) || numberValue < 0) {
      throw new QuoteInputError("Quote result field " + field + " is invalid.");
    }
  }

  for (const field of ["financeAdjustedPriceTHB", "downPaymentTHB"] as const) {
    const numberValue = value.finance[field];

    if (typeof numberValue !== "number" || !Number.isFinite(numberValue) || numberValue < 0) {
      throw new QuoteInputError("Quote finance field " + field + " is invalid.");
    }
  }

  const monthlyPayment = value.finance.monthlyPaymentTHB;

  if (
    monthlyPayment !== undefined
    && (typeof monthlyPayment !== "number" || !Number.isFinite(monthlyPayment) || monthlyPayment < 0)
  ) {
    throw new QuoteInputError("Quote monthly payment is invalid.");
  }
}

function requireUuid(value: unknown, label: string) {
  if (typeof value !== "string" || !UUID_PATTERN.test(value.trim())) {
    throw new QuoteInputError(label + " must be a UUID.");
  }

  return value.trim();
}

function optionalUuid(value: unknown, label: string) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  return requireUuid(value, label);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function resolveLocale(locale: unknown): AppLocale {
  return locale === "zh" || locale === "th" ? locale : "en";
}

function mapDatabaseErrorCode(error: DatabaseErrorLike): SaveQuoteErrorCode {
  if (error.code === "42501") {
    return "forbidden";
  }

  if (["22023", "22P02", "23514"].includes(error.code ?? "")) {
    return "invalid_input";
  }

  if (["23505", "40001", "40P01"].includes(error.code ?? "")) {
    return "conflict";
  }

  return "save_failed";
}

function messageForErrorCode(
  copy: (typeof SAVE_QUOTE_COPY)[AppLocale],
  code: SaveQuoteErrorCode,
) {
  switch (code) {
    case "invalid_input":
      return copy.invalidInput;
    case "forbidden":
      return copy.forbidden;
    case "conflict":
      return copy.conflict;
    case "not_configured":
      return copy.notConfigured;
    case "unauthenticated":
      return copy.unauthenticated;
    default:
      return copy.saveFailed;
  }
}
