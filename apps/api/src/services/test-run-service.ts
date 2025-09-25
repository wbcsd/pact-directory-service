import { Kysely } from 'kysely';
import config from '@src/common/config';
import { Database } from '@src/database/types';
import { BadRequestError, NotFoundError } from '@src/common/errors';
import logger from '@src/util/logger';

export interface CreateTestRunData {
  apiUrl: string;
  clientId: string;
  clientSecret: string;
  version: string;
  authBaseUrl?: string;
  scope?: string;
  resource?: string;
  audience?: string;
}

export interface ListTestRunsQuery {
  query?: string;
  page?: string;
  pageSize?: string;
}

export interface UserContext {
  companyId: string;
  userId: string;
}

export class TestRunService {

  constructor(
    private db: Kysely<Database>
  ) {}

  /**
   * Create a new test run
   */
  async createTestRun(data: CreateTestRunData, userContext: UserContext): Promise<unknown> {
    const { companyId, userId } = userContext;

    // Get user and company data using Kysely
    const user = await this.db
      .selectFrom("users")
      .selectAll()
      .where("id", "=", Number(userId))
      .where("companyId", "=", Number(companyId))
      .executeTakeFirst();

    const company = await this.db
      .selectFrom("companies")
      .selectAll()
      .where("id", "=", Number(companyId))
      .executeTakeFirst();

    if (!user || !company) {
      throw new NotFoundError("User or company not found.");
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
    } = data;

    try {
      const response = await fetch(
        `${config.CONFORMANCE_API_INTERNAL}/testruns`,
        {
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
        }
      );

      const responseData: unknown = await response.json();
      return responseData;
    } catch (error) {
      logger.error("createTestRun error", error);
      throw new Error("Failed to execute test cases.");
    }
  }

  /**
   * Get test results by test run ID
   */
  async getTestResults(testRunId: string): Promise<unknown> {
    if (!testRunId) {
      throw new BadRequestError("Missing 'testRunId' parameter.");
    }

    try {
      const url = new URL(
        `${config.CONFORMANCE_API_INTERNAL}/testruns/${testRunId}`
      );

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      const data: unknown = await response.json();
      return data;
    } catch (error) {
      logger.error("getTestResults error", error);
      throw new Error("Failed to fetch test results.");
    }
  }

  /**
   * List test runs with optional filtering
   */
  async listTestRuns(queryParams: ListTestRunsQuery, userId: string): Promise<unknown> {
    const user = await this.db
      .selectFrom("users")
      .select(["email", "role"])
      .where("id", "=", Number(userId))
      .executeTakeFirst();

    if (!user) {
      throw new NotFoundError("User not found.");
    }

    try {
      const url = new URL(`${config.CONFORMANCE_API_INTERNAL}/testruns`);
      
      if (queryParams.query) 
        url.searchParams.append("query", queryParams.query);
      
      if (queryParams.page) 
        url.searchParams.append("page", queryParams.page);
      
      if (queryParams.pageSize)
        url.searchParams.append("pageSize", queryParams.pageSize);

      // Non-administrator users should only see their own test runs
      if (user.role !== "administrator")
        url.searchParams.append("adminEmail", user.email);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data: unknown = await response.json();
      return data;
    } catch (error) {
      logger.error("listTestRuns error", error);
      throw new Error("Failed to fetch recent test runs.");
    }
  }

}
