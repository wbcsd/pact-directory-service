/**
 * Jest global setup — runs before every test file via jest.config.js `setupFiles`.
 *
 * Sets the environment variables that config.ts requires() so tests work in CI
 * where no .env file is present. Values are intentionally minimal/fake; no real
 * database, mail server, or external service is contacted during unit tests.
 */
process.env.NODE_ENV = "development";
process.env.PORT = "3010";
process.env.DB_CONNECTION_STRING = "postgresql://postgres:postgres@localhost/pact_test";
process.env.CONFORMANCE_API = "http://localhost:8004";
process.env.JWT_SECRET = "test-jwt-secret";
process.env.DIRECTORY_API = "http://localhost:3010";
