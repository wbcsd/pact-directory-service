import React, { useState, useEffect, useCallback, useRef } from "react";
import { Box } from "@radix-ui/themes";
import { MagnifyingGlassIcon, Cross2Icon } from "@radix-ui/react-icons";
import DataTable, { Column } from "./DataTable";
import "./PaginatedDataTable.css";

export interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface PaginatedDataTableProps<T> {
  // Search configuration
  isSearchable?: boolean;
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

  // Optional selection support
  selectable?: boolean;
  selectedIds?: (string | number)[];
  onSelectionChange?: (selectedIds: (string | number)[]) => void;
  selectAllText?: string;
  disabledRowIds?: (string | number)[];

  // Row click handler
  onRowClick?: (row: T) => void;

  // Notify parent when data loads
  onDataLoaded?: (data: T[]) => void;
  
  // Refresh trigger - increment this to force a refresh
  refreshTrigger?: number;
  
  // Search debounce delay in ms
  searchDebounceMs?: number;
}

function PaginatedDataTable<T extends object>({
  isSearchable = true,
  searchPlaceholder = "Search...",
  fetchData,
  columns,
  idColumnName,
  defaultPageSize = 50,
  emptyState,
  headerActions,
  selectable = false,
  selectedIds,
  onSelectionChange,
  selectAllText,
  disabledRowIds,
  onRowClick,
  onDataLoaded,
  refreshTrigger = 0,
  searchDebounceMs = 500,
}: PaginatedDataTableProps<T>) {
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
  const [isLoading, setIsLoading] = useState(true);
  const [showSpinner, setShowSpinner] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const spinnerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep stable refs for callback props to avoid re-triggering effects
  const fetchDataRef = useRef(fetchData);
  fetchDataRef.current = fetchData;
  const onDataLoadedRef = useRef(onDataLoaded);
  onDataLoadedRef.current = onDataLoaded;

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

      // Debounce the spinner: only show after 200ms to avoid flash for fast responses
      if (spinnerTimerRef.current) clearTimeout(spinnerTimerRef.current);
      spinnerTimerRef.current = setTimeout(() => setShowSpinner(true), 200);
      
      try {
        const result = await fetchDataRef.current({
          page,
          pageSize: defaultPageSize,
          search: search || undefined,
        });

        if (!result || !result.data || !result.pagination) {
          console.error("Invalid data format received from fetchData:", result);
          throw new Error("An unknown error has occurred.");
        }
        
        setData(result.data);
        setPagination(result.pagination);
        onDataLoadedRef.current?.(result.data);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(
          err instanceof Error
            ? err.message
            : "An unexpected error occurred while fetching data."
        );
        setData([]);
        onDataLoadedRef.current?.([]);
      } finally {
        if (spinnerTimerRef.current) clearTimeout(spinnerTimerRef.current);
        spinnerTimerRef.current = null;
        setShowSpinner(false);
        setIsLoading(false);
      }
    },
    [defaultPageSize]
  );

  // Clean up spinner timer on unmount
  useEffect(() => {
    return () => {
      if (spinnerTimerRef.current) clearTimeout(spinnerTimerRef.current);
    };
  }, []);

  // Load data when search or refreshTrigger changes
  useEffect(() => {
    loadData(1, debouncedSearchTerm);
  }, [debouncedSearchTerm, refreshTrigger, loadData]);

  // Handle page change
  const handlePageChange = (newPage: number) => {
    loadData(newPage, debouncedSearchTerm);
  };

  // Handle refresh
  const handleSearch = () => {
    loadData(1, searchTerm || undefined);
  };

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleSearch();
    }
  };

  return (
    <Box className="data-table-with-search">
      {isSearchable && (
        <div className="table-toolbar">
          <div className="search-bar">
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleSearchKeyDown}
            />
            {searchTerm && (
              <button
                className="clear-btn"
                onClick={() => setSearchTerm("")}
                aria-label="Clear search"
              >
                <Cross2Icon />
              </button>
            )}
            <button
              onClick={handleSearch}
              disabled={isLoading}
              className="search-btn"
              aria-label="Search"
            >
              <MagnifyingGlassIcon />
            </button>
          </div>
          {headerActions && <div className="action-bar">{headerActions}</div>}
        </div>
      )}

      {!isSearchable && headerActions && (
        <div className="table-toolbar">
          <div className="action-bar">{headerActions}</div>
        </div>
      )}

      {/* Paging strip (above) */}
      {!error && pagination.totalPages > 1 && (
        <div className="paging-strip">
          <button
            className="paging-link"
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={!pagination.hasPrevious || isLoading}
          >
            ‹ Prev
          </button>
          <span className="paging-info">
            { pagination.totalPages > 1 && (`${pagination.page} / ${pagination.totalPages}`) }
            { pagination.totalPages < 0 && (`${pagination.page}`) }
          </span>
          <button
            className="paging-link"
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={!pagination.hasNext || isLoading}
          >
            Next ›
          </button>
        </div>
      )}

      {/* Data Table */}
      <DataTable<T>
        idColumnName={idColumnName}
        data={data}
        columns={columns}
        isLoading={showSpinner}
        error={error}
        emptyState={emptyState}
        selectable={selectable}
        selectedIds={selectedIds}
        onSelectionChange={onSelectionChange}
        selectAllText={selectAllText}
        disabledRowIds={disabledRowIds}
        onRowClick={onRowClick}
      />

      {/* Paging strip (below) */}
      {!error && pagination.totalPages > 1 && (
        <div className="paging-strip">
          <button
            className="paging-link"
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={!pagination.hasPrevious || isLoading}
          >
            ‹ Prev
          </button>
          <span className="paging-info">
            {pagination.page} / {pagination.totalPages}
            <span className="paging-total"> ({pagination.total})</span>
          </span>
          <button
            className="paging-link"
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={!pagination.hasNext || isLoading}
          >
            Next ›
          </button>
        </div>
      )}
    </Box>
  );
}

export default PaginatedDataTable;