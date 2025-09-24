import { Response, Request, NextFunction } from "express";
import { Services } from "@src/services";

/* Controller for company-related routes. Each function only
 * interacts with the corresponding service methods and handles
 * request/response mapping. The controllers will not contain any
 * logic and will simply call the service methods. Mapping
 * of exceptions to HTTP errors is handled in the middleware.
 */

export async function signup(req: Request, res: Response, next: NextFunction) {
  try {
    const services: Services = req.app.locals.services;

    const token = await services.company.signup(req.body);

    res.json({ token });
  } catch (error) {
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const services: Services = req.app.locals.services;

    const token = await services.company.login(req.body);

    res.json({ token });
  } catch (error) {
    next(error);
  }
}

export async function myProfile(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const services: Services = req.app.locals.services;
    const user = res.locals.user;
    const { email, companyId } = user as { email: string; companyId: string };

    const profile = await services.company.getMyProfile(email, companyId);

    res.json(profile);
  } catch (error) {
    next(error);
  }
}

export async function getCompany(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const services: Services = req.app.locals.services;
    const user = res.locals.user;
    const { companyId: currentUserCompanyId } = user as { companyId: string };
    const { id } = req.params;

    const result = await services.company.getCompany(id, currentUserCompanyId);

    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function searchCompanies(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const services: Services = req.app.locals.services;
    const user = res.locals.user;
    const { companyId: currentUserCompanyId } = user as { companyId: string };
    const { searchQuery } = req.query;

    const companies = await services.company.searchCompanies(
      searchQuery as string,
      currentUserCompanyId
    );

    res.json(companies);
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
    const requestingCompanyId = (user as { companyId: number }).companyId;

    const result = await services.company.createConnectionRequest(
      req.body,
      requestingCompanyId
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
    const { companyId: currentCompanyId } = user as { companyId: number };

    const result = await services.company.acceptConnectionRequest(
      req.body,
      currentCompanyId
    );

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function forgotPassword(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const services: Services = req.app.locals.services;

    const result = await services.company.forgotPassword(req.body);

    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function resetPassword(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const services: Services = req.app.locals.services;

    const result = await services.company.resetPassword(req.body);

    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function verifyResetToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const services: Services = req.app.locals.services;
    const { token } = req.params;

    const result = await services.company.verifyResetToken(token);

    res.json(result);
  } catch (error) {
    next(error);
  }
}
