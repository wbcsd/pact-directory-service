import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/authentication';
import { Services } from '@src/services';
import { LoginData, UserContext, AddUserToOrganizationData, UserStatus } from '@src/services/user-service';
import { ListQuery } from '@src/common/list-query';
import jwt from 'jsonwebtoken';
import config from '@src/common/config';
import logger from '@src/common/logger';
import { Role } from '@src/common/policies';
import { UpdateNodeData } from '@src/services/node-service';
import { createInternalNodeRoutes } from './internal-node-routes';

const router = Router();

/**
 * ContextRequests Express Request interface to include custom properties:
 *
 * @property services - An instance of the Services class,
 *                      providing access to application services.
 * @property context -  The UserContext object, containing information
 *                      about the current user.
 */
type ContextRequest = Request & { services: Services; context: UserContext };

/**
 * Represents an asynchronous request handler function for API routes.
 *
 * @param req - The incoming request context.
 * @param res - The response object used to send data back to the client.
 * @returns A promise that resolves with the handler's result.
 */
type Handler = (req: ContextRequest, res: Response) => Promise<any>;

/**
 * Middleware wrapper that injects application services and user context into the request object,
 * then executes the provided handler function. If the handler returns a result and the response
 * headers have not been sent, the result is sent as a JSON response. Errors are logged and passed
 * to the next middleware.
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
      logger.error(error);
      next(error);
    }
  };

/**
 * Routes
 * Note: The order of routes matters. More specific routes should be defined before more general ones.
 */

// Auth token
// Note: This endpoint is temporarily disabled during migration to node-based connections (T#139-141)
router.post('/im/auth/token', context(async (req) => {
  const tokenResponse = await req.services.auth.token(req.body);
  // The auth service now returns { access_token, token_type } directly
  return tokenResponse;
}));

// Signup 
router.post('/directory/users/signup', context(async (req, res) => {
  const result = await req.services.user.signup(req.body);
  res.status(201);
  return result;
}));

router.post('/directory/users/login', context(async (req) => {
  const user = await req.services.user.login(req.body as LoginData);
  const token = jwt.sign(user, config.JWT_SECRET, { expiresIn: '6h' });
  return { token };
}));

// User profile
router.get('/directory/users/me', authenticate, context(async (req) => {
  const user = await req.services.user.getMyProfile(req.context.email);
  return user;
}));

// Password reset
router.post('/directory/users/forgot-password', context(async (req) => {
  const result = await req.services.user.forgotPassword(req.body);
  return result;
}));

// Set password using reset token
router.post('/directory/users/set-password', context(async (req) => {
  const result = await req.services.user.setPasswordWithToken(req.body);
  return result;
}));

router.post('/directory/users/reset-password', context(async (req) => {
  const result = await req.services.user.resetPassword(req.body);
  return result;
}));

router.get('/directory/users/verify-reset-token/:token', context(async (req) => {
  const result = await req.services.user.verifyResetToken(req.params.token);
  return result;
}));

// Organization list and search, only show organizations the user is allowed to see.
router.get('/directory/organizations', authenticate, context(async (req) => {
  return req.services.organization.list(req.context, ListQuery.parse(req.query));
}));

// Organization list and search, only show organizations the user is allowed to see.
router.get('/directory/organizations/:id', authenticate, context(async (req) => {
  return req.services.organization.get(req.context, parseInt(req.params.id));
}));

// Update organization details
router.post('/directory/organizations/:id', authenticate, context(async (req) => {
  return req.services.organization.update(
    req.context,
    parseInt(req.params.id),
    req.body
  );
}));

// List all users in an organization.
router.get('/directory/organizations/:id/users', authenticate, context(async (req) => {
  return req.services.organization.listMembers(
    req.context,
    parseInt(req.params.id),
    ListQuery.parse(req.query)
  );
}));

// Add a user to an organization
router.post('/directory/organizations/:id/users', authenticate, context(async (req) => {
  return req.services.user.addUserToOrganization(
    req.context,
     parseInt(req.params.id),
    req.body as AddUserToOrganizationData
  );
}));

