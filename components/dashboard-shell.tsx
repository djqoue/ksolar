"use client";

import Link from "next/link";
import { startTransition, useEffect, useMemo, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, LoaderCircle, MapPinned, type LucideIcon, Settings2, Sparkles, UserRound } from "lucide-react";
import { saveCustomerIntakeValue } from "@/app/(sales)/customer-intake/actions";
import { LocaleProvider, useAppCopy, useLocaleContext } from "@/components/locale-provider";
import { Map } from "@/components/Map";
import { CustomerIntakeCard } from "@/components/customer-intake-card";
import { FinanceSelector } from "@/components/finance-selector";
import { QuoteResults } from "@/components/quote-results";
import { RoofReviewMap } from "@/components/roof-review-map";
import { SystemSelector } from "@/components/system-selector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isSupabaseConfigured } from "@/lib/auth/supabase-config";
import { calculateQuoteScenario } from "@/lib/calc";
import { FINANCE_PRODUCTS } from "@/lib/config/finance-products";
import { DEFAULT_PANEL_ID, findPanel, getPanelAreaM2 } from "@/lib/config/panel-catalog";
import { CAPACITY_TIERS, DEFAULT_TOPOLOGY, SOLAR_DEFAULTS } from "@/lib/config/solar";
import {
  getCustomerIntakeCopy,
  initialCustomerIntake,
  initialCustomerIntakeSaveState,
  validateCustomerIntake,
} from "@/lib/customer-intake";
import { getLocalizedPresetMeta, LANGUAGE_OPTIONS, LOCALE_COOKIE_NAME, type AppLocale } from "@/lib/i18n";
import { createEmptyMapSelection } from "@/lib/maps";
import { requestSolarDataLayers, requestSolarInsights, SolarApiError } from "@/lib/solar-client";
import {
  buildSolarSelectionMatchSummary,
  getGoogleSolarSellableAnnualGeneration,
  getGoogleSolarSellableFit,
  getSelectionReferencePoint,
  type SellablePanelProfile,
} from "@/lib/solar";
import { formatNumber } from "@/lib/utils";
import type { MapSelectionSummary, PricingPreset } from "@/types/quote";
import type { CapacityTierId, SystemTopology } from "@/types/bom";
import type { GoogleSolarDataLayerPaths, GoogleSolarSummary, SolarLatLng } from "@/types/solar";

type StepNumber = 1 | 2 | 3 | 4;

interface WorkflowStepState {
  number: StepNumber;
  title: string;
  description: string;
  done: boolean;
  unlocked: boolean;
  icon: LucideIcon;
  tone: string;
}

interface StageFrameProps {
  icon: LucideIcon;
  stepNumber: StepNumber;
  tone: string;
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
}

interface DashboardShellProps {
  initialLocale?: AppLocale;
}

export function DashboardShell({ initialLocale = "zh" }: DashboardShellProps) {
  const [locale, setLocale] = useState<AppLocale>(initialLocale);

  return (
    <LocaleProvider locale={locale} setLocale={setLocale}>
      <DashboardShellContent />
    </LocaleProvider>
  );
}

