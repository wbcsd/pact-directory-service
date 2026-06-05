export interface NodeData {
  id: number;
  name: string;
  type: "internal" | "external";
  status: "active" | "inactive" | "pending";
  apiUrl?: string;
  organizationId: number;
  organizationName?: string;
  createdAt: string;
  updatedAt: string;
  connectionsCount?: number;
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

export interface ConnectionCredentials {
  connectionId: number;
  clientId: string;
  clientSecret: string;
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
