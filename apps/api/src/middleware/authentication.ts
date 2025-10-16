import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import logger from '@src/common/logger';
import config from '@src/common/config';
import { UnauthorizedError } from '@src/common/errors';
import { UserContext } from '@src/services/user-service';

export function authenticate(req: Request, res: Response, next: NextFunction) {

  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer '))
    throw new UnauthorizedError('Missing token');

  const token = header.substring(7);
  try {
    const user = jwt.verify(token, config.JWT_SECRET) as UserContext;

    if (user.status === 'unverified') {
      throw new UnauthorizedError('Email not verified');
    }

    if (user.status === 'deleted') {
      throw new UnauthorizedError('Account deleted');
    }

    if (user.status === 'disabled') {
      throw new UnauthorizedError('Account disabled');
    }

    res.locals.user = user;
    next();
  } catch (error) {
    logger.error(error);
    throw new UnauthorizedError('Invalid token');
  }
};
