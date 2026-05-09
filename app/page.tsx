import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard-shell";
import { isSupabaseConfigured } from "@/lib/auth/supabase-config";
import { LOCALE_COOKIE_NAME, resolveAppLocale } from "@/lib/i18n";
import { getCurrentSupabaseUser } from "@/lib/supabase/server";

export default async function Page() {
  const cookieStore = await cookies();
  const initialLocale = resolveAppLocale(cookieStore.get(LOCALE_COOKIE_NAME)?.value);

  if (isSupabaseConfigured()) {
    const user = await getCurrentSupabaseUser();

    if (!user) {
      redirect("/login");
    }
  }

  return <DashboardShell initialLocale={initialLocale} />;
}
