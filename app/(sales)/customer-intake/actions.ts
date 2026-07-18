"use server";

import { revalidatePath } from "next/cache";
import {
  buildCustomerIntakeRpcParams,
  getCustomerIntakeCopy,
  initialCustomerIntakeSaveState,
  parseCustomerIntakeFormData,
  validateCustomerIntake,
  type CustomerIntake,
  type CustomerIntakeSaveState,
} from "@/lib/customer-intake";
import { resolveAppLocale, type AppLocale } from "@/lib/i18n";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function saveCustomerIntake(
  _prevState: CustomerIntakeSaveState = initialCustomerIntakeSaveState,
  formData: FormData,
): Promise<CustomerIntakeSaveState> {
  const locale = resolveAppLocale(formData.get("locale")?.toString());
  const value = parseCustomerIntakeFormData(formData);
  const formCustomerId = formData.get("customerId")?.toString().trim();
  const customerId = formCustomerId || _prevState.customerId;

  return persistCustomerIntake(value, locale, customerId);
}

export async function saveCustomerIntakeValue(
  value: CustomerIntake,
  locale: AppLocale,
  customerId?: string,
): Promise<CustomerIntakeSaveState> {
  return persistCustomerIntake(value, locale, customerId);
}

async function persistCustomerIntake(
  value: CustomerIntake,
  locale: AppLocale,
  customerId?: string,
): Promise<CustomerIntakeSaveState> {
  const copy = getCustomerIntakeCopy(locale);
  const validation = validateCustomerIntake(value, locale);

  if (!validation.ready) {
    return {
      status: "error",
      message: validation.message ?? copy.validation.fallback,
      customerId,
    };
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return {
      status: "error",
      message: copy.validation.supabaseMissing,
      customerId,
    };
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      status: "error",
      message: copy.validation.loginRequired,
      customerId,
    };
  }

  try {
    const { data, error } = await supabase.rpc(
      "save_customer_intake_atomic",
      buildCustomerIntakeRpcParams(value, customerId),
    );

    if (error) {
      throw error;
    }

    if (typeof data !== "string" || !data) {
      throw new Error("Customer intake RPC did not return a customer ID.");
    }

    revalidatePath("/crm");

    return {
      status: "success",
      message: copy.validation.saveSuccess(data.slice(0, 8)),
      customerId: data,
    };
  } catch (error) {
    console.error("Customer intake save failed", error);
    return {
      status: "error",
      message: copy.validation.saveFailed,
      customerId,
    };
  }
}
