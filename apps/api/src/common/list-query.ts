// Common query parameters interface for list operations
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

  static parse(query: any): ListQuery {
    return new ListQuery(query);
  }

  static default(): ListQuery {
    return new ListQuery({});
  }
}

// Result wrapper for paginated lists
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

// Common sorting configuration
export interface SortConfig {
  [field: string]: {
    column: string;
    allowedRoles?: string[];
  };
}

// Common filter configuration  
export interface FilterConfig {
  [field: string]: {
    column: string;
    operator: 'equals' | 'ilike' | 'in' | 'gte' | 'lte';
    allowedRoles?: string[];
  };
}

/**
 * Helper function to parse query parameters into standardized ListQuery format
 */
export function parseListQuery(query: any): ListQuery {
  return ListQuery.parse(query);
}
