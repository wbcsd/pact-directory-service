import { db } from "@src/database/db";
import { Database } from "@src/database/types";
import { Kysely } from "kysely";

interface Policy {
  resource: string;
  action: string;
}

class PolicyService {
  private userPolicies = new Map<number, Policy[]>();

  constructor(private db: Kysely<Database>) {}

  private async getPoliciesByUserId(userId: number): Promise<Policy[]> {
    const rows = await this.db
      .selectFrom("org_users")
      .innerJoin("org_roles", "org_users.roleId", "org_roles.roleId")
      .innerJoin("role_policies", "org_roles.roleId", "role_policies.roleId")
      .innerJoin(
        "org_policies",
        "role_policies.policyId",
        "org_policies.policyId"
      )
      .where("org_users.userId", "=", userId)
      .select(["org_policies.resourceName", "org_policies.actionName"])
      .execute();

    const policies = rows.map((row) => ({
      resource: row.resourceName,
      action: row.actionName,
    }));

    return policies;
  }

  public async cachePolicies(userId: number) {
    this.invalidateCachedPolicies(userId);
    const policies = await this.getPoliciesByUserId(userId);
    this.userPolicies.set(userId, policies);
  }

  public async getCachedPolicies(userId: number): Promise<Policy[]> {
    if (!this.userPolicies.has(userId)) {
      await this.cachePolicies(userId);
    }

    // if there are no policies, it means the user has no policies assigned
    return this.userPolicies.get(userId) ?? [];
  }

  private invalidateCachedPolicies(userId: number) {
    this.userPolicies.delete(userId);
  }
}

export default new PolicyService(db);
