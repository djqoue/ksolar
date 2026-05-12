import { calcBomQuantities } from "@/lib/calc/bom-quantities";
import { BOM_CATALOG } from "@/lib/config/bom-catalog";
import { CAPACITY_TIERS } from "@/lib/config/solar";
import type { BomCategory, BomLineItem, BomScenario, CapacityTier, SystemTopology } from "@/types/bom";

const CATEGORIES: BomCategory[] = ["panel", "inverter", "battery", "mounting", "electrical", "labor", "other"];

/** Per-equipment override: replaces model label + unit cost in the matching BOM line items. */
export interface ItemOverride {
  model: string;
  unitCostTHB: number;
}

/**
 * Optional overrides for panel, inverter, and battery line items.
 * When provided, the matching BOM line item's model + unitCostTHB are replaced;
 * quantities from the BOM template are preserved.
 *
 * Battery override applies only to main pack items (ids NOT containing "cable").
 */
export interface EquipmentOverrides {
  panel?: ItemOverride;
  inverter?: ItemOverride;
  battery?: ItemOverride;
}

/**
 * Build a BOM scenario for the given topology, tier, and optional overrides.
 *
 * @param panelCount - When provided, mounting and DC electrical quantities are
 *   computed from formulas (lib/calc/bom-quantities) rather than the static
 *   tier template. Pass quotedTier.panelCount from the calc entry point.
 */
export function buildBomScenario(
  topology: SystemTopology,
  tier: CapacityTier,
  overrides?: EquipmentOverrides,
  panelCount?: number,
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

  // Formula-derived quantities for mounting + DC electrical items.
  // Undefined when panelCount is not supplied — falls back to template values.
  const formulaQty = panelCount != null ? calcBomQuantities(panelCount) : undefined;

  const lineItems: BomLineItem[] = template.lineItems
    .map((item) => {
      // Apply formula quantity when available; fall back to template quantity.
      const quantity = formulaQty?.[item.id] ?? item.quantity;

      // Drop items the formula reduces to zero (e.g. mc4-branch for single-string).
      if (quantity <= 0) return null;

      // Panel override
      if (overrides?.panel && item.category === "panel") {
        return {
          ...item,
          quantity,
          model: overrides.panel.model,
          unitCostTHB: overrides.panel.unitCostTHB,
          subtotalTHB: overrides.panel.unitCostTHB * quantity,
        };
      }
      // Inverter override
      if (overrides?.inverter && item.category === "inverter") {
        return {
          ...item,
          quantity,
          model: overrides.inverter.model,
          unitCostTHB: overrides.inverter.unitCostTHB,
          subtotalTHB: overrides.inverter.unitCostTHB * quantity,
        };
      }
      // Battery pack override — skip cable items (id contains "cable")
      if (overrides?.battery && item.category === "battery" && !item.id.includes("cable")) {
        return {
          ...item,
          quantity,
          model: overrides.battery.model,
          unitCostTHB: overrides.battery.unitCostTHB,
          subtotalTHB: overrides.battery.unitCostTHB * quantity,
        };
      }
      return {
        ...item,
        quantity,
        subtotalTHB: item.unitCostTHB * quantity,
      };
    })
    .filter((item): item is BomLineItem => item !== null);

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
