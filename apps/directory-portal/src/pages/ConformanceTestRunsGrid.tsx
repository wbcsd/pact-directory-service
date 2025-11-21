import React from "react";
import { Button } from "@radix-ui/themes";
import { NavLink, NavigateFunction } from "react-router-dom";
import StatusBadge from "../components/StatusBadge";
import DataTable, { Column } from "../components/DataTable";
import { ProfileData } from "../contexts/AuthContext";
import "./ConformanceTestRuns.css";

interface TestRun {
  testRunId: string;
  techSpecVersion: string;
  timestamp: string;
  organizationName: string;
  adminEmail: string;
  passingPercentage: number;
  status: "PASS" | "FAIL" | "PENDING";
}

interface Props {
  testRuns: TestRun[];
  profileData: ProfileData | null;
  navigate: NavigateFunction;
  error: string | null;
  isLoading: boolean;
}

const formatDate = (timestamp: string): string => {
  const date = new Date(timestamp);
  const month = date.toLocaleString("en-US", { month: "long" });
  const day = date.getDate();
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${month} ${day}, ${year} ${hours}:${minutes}`;
};

const ConformanceTestRunsGrid: React.FC<Props> = ({
  testRuns,
  profileData,
  navigate,
  error,
  isLoading,
}) => {
  // Define table columns dynamically
  const columns: Column<TestRun>[] = [
    {
      key: "testRunId",
      header: "Test Run ID",
      sortable: true,
      sortValue: (run) => run.testRunId,
      render: (run) => (
        <NavLink to={`/conformance-test-result?testRunId=${run.testRunId}`}>
          {run.testRunId.substring(0, 8)}
        </NavLink>
      ),
    },
    ...(profileData?.role === "administrator" || profileData?.role === "root"
      ? [
          {
            key: "organizationName",
            header: "Organization",
            sortable: true,
            sortValue: (run: TestRun) => run.organizationName,
            render: (run: TestRun) => run.organizationName,
          },
          {
            key: "adminEmail",
            header: "Email",
            sortable: true,
            sortValue: (run: TestRun) => run.adminEmail,
            render: (run: TestRun) => run.adminEmail,
          },
        ]
      : []),
    {
      key: "status",
      header: "Status",
      sortable: true,
      sortValue: (run) => run.status,
      render: (run) => <StatusBadge status={run.status} />,
    },
    {
      key: "techSpecVersion",
      header: "Version",
      sortable: true,
      sortValue: (run) => run.techSpecVersion,
      render: (run) => run.techSpecVersion,
    },
    {
      key: "timestamp",
      header: "Run Date/Time CET",
      sortable: true,
      sortValue: (run) => new Date(run.timestamp).getTime(),
      render: (run) => (
        <span className="test-gridcell-datetime">
          {formatDate(run.timestamp)}
        </span>
      ),
    },
  ];

  return (
    <DataTable
      idColumnName="testRunId"
      data={testRuns}
      columns={columns}
      isLoading={isLoading}
      onRowClick={(row) =>
        navigate(`/conformance-test-result?testRunId=${row.testRunId}`)
      }
      error={error}
      emptyState={{
        title: "You currently have no tests",
        description:
          "Start automated testing to ensure a PACT conformant solution",
        action: (
          <Button onClick={() => navigate("/conformance-testing")}>
            Run Tests
          </Button>
        ),
      }}
    />
  );
};

export default ConformanceTestRunsGrid;
