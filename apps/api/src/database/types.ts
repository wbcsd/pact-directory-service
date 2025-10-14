import { Generated } from 'kysely';

export interface Database {
  organizations: OrganizationsTable;
  users: UsersTable;
  roles: RolesTable;
  policies: PoliciesTable;
  role_policies: RolePoliciesTable;
  connection_requests: ConnectionRequestTable;
  connections: ConnectionTable;
  password_reset_tokens: PasswordResetTokenTable;
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
  role: string;
  password: string;
  organizationId: number;
  status: 'unverified' | 'enabled' | 'disabled' | 'deleted';
  emailVerificationToken: string | null;
  emailVerificationExpiresAt: Date | null;
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

export interface RolePoliciesTable {
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

export interface PasswordResetTokenTable {
  id: Generated<number>;
  userId: number;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  usedAt: Date | null;
}
