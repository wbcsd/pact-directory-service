import { Generated } from "kysely";

export interface Database {
  companies: CompanyTable;
  users: UserTable;
}

export interface CompanyTable {
  id: Generated<number>;
  companyName: string;
  companyIdentifier: string;
  solutionApiProdUrl: string;
  solutionApiDevUrl: string;
  registrationCode: string;
}

export interface UserTable {
  id: Generated<number>;
  companyId: Generated<number>;
  fullName: string;
  email: string;
  password: string;
}
