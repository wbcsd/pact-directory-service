import morgan from "morgan";
import helmet from "helmet";
import express, { Request, Response, NextFunction } from "express";

import logger, { loggerMiddleware } from "@src/util/logger";

import "express-async-errors";
import cors from "cors";

import BaseRouter from "@src/routes";
import AuthRouter from "@src/routes/AuthRouter";
import ProxyRouter from "@src/routes/ProxyRouter";

import Paths from "@src/common/Paths";
import EnvVars from "@src/common/EnvVars";
import HttpStatusCodes from "@src/common/HttpStatusCodes";
import { RouteError } from "@src/common/classes";
import { NodeEnvs } from "@src/common/misc";

// **** Variables **** //

const app = express();

// **** Setup **** //

// Basic middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Pino logging middleware
app.use(loggerMiddleware);

// Show routes called in console during development
if (EnvVars.NodeEnv === NodeEnvs.Dev.valueOf()) {
  app.use(morgan("dev"));
}

// Security
if (EnvVars.NodeEnv === NodeEnvs.Production.valueOf()) {
  app.use(helmet());
}

// Define health check route
app.get("/health-check", (_, res) => {
  res.status(200).send({
    status: "OK",
    service: process.env.SERVICE_NAME,
    git_commit: process.env.RENDER_GIT_COMMIT ?? "N/A",
    render_service_name: process.env.RENDER_SERVICE_NAME ?? "N/A",
    render_service_type: process.env.RENDER_SERVICE_TYPE ?? "N/A",
  });
});

// Add APIs, must be after middleware
app.use(Paths.DirectoryBase, BaseRouter);
app.use(Paths.IdentityProviderBase, AuthRouter);
app.use(Paths.ProxyBase, ProxyRouter);

// Add error handler
app.use((err: Error, _: Request, res: Response, next: NextFunction) => {
  if (EnvVars.NodeEnv !== NodeEnvs.Test.valueOf()) {
    logger.error(err);
  }
  let status = HttpStatusCodes.INTERNAL_SERVER_ERROR;
  if (err instanceof RouteError) {
    status = err.status;
    res.status(status).json({ error: err.message });
  }
  return next(err);
});

// **** Export default **** //

export default app;
