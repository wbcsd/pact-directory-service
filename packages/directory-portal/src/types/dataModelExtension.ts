export type DataModelExtensionStatus = "active" | "deprecated";

/** A registry entry for a known PACT data model extension. */
export interface DataModelExtension {
  id: number;
  name: string;
  dataSchemaUrl: string;
  documentationUrl: string | null;
  specVersion: string;
  version: string | null;
  description: string | null;
  author: string | null;
  contactEmail: string | null;
  status: DataModelExtensionStatus;
  schemaJson: Record<string, unknown> | null;
  schemaFetchedAt: string | null;
  createdAt: string;
  updatedAt: string;
  nodesCount?: number;
}

/** Compact shape embedded in node payloads. */
export interface DataModelExtensionSummary {
  id: number;
  name: string;
  dataSchemaUrl: string;
  documentationUrl: string | null;
  version: string | null;
  status: DataModelExtensionStatus;
}

export interface DataModelExtensionFormData {
  name: string;
  dataSchemaUrl: string;
  documentationUrl: string;
  specVersion: string;
  version: string;
  description: string;
  author: string;
  contactEmail: string;
  status: DataModelExtensionStatus;
}
