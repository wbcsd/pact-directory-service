import React, { useState, useMemo } from "react";
import { Box, Flex, Spinner, Text, Checkbox, Table } from "@radix-ui/themes";
import { CaretSortIcon, CaretUpIcon, CaretDownIcon } from "@radix-ui/react-icons";

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  extendedStyle?: React.CSSProperties;
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
      onSelectionChange([]);
    } else {
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

  // Render error state (outside table)
  if (error) {
    return (
      <Box p="5" maxWidth="800px">
        <Text color="red" size="3">
          {error}
        </Text>
      </Box>
    );
  }

  return (
    <Table.Root variant="surface" className="data-table">
      <Table.Header>
        <Table.Row>
          {selectable && (
            <Table.ColumnHeaderCell width="48px">
              <Checkbox
                checked={isAllSelected}
                onCheckedChange={handleSelectAll}
                disabled={selectableRowIds.length === 0}
                aria-label={selectAllText}
              />
            </Table.ColumnHeaderCell>
          )}
          {columns.map((column) => (
            <Table.ColumnHeaderCell
              key={column.key}
              style={column.sortable ? { cursor: "pointer", userSelect: "none" } : undefined}
              onClick={() => column.sortable && handleSort(column.key)}
            >
              <Flex align="center" gap="1">
                <span>{column.header}</span>
                {column.sortable && (
                  <Flex
                    align="center"
                    style={{
                      opacity: sortConfig.key === column.key ? 1 : 0.5,
                    }}
                  >
                    {sortConfig.key === column.key && sortConfig.direction === "asc" ? (
                      <CaretUpIcon />
                    ) : sortConfig.key === column.key && sortConfig.direction === "desc" ? (
                      <CaretDownIcon />
                    ) : (
                      <CaretSortIcon />
                    )}
                  </Flex>
                )}
              </Flex>
            </Table.ColumnHeaderCell>
          ))}
        </Table.Row>
      </Table.Header>

      <Table.Body>
        {isLoading ? (
          <Table.Row>
            <Table.Cell colSpan={columns.length + (selectable ? 1 : 0)}>
              <Flex justify="center" align="center" p="5">
                <Spinner size="3" />
              </Flex>
            </Table.Cell>
          </Table.Row>
        ) : data.length === 0 ? (
          <Table.Row>
            <Table.Cell colSpan={columns.length + (selectable ? 1 : 0)}>
              <Flex direction="column" align="center" justify="center">
                {emptyState ? (
                  <>
                    <Text size="2">
                      {emptyState.title}
                    </Text>
                    {emptyState.description && (
                      <Text size="2">
                        {emptyState.description}
                      </Text>
                    )}
                    {emptyState.action && <Box mt="4">{emptyState.action}</Box>}
                  </>
                ) : (
                  <Text size="2">
                    No data available
                  </Text>
                )}
              </Flex>
            </Table.Cell>
          </Table.Row>
        ) : ( 
        sortedData.map((row) => {
          const rowId = row[idColumnName] as string | number;
          const isSelected = selectedIds.includes(rowId);
          const isDisabled = disabledRowIds.includes(rowId);
          
          return (
            <Table.Row
              key={String(rowId)}
              onClick={(e) => {
                if ((e.target as HTMLElement).closest("[data-checkbox-cell]")) {
                  return;
                }
                if (onRowClick) {
                  onRowClick(row);
                }
              }}
              style={{
                cursor: onRowClick ? "pointer" : undefined,
                opacity: isDisabled ? 0.5 : undefined,
                backgroundColor: isSelected ? "var(--indigo-a3)" : undefined,
              }}
            >
              {selectable && (
                <Table.Cell data-checkbox-cell width="48px">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => handleRowSelect(rowId)}
                    disabled={isDisabled}
                    aria-label={`Select row ${rowId}`}
                  />
                </Table.Cell>
              )}
              {columns.map((column) => (
                <Table.Cell key={column.key} style={column.extendedStyle}>
                  {column.render(row)}
                </Table.Cell>
              ))}
            </Table.Row>
          );
        }))}
      </Table.Body>
    </Table.Root>
  );
}

export default DataTable;