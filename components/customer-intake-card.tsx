"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  BrainCircuit,
  CheckCircle2,
  Home,
  LoaderCircle,
  LocateFixed,
  Mail,
  MessageCircle,
  Phone,
  UserRound,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  EDUCATION_OPTIONS,
  getCustomerIntakeCompletion,
  getCustomerIntakeCopy,
  LARGE_APPLIANCE_OPTIONS,
  validateCustomerIntake,
  type CustomerIntake,
  type CustomerIntakeSaveState,
  type LargeApplianceType,
} from "@/lib/customer-intake";
import type { AppLocale } from "@/lib/i18n";

interface CustomerIntakeCardProps {
  value: CustomerIntake;
  onChange: (value: CustomerIntake) => void;
  locale: AppLocale;
  saveState: CustomerIntakeSaveState;
  isSaving?: boolean;
}

type LocationStatus = "idle" | "loading" | "success" | "error";

export function CustomerIntakeCard({ value, onChange, locale, saveState, isSaving = false }: CustomerIntakeCardProps) {
  const copy = getCustomerIntakeCopy(locale);
  const fieldId = useId();
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("idle");
  const [locationMessage, setLocationMessage] = useState("");
  const locationRequestIdRef = useRef(0);
  const latestValueRef = useRef(value);
  const latestOnChangeRef = useRef(onChange);
  latestValueRef.current = value;
  latestOnChangeRef.current = onChange;
  const commitValue = (nextValue: CustomerIntake) => {
    latestValueRef.current = nextValue;
    latestOnChangeRef.current(nextValue);
  };

  useEffect(
    () => () => {
      locationRequestIdRef.current += 1;
    },
    [],
  );

  const completion = useMemo(() => getCustomerIntakeCompletion(value, locale), [locale, value]);
  const validation = useMemo(() => validateCustomerIntake(value, locale), [locale, value]);
  const annualSpendHint = value.monthlyElectricityBillTHB
    ? `${formatMoney(Number(value.monthlyElectricityBillTHB) * 12)} THB/year`
    : copy.annualSpendHint;
  const consentCopy =
    locale === "zh"
      ? {
          link: "在新标签页查看隐私说明",
          locationRequired: "请先确认客户同意，再读取或发送精确位置。",
          required: "必选",
          statement:
            "我确认销售人员已获得客户同意，将其联系方式、用电资料、收入、教育背景和精确位置保存到 KSolar CRM，仅用于制作报价和销售跟进。",
        }
      : locale === "th"
        ? {
            link: "อ่านคำชี้แจงความเป็นส่วนตัวในแท็บใหม่",
            locationRequired: "กรุณายืนยันความยินยอมของลูกค้าก่อนอ่านหรือส่งตำแหน่งที่แม่นยำ",
            required: "จำเป็น",
            statement:
              "ฉันยืนยันว่าพนักงานขายได้รับความยินยอมจากลูกค้าแล้ว ให้บันทึกข้อมูลติดต่อ ข้อมูลการใช้ไฟฟ้า รายได้ ระดับการศึกษา และตำแหน่งที่แม่นยำไว้ใน KSolar CRM เพื่อจัดทำใบเสนอราคาและติดตามงานขายเท่านั้น",
          }
        : {
            link: "Read the privacy notice in a new tab",
            locationRequired: "Confirm the customer's consent before reading or sending a precise location.",
            required: "Required",
            statement:
              "I confirm that the salesperson has obtained the customer's agreement to save their contact details, electricity-use data, income, education background, and precise location in the KSolar CRM solely to prepare quotes and conduct sales follow-up.",
          };
  const ids = {
    addressText: `${fieldId}-address`,
    age: `${fieldId}-age`,
    annualElectricitySpendTHB: `${fieldId}-annual-electricity-spend`,
    annualIncomeTHB: `${fieldId}-annual-income`,
    consent: `${fieldId}-consent`,
    consentDescription: `${fieldId}-consent-description`,
    displayName: `${fieldId}-display-name`,
    educationBackground: `${fieldId}-education-background`,
    email: `${fieldId}-email`,
    lineId: `${fieldId}-line-id`,
    locationStatus: `${fieldId}-location-status`,
    monthlyElectricityBillTHB: `${fieldId}-monthly-electricity-bill`,
    notes: `${fieldId}-notes`,
    phone: `${fieldId}-phone`,
  };

  const setField = (
    key: Exclude<keyof CustomerIntake, "largeAppliances" | "applianceQuantities" | "consentToContact">,
    nextValue: string,
  ) => {
    if (key === "addressText" && nextValue !== value.addressText) {
      locationRequestIdRef.current += 1;
      setLocationStatus("idle");
      setLocationMessage("");
      commitValue({
        ...value,
        addressText: nextValue,
        latitude: "",
        longitude: "",
      });
      return;
    }

    if (key === "monthlyElectricityBillTHB") {
      const monthlyBill = Number(nextValue);
      commitValue({
        ...value,
        monthlyElectricityBillTHB: nextValue,
        annualElectricitySpendTHB: Number.isFinite(monthlyBill) && monthlyBill > 0 ? String(Math.round(monthlyBill * 12)) : "",
      });
      return;
    }

    commitValue({ ...value, [key]: nextValue });
  };

  const toggleAppliance = (appliance: LargeApplianceType) => {
    const nextAppliances = value.largeAppliances.includes(appliance)
      ? value.largeAppliances.filter((item) => item !== appliance)
      : [...value.largeAppliances, appliance];

    commitValue({
      ...value,
      largeAppliances: nextAppliances,
      applianceQuantities: {
        ...value.applianceQuantities,
        [appliance]: value.applianceQuantities[appliance] || "1",
      },
    });
  };

  const setApplianceQuantity = (appliance: LargeApplianceType, nextValue: string) => {
    commitValue({
      ...value,
      applianceQuantities: {
        ...value.applianceQuantities,
        [appliance]: nextValue,
      },
    });
  };

  const useCurrentLocation = () => {
    if (!latestValueRef.current.consentToContact) {
      setLocationStatus("error");
      setLocationMessage(consentCopy.locationRequired);
      return;
    }

    if (!navigator.geolocation) {
      setLocationStatus("error");
      setLocationMessage(copy.locationNoBrowser);
      return;
    }

    setLocationStatus("loading");
    setLocationMessage(copy.locating);
    const requestId = locationRequestIdRef.current + 1;
    locationRequestIdRef.current = requestId;
    const addressAtRequest = latestValueRef.current.addressText;
    const isCurrentRequest = () => locationRequestIdRef.current === requestId;

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        if (!isCurrentRequest()) {
          return;
        }

        const valueBeforeLookup = latestValueRef.current;

        if (!valueBeforeLookup.consentToContact) {
          setLocationStatus("error");
          setLocationMessage(consentCopy.locationRequired);
          return;
        }

        const latitude = Number(position.coords.latitude.toFixed(7));
        const longitude = Number(position.coords.longitude.toFixed(7));
        let addressText = valueBeforeLookup.addressText.trim() || formatCoordinates(latitude, longitude);

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
          addressText = valueBeforeLookup.addressText.trim() || formatCoordinates(latitude, longitude);
        }

        if (!isCurrentRequest()) {
          return;
        }

        const latestValue = latestValueRef.current;

        if (!latestValue.consentToContact) {
          setLocationStatus("error");
          setLocationMessage(consentCopy.locationRequired);
          return;
        }

        commitValue({
          ...latestValue,
          addressText: latestValue.addressText !== addressAtRequest ? latestValue.addressText : addressText,
          latitude: String(latitude),
          longitude: String(longitude),
        });
        setLocationStatus("success");
        setLocationMessage(copy.locationCaptured);
      },
      (error) => {
        if (!isCurrentRequest()) {
          return;
        }

        if (!latestValueRef.current.consentToContact) {
          setLocationStatus("error");
          setLocationMessage(consentCopy.locationRequired);
          return;
        }

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
            role="status"
            aria-live="polite"
            aria-atomic="true"
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
        <div className="grid gap-4">
          <div className="grid gap-3 md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            <Field htmlFor={ids.displayName} label={copy.fields.displayName} icon={UserRound}>
              <Input
                id={ids.displayName}
                name="displayName"
                value={value.displayName}
                onChange={(event) => setField("displayName", event.target.value)}
                placeholder={copy.placeholders.displayName}
                required
              />
            </Field>
            <Field htmlFor={ids.addressText} label={copy.fields.addressText} icon={Home}>
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                <Input
                  id={ids.addressText}
                  name="addressText"
                  value={value.addressText}
                  onChange={(event) => setField("addressText", event.target.value)}
                  placeholder={copy.placeholders.addressText}
                  required
                  aria-describedby={locationMessage ? ids.locationStatus : undefined}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={useCurrentLocation}
                  disabled={locationStatus === "loading"}
                  className="whitespace-nowrap"
                  aria-describedby={`${ids.consentDescription}${locationMessage ? ` ${ids.locationStatus}` : ""}`}
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
                  id={ids.locationStatus}
                  role={locationStatus === "error" ? "alert" : "status"}
                  aria-live={locationStatus === "error" ? "assertive" : "polite"}
                  aria-atomic="true"
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
            <Field htmlFor={ids.phone} label={copy.fields.phone} icon={Phone}>
              <Input
                id={ids.phone}
                name="phone"
                value={value.phone}
                onChange={(event) => setField("phone", event.target.value)}
                placeholder={copy.placeholders.phone}
                inputMode="tel"
              />
            </Field>
            <Field htmlFor={ids.email} label={copy.fields.email} icon={Mail}>
              <Input
                id={ids.email}
                name="email"
                value={value.email}
                onChange={(event) => setField("email", event.target.value)}
                placeholder={copy.placeholders.email}
                inputMode="email"
              />
            </Field>
            <Field htmlFor={ids.lineId} label={copy.fields.lineId} icon={MessageCircle}>
              <Input
                id={ids.lineId}
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
                <Field htmlFor={ids.age} label={copy.fields.age} icon={BrainCircuit}>
                  <Input
                    id={ids.age}
                    name="age"
                    value={value.age}
                    onChange={(event) => setField("age", event.target.value)}
                    placeholder={copy.placeholders.optional}
                    inputMode="numeric"
                  />
                </Field>
                <Field htmlFor={ids.monthlyElectricityBillTHB} label={copy.fields.monthlyElectricityBillTHB} icon={Zap}>
                  <Input
                    id={ids.monthlyElectricityBillTHB}
                    name="monthlyElectricityBillTHB"
                    value={value.monthlyElectricityBillTHB}
                    onChange={(event) => setField("monthlyElectricityBillTHB", event.target.value)}
                    placeholder={copy.placeholders.monthlyBill}
                    inputMode="decimal"
                  />
                </Field>
                <Field htmlFor={ids.annualElectricitySpendTHB} label={copy.fields.annualElectricitySpendTHB} icon={Zap}>
                  <Input
                    id={ids.annualElectricitySpendTHB}
                    name="annualElectricitySpendTHB"
                    value={value.annualElectricitySpendTHB}
                    onChange={(event) => setField("annualElectricitySpendTHB", event.target.value)}
                    placeholder={annualSpendHint}
                    inputMode="decimal"
                  />
                </Field>
                <Field htmlFor={ids.annualIncomeTHB} label={copy.fields.annualIncomeTHB} icon={BrainCircuit}>
                  <Input
                    id={ids.annualIncomeTHB}
                    name="annualIncomeTHB"
                    value={value.annualIncomeTHB}
                    onChange={(event) => setField("annualIncomeTHB", event.target.value)}
                    placeholder={copy.placeholders.optional}
                    inputMode="decimal"
                  />
                </Field>
              </div>

              <div className="grid gap-2">
                <label htmlFor={ids.educationBackground} className="text-sm font-semibold text-slate-900">
                  {copy.fields.educationBackground}
                </label>
                <select
                  id={ids.educationBackground}
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

              <fieldset className="grid gap-2">
                <legend className="text-sm font-semibold text-slate-900">{copy.fields.largeAppliances}</legend>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                  {LARGE_APPLIANCE_OPTIONS.map((option) => {
                    const checked = value.largeAppliances.includes(option.id);
                    const applianceId = `${fieldId}-appliance-${option.id}`;
                    const quantityId = `${applianceId}-quantity`;

                    return (
                      <div
                        key={option.id}
                        className={`rounded-2xl border text-center text-sm font-semibold transition focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 ${
                          checked
                            ? "border-slate-950 bg-slate-950 text-white shadow-[0_14px_30px_rgba(15,23,42,0.18)]"
                            : "border-border bg-white/75 text-slate-700 hover:border-slate-300"
                        }`}
                      >
                        <label
                          htmlFor={applianceId}
                          className="flex min-h-11 cursor-pointer items-center justify-center gap-2 px-3 py-3"
                        >
                          <input
                            id={applianceId}
                            type="checkbox"
                            name="largeAppliances"
                            value={option.id}
                            checked={checked}
                            onChange={() => toggleAppliance(option.id)}
                            className="sr-only"
                          />
                          {checked ? <CheckCircle2 className="size-4" aria-hidden="true" /> : null}
                          <span>{copy.applianceOptions[option.id]}</span>
                        </label>
                        {checked ? (
                          <div className="flex items-center justify-center gap-2 border-t border-white/15 px-3 pb-3 pt-2 text-xs">
                            <label htmlFor={quantityId}>{copy.fields.applianceQuantity}</label>
                            <input
                              id={quantityId}
                              name={`applianceQuantity.${option.id}`}
                              value={value.applianceQuantities[option.id] || "1"}
                              onChange={(event) => setApplianceQuantity(option.id, event.target.value)}
                              min={1}
                              max={50}
                              inputMode="numeric"
                              type="number"
                              className="h-11 w-16 rounded-lg border border-white/25 bg-white/95 px-2 text-center text-sm font-semibold text-slate-950 outline-none focus:ring-2 focus:ring-white"
                            />
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </fieldset>

              <div className="grid gap-2">
                <label htmlFor={ids.notes} className="text-sm font-semibold text-slate-900">
                  {copy.fields.notes}
                </label>
                <textarea
                  id={ids.notes}
                  name="notes"
                  value={value.notes}
                  onChange={(event) => setField("notes", event.target.value)}
                  placeholder={copy.placeholders.notes}
                  className="min-h-24 rounded-2xl border border-input bg-background px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                />
              </div>
            </div>
          </details>

          <div
            className={`rounded-2xl border px-4 py-4 ${
              value.consentToContact
                ? "border-emerald-200 bg-emerald-50/80"
                : "border-amber-300 bg-amber-50"
            }`}
          >
            <div className="flex items-start gap-3">
              <input
                id={ids.consent}
                type="checkbox"
                name="consentToContact"
                checked={value.consentToContact}
                onChange={(event) => {
                  const checked = event.target.checked;

                  if (!checked) {
                    locationRequestIdRef.current += 1;
                  }

                  commitValue({
                    ...latestValueRef.current,
                    consentToContact: checked,
                    latitude: checked ? latestValueRef.current.latitude : "",
                    longitude: checked ? latestValueRef.current.longitude : "",
                  });

                  if (!checked && locationStatus === "loading") {
                    setLocationStatus("error");
                    setLocationMessage(consentCopy.locationRequired);
                  }
                }}
                required
                aria-required="true"
                aria-invalid={!value.consentToContact}
                aria-describedby={ids.consentDescription}
                className="mt-1 size-5 shrink-0 accent-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
              <div className="grid gap-2">
                <label htmlFor={ids.consent} className="cursor-pointer text-sm font-semibold leading-6 text-slate-950">
                  {consentCopy.statement} <span className="text-red-700">({consentCopy.required})</span>
                </label>
                <p id={ids.consentDescription} className="text-sm leading-6 text-slate-700">
                  <Link
                    href="/privacy"
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-emerald-800 underline decoration-emerald-400 underline-offset-4 hover:text-emerald-950"
                  >
                    {consentCopy.link}
                  </Link>
                </p>
              </div>
            </div>
          </div>

          {saveState.message ? (
            <div
              role={saveState.status === "error" ? "alert" : "status"}
              aria-live={saveState.status === "error" ? "assertive" : "polite"}
              aria-atomic="true"
              className={`rounded-2xl border px-4 py-3 text-sm font-medium leading-6 ${
                saveState.status === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : "border-red-200 bg-red-50 text-red-900"
              }`}
            >
              {saveState.message}
            </div>
          ) : null}

          <div
            className="rounded-2xl border border-border/70 bg-muted/20 px-4 py-3 text-sm leading-6 text-muted-foreground"
            role="status"
            aria-live="polite"
            aria-atomic="true"
            aria-busy={isSaving}
          >
            {isSaving ? (
              <span className="inline-flex items-center gap-2 font-medium text-slate-900">
                <LoaderCircle className="size-4 animate-spin" />
                {copy.saving}
              </span>
            ) : (
              copy.autoSaveRule
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Field({
  htmlFor,
  label,
  icon: Icon,
  children,
}: {
  htmlFor: string;
  label: string;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <label htmlFor={htmlFor} className="flex items-center gap-2 text-sm font-semibold text-slate-900">
        <Icon className="size-4 text-emerald-600" aria-hidden="true" />
        {label}
      </label>
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
