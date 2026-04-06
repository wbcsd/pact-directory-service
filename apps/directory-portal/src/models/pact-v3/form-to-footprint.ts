import {
  ProductFootprint,
  ProductFootprintStatus,
  CarbonFootprintDeclaredUnitOfMeasurement as DeclaredUnit,
  CarbonFootprint,
  CarbonFootprintGeographyRegionOrSubregion,
  CarbonFootprintCcuCalculationApproach,
} from 'pact-data-model/v3_0';
import { ProductFootprintFormData } from '../../components/ProductFootprintForm';

/**
 * Convert flat portal form data into a PACT v3 ProductFootprintV3 object.
 *
 * - Generates a new UUID `id` and sets `specVersion` to "3.0.0".
 * - Parses comma-separated URN fields (`companyIds`, `productIds`) into arrays.
 * - Maps flat PCF fields into the nested `pcf: CarbonFootprintV3` sub-object.
 * - Converts date-only strings (YYYY-MM-DD) to ISO 8601 with midnight UTC.
 * - Parses numeric strings and booleans as appropriate for the spec.
 */
export function formDataToProductFootprint(
  flat: ProductFootprintFormData
): ProductFootprint {
  const now = new Date().toISOString();

  // Parse comma-separated URN lists into arrays
  const companyIds = parseUrnList(flat.companyIds);
  const productIds = parseUrnList(flat.productIds);

  // Parse product classifications (comma-separated URN strings)
  const productClassifications = parseProductClassifications(flat.productClassifications);

  // Map crossSectoralStandards string to string array
  const crossSectoralStandards = mapCrossSectoralStandards(flat.crossSectoralStandards);

  const pcf: CarbonFootprint = {
    declaredUnitOfMeasurement: mapDeclaredUnit(flat.declaredUnitOfMeasurement),
    declaredUnitAmount: flat.declaredUnitAmount || '1.0',
    productMassPerDeclaredUnit: flat.productMassPerDeclaredUnit || '0',
    pcfExcludingBiogenicUptake: flat.pcfExcludingBiogenicUptake || '0',
    pcfIncludingBiogenicUptake: flat.pcfIncludingBiogenicUptake || '0',
    fossilGhgEmissions: flat.fossilGhgEmissions || '0',
    fossilCarbonContent: flat.fossilCarbonContent || '0',
    ipccCharacterizationFactors: mapCharacterizationFactors(flat.ipccCharacterizationFactors),
    crossSectoralStandards,
    referencePeriodStart: toIso8601(flat.referencePeriodStart) || now,
    referencePeriodEnd: toIso8601(flat.referencePeriodEnd) || now,
    exemptedEmissionsPercent: flat.exemptedEmissionsPercent || '0',
    packagingEmissionsIncluded: flat.packagingEmissionsIncluded === 'true',
  };

  // Optional PCF fields — only include if non-empty
  if (flat.biogenicCarbonContent) pcf.biogenicCarbonContent = flat.biogenicCarbonContent;
  if (flat.geographyRegionOrSubregion) pcf.geographyRegionOrSubregion = flat.geographyRegionOrSubregion as CarbonFootprintGeographyRegionOrSubregion;
  if (flat.geographyCountry) pcf.geographyCountry = flat.geographyCountry;
  if (flat.geographyCountrySubdivision) pcf.geographyCountrySubdivision = flat.geographyCountrySubdivision;
  if (flat.boundaryProcessesDescription) pcf.boundaryProcessesDescription = flat.boundaryProcessesDescription;
  if (flat.exemptedEmissionsDescription) pcf.exemptedEmissionsDescription = flat.exemptedEmissionsDescription;
  if (flat.packagingGhgEmissions) pcf.packagingGhgEmissions = flat.packagingGhgEmissions;
  if (flat.allocationRulesDescription) pcf.allocationRulesDescription = flat.allocationRulesDescription;
  if (flat.primaryDataShare) pcf.primaryDataShare = flat.primaryDataShare;
  if (flat.landUseChangeGhgEmissions) pcf.landUseChangeGhgEmissions = flat.landUseChangeGhgEmissions;
  if (flat.aircraftGhgEmissions) pcf.aircraftGhgEmissions = flat.aircraftGhgEmissions;
  if (flat.biogenicCO2Uptake) pcf.biogenicCO2Uptake = flat.biogenicCO2Uptake;
  if (flat.biogenicNonCO2Emissions) pcf.biogenicNonCO2Emissions = flat.biogenicNonCO2Emissions;
  if (flat.recycledCarbonContent) pcf.recycledCarbonContent = flat.recycledCarbonContent;
  if (flat.landCarbonLeakage) pcf.landCarbonLeakage = flat.landCarbonLeakage;
  if (flat.landManagementFossilGhgEmissions) pcf.landManagementFossilGhgEmissions = flat.landManagementFossilGhgEmissions;
  if (flat.landManagementBiogenicCO2Emissions) pcf.landManagementBiogenicCO2Emissions = flat.landManagementBiogenicCO2Emissions;
  if (flat.landManagementBiogenicCO2Removals) pcf.landManagementBiogenicCO2Removals = flat.landManagementBiogenicCO2Removals;
  if (flat.packagingBiogenicCarbonContent) pcf.packagingBiogenicCarbonContent = flat.packagingBiogenicCarbonContent;
  if (flat.outboundLogisticsGhgEmissions) pcf.outboundLogisticsGhgEmissions = flat.outboundLogisticsGhgEmissions;
  if (flat.ccsTechnologicalCO2CaptureIncluded) pcf.ccsTechnologicalCO2CaptureIncluded = flat.ccsTechnologicalCO2CaptureIncluded === 'true';
  if (flat.ccsTechnologicalCO2Capture) pcf.ccsTechnologicalCO2Capture = flat.ccsTechnologicalCO2Capture;
  if (flat.technologicalCO2CaptureOrigin) pcf.technologicalCO2CaptureOrigin = flat.technologicalCO2CaptureOrigin;
  if (flat.technologicalCO2Removals) pcf.technologicalCO2Removals = flat.technologicalCO2Removals;
  if (flat.ccuCarbonContent) pcf.ccuCarbonContent = flat.ccuCarbonContent;
  if (flat.ccuCalculationApproach) pcf.ccuCalculationApproach = flat.ccuCalculationApproach as CarbonFootprintCcuCalculationApproach;
  if (flat.ccuCreditCertification) pcf.ccuCreditCertification = flat.ccuCreditCertification;

  const footprint: ProductFootprint = {
    id: crypto.randomUUID(),
    specVersion: '3.0.0',
    created: now,
    status: (flat.status as ProductFootprintStatus) || ProductFootprintStatus.Active,
    companyName: flat.companyName || '',
    companyIds,
    productDescription: flat.productDescription || '',
    productIds,
    productNameCompany: flat.productNameCompany || '',
    pcf,
  };

  // Optional top-level fields
  if (flat.comment) footprint.comment = flat.comment;
  if (flat.validityPeriodStart) footprint.validityPeriodStart = toIso8601(flat.validityPeriodStart);
  if (flat.validityPeriodEnd) footprint.validityPeriodEnd = toIso8601(flat.validityPeriodEnd);
  if (productClassifications.length > 0) footprint.productClassifications = productClassifications;

  return footprint;
}

