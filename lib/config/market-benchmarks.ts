import type { CapacityTierId, SystemMode } from "@/types/bom";

export interface MarketBenchmark {
  tierId: CapacityTierId;
  systemType: SystemMode | "hybrid_battery";
  priceRangeTHB: { min: number; max: number };
  paybackRangeYears?: { min: number; max: number };
}

export const MARKET_BENCHMARKS: MarketBenchmark[] = [
  { tierId: "3kW", systemType: "ongrid", priceRangeTHB: { min: 90000, max: 170000 }, paybackRangeYears: { min: 5, max: 7 } },
  { tierId: "3kW", systemType: "hybrid_battery", priceRangeTHB: { min: 180000, max: 300000 }, paybackRangeYears: { min: 6, max: 9 } },
  { tierId: "5kW", systemType: "ongrid", priceRangeTHB: { min: 130000, max: 230000 }, paybackRangeYears: { min: 4, max: 6 } },
  { tierId: "5kW", systemType: "hybrid_battery", priceRangeTHB: { min: 250000, max: 400000 }, paybackRangeYears: { min: 5, max: 8 } },
  { tierId: "10kW", systemType: "ongrid", priceRangeTHB: { min: 300000, max: 430000 }, paybackRangeYears: { min: 4, max: 6 } },
  { tierId: "10kW", systemType: "hybrid_battery", priceRangeTHB: { min: 450000, max: 700000 }, paybackRangeYears: { min: 4, max: 7 } },
  { tierId: "15kW", systemType: "ongrid", priceRangeTHB: { min: 440000, max: 620000 }, paybackRangeYears: { min: 4, max: 6 } },
  { tierId: "15kW", systemType: "hybrid_battery", priceRangeTHB: { min: 650000, max: 980000 }, paybackRangeYears: { min: 4, max: 7 } },
  { tierId: "20kW", systemType: "ongrid", priceRangeTHB: { min: 600000, max: 800000 }, paybackRangeYears: { min: 4, max: 5 } },
  { tierId: "20kW", systemType: "hybrid_battery", priceRangeTHB: { min: 900000, max: 1200000 }, paybackRangeYears: { min: 4, max: 6 } },
];

