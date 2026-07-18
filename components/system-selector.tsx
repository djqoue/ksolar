"use client";

import { BatteryCharging, Bolt, Cpu, Gauge, RadioTower, SunMedium, Waves, Zap } from "lucide-react";
import { useId, useMemo } from "react";
import { useAppCopy, useLocaleContext } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BATTERY_CATALOG, findBattery } from "@/lib/config/battery-catalog";
import { filterResidentialInverters } from "@/lib/config/inverter-catalog";
import { DEFAULT_PANEL_ID, findPanel, PRICED_PANELS } from "@/lib/config/panel-catalog";
import { PRICING_PRESETS } from "@/lib/config/pricing-catalog";
import { getLocalizedPresetMeta } from "@/lib/i18n";
import { cn, formatCurrency, formatNumber } from "@/lib/utils";
import type { SystemTopology } from "@/types/bom";
import type { PricingPreset } from "@/types/quote";

// Manufacturer display order in the panel dropdown
const MFG_ORDER = ["Trina Solar", "LONGi", "JA Solar", "Tongwei", "Sungrow Solar", "GCL", "Powitt Solar", "Unknown"];

// Sentinel value meaning "let BOM template pick automatically"
const AUTO = "auto";

interface SystemSelectorProps {
  topology: SystemTopology;
  pricingPresetId: PricingPreset["id"];
  selectedPanelId: string;
  selectedInverterId: string;
  selectedBatteryId: string;
  onTopologyChange: (value: SystemTopology) => void;
  onPricingPresetChange: (value: PricingPreset["id"]) => void;
  onPanelChange: (id: string) => void;
  onInverterChange: (id: string) => void;
  onBatteryChange: (id: string) => void;
}

/** Shared styled select element */
function CatalogSelect({
  id,
  value,
  onChange,
  children,
  ariaDescribedBy,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  ariaDescribedBy?: string;
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-describedby={ariaDescribedBy}
      className="flex h-11 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
    >
      {children}
    </select>
  );
}

/** Two-column spec grid shown below each dropdown */
function SpecGrid({ rows }: { rows: [string, string][] }) {
  return (
    <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 rounded-xl border border-border/60 bg-muted/30 px-4 py-3 text-xs">
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <div className="text-muted-foreground">{label}</div>
          <div className="text-right font-semibold text-slate-900">{value}</div>
        </div>
      ))}
    </div>
  );
}

