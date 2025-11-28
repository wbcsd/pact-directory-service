/**
 * Database mocking utilities for consistent test setup across services
 */

// Standard mock functions that can be reused
export const createMockExecutors = () => ({
  execute: jest.fn(),
  executeTakeFirst: jest.fn(),
  executeTakeFirstOrThrow: jest.fn(),
});

// Standard query chain mock that works for most Kysely operations
export const createMockQueryChain = (executors = createMockExecutors()) => ({
  // Selection methods
  selectFrom: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  selectAll: jest.fn().mockReturnThis(),
  clearSelect: jest.fn().mockReturnThis(),
  
  // Join methods
  leftJoin: jest.fn().mockReturnThis(),
  innerJoin: jest.fn().mockReturnThis(),
  rightJoin: jest.fn().mockReturnThis(),
  
  // Filter methods
  where: jest.fn().mockReturnThis(),

  // Order methods
  orderBy: jest.fn().mockReturnThis(),
  orderByDesc: jest.fn().mockReturnThis(),
  
  // Modification methods
  insertInto: jest.fn().mockReturnThis(),
  updateTable: jest.fn().mockReturnThis(),
  values: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
  returningAll: jest.fn().mockReturnThis(),
  
  // Pagination
  offset: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  
  // CTE methods
  withRecursive: jest.fn().mockReturnThis(),
  unionAll: jest.fn().mockReturnThis(),

  // grouping methods
  groupBy: jest.fn().mockReturnThis(),

  // $if
  $if: jest.fn().mockReturnThis(),
  $call: jest.fn().mockReturnThis(),
  
  // Execution methods
  ...executors,
});

// Standard database mock factory
export const createMockDatabase = () => {
  const executors = createMockExecutors();
  const queryChain = createMockQueryChain(executors);
  
  const mockTransaction = jest.fn().mockReturnValue({
    execute: jest.fn(),
  });
  
  const db = {
    // Main query methods
    selectFrom: jest.fn().mockReturnValue(queryChain),
    insertInto: jest.fn().mockReturnValue(queryChain),
    updateTable: jest.fn().mockReturnValue(queryChain),
    withRecursive: jest.fn().mockReturnValue(queryChain),
    
    // Transaction support
    transaction: mockTransaction,
  };
  
  return {
    db,
    executors,
    queryChain,
    transaction: mockTransaction,
  };
};

// Helper to reset all mocks in the database mock
export const resetDatabaseMocks = (mocks: ReturnType<typeof createMockDatabase>) => {
  Object.values(mocks.executors).forEach(mock => mock.mockReset());
  mocks.transaction.mockReset();
  // Reset the transaction execute mock too
  mocks.transaction().execute.mockReset();
};