import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import logger from "@src/util/logger";
import config from "@src/common/config";
import { UnauthorizedError } from "@src/common/errors";
import { UserProfile } from "@src/services/company-service";

export function authenticate(req: Request, res: Response, next: NextFunction) {

  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer '))
    throw new UnauthorizedError('Missing token');

  const token = header.substring(7);
  try {
    res.locals.user = jwt.verify(token, config.JWT_SECRET) as UserProfile;
    next();
  } catch (error) {
    logger.error(error)
    throw new UnauthorizedError('Invalid token');
  }
};
