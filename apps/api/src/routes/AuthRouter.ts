import { Router } from "express";

import Paths from "../common/Paths";

import AuthRouter from "./AuthRoutes";

const apiRouter = Router();

const authRouter = Router();

authRouter.post(Paths.Auth.Token, AuthRouter.token);

apiRouter.use(Paths.Auth.Base, authRouter);

export default apiRouter;
