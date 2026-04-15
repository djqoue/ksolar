import { describe, expect, it } from "vitest";
import { calculateRoofPotential } from "@/lib/calc/roof";
import { createEmptyMapSelection } from "@/lib/maps";

describe("calculateRoofPotential", () => {
  it("derates gross roof area and converts to supported panel count", () => {
    const selection = {
      ...createEmptyMapSelection(),
      grossAreaM2: 100,
      usableAreaM2: 70,
    };

    const result = calculateRoofPotential(selection);

    expect(result.usableAreaM2).toBe(70);
    expect(result.panelCount).toBe(22);
    expect(result.theoreticalWp).toBe(14300);
  });
});

