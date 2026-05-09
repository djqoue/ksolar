"use client";

import { useActionState, useMemo } from "react";
import { BrainCircuit, CheckCircle2, Home, Mail, MessageCircle, Phone, Save, UserRound, Zap, type LucideIcon } from "lucide-react";
import { saveCustomerIntake } from "@/app/(sales)/customer-intake/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  EDUCATION_OPTIONS,
  getCustomerIntakeCompletion,
  initialCustomerIntakeSaveState,
  LARGE_APPLIANCE_OPTIONS,
  validateCustomerIntake,
  type CustomerIntake,
  type LargeApplianceType,
} from "@/lib/customer-intake";

interface CustomerIntakeCardProps {
  value: CustomerIntake;
  onChange: (value: CustomerIntake) => void;
}

export function CustomerIntakeCard({ value, onChange }: CustomerIntakeCardProps) {
  const [saveState, saveAction, isSaving] = useActionState(saveCustomerIntake, initialCustomerIntakeSaveState);
  const completion = useMemo(() => getCustomerIntakeCompletion(value), [value]);
  const validation = useMemo(() => validateCustomerIntake(value), [value]);
  const annualSpendHint = value.monthlyElectricityBillTHB
    ? `${formatMoney(Number(value.monthlyElectricityBillTHB) * 12)} THB/year`
    : "填月电费后自动估算";

  const setField = (key: keyof CustomerIntake, nextValue: string) => {
    if (key === "monthlyElectricityBillTHB") {
      const monthlyBill = Number(nextValue);
      onChange({
        ...value,
        monthlyElectricityBillTHB: nextValue,
        annualElectricitySpendTHB: Number.isFinite(monthlyBill) && monthlyBill > 0 ? String(Math.round(monthlyBill * 12)) : "",
      });
      return;
    }

    onChange({ ...value, [key]: nextValue });
  };

  const toggleAppliance = (appliance: LargeApplianceType) => {
    const nextAppliances = value.largeAppliances.includes(appliance)
      ? value.largeAppliances.filter((item) => item !== appliance)
      : [...value.largeAppliances, appliance];

    onChange({ ...value, largeAppliances: nextAppliances });
  };

  return (
    <Card className="border-white/75 bg-white/92 shadow-[0_18px_48px_rgba(15,23,42,0.06)]">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UserRound className="size-5 text-emerald-600" />
              客户快照
            </CardTitle>
            <CardDescription>
              先填最重要的客户身份和联系方式。其他潜在评分因子可跳过，后续在 CRM 补全。
            </CardDescription>
          </div>
          <div
            className={`rounded-2xl border px-3 py-2 text-xs font-semibold ${
              validation.ready
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-amber-200 bg-amber-50 text-amber-900"
            }`}
          >
            {validation.ready ? "必填已完成" : validation.message ?? `缺少：${completion.missing.join("、")}`}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form action={saveAction} className="grid gap-4">
          <div className="grid gap-3 md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            <Field label="客户姓名 *" icon={UserRound}>
              <Input
                name="displayName"
                value={value.displayName}
                onChange={(event) => setField("displayName", event.target.value)}
                placeholder="例如 Somchai / Youwen"
                required
              />
            </Field>
            <Field label="住址 *" icon={Home}>
              <Input
                name="addressText"
                value={value.addressText}
                onChange={(event) => setField("addressText", event.target.value)}
                placeholder="客户住宅地址或项目地点"
                required
              />
            </Field>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <Field label="电话" icon={Phone}>
              <Input
                name="phone"
                value={value.phone}
                onChange={(event) => setField("phone", event.target.value)}
                placeholder="+66812345678 / 0812345678"
                inputMode="tel"
              />
            </Field>
            <Field label="邮箱" icon={Mail}>
              <Input
                name="email"
                value={value.email}
                onChange={(event) => setField("email", event.target.value)}
                placeholder="customer@email.com"
                inputMode="email"
              />
            </Field>
            <Field label="LINE" icon={MessageCircle}>
              <Input
                name="lineId"
                value={value.lineId}
                onChange={(event) => setField("lineId", event.target.value)}
                placeholder="Line ID"
              />
            </Field>
          </div>

          <details className="rounded-[1.35rem] border border-border/70 bg-muted/20 p-4">
            <summary className="cursor-pointer list-none text-sm font-semibold text-slate-950 marker:hidden">
              选填：用电画像和客户评分因子
              <span className="mt-1 block text-sm font-normal text-muted-foreground">
                用于后续客户评级、ROI 校准、机器学习和 AI 跟进，不影响当前快速报价。
              </span>
            </summary>
            <div className="mt-4 grid gap-4">
              <div className="grid gap-3 md:grid-cols-4">
                <Field label="年龄" icon={BrainCircuit}>
                  <Input
                    name="age"
                    value={value.age}
                    onChange={(event) => setField("age", event.target.value)}
                    placeholder="可跳过"
                    inputMode="numeric"
                  />
                </Field>
                <Field label="月电费 THB" icon={Zap}>
                  <Input
                    name="monthlyElectricityBillTHB"
                    value={value.monthlyElectricityBillTHB}
                    onChange={(event) => setField("monthlyElectricityBillTHB", event.target.value)}
                    placeholder="例如 4500"
                    inputMode="decimal"
                  />
                </Field>
                <Field label="年电费支出 THB" icon={Zap}>
                  <Input
                    name="annualElectricitySpendTHB"
                    value={value.annualElectricitySpendTHB}
                    onChange={(event) => setField("annualElectricitySpendTHB", event.target.value)}
                    placeholder={annualSpendHint}
                    inputMode="decimal"
                  />
                </Field>
                <Field label="年收入 THB" icon={BrainCircuit}>
                  <Input
                    name="annualIncomeTHB"
                    value={value.annualIncomeTHB}
                    onChange={(event) => setField("annualIncomeTHB", event.target.value)}
                    placeholder="可跳过"
                    inputMode="decimal"
                  />
                </Field>
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-semibold text-slate-900">受教育背景</label>
                <select
                  name="educationBackground"
                  value={value.educationBackground}
                  onChange={(event) => setField("educationBackground", event.target.value)}
                  className="h-11 rounded-xl border border-input bg-background px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                >
                  {EDUCATION_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-semibold text-slate-900">大型用电器</label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                  {LARGE_APPLIANCE_OPTIONS.map((option) => {
                    const checked = value.largeAppliances.includes(option.id);
                    return (
                      <label
                        key={option.id}
                        className={`flex cursor-pointer items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-center text-sm font-semibold transition ${
                          checked
                            ? "border-slate-950 bg-slate-950 text-white shadow-[0_14px_30px_rgba(15,23,42,0.18)]"
                            : "border-border bg-white/75 text-slate-700 hover:border-slate-300"
                        }`}
                      >
                        <input
                          type="checkbox"
                          name="largeAppliances"
                          value={option.id}
                          checked={checked}
                          onChange={() => toggleAppliance(option.id)}
                          className="sr-only"
                        />
                        {checked ? <CheckCircle2 className="size-4" /> : null}
                        {option.label}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-semibold text-slate-900">备注</label>
                <textarea
                  name="notes"
                  value={value.notes}
                  onChange={(event) => setField("notes", event.target.value)}
                  placeholder="例如客户对电费敏感、准备买 EV、白天家里有人等"
                  className="min-h-24 rounded-2xl border border-input bg-background px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                />
              </div>
            </div>
          </details>

          {saveState.message ? (
            <div
              className={`rounded-2xl border px-4 py-3 text-sm font-medium leading-6 ${
                saveState.status === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : "border-red-200 bg-red-50 text-red-900"
              }`}
            >
              {saveState.message}
            </div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-6 text-muted-foreground">
              必填规则：客户姓名 + 住址 + 电话/邮箱/LINE 任意一种。保存后 CRM 会生成客户 ID。
            </p>
            <Button type="submit" variant="outline" disabled={!validation.ready || isSaving} className="min-w-[150px]">
              <Save className="size-4" />
              {isSaving ? "保存中..." : "保存到 CRM"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-2">
      <span className="flex items-center gap-2 text-sm font-semibold text-slate-900">
        <Icon className="size-4 text-emerald-600" />
        {label}
      </span>
      {children}
    </label>
  );
}

function formatMoney(value: number) {
  if (!Number.isFinite(value)) {
    return "";
  }

  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}