function DashboardShellContent() {
  const { locale, setLocale } = useLocaleContext();
  const copy = useAppCopy();
  const customerCopy = getCustomerIntakeCopy(locale);
  const [mapSelection, setMapSelection] = useState<MapSelectionSummary>(createEmptyMapSelection());
  const [topology, setTopology] = useState(DEFAULT_TOPOLOGY);
  const [pricingPresetId, setPricingPresetId] = useState<PricingPreset["id"]>("standard");
  const [selectedPanelId, setSelectedPanelId] = useState<string>(DEFAULT_PANEL_ID);
  const [selectedInverterId, setSelectedInverterId] = useState<string>("auto");
  const [selectedBatteryId, setSelectedBatteryId] = useState<string>("auto");
  const [selectedTierId, setSelectedTierId] = useState<CapacityTierId | null>(null);
  const [customerIntake, setCustomerIntake] = useState(initialCustomerIntake);
  const [customerSaveState, setCustomerSaveState] = useState(initialCustomerIntakeSaveState);
  const [isAutoSavingCustomer, setIsAutoSavingCustomer] = useState(false);
  const [selectedFinanceIds, setSelectedFinanceIds] = useState(
    FINANCE_PRODUCTS.filter((product) => product.enabledByDefault).map((product) => product.id),
  );
  const [activeStep, setActiveStep] = useState<StepNumber>(1);
  const [mapFlyoverRequestId, setMapFlyoverRequestId] = useState(0);
  const [ftRateTHBPerKWh, setFtRateTHBPerKWh] = useState<number>(SOLAR_DEFAULTS.defaultFtRateTHBPerKWh);
  const [selfConsumptionRatio, setSelfConsumptionRatio] = useState<number>(SOLAR_DEFAULTS.defaultSelfConsumptionRatio);
  const [exportRateTHBPerKWh, setExportRateTHBPerKWh] = useState<number>(SOLAR_DEFAULTS.defaultExportRateTHBPerKWh);
  const [mapCenter, setMapCenter] = useState<SolarLatLng | null>(null);
  const [solarInsights, setSolarInsights] = useState<GoogleSolarSummary | null>(null);
  const [solarInsightsKey, setSolarInsightsKey] = useState<string | null>(null);
  const [solarDataLayers, setSolarDataLayers] = useState<GoogleSolarDataLayerPaths | null>(null);
  const [solarDataLayersKey, setSolarDataLayersKey] = useState<string | null>(null);
  const [solarStatus, setSolarStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [solarErrorMessage, setSolarErrorMessage] = useState<string | null>(null);
  const crmEnabled = isSupabaseConfigured();
  const allowCustomerIntakeSkip =
    process.env.NODE_ENV !== "production" ||
    process.env.NEXT_PUBLIC_ALLOW_CUSTOMER_INTAKE_SKIP === "true";

  const customerValidation = useMemo(() => validateCustomerIntake(customerIntake, locale), [customerIntake, locale]);
  const customerDone = allowCustomerIntakeSkip || (customerValidation.ready && customerSaveState.status === "success");
  const roofDone = mapSelection.grossAreaM2 > 0;
  const step1Done = customerDone;
  const step2Done = roofDone;
  const step3Done = roofDone;
  const maxUnlockedStep: StepNumber = roofDone ? 4 : customerDone ? 2 : 1;

  useEffect(() => {
    if (activeStep > maxUnlockedStep) {
      setActiveStep(maxUnlockedStep);
    }
  }, [activeStep, maxUnlockedStep]);

  const solarRequestPoint = useMemo(
    () => getSelectionReferencePoint(mapSelection.shapes) || mapCenter,
    [mapSelection.shapes, mapCenter],
  );

  const solarRequestKey = solarRequestPoint
    ? `${solarRequestPoint.latitude.toFixed(6)}:${solarRequestPoint.longitude.toFixed(6)}`
    : null;

  const activeSolarInsights = solarInsightsKey && solarRequestKey && solarInsightsKey === solarRequestKey ? solarInsights : null;
  const activeSolarDataLayers =
    solarDataLayersKey && solarRequestKey && solarDataLayersKey === solarRequestKey ? solarDataLayers : null;
  const solarNeedsRefresh = Boolean(solarRequestKey && solarInsightsKey && solarInsightsKey !== solarRequestKey);

  const solarSelectionMatch = useMemo(
    () => buildSolarSelectionMatchSummary(mapSelection.shapes, activeSolarInsights),
    [activeSolarInsights, mapSelection.shapes],
  );
  const selectedPanelProfile = useMemo<SellablePanelProfile>(() => {
    const panel = findPanel(selectedPanelId) ?? findPanel(DEFAULT_PANEL_ID);

    return {
      powerWp: panel?.peakPowerW || SOLAR_DEFAULTS.panelPowerWp,
      areaM2: getPanelAreaM2(panel) || SOLAR_DEFAULTS.panelAreaM2,
    };
  }, [selectedPanelId]);

  const result = useMemo(() => {
    const googleSellableFit = getGoogleSolarSellableFit(activeSolarInsights, selectedPanelProfile);
    const googleSellableAnnualGeneration = getGoogleSolarSellableAnnualGeneration(
      activeSolarInsights,
      selectedPanelProfile,
    );

    return calculateQuoteScenario({
      map: mapSelection,
      topology,
      pricingPresetId,
      selectedTierId,
      selectedFinanceIds,
      ftRateTHBPerKWh,
      selfConsumptionRatio,
      exportRateTHBPerKWh,
      googleMatchedRoof: solarSelectionMatch.status === "inside-selection",
      googleSellableFitWp: googleSellableFit.equivalentKw ? googleSellableFit.equivalentKw * 1000 : null,
      googleSellablePanelCount: googleSellableFit.equivalentPanelCount,
      googleAnnualGenerationKWh: googleSellableAnnualGeneration,
      selectedPanelId,
      selectedInverterId,
      selectedBatteryId,
    });
  }, [
    exportRateTHBPerKWh,
    ftRateTHBPerKWh,
    mapSelection,
    pricingPresetId,
    selectedFinanceIds,
    selectedTierId,
    selfConsumptionRatio,
    activeSolarInsights,
    solarSelectionMatch.status,
    topology,
    selectedPanelId,
    selectedPanelProfile,
    selectedInverterId,
    selectedBatteryId,
  ]);
  const step4Done = roofDone && (result.isViable || result.warnings.length > 0);

  const availableQuoteTiers = useMemo(
    () =>
      CAPACITY_TIERS.filter((tier) => {
        const allowedByPhase =
          topology.phase === "1P"
            ? ["3kW", "5kW", "10kW"].includes(tier.id)
            : ["5kW", "10kW", "15kW", "20kW"].includes(tier.id);

        return allowedByPhase && tier.panelCount <= result.roofFitPanelCount;
      }),
    [result.roofFitPanelCount, topology.phase],
  );

  useEffect(() => {
    if (!selectedTierId) {
      return;
    }

    if (!availableQuoteTiers.some((tier) => tier.id === selectedTierId)) {
      setSelectedTierId(null);
    }
  }, [availableQuoteTiers, selectedTierId]);

  const steps = useMemo<WorkflowStepState[]>(
    () => [
      {
        number: 1,
        title: customerCopy.title,
        description: customerCopy.description,
        done: step1Done,
        unlocked: true,
        icon: UserRound,
        tone: "bg-primary text-primary-foreground",
      },
      {
        number: 2,
        title: copy.workflow.step1Title,
        description: copy.workflow.step1Description,
        done: step2Done,
        unlocked: step1Done,
        icon: MapPinned,
        tone: "bg-secondary text-secondary-foreground",
      },
      {
        number: 3,
        title: copy.workflow.step2Title,
        description: copy.workflow.step3Description,
        done: step3Done,
        unlocked: step2Done,
        icon: Settings2,
        tone: "bg-accent text-accent-foreground",
      },
      {
        number: 4,
        title: copy.workflow.step4Title,
        description: copy.workflow.step4Description,
        done: step4Done,
        unlocked: step2Done,
        icon: Sparkles,
        tone: "bg-slate-900 text-white",
      },
    ],
    [
      customerCopy.description,
      customerCopy.title,
      copy.workflow.step1Description,
      copy.workflow.step1Title,
      copy.workflow.step2Title,
      copy.workflow.step3Description,
      copy.workflow.step4Description,
      copy.workflow.step4Title,
      step1Done,
      step2Done,
      step3Done,
      step4Done,
    ],
  );

  const progressPercent = useMemo(() => {
    if (step4Done) {
      return 100;
    }

    if (step2Done) {
      return 75;
    }

    if (step1Done) {
      return 50;
    }

    return 25;
  }, [step1Done, step2Done, step4Done]);

  const activeStepState = steps.find((step) => step.number === activeStep) ?? steps[0];
  const isImmersiveStep = activeStep === 2 || activeStep === 3;
  const pricingMeta = getLocalizedPresetMeta(locale, pricingPresetId);
  const stepShortLabels =
    locale === "zh"
      ? ["客户", "屋顶", "方案", "报价"]
      : locale === "th"
        ? ["ลูกค้า", "หลังคา", "ระบบ", "ราคา"]
        : ["Customer", "Roof", "System", "Quote"];

  const topologySummary = [
    topology.phase === "1P" ? copy.system.singlePhase : copy.system.threePhase,
    topology.mode === "ongrid" ? copy.system.ongrid : copy.system.hybrid,
    topology.batteryMode === "with_battery" ? copy.system.withBattery : copy.system.noBattery,
  ].join(" · ");

  const roofSummaryItems = [
    {
      label: customerCopy.title,
      value: customerValidation.ready ? customerCopy.ready : customerCopy.missingPrefix,
    },
    {
      label: copy.solar.roofSelectionCount,
      value: mapSelection.shapes.length > 0 ? formatNumber(mapSelection.shapes.length) : "0",
    },
    {
      label: copy.map.grossArea,
      value: mapSelection.grossAreaM2 > 0 ? `${formatNumber(mapSelection.grossAreaM2, 1)} m²` : "N/A",
    },
    {
      label: copy.map.usableArea,
      value: mapSelection.usableAreaM2 > 0 ? `${formatNumber(mapSelection.usableAreaM2, 1)} m²` : "N/A",
    },
    {
      label: copy.quote.roofFitSize,
      value: result.roofFitSystemWp > 0 ? `${formatNumber(result.roofFitSystemWp / 1000, 2)} kWp` : "N/A",
    },
    {
      label: copy.quote.roofPotentialGeneration,
      value:
        result.roofPotentialAnnualGenerationKWh > 0
          ? `${formatNumber(result.roofPotentialAnnualGenerationKWh)} kWh`
          : "N/A",
    },
  ];

  const step3Copy =
    locale === "zh"
      ? {
          title: "确认方案",
          eyebrow: "步骤 3 · 系统校准",
          description: "在同一张地图上核对屋顶、Google Solar 和报价容量，只保留现场最常用的调整项。",
          solarReady: "Google Solar 已匹配",
          solarLoading: "Google Solar 分析中",
          solarWarning: "Google Solar 需复核",
          solarWaiting: "等待 Google Solar",
          refresh: "刷新校验",
          editRoof: "重画屋顶",
          quoteSize: "报价容量",
          annualGeneration: "年发电量",
          payback: "回本周期",
          investment: "总投资",
          phase: "电表相位",
          systemMode: "系统模式",
          battery: "电池策略",
          noBattery: "不带电池",
          withBattery: "带电池",
          fieldReady: "现场默认",
          advancedSystem: "展开设备和价格档",
          advancedSystemHint: "需要换组件、逆变器、价格档或电池型号时再打开。",
          advancedFinance: "展开金融和电价",
          advancedFinanceHint: "需要调整 FT、自用比例、上网电价或贷款产品时再打开。",
        }
      : locale === "th"
        ? {
            title: "ยืนยันแพ็กเกจ",
            eyebrow: "ขั้นตอน 3 · ปรับระบบ",
            description: "ตรวจหลังคา Google Solar และขนาดระบบบนแผนที่เดียว เหลือเฉพาะตัวเลือกที่ใช้หน้างานจริง",
            solarReady: "Google Solar ตรงกับหลังคา",
            solarLoading: "กำลังวิเคราะห์ Google Solar",
            solarWarning: "ควรตรวจ Google Solar",
            solarWaiting: "รอ Google Solar",
            refresh: "ตรวจใหม่",
            editRoof: "แก้หลังคา",
            quoteSize: "ขนาดระบบ",
            annualGeneration: "ไฟผลิตต่อปี",
            payback: "คืนทุน",
            investment: "เงินลงทุน",
            phase: "เฟสไฟ",
            systemMode: "โหมดระบบ",
            battery: "แบตเตอรี่",
            noBattery: "ไม่มีแบต",
            withBattery: "มีแบต",
            fieldReady: "ค่าเริ่มต้น",
            advancedSystem: "อุปกรณ์และราคา",
            advancedSystemHint: "เปิดเมื่อเปลี่ยนแผง อินเวอร์เตอร์ ระดับราคา หรือแบตเตอรี่",
            advancedFinance: "การเงินและค่าไฟ",
            advancedFinanceHint: "เปิดเมื่อปรับ FT สัดส่วนใช้เอง ค่าไฟขายคืน หรือสินเชื่อ",
          }
        : {
            title: "Confirm setup",
            eyebrow: "Step 3 · System calibration",
            description: "Validate the roof, Google Solar signal, and quote size on one map with only field-critical controls.",
            solarReady: "Google Solar matched",
            solarLoading: "Google Solar analyzing",
            solarWarning: "Google Solar needs review",
            solarWaiting: "Waiting for Google Solar",
            refresh: "Refresh check",
            editRoof: "Edit roof",
            quoteSize: "Quote size",
            annualGeneration: "Annual generation",
            payback: "Payback",
            investment: "Investment",
            phase: "Phase",
            systemMode: "System mode",
            battery: "Battery",
            noBattery: "No battery",
            withBattery: "With battery",
            fieldReady: "Field default",
            advancedSystem: "Open equipment and price tier",
            advancedSystemHint: "Use when changing panels, inverter, price tier, or battery model.",
            advancedFinance: "Open finance and tariff",
            advancedFinanceHint: "Use when adjusting FT, self-use, export rate, or loan products.",
          };

  const solarStateLabel =
    solarStatus === "loading"
      ? step3Copy.solarLoading
      : activeSolarInsights
        ? step3Copy.solarReady
        : solarErrorMessage
          ? step3Copy.solarWarning
          : step3Copy.solarWaiting;

  const fetchSolarData = async (requestPoint: SolarLatLng, requestKey: string) => {
    setSolarStatus("loading");
    setSolarErrorMessage(null);

    try {
      const payload = await requestSolarInsights(requestPoint);
      setSolarInsights(payload);
      setSolarInsightsKey(requestKey);
      try {
        const dataLayers = await requestSolarDataLayers(requestPoint);
        setSolarDataLayers(dataLayers);
        setSolarDataLayersKey(requestKey);
      } catch (error) {
        setSolarDataLayers(null);
        setSolarDataLayersKey(null);
        setSolarErrorMessage(
          error instanceof SolarApiError
            ? getLocalizedGoogleSolarError(locale, error, "data-layers")
            : error instanceof Error
              ? error.message
              : "Google Solar data layers failed to load.",
        );
      }
      setSolarStatus("success");
    } catch (error) {
      setSolarInsights(null);
      setSolarInsightsKey(null);
      setSolarDataLayers(null);
      setSolarDataLayersKey(null);
      setSolarStatus("error");
      setSolarErrorMessage(
        error instanceof SolarApiError
          ? getLocalizedGoogleSolarError(locale, error, "building-insights")
          : error instanceof Error
            ? error.message
            : "Unknown Google Solar error.",
      );
    }
  };

  useEffect(() => {
    if (!solarRequestKey || !solarRequestPoint) {
      setSolarInsights(null);
      setSolarInsightsKey(null);
      setSolarDataLayers(null);
      setSolarDataLayersKey(null);
      setSolarStatus("idle");
      setSolarErrorMessage(null);
      return;
    }
  }, [solarRequestKey, solarRequestPoint]);

  const moveToStep = (step: StepNumber) => {
    const next = steps.find((item) => item.number === step);
    if (!next?.unlocked) {
      return;
    }

    setActiveStep(step);
  };

  const handleMapSelectionChange = (value: MapSelectionSummary) => {
    setMapSelection(value);
  };

  const handleTopologyChange = (value: SystemTopology) => {
    setTopology(value);
  };

  const handlePricingPresetChange = (value: PricingPreset["id"]) => {
    setPricingPresetId(value);
  };

  const handleFinanceChange = (ids: string[]) => {
    setSelectedFinanceIds(ids);
  };

  const handleCustomerIntakeChange = (value: typeof customerIntake) => {
    setCustomerIntake(value);
    if (customerSaveState.status !== "idle") {
      setCustomerSaveState(initialCustomerIntakeSaveState);
    }
  };

  const customerFocusPoint = useMemo(() => parseCustomerFocusPoint(customerIntake), [customerIntake]);

  const continueFromCustomer = async () => {
    if (allowCustomerIntakeSkip && !customerValidation.ready) {
      setActiveStep(2);
      setMapFlyoverRequestId((requestId) => requestId + 1);
      return;
    }

    if (!customerValidation.ready || isAutoSavingCustomer) {
      setCustomerSaveState({
        status: "error",
        message: customerValidation.message ?? customerCopy.validation.fallback,
      });
      return;
    }

    if (customerSaveState.status === "success") {
      setActiveStep(2);
      setMapFlyoverRequestId((requestId) => requestId + 1);
      return;
    }

    setIsAutoSavingCustomer(true);
    const nextSaveState = await saveCustomerIntakeValue(customerIntake, locale);
    setCustomerSaveState(nextSaveState);
    setIsAutoSavingCustomer(false);

    if (nextSaveState.status === "success") {
      setActiveStep(2);
      setMapFlyoverRequestId((requestId) => requestId + 1);
    }
  };

  return (
    <div className={isImmersiveStep ? "ksolar-shell" : "ksolar-shell pb-24"}>
      <header className="ksolar-topbar">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-2 px-3 py-3 sm:gap-3 sm:px-4 lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <BrandMark />
            <div className="min-w-0">
              <div className="text-[1.35rem] font-semibold leading-6 tracking-[-0.04em] text-slate-950 sm:text-[1.55rem]">
                KSolar
              </div>
              <div className="mt-0.5 truncate text-xs font-medium text-muted-foreground">
                {copy.workflow.stepLabel} {activeStep}/4 · {activeStepState.title}
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {crmEnabled ? (
              <Button asChild variant="outline" size="sm" className="px-2.5 sm:px-3.5">
                <Link href="/crm">CRM</Link>
              </Button>
            ) : null}
            {LANGUAGE_OPTIONS.map((option) => (
              <Button
                key={option.value}
                variant={locale === option.value ? "default" : "outline"}
                size="sm"
                className="px-2.5 sm:px-3.5"
                onClick={() => {
                  startTransition(() => {
                    setLocale(option.value);
                    document.cookie = `${LOCALE_COOKIE_NAME}=${option.value}; path=/; max-age=31536000; SameSite=Lax`;
                  });
                }}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
      </header>

      <main
        className={
          isImmersiveStep
            ? "relative grid w-full gap-0 px-0 py-0"
            : "mx-auto grid max-w-[1180px] gap-4 px-2.5 py-4 sm:gap-5 sm:px-4 sm:py-5 lg:px-6"
        }
      >
        {!isImmersiveStep ? (
        <div className="premium-panel p-3">
          <div className="mb-3 h-1 rounded-full bg-muted/70">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#0f172a,#14b8a6,#fbbf24)] transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
            {steps.map((step, index) => {
              const isActive = activeStep === step.number;
              return (
                <button
                  key={step.number}
                  type="button"
                  disabled={!step.unlocked}
                  onClick={() => moveToStep(step.number)}
                  className={`relative overflow-hidden rounded-2xl border px-2 py-2.5 text-center text-xs font-semibold transition duration-300 sm:px-3 sm:py-3 ${
                    isActive
                      ? "border-slate-950 bg-slate-950 text-white shadow-[0_18px_42px_rgba(15,23,42,0.2)]"
                      : step.done
                        ? "border-accent/25 bg-accent/[0.07] text-slate-900"
                        : step.unlocked
                          ? "border-border/80 bg-white/80 text-slate-700 hover:border-slate-300 hover:bg-white"
                          : "border-border bg-muted/40 text-muted-foreground"
                  }`}
                >
                  {isActive ? <span className="absolute inset-x-3 top-0 h-px bg-[linear-gradient(90deg,transparent,#14b8a6,#fbbf24,transparent)]" /> : null}
                  <span className="block text-[11px] opacity-70">{step.number}</span>
                  <span className="block truncate text-[12px] sm:text-sm">{stepShortLabels[index]}</span>
                </button>
              );
            })}
          </div>
        </div>
        ) : null}

          {activeStep === 1 ? (
            <StageFrame
              icon={UserRound}
              stepNumber={1}
              tone={steps[0].tone}
              title={customerCopy.title}
              description={customerCopy.description}
              signal={customerDone ? customerCopy.ready : "CUSTOMER"}
              footer={
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-medium text-slate-700">
                    {customerValidation.ready
                      ? customerCopy.autoSaveRule
                      : allowCustomerIntakeSkip
                        ? locale === "zh"
                          ? "本地测试模式：可以先跳过客户快照，直接检查屋顶地图。"
                          : locale === "th"
                            ? "โหมดทดสอบ: ข้ามข้อมูลลูกค้าเพื่อเช็กแผนที่หลังคาได้"
                            : "Local test mode: skip the customer snapshot and inspect the roof map first."
                        : customerValidation.message ?? customerCopy.validation.fallback}
                  </p>
                  <Button
                    disabled={(!customerValidation.ready && !allowCustomerIntakeSkip) || isAutoSavingCustomer}
                    size="lg"
                    className="min-w-[210px]"
                    onClick={() => void continueFromCustomer()}
                  >
                    {isAutoSavingCustomer ? <LoaderCircle className="size-4 animate-spin" /> : null}
                    {isAutoSavingCustomer ? customerCopy.saving : copy.workflow.continue}
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              }
            >
              <CustomerIntakeCard
                value={customerIntake}
                onChange={handleCustomerIntakeChange}
                locale={locale}
                saveState={customerSaveState}
                isSaving={isAutoSavingCustomer}
              />
            </StageFrame>
          ) : null}

          {activeStep === 2 ? (
            <section className="map-stage map-workspace-enter relative isolate h-[calc(100vh-64px)] min-h-[680px] overflow-hidden bg-slate-950 sm:min-h-[720px]">
              <Map
                value={mapSelection}
                onChange={handleMapSelectionChange}
                onCenterChange={setMapCenter}
                solarInsights={activeSolarInsights}
                solarSelectionMatch={solarSelectionMatch}
                focusPoint={customerFocusPoint}
                focusAddress={customerIntake.addressText}
                focusRequestId={mapFlyoverRequestId}
                immersive
              />
              <div className="pointer-events-none absolute inset-x-2 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-40 sm:inset-x-5">
                <div className="pointer-events-auto mx-auto grid max-w-4xl gap-2 rounded-[1.3rem] border border-white/20 bg-slate-950/88 p-2.5 text-white shadow-[0_26px_80px_rgba(15,23,42,0.38)] backdrop-blur-2xl sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-3">
                  <div className="grid min-w-0 flex-1 grid-cols-3 gap-1.5 sm:gap-2">
                    {roofSummaryItems.slice(1, 4).map((item) => (
                      <div key={item.label} className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.08] px-2.5 py-2 sm:px-3">
                        <div className="truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50">{item.label}</div>
                        <div className="mt-1 truncate text-sm font-semibold tracking-[-0.03em] text-white sm:text-base">{item.value}</div>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
                    <Button variant="outline" size="lg" className="border-white/25 bg-white/10 text-white hover:bg-white/20" onClick={() => setActiveStep(1)}>
                      <ChevronLeft className="size-4" />
                      {copy.workflow.back}
                    </Button>
                    <Button disabled={!roofDone} size="lg" className="sm:min-w-[170px]" onClick={() => setActiveStep(3)}>
                      {copy.workflow.continue}
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          {activeStep === 3 ? (
            <section className="map-stage map-workspace-enter relative isolate h-[calc(100vh-64px)] min-h-[680px] overflow-hidden bg-slate-950 sm:min-h-[720px]">
              <RoofReviewMap
                selection={mapSelection}
                solarInsights={activeSolarInsights}
                solarDataLayers={activeSolarDataLayers}
                selectionMatch={solarSelectionMatch}
                fallbackCenter={solarRequestPoint}
                variant="immersive"
                onEditRoof={() => setActiveStep(2)}
              />

              <aside className="pointer-events-none absolute inset-x-2 bottom-[calc(env(safe-area-inset-bottom)+0.6rem)] z-40 sm:inset-x-auto sm:inset-y-4 sm:right-4 sm:w-[410px]">
                <div className="pointer-events-auto flex max-h-[72vh] flex-col overflow-hidden rounded-[1.45rem] border border-white/40 bg-white/[0.98] text-slate-950 shadow-[0_28px_90px_rgba(15,23,42,0.34)] backdrop-blur-xl sm:max-h-full">
                  <div className="border-b border-slate-200/80 bg-white/[0.96] p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="section-kicker text-primary">{step3Copy.eyebrow}</div>
                        <h2 className="mt-1 text-[1.45rem] font-semibold leading-none tracking-[-0.055em] sm:text-[1.75rem]">
                          {step3Copy.title}
                        </h2>
                        <p className="mt-2 text-sm font-medium leading-5 text-slate-700">{step3Copy.description}</p>
                      </div>
                      <Button variant="outline" size="sm" className="shrink-0 rounded-full" onClick={() => setActiveStep(2)}>
                        {step3Copy.editRoof}
                      </Button>
                    </div>

                    <div className="mt-3 rounded-2xl border border-slate-200 bg-white/[0.92] p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                            Google Solar
                          </div>
                          <div className="mt-1 truncate text-sm font-semibold text-slate-950">{solarStateLabel}</div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="shrink-0 rounded-full"
                          disabled={solarStatus === "loading" || !solarRequestPoint || !solarRequestKey}
                          onClick={() => {
                            if (!solarRequestPoint || !solarRequestKey) {
                              return;
                            }
                            void fetchSolarData(solarRequestPoint, solarRequestKey);
                          }}
                        >
                          {solarStatus === "loading" ? <LoaderCircle className="size-3.5 animate-spin" /> : null}
                          {step3Copy.refresh}
                        </Button>
                      </div>
                      {solarErrorMessage ? (
                        <p className="mt-2 max-h-12 overflow-hidden break-words text-xs leading-5 text-amber-800">
                          {solarErrorMessage}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="min-h-0 overflow-y-auto p-3 sm:p-4">
                    <div className="grid grid-cols-2 gap-2">
                      <SetupMetric
                        label={step3Copy.quoteSize}
                        value={result.quotedSystemSizeWp > 0 ? `${formatNumber(result.quotedSystemSizeWp / 1000, 1)} kWp` : "N/A"}
                        tone="dark"
                      />
                      <SetupMetric
                        label={step3Copy.payback}
                        value={result.paybackYears ? `${formatNumber(result.paybackYears, 1)} yr` : "N/A"}
                      />
                      <SetupMetric
                        label={step3Copy.annualGeneration}
                        value={result.annualGenerationKWh > 0 ? `${formatNumber(result.annualGenerationKWh)} kWh` : "N/A"}
                      />
                      <SetupMetric
                        label={step3Copy.investment}
                        value={result.finance.financeAdjustedPriceTHB > 0 ? `THB ${formatNumber(result.finance.financeAdjustedPriceTHB)}` : "N/A"}
                      />
                    </div>

                    <div className="mt-3 grid gap-3 rounded-[1.2rem] border border-slate-200 bg-white/88 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-950">{step3Copy.fieldReady}</div>
                          <div className="mt-0.5 text-xs font-medium text-slate-600">
                            {topologySummary} · {pricingMeta.label} · {formatNumber(selectedPanelProfile.powerWp)}W
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-1.5">
                        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{step3Copy.phase}</div>
                        <div className="grid grid-cols-2 gap-2">
                          <SetupChoice active={topology.phase === "1P"} label={copy.system.singlePhase} onClick={() => handleTopologyChange({ ...topology, phase: "1P" })} />
                          <SetupChoice active={topology.phase === "3P"} label={copy.system.threePhase} onClick={() => handleTopologyChange({ ...topology, phase: "3P" })} />
                        </div>
                      </div>

                      <div className="grid gap-1.5">
                        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{step3Copy.systemMode}</div>
                        <div className="grid grid-cols-2 gap-2">
                          <SetupChoice
                            active={topology.mode === "ongrid"}
                            label={copy.system.ongrid}
                            onClick={() => handleTopologyChange({ ...topology, mode: "ongrid", batteryMode: "none" })}
                          />
                          <SetupChoice
                            active={topology.mode === "hybrid"}
                            label={copy.system.hybrid}
                            onClick={() => handleTopologyChange({ ...topology, mode: "hybrid" })}
                          />
                        </div>
                      </div>

                      <div className="grid gap-1.5">
                        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{step3Copy.battery}</div>
                        <div className="grid grid-cols-2 gap-2">
                          <SetupChoice active={topology.batteryMode === "none"} label={step3Copy.noBattery} onClick={() => handleTopologyChange({ ...topology, batteryMode: "none" })} />
                          <SetupChoice
                            active={topology.batteryMode === "with_battery"}
                            label={step3Copy.withBattery}
                            onClick={() => handleTopologyChange({ ...topology, mode: "hybrid", batteryMode: "with_battery" })}
                          />
                        </div>
                      </div>
                    </div>

                    <details className="mt-3 rounded-[1.15rem] border border-slate-200 bg-white/[0.97] p-3">
                      <summary className="cursor-pointer list-none text-sm font-semibold text-slate-950 marker:hidden">
                        {step3Copy.advancedSystem}
                        <span className="mt-1 block text-xs font-medium leading-5 text-slate-600">{step3Copy.advancedSystemHint}</span>
                      </summary>
                      <div className="mt-3">
                        <SystemSelector
                          topology={topology}
                          pricingPresetId={pricingPresetId}
                          selectedPanelId={selectedPanelId}
                          selectedInverterId={selectedInverterId}
                          selectedBatteryId={selectedBatteryId}
                          onTopologyChange={handleTopologyChange}
                          onPricingPresetChange={handlePricingPresetChange}
                          onPanelChange={setSelectedPanelId}
                          onInverterChange={setSelectedInverterId}
                          onBatteryChange={setSelectedBatteryId}
                        />
                      </div>
                    </details>

                    <details className="mt-3 rounded-[1.15rem] border border-slate-200 bg-white/[0.97] p-3">
                      <summary className="cursor-pointer list-none text-sm font-semibold text-slate-950 marker:hidden">
                        {step3Copy.advancedFinance}
                        <span className="mt-1 block text-xs font-medium leading-5 text-slate-600">{step3Copy.advancedFinanceHint}</span>
                      </summary>
                      <div className="mt-3 grid gap-3">
                        <div className="grid gap-3 rounded-[1rem] border border-slate-200 bg-slate-50/70 p-3">
                          <div className="grid gap-1.5">
                            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{copy.tariff.ftRate}</label>
                            <Input type="number" step="0.01" value={ftRateTHBPerKWh} onChange={(event) => setFtRateTHBPerKWh(Number(event.target.value))} />
                          </div>
                          <div className="grid gap-1.5">
                            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{copy.tariff.selfUseRatio}</label>
                            <Input type="number" step="0.05" min="0" max="1" value={selfConsumptionRatio} onChange={(event) => setSelfConsumptionRatio(Number(event.target.value))} />
                          </div>
                          <div className="grid gap-1.5">
                            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{copy.tariff.exportRate}</label>
                            <Input type="number" step="0.1" value={exportRateTHBPerKWh} onChange={(event) => setExportRateTHBPerKWh(Number(event.target.value))} />
                          </div>
                        </div>
                        <FinanceSelector selectedFinanceIds={selectedFinanceIds} onChange={handleFinanceChange} />
                      </div>
                    </details>
                  </div>

                  <div className="grid grid-cols-2 gap-2 border-t border-slate-200/80 bg-white/96 p-3 sm:p-4">
                    <Button variant="outline" size="lg" onClick={() => setActiveStep(2)}>
                      <ChevronLeft className="size-4" />
                      {copy.workflow.back}
                    </Button>
                    <Button size="lg" onClick={() => setActiveStep(4)}>
                      {copy.workflow.openProposal}
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                </div>
              </aside>
            </section>
          ) : null}

          {activeStep === 4 ? (
            <StageFrame
              icon={Sparkles}
              stepNumber={4}
              tone={steps[3].tone}
              title={copy.workflow.step4Title}
              description={copy.workflow.step4Description}
              signal={result.quotedSystemSizeWp > 0 ? `${formatNumber(result.quotedSystemSizeWp / 1000, 1)} kWp` : "QUOTE"}
              footer={
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <Button variant="outline" size="lg" onClick={() => setActiveStep(3)}>
                    <ChevronLeft className="size-4" />
                    {copy.workflow.back}
                  </Button>
                  <p className="text-sm text-muted-foreground">{copy.workflow.nextActionProposal}</p>
                </div>
              }
            >
              <QuoteResults
                result={result}
                solarInsights={activeSolarInsights}
                sellablePanelProfile={selectedPanelProfile}
                solarSelectionMatch={solarSelectionMatch}
                availableQuoteTiers={availableQuoteTiers}
                selectedTierId={selectedTierId}
                onSelectedTierChange={setSelectedTierId}
              />
            </StageFrame>
          ) : null}
      </main>
    </div>
  );
}

function SetupMetric({
  label,
  value,
  tone = "light",
}: {
  label: string;
  value: string;
  tone?: "light" | "dark";
}) {
  return (
    <div
      className={
        tone === "dark"
          ? "rounded-[1.05rem] bg-slate-950 px-3 py-3 text-white shadow-[0_14px_34px_rgba(15,23,42,0.2)]"
          : "rounded-[1.05rem] border border-slate-200 bg-slate-50/80 px-3 py-3 text-slate-950"
      }
    >
      <div className={tone === "dark" ? "metric-label text-white/55" : "metric-label"}>{label}</div>
      <div className="mt-1 truncate text-base font-semibold tracking-[-0.04em] sm:text-lg">{value}</div>
    </div>
  );
}

function SetupChoice({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "min-h-11 rounded-2xl bg-slate-950 px-3 py-2 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(15,23,42,0.16)]"
          : "min-h-11 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50"
      }
    >
      <span className="block truncate">{label}</span>
    </button>
  );
}

function BrandMark() {
  return (
    <div className="ksolar-brand-mark" aria-hidden="true">
      <span>K</span>
    </div>
  );
}

function StageFrame({ icon: Icon, stepNumber, tone, title, description, signal, children, footer }: StageFrameProps & { signal?: string }) {
  const copy = useAppCopy();

  return (
    <section className="surface-panel relative overflow-visible">
      <div className="energy-line" />
      <div className="border-b border-border/55 p-3.5 sm:p-5 md:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className={`hidden size-10 items-center justify-center rounded-xl sm:flex ${tone}`}>
              <Icon className="size-4" />
            </div>
            <div>
              <div className="section-kicker text-primary">
                {copy.workflow.stepLabel} {stepNumber}
              </div>
              <h2 className="mt-1 text-[1.38rem] font-semibold leading-tight tracking-[-0.055em] text-slate-950 sm:text-[1.95rem] md:text-[2.45rem]">{title}</h2>
              <p className="mt-1.5 max-w-2xl text-sm leading-5 text-muted-foreground sm:mt-2 sm:text-base sm:leading-7">{description}</p>
            </div>
          </div>
          <div className="hidden min-w-[160px] rounded-2xl border border-border/70 bg-slate-950 px-4 py-3 text-right text-white shadow-[0_18px_48px_rgba(15,23,42,0.18)] md:block">
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/54">Live</div>
            <div className="mt-1 truncate text-lg font-semibold tracking-[-0.03em]">{signal}</div>
          </div>
        </div>
      </div>
      <div className="p-3 sm:p-5 md:p-6">{children}</div>
      <div className="sticky bottom-0 z-20 border-t border-white/70 bg-white/90 p-4 shadow-[0_-18px_48px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-5 md:p-6">
        {footer}
      </div>
    </section>
  );
}

function parseCustomerFocusPoint(value: typeof initialCustomerIntake): SolarLatLng | null {
  const latitudeText = value.latitude.trim();
  const longitudeText = value.longitude.trim();

  if (!latitudeText || !longitudeText) {
    return null;
  }

  const latitude = Number(latitudeText);
  const longitude = Number(longitudeText);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return { latitude, longitude };
}

function getLocalizedGoogleSolarError(
  locale: AppLocale,
  error: SolarApiError,
  source: "building-insights" | "data-layers",
) {
  const sourceLabel =
    source === "data-layers"
      ? locale === "zh"
        ? "热力图/阴影图层"
        : locale === "th"
          ? "เลเยอร์แดดและเงา"
          : "sun/shade layers"
      : locale === "zh"
        ? "屋顶识别"
        : locale === "th"
          ? "การวิเคราะห์หลังคา"
          : "roof analysis";

  if (error.code === "quota_exceeded") {
    return locale === "zh"
      ? `Google Solar ${sourceLabel}今天的 API 配额已用完。报价仍可继续：系统会使用你圈选的屋顶面积和 KSolar 规则引擎计算，等配额恢复或换成正式生产 key 后再做 Google 校验。`
      : locale === "th"
        ? `โควตา Google Solar สำหรับ${sourceLabel}วันนี้หมดแล้ว ยังออกใบเสนอราคาได้ โดยใช้พื้นที่หลังคาที่เลือกและสูตร KSolar ก่อน แล้วค่อยตรวจด้วย Google เมื่อโควตากลับมา`
        : `Google Solar ${sourceLabel} daily quota is exhausted. You can still quote with the selected roof area and KSolar rules, then rerun Google validation after quota resets or a production key is configured.`;
  }

  if (error.code === "billing_required") {
    return locale === "zh"
      ? `Google Solar ${sourceLabel}需要在 Google Cloud 启用计费。当前先按 KSolar 手动画图规则继续报价。`
      : locale === "th"
        ? `Google Solar สำหรับ${sourceLabel}ต้องเปิด Billing ใน Google Cloud ตอนนี้ใช้สูตร KSolar จากพื้นที่ที่เลือกก่อนได้`
        : `Google Solar ${sourceLabel} requires Google Cloud billing. Continue with KSolar manual roof rules for now.`;
  }

  if (error.code === "api_key_invalid" || error.code === "request_denied") {
    return locale === "zh"
      ? `Google Solar ${sourceLabel}的 API key 或权限配置不正确。请检查 Vercel 环境变量、API 启用状态和 key 限制。`
      : locale === "th"
        ? `API key หรือสิทธิ์ของ Google Solar สำหรับ${sourceLabel}ยังไม่ถูกต้อง กรุณาตรวจ Environment Variables, API ที่เปิดใช้ และข้อจำกัดของ key`
        : `Google Solar ${sourceLabel} key or permissions are not configured correctly. Check Vercel env vars, enabled APIs, and key restrictions.`;
  }

  return error.message;
}
