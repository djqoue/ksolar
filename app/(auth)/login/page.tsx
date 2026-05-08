import { headers } from "next/headers";
import { ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { LoginForms } from "@/components/login-forms";
import { Card, CardContent } from "@/components/ui/card";
import { getDialCodeForCountry } from "@/lib/auth/country-codes";
import { isSupabaseConfigured, SUPABASE_ENV_KEYS } from "@/lib/auth/supabase-config";
import { getCurrentSupabaseUser } from "@/lib/supabase/server";

export default async function LoginPage() {
  const configured = isSupabaseConfigured();
  const user = configured ? await getCurrentSupabaseUser() : null;
  const requestHeaders = await headers();
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
            KSolar Sales OS
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
            每个销售账号、客户、项目地点和报价方案都有稳定 primary id。后续管理层可以从账号穿透到客户资料、拜访记录、报价版本、BOM 和自动化事件。
          </p>
          <div className="mt-8 grid gap-3">
            {[
              "销售账号 ID = Supabase auth.users.id",
              "客户 ID = customers.id，集中挂载 SRM 客群信息",
              "报价 ID = quote_versions.id，保存每次报价 snapshot",
              "自动化事件 = automation_events，预留下单、备货、施工和售后接口",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/75 bg-white/80 p-4 text-sm font-medium text-slate-800">
                <ShieldCheck className="size-4 text-emerald-600" />
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-4">
          {!configured ? (
            <Card className="border-amber-300 bg-amber-50">
              <CardContent className="p-5 text-sm leading-6 text-amber-950">
                Supabase 尚未配置。上线账号功能前，请在 Vercel Environment Variables 设置：
                <span className="mt-2 block font-mono text-xs">
                  {SUPABASE_ENV_KEYS.join(" / ")}
                </span>
              </CardContent>
            </Card>
          ) : null}

          <LoginForms configured={configured} defaultDialCode={defaultDialCode} />
        </section>
      </div>
    </main>
  );
}
