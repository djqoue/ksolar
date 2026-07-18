import { describe, expect, it } from "vitest";
import { calculatePpaReturns } from "@/lib/calc/ppa";

describe("calculatePpaReturns", () => {
  it("calculates simple investor payback from generation, PPA tariff, CAPEX, and O&M", () => {
    const result = calculatePpaReturns({
      annualGenerationKWh: 2_279_927,
      capacityWp: 1_400_100,
      capexTHBPerWp: 18,
      contractYears: 15,
      annualOMRatio: 0.01,
      ppaRateTHBPerKWh: 3,
    });

    expect(result.capexTHB).toBeCloseTo(25_201_800, 0);
    expect(result.firstYearRevenueTHB).toBeCloseTo(6_839_781, 0);
    expect(result.firstYearOMTHB).toBeCloseTo(252_018, 0);
    expect(result.firstYearNetCashflowTHB).toBeCloseTo(6_587_763, 0);
    expect(result.simplePaybackYears).toBeCloseTo(3.83, 2);
    expect(result.contractProfitTHB).toBeGreaterThan(60_000_000);
  });

  it("returns no payback when annual PPA cashflow cannot cover O&M", () => {
    const result = calculatePpaReturns({
      annualGenerationKWh: 10_000,
      capacityWp: 100_000,
      capexTHBPerWp: 20,
      annualOMRatio: 0.02,
      ppaRateTHBPerKWh: 1,
    });

    expect(result.firstYearNetCashflowTHB).toBeLessThan(0);
    expect(result.simplePaybackYears).toBeNull();
  });
});
