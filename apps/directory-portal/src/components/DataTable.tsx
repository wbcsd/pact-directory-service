import React from "react";
import { Box, Callout } from "@radix-ui/themes";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import Spinner from "../components/LoadingSpinner";
import EmptyImage from "../assets/pact-logistics-center-8.png";
import "./DataTable.css";

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode; // custom cell renderer
}

interface TableProps<T> {
  idColumnName: string;
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

function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  isLoading = false,
  loadingPosition = "top-right",
  idColumnName,
  error,
  emptyState,
}: TableProps<T>) {
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
            {columns.map((col) => (
              <th key={col.key}>{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIdx) => (
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
