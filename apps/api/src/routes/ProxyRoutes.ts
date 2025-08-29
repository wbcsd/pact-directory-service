import logger from "@src/util/logger";
import HttpStatusCodes from "@src/common/HttpStatusCodes";
import { IReq, IRes } from "./common/types";
import { db } from "@src/database/db";
import EnvVars from "@src/common/EnvVars";

async function runTestCases(req: IReq, res: IRes) {
  const { companyId, userId } = res.locals.user as {
    companyId: string;
    userId: string;
  };

  try {
    // Get user and company data using Kysely
    const user = await db
      .selectFrom("users")
      .selectAll()
      .where("id", "=", Number(userId))
      .where("companyId", "=", Number(companyId))
      .executeTakeFirst();

    const company = await db
      .selectFrom("companies")
      .selectAll()
      .where("id", "=", Number(companyId))
      .executeTakeFirst();

    if (!user || !company) {
      res
        .status(HttpStatusCodes.NOT_FOUND)
        .json({ error: "User or company not found." });
      return;
    }

    const {
      apiUrl,
      clientId,
      clientSecret,
      version,
      authBaseUrl,
      scope,
      resource,
      audience,
    } = req.body as {
      clientId: string;
      clientSecret: string;
      apiUrl: string;
      version: string;
      authBaseUrl?: string;
      scope?: string;
      resource?: string;
      audience?: string;
    };

    const response = await fetch(`${EnvVars.ConformanceApi}/testruns`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        clientId,
        clientSecret,
        baseUrl: apiUrl,
        customAuthBaseUrl: authBaseUrl,
        version,
        companyName: company.companyName,
        companyIdentifier: company.companyIdentifier,
        adminEmail: user.email,
        adminName: user.fullName,
        scope: scope,
        resource: resource,
        audience: audience,
      }),
    });

    const data: unknown = await response.json();
    res.status(HttpStatusCodes.OK).json(data);
  } catch (error) {
    logger.error("runTestCases error", error);
    res
      .status(HttpStatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Failed to execute test cases." });
  }
}

async function getTestResults(req: IReq, res: IRes) {
  const { testRunId } = req.query;

  if (!testRunId) {
    res
      .status(HttpStatusCodes.BAD_REQUEST)
      .json({ error: "Missing 'testRunId' query parameter." });
    return;
  }

  try {
    const url = new URL(
      `${EnvVars.ConformanceApi}/testruns/${testRunId as string}`
    );

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    const data: unknown = await response.json();
    res.status(HttpStatusCodes.OK).json(data);
  } catch (error) {
    logger.error("getTestResults error", error);
    res
      .status(HttpStatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Failed to fetch test results." });
  }
}

/*
endpoint: /test-runs?query={query}&adminEmail={adminEmail}&limit={limit}
*/
async function searchTestRuns(req: IReq, res: IRes) {
  const { query, limit } = req.query;
  if (!query) {
    res
      .status(HttpStatusCodes.BAD_REQUEST)
      .json({ error: "Missing 'query' parameter." });
    return;
  }

  const { userId } = res.locals.user as {
    userId: string;
  };

  try {
    const url = new URL(`${EnvVars.ConformanceApi}/testruns`);
    url.searchParams.append("query", query as string);

    const { email, role } = await getUserEmailAndRole(userId);

    if (!email) {
      res.status(HttpStatusCodes.NOT_FOUND).json({ error: "User not found." });
      return;
    }

    if (role !== "administrator") {
      url.searchParams.append("adminEmail", email);
    }

    if (limit) {
      url.searchParams.append("limit", limit as string);
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data: unknown = await response.json();
    res.status(HttpStatusCodes.OK).json(data);
  } catch (error) {
    logger.error("searchTestRuns error", error);
    res
      .status(HttpStatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Failed to search test runs." });
  }
}

async function getOrSearchTestRuns(req: IReq, res: IRes) {
  const { query } = req.query;
  if (query) {
    await searchTestRuns(req, res);
  } else {
    await getRecentTestRuns(req, res);
  }
}

async function getRecentTestRuns(req: IReq, res: IRes) {
  const { userId } = res.locals.user as {
    userId: string;
  };

  try {
    const { email, role } = await getUserEmailAndRole(userId);

    if (!email) {
      res.status(HttpStatusCodes.NOT_FOUND).json({ error: "User not found." });
      return;
    }

    const url = new URL(`${EnvVars.ConformanceApi}/testruns`);
    if (role !== "administrator") {
      url.searchParams.append("adminEmail", email);
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data: unknown = await response.json();
    res.status(HttpStatusCodes.OK).json(data);
  } catch (error) {
    logger.error("getRecentTestRuns error", error);
    res
      .status(HttpStatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Failed to fetch recent test runs." });
  }
}

async function getUserEmailAndRole(
  userId: string
): Promise<{ email: string; role: string }> {
  try {
    const user = await db
      .selectFrom("users")
      .select(["email", "role"])
      .where("id", "=", Number(userId))
      .executeTakeFirst();

    return {
      email: user?.email ?? "",
      role: user?.role ?? "",
    };
  } catch (error) {
    logger.error("getUserEmailAndRole error", error);
    throw error;
  }
}

export default {
  runTestCases,
  getTestResults,
  getOrSearchTestRuns,
} as const;
