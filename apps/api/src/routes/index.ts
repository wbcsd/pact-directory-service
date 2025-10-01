import { Router } from 'express';
import { authenticate } from '../middleware/authentication';
import * as UserController from '../controllers/user-controller';
import * as OrganizationController from '../controllers/organization-controller';
import * as AuthController from '../controllers/auth-controller';
import * as ProxyController from '../controllers/proxy-controller';

const router = Router();

// Auth token
router.post('/im/auth/token', AuthController.token);

// Signup & Login
router.post('/directory/users/signup', UserController.signup);
router.post('/directory/users/login', UserController.login);

// User profile
router.get('/directory/users/me', authenticate, UserController.myProfile);

// Password reset
router.post('/directory/users/forgot-password', UserController.forgotPassword);
router.post('/directory/users/reset-password', UserController.resetPassword);
router.get('/directory/users/verify-reset-token/:token', UserController.verifyResetToken);

// Organization list and search
router.get('/directory/organizations/:id', authenticate, OrganizationController.get);
router.get('/directory/organizations', authenticate, OrganizationController.list);

// Connections between organizations
router.post('/directory/organizations/create-connection-request', authenticate, OrganizationController.createConnectionRequest);
router.post('/directory/organizations/connection-request-action', authenticate, OrganizationController.connectionRequestAction);

// Proxy routes to Conformance service
router.post('/proxy/test', authenticate, ProxyController.createTestRun);
router.get('/proxy/test-runs', authenticate, ProxyController.listTestRuns);
router.get('/proxy/test-results', authenticate, ProxyController.getTestResults);

export default router;
