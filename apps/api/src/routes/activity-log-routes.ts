import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/authentication';
import { Services } from '@src/services';
import { UserContext } from '@src/services/user-service';
import { ListQuery } from '@src/common/list-query';

const router = Router();

type ContextRequest = Request & { services: Services; context: UserContext };
type Handler = (req: ContextRequest, res: Response) => Promise<any>;

/**
 * Middleware wrapper that injects application services and user context into the request object,
 * then executes the provided handler function.
 */
const context =
  (handler: Handler) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      (req as ContextRequest).services = req.app.locals.services;
      (req as ContextRequest).context = res.locals.user as UserContext;
      const result = await handler(req as ContextRequest, res);
      if (result && !res.headersSent) {
        res.json(result);
      }
    } catch (error) {
      next(error);
    }
  };

/**
 * Get grouped activity logs (one row per path)
 * GET /api/activity-logs?limit=50&offset=0
 * Requires authentication
 */
router.get('/', authenticate, context(async (req) => {
  const query = ListQuery.parse(req.query);
  const result = await req.services.activityLog.getGroupedLogs(req.context, {}, query);
  return result;
}));

/**
 * Get detailed logs for a specific path
 * GET /api/activity-logs/path?path=/pact/nodes/123/api&limit=100&offset=0
 * Requires authentication
 */
router.get('/path', authenticate, context(async (req, res) => {
  const { path, limit, offset } = req.query;
  
  if (!path || typeof path !== 'string') {
    res.status(400);
    return { error: 'Path parameter is required' };
  }

  const query = {
    limit: limit ? parseInt(limit as string, 10) : undefined,
    offset: offset ? parseInt(offset as string, 10) : undefined,
  };

  const result = await req.services.activityLog.getLogsByPath(req.context, path, query);
  return result;
}));

/**
 * Get logs for a specific node
 * GET /api/nodes/:nodeId/logs?limit=100&offset=0
 * Requires authentication
 */
router.get('/nodes/:nodeId', authenticate, context(async (req, res) => {
  const nodeId = parseInt(req.params.nodeId, 10);

  if (isNaN(nodeId)) {
    res.status(400);
    return { error: 'Invalid node ID' };
  }

  const query = ListQuery.parse(req.query);
  const result = await req.services.activityLog.getNodeLogs(req.context, nodeId, query);
  return result;
}));

/**
 * Delete old activity logs
 * DELETE /api/activity-logs?olderThanDays=90
 * Requires authentication
 */
router.delete('/', authenticate, context(async (req, res) => {
  const { olderThanDays } = req.query;

  if (!olderThanDays) {
    res.status(400);
    return { error: 'olderThanDays parameter is required' };
  }

  const days = parseInt(olderThanDays as string, 10);
  if (isNaN(days) || days < 1) {
    res.status(400);
    return { error: 'olderThanDays must be a positive number' };
  }

  const deletedCount = await req.services.activityLog.deleteOldLogs(req.context, days);
  return { deletedCount };
}));

export default router;

