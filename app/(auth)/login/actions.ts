"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function formValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function redirectWithLoginError(message: string): never {
  const params = new URLSearchParams({ error: message });
  redirect(`/login?${params.toString()}`);
}

export async function signInWithEmailPassword(formData: FormData) {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    redirectWithLoginError("Supabase is not configured yet.");
  }

  const email = formValue(formData, "email");
  const password = formValue(formData, "password");

  if (!email || !password) {
    redirectWithLoginError("Email and password are required.");
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirectWithLoginError(error.message);
  }

  revalidatePath("/", "layout");
  redirect("/crm");
}

export async function signUpWithEmailPassword(formData: FormData) {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    redirectWithLoginError("Supabase is not configured yet.");
  }

  const email = formValue(formData, "email");
  const phone = formValue(formData, "phone");
  const password = formValue(formData, "password");
  const displayName = formValue(formData, "displayName");

  if (!email || !password) {
    redirectWithLoginError("Email and password are required.");
  }

  const { error } = await supabase.auth.signUp({
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
    redirectWithLoginError(error.message);
  }

  revalidatePath("/", "layout");
  redirect("/crm");
}

export async function sendPhoneOtp(formData: FormData) {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    redirectWithLoginError("Supabase is not configured yet.");
  }

  const phone = formValue(formData, "phone");

  if (!phone) {
    redirectWithLoginError("Phone number is required.");
  }

  const { error } = await supabase.auth.signInWithOtp({ phone });

  if (error) {
    redirectWithLoginError(error.message);
  }

  const params = new URLSearchParams({ notice: "OTP sent. Enable phone provider in Supabase before field use." });
  redirect(`/login?${params.toString()}`);
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();

  if (supabase) {
    await supabase.auth.signOut();
  }

  revalidatePath("/", "layout");
  redirect("/login");
}
