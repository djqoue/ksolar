import { describe, expect, it } from "vitest";
import { buildBomScenario } from "@/lib/calc/bom";
import { calcBomQuantities } from "@/lib/calc/bom-quantities";
import { CAPACITY_TIERS } from "@/lib/config/solar";

describe("buildBomScenario", () => {
  it("returns the 1P on-grid 5kW BOM with grouped totals", () => {
    const tier = CAPACITY_TIERS.find((candidate) => candidate.id === "5kW");
    if (!tier) {
      throw new Error("Missing 5kW tier fixture");
    }

    const result = buildBomScenario(
      { phase: "1P", mode: "ongrid", batteryMode: "none" },
      tier,
    );

    expect(result).not.toBeNull();
    expect(result?.hardwareCostTHB).toBe(38070);
    expect(result?.categoryTotals.panel).toBe(17240);
    expect(result?.categoryTotals.inverter).toBe(12100);
    expect(result?.categoryTotals.battery).toBe(0);
    expect(result?.lineItems.some((item) => item.model === "SDM120CT(40ma) 1P Smart Meter")).toBe(true);
    expect(result?.lineItems.some((item) => item.model === "ATS 2P 63A")).toBe(false);
  });

  it("adds battery category for hybrid battery systems", () => {
    const tier = CAPACITY_TIERS.find((candidate) => candidate.id === "10kW");
    if (!tier) {
      throw new Error("Missing 10kW tier fixture");
    }

    const result = buildBomScenario(
      { phase: "3P", mode: "hybrid", batteryMode: "with_battery" },
      tier,
    );

    expect(result?.categoryTotals.battery).toBe(40350);
    expect(result?.hardwareCostTHB).toBe(147016);
    expect(result?.lineItems.some((item) => item.model === "Battery Cable 10AWG" && item.quantity === 1)).toBe(true);
    expect(result?.lineItems.some((item) => item.model === "ATS 4P 63A")).toBe(true);
  });

  it("formula quantities reproduce hardcoded template values for all tiers", () => {
    // Validates that calcBomQuantities() matches the static BOM catalog exactly.
    // If this test fails after a catalog change, update bom-quantities.ts to match.
    const cases: Array<{ panels: number; itemId: string; expected: number }> = [
      // 3kW — 5 panels, 1 row
      { panels: 5, itemId: "mount-rail", expected: 6 },
      { panels: 5, itemId: "mount-rail-splice", expected: 4 },
      { panels: 5, itemId: "mount-mid-clamp", expected: 8 },
      { panels: 5, itemId: "mount-end-clamp", expected: 8 },
      { panels: 5, itemId: "mount-tile-hook", expected: 10 },
      { panels: 5, itemId: "mount-ground-washer", expected: 5 },
      { panels: 5, itemId: "mount-ground-lug", expected: 2 },
      { panels: 5, itemId: "mount-cable-clip", expected: 10 },
      { panels: 5, itemId: "dc-pv-cable", expected: 1 },
      { panels: 5, itemId: "dc-mc4-pair", expected: 4 },
      { panels: 5, itemId: "dc-mc4-branch", expected: 0 },
      { panels: 5, itemId: "dc-spd", expected: 1 },
      { panels: 5, itemId: "dc-breaker", expected: 1 },
      { panels: 5, itemId: "dc-fuse-holder", expected: 2 },
      { panels: 5, itemId: "dc-fuse-link", expected: 2 },
      // 10kW — 16 panels, 2 rows
      { panels: 16, itemId: "mount-rail", expected: 16 },
      { panels: 16, itemId: "mount-rail-splice", expected: 12 },
      { panels: 16, itemId: "mount-mid-clamp", expected: 28 },
      { panels: 16, itemId: "mount-tile-hook", expected: 32 },
      { panels: 16, itemId: "mount-ground-washer", expected: 16 },
      { panels: 16, itemId: "mount-ground-lug", expected: 4 },
      { panels: 16, itemId: "dc-pv-cable", expected: 1 },
      { panels: 16, itemId: "dc-mc4-pair", expected: 6 },
      { panels: 16, itemId: "dc-mc4-branch", expected: 2 },
      { panels: 16, itemId: "dc-spd", expected: 2 },
      { panels: 16, itemId: "dc-fuse-holder", expected: 4 },
      // 15kW — 24 panels, 3 rows
      { panels: 24, itemId: "mount-rail", expected: 24 },
      { panels: 24, itemId: "mount-rail-splice", expected: 18 },
      { panels: 24, itemId: "mount-mid-clamp", expected: 42 },
      { panels: 24, itemId: "mount-tile-hook", expected: 48 },
      { panels: 24, itemId: "mount-ground-lug", expected: 6 },
      // 20kW — 31 panels, 3 rows
      { panels: 31, itemId: "mount-rail", expected: 36 },
      { panels: 31, itemId: "mount-rail-splice", expected: 30 },
      { panels: 31, itemId: "mount-tile-hook", expected: 62 },
      { panels: 31, itemId: "mount-ground-washer", expected: 31 },
      { panels: 31, itemId: "dc-pv-cable", expected: 2 },
    ];

    for (const { panels, itemId, expected } of cases) {
      const qty = calcBomQuantities(panels);
      expect(qty[itemId], `panels=${panels} ${itemId}`).toBe(expected);
    }
  });

  it("formula quantities are applied when panelCount is passed to buildBomScenario", () => {
    const tier = CAPACITY_TIERS.find((t) => t.id === "10kW")!;
    const bom = buildBomScenario({ phase: "1P", mode: "ongrid", batteryMode: "none" }, tier, undefined, 16);
    const rail = bom?.lineItems.find((i) => i.id === "mount-rail");
    const midClamp = bom?.lineItems.find((i) => i.id === "mount-mid-clamp");
    expect(rail?.quantity).toBe(16);
    expect(midClamp?.quantity).toBe(28);
  });

  it("keeps the 15kW 3P on-grid BOM aligned with the configured package totals", () => {
    const tier = CAPACITY_TIERS.find((candidate) => candidate.id === "15kW");
    if (!tier) {
      throw new Error("Missing 15kW tier fixture");
    }

    const result = buildBomScenario(
      { phase: "3P", mode: "ongrid", batteryMode: "none" },
      tier,
    );

    expect(result).not.toBeNull();
    expect(result?.categoryTotals.panel).toBe(51720);
    expect(result?.categoryTotals.inverter).toBe(24300);
    expect(result?.hardwareCostTHB).toBe(94928);
    expect(result?.lineItems.some((item) => item.model === "SDM630MCT 3P Smart Meter")).toBe(true);
    expect(result?.categoryTotals.labor).toBe(0);
  });
});
