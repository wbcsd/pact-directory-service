import { Router } from "express";
import authenticate from "../middleware/jwt-auth-middleware";
import CompanyRoutes from "./CompanyRoutes";

const router = Router();

// Signup & Login
router.post("/companies/signup", CompanyRoutes.signup);
router.post("/companies/login", CompanyRoutes.login);

// Password reset
router.post("/companies/forgot-password", CompanyRoutes.forgotPassword);
router.post("/companies/reset-password", CompanyRoutes.resetPassword);
router.get("/companies/verify-reset-token", CompanyRoutes.verifyResetToken);

// Private routes
router.get("/companies/my-profile", authenticate, CompanyRoutes.myProfile);
router.get("/companies/profile", authenticate, CompanyRoutes.getCompany);
router.get("/companies/search", authenticate, CompanyRoutes.searchCompanies);
router.post("/companies/create-connection-request", authenticate, CompanyRoutes.createConnectionRequest);
router.post("/companies/connection-request-action", authenticate, CompanyRoutes.connectionRequestAction);

export default router;
