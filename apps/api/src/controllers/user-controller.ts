import { Response, Request, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '@src/common/config';
import { Services } from '@src/services';
import { UserContext } from '@src/services/user-service';

/* Controller for company-related routes. Each function only
 * interacts with the corresponding service methods and handles
 * request/response mapping. The controllers will not contain any
 * logic and will simply call the service methods. Mapping
 * of exceptions to HTTP errors is handled in the middleware.
 */

export async function signup(req: Request, res: Response, next: NextFunction) {
  try {
    const services: Services = req.app.locals.services;

    const user: UserContext = await services.user.signup(req.body);
    const token = jwt.sign(user, config.JWT_SECRET, { expiresIn: '6h' });

    res.json({ token });
  } catch (error) {
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const services: Services = req.app.locals.services;

    const user: UserContext = await services.user.login(req.body);
    const token = jwt.sign(user, config.JWT_SECRET, { expiresIn: '6h' });

    res.json({ token });
  } catch (error) {
    next(error);
  }
}

export async function myProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const services: Services = req.app.locals.services;
    const user: UserContext = res.locals.user;

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
