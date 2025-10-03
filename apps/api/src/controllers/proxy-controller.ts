import { Response, Request, NextFunction } from 'express';
import { Services } from '@src/services';
import { UserContext } from '@src/services/user-service';

/* Controller for test run proxy routes. Each function only
 * interacts with the corresponding service methods and handles
 * request/response mapping. The controllers will not contain any
 * logic and will simply call the service methods. Mapping
 * of exceptions to HTTP errors is handled in the middleware.
 */

export async function createTestRun(req: Request, res: Response, next: NextFunction) {
  try {
    const services: Services = req.app.locals.services;
    const user: UserContext = res.locals.user;
    
    const result = await services.testRun.createTestRun(user, req.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getTestResults(req: Request, res: Response, next: NextFunction) {
  try {
    const services: Services = req.app.locals.services;
    const { testRunId } = req.query;

    const result = await services.testRun.getTestResults(testRunId as string);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

/*
endpoint: /test-runs?query={query}&adminEmail={adminEmail}&limit={limit}
*/
export async function listTestRuns(req: Request, res: Response, next: NextFunction) {
  try {
    const services: Services = req.app.locals.services;
    const { userId } = res.locals.user as {
      userId: string;
    };

    const queryParams = {
      query: req.query.query as string | undefined,
      page: req.query.page as string | undefined,
      pageSize: req.query.pageSize as string | undefined,
    };

    const result = await services.testRun.listTestRuns(queryParams, userId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}
