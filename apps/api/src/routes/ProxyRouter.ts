import { Router } from "express";

import Paths from "../common/Paths";

import ProxyRouter from "./ProxyRoutes";
import jwtAuthMiddleware from "./common/jwt-auth-middleware";

const apiRouter = Router();

const proxyRouter = Router();

proxyRouter.post(Paths.Proxy.Test, jwtAuthMiddleware, ProxyRouter.runTestCases);
proxyRouter.get(
  Paths.Proxy.TestResults,
  jwtAuthMiddleware,
  ProxyRouter.getTestResults
);
proxyRouter.get(
  Paths.Proxy.recentTestRuns,
  jwtAuthMiddleware,
  ProxyRouter.getRecentTestRuns
);

apiRouter.use(Paths.Proxy.Base, proxyRouter);

export default apiRouter;
