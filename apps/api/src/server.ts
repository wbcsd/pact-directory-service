import express from 'express';
import path from 'path';
import morgan from 'morgan';
import helmet from 'helmet';
import 'express-async-errors';
import cors from 'cors';
import * as OpenApiValidator from 'express-openapi-validator';

import config from '@src/common/config';
import { db } from './database/db';
import { errorHandler } from './middleware/error-handler';
import { ServiceContainer } from './services';
import { loggerMiddleware } from '@src/util/logger';
import BaseRouter from '@src/routes';

const app = express();

// Initialize service container
const services = new ServiceContainer(db);

// Make services available to routes via app.locals
app.locals.services = services;

// Basic middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging
app.use(loggerMiddleware);

// OpenAPI Validator Middleware
app.use(OpenApiValidator.middleware({
  apiSpec: path.join(__dirname, '..', 'openapi.yaml'),
  validateSecurity: false,
  validateRequests: true,
  validateResponses: true,
  ignoreUndocumented: false,
}));

// Show routes called in console during development
if (config.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Security
if (config.NODE_ENV === 'production') {
  app.use(helmet());
}

// Define health check route
app.get('/health-check', (_, res) => {
  res.status(200).send({
    status: 'OK',
    service: process.env.SERVICE_NAME,
    git_commit: process.env.RENDER_GIT_COMMIT ?? 'N/A',
    render_service_name: process.env.RENDER_SERVICE_NAME ?? 'N/A',
    render_service_type: process.env.RENDER_SERVICE_TYPE ?? 'N/A',
  });
});

// Add API routes
app.use('/api', BaseRouter);

// Error handler middleware
app.use(errorHandler);

export default app;
