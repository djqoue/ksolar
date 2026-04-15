import { BOM_CATALOG } from "@/lib/config/bom-catalog";
import { CAPACITY_TIERS } from "@/lib/config/solar";
import type { BomCategory, BomLineItem, BomScenario, CapacityTier, SystemTopology } from "@/types/bom";

const CATEGORIES: BomCategory[] = ["panel", "inverter", "battery", "mounting", "electrical", "labor", "other"];

export function buildBomScenario(
  topology: SystemTopology,
  tier: CapacityTier,
): BomScenario | null {
  const template = BOM_CATALOG.find(
    (candidate) =>
      candidate.tierId === tier.id &&
      candidate.topology.phase === topology.phase &&
      candidate.topology.mode === topology.mode &&
      candidate.topology.batteryMode === topology.batteryMode,
  );

  if (!template) {
    return null;
  }

  const lineItems: BomLineItem[] = template.lineItems.map((item) => ({
    ...item,
    subtotalTHB: item.unitCostTHB * item.quantity,
  }));

  const categoryTotals = CATEGORIES.reduce<Record<BomCategory, number>>((accumulator, category) => {
    accumulator[category] = lineItems
      .filter((item) => item.category === category)
      .reduce((sum, item) => sum + item.subtotalTHB, 0);
    return accumulator;
  }, {} as Record<BomCategory, number>);

  return {
    topology,
    tier: CAPACITY_TIERS.find((candidate) => candidate.id === tier.id) || tier,
    lineItems,
    categoryTotals,
    hardwareCostTHB: lineItems.reduce((sum, item) => sum + item.subtotalTHB, 0),
  };
}

