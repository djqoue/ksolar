import { AlertTriangle, ChartColumnIncreasing, SunMedium, Telescope } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAppCopy, useLocaleContext } from "@/components/locale-provider";
import { buildSolarCrossCheckSummary, type SellablePanelProfile, type SolarSelectionMatchSummary } from "@/lib/solar";
import {
  getLocalizedSolarActionSummary,
  getLocalizedSolarConfidenceSummary,
  localizeCalculationEntry,
  localizeWarning,
} from "@/lib/i18n";
import { formatCurrency, formatNumber } from "@/lib/utils";
import type { QuoteScenarioResult } from "@/types/quote";
import type { GoogleSolarSummary } from "@/types/solar";
import type { CapacityTier, CapacityTierId } from "@/types/bom";
import { BomBreakdown } from "@/components/bom-breakdown";
import { RoiSummary } from "@/components/roi-summary";

interface QuoteResultsProps {
  result: QuoteScenarioResult;
  solarInsights?: GoogleSolarSummary | null;
  topologySummary: string;
  pricingPresetLabel: string;
  financeSelectionCount: number;
  sellablePanelProfile: SellablePanelProfile;
  solarSelectionMatch?: SolarSelectionMatchSummary | null;
  availableQuoteTiers: CapacityTier[];
  selectedTierId: CapacityTierId | null;
  onSelectedTierChange: (tierId: CapacityTierId | null) => void;
}

