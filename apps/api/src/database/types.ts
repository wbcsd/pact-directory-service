import { Generated } from "kysely";

export interface Database {
  companies: CompanyTable;
  users: UserTable;
  organizations: OrganizationsTable;
  org_users: OrgUsersTable;
  org_roles: OrgRolesTable;
  org_policies: OrgPoliciesTable;
  role_policies: RolePoliciesTable;
  connection_requests: ConnectionRequestTable;
  connections: ConnectionTable;
  password_reset_tokens: PasswordResetTokenTable;
}

export interface OrganizationsTable {
  id: Generated<number>;
  orgIdentifier: string;
  orgName: string;
  solutionApiUrl: string;
  clientId: string | null;
  clientSecret: string | null;
  networkKey: string | null;
  orgIdentifierDescription: string | null;
  createdAt?: Date;
}

export interface OrgUsersTable {
  userId: Generated<number>;
  orgId: number;
  userName: string;
  userEmail: string;
  roleId: number;
  createdAt?: Date;
}

export interface OrgRolesTable {
  roleId: Generated<number>;
  roleName: string;
  createdAt?: Date;
}

export interface OrgPoliciesTable {
  policyId: Generated<number>;
  resourceName: string;
  actionName: string;
  policyDescription: string;
  createdAt?: Date;
}

export interface RolePoliciesTable {
  rolePolicyId: Generated<number>;
  roleId: number;
  policyId: number;
  createdAt?: Date;
}

export interface CompanyTable {
  id: Generated<number>;
  companyName: string;
  companyIdentifier: string;
  companyIdentifierDescription: string;
  solutionApiUrl: string;
  clientId: string;
  clientSecret: string;
  networkKey: string;
}

export interface UserTable {
  id: Generated<number>;
  companyId: Generated<number>;
  fullName: string;
  email: string;
  password: string;
  role: "user" | "administrator";
}

export interface ConnectionRequestTable {
  id: Generated<number>;
  requestingCompanyId: number;
  requestedCompanyId: number;
  status: "pending" | "accepted" | "rejected";
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
