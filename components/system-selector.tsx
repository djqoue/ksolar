"use client";

import { BatteryCharging, Bolt, Gauge, RadioTower, Waves } from "lucide-react";
import { useAppCopy, useLocaleContext } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PRICING_PRESETS } from "@/lib/config/pricing-catalog";
import { getLocalizedPresetMeta } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { SystemTopology } from "@/types/bom";
import type { PricingPreset } from "@/types/quote";

interface SystemSelectorProps {
  topology: SystemTopology;
  pricingPresetId: PricingPreset["id"];
  onTopologyChange: (value: SystemTopology) => void;
  onPricingPresetChange: (value: PricingPreset["id"]) => void;
}

export function SystemSelector({
  topology,
  pricingPresetId,
  onTopologyChange,
  onPricingPresetChange,
}: SystemSelectorProps) {
  const copy = useAppCopy();
  const { locale } = useLocaleContext();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{copy.system.title}</CardTitle>
        <CardDescription>{copy.system.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
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
            <p className="text-sm text-muted-foreground">
              {copy.system.ongridDescription}
            </p>
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
            <p className="text-sm text-muted-foreground">
              {copy.system.hybridDescription}
            </p>
          </button>
        </div>

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
      </CardContent>
    </Card>
  );
}
