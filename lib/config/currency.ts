/**
 * Currency conversion constants for KSolar BOM pricing.
 *
 * All hardware prices in iSolarBP are quoted in CNY (Chinese Yuan).
 * KSolar displays prices in THB (Thai Baht).
 *
 * Source: iSolarBP 设计物料管理 — scraped 2026-04-20
 * Rate:   1 CNY ≈ 5.10 THB (approximate mid-market, update periodically)
 */
export const CNY_TO_THB = 5.10;

/** Convert a CNY price to THB, rounded to the nearest integer. */
export function cnyToThb(cny: number): number {
  return Math.round(cny * CNY_TO_THB);
}
