import React, { useState, useMemo } from "react";
import { Box, Callout } from "@radix-ui/themes";
import {
  ExclamationTriangleIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  CaretSortIcon,
} from "@radix-ui/react-icons";
import "./DataTable.css";
import Spinner from "../components/LoadingSpinner";
import EmptyImage from "../assets/pact-logistics-center-8.png";

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  sortable?: boolean; // New: whether this column is sortable
  sortValue?: (row: T) => string | number; // New: custom sort value extractor
}

interface TableProps<T> {
  idColumnName: keyof T;
  data: T[];
  columns: Column<T>[];
  isLoading?: boolean;
  loadingPosition?: "top-left" | "top-right";
  error?: string | null;
  emptyState?: {
    title: string;
    description?: string;
    action?: React.ReactNode;
  };
}

type SortConfig = {
  key: string;
  direction: "asc" | "desc";
} | null;

function DataTable<T extends object>({
  data,
  columns,
  isLoading = false,
  loadingPosition = "top-right",
  idColumnName,
  error,
  emptyState,
}: TableProps<T>) {
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);

  const sortedData = useMemo(() => {
    if (!sortConfig) return data;

    const column = columns.find((col) => col.key === sortConfig.key);
    if (!column) return data;

    const sorted = [...data].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      if (column.sortValue) {
        aValue = column.sortValue(a);
        bValue = column.sortValue(b);
      } else {
        // Default: use the rendered content as string
        aValue = String(column.render(a));
        bValue = String(column.render(b));
      }

      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortConfig.direction === "asc"
          ? aValue - bValue
          : bValue - aValue;
      }

      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();

      if (aStr < bStr) return sortConfig.direction === "asc" ? -1 : 1;
      if (aStr > bStr) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [data, sortConfig, columns]);

  const handleSort = (columnKey: string) => {
    const column = columns.find((col) => col.key === columnKey);
    if (!column || column.sortable === false) return;

    setSortConfig((current) => {
      if (!current || current.key !== columnKey) {
        return { key: columnKey, direction: "asc" };
      }
      if (current.direction === "asc") {
        return { key: columnKey, direction: "desc" };
      }
      return null; // Reset sorting
    });
  };

  if (error) {
    return (
      <Box className="errorBox">
        <Callout.Root color="red" size="2">
          <Callout.Icon>
            <ExclamationTriangleIcon />
          </Callout.Icon>
          <Callout.Text>{error}</Callout.Text>
        </Callout.Root>
      </Box>
    );
  }

  if (!isLoading && data.length === 0) {
    return (
      <div className="emptyState">
        <img src={EmptyImage} alt="No data" />
        <h2>{emptyState?.title ?? "No Data"}</h2>
        {emptyState?.description && (
          <p className="emptyHint">{emptyState.description}</p>
        )}
        {emptyState?.action}
      </div>
    );
  }

  return (
    <div className="table-wrapper">
      {isLoading && (
        <div className={`loading-indicator ${loadingPosition}`}>
          <Spinner />
        </div>
      )}
      <table className="generic-table">
        <thead>
          <tr>
            {columns.map((col) => {
              const isSortable = col.sortable !== false;
              const isActive = sortConfig?.key === col.key;

              return (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className={isSortable ? "sortable" : ""}
                  style={{ cursor: isSortable ? "pointer" : "default" }}
                >
                  <div className="th-content">
                    <span>{col.header}</span>
                    {isSortable && (
                      <span className="sort-icon">
                        {isActive ? (
                          sortConfig.direction === "asc" ? (
                            <ChevronUpIcon />
                          ) : (
                            <ChevronDownIcon />
                          )
                        ) : (
                          <CaretSortIcon />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((row, rowIdx) => (
            <tr key={(row[idColumnName] as string) ?? rowIdx}>
              {columns.map((col) => (
                <td key={col.key}>{col.render(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export default DataTable;
