import dotenv from "dotenv";

// Load environment variables from .env files
dotenv.config();

// Helper to get and validate required vars
function getEnvVar(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
}

/* eslint-disable n/no-process-env */
export default {
  NODE_ENV: getEnvVar("NODE_ENV"),
  PORT: getEnvVar("PORT"),
  DB_CONNECTION_STRING: getEnvVar("DB_CONNECTION_STRING"),
  CONFORMANCE_API_INTERNAL: getEnvVar("CONFORMANCE_API_INTERNAL", getEnvVar("CONFORMANCE_API")),
  LOG_OUTPUT: process.env.LOG_OUTPUT ?? "pino",
  LOG_LEVEL: process.env.LOG_LEVEL ?? "info",
  FRONTEND_URL: process.env.FRONTEND_URL ?? "http://localhost:5173",
  COOKIE_PATH: process.env.COOKIE_PATH ?? "",
  COOKIE_SECRET: process.env.COOKIE_SECRET ?? "",
  COOKIE_EXP: Number(process.env.COOKIE_EXP ?? 0),
  COOKIE_DOMAIN: process.env.COOKIE_DOMAIN ?? "",
  JWT_SECRET: process.env.JWT_SECRET ?? "",
  JWT_EXP: Number(process.env.JWT_EXP ?? 0),
  SENDGRID_API_KEY: process.env.SENDGRID_API_KEY ?? "",
  SENDGRID_FROM_EMAIL: process.env.SENDGRID_FROM_EMAIL ?? "",
};
