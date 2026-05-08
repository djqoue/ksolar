import { Mail, Phone, ShieldCheck } from "lucide-react";
import { signInWithEmailPassword, signUpWithEmailPassword, sendPhoneOtp } from "@/app/(auth)/login/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isSupabaseConfigured, SUPABASE_ENV_KEYS } from "@/lib/auth/supabase-config";

interface LoginPageProps {
  searchParams?: Promise<{
    error?: string;
    notice?: string;
  }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const configured = isSupabaseConfigured();

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

          {params?.error ? (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-5 text-sm text-red-900">{params.error}</CardContent>
            </Card>
          ) : null}

          {params?.notice ? (
            <Card className="border-emerald-200 bg-emerald-50">
              <CardContent className="p-5 text-sm text-emerald-900">{params.notice}</CardContent>
            </Card>
          ) : null}

          <Card className="border-white/75 bg-white/90">
            <CardHeader>
              <CardTitle>邮箱登录</CardTitle>
              <CardDescription>适合第一阶段内部销售测试，简单、稳定、方便追踪用户 primary id。</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={signInWithEmailPassword} className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input id="signin-email" name="email" type="email" placeholder="sales@ksolar.top" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <Input id="signin-password" name="password" type="password" required />
                </div>
                <Button type="submit" disabled={!configured}>
                  <Mail className="size-4" />
                  登录销售工作台
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border-white/75 bg-white/90">
            <CardHeader>
              <CardTitle>注册销售账号</CardTitle>
              <CardDescription>注册后会自动创建 `sales_profiles` 资料，用于绑定客户、报价和拜访记录。</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={signUpWithEmailPassword} className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="signup-name">姓名</Label>
                  <Input id="signup-name" name="displayName" placeholder="Sales name" />
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input id="signup-email" name="email" type="email" required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="signup-phone">Phone</Label>
                    <Input id="signup-phone" name="phone" type="tel" placeholder="+66..." />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input id="signup-password" name="password" type="password" minLength={8} required />
                </div>
                <Button type="submit" variant="outline" disabled={!configured}>
                  创建账号
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border-white/75 bg-white/90">
            <CardHeader>
              <CardTitle>手机号 OTP</CardTitle>
              <CardDescription>代码已预留。正式启用前需要在 Supabase 配置 SMS provider，例如 Twilio。</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={sendPhoneOtp} className="flex flex-col gap-3 sm:flex-row">
                <Input name="phone" type="tel" placeholder="+66..." />
                <Button type="submit" variant="secondary" disabled={!configured}>
                  <Phone className="size-4" />
                  发送 OTP
                </Button>
              </form>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