export function SystemSelector({
  topology,
  pricingPresetId,
  selectedPanelId,
  selectedInverterId,
  selectedBatteryId,
  onTopologyChange,
  onPricingPresetChange,
  onPanelChange,
  onInverterChange,
  onBatteryChange,
}: SystemSelectorProps) {
  const copy = useAppCopy();
  const { locale } = useLocaleContext();
  const zh = locale === "zh";
  const selectorId = useId();
  const panelSelectId = `${selectorId}-panel`;
  const inverterSelectId = `${selectorId}-inverter`;
  const batterySelectId = `${selectorId}-battery`;
  const selectionLabels =
    locale === "zh"
      ? {
          battery: "电池模式",
          mode: "系统模式",
          phase: "电表相位",
          pricing: "价格档位",
        }
      : locale === "th"
        ? {
            battery: "โหมดแบตเตอรี่",
            mode: "โหมดระบบ",
            phase: "เฟสมิเตอร์",
            pricing: "ระดับราคา",
          }
        : {
            battery: "Battery mode",
            mode: "System mode",
            phase: "Meter phase",
            pricing: "Pricing tier",
          };

  // ── Panel groups ────────────────────────────────────────────────────────
  const panelGroups = useMemo(() => {
    const grouped: Record<string, typeof PRICED_PANELS> = {};
    for (const panel of PRICED_PANELS) {
      (grouped[panel.manufacturer] ??= []).push(panel);
    }
    for (const mfg of Object.keys(grouped)) {
      grouped[mfg].sort((a, b) => b.peakPowerW - a.peakPowerW);
    }
    return MFG_ORDER.filter((m) => grouped[m]).map((m) => ({ mfg: m, panels: grouped[m] }));
  }, []);

  const activePanel = findPanel(selectedPanelId) ?? findPanel(DEFAULT_PANEL_ID);

  // ── Inverter list (filtered by topology) ────────────────────────────────
  const inverterOptions = useMemo(
    () => filterResidentialInverters(topology.phase, topology.mode),
    [topology.phase, topology.mode],
  );

  const activeInverter =
    selectedInverterId !== AUTO
      ? inverterOptions.find((inverter) => inverter.id === selectedInverterId)
      : undefined;
  const effectiveInverterId = activeInverter?.id ?? AUTO;

  // ── Battery list ────────────────────────────────────────────────────────
  const activeBattery =
    selectedBatteryId !== AUTO ? findBattery(selectedBatteryId) : undefined;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{copy.system.title}</CardTitle>
        <CardDescription>{copy.system.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">

        {/* ── Phase tabs ───────────────────────────────────────────────── */}
        <Tabs
          value={topology.phase}
          onValueChange={(value) => onTopologyChange({ ...topology, phase: value as SystemTopology["phase"] })}
          aria-label={selectionLabels.phase}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="1P">
              <Bolt data-icon="inline-start" />
              {copy.system.singlePhase}
            </TabsTrigger>
            <TabsTrigger value="3P">
              <Waves data-icon="inline-start" />
              {copy.system.threePhase}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* ── Mode buttons ─────────────────────────────────────────────── */}
        <div className="grid gap-3 sm:grid-cols-2" role="group" aria-label={selectionLabels.mode}>
          <button
            type="button"
            aria-pressed={topology.mode === "ongrid"}
            className={cn(
              "rounded-[1.1rem] border p-4 text-left transition",
              topology.mode === "ongrid" ? "border-primary bg-primary/5" : "border-border bg-background",
            )}
            onClick={() => onTopologyChange({ ...topology, mode: "ongrid", batteryMode: "none" })}
          >
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <RadioTower className="size-4 text-primary" />
              {copy.system.ongrid}
            </div>
            <p className="text-sm text-muted-foreground">{copy.system.ongridDescription}</p>
          </button>
          <button
            type="button"
            aria-pressed={topology.mode === "hybrid"}
            className={cn(
              "rounded-[1.1rem] border p-4 text-left transition",
              topology.mode === "hybrid" ? "border-primary bg-primary/5" : "border-border bg-background",
            )}
            onClick={() => onTopologyChange({ ...topology, mode: "hybrid" })}
          >
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <BatteryCharging className="size-4 text-primary" />
              {copy.system.hybrid}
            </div>
            <p className="text-sm text-muted-foreground">{copy.system.hybridDescription}</p>
          </button>
        </div>

        {/* ── Battery mode ─────────────────────────────────────────────── */}
        <div className="rounded-[1.1rem] border border-border/70 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="section-kicker">{copy.system.batteryMode}</p>
              <p className="text-sm text-muted-foreground">{copy.system.batteryDescription}</p>
            </div>
          </div>
          <div className="flex gap-2" role="group" aria-label={selectionLabels.battery}>
            <Button
              type="button"
              variant={topology.batteryMode === "none" ? "default" : "outline"}
              size="sm"
              aria-pressed={topology.batteryMode === "none"}
              onClick={() => onTopologyChange({ ...topology, batteryMode: "none" })}
            >
              {copy.system.noBattery}
            </Button>
            <Button
              type="button"
              variant={topology.batteryMode === "with_battery" ? "default" : "outline"}
              size="sm"
              aria-pressed={topology.batteryMode === "with_battery"}
              disabled={topology.mode !== "hybrid"}
              onClick={() => onTopologyChange({ ...topology, mode: "hybrid", batteryMode: "with_battery" })}
            >
              {copy.system.withBattery}
            </Button>
          </div>
        </div>

        {/* ── Pricing preset ───────────────────────────────────────────── */}
        <div className="rounded-[1.1rem] border border-border/70 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Gauge className="size-4 text-primary" />
            {copy.system.pricingPreset}
          </div>
          <div className="grid gap-2" role="group" aria-label={selectionLabels.pricing}>
            {PRICING_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                aria-pressed={pricingPresetId === preset.id}
                className={cn(
                  "rounded-[1rem] border px-4 py-3 text-left transition",
                  pricingPresetId === preset.id ? "border-primary bg-primary/5" : "border-border/70",
                )}
                onClick={() => onPricingPresetChange(preset.id)}
              >
                <div className="text-sm font-semibold">{getLocalizedPresetMeta(locale, preset.id).label}</div>
                <div className="mt-1 text-sm leading-6 text-muted-foreground">{getLocalizedPresetMeta(locale, preset.id).description}</div>
              </button>
            ))}
          </div>
        </div>

        <details className="group rounded-lg border border-border/70 bg-muted/20 p-4">
          <summary className="cursor-pointer list-none text-sm font-semibold text-slate-900 marker:hidden">
            <span className="inline-flex items-center gap-2">
              <Cpu className="size-4 text-primary" />
              {zh ? "高级设备选型" : "Advanced equipment"}
            </span>
            <span className="mt-1 block text-sm font-normal leading-6 text-muted-foreground">
              {zh
                ? "默认不用改。只有客户指定品牌、型号或电池容量时再展开。"
                : "Leave this unchanged by default. Open only when a customer requires a specific brand or model."}
            </span>
          </summary>

          <div className="mt-4 grid gap-4">
            {/* ── Panel selection ──────────────────────────────────────────── */}
            <div className="rounded-lg border border-border/70 bg-background p-4">
              <Label htmlFor={panelSelectId} className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <SunMedium className="size-4 text-primary" />
                {zh ? "面板选型" : "Panel Selection"}
              </Label>
              <p id={`${panelSelectId}-description`} className="mb-3 text-sm text-muted-foreground">
                {zh
                  ? "从 iSolarBP 物料库选择组件，报价单价格自动更新。"
                  : "Pick a module from the iSolarBP catalog. BOM price updates instantly."}
              </p>

              <CatalogSelect
                id={panelSelectId}
                value={selectedPanelId}
                onChange={onPanelChange}
                ariaDescribedBy={`${panelSelectId}-description`}
              >
                {panelGroups.map(({ mfg, panels }) => (
                  <optgroup key={mfg} label={mfg}>
                    {panels.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.model} ({p.peakPowerW}W) - ฿{formatNumber(p.unitCostTHB!)}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </CatalogSelect>

              {activePanel && (
                <SpecGrid
                  rows={[
                    [zh ? "峰值功率" : "Peak Power", `${activePanel.peakPowerW} W`],
                    [zh ? "类型" : "Type", activePanel.faceType === "bifacial" ? (zh ? "双面" : "Bifacial") : (zh ? "单面" : "Mono-facial")],
                    [zh ? "单价" : "Unit Price", `${activePanel.unitCostTHB != null ? formatCurrency(activePanel.unitCostTHB) : "-"} / ${zh ? "片" : "pcs"}`],
                    [zh ? "尺寸" : "Dimensions", `${activePanel.dimLong}x${activePanel.dimShort} mm`],
                    ["Voc / Isc", `${activePanel.vocV} V / ${activePanel.iscA} A`],
                    [zh ? "重量" : "Weight", `${activePanel.weightKg} kg`],
                  ]}
                />
              )}
            </div>

            {/* ── Inverter selection ───────────────────────────────────────── */}
            <div className="rounded-lg border border-border/70 bg-background p-4">
              <Label htmlFor={inverterSelectId} className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <Cpu className="size-4 text-primary" />
                {zh ? "逆变器选型" : "Inverter Selection"}
              </Label>
              <p id={`${inverterSelectId}-description`} className="mb-3 text-sm text-muted-foreground">
                {zh
                  ? "自动会按容量档位匹配，手动选择会覆盖 BOM 默认值。"
                  : "Auto matches by system tier. Manual selection overrides the BOM default."}
              </p>

              <CatalogSelect
                id={inverterSelectId}
                value={effectiveInverterId}
                onChange={onInverterChange}
                ariaDescribedBy={`${inverterSelectId}-description`}
              >
                <option value={AUTO}>{zh ? "自动（按容量档位）" : "Auto (by capacity tier)"}</option>
                {inverterOptions.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.model} ({inv.ratedPowerKW} kW) - {inv.unitCostTHB != null ? `฿${formatNumber(inv.unitCostTHB)}` : zh ? "待定" : "TBD"}
                  </option>
                ))}
              </CatalogSelect>

              {activeInverter && (
                <SpecGrid
                  rows={[
                    [zh ? "额定功率" : "Rated Power", `${activeInverter.ratedPowerKW} kW`],
                    [zh ? "相位" : "Phase", activeInverter.phase === "1P" ? (zh ? "单相" : "Single Phase") : (zh ? "三相" : "Three Phase")],
                    [zh ? "模式" : "Mode", activeInverter.mode === "ongrid" ? (zh ? "并网" : "On-Grid") : (zh ? "混合" : "Hybrid")],
                    [zh ? "单价" : "Unit Price", activeInverter.unitCostTHB != null ? formatCurrency(activeInverter.unitCostTHB) : "-"],
                    ["MPPT", `${activeInverter.mpptCount} x (${activeInverter.mpptVoltageMinV}-${activeInverter.mpptVoltageMaxV} V)`],
                    [zh ? "最大输入电压" : "Max Input V", `${activeInverter.maxInputVoltageV} V`],
                    [zh ? "最大串列数" : "Max Strings", `${activeInverter.maxStringCount}`],
                    [zh ? "重量" : "Weight", activeInverter.weightKg != null ? `${activeInverter.weightKg} kg` : "-"],
                  ]}
                />
              )}
            </div>

            {/* ── Battery selection (only when hybrid + battery) ───────────── */}
            {topology.batteryMode === "with_battery" && (
              <div className="rounded-lg border border-border/70 bg-background p-4">
                <Label htmlFor={batterySelectId} className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <Zap className="size-4 text-primary" />
                  {zh ? "电池选型" : "Battery Selection"}
                </Label>
                <p id={`${batterySelectId}-description`} className="mb-3 text-sm text-muted-foreground">
                  {zh
                    ? "自动会按容量档位匹配最合适的电池容量。"
                    : "Auto matches the best battery capacity to the system tier."}
                </p>

                <CatalogSelect
                  id={batterySelectId}
                  value={selectedBatteryId}
                  onChange={onBatteryChange}
                  ariaDescribedBy={`${batterySelectId}-description`}
                >
                  <option value={AUTO}>{zh ? "自动（按容量档位）" : "Auto (by capacity tier)"}</option>
                  {BATTERY_CATALOG.map((bat) => (
                    <option key={bat.id} value={bat.id}>
                      {bat.model} ({bat.capacityKWh} kWh) - ฿{formatNumber(bat.unitCostTHB)}
                    </option>
                  ))}
                </CatalogSelect>

                {activeBattery && (
                  <SpecGrid
                    rows={[
                      [zh ? "容量" : "Capacity", `${activeBattery.capacityKWh} kWh`],
                      [zh ? "化学体系" : "Chemistry", activeBattery.chemistry],
                      [zh ? "循环寿命" : "Cycle Life", `${formatNumber(activeBattery.cycleLife)} ${zh ? "次" : "cycles"}`],
                      [zh ? "单价" : "Unit Price", formatCurrency(activeBattery.unitCostTHB)],
                      [zh ? "标称电压" : "Nominal Voltage", activeBattery.nominalVoltageV != null ? `${activeBattery.nominalVoltageV} V` : "-"],
                      [zh ? "持续电流" : "Continuous Current", activeBattery.continuousCurrentA != null ? `${activeBattery.continuousCurrentA} A` : "-"],
                      [zh ? "重量" : "Weight", activeBattery.weightKg != null ? `${activeBattery.weightKg} kg` : "-"],
                    ]}
                  />
                )}
              </div>
            )}
          </div>
        </details>

      </CardContent>
    </Card>
  );
}
