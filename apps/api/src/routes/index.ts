import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/authentication';
import companyController from '../controllers/CompanyController';
import authController from '../controllers/AuthController';
import proxyController from '../controllers/ProxyController';

const router = Router();

// Auth token
router.post(
  '/im/auth/token',
  (req: Request, res: Response, next: NextFunction) =>
    authController.token(req, res, next)
);

// Signup & Login
router.post(
  '/directory/companies/signup',
  (req: Request, res: Response, next: NextFunction) =>
    companyController.signup(req, res, next)
);

router.post(
  '/directory/companies/login',
  (req: Request, res: Response, next: NextFunction) =>
    companyController.login(req, res, next)
);

// Password reset
router.post(
  '/directory/companies/forgot-password',
  (req: Request, res: Response, next: NextFunction) =>
    companyController.forgotPassword(req, res, next)
);

router.post(
  '/directory/companies/reset-password',
  (req: Request, res: Response, next: NextFunction) =>
    companyController.resetPassword(req, res, next)
);

router.get(
  '/directory/companies/verify-reset-token/:token',
  (req: Request, res: Response, next: NextFunction) =>
    companyController.verifyResetToken(req, res, next)
);

// Organizations
router.get(
  '/directory/organizations/users',
  authenticate,
  (req: Request, res: Response, next: NextFunction) =>
    companyController.getOrganizationUsers(req, res, next)
);

// Company profile and search
router.get(
  '/directory/companies/my-profile',
  authenticate,
  (req: Request, res: Response, next: NextFunction) =>
    companyController.myProfile(req, res, next)
);

router.get(
  '/directory/companies/profile/:id',
  authenticate,
  (req: Request, res: Response, next: NextFunction) =>
    companyController.getCompany(req, res, next)
);

router.get(
  '/directory/companies/search',
  authenticate,
  (req: Request, res: Response, next: NextFunction) =>
    companyController.searchCompanies(req, res, next)
);

router.post(
  '/directory/companies/create-connection-request',
  authenticate,
  (req: Request, res: Response, next: NextFunction) =>
    companyController.createConnectionRequest(req, res, next)
);

router.post(
  '/directory/companies/connection-request-action',
  authenticate,
  (req: Request, res: Response, next: NextFunction) =>
    companyController.connectionRequestAction(req, res, next)
);

// Proxy routes to Conformance service
router.post(
  '/proxy/test',
  authenticate,
  (req: Request, res: Response, next: NextFunction) =>
    proxyController.createTestRun(req, res, next)
);

router.get(
  '/proxy/test-runs',
  authenticate,
  (req: Request, res: Response, next: NextFunction) =>
    proxyController.listTestRuns(req, res, next)
);

router.get(
  '/proxy/test-results',
  authenticate,
  (req: Request, res: Response, next: NextFunction) =>
    proxyController.getTestResults(req, res, next)
);

export default router;
