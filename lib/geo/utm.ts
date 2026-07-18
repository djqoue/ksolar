export interface LatLngBoundsLike {
  east: number;
  north: number;
  south: number;
  west: number;
}

export interface UtmCrs {
  hemisphere: "north" | "south";
  zone: number;
}

export function getUtmCrsFromEpsg(epsgCode?: number | null): UtmCrs | null {
  if (!epsgCode || !Number.isFinite(epsgCode)) {
    return null;
  }

  if (epsgCode >= 32601 && epsgCode <= 32660) {
    return {
      hemisphere: "north",
      zone: epsgCode - 32600,
    };
  }

  if (epsgCode >= 32701 && epsgCode <= 32760) {
    return {
      hemisphere: "south",
      zone: epsgCode - 32700,
    };
  }

  return null;
}

export function looksLikeLatLngBounds(bounds: LatLngBoundsLike) {
  return (
    Math.abs(bounds.west) <= 180 &&
    Math.abs(bounds.east) <= 180 &&
    Math.abs(bounds.south) <= 90 &&
    Math.abs(bounds.north) <= 90
  );
}

export function utmToLatLng(input: {
  easting: number;
  northing: number;
  zone: number;
  hemisphere: "north" | "south";
}) {
  const semiMajorAxis = 6378137;
  const eccentricitySquared = 0.00669438;
  const scaleFactor = 0.9996;
  const eccentricityPrimeSquared =
    eccentricitySquared / (1 - eccentricitySquared);
  const e1 =
    (1 - Math.sqrt(1 - eccentricitySquared)) /
    (1 + Math.sqrt(1 - eccentricitySquared));

  const x = input.easting - 500000;
  let y = input.northing;
  if (input.hemisphere === "south") {
    y -= 10000000;
  }

  const longitudeOrigin = (input.zone - 1) * 6 - 180 + 3;
  const meridionalArc = y / scaleFactor;
  const mu =
    meridionalArc /
    (semiMajorAxis *
      (1 -
        eccentricitySquared / 4 -
        (3 * eccentricitySquared ** 2) / 64 -
        (5 * eccentricitySquared ** 3) / 256));

  const j1 = (3 * e1) / 2 - (27 * e1 ** 3) / 32;
  const j2 = (21 * e1 ** 2) / 16 - (55 * e1 ** 4) / 32;
  const j3 = (151 * e1 ** 3) / 96;
  const j4 = (1097 * e1 ** 4) / 512;
  const footprintLatitude =
    mu +
    j1 * Math.sin(2 * mu) +
    j2 * Math.sin(4 * mu) +
    j3 * Math.sin(6 * mu) +
    j4 * Math.sin(8 * mu);

  const sinFootprint = Math.sin(footprintLatitude);
  const cosFootprint = Math.cos(footprintLatitude);
  const tanFootprint = Math.tan(footprintLatitude);
  const c1 = eccentricityPrimeSquared * cosFootprint ** 2;
  const t1 = tanFootprint ** 2;
  const n1 =
    semiMajorAxis /
    Math.sqrt(1 - eccentricitySquared * sinFootprint ** 2);
  const r1 =
    (semiMajorAxis * (1 - eccentricitySquared)) /
    (1 - eccentricitySquared * sinFootprint ** 2) ** 1.5;
  const d = x / (n1 * scaleFactor);

  const latitudeRadians =
    footprintLatitude -
    (n1 * tanFootprint) /
      r1 *
      (d ** 2 / 2 -
        ((5 + 3 * t1 + 10 * c1 - 4 * c1 ** 2 - 9 * eccentricityPrimeSquared) *
          d ** 4) /
          24 +
        ((61 +
          90 * t1 +
          298 * c1 +
          45 * t1 ** 2 -
          252 * eccentricityPrimeSquared -
          3 * c1 ** 2) *
          d ** 6) /
          720);

  const longitudeRadians =
    (d -
      ((1 + 2 * t1 + c1) * d ** 3) / 6 +
      ((5 -
        2 * c1 +
        28 * t1 -
        3 * c1 ** 2 +
        8 * eccentricityPrimeSquared +
        24 * t1 ** 2) *
        d ** 5) /
        120) /
    cosFootprint;

  return {
    lat: (latitudeRadians * 180) / Math.PI,
    lng: longitudeOrigin + (longitudeRadians * 180) / Math.PI,
  };
}

export function convertUtmBoundsToLatLng(
  bounds: LatLngBoundsLike,
  crs: UtmCrs,
): LatLngBoundsLike {
  const corners = [
    utmToLatLng({
      easting: bounds.west,
      northing: bounds.south,
      zone: crs.zone,
      hemisphere: crs.hemisphere,
    }),
    utmToLatLng({
      easting: bounds.east,
      northing: bounds.north,
      zone: crs.zone,
      hemisphere: crs.hemisphere,
    }),
    utmToLatLng({
      easting: bounds.west,
      northing: bounds.north,
      zone: crs.zone,
      hemisphere: crs.hemisphere,
    }),
    utmToLatLng({
      easting: bounds.east,
      northing: bounds.south,
      zone: crs.zone,
      hemisphere: crs.hemisphere,
    }),
  ];

  return {
    north: Math.max(...corners.map((corner) => corner.lat)),
    south: Math.min(...corners.map((corner) => corner.lat)),
    east: Math.max(...corners.map((corner) => corner.lng)),
    west: Math.min(...corners.map((corner) => corner.lng)),
  };
}
