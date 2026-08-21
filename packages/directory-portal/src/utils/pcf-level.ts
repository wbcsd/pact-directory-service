import { ProductFootprint } from "pact-data-model/v3_0";

/**
 * PCF Usability Model — PCF Levels (GitHub issue #328).
 *
 * Source of truth: WBCSD/PACT white paper
 * "Using PCF Data in Practice: A Usability Model" (March 2026), Figure 2.
 *
 * The white paper defines three progressive PCF Levels that describe how
 * complete and transparent a disclosed PCF dataset is (it is NOT a data-quality
 * or accuracy score):
 *
 *  - Level 1 — Indicative PCF: a minimal dataset with core identification, unit
 *    definition and cradle-to-gate emissions values.
 *  - Level 2 — Consistent PCF: a Level 1 dataset plus metadata enabling some
 *    evaluation of data reliability, representativeness and methodological
 *    consistency.
 *  - Level 3 — Methodologically Complete PCF: a Level 2 dataset that is
 *    methodologically complete (100% of PACT SHALL attributes, transparency on
 *    sources, choices and exclusions).
 *
 * (Level + — Conditional PCF is use-case specific and out of scope for automatic
 * derivation.)
 *
 * A PCF is awarded the highest level for which that level and every lower level
 * are fully populated. A gap in a lower level caps the achieved level.
 *
 * Note: the issue #328 refers to "grade 1/2/3"; the authoritative term from the
 * white paper is "Level", which is used throughout this module.
 */

/** 0 = below Level 1 (incomplete), 1..3 = achieved PCF Level. */
export type PcfLevel = 0 | 1 | 2 | 3;

export type PcfLevelKey = "indicative" | "consistent" | "complete";

type FootprintSource =
  | Partial<ProductFootprint>
  | Record<string, unknown>
  | null
  | undefined;

export interface LevelField {
  /** Dot-path to the value on the ProductFootprint (e.g. "pcf.fossilGhgEmissions"). */
  path?: string;
  /** The field is populated when *any* of these dot-paths is present (e.g. geography granularity). */
  anyOf?: string[];
  /** Human-readable label shown in the level breakdown. */
  label: string;
  /**
   * "If applicable" attribute: shown for context but never required to reach the
   * level, because applicability cannot be reliably inferred (per the white paper's
   * conditional attributes, e.g. biogenic carbon content, product/sector rules).
   */
  optional?: boolean;
  /** When provided, the field is only required if this predicate returns true. */
  requiredWhen?: (footprint: FootprintSource) => boolean;
}

export interface PcfLevelTier {
  level: 1 | 2 | 3;
  key: PcfLevelKey;
  /** Short name from the white paper (e.g. "Indicative"). */
  title: string;
  description: string;
  fields: LevelField[];
}

/** Read a nested value from an object using a dot-path, without throwing. */
function getByPath(source: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object") {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, source);
}

