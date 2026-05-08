import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  return signOutAndRedirect(request);
}

async function signOutAndRedirect(request: NextRequest) {
  const supabase = await createSupabaseServerClient();

  if (supabase) {
    await supabase.auth.signOut();
  }

  return NextResponse.redirect(new URL("/login", request.url), 303);
}
