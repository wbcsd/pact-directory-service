// middleware/checkPolicies.ts
import { Request, Response, NextFunction, RequestHandler } from 'express';
import logger from '@src/util/logger';
import { getHandlerPolicies } from '@src/decorators/RequirePolicies';
import type { PolicyService } from '@src/services/policy-service';

export function checkPoliciesMiddleware(
  handler: RequestHandler
): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    const allowedPolicies = getHandlerPolicies(handler);

    if (!allowedPolicies || allowedPolicies.length === 0) {
      return handler(req, res, next); // no policies required
    }

    const { policyService } = req.app.locals.services;
    const user = res.locals.user as { userId?: number };

    if (!user?.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    try {
      const userPolicies = await (
        policyService as PolicyService
      ).getCachedPolicies(user.userId);
      const policySet = new Set(
        userPolicies.map((p) => `${p.resource}:${p.action}`)
      );

      const isAllowed = allowedPolicies.every((p) => policySet.has(p));

      if (!isAllowed) {
        res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
        return;
      }

      return handler(req, res, next);
    } catch (error) {
      logger.error('Error checking policies:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  };
}
