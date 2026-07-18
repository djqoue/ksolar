import { describe, expect, it } from "vitest";
import {
  convertUtmBoundsToLatLng,
  getUtmCrsFromEpsg,
  looksLikeLatLngBounds,
  utmToLatLng,
} from "@/lib/geo/utm";

describe("UTM helpers", () => {
  it("detects Google Solar UTM EPSG codes", () => {
    expect(getUtmCrsFromEpsg(32647)).toEqual({ hemisphere: "north", zone: 47 });
    expect(getUtmCrsFromEpsg(32747)).toEqual({ hemisphere: "south", zone: 47 });
    expect(getUtmCrsFromEpsg(4326)).toBeNull();
  });

  it("keeps ordinary WGS84 bounds unchanged by detection", () => {
    expect(
      looksLikeLatLngBounds({
        north: 12.97,
        south: 12.96,
        east: 101.11,
        west: 101.1,
      }),
    ).toBe(true);
  });

  it("converts Solar GeoTIFF UTM bounds near Rayong into map bounds", () => {
    const point = utmToLatLng({
      easting: 728203.3,
      northing: 1434348,
      zone: 47,
      hemisphere: "north",
    });

    expect(point.lat).toBeCloseTo(12.966288, 5);
    expect(point.lng).toBeCloseTo(101.103682, 5);

    const bounds = convertUtmBoundsToLatLng(
      {
        west: 728203.3,
        south: 1434348,
        east: 728342.6,
        north: 1434487.4,
      },
      { hemisphere: "north", zone: 47 },
    );

    expect(bounds.south).toBeGreaterThan(12.96);
    expect(bounds.north).toBeLessThan(12.98);
    expect(bounds.west).toBeGreaterThan(101.1);
    expect(bounds.east).toBeLessThan(101.11);
  });
});
