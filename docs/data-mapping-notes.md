# Excel-to-Code Mapping Notes

## Source treatment

- The two Excel workbooks are development references only.
- Runtime logic never reads Excel files.
- Every operational assumption is hand-translated into TypeScript config under `lib/config/*`.

## BOM mapping

- Summary totals from the reference workbook were used to lock:
  - panel counts
  - inverter models
  - battery models
  - category-level costs
- Detailed line items for:
  - `1P` on-grid / hybrid / hybrid+battery
  - `3P` on-grid / hybrid / hybrid+battery
  are now explicitly encoded from the detailed BOM sheets in `泰国家用光伏系统BOM_全配置.xlsx`.
- Panel, inverter, battery, mounting, and electrical rows now come from sheet-level line items rather than a synthetic BOS split.
- If the workbook summary sheet and a detailed sheet disagree, the code now follows the detailed sheet totals because they are line-item traceable.
- The reference workbook does not include a labor row, so `labor` remains `0` in the current catalog unless a later procurement source adds it.

## Market benchmarks

- The benchmark workbook supplies market price corridors by package size.
- `hybrid` without battery is not listed explicitly in the source workbook.
- For that case, the app derives a midpoint benchmark between `ongrid` and `hybrid_battery` for guidance only.

## Finance products

- Loan, installment, subsidy, and tax items are turned into typed config objects.
- Interest rates and subsidy values are reference defaults only and are intended to be refined later by product owners.
