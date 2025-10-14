import dotenv from 'dotenv';

// Load environment variables from .env files
dotenv.config();

// Get a required environment variable or throw an error
function required(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
}

// Get a boolean environment variable or default
function bool(key: string, fallback?: boolean): boolean {
  const value = process.env[key] ?? (fallback ? 'true' : 'false');
  return ['true', '1', 'y', 'yes'].includes(value.trim().toLowerCase());
}

// Get an integer environment variable or default
function int(key: string, fallback?: number): number {
  const value = process.env[key] ?? fallback ?? '0';
  return parseInt(value as string, 10);
}

export default {
  NODE_ENV: required('NODE_ENV'),
  PORT: required('PORT'),
  DB_CONNECTION_STRING: required('DB_CONNECTION_STRING'),
  CONFORMANCE_API_INTERNAL: required('CONFORMANCE_API_INTERNAL', required('CONFORMANCE_API')),
  LOG_OUTPUT: process.env.LOG_OUTPUT ?? 'pino',
  LOG_LEVEL: process.env.LOG_LEVEL ?? 'info',
  FRONTEND_URL: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  COOKIE_PATH: process.env.COOKIE_PATH ?? '',
  COOKIE_SECRET: process.env.COOKIE_SECRET ?? '',
  COOKIE_EXP: int('COOKIE_EXP', 0),
  COOKIE_DOMAIN: process.env.COOKIE_DOMAIN ?? '',
  DEFAULT_PAGE_SIZE: int('DEFAULT_PAGE_SIZE', 50),
  JWT_SECRET: required('JWT_SECRET'),
  JWT_EXP: int('JWT_EXP', 21600), // Default to 6 hours
  EMAIL_VERIFICATION_EXP: int('EMAIL_VERIFICATION_EXP', 21600), // Default to 6 hours
  SENDGRID_API_KEY: process.env.SENDGRID_API_KEY ?? '',
  SENDGRID_FROM_EMAIL: process.env.SENDGRID_FROM_EMAIL ?? '',
  ENABLE_OPENAPI_VALIDATION: bool('ENABLE_OPENAPI_VALIDATION'),
};