// ────────────────────────────── Helpers ──────────────────────────────

function parseUrnList(value?: string): string[] {
  if (!value || !value.trim()) return [];
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseProductClassifications(value?: string): string[] {
  if (!value || !value.trim()) return [];
  return value
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function mapDeclaredUnit(value?: string): DeclaredUnit {
  if (!value) return DeclaredUnit.Kilogram;
  const normalized = value.toLowerCase().trim();
  const mapping: Record<string, DeclaredUnit> = {
    liter: DeclaredUnit.Liter,
    kilogram: DeclaredUnit.Kilogram,
    'cubic meter': DeclaredUnit.CubicMeter,
    'kilowatt hour': DeclaredUnit.KilowattHour,
    megajoule: DeclaredUnit.Megajoule,
    'ton kilometer': DeclaredUnit.TonKilometer,
    'square meter': DeclaredUnit.SquareMeter,
  };
  return mapping[normalized] ?? DeclaredUnit.Kilogram;
}

function mapCharacterizationFactors(value?: string): string[] {
  if (!value) return ['AR6'];
  const parts = value.split(',').map(s => s.trim()).filter(Boolean);
  if (parts.length > 0) return parts;
  return ['AR6'];
}

function mapCrossSectoralStandards(value?: string): string[] {
  if (!value || !value.trim()) return ['GHGP-Product'];

  const result: string[] = [];
  const normalized = value.toUpperCase();

  if (normalized.includes('GHG') || normalized.includes('GHGP')) {
    result.push('GHGP-Product');
  }
  if (normalized.includes('14067')) {
    result.push('ISO14067');
  }
  if (normalized.includes('14044') || normalized.includes('14040')) {
    result.push('ISO14040-44');
  }
  if (normalized.includes('14083')) {
    result.push('ISO14083');
  }
  if (normalized.includes('PEF')) {
    result.push('PEF');
  }
  if (normalized.includes('PACT')) {
    const pactMatch = value.match(/PACT-\d+\.\d+/i);
    if (pactMatch) {
      result.push(pactMatch[0]);
    } else {
      result.push('PACT-3.0');
    }
  }
  if (normalized.includes('PAS2050')) {
    result.push('PAS2050');
  }

  return result.length > 0 ? result : ['GHGP-Product'];
}

/**
 * Convert a date-only string (YYYY-MM-DD) or partial ISO string to full ISO 8601.
 * Returns undefined if the input is empty/falsy.
 */
function toIso8601(value?: string): string | undefined {
  if (!value || !value.trim()) return undefined;
  const trimmed = value.trim();
  if (trimmed.includes('T')) return trimmed;
  return `${trimmed}T00:00:00Z`;
}
