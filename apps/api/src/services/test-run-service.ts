import { Kysely } from 'kysely';
import config from '@src/common/config';
import { Database } from '@src/database/types';
import { BadRequestError } from '@src/common/errors';
import logger from '@src/common/logger';
import { UserContext, UserService } from './user-service';
import { ListQuery, ListResult } from '@src/common/list-query';
import { OrganizationService } from './organization-service';
import { Role } from '@src/common/policies';

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

export interface TestRunUserContext {
  organizationId: string;
  userId: string;
}

export interface TestRunData {
  testRunId: string;
  timestamp: string;
  organizationName: string;
  adminEmail: string;
  adminName: string;
  techSpecVersion: string;
  status: string;
  passingPercentage: number;
}

export class TestRunService {
  constructor(
    private db: Kysely<Database>,
    private userService: UserService,
    private organizationService: OrganizationService
  ) {}

  /**
   * Create a new test run
   */
  async createTestRun(
    context: UserContext,
    data: CreateTestRunData
  ): Promise<unknown> {
    // Get user and company data
    const user = await this.userService.get(context, context.userId);

    if (!user) {
      throw new BadRequestError('User or organization not found.');
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
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            clientId,
            clientSecret,
            baseUrl: apiUrl,
            customAuthBaseUrl: authBaseUrl,
            version,
            organizationName: user.organizationName,
            organizationIdentifier: user.organizationIdentifier,
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
      logger.error('createTestRun error', error);
      throw new Error('Failed to execute test cases.');
    }
  }

  /**
   * Get test results by test run ID
   */
  async getTestResults(context: UserContext, testRunId: string): Promise<unknown> {

    if (!testRunId) {
      throw new BadRequestError("Missing 'testRunId' parameter.");
    }

    try {
      const url = new URL(
        `${config.CONFORMANCE_API_INTERNAL}/testruns/${testRunId}`
      );

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data: unknown = await response.json();
      return data;
    } catch (error) {
      logger.error('getTestResults error', error);
      throw new Error('Failed to fetch test results.');
    }
  }

  /**
   * List test runs with optional filtering
   */
  async listTestRuns(context: UserContext, query: ListQuery): Promise<ListResult<TestRunData>> {
    
    const user = await this.userService.get(context, context.userId);

    try {
      const url = new URL(`${config.CONFORMANCE_API_INTERNAL}/testruns`);

      if (query.search)
        url.searchParams.append('query', query.search);

      if (query.page) url.searchParams.append('page', query.page.toString());

      if (query.pageSize)
        url.searchParams.append('size', query.pageSize.toString());

      // Non-administrator users should only see their own test runs
      if (user.role !== Role.Administrator && user.role !== Role.Root)
        url.searchParams.append('adminEmail', user.email);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const { testRuns, count } = await response.json();
      return { 
        data: testRuns, 
        pagination: query.pagination(count ?? 0)
      }
    } catch (error) {
      logger.error('listTestRuns error', error);
      throw new Error('Failed to fetch recent test runs.');
    }
  }
}
