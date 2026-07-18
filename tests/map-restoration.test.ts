import { describe, expect, it } from "vitest";
import { DEFAULT_MAP_CENTER, resolveRestoredMapCenter } from "@/lib/maps";
import type { RoofShape } from "@/types/quote";

const selectedRoof: RoofShape = {
  id: "roof-1",
  kind: "polygon",
  path: [
    { lat: 13.7053, lng: 100.5389 },
    { lat: 13.7055, lng: 100.5389 },
    { lat: 13.7055, lng: 100.5391 },
    { lat: 13.7053, lng: 100.5391 },
  ],
  areaM2: 214.1,
};

describe("map restoration", () => {
  it("returns to the selected roof instead of the Bangkok default", () => {
    const restoredCenter = resolveRestoredMapCenter(
      [selectedRoof],
      { latitude: 13.7563, longitude: 100.5018 },
      { latitude: 13.8, longitude: 100.6 },
    );

    expect(restoredCenter.latitude).toBeCloseTo(13.7054, 6);
    expect(restoredCenter.longitude).toBeCloseTo(100.539, 6);
  });

  it("falls back through the saved center, customer point, and default", () => {
    const savedCenter = { latitude: 13.72, longitude: 100.54 };
    const customerPoint = { latitude: 13.8, longitude: 100.6 };

    expect(resolveRestoredMapCenter([], savedCenter, customerPoint)).toEqual(savedCenter);
    expect(resolveRestoredMapCenter([], null, customerPoint)).toEqual(customerPoint);
    expect(resolveRestoredMapCenter([], null, null)).toEqual({
      latitude: DEFAULT_MAP_CENTER.lat,
      longitude: DEFAULT_MAP_CENTER.lng,
    });
  });
});
