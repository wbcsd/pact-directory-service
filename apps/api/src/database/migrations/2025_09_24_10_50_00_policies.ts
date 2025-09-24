import { Kysely } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  const policies = [
    { resource: "site", action: "listAllUsers", description: "Site Admin" },
    { resource: "org", action: "listUsers", description: "Org Admin" },
    { resource: "org", action: "getUserById", description: "Org Admin" },
    { resource: "org", action: "updateUser", description: "Org Admin" },
    {
      resource: "testruns",
      action: "listTestRuns",
      description: "Org User/Admin",
    },
    {
      resource: "testruns",
      action: "getTestRunById",
      description: "Org User/Admin",
    },
    {
      resource: "testruns",
      action: "createTestRun",
      description: "Org User/Admin",
    },
  ];

  for (const policy of policies) {
    await db
      .insertInto("org_policies")
      .values({
        resource_name: policy.resource,
        resource_action: policy.action,
        policy_description: policy.description,
      })
      .execute();
  }
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.deleteFrom("org_policies").execute();
}