// Retrieve users from the organization
router.get('/directory/organizations/:id/users', authenticate, context(async (req) => {
  return req.services.organization.listMembers(
    req.context,
    parseInt(req.params.id),
    ListQuery.parse(req.query)
  );
}));

router.get('/directory/organizations/:oid/users/:uid', authenticate, context(async (req) => {
  return req.services.organization.getMember(
    req.context,
    parseInt(req.params.oid),
    parseInt(req.params.uid)
  );
}));

router.get('/directory/organizations/check-name/:name', context(async (req) => {
  const organizationName = req.params.name;
  const response = await req.services.organization.checkOrganizationExistsByName(organizationName);
  return response;
}));

router.post('/directory/organizations/:oid/users/:uid', authenticate, context(async (req) => {
  const organizationId = parseInt(req.params.oid);
  const userId = parseInt(req.params.uid);

  return req.services.organization.updateMember(
    req.context,
    organizationId,
    userId,
    req.body as { fullName?: string; role?: Role, status?: UserStatus }
  );
}));

// Connections between organizations
router.get('/directory/organizations/:id/connections', authenticate, context(async (req) => {
  return req.services.connection.listConnections(
    req.context, 
    parseInt(req.params.id), 
    ListQuery.parse(req.query)
  );
}));

// Connections between organizations
router.get('/directory/organizations/:id/connection-requests', authenticate, context(async (req) => {
  return req.services.connection.listConnectionRequests(
    req.context, 
    parseInt(req.params.id), 
    ListQuery.parse(req.query)
  );
}));

// Connections between organizations
router.post('/directory/organizations/create-connection-request', authenticate, context(async (req) => {
  return req.services.connection.createConnectionRequest(
    req.context,
    req.context.organizationId,
    req.body.requestedOrganizationId
  );
}));

/////////////////// Nodes
// Create a node for an organization
router.post('/directory/organizations/:id/nodes', authenticate, context(async (req) => {
  return req.services.node.create(
    req.context,
    parseInt(req.params.id),
    req.body
  );
}));

// Update a node by ID
router.put('/directory/nodes/:id', authenticate, context(async (req) => {
  return req.services.node.update(
    req.context,
    parseInt(req.params.id),
    req.body as UpdateNodeData
  );
}));

// Delete a node by ID
router.delete('/directory/nodes/:id', authenticate, context(async (req) => {
  return req.services.node.delete(
    req.context,
    parseInt(req.params.id)
  );
}));

// List nodes for an organization
// Lists all if user is root
router.get('/directory/organizations/:id/nodes', authenticate, context(async (req) => {
  console.log('List nodes query params:', req.query);
  return req.services.node.list(
    req.context,
    parseInt(req.params.id),
    ListQuery.parse(req.query)
  );
}));

// Get a node by ID
router.get('/directory/nodes/:id', authenticate, context(async (req) => {
  return req.services.node.get(
    req.context,
    parseInt(req.params.id)
  );
}));

// List node connections
router.get('/directory/nodes/:id/connections', authenticate, context(async (req) => {
  return req.services.nodeConnection.listConnections(
    req.context,
    parseInt(req.params.id)
  );
}));


// Create invitation
router.post('/directory/nodes/:id/invitations', authenticate, context(async (req) => {
  return req.services.nodeConnection.createInvitation(
    req.context,
    parseInt(req.params.id),
    req.body
  );
}));

// List invitations per node
router.get('/directory/nodes/:id/invitations', authenticate, context(async (req) => {
  return req.services.nodeConnection.listInvitations(
    req.context,
    parseInt(req.params.id),
    ListQuery.parse(req.query)
  );
}));

// Accept invitation request for node connection
router.post('/directory/node-invitations/:id/accept', authenticate, context(async (req) => {
  return req.services.nodeConnection.acceptInvitation(
    req.context,
    parseInt(req.params.id),
  );
}));

