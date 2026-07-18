import type { InverterSpec } from "@/lib/config/inverter-catalog";
import type { PanelSpec } from "@/lib/config/panel-catalog";
import type { SystemTopology } from "@/types/bom";
import type { ElectricalCompatibilitySummary } from "@/types/quote";

const MIN_ALLOWED_DC_AC_RATIO = 0.75;
const MAX_ALLOWED_DC_AC_RATIO = 1.35;
const RECOMMENDED_MIN_DC_AC_RATIO = 0.9;
const RECOMMENDED_MAX_DC_AC_RATIO = 1.25;
const COLD_VOC_SAFETY_FACTOR = 1.05;

function distributeModules(panelCount: number, stringCount: number) {
  const baseModules = Math.floor(panelCount / stringCount);
  const stringsWithExtraModule = panelCount % stringCount;

  return Array.from(
    { length: stringCount },
    (_, index) => baseModules + (index < stringsWithExtraModule ? 1 : 0),
  );
}

function findStringLayout(input: {
  panel: PanelSpec;
  inverter: InverterSpec;
  panelCount: number;
}) {
  const minimumModulesPerString = Math.max(
    1,
    Math.ceil(input.inverter.mpptVoltageMinV / input.panel.vmpV),
  );
  const maximumModulesPerString = Math.max(
    0,
    Math.min(
      Math.floor(input.inverter.mpptVoltageMaxV / input.panel.vmpV),
      Math.floor(
        input.inverter.maxInputVoltageV /
          (input.panel.vocV * COLD_VOC_SAFETY_FACTOR),
      ),
    ),
  );
  const maximumUsefulStrings = Math.min(
    input.inverter.mpptCount,
    input.inverter.maxStringCount,
    Math.floor(input.panelCount / minimumModulesPerString),
  );

  for (let stringCount = maximumUsefulStrings; stringCount >= 1; stringCount -= 1) {
    const modulesPerString = distributeModules(input.panelCount, stringCount);
    if (
      modulesPerString.every(
        (modules) =>
          modules >= minimumModulesPerString && modules <= maximumModulesPerString,
      )
    ) {
      return {
        modulesPerString,
        minimumModulesPerString,
        maximumModulesPerString,
      };
    }
  }

  return {
    modulesPerString: [] as number[],
    minimumModulesPerString,
    maximumModulesPerString,
  };
}

/** Pure catalog-based validation; it performs no pricing or UI fallback. */
export function checkElectricalCompatibility(input: {
  panel: PanelSpec;
  inverter: InverterSpec;
  panelCount: number;
  topology: Pick<SystemTopology, "phase" | "mode">;
}): ElectricalCompatibilitySummary {
  const errors: string[] = [];
  const warnings: string[] = [];
  const panelCount = Math.max(0, Math.floor(input.panelCount));
  const systemDcWp = panelCount * input.panel.peakPowerW;
  const dcAcRatio =
    input.inverter.ratedPowerKW > 0
      ? systemDcWp / (input.inverter.ratedPowerKW * 1000)
      : Number.POSITIVE_INFINITY;

  if (input.inverter.phase !== input.topology.phase) {
    errors.push(
      `Inverter phase ${input.inverter.phase} does not match the ${input.topology.phase} system.`,
    );
  }

  if (input.inverter.mode !== input.topology.mode) {
    errors.push(
      `Inverter mode ${input.inverter.mode} does not match the ${input.topology.mode} system.`,
    );
  }

  if (panelCount === 0) {
    errors.push("At least one PV module is required for electrical validation.");
  }

  if (dcAcRatio < MIN_ALLOWED_DC_AC_RATIO || dcAcRatio > MAX_ALLOWED_DC_AC_RATIO) {
    errors.push(
      `DC/AC ratio ${dcAcRatio.toFixed(2)} is outside the supported ${MIN_ALLOWED_DC_AC_RATIO.toFixed(2)}–${MAX_ALLOWED_DC_AC_RATIO.toFixed(2)} range.`,
    );
  } else if (
    dcAcRatio < RECOMMENDED_MIN_DC_AC_RATIO ||
    dcAcRatio > RECOMMENDED_MAX_DC_AC_RATIO
  ) {
    warnings.push(
      `DC/AC ratio ${dcAcRatio.toFixed(2)} is electrically supported but outside the preferred ${RECOMMENDED_MIN_DC_AC_RATIO.toFixed(2)}–${RECOMMENDED_MAX_DC_AC_RATIO.toFixed(2)} design range.`,
    );
  }

  const layout = findStringLayout({
    panel: input.panel,
    inverter: input.inverter,
    panelCount,
  });

  if (layout.modulesPerString.length === 0 && panelCount > 0) {
    errors.push(
      `No string arrangement fits ${input.inverter.mpptCount} MPPT input(s), ${input.inverter.maxStringCount} string input(s), and the ${input.inverter.mpptVoltageMinV}–${input.inverter.mpptVoltageMaxV} V MPPT window (maximum ${input.inverter.maxInputVoltageV} V).`,
    );
  }

  const stringVmps = layout.modulesPerString.map(
    (modules) => modules * input.panel.vmpV,
  );
  const stringVocs = layout.modulesPerString.map(
    (modules) => modules * input.panel.vocV * COLD_VOC_SAFETY_FACTOR,
  );

  return {
    compatible: errors.length === 0,
    inverterId: input.inverter.id,
    inverterModel: `${input.inverter.manufacturer} ${input.inverter.model}`,
    dcAcRatio,
    stringCount: layout.modulesPerString.length,
    modulesPerString: layout.modulesPerString,
    maxStringVocV: stringVocs.length ? Math.max(...stringVocs) : 0,
    minStringVmpV: stringVmps.length ? Math.min(...stringVmps) : 0,
    maxStringVmpV: stringVmps.length ? Math.max(...stringVmps) : 0,
    warnings,
    errors,
  };
}

export function selectCompatibleInverter(input: {
  panel: PanelSpec;
  candidates: InverterSpec[];
  panelCount: number;
  topology: Pick<SystemTopology, "phase" | "mode">;
}) {
  const compatible = input.candidates
    .map((inverter) => ({
      inverter,
      compatibility: checkElectricalCompatibility({
        panel: input.panel,
        inverter,
        panelCount: input.panelCount,
        topology: input.topology,
      }),
    }))
    .filter((candidate) => candidate.compatibility.compatible)
    .sort((left, right) => {
      const leftCost = left.inverter.unitCostTHB ?? Number.POSITIVE_INFINITY;
      const rightCost = right.inverter.unitCostTHB ?? Number.POSITIVE_INFINITY;
      if (leftCost !== rightCost) {
        return leftCost - rightCost;
      }

      return (
        Math.abs(left.compatibility.dcAcRatio - 1.05) -
        Math.abs(right.compatibility.dcAcRatio - 1.05)
      );
    });

  return compatible[0] || null;
}
