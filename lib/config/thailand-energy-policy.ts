/**
 * Versioned public assumptions used by the sales calculator.
 *
 * These values are not approvals. Every entry carries an effective window and
 * official source so an expired policy cannot silently remain in a quotation.
 */
export const THAILAND_ENERGY_POLICY = {
  version: "th-2026-07-18",
  lastVerifiedAt: "2026-07-18",
  ft: {
    valueTHBPerKWh: 0.1623,
    validFrom: "2026-05-01",
    validTo: "2026-08-31",
    sourceUrl: "https://www.erc.or.th/th/automatic/",
  },
  vat: {
    rate: 0.07,
    validTo: "2026-09-30",
    sourceUrl: "https://www.rd.go.th/english/6043.html",
  },
  residentialNetBilling: {
    exportRateTHBPerKWh: 2.2,
    contractYears: 10,
    approvedExportLimitKwAc: 5,
    nationalProgramLimitMwAc: 500,
    peaGridInspectionFeeTHBExVat: 2_000,
    status: "confirmed" as const,
    sourceUrl:
      "https://ppim.pea.co.th/app/v1/project/solar/detail/6a3df059ee9f0e286c0a1766",
  },
  residentialTaxDeduction: {
    maximumDeductionTHB: 200_000,
    validFrom: "2026-03-03",
    validTo: "2028-12-31",
    status: "confirmed" as const,
    sourceUrl: "https://www.rd.go.th/fileadmin/tax_pdf/pit/2569/Ins94_160669.pdf",
  },
} as const;

export function isPolicyCurrent(
  validTo: string | undefined,
  calculationDate = new Date().toISOString().slice(0, 10),
) {
  return !validTo || calculationDate <= validTo;
}
