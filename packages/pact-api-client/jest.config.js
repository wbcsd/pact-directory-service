/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^pact-data-model$': '<rootDir>/../pact-data-model/src/index.ts',
    '^pact-data-model/(.*)$': '<rootDir>/../pact-data-model/src/$1',
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
