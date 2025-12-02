import { Role } from '@src/common/policies';
import { Generated } from 'kysely';

export interface Database {
  organizations: OrganizationsTable;
  users: UsersTable;
  roles: RolesTable;
  policies: PoliciesTable;
  roles_policies: RolesPoliciesTable;
  nodes: NodesTable;
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
  status: 'active' | 'disabled';
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
  lastLogin: Date | null;
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

export interface NodesTable {
  id: Generated<number>;
  organizationId: number;
  name: string;
  type: 'internal' | 'external';
  apiUrl: string;
  status: 'active' | 'inactive' | 'pending';
  createdAt: Generated<Date>;
  updatedAt: Generated<Date>;
}

export interface ConnectionTable {
  id: Generated<number>;
  fromNodeId: number;
  targetNodeId: number;
  clientId: string;
  clientSecret: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Generated<Date>;
  updatedAt: Generated<Date>;
  expiresAt: Date | null;
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
