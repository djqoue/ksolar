import { describe, expect, it } from "vitest";
import {
  buildStandardCapacityTier,
  getCapacityIntentOptions,
  resolveCapacityIntent,
} from "@/lib/calc/sizing";

describe("capacity intent sizing", () => {
  it("rounds a standard target up to whole selected modules", () => {
    const tier = buildStandardCapacityTier(10, 550);

    expect(tier.id).toBe("10kW");
    expect(tier.targetWp).toBe(10_000);
    expect(tier.panelCount).toBe(19);
    expect(tier.nominalWp).toBe(10_450);
  });

  it("keeps all standard targets at or above nameplate across module wattages", () => {
    for (const panelPowerWp of [550, 650, 710]) {
      for (const targetKW of [5, 10, 15, 20] as const) {
        const tier = buildStandardCapacityTier(targetKW, panelPowerWp);

        expect(tier.panelCount).toBe(Math.ceil((targetKW * 1000) / panelPowerWp));
        expect(tier.nominalWp).toBeGreaterThanOrEqual(targetKW * 1000);
        expect(tier.nominalWp).toBeLessThan(targetKW * 1000 + panelPowerWp);
      }
    }
  });

  it("returns one authoritative phase availability result with reasons", () => {
    const options = getCapacityIntentOptions({
      phase: "1P",
      supportedPanelCount: 100,
      panelPowerWp: 650,
    });
    const fifteenKw = options.find(
      (option) =>
        option.intent.mode === "standard" && option.intent.targetKW === 15,
    );

    expect(options).toHaveLength(5);
    expect(fifteenKw?.available).toBe(false);
    expect(fifteenKw?.unavailableReason).toContain("not a grid-export limit");
  });

  it("allows all committed standard capacities on 3-phase when the roof fits", () => {
    const options = getCapacityIntentOptions({
      phase: "3P",
      supportedPanelCount: 100,
      panelPowerWp: 650,
    }).filter((option) => option.intent.mode === "standard");

    expect(options.every((option) => option.available)).toBe(true);
  });

  it("marks roof potential above the phase-specific BOM range for engineering", () => {
    const resolution = resolveCapacityIntent({
      intent: { mode: "roof-potential" },
      phase: "3P",
      supportedPanelCount: 40,
      panelPowerWp: 650,
    });

    expect(resolution.available).toBe(true);
    expect(resolution.installedDcWp).toBe(26_000);
    expect(resolution.engineeringReviewRequired).toBe(true);
    expect(resolution.tier).toBeNull();
  });

  it("reports the exact one-panel roof boundary for a standard package", () => {
    const tenKw = buildStandardCapacityTier(10, 650);
    const oneShort = resolveCapacityIntent({
      intent: { mode: "standard", targetKW: 10 },
      phase: "1P",
      supportedPanelCount: tenKw.panelCount - 1,
      panelPowerWp: 650,
    });
    const exact = resolveCapacityIntent({
      intent: { mode: "standard", targetKW: 10 },
      phase: "1P",
      supportedPanelCount: tenKw.panelCount,
      panelPowerWp: 650,
    });

    expect(oneShort.available).toBe(false);
    expect(oneShort.unavailableReason).toContain("needs 16 selected modules");
    expect(exact.available).toBe(true);
  });
});
