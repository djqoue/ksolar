"use client";

import Link from "next/link";
import { startTransition, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, LoaderCircle, LogOut, MapPinned, Save, type LucideIcon, Settings2, Sparkles, UserRound } from "lucide-react";
import { saveCustomerIntakeValue } from "@/app/(sales)/customer-intake/actions";
import { saveQuote } from "@/app/(sales)/quote/actions";
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
import { normalizeFinanceProductIds } from "@/lib/calc/finance";
import { calculateMaxLayout, type StructuralLoadStatus } from "@/lib/calc/max-layout";
import { calculatePpaReturns } from "@/lib/calc/ppa";
import { FINANCE_PRODUCTS } from "@/lib/config/finance-products";
import { filterResidentialInverters } from "@/lib/config/inverter-catalog";
import { DEFAULT_PANEL_ID, findPanel, getPanelAreaM2 } from "@/lib/config/panel-catalog";
import { CAPACITY_TIERS, DEFAULT_TOPOLOGY, SOLAR_DEFAULTS } from "@/lib/config/solar";
import {
  getCustomerIntakeCopy,
  initialCustomerIntake,
  initialCustomerIntakeSaveState,
  resetCustomerIntakeSaveStateForEdit,
  validateCustomerIntake,
} from "@/lib/customer-intake";
import { getLocalizedPresetMeta, LANGUAGE_OPTIONS, LOCALE_COOKIE_NAME, type AppLocale } from "@/lib/i18n";
import { createEmptyMapSelection, resolveRestoredMapCenter } from "@/lib/maps";
import { requestSolarDataLayers, requestSolarInsights, SolarApiError } from "@/lib/solar-client";
import {
  buildSolarSelectionMatchSummary,
  getGoogleSolarSellableAnnualGeneration,
  getGoogleSolarSellableFit,
  getSelectionReferencePoint,
  type SellablePanelProfile,
} from "@/lib/solar";
import { formatCurrency, formatNumber } from "@/lib/utils";
import type { MapSelectionSummary, PricingPreset, QuoteScenarioInput } from "@/types/quote";
import type { SaveQuoteState } from "@/types/quote-save";
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
  const [mapSearchValue, setMapSearchValue] = useState(initialCustomerIntake.addressText);
  const [topology, setTopology] = useState(DEFAULT_TOPOLOGY);
  const [pricingPresetId, setPricingPresetId] = useState<PricingPreset["id"]>("standard");
  const [selectedPanelId, setSelectedPanelId] = useState<string>(DEFAULT_PANEL_ID);
  const [selectedInverterId, setSelectedInverterId] = useState<string>("auto");
  const [selectedBatteryId, setSelectedBatteryId] = useState<string>("auto");
  const [selectedTierId, setSelectedTierId] = useState<CapacityTierId | null>(null);
  const [customerIntake, setCustomerIntake] = useState(initialCustomerIntake);
  const [customerSaveState, setCustomerSaveState] = useState(initialCustomerIntakeSaveState);
  const [isAutoSavingCustomer, setIsAutoSavingCustomer] = useState(false);
  const [isSavingQuote, setIsSavingQuote] = useState(false);
  const [quoteSaveState, setQuoteSaveState] = useState<SaveQuoteState | null>(null);
  const [quoteProjectId, setQuoteProjectId] = useState<string | null>(null);
  const [pendingQuoteVersion, setPendingQuoteVersion] = useState<{ revisionKey: string; id: string } | null>(null);
  const [confirmedRevisionKey, setConfirmedRevisionKey] = useState<string | null>(null);
  const [savedRevisionKey, setSavedRevisionKey] = useState<string | null>(null);
  const [selectedFinanceIds, setSelectedFinanceIds] = useState(
    FINANCE_PRODUCTS.filter((product) => product.enabledByDefault).map((product) => product.id),
  );
  const [activeStep, setActiveStep] = useState<StepNumber>(1);
  const [step3SheetExpanded, setStep3SheetExpanded] = useState(false);
  const [mapFlyoverRequestId, setMapFlyoverRequestId] = useState(0);
  const [ftRateTHBPerKWh, setFtRateTHBPerKWh] = useState<number>(SOLAR_DEFAULTS.defaultFtRateTHBPerKWh);
  const [selfConsumptionRatio, setSelfConsumptionRatio] = useState<number>(SOLAR_DEFAULTS.defaultSelfConsumptionRatio);
  const [exportRateTHBPerKWh, setExportRateTHBPerKWh] = useState<number>(SOLAR_DEFAULTS.defaultExportRateTHBPerKWh);
  const [ppaRateTHBPerKWh, setPpaRateTHBPerKWh] = useState<number>(SOLAR_DEFAULTS.defaultPpaRateTHBPerKWh);
  const [ppaCapexTHBPerWp, setPpaCapexTHBPerWp] = useState<number>(SOLAR_DEFAULTS.defaultPpaCapexTHBPerWp);
  const [ppaAnnualOMRatio, setPpaAnnualOMRatio] = useState<number>(SOLAR_DEFAULTS.annualOMRatio);
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
  const step2Done = customerDone && roofDone;

  useEffect(() => {
    if (activeStep === 3) {
      setStep3SheetExpanded(false);
    }
  }, [activeStep]);

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

  const solarSelectionMatch = useMemo(
    () => buildSolarSelectionMatchSummary(mapSelection.shapes, activeSolarInsights),
    [activeSolarInsights, mapSelection.shapes],
  );
  const selectedPanelProfile = useMemo<SellablePanelProfile>(() => {
    const panel = findPanel(selectedPanelId) ?? findPanel(DEFAULT_PANEL_ID);

    return {
      powerWp: panel?.peakPowerW || SOLAR_DEFAULTS.panelPowerWp,
      areaM2: getPanelAreaM2(panel) || SOLAR_DEFAULTS.panelAreaM2,
      longSideM: panel?.dimLong ? panel.dimLong / 1000 : undefined,
      shortSideM: panel?.dimShort ? panel.dimShort / 1000 : undefined,
      weightKg: panel?.weightKg ?? null,
    };
  }, [selectedPanelId]);
  const maxLayout = useMemo(
    () =>
      calculateMaxLayout({
        googleMatchedRoof: solarSelectionMatch.status === "inside-selection",
        googleReference: activeSolarInsights
          ? {
              maxArrayAreaM2: activeSolarInsights.maxArrayAreaMeters2,
              maxConfigPanelCount:
                activeSolarInsights.maxConfig?.panelsCount ||
                activeSolarInsights.maxArrayPanelsCount,
              maxConfigYearlyEnergyKWh:
                activeSolarInsights.maxConfig?.yearlyEnergyDcKwh,
              panelCapacityWp: activeSolarInsights.panelCapacityWatts,
            }
          : null,
        manualUsableAreaM2: mapSelection.usableAreaM2,
        panel: {
          areaM2: selectedPanelProfile.areaM2,
          lengthM: selectedPanelProfile.longSideM || 0,
          powerWp: selectedPanelProfile.powerWp,
          weightKg: selectedPanelProfile.weightKg ?? null,
          widthM: selectedPanelProfile.shortSideM || 0,
        },
        selectedRoofAreaM2: mapSelection.grossAreaM2,
      }),
    [
      activeSolarInsights,
      mapSelection.grossAreaM2,
      mapSelection.usableAreaM2,
      selectedPanelProfile,
      solarSelectionMatch.status,
    ],
  );
  const manualWholeRoofLayout = useMemo(
    () =>
      calculateMaxLayout({
        googleMatchedRoof: false,
        googleReference: null,
        manualUsableAreaM2: mapSelection.usableAreaM2,
        panel: {
          areaM2: selectedPanelProfile.areaM2,
          lengthM: selectedPanelProfile.longSideM || 0,
          powerWp: selectedPanelProfile.powerWp,
          weightKg: selectedPanelProfile.weightKg ?? null,
          widthM: selectedPanelProfile.shortSideM || 0,
        },
        selectedRoofAreaM2: mapSelection.grossAreaM2,
      }),
    [
      mapSelection.grossAreaM2,
      mapSelection.usableAreaM2,
      selectedPanelProfile,
    ],
  );
  const ppaReturns = useMemo(
    () =>
      calculatePpaReturns({
        annualGenerationKWh: maxLayout.annualGenerationKWh,
        capacityWp: maxLayout.capacityWp,
        capexTHBPerWp: ppaCapexTHBPerWp,
        annualOMRatio: ppaAnnualOMRatio,
        ppaRateTHBPerKWh,
      }),
    [
      maxLayout.annualGenerationKWh,
      maxLayout.capacityWp,
      ppaAnnualOMRatio,
      ppaCapexTHBPerWp,
      ppaRateTHBPerKWh,
    ],
  );

  const quoteScenarioInput = useMemo<QuoteScenarioInput>(() => {
    const googleSellableFit = getGoogleSolarSellableFit(activeSolarInsights, selectedPanelProfile);
    const googleSellableAnnualGeneration = getGoogleSolarSellableAnnualGeneration(
      activeSolarInsights,
      selectedPanelProfile,
    );

    return {
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
    };
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
  const result = useMemo(() => calculateQuoteScenario(quoteScenarioInput), [quoteScenarioInput]);
  const quoteRevisionKey = useMemo(() => JSON.stringify(quoteScenarioInput), [quoteScenarioInput]);
  const quoteConfigurationKey = useMemo(
    () => JSON.stringify({ ...quoteScenarioInput, selectedTierId: null }),
    [quoteScenarioInput],
  );
  const step3Done = step2Done && confirmedRevisionKey === quoteConfigurationKey;
  const step4Done =
    step3Done &&
    savedRevisionKey === quoteRevisionKey &&
    quoteSaveState?.status === "success";
  const maxUnlockedStep: StepNumber = step3Done ? 4 : step2Done ? 3 : step1Done ? 2 : 1;

  useEffect(() => {
    if (activeStep > maxUnlockedStep) {
      setActiveStep(maxUnlockedStep);
    }
  }, [activeStep, maxUnlockedStep]);

  useEffect(() => {
    const focusHandle = window.requestAnimationFrame(() => {
      document.getElementById(`workflow-step-heading-${activeStep}`)?.focus({ preventScroll: true });
    });

    return () => window.cancelAnimationFrame(focusHandle);
  }, [activeStep]);

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
        unlocked: step3Done,
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

    if (step3Done) {
      return 75;
    }

    if (step2Done) {
      return 50;
    }

    if (step1Done) {
      return 25;
    }

    return 0;
  }, [step1Done, step2Done, step3Done, step4Done]);

  const activeStepState = steps.find((step) => step.number === activeStep) ?? steps[0];
  const isImmersiveStep = activeStep === 2 || activeStep === 3;
  const pricingMeta = getLocalizedPresetMeta(locale, pricingPresetId);
  const stepShortLabels =
    locale === "zh"
      ? ["客户", "屋顶", "方案", "报价"]
      : locale === "th"
        ? ["ลูกค้า", "หลังคา", "ระบบ", "ราคา"]
        : ["Customer", "Roof", "System", "Quote"];
  const signOutLabel = locale === "zh" ? "退出" : locale === "th" ? "ออกจากระบบ" : "Sign out";
  const languageLabel = locale === "zh" ? "语言" : locale === "th" ? "ภาษา" : "Language";
  const workflowProgressLabel =
    locale === "zh" ? "报价流程进度" : locale === "th" ? "ความคืบหน้าการเสนอราคา" : "Quote workflow progress";
  const quoteSaveCopy =
    locale === "zh"
      ? {
          save: "保存报价版本",
          saving: "正在保存",
          saved: "当前版本已保存",
          changed: "方案已有调整，请保存新版本。",
          customerRequired: "请先保存客户资料，再保存报价。",
          invalid: "当前方案不可保存，请先处理报价中的问题。",
          failed: "报价保存失败，请稍后重试。",
          defaultTitle: "太阳能报价",
        }
      : locale === "th"
        ? {
            save: "บันทึกเวอร์ชันใบเสนอราคา",
            saving: "กำลังบันทึก",
            saved: "บันทึกเวอร์ชันปัจจุบันแล้ว",
            changed: "แพ็กเกจมีการเปลี่ยนแปลง กรุณาบันทึกเวอร์ชันใหม่",
            customerRequired: "กรุณาบันทึกข้อมูลลูกค้าก่อนบันทึกใบเสนอราคา",
            invalid: "ยังบันทึกแพ็กเกจนี้ไม่ได้ กรุณาแก้รายการที่ต้องตรวจสอบก่อน",
            failed: "บันทึกใบเสนอราคาไม่สำเร็จ กรุณาลองอีกครั้ง",
            defaultTitle: "ใบเสนอราคาพลังงานแสงอาทิตย์",
          }
        : {
            save: "Save quote version",
            saving: "Saving",
            saved: "Current version saved",
            changed: "The proposal changed. Save a new version.",
            customerRequired: "Save the customer record before saving the quote.",
            invalid: "This proposal cannot be saved until its quote issues are resolved.",
            failed: "The quote could not be saved. Please try again.",
            defaultTitle: "Solar quote",
          };

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
          editRoof: "编辑已选屋顶",
          roofMax: "屋顶上限",
          maxPanels: "最多板数",
          recognizedRoofMax: "已识别上限",
          recognizedMaxPanels: "已识别可铺",
          recognizedAnnualGeneration: "已识别年发电",
          quoteSize: "报价容量",
          annualGeneration: "满铺年发电",
          payback: "回本周期",
          investment: "总投资",
          googleMaxPanels: "Google 最大板数",
          ksolarMaxPanels: "按当前组件可铺",
          googleModeledArea: "Google 建模屋顶",
          selectedArea: "你圈选屋顶",
          maxLayoutTitle: "Max Layout 满铺校验",
          maxLayoutSourceGoogle: "来源：Google Solar 最大阵列面积",
          maxLayoutSourceGooglePartial: "来源：Google Solar 已识别屋顶，下方不是整栋厂房最大值",
          maxLayoutSourceManual: "来源：手动画图可用面积",
          manualWholeRoofEstimate: (panels: string, capacity: string, generation: string) =>
            `按你圈选的完整屋顶粗估约 ${panels} / ${capacity} / ${generation}，但这部分还没有经过 Google 阴影、坡面和障碍物校验。`,
          arrayArea: "可铺阵列面积",
          panelSpec: "组件规格",
          totalWeight: "系统重量",
          unitLoad: "单位荷载",
          roofAverageLoad: "屋顶平均荷载",
          structuralCheck: "承重初筛",
          structuralOk: "初筛可行",
          structuralReview: "需要结构复核",
          structuralOverLimit: "超过参考上限",
          structuralUnknown: "缺少重量数据",
          structuralNote: "这是销售现场初筛，不等同结构签核；最终要按屋面檩条、彩钢瓦、支架固定方式和当地工程师复核。",
          partialAreaNotice: (googleArea: string, selectedArea: string) =>
            `Google Solar 这次只建模约 ${googleArea}，明显小于你圈选的 ${selectedArea}。这通常表示它只识别到厂区里的一栋或一部分屋顶；要算整厂最大铺满，请逐栋点选/圈选，或先按手动画图面积估算。`,
          expandDetails: "展开详情",
          collapseDetails: "收起看屋顶",
          compactSummary: "方案摘要",
          quickAdjust: "现场调整",
          quickAdjustHint: "相位、系统和电池会即时影响报价。",
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
          ppaTitle: "工厂 PPA 回本",
          ppaHint: "按上方 Max Layout 发电量计算投资方现金流，不使用住宅 BOM 报价。",
          ppaRate: "PPA 售电价",
          ppaCapex: "EPC 单瓦成本",
          ppaOM: "年 O&M",
          ppaPayback: "PPA 回本",
          ppaCapexTotal: "初始投资",
          ppaRevenue: "首年收入",
          ppaNetCash: "首年净现金流",
          ppaContractProfit: "15年净收益",
          ppaPartialNote: "注意：当前 PPA 按 Google 已识别屋顶计算，不是整厂全部屋顶。",
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
            roofMax: "ขนาดหลังคาสูงสุด",
            maxPanels: "แผงสูงสุด",
            recognizedRoofMax: "ขนาดที่ Google เห็น",
            recognizedMaxPanels: "แผงที่ Google เห็น",
            recognizedAnnualGeneration: "ไฟ/ปีที่ Google เห็น",
            quoteSize: "ขนาดระบบ",
            annualGeneration: "ไฟผลิตสูงสุด/ปี",
            payback: "คืนทุน",
            investment: "เงินลงทุน",
            googleMaxPanels: "แผงสูงสุด Google",
            ksolarMaxPanels: "เทียบแผงปัจจุบัน",
            googleModeledArea: "พื้นที่ Google",
            selectedArea: "พื้นที่ที่เลือก",
            maxLayoutTitle: "ตรวจ Max Layout",
            maxLayoutSourceGoogle: "แหล่งข้อมูล: พื้นที่วางแผงสูงสุดจาก Google Solar",
            maxLayoutSourceGooglePartial: "แหล่งข้อมูล: หลังคาส่วนที่ Google เห็น ไม่ใช่ค่าสูงสุดทั้งโรงงาน",
            maxLayoutSourceManual: "แหล่งข้อมูล: พื้นที่ใช้งานจากการวาดเอง",
            manualWholeRoofEstimate: (panels: string, capacity: string, generation: string) =>
              `หากประเมินจากพื้นที่ที่เลือกทั้งหมด จะได้ประมาณ ${panels} / ${capacity} / ${generation} แต่ยังไม่ได้ตรวจเงา ความลาด และสิ่งกีดขวางด้วย Google`,
            arrayArea: "พื้นที่แผง",
            panelSpec: "สเปกแผง",
            totalWeight: "น้ำหนักระบบ",
            unitLoad: "โหลดต่อพื้นที่",
            roofAverageLoad: "โหลดเฉลี่ยบนหลังคา",
            structuralCheck: "ตรวจรับน้ำหนัก",
            structuralOk: "ผ่านเบื้องต้น",
            structuralReview: "ต้องให้วิศวกรตรวจ",
            structuralOverLimit: "เกินค่าประเมิน",
            structuralUnknown: "ไม่มีข้อมูลน้ำหนัก",
            structuralNote: "เป็นการคัดกรองหน้างานเท่านั้น ไม่ใช่การรับรองโครงสร้างขั้นสุดท้าย ต้องตรวจแบบหลังคา แป วัสดุมุง และวิธีติดตั้งจริง",
            partialAreaNotice: (googleArea: string, selectedArea: string) =>
              `Google Solar สร้างโมเดลหลังคาเพียงประมาณ ${googleArea} ซึ่งเล็กกว่าพื้นที่ที่เลือก ${selectedArea} มาก มักแปลว่าระบบเห็นแค่อาคารบางส่วนในโรงงาน หากต้องการค่าสูงสุดทั้งโรงงาน ให้เลือก/วาดทีละอาคาร หรือใช้พื้นที่ที่วาดเองประเมินก่อน`,
            expandDetails: "ดูรายละเอียด",
            collapseDetails: "ย่อเพื่อดูหลังคา",
            compactSummary: "สรุปแพ็กเกจ",
            quickAdjust: "ปรับหน้างาน",
            quickAdjustHint: "เฟส ระบบ และแบตเตอรี่จะอัปเดตราคาเสนอทันที",
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
            ppaTitle: "คืนทุน Factory PPA",
            ppaHint: "คำนวณกระแสเงินสดฝั่งผู้ลงทุนจาก Max Layout ไม่ใช้ราคา BOM บ้าน",
            ppaRate: "ราคา PPA",
            ppaCapex: "ต้นทุน EPC/Wp",
            ppaOM: "O&M ต่อปี",
            ppaPayback: "คืนทุน PPA",
            ppaCapexTotal: "เงินลงทุนเริ่มต้น",
            ppaRevenue: "รายได้ปีแรก",
            ppaNetCash: "เงินสดสุทธิปีแรก",
            ppaContractProfit: "กำไรสุทธิ 15 ปี",
            ppaPartialNote: "หมายเหตุ: PPA นี้คำนวณจากหลังคาส่วนที่ Google เห็น ไม่ใช่ทั้งโรงงาน",
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
            roofMax: "Roof limit",
            maxPanels: "Max panels",
            recognizedRoofMax: "Recognized limit",
            recognizedMaxPanels: "Recognized fit",
            recognizedAnnualGeneration: "Recognized generation",
            quoteSize: "Quote size",
            annualGeneration: "Max annual generation",
            payback: "Payback",
            investment: "Investment",
            googleMaxPanels: "Google max panels",
            ksolarMaxPanels: "Current module fit",
            googleModeledArea: "Google modeled roof",
            selectedArea: "Selected roof",
            maxLayoutTitle: "Max layout check",
            maxLayoutSourceGoogle: "Source: Google Solar max array area",
            maxLayoutSourceGooglePartial: "Source: Google-recognized roof only, not the whole selected factory roof",
            maxLayoutSourceManual: "Source: manual usable roof area",
            manualWholeRoofEstimate: (panels: string, capacity: string, generation: string) =>
              `Your full selected roof rough estimate is about ${panels} / ${capacity} / ${generation}, but that part has not been validated by Google shade, pitch, or obstruction data.`,
            arrayArea: "Array area",
            panelSpec: "Panel spec",
            totalWeight: "System weight",
            unitLoad: "Unit load",
            roofAverageLoad: "Roof avg load",
            structuralCheck: "Structural pre-check",
            structuralOk: "Looks feasible",
            structuralReview: "Engineer review",
            structuralOverLimit: "Above reference limit",
            structuralUnknown: "Missing weight data",
            structuralNote: "This is a field pre-check, not a structural sign-off. Final approval needs purlin, roof sheet, mounting method, and local engineer review.",
            partialAreaNotice: (googleArea: string, selectedArea: string) =>
              `Google Solar modeled about ${googleArea}, which is much smaller than your selected ${selectedArea}. That usually means it only recognized one building or part of the factory roof. For whole-factory max fill, select/draw each roof block or use the manual roof area estimate first.`,
            expandDetails: "Expand details",
            collapseDetails: "Collapse to roof",
            compactSummary: "Plan summary",
            quickAdjust: "Field adjustments",
            quickAdjustHint: "Phase, system mode, and battery update the quote instantly.",
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
            ppaTitle: "Factory PPA payback",
            ppaHint: "Investor cashflow based on Max Layout generation, not residential BOM pricing.",
            ppaRate: "PPA tariff",
            ppaCapex: "EPC cost/Wp",
            ppaOM: "Annual O&M",
            ppaPayback: "PPA payback",
            ppaCapexTotal: "Initial investment",
            ppaRevenue: "Year-1 revenue",
            ppaNetCash: "Year-1 net cashflow",
            ppaContractProfit: "15y net profit",
            ppaPartialNote: "Note: this PPA uses the Google-recognized roof only, not the whole factory roof.",
          };
  const numberInputError =
    locale === "zh"
      ? "请输入范围内的有效数字。"
      : locale === "th"
        ? "กรุณากรอกตัวเลขที่อยู่ในช่วงที่กำหนด"
        : "Enter a valid number within the allowed range.";

  const solarStateLabel =
    solarStatus === "loading"
      ? step3Copy.solarLoading
      : activeSolarInsights
        ? step3Copy.solarReady
        : solarErrorMessage
          ? step3Copy.solarWarning
          : step3Copy.solarWaiting;
  const quotedSizeValue = result.quotedSystemSizeWp > 0 ? `${formatNumber(result.quotedSystemSizeWp / 1000, 1)} kWp` : "N/A";
  const roofLimitValue = maxLayout.capacityWp > 0 ? `${formatNumber(maxLayout.capacityWp / 1000, 1)} kWp` : "N/A";
  const panelUnit = locale === "zh" ? "片" : locale === "th" ? "แผง" : "pcs";
  const maxPanelValue = maxLayout.panelCount > 0 ? `${formatNumber(maxLayout.panelCount)} ${panelUnit}` : "N/A";
  const paybackValue = result.paybackYears ? `${formatNumber(result.paybackYears, 1)} yr` : "N/A";
  const annualGenerationValue =
    maxLayout.annualGenerationKWh > 0
      ? `${formatNumber(maxLayout.annualGenerationKWh)} kWh`
      : "N/A";
  const ppaPaybackValue = ppaReturns.simplePaybackYears
    ? `${formatNumber(ppaReturns.simplePaybackYears, 1)} yr`
    : "N/A";
  const investmentValue =
    result.finance.financeAdjustedPriceTHB > 0
      ? `THB ${formatNumber(result.finance.financeAdjustedPriceTHB)}`
      : "N/A";
  const googleModeledRoofAreaM2 =
    activeSolarInsights?.roofAreaMeters2 || activeSolarInsights?.roofGroundAreaMeters2 || null;
  const selectedRoofAreaM2 = mapSelection.grossAreaM2 || null;
  const shouldShowPartialGoogleAreaNotice =
    Boolean(
      googleModeledRoofAreaM2 &&
        selectedRoofAreaM2 &&
        selectedRoofAreaM2 > 0 &&
        googleModeledRoofAreaM2 / selectedRoofAreaM2 < 0.65,
    );
  const maxLayoutIsGooglePartial =
    shouldShowPartialGoogleAreaNotice && maxLayout.source === "google-solar";
  const maxLayoutSourceLabel =
    maxLayoutIsGooglePartial
      ? step3Copy.maxLayoutSourceGooglePartial
      : maxLayout.source === "google-solar"
        ? step3Copy.maxLayoutSourceGoogle
      : step3Copy.maxLayoutSourceManual;
  const maxPanelLabel = maxLayoutIsGooglePartial
    ? step3Copy.recognizedMaxPanels
    : step3Copy.maxPanels;
  const roofLimitLabel = maxLayoutIsGooglePartial
    ? step3Copy.recognizedRoofMax
    : step3Copy.roofMax;
  const annualGenerationLabel = maxLayoutIsGooglePartial
    ? step3Copy.recognizedAnnualGeneration
    : step3Copy.annualGeneration;
  const manualWholeRoofPanelValue =
    manualWholeRoofLayout.panelCount > 0
      ? `${formatNumber(manualWholeRoofLayout.panelCount)} ${panelUnit}`
      : "N/A";
  const manualWholeRoofCapacityValue =
    manualWholeRoofLayout.capacityWp > 0
      ? `${formatNumber(manualWholeRoofLayout.capacityWp / 1000, 1)} kWp`
      : "N/A";
  const manualWholeRoofGenerationValue =
    manualWholeRoofLayout.annualGenerationKWh > 0
      ? `${formatNumber(manualWholeRoofLayout.annualGenerationKWh)} kWh`
      : "N/A";
  const panelSpecValue =
    selectedPanelProfile.longSideM && selectedPanelProfile.shortSideM
      ? `${formatNumber(selectedPanelProfile.longSideM, 2)} × ${formatNumber(
          selectedPanelProfile.shortSideM,
          2,
        )} m · ${formatNumber(selectedPanelProfile.powerWp)}W`
      : `${formatNumber(selectedPanelProfile.areaM2, 2)} m² · ${formatNumber(selectedPanelProfile.powerWp)}W`;
  const structuralLabel = getStructuralStatusLabel(
    maxLayout.structuralLoadStatus,
    {
      ok: step3Copy.structuralOk,
      overLimit: step3Copy.structuralOverLimit,
      review: step3Copy.structuralReview,
      unknown: step3Copy.structuralUnknown,
    },
  );
  const structuralTone = getStructuralStatusTone(maxLayout.structuralLoadStatus);

  const fetchSolarData = useCallback(async (requestPoint: SolarLatLng, requestKey: string) => {
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
  }, [locale]);

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

  useEffect(() => {
    if (!solarRequestKey || !solarRequestPoint || activeStep < 3) {
      return;
    }

    if (solarStatus === "loading" || solarStatus === "error") {
      return;
    }

    if (solarInsightsKey === solarRequestKey) {
      return;
    }

    void fetchSolarData(solarRequestPoint, solarRequestKey);
  }, [
    activeStep,
    fetchSolarData,
    solarInsightsKey,
    solarRequestKey,
    solarRequestPoint,
    solarStatus,
  ]);

  const moveToStep = (step: StepNumber) => {
    if (isSavingQuote) {
      return;
    }

    const next = steps.find((item) => item.number === step);
    if (!next?.unlocked) {
      return;
    }

    setActiveStep(step);
  };

  const handleMapSelectionChange = useCallback((value: MapSelectionSummary) => {
    setMapSelection(value);
    setSolarStatus("idle");
    setSolarErrorMessage(null);
  }, []);

  const handleMapCenterChange = useCallback((value: SolarLatLng | null) => {
    setMapCenter(value);
    setSolarStatus("idle");
    setSolarErrorMessage(null);
  }, []);

  const handleMapSearchValueChange = useCallback((value: string) => {
    setMapSearchValue(value);
  }, []);

  const handleTopologyChange = (value: SystemTopology) => {
    setTopology(value);
    setSelectedInverterId((currentId) => {
      if (currentId === "auto") {
        return currentId;
      }

      const remainsCompatible = filterResidentialInverters(value.phase, value.mode).some(
        (inverter) => inverter.id === currentId,
      );
      return remainsCompatible ? currentId : "auto";
    });
  };

  const handlePricingPresetChange = (value: PricingPreset["id"]) => {
    setPricingPresetId(value);
  };

  const handleFinanceChange = (ids: string[]) => {
    setSelectedFinanceIds(normalizeFinanceProductIds(ids));
  };

  const handleCustomerIntakeChange = (value: typeof customerIntake) => {
    const siteChanged =
      value.addressText.trim() !== customerIntake.addressText.trim() ||
      value.latitude.trim() !== customerIntake.latitude.trim() ||
      value.longitude.trim() !== customerIntake.longitude.trim();

    setCustomerIntake(value);

    if (siteChanged) {
      setMapSearchValue(value.addressText);
      setMapSelection(createEmptyMapSelection());
      setMapCenter(null);
      setSolarInsights(null);
      setSolarInsightsKey(null);
      setSolarDataLayers(null);
      setSolarDataLayersKey(null);
      setSolarStatus("idle");
      setSolarErrorMessage(null);
      setSelectedTierId(null);
      setConfirmedRevisionKey(null);
      setSavedRevisionKey(null);
      setQuoteSaveState(null);
      setQuoteProjectId(null);
      setPendingQuoteVersion(null);
    }

    if (customerSaveState.status !== "idle") {
      setCustomerSaveState((state) => resetCustomerIntakeSaveStateForEdit(state));
    }
  };

  const customerFocusPoint = useMemo(() => parseCustomerFocusPoint(customerIntake), [customerIntake]);
  const restoredMapCenter = useMemo(
    () => resolveRestoredMapCenter(mapSelection.shapes, mapCenter, customerFocusPoint),
    [customerFocusPoint, mapCenter, mapSelection.shapes],
  );

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
        customerId: customerSaveState.customerId,
      });
      return;
    }

    if (customerSaveState.status === "success") {
      setActiveStep(2);
      setMapFlyoverRequestId((requestId) => requestId + 1);
      return;
    }

    const customerId = customerSaveState.customerId ?? crypto.randomUUID();
    setCustomerSaveState({
      ...initialCustomerIntakeSaveState,
      customerId,
    });
    setIsAutoSavingCustomer(true);

    try {
      const nextSaveState = await saveCustomerIntakeValue(customerIntake, locale, customerId);
      setCustomerSaveState(nextSaveState);

      if (nextSaveState.status === "success") {
        setActiveStep(2);
        setMapFlyoverRequestId((requestId) => requestId + 1);
      }
    } catch {
      setCustomerSaveState({
        status: "error",
        message: customerCopy.validation.saveFailed,
        customerId,
      });
    } finally {
      setIsAutoSavingCustomer(false);
    }
  };

  const openProposal = () => {
    setConfirmedRevisionKey(quoteConfigurationKey);
    setActiveStep(4);
  };

  const saveCurrentQuote = async () => {
    const customerId = customerSaveState.customerId;

    if (!customerId || !result.isViable || isSavingQuote) {
      setQuoteSaveState({
        status: "error",
        code: "invalid_input",
        message: customerId ? quoteSaveCopy.invalid : quoteSaveCopy.customerRequired,
      });
      return;
    }

    const revisionBeingSaved = quoteRevisionKey;
    const projectId = quoteProjectId ?? crypto.randomUUID();
    const quoteVersionId =
      pendingQuoteVersion?.revisionKey === revisionBeingSaved
        ? pendingQuoteVersion.id
        : crypto.randomUUID();

    setQuoteProjectId(projectId);
    setPendingQuoteVersion({ revisionKey: revisionBeingSaved, id: quoteVersionId });
    setIsSavingQuote(true);

    try {
      const nextState = await saveQuote({
        customerId,
        quoteProjectId: projectId,
        quoteVersionId,
        title: customerIntake.displayName.trim() || quoteSaveCopy.defaultTitle,
        input: quoteScenarioInput,
        locale,
      });

      setQuoteSaveState(nextState);

      if (nextState.status === "success") {
        setQuoteProjectId(nextState.quoteProjectId);
        setPendingQuoteVersion(null);
        setSavedRevisionKey(revisionBeingSaved);
      }
    } catch {
      setQuoteSaveState({
        status: "error",
        code: "save_failed",
        message: quoteSaveCopy.failed,
      });
    } finally {
      setIsSavingQuote(false);
    }
  };

  const quoteStatusMessage =
    step4Done && quoteSaveState?.status === "success"
      ? quoteSaveState.message
      : quoteSaveState?.status === "success"
        ? quoteSaveCopy.changed
        : quoteSaveState?.message ||
          (!customerSaveState.customerId
            ? quoteSaveCopy.customerRequired
            : !result.isViable
              ? quoteSaveCopy.invalid
              : copy.workflow.nextActionProposal);

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
            <label className="sr-only" htmlFor="dashboard-language">
              {languageLabel}
            </label>
            <select
              id="dashboard-language"
              aria-label={languageLabel}
              value={locale}
              className="h-11 min-w-20 rounded-xl border border-input bg-background px-2 text-sm font-semibold text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 sm:min-w-24 sm:px-3"
              onChange={(event) => {
                const nextLocale = event.target.value as AppLocale;
                startTransition(() => {
                  setLocale(nextLocale);
                  document.cookie = `${LOCALE_COOKIE_NAME}=${nextLocale}; path=/; max-age=31536000; SameSite=Lax`;
                  document.documentElement.lang = nextLocale === "zh" ? "zh-CN" : nextLocale;
                });
              }}
            >
              {LANGUAGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {crmEnabled ? (
              <form action="/logout" method="post">
                <Button type="submit" variant="ghost" size="sm" aria-label={signOutLabel} className="px-2.5 sm:px-3.5">
                  <LogOut className="size-4" aria-hidden="true" />
                  <span className="hidden sm:inline">{signOutLabel}</span>
                </Button>
              </form>
            ) : null}
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
        <h1 className="sr-only">KSolar · {activeStepState.title}</h1>
        {!isImmersiveStep ? (
        <nav className="premium-panel p-3" aria-label={workflowProgressLabel}>
          <div
            className="mb-3 h-1 rounded-full bg-muted/70"
            role="progressbar"
            aria-label={workflowProgressLabel}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progressPercent}
          >
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
                  disabled={!step.unlocked || isSavingQuote}
                  aria-current={isActive ? "step" : undefined}
                  aria-label={`${step.number}. ${step.title}${step.done ? " ✓" : ""}`}
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
        </nav>
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
            <section
              className="map-stage map-workspace-enter relative isolate h-[calc(100dvh-64px)] min-h-[480px] overflow-hidden bg-slate-950 sm:min-h-[620px]"
              aria-labelledby="workflow-step-heading-2"
            >
              <h2 id="workflow-step-heading-2" tabIndex={-1} className="sr-only">
                {copy.workflow.step1Title}
              </h2>
              <Map
                value={mapSelection}
                onChange={handleMapSelectionChange}
                onCenterChange={handleMapCenterChange}
                searchValue={mapSearchValue}
                onSearchValueChange={handleMapSearchValueChange}
                initialCenter={restoredMapCenter}
                solarInsights={activeSolarInsights}
                solarSelectionMatch={solarSelectionMatch}
                focusPoint={customerFocusPoint}
                focusAddress={customerIntake.addressText}
                focusRequestId={roofDone ? 0 : mapFlyoverRequestId}
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
            <section
              className="map-stage map-workspace-enter relative isolate overflow-hidden bg-slate-950"
              aria-labelledby="workflow-step-heading-3"
            >
              <h2 id="workflow-step-heading-3" tabIndex={-1} className="sr-only">
                {step3Copy.title}
              </h2>
              <RoofReviewMap
                selection={mapSelection}
                solarInsights={activeSolarInsights}
                solarDataLayers={activeSolarDataLayers}
                selectionMatch={solarSelectionMatch}
                fallbackCenter={solarRequestPoint}
                sellablePanelProfile={selectedPanelProfile}
                variant="immersive"
                onEditRoof={() => setActiveStep(2)}
              />

              <aside className="pointer-events-none absolute inset-x-2 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-40 sm:inset-x-auto sm:inset-y-4 sm:right-4 sm:w-[410px]">
                <div
                  className={`pointer-events-auto mx-auto flex max-w-[640px] flex-col overflow-hidden rounded-[1.55rem] border border-white/45 bg-white/[0.98] text-slate-950 shadow-[0_28px_90px_rgba(15,23,42,0.34)] backdrop-blur-xl transition-[max-height] duration-300 sm:max-h-full sm:rounded-[1.45rem] ${
                    step3SheetExpanded ? "max-h-[72dvh]" : "max-h-[218px]"
                  }`}
                >
                  {!step3SheetExpanded ? (
                    <div className="grid gap-3 p-3 sm:hidden">
                      <button
                        type="button"
                        className="mx-auto flex min-h-11 w-12 items-center justify-center after:h-1.5 after:w-12 after:rounded-full after:bg-slate-200"
                        aria-label={step3Copy.expandDetails}
                        onClick={() => setStep3SheetExpanded(true)}
                      />
                      <button
                        type="button"
                        className="grid gap-2 rounded-[1.2rem] text-left"
                        onClick={() => setStep3SheetExpanded(true)}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="section-kicker text-primary">{step3Copy.compactSummary}</div>
                            <div className="mt-1 truncate text-lg font-semibold tracking-[-0.045em] text-slate-950">
                              {quotedSizeValue} · {paybackValue}
                            </div>
                            <div className="mt-1 truncate text-xs font-medium text-slate-600">
                              {investmentValue} · {solarStateLabel}
                            </div>
                          </div>
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800">
                            {step3Copy.expandDetails}
                            <ChevronRight className="size-3.5" />
                          </span>
                        </div>
                      </button>
                      <div className="grid grid-cols-2 gap-2">
                        <Button variant="outline" size="lg" onClick={() => setActiveStep(2)}>
                          <ChevronLeft className="size-4" />
                          {copy.workflow.back}
                        </Button>
                        <Button size="lg" disabled={solarStatus === "loading"} onClick={openProposal}>
                          {copy.workflow.openProposal}
                          <ChevronRight className="size-4" />
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  <div className={step3SheetExpanded ? "mx-auto mt-2 flex h-8 w-20 items-center justify-center sm:hidden" : "hidden"}>
                    <button
                      type="button"
                      className="flex min-h-11 w-12 items-center justify-center after:h-1.5 after:w-12 after:rounded-full after:bg-slate-200"
                      aria-label={step3Copy.collapseDetails}
                      onClick={() => setStep3SheetExpanded(false)}
                    />
                  </div>
                  <div className={step3SheetExpanded ? "flex min-h-0 flex-1 flex-col sm:flex" : "hidden min-h-0 flex-1 flex-col sm:flex"}>
                  <div className="border-b border-slate-200/80 bg-white/[0.96] px-4 pb-3 pt-3 sm:p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="section-kicker text-primary">{step3Copy.eyebrow}</div>
                        <h2 className="mt-1 text-[1.35rem] font-semibold leading-none tracking-[-0.055em] sm:text-[1.75rem]">
                          {step3Copy.title}
                        </h2>
                        <p className="mt-1.5 line-clamp-2 text-[13px] font-medium leading-5 text-slate-700 sm:mt-2 sm:line-clamp-none sm:text-sm">{step3Copy.description}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <Button variant="ghost" size="sm" className="h-10 rounded-full px-2 text-xs sm:hidden" onClick={() => setStep3SheetExpanded(false)}>
                          <ChevronDown className="size-4" />
                          {step3Copy.collapseDetails}
                        </Button>
                        <Button variant="outline" size="sm" className="h-10 rounded-full px-3 text-xs sm:text-sm" onClick={() => setActiveStep(2)}>
                          {step3Copy.editRoof}
                        </Button>
                      </div>
                    </div>

                    <div className="mt-2 rounded-2xl border border-slate-200 bg-white/[0.92] px-3 py-2.5 sm:mt-3 sm:p-3">
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
                        <p className="mt-2 max-h-10 overflow-hidden break-words text-xs leading-5 text-amber-800 sm:max-h-12">
                          {solarErrorMessage}
                        </p>
                      ) : null}
                      {activeSolarInsights ? (
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          <SetupMetric
                            label={step3Copy.googleMaxPanels}
                            value={`${formatNumber(activeSolarInsights.maxArrayPanelsCount)} ${panelUnit}`}
                          />
                          <SetupMetric
                            label={step3Copy.ksolarMaxPanels}
                            value={maxPanelValue}
                          />
                          <SetupMetric
                            label={step3Copy.googleModeledArea}
                            value={
                              googleModeledRoofAreaM2
                                ? `${formatNumber(googleModeledRoofAreaM2, 0)} m²`
                                : "N/A"
                            }
                          />
                          <SetupMetric
                            label={step3Copy.selectedArea}
                            value={
                              selectedRoofAreaM2
                                ? `${formatNumber(selectedRoofAreaM2, 0)} m²`
                                : "N/A"
                            }
                          />
                        </div>
                      ) : null}
                      {shouldShowPartialGoogleAreaNotice && googleModeledRoofAreaM2 && selectedRoofAreaM2 ? (
                        <p className="mt-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium leading-5 text-amber-950">
                          {step3Copy.partialAreaNotice(
                            `${formatNumber(googleModeledRoofAreaM2, 0)} m²`,
                            `${formatNumber(selectedRoofAreaM2, 0)} m²`,
                          )}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="min-h-0 overflow-y-auto px-3 py-3 sm:p-4">
                    <div className="grid grid-cols-2 gap-2">
                        <SetupMetric
                          label={maxPanelLabel}
                          value={maxPanelValue}
                          tone="dark"
                        />
                        <SetupMetric
                          label={roofLimitLabel}
                          value={roofLimitValue}
                        />
                        <SetupMetric
                          label={annualGenerationLabel}
                          value={annualGenerationValue}
                        />
                      <SetupMetric
                        label={step3Copy.quoteSize}
                        value={quotedSizeValue}
                      />
                    </div>

                    <div className="mt-3 rounded-[1.15rem] border border-slate-200 bg-white/[0.97] p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="section-kicker text-primary">{step3Copy.maxLayoutTitle}</div>
                          <p className="mt-1 text-xs font-medium leading-5 text-slate-600">
                            {maxLayoutSourceLabel}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${structuralTone}`}
                        >
                          {structuralLabel}
                        </span>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <SetupMetric
                          label={step3Copy.arrayArea}
                          value={`${formatNumber(maxLayout.arrayAreaM2, 0)} m²`}
                        />
                        <SetupMetric
                          label={step3Copy.panelSpec}
                          value={panelSpecValue}
                        />
                        <SetupMetric
                          label={step3Copy.totalWeight}
                          value={formatWeight(maxLayout.totalWeightKg, locale)}
                        />
                        <SetupMetric
                          label={step3Copy.unitLoad}
                          value={
                            maxLayout.loadKgPerM2 !== null
                              ? `${formatNumber(maxLayout.loadKgPerM2, 1)} kg/m²`
                              : "N/A"
                          }
                        />
                        <SetupMetric
                          label={step3Copy.roofAverageLoad}
                          value={
                            maxLayout.roofAverageLoadKgPerM2 !== null
                              ? `${formatNumber(maxLayout.roofAverageLoadKgPerM2, 1)} kg/m²`
                              : "N/A"
                          }
                        />
                        <SetupMetric
                          label={step3Copy.structuralCheck}
                          value={structuralLabel}
                        />
                      </div>
                      <p className="mt-3 rounded-2xl bg-slate-50 px-3 py-2 text-xs font-medium leading-5 text-slate-600">
                        {step3Copy.structuralNote}
                      </p>
                      {maxLayoutIsGooglePartial ? (
                        <p className="mt-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium leading-5 text-amber-950">
                          {step3Copy.manualWholeRoofEstimate(
                            manualWholeRoofPanelValue,
                            manualWholeRoofCapacityValue,
                            manualWholeRoofGenerationValue,
                          )}
                        </p>
                      ) : null}
                    </div>

                    <div className="mt-3 rounded-[1.15rem] border border-emerald-200 bg-emerald-50/70 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="section-kicker text-emerald-700">{step3Copy.ppaTitle}</div>
                          <p className="mt-1 text-xs font-medium leading-5 text-emerald-950/70">
                            {step3Copy.ppaHint}
                          </p>
                        </div>
                        <div className="shrink-0 rounded-full bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white">
                          {ppaPaybackValue}
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <SetupMetric label={step3Copy.ppaPayback} value={ppaPaybackValue} tone="dark" />
                        <SetupMetric label={step3Copy.ppaCapexTotal} value={formatCurrency(ppaReturns.capexTHB)} />
                        <SetupMetric label={step3Copy.ppaRevenue} value={formatCurrency(ppaReturns.firstYearRevenueTHB)} />
                        <SetupMetric label={step3Copy.ppaNetCash} value={formatCurrency(ppaReturns.firstYearNetCashflowTHB)} />
                        <SetupMetric label={step3Copy.ppaContractProfit} value={formatCurrency(ppaReturns.contractProfitTHB)} />
                        <SetupMetric label={step3Copy.annualGeneration} value={annualGenerationValue} />
                      </div>
                      <div className="mt-3 grid gap-2 sm:grid-cols-3">
                        <BoundedNumberField
                          id="ppa-rate"
                          label={step3Copy.ppaRate}
                          min={0}
                          step={0.1}
                          value={ppaRateTHBPerKWh}
                          errorMessage={numberInputError}
                          onCommit={setPpaRateTHBPerKWh}
                        />
                        <BoundedNumberField
                          id="ppa-capex"
                          label={step3Copy.ppaCapex}
                          min={0}
                          step={0.5}
                          value={ppaCapexTHBPerWp}
                          errorMessage={numberInputError}
                          onCommit={setPpaCapexTHBPerWp}
                        />
                        <BoundedNumberField
                          id="ppa-annual-om"
                          label={step3Copy.ppaOM}
                          min={0}
                          step={0.25}
                          value={Number((ppaAnnualOMRatio * 100).toFixed(2))}
                          errorMessage={numberInputError}
                          onCommit={(next) => setPpaAnnualOMRatio(next / 100)}
                        />
                      </div>
                      {maxLayoutIsGooglePartial ? (
                        <p className="mt-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium leading-5 text-amber-950">
                          {step3Copy.ppaPartialNote}
                        </p>
                      ) : null}
                    </div>

                    <details className="group mt-3 rounded-[1.15rem] border border-slate-200 bg-white/90 p-3">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 marker:hidden">
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-slate-950">{step3Copy.quickAdjust}</span>
                          <span className="mt-0.5 block truncate text-xs font-medium text-slate-600">
                            {topologySummary} · {pricingMeta.label} · {formatNumber(selectedPanelProfile.powerWp)}W
                          </span>
                        </span>
                        <ChevronRight className="size-4 shrink-0 text-slate-500 transition group-open:rotate-90" />
                      </summary>
                      <div className="mt-3 grid gap-3">
                        <p className="rounded-2xl bg-slate-50 px-3 py-2 text-xs font-medium leading-5 text-slate-600">
                          {step3Copy.quickAdjustHint}
                        </p>
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
                    </details>

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
                          <BoundedNumberField
                            id="ft-rate"
                            label={copy.tariff.ftRate}
                            step={0.01}
                            value={ftRateTHBPerKWh}
                            errorMessage={numberInputError}
                            onCommit={setFtRateTHBPerKWh}
                          />
                          <BoundedNumberField
                            id="self-consumption-ratio"
                            label={copy.tariff.selfUseRatio}
                            min={0}
                            max={1}
                            step={0.05}
                            value={selfConsumptionRatio}
                            errorMessage={numberInputError}
                            onCommit={setSelfConsumptionRatio}
                          />
                          <BoundedNumberField
                            id="export-rate"
                            label={copy.tariff.exportRate}
                            min={0}
                            step={0.1}
                            value={exportRateTHBPerKWh}
                            errorMessage={numberInputError}
                            onCommit={setExportRateTHBPerKWh}
                          />
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
                    <Button size="lg" disabled={solarStatus === "loading"} onClick={openProposal}>
                      {copy.workflow.openProposal}
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
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
              signal={
                step4Done && quoteSaveState?.status === "success"
                  ? quoteSaveState.quoteCode
                  : result.quotedSystemSizeWp > 0
                    ? `${formatNumber(result.quotedSystemSizeWp / 1000, 1)} kWp`
                    : "QUOTE"
              }
              footer={
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Button variant="outline" size="lg" disabled={isSavingQuote} onClick={() => setActiveStep(3)}>
                    <ChevronLeft className="size-4" />
                    {copy.workflow.back}
                  </Button>
                  <p
                    className={`min-w-0 flex-1 text-sm ${quoteSaveState?.status === "error" ? "text-destructive" : "text-muted-foreground"}`}
                    role={quoteSaveState?.status === "error" ? "alert" : "status"}
                    aria-live="polite"
                  >
                    {quoteStatusMessage}
                  </p>
                  <Button
                    size="lg"
                    className="sm:min-w-[190px]"
                    disabled={
                      isSavingQuote ||
                      step4Done ||
                      !customerSaveState.customerId ||
                      !result.isViable
                    }
                    onClick={() => void saveCurrentQuote()}
                  >
                    {isSavingQuote ? (
                      <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Save className="size-4" aria-hidden="true" />
                    )}
                    {isSavingQuote ? quoteSaveCopy.saving : step4Done ? quoteSaveCopy.saved : quoteSaveCopy.save}
                  </Button>
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

function BoundedNumberField({
  id,
  label,
  value,
  onCommit,
  errorMessage,
  min,
  max,
  step,
}: {
  id: string;
  label: string;
  value: number;
  onCommit: (value: number) => void;
  errorMessage: string;
  min?: number;
  max?: number;
  step: number;
}) {
  const [draft, setDraft] = useState(String(value));
  const [error, setError] = useState("");

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commit = () => {
    const parsed = Number(draft);
    const invalid =
      draft.trim() === "" ||
      !Number.isFinite(parsed) ||
      (min !== undefined && parsed < min) ||
      (max !== undefined && parsed > max);

    if (invalid) {
      setDraft(String(value));
      setError(errorMessage);
      return;
    }

    const bounded = Math.min(max ?? Number.POSITIVE_INFINITY, Math.max(min ?? Number.NEGATIVE_INFINITY, parsed));
    setError("");
    setDraft(String(bounded));
    onCommit(bounded);
  };

  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </label>
      <Input
        id={id}
        aria-describedby={error ? `${id}-error` : undefined}
        aria-invalid={Boolean(error)}
        min={min}
        max={max}
        step={step}
        type="number"
        value={draft}
        onBlur={commit}
        onChange={(event) => {
          setDraft(event.target.value);
          setError("");
        }}
      />
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs font-medium text-red-700">
          {error}
        </p>
      ) : null}
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
      aria-pressed={active}
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

function formatWeight(valueKg: number | null, locale: AppLocale) {
  if (valueKg === null || !Number.isFinite(valueKg)) {
    return "N/A";
  }

  if (valueKg >= 1000) {
    const tonneUnit = locale === "th" ? "ตัน" : "t";
    return `${formatNumber(valueKg / 1000, 1)} ${tonneUnit}`;
  }

  return `${formatNumber(valueKg, 0)} kg`;
}

function getStructuralStatusLabel(
  status: StructuralLoadStatus,
  labels: {
    ok: string;
    overLimit: string;
    review: string;
    unknown: string;
  },
) {
  if (status === "ok") {
    return labels.ok;
  }

  if (status === "review") {
    return labels.review;
  }

  if (status === "over-limit") {
    return labels.overLimit;
  }

  return labels.unknown;
}

function getStructuralStatusTone(status: StructuralLoadStatus) {
  if (status === "ok") {
    return "border-emerald-200 bg-emerald-50 text-emerald-900";
  }

  if (status === "review") {
    return "border-amber-200 bg-amber-50 text-amber-900";
  }

  if (status === "over-limit") {
    return "border-rose-200 bg-rose-50 text-rose-900";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
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
    <section
      className="surface-panel relative overflow-visible"
      aria-labelledby={`workflow-step-heading-${stepNumber}`}
    >
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
              <h2
                id={`workflow-step-heading-${stepNumber}`}
                tabIndex={-1}
                className="mt-1 text-[1.38rem] font-semibold leading-tight tracking-[-0.055em] text-slate-950 sm:text-[1.95rem] md:text-[2.45rem]"
              >
                {title}
              </h2>
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

  return locale === "zh"
    ? `Google Solar ${sourceLabel}暂时不可用。你仍可按圈选屋顶面积继续报价，稍后再刷新校验。`
    : locale === "th"
      ? `Google Solar สำหรับ${sourceLabel}ไม่พร้อมใช้งานชั่วคราว ยังสามารถใช้พื้นที่หลังคาที่เลือกเพื่อทำใบเสนอราคาและตรวจใหม่ภายหลังได้`
      : `Google Solar ${sourceLabel} is temporarily unavailable. Continue with the selected roof area and retry validation later.`;
}
