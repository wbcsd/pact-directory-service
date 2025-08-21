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

    // eslint-disable-next-line n/no-unsupported-features/node-builtins
    const response = await fetch(EnvVars.ConformanceApi.RunTestCasesUrl, {
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
    logger.error(error);
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
    const url = new URL(EnvVars.ConformanceApi.TestResultsUrl);
    url.searchParams.append("testRunId", testRunId as string);

    // eslint-disable-next-line n/no-unsupported-features/node-builtins
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    const data: unknown = await response.json();
    res.status(HttpStatusCodes.OK).json(data);
  } catch (error) {
    logger.error(error);
    res
      .status(HttpStatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Failed to fetch test results." });
  }
}

async function getRecentTestRuns(req: IReq, res: IRes) {
  const { userId } = res.locals.user as {
    userId: string;
  };

  try {
    // Get user data to fetch email
    const user = await db
      .selectFrom("users")
      .select(["email", "role"])
      .where("id", "=", Number(userId))
      .executeTakeFirst();

    if (!user) {
      res.status(HttpStatusCodes.NOT_FOUND).json({ error: "User not found." });
      return;
    }

    const url = new URL(EnvVars.ConformanceApi.RecentTestRunsUrl);
    if (user.role !== "administrator") {
      url.searchParams.append("adminEmail", user.email);
    }

    // eslint-disable-next-line n/no-unsupported-features/node-builtins
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data: unknown = await response.json();
    res.status(HttpStatusCodes.OK).json(data);
  } catch (error) {
    logger.error(error);
    res
      .status(HttpStatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Failed to fetch recent test runs." });
  }
}

export default {
  runTestCases,
  getTestResults,
  getRecentTestRuns,
} as const;
