"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthActionState } from "@/lib/auth/action-state";
import {
  composeInternationalPhone,
  normalizeEmail,
  validateDisplayName,
  validateEmail,
  validatePassword,
  validatePhone,
} from "@/lib/auth/validation";
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

function mapAuthErrorMessage(message: string) {
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes("invalid login credentials")) {
    return "邮箱或密码不正确。测试阶段已关闭邮箱/短信验证，请确认账号和密码是否正确。";
  }

  if (normalizedMessage.includes("email not confirmed")) {
    return "后台仍要求邮箱确认。测试阶段应关闭邮箱验证，请联系管理员检查 Supabase Auth 设置。";
  }

  if (normalizedMessage.includes("already registered") || normalizedMessage.includes("user already exists")) {
    return "这个邮箱已经注册过，请直接登录或换一个邮箱。";
  }

  if (normalizedMessage.includes("password")) {
    return "密码不符合规则：至少 10 位，并包含字母、数字和特殊字符。";
  }

  return message;
}

function getPhoneFromForm(formData: FormData) {
  return composeInternationalPhone(
    formValue(formData, "phoneCountryCode") || "+66",
    formValue(formData, "phoneLocal"),
  );
}

async function getIdentifierAvailabilityError(supabase: SupabaseClient, email: string, phone: string) {
  const { data, error } = await supabase
    .rpc("check_sales_identifier_available", {
      requested_email: email,
      requested_phone: phone || null,
    })
    .single();

  if (error) {
    return `账号重复检查失败：${error.message}`;
  }

  const availability = data as { email_available?: boolean; phone_available?: boolean } | null;

  if (availability?.email_available === false) {
    return "这个邮箱已经注册过，请直接登录或换一个邮箱。";
  }

  if (phone && availability?.phone_available === false) {
    return "这个手机号已经注册过，请直接登录或换一个手机号。";
  }

  return null;
}

export async function signInWithEmailPassword(_prevState: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return fail("Supabase 尚未配置，暂时无法登录。");
  }

  const email = normalizeEmail(formValue(formData, "email"));
  const password = formValue(formData, "password");

  const emailValidation = validateEmail(email);

  if (!emailValidation.valid) {
    return fail(emailValidation.message || "邮箱格式不正确。");
  }

  if (!password) {
    return fail("请输入密码。");
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return fail(mapAuthErrorMessage(error.message));
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function signUpWithEmailPassword(_prevState: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return fail("Supabase 尚未配置，暂时无法注册。");
  }

  const email = normalizeEmail(formValue(formData, "email"));
  const phone = getPhoneFromForm(formData);
  const password = formValue(formData, "password");
  const displayName = formValue(formData, "displayName").replace(/\s+/g, " ");

  const validations = [
    validateDisplayName(displayName),
    validateEmail(email),
    validatePhone(phone),
    validatePassword(password),
  ];

  const invalidValidation = validations.find((validation) => !validation.valid);

  if (invalidValidation) {
    return fail(invalidValidation.message || "注册信息不符合规则。");
  }

  const availabilityError = await getIdentifierAvailabilityError(supabase, email, phone);

  if (availabilityError) {
    return fail(availabilityError);
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
    return fail(mapAuthErrorMessage(error.message));
  }

  revalidatePath("/", "layout");

  if (!data.session) {
    return succeed("账号已创建。测试阶段已关闭邮箱/短信验证；如果没有自动进入系统，请直接用邮箱和密码登录。");
  }

  redirect("/");
}

export async function sendPhoneOtp(_prevState: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return fail("Supabase 尚未配置，暂时无法发送 OTP。");
  }

  const phone = getPhoneFromForm(formData);

  const phoneValidation = validatePhone(phone);

  if (!phoneValidation.valid || !phone) {
    return fail(phoneValidation.message || "请输入手机号。");
  }

  const { error } = await supabase.auth.signInWithOtp({ phone });

  if (error) {
    return fail(mapAuthErrorMessage(error.message));
  }

  return succeed("OTP 已发送。如果收不到短信，请确认 Supabase SMS provider 已启用。");
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();

  if (supabase) {
    await supabase.auth.signOut();
  }

  revalidatePath("/", "layout");
  redirect("/login");
}
