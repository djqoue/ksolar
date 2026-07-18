/**
 * Formula-based BOM quantity calculator for mounting and DC electrical items.
 *
 * The calculator accepts the selected module width and an optional physical row
 * layout. This prevents a 520 W or 650 W module from inheriting rail quantities
 * that were calculated for a different footprint.
 */

/** KSolar standard rail length (mm) */
export const RAIL_LENGTH_MM = 2400;

/** Legacy fallback only; quote calculations pass the selected panel width. */
export const DEFAULT_PANEL_WIDTH_MM = 1134;

/** Conservative default used when the map layout has not supplied rows. */
export const DEFAULT_MAX_PANELS_PER_ROW = 11;

export interface BomQuantityMap {
  [itemId: string]: number;
}

export interface BomQuantityOptions {
  panelWidthMm?: number;
  /** Exact module count in each physical row, when available from layout. */
  rowPanelCounts?: number[];
  maxPanelsPerRow?: number;
  /** Validated electrical string count from the inverter compatibility check. */
  stringCount?: number;
}

export function derivePanelRowCounts(
  panelCount: number,
  maxPanelsPerRow: number = DEFAULT_MAX_PANELS_PER_ROW,
) {
  const safePanelCount = Math.max(0, Math.floor(panelCount));
  const safeMaximum = Math.max(1, Math.floor(maxPanelsPerRow));

  if (safePanelCount === 0) {
    return [];
  }

  const rowCount = Math.ceil(safePanelCount / safeMaximum);
  const basePanelsPerRow = Math.floor(safePanelCount / rowCount);
  const rowsWithOneExtraPanel = safePanelCount % rowCount;

  return Array.from(
    { length: rowCount },
    (_, index) => basePanelsPerRow + (index < rowsWithOneExtraPanel ? 1 : 0),
  );
}

function normalizeRowPanelCounts(panelCount: number, options: BomQuantityOptions) {
  const suppliedRows = options.rowPanelCounts
    ?.map((count) => Math.max(0, Math.floor(count)))
    .filter((count) => count > 0);

  if (
    suppliedRows?.length &&
    suppliedRows.reduce((sum, count) => sum + count, 0) === panelCount
  ) {
    return suppliedRows;
  }

  return derivePanelRowCounts(panelCount, options.maxPanelsPerRow);
}

/**
 * Compute mounting and DC electrical item quantities from panel count.
 * The numeric second argument is retained for callers using the old API.
 */
export function calcBomQuantities(
  panelCount: number,
  panelWidthOrOptions: number | BomQuantityOptions = DEFAULT_PANEL_WIDTH_MM,
): BomQuantityMap {
  const safePanelCount = Math.max(0, Math.floor(panelCount));
  if (safePanelCount === 0) {
    return {};
  }

  const options: BomQuantityOptions =
    typeof panelWidthOrOptions === "number"
      ? { panelWidthMm: panelWidthOrOptions }
      : panelWidthOrOptions;
  const panelWidthMm =
    options.panelWidthMm && options.panelWidthMm > 0
      ? options.panelWidthMm
      : DEFAULT_PANEL_WIDTH_MM;
  const rowPanelCounts = normalizeRowPanelCounts(safePanelCount, options);
  const rows = rowPanelCounts.length;
  const railSectionsPerRun = rowPanelCounts.map((panelsInRow) =>
    Math.ceil((panelsInRow * panelWidthMm) / RAIL_LENGTH_MM),
  );
  const totalRailRuns = rows * 2;
  const railSections = railSectionsPerRun.reduce(
    (sum, sectionsPerRun) => sum + sectionsPerRun * 2,
    0,
  );
  const strings = Math.max(
    1,
    Math.floor(options.stringCount || Math.min(2, Math.ceil(safePanelCount / 8))),
  );

  return {
    // Two rail runs per row, sized from each row's actual module count.
    "mount-rail": railSections,
    // Every run needs one fewer splice than rail sections.
    "mount-rail-splice": Math.max(0, railSections - totalRailRuns),
    // Two mid-clamps between every adjacent pair of modules in a row.
    "mount-mid-clamp": rowPanelCounts.reduce(
      (sum, panelsInRow) => sum + Math.max(0, panelsInRow - 1) * 2,
      0,
    ),
    // Two ends on each of two rail runs, for every physical row.
    "mount-end-clamp": rows * 4,
    "mount-tile-hook": safePanelCount * 2,
    "mount-ground-washer": safePanelCount,
    "mount-ground-lug": rows * 2,
    "mount-cable-clip": safePanelCount * 2,

    "dc-pv-cable": safePanelCount <= 16 ? 1 : 2,
    "dc-mc4-pair": strings === 1 ? 4 : Math.max(6, strings * 2),
    "dc-mc4-branch": strings > 1 ? 2 : 0,
    "dc-spd": strings,
    "dc-breaker": strings,
    "dc-fuse-holder": strings * 2,
    "dc-fuse-link": strings * 2,
  };
}