/** A value is "populated" unless it is nullish, an empty/whitespace string, or an empty array. Booleans (incl. false) count as populated. */
function isValuePopulated(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim() !== "";
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

/** True when the percentage of exempted emissions exceeds the PACT 3% threshold. */
function exemptedEmissionsAbove3Percent(footprint: FootprintSource): boolean {
  const raw = getByPath(footprint ?? {}, "pcf.exemptedEmissionsPercent");
  const value = typeof raw === "number" ? raw : parseFloat(String(raw ?? ""));
  return Number.isFinite(value) && value > 3;
}

// ── Level 1 — Indicative PCF ──
const INDICATIVE_TIER: PcfLevelTier = {
  level: 1,
  key: "indicative",
  title: "Indicative",
  description:
    "Core identification, unit definition and cradle-to-gate emissions value.",
  fields: [
    { path: "productNameCompany", label: "Product name" },
    { path: "productDescription", label: "Product description" },
    { path: "productIds", label: "Product IDs" },
    { path: "productClassifications", label: "Product classification codes", optional: true },
    { path: "status", label: "Status" },
    { path: "pcf.pcfExcludingBiogenicUptake", label: "PCF excluding biogenic CO₂ uptake" },
    { path: "pcf.declaredUnitOfMeasurement", label: "Declared unit" },
    { path: "pcf.declaredUnitAmount", label: "Declared unit amount" },
    { path: "pcf.productMassPerDeclaredUnit", label: "Product mass per declared unit" },
    { path: "pcf.referencePeriodStart", label: "Reference period start" },
    { path: "pcf.referencePeriodEnd", label: "Reference period end" },
    {
      anyOf: [
        "pcf.geographyCountrySubdivision",
        "pcf.geographyCountry",
        "pcf.geographyRegionOrSubregion",
      ],
      label: "Geographic scope",
    },
  ],
};

// ── Level 2 — Consistent PCF ──
const CONSISTENT_TIER: PcfLevelTier = {
  level: 2,
  key: "consistent",
  title: "Consistent",
  description:
    "Adds metadata enabling evaluation of reliability, representativeness and methodological consistency.",
  fields: [
    { path: "pcf.pcfIncludingBiogenicUptake", label: "PCF including biogenic CO₂ uptake" },
    { path: "pcf.biogenicCarbonContent", label: "Biogenic carbon content (if applicable)", optional: true },
    { path: "pcf.primaryDataShare", label: "Primary data share (PDS)" },
    { path: "pcf.secondaryEmissionFactorSources", label: "Secondary emission factor sources" },
    { path: "pcf.packagingEmissionsIncluded", label: "Packaging emissions included" },
    { path: "pcf.ipccCharacterizationFactors", label: "IPCC characterization factors" },
    { path: "pcf.productOrSectorSpecificRules", label: "Product/sector-specific rules (if applicable)", optional: true },
  ],
};

// ── Level 3 — Methodologically Complete PCF ──
const COMPLETE_TIER: PcfLevelTier = {
  level: 3,
  key: "complete",
  title: "Methodologically complete",
  description:
    "100% of PACT SHALL attributes, with transparency on boundary processes, allocation and exclusions.",
  fields: [
    { path: "pcf.boundaryProcessesDescription", label: "Boundary processes description" },
    // Remaining PACT SHALL attributes not already covered by Levels 1–2.
    { path: "companyName", label: "Company name" },
    { path: "companyIds", label: "Company IDs" },
    { path: "pcf.fossilGhgEmissions", label: "Fossil GHG emissions" },
    { path: "pcf.fossilCarbonContent", label: "Fossil carbon content" },
    { path: "pcf.crossSectoralStandards", label: "Cross-sectoral standards" },
    { path: "pcf.exemptedEmissionsPercent", label: "Exempted emissions percent" },
    { path: "pcf.allocationRulesDescription", label: "Allocation rules description" },
    {
      path: "pcf.exemptedEmissionsDescription",
      label: "Exempted emissions description (exemptions > 3%)",
      requiredWhen: exemptedEmissionsAbove3Percent,
    },
  ],
};

export const PCF_LEVEL_TIERS: readonly PcfLevelTier[] = [
  INDICATIVE_TIER,
  CONSISTENT_TIER,
  COMPLETE_TIER,
];

/** Fields of a tier that are actually required for the given footprint (excludes optional & unmet conditionals). */
function requiredFieldsFor(
  tier: PcfLevelTier,
  footprint: FootprintSource
): LevelField[] {
  return tier.fields.filter((field) => {
    if (field.optional) return false;
    if (field.requiredWhen && !field.requiredWhen(footprint)) return false;
    return true;
  });
}

/** Whether a single field is populated on the given footprint. */
function isFieldPopulated(footprint: FootprintSource, field: LevelField): boolean {
  const paths = field.anyOf ?? (field.path ? [field.path] : []);
  return paths.some((path) => isValuePopulated(getByPath(footprint ?? {}, path)));
}

export interface TierStatus {
  tier: PcfLevelTier;
  /** Whether every required field in this tier is populated. */
  complete: boolean;
  populatedCount: number;
  totalCount: number;
  /** Required fields in this tier that are not yet populated. */
  missingFields: LevelField[];
}

export interface PcfLevelResult {
  level: PcfLevel;
  /** Display label such as "Level 2" or "Incomplete". */
  label: string;
  /** Short human-readable name of the achieved tier (e.g. "Consistent"). */
  tierName: string;
  /** Radix Themes badge colour for the achieved level. */
  color: "gray" | "bronze" | "blue" | "green";
  tiers: TierStatus[];
}

const LEVEL_META: Record<
  PcfLevel,
  { label: string; tierName: string; color: PcfLevelResult["color"] }
> = {
  0: { label: "Incomplete", tierName: "Below Level 1", color: "gray" },
  1: { label: "Level 1", tierName: "Indicative", color: "bronze" },
  2: { label: "Level 2", tierName: "Consistent", color: "blue" },
  3: { label: "Level 3", tierName: "Methodologically complete", color: "green" },
};

/**
 * Compute the PCF Usability Model level for a footprint.
 *
 * The level is the highest tier for which that tier and every lower tier are
 * fully populated. "If applicable" attributes and unmet conditional attributes
 * do not block the level.
 */
export function computePcfLevel(footprint: FootprintSource): PcfLevelResult {
  const source = footprint ?? {};

  const tiers: TierStatus[] = PCF_LEVEL_TIERS.map((tier) => {
    const required = requiredFieldsFor(tier, source);
    const missingFields = required.filter((field) => !isFieldPopulated(source, field));
    return {
      tier,
      complete: missingFields.length === 0,
      populatedCount: required.length - missingFields.length,
      totalCount: required.length,
      missingFields,
    };
  });

  // Level is capped at the first incomplete tier.
  let level: PcfLevel = 0;
  for (const status of tiers) {
    if (!status.complete) break;
    level = status.tier.level;
  }

  const meta = LEVEL_META[level];
  return {
    level,
    label: meta.label,
    tierName: meta.tierName,
    color: meta.color,
    tiers,
  };
}
