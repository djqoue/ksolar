import { AlertTriangle, ChartColumnIncreasing, CircleCheck, Info, SunMedium, Telescope } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAppCopy, useLocaleContext } from "@/components/locale-provider";
import {
  buildSolarCrossCheckSummary,
  type SellablePanelProfile,
  type SolarCrossCheckSummary,
  type SolarSelectionMatchStatus,
  type SolarSelectionMatchSummary,
} from "@/lib/solar";
import {
  localizeCalculationEntry,
  localizeFinanceWarning,
  localizeWarning,
  type AppLocale,
} from "@/lib/i18n";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { THAILAND_ENERGY_POLICY } from "@/lib/config/thailand-energy-policy";
import type { QuoteScenarioResult } from "@/types/quote";
import type { GoogleSolarSummary } from "@/types/solar";
import { BomBreakdown } from "@/components/bom-breakdown";
import { RoiSummary } from "@/components/roi-summary";

interface QuoteResultsProps {
  result: QuoteScenarioResult;
  solarInsights?: GoogleSolarSummary | null;
  sellablePanelProfile: SellablePanelProfile;
  solarSelectionMatch?: SolarSelectionMatchSummary | null;
}

export function QuoteResults({
  result,
  solarInsights,
  sellablePanelProfile,
  solarSelectionMatch,
}: QuoteResultsProps) {
  const copy = useAppCopy();
  const { locale } = useLocaleContext();
  const solarCrossCheck = solarInsights
    ? buildSolarCrossCheckSummary(solarInsights, result.roofFitSystemWp, sellablePanelProfile)
    : null;
  if (!result.quoteReady) {
    return (
      <div className="grid gap-4">
        <WarningSummary warnings={result.warnings} locale={locale} />
        <TechnicalPotentialReport result={result} locale={locale} />
        <ProfessionalSolarReport
          result={result}
          solarInsights={solarInsights}
          solarSelectionMatch={solarSelectionMatch}
          solarCrossCheck={solarCrossCheck}
          locale={locale}
        />
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <WarningSummary warnings={result.warnings} locale={locale} />

      <RoiSummary result={result} />

      <ProfessionalSolarReport
        result={result}
        solarInsights={solarInsights}
        solarSelectionMatch={solarSelectionMatch}
        solarCrossCheck={solarCrossCheck}
        locale={locale}
      />

      <details className="rounded-2xl border border-border bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,0.035)]">
        <summary className="cursor-pointer list-none text-sm font-semibold text-slate-950 marker:hidden">
          {locale === "zh"
            ? "查看 Google 校验、计算拆解和 BOM"
            : locale === "th"
              ? "ดูรายละเอียด Google, การคำนวณ และ BOM"
              : "View Google check, calculation, and BOM details"}
          <span className="mt-1 block text-sm font-normal text-muted-foreground">
            {locale === "zh"
              ? "销售现场可以先跳过，工程或财务复核时再展开。"
              : locale === "th"
                ? "ข้ามได้ระหว่างคุยกับลูกค้า เปิดตอนตรวจสอบโดยวิศวกรหรือฝ่ายการเงิน"
                : "Skip this during the sales conversation. Open it for engineering or finance review."}
          </span>
        </summary>
        <div className="mt-4 grid gap-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>{copy.quote.quoteSummary}</CardTitle>
            </div>
            {result.recommendedTier && <Badge>{result.recommendedTier.id}</Badge>}
          </div>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryMetric label={copy.quote.roofFitSize} value={`${formatNumber(result.roofFitSystemWp / 1000, 2)} kWp`} />
            <SummaryMetric label={copy.quote.roofPotentialGeneration} value={`${formatNumber(result.roofPotentialAnnualGenerationKWh)} kWh`} />
            <SummaryMetric label={copy.quote.quotedPackageSize} value={`${formatNumber(result.quotedSystemSizeWp / 1000, 2)} kWp`} />
            <SummaryMetric label={copy.quote.quotedAnnualGeneration} value={`${formatNumber(result.annualGenerationKWh)} kWh`} />
            <SummaryMetric label={copy.quote.sellPrice} value={formatCurrency(result.suggestedSellPriceTHB)} />
            <SummaryMetric label={copy.quote.netCustomerPrice} value={formatCurrency(result.finance.financeAdjustedPriceTHB)} />
          </div>
          <div
            className={
              result.generationModel === "google-solar-calibrated"
                ? "rounded-[1.15rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium leading-6 text-emerald-950"
                : "rounded-[1.15rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium leading-6 text-amber-950"
            }
          >
            {result.generationModel === "google-solar-calibrated"
              ? locale === "zh"
                ? `当前报价年发电量采用已通过圈选匹配门槛的 Google 建筑级年发电模型，再扣除 ${formatNumber(result.generationSystemLossRatio * 100, 0)}% 系统损耗；单位发电量约 ${formatNumber(result.generationSpecificYieldKWhPerKWp, 0)} kWh/kWp/年。它仍不是现场测量。`
                : locale === "th"
                  ? `พลังงานใช้แบบจำลองรายปีระดับอาคารของ Google ที่ผ่านเกณฑ์จับคู่พื้นที่ แล้วหัก loss ระบบ ${formatNumber(result.generationSystemLossRatio * 100, 0)}% เหลือประมาณ ${formatNumber(result.generationSpecificYieldKWhPerKWp, 0)} kWh/kWp/ปี ทั้งนี้ไม่ใช่การสำรวจหน้างาน`
                  : `Annual energy uses a Google building-level yield model that passed the selection gate, then applies ${formatNumber(result.generationSystemLossRatio * 100, 0)}% system loss. Specific yield is about ${formatNumber(result.generationSpecificYieldKWhPerKWp, 0)} kWh/kWp/yr; it is not a site survey.`
              : locale === "zh"
                ? `当前未匹配 Google Solar 屋顶模型，报价年发电量使用泰国默认 4.0h 日照和 ${formatNumber(result.generationSystemLossRatio * 100, 0)}% 系统损耗。`
                : locale === "th"
                  ? `ยังไม่ตรงกับโมเดลหลังคา Google Solar จึงใช้สมมติฐานไทยเริ่มต้น แดด 4.0 ชั่วโมง และ loss ระบบ ${formatNumber(result.generationSystemLossRatio * 100, 0)}%`
                  : `Google Solar is not matched, so quoted annual energy uses the Thailand default: 4.0 sun-hours and ${formatNumber(result.generationSystemLossRatio * 100, 0)}% system loss.`}
          </div>

          {(result.benchmarkLowTHB || result.benchmarkHighTHB) && (
            <div className="rounded-[1.25rem] border border-border/70 bg-muted/40 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <ChartColumnIncreasing className="size-4 text-primary" />
                {copy.quote.marketBenchmark}
              </div>
              <p className="text-sm text-muted-foreground">
                {copy.quote.marketBenchmarkDescription}
                {" "}
                {result.benchmarkLowTHB ? formatCurrency(result.benchmarkLowTHB) : "N/A"}
                {" "}
                to
                {" "}
                {result.benchmarkHighTHB ? formatCurrency(result.benchmarkHighTHB) : "N/A"}
              </p>
            </div>
          )}

          <Separator />

          <Accordion type="single" collapsible className="rounded-[1.25rem] border border-border/70 px-4">
            <AccordionItem value="calculation" className="border-none">
              <AccordionTrigger>{copy.quote.calculationBreakdown}</AccordionTrigger>
              <AccordionContent>
                <div className="grid gap-3">
                  {result.explanation.map((entry) => {
                    const localizedEntry = localizeCalculationEntry(locale, entry);
                    return (
                    <div key={entry.key} className="rounded-[1.1rem] border border-border/60 p-4">
                      <div className="mb-2 flex items-center gap-2 font-medium">
                        <SunMedium className="size-4 text-primary" />
                        {localizedEntry.title}
                      </div>
                      <p className="mb-3 text-sm text-muted-foreground">{localizedEntry.description}</p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {Object.entries(localizedEntry.metrics).map(([label, value]) => (
                          <div key={label} className="rounded-xl bg-muted/40 px-3 py-2 text-sm">
                            <div className="metric-label">{label}</div>
                            <div className="font-medium">{value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      <BomBreakdown result={result} />
        </div>
      </details>
    </div>
  );
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.1rem] border border-border/70 p-4">
      <div className="metric-label">{label}</div>
      <div className="mt-2 text-xl font-semibold">{value}</div>
    </div>
  );
}

function WarningSummary({ warnings, locale }: { warnings: string[]; locale: AppLocale }) {
  if (warnings.length === 0) {
    return null;
  }

  return (
    <Card className="border-amber-300 bg-amber-50">
      <CardContent className="flex items-start gap-3 p-5 text-sm text-amber-900">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <div className="grid gap-1">
          {warnings.map((warning) => (
            <p key={warning}>{localizeWarning(locale, warning)}</p>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function TechnicalPotentialReport({
  result,
  locale,
}: {
  result: QuoteScenarioResult;
  locale: AppLocale;
}) {
  const labels =
    locale === "zh"
      ? {
          title: "屋顶最大发电潜力",
          status: result.engineeringReviewRequired ? "需工程复核" : "技术潜力",
          capacity: "理论 DC 容量",
          panels: "组件数量",
          energy: "首年发电量",
          range: "建议分析区间",
          note: "这是远程技术潜力分析，不生成承诺性设备报价。请返回第三步选择 5/10/15/20 kW 才能形成固定 BOM 和价格。",
        }
      : locale === "th"
        ? {
            title: "ศักยภาพผลิตไฟสูงสุดของหลังคา",
            status: result.engineeringReviewRequired ? "ต้องตรวจโดยวิศวกร" : "ศักยภาพทางเทคนิค",
            capacity: "กำลัง DC เชิงทฤษฎี",
            panels: "จำนวนแผง",
            energy: "พลังงานปีแรก",
            range: "ช่วงวิเคราะห์ที่แนะนำ",
            note: "นี่คือการวิเคราะห์ศักยภาพระยะไกล ไม่ใช่ราคาอุปกรณ์ที่ผูกพัน กรุณากลับไปเลือก 5/10/15/20 kW เพื่อสร้าง BOM และราคา",
          }
        : {
            title: "Maximum roof generation potential",
            status: result.engineeringReviewRequired ? "Engineering review" : "Technical potential",
            capacity: "Theoretical DC capacity",
            panels: "Module count",
            energy: "First-year energy",
            range: "Suggested analysis range",
            note: "This is a remote technical-potential assessment, not a committed equipment quote. Return to Step 3 and select 5/10/15/20 kW for a fixed BOM and price.",
          };
  const lowGenerationKWh = result.annualGenerationKWh * 0.9;
  const highGenerationKWh = result.annualGenerationKWh * 1.1;

  return (
    <Card className="overflow-hidden border-slate-950 bg-slate-950 text-white">
      <CardHeader className="border-b border-white/10">
        <div className="flex items-center justify-between gap-3">
          <CardTitle>{labels.title}</CardTitle>
          <Badge variant="secondary">{labels.status}</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 p-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <DarkReportMetric label={labels.capacity} value={`${formatNumber(result.roofFitSystemWp / 1000, 2)} kWp`} />
          <DarkReportMetric label={labels.panels} value={formatNumber(result.roofFitPanelCount)} />
          <DarkReportMetric label={labels.energy} value={`${formatNumber(result.annualGenerationKWh)} kWh`} />
          <DarkReportMetric label={labels.range} value={`${formatNumber(lowGenerationKWh)}–${formatNumber(highGenerationKWh)} kWh`} />
        </div>
        <p className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 text-sm leading-6 text-white/70">
          {labels.note}
        </p>
      </CardContent>
    </Card>
  );
}

function ProfessionalSolarReport({
  result,
  solarInsights,
  solarSelectionMatch,
  solarCrossCheck,
  locale,
}: {
  result: QuoteScenarioResult;
  solarInsights?: GoogleSolarSummary | null;
  solarSelectionMatch?: SolarSelectionMatchSummary | null;
  solarCrossCheck: SolarCrossCheckSummary | null;
  locale: AppLocale;
}) {
  const processedDate = (
    solarInsights as (GoogleSolarSummary & { imageryProcessedDate?: string }) | null | undefined
  )?.imageryProcessedDate;
  const quality = solarInsights?.imageryQuality;
  const isBaseOnly = quality === "BASE";
  const isMatched = Boolean(solarSelectionMatch?.quoteEligible);
  const generationLowKWh = result.annualGenerationKWh * 0.9;
  const generationHighKWh = result.annualGenerationKWh * 1.1;
  const labels =
    locale === "zh"
      ? {
          title: "专业分析摘要",
          confirmed: "可作交叉校验",
          preliminary: "仅作初步参考",
          quality: "影像等级",
          imageryDate: "影像采集日（约）",
          processedDate: "模型处理日",
          match: "圈选匹配状态",
          overlap: "完整板位落入圈选",
          selectedRoof: "圈选可用面积",
          googleArea: "Google 返回整栋阵列面积（参考）",
          googleRaw: "Google 原生整栋模型（参考）",
          ksolar: "KSolar 当前方案",
          energyRange: "首年发电分析区间",
          methodology: "方法与边界",
          methodText: isBaseOnly
            ? "泰国当前返回 BASE 增强卫星影像。像素等级不是测量精度，不能用整栋 Google 结果替代用户圈选、消防退距、障碍物、结构和电气设计。当前正式容量以圈选屋顶和 KSolar 真实组件规则为准。"
            : "Google 建筑模型只在通过圈选匹配门槛时用于年发电交叉校验；组件片数、BOM、价格与泰国现金流仍由 KSolar 规则计算。",
          policy: "泰国政策假设",
          policyText: `Ft ${THAILAND_ENERGY_POLICY.ft.valueTHBPerKWh.toFixed(4)} THB/kWh（有效至 ${THAILAND_ENERGY_POLICY.ft.validTo}）；住宅余电 ${THAILAND_ENERGY_POLICY.residentialNetBilling.exportRateTHBPerKWh.toFixed(2)} THB/kWh，仅对获批出口计入；获批出口上限 ${THAILAND_ENERGY_POLICY.residentialNetBilling.approvedExportLimitKwAc} kW AC。`,
          siteRequired: "上线结论仍需现场复测、结构鉴定、电气字符串设计、消防退距和 MEA/PEA 并网批准。",
          source: "Source: Includes solar data from Google",
          unavailable: "该点没有可用的 Google Solar 建筑结果；报告采用圈选面积与 KSolar 保守默认值。",
        }
      : locale === "th"
        ? {
            title: "สรุปการวิเคราะห์เชิงวิชาชีพ",
            confirmed: "ใช้ตรวจสอบไขว้ได้",
            preliminary: "อ้างอิงเบื้องต้นเท่านั้น",
            quality: "ระดับภาพ",
            imageryDate: "วันที่ภาพโดยประมาณ",
            processedDate: "วันที่ประมวลผลโมเดล",
            match: "สถานะตรงกับพื้นที่เลือก",
            overlap: "รอยแผงอยู่ในพื้นที่เลือกทั้งหมด",
            selectedRoof: "พื้นที่หลังคาใช้ได้ที่เลือก",
            googleArea: "พื้นที่แผงทั้งอาคารที่ Google ส่งคืน (อ้างอิง)",
            googleRaw: "โมเดลทั้งอาคารเดิมของ Google (อ้างอิง)",
            ksolar: "แผน KSolar ปัจจุบัน",
            energyRange: "ช่วงพลังงานปีแรก",
            methodology: "วิธีและข้อจำกัด",
            methodText: isBaseOnly
              ? "ประเทศไทยจุดนี้ใช้ภาพดาวเทียมปรับปรุงระดับ BASE ระดับพิกเซลไม่ใช่ความแม่นยำการสำรวจ และห้ามใช้ผลทั้งอาคารแทนพื้นที่ที่ผู้ใช้เลือก ระยะหนีไฟ สิ่งกีดขวาง โครงสร้าง และการออกแบบไฟฟ้า"
              : "ใช้โมเดลอาคาร Google ตรวจสอบพลังงานเมื่อผ่านเกณฑ์พื้นที่เท่านั้น จำนวนแผง BOM ราคา และกระแสเงินสดไทยคำนวณด้วยกฎ KSolar",
            policy: "สมมติฐานนโยบายไทย",
            policyText: `Ft ${THAILAND_ENERGY_POLICY.ft.valueTHBPerKWh.toFixed(4)} บาท/kWh (ถึง ${THAILAND_ENERGY_POLICY.ft.validTo}); ขายไฟส่วนเกินบ้าน ${THAILAND_ENERGY_POLICY.residentialNetBilling.exportRateTHBPerKWh.toFixed(2)} บาท/kWh เฉพาะที่อนุมัติ และส่งออกไม่เกิน ${THAILAND_ENERGY_POLICY.residentialNetBilling.approvedExportLimitKwAc} kW AC`,
            siteRequired: "ผลสุดท้ายต้องสำรวจหน้างาน ตรวจโครงสร้าง ออกแบบสตริง/ระยะหนีไฟ และได้รับอนุมัติ MEA/PEA",
            source: "Source: Includes solar data from Google",
            unavailable: "ไม่มีผลอาคาร Google Solar ที่ใช้ได้สำหรับจุดนี้ รายงานใช้พื้นที่ที่เลือกและสมมติฐานอนุรักษ์นิยมของ KSolar",
          }
        : {
            title: "Professional analysis summary",
            confirmed: "Usable as cross-check",
            preliminary: "Preliminary reference only",
            quality: "Imagery tier",
            imageryDate: "Approx. imagery date",
            processedDate: "Model processed",
            match: "Selection match",
            overlap: "Complete panel footprints inside selection",
            selectedRoof: "Selected usable roof",
            googleArea: "Google returned whole-building array (reference)",
            googleRaw: "Google native whole-building model (reference)",
            ksolar: "Current KSolar plan",
            energyRange: "First-year analysis range",
            methodology: "Method and boundary",
            methodText: isBaseOnly
              ? "This Thai location returns BASE enhanced satellite imagery. Pixel tier is not survey accuracy; a whole-building Google result cannot replace the user selection, setbacks, obstructions, structural review, or electrical design. Formal capacity follows the selected roof and real KSolar module rules."
              : "Google's building model is used for annual-yield cross-checking only after it passes the selection gate. Panel count, BOM, price, and Thailand cashflow remain KSolar calculations.",
            policy: "Thailand policy assumptions",
            policyText: `Ft ${THAILAND_ENERGY_POLICY.ft.valueTHBPerKWh.toFixed(4)} THB/kWh (valid to ${THAILAND_ENERGY_POLICY.ft.validTo}); residential export ${THAILAND_ENERGY_POLICY.residentialNetBilling.exportRateTHBPerKWh.toFixed(2)} THB/kWh only when approved, with an approved ${THAILAND_ENERGY_POLICY.residentialNetBilling.approvedExportLimitKwAc} kW AC export limit.`,
            siteRequired: "Final design still requires a site survey, structural assessment, string/electrical design, fire setbacks, and MEA/PEA approval.",
            source: "Source: Includes solar data from Google",
            unavailable: "No usable Google Solar building result is available for this point. The report uses the selected roof and conservative KSolar defaults.",
          };

  return (
    <Card className={isMatched ? "border-emerald-200 bg-emerald-50/40" : "border-amber-200 bg-amber-50/40"}>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Telescope className="size-4 text-primary" aria-hidden="true" />
            <CardTitle>{labels.title}</CardTitle>
          </div>
          <Badge variant="secondary">{isMatched ? labels.confirmed : labels.preliminary}</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        {!solarInsights ? (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-white/80 p-4 text-sm leading-6 text-amber-950">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {labels.unavailable}
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <ReportMetric label={labels.quality} value={solarInsights.imageryQuality} />
              <ReportMetric label={labels.imageryDate} value={solarInsights.imageryDate || "N/A"} />
              <ReportMetric label={labels.processedDate} value={processedDate || "N/A"} />
              <ReportMetric
                label={labels.match}
                value={localizeSolarMatchStatus(
                  locale,
                  solarSelectionMatch?.status || "unavailable",
                )}
              />
              <ReportMetric
                label={labels.overlap}
                value={
                  solarSelectionMatch?.overlapRatio !== null && solarSelectionMatch?.overlapRatio !== undefined
                    ? `${formatNumber(solarSelectionMatch.overlapRatio * 100, 0)}%`
                    : "N/A"
                }
              />
              <ReportMetric label={labels.selectedRoof} value={`${formatNumber(result.usableAreaM2, 1)} m²`} />
              <ReportMetric label={labels.googleArea} value={`${formatNumber(solarInsights.maxArrayAreaMeters2, 1)} m²`} />
              <ReportMetric
                label={labels.googleRaw}
                value={solarCrossCheck?.googleRawKw != null ? `${formatNumber(solarCrossCheck.googleRawKw, 2)} kWp` : "N/A"}
              />
              <ReportMetric label={labels.ksolar} value={`${formatNumber((result.quoteReady ? result.quotedSystemSizeWp : result.roofFitSystemWp) / 1000, 2)} kWp`} />
              <ReportMetric label={labels.energyRange} value={`${formatNumber(generationLowKWh)}–${formatNumber(generationHighKWh)} kWh`} />
            </div>
            <p className="text-xs font-medium text-slate-500">{labels.source}</p>
          </>
        )}

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-white/80 bg-white/85 p-4 text-sm leading-6 text-slate-700">
            <div className="mb-1 flex items-center gap-2 font-semibold text-slate-950">
              <CircleCheck className="size-4 text-primary" aria-hidden="true" />
              {labels.methodology}
            </div>
            {labels.methodText}
          </div>
          <div className="rounded-2xl border border-white/80 bg-white/85 p-4 text-sm leading-6 text-slate-700">
            <div className="mb-1 font-semibold text-slate-950">{labels.policy}</div>
            {labels.policyText}
          </div>
        </div>
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium leading-6 text-amber-950">
          {labels.siteRequired}
        </p>
        {result.finance.policyWarnings.length > 0 ? (
          <div className="grid gap-1 text-sm text-amber-900">
            {result.finance.policyWarnings.map((warning) => (
              <p key={warning}>{localizeFinanceWarning(locale, warning)}</p>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function localizeSolarMatchStatus(
  locale: AppLocale,
  status: SolarSelectionMatchStatus,
) {
  const labels: Record<AppLocale, Record<SolarSelectionMatchStatus, string>> = {
    en: {
      "inside-selection": "Matched",
      "partial-selection": "Partial overlap",
      "outside-selection": "Outside selection",
      "manual-only": "Manual selection only",
      unavailable: "Unavailable",
    },
    zh: {
      "inside-selection": "完全匹配",
      "partial-selection": "部分重叠",
      "outside-selection": "圈选范围外",
      "manual-only": "仅人工圈选",
      unavailable: "无可用结果",
    },
    th: {
      "inside-selection": "ตรงกับพื้นที่เลือก",
      "partial-selection": "ทับซ้อนบางส่วน",
      "outside-selection": "อยู่นอกพื้นที่เลือก",
      "manual-only": "ใช้พื้นที่วาดเองเท่านั้น",
      unavailable: "ไม่มีข้อมูล",
    },
  };

  return labels[locale][status];
}

function ReportMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/80 bg-white/85 p-4">
      <div className="metric-label">{label}</div>
      <div className="mt-2 text-lg font-semibold tracking-[-0.03em] text-slate-950">{value}</div>
    </div>
  );
}

function DarkReportMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">{label}</div>
      <div className="mt-2 text-2xl font-semibold tracking-[-0.04em]">{value}</div>
    </div>
  );
}
