import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/authentication';
import { Services } from '@src/services';
import {
  LoginData,
  UserContext,
  AddUserToOrganizationData,
} from '@src/services/user-service';
import jwt from 'jsonwebtoken';
import config from '@src/common/config';
import logger from '@src/common/logger';

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

router.post(
  '/im/auth/token',
  context(async (req) => {
    const user = await req.services.auth.token(req.body);
    const token = jwt.sign(user, config.JWT_SECRET, { expiresIn: '6h' });
    return { token };
  })
);

// Signup
router.post(
  '/directory/users/signup',
  context(async (req, res) => {
    const user = await req.services.user.signup(req.body);
    const token = jwt.sign(user, config.JWT_SECRET, { expiresIn: '6h' });
    res.status(201);
    return { token };
  })
);

router.post(
  '/directory/users/login',
  context(async (req) => {
    const user = await req.services.user.login(req.body as LoginData);
    const token = jwt.sign(user, config.JWT_SECRET, { expiresIn: '6h' });
    return { token };
  })
);

// User profile
router.get(
  '/directory/users/me',
  authenticate,
  context(async (req) => {
    const user = await req.services.user.getMyProfile(
      req.context.email,
      req.context.organizationId
    );
    return user;
  })
);

// Password reset
router.post(
  '/directory/users/forgot-password',
  context(async (req) => {
    const result = await req.services.user.forgotPassword(req.body);
    return result;
  })
);

router.post(
  '/directory/users/reset-password',
  context(async (req) => {
    const result = await req.services.user.resetPassword(req.body);
    return result;
  })
);

router.get(
  '/directory/users/verify-reset-token/:token',
  context(async (req) => {
    const result = await req.services.user.verifyResetToken(req.params.token);
    return result;
  })
);

// Organization list and search, only show organizations the user is allowed to see.
router.get(
  '/directory/organizations',
  authenticate,
  context(async (req) => {
    return req.services.organization.list(req.context, {
      query: req.query.query as string,
    });
  })
);

// Organization list and search, only show organizations the user is allowed to see.
router.get(
  '/directory/organizations/:id',
  authenticate,
  context(async (req) => {
    return req.services.organization.get(req.context, parseInt(req.params.id));
  })
);

// List all users in an organization.
router.get(
  '/directory/organizations/:id/users',
  authenticate,
  context(async (req) => {
    return req.services.organization.listMembers(
      req.context,
      parseInt(req.params.id)
    );
  })
);

// Add a user to an organization
router.post(
  '/directory/organizations/:id/users',
  authenticate,
  context(async (req) => {
    const organizationId = parseInt(req.params.id);
    return req.services.user.addUserToOrganization(
      req.context,
      organizationId,
      req.body as AddUserToOrganizationData
    );
  })
);

// Retrieve users from the organization
router.get(
  '/directory/organizations/:id/users',
  authenticate,
  context(async (req) => {
    const organizationId = parseInt(req.params.id);
    return req.services.organization.listMembers(req.context, organizationId);
  })
);

router.get(
  '/directory/organizations/:oid/users/:uid',
  authenticate,
  context(async (req) => {
    const organizationId = parseInt(req.params.oid);
    const userId = parseInt(req.params.uid);

    return req.services.organization.getMember(
      req.context,
      organizationId,
      userId
    );
  })
);

router.post(
  '/directory/organizations/:oid/users/:uid',
  authenticate,
  context(async (req) => {
    const organizationId = parseInt(req.params.oid);
    const userId = parseInt(req.params.uid);

    return req.services.organization.updateMember(
      req.context,
      organizationId,
      userId,
      req.body as { fullName?: string; role?: string }
    );
  })
);

// Connections between organizations
router.post(
  '/directory/organizations/:id/connections',
  authenticate,
  context(async (req) => {
    return req.services.connection.listConnections(
      req.context,
      parseInt(req.params.id)
    );
  })
);

// Connections between organizations
router.post(
  '/directory/organizations/create-connection-request',
  authenticate,
  context(async (req) => {
    return req.services.connection.createConnectionRequest(
      req.context,
      req.context.organizationId,
      req.body.requestedOrganizationId
    );
  })
);

router.post(
  '/directory/organizations/connection-request-action',
  authenticate,
  context(async (req) => {
    return req.services.connection.acceptConnectionRequest(
      req.body.requestId,
      req.context.organizationId
    );
  })
);

// Proxy routes to Conformance service
router.post(
  '/proxy/test',
  authenticate,
  context(async (req) => {
    return req.services.testRun.createTestRun(req.context, req.body);
  })
);

router.get(
  '/proxy/test-runs',
  authenticate,
  context(async (req) => {
    return req.services.testRun.listTestRuns(req.context, req.query);
  })
);

router.get(
  '/proxy/test-results',
  authenticate,
  context(async (req) => {
    return req.services.testRun.getTestResults(
      req.context,
      req.query.testRunId as string
    );
  })
);

export default router;
