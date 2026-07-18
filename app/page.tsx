import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard-shell";
import { isSupabaseConfigured } from "@/lib/auth/supabase-config";
import { LOCALE_COOKIE_NAME, resolveAppLocale } from "@/lib/i18n";
import { getCurrentActiveSalesUser } from "@/lib/supabase/server";

export default async function Page() {
  const cookieStore = await cookies();
  const initialLocale = resolveAppLocale(cookieStore.get(LOCALE_COOKIE_NAME)?.value);

  const configured = isSupabaseConfigured();

  if (!configured && process.env.NODE_ENV === "production") {
    redirect("/login");
  }

  if (configured) {
    const user = await getCurrentActiveSalesUser();

    if (!user) {
      redirect("/login");
    }
  }

  return <DashboardShell initialLocale={initialLocale} />;
}
