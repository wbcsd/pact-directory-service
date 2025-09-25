import { Request, Response, NextFunction } from "express";
import { Services } from "../services";

/* Controller for obtaining authentication token
 */

class AuthController {
  async token(req: Request, res: Response, next: NextFunction) {
    try {
      const services: Services = req.app.locals.services;
      const result = await services.auth.token(req.body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

export default new AuthController();
