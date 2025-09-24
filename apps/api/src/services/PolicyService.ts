// import express from "express";

import { db } from "@src/database/db";
import { Database } from "@src/database/types";
import { Kysely } from "kysely";

// enum roles {
//   siteadmin = "siteadmin",
//   orgadmin = "orgadmin",
//   orguser = "orguser",
// }

// enum testruns {
//   listTestRuns = "listTestRuns",
//   getTestRunById = "getTestRunById",
//   createTestRun = "createTestRun",
// }

// enum org {
//   listUsers = "listUsers",
//   getUserById = "getUserById",
//   updateUser = "updateUser",
// }

// enum site {
//   listAllUsers = "listAllUsers",
// }

// type allowedPolicies = testruns | org | site;

// const policiesMap: Record<roles, allowedPolicies[]> = {
//   siteadmin: [
//     testruns.listTestRuns,
//     testruns.getTestRunById,
//     testruns.createTestRun,
//     org.listUsers,
//     org.getUserById,
//     org.updateUser,
//     site.listAllUsers,
//   ],
//   orgadmin: [org.listUsers, org.getUserById, org.updateUser],
//   orguser: [
//     testruns.listTestRuns,
//     testruns.getTestRunById,
//     testruns.createTestRun,
//   ],
// };

// const checkAllowedPolicy = (role: roles, policy: allowedPolicies[]) => {
//   const allowed = policiesMap[role];
//   return policy.every((p) => allowed.includes(p));
// };

// function action(
//   routeHandler: (req: express.Request, res: express.Response) => Promise<void>,
//   actionSet: allowedPolicies[]
// ) {
//   return (req: express.Request, res: express.Response) => {
//     const role = req.headers["x-user-role"] as string;
//     if (!role) {
//       res.status(401).json({ error: "Unauthorized: No role provided" });
//       return;
//     }

//     if (!checkAllowedPolicy(role as roles, actionSet)) {
//       res.status(403).json({ error: "Forbidden: Insufficient permissions" });
//       return;
//     }

//     return routeHandler(req, res);
//   };
// }

// const policies = { testruns, org, site };

// export { roles, policies, checkAllowedPolicy, type allowedPolicies, action };

class PolicyService {
  constructor(private db: Kysely<Database>) {}

  private async getPoliciesForUserEmail(
    email: string
  ): Promise<{ resource: string; action: string }[]> {
    const rows = await this.db
      .selectFrom("org_users")
      .innerJoin("org_roles", "org_users.roleId", "org_roles.roleId")
      .innerJoin("role_policies", "org_roles.roleId", "role_policies.roleId")
      .innerJoin(
        "org_policies",
        "role_policies.policyId",
        "org_policies.policyId"
      )
      .where("org_users.userEmail", "=", email)
      .select("org_policies.resourceName")
      .select("org_policies.actionName")
      .execute();

    return rows.map((row) => ({
      resource: row.resourceName,
      action: row.actionName,
    }));
  }
}

export default new PolicyService(db);