// Reject invitation request for node connection
router.post('/directory/node-invitations/:id/reject', authenticate, context(async (req, res) => {
  await req.services.nodeConnection.rejectInvitation(
    req.context,
    parseInt(req.params.id),
  );
  res.status(204).send();
}));

// Remove node connection
router.delete('/directory/node-invitations/:id', authenticate, context(async (req) => {
  return req.services.nodeConnection.removeConnection(
    req.context,
    parseInt(req.params.id),
  );
}));

// Rotate credentials
router.post('/directory/node-connections/:id/credentials/rotate', authenticate, context(async (req) => {
  return req.services.nodeConnection.rotateCredentials(
    req.context,
    parseInt(req.params.id),
  );
}));

/////////////////// Footprints (Product Footprints)

// Create a footprint for a node
router.post('/directory/nodes/:id/footprints', authenticate, context(async (req, res) => {
  const result = await req.services.footprint.create(
    req.context,
    parseInt(req.params.id),
    { data: req.body }
  );
  res.status(201);
  return result;
}));

// List footprints for a node
router.get('/directory/nodes/:id/footprints', authenticate, context(async (req) => {
  return req.services.footprint.listByNode(
    req.context,
    parseInt(req.params.id),
    ListQuery.parse(req.query)
  );
}));

// Get a single footprint by ID
router.get('/directory/footprints/:id', authenticate, context(async (req) => {
  return req.services.footprint.get(
    req.context,
    req.params.id
  );
}));

// Delete a footprint by ID
router.delete('/directory/footprints/:id', authenticate, context(async (req) => {
  return req.services.footprint.delete(
    req.context,
    req.params.id
  );
}));


//////////////// Organization connections

// Accept connection request
router.post('/directory/organizations/connection-request-action', authenticate, context(async (req) => {
  return req.services.connection.acceptConnectionRequest(
    req.body.requestId,
    req.context.organizationId
  );
}));

// Proxy routes to Conformance service
router.post('/proxy/test', authenticate, context(async (req) => {
  return req.services.testRun.createTestRun(req.context, req.body);
}));

router.get('/proxy/test-runs', authenticate, context(async (req) => {
  return req.services.testRun.listTestRuns(req.context, ListQuery.parse(req.query));
}));

router.get('/proxy/test-results', authenticate, context(async (req) => {
  return req.services.testRun.getTestResults(req.context, req.query.testRunId as string);
}));

// Email verification
router.post('/directory/users/verify-email', context(async (req) => {
  return await req.services.user.verifyEmail(req.body);
}));

router.post('/directory/users/resend-verification', context(async (req) => {
  return await req.services.user.resendEmailVerification(req.body);
}));

// Internal Node PACT API Routes
// Mount PACT-compliant endpoints for internal nodes
// URL structure: /api/nodes/:nodeId/auth/token and /api/nodes/:nodeId/3/footprints
router.use('/nodes', createInternalNodeRoutes());

// Activity Log Routes
// Mount activity log endpoints for log viewing and management
// URL structure: /api/activity-logs, /api/activity-logs/path, /api/activity-logs/nodes/:nodeId

/**
 * Get grouped activity logs (one row per path)
 * GET /api/activity-logs?limit=50&offset=0
 * Requires authentication
 */
router.get('/directory/activity-logs', authenticate, context(async (req) => {
  const query = ListQuery.parse(req.query);
  const result = await req.services.activityLog.getGroupedLogs(req.context, {}, query);
  return result;
}));

/**
 * Get detailed logs for a specific path
 * GET /api/activity-logs/path?path=/pact/nodes/123/api&limit=100&offset=0
 * Requires authentication
 */
router.get('/directory/activity-logs/path', authenticate, context(async (req, res) => {
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
router.get('/directory/activity-logs/nodes/:nodeId', authenticate, context(async (req, res) => {
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
router.delete('/directory/activity-logs', authenticate, context(async (req, res) => {
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
