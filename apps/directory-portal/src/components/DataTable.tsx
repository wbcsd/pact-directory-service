import React, { useState, useMemo } from "react";
import { Box, Spinner, Text, Checkbox } from "@radix-ui/themes";
import "./DataTable.css";

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  sortValue?: (row: T) => string | number;
  render: (row: T) => React.ReactNode;
}

export interface DataTableProps<T> {
  idColumnName: keyof T;
  data: T[];
  columns: Column<T>[];
  isLoading?: boolean;
  error?: string | null;
  onRowClick?: (row: T) => void;
  emptyState?: {
    title: string;
    description?: string;
    action?: React.ReactNode;
  };
  
  // Selection props
  selectable?: boolean;
  selectedIds?: (string | number)[];
  onSelectionChange?: (selectedIds: (string | number)[]) => void;
  selectAllText?: string;
  disabledRowIds?: (string | number)[]; // IDs of rows that cannot be selected
}

type SortDirection = "asc" | "desc" | null;

interface SortConfig {
  key: string | null;
  direction: SortDirection;
}

function DataTable<T extends object>({
  idColumnName,
  data,
  columns,
  isLoading = false,
  error = null,
  emptyState,
  selectable = false,
  selectedIds = [],
  onSelectionChange,
  onRowClick,
  selectAllText = "Select all",
  disabledRowIds = [],
}: DataTableProps<T>) {
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: null,
    direction: null,
  });

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortConfig.key || !sortConfig.direction) {
      return data;
    }

    const column = columns.find((col) => col.key === sortConfig.key);
    if (!column?.sortValue) {
      return data;
    }

    const sorted = [...data].sort((a, b) => {
      const aValue = column.sortValue!(a);
      const bValue = column.sortValue!(b);

      if (aValue < bValue) {
        return sortConfig.direction === "asc" ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === "asc" ? 1 : -1;
      }
      return 0;
    });

    return sorted;
  }, [data, sortConfig, columns]);

  // Handle sort
  const handleSort = (columnKey: string) => {
    const column = columns.find((col) => col.key === columnKey);
    if (!column?.sortable) return;

    setSortConfig((prevConfig) => {
      if (prevConfig.key !== columnKey) {
        return { key: columnKey, direction: "asc" };
      }
      if (prevConfig.direction === "asc") {
        return { key: columnKey, direction: "desc" };
      }
      return { key: null, direction: null };
    });
  };

  // Selection handlers
  const selectableRowIds = useMemo(() => {
    return data
      .map((row) => row[idColumnName] as string | number)
      .filter((id) => !disabledRowIds.includes(id));
  }, [data, idColumnName, disabledRowIds]);

  const handleSelectAll = () => {
    if (!onSelectionChange) return;
    
    if (selectedIds.length === selectableRowIds.length && selectableRowIds.length > 0) {
      // Deselect all
      onSelectionChange([]);
    } else {
      // Select all selectable rows
      onSelectionChange(selectableRowIds);
    }
  };

  const handleRowSelect = (rowId: string | number) => {
    if (!onSelectionChange) return;
    
    if (disabledRowIds.includes(rowId)) return;
    
    if (selectedIds.includes(rowId)) {
      onSelectionChange(selectedIds.filter((id) => id !== rowId));
    } else {
      onSelectionChange([...selectedIds, rowId]);
    }
  };

  const isAllSelected = selectableRowIds.length > 0 && 
                        selectedIds.length === selectableRowIds.length;
  const isSomeSelected = selectedIds.length > 0 && selectedIds.length < selectableRowIds.length;

  // Render loading state
  if (isLoading) {
    return (
      <Box className="loadingBox">
        <Spinner size="3" />
      </Box>
    );
  }

  // Render error state
  if (error) {
    return (
      <Box className="errorBox">
        <Text color="red" size="3">
          {error}
        </Text>
      </Box>
    );
  }

  // Render empty state
  if (data.length === 0) {
    if (emptyState) {
      return (
        <Box className="emptyState">
          <Text size="5" weight="medium">
            {emptyState.title}
          </Text>
          {emptyState.description && (
            <Text size="2" className="emptyHint">
              {emptyState.description}
            </Text>
          )}
          {emptyState.action && <Box mt="4">{emptyState.action}</Box>}
        </Box>
      );
    }
    return (
      <Box className="emptyState">
        <Text size="3" color="gray">
          No data available
        </Text>
      </Box>
    );
  }

  return (
    <div className="table-container">
      <table className="data-table">
        <thead>
          <tr>
            {selectable && (
              <th className="checkbox-column">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={handleSelectAll}
                  disabled={selectableRowIds.length === 0}
                  aria-label={selectAllText}
                  className={isSomeSelected ? "indeterminate" : ""}
                />
              </th>
            )}
            {columns.map((column) => (
              <th
                key={column.key}
                className={column.sortable ? "sortable" : ""}
                onClick={() => column.sortable && handleSort(column.key)}
              >
                <div className="header-content">
                  <span>{column.header}</span>
                  {column.sortable && sortConfig.key === column.key && (
                    <span className="sort-indicator">
                      {sortConfig.direction === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((row) => {
            const rowId = row[idColumnName] as string | number;
            const isSelected = selectedIds.includes(rowId);
            const isDisabled = disabledRowIds.includes(rowId);
            
            return (
              <tr
                onClick={() => onRowClick && onRowClick(row)}
                key={String(rowId)}
                className={`${isSelected ? "selected-row" : ""} ${isDisabled ? "disabled-row" : ""}`}
              >
                {selectable && (
                  <td className="checkbox-column">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleRowSelect(rowId)}
                      disabled={isDisabled}
                      aria-label={`Select row ${rowId}`}
                    />
                  </td>
                )}
                {columns.map((column) => (
                  <td key={column.key}>{column.render(row)}</td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default DataTable;