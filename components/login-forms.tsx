"use client";

import { useActionState, useState } from "react";
import { Mail, Phone } from "lucide-react";
import { sendPhoneOtp, signInWithEmailPassword, signUpWithEmailPassword } from "@/app/(auth)/login/actions";
import { AuthSubmitButton } from "@/components/auth-submit-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { initialAuthActionState, type AuthActionState } from "@/lib/auth/action-state";
import { DIAL_CODE_OPTIONS } from "@/lib/auth/country-codes";
import { PASSWORD_RULES } from "@/lib/auth/validation";

interface LoginFormsProps {
  configured: boolean;
  defaultDialCode: string;
}

export function LoginForms({ configured, defaultDialCode }: LoginFormsProps) {
  const [signInState, signInAction] = useActionState(signInWithEmailPassword, initialAuthActionState);
  const [signUpState, signUpAction] = useActionState(signUpWithEmailPassword, initialAuthActionState);
  const [otpState, otpAction] = useActionState(sendPhoneOtp, initialAuthActionState);
  const [signUpDialCode, setSignUpDialCode] = useState(defaultDialCode);
  const [otpDialCode, setOtpDialCode] = useState(defaultDialCode);

  return (
    <section className="grid gap-4">
      <Card className="border-white/75 bg-white/90">
        <CardHeader>
          <CardTitle>邮箱登录</CardTitle>
          <CardDescription>适合第一阶段内部销售测试，简单、稳定、方便追踪用户 primary id。</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={signInAction} className="grid gap-4" noValidate>
            <ActionBanner state={signInState} />
            <div className="grid gap-2">
              <Label htmlFor="signin-email">Email</Label>
              <Input
                id="signin-email"
                name="email"
                type="text"
                inputMode="email"
                placeholder="sales@ksolar.top"
                autoComplete="email"
                required
              />
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
          <CardDescription>注册前会检查邮箱/手机号是否重复。注册后如需邮箱确认，请先完成邮件确认再登录。</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={signUpAction} className="grid gap-4" noValidate>
            <ActionBanner state={signUpState} />
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
                <Input id="signup-email" name="email" type="text" inputMode="email" autoComplete="email" required />
              </div>
              <PhoneField
                id="signup-phone"
                label="Phone"
                dialCode={signUpDialCode}
                onDialCodeChange={setSignUpDialCode}
                required={false}
                helper="选填；会按所选国家区号自动转成国际格式。"
              />
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
          <form action={otpAction} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end" noValidate>
            <div className="grid gap-3">
              <ActionBanner state={otpState} />
              <PhoneField
                id="otp-phone"
                label="手机号"
                dialCode={otpDialCode}
                onDialCodeChange={setOtpDialCode}
                required
                helper="会按所选国家区号自动转成国际格式。"
              />
            </div>
            <AuthSubmitButton pendingLabel="发送中..." variant="secondary" disabled={!configured}>
              <Phone className="size-4" />
              发送 OTP
            </AuthSubmitButton>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}

function ActionBanner({ state }: { state: AuthActionState }) {
  if (!state.message) {
    return null;
  }

  const isError = state.status === "error";

  return (
    <div
      aria-live="polite"
      className={
        isError
          ? "rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium leading-6 text-red-900"
          : "rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium leading-6 text-emerald-900"
      }
    >
      {state.message}
    </div>
  );
}

function PhoneField({
  id,
  label,
  dialCode,
  onDialCodeChange,
  required,
  helper,
}: {
  id: string;
  label: string;
  dialCode: string;
  onDialCodeChange: (value: string) => void;
  required: boolean;
  helper: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="grid grid-cols-[8.5rem_minmax(0,1fr)] gap-2">
        <select
          name="phoneCountryCode"
          value={dialCode}
          onChange={(event) => onDialCodeChange(event.target.value)}
          className="h-11 rounded-xl border border-input bg-background px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
          aria-label="Country code"
        >
          {DIAL_CODE_OPTIONS.map((option) => (
            <option key={option.countryCode} value={option.dialCode}>
              {option.countryCode} {option.dialCode}
            </option>
          ))}
        </select>
        <Input
          id={id}
          name="phoneLocal"
          type="tel"
          placeholder={dialCode === "+66" ? "0812345678" : "Phone number"}
          autoComplete="tel-national"
          required={required}
        />
      </div>
      <p className="text-xs leading-5 text-muted-foreground">{helper}</p>
    </div>
  );
}
