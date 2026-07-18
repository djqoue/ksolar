import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function requireAuthenticatedApiUser() {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return NextResponse.json(
      { error: "Authentication service is not configured." },
      { status: 503 },
    );
  }

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 },
      );
    }

    const { data: salesProfile, error: profileError } = await supabase
      .from("sales_profiles")
      .select("active")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !salesProfile?.active) {
      return NextResponse.json(
        { error: "An active sales account is required." },
        { status: 403 },
      );
    }
  } catch {
    return NextResponse.json(
      { error: "Authentication service is unavailable." },
      { status: 503 },
    );
  }

  return null;
}
