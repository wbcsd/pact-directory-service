/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^pact-data-model$': '<rootDir>/../pact-data-model/src/index.ts',
  },
  testMatch: ['**/?(*.)+(spec|test).ts?(x)'],
  roots: ['<rootDir>/src'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.json',
      },
    ],
  },
};
