"use client";

import { startTransition, useEffect, useMemo, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, MapPinned, type LucideIcon, Settings2, Sparkles } from "lucide-react";
import { LocaleProvider, useAppCopy, useLocaleContext } from "@/components/locale-provider";
import { Map } from "@/components/Map";
import { FinanceSelector } from "@/components/finance-selector";
import { QuoteResults } from "@/components/quote-results";
import { RoofReviewMap } from "@/components/roof-review-map";
import { SolarInsightsCard } from "@/components/solar-insights-card";
import { SystemSelector } from "@/components/system-selector";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { calculateQuoteScenario } from "@/lib/calc";
import { FINANCE_PRODUCTS } from "@/lib/config/finance-products";
import { DEFAULT_PANEL_ID, findPanel, getPanelAreaM2 } from "@/lib/config/panel-catalog";
import { CAPACITY_TIERS, DEFAULT_TOPOLOGY, SOLAR_DEFAULTS } from "@/lib/config/solar";
import { getLocalizedPresetMeta, LANGUAGE_OPTIONS, type AppLocale } from "@/lib/i18n";
import { createEmptyMapSelection } from "@/lib/maps";
import { requestSolarDataLayers, requestSolarInsights } from "@/lib/solar-client";
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

type StepNumber = 1 | 2 | 3;

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

export function DashboardShell() {
  const [locale, setLocale] = useState<AppLocale>("zh");

  return (
    <LocaleProvider locale={locale} setLocale={setLocale}>
      <DashboardShellContent />
    </LocaleProvider>
  );
}

