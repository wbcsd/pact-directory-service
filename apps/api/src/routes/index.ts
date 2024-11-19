import { Router } from "express";

import Paths from "../common/Paths";
import UserRoutes from "./UserRoutes";
import CompanyRoutes from "./CompanyRoutes";

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

// Signup
companyRouter.post(Paths.Companies.Signup, CompanyRoutes.signup);
companyRouter.post(Paths.Companies.Login, CompanyRoutes.login);
// TODO: the following routes should be protected with the jwt auth middleware
companyRouter.get(Paths.Companies.MyProfile, CompanyRoutes.myProfile);
companyRouter.get(Paths.Companies.Profile, CompanyRoutes.getCompany);
companyRouter.get(Paths.Companies.Search, CompanyRoutes.searchCompanies);
companyRouter.post(
  Paths.Companies.CreateConnectionRequest,
  CompanyRoutes.createConnectionRequest
);

// Add UserRouter
apiRouter.use(Paths.Users.Base, userRouter);

// Add CompanyRouter
apiRouter.use(Paths.Companies.Base, companyRouter);

// **** Export default **** //

export default apiRouter;
