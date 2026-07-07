import { makePaginated } from "./utils";

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

export const mockPcfRequests: PcfRequest[] = [
  {
    id: 400,
    fromNodeId: 100,
    fromNodeName: "Test Node Alpha",
    targetNodeId: 101,
    targetNodeName: "Test Node Beta",
    connectionId: 200,
    requestEventId: "evt-request-001",
    source: null,
    filters: {},
    status: "pending",
    resultCount: null,
    fulfilledFootprintIds: null,
    direction: "outgoing",
    fulfillable: false,
    createdAt: "2026-04-20T00:00:00.000Z",
    updatedAt: "2026-04-20T00:00:00.000Z",
  },
  {
    id: 401,
    fromNodeId: 101,
    fromNodeName: "Test Node Beta",
    targetNodeId: 100,
    targetNodeName: "Test Node Alpha",
    connectionId: 200,
    requestEventId: "evt-request-002",
    source: null,
    filters: {},
    status: "pending",
    resultCount: null,
    fulfilledFootprintIds: null,
    direction: "incoming",
    fulfillable: true,
    createdAt: "2026-04-21T00:00:00.000Z",
    updatedAt: "2026-04-21T00:00:00.000Z",
  },
];

export const mockPcfRequestListResponse = makePaginated(mockPcfRequests);
