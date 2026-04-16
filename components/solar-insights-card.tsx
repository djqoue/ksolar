"use client";

import type { ReactNode } from "react";
import { Building2, LoaderCircle, Sun, Telescope } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useAppCopy, useLocaleContext } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  buildSolarCrossCheckSummary,
  type SolarSelectionMatchSummary,
} from "@/lib/solar";
import {
  getLocalizedSolarActionSummary,
  getLocalizedSolarCautionSummary,
  getLocalizedSolarConfidenceSummary,
  getLocalizedSolarUsageSummary,
} from "@/lib/i18n";
import { formatNumber } from "@/lib/utils";
import type { QuoteScenarioResult } from "@/types/quote";
import type { GoogleSolarSummary, SolarLatLng } from "@/types/solar";

interface SolarInsightsCardProps {
  insights: GoogleSolarSummary | null;
  status: "idle" | "loading" | "success" | "error";
  errorMessage: string | null;
  requestPoint: SolarLatLng | null;
  selectionMatch: SolarSelectionMatchSummary | null;
  needsRefresh: boolean;
  reviewMap?: ReactNode;
  onRefresh: () => void;
  quoteResult: QuoteScenarioResult;
}

export function SolarInsightsCard({
  insights,
  status,
  errorMessage,
  requestPoint,
  selectionMatch,
  needsRefresh,
  reviewMap,
  onRefresh,
  quoteResult,
}: SolarInsightsCardProps) {
  const copy = useAppCopy();
  const { locale } = useLocaleContext();
  const crossCheckSummary = insights
    ? buildSolarCrossCheckSummary(insights, quoteResult.roofFitSystemWp)
    : null;
  const recommendedAction =
    !crossCheckSummary ||
    crossCheckSummary.deltaKw === null ||
    Math.abs(crossCheckSummary.deltaKw) < 0.5
      ? copy.solar.proceed
      : crossCheckSummary.deltaKw > 0
        ? copy.solar.checkUnderSizing
        : copy.solar.checkOverSizing;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>{copy.solar.title}</CardTitle>
            <CardDescription>{copy.solar.description}</CardDescription>
          </div>
          <Button onClick={onRefresh} size="sm" disabled={status === "loading" || !requestPoint}>
            {status === "loading" ? <LoaderCircle data-icon="inline-start" className="animate-spin" /> : <Sun data-icon="inline-start" />}
            {status === "loading" ? copy.solar.loading : insights ? copy.solar.refresh : copy.solar.analyze}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        {reviewMap ? reviewMap : null}

        {requestPoint ? (
          <div className="rounded-xl border border-border/70 bg-muted/30 px-4 py-3 text-sm">
            {copy.solar.requestPoint}: {formatNumber(requestPoint.latitude, 5)}, {formatNumber(requestPoint.longitude, 5)}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
            {copy.solar.noPoint}
          </div>
        )}

        {requestPoint && !insights && !errorMessage && !needsRefresh && status !== "loading" ? (
          <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
            {copy.solar.readyToAnalyze}
          </div>
        ) : null}

        {needsRefresh ? (
          <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {copy.solar.staleResult}
          </div>
        ) : null}

        {selectionMatch?.status === "outside-selection" ? (
          <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <div className="font-medium">{copy.solar.mapOverlayUnmatched}</div>
            {selectionMatch.distanceToNearestShapeMeters !== null ? (
              <div className="mt-1 text-amber-900/80">
                {copy.solar.distanceFromSelection}: {formatNumber(selectionMatch.distanceToNearestShapeMeters, 1)} m
              </div>
            ) : null}
          </div>
        ) : null}

        {selectionMatch?.status === "inside-selection" ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            {copy.solar.mapOverlayMatched}
          </div>
        ) : null}

        {selectionMatch?.status === "partial-selection" ? (
          <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <div className="font-medium">{copy.solar.mapOverlayPartial}</div>
            {selectionMatch.overlapRatio !== null ? (
              <div className="mt-1 text-amber-900/80">
                {copy.solar.overlapInsideSelection}: {formatNumber(selectionMatch.overlapRatio * 100, 0)}%
              </div>
            ) : null}
          </div>
        ) : null}

        {selectionMatch?.status === "manual-only" ? (
          <div className="rounded-xl border border-border/70 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
            {copy.solar.mapOverlayManual}
          </div>
        ) : null}

        {errorMessage ? (
          <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {errorMessage}
          </div>
        ) : null}

        {insights ? (
          <>
            <div className="rounded-[1.1rem] border border-border/70 bg-background p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <Telescope className="size-4 text-primary" />
                {copy.solar.decisionTitle}
              </div>
              <div className="grid gap-3 text-sm text-slate-700">
                <div className="rounded-xl border border-primary/15 bg-primary/[0.03] px-3 py-3">
                  <p className="font-semibold text-slate-900">
                    {crossCheckSummary ? getLocalizedSolarActionSummary(locale, crossCheckSummary) : null}
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    {copy.solar.normalizedNote(
                      crossCheckSummary?.ksolarPanelPowerWp || 0,
                      insights.panelCapacityWatts,
                    )}
                  </p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  <MetricBox label={copy.solar.roofFitEstimate} value={`${formatNumber(crossCheckSummary?.manualKw || 0, 2)} kWp`} />
                  <MetricBox
                    label={copy.solar.ksolarEquivalent}
                    value={
                      crossCheckSummary?.sellableFitKw !== null && crossCheckSummary?.sellableFitKw !== undefined
                        ? `${formatNumber(crossCheckSummary.sellableFitKw, 2)} kWp`
                        : crossCheckSummary?.normalizedEquivalentKw !== null && crossCheckSummary?.normalizedEquivalentKw !== undefined
                          ? `${formatNumber(crossCheckSummary.normalizedEquivalentKw, 2)} kWp`
                          : "N/A"
                    }
                    hint={
                      crossCheckSummary?.sellableFitPanelCount !== null && crossCheckSummary?.sellableFitPanelCount !== undefined
                        ? copy.solar.ksolarPanelCount(crossCheckSummary.sellableFitPanelCount)
                        : crossCheckSummary?.normalizedEquivalentPanelCount !== null &&
                            crossCheckSummary?.normalizedEquivalentPanelCount !== undefined
                          ? copy.solar.ksolarPanelCount(crossCheckSummary.normalizedEquivalentPanelCount)
                          : copy.solar.sameSpecUnavailable
                    }
                  />
                  <MetricBox
                    label={copy.solar.googleRawLayout}
                    value={
                      crossCheckSummary?.googleRawKw !== null && crossCheckSummary?.googleRawKw !== undefined
                        ? `${formatNumber(crossCheckSummary.googleRawKw, 2)} kWp`
                        : "N/A"
                    }
                  />
                  <MetricBox
                    label={copy.solar.recommendedAction}
                    value={recommendedAction}
                    hint={
                      crossCheckSummary && crossCheckSummary.deltaKw !== null
                        ? `${copy.quote.deltaVsQuote}: ${crossCheckSummary.deltaKw > 0 ? "+" : ""}${formatNumber(crossCheckSummary.deltaKw, 2)} kWp`
                        : copy.solar.deltaUnavailable
                    }
                  />
                </div>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard label={copy.solar.imageryQuality} value={insights.imageryQuality} />
              <MetricCard label={copy.solar.maxPanelCount} value={formatNumber(insights.maxArrayPanelsCount)} />
              <MetricCard label={copy.solar.maxArrayArea} value={`${formatNumber(insights.maxArrayAreaMeters2, 1)} m²`} />
              <MetricCard label={copy.solar.sunshineHours} value={`${formatNumber(insights.maxSunshineHoursPerYear)} / year`} />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <MetricCard label={copy.solar.imageryDate} value={insights.imageryDate || "N/A"} />
              <MetricCard label={copy.solar.googlePanelWattage} value={insights.panelCapacityWatts ? `${formatNumber(insights.panelCapacityWatts)} W` : "N/A"} />
              <MetricCard label={copy.solar.roofModelArea} value={insights.roofAreaMeters2 ? `${formatNumber(insights.roofAreaMeters2, 1)} m²` : "N/A"} />
            </div>
            <Accordion type="single" collapsible className="rounded-[1.1rem] border border-border/70 px-4">
              <AccordionItem value="solar-details" className="border-none">
                <AccordionTrigger>{copy.solar.detailBreakdown}</AccordionTrigger>
                <AccordionContent>
                  <div className="grid gap-4 text-sm text-slate-700">
                    <div className="rounded-[1.1rem] border border-border/70 bg-muted/20 p-4">
                      <div className="mb-2 font-semibold">{copy.solar.howToUse}</div>
                      <div className="grid gap-2">
                        <p>{crossCheckSummary ? getLocalizedSolarConfidenceSummary(locale, insights, crossCheckSummary.confidenceSummary) : null}</p>
                        <p>{crossCheckSummary ? getLocalizedSolarUsageSummary(locale, crossCheckSummary.usageSummary) : null}</p>
                        <p>{crossCheckSummary ? getLocalizedSolarCautionSummary(locale, insights, crossCheckSummary.cautionSummary) : null}</p>
                      </div>
                    </div>

                    {insights.recommendedConfig ? (
                      <div className="rounded-[1.1rem] border border-border/70 bg-muted/20 p-4">
                        <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                          <Building2 className="size-4 text-primary" />
                          {copy.solar.topLayout}
                        </div>
                        <div className="grid gap-2 sm:grid-cols-4">
                          <MetricCompact label={copy.solar.panels} value={formatNumber(insights.recommendedConfig.panelsCount)} />
                          <MetricCompact label={copy.solar.energyDc} value={`${formatNumber(insights.recommendedConfig.yearlyEnergyDcKwh)} kWh/yr`} />
                          <MetricCompact label={copy.solar.roofSegments} value={formatNumber(insights.recommendedConfig.roofSegmentCount)} />
                          <MetricCompact
                            label={copy.solar.layoutArea}
                            value={
                              crossCheckSummary?.googleLayoutAreaM2 !== null && crossCheckSummary?.googleLayoutAreaM2 !== undefined
                                ? `${formatNumber(crossCheckSummary.googleLayoutAreaM2, 1)} m²`
                                : "N/A"
                            }
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {insights.roofSegments.length > 0 ? (
              <>
                <Separator />
                <div className="grid gap-3">
                  <div className="text-sm font-semibold">{copy.solar.roofSegments}</div>
                  {insights.roofSegments.slice(0, 3).map((segment) => (
                    <div key={`${segment.segmentIndex}-${segment.pitchDegrees}-${segment.azimuthDegrees}`} className="rounded-[1rem] border border-border/60 p-4 text-sm">
                      <div className="mb-2 font-medium">{copy.solar.segment} {segment.segmentIndex + 1}</div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div>{copy.solar.pitch}: {formatNumber(segment.pitchDegrees, 1)}°</div>
                        <div>{copy.solar.azimuth}: {formatNumber(segment.azimuthDegrees, 1)}°</div>
                        <div>{copy.solar.area}: {formatNumber(segment.areaMeters2, 1)} m²</div>
                        <div>{copy.solar.sunshineP90}: {segment.sunshineP90 ? formatNumber(segment.sunshineP90, 1) : "N/A"}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : null}
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

function MetricBox({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl bg-muted/40 px-3 py-2">
      <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
      {hint ? <div className="text-xs text-muted-foreground">{hint}</div> : null}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/70 p-4">
      <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className="mt-2 text-xl font-semibold">{value}</div>
    </div>
  );
}

function MetricCompact({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-sm">
      <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
