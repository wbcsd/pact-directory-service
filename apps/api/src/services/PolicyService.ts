import { db } from "@src/database/db";
import { Database } from "@src/database/types";
import { Kysely } from "kysely";

interface Policy {
  resource: string;
  action: string;
}

class PolicyService {
  private cache = new Map<number, { policies: Policy[]; expiresAt: number }>();
  private ttlMs = 5 * 60 * 1000; // 5 minutes

  constructor(private db: Kysely<Database>) {}

  public async getPoliciesByUserId(userId: number): Promise<Policy[]> {
    const cached = this.cache.get(userId);
    const now = Date.now();

    if (cached && cached.expiresAt > now) {
      return cached.policies;
    }

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

    this.cache.set(userId, { policies, expiresAt: now + this.ttlMs });
    return policies;
  }

  public invalidate(userId: number) {
    this.cache.delete(userId);
  }
}

export default new PolicyService(db);
