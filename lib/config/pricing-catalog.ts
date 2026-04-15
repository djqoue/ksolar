import type { PricingPreset } from "@/types/quote";

export const PRICING_PRESETS: PricingPreset[] = [
  {
    id: "economic",
    label: "Economic",
    marginRatio: 0.18,
    benchmarkPercentile: 0.2,
    description: "Price-led proposal with lean margin and faster conversion.",
  },
  {
    id: "standard",
    label: "Standard",
    marginRatio: 0.26,
    benchmarkPercentile: 0.5,
    description: "Balanced proposal tuned for mainstream residential deals.",
  },
  {
    id: "premium",
    label: "Premium",
    marginRatio: 0.34,
    benchmarkPercentile: 0.78,
    description: "Higher-touch proposal with stronger perceived value and buffer.",
  },
];

