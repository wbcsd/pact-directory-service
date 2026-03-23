import React from "react";
import { Button } from "@radix-ui/themes";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { proxyWithAuth } from "../utils/auth-fetch";
import StatusBadge from "../components/StatusBadge";
import PaginatedDataTable, { PaginationInfo } from "../components/PaginatedDataTable";
import { Column } from "../components/DataTable";
import GridPageLayout from "../layouts/GridPageLayout";

interface TestRun {
  testRunId: string;
  techSpecVersion: string;
  timestamp: string;
  organizationName: string;
  adminEmail: string;
  passingPercentage: number;
  status: "PASS" | "FAIL" | "PENDING";
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

const ConformanceTestListPage: React.FC = () => {
  const navigate = useNavigate();
  const { profileData } = useAuth();

  const fetchTestRuns = async (params: {
    page: number;
    pageSize: number;
    search?: string;
  }): Promise<{ data: TestRun[]; pagination: PaginationInfo }> => {
    const queryParams = new URLSearchParams({
      page: params.page.toString(),
      pageSize: params.pageSize.toString(),
    });

    if (params.search) {
      queryParams.set("search", params.search);
    }

    const response = await proxyWithAuth(`/test-runs?${queryParams.toString()}`);
    if (!response || !response.ok) {
      throw new Error("Failed to fetch test runs");
    }

    const result = await response.json();
    if (result.error) {
      throw new Error(result.error);
    }

    return result;
  };

  const columns: Column<TestRun>[] = [
    {
      key: "testRunId",
      header: "Test Run ID",
      sortable: true,
      sortValue: (run) => run.testRunId,
      render: (run) => run.testRunId.substring(0, 8),
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
    <GridPageLayout
      title="Conformance Tests"
      subtitle="Showing runs from all conformance tests"
      actions={
        <Button onClick={() => navigate("/conformance-test-runs/new")}>
          Run Tests
        </Button>
      }
      >
        <PaginatedDataTable<TestRun>
          isSearchable={true}
          searchPlaceholder="Search by organization name, email address or user name"
          fetchData={fetchTestRuns}
          columns={columns}
          onRowClick={(row) => navigate(`/conformance-test-runs/${row.testRunId}`)}
          idColumnName="testRunId"          
          emptyState={{
            title: "You currently have no tests",
            description:
              "Start automated testing to ensure a PACT conformant solution",
            action: (
              <Button onClick={() => navigate("/conformance-test-runs/new")}>
                Run Tests
              </Button>
            ),
          }}
        />
    </GridPageLayout>
  );
};

export default ConformanceTestListPage;