import { cookies, headers } from "next/headers";
import { ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { LanguageSwitcher } from "@/components/language-switcher";
import { LoginForms } from "@/components/login-forms";
import { Card, CardContent } from "@/components/ui/card";
import { getDialCodeForCountry } from "@/lib/auth/country-codes";
import { isSupabaseConfigured, SUPABASE_ENV_KEYS } from "@/lib/auth/supabase-config";
import { getAuthCopy, LOCALE_COOKIE_NAME, resolveAppLocale } from "@/lib/i18n";
import { getCurrentSupabaseUser } from "@/lib/supabase/server";

export default async function LoginPage() {
  const configured = isSupabaseConfigured();
  const user = configured ? await getCurrentSupabaseUser() : null;
  const requestHeaders = await headers();
  const cookieStore = await cookies();
  const locale = resolveAppLocale(cookieStore.get(LOCALE_COOKIE_NAME)?.value);
  const copy = getAuthCopy(locale);
  const requestCountry =
    requestHeaders.get("x-vercel-ip-country") ||
    requestHeaders.get("cf-ipcountry") ||
    requestHeaders.get("x-country-code");
  const defaultDialCode = getDialCodeForCountry(requestCountry);

  if (user) {
    redirect("/");
  }

  return (
    <main className="ksolar-shell min-h-screen px-4 py-8">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="premium-panel p-6 sm:p-8">
          <div className="ksolar-brand-mark mb-8" aria-hidden="true">
            <span>K</span>
          </div>
          <h1 className="max-w-xl text-4xl font-semibold tracking-[-0.06em] text-slate-950 sm:text-5xl">
            {copy.page.title}
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
            {copy.page.description}
          </p>
          <div className="mt-8 grid gap-3">
            {copy.page.bullets.map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/75 bg-white/80 p-4 text-sm font-medium text-slate-800">
                <ShieldCheck className="size-4 text-emerald-600" />
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-4">
          <div className="flex justify-end">
            <LanguageSwitcher locale={locale} />
          </div>

          {!configured ? (
            <Card className="border-amber-300 bg-amber-50">
              <CardContent className="p-5 text-sm leading-6 text-amber-950">
                {copy.page.supabaseMissing}
                <span className="mt-2 block font-mono text-xs">
                  {SUPABASE_ENV_KEYS.join(" / ")}
                </span>
              </CardContent>
            </Card>
          ) : null}

          <LoginForms configured={configured} defaultDialCode={defaultDialCode} locale={locale} />
        </section>
      </div>
    </main>
  );
}
