import { MARKET_BENCHMARKS } from "@/lib/config/market-benchmarks";
import { PRICING_PRESETS } from "@/lib/config/pricing-catalog";
import type { SystemTopology } from "@/types/bom";
import type { PricingPreset } from "@/types/quote";

export interface SuggestedPriceResult {
  preset: PricingPreset;
  suggestedSellPriceTHB: number;
  benchmarkLowTHB?: number;
  benchmarkHighTHB?: number;
}

function resolveBenchmarkSystemType(topology: SystemTopology) {
  if (topology.mode === "ongrid") {
    return "ongrid" as const;
  }

  return topology.batteryMode === "with_battery" ? ("hybrid_battery" as const) : ("hybrid" as const);
}

export function buildSuggestedPrice(input: {
  hardwareCostTHB: number;
  pricingPresetId: PricingPreset["id"];
  tierId: string;
  topology: SystemTopology;
}): SuggestedPriceResult {
  const preset =
    PRICING_PRESETS.find((candidate) => candidate.id === input.pricingPresetId) ||
    PRICING_PRESETS[1];
  const systemType = resolveBenchmarkSystemType(input.topology);

  const exactBenchmark = MARKET_BENCHMARKS.find(
    (candidate) => candidate.tierId === input.tierId && candidate.systemType === systemType,
  );

  const fallbackHybridBenchmark =
    systemType === "hybrid"
      ? (() => {
          const onGrid = MARKET_BENCHMARKS.find(
            (candidate) => candidate.tierId === input.tierId && candidate.systemType === "ongrid",
          );
          const battery = MARKET_BENCHMARKS.find(
            (candidate) => candidate.tierId === input.tierId && candidate.systemType === "hybrid_battery",
          );

          if (!onGrid || !battery) {
            return undefined;
          }

          return {
            priceRangeTHB: {
              min: Math.round((onGrid.priceRangeTHB.min + battery.priceRangeTHB.min) / 2),
              max: Math.round((onGrid.priceRangeTHB.max + battery.priceRangeTHB.max) / 2),
            },
          };
        })()
      : undefined;

  const benchmark = exactBenchmark || fallbackHybridBenchmark;
  const marginPrice = Math.round(input.hardwareCostTHB * (1 + preset.marginRatio));

  if (!benchmark) {
    return {
      preset,
      suggestedSellPriceTHB: marginPrice,
    };
  }

  const benchmarkAnchoredPrice = Math.round(
    benchmark.priceRangeTHB.min +
      (benchmark.priceRangeTHB.max - benchmark.priceRangeTHB.min) * preset.benchmarkPercentile,
  );

  return {
    preset,
    suggestedSellPriceTHB: Math.max(marginPrice, benchmarkAnchoredPrice),
    benchmarkLowTHB: benchmark.priceRangeTHB.min,
    benchmarkHighTHB: benchmark.priceRangeTHB.max,
  };
}

