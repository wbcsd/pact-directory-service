import { Router } from "express";

import Paths from "../common/Paths";
import UserRoutes from "./UserRoutes";
import CompanyRoutes from "./CompanyRoutes";
import jwtAuthMiddleware from "./common/jwt-auth-middleware";

// **** Variables **** //

const apiRouter = Router();

// ** Add UserRouter ** //
const userRouter = Router();

// ** Add CompanyRouter ** //
const companyRouter = Router();

// Get all users
userRouter.get(Paths.Users.Get, UserRoutes.getAll);
userRouter.post(Paths.Users.Add, UserRoutes.add);
userRouter.put(Paths.Users.Update, UserRoutes.update);
userRouter.delete(Paths.Users.Delete, UserRoutes.delete);

// Signup & Login
companyRouter.post(Paths.Companies.Signup, CompanyRoutes.signup);
companyRouter.post(Paths.Companies.Login, CompanyRoutes.login);

// Password reset
companyRouter.post(
  Paths.Companies.ForgotPassword,
  CompanyRoutes.forgotPassword
);
companyRouter.post(Paths.Companies.ResetPassword, CompanyRoutes.resetPassword);
companyRouter.get(
  Paths.Companies.VerifyResetToken,
  CompanyRoutes.verifyResetToken
);

// Private routes
companyRouter.get(
  Paths.Companies.MyProfile,
  jwtAuthMiddleware,
  CompanyRoutes.myProfile
);
companyRouter.get(
  Paths.Companies.Profile,
  jwtAuthMiddleware,
  CompanyRoutes.getCompany
);
companyRouter.get(
  Paths.Companies.Search,
  jwtAuthMiddleware,
  CompanyRoutes.searchCompanies
);
companyRouter.post(
  Paths.Companies.CreateConnectionRequest,
  jwtAuthMiddleware,
  CompanyRoutes.createConnectionRequest
);
companyRouter.post(
  Paths.Companies.ConnectionRequesAction,
  jwtAuthMiddleware,
  CompanyRoutes.connectionRequestAction
);

// Add UserRouter
apiRouter.use(Paths.Users.Base, userRouter);

// Add CompanyRouter
apiRouter.use(Paths.Companies.Base, companyRouter);

// **** Export default **** //

export default apiRouter;
