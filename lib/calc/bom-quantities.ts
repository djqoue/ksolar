/**
 * Formula-based BOM quantity calculator for mounting and DC electrical items.
 *
 * Quantities are derived from panel count rather than hardcoded per capacity tier.
 * Validated against real installation case studies (Thailand, China) and reverse-
 * engineered to reproduce KSolar's existing hardcoded values exactly for all tiers.
 *
 * Assumptions:
 * - Panels are mounted in portrait orientation on a tile/corrugated roof
 * - Max ~11 panels per row (suits a typical ~13m-wide Thai residential roof)
 * - 2 horizontal aluminium rails per row (top + bottom of panel)
 * - Rail length: 2400mm (SE47 L2400 standard)
 * - Default panel short-side width: 1134mm (standard 650W panel)
 */

/** KSolar standard rail length (mm) */
export const RAIL_LENGTH_MM = 2400;

/** Default panel short-side width (mm) for a standard 650W panel */
export const DEFAULT_PANEL_WIDTH_MM = 1134;

/** Max panels per row — controls how many rows the array is split into */
const MAX_PANELS_PER_ROW = 11;

export interface BomQuantityMap {
  [itemId: string]: number;
}

/**
 * Compute mounting and DC electrical item quantities from panel count.
 * Returns a map of BOM item id → quantity.
 * Items with quantity 0 will be filtered out by buildBomScenario.
 */
export function calcBomQuantities(
  panelCount: number,
  panelWidthMm: number = DEFAULT_PANEL_WIDTH_MM,
): BomQuantityMap {
  const rows = Math.max(1, Math.ceil(panelCount / MAX_PANELS_PER_ROW));
  const panelsPerRow = Math.ceil(panelCount / rows);

  // Rail sections needed per rail run (top or bottom of a single row)
  const sectionsPerRun = Math.ceil((panelsPerRow * panelWidthMm) / RAIL_LENGTH_MM);

  // DC string count, capped at 2 (covers all KSolar residential tiers)
  const strings = Math.min(2, Math.ceil(panelCount / 8));

  return {
    // ── Mounting ──────────────────────────────────────────────────────────
    // 2 rail runs (top + bottom) × rows × sections per run
    "mount-rail": rows * 2 * sectionsPerRun,
    // Joins between rail sections; (sections-1) splices per run
    "mount-rail-splice": rows * 2 * Math.max(0, sectionsPerRun - 1),
    // rows × (panels_per_row - 1) gaps × 2 rails per gap
    "mount-mid-clamp": Math.max(0, rows * (panelsPerRow - 1) * 2),
    // Fixed: 4 array corners × 2 sides = 8; independent of panel count
    "mount-end-clamp": 8,
    // 2 hooks per panel (one per long edge against the roof)
    "mount-tile-hook": panelCount * 2,
    // 1 ground washer per panel frame
    "mount-ground-washer": panelCount,
    // 2 ground lugs per row (one at each end of the rail run)
    "mount-ground-lug": rows * 2,
    // 2 cable clips per panel (one per rail for module wiring)
    "mount-cable-clip": panelCount * 2,

    // ── DC Electrical ─────────────────────────────────────────────────────
    // 1 roll (100m) handles up to 16 panels; 2 rolls for larger arrays
    "dc-pv-cable": panelCount <= 16 ? 1 : 2,
    // 4 pairs for single-string, 6 pairs for dual-string (includes buffer)
    "dc-mc4-pair": strings === 1 ? 4 : 6,
    // Y-branch only needed when paralleling 2+ strings
    "dc-mc4-branch": strings > 1 ? 2 : 0,
    // 1 SPD + 1 breaker per string group
    "dc-spd": strings,
    "dc-breaker": strings,
    // 1 fuse holder + link per pole (+ and −) per string
    "dc-fuse-holder": strings * 2,
    "dc-fuse-link": strings * 2,
  };
}