export function QuoteResults({
  result,
  solarInsights,
  topologySummary,
  pricingPresetLabel,
  financeSelectionCount,
  sellablePanelProfile,
  solarSelectionMatch,
  availableQuoteTiers,
  selectedTierId,
  onSelectedTierChange,
}: QuoteResultsProps) {
  const copy = useAppCopy();
  const { locale } = useLocaleContext();
  const solarCrossCheck = solarInsights
    ? buildSolarCrossCheckSummary(solarInsights, result.roofFitSystemWp, sellablePanelProfile)
    : null;
  const isSolarConfirmed = solarSelectionMatch?.status === "inside-selection";

  return (
    <div className="grid gap-4">
      {result.warnings.length > 0 && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="flex items-start gap-3 p-5 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <div className="grid gap-1">
              {result.warnings.map((warning) => (
                <p key={warning}>{localizeWarning(locale, warning)}</p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <RoiSummary result={result} />

      <Card className="border-white/75 bg-white/90">
        <CardHeader>
          <CardTitle>
            {locale === "zh" ? "调整客户方案" : locale === "th" ? "ปรับขนาดแพ็กเกจ" : "Adjust Customer Package"}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="rounded-[1.25rem] border border-border/70 bg-muted/30 p-4 text-sm leading-6 text-muted-foreground">
            {locale === "zh"
              ? `当前屋顶最大可支持约 ${formatNumber(result.roofFitSystemWp / 1000, 2)} kWp。销售可以按客户预算选择更小档位，价格、月供和回本会立即联动。`
              : locale === "th"
                ? `หลังคานี้รองรับได้ประมาณ ${formatNumber(result.roofFitSystemWp / 1000, 2)} kWp สามารถเลือกแพ็กเกจเล็กลงตามงบลูกค้า แล้วราคา ค่างวด และคืนทุนจะปรับทันที`
                : `This roof supports about ${formatNumber(result.roofFitSystemWp / 1000, 2)} kWp. Pick a smaller package if the customer wants lower capex; price, payment, and payback update instantly.`}
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {availableQuoteTiers.map((tier) => {
              const isActive = result.recommendedTier?.id === tier.id;
              const realSizeKw = (tier.panelCount * sellablePanelProfile.powerWp) / 1000;

              return (
                <button
                  key={tier.id}
                  type="button"
                  onClick={() => onSelectedTierChange(tier.id)}
                  className={
                    isActive
                      ? "rounded-2xl border border-slate-950 bg-slate-950 p-4 text-left text-white shadow-[0_18px_48px_rgba(15,23,42,0.18)]"
                      : "rounded-2xl border border-border/80 bg-white p-4 text-left transition hover:border-slate-300 hover:shadow-[0_12px_30px_rgba(15,23,42,0.08)]"
                  }
                >
                  <div className={isActive ? "text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55" : "metric-label"}>
                    {tier.id}
                  </div>
                  <div className="mt-1 text-2xl font-semibold tracking-[-0.04em]">
                    {formatNumber(realSizeKw, 1)} kWp
                  </div>
                  <div className={isActive ? "mt-1 text-sm text-white/58" : "mt-1 text-sm text-muted-foreground"}>
                    {tier.panelCount} panels
                  </div>
                </button>
              );
            })}
          </div>
          {selectedTierId ? (
            <button
              type="button"
              className="justify-self-start text-sm font-semibold text-slate-900 underline underline-offset-4"
              onClick={() => onSelectedTierChange(null)}
            >
              {locale === "zh" ? "恢复系统推荐" : locale === "th" ? "กลับไปใช้คำแนะนำระบบ" : "Restore system recommendation"}
            </button>
          ) : null}
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden border-white/75 bg-[radial-gradient(circle_at_8%_0%,rgba(20,184,166,0.13),transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.98),rgba(247,249,248,0.94))]">
        <div className="energy-line" />
        <CardHeader className="border-b border-border/50">
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>{copy.workflow.proposalTitle}</CardTitle>
            </div>
            {result.recommendedTier ? <Badge>{result.recommendedTier.id}</Badge> : null}
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <div className="grid gap-4">
            <div className="rounded-[1.4rem] border border-white/80 bg-white/90 p-5 shadow-[0_16px_42px_rgba(15,23,42,0.06)] backdrop-blur">
              <div className="metric-label">{copy.quote.quotedPackageSize}</div>
              <div className="mt-2 text-[2.45rem] font-semibold tracking-[-0.055em] text-slate-950 md:text-[3.2rem]">
                {result.quotedSystemSizeWp > 0 ? `${formatNumber(result.quotedSystemSizeWp / 1000, 2)} kWp` : "N/A"}
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{topologySummary}</p>
              {result.roofFitSystemWp > 0 ? (
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  {copy.quote.roofFitSize}: <span className="font-semibold">{formatNumber(result.roofFitSystemWp / 1000, 2)} kWp</span>
                  <span className="text-muted-foreground">
                    {" · "}
                    {copy.quote.roofPotentialGeneration}: {formatNumber(result.roofPotentialAnnualGenerationKWh)} kWh
                  </span>
                </p>
              ) : null}
              {result.recommendedTier ? <p className="mt-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">{result.recommendedTier.id}</p> : null}
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.2rem] border border-white/80 bg-white/90 p-4 shadow-[0_10px_28px_rgba(15,23,42,0.045)]">
                <div className="metric-label">{copy.workflow.sellPrice}</div>
                <div className="mt-2 text-xl font-semibold">{formatCurrency(result.suggestedSellPriceTHB)}</div>
              </div>
              <div className="rounded-[1.2rem] border border-slate-950 bg-slate-950 p-4 text-white shadow-[0_18px_40px_rgba(15,23,42,0.16)]">
                <div className="metric-label">{copy.workflow.netPrice}</div>
                <div className="mt-2 text-xl font-semibold">{formatCurrency(result.finance.financeAdjustedPriceTHB)}</div>
              </div>
              <div className="rounded-[1.2rem] border border-white/80 bg-white/90 p-4 shadow-[0_10px_28px_rgba(15,23,42,0.045)]">
                <div className="metric-label">{copy.roi.annualSavings}</div>
                <div className="mt-2 text-xl font-semibold">{formatCurrency(result.annualSavingsTHB)}</div>
              </div>
            </div>
          </div>
          <div className="grid gap-4">
            <div className="rounded-[1.4rem] border border-white/80 bg-white/80 p-5 shadow-[0_16px_42px_rgba(15,23,42,0.055)] backdrop-blur">
              <div className="metric-label">{copy.system.pricingPreset}</div>
              <div className="mt-2 text-xl font-semibold">{pricingPresetLabel}</div>
              <div className="mt-4 grid gap-3 text-sm text-slate-700">
                <div className="flex items-start justify-between gap-4">
                  <span className="text-muted-foreground">{copy.finance.title}</span>
                  <span className="font-semibold">{financeSelectionCount}</span>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <span className="text-muted-foreground">{copy.solar.title}</span>
                  <span className="font-semibold">
                    {solarInsights && !isSolarConfirmed
                      ? copy.solar.reviewRoofBoundary
                      : solarCrossCheck
                        ? getLocalizedSolarActionSummary(locale, solarCrossCheck)
                        : copy.workflow.reviewNeeded}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <span className="text-muted-foreground">{copy.workflow.currentFocus}</span>
                  <span className="font-semibold">{result.isViable ? copy.workflow.viable : copy.workflow.reviewNeeded}</span>
                </div>
              </div>
            </div>
            <div className="rounded-[1.4rem] border border-white/80 bg-muted/20 p-5 text-sm leading-6 text-slate-700">
              {result.recommendedTier
                ? `${copy.quote.quotedPackageSize}: ${result.recommendedTier.id} ${topologySummary}. ${copy.quote.roofFitSize}: ${formatNumber(result.roofFitSystemWp / 1000, 2)} kWp.`
                : copy.workflow.noProposal}
            </div>
          </div>
        </CardContent>
      </Card>

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
      {solarInsights ? (
        <Card className="border-border bg-muted/10">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Telescope className="size-4 text-primary" />
              <CardTitle>{copy.quote.solarCrossCheck}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="rounded-[1.25rem] border border-white/50 bg-white/80 p-4 text-sm text-slate-700">
              <p className="font-medium text-slate-900">
                {solarCrossCheck ? getLocalizedSolarActionSummary(locale, solarCrossCheck) : copy.quote.solarCrossCheckDescription}
              </p>
              <p className="mt-1 text-muted-foreground">
                {solarCrossCheck
                  ? getLocalizedSolarConfidenceSummary(locale, solarInsights, solarCrossCheck.confidenceSummary)
                  : copy.quote.solarCrossCheckDescription}
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-white/50 bg-white/80 p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{copy.solar.roofFitEstimate}</div>
                <div className="mt-2 text-2xl font-semibold">
                  {solarCrossCheck ? `${formatNumber(solarCrossCheck.manualKw, 2)} kWp` : "N/A"}
                </div>
              </div>
              <div className="rounded-2xl border border-white/50 bg-white/80 p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{copy.solar.ksolarEquivalent}</div>
                <div className="mt-2 text-2xl font-semibold">
                  {solarCrossCheck?.sellableFitKw !== null && solarCrossCheck?.sellableFitKw !== undefined
                    ? `${formatNumber(solarCrossCheck.sellableFitKw, 2)} kWp`
                    : solarCrossCheck?.normalizedEquivalentKw !== null && solarCrossCheck?.normalizedEquivalentKw !== undefined
                      ? `${formatNumber(solarCrossCheck.normalizedEquivalentKw, 2)} kWp`
                    : "N/A"}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {solarInsights && !isSolarConfirmed
                    ? copy.solar.referenceOnlyGoogleBuilding
                    : solarCrossCheck?.sellableFitPanelCount !== null &&
                  solarCrossCheck?.sellableFitPanelCount !== undefined
                    ? copy.solar.ksolarPanelCount(solarCrossCheck.sellableFitPanelCount)
                    : solarCrossCheck?.normalizedEquivalentPanelCount !== null &&
                        solarCrossCheck?.normalizedEquivalentPanelCount !== undefined
                      ? copy.solar.ksolarPanelCount(solarCrossCheck.normalizedEquivalentPanelCount)
                    : copy.solar.sameSpecUnavailable}
                </div>
              </div>
              <div className="rounded-2xl border border-white/50 bg-white/80 p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{copy.solar.googleRawLayout}</div>
                <div className="mt-2 text-2xl font-semibold">
                  {solarCrossCheck?.googleRawKw !== null && solarCrossCheck?.googleRawKw !== undefined
                    ? `${formatNumber(solarCrossCheck.googleRawKw, 2)} kWp`
                    : "N/A"}
                </div>
              </div>
              <div className="rounded-2xl border border-white/50 bg-white/80 p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{copy.quote.deltaVsQuote}</div>
                <div className="mt-2 text-2xl font-semibold">
                  {solarCrossCheck?.deltaKw !== null && solarCrossCheck?.deltaKw !== undefined
                    ? `${solarCrossCheck.deltaKw > 0 ? "+" : ""}${formatNumber(solarCrossCheck.deltaKw, 2)} kWp`
                    : "N/A"}
                </div>
              </div>
            </div>
            <div className="rounded-[1.25rem] border border-white/50 bg-white/80 p-4 text-sm text-slate-700">
              {copy.solar.imageryQuality}: <span className="font-semibold">{solarInsights.imageryQuality}</span>
              {" · "}
              {copy.solar.maxArrayArea}: <span className="font-semibold">{formatNumber(solarInsights.maxArrayAreaMeters2, 1)} m²</span>
              {" · "}
              {copy.solar.googlePanelWattage}: <span className="font-semibold">{formatNumber(solarInsights.panelCapacityWatts)} W</span>
            </div>
          </CardContent>
        </Card>
      ) : null}

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
