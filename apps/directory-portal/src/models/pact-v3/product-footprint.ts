/**
 * PACT Technical Specifications Version 3.0.4
 * Product Footprint Data Model
 *
 * Field names match the official PACT v3 OpenAPI schema exactly.
 * Key renames from earlier drafts / v2.x:
 *   declaredUnit              → declaredUnitOfMeasurement
 *   unitaryProductAmount      → declaredUnitAmount
 *   pCfExcludingBiogenic      → pcfExcludingBiogenicUptake
 *   pCfIncludingBiogenic      → pcfIncludingBiogenicUptake
 *   characterizationFactors   → ipccCharacterizationFactors  (now string[])
 *   crossSectoralStandardsUsed→ crossSectoralStandards       (now string[])
 *   dLucGhgEmissions          → landUseChangeGhgEmissions
 *   biogenicCarbonWithdrawal  → biogenicCO2Uptake
 *   otherBiogenicGhgEmissions → biogenicNonCO2Emissions
 *   assurance                 → verification
 *   productClassifications    → string[] (URNs, no longer objects)
 *   exemptedEmissionsPercent  → string  (was number)
 *   primaryDataShare          → string  (was number)
 *   NEW: productMassPerDeclaredUnit (required)
 */

export interface ProductFootprintV3 {
  id: string;
  specVersion: string;
  version: number;
  created: string;
  updated?: string;
  status: ProductFootprintStatus;
  statusComment?: string;
  validityPeriodStart?: string;
  validityPeriodEnd?: string;
  companyName: string;
  companyIds: string[];
  productDescription: string;
  productIds: string[];
  productClassifications?: string[];
  productNameCompany: string;
  comment?: string;
  pcf: CarbonFootprintV3;
  extensions?: Extension[];
}

export interface CarbonFootprintV3 {
  declaredUnitOfMeasurement: DeclaredUnit;
  declaredUnitAmount: string;
  productMassPerDeclaredUnit: string;
  pcfExcludingBiogenicUptake: string;
  pcfIncludingBiogenicUptake: string;
  fossilGhgEmissions: string;
  fossilCarbonContent: string;
  biogenicCarbonContent?: string;
  recycledCarbonContent?: string;
  landUseChangeGhgEmissions?: string;
  landCarbonLeakage?: string;
  landManagementFossilGhgEmissions?: string;
  landManagementBiogenicCO2Emissions?: string;
  landManagementBiogenicCO2Removals?: string;
  biogenicCO2Uptake?: string;
  biogenicNonCO2Emissions?: string;
  landAreaOccupation?: string;
  aircraftGhgEmissions?: string;
  packagingEmissionsIncluded: boolean;
  packagingGhgEmissions?: string;
  packagingBiogenicCarbonContent?: string;
  outboundLogisticsGhgEmissions?: string;
  ccsTechnologicalCO2CaptureIncluded?: boolean;
  ccsTechnologicalCO2Capture?: string;
  technologicalCO2CaptureOrigin?: string;
  technologicalCO2Removals?: string;
  ccuCarbonContent?: string;
  ccuCalculationApproach?: string;
  ccuCreditCertification?: string;
  ipccCharacterizationFactors: string[];
  crossSectoralStandards: string[];
  productOrSectorSpecificRules?: ProductOrSectorSpecificRule[];
  boundaryProcessesDescription?: string;
  referencePeriodStart: string;
  referencePeriodEnd: string;
  geographyRegionOrSubregion?: string;
  geographyCountry?: string;
  geographyCountrySubdivision?: string;
  secondaryEmissionFactorSources?: EmissionFactorDS[];
  exemptedEmissionsPercent: string;
  exemptedEmissionsDescription?: string;
  allocationRulesDescription?: string;
  primaryDataShare?: string;
  dqi?: DataQualityIndicators;
  verification?: Verification;
}

export enum ProductFootprintStatus {
  Active = "Active",
  Deprecated = "Deprecated",
}

export enum DeclaredUnit {
  liter = "liter",
  kilogram = "kilogram",
  cubicMeter = "cubic meter",
  kilowattHour = "kilowatt hour",
  megajoule = "megajoule",
  tonKilometer = "ton kilometer",
  squareMeter = "square meter",
  piece = "piece",
  hour = "hour",
  megabitSecond = "megabit second",
}

export interface ProductOrSectorSpecificRule {
  operator: ProductOrSectorSpecificRuleOperator;
  ruleNames: string[];
  otherOperatorName?: string;
}

export enum ProductOrSectorSpecificRuleOperator {
  PEF = "PEF",
  EPDInternational = "EPD International",
  Other = "Other",
}

export interface EmissionFactorDS {
  name: string;
  version: string;
}

export interface DataQualityIndicators {
  technologicalDQR: string;
  temporalDQR: string;
  geographicalDQR: string;
}

export interface Verification {
  verified: boolean;
  coverage?: VerificationCoverage;
  level?: VerificationLevel;
  boundary?: VerificationBoundary;
  providerName?: string;
  completedAt?: string;
  standardName?: string;
  comments?: string;
}

export enum VerificationCoverage {
  corporate = "corporate level",
  product = "product line",
  PCF = "PCF system",
  product_specific = "product level",
}

export enum VerificationLevel {
  limited = "limited",
  reasonable = "reasonable",
}

export enum VerificationBoundary {
  Gate2Gate = "Gate-to-Gate",
  Cradle2Gate = "Cradle-to-Gate",
}

export interface Extension {
  specVersion: string;
  dataSchema: string;
  data?: Record<string, unknown>;
}
