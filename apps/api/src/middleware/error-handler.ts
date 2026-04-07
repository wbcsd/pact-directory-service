import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../common/errors';

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  if (res.headersSent) {
    return _next(err);
  }

  // Handle API custom errors defined in common/errors.ts.
  if (err instanceof ApiError) {
    const { status, message, stack: _stack, ...rest } = err;
    return res.status(status).json({ status, message, ...rest });
  }

  // Default error
  if (typeof err.status === 'number' && err.status >= 100 && err.status <= 599) {
    const { status, message, stack: _stack, ...rest } = err;
    return res.status(status).json({ status, message, ...rest });
  }
  return res.status(500).json({ message: err.message ?? 'Internal Server Error' });
}
