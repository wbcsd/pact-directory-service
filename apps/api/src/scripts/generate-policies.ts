import { db } from "@src/database/db";

async function execute() {
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
    {
      resource: "testruns",
      action: "getTestResults",
      description: "Org User/Admin",
    },
  ];

  for (const policy of policies) {
    await db
      .insertInto("org_policies")
      .values({
        resourceName: policy.resource,
        actionName: policy.action,
        policyDescription: policy.description,
      })
      .execute();
  }
}

execute().catch((err: unknown) => {
  console.error("Error generating policies:", err);
  process.exit(1);
});
