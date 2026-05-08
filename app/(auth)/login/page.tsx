import { Mail, Phone, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { signInWithEmailPassword, signUpWithEmailPassword, sendPhoneOtp } from "@/app/(auth)/login/actions";
import { AuthSubmitButton } from "@/components/auth-submit-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isSupabaseConfigured, SUPABASE_ENV_KEYS } from "@/lib/auth/supabase-config";
import { PASSWORD_RULES } from "@/lib/auth/validation";
import { getCurrentSupabaseUser } from "@/lib/supabase/server";

interface LoginPageProps {
  searchParams?: Promise<{
    error?: string;
    notice?: string;
  }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const configured = isSupabaseConfigured();
  const user = configured ? await getCurrentSupabaseUser() : null;

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

          {params?.error ? (
            <Card className="border-red-200 bg-red-50">
              <CardContent aria-live="polite" className="p-5 text-sm font-medium leading-6 text-red-900">
                {params.error}
              </CardContent>
            </Card>
          ) : null}

          {params?.notice ? (
            <Card className="border-emerald-200 bg-emerald-50">
              <CardContent aria-live="polite" className="p-5 text-sm font-medium leading-6 text-emerald-900">
                {params.notice}
              </CardContent>
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
                  <Input id="signin-email" name="email" type="email" placeholder="sales@ksolar.top" autoComplete="email" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <Input id="signin-password" name="password" type="password" autoComplete="current-password" required />
                </div>
                <AuthSubmitButton pendingLabel="登录中..." disabled={!configured}>
                  <Mail className="size-4" />
                  登录销售工作台
                </AuthSubmitButton>
              </form>
            </CardContent>
          </Card>

          <Card className="border-white/75 bg-white/90">
            <CardHeader>
              <CardTitle>注册销售账号</CardTitle>
              <CardDescription>
                注册前会检查邮箱/手机号是否重复。注册后如需邮箱确认，请先完成邮件确认再登录。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={signUpWithEmailPassword} className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="signup-name">姓名</Label>
                  <Input
                    id="signup-name"
                    name="displayName"
                    placeholder="例如 Somchai / 张三"
                    minLength={2}
                    maxLength={60}
                    autoComplete="name"
                    required
                  />
                  <p className="text-xs leading-5 text-muted-foreground">
                    2-60 个字符，可包含中英泰文字母、数字、空格、点、连字符或撇号。
                  </p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input id="signup-email" name="email" type="email" autoComplete="email" required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="signup-phone">Phone</Label>
                    <Input id="signup-phone" name="phone" type="tel" placeholder="+66812345678" autoComplete="tel" />
                    <p className="text-xs leading-5 text-muted-foreground">选填；如填写，请使用国际格式。</p>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    name="password"
                    type="password"
                    minLength={10}
                    maxLength={72}
                    pattern="(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9])\S{10,72}"
                    title="至少 10 位，并包含英文字母、数字和特殊字符，不能包含空格。"
                    autoComplete="new-password"
                    required
                  />
                  <div className="rounded-2xl border border-border/70 bg-muted/25 p-3 text-xs leading-5 text-muted-foreground">
                    <div className="mb-1 font-semibold text-slate-800">密码规则</div>
                    {PASSWORD_RULES.map((rule) => (
                      <div key={rule}>- {rule}</div>
                    ))}
                  </div>
                </div>
                <AuthSubmitButton pendingLabel="创建中..." variant="outline" disabled={!configured}>
                  创建账号
                </AuthSubmitButton>
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
                <Input name="phone" type="tel" placeholder="+66812345678" />
                <AuthSubmitButton pendingLabel="发送中..." variant="secondary" disabled={!configured}>
                  <Phone className="size-4" />
                  发送 OTP
                </AuthSubmitButton>
              </form>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
