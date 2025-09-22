enum roles {
  siteadmin = "siteadmin",
  orgadmin = "orgadmin",
  orguser = "orguser",
}

enum testruns {
  listTestRuns = "listTestRuns",
  getTestRunById = "getTestRunById",
  createTestRun = "createTestRun",
}

enum org {
  listUsers = "listUsers",
  getUserById = "getUserById",
  updateUser = "updateUser",
}

enum site {
  listAllUsers = "listAllUsers",
}

type allowedPolicies = testruns | org | site;

const policiesMap: Record<roles, allowedPolicies[]> = {
  siteadmin: [
    testruns.listTestRuns,
    testruns.getTestRunById,
    testruns.createTestRun,
    org.listUsers,
    org.getUserById,
    org.updateUser,
    site.listAllUsers,
  ],
  orgadmin: [org.listUsers, org.getUserById, org.updateUser],
  orguser: [
    testruns.listTestRuns,
    testruns.getTestRunById,
    testruns.createTestRun,
  ],
};

const checkAllowedPolicy = (role: roles, policy: allowedPolicies[]) => {
  const allowed = policiesMap[role];
  return policy.every((p) => allowed.includes(p));
};

const policies = { testruns, org, site };

export { roles, policies, checkAllowedPolicy, type allowedPolicies };
