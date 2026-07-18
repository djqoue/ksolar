import { CAPACITY_TIERS, SOLAR_DEFAULTS } from "@/lib/config/solar";
import type { CapacityTier, CapacityTierId, SystemTopology } from "@/types/bom";
import type { CapacityIntent, StandardCapacityKW } from "@/types/quote";

export const STANDARD_CAPACITY_TARGETS_KW: readonly StandardCapacityKW[] = [5, 10, 15, 20];

const ALLOWED_STANDARD_TARGETS: Record<
  SystemTopology["phase"],
  readonly StandardCapacityKW[]
> = {
  "1P": [5, 10],
  "3P": [5, 10, 15, 20],
};

const TARGET_TO_TIER_ID: Record<StandardCapacityKW, CapacityTierId> = {
  5: "5kW",
  10: "10kW",
  15: "15kW",
  20: "20kW",
};

const TIER_ID_TO_TARGET: Partial<Record<CapacityTierId, StandardCapacityKW>> = {
  "5kW": 5,
  "10kW": 10,
  "15kW": 15,
  "20kW": 20,
};

export interface TierRecommendation {
  tier: CapacityTier | null;
  warnings: string[];
}

export interface CapacityIntentOption {
  intent: CapacityIntent;
  tier: CapacityTier | null;
  available: boolean;
  unavailableReason: string | null;
  requiredPanelCount: number;
  installedDcWp: number;
  engineeringReviewRequired: boolean;
}

export interface CapacityIntentResolution extends CapacityIntentOption {
  requested: true;
}

function normalizePanelPowerWp(panelPowerWp?: number) {
  return panelPowerWp && Number.isFinite(panelPowerWp) && panelPowerWp > 0
    ? panelPowerWp
    : SOLAR_DEFAULTS.panelPowerWp;
}

/**
 * Build a package tier from its customer-facing target and the selected module.
 * The installed DC size is rounded up to a whole module instead of reusing the
 * legacy 650 W module count.
 */
export function buildStandardCapacityTier(
  targetKW: StandardCapacityKW,
  panelPowerWp: number = SOLAR_DEFAULTS.panelPowerWp,
): CapacityTier {
  const resolvedPanelPowerWp = normalizePanelPowerWp(panelPowerWp);
  const targetWp = targetKW * 1000;
  const panelCount = Math.ceil(targetWp / resolvedPanelPowerWp);

  return {
    id: TARGET_TO_TIER_ID[targetKW],
    targetWp,
    nominalWp: panelCount * resolvedPanelPowerWp,
    panelCount,
    panelPowerWp: resolvedPanelPowerWp,
  };
}

function buildLegacyThreeKwTier(panelPowerWp: number): CapacityTier {
  const resolvedPanelPowerWp = normalizePanelPowerWp(panelPowerWp);
  const targetWp = 3000;
  const panelCount = Math.ceil(targetWp / resolvedPanelPowerWp);

  return {
    id: "3kW",
    targetWp,
    nominalWp: panelCount * resolvedPanelPowerWp,
    panelCount,
    panelPowerWp: resolvedPanelPowerWp,
  };
}

export function capacityIntentFromTierId(
  tierId?: CapacityTierId | null,
): CapacityIntent | null {
  if (!tierId) {
    return null;
  }

  const targetKW = TIER_ID_TO_TARGET[tierId];
  return targetKW ? { mode: "standard", targetKW } : null;
}

export function getAllowedCapacityTiers(
  phase: SystemTopology["phase"],
  panelPowerWp: number = SOLAR_DEFAULTS.panelPowerWp,
) {
  return ALLOWED_STANDARD_TARGETS[phase].map((targetKW) =>
    buildStandardCapacityTier(targetKW, panelPowerWp),
  );
}

export function getViableCapacityTiers(
  phase: SystemTopology["phase"],
  supportedPanelCount: number,
  panelPowerWp: number = SOLAR_DEFAULTS.panelPowerWp,
) {
  return getAllowedCapacityTiers(phase, panelPowerWp).filter(
    (tier) => tier.panelCount <= supportedPanelCount,
  );
}

export function recommendCapacityTier(
  phase: SystemTopology["phase"],
  supportedPanelCount: number,
  panelPowerWp: number = SOLAR_DEFAULTS.panelPowerWp,
): TierRecommendation {
  const viable = getViableCapacityTiers(phase, supportedPanelCount, panelPowerWp);

  if (viable.length === 0) {
    return {
      tier: null,
      warnings: [
        `Selected roof area supports ${supportedPanelCount} panel(s), which is below the smallest ${phase} standard package.`,
      ],
    };
  }

  return {
    tier: viable[viable.length - 1]!,
    warnings: [],
  };
}

