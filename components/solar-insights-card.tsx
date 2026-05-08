"use client";

import type { ReactNode } from "react";
import { Building2, Grid2X2, Layers3, LoaderCircle, ScanLine, Sun, Telescope } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useAppCopy, useLocaleContext } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  buildSolarCrossCheckSummary,
  type SellablePanelProfile,
  type SolarSelectionMatchSummary,
} from "@/lib/solar";
import {
  getLocalizedSolarActionSummary,
  getLocalizedSolarCautionSummary,
  getLocalizedSolarConfidenceSummary,
  getLocalizedSolarUsageSummary,
} from "@/lib/i18n";
import { formatCurrency, formatNumber } from "@/lib/utils";
import type { QuoteScenarioResult } from "@/types/quote";
import type { GoogleSolarDataLayerPaths, GoogleSolarSummary, SolarLatLng } from "@/types/solar";

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
  dataLayers?: GoogleSolarDataLayerPaths | null;
  sellablePanelProfile: SellablePanelProfile;
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
  dataLayers,
  sellablePanelProfile,
}: SolarInsightsCardProps) {
  const copy = useAppCopy();
  const { locale } = useLocaleContext();
  const topLayout = insights?.maxConfig ?? insights?.recommendedConfig;
  const billMatchedAnalysis =
    insights?.billMatchedConfig
      ? insights.financialAnalyses.find(
          (analysis) => analysis.panelConfigIndex === insights.billMatchedConfig?.index,
        )
      : null;
  const crossCheckSummary = insights
    ? buildSolarCrossCheckSummary(insights, quoteResult.roofFitSystemWp, sellablePanelProfile)
    : null;
  const isConfirmedRoof = selectionMatch?.status === "inside-selection";
  const recommendedAction =
    insights && !isConfirmedRoof
      ? copy.solar.reviewRoofBoundary
      :
    !crossCheckSummary ||
    crossCheckSummary.deltaKw === null ||
    Math.abs(crossCheckSummary.deltaKw) < 0.5
      ? copy.solar.proceed
      : crossCheckSummary.deltaKw > 0
        ? copy.solar.checkUnderSizing
        : copy.solar.checkOverSizing;
  const estimateConfidence =
    !insights
      ? copy.solar.confidencePending
      : !isConfirmedRoof
        ? copy.solar.confidenceReview
        : insights.imageryQuality === "HIGH"
          ? copy.solar.confidenceHigh
          : insights.imageryQuality === "MEDIUM"
            ? copy.solar.confidenceMedium
            : copy.solar.confidenceBase;

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
        {!requestPoint ? (
          <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
            {copy.solar.noPoint}
          </div>
        ) : null}

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
            <GoogleSolarCapabilityPanel
              insights={insights}
              quoteResult={quoteResult}
              dataLayers={dataLayers}
              sellablePanelProfile={sellablePanelProfile}
              locale={locale}
            />

            <div className="rounded-[1.1rem] border border-border/70 bg-background p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <Telescope className="size-4 text-primary" />
                {copy.solar.salesDecisionTitle}
              </div>
              <div className="grid gap-3 text-sm text-slate-700">
                <div className="rounded-xl border border-primary/15 bg-primary/[0.03] px-3 py-3">
                  <p className="font-semibold text-slate-900">
                    {recommendedAction}
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    {copy.solar.salesEstimateNote}
                  </p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  <MetricBox label={copy.solar.estimateConfidence} value={estimateConfidence} />
                  <MetricBox label={copy.quote.quotedPackageSize} value={quoteResult.quotedSystemSizeWp > 0 ? `${formatNumber(quoteResult.quotedSystemSizeWp / 1000, 2)} kWp` : "N/A"} />
                  <MetricBox label={copy.quote.quotedAnnualGeneration} value={quoteResult.annualGenerationKWh > 0 ? `${formatNumber(quoteResult.annualGenerationKWh)} kWh` : "N/A"} />
                  <MetricBox label={copy.quote.netCustomerPrice} value={formatCurrency(quoteResult.finance.financeAdjustedPriceTHB)} />
                  <MetricBox label={copy.roi.payback} value={quoteResult.paybackYears ? `${formatNumber(quoteResult.paybackYears, 1)}y` : "N/A"} />
                  <MetricBox label={copy.roi.annualSavings} value={formatCurrency(quoteResult.annualSavingsTHB)} />
                  <MetricBox label={copy.solar.roofFitEstimate} value={`${formatNumber(quoteResult.roofFitSystemWp / 1000, 2)} kWp`} />
                  <MetricBox label={copy.workflow.netPrice} value={formatCurrency(quoteResult.finance.financeAdjustedPriceTHB)} />
                </div>
              </div>
            </div>

            {reviewMap ? reviewMap : null}

            <Accordion type="single" collapsible className="rounded-[1.1rem] border border-border/70 px-4">
              <AccordionItem value="solar-details" className="border-none">
                <AccordionTrigger>{copy.solar.detailBreakdown}</AccordionTrigger>
                <AccordionContent>
                  <div className="grid gap-4 text-sm text-slate-700">
                    {requestPoint ? (
                      <div className="rounded-[1.1rem] border border-border/70 bg-muted/20 p-4">
                        {copy.solar.requestPoint}: {formatNumber(requestPoint.latitude, 5)}, {formatNumber(requestPoint.longitude, 5)}
                      </div>
                    ) : null}
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <MetricCard label={copy.solar.imageryQuality} value={insights.imageryQuality} />
                      <MetricCard label={copy.solar.maxPanelCount} value={formatNumber(insights.maxArrayPanelsCount)} />
                      <MetricCard label={copy.solar.maxArrayArea} value={`${formatNumber(insights.maxArrayAreaMeters2, 1)} m²`} />
                      <MetricCard label={copy.solar.sunshineHours} value={`${formatNumber(insights.maxSunshineHoursPerYear)} / year`} />
                      <MetricCard label={copy.solar.imageryDate} value={insights.imageryDate || "N/A"} />
                      <MetricCard label={copy.solar.googlePanelWattage} value={insights.panelCapacityWatts ? `${formatNumber(insights.panelCapacityWatts)} W` : "N/A"} />
                      <MetricCard label={copy.solar.roofModelArea} value={insights.roofAreaMeters2 ? `${formatNumber(insights.roofAreaMeters2, 1)} m²` : "N/A"} />
                      <MetricCard label={copy.solar.dataLayersStatus} value={dataLayers ? copy.solar.dataLayersReady : copy.solar.dataLayersUnavailable} />
                    </div>
                    <div className="rounded-[1.1rem] border border-border/70 bg-muted/20 p-4">
                      <div className="mb-2 font-semibold">{copy.solar.howToUse}</div>
                      <div className="grid gap-2">
                        <p>{crossCheckSummary ? getLocalizedSolarConfidenceSummary(locale, insights, crossCheckSummary.confidenceSummary) : null}</p>
                        <p>{crossCheckSummary ? getLocalizedSolarUsageSummary(locale, crossCheckSummary.usageSummary) : null}</p>
                        <p>
                          {crossCheckSummary
                            ? getLocalizedSolarCautionSummary(
                                locale,
                                insights,
                                crossCheckSummary.ksolarPanelPowerWp,
                                crossCheckSummary.cautionSummary,
                              )
                            : null}
                        </p>
                      </div>
                    </div>

                    {topLayout ? (
                      <div className="rounded-[1.1rem] border border-border/70 bg-muted/20 p-4">
                        <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                          <Building2 className="size-4 text-primary" />
                          {copy.solar.topLayout}
                        </div>
                        <div className="grid gap-2 sm:grid-cols-4">
                          <MetricCompact label={copy.solar.panels} value={formatNumber(topLayout.panelsCount)} />
                          <MetricCompact label={copy.solar.energyDc} value={`${formatNumber(topLayout.yearlyEnergyDcKwh)} kWh/yr`} />
                          <MetricCompact label={copy.solar.roofSegments} value={formatNumber(topLayout.roofSegmentCount)} />
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

                    {insights.billMatchedConfig ? (
                      <div className="rounded-[1.1rem] border border-border/70 bg-muted/20 p-4">
                        <div className="mb-2 text-sm font-semibold">{copy.solar.billMatchedConfig}</div>
                        <div className="grid gap-2 sm:grid-cols-4">
                          <MetricCompact label={copy.solar.panels} value={formatNumber(insights.billMatchedConfig.panelsCount)} />
                          <MetricCompact label={copy.solar.energyDc} value={`${formatNumber(insights.billMatchedConfig.yearlyEnergyDcKwh)} kWh/yr`} />
                          <MetricCompact label={copy.solar.roofSegments} value={formatNumber(insights.billMatchedConfig.roofSegmentCount)} />
                          <MetricCompact
                            label={copy.solar.billReference}
                            value={
                              billMatchedAnalysis?.monthlyBillAmount !== null &&
                              billMatchedAnalysis?.monthlyBillAmount !== undefined &&
                              billMatchedAnalysis?.monthlyBillAmount !== null
                                ? `${formatNumber(billMatchedAnalysis.monthlyBillAmount, 0)} ${billMatchedAnalysis.monthlyBillCurrencyCode || ""}`.trim()
                                : "N/A"
                            }
                          />
                        </div>
                      </div>
                    ) : null}

                    {insights.roofSegments.length > 0 ? (
                      <div className="grid gap-3 rounded-[1.1rem] border border-border/70 bg-muted/20 p-4">
                        <div className="text-sm font-semibold">{copy.solar.roofSegments}</div>
                        {insights.roofSegments.slice(0, 3).map((segment) => (
                          <div
                            key={`${segment.segmentIndex}-${segment.pitchDegrees}-${segment.azimuthDegrees}`}
                            className="rounded-[1rem] border border-border/60 bg-background p-4 text-sm"
                          >
                            <div className="mb-2 font-medium">
                              {copy.solar.segment} {segment.segmentIndex + 1}
                            </div>
                            <div className="grid gap-2 sm:grid-cols-2">
                              <div>{copy.solar.pitch}: {formatNumber(segment.pitchDegrees, 1)}°</div>
                              <div>{copy.solar.azimuth}: {formatNumber(segment.azimuthDegrees, 1)}°</div>
                              <div>{copy.solar.area}: {formatNumber(segment.areaMeters2, 1)} m²</div>
                              <div>{copy.solar.sunshineP90}: {segment.sunshineP90 ? formatNumber(segment.sunshineP90, 1) : "N/A"}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
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

function GoogleSolarCapabilityPanel({
  insights,
  quoteResult,
  dataLayers,
  sellablePanelProfile,
  locale,
}: {
  insights: GoogleSolarSummary;
  quoteResult: QuoteScenarioResult;
  dataLayers?: GoogleSolarDataLayerPaths | null;
  sellablePanelProfile: SellablePanelProfile;
  locale: "zh" | "en" | "th";
}) {
  const topLayout = insights.maxConfig ?? insights.recommendedConfig;
  const bestSegment = [...insights.roofSegments].sort(
    (left, right) => (right.sunshineP90 || 0) - (left.sunshineP90 || 0),
  )[0];
  const googlePanelAreaM2 = insights.panelHeightMeters * insights.panelWidthMeters;
  const ksolarEquivalentPanels =
    insights.maxArrayAreaMeters2 > 0 && sellablePanelProfile.areaM2 > 0
      ? Math.floor(insights.maxArrayAreaMeters2 / sellablePanelProfile.areaM2)
      : 0;
  const ksolarEquivalentKw = (ksolarEquivalentPanels * sellablePanelProfile.powerWp) / 1000;
  const labels =
    locale === "zh"
      ? {
          title: "Google Solar 可用能力",
          subtitle: "把 Google 的技术输出拆成销售现场可解释的 5 个判断。",
          rooftop: "屋顶分析",
          building: "建筑分析",
          array: "阵列设计",
          shade: "阴影/日照",
          potential: "发电潜力",
          roofArea: "屋顶模型面积",
          segments: "屋顶坡面",
          bestFace: "最佳坡面",
          imagery: "影像质量",
          date: "影像日期",
          panelCount: "Google 最大板数",
          googlePanel: "Google 板型",
          sellableFit: "按 KSolar 板型",
          dataReady: "Data layers 已接入",
          dataMissing: "等待 data layers",
          annualFlux: "年辐照热力图",
          hourlyShade: "小时级阴影",
          sunshine: "年日照",
          googleEnergy: "Google DC 年发电",
          quoteEnergy: "当前报价年发电",
        }
      : locale === "th"
        ? {
            title: "ความสามารถ Google Solar",
            subtitle: "แปลงข้อมูลเทคนิคของ Google เป็น 5 จุดตัดสินใจสำหรับฝ่ายขาย",
            rooftop: "วิเคราะห์หลังคา",
            building: "วิเคราะห์อาคาร",
            array: "ออกแบบแผง",
            shade: "เงา/แสงแดด",
            potential: "ศักยภาพผลิตไฟ",
            roofArea: "พื้นที่หลังคาจากโมเดล",
            segments: "หน้าหลังคา",
            bestFace: "หน้าที่ดีที่สุด",
            imagery: "คุณภาพภาพ",
            date: "วันที่ภาพ",
            panelCount: "จำนวนแผง Google สูงสุด",
            googlePanel: "ขนาดแผง Google",
            sellableFit: "เทียบแผง KSolar",
            dataReady: "มี Data layers",
            dataMissing: "รอ Data layers",
            annualFlux: "แผนที่แดดรายปี",
            hourlyShade: "เงารายชั่วโมง",
            sunshine: "แดดต่อปี",
            googleEnergy: "ผลิตไฟ Google DC/ปี",
            quoteEnergy: "ผลิตไฟแพ็กเกจนี้/ปี",
          }
        : {
            title: "Google Solar Capabilities",
            subtitle: "Five contractor-facing checks from Google Solar technical output.",
            rooftop: "Rooftop analysis",
            building: "Building analysis",
            array: "Array design",
            shade: "Shade / sun",
            potential: "Energy potential",
            roofArea: "Modeled roof area",
            segments: "Roof segments",
            bestFace: "Best face",
            imagery: "Imagery quality",
            date: "Imagery date",
            panelCount: "Google max panels",
            googlePanel: "Google panel size",
            sellableFit: "KSolar panel fit",
            dataReady: "Data layers ready",
            dataMissing: "Waiting for data layers",
            annualFlux: "Annual flux map",
            hourlyShade: "Hourly shade",
            sunshine: "Sunshine / year",
            googleEnergy: "Google DC energy",
            quoteEnergy: "Current quote energy",
          };

  return (
    <div className="rounded-[1.35rem] border border-slate-950 bg-slate-950 p-4 text-white shadow-[0_24px_80px_rgba(15,23,42,0.16)] sm:p-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
            Google Solar
          </div>
          <h3 className="mt-1 text-2xl font-semibold tracking-[-0.055em]">{labels.title}</h3>
        </div>
        <p className="max-w-xl text-sm leading-6 text-white/55">{labels.subtitle}</p>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <CapabilityTile
          icon={<ScanLine className="size-4" />}
          title={labels.rooftop}
          rows={[
            [labels.roofArea, insights.roofAreaMeters2 ? `${formatNumber(insights.roofAreaMeters2, 1)} m²` : "N/A"],
            [labels.segments, formatNumber(insights.roofSegments.length)],
            [
              labels.bestFace,
              bestSegment
                ? `${formatNumber(bestSegment.pitchDegrees, 0)}° / ${formatNumber(bestSegment.azimuthDegrees, 0)}°`
                : "N/A",
            ],
          ]}
        />
        <CapabilityTile
          icon={<Building2 className="size-4" />}
          title={labels.building}
          rows={[
            [labels.imagery, insights.imageryQuality],
            [labels.date, insights.imageryDate || "N/A"],
            ["Status", insights.buildingId ? "Matched" : "N/A"],
          ]}
        />
        <CapabilityTile
          icon={<Grid2X2 className="size-4" />}
          title={labels.array}
          rows={[
            [labels.panelCount, formatNumber(insights.maxArrayPanelsCount)],
            [
              labels.googlePanel,
              googlePanelAreaM2 > 0
                ? `${formatNumber(insights.panelCapacityWatts)}W / ${formatNumber(googlePanelAreaM2, 2)}m²`
                : `${formatNumber(insights.panelCapacityWatts)}W`,
            ],
            [labels.sellableFit, `${formatNumber(ksolarEquivalentKw, 1)} kWp · ${formatNumber(ksolarEquivalentPanels)} pcs`],
          ]}
        />
        <CapabilityTile
          icon={<Layers3 className="size-4" />}
          title={labels.shade}
          rows={[
            ["Status", dataLayers ? labels.dataReady : labels.dataMissing],
            [labels.annualFlux, dataLayers?.annualFluxPath ? "Ready" : "N/A"],
            [labels.hourlyShade, dataLayers?.hourlyShadePaths.length ? `${dataLayers.hourlyShadePaths.length} files` : "N/A"],
          ]}
        />
        <CapabilityTile
          icon={<Sun className="size-4" />}
          title={labels.potential}
          rows={[
            [labels.sunshine, `${formatNumber(insights.maxSunshineHoursPerYear)} h`],
            [labels.googleEnergy, topLayout ? `${formatNumber(topLayout.yearlyEnergyDcKwh)} kWh` : "N/A"],
            [labels.quoteEnergy, `${formatNumber(quoteResult.annualGenerationKWh)} kWh`],
          ]}
        />
      </div>
    </div>
  );
}

function CapabilityTile({
  icon,
  title,
  rows,
}: {
  icon: ReactNode;
  title: string;
  rows: Array<[string, string]>;
}) {
  return (
    <div className="rounded-[1.15rem] border border-white/10 bg-white/[0.06] p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <span className="grid size-8 place-items-center rounded-xl bg-white text-slate-950">{icon}</span>
        {title}
      </div>
      <div className="grid gap-2 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="border-t border-white/10 pt-2">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/42">{label}</div>
            <div className="mt-0.5 truncate font-semibold text-white">{value}</div>
          </div>
        ))}
      </div>
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
