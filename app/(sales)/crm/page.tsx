import { redirect } from "next/navigation";
import type { ComponentType } from "react";
import { BarChart3, Database, FileText, Users } from "lucide-react";
import { signOut } from "@/app/(auth)/login/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return (
      <main className="ksolar-shell min-h-screen px-4 py-8">
        <Card className="mx-auto max-w-3xl border-amber-300 bg-amber-50">
          <CardContent className="p-6 text-sm leading-6 text-amber-950">
            Supabase 尚未配置。请先设置环境变量并运行数据库 migration。
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
            <div className="section-kicker">Sales CRM</div>
            <h1 className="mt-1 text-3xl font-semibold tracking-[-0.055em] text-slate-950">销售工作台</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              User primary id: <span className="font-mono text-slate-800">{user.id}</span>
            </p>
          </div>
          <form action={signOut}>
            <Button type="submit" variant="outline">退出登录</Button>
          </form>
        </header>

        {hasMigrationError ? (
          <Card className="border-amber-300 bg-amber-50">
            <CardContent className="p-5 text-sm leading-6 text-amber-950">
              已登录，但 CRM 数据表还不可用。请在 Supabase SQL Editor 执行
              <span className="mx-1 font-mono">db/migrations/202605080001_crm_foundation.sql</span>
              后再刷新。
            </CardContent>
          </Card>
        ) : null}

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard icon={Users} label="客户" value={customers.count} />
          <MetricCard icon={BarChart3} label="商机" value={opportunities.count} />
          <MetricCard icon={FileText} label="报价项目" value={quotes.count} />
          <MetricCard icon={Database} label="拜访记录" value={visits.count} />
        </section>

        <Card className="border-white/75 bg-white/90">
          <CardHeader>
            <CardTitle>下一步模块</CardTitle>
            <CardDescription>先把数据主链路建稳，再接自动化。</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm leading-6 text-slate-700">
            <p>1. 客户建档：姓名、手机号、LINE、地址、PEA/MEA、电表相位、家庭用电资料。</p>
            <p>2. 报价保存：每次报价生成 quote id，并把输入、结果、BOM、金融方案保存为不可变 snapshot。</p>
            <p>3. 自动化事件：报价接受后写入 `automation_events`，后续可流转仓库备货、施工排期和售后提醒。</p>
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
