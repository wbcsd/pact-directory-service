import { Response, Request, NextFunction } from 'express';
import { Services } from '@src/services';

/* Controller for company-related routes. Each function only
 * interacts with the corresponding service methods and handles
 * request/response mapping. The controllers will not contain any
 * logic and will simply call the service methods. Mapping
 * of exceptions to HTTP errors is handled in the middleware.
 */

export async function get(req: Request, res: Response, next: NextFunction) {
  try {
    const services: Services = req.app.locals.services;
    const { id } = req.params;

    const result = await services.organization.get(Number(id));

    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function listMembers(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const services: Services = req.app.locals.services;
    const user = res.locals.user;
    const { id } = user as { email: string; id: string };

    const users = await services.organization.listMembers(Number(id));

    res.json(users);
  } catch (error) {
    next(error);
  }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const services: Services = req.app.locals.services;
    const { query } = req.query;

    const organizations = await services.organization.list(query as string);

    res.json(organizations);
  } catch (error) {
    next(error);
  }
}

export async function createConnectionRequest(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const services: Services = req.app.locals.services;
    const user = res.locals.user;

    const result = await services.connection.createConnectionRequest(
      user,
      req.body.requestedOrganizationId,
      user.organizationId
    );

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function connectionRequestAction(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const services: Services = req.app.locals.services;
    const user = res.locals.user;

    const result = await services.connection.acceptConnectionRequest(
      user,
      req.body.requestId
    );

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}
