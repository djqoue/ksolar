"use client";

import { startTransition, useEffect, useMemo, useState, type ReactNode } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, CircleDashed, MapPinned, type LucideIcon, Settings2, Sparkles, WalletCards } from "lucide-react";
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
import { DEFAULT_TOPOLOGY, SOLAR_DEFAULTS } from "@/lib/config/solar";
import { getLocalizedPresetMeta, LANGUAGE_OPTIONS, type AppLocale } from "@/lib/i18n";
import { createEmptyMapSelection } from "@/lib/maps";
import { requestSolarDataLayers, requestSolarInsights } from "@/lib/solar-client";
import {
  buildSolarSelectionMatchSummary,
  getGoogleSolarSellableAnnualGeneration,
  getGoogleSolarSellableFit,
  getSelectionReferencePoint,
} from "@/lib/solar";
import { formatCurrency, formatNumber } from "@/lib/utils";
import type { MapSelectionSummary, PricingPreset } from "@/types/quote";
import type { SystemTopology } from "@/types/bom";
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
  const [selectedFinanceIds, setSelectedFinanceIds] = useState(
    FINANCE_PRODUCTS.filter((product) => product.enabledByDefault).map((product) => product.id),
  );
  const [systemReviewed, setSystemReviewed] = useState(false);
  const [validationReviewed, setValidationReviewed] = useState(false);
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
  const step2Done = step1Done && systemReviewed;
  const step3Done = step2Done && validationReviewed;
  const maxUnlockedStep: StepNumber = step3Done ? 4 : step2Done ? 3 : step1Done ? 2 : 1;

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

  const result = useMemo(() => {
    const googleSellableFit = getGoogleSolarSellableFit(activeSolarInsights);
    const googleSellableAnnualGeneration = getGoogleSolarSellableAnnualGeneration(activeSolarInsights);

    return calculateQuoteScenario({
      map: mapSelection,
      topology,
      pricingPresetId,
      selectedFinanceIds,
      ftRateTHBPerKWh,
      selfConsumptionRatio,
      exportRateTHBPerKWh,
      googleMatchedRoof: solarSelectionMatch.status === "inside-selection",
      googleSellableFitWp: googleSellableFit.equivalentKw ? googleSellableFit.equivalentKw * 1000 : null,
      googleSellablePanelCount: googleSellableFit.equivalentPanelCount,
      googleAnnualGenerationKWh: googleSellableAnnualGeneration,
    });
  }, [
    exportRateTHBPerKWh,
    ftRateTHBPerKWh,
    mapSelection,
    pricingPresetId,
    selectedFinanceIds,
    selfConsumptionRatio,
    activeSolarInsights,
    solarSelectionMatch.status,
    topology,
  ]);

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
        title: copy.workflow.step3Title,
        description: copy.workflow.step3Description,
        done: step3Done,
        unlocked: step2Done,
        icon: WalletCards,
        tone: "bg-accent text-accent-foreground",
      },
      {
        number: 4,
        title: copy.workflow.step4Title,
        description: copy.workflow.step4Description,
        done: step3Done && (result.isViable || result.warnings.length > 0),
        unlocked: step3Done,
        icon: Sparkles,
        tone: "bg-slate-900 text-white",
      },
    ],
    [
      copy.workflow.step1Description,
      copy.workflow.step1Title,
      copy.workflow.step2Description,
      copy.workflow.step2Title,
      copy.workflow.step3Description,
      copy.workflow.step3Title,
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

    if (step2Done) {
      return 75;
    }

    if (step1Done) {
      return 50;
    }

    return 25;
  }, [step1Done, step2Done, step3Done]);

  const activeStepState = steps.find((step) => step.number === activeStep) ?? steps[0];
  const pricingMeta = getLocalizedPresetMeta(locale, pricingPresetId);

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

  const headlineSizeLabel = activeStep === 4 ? copy.quote.quotedPackageSize : copy.quote.roofFitSize;
  const headlineSizeValue =
    activeStep === 4
      ? result.quotedSystemSizeWp > 0
        ? `${formatNumber(result.quotedSystemSizeWp / 1000, 2)} kWp`
        : "N/A"
      : result.roofFitSystemWp > 0
        ? `${formatNumber(result.roofFitSystemWp / 1000, 2)} kWp`
        : "N/A";
  const headlineOutcomeLabel = activeStep === 4 ? copy.workflow.netPrice : copy.quote.roofPotentialGeneration;
  const headlineOutcomeValue =
    activeStep === 4
      ? result.finance.financeAdjustedPriceTHB
        ? formatCurrency(result.finance.financeAdjustedPriceTHB)
        : "N/A"
      : result.roofPotentialAnnualGenerationKWh > 0
        ? `${formatNumber(result.roofPotentialAnnualGenerationKWh)} kWh`
        : "N/A";

  const nextAction =
    activeStep === 1
      ? copy.workflow.nextActionMap
      : activeStep === 2
        ? copy.workflow.nextActionSystem
        : activeStep === 3
          ? copy.workflow.nextActionValidation
          : copy.workflow.nextActionProposal;

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
      setValidationReviewed(true);
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

  const activeChecklist = useMemo(() => {
    const hasSolarValidation = activeSolarInsights !== null || mapCenter !== null || mapSelection.grossAreaM2 > 0;

    return {
      1: [
        { label: copy.workflow.step1Check1, done: mapCenter !== null || mapSelection.grossAreaM2 > 0 },
        { label: copy.workflow.step1Check2, done: mapSelection.grossAreaM2 > 0 },
        { label: copy.workflow.step1Check3, done: mapSelection.usableAreaM2 > 0 },
      ],
      2: [
        { label: copy.workflow.step2Check1, done: systemReviewed },
        { label: copy.workflow.step2Check2, done: systemReviewed },
        { label: copy.workflow.step2Check3, done: Boolean(pricingPresetId) },
      ],
      3: [
        { label: copy.workflow.step3Check1, done: validationReviewed || ftRateTHBPerKWh > 0 },
        { label: copy.workflow.step3Check2, done: validationReviewed || selectedFinanceIds.length > 0 },
        { label: copy.workflow.step3Check3, done: hasSolarValidation },
      ],
      4: [
        { label: copy.workflow.step4Check1, done: result.quotedSystemSizeWp > 0 && result.suggestedSellPriceTHB > 0 },
        { label: copy.workflow.step4Check2, done: result.paybackYears !== null && result.irrPercent !== null },
        { label: copy.workflow.step4Check3, done: Boolean(result.bom) },
      ],
    } satisfies Record<StepNumber, Array<{ label: string; done: boolean }>>;
  }, [
    copy.workflow.step1Check1,
    copy.workflow.step1Check2,
    copy.workflow.step1Check3,
    copy.workflow.step2Check1,
    copy.workflow.step2Check2,
    copy.workflow.step2Check3,
    copy.workflow.step3Check1,
    copy.workflow.step3Check2,
    copy.workflow.step3Check3,
    copy.workflow.step4Check1,
    copy.workflow.step4Check2,
    copy.workflow.step4Check3,
    ftRateTHBPerKWh,
    mapCenter,
    mapSelection.grossAreaM2,
    mapSelection.usableAreaM2,
    pricingPresetId,
    result.bom,
    result.irrPercent,
    result.paybackYears,
    result.suggestedSellPriceTHB,
    result.quotedSystemSizeWp,
    selectedFinanceIds.length,
    activeSolarInsights,
    systemReviewed,
    validationReviewed,
  ])[activeStep];

  const moveToStep = (step: StepNumber) => {
    const next = steps.find((item) => item.number === step);
    if (!next?.unlocked) {
      return;
    }

    setActiveStep(step);
  };

  const handleMapSelectionChange = (value: MapSelectionSummary) => {
    setMapSelection(value);
    setValidationReviewed(false);
  };

  const handleTopologyChange = (value: SystemTopology) => {
    setSystemReviewed(true);
    setValidationReviewed(false);
    setTopology(value);
  };

  const handlePricingPresetChange = (value: PricingPreset["id"]) => {
    setSystemReviewed(true);
    setValidationReviewed(false);
    setPricingPresetId(value);
  };

  const handleFinanceChange = (ids: string[]) => {
    setValidationReviewed(true);
    setSelectedFinanceIds(ids);
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,rgba(250,250,250,1),rgba(245,246,247,1))]">
      <section className="border-b border-border/70">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-4 px-4 py-4 sm:gap-5 sm:py-5 lg:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl space-y-2">
              <div className="inline-flex w-fit items-center rounded-full border border-border bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {copy.header.badge}
              </div>
              <h1 className="max-w-3xl text-balance text-[1.75rem] font-semibold leading-tight tracking-tight text-slate-900 sm:text-[2.2rem] md:text-[3rem]">
                {copy.header.title}
              </h1>
              <p className="max-w-2xl text-sm leading-5 text-muted-foreground sm:leading-6">{copy.workflow.subtitle}</p>
            </div>

            <div className="surface-panel p-2 sm:self-start">
              <div className="mb-2 px-2 section-kicker">
                {copy.language.title}
              </div>
              <div className="flex flex-wrap gap-2">
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
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <HeroMetric label={copy.workflow.currentFocus} value={activeStepState.title} />
            <HeroMetric label={copy.workflow.nextAction} value={nextAction} />
            <HeroMetric label={headlineSizeLabel} value={headlineSizeValue} />
            <HeroMetric label={headlineOutcomeLabel} value={headlineOutcomeValue} />
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-[1180px] px-4 py-4 sm:py-5 lg:px-6">
        <div className="grid gap-4">
          <Card className="overflow-hidden">
            <CardContent className="grid gap-4 pt-5">
              <div className="h-1.5 rounded-full bg-muted/70">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {steps.map((step) => {
                  const Icon = step.icon;
                  const isActive = activeStep === step.number;
                  return (
                    <button
                      key={step.number}
                      type="button"
                      disabled={!step.unlocked}
                      onClick={() => moveToStep(step.number)}
                      className={`workflow-item text-left ${
                        isActive
                          ? "border-primary/40 bg-primary/[0.03]"
                          : step.done
                            ? "border-accent/20 bg-accent/[0.04]"
                            : step.unlocked
                              ? "border-border/70 bg-background hover:border-primary/30"
                              : "border-border/60 bg-muted/30 opacity-75"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl sm:size-9 ${
                            step.done ? "bg-accent text-accent-foreground" : step.unlocked ? step.tone : "bg-muted text-muted-foreground"
                          }`}
                        >
                          <Icon className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="section-kicker">{copy.workflow.stepLabel} {step.number}</div>
                          <div className="mt-1 text-sm font-semibold text-slate-900 sm:text-[15px]">{step.title}</div>
                          <p className="mt-1 text-xs leading-4 text-muted-foreground sm:leading-5">
                            {step.unlocked ? step.description : copy.workflow.lockedHint}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {activeStep === 1 ? (
            <StageFrame
              icon={MapPinned}
              stepNumber={1}
              tone={steps[0].tone}
              title={copy.workflow.step1Title}
              description={copy.workflow.step1Description}
              footer={
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted-foreground">{copy.map.step3Body}</p>
                  <Button disabled={!step1Done} size="lg" onClick={() => setActiveStep(2)}>
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

                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
                  <StepChecklistPanel
                    title={copy.workflow.doneWhen}
                    readyLabel={copy.workflow.checklistReady}
                    pendingLabel={copy.workflow.checklistPending}
                    items={activeChecklist}
                  />
                  <Card className="bg-muted/20">
                    <CardHeader className="pb-3">
                      <CardTitle>{copy.workflow.projectSnapshot}</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-3">
                      {roofSummaryItems.map((item) => (
                        <MetricRow key={item.label} label={item.label} value={item.value} />
                      ))}
                    </CardContent>
                  </Card>
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
              footer={
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <Button variant="outline" size="lg" onClick={() => setActiveStep(1)}>
                    <ChevronLeft className="size-4" />
                    {copy.workflow.back}
                  </Button>
                  <Button
                    size="lg"
                    onClick={() => {
                      setSystemReviewed(true);
                      setActiveStep(3);
                    }}
                  >
                    {copy.workflow.continueWithCurrent}
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              }
            >
              <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
                <StepChecklistPanel
                  title={copy.workflow.doneWhen}
                  readyLabel={copy.workflow.checklistReady}
                  pendingLabel={copy.workflow.checklistPending}
                  items={activeChecklist}
                />
                <SystemSelector
                  topology={topology}
                  pricingPresetId={pricingPresetId}
                  onTopologyChange={handleTopologyChange}
                  onPricingPresetChange={handlePricingPresetChange}
                />
              </div>
            </StageFrame>
          ) : null}

          {activeStep === 3 ? (
            <StageFrame
              icon={WalletCards}
              stepNumber={3}
              tone={steps[2].tone}
              title={copy.workflow.step3Title}
              description={copy.workflow.step3Description}
              footer={
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <Button variant="outline" size="lg" onClick={() => setActiveStep(2)}>
                    <ChevronLeft className="size-4" />
                    {copy.workflow.back}
                  </Button>
                  <Button
                    size="lg"
                    onClick={() => {
                      setValidationReviewed(true);
                      setActiveStep(4);
                    }}
                  >
                    {copy.workflow.openProposal}
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              }
            >
              <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
                <div className="grid gap-4">
                  <StepChecklistPanel
                    title={copy.workflow.doneWhen}
                    readyLabel={copy.workflow.checklistReady}
                    pendingLabel={copy.workflow.checklistPending}
                    items={activeChecklist}
                  />
                  <Card>
                    <CardHeader>
                      <CardTitle>{copy.tariff.title}</CardTitle>
                      <CardDescription>{copy.tariff.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                      <div className="grid gap-2">
                        <label className="text-sm font-medium">{copy.tariff.ftRate}</label>
                        <Input
                          type="number"
                          step="0.01"
                          value={ftRateTHBPerKWh}
                          onChange={(event) => {
                            setValidationReviewed(true);
                            setFtRateTHBPerKWh(Number(event.target.value));
                          }}
                        />
                      </div>
                      <div className="grid gap-2">
                        <label className="text-sm font-medium">{copy.tariff.selfUseRatio}</label>
                        <Input
                          type="number"
                          step="0.05"
                          min="0"
                          max="1"
                          value={selfConsumptionRatio}
                          onChange={(event) => {
                            setValidationReviewed(true);
                            setSelfConsumptionRatio(Number(event.target.value));
                          }}
                        />
                      </div>
                      <div className="grid gap-2">
                        <label className="text-sm font-medium">{copy.tariff.exportRate}</label>
                        <Input
                          type="number"
                          step="0.1"
                          value={exportRateTHBPerKWh}
                          onChange={(event) => {
                            setValidationReviewed(true);
                            setExportRateTHBPerKWh(Number(event.target.value));
                          }}
                        />
                      </div>
                    </CardContent>
                  </Card>
                  <FinanceSelector selectedFinanceIds={selectedFinanceIds} onChange={handleFinanceChange} />
                </div>

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
                />
              </div>
            </StageFrame>
          ) : null}

          {activeStep === 4 ? (
            <StageFrame
              icon={Sparkles}
              stepNumber={4}
              tone={steps[3].tone}
              title={copy.workflow.step4Title}
              description={copy.workflow.step4Description}
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
              <div className="grid gap-4">
                <StepChecklistPanel
                  title={copy.workflow.doneWhen}
                  readyLabel={copy.workflow.checklistReady}
                  pendingLabel={copy.workflow.checklistPending}
                  items={activeChecklist}
                />
                <QuoteResults
                  result={result}
                  solarInsights={activeSolarInsights}
                  topologySummary={topologySummary}
                  pricingPresetLabel={pricingMeta.label}
                  financeSelectionCount={selectedFinanceIds.length}
                />
              </div>
            </StageFrame>
          ) : null}
        </div>
      </main>
    </div>
  );
}

function StageFrame({ icon: Icon, stepNumber, tone, title, description, children, footer }: StageFrameProps) {
  const copy = useAppCopy();

  return (
    <section className="surface-panel overflow-hidden">
      <div className="border-b border-border/60 p-4 sm:p-5 md:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className={`flex size-10 items-center justify-center rounded-xl ${tone}`}>
              <Icon className="size-4" />
            </div>
            <div>
              <div className="section-kicker text-primary">
                {copy.workflow.stepLabel} {stepNumber}
              </div>
              <h2 className="mt-1 text-[1.2rem] font-semibold leading-tight tracking-tight text-slate-900 sm:text-[1.4rem] md:text-[1.7rem]">{title}</h2>
              <p className="mt-1 max-w-2xl text-sm leading-5 text-muted-foreground sm:leading-6">{description}</p>
            </div>
          </div>
        </div>
      </div>
      <div className="p-4 sm:p-5 md:p-6">{children}</div>
      <div className="border-t border-border/60 p-4 sm:p-5 md:p-6">{footer}</div>
    </section>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="text-sm leading-5 text-muted-foreground">{label}</div>
      <div className="text-right text-sm font-semibold leading-5 text-slate-900">{value}</div>
    </div>
  );
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface-panel p-4">
      <div className="metric-label">{label}</div>
      <div className="mt-2 text-sm font-semibold leading-5 text-slate-900 sm:leading-6">{value}</div>
    </div>
  );
}

function StepChecklistPanel({
  title,
  readyLabel,
  pendingLabel,
  items,
}: {
  title: string;
  readyLabel: string;
  pendingLabel: string;
  items: Array<{ label: string; done: boolean }>;
}) {
  const copy = useAppCopy();
  const allDone = items.every((item) => item.done);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>{title}</CardTitle>
        <CardDescription>{allDone ? readyLabel : pendingLabel}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2.5">
        {items.map((item, index) => (
          <div key={item.label} className="flex items-start gap-3 rounded-[0.9rem] border border-border/70 bg-background p-3.5">
            <div
              className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full ${
                item.done ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {item.done ? <CheckCircle2 className="size-3.5" /> : <CircleDashed className="size-3.5" />}
            </div>
            <div className="min-w-0">
              <div className="section-kicker">{copy.workflow.stepLabel} {index + 1}</div>
              <div className="mt-1 text-sm leading-6 text-slate-700">{item.label}</div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
