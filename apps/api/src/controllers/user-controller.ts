import { Response, Request, NextFunction } from 'express';
import { Services } from '@src/services';
import { UserProfile } from '@src/services/user-service';

/* Controller for company-related routes. Each function only
 * interacts with the corresponding service methods and handles
 * request/response mapping. The controllers will not contain any
 * logic and will simply call the service methods. Mapping
 * of exceptions to HTTP errors is handled in the middleware.
 */

export async function signup(req: Request, res: Response, next: NextFunction) {
  try {
    const services: Services = req.app.locals.services;

    const token = await services.user.signup(req.body);

    res.json({ token });
  } catch (error) {
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const services: Services = req.app.locals.services;

    const token = await services.user.login(req.body);

    res.json({ token });
  } catch (error) {
    next(error);
  }
}

export async function myProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const services: Services = req.app.locals.services;
    const user: UserProfile = res.locals.user;

    const profile = await services.user.getMyProfile(user.email, user.organizationId);

    res.json(profile);
  } catch (error) {
    next(error);
  }
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const services: Services = req.app.locals.services;

    const result = await services.user.forgotPassword(req.body);

    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const services: Services = req.app.locals.services;

    const result = await services.user.resetPassword(req.body);

    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function verifyResetToken(req: Request, res: Response, next: NextFunction) {
  try {
    const services: Services = req.app.locals.services;
    const { token } = req.params;

    const result = await services.user.verifyResetToken(token);

    res.json(result);
  } catch (error) {
    next(error);
  }
}
