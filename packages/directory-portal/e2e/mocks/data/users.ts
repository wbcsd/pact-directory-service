import type { User } from "../../../src/pages/OrganizationUsers";
import { makePaginated } from "./utils";

export const mockUsers: User[] = [
  {
    id: 1,
    fullName: "Test User",
    email: "test@example.com",
    role: "administrator",
    status: "enabled",
    lastLogin: "2026-04-01T10:00:00.000Z",
    organizationName: "Test Organisation",
    organizationId: 10,
    organizationIdentifier: "TEST-ORG-001",
  },
  {
    id: 2,
    fullName: "Another User",
    email: "another@example.com",
    role: "user",
    status: "enabled",
    lastLogin: null,
    organizationName: "Test Organisation",
    organizationId: 10,
    organizationIdentifier: "TEST-ORG-001",
  },
];

export const mockUserDetail: User = mockUsers[0];

export const mockUserListResponse = makePaginated(mockUsers);
