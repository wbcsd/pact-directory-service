import dotenv from "dotenv";
import path from "path";

// Load environment variables from .env files

const nodeEnv = getEnvVarDefaultOrThrow("NODE_ENV");

/* eslint-disable n/no-process-env */
dotenv.config({
  path: [
    path.resolve(process.cwd(), `.env`),
    path.resolve(process.cwd(), `./env/${nodeEnv}.env`),
    path.resolve(__dirname, `../../env/${nodeEnv}.env`),
  ],
});

// Use only in case of development or testing
const conformanceAPIBaseUrl = getEnvVarDefaultOrThrow(
  "CONFORMANCE_API",
  nodeEnv === "production" ? "" : undefined
);

/* eslint-disable n/no-process-env */
const values = {
  NodeEnv: nodeEnv,
  Port: getEnvVarDefaultOrThrow("PORT"),
  CookieProps: {
    Key: "ExpressGeneratorTs",
    Secret: process.env.COOKIE_SECRET ?? "",
    // Casing to match express cookie options
    Options: {
      httpOnly: true,
      signed: true,
      path: process.env.COOKIE_PATH ?? "",
      maxAge: Number(process.env.COOKIE_EXP ?? 0),
      domain: process.env.COOKIE_DOMAIN ?? "",
      secure: process.env.SECURE_COOKIE === "true",
    },
  },
  Jwt: {
    Secret: process.env.JWT_SECRET ?? "",
    Exp: process.env.COOKIE_EXP ?? "", // exp at the same time as the cookie
  },
  DirectoryDatabase: {
    Host: getEnvVarDefaultOrThrow("DIR_DB_HOST"),
    User: getEnvVarDefaultOrThrow("DIR_DB_USER"),
    Password: getEnvVarDefaultOrThrow("DIR_DB_PASSWORD"),
    Database: getEnvVarDefaultOrThrow("DIR_DB_NAME"),
  },
  EmailNotificationTemplates: {
    Welcome: process.env.EMAIL_WELCOME_TEMPLATE ?? "",
    ResetPassword: process.env.EMAIL_RESET_TEMPLATE ?? "",
  },
  Sendgrid: {
    ApiKey: process.env.SENDGRID_API_KEY ?? "",
    FromEmail: process.env.SENDGRID_FROM_EMAIL ?? "",
  },
  Frontend: {
    Url: process.env.FRONTEND_URL ?? "http://localhost:5173",
  },
  ConformanceApi: {
    RunTestCasesUrl: `${conformanceAPIBaseUrl}/runTestCases`,
    RecentTestRunsUrl: `${conformanceAPIBaseUrl}/getRecentTestRuns`,
    TestResultsUrl: `${conformanceAPIBaseUrl}/getTestResults`,
  },
};

// Function to get environment variable or throw an error if not se
function getEnvVarDefaultOrThrow(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (value === undefined || value === null) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Environment variable ${key} is not set`);
  }
  return value;
}

export default values;

if (require.main == module) {
  // If this file is run directly, log the environment variables
  console.log("Configuration files scanned:", [
    path.resolve(process.cwd(), `.env`),
    path.resolve(process.cwd(), `./env/${process.env.NODE_ENV}.env`),
    path.resolve(__dirname, `../../env/${process.env.NODE_ENV}.env`),
  ]);
  console.log("Configuration:", values);
}
