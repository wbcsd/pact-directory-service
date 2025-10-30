import { Role } from '@src/common/policies';
import { Generated } from 'kysely';

export interface Database {
  organizations: OrganizationsTable;
  users: UsersTable;
  roles: RolesTable;
  policies: PoliciesTable;
  roles_policies: RolesPoliciesTable;
  connection_requests: ConnectionRequestTable;
  connections: ConnectionTable;
  password_tokens: PasswordTokenTable;
}

export interface OrganizationsTable {
  id: Generated<number>;
  parentId: number | null;
  uri: string;
  name: string;
  solutionApiUrl: string;
  clientId: string | null;
  clientSecret: string | null;
  networkKey: string | null;
  description: string | null;
}

export interface UsersTable {
  id: Generated<number>;
  fullName: string;
  email: string;
  role: Role;
  password: string;
  organizationId: number;
  status: 'unverified' | 'enabled' | 'disabled' | 'deleted';
  emailVerificationToken: string | null;
  emailVerificationSentAt: Date | null;
  createdAt: Generated<Date>;
  updatedAt: Generated<Date>;
}

export interface RolesTable {
  name: string;
}

export interface PoliciesTable {
  name: string;
  description: string;
}

export interface RolesPoliciesTable {
  role: string;
  policy: string;
}

export interface ConnectionRequestTable {
  id: Generated<number>;
  requestingCompanyId: number;
  requestedCompanyId: number;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}

export interface ConnectionTable {
  id: Generated<number>;
  connectedCompanyOneId: number;
  connectedCompanyTwoId: number;
  createdAt: Date;
  requestedAt: Date;
}

export interface PasswordTokenTable {
  id: Generated<number>;
  userId: number;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  type: 'reset' | 'setup';
  usedAt: Date | null;
}
