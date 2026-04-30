import type { PaginationInfo } from "../../../src/components/PaginatedDataTable";

export function makePaginated<T>(
  data: T[],
  overrides?: Partial<PaginationInfo>
): { data: T[]; pagination: PaginationInfo } {
  return {
    data,
    pagination: {
      page: 1,
      pageSize: 10,
      total: data.length,
      totalPages: 1,
      hasNext: false,
      hasPrevious: false,
      ...overrides,
    },
  };
}
