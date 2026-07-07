import type {
  NodeConnection,
  NodeInvitation,
} from "../../../src/components/NodeConnectionsManager";
import { makePaginated } from "./utils";

export const mockConnections: NodeConnection[] = [
  {
    id: 200,
    fromNodeId: 100,
    fromNodeName: "Test Node Alpha",
    fromNodeOrganizationId: 10,
    fromNodeOrganizationName: "Test Organisation",
    targetNodeId: 101,
    targetNodeName: "Test Node Beta",
    targetNodeOrganizationId: 10,
    targetNodeOrganizationName: "Test Organisation",
    clientId: "client-id-abc",
    clientSecret: "client-secret-abc",
    status: "accepted",
    createdAt: "2026-03-01T00:00:00.000Z",
    updatedAt: "2026-03-02T00:00:00.000Z",
    expiresAt: null,
  },
];

// A cross-org connection to "External Node Gamma" (org 20)
export const mockExternalConnection: NodeConnection = {
  id: 201,
  fromNodeId: 100,
  fromNodeName: "Test Node Alpha",
  fromNodeOrganizationId: 10,
  fromNodeOrganizationName: "Test Organisation",
  targetNodeId: 200,
  targetNodeName: "External Node Gamma",
  targetNodeOrganizationId: 20,
  targetNodeOrganizationName: "External Organisation",
  clientId: "client-id-ext",
  clientSecret: "client-secret-ext",
  status: "accepted",
  createdAt: "2026-05-01T00:00:00.000Z",
  updatedAt: "2026-05-02T00:00:00.000Z",
  expiresAt: null,
};

export const mockInvitations: NodeInvitation[] = [
  {
    id: 300,
    fromNodeId: 101,
    fromNodeName: "Test Node Beta",
    fromNodeOrganizationId: 10,
    fromNodeOrganizationName: "Test Organisation",
    targetNodeId: 100,
    targetNodeName: "Test Node Alpha",
    targetNodeOrganizationId: 10,
    targetNodeOrganizationName: "Test Organisation",
    clientId: "client-id-pending",
    clientSecret: "client-secret-pending",
    status: "pending",
    createdAt: "2026-04-10T00:00:00.000Z",
    updatedAt: "2026-04-10T00:00:00.000Z",
    expiresAt: null,
  },
];

// Combined list: accepted connections + pending incoming invitations (mirrors real API behaviour)
export const mockConnectionListResponse = makePaginated([
  ...mockConnections,
  mockInvitations[0] as NodeConnection,
]);

// List that also includes the cross-org external connection
export const mockConnectionListWithExternalResponse = makePaginated([
  ...mockConnections,
  mockExternalConnection,
  mockInvitations[0] as NodeConnection,
]);

export const mockInvitationListResponse = makePaginated(mockInvitations);

export const mockSecondInvitation: NodeInvitation = {
  id: 301,
  fromNodeId: 100,
  fromNodeName: "Test Node Alpha",
  fromNodeOrganizationId: 10,
  fromNodeOrganizationName: "Test Organisation",
  targetNodeId: 100,
  targetNodeName: "Test Node Alpha",
  targetNodeOrganizationId: 10,
  targetNodeOrganizationName: "Test Organisation",
  clientId: "client-id-pending-2",
  clientSecret: "client-secret-pending-2",
  status: "pending",
  createdAt: "2026-05-10T00:00:00.000Z",
  updatedAt: "2026-05-10T00:00:00.000Z",
  expiresAt: null,
};

// Two pending invitations targeting node 100
export const mockMultiplePendingConnectionList = makePaginated([
  ...mockConnections,
  mockInvitations[0] as NodeConnection,
  mockSecondInvitation as NodeConnection,
]);

export const mockAcceptInvitationResponse = {
  connectionId: 300,
  clientId: "client-id-accepted",
  clientSecret: "client-secret-accepted",
};
