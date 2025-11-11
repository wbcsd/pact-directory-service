import React, { useState, useEffect, useCallback } from "react";
import { Box, TextField, Button, Text } from "@radix-ui/themes";
import { MagnifyingGlassIcon, ReloadIcon } from "@radix-ui/react-icons";
import DataTable, { Column } from "./DataTable";
import "./SearcheableDataTable.css";

export interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface DataTableWithSearchProps<T> {
  // Display configuration
  title: string;
  subtitle?: string;
  searchPlaceholder?: string;
  
  // Data fetching
  fetchData: (params: {
    page: number;
    pageSize: number;
    search?: string;
  }) => Promise<{ data: T[]; pagination: PaginationInfo }>;
  
  // Table configuration
  columns: Column<T>[];
  idColumnName: keyof T;
  
  // Optional configurations
  defaultPageSize?: number;
  emptyState?: {
    title: string;
    description?: string;
    action?: React.ReactNode;
  };
  
  // Header actions (e.g., "Add New" button)
  headerActions?: React.ReactNode;
  
  // Refresh trigger - increment this to force a refresh
  refreshTrigger?: number;
  
  // Search debounce delay in ms
  searchDebounceMs?: number;
}

function SearchableDataTable<T extends object>({
  title,
  subtitle,
  searchPlaceholder = "Search...",
  fetchData,
  columns,
  idColumnName,
  defaultPageSize = 50,
  emptyState,
  headerActions,
  refreshTrigger = 0,
  searchDebounceMs = 500,
}: DataTableWithSearchProps<T>) {
  const [data, setData] = useState<T[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    pageSize: defaultPageSize,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrevious: false,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounce search term
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, searchDebounceMs);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm, searchDebounceMs]);

  // Fetch data function
  const loadData = useCallback(
    async (page: number, search?: string) => {
      setIsLoading(true);
      setError(null);
      
      try {
        const result = await fetchData({
          page,
          pageSize: pagination.pageSize,
          search: search || undefined,
        });
        
        setData(result.data);
        setPagination(result.pagination);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(
          err instanceof Error
            ? err.message
            : "An unexpected error occurred while fetching data."
        );
        setData([]);
      } finally {
        setIsLoading(false);
      }
    },
    [fetchData, pagination.pageSize]
  );

  // Load data when page or search changes
  useEffect(() => {
    loadData(1, debouncedSearchTerm);
  }, [debouncedSearchTerm, refreshTrigger, loadData]);

  // Handle page change
  const handlePageChange = (newPage: number) => {
    loadData(newPage, debouncedSearchTerm);
  };

  // Handle refresh
  const handleRefresh = () => {
    loadData(pagination.page, debouncedSearchTerm);
  };

  return (
    <Box className="data-table-with-search">
      {/* Header Section */}
      <Box className="table-header">
        <Box className="table-header-text">
          <h2>{title}</h2>
          {subtitle && (
            <Text size="2" style={{ color: "#888" }}>
              {subtitle}
            </Text>
          )}
        </Box>
        <Box className="table-header-actions">{headerActions}</Box>
      </Box>

      {/* Search and Controls */}
      <Box className="table-controls">
        <Box className="search-container">
          <MagnifyingGlassIcon className="search-icon" />
          <TextField.Root
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </Box>
        <Button
          variant="soft"
          onClick={handleRefresh}
          disabled={isLoading}
          className="refresh-button"
        >
          <ReloadIcon />
          Refresh
        </Button>
      </Box>

      {/* Results Count */}
      {!isLoading && !error && (
        <Box className="results-info">
          <Text size="2" style={{ color: "#888" }}>
            Showing {data.length} of {pagination.total} result
            {pagination.total !== 1 ? "s" : ""}
            {debouncedSearchTerm && ` for "${debouncedSearchTerm}"`}
          </Text>
        </Box>
      )}

      {/* Data Table */}
      <DataTable<T>
        idColumnName={idColumnName}
        data={data}
        columns={columns}
        isLoading={isLoading}
        error={error}
        emptyState={emptyState}
      />

      {/* Pagination Controls */}
      {!error && data.length > 0 && (
        <Box className="pagination-controls">
          <Box className="pagination-info">
            <Text size="2" style={{ color: "#888" }}>
              Page {pagination.page} of {pagination.totalPages}
            </Text>
          </Box>
          <Box className="pagination-buttons">
            <Button
              variant="soft"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={!pagination.hasPrevious || isLoading}
            >
              Previous
            </Button>
            <Button
              variant="soft"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={!pagination.hasNext || isLoading}
            >
              Next
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
}

export default SearchableDataTable;