import { describe, expect, it } from "vitest";
import {
  checkElectricalCompatibility,
  selectCompatibleInverter,
} from "@/lib/calc/electrical-compatibility";
import { findInverter, filterResidentialInverters } from "@/lib/config/inverter-catalog";
import { DEFAULT_PANEL_ID, findPanel } from "@/lib/config/panel-catalog";

describe("electrical compatibility", () => {
  const panel = findPanel(DEFAULT_PANEL_ID)!;

  it("validates DC/AC ratio and a balanced MPPT string arrangement", () => {
    const inverter = findInverter("growatt-sun-10k-g02p1-eu")!;
    const result = checkElectricalCompatibility({
      panel,
      inverter,
      panelCount: 16,
      topology: { phase: "1P", mode: "ongrid" },
    });

    expect(result.compatible).toBe(true);
    expect(result.dcAcRatio).toBeCloseTo(1.04, 2);
    expect(result.modulesPerString).toEqual([8, 8]);
    expect(result.maxStringVocV).toBeLessThan(inverter.maxInputVoltageV);
  });

  it("rejects a manually undersized inverter", () => {
    const inverter = findInverter("growatt-sun-5k-g05p1-eu")!;
    const result = checkElectricalCompatibility({
      panel,
      inverter,
      panelCount: 16,
      topology: { phase: "1P", mode: "ongrid" },
    });

    expect(result.compatible).toBe(false);
    expect(result.errors.join(" ")).toContain("DC/AC ratio");
  });

  it("selects a compatible catalog fallback for the array", () => {
    const selection = selectCompatibleInverter({
      panel,
      candidates: filterResidentialInverters("1P", "ongrid"),
      panelCount: 16,
      topology: { phase: "1P", mode: "ongrid" },
    });

    expect(selection?.inverter.id).toBe("growatt-sun-10k-g02p1-eu");
    expect(selection?.compatibility.compatible).toBe(true);
  });
});
