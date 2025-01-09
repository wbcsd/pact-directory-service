import { Generated } from "kysely";

export interface Database {
  companies: CompanyTable;
  users: UserTable;
  connection_requests: ConnectionRequestTable;
  connections: ConnectionTable;
  registration_codes: RegistrationCodeTable;
}

export interface CompanyTable {
  id: Generated<number>;
  companyName: string;
  companyIdentifier: string;
  solutionApiUrl: string;
  registrationCode: string;
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

export interface RegistrationCodeTable {
  code: string;
}
