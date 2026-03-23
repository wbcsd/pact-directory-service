/**
 * PACT Technical Specifications Version 3.0.0 (Draft)
 * Product Footprint Data Model
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
  productClassifications?: ProductClassification[];
  productNameCompany: string;
  comment?: string;
  pcf: CarbonFootprintV3;
  extensions?: Extension[];
}

export interface ProductClassification {
  classId: string;
  className?: string;
  classificationSystem: string;
}

export interface CarbonFootprintV3 {
  declaredUnit: DeclaredUnit;
  unitaryProductAmount: string;
  pCfExcludingBiogenic: string;
  pCfIncludingBiogenic?: string;
  fossilGhgEmissions: string;
  fossilCarbonContent: string;
  biogenicCarbonContent: string;
  dLucGhgEmissions?: string;
  landManagementGhgEmissions?: string;
  otherBiogenicGhgEmissions?: string;
  iLucGhgEmissions?: string;
  biogenicCarbonWithdrawal?: string;
  aircraftGhgEmissions?: string;
  characterizationFactors: CharacterizationFactors;
  crossSectoralStandardsUsed: CrossSectoralStandard[];
  productOrSectorSpecificRules?: ProductOrSectorSpecificRule[];
  biogenicAccountingMethodology?: BiogenicAccountingMethodology;
  boundaryProcessesDescription: string;
  referencePeriodStart: string;
  referencePeriodEnd: string;
  geographyRegionOrSubregion?: string;
  geographyCountry?: string;
  geographyCountrySubdivision?: string;
  secondaryEmissionFactorSources?: EmissionFactorDS[];
  exemptedEmissionsPercent: number;
  exemptedEmissionsDescription?: string;
  packagingEmissionsIncluded: boolean;
  packagingGhgEmissions?: string;
  allocationRulesDescription?: string;
  uncertaintyAssessmentDescription?: string;
  primaryDataShare?: number;
  dqi?: DataQualityIndicators;
  assurance?: Assurance;
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
}

export enum CharacterizationFactors {
  AR6 = "AR6",
  AR5 = "AR5",
}

export enum CrossSectoralStandard {
  GHGProtocol = "GHG Protocol Product standard",
  ISO14067 = "ISO Standard 14067",
  ISO14044 = "ISO Standard 14044",
}

export enum BiogenicAccountingMethodology {
  PEF = "PEF",
  ISO = "ISO",
  GHGP = "GHGP",
  Quantis = "Quantis",
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
  coveragePercent?: number;
  technologicalDQR?: number;
  temporalDQR?: number;
  geographicalDQR?: number;
  completenessDQR?: number;
  reliabilityDQR?: number;
}

export interface Assurance {
  assurance: boolean;
  coverage?: AssuranceCoverage;
  level?: AssuranceLevel;
  boundary?: AssuranceBoundary;
  providerName?: string;
  completedAt?: string;
  standardName?: string;
  comments?: string;
}

export enum AssuranceCoverage {
  corporate = "corporate level",
  product = "product line",
  PCF = "PCF system",
  product_specific = "product level",
}

export enum AssuranceLevel {
  limited = "limited",
  reasonable = "reasonable",
}

export enum AssuranceBoundary {
  Gate2Gate = "Gate-to-Gate",
  Cradle2Gate = "Cradle-to-Gate",
}

export interface Extension {
  specVersion: string;
  dataSchema: string;
  data?: Record<string, unknown>;
}
