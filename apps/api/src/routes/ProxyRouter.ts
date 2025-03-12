import { Router } from "express";

import Paths from "../common/Paths";

import ProxyRouter from "./ProxyRoutes";

const apiRouter = Router();

const proxyRouter = Router();

proxyRouter.post(Paths.Proxy.Test, ProxyRouter.runTestCases);
proxyRouter.get(Paths.Proxy.TestResults, ProxyRouter.getTestResults);

apiRouter.use(Paths.Proxy.Base, proxyRouter);

export default apiRouter;
