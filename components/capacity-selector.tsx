"use client";

import { Grid2X2, Maximize2 } from "lucide-react";
import { useLocaleContext } from "@/components/locale-provider";
import { getCapacityIntentOptions } from "@/lib/calc/sizing";
import { cn, formatNumber } from "@/lib/utils";
import type { SystemTopology } from "@/types/bom";
import type { CapacityIntent } from "@/types/quote";

interface CapacitySelectorProps {
  value: CapacityIntent | null;
  phase: SystemTopology["phase"];
  supportedPanelCount: number;
  panelPowerWp: number;
  onChange: (value: CapacityIntent) => void;
}

function isSameIntent(a: CapacityIntent | null, b: CapacityIntent) {
  if (!a || a.mode !== b.mode) {
    return false;
  }

  return a.mode === "roof-potential" ||
    (b.mode === "standard" && a.targetKW === b.targetKW);
}

export function CapacitySelector({
  value,
  phase,
  supportedPanelCount,
  panelPowerWp,
  onChange,
}: CapacitySelectorProps) {
  const { locale } = useLocaleContext();
  const options = getCapacityIntentOptions({ phase, supportedPanelCount, panelPowerWp });
  const copy =
    locale === "zh"
      ? {
          title: "选择本次方案容量",
          hint: "容量、地图板数、发电量、BOM 与价格会使用同一个方案。",
          panels: "片",
          roofMax: "屋顶最大",
          roofMaxHint: "技术潜力，不设套餐上限",
          review: "需工程复核",
          threePhase: "需切换三相",
          unavailable: "当前不可选",
        }
      : locale === "th"
        ? {
            title: "เลือกขนาดระบบสำหรับข้อเสนอนี้",
            hint: "ขนาด จำนวนแผงบนแผนที่ พลังงาน BOM และราคาจะใช้แผนเดียวกัน",
            panels: "แผง",
            roofMax: "เต็มศักยภาพหลังคา",
            roofMaxHint: "ศักยภาพทางเทคนิค ไม่จำกัดแพ็กเกจ",
            review: "ต้องตรวจโดยวิศวกร",
            threePhase: "ต้องเปลี่ยนเป็น 3 เฟส",
            unavailable: "ยังเลือกไม่ได้",
          }
        : {
            title: "Choose this proposal's capacity",
            hint: "Capacity, mapped panels, energy, BOM, and price use one shared plan.",
            panels: "panels",
            roofMax: "Roof maximum",
            roofMaxHint: "Technical potential without a package cap",
            review: "Engineering review",
            threePhase: "Switch to 3-phase",
            unavailable: "Unavailable",
          };

  const getUnavailableReason = (option: (typeof options)[number]) => {
    if (option.available) {
      return null;
    }

    if (
      option.intent.mode === "standard" &&
      phase === "1P" &&
      option.intent.targetKW > 10
    ) {
      return locale === "zh"
        ? "单相标准套餐仅支持 5/10 kW；请切换三相。"
        : locale === "th"
          ? "แพ็กเกจ 1 เฟสรองรับ 5/10 kW กรุณาเปลี่ยนเป็น 3 เฟส"
          : "1-phase packages support 5/10 kW; switch to 3-phase.";
    }

    if (option.requiredPanelCount > supportedPanelCount) {
      return locale === "zh"
        ? `需要 ${option.requiredPanelCount} 片，当前屋顶初筛上限 ${supportedPanelCount} 片。`
        : locale === "th"
          ? `ต้องใช้ ${option.requiredPanelCount} แผง หลังคารองรับเบื้องต้น ${supportedPanelCount} แผง`
          : `Needs ${option.requiredPanelCount} panels; the roof screen supports ${supportedPanelCount}.`;
    }

    return locale === "zh"
      ? "圈选面积不足以安装一片完整组件。"
      : locale === "th"
        ? "พื้นที่ที่เลือกไม่พอสำหรับแผงเต็มหนึ่งแผง"
        : "The selected area does not fit one complete panel.";
  };

  return (
    <section className="rounded-[1.15rem] border border-slate-200 bg-white/[0.97] p-3" aria-labelledby="capacity-selector-title">
      <div>
        <h3 id="capacity-selector-title" className="text-sm font-semibold text-slate-950">
          {copy.title}
        </h3>
        <p className="mt-1 text-xs font-medium leading-5 text-slate-600">{copy.hint}</p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2" role="group" aria-label={copy.title}>
        {options.map((option) => {
          const active = isSameIntent(value, option.intent);
          const isRoofPotential = option.intent.mode === "roof-potential";
          const unavailableReason = getUnavailableReason(option);
          const requiresThreePhase =
            option.intent.mode === "standard" && phase === "1P" && option.intent.targetKW > 10;
          const title =
            option.intent.mode === "standard"
              ? `${option.intent.targetKW} kW`
              : copy.roofMax;

          return (
            <button
              key={option.intent.mode === "roof-potential" ? "roof-potential" : option.intent.targetKW}
              type="button"
              disabled={!option.available}
              aria-pressed={active}
              title={unavailableReason || undefined}
              onClick={() => onChange(option.intent)}
              className={cn(
                "min-h-[88px] rounded-2xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2",
                active
                  ? "border-slate-950 bg-slate-950 text-white shadow-[0_14px_34px_rgba(15,23,42,0.16)]"
                  : "border-slate-200 bg-white text-slate-950 hover:border-slate-400",
                !option.available && "cursor-not-allowed border-dashed bg-slate-50 text-slate-400 opacity-75",
                isRoofPotential && "col-span-2",
              )}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2 text-sm font-semibold">
                  {isRoofPotential ? <Maximize2 className="size-4" aria-hidden="true" /> : <Grid2X2 className="size-4" aria-hidden="true" />}
                  {title}
                </span>
                {option.engineeringReviewRequired ? (
                  <span className={active ? "text-[10px] font-semibold text-amber-200" : "text-[10px] font-semibold text-amber-700"}>
                    {requiresThreePhase ? copy.threePhase : copy.review}
                  </span>
                ) : null}
              </span>
              <span className={active ? "mt-2 block text-xs leading-5 text-white/65" : "mt-2 block text-xs leading-5 text-slate-600"}>
                {isRoofPotential
                  ? `${copy.roofMaxHint} · ${formatNumber(option.installedDcWp / 1000, 1)} kWp · ${option.requiredPanelCount} ${copy.panels}`
                  : `${formatNumber(option.installedDcWp / 1000, 2)} kWp DC · ${option.requiredPanelCount} ${copy.panels}`}
              </span>
              {!option.available ? (
                <span className="mt-1 block text-[11px] font-medium leading-4 text-amber-700">
                  {copy.unavailable}: {unavailableReason}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
