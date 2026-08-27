import type { DataModelExtensionSummary } from "../types/dataModelExtension";

export interface NodeData {
  id: number;
  name: string;
  type: "internal" | "external";
  status: "active" | "inactive" | "pending";
  apiUrl?: string;
  organizationId: number;
  organizationName?: string;
  discoverable: boolean;
  createdAt: string;
  updatedAt: string;
  connectionsCount?: number;
  extensions?: DataModelExtensionSummary[];
}

export interface ActivityLog {
  id: number;
  path: string;
  level: string;
  message: string;
  createdAt: string;
}

export interface Footprint {
  id: string;
  nodeId: number;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export type CredentialsSource = "generated" | "external";

/**
 * Result of accepting an invitation. `clientId`/`clientSecret` are present only
 * for directory-issued credentials, which are shown once; credentials issued by
 * an external node's operator are never returned.
 */
export interface ConnectionCredentials {
  connectionId: number;
  credentialsSource: CredentialsSource;
  clientId?: string;
  clientSecret?: string;
  requestingNodeName?: string;
  requestingNodeType?: "internal" | "external";
}

export interface PcfRequest {
  id: number;
  fromNodeId: number | null;
  fromNodeName?: string;
  targetNodeId: number;
  targetNodeName?: string;
  connectionId: number | null;
  requestEventId: string;
  source: string | null;
  filters: Record<string, unknown>;
  status: "pending" | "fulfilled" | "rejected";
  resultCount: number | null;
  fulfilledFootprintIds: unknown[] | null;
  direction: "outgoing" | "incoming";
  fulfillable?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type PanelState =
  | { mode: "closed" }
  | { mode: "edit" }
  | { mode: "connections" }
  | { mode: "createConnection" }
  | { mode: "requestPcf" }
  | { mode: "importPcf" }
  | { mode: "fulfillPcfRequest"; request: PcfRequest };

export const getStatusColor = (
  status: string
): "green" | "gray" | "yellow" => {
  switch (status) {
    case "active":
      return "green";
    case "inactive":
      return "gray";
    case "pending":
      return "yellow";
    default:
      return "gray";
  }
};
