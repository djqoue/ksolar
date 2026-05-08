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
  const viable = getViableCapacityTiers(phase, supportedPanelCount);

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

export function getAllowedCapacityTiers(phase: SystemTopology["phase"]) {
  return CAPACITY_TIERS.filter((tier) => ALLOWED_TIERS[phase].includes(tier.id));
}

export function getViableCapacityTiers(
  phase: SystemTopology["phase"],
  supportedPanelCount: number,
) {
  return getAllowedCapacityTiers(phase).filter((tier) => tier.panelCount <= supportedPanelCount);
}

export function findSelectableTier(
  phase: SystemTopology["phase"],
  supportedPanelCount: number,
  selectedTierId?: CapacityTier["id"] | null,
) {
  if (!selectedTierId) {
    return null;
  }

  return (
    getViableCapacityTiers(phase, supportedPanelCount).find((tier) => tier.id === selectedTierId) ||
    null
  );
}
