/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',

  // Path alias support (matches your tsconfig.json)
  moduleNameMapper: {
    '^@src/(.*)$': '<rootDir>/src/$1',
    '^pact-data-model$': '<rootDir>/../../packages/pact-data-model/src/index.ts',
    '^pact-data-model/(.*)$': '<rootDir>/../../packages/pact-data-model/src/$1',
    '^pact-api-client$': '<rootDir>/../../packages/pact-api-client/src/index.ts',
    '^pact-api-client/(.*)$': '<rootDir>/../../packages/pact-api-client/src/$1',
  },

  testMatch: [
    '**/__tests__/**/*.test.ts?(x)',
    '**/?(*.)+(spec|test).ts?(x)',
  ],

  roots: ['<rootDir>/src'],

  // ✅ NEW way: configure ts-jest directly under "transform"
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.json',
      },
    ],
  },
};
