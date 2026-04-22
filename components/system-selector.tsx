"use client";

import { BatteryCharging, Bolt, Cpu, Gauge, RadioTower, SunMedium, Waves, Zap } from "lucide-react";
import { useMemo } from "react";
import { useAppCopy, useLocaleContext } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BATTERY_CATALOG, findBattery } from "@/lib/config/battery-catalog";
import { filterResidentialInverters, findInverter } from "@/lib/config/inverter-catalog";
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
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
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
    selectedInverterId !== AUTO ? findInverter(selectedInverterId) : undefined;

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
        <Tabs value={topology.phase} onValueChange={(value) => onTopologyChange({ ...topology, phase: value as SystemTopology["phase"] })}>
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
          <TabsContent value={topology.phase} className="space-y-0" />
        </Tabs>

        {/* ── Mode buttons ─────────────────────────────────────────────── */}
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
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
          <div className="flex gap-2">
            <Button
              variant={topology.batteryMode === "none" ? "default" : "outline"}
              size="sm"
              onClick={() => onTopologyChange({ ...topology, batteryMode: "none" })}
            >
              {copy.system.noBattery}
            </Button>
            <Button
              variant={topology.batteryMode === "with_battery" ? "default" : "outline"}
              size="sm"
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
          <div className="grid gap-2">
            {PRICING_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
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

        {/* ── Panel selection ──────────────────────────────────────────── */}
        <div className="rounded-[1.1rem] border border-border/70 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <SunMedium className="size-4 text-primary" />
            {zh ? "面板选型" : "Panel Selection"}
          </div>
          <p className="mb-3 text-sm text-muted-foreground">
            {zh
              ? "从 iSolarBP 物料库选择组件，报价单价格自动更新。"
              : "Pick a module from the iSolarBP catalog — BOM price updates instantly."}
          </p>

          <CatalogSelect value={selectedPanelId} onChange={onPanelChange}>
            {panelGroups.map(({ mfg, panels }) => (
              <optgroup key={mfg} label={mfg}>
                {panels.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.model} ({p.peakPowerW}W) — ฿{formatNumber(p.unitCostTHB!)}
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
                [zh ? "单价" : "Unit Price", `${activePanel.unitCostTHB != null ? formatCurrency(activePanel.unitCostTHB) : "—"} / ${zh ? "片" : "pcs"}`],
                [zh ? "尺寸" : "Dimensions", `${activePanel.dimLong}×${activePanel.dimShort} mm`],
                ["Voc / Isc", `${activePanel.vocV} V / ${activePanel.iscA} A`],
                [zh ? "重量" : "Weight", `${activePanel.weightKg} kg`],
              ]}
            />
          )}
        </div>

        {/* ── Inverter selection ───────────────────────────────────────── */}
        <div className="rounded-[1.1rem] border border-border/70 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Cpu className="size-4 text-primary" />
            {zh ? "逆变器选型" : "Inverter Selection"}
          </div>
          <p className="mb-3 text-sm text-muted-foreground">
            {zh
              ? "手动指定逆变器型号覆盖 BOM 默认值；「自动」由系统容量档位决定。"
              : "Override the BOM inverter model. \"Auto\" lets the tier determine the inverter."}
          </p>

          <CatalogSelect value={selectedInverterId} onChange={onInverterChange}>
            <option value={AUTO}>{zh ? "自动（按容量档位）" : "Auto (by capacity tier)"}</option>
            {inverterOptions.map((inv) => (
              <option key={inv.id} value={inv.id}>
                {inv.model} ({inv.ratedPowerKW} kW) — {inv.unitCostTHB != null ? `฿${formatNumber(inv.unitCostTHB)}` : zh ? "待定" : "TBD"}
              </option>
            ))}
          </CatalogSelect>

          {activeInverter && (
            <SpecGrid
              rows={[
                [zh ? "额定功率" : "Rated Power", `${activeInverter.ratedPowerKW} kW`],
                [zh ? "相位" : "Phase", activeInverter.phase === "1P" ? (zh ? "单相" : "Single Phase") : (zh ? "三相" : "Three Phase")],
                [zh ? "模式" : "Mode", activeInverter.mode === "ongrid" ? (zh ? "并网" : "On-Grid") : (zh ? "混合" : "Hybrid")],
                [zh ? "单价" : "Unit Price", activeInverter.unitCostTHB != null ? formatCurrency(activeInverter.unitCostTHB) : "—"],
                ["MPPT", `${activeInverter.mpptCount} × (${activeInverter.mpptVoltageMinV}–${activeInverter.mpptVoltageMaxV} V)`],
                [zh ? "最大输入电压" : "Max Input V", `${activeInverter.maxInputVoltageV} V`],
                [zh ? "最大串列数" : "Max Strings", `${activeInverter.maxStringCount}`],
                [zh ? "重量" : "Weight", activeInverter.weightKg != null ? `${activeInverter.weightKg} kg` : "—"],
              ]}
            />
          )}
        </div>

        {/* ── Battery selection (only when hybrid + battery) ───────────── */}
        {topology.batteryMode === "with_battery" && (
          <div className="rounded-[1.1rem] border border-border/70 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Zap className="size-4 text-primary" />
              {zh ? "电池选型" : "Battery Selection"}
            </div>
            <p className="mb-3 text-sm text-muted-foreground">
              {zh
                ? "选择储能电池型号；「自动」由系统容量档位匹配最合适的容量。"
                : "Choose a battery model. \"Auto\" matches the best capacity to the system tier."}
            </p>

            <CatalogSelect value={selectedBatteryId} onChange={onBatteryChange}>
              <option value={AUTO}>{zh ? "自动（按容量档位）" : "Auto (by capacity tier)"}</option>
              {BATTERY_CATALOG.map((bat) => (
                <option key={bat.id} value={bat.id}>
                  {bat.model} ({bat.capacityKWh} kWh) — ฿{formatNumber(bat.unitCostTHB)}
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
                  [zh ? "标称电压" : "Nominal Voltage", activeBattery.nominalVoltageV != null ? `${activeBattery.nominalVoltageV} V` : "—"],
                  [zh ? "持续电流" : "Continuous Current", activeBattery.continuousCurrentA != null ? `${activeBattery.continuousCurrentA} A` : "—"],
                  [zh ? "重量" : "Weight", activeBattery.weightKg != null ? `${activeBattery.weightKg} kg` : "—"],
                ]}
              />
            )}
          </div>
        )}

      </CardContent>
    </Card>
  );
}
