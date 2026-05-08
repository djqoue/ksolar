"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  normalizeEmail,
  normalizePhone,
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

function redirectWithLoginError(message: string): never {
  const params = new URLSearchParams({ error: message });
  redirect(`/login?${params.toString()}`);
}

function redirectWithLoginNotice(message: string): never {
  const params = new URLSearchParams({ notice: message });
  redirect(`/login?${params.toString()}`);
}

function mapAuthErrorMessage(message: string) {
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes("invalid login credentials")) {
    return "邮箱或密码不正确。如果刚注册，请先确认邮箱后再登录。";
  }

  if (normalizedMessage.includes("email not confirmed")) {
    return "账号已创建，但邮箱还没有确认。请先打开 Supabase 发送的确认邮件。";
  }

  if (normalizedMessage.includes("already registered") || normalizedMessage.includes("user already exists")) {
    return "这个邮箱已经注册过，请直接登录或换一个邮箱。";
  }

  if (normalizedMessage.includes("password")) {
    return "密码不符合规则：至少 10 位，并包含字母、数字和特殊字符。";
  }

  return message;
}

async function assertIdentifierAvailable(supabase: SupabaseClient, email: string, phone: string) {
  const { data, error } = await supabase
    .rpc("check_sales_identifier_available", {
      requested_email: email,
      requested_phone: phone || null,
    })
    .single();

  if (error) {
    redirectWithLoginError(`账号重复检查失败：${error.message}`);
  }

  const availability = data as { email_available?: boolean; phone_available?: boolean } | null;

  if (availability?.email_available === false) {
    redirectWithLoginError("这个邮箱已经注册过，请直接登录或换一个邮箱。");
  }

  if (phone && availability?.phone_available === false) {
    redirectWithLoginError("这个手机号已经注册过，请直接登录或换一个手机号。");
  }
}

export async function signInWithEmailPassword(formData: FormData) {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    redirectWithLoginError("Supabase is not configured yet.");
  }

  const email = normalizeEmail(formValue(formData, "email"));
  const password = formValue(formData, "password");

  const emailValidation = validateEmail(email);

  if (!emailValidation.valid) {
    redirectWithLoginError(emailValidation.message || "邮箱格式不正确。");
  }

  if (!password) {
    redirectWithLoginError("请输入密码。");
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirectWithLoginError(mapAuthErrorMessage(error.message));
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function signUpWithEmailPassword(formData: FormData) {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    redirectWithLoginError("Supabase is not configured yet.");
  }

  const email = normalizeEmail(formValue(formData, "email"));
  const phone = normalizePhone(formValue(formData, "phone"));
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
    redirectWithLoginError(invalidValidation.message || "注册信息不符合规则。");
  }

  await assertIdentifierAvailable(supabase, email, phone);

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
    redirectWithLoginError(mapAuthErrorMessage(error.message));
  }

  revalidatePath("/", "layout");

  if (!data.session) {
    redirectWithLoginNotice("账号已创建。请先确认邮箱，然后再用邮箱和密码登录。");
  }

  redirect("/");
}

export async function sendPhoneOtp(formData: FormData) {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    redirectWithLoginError("Supabase is not configured yet.");
  }

  const phone = normalizePhone(formValue(formData, "phone"));

  const phoneValidation = validatePhone(phone);

  if (!phoneValidation.valid || !phone) {
    redirectWithLoginError(phoneValidation.message || "请输入手机号。");
  }

  const { error } = await supabase.auth.signInWithOtp({ phone });

  if (error) {
    redirectWithLoginError(mapAuthErrorMessage(error.message));
  }

  redirectWithLoginNotice("OTP 已发送。如果收不到短信，请确认 Supabase SMS provider 已启用。");
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();

  if (supabase) {
    await supabase.auth.signOut();
  }

  revalidatePath("/", "layout");
  redirect("/login");
}
