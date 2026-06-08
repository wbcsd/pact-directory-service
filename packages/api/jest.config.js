const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('./tsconfig.json');

/** @type {import('jest').Config} */
module.exports = {
  // Rely on ts-jest to handle TypeScript files
  preset: 'ts-jest',
  testEnvironment: 'node',

  // Automatically derived from tsconfig.json paths
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, { prefix: '<rootDir>/' }),

  // Specify the root directory for Jest to look for tests and modules
  roots: ['<rootDir>/src'],

  // Runs before each test file's module scope — sets required env vars so
  // config.ts doesn't throw in CI where no .env file exists.
  setupFiles: ['<rootDir>/jest.setup.ts'],
};
