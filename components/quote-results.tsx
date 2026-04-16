import { AlertTriangle, ChartColumnIncreasing, SunMedium, Telescope } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAppCopy, useLocaleContext } from "@/components/locale-provider";
import { buildSolarCrossCheckSummary } from "@/lib/solar";
import {
  getLocalizedSolarActionSummary,
  getLocalizedSolarConfidenceSummary,
  localizeCalculationEntry,
  localizeWarning,
} from "@/lib/i18n";
import { formatCurrency, formatNumber } from "@/lib/utils";
import type { QuoteScenarioResult } from "@/types/quote";
import type { GoogleSolarSummary } from "@/types/solar";
import { BomBreakdown } from "@/components/bom-breakdown";
import { RoiSummary } from "@/components/roi-summary";

interface QuoteResultsProps {
  result: QuoteScenarioResult;
  solarInsights?: GoogleSolarSummary | null;
  topologySummary: string;
  pricingPresetLabel: string;
  financeSelectionCount: number;
}

export function QuoteResults({
  result,
  solarInsights,
  topologySummary,
  pricingPresetLabel,
  financeSelectionCount,
}: QuoteResultsProps) {
  const copy = useAppCopy();
  const { locale } = useLocaleContext();
  const solarCrossCheck = solarInsights
    ? buildSolarCrossCheckSummary(solarInsights, result.roofFitSystemWp)
    : null;

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

      <Card className="overflow-hidden border-border bg-[linear-gradient(135deg,rgba(255,255,255,1),rgba(248,249,250,1))]">
        <CardHeader className="border-b border-border/60">
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>{copy.workflow.proposalTitle}</CardTitle>
            </div>
            {result.recommendedTier ? <Badge>{result.recommendedTier.id}</Badge> : null}
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <div className="grid gap-4">
            <div className="rounded-[1.1rem] border border-border bg-white p-5">
              <div className="metric-label">{copy.quote.quotedPackageSize}</div>
              <div className="mt-2 text-[2.1rem] font-semibold tracking-tight text-slate-950 md:text-[2.6rem]">
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
              <div className="rounded-[1rem] border border-border bg-white p-4">
                <div className="metric-label">{copy.workflow.sellPrice}</div>
                <div className="mt-2 text-xl font-semibold">{formatCurrency(result.suggestedSellPriceTHB)}</div>
              </div>
              <div className="rounded-[1rem] border border-border bg-white p-4">
                <div className="metric-label">{copy.workflow.netPrice}</div>
                <div className="mt-2 text-xl font-semibold">{formatCurrency(result.finance.financeAdjustedPriceTHB)}</div>
              </div>
              <div className="rounded-[1rem] border border-border bg-white p-4">
                <div className="metric-label">{copy.roi.annualSavings}</div>
                <div className="mt-2 text-xl font-semibold">{formatCurrency(result.annualSavingsTHB)}</div>
              </div>
            </div>
          </div>
          <div className="grid gap-4">
            <div className="rounded-[1.1rem] border border-border bg-white p-5">
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
                    {solarCrossCheck ? getLocalizedSolarActionSummary(locale, solarCrossCheck) : copy.workflow.reviewNeeded}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <span className="text-muted-foreground">{copy.workflow.currentFocus}</span>
                  <span className="font-semibold">{result.isViable ? copy.workflow.viable : copy.workflow.reviewNeeded}</span>
                </div>
              </div>
            </div>
            <div className="rounded-[1.1rem] border border-border bg-muted/20 p-5 text-sm leading-6 text-slate-700">
              {result.recommendedTier
                ? `${copy.quote.quotedPackageSize}: ${result.recommendedTier.id} ${topologySummary}. ${copy.quote.roofFitSize}: ${formatNumber(result.roofFitSystemWp / 1000, 2)} kWp.`
                : copy.workflow.noProposal}
            </div>
          </div>
        </CardContent>
      </Card>

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
                  {solarCrossCheck?.sellableFitPanelCount !== null &&
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

      <RoiSummary result={result} />

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