/**
 * Legacy tier lookup retained for saved quotes that only contain selectedTierId.
 * New screens should use resolveCapacityIntent so unavailable choices have an
 * explicit reason instead of silently falling back to a different package.
 */
export function findSelectableTier(
  phase: SystemTopology["phase"],
  supportedPanelCount: number,
  selectedTierId?: CapacityTier["id"] | null,
  panelPowerWp: number = SOLAR_DEFAULTS.panelPowerWp,
) {
  if (!selectedTierId) {
    return null;
  }

  if (selectedTierId === "3kW") {
    const legacyTier = buildLegacyThreeKwTier(panelPowerWp);
    return phase === "1P" && legacyTier.panelCount <= supportedPanelCount
      ? legacyTier
      : null;
  }

  const targetKW = TIER_ID_TO_TARGET[selectedTierId];
  if (!targetKW || !ALLOWED_STANDARD_TARGETS[phase].includes(targetKW)) {
    return null;
  }

  const tier = buildStandardCapacityTier(targetKW, panelPowerWp);
  return tier.panelCount <= supportedPanelCount ? tier : null;
}

function getPhaseUnavailableReason(
  phase: SystemTopology["phase"],
  targetKW: StandardCapacityKW,
) {
  if (phase === "1P" && targetKW > 10) {
    return `${targetKW} kW is not a committed 1-phase package. Select 3-phase or request an engineering review; this package rule is not a grid-export limit.`;
  }

  return `${targetKW} kW is not available for the selected ${phase} package.`;
}

export function resolveCapacityIntent(input: {
  intent: CapacityIntent;
  phase: SystemTopology["phase"];
  supportedPanelCount: number;
  panelPowerWp?: number;
}): CapacityIntentResolution {
  const panelPowerWp = normalizePanelPowerWp(input.panelPowerWp);

  if (input.intent.mode === "roof-potential") {
    const installedDcWp = Math.max(0, input.supportedPanelCount) * panelPowerWp;
    const committedMaximum = getMaximumCommittedSystemWp(input.phase, panelPowerWp);

    return {
      requested: true,
      intent: input.intent,
      tier: null,
      available: input.supportedPanelCount > 0,
      unavailableReason:
        input.supportedPanelCount > 0
          ? null
          : "The selected roof does not support a complete PV module.",
      requiredPanelCount: Math.max(0, input.supportedPanelCount),
      installedDcWp,
      engineeringReviewRequired: installedDcWp > committedMaximum,
    };
  }

  const tier = buildStandardCapacityTier(input.intent.targetKW, panelPowerWp);
  const phaseAllowed = ALLOWED_STANDARD_TARGETS[input.phase].includes(
    input.intent.targetKW,
  );

  if (!phaseAllowed) {
    return {
      requested: true,
      intent: input.intent,
      tier,
      available: false,
      unavailableReason: getPhaseUnavailableReason(input.phase, input.intent.targetKW),
      requiredPanelCount: tier.panelCount,
      installedDcWp: tier.nominalWp,
      engineeringReviewRequired: true,
    };
  }

  if (tier.panelCount > input.supportedPanelCount) {
    return {
      requested: true,
      intent: input.intent,
      tier,
      available: false,
      unavailableReason: `${input.intent.targetKW} kW needs ${tier.panelCount} selected modules, but the roof supports ${input.supportedPanelCount}.`,
      requiredPanelCount: tier.panelCount,
      installedDcWp: tier.nominalWp,
      engineeringReviewRequired: false,
    };
  }

  return {
    requested: true,
    intent: input.intent,
    tier,
    available: true,
    unavailableReason: null,
    requiredPanelCount: tier.panelCount,
    installedDcWp: tier.nominalWp,
    engineeringReviewRequired: false,
  };
}

export function getCapacityIntentOptions(input: {
  phase: SystemTopology["phase"];
  supportedPanelCount: number;
  panelPowerWp?: number;
}): CapacityIntentOption[] {
  return [
    ...STANDARD_CAPACITY_TARGETS_KW.map((targetKW) =>
      resolveCapacityIntent({
        ...input,
        intent: { mode: "standard", targetKW },
      }),
    ),
    resolveCapacityIntent({ ...input, intent: { mode: "roof-potential" } }),
  ].map(({ requested: _requested, ...option }) => option);
}

export function getMaximumCommittedSystemWp(
  phase: SystemTopology["phase"],
  panelPowerWp: number = SOLAR_DEFAULTS.panelPowerWp,
) {
  const tiers = getAllowedCapacityTiers(phase, panelPowerWp);
  return tiers[tiers.length - 1]?.nominalWp || 0;
}

/** Static templates remain exported for importers that inspect legacy catalog data. */
export function findLegacyCatalogTier(tierId: CapacityTierId) {
  return CAPACITY_TIERS.find((tier) => tier.id === tierId) || null;
}
