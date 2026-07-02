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
    discoverable: false,
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
    discoverable: true,
  },
];

export const mockExternalNode: Node = {
  id: 200,
  organizationId: 20,
  organizationName: "External Organisation",
  name: "External Node Gamma",
  type: "external",
  apiUrl: "https://external-node.example.com",
  status: "active",
  createdAt: "2026-03-01T00:00:00.000Z",
  updatedAt: "2026-05-01T00:00:00.000Z",
  connectionsCount: 0,
  discoverable: true,
};

export const mockNodeDetail: Node = mockNodes[0];

export const mockInactiveNodeDetail: Node = {
  ...mockNodes[0],
  status: "inactive",
};

export const mockExternalNodeOwnOrg: Node = {
  id: 100,
  organizationId: 10,
  organizationName: "Test Organisation",
  name: "Test Node Alpha",
  type: "external",
  apiUrl: "https://api.supplier.example.com/pact",
  status: "active",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-04-01T00:00:00.000Z",
  connectionsCount: 1,
  discoverable: true,
};

export const mockNodeListResponse = makePaginated(mockNodes);
export const mockFilteredNodeListResponse = makePaginated([mockNodes[0]]);
export const mockEmptyNodeListResponse = makePaginated<Node>([]);
export const mockDiscoverableNodeListResponse = makePaginated([mockExternalNode]);
export const mockEmptyDiscoverableNodeListResponse = makePaginated<Node>([]);
