import type { Node } from "../../../src/pages/NodesList";
import { makePaginated } from "./utils";

export const mockNodes: Node[] = [
  {
    id: 100,
    organizationId: 10,
    organizationName: "Test Organisation",
    name: "Test Node Alpha",
    type: "internal",
    apiUrl: "https://node-alpha.example.com",
    status: "active",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-04-01T00:00:00.000Z",
    connectionsCount: 2,
  },
  {
    id: 101,
    organizationId: 10,
    organizationName: "Test Organisation",
    name: "Test Node Beta",
    type: "external",
    apiUrl: undefined,
    status: "pending",
    createdAt: "2026-02-01T00:00:00.000Z",
    updatedAt: "2026-04-15T00:00:00.000Z",
    connectionsCount: 0,
  },
];

export const mockNodeDetail: Node = mockNodes[0];

export const mockNodeListResponse = makePaginated(mockNodes);
