import { SOLAR_DEFAULTS } from "@/lib/config/solar";

export interface PpaReturnsInput {
  annualGenerationKWh: number;
  capacityWp: number;
  capexTHBPerWp: number;
  contractYears?: number;
  annualOMRatio?: number;
  ppaEscalationRatio?: number;
  ppaRateTHBPerKWh: number;
}

export interface PpaReturnsResult {
  capexTHB: number;
  contractNetCashflowTHB: number;
  contractProfitTHB: number;
  contractRevenueTHB: number;
  firstYearNetCashflowTHB: number;
  firstYearOMTHB: number;
  firstYearRevenueTHB: number;
  simplePaybackYears: number | null;
}

export function calculatePpaReturns(input: PpaReturnsInput): PpaReturnsResult {
  const capacityWp = Math.max(0, input.capacityWp);
  const annualGenerationKWh = Math.max(0, input.annualGenerationKWh);
  const capexTHBPerWp = Math.max(0, input.capexTHBPerWp);
  const ppaRateTHBPerKWh = Math.max(0, input.ppaRateTHBPerKWh);
  const contractYears = Math.max(1, Math.round(input.contractYears ?? SOLAR_DEFAULTS.defaultPpaContractYears));
  const annualOMRatio = Math.max(0, input.annualOMRatio ?? SOLAR_DEFAULTS.annualOMRatio);
  const ppaEscalationRatio = input.ppaEscalationRatio ?? SOLAR_DEFAULTS.defaultPpaEscalationRatio;
  const capexTHB = capacityWp * capexTHBPerWp;
  const firstYearRevenueTHB = annualGenerationKWh * ppaRateTHBPerKWh;
  const firstYearOMTHB = capexTHB * annualOMRatio;
  const firstYearNetCashflowTHB = firstYearRevenueTHB - firstYearOMTHB;
  const simplePaybackYears =
    firstYearNetCashflowTHB > 0 ? capexTHB / firstYearNetCashflowTHB : null;

  let contractRevenueTHB = 0;
  let contractOMTHB = 0;

  for (let year = 1; year <= contractYears; year += 1) {
    const generationFactor = Math.pow(1 - SOLAR_DEFAULTS.degradationRatio, year - 1);
    const ppaRateFactor = Math.pow(1 + ppaEscalationRatio, year - 1);
    contractRevenueTHB += annualGenerationKWh * generationFactor * ppaRateTHBPerKWh * ppaRateFactor;
    contractOMTHB += firstYearOMTHB;
  }

  const contractNetCashflowTHB = contractRevenueTHB - contractOMTHB;

  return {
    capexTHB,
    contractNetCashflowTHB,
    contractProfitTHB: contractNetCashflowTHB - capexTHB,
    contractRevenueTHB,
    firstYearNetCashflowTHB,
    firstYearOMTHB,
    firstYearRevenueTHB,
    simplePaybackYears,
  };
}
