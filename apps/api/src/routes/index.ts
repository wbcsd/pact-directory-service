import { Router } from "express";
import authenticate from "../middleware/jwt-auth-middleware";
import CompanyController from "../controllers/CompanyController";
import ProxyController from "../controllers/ProxyController";
import AuthController from "../controllers/AuthController";

const router = Router();

// Auth token
router.post("/im/auth/token", AuthController.token);

// Signup & Login
router.post("/directory/companies/signup", CompanyController.signup);
router.post("/directory/companies/login", CompanyController.login);

// Password reset
router.post("/directory/companies/forgot-password", CompanyController.forgotPassword);
router.post("/directory/companies/reset-password", CompanyController.resetPassword);
router.get("/directory/companies/verify-reset-token", CompanyController.verifyResetToken);

// Company profile and search
router.get("/directory/companies/my-profile", authenticate, CompanyController.myProfile);
router.get("/directory/companies/profile", authenticate, CompanyController.getCompany);
router.get("/directory/companies/search", authenticate, CompanyController.searchCompanies);
router.post("/directory/companies/create-connection-request", authenticate, CompanyController.createConnectionRequest);
router.post("/directory/companies/connection-request-action", authenticate, CompanyController.connectionRequestAction);

// Proxy routes to Conformance service
router.post("/proxy/test", authenticate, ProxyController.runTestCases);
router.get("/proxy/test-results", authenticate, ProxyController.getTestResults);
router.get("/proxy/test-runs", authenticate, ProxyController.getOrSearchTestRuns);


export default router;
