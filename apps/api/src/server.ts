import morgan from "morgan";
import helmet from "helmet";
import express from "express";

import config from "@src/common/config";
import logger, { loggerMiddleware } from "@src/util/logger";

import "express-async-errors";
import cors from "cors";

import BaseRouter from "@src/routes";
import AuthRouter from "@src/routes/AuthRouter";
import ProxyRouter from "@src/routes/ProxyRouter";

const app = express();

// **** Setup **** //

// Basic middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Pino logging middleware
app.use(loggerMiddleware);

// Show routes called in console during development
if (config.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Security
if (config.NODE_ENV === "production") {
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
app.use("/api/directory", BaseRouter);
app.use("/api/im", AuthRouter);
app.use("/api", ProxyRouter);


export default app;
