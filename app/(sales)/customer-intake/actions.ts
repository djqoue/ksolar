"use server";

import { revalidatePath } from "next/cache";
import {
  buildCustomerFactorPayload,
  getCustomerIntakeCopy,
  getSelectedApplianceDetails,
  initialCustomerIntakeSaveState,
  normalizeCustomerPhone,
  parseCustomerIntakeFormData,
  parseOptionalNumber,
  validateCustomerIntake,
  type CustomerIntake,
  type CustomerIntakeSaveState,
} from "@/lib/customer-intake";
import { resolveAppLocale, type AppLocale } from "@/lib/i18n";
import {
  createAutomationEvent,
  createCustomer,
  createCustomerSite,
  createHouseholdAppliances,
  createHouseholdPowerProfile,
} from "@/lib/repositories/crm-repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function saveCustomerIntake(
  _prevState: CustomerIntakeSaveState = initialCustomerIntakeSaveState,
  formData: FormData,
): Promise<CustomerIntakeSaveState> {
  const locale = resolveAppLocale(formData.get("locale")?.toString());
  const value = parseCustomerIntakeFormData(formData);

  return persistCustomerIntake(value, locale);
}

export async function saveCustomerIntakeValue(
  value: CustomerIntake,
  locale: AppLocale,
): Promise<CustomerIntakeSaveState> {
  return persistCustomerIntake(value, locale);
}

async function persistCustomerIntake(value: CustomerIntake, locale: AppLocale): Promise<CustomerIntakeSaveState> {
  const copy = getCustomerIntakeCopy(locale);
  const validation = validateCustomerIntake(value, locale);

  if (!validation.ready) {
    return {
      status: "error",
      message: validation.message ?? copy.validation.fallback,
    };
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return {
      status: "error",
      message: copy.validation.supabaseMissing,
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
    };
  }

  const { data: profile } = await supabase
    .from("sales_profiles")
    .select("org_id")
    .eq("id", user.id)
    .maybeSingle();

  const orgId = typeof profile?.org_id === "string" ? profile.org_id : null;
  const phone = normalizeCustomerPhone(value.phone);
  const email = value.email.trim().toLowerCase() || null;
  const factorPayload = buildCustomerFactorPayload(value);

  try {
    const customer = await createCustomer(supabase, {
      ownerUserId: user.id,
      orgId,
      displayName: value.displayName.trim(),
      primaryPhone: phone || null,
      primaryEmail: email,
      lineId: value.lineId.trim() || null,
      leadSource: "field_quote",
      age: parseOptionalNumber(value.age),
      annualIncomeTHB: parseOptionalNumber(value.annualIncomeTHB),
      educationBackground: value.educationBackground,
      customerFactors: factorPayload,
    });

    const site = await createCustomerSite(supabase, {
      customerId: customer.id,
      ownerUserId: user.id,
      orgId,
      addressText: value.addressText.trim(),
      utilityProvider: "unknown",
      meterPhase: "unknown",
      latitude: parseOptionalNumber(value.latitude),
      longitude: parseOptionalNumber(value.longitude),
    });

    const powerProfile = await createHouseholdPowerProfile(supabase, {
      customerId: customer.id,
      siteId: site.id,
      ownerUserId: user.id,
      orgId,
      monthlyBillTHB: parseOptionalNumber(value.monthlyElectricityBillTHB),
      annualElectricitySpendTHB: parseOptionalNumber(value.annualElectricitySpendTHB),
      notes: value.notes.trim() || null,
    });

    const selectedAppliances = getSelectedApplianceDetails(value);

    await createHouseholdAppliances(
      supabase,
      selectedAppliances.map(({ option, quantity }) => ({
        powerProfileId: powerProfile.id,
        customerId: customer.id,
        ownerUserId: user.id,
        orgId,
        applianceType: option.type,
        label: option.crmLabel,
        quantity,
        ratedPowerW: option.ratedPowerW,
        estimatedHoursPerDay: option.estimatedHoursPerDay,
        inverterLoad: option.inverterLoad,
      })),
    );

    await createAutomationEvent(supabase, {
      orgId,
      ownerUserId: user.id,
      aggregateType: "customer",
      aggregateId: customer.id,
      eventType: "customer_intake.created",
      payload: {
        customerId: customer.id,
        siteId: site.id,
        powerProfileId: powerProfile.id,
        source: "quote_workflow",
        factorPayload,
      },
    });

    revalidatePath("/crm");

    return {
      status: "success",
      message: copy.validation.saveSuccess(customer.id.slice(0, 8)),
      customerId: customer.id,
    };
  } catch (error) {
    console.error("Customer intake save failed", error);
    return {
      status: "error",
      message: copy.validation.saveFailed,
    };
  }
}
