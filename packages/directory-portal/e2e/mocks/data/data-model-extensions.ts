import type { DataModelExtension } from "../../../src/types/dataModelExtension";

export const mockDataModelExtensions: DataModelExtension[] = [
  {
    id: 1,
    name: "PACT Primary Data Share",
    dataSchemaUrl:
      "https://catalog.carbon-transparency.com/pds/1.0.0/schema.json",
    documentationUrl:
      "https://catalog.carbon-transparency.com/pds/1.0.0/documentation/",
    specVersion: "2.0.0",
    version: "1.0.0",
    description: "Disclose Scope 2 and Scope 3 primary data shares.",
    author: "WBCSD",
    contactEmail: "pact@wbcsd.org",
    status: "active",
    schemaJson: null,
    schemaFetchedAt: null,
    createdAt: "2026-01-10T10:00:00.000Z",
    updatedAt: "2026-01-10T10:00:00.000Z",
    nodesCount: 2,
  },
  {
    id: 2,
    name: "ISO 14083 Shipment",
    dataSchemaUrl:
      "https://catalog.carbon-transparency.com/shipment/1.0.0/schema.json",
    documentationUrl: null,
    specVersion: "2.0.0",
    version: "1.0.0",
    description: "Logistics attributes for shipments and consignments.",
    author: "Smart Freight Centre",
    contactEmail: null,
    status: "deprecated",
    schemaJson: null,
    schemaFetchedAt: null,
    createdAt: "2026-02-10T10:00:00.000Z",
    updatedAt: "2026-02-10T10:00:00.000Z",
    nodesCount: 0,
  },
];

export const mockDataModelExtensionListResponse = {
  data: mockDataModelExtensions,
  pagination: {
    page: 1,
    pageSize: 50,
    total: mockDataModelExtensions.length,
    totalPages: 1,
    hasNext: false,
    hasPrevious: false,
  },
};

export const mockDataModelExtensionDetail = mockDataModelExtensions[0];

export const mockFetchSchemaResponse = {
  schemaJson: {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    title: "PACT Primary Data Share Extension Schema",
    description: "A Pathfinder Data Model Extension.",
    type: "object",
    properties: {
      primaryDataShareScope2: { type: "number" },
    },
  },
  name: "PACT Primary Data Share Extension Schema",
  description: "A Pathfinder Data Model Extension.",
};