function DashboardShellContent() {
  const { locale, setLocale } = useLocaleContext();
  const copy = useAppCopy();
  const [mapSelection, setMapSelection] = useState<MapSelectionSummary>(createEmptyMapSelection());
  const [topology, setTopology] = useState(DEFAULT_TOPOLOGY);
  const [pricingPresetId, setPricingPresetId] = useState<PricingPreset["id"]>("standard");
  const [selectedPanelId, setSelectedPanelId] = useState<string>(DEFAULT_PANEL_ID);
  const [selectedInverterId, setSelectedInverterId] = useState<string>("auto");
  const [selectedBatteryId, setSelectedBatteryId] = useState<string>("auto");
  const [selectedTierId, setSelectedTierId] = useState<CapacityTierId | null>(null);
  const [selectedFinanceIds, setSelectedFinanceIds] = useState(
    FINANCE_PRODUCTS.filter((product) => product.enabledByDefault).map((product) => product.id),
  );
  const [activeStep, setActiveStep] = useState<StepNumber>(1);
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

  const step1Done = mapSelection.grossAreaM2 > 0;
  const step2Done = step1Done;
  const step3Done = step1Done;
  const maxUnlockedStep: StepNumber = step1Done ? 3 : 1;

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
        title: copy.workflow.step1Title,
        description: copy.workflow.step1Description,
        done: step1Done,
        unlocked: true,
        icon: MapPinned,
        tone: "bg-primary text-primary-foreground",
      },
      {
        number: 2,
        title: copy.workflow.step2Title,
        description: copy.workflow.step2Description,
        done: step2Done,
        unlocked: step1Done,
        icon: Settings2,
        tone: "bg-secondary text-secondary-foreground",
      },
      {
        number: 3,
        title: copy.workflow.step4Title,
        description: copy.workflow.step4Description,
        done: step3Done && (result.isViable || result.warnings.length > 0),
        unlocked: step1Done,
        icon: Sparkles,
        tone: "bg-slate-900 text-white",
      },
    ],
    [
      copy.workflow.step1Description,
      copy.workflow.step1Title,
      copy.workflow.step2Description,
      copy.workflow.step2Title,
      copy.workflow.step4Description,
      copy.workflow.step4Title,
      result.isViable,
      result.warnings.length,
      step1Done,
      step2Done,
      step3Done,
    ],
  );

  const progressPercent = useMemo(() => {
    if (step3Done) {
      return 100;
    }

    if (step1Done) {
      return 66;
    }

    return 33;
  }, [step1Done, step3Done]);

  const activeStepState = steps.find((step) => step.number === activeStep) ?? steps[0];
  const pricingMeta = getLocalizedPresetMeta(locale, pricingPresetId);
  const stepShortLabels =
    locale === "zh"
      ? ["屋顶", "方案", "报价"]
      : locale === "th"
        ? ["หลังคา", "ระบบ", "ราคา"]
        : ["Roof", "System", "Quote"];

  const topologySummary = [
    topology.phase === "1P" ? copy.system.singlePhase : copy.system.threePhase,
    topology.mode === "ongrid" ? copy.system.ongrid : copy.system.hybrid,
    topology.batteryMode === "with_battery" ? copy.system.withBattery : copy.system.noBattery,
  ].join(" · ");

  const roofSummaryItems = [
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
          error instanceof Error
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
      setSolarErrorMessage(error instanceof Error ? error.message : "Unknown Google Solar error.");
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

  return (
    <div className="ksolar-shell pb-24">
      <header className="ksolar-topbar">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-3 px-4 py-3 lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <BrandMark />
            <div className="min-w-0">
              <div className="text-[1.35rem] font-semibold leading-6 tracking-[-0.04em] text-slate-950 sm:text-[1.55rem]">
                KSolar
              </div>
              <div className="mt-0.5 truncate text-xs font-medium text-muted-foreground">
                {copy.workflow.stepLabel} {activeStep}/3 · {activeStepState.title}
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {LANGUAGE_OPTIONS.map((option) => (
              <Button
                key={option.value}
                variant={locale === option.value ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  startTransition(() => {
                    setLocale(option.value);
                  });
                }}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1180px] gap-4 px-2.5 py-4 sm:gap-5 sm:px-4 sm:py-5 lg:px-6">
        <div className="premium-panel p-3">
          <div className="mb-3 h-1 rounded-full bg-muted/70">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#0f172a,#14b8a6,#fbbf24)] transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
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

          {activeStep === 1 ? (
            <StageFrame
              icon={MapPinned}
              stepNumber={1}
              tone={steps[0].tone}
              title={copy.workflow.step1Title}
              description={copy.workflow.step1Description}
              signal={step1Done ? `${formatNumber(mapSelection.grossAreaM2, 1)} m²` : "SATELLITE"}
              footer={
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-medium text-slate-700">
                    {step1Done ? `${copy.map.grossArea}: ${formatNumber(mapSelection.grossAreaM2, 1)} m²` : copy.map.step1Body}
                  </p>
                  <Button disabled={!step1Done} size="lg" className="min-w-[180px]" onClick={() => setActiveStep(2)}>
                    {copy.workflow.continue}
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              }
            >
              <div className="grid gap-4">
                <Map
                  value={mapSelection}
                  onChange={handleMapSelectionChange}
                  onCenterChange={setMapCenter}
                  solarInsights={activeSolarInsights}
                  solarSelectionMatch={solarSelectionMatch}
                />
                <div className="grid gap-3 sm:grid-cols-3">
                  {roofSummaryItems.slice(1, 4).map((item) => (
                    <SimpleMetric key={item.label} label={item.label} value={item.value} />
                  ))}
                </div>
              </div>
            </StageFrame>
          ) : null}

          {activeStep === 2 ? (
            <StageFrame
              icon={Settings2}
              stepNumber={2}
              tone={steps[1].tone}
              title={copy.workflow.step2Title}
              description={copy.workflow.step2Description}
              signal={topologySummary}
              footer={
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <Button variant="outline" size="lg" onClick={() => setActiveStep(1)}>
                    <ChevronLeft className="size-4" />
                    {copy.workflow.back}
                  </Button>
                  <Button
                    size="lg"
                    className="min-w-[180px]"
                    onClick={() => setActiveStep(3)}
                  >
                    {copy.workflow.openProposal}
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              }
            >
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
                <SolarInsightsCard
                  insights={activeSolarInsights}
                  status={solarStatus}
                  errorMessage={solarErrorMessage}
                  requestPoint={solarRequestPoint}
                  selectionMatch={solarSelectionMatch}
                  needsRefresh={solarNeedsRefresh}
                  reviewMap={
                    <RoofReviewMap
                      selection={mapSelection}
                      solarInsights={activeSolarInsights}
                      solarDataLayers={activeSolarDataLayers}
                      selectionMatch={solarSelectionMatch}
                      fallbackCenter={solarRequestPoint}
                      onEditRoof={() => setActiveStep(1)}
                    />
                  }
                  onRefresh={() => {
                    if (!solarRequestPoint || !solarRequestKey) {
                      return;
                    }
                    void fetchSolarData(solarRequestPoint, solarRequestKey);
                  }}
                  quoteResult={result}
                  dataLayers={activeSolarDataLayers}
                  sellablePanelProfile={selectedPanelProfile}
                />
                <div className="grid gap-4">
                  <Card className="border-white/75 bg-white/90">
                    <CardHeader className="pb-3">
                      <CardTitle>{locale === "zh" ? "推荐方案" : locale === "th" ? "แพ็กเกจแนะนำ" : "Recommended Setup"}</CardTitle>
                      <CardDescription>
                        {locale === "zh"
                          ? "默认值可直接报价，只在客户明确要求时调整。"
                          : locale === "th"
                            ? "ค่าเริ่มต้นพร้อมเสนอราคา ปรับเมื่อจำเป็นเท่านั้น"
                            : "Defaults are quote-ready. Adjust only when the customer asks."}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-3">
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant={topology.phase === "1P" ? "default" : "outline"}
                          onClick={() => handleTopologyChange({ ...topology, phase: "1P" })}
                        >
                          {copy.system.singlePhase}
                        </Button>
                        <Button
                          variant={topology.phase === "3P" ? "default" : "outline"}
                          onClick={() => handleTopologyChange({ ...topology, phase: "3P" })}
                        >
                          {copy.system.threePhase}
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant={topology.mode === "ongrid" ? "default" : "outline"}
                          onClick={() => handleTopologyChange({ ...topology, mode: "ongrid", batteryMode: "none" })}
                        >
                          {copy.system.ongrid}
                        </Button>
                        <Button
                          variant={topology.mode === "hybrid" ? "default" : "outline"}
                          onClick={() => handleTopologyChange({ ...topology, mode: "hybrid" })}
                        >
                          {copy.system.hybrid}
                        </Button>
                      </div>
                      <div className="grid gap-2 rounded-2xl border border-border/70 bg-muted/25 p-4 text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-muted-foreground">{copy.quote.quotedPackageSize}</span>
                          <span className="font-semibold">{result.quotedSystemSizeWp > 0 ? `${formatNumber(result.quotedSystemSizeWp / 1000, 1)} kWp` : "N/A"}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-muted-foreground">{copy.solar.googlePanelWattage}</span>
                          <span className="font-semibold">{formatNumber(selectedPanelProfile.powerWp)} W KSolar</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-muted-foreground">{copy.system.pricingPreset}</span>
                          <span className="font-semibold">{pricingMeta.label}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <details className="rounded-[1.4rem] border border-border/70 bg-white/90 p-4 shadow-[0_14px_36px_rgba(15,23,42,0.04)]">
                    <summary className="cursor-pointer list-none text-sm font-semibold text-slate-950 marker:hidden">
                      {locale === "zh" ? "高级系统和设备设置" : locale === "th" ? "ตั้งค่าระบบและอุปกรณ์ขั้นสูง" : "Advanced system and equipment"}
                      <span className="mt-1 block text-sm font-normal text-muted-foreground">
                        {locale === "zh"
                          ? "销售现场通常不用展开。需要换品牌、价格档或电池时再打开。"
                          : locale === "th"
                            ? "ปกติไม่ต้องเปิด ใช้เมื่อเปลี่ยนแบรนด์ ราคา หรือแบตเตอรี่"
                            : "Usually keep closed in the field. Open for brand, price tier, or battery changes."}
                      </span>
                    </summary>
                    <div className="mt-4">
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
                  <details className="rounded-[1.4rem] border border-border/70 bg-white/90 p-4 shadow-[0_14px_36px_rgba(15,23,42,0.04)]">
                    <summary className="cursor-pointer list-none text-sm font-semibold text-slate-950 marker:hidden">
                      {locale === "zh" ? "金融和电价假设" : locale === "th" ? "สมมติฐานการเงินและค่าไฟ" : "Finance and tariff assumptions"}
                      <span className="mt-1 block text-sm font-normal text-muted-foreground">
                        {locale === "zh"
                          ? "默认值可直接出报价，需要时再展开调整。"
                          : locale === "th"
                            ? "ใช้ค่าเริ่มต้นเพื่อออกใบเสนอราคาได้ทันที เปิดเมื่อจำเป็นต้องปรับ"
                            : "Defaults are ready for a quote. Open only when you need to adjust."}
                      </span>
                    </summary>
                    <div className="mt-4 grid gap-4">
                      <Card className="border-border/70 shadow-none">
                        <CardHeader>
                          <CardTitle>{copy.tariff.title}</CardTitle>
                          <CardDescription>{copy.tariff.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-4">
                          <div className="grid gap-2">
                            <label className="text-sm font-medium">{copy.tariff.ftRate}</label>
                            <Input type="number" step="0.01" value={ftRateTHBPerKWh} onChange={(event) => setFtRateTHBPerKWh(Number(event.target.value))} />
                          </div>
                          <div className="grid gap-2">
                            <label className="text-sm font-medium">{copy.tariff.selfUseRatio}</label>
                            <Input type="number" step="0.05" min="0" max="1" value={selfConsumptionRatio} onChange={(event) => setSelfConsumptionRatio(Number(event.target.value))} />
                          </div>
                          <div className="grid gap-2">
                            <label className="text-sm font-medium">{copy.tariff.exportRate}</label>
                            <Input type="number" step="0.1" value={exportRateTHBPerKWh} onChange={(event) => setExportRateTHBPerKWh(Number(event.target.value))} />
                          </div>
                        </CardContent>
                      </Card>
                      <FinanceSelector selectedFinanceIds={selectedFinanceIds} onChange={handleFinanceChange} />
                    </div>
                  </details>
                </div>
              </div>
            </StageFrame>
          ) : null}

          {activeStep === 3 ? (
            <StageFrame
              icon={Sparkles}
              stepNumber={3}
              tone={steps[2].tone}
              title={copy.workflow.step4Title}
              description={copy.workflow.step4Description}
              signal={result.quotedSystemSizeWp > 0 ? `${formatNumber(result.quotedSystemSizeWp / 1000, 1)} kWp` : "QUOTE"}
              footer={
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <Button variant="outline" size="lg" onClick={() => setActiveStep(2)}>
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

function SimpleMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/80 bg-white/90 p-4 shadow-[0_12px_34px_rgba(15,23,42,0.045)] backdrop-blur">
      <div className="metric-label">{label}</div>
      <div className="mt-2 text-xl font-semibold tracking-tight text-slate-950">{value}</div>
    </div>
  );
}
