"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { AuthActionState } from "@/lib/auth/action-state";
import { isPublicSignupEnabled } from "@/lib/auth/signup-policy";
import {
  composeInternationalPhone,
  normalizeEmail,
  validateDisplayName,
  validateEmail,
  validatePassword,
  validatePhone,
} from "@/lib/auth/validation";
import { getAuthCopy, resolveAppLocale } from "@/lib/i18n";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function formValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function fail(message: string): AuthActionState {
  return { status: "error", message };
}

function succeed(message: string): AuthActionState {
  return { status: "success", message };
}

type AuthCopy = ReturnType<typeof getAuthCopy>;

function mapAuthErrorMessage(message: string, copy: AuthCopy) {
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes("invalid login credentials")) {
    return copy.messages.invalidCredentials;
  }

  if (normalizedMessage.includes("email not confirmed")) {
    return copy.messages.emailNotConfirmed;
  }

  if (normalizedMessage.includes("already registered") || normalizedMessage.includes("user already exists")) {
    return copy.messages.emailRegistered;
  }

  if (normalizedMessage.includes("password")) {
    return copy.messages.passwordInvalid;
  }

  return message;
}

function getPhoneFromForm(formData: FormData) {
  return composeInternationalPhone(
    formValue(formData, "phoneCountryCode") || "+66",
    formValue(formData, "phoneLocal"),
  );
}

export async function signInWithEmailPassword(_prevState: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const locale = resolveAppLocale(formData.get("locale")?.toString());
  const copy = getAuthCopy(locale);
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return fail(copy.messages.supabaseLoginMissing);
  }

  const email = normalizeEmail(formValue(formData, "email"));
  const password = formValue(formData, "password");

  const emailValidation = validateEmail(email);

  if (!emailValidation.valid) {
    return fail(copy.messages.invalidEmail);
  }

  if (!password) {
    return fail(copy.messages.missingPassword);
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return fail(mapAuthErrorMessage(error.message, copy));
  }

  const { data: salesProfile, error: profileError } = await supabase
    .from("sales_profiles")
    .select("active")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profileError || !salesProfile?.active) {
    await supabase.auth.signOut();
    return fail(
      locale === "zh"
        ? "这个销售账号尚未启用，请联系管理员。"
        : locale === "th"
          ? "บัญชีฝ่ายขายนี้ยังไม่เปิดใช้งาน กรุณาติดต่อผู้ดูแลระบบ"
          : "This sales account is not active. Contact an administrator.",
    );
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function signUpWithEmailPassword(_prevState: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const locale = resolveAppLocale(formData.get("locale")?.toString());
  const copy = getAuthCopy(locale);

  if (!isPublicSignupEnabled()) {
    return fail(
      locale === "zh"
        ? "公开注册已关闭，请联系管理员创建销售账号。"
        : locale === "th"
          ? "ปิดการสมัครสาธารณะแล้ว กรุณาติดต่อผู้ดูแลระบบเพื่อสร้างบัญชีฝ่ายขาย"
          : "Public signup is disabled. Ask an administrator to create your sales account.",
    );
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return fail(copy.messages.supabaseSignupMissing);
  }

  const email = normalizeEmail(formValue(formData, "email"));
  const phone = getPhoneFromForm(formData);
  const password = formValue(formData, "password");
  const displayName = formValue(formData, "displayName").replace(/\s+/g, " ");

  const validations = [
    { valid: validateDisplayName(displayName).valid, message: copy.messages.invalidName },
    { valid: validateEmail(email).valid, message: copy.messages.invalidEmail },
    { valid: validatePhone(phone).valid, message: copy.messages.invalidPhone },
    { valid: validatePassword(password).valid, message: copy.messages.passwordInvalid },
  ];

  const invalidValidation = validations.find((validation) => !validation.valid);

  if (invalidValidation) {
    return fail(invalidValidation.message || copy.messages.invalidSignup);
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName || email,
        phone,
      },
    },
  });

  if (error) {
    // Keep signup responses identifier-agnostic; validation details are handled above.
    return fail(copy.messages.invalidSignup);
  }

  revalidatePath("/", "layout");

  if (!data.session) {
    return succeed(copy.messages.signupSuccess);
  }

  redirect("/");
}

export async function sendPhoneOtp(_prevState: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const copy = getAuthCopy(resolveAppLocale(formData.get("locale")?.toString()));
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return fail(copy.messages.supabaseOtpMissing);
  }

  const phone = getPhoneFromForm(formData);

  const phoneValidation = validatePhone(phone);

  if (!phoneValidation.valid || !phone) {
    return fail(copy.messages.missingPhone);
  }

  const { error } = await supabase.auth.signInWithOtp({
    phone,
    options: { shouldCreateUser: false },
  });

  if (error) {
    return fail(mapAuthErrorMessage(error.message, copy));
  }

  return succeed(copy.messages.otpSent);
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();

  if (supabase) {
    await supabase.auth.signOut();
  }

  revalidatePath("/", "layout");
  redirect("/login");
}
