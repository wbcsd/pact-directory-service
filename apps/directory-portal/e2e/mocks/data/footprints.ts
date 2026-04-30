import { makePaginated } from "./utils";

export interface Footprint {
  id: string;
  nodeId: number;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export const mockFootprints: Footprint[] = [
  {
    id: "footprint-uuid-001",
    nodeId: 100,
    data: {
      id: "footprint-uuid-001",
      specVersion: "2.0.0",
      version: 1,
      created: "2026-01-15T00:00:00.000Z",
      status: "Active",
      companyName: "Test Company",
      companyIds: ["urn:uuid:test-company-001"],
      productDescription: "Test Product",
      productIds: ["urn:uuid:test-product-001"],
      productCategoryCpc: "4710",
      productNameCompany: "Test Product v1",
      comment: "",
      pcf: {
        declaredUnit: "kilogram",
        unitaryProductAmount: 1,
        pCfExcludingBiogenic: 1.5,
        fossilGhgEmissions: 1.5,
      },
    },
    createdAt: "2026-01-15T00:00:00.000Z",
    updatedAt: "2026-01-15T00:00:00.000Z",
  },
];

export const mockFootprintDetail: Footprint = mockFootprints[0];

export const mockFootprintListResponse = makePaginated(mockFootprints);
