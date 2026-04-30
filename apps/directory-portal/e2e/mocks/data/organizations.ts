import type { Organization } from "../../../src/pages/OrganizationsList";
import { makePaginated } from "./utils";

export const mockOrganizations: Organization[] = [
  {
    id: 10,
    organizationName: "Test Organisation",
    organizationIdentifier: "TEST-ORG-001",
    organizationDescription: "A test organisation for e2e testing",
    networkKey: "network-key-abc123",
    parentId: 0,
    userCount: 3,
    lastActivity: "2026-04-01T12:00:00.000Z",
    status: "active",
  },
  {
    id: 11,
    organizationName: "Another Organisation",
    organizationIdentifier: "TEST-ORG-002",
    organizationDescription: "A second test organisation",
    networkKey: "network-key-def456",
    parentId: 0,
    userCount: 1,
    lastActivity: null,
    status: "active",
  },
];

export const mockOrganizationDetail: Organization = mockOrganizations[0];

export const mockOrganizationListResponse = makePaginated(mockOrganizations);

export const mockCheckNameAvailable = { available: true };
