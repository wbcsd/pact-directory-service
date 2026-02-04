import {
  ProductFootprintV3,
  ProductFootprintStatus,
  DeclaredUnit,
  CharacterizationFactors,
  CrossSectoralStandard,
} from "../models/pact-v3/product-footprint";

/**
 * Mock Product Carbon Footprint data for PACT API v3
 * Based on pact-demo-api-ts mock data
 */
export const mockFootprintsV3: ProductFootprintV3[] = [
  {
    id: "d9be4477-e351-45b3-acd9-e1da05e6f633",
    specVersion: "3.0.0",
    version: 1,
    created: "2023-07-01T00:00:00Z",
    status: ProductFootprintStatus.Active,
    companyName: "Example Company Inc.",
    companyIds: ["urn:uuid:12345678-1234-1234-1234-123456789012"],
    productDescription: "Exemplary Laptop Model X",
    productIds: ["urn:gtin:12345678"],
    productClassifications: [
      {
        classId: "452",
        className: "Electronic Computing Equipment",
        classificationSystem: "CPC",
      },
    ],
    productNameCompany: "Laptop Model X",
    comment: "First version of PCF for Laptop Model X",
    pcf: {
      declaredUnit: DeclaredUnit.kilogram,
      unitaryProductAmount: "1.0",
      pCfExcludingBiogenic: "120.5",
      fossilGhgEmissions: "115.2",
      fossilCarbonContent: "5.3",
      biogenicCarbonContent: "0.0",
      characterizationFactors: CharacterizationFactors.AR6,
      crossSectoralStandardsUsed: [
        CrossSectoralStandard.GHGProtocol,
        CrossSectoralStandard.ISO14067,
      ],
      boundaryProcessesDescription:
        "Cradle-to-gate assessment including raw material extraction, component manufacturing, and final assembly",
      referencePeriod: {
        start: "2022-01-01T00:00:00Z",
        end: "2022-12-31T23:59:59Z",
      },
      geography: {
        country: "US",
      },
      exemptedEmissionsPercent: 2.5,
      exemptedEmissionsDescription: "Infrastructure and capital goods excluded",
      packagingEmissionsIncluded: true,
      packagingGhgEmissions: "8.3",
      primaryDataShare: 85.0,
    },
  },
  {
    id: "f8c3d912-7b4e-4a2c-b567-8e9f0a1b2c3d",
    specVersion: "3.0.0",
    version: 2,
    created: "2023-08-15T00:00:00Z",
    updated: "2023-09-01T00:00:00Z",
    status: ProductFootprintStatus.Active,
    companyName: "Green Materials Corp",
    companyIds: ["urn:uuid:87654321-4321-4321-4321-210987654321"],
    productDescription: "Sustainable Steel Beam Grade A",
    productIds: ["urn:gtin:87654321", "urn:ean:9876543210123"],
    productClassifications: [
      {
        classId: "412",
        className: "Iron and Steel Products",
        classificationSystem: "CPC",
      },
    ],
    productNameCompany: "EcoSteel Beam A500",
    comment: "Updated version with improved primary data coverage",
    pcf: {
      declaredUnit: DeclaredUnit.kilogram,
      unitaryProductAmount: "1000.0",
      pCfExcludingBiogenic: "450.8",
      pCfIncludingBiogenic: "420.5",
      fossilGhgEmissions: "440.2",
      fossilCarbonContent: "10.6",
      biogenicCarbonContent: "30.3",
      biogenicCarbonWithdrawal: "30.3",
      characterizationFactors: CharacterizationFactors.AR6,
      crossSectoralStandardsUsed: [
        CrossSectoralStandard.ISO14067,
        CrossSectoralStandard.ISO14044,
      ],
      boundaryProcessesDescription:
        "Cradle-to-gate including iron ore mining, steel production via electric arc furnace, and rolling",
      referencePeriod: {
        start: "2023-01-01T00:00:00Z",
        end: "2023-06-30T23:59:59Z",
      },
      geography: {
        country: "DE",
        regionOrSubregion: "Europe",
      },
      exemptedEmissionsPercent: 1.8,
      exemptedEmissionsDescription: "Office operations and employee commuting",
      packagingEmissionsIncluded: false,
      primaryDataShare: 92.5,
      dqi: {
        coveragePercent: 95.0,
        technologicalDQR: 1.5,
        temporalDQR: 1.2,
        geographicalDQR: 1.0,
        completenessDQR: 1.8,
        reliabilityDQR: 1.3,
      },
    },
  },
  {
    id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    specVersion: "3.0.0",
    version: 1,
    created: "2023-09-20T00:00:00Z",
    status: ProductFootprintStatus.Active,
    validityPeriod: {
      start: "2023-09-01T00:00:00Z",
      end: "2024-08-31T23:59:59Z",
    },
    companyName: "BioPack Solutions",
    companyIds: ["urn:uuid:abcdef12-3456-7890-abcd-ef1234567890"],
    productDescription: "Compostable Food Container 500ml",
    productIds: ["urn:gtin:55667788"],
    productClassifications: [
      {
        classId: "893",
        className: "Plastic Articles",
        classificationSystem: "CPC",
      },
    ],
    productNameCompany: "EcoContainer 500",
    comment: "First PCF for compostable container line",
    pcf: {
      declaredUnit: DeclaredUnit.kilogram,
      unitaryProductAmount: "0.025",
      pCfExcludingBiogenic: "0.85",
      pCfIncludingBiogenic: "-0.15",
      fossilGhgEmissions: "0.75",
      fossilCarbonContent: "0.10",
      biogenicCarbonContent: "1.00",
      biogenicCarbonWithdrawal: "1.00",
      biogenicAccountingMethodology: "PEF" as any,
      characterizationFactors: CharacterizationFactors.AR5,
      crossSectoralStandardsUsed: [CrossSectoralStandard.GHGProtocol],
      boundaryProcessesDescription:
        "Cradle-to-gate including agricultural feedstock production, PLA manufacturing, thermoforming",
      referencePeriod: {
        start: "2023-01-01T00:00:00Z",
        end: "2023-08-31T23:59:59Z",
      },
      geography: {
        country: "NL",
      },
      exemptedEmissionsPercent: 3.2,
      packagingEmissionsIncluded: true,
      packagingGhgEmissions: "0.05",
      primaryDataShare: 78.0,
    },
  },
];
