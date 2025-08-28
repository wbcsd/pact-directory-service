import React from "react";
import { Box, Button, Callout } from "@radix-ui/themes";
import Spinner from "../components/LoadingSpinner";
import { NavLink, NavigateFunction } from "react-router-dom";
import StatusBadge from "../components/StatusBadge";
import EmptyImage from "../assets/pact-logistics-center-8.png";
import { ProfileData } from "../contexts/AuthContext";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import "./ConformanceTestRuns.css";

interface TestRun {
  testId: string;
  techSpecVersion: string;
  timestamp: string;
  companyName: string;
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
  if (isLoading) {
    return (
      <Box className="loadingBox">
        <Spinner />
      </Box>
    );
  }

  if (error) {
    return (
      <Box className="errorBox">
        <h2>Conformance Test Runs</h2>
        <Callout.Root color="red" size="2">
          <Callout.Icon>
            <ExclamationTriangleIcon />
          </Callout.Icon>
          <Callout.Text>{error}</Callout.Text>
        </Callout.Root>
        <Box mt="4">
          <Button onClick={() => navigate("/conformance-testing")}>
            Back to Testing Form
          </Button>
        </Box>
      </Box>
    );
  }

  if (testRuns.length === 0) {
    return (
      <div className="emptyState">
        <img src={EmptyImage} alt="No tests yet" />
        <h2>You currently have no tests</h2>
        <p className="emptyHint">
          Start automated testing to ensure a PACT conformant solution
        </p>
        <Button onClick={() => navigate("/conformance-testing")}>
          Run Tests
        </Button>
      </div>
    );
  }

  return (
    <div className="table-container">
      <table className="test-runs-table">
        <thead>
          <tr>
            <th>Test Run ID</th>
            {profileData?.role === "administrator" && <th>Company</th>}
            {profileData?.role === "administrator" && <th>Email</th>}
            <th>Status</th>
            <th>Version</th>
            <th>Run Date/Time CET</th>
          </tr>
        </thead>
        <tbody>
          {testRuns.map((run) => (
            <tr key={run.testId}>
              <td>
                <NavLink
                  to={`/conformance-test-result?testRunId=${run.testId}`}
                >
                  {run.testId.substring(0, 8)}
                </NavLink>
              </td>
              {profileData?.role === "administrator" && (
                <td>{run.companyName}</td>
              )}
              {profileData?.role === "administrator" && (
                <td>{run.adminEmail}</td>
              )}
              <td>
                <StatusBadge status={run.status} />
              </td>
              <td>{run.techSpecVersion}</td>
              <td>
                <span>{formatDate(run.timestamp)}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ConformanceTestRunsGrid;
