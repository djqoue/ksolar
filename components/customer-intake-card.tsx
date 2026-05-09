"use client";

import { useActionState, useMemo, useState } from "react";
import {
  BrainCircuit,
  CheckCircle2,
  Home,
  LoaderCircle,
  LocateFixed,
  Mail,
  MessageCircle,
  Phone,
  Save,
  UserRound,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { saveCustomerIntake } from "@/app/(sales)/customer-intake/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  EDUCATION_OPTIONS,
  getCustomerIntakeCompletion,
  getCustomerIntakeCopy,
  initialCustomerIntakeSaveState,
  LARGE_APPLIANCE_OPTIONS,
  validateCustomerIntake,
  type CustomerIntake,
  type LargeApplianceType,
} from "@/lib/customer-intake";
import type { AppLocale } from "@/lib/i18n";

interface CustomerIntakeCardProps {
  value: CustomerIntake;
  onChange: (value: CustomerIntake) => void;
  locale: AppLocale;
}

type LocationStatus = "idle" | "loading" | "success" | "error";

export function CustomerIntakeCard({ value, onChange, locale }: CustomerIntakeCardProps) {
  const copy = getCustomerIntakeCopy(locale);
  const [saveState, saveAction, isSaving] = useActionState(saveCustomerIntake, initialCustomerIntakeSaveState);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("idle");
  const [locationMessage, setLocationMessage] = useState("");
  const completion = useMemo(() => getCustomerIntakeCompletion(value, locale), [locale, value]);
  const validation = useMemo(() => validateCustomerIntake(value, locale), [locale, value]);
  const annualSpendHint = value.monthlyElectricityBillTHB
    ? `${formatMoney(Number(value.monthlyElectricityBillTHB) * 12)} THB/year`
    : copy.annualSpendHint;

  const setField = (key: Exclude<keyof CustomerIntake, "largeAppliances">, nextValue: string) => {
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

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus("error");
      setLocationMessage(copy.locationNoBrowser);
      return;
    }

    setLocationStatus("loading");
    setLocationMessage(copy.locating);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = Number(position.coords.latitude.toFixed(7));
        const longitude = Number(position.coords.longitude.toFixed(7));
        let addressText = value.addressText.trim() || formatCoordinates(latitude, longitude);

        try {
          const response = await fetch(
            `/api/maps/reverse-geocode?lat=${latitude}&lng=${longitude}&locale=${locale}`,
            { cache: "no-store" },
          );
          const payload = (await response.json()) as { formattedAddress?: string | null };

          if (response.ok && payload.formattedAddress) {
            addressText = payload.formattedAddress;
          }
        } catch {
          addressText = value.addressText.trim() || formatCoordinates(latitude, longitude);
        }

        onChange({
          ...value,
          addressText,
          latitude: String(latitude),
          longitude: String(longitude),
        });
        setLocationStatus("success");
        setLocationMessage(copy.locationCaptured);
      },
      (error) => {
        setLocationStatus("error");
        if (error.code === error.PERMISSION_DENIED) {
          setLocationMessage(copy.locationBlocked);
          return;
        }

        if (error.code === error.TIMEOUT) {
          setLocationMessage(copy.locationTimeout);
          return;
        }

        setLocationMessage(copy.locationFailed);
      },
      { enableHighAccuracy: true, maximumAge: 60_000, timeout: 12_000 },
    );
  };

  return (
    <Card className="border-white/75 bg-white/92 shadow-[0_18px_48px_rgba(15,23,42,0.06)]">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UserRound className="size-5 text-emerald-600" />
              {copy.title}
            </CardTitle>
            <CardDescription>{copy.description}</CardDescription>
          </div>
          <div
            className={`rounded-2xl border px-3 py-2 text-xs font-semibold ${
              validation.ready
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-amber-200 bg-amber-50 text-amber-900"
            }`}
          >
            {validation.ready ? copy.ready : validation.message ?? `${copy.missingPrefix}: ${completion.missing.join(", ")}`}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form action={saveAction} className="grid gap-4">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="latitude" value={value.latitude} />
          <input type="hidden" name="longitude" value={value.longitude} />

          <div className="grid gap-3 md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            <Field label={copy.fields.displayName} icon={UserRound}>
              <Input
                name="displayName"
                value={value.displayName}
                onChange={(event) => setField("displayName", event.target.value)}
                placeholder={copy.placeholders.displayName}
                required
              />
            </Field>
            <Field label={copy.fields.addressText} icon={Home}>
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                <Input
                  name="addressText"
                  value={value.addressText}
                  onChange={(event) => setField("addressText", event.target.value)}
                  placeholder={copy.placeholders.addressText}
                  required
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={useCurrentLocation}
                  disabled={locationStatus === "loading"}
                  className="whitespace-nowrap"
                >
                  {locationStatus === "loading" ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <LocateFixed className="size-4" />
                  )}
                  {locationStatus === "loading" ? copy.locating : copy.useLocation}
                </Button>
              </div>
              {locationMessage ? (
                <div
                  className={`rounded-xl border px-3 py-2 text-xs font-medium ${
                    locationStatus === "success"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : locationStatus === "error"
                        ? "border-amber-200 bg-amber-50 text-amber-900"
                        : "border-slate-200 bg-slate-50 text-slate-700"
                  }`}
                >
                  {locationMessage}
                </div>
              ) : null}
            </Field>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <Field label={copy.fields.phone} icon={Phone}>
              <Input
                name="phone"
                value={value.phone}
                onChange={(event) => setField("phone", event.target.value)}
                placeholder={copy.placeholders.phone}
                inputMode="tel"
              />
            </Field>
            <Field label={copy.fields.email} icon={Mail}>
              <Input
                name="email"
                value={value.email}
                onChange={(event) => setField("email", event.target.value)}
                placeholder={copy.placeholders.email}
                inputMode="email"
              />
            </Field>
            <Field label={copy.fields.lineId} icon={MessageCircle}>
              <Input
                name="lineId"
                value={value.lineId}
                onChange={(event) => setField("lineId", event.target.value)}
                placeholder={copy.placeholders.lineId}
              />
            </Field>
          </div>

          <details className="rounded-[1.35rem] border border-border/70 bg-muted/20 p-4">
            <summary className="cursor-pointer list-none text-sm font-semibold text-slate-950 marker:hidden">
              {copy.optionalTitle}
              <span className="mt-1 block text-sm font-normal text-muted-foreground">
                {copy.optionalDescription}
              </span>
            </summary>
            <div className="mt-4 grid gap-4">
              <div className="grid gap-3 md:grid-cols-4">
                <Field label={copy.fields.age} icon={BrainCircuit}>
                  <Input
                    name="age"
                    value={value.age}
                    onChange={(event) => setField("age", event.target.value)}
                    placeholder={copy.placeholders.optional}
                    inputMode="numeric"
                  />
                </Field>
                <Field label={copy.fields.monthlyElectricityBillTHB} icon={Zap}>
                  <Input
                    name="monthlyElectricityBillTHB"
                    value={value.monthlyElectricityBillTHB}
                    onChange={(event) => setField("monthlyElectricityBillTHB", event.target.value)}
                    placeholder={copy.placeholders.monthlyBill}
                    inputMode="decimal"
                  />
                </Field>
                <Field label={copy.fields.annualElectricitySpendTHB} icon={Zap}>
                  <Input
                    name="annualElectricitySpendTHB"
                    value={value.annualElectricitySpendTHB}
                    onChange={(event) => setField("annualElectricitySpendTHB", event.target.value)}
                    placeholder={annualSpendHint}
                    inputMode="decimal"
                  />
                </Field>
                <Field label={copy.fields.annualIncomeTHB} icon={BrainCircuit}>
                  <Input
                    name="annualIncomeTHB"
                    value={value.annualIncomeTHB}
                    onChange={(event) => setField("annualIncomeTHB", event.target.value)}
                    placeholder={copy.placeholders.optional}
                    inputMode="decimal"
                  />
                </Field>
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-semibold text-slate-900">{copy.fields.educationBackground}</label>
                <select
                  name="educationBackground"
                  value={value.educationBackground}
                  onChange={(event) => setField("educationBackground", event.target.value)}
                  className="h-11 rounded-xl border border-input bg-background px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                >
                  {EDUCATION_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {copy.educationOptions[option.id]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-semibold text-slate-900">{copy.fields.largeAppliances}</label>
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
                        {copy.applianceOptions[option.id]}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-semibold text-slate-900">{copy.fields.notes}</label>
                <textarea
                  name="notes"
                  value={value.notes}
                  onChange={(event) => setField("notes", event.target.value)}
                  placeholder={copy.placeholders.notes}
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
            <p className="text-sm leading-6 text-muted-foreground">{copy.requiredRule}</p>
            <Button type="submit" variant="outline" disabled={!validation.ready || isSaving} className="min-w-[150px]">
              <Save className="size-4" />
              {isSaving ? copy.saving : copy.save}
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
    <div className="grid gap-2">
      <span className="flex items-center gap-2 text-sm font-semibold text-slate-900">
        <Icon className="size-4 text-emerald-600" />
        {label}
      </span>
      {children}
    </div>
  );
}

function formatMoney(value: number) {
  if (!Number.isFinite(value)) {
    return "";
  }

  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

function formatCoordinates(latitude: number, longitude: number) {
  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
}
