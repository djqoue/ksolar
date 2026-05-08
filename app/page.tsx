import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard-shell";
import { isSupabaseConfigured } from "@/lib/auth/supabase-config";
import { getCurrentSupabaseUser } from "@/lib/supabase/server";

export default async function Page() {
  if (isSupabaseConfigured()) {
    const user = await getCurrentSupabaseUser();

    if (!user) {
      redirect("/login");
    }
  }

  return <DashboardShell />;
}
