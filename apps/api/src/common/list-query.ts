/**
 * A utility class for handling common list query operations including 
 * pagination, filtering, searching, and sorting.
 * 
 * This class parses query parameters from HTTP requests and provides 
 * a standardized way to handle:
 * - Pagination with page and pageSize parameters
 * - Text search functionality
 * - Dynamic filtering with key-value pairs
 * - Sorting by field and order
 * 
 * @example
 * ```typescript
 * // Parse from query object
 * const listQuery = new ListQuery({
 *   page: '2',
 *   pageSize: '25',
 *   search: 'john doe',
 *   sortBy: 'createdAt',
 *   sortOrder: 'desc',
 *   filters: { status: 'active', role: ['admin', 'user'] }
 * });
 * 
 * Usage in database query:
 * 
 * const qb = db.selectFrom();
 * if (listQuery.search) {
 *   qb = qb.where('name', 'like', `%${listQuery.search}%`);
 * }
 * if (listQuery.sortBy) {
 *   qb = qb.orderBy(listQuery.sortBy, listQuery.sortOrder);
 * }
 * qb = qb.offset(listQuery.offset).limit(listQuery.limit);
 * 
 **/
export class ListQuery {
  // Pagination
  page: number;
  pageSize: number;

  // Filtering
  search?: string;
  filters?: Record<string, string | string[]>;

  // Sorting
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';

  // Property offset = pageSize * (page - 1)
  get offset(): number {
    return this.pageSize * (this.page - 1);
  }

  // Property limit = pageSize
  get limit(): number {
    return this.pageSize;
  }

  // Generate pagination info based on total items
  pagination(total: number) {
    const totalPages = Math.ceil(total / this.pageSize);
    return {
      page: this.page,
      pageSize: this.pageSize,
      total,
      totalPages,
      hasNext: this.page < totalPages,
      hasPrevious: this.page > 1,
    };
  }

  // Construct from query object
  constructor(query: any, defaultPageSize: number = 50) {
    
    // Parse pagination
    this.page = 1;
    if (query.page) {
      const page = parseInt(query.page);
      if (!isNaN(page) && page > 0) {
        this.page = page;
      }
    }

    this.pageSize = defaultPageSize;
    if (query.pageSize) {
      const pageSize = parseInt(query.pageSize);
      if (!isNaN(pageSize) && pageSize > 0 && pageSize <= 100) {
        this.pageSize = pageSize;
      }
    }

    // Parse search
    if (query.search && typeof query.search === 'string') {
      this.search = query.search.trim();
    }

    // Parse sorting
    if (query.sortBy && typeof query.sortBy === 'string') {
      this.sortBy = query.sortBy;
    }

    if (query.sortOrder && (query.sortOrder === 'asc' || query.sortOrder === 'desc')) {
      this.sortOrder = query.sortOrder;
    }

    // Parse filters - expect format like: ?filters[status]=enabled&filters[role]=admin
    if (query.filters && typeof query.filters === 'object') {
      this.filters = {};
      for (const [key, value] of Object.entries(query.filters)) {
        if (typeof value === 'string' || Array.isArray(value)) {
          this.filters[key] = value;
        }
      }
    }
  }

  /**
   * Parses a query object and creates a new ListQuery instance.
   * 
   * @param query - The raw query object to be parsed into a ListQuery
   * @returns A new ListQuery instance created from the provided query object
   */
  static parse(query: any): ListQuery {
    return new ListQuery(query);
  }

  /**
   * Creates a new ListQuery instance with default empty parameters.
   * 
   * @returns A new ListQuery instance initialized with an empty configuration object
   */
  static default(): ListQuery {
    return new ListQuery({});
  }
}

/**
 * List result containing data and pagination metadata.
 * 
 * @template T - The type of items in the data array
 * 
 * @example
 * ```typescript
 * const result: ListResult<User> = {
 *   data: [{ id: 1, name: 'John' }],
 *   pagination: {
 *     page: 1,
 *     pageSize: 10,
 *     total: 1,
 *     totalPages: 1,
 *     hasNext: false,
 *     hasPrevious: false
 *   }
 * };
 * 
 * // populate pagination info
 * 
 * const totalItems = await db.countFrom('users').executeTakeFirst();
 * result.data = await db.selectFrom('users').execute();
 * result.pagination = listQuery.pagination(totalItems);
 * ```
 */
export interface ListResult<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

/**
 * Helper function to parse query parameters into standardized ListQuery format
 */
export function parseListQuery(query: any): ListQuery {
  return ListQuery.parse(query);
}
