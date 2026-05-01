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
};
