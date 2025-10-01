import React from "react";
import { Button } from "@radix-ui/themes";
import { NavLink, NavigateFunction } from "react-router-dom";
import StatusBadge from "../components/StatusBadge";
import DataTable, { Column } from "../components/DataTable";
import { ProfileData } from "../contexts/AuthContext";
import "./ConformanceTestRuns.css";

interface TestRun {
  testId: string;
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
      key: "testId",
      header: "Test Run ID",
      render: (run) => (
        <NavLink to={`/conformance-test-result?testRunId=${run.testId}`}>
          {run.testId.substring(0, 8)}
        </NavLink>
      ),
    },
    ...(profileData?.role === "administrator"
      ? [
          {
            key: "organizationName",
            header: "Organization",
            render: (run: TestRun) => run.organizationName,
          },
          {
            key: "adminEmail",
            header: "Email",
            render: (run: TestRun) => run.adminEmail,
          },
        ]
      : []),
    {
      key: "status",
      header: "Status",
      render: (run) => <StatusBadge status={run.status} />,
    },
    {
      key: "techSpecVersion",
      header: "Version",
      render: (run) => run.techSpecVersion,
    },
    {
      key: "timestamp",
      header: "Run Date/Time CET",
      render: (run) => (
        <span className="test-gridcell-datetime">
          {formatDate(run.timestamp)}
        </span>
      ),
    },
  ];

  return (
    <DataTable
      idColumnName="testId"
      data={testRuns}
      columns={columns}
      isLoading={isLoading}
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
