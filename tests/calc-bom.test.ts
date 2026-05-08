import { describe, expect, it } from "vitest";
import { buildBomScenario } from "@/lib/calc/bom";
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
