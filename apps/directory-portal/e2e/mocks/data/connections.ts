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
    targetNodeId: 101,
    targetNodeName: "Test Node Beta",
    clientId: "client-id-abc",
    clientSecret: "client-secret-abc",
    status: "accepted",
    createdAt: "2026-03-01T00:00:00.000Z",
    updatedAt: "2026-03-02T00:00:00.000Z",
    expiresAt: null,
  },
];

export const mockInvitations: NodeInvitation[] = [
  {
    id: 300,
    fromNodeId: 101,
    fromNodeName: "Test Node Beta",
    targetNodeId: 100,
    targetNodeName: "Test Node Alpha",
    clientId: "client-id-pending",
    clientSecret: "client-secret-pending",
    status: "pending",
    createdAt: "2026-04-10T00:00:00.000Z",
    updatedAt: "2026-04-10T00:00:00.000Z",
    expiresAt: null,
  },
];

export const mockConnectionListResponse = makePaginated(mockConnections);
export const mockInvitationListResponse = makePaginated(mockInvitations);

export const mockAcceptInvitationResponse = {
  connectionId: 300,
  clientId: "client-id-accepted",
  clientSecret: "client-secret-accepted",
};
