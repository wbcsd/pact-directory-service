import logger from "jet-logger";
import HttpStatusCodes from "@src/common/HttpStatusCodes";
import { IReq, IRes } from "./common/types";
import { db } from "@src/database/db";

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

    const { apiUrl, clientId, clientSecret, version, authBaseUrl } =
      req.body as {
        clientId: string;
        clientSecret: string;
        apiUrl: string;
        version: string;
        authBaseUrl?: string;
      };

    // eslint-disable-next-line n/no-process-env
    const testCasesUrl: string = process.env.RUN_TEST_CASES_URL ?? "";

    if (!testCasesUrl) {
      res
        .status(HttpStatusCodes.INTERNAL_SERVER_ERROR)
        .json({ error: "Test cases URL not configured." });
      return;
    }

    // eslint-disable-next-line n/no-unsupported-features/node-builtins
    const response = await fetch(testCasesUrl, {
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
      }),
    });

    const data: unknown = await response.json();
    res.status(HttpStatusCodes.OK).json(data);
  } catch (error) {
    logger.err(error);
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

  // eslint-disable-next-line n/no-process-env
  const testResultsUrl: string = process.env.TEST_RESULTS_URL ?? "";
  if (!testResultsUrl) {
    res
      .status(HttpStatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Test results URL not configured." });
    return;
  }

  try {
    const url = new URL(testResultsUrl);
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
    logger.err(error);
    res
      .status(HttpStatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Failed to fetch test results." });
  }
}

export default {
  runTestCases,
  getTestResults,
} as const;
