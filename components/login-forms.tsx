"use client";

import { useActionState, useState } from "react";
import { Mail } from "lucide-react";
import { signInWithEmailPassword, signUpWithEmailPassword } from "@/app/(auth)/login/actions";
import { AuthSubmitButton } from "@/components/auth-submit-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { initialAuthActionState, type AuthActionState } from "@/lib/auth/action-state";
import { DIAL_CODE_OPTIONS } from "@/lib/auth/country-codes";
import { getAuthCopy, type AppLocale } from "@/lib/i18n";

interface LoginFormsProps {
  configured: boolean;
  defaultDialCode: string;
  locale: AppLocale;
}

export function LoginForms({ configured, defaultDialCode, locale }: LoginFormsProps) {
  const copy = getAuthCopy(locale);
  const [signInState, signInAction] = useActionState(signInWithEmailPassword, initialAuthActionState);
  const [signUpState, signUpAction] = useActionState(signUpWithEmailPassword, initialAuthActionState);
  const [signUpDialCode, setSignUpDialCode] = useState(defaultDialCode);

  return (
    <section className="grid gap-4">
      <Card className="border-white/75 bg-white/90">
        <CardHeader>
          <CardTitle>{copy.forms.signInTitle}</CardTitle>
          <CardDescription>{copy.forms.signInDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={signInAction} className="grid gap-4" noValidate>
            <input type="hidden" name="locale" value={locale} />
            <ActionBanner state={signInState} />
            <div className="grid gap-2">
              <Label htmlFor="signin-email">{copy.forms.email}</Label>
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
              <Label htmlFor="signin-password">{copy.forms.password}</Label>
              <Input id="signin-password" name="password" type="password" autoComplete="current-password" required />
            </div>
            <AuthSubmitButton pendingLabel={copy.forms.signInPending} disabled={!configured}>
              <Mail className="size-4" />
              {copy.forms.signInSubmit}
            </AuthSubmitButton>
          </form>
        </CardContent>
      </Card>

      <Card className="border-white/75 bg-white/90">
        <CardHeader>
          <CardTitle>{copy.forms.signUpTitle}</CardTitle>
          <CardDescription>{copy.forms.signUpDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={signUpAction} className="grid gap-4" noValidate>
            <input type="hidden" name="locale" value={locale} />
            <ActionBanner state={signUpState} />
            <div className="grid gap-2">
              <Label htmlFor="signup-name">{copy.forms.displayName}</Label>
              <Input
                id="signup-name"
                name="displayName"
                placeholder={copy.forms.displayNamePlaceholder}
                minLength={2}
                maxLength={60}
                autoComplete="name"
                required
              />
              <p className="text-xs leading-5 text-muted-foreground">
                {copy.forms.displayNameHelper}
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="signup-email">{copy.forms.email}</Label>
                <Input id="signup-email" name="email" type="text" inputMode="email" autoComplete="email" required />
              </div>
              <PhoneField
                id="signup-phone"
                label={copy.forms.phone}
                dialCode={signUpDialCode}
                onDialCodeChange={setSignUpDialCode}
                required={false}
                helper={copy.forms.phoneHelper}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="signup-password">{copy.forms.password}</Label>
              <Input
                id="signup-password"
                name="password"
                type="password"
                minLength={10}
                maxLength={72}
                pattern="(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9])\S{10,72}"
                title={copy.forms.passwordTitle}
                autoComplete="new-password"
                required
              />
              <div className="rounded-2xl border border-border/70 bg-muted/25 p-3 text-xs leading-5 text-muted-foreground">
                <div className="mb-1 font-semibold text-slate-800">{copy.forms.passwordRulesTitle}</div>
                {copy.forms.passwordRules.map((rule) => (
                  <div key={rule}>- {rule}</div>
                ))}
              </div>
            </div>
            <AuthSubmitButton pendingLabel={copy.forms.signUpPending} variant="outline" disabled={!configured}>
              {copy.forms.signUpSubmit}
            </AuthSubmitButton>
          </form>
        </CardContent>
      </Card>

      <Card className="border-emerald-200 bg-emerald-50/80">
        <CardContent className="p-5 text-sm leading-6 text-emerald-950">
          {copy.forms.testNotice}
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
