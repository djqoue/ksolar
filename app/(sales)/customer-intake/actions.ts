"use server";

import { revalidatePath } from "next/cache";
import {
  buildCustomerFactorPayload,
  initialCustomerIntakeSaveState,
  normalizeCustomerPhone,
  parseCustomerIntakeFormData,
  parseOptionalNumber,
  validateCustomerIntake,
  type CustomerIntakeSaveState,
  LARGE_APPLIANCE_OPTIONS,
} from "@/lib/customer-intake";
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
  const value = parseCustomerIntakeFormData(formData);
  const validation = validateCustomerIntake(value);

  if (!validation.ready) {
    return {
      status: "error",
      message: validation.message ?? "客户资料还不完整。",
    };
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return {
      status: "error",
      message: "Supabase 尚未配置，暂时无法保存客户资料。",
    };
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      status: "error",
      message: "请先登录销售账号，再保存客户资料。",
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

    const selectedAppliances = LARGE_APPLIANCE_OPTIONS.filter((option) => value.largeAppliances.includes(option.id));

    await createHouseholdAppliances(
      supabase,
      selectedAppliances.map((option) => ({
        powerProfileId: powerProfile.id,
        customerId: customer.id,
        ownerUserId: user.id,
        orgId,
        applianceType: option.type,
        label: option.crmLabel,
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
      message: `客户资料已保存到 CRM。客户 ID: ${customer.id.slice(0, 8)}`,
      customerId: customer.id,
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "保存客户资料失败，请稍后重试。",
    };
  }
}
