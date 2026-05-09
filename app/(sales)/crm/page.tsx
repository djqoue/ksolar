import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ComponentType } from "react";
import { ArrowLeft, BarChart3, Database, FileText, Users } from "lucide-react";
import { CrmLogoutButton } from "@/components/crm-logout-button";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCrmCopy, LOCALE_COOKIE_NAME, resolveAppLocale } from "@/lib/i18n";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function getCount(supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>, table: string, ownerUserId: string) {
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("owner_user_id", ownerUserId);

  return { count: count ?? 0, error: error?.message ?? null };
}

export default async function CrmPage() {
  const cookieStore = await cookies();
  const locale = resolveAppLocale(cookieStore.get(LOCALE_COOKIE_NAME)?.value);
  const crmCopy = getCrmCopy(locale);
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return (
      <main className="ksolar-shell min-h-screen px-4 py-8">
        <Card className="mx-auto max-w-3xl border-amber-300 bg-amber-50">
          <CardContent className="p-6 text-sm leading-6 text-amber-950">
            {crmCopy.notConfigured}
          </CardContent>
        </Card>
      </main>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [customers, opportunities, quotes, visits] = await Promise.all([
    getCount(supabase, "customers", user.id),
    getCount(supabase, "opportunities", user.id),
    getCount(supabase, "quote_projects", user.id),
    getCount(supabase, "visits", user.id),
  ]);

  const hasMigrationError = [customers, opportunities, quotes, visits].some((item) => item.error);

  return (
    <main className="ksolar-shell min-h-screen px-4 py-6">
      <div className="mx-auto grid max-w-6xl gap-5">
        <header className="premium-panel flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="section-kicker">{crmCopy.sectionKicker}</div>
            <h1 className="mt-1 text-3xl font-semibold tracking-[-0.055em] text-slate-950">{crmCopy.title}</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {crmCopy.userPrimaryId}: <span className="break-all font-mono text-slate-800">{user.id}</span>
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <LanguageSwitcher locale={locale} />
            <Button asChild variant="default">
              <Link href="/">
                <ArrowLeft className="size-4" />
                {crmCopy.returnToQuote}
              </Link>
            </Button>
            <form action="/logout" method="post">
              <CrmLogoutButton label={crmCopy.signOut} pendingLabel={crmCopy.signingOut} />
            </form>
          </div>
        </header>

        {hasMigrationError ? (
          <Card className="border-amber-300 bg-amber-50">
            <CardContent className="p-5 text-sm leading-6 text-amber-950">
              {crmCopy.migrationWarning}
            </CardContent>
          </Card>
        ) : null}

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard icon={Users} label={crmCopy.metrics.customers} value={customers.count} />
          <MetricCard icon={BarChart3} label={crmCopy.metrics.opportunities} value={opportunities.count} />
          <MetricCard icon={FileText} label={crmCopy.metrics.quotes} value={quotes.count} />
          <MetricCard icon={Database} label={crmCopy.metrics.visits} value={visits.count} />
        </section>

        <Card className="border-white/75 bg-white/90">
          <CardHeader>
            <CardTitle>{crmCopy.nextModulesTitle}</CardTitle>
            <CardDescription>{crmCopy.nextModulesDescription}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm leading-6 text-slate-700">
            {crmCopy.nextModules.map((item, index) => (
              <p key={item}>
                {index + 1}. {item}
              </p>
            ))}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function MetricCard({ icon: Icon, label, value }: { icon: ComponentType<{ className?: string }>; label: string; value: number }) {
  return (
    <Card className="border-white/75 bg-white/90">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="metric-label">{label}</div>
          <Icon className="size-4 text-emerald-600" />
        </div>
        <div className="mt-3 text-3xl font-semibold tracking-[-0.055em]">{value}</div>
      </CardContent>
    </Card>
  );
}
