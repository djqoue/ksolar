import { CAPACITY_TIERS } from "@/lib/config/solar";
import type { CapacityTier, SystemTopology } from "@/types/bom";

const ALLOWED_TIERS: Record<SystemTopology["phase"], CapacityTier["id"][]> = {
  "1P": ["3kW", "5kW", "10kW"],
  "3P": ["5kW", "10kW", "15kW", "20kW"],
};

export interface TierRecommendation {
  tier: CapacityTier | null;
  warnings: string[];
}

export function recommendCapacityTier(
  phase: SystemTopology["phase"],
  supportedPanelCount: number,
): TierRecommendation {
  const allowed = CAPACITY_TIERS.filter((tier) => ALLOWED_TIERS[phase].includes(tier.id));
  const viable = allowed.filter((tier) => tier.panelCount <= supportedPanelCount);

  if (viable.length === 0) {
    return {
      tier: null,
      warnings: [
        `Selected roof area supports ${supportedPanelCount} panel(s), which is below the smallest ${phase} standard package.`,
      ],
    };
  }

  return {
    tier: viable[viable.length - 1]!,
    warnings: [],
  };
}

