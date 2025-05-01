import React, { useState, useEffect } from "react";
import { Text, Button, Box, Spinner, Callout } from "@radix-ui/themes";
import { ExclamationTriangleIcon, CalendarIcon } from "@radix-ui/react-icons";
import { useNavigate, NavLink } from "react-router-dom";
import SideNav from "../components/SideNav";
import StatusBadge from "../components/StatusBadge";
import { proxyWithAuth } from "../utils/auth-fetch";

interface TestRun {
  testId: string;
  techSpecVersion: string;
  timestamp: string;
  companyName: string;
  passingPercentage: number;
  status: "PASS" | "FAIL" | "PENDING";
}

const getTimeAgo = (timestamp: string): string => {
  const now = new Date();
  const date = new Date(timestamp);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return `${diffInSeconds} seconds ago`;
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes > 1 ? "s" : ""} ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours > 1 ? "s" : ""} ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return `${diffInDays} day${diffInDays > 1 ? "s" : ""} ago`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths} month${diffInMonths > 1 ? "s" : ""} ago`;
  }

  const diffInYears = Math.floor(diffInDays / 365);
  return `${diffInYears} year${diffInYears > 1 ? "s" : ""} ago`;
};

const ConformanceTestRuns: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testRuns, setTestRuns] = useState<TestRun[]>([]);

  useEffect(() => {
    const fetchTestRuns = async () => {
      try {
        const response = await proxyWithAuth(`/test-runs`);

        if (!response || !response.ok) {
          throw new Error("Failed to fetch test runs");
        }

        const data = await response.json();

        if (data.error) {
          setError(data.error);
          setIsLoading(false);
          return;
        }

        setTestRuns(data.testRuns || []);
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching test runs:", error);
        setError(
          "An unexpected error occurred while fetching test runs. Please try again."
        );
        setIsLoading(false);
      }
    };

    fetchTestRuns();
  }, []);

  return (
    <>
      <aside className="sidebar">
        <div className="marker-divider"></div>
        <SideNav />
      </aside>
      {isLoading ? (
        <Box
          style={{
            padding: "20px",
            maxWidth: "800px",
            width: "800px",
          }}
        >
          <Spinner size="3" />
        </Box>
      ) : error ? (
        <Box
          style={{
            padding: "20px",
            maxWidth: "800px",
            width: "800px",
          }}
        >
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
      ) : (
        <main className="main">
          <div className="header">
            <div>
              <h2>Overview</h2>
              <p style={{ color: "#888", fontSize: "0.875rem" }}>
                Showing runs from all conformance tests
              </p>
            </div>
            <Button onClick={() => navigate("/conformance-testing")}>
              Run New Test
            </Button>
          </div>
          <div className="table-container">
            {testRuns.length === 0 ? (
              <Text size="2">No test runs found.</Text>
            ) : (
              <table className="test-runs-table">
                <thead>
                  <tr>
                    <th>Test identifier</th>
                    <th>Status</th>
                    <th>Version</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {testRuns.map((run) => (
                    <tr key={run.testId}>
                      <td>
                        <NavLink
                          to={`/conformance-test-result?testRunId=${run.testId}`}
                          style={{ color: "#0066cc", textDecoration: "none" }}
                        >
                          {run.testId}
                        </NavLink>
                      </td>
                      <td>
                        <StatusBadge status={run.status} />
                      </td>
                      <td>{run.techSpecVersion}</td>
                      <td>
                        <CalendarIcon
                          style={{
                            marginRight: "3px",
                            verticalAlign: "middle",
                          }}
                        />
                        <span>{getTimeAgo(run.timestamp)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </main>
      )}
    </>
  );
};

export default ConformanceTestRuns;
