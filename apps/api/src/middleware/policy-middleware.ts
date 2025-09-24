import policyService from "@src/services/PolicyService";
import logger from "@src/util/logger";
import { Request, Response, NextFunction } from "express";

export default function checkPoliciesMiddleware(
  allowedPolicies: { resource: string; action: string }[]
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!res.locals.user || !(res.locals.user as { userId: number }).userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    try {
      const isAllowed = await checkPolicies(
        (res.locals.user as { userId: number }).userId,
        allowedPolicies
      );

      if (!isAllowed) {
        res.status(403).json({ error: "Forbidden: Insufficient permissions" });
        return;
      }

      next();
    } catch (error) {
      logger.error("Error fetching policies:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  };
}

async function checkPolicies(
  userId: number,
  allowedPolicies: { resource: string; action: string }[]
): Promise<boolean> {
  const policies = await policyService.getCachedPolicies(userId);
  const policySet = new Set(policies.map((p) => `${p.resource}:${p.action}`));
  for (const policy of allowedPolicies) {
    if (!policySet.has(`${policy.resource}:${policy.action}`)) {
      return false;
    }
  }

  return true;
}
