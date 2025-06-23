import { Generated } from "kysely";

export interface Database {
  companies: CompanyTable;
  users: UserTable;
  connection_requests: ConnectionRequestTable;
  connections: ConnectionTable;
  password_reset_tokens: PasswordResetTokenTable;
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
